using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Infrastructure;
using System.Data;
using System.Reflection;

namespace RealestateAPI.Shared.Services
{
    public class PostgresDataService : IPostgresDataService
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor? _http;

        public PostgresDataService(IConfiguration configuration, IHttpContextAccessor? http = null)
        {
            _configuration = configuration;
            _http = http;
        }

        public async Task<List<T>> QueryAsyncPg<T>(
            string connectionName,
            string sql,
            IEnumerable<NpgsqlParameter>? parameters = null,
            CancellationToken ct = default
        ) where T : new()
        {
            await using var conn = new NpgsqlConnection(_configuration.GetConnectionString(connectionName));
            await conn.OpenAsync(ct);

            await using var cmd = new NpgsqlCommand(sql, conn)
            {
                CommandType = CommandType.Text
            };

            if (parameters != null)
            {
                foreach (var p in parameters) cmd.Parameters.Add(p);
            }

            var result = new List<T>();

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            var accessor = ReaderAccessor.Create<T>(reader);

            while (await reader.ReadAsync(ct))
            {
                result.Add(accessor.Materialize<T>(reader));  // 👈 명시적으로 <T> 추가
            }

            return result;
        }

        private sealed class ReaderAccessor
        {
            private readonly Func<IDataRecord, object> _factory;

            private ReaderAccessor(Func<IDataRecord, object> factory) => _factory = factory;

            public T Materialize<T>(IDataRecord r) => (T)_factory(r);

            public static ReaderAccessor Create<T>(IDataRecord schemaRecord) where T : new()
            {
                // 컬럼명 → 인덱스
                var fieldCount = schemaRecord.FieldCount;
                var columnIndex = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < fieldCount; i++)
                {
                    columnIndex[schemaRecord.GetName(i)] = i;
                }

                // 타입의 settable 프로퍼티 미리 준비(대소문자 무시)
                var props = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);
                var propMap = new List<(PropertyInfo Prop, int Ordinal)>();

                foreach (var p in props)
                {
                    if (!p.CanWrite) continue;

                    // 정확 매칭 → 스네이크/인용 대비한 보조 키
                    if (columnIndex.TryGetValue(p.Name, out var idx))
                    {
                        propMap.Add((p, idx));
                        continue;
                    }

                    // snake_case → PascalCase 매칭 시도
                    // ex) RtNo ↔ "RtNo", rt_no ↔ RtNo
                    foreach (var kv in columnIndex)
                    {
                        var normalized = kv.Key.Replace("_", "", StringComparison.Ordinal);
                        if (normalized.Equals(p.Name, StringComparison.OrdinalIgnoreCase))
                        {
                            propMap.Add((p, kv.Value));
                            break;
                        }
                    }
                }

                object Factory(IDataRecord r)
                {
                    var obj = new T();
                    foreach (var (prop, ord) in propMap)
                    {
                        var val = r.IsDBNull(ord) ? null : r.GetValue(ord);
                        if (val == null)
                        {
                            prop.SetValue(obj, null);
                            continue;
                        }

                        var targetType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;

                        try
                        {
                            // PostgreSQL numeric → decimal/long, int 등 변환
                            var converted = Convert.ChangeType(val, targetType);
                            prop.SetValue(obj, converted);
                        }
                        catch
                        {
                            // Npgsql 특수 타입 등은 직접 캐스팅 시도
                            if (targetType.IsInstanceOfType(val))
                                prop.SetValue(obj, val);
                            else
                                prop.SetValue(obj, null); // 매핑 실패는 null로
                        }
                    }
                    return obj!;
                }

                return new ReaderAccessor(Factory);
            }
        }


        public async Task ExecProcedureAsyncPg(string dbstr, string spName, List<NpgsqlParameter> parameters)
        {
            var connStr = _configuration.GetConnectionString(dbstr);
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            var sql = $"CALL {spName}({string.Join(", ", parameters.Select(p => p.ParameterName))});";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddRange(parameters.ToArray());

            await cmd.ExecuteNonQueryAsync();
        }
        public async Task ExecFunctionAsyncPg(string dbstr, string functionName, List<NpgsqlParameter> parameters)
        {
            var connStr = _configuration.GetConnectionString(dbstr);
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            // PostgreSQL 함수는 SELECT로 호출
            //var sql = $"SELECT {functionName}({string.Join(", ", parameters.Select(p => p.ParameterName))});";
            // 함수와 파라미터 바인딩 오류로 수정 : 20250926_Heum
            var sql = $"SELECT * FROM {functionName}({string.Join(", ", parameters.Select(p => p.ParameterName.TrimStart('@') + " => " + p.ParameterName))});";


            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddRange(parameters.ToArray());
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<DataTable> ExecFunctionAsyncPgWithDataTable(string dbstr, string functionName, List<NpgsqlParameter> parameters)
        {
            var connStr = _configuration.GetConnectionString(dbstr);
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            // PostgreSQL named parameter binding: p_address_type => @p_address_type
            var paramPlaceholders = string.Join(", ", parameters.Select((p, idx) =>
                p.ParameterName.TrimStart('@') + " => @" + p.ParameterName.TrimStart('@')));
            var sql = $"SELECT * FROM {functionName}({paramPlaceholders});";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddRange(parameters.ToArray());

            var dt = new DataTable();
            await using var reader = await cmd.ExecuteReaderAsync();
            dt.Load(reader);

            return dt;
        }

        private void AddParameters(NpgsqlCommand cmd, Dictionary<string, string> parameters)
        {
            if (parameters == null) return;
            foreach (var param in parameters)
            {
                cmd.Parameters.AddWithValue(param.Key, param.Value ?? (object)DBNull.Value);
            }
        }

        private void AddParametersO(NpgsqlCommand cmd, Dictionary<string, object> parameters)
        {
            if (parameters == null) return;
            foreach (var param in parameters)
            {
                cmd.Parameters.AddWithValue(param.Key, param.Value ?? DBNull.Value);
            }
        }

        private async Task<T> ExecuteAsync<T>(string dbstr, string sp_name, Dictionary<string, string> parameters, Func<NpgsqlCommand, Task<T>> executor)
        {
            var connStr = _configuration.GetConnectionString(dbstr);
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            await using var cmd = new NpgsqlCommand(sp_name, conn) { CommandType = CommandType.StoredProcedure };
            AddParameters(cmd, parameters);

            return await executor(cmd);
        }

        private async Task<T> ExecuteAsyncO<T>(string dbstr, string sp_name, Dictionary<string, object> parameters, Func<NpgsqlCommand, Task<T>> executor)
        {
            var connStr = _configuration.GetConnectionString(dbstr);
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            await using var cmd = new NpgsqlCommand(sp_name, conn) { CommandType = CommandType.StoredProcedure };
            AddParametersO(cmd, parameters);

            return await executor(cmd);
        }

        public async Task<DataTable> GetDataTableFromSPAsync(string dbstr, string sp_name, Dictionary<string, string> parameters)
        {
            return await ExecuteAsync(dbstr, sp_name, parameters, async cmd =>
            {
                var dt = new DataTable();
                await using var reader = await cmd.ExecuteReaderAsync();
                dt.Load(reader);
                return dt;
            });
        }

        public async Task<DataSet> GetDataSetFromSPAsync(string dbstr, string sp_name, Dictionary<string, string> parameters)
        {
            return await ExecuteAsync(dbstr, sp_name, parameters, async cmd =>
            {
                var ds = new DataSet();
                using var adapter = new NpgsqlDataAdapter(cmd);
                adapter.Fill(ds); // 동기 호출
                return ds;

            });
        }

        public async Task ExecProcedureAsync(string dbstr, string sp_name, Dictionary<string, string> parameters)
        {
            await ExecuteAsync(dbstr, sp_name, parameters, async cmd =>
            {
                await cmd.ExecuteNonQueryAsync();
                return true;
            });
        }

        public async Task ExecProcedureAsyncO(string dbstr, string sp_name, Dictionary<string, object> parameters)
        {
            await ExecuteAsyncO(dbstr, sp_name, parameters, async cmd =>
            {
                await cmd.ExecuteNonQueryAsync();
                return true;
            });
        }

        public async Task<T?> GetSingleFromSPAsync<T>(string dbstr, string sp_name, Dictionary<string, string> parameters) where T : class, new()
        {
            return await ExecuteAsync(dbstr, sp_name, parameters, async cmd =>
            {
                await using var reader = await cmd.ExecuteReaderAsync();
                var list = MapToList<T>(reader);
                return list.FirstOrDefault();
            });
        }

        public async Task<List<T>> GetListFromSPAsync<T>(string dbstr, string sp_name, Dictionary<string, string> parameters) where T : new()
        {
            return await ExecuteAsync(dbstr, sp_name, parameters, async cmd =>
            {
                await using var reader = await cmd.ExecuteReaderAsync();
                return MapToList<T>(reader);
            });
        }

        public async Task<List<T>> GetListFromFunctionAsync<T>(string dbstr, string functionName, Dictionary<string, string> parameters) where T : new()
        {
            var connStr = _configuration.GetConnectionString(dbstr);
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            // 매개변수 문자열 구성
            var paramPlaceholders = string.Join(", ", parameters.Keys.Select(k => $"@{k}"));
            var sql = $"SELECT * FROM {functionName}({paramPlaceholders});";

            await using var cmd = new NpgsqlCommand(sql, conn);

            foreach (var param in parameters)
            {
                cmd.Parameters.AddWithValue(param.Key, param.Value ?? (object)DBNull.Value);
            }

            await using var reader = await cmd.ExecuteReaderAsync();
            return MapToList<T>(reader);
        }
        public async Task<List<T>> GetListFromFunctionAsyncPg<T>(string dbstr, string functionName, List<NpgsqlParameter> parameters) where T : new()
        {
            var connStr = _configuration.GetConnectionString(dbstr);
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            // 함수 호출용 SQL 쿼리 생성 (with @param 사용)
            var paramPlaceholders = string.Join(", ", parameters.Select(p => p.ParameterName)); // 이름 그대로 사용
            var sql = $"SELECT * FROM {functionName}({paramPlaceholders});"; // 예: SELECT * FROM dispatcher.sp_dashboard_company_stats(@in_date_from, ...)

            await using var cmd = new NpgsqlCommand(sql, conn); // ✅ CommandType.Text 생략 (기본값)
            cmd.Parameters.AddRange(parameters.ToArray());

            await using var reader = await cmd.ExecuteReaderAsync();
            return MapToList<T>(reader);
        }

        public async Task<List<T>> GetListFromFunctionAsyncO<T>(string dbstr, string functionName, Dictionary<string, object> parameters) where T : new()
        {
            var connStr = _configuration.GetConnectionString(dbstr);
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            // 매개변수 문자열 구성
            var paramPlaceholders = string.Join(", ", parameters.Keys.Select(k => $"@{k}"));
            var sql = $"SELECT * FROM {functionName}({paramPlaceholders});";

            await using var cmd = new NpgsqlCommand(sql, conn);

            foreach (var param in parameters)
            {
                cmd.Parameters.AddWithValue(param.Key, param.Value ?? DBNull.Value);
            }

            await using var reader = await cmd.ExecuteReaderAsync();
            return MapToList<T>(reader);
        }


        private List<T> MapToList<T>(IDataReader reader) where T : new()
        {
            var results = new List<T>();
            var props = typeof(T).GetProperties();

            while (reader.Read())
            {
                var obj = new T();
                foreach (var prop in props)
                {
                    if (!reader.HasColumn(prop.Name) || reader[prop.Name] is DBNull)
                        continue;

                    prop.SetValue(obj, ConvertValue(reader[prop.Name], prop.PropertyType));
                }
                results.Add(obj);
            }
            return results;
        }

        private object? ConvertValue(object value, Type targetType)
        {
            if (targetType.IsGenericType && targetType.GetGenericTypeDefinition() == typeof(Nullable<>))
            {
                if (value == null || value is DBNull) return null;
                targetType = Nullable.GetUnderlyingType(targetType)!;
            }
            if (targetType.IsEnum)
                return Enum.Parse(targetType, value.ToString()!);

            return Convert.ChangeType(value, targetType);
        }

        public async Task ExecFunctionAsync(string dbstr, string functionName, Dictionary<string, object> parameters)
        {
            await using var conn = new NpgsqlConnection(_configuration.GetConnectionString(dbstr));
            await conn.OpenAsync();
            await conn.SetAppUserAsync(_http); // _hist 작성자(app.uid) 주입

            var paramList = string.Join(",", parameters.Keys.Select(k => "@" + k));
            var sql = $"SELECT {functionName}({paramList})";

            await using var cmd = new NpgsqlCommand(sql, conn);

            foreach (var kv in parameters)
            {
                cmd.Parameters.AddWithValue(kv.Key, kv.Value ?? DBNull.Value);
            }

            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<int> ExecuteNonQueryAsyncPg(string dbstr, string sql, List<NpgsqlParameter>? parameters = null)
        {
            var connStr = _configuration.GetConnectionString(dbstr);
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            await conn.SetAppUserAsync(_http); // _hist 작성자(app.uid) 주입

            await using var cmd = new NpgsqlCommand(sql, conn)
            {
                CommandType = CommandType.Text
            };

            if (parameters != null && parameters.Count > 0)
            {
                cmd.Parameters.AddRange(parameters.ToArray());
            }

            try
            {
                return await cmd.ExecuteNonQueryAsync(); // 영향받은 행 수 반환
            }
            catch (Exception ex)
            {
                // 예외 발생 시 로깅 후 다시 throw
                Console.WriteLine($"[ExecuteNonQueryAsyncPg ERROR] {ex.Message}");
                Console.WriteLine($"SQL: {sql}");
                throw;
            }
        }

    }

    public static class NpgsqlDataReaderExtensions
    {
        public static bool HasColumn(this IDataRecord reader, string columnName)
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                if (reader.GetName(i).Equals(columnName, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }
    }
}

using System.Collections;
using System.Collections.Concurrent;
using System.Data;
using System.Reflection;
using System.Text.RegularExpressions;
using Dapper;
using Microsoft.Data.Sqlite;

namespace Neosys.Local.Data;

/// <summary>
/// SP 대체 실행기. Sql/Procs/&lt;SP이름&gt;[.&lt;모드&gt;].sql 파일을 읽어 실행한다.
///  - 파라미터: SQL에 쓴 @이름마다 넘긴 값(Row/사전의 키 또는 객체의 속성, 대소문자 무시)을 넣는다. 없으면 NULL.
///    빈 문자열은 NULL로 바꾼다.
///  - 한 파일의 여러 문장은 한 트랜잭션으로 실행한다. 조회 결과는 "행을 돌려주는 첫 문장"의 결과다.
///  - 결과 0건은 빈 리스트(오류 아님).
/// </summary>
public sealed class SpRunner
{
    private readonly LocalDatabase _db;

    public SpRunner(LocalDatabase db) => _db = db;

    public LocalDatabase Database => _db;

    public static string ResourcePath(string sp, string? mode) =>
        string.IsNullOrEmpty(mode) ? $"Procs/{sp}.sql" : $"Procs/{sp}.{mode}.sql";

    public static string Sql(string sp, string? mode = null) => SqlResources.Read(ResourcePath(sp, mode));

    public Task<List<Row>> QueryRowsAsync(string sp, string? mode = null, object? param = null) =>
        Run(t => t.QueryRowsAsync(sp, mode, param));

    public async Task<Row?> QueryRowAsync(string sp, string? mode = null, object? param = null) =>
        (await QueryRowsAsync(sp, mode, param)).FirstOrDefault();

    public Task<List<T>> QueryAsync<T>(string sp, string? mode = null, object? param = null) =>
        Run(t => t.QueryAsync<T>(sp, mode, param));

    public Task<T?> ScalarAsync<T>(string sp, string? mode = null, object? param = null) =>
        Run(t => t.ScalarAsync<T>(sp, mode, param));

    /// <summary>INS/UPD/DEL — 영향받은 행 수</summary>
    public Task<int> ExecuteAsync(string sp, string? mode = null, object? param = null) =>
        Run(t => t.ExecuteAsync(sp, mode, param));

    /// <summary>INS — SQL의 RETURNING(또는 마지막 SELECT)으로 돌려준 새 키</summary>
    public Task<long> InsertAsync(string sp, string? mode = "INS", object? param = null) =>
        Run(t => t.InsertAsync(sp, mode, param));

    /// <summary>
    /// 테이블 이름이 바뀌는 조회(SQL 파일의 {table} 자리). 이름은 db_inspect.TABLES 목록에 있는 것만 받아
    /// 따옴표 식별자로 넣는다 — 그 밖의 이름은 ArgumentException.
    /// </summary>
    public async Task<List<Row>> QueryTableAsync(string sp, string mode, string table, object? param = null)
    {
        var tables = await QueryAsync<string>("db_inspect", "TABLES");
        if (!tables.Contains(table, StringComparer.Ordinal)) throw new ArgumentException($"없는 테이블입니다: {table}", nameof(table));
        var sql = Sql(sp, mode).Replace("{table}", "\"" + table.Replace("\"", "\"\"") + "\"");
        await using var conn = _db.Open();
        var rows = await conn.QueryAsync(sql, BuildParams(sql, param));
        return rows.Select(r => ToRow((object)r)).ToList();
    }

    /// <summary>여러 SP를 한 트랜잭션으로 묶어 실행(예: 계약 마스터 + 문서 일괄 저장)</summary>
    public Task<TResult> InTransactionAsync<TResult>(Func<SpTransaction, Task<TResult>> work) => Run(work);

    private async Task<TResult> Run<TResult>(Func<SpTransaction, Task<TResult>> work)
    {
        await using var conn = _db.Open();
        await using var tx = conn.BeginTransaction();
        var result = await work(new SpTransaction(conn, tx));
        await tx.CommitAsync();
        return result;
    }

    // ---------------- 파라미터 ----------------

    // 주석과 문자열 리터럴을 지운 뒤 @이름을 찾는다
    private static readonly Regex StripRx = new(@"--[^\n]*|/\*.*?\*/|'(?:[^']|'')*'", RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex ParamRx = new(@"(?<![\w@])@([A-Za-z_]\w*)", RegexOptions.Compiled);
    private static readonly ConcurrentDictionary<string, string[]> NamesCache = new();
    private static readonly ConcurrentDictionary<Type, Dictionary<string, PropertyInfo>> PropsCache = new();

    internal static DynamicParameters BuildParams(string sql, object? param)
    {
        var names = NamesCache.GetOrAdd(sql, s =>
            ParamRx.Matches(StripRx.Replace(s, " ")).Select(m => m.Groups[1].Value)
                .Distinct(StringComparer.OrdinalIgnoreCase).ToArray());

        var dp = new DynamicParameters();
        foreach (var n in names)
            dp.Add("@" + n, Normalize(Lookup(param, n)));
        return dp;
    }

    private static object? Lookup(object? param, string name)
    {
        switch (param)
        {
            case null:
                return null;
            case IDictionary<string, object?> d:
                if (d.TryGetValue(name, out var v)) return v;
                foreach (var kv in d) if (string.Equals(kv.Key, name, StringComparison.OrdinalIgnoreCase)) return kv.Value;
                return null;
            case IDictionary nd:
                foreach (DictionaryEntry e in nd) if (string.Equals(e.Key as string, name, StringComparison.OrdinalIgnoreCase)) return e.Value;
                return null;
            default:
                var props = PropsCache.GetOrAdd(param.GetType(), t =>
                    t.GetProperties(BindingFlags.Public | BindingFlags.Instance).Where(p => p.GetIndexParameters().Length == 0)
                        .GroupBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
                        .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase));
                return props.TryGetValue(name, out var p) ? p.GetValue(param) : null;
        }
    }

    private static object? Normalize(object? v) => v switch
    {
        null => null,
        string s when string.IsNullOrWhiteSpace(s) => null,
        bool b => b ? 1 : 0,
        DateTime d => d.TimeOfDay == TimeSpan.Zero ? d.ToString("yyyy-MM-dd") : d.ToString("yyyy-MM-dd HH:mm:ss"),
        DateOnly d => d.ToString("yyyy-MM-dd"),
        Enum e => e.ToString(),
        _ => v,
    };

    internal static Row ToRow(object dapperRow) =>
        new((IDictionary<string, object?>)dapperRow);
}

/// <summary>InTransactionAsync 안에서 쓰는 실행기 — 같은 연결·트랜잭션을 공유한다.</summary>
public sealed class SpTransaction
{
    private readonly SqliteConnection _conn;
    private readonly SqliteTransaction _tx;

    internal SpTransaction(SqliteConnection conn, SqliteTransaction tx) { _conn = conn; _tx = tx; }

    private (string Sql, DynamicParameters P) Prep(string sp, string? mode, object? param)
    {
        var sql = SpRunner.Sql(sp, mode);
        return (sql, SpRunner.BuildParams(sql, param));
    }

    public async Task<List<Row>> QueryRowsAsync(string sp, string? mode = null, object? param = null)
    {
        var (sql, p) = Prep(sp, mode, param);
        var rows = await _conn.QueryAsync(sql, p, _tx);
        return rows.Select(r => SpRunner.ToRow((object)r)).ToList();
    }

    public async Task<List<T>> QueryAsync<T>(string sp, string? mode = null, object? param = null)
    {
        var (sql, p) = Prep(sp, mode, param);
        return (await _conn.QueryAsync<T>(sql, p, _tx)).AsList();
    }

    public Task<T?> ScalarAsync<T>(string sp, string? mode = null, object? param = null)
    {
        var (sql, p) = Prep(sp, mode, param);
        return _conn.ExecuteScalarAsync<T?>(sql, p, _tx);
    }

    public Task<int> ExecuteAsync(string sp, string? mode = null, object? param = null)
    {
        var (sql, p) = Prep(sp, mode, param);
        return _conn.ExecuteAsync(sql, p, _tx);
    }

    public async Task<long> InsertAsync(string sp, string? mode = "INS", object? param = null)
    {
        var (sql, p) = Prep(sp, mode, param);
        return await _conn.ExecuteScalarAsync<long?>(sql, p, _tx)
               ?? throw new InvalidOperationException($"{SpRunner.ResourcePath(sp, mode)}: 새 키를 반환하지 않았습니다.");
    }
}

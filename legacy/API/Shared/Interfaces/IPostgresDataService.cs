using System.Data;
using System.Threading.Tasks;
using Npgsql;

namespace RealestateAPI.Shared.Interfaces
{
    public interface IPostgresDataService
    {


        Task<DataTable> GetDataTableFromSPAsync(string dbstr, string sp_name, Dictionary<string, string> parameters);
        Task<DataSet> GetDataSetFromSPAsync(string dbstr, string sp_name, Dictionary<string, string> parameters);
        Task ExecProcedureAsync(string dbstr, string sp_name, Dictionary<string, string> parameters);
        Task ExecProcedureAsyncO(string dbstr, string sp_name, Dictionary<string, object> parameters);

        Task ExecProcedureAsyncPg(string dbstr, string spName, List<NpgsqlParameter> parameters);
        Task ExecFunctionAsyncPg(string dbstr, string functionName, List<NpgsqlParameter> parameters);
        Task<DataTable> ExecFunctionAsyncPgWithDataTable(string dbstr, string functionName, List<NpgsqlParameter> parameters);
        Task<int> ExecuteNonQueryAsyncPg(string dbstr, string sql, List<NpgsqlParameter>? parameters);

        Task<T?> GetSingleFromSPAsync<T>(string dbstr, string sp_name, Dictionary<string, string> parameters) where T : class, new();
        Task<List<T>> GetListFromSPAsync<T>(string dbstr, string sp_name, Dictionary<string, string> parameters) where T : new();
        Task<List<T>> GetListFromFunctionAsync<T>(string dbstr, string sp_name, Dictionary<string, string> parameters) where T : new();
        Task<List<T>> GetListFromFunctionAsyncO<T>(string dbstr, string sp_name, Dictionary<string, object> parameters) where T : new();
        Task<List<T>> GetListFromFunctionAsyncPg<T>(string dbstr, string functionName, List<NpgsqlParameter> parameters) where T : new();
        Task ExecFunctionAsync(string dbstr, string functionName, Dictionary<string, object> parameters);

        Task<List<T>> QueryAsyncPg<T>(
            string connectionName,
            string sql,
            IEnumerable<NpgsqlParameter>? parameters = null,
            CancellationToken ct = default
        ) where T : new();

    }

}

using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Shared.Services
{
    public interface IErrorLogService
    {
        public Task SaveApiErrorLogAsync(string apiName, string? userId, Exception ex, HttpContext context);
    }

    public interface IApiLogService
    {
        public Task SaveApiRequestLogAsync(HttpContext context);
    }

    public class ErrorLogService : IErrorLogService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public ErrorLogService(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        public async Task SaveApiErrorLogAsync(string apiName, string? userId, Exception ex, HttpContext context)
        {
            const string sql = @"
                    INSERT INTO api_error_log (
                        api_name,
                        user_id,
                        request_path,
                        request_method,
                        request_query_string,
                        request_body,
                        error_message,
                        stack_trace,
                        error_type,
                        trace_id,
                        client_ip,
                        user_agent,
                        created_at
                    )
                    VALUES (
                        @api_name,
                        @user_id,
                        @request_path,
                        @request_method,
                        @request_query_string,
                        @request_body,
                        @error_message,
                        @stack_trace,
                        @error_type,
                        @trace_id,
                        @client_ip,
                        @user_agent,
                        @created_at
                    );";

            var parameters = new List<Npgsql.NpgsqlParameter>
                {
                    new("@api_name", apiName),
                    new("@user_id", (object?)userId ?? DBNull.Value),
                    new("@request_path", context.Request.Path.ToString()),
                    new("@request_method", context.Request.Method),
                    new("@request_query_string", context.Request.QueryString.ToString() ?? string.Empty),
                    new("@request_body", string.Empty), // TODO: Request Body 읽기 구현 필요
                    new("@error_message", ex.Message),
                    new("@stack_trace", ex.StackTrace ?? string.Empty),
                    new("@error_type", ex.GetType().Name),
                    new("@trace_id", context.TraceIdentifier),
                    new("@client_ip", context.Connection.RemoteIpAddress?.ToString() ?? string.Empty),
                    new("@user_agent", context.Request.Headers["User-Agent"].ToString() ?? string.Empty),
                    new("@created_at", DateTime.Now)
                };

             await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
        }
    }

    public class ApiLogService : IApiLogService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public ApiLogService(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        public async Task SaveApiRequestLogAsync(HttpContext context)
        {
            // TODO: API 요청 로그 저장 구현
            // 수집할 필드:
            // - request_path (요청 경로)
            // - request_method (HTTP 메소드)
            // - request_query_string (쿼리 스트링)
            // - request_body (요청 본문)
            // - response_status_code (응답 상태 코드)
            // - user_id (사용자 ID - 인증 정보에서)
            // - client_ip (클라이언트 IP)
            // - user_agent (User Agent)
            // - trace_id (추적 ID)
            // - request_time (요청 시간)
            // - response_time (응답 시간)
            // - execution_duration_ms (실행 시간)

            await Task.CompletedTask;
        }
    }
}

using Microsoft.AspNetCore.Http;
using RealestateAPI.Shared.Services;

namespace RealestateAPI.Shared.Middleware
{
    public class ApiLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ApiLoggingMiddleware> _logger;

        public ApiLoggingMiddleware(RequestDelegate next, ILogger<ApiLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IApiLogService apiLogService)
        {
            await LogApiRequestAsync(context, apiLogService);
            await _next(context);
        }

        private async Task LogApiRequestAsync(HttpContext context, IApiLogService apiLogService)
        {
            await apiLogService.SaveApiRequestLogAsync(context);
        }
    }
}

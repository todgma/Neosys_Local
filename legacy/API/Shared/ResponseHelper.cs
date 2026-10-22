using Microsoft.AspNetCore.Http;
using RealestateAPI.Shared.Services;
using RealestateAPI.Shared.Exceptions;

namespace RealestateAPI.Shared
{
    public static class ResponseHelper
    {
        public static object Error(string code, string message, HttpContext? httpContext = null)
        {
            throw new ApiException(code, message);
        }

        public static object Success(object? data, string? msg)
        {
            return new
            {
                success = true,
                data,
                message = msg
            };
        }

        public static object Required(string? field, HttpContext httpContext)
        {
            return new
            {
                success = false,
                error = new
                {
                    code = "VALIDATION_ERROR",
                    message = "필수 값 누락",
                    details = new { field, reason = "Required" }
                },
                traceId = httpContext.TraceIdentifier
            };
        }

        public static async Task<object> ErrorAsync(
        string code,
        string message,
        HttpContext context,
        Exception? ex = null,
        IErrorLogService? errorLogService = null,
        string? apiName = null,
        string? userId = null)
        {
            if (ex != null && errorLogService != null)
            {
                await errorLogService.SaveApiErrorLogAsync(apiName ?? context.Request.Path, userId, ex, context);
            }

            return new
            {
                success = false,
                code,
                message,
                timestamp = DateTime.Now
            };
        }
    }
}

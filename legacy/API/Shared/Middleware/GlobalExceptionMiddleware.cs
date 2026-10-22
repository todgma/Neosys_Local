using Microsoft.AspNetCore.Http;
using RealestateAPI.Shared.Services;
using RealestateAPI.Shared.Exceptions;
using System.Text.Json;

namespace RealestateAPI.Shared.Middleware
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IErrorLogService errorLogService)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception occurred");
                await HandleExceptionAsync(context, ex, errorLogService);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception, IErrorLogService errorLogService)
        {
            // 에러 로그 저장
            await errorLogService.SaveApiErrorLogAsync(
                apiName: context.Request.Path,
                userId: null, // TODO: 사용자 인증 정보에서 가져오기
                ex: exception,
                context: context
            );

            // 응답 설정
            context.Response.ContentType = "application/json";

            // 예외 응답에도 CORS 헤더 보장 (미들웨어 순서/예외로 헤더가 누락되면 브라우저가 실제 에러 대신 CORS 오류로 표기)
            if (!context.Response.Headers.ContainsKey("Access-Control-Allow-Origin"))
            {
                var origin = context.Request.Headers["Origin"].ToString();
                context.Response.Headers["Access-Control-Allow-Origin"] = string.IsNullOrEmpty(origin) ? "*" : origin;
            }

            // ApiException인 경우 400, 그 외는 500
            context.Response.StatusCode = exception is ApiException
                ? StatusCodes.Status400BadRequest
                : StatusCodes.Status500InternalServerError;

            // ResponseHelper.Error 형식과 동일한 응답
            var response = new
            {
                success = false,
                error = new
                {
                    code = exception is ApiException apiEx ? apiEx.Code : "INTERNAL_SERVER_ERROR",
                    message = exception.Message
                },
                traceId = context.TraceIdentifier
            };

            var jsonResponse = JsonSerializer.Serialize(response);
            await context.Response.WriteAsync(jsonResponse);
        }
    }
}

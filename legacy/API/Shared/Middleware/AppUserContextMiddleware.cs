using Microsoft.AspNetCore.Http;

namespace RealestateAPI.Shared.Middleware
{
    /// <summary>
    /// 요청마다 로그인 userId / 클라이언트 IP를 HttpContext.Items 에 저장.
    ///  · 공통 DB 헬퍼(PostgresDataService)가 이 값을 읽어 app.uid 세션변수로 주입 → _hist 트리거의 작성자 기록에 사용.
    ///  · userId 전달 방식이 혼재(쿼리 userId/UserId, 헤더 X-User-Id)하므로 모두 수용.
    /// </summary>
    public class AppUserContextMiddleware
    {
        private readonly RequestDelegate _next;
        public AppUserContextMiddleware(RequestDelegate next) => _next = next;

        public async Task InvokeAsync(HttpContext ctx)
        {
            string? uid = ctx.Request.Query["userId"].FirstOrDefault()
                       ?? ctx.Request.Query["UserId"].FirstOrDefault()
                       ?? ctx.Request.Headers["X-User-Id"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(uid)) ctx.Items["app.uid"] = uid;

            var ip = ctx.Connection.RemoteIpAddress?.ToString();
            if (!string.IsNullOrWhiteSpace(ip)) ctx.Items["app.ip"] = ip;

            await _next(ctx);
        }
    }
}

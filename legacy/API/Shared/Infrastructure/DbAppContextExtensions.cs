using Microsoft.AspNetCore.Http;
using Npgsql;

namespace RealestateAPI.Shared.Infrastructure
{
    /// <summary>
    /// 작업이력(_hist) 트리거가 "누가 변경했는지"를 알 수 있도록 DB 세션변수(app.uid/app.ip)를 설정.
    ///  · fn_hist_snapshot 트리거가 current_setting('app.uid') 로 작성자를 보강한다.
    ///  · 저장(INSERT/UPDATE/DELETE)이 일어나는 "같은 연결"에서 저장 직전에 호출해야 한다.
    /// </summary>
    public static class DbAppContextExtensions
    {
        // 서비스가 로그인 userId를 직접 아는 경우(저장 트랜잭션 연결에 1회 호출)
        public static async Task SetAppUidAsync(this NpgsqlConnection conn, string? uid, string? ip = null)
        {
            try
            {
                await using var cmd = new NpgsqlCommand(
                    "SELECT set_config('app.uid', @u, false), set_config('app.ip', @i, false)", conn);
                cmd.Parameters.AddWithValue("@u", (object)(uid ?? ""));
                cmd.Parameters.AddWithValue("@i", (object)(ip ?? ""));
                await cmd.ExecuteNonQueryAsync();
            }
            catch { /* 세션변수 설정 실패는 본 작업을 막지 않음 */ }
        }

        // HttpContext(미들웨어가 채움)에서 uid/ip를 읽어 설정(공통 헬퍼용)
        public static Task SetAppUserAsync(this NpgsqlConnection conn, IHttpContextAccessor? http)
        {
            var items = http?.HttpContext?.Items;
            string? uid = items != null && items.TryGetValue("app.uid", out var u) ? u as string : null;
            string? ip = items != null && items.TryGetValue("app.ip", out var i) ? i as string : null;
            if (string.IsNullOrWhiteSpace(uid)) return Task.CompletedTask; // uid 없으면 설정 생략(불필요한 왕복 방지)
            return conn.SetAppUidAsync(uid, ip);
        }
    }
}

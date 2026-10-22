using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace RealestateAPI.Realestater.Controllers
{
    // 로그인 이력 기록 (수동/자동 로그인 공통). IP는 서버에서 캡처(프록시/LB 뒤: X-Forwarded-For 우선)
    [ApiController]
    [Route("api/auth")]
    public class LoginHistoryController : ControllerBase
    {
        private readonly IPostgresDataService _db;
        public LoginHistoryController(IPostgresDataService db) { _db = db; }

        // 실제 클라이언트 IP 추출: X-Forwarded-For(공인 IP 우선) → X-Real-IP → 소켓 IP
        //  ※ LB/프록시가 클라이언트 IP를 XFF로 넘겨야 유효(아래 nginx/LB 설정 참고)
        private static bool IsPrivate(string ip)
        {
            if (string.IsNullOrWhiteSpace(ip)) return true;
            ip = ip.Trim();
            if (ip.StartsWith("10.") || ip.StartsWith("127.") || ip.StartsWith("192.168.") || ip == "::1" || ip.StartsWith("fe80")) return true;
            if (ip.StartsWith("172."))
            {
                var parts = ip.Split('.');
                if (parts.Length > 1 && int.TryParse(parts[1], out var b) && b >= 16 && b <= 31) return true;
            }
            return false;
        }
        private string ResolveClientIp()
        {
            var xff = Request.Headers["X-Forwarded-For"].ToString();
            if (!string.IsNullOrWhiteSpace(xff))
            {
                var chain = xff.Split(',').Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                var pub = chain.FirstOrDefault(s => !IsPrivate(s));
                if (!string.IsNullOrEmpty(pub)) return pub;          // 체인 중 첫 공인 IP
                if (chain.Count > 0) return chain[0];                 // 전부 사설이면 첫 값
            }
            var xreal = Request.Headers["X-Real-IP"].ToString();
            if (!string.IsNullOrWhiteSpace(xreal)) return xreal.Trim();
            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "";
        }

        [HttpPost("login-log")]
        public async Task<IActionResult> LogLogin([FromBody] LoginLogDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.UserId))
                return Ok(ResponseHelper.Error("BAD_REQUEST", "userId는 필수입니다."));

            var ip = ResolveClientIp();
            var ua = Request.Headers["User-Agent"].ToString();
            if (!string.IsNullOrEmpty(ua) && ua.Length > 400) ua = ua.Substring(0, 400);

            // user_id 기준 upsert: 1행 유지, 마지막 로그인일시/IP 갱신 + 로그인 횟수 누적
            const string sql = @"
                INSERT INTO public.rt_login_log (user_id, login_dt, ip, user_agent, login_type, login_cnt, first_login_dt)
                VALUES (@uid, now(), @ip, @ua, COALESCE(@type,'MANUAL'), 1, now())
                ON CONFLICT (user_id) DO UPDATE SET
                    login_dt   = now(),
                    ip         = EXCLUDED.ip,
                    user_agent = EXCLUDED.user_agent,
                    login_type = EXCLUDED.login_type,
                    login_cnt  = public.rt_login_log.login_cnt + 1";
            await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@uid",  NpgsqlDbType.Varchar) { Value = dto.UserId },
                new NpgsqlParameter("@ip",   NpgsqlDbType.Varchar) { Value = (object?)(string.IsNullOrEmpty(ip) ? null : ip) ?? DBNull.Value },
                new NpgsqlParameter("@ua",   NpgsqlDbType.Varchar) { Value = (object?)(string.IsNullOrEmpty(ua) ? null : ua) ?? DBNull.Value },
                new NpgsqlParameter("@type", NpgsqlDbType.Varchar) { Value = (object?)dto.LoginType ?? DBNull.Value },
            });

            // 최초 로그인 시 소속 사무소의 허용 IP 캡처(AllowIp가 아직 비어있을 때만).
            //  · 사무소 소속 중개사 중 처음 로그인한 사람의 공인 IP가 사무소 기준 IP로 저장됨
            //  · 관리자가 초기화(NULL)하면 다음 로그인에서 재캡처됨
            if (!string.IsNullOrEmpty(ip))
            {
                const string ofcSql = @"
                    UPDATE ofc_realter_office o
                       SET ""AllowIp"" = @ip, ""UpdDt"" = now()
                      FROM rt_realtor_info r
                     WHERE r.""Id"" = @uid
                       AND r.""OffNo"" = o.""OffNo""
                       AND o.""AllowIp"" IS NULL";
                await _db.ExecuteNonQueryAsyncPg("DEV", ofcSql, new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@uid", NpgsqlDbType.Varchar) { Value = dto.UserId },
                    new NpgsqlParameter("@ip",  NpgsqlDbType.Varchar) { Value = ip },
                });
            }
            return Ok(ResponseHelper.Success(true, "로그인 이력 기록"));
        }

        // 장기 미접속자 조회(관리자) — days일 이상 미접속 사용자의 마지막 로그인
        [HttpGet("login-log/stale")]
        public async Task<IActionResult> Stale([FromQuery] int days = 30)
        {
            const string sql = @"
                SELECT user_id AS ""UserId"",
                       to_char(login_dt, 'YYYY-MM-DD HH24:MI:SS') AS ""LastLogin""
                  FROM public.rt_login_log
                 WHERE login_dt < now() - (@days || ' days')::interval
                 ORDER BY login_dt";
            var rows = await _db.QueryAsyncPg<StaleRow>("DEV", sql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@days", NpgsqlDbType.Integer) { Value = days <= 0 ? 30 : days },
            });
            return Ok(ResponseHelper.Success(rows?.ToList() ?? new List<StaleRow>(), "장기 미접속자"));
        }
    }

    public class LoginLogDto
    {
        public string? UserId { get; set; }
        public string? LoginType { get; set; } // MANUAL | AUTO
    }
    public class StaleRow
    {
        public string? UserId { get; set; }
        public string? LastLogin { get; set; }
    }
}

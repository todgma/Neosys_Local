using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace RealestateAPI.Admin.Controllers
{
    // 관리자 - 추천인 코드 PREFIX 관리 (기간별 앞자리 코드). 소급 적용 포함.
    [ApiController]
    [Route("api/admin/referral-prefix")]
    public class ReferralPrefixController : ControllerBase
    {
        private readonly IPostgresDataService _db;
        public ReferralPrefixController(IPostgresDataService db) { _db = db; }

        private sealed class JsonRow { public string? Json { get; set; } }
        private static List<object> Parse(IEnumerable<JsonRow>? rows)
            => rows?.Where(r => !string.IsNullOrWhiteSpace(r.Json))
                    .Select(r => (object)JsonSerializer.Deserialize<JsonElement>(r.Json!)).ToList() ?? new List<object>();

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };
        private static DateTime? Date(string? s) => (DateTime.TryParse(s, out var d) ? d.Date : (DateTime?)null);

        /// <summary>기간별 PREFIX 목록</summary>
        [HttpGet]
        public async Task<IActionResult> GetList()
        {
            const string sql = @"SELECT to_jsonb(t)::text AS ""Json"" FROM (
                SELECT id, prefix, to_char(start_date,'YYYY-MM-DD') AS start_date,
                       to_char(end_date,'YYYY-MM-DD') AS end_date, memo, reg_id,
                       to_char(reg_dt,'YYYY-MM-DD HH24:MI') AS reg_dt
                  FROM referral_code_prefix ORDER BY start_date DESC, id DESC) t";
            try
            {
                var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, new List<NpgsqlParameter>());
                return Ok(ResponseHelper.Success(new { items = Parse(rows) }, "조회 성공"));
            }
            catch (Exception ex)
            {
                return Ok(ResponseHelper.Success(new { items = new List<object>(), error = ex.Message }, "테이블 없음(마이그레이션 필요)"));
            }
        }

        public class PrefixDto
        {
            public string? Prefix { get; set; }
            public string? StartDate { get; set; }
            public string? EndDate { get; set; }
            public string? Memo { get; set; }
            public string? UserId { get; set; }
        }

        /// <summary>기간 PREFIX 추가</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PrefixDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Prefix) || Date(dto?.StartDate) == null)
                return Ok(ResponseHelper.Error("VALIDATION", "앞자리 코드와 시작일은 필수입니다."));
            const string sql = @"INSERT INTO referral_code_prefix (prefix, start_date, end_date, memo, reg_id)
                                 VALUES (@prefix, @start, @end, @memo, @uid)";
            var ps = new List<NpgsqlParameter>
            {
                P("@prefix", NpgsqlDbType.Varchar, dto!.Prefix!.Trim()),
                P("@start", NpgsqlDbType.Date, Date(dto.StartDate)),
                P("@end", NpgsqlDbType.Date, Date(dto.EndDate)),
                P("@memo", NpgsqlDbType.Varchar, (object?)dto.Memo ?? DBNull.Value),
                P("@uid", NpgsqlDbType.Varchar, (object?)dto.UserId ?? DBNull.Value),
            };
            await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps);
            return Ok(ResponseHelper.Success(new { created = true }, "추가 성공"));
        }

        /// <summary>기간 PREFIX 수정</summary>
        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] PrefixDto dto)
        {
            const string sql = @"UPDATE referral_code_prefix
                                    SET prefix = COALESCE(@prefix, prefix),
                                        start_date = COALESCE(@start, start_date),
                                        end_date = @end,
                                        memo = @memo,
                                        upd_dt = now()
                                  WHERE id = @id";
            var ps = new List<NpgsqlParameter>
            {
                P("@id", NpgsqlDbType.Bigint, id),
                P("@prefix", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(dto?.Prefix) ? null : dto!.Prefix!.Trim()),
                P("@start", NpgsqlDbType.Date, Date(dto?.StartDate)),
                P("@end", NpgsqlDbType.Date, Date(dto?.EndDate)),
                P("@memo", NpgsqlDbType.Varchar, (object?)dto?.Memo ?? DBNull.Value),
            };
            var ok = await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
            return Ok(ResponseHelper.Success(new { updated = ok }, ok ? "수정 성공" : "대상 없음"));
        }

        /// <summary>기간 PREFIX 삭제</summary>
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            var ok = await _db.ExecuteNonQueryAsyncPg("DEV", "DELETE FROM referral_code_prefix WHERE id = @id",
                new List<NpgsqlParameter> { P("@id", NpgsqlDbType.Bigint, id) }) > 0;
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }

        /// <summary>소급 적용 — 해당 기간에 가입한 대표중개사(RTTYP01)의 추천인 코드를 이 PREFIX로 재발급</summary>
        [HttpPost("{id:long}/apply")]
        public async Task<IActionResult> Apply(long id)
        {
            // 대상 기간/PREFIX 조회
            const string getSql = @"SELECT to_jsonb(t)::text AS ""Json"" FROM (
                SELECT prefix, to_char(start_date,'YYYY-MM-DD') AS start_date, to_char(end_date,'YYYY-MM-DD') AS end_date
                  FROM referral_code_prefix WHERE id = @id) t";
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", getSql, new List<NpgsqlParameter> { P("@id", NpgsqlDbType.Bigint, id) });
            var item = Parse(rows).FirstOrDefault();
            if (item == null) return Ok(ResponseHelper.Error("NOT_FOUND", "대상 기간이 없습니다."));
            var el = (JsonElement)item;
            string prefix = el.TryGetProperty("prefix", out var pp) ? (pp.GetString() ?? "A") : "A";
            string? start = el.TryGetProperty("start_date", out var sp) ? sp.GetString() : null;
            string? end = el.TryGetProperty("end_date", out var ep) && ep.ValueKind != JsonValueKind.Null ? ep.GetString() : null;

            // PREFIX만 교체, 순번(100001~)은 기존 코드의 숫자부 유지. 숫자부 없으면 시퀀스로 신규 발급.
            try { await _db.ExecuteNonQueryAsyncPg("DEV", "CREATE SEQUENCE IF NOT EXISTS referral_code_seq START WITH 100001 INCREMENT BY 1;", new List<NpgsqlParameter>()); } catch { /* ignore */ }
            const string upd = @"
                UPDATE rt_realtor_info r
                   SET referral_code = @prefix || CASE
                           WHEN r.referral_code ~ '[0-9]' THEN regexp_replace(r.referral_code, '\D', '', 'g')
                           ELSE nextval('referral_code_seq')::text END,
                       ""UpdDt"" = now()
                 WHERE r.""RtType"" = 'RTTYP01'
                   AND r.""RegDt""::date >= @start
                   AND (@end IS NULL OR r.""RegDt""::date <= @end)";
            var cnt = await _db.ExecuteNonQueryAsyncPg("DEV", upd, new List<NpgsqlParameter>
            {
                P("@prefix", NpgsqlDbType.Varchar, prefix),
                P("@start", NpgsqlDbType.Date, Date(start)),
                P("@end", NpgsqlDbType.Date, Date(end)),
            });
            return Ok(ResponseHelper.Success(new { applied = cnt }, $"{cnt}건 소급 적용"));
        }

        /// <summary>전체 재발급 — 모든 대표중개사(RTTYP01)의 추천인 코드를 가입일 기간 PREFIX(없으면 'A')로 재계산.
        /// PREFIX만 재계산하고 순번(100001~)은 기존 숫자부 유지. 숫자부 없으면 시퀀스로 신규 발급. 레거시 'RF/A000..' 코드도 정정.</summary>
        [HttpPost("reissue-all")]
        public async Task<IActionResult> ReissueAll()
        {
            try { await _db.ExecuteNonQueryAsyncPg("DEV", "CREATE SEQUENCE IF NOT EXISTS referral_code_seq START WITH 100001 INCREMENT BY 1;", new List<NpgsqlParameter>()); } catch { /* ignore */ }
            // 레거시 6자리 RtNo 코드(A000123 등)는 '숫자부 유지' 대상에서 제외하고 100001~ 로 신규 발급하기 위해
            //  · 숫자부가 100000 이상이면 유지, 그 외(레거시/없음)는 시퀀스로 신규 발급
            const string upd = @"
                UPDATE rt_realtor_info r
                   SET referral_code = COALESCE((
                           SELECT p.prefix FROM referral_code_prefix p
                            WHERE r.""RegDt""::date >= p.start_date
                              AND (p.end_date IS NULL OR r.""RegDt""::date <= p.end_date)
                            ORDER BY p.start_date DESC LIMIT 1), 'A')
                         || CASE
                               WHEN (NULLIF(regexp_replace(COALESCE(r.referral_code,''), '\D', '', 'g'), ''))::bigint >= 100001
                                   THEN regexp_replace(r.referral_code, '\D', '', 'g')
                               ELSE nextval('referral_code_seq')::text
                            END,
                       ""UpdDt"" = now()
                 WHERE r.""RtType"" = 'RTTYP01'";
            var cnt = await _db.ExecuteNonQueryAsyncPg("DEV", upd, new List<NpgsqlParameter>());
            return Ok(ResponseHelper.Success(new { applied = cnt }, $"{cnt}건 전체 재발급"));
        }

        /// <summary>다음 발급될 추천인 번호(시퀀스 소비 없이 미리보기) + 오늘 기준 PREFIX</summary>
        [HttpGet("next-number")]
        public async Task<IActionResult> NextNumber()
        {
            try { await _db.ExecuteNonQueryAsyncPg("DEV", "CREATE SEQUENCE IF NOT EXISTS referral_code_seq START WITH 100001 INCREMENT BY 1;", new List<NpgsqlParameter>()); } catch { /* ignore */ }
            const string sql = @"SELECT to_jsonb(t)::text AS ""Json"" FROM (
                SELECT
                    (SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END FROM referral_code_seq) AS next_number,
                    COALESCE((SELECT prefix FROM referral_code_prefix
                               WHERE start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE)
                               ORDER BY start_date DESC, id DESC LIMIT 1), 'A') AS prefix
            ) t";
            try
            {
                var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, new List<NpgsqlParameter>());
                return Ok(ResponseHelper.Success(new { item = Parse(rows).FirstOrDefault() }, "다음 번호 조회"));
            }
            catch (Exception ex)
            {
                return Ok(ResponseHelper.Error("ERR", ex.Message));
            }
        }

        public class SetNextDto { public long? NextNumber { get; set; } }

        /// <summary>다음 추천인 번호 점프 — 시퀀스를 지정 번호로 설정(다음 발급분이 이 번호가 됨)</summary>
        [HttpPost("set-next")]
        public async Task<IActionResult> SetNext([FromBody] SetNextDto dto)
        {
            var n = dto?.NextNumber ?? 0;
            if (n < 100001) return Ok(ResponseHelper.Error("VALIDATION", "점프할 번호는 100001 이상의 숫자여야 합니다."));
            try { await _db.ExecuteNonQueryAsyncPg("DEV", "CREATE SEQUENCE IF NOT EXISTS referral_code_seq START WITH 100001 INCREMENT BY 1;", new List<NpgsqlParameter>()); } catch { /* ignore */ }
            // setval(seq, N, false) → 다음 nextval()이 N 을 반환
            var ps = new List<NpgsqlParameter> { P("@n", NpgsqlDbType.Bigint, n) };
            await _db.ExecuteNonQueryAsyncPg("DEV", "SELECT setval('referral_code_seq', @n, false);", ps);
            return Ok(ResponseHelper.Success(new { nextNumber = n }, $"다음 추천인 번호를 {n}(으)로 설정했습니다."));
        }
    }
}

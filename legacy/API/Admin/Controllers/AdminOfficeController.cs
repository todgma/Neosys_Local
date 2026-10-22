using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace RealestateAPI.Admin.Controllers
{
    // 관리자 - 중개사무소 관리. 사무소 허용 IP(AllowIp) 조회/설정/초기화 포함
    [ApiController]
    [Route("api/admin/offices")]
    public class AdminOfficeController : ControllerBase
    {
        private readonly IPostgresDataService _db;
        public AdminOfficeController(IPostgresDataService db) { _db = db; }

        private sealed class JsonRow { public string? Json { get; set; } }
        // System.Text.Json JsonElement로 파싱(앱 기본 직렬화기와 호환). Newtonsoft JObject는 []로 깨짐
        private static List<object> Parse(IEnumerable<JsonRow>? rows)
            => rows?.Where(r => !string.IsNullOrWhiteSpace(r.Json))
                    .Select(r => (object)JsonSerializer.Deserialize<JsonElement>(r.Json!)).ToList() ?? new List<object>();

        /// <summary>사무소 목록 — 소속직원수·멤버십·허용IP(AllowIp) 포함</summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] string? q)
        {
            object qVal = string.IsNullOrWhiteSpace(q) ? (object)DBNull.Value : q.Trim();
            List<NpgsqlParameter> QP() => new List<NpgsqlParameter> { new NpgsqlParameter("@q", NpgsqlDbType.Varchar) { Value = qVal } };

            // to_jsonb(o)에 AllowIp 등 전체 컬럼 포함 + 소속직원수/멤버십명 병합
            string sql = @"
                SELECT (to_jsonb(o) || jsonb_build_object(
                            'MemberCnt', (SELECT count(*) FROM rt_realtor_info r WHERE r.""OffNo"" = o.""OffNo""),
                            'ReferralCode', (SELECT r.referral_code FROM rt_realtor_info r WHERE r.""OffNo"" = o.""OffNo"" AND r.""RtType"" = 'RTTYP01' ORDER BY r.""RtNo"" LIMIT 1),
                            'EntryFeePaid', EXISTS (SELECT 1 FROM office_entry_fee e WHERE e.off_no = o.""OffNo""::bigint),
                            'MembershipName', mp.prod_name
                        ))::text AS ""Json""
                  FROM ofc_realter_office o
                  LEFT JOIN office_membership om ON om.off_no = o.""OffNo""
                  LEFT JOIN membership_product mp ON mp.prod_id = om.prod_id
                 WHERE COALESCE(o.""UseYn"", 'Y') <> 'N'   -- 비활성화된 사무소는 제외
                   AND (@q IS NULL OR o.""OffNm"" ILIKE '%'||@q||'%'
                                  OR o.""RpsNm"" ILIKE '%'||@q||'%'
                                  OR o.""RegNo"" ILIKE '%'||@q||'%')
                 ORDER BY o.""OffNo"" DESC
                 LIMIT 500";
            try
            {
                var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, QP());
                return Ok(ResponseHelper.Success(new { items = Parse(rows) }, "사무소 목록 조회 성공"));
            }
            catch
            {
                // 멤버십 테이블 미존재 등 → 사무소 단독 목록(소속직원수 포함)
                string fb = @"
                    SELECT (to_jsonb(o) || jsonb_build_object(
                                'MemberCnt', (SELECT count(*) FROM rt_realtor_info r WHERE r.""OffNo"" = o.""OffNo""),
                                'ReferralCode', (SELECT r.referral_code FROM rt_realtor_info r WHERE r.""OffNo"" = o.""OffNo"" AND r.""RtType"" = 'RTTYP01' ORDER BY r.""RtNo"" LIMIT 1),
                                'EntryFeePaid', EXISTS (SELECT 1 FROM office_entry_fee e WHERE e.off_no = o.""OffNo""::bigint)
                            ))::text AS ""Json""
                      FROM ofc_realter_office o
                     WHERE COALESCE(o.""UseYn"", 'Y') <> 'N'
                       AND (@q IS NULL OR o.""OffNm"" ILIKE '%'||@q||'%'
                                      OR o.""RpsNm"" ILIKE '%'||@q||'%'
                                      OR o.""RegNo"" ILIKE '%'||@q||'%')
                     ORDER BY o.""OffNo"" DESC LIMIT 500";
                var rows = await _db.QueryAsyncPg<JsonRow>("DEV", fb, QP());
                return Ok(ResponseHelper.Success(new { items = Parse(rows) }, "사무소 목록 조회 성공"));
            }
        }

        /// <summary>사무소 허용 IP 설정/초기화 — allowIp가 비어있으면 초기화(NULL, 다음 로그인 시 재캡처)</summary>
        [HttpPut("{offNo:long}/allow-ip")]
        public async Task<IActionResult> SetAllowIp(long offNo, [FromBody] AllowIpDto dto)
        {
            string? ip = string.IsNullOrWhiteSpace(dto?.AllowIp) ? null : dto!.AllowIp!.Trim();
            const string sql = @"
                UPDATE ofc_realter_office
                   SET ""AllowIp"" = @ip, ""UpdDt"" = now()
                 WHERE ""OffNo"" = @off";
            var ok = await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@off", NpgsqlDbType.Bigint) { Value = offNo },
                new NpgsqlParameter("@ip",  NpgsqlDbType.Varchar) { Value = (object?)ip ?? DBNull.Value },
            }) > 0;
            return Ok(ResponseHelper.Success(new { updated = ok, allowIp = ip },
                ip == null ? "허용 IP 초기화" : "허용 IP 설정 성공"));
        }

        /// <summary>사무소 활성/비활성 — 비활성(Active=false) 시 소속 회원 전원이 사용자/사무소 관리에서 제외되고 탈퇴회원관리로 이동</summary>
        [HttpPut("{offNo:long}/active")]
        public async Task<IActionResult> SetActive(long offNo, [FromBody] OfficeActiveDto dto)
        {
            string useYn = (dto?.Active ?? false) ? "Y" : "N";
            const string sql = @"
                UPDATE ofc_realter_office
                   SET ""UseYn"" = @u, ""UpdDt"" = now()
                 WHERE ""OffNo"" = @off";
            var ok = await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@off", NpgsqlDbType.Bigint) { Value = offNo },
                new NpgsqlParameter("@u",   NpgsqlDbType.Varchar) { Value = useYn },
            }) > 0;
            return Ok(ResponseHelper.Success(new { updated = ok, active = useYn == "Y" },
                useYn == "N" ? "사무소 비활성화(탈퇴 처리)" : "사무소 활성화"));
        }
    }

    public class AllowIpDto
    {
        public string? AllowIp { get; set; }
    }

    public class OfficeActiveDto
    {
        public bool Active { get; set; }
    }
}

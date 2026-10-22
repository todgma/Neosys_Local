using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace RealestateAPI.Worklog.Controllers
{
    // 작업이력(메뉴별 스냅샷) 조회. 대표중개사 직원관리 [작업이력] 탭에서 사용
    //  · <원본>_hist 테이블을 메뉴키로 화이트리스트 매핑(임의 테이블 조회 차단)
    //  · 직전 스냅샷과 비교해 변경 컬럼 diff 계산
    [ApiController]
    [Route("api/worklog-history")]
    public class WorklogHistoryController : ControllerBase
    {
        private readonly IPostgresDataService _db;
        public WorklogHistoryController(IPostgresDataService db) { _db = db; }

        // 메뉴 정의: key(=원본테이블) → (group, label, pk컬럼들)
        private sealed record MenuDef(string Group, string Label, string[] Pk);
        private static readonly Dictionary<string, MenuDef> MENUS = new()
        {
            ["rt_realtor_info"]      = new("직원·사무소", "직원정보",     new[] { "RtNo" }),
            ["ofc_realter_office"]   = new("직원·사무소", "사무소정보",   new[] { "OffNo" }),
            ["ofc_non_shared"]       = new("직원·사무소", "비공개설정",   new[] { "non_idx" }),
            ["rt_menu_perm"]         = new("직원·사무소", "직원권한",     new[] { "rt_no", "menu_key" }),

            ["pt_sale"]              = new("물건",       "물건",         new[] { "pt_no" }),
            ["pt_sale_holder"]       = new("물건",       "물건 소유자",   new[] { "pt_no", "holder_idx" }),
            ["pt_land_additional"]   = new("물건",       "토지 부가정보", new[] { "land_id" }),
            ["pt_lease_status"]      = new("물건",       "임대 현황",     new[] { "lease_id" }),
            ["pt_occupancy"]         = new("물건",       "입주 정보",     new[] { "occupancy_no" }),
            ["pt_memo"]              = new("물건",       "물건 메모",     new[] { "memo_no" }),
            ["pt_share"]             = new("물건",       "물건 공유",     new[] { "share_no" }),

            ["ct_cust"]              = new("고객·상담",   "고객",         new[] { "cust_no" }),
            ["ct_cust_buyer"]        = new("고객·상담",   "매수 고객",     new[] { "cust_no", "seq" }),
            ["ct_interview"]         = new("고객·상담",   "상담",         new[] { "itv_no" }),
            ["ct_trd_area"]          = new("고객·상담",   "희망 지역",     new[] { "cust_no", "seq" }),
            ["ct_trd_info"]          = new("고객·상담",   "거래 정보",     new[] { "trd_no" }),

            ["cn_contract_mgt"]      = new("계약",       "계약관리",     new[] { "cn_no" }),
            ["cn_contract_spcl"]     = new("계약",       "특약사항",     new[] { "cn_no", "cns_no" }),
            ["contract_master"]      = new("계약",       "계약 마스터",   new[] { "master_id" }),
            ["contract_document"]    = new("계약",       "계약 문서",     new[] { "doc_id" }),

            ["rt_schedule"]          = new("일정",       "일정",         new[] { "schedule_id" }),
            ["rt_realtor_sche"]      = new("일정",       "중개사 일정",   new[] { "sch_idx" }),
            ["rt_schedule_link"]     = new("일정",       "일정 연결",     new[] { "link_id" }),

            ["rt_note"]              = new("쪽지",       "쪽지",         new[] { "note_id" }),
            ["rt_note_share"]        = new("쪽지",       "쪽지 공유",     new[] { "off_no", "owner_id", "partner_id" }),

            ["vd_vendor_info"]       = new("협력업체",   "협력업체",     new[] { "vendor_id" }),
            ["vd_vendor_region"]     = new("협력업체",   "협력업체 지역", new[] { "vendor_region_id" }),

            ["cs_customer_center"]   = new("고객센터",   "고객센터 문의", new[] { "inquiry_id" }),
        };

        // diff에서 제외할 메타 컬럼
        private static readonly HashSet<string> META = new(StringComparer.OrdinalIgnoreCase)
        { "hist_id", "log_type", "logged_at", "changed_by", "changed_off", "client_ip" };

        private sealed class HistRaw
        {
            public long HistId { get; set; }
            public string? LogType { get; set; }
            public DateTime LoggedAt { get; set; }
            public string? ChangedBy { get; set; }
            public string? Row { get; set; }
            public string? Prev { get; set; }
        }

        /// <summary>메뉴(항목) 목록 — 프론트 탭/드롭다운 구성용</summary>
        [HttpGet("menus")]
        public IActionResult Menus()
        {
            var items = MENUS.Select(kv => new { key = kv.Key, group = kv.Value.Group, label = kv.Value.Label })
                             .OrderBy(x => x.group).ThenBy(x => x.label).ToList();
            return Ok(ResponseHelper.Success(new { items }, "메뉴 목록"));
        }

        /// <summary>메뉴별 작업이력 조회 — 대표는 본인 사무소(offNo) 강제, 직원별(userId) 필터 가능</summary>
        [HttpGet("{menuKey}")]
        public async Task<IActionResult> GetHistory(
            string menuKey,
            [FromQuery] long? offNo,
            [FromQuery] string? userId,     // 직원 필터(= changed_by, rt_realtor_info.Id)
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int page = 1,
            [FromQuery] int size = 50)
        {
            if (!MENUS.TryGetValue(menuKey, out var def))
                return Ok(ResponseHelper.Error("BAD_MENU", "허용되지 않은 메뉴입니다."));

            if (page < 1) page = 1;
            if (size < 1 || size > 200) size = 50;
            int skip = (page - 1) * size;

            // 화이트리스트에서만 온 값이라 안전. PK 파티션 표현식 구성
            string table = menuKey + "_hist";
            string pkExpr = string.Join(" || '¶' || ", def.Pk.Select(c => $"COALESCE(t.\"{c}\"::text,'')"));

            string sql = $@"
                WITH h AS (
                    SELECT hist_id, log_type, logged_at, changed_by, changed_off,
                           to_jsonb(t)::text AS row_j,
                           lag(to_jsonb(t)::text) OVER (PARTITION BY {pkExpr} ORDER BY logged_at, hist_id) AS prev_j
                      FROM public.""{table}"" t
                     WHERE (@off  IS NULL OR changed_off = @off)
                       AND (@by   IS NULL OR changed_by  = @by)
                       AND (@from IS NULL OR logged_at   >= @from)
                       AND (@to   IS NULL OR logged_at   <  @to)
                )
                SELECT hist_id AS ""HistId"", log_type AS ""LogType"", logged_at AS ""LoggedAt"",
                       changed_by AS ""ChangedBy"", row_j AS ""Row"", prev_j AS ""Prev""
                  FROM h
                 ORDER BY logged_at DESC, hist_id DESC
                 LIMIT @size OFFSET @skip";

            var ps = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@off",  NpgsqlDbType.Bigint)      { Value = (object?)offNo ?? DBNull.Value },
                new NpgsqlParameter("@by",   NpgsqlDbType.Varchar)     { Value = string.IsNullOrWhiteSpace(userId) ? DBNull.Value : userId },
                new NpgsqlParameter("@from", NpgsqlDbType.TimestampTz) { Value = (object?)from ?? DBNull.Value },
                new NpgsqlParameter("@to",   NpgsqlDbType.TimestampTz) { Value = (object?)to ?? DBNull.Value },
                new NpgsqlParameter("@size", NpgsqlDbType.Integer)     { Value = size },
                new NpgsqlParameter("@skip", NpgsqlDbType.Integer)     { Value = skip },
            };

            var rows = await _db.QueryAsyncPg<HistRaw>("DEV", sql, ps);
            var items = (rows ?? new List<HistRaw>()).Select(r => Build(r, def)).ToList();
            return Ok(ResponseHelper.Success(new { items, page, size, label = def.Label, group = def.Group }, "작업이력 조회"));
        }

        // 스냅샷 → 표시 항목(변경 diff 포함)
        private static object Build(HistRaw r, MenuDef def)
        {
            JObject? cur = TryParse(r.Row);
            JObject? prev = TryParse(r.Prev);
            var diff = new List<object>();

            if (cur != null)
            {
                if (r.LogType == "I" || prev == null)
                {
                    // 등록: 값이 있는 컬럼을 신규로 표기
                    foreach (var p in cur.Properties())
                    {
                        if (META.Contains(p.Name)) continue;
                        if (p.Value == null || p.Value.Type == JTokenType.Null) continue;
                        diff.Add(new { col = p.Name, oldVal = (string?)null, newVal = p.Value.ToString() });
                    }
                }
                else if (r.LogType == "D")
                {
                    // 삭제: 삭제 직전 값 표기(참고)
                    foreach (var p in cur.Properties())
                    {
                        if (META.Contains(p.Name)) continue;
                        diff.Add(new { col = p.Name, oldVal = p.Value?.ToString(), newVal = (string?)null });
                    }
                }
                else
                {
                    // 수정: 변경된 컬럼만
                    foreach (var p in cur.Properties())
                    {
                        if (META.Contains(p.Name)) continue;
                        var oldTok = prev[p.Name];
                        if (!JToken.DeepEquals(oldTok ?? JValue.CreateNull(), p.Value ?? JValue.CreateNull()))
                            diff.Add(new { col = p.Name, oldVal = oldTok?.ToString(), newVal = p.Value?.ToString() });
                    }
                }
            }

            // 표시용 PK 값
            var pk = cur == null ? "" : string.Join(", ", def.Pk.Select(k => cur[k]?.ToString() ?? ""));

            return new
            {
                histId = r.HistId,
                logType = r.LogType,   // I/U/D
                loggedAt = r.LoggedAt,
                changedBy = r.ChangedBy,
                pk,
                diffCount = diff.Count,
                diff,
            };
        }

        private static JObject? TryParse(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            try { return JObject.Parse(s); } catch { return null; }
        }
    }
}

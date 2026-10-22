using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace RealestateAPI.Worklog.Controllers
{
    // 업무일지 저장/조회 + 사무소 공유설정 + 날짜별 전 직원 이력(통합) 조회
    //  · 저장: (user_id 로그인 Id, jrnl_date) upsert
    //  · 이력: 여러 <원본>_hist 테이블을 UNION → 해당 사무소·날짜의 모든 작업이력을 시간 오름차순으로
    [ApiController]
    [Route("api/worklog")]
    public class WorkJournalController : ControllerBase
    {
        private readonly IPostgresDataService _db;
        public WorkJournalController(IPostgresDataService db) { _db = db; }

        // 이력 통합 대상: 원본테이블 → (라벨, pk컬럼들). WorklogHistoryController 화이트리스트와 동일
        private sealed record Src(string Label, string[] Pk);
        private static readonly Dictionary<string, Src> SRC = new()
        {
            ["rt_realtor_info"]    = new("직원정보",     new[] { "RtNo" }),
            ["ofc_realter_office"] = new("사무소정보",   new[] { "OffNo" }),
            ["ofc_non_shared"]     = new("비공개설정",   new[] { "non_idx" }),
            ["rt_menu_perm"]       = new("직원권한",     new[] { "rt_no", "menu_key" }),
            ["pt_sale"]            = new("물건",         new[] { "pt_no" }),
            ["pt_sale_holder"]     = new("물건 소유자",   new[] { "pt_no", "holder_idx" }),
            ["pt_land_additional"] = new("토지 부가정보", new[] { "land_id" }),
            ["pt_lease_status"]    = new("임대 현황",     new[] { "lease_id" }),
            ["pt_occupancy"]       = new("입주 정보",     new[] { "occupancy_no" }),
            ["pt_memo"]            = new("물건 메모",     new[] { "memo_no" }),
            ["pt_share"]           = new("물건 공유",     new[] { "share_no" }),
            ["ct_cust"]            = new("고객",         new[] { "cust_no" }),
            ["ct_cust_buyer"]      = new("매수 고객",     new[] { "cust_no", "seq" }),
            ["ct_interview"]       = new("상담",         new[] { "itv_no" }),
            ["ct_trd_area"]        = new("희망 지역",     new[] { "cust_no", "seq" }),
            ["ct_trd_info"]        = new("거래 정보",     new[] { "trd_no" }),
            ["cn_contract_mgt"]    = new("계약관리",     new[] { "cn_no" }),
            ["cn_contract_spcl"]   = new("특약사항",     new[] { "cn_no", "cns_no" }),
            ["contract_master"]    = new("계약 마스터",   new[] { "master_id" }),
            ["contract_document"]  = new("계약 문서",     new[] { "doc_id" }),
            ["rt_schedule"]        = new("일정",         new[] { "schedule_id" }),
            ["rt_realtor_sche"]    = new("중개사 일정",   new[] { "sch_idx" }),
            ["rt_schedule_link"]   = new("일정 연결",     new[] { "link_id" }),
            ["rt_note"]            = new("쪽지",         new[] { "note_id" }),
            ["rt_note_share"]      = new("쪽지 공유",     new[] { "off_no", "owner_id", "partner_id" }),
            ["vd_vendor_info"]     = new("협력업체",     new[] { "vendor_id" }),
            ["vd_vendor_region"]   = new("협력업체 지역", new[] { "vendor_region_id" }),
            ["cs_customer_center"] = new("고객센터 문의", new[] { "inquiry_id" }),
        };

        private sealed class JsonRow { public string? Json { get; set; } }
        private sealed class NameRow { public string? Name { get; set; } }

        // ── 업무일지 단건 조회 ──
        [HttpGet("journal")]
        public async Task<IActionResult> GetJournal([FromQuery] string userId, [FromQuery] DateTime date)
        {
            const string sql = @"
                SELECT to_jsonb(j)::text AS ""Json""
                  FROM rt_work_journal j
                 WHERE j.user_id = @uid AND j.jrnl_date = @date
                 LIMIT 1";
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@uid",  NpgsqlDbType.Varchar) { Value = (object?)userId ?? DBNull.Value },
                new NpgsqlParameter("@date", NpgsqlDbType.Date)    { Value = date.Date },
            });
            var first = rows?.FirstOrDefault();
            object? item = (first != null && !string.IsNullOrWhiteSpace(first.Json))
                ? JsonSerializer.Deserialize<JsonElement>(first.Json!) : null;
            return Ok(ResponseHelper.Success(new { item }, "업무일지 조회"));
        }

        // ── 업무일지 저장(upsert) ──
        [HttpPost("journal")]
        public async Task<IActionResult> SaveJournal([FromBody] WorkJournalDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.UserId) || dto.Date == default)
                return Ok(ResponseHelper.Error("BAD_REQUEST", "작성자/일자가 필요합니다."));
            string? extraJson = dto.ExtraPages.HasValue ? dto.ExtraPages.Value.GetRawText() : null;

            const string sql = @"
                INSERT INTO rt_work_journal
                    (off_no, rt_no, user_id, jrnl_date, prop_reg, prop_upd, sched_reg, sched_upd,
                     call_cnt, consult_memo, content, remark, extra_pages, reg_id, reg_dt)
                VALUES
                    (@off, @rt, @uid, @date, @pReg, @pUpd, @sReg, @sUpd,
                     @call, @memo, @content, @remark, NULLIF(@extra,'')::jsonb, @uid, now())
                ON CONFLICT (user_id, jrnl_date) DO UPDATE SET
                    off_no = EXCLUDED.off_no, rt_no = EXCLUDED.rt_no,
                    prop_reg = EXCLUDED.prop_reg, prop_upd = EXCLUDED.prop_upd,
                    sched_reg = EXCLUDED.sched_reg, sched_upd = EXCLUDED.sched_upd,
                    call_cnt = EXCLUDED.call_cnt, consult_memo = EXCLUDED.consult_memo,
                    content = EXCLUDED.content, remark = EXCLUDED.remark,
                    extra_pages = EXCLUDED.extra_pages, upd_id = EXCLUDED.reg_id, upd_dt = now()";
            NpgsqlParameter Int(string n, int? v) => new NpgsqlParameter(n, NpgsqlDbType.Integer) { Value = (object?)(v ?? 0) };
            var ok = await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@off",  NpgsqlDbType.Bigint)  { Value = (object?)dto.OffNo ?? DBNull.Value },
                new NpgsqlParameter("@rt",   NpgsqlDbType.Integer) { Value = (object?)dto.RtNo ?? DBNull.Value },
                new NpgsqlParameter("@uid",  NpgsqlDbType.Varchar) { Value = dto.UserId },
                new NpgsqlParameter("@date", NpgsqlDbType.Date)    { Value = dto.Date.Date },
                Int("@pReg", dto.PropReg), Int("@pUpd", dto.PropUpd),
                Int("@sReg", dto.SchedReg), Int("@sUpd", dto.SchedUpd),
                Int("@call", dto.Call), Int("@memo", dto.ConsultMemo),
                new NpgsqlParameter("@content", NpgsqlDbType.Text) { Value = (object?)dto.Content ?? DBNull.Value },
                new NpgsqlParameter("@remark",  NpgsqlDbType.Text) { Value = (object?)dto.Remark ?? DBNull.Value },
                new NpgsqlParameter("@extra",   NpgsqlDbType.Varchar) { Value = (object?)extraJson ?? (object)string.Empty },
            }) > 0;
            return Ok(ResponseHelper.Success(new { saved = ok }, "업무일지 저장"));
        }

        // ── 월별 작성현황(사무소) — 작성된 (user_id, date) 목록 ──
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus([FromQuery] long offNo, [FromQuery] int year, [FromQuery] int month)
        {
            DateTime from = new DateTime(year, month, 1);
            DateTime to = from.AddMonths(1);
            const string sql = @"
                SELECT user_id AS ""UserId"", to_char(jrnl_date,'YYYY-MM-DD') AS ""Date""
                  FROM rt_work_journal
                 WHERE off_no = @off AND jrnl_date >= @from AND jrnl_date < @to";
            var rows = await _db.QueryAsyncPg<StatusRow>("DEV", sql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@off",  NpgsqlDbType.Bigint) { Value = offNo },
                new NpgsqlParameter("@from", NpgsqlDbType.Date)   { Value = from },
                new NpgsqlParameter("@to",   NpgsqlDbType.Date)   { Value = to },
            });
            var items = (rows ?? new List<StatusRow>()).Select(r => new { userId = r.UserId, date = r.Date }).ToList();
            return Ok(ResponseHelper.Success(new { items }, "작성현황"));
        }

        // ── 날짜별 전 직원 이력(통합) — 여러 *_hist UNION, 시간 오름차순 ──
        [HttpGet("activity")]
        public async Task<IActionResult> GetActivity([FromQuery] long offNo, [FromQuery] DateTime date, [FromQuery] string? userId, [FromQuery] int size = 500)
        {
            if (size < 1 || size > 2000) size = 500;
            DateTime day = date.Date; // 선택 날짜(로컬 자정) — KST 날짜 비교용(date 파라미터)

            // 실제 존재하는 *_hist 테이블만 UNION(누락 테이블로 인한 오류 방지)
            var histNames = SRC.Keys.Select(k => k + "_hist").ToArray();
            var exists = await _db.QueryAsyncPg<NameRow>("DEV",
                "SELECT table_name AS \"Name\" FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY(@names)",
                new List<NpgsqlParameter> { new NpgsqlParameter("@names", NpgsqlDbType.Array | NpgsqlDbType.Text) { Value = histNames } });
            var existSet = new HashSet<string>((exists ?? new List<NameRow>()).Select(r => r.Name ?? ""));

            var segments = new List<string>();
            foreach (var kv in SRC)
            {
                string hist = kv.Key + "_hist";
                if (!existSet.Contains(hist)) continue;
                string pkExpr = string.Join(" || ',' || ", kv.Value.Pk.Select(c => $"COALESCE(\"{c}\"::text,'')"));
                segments.Add($@"
                    SELECT '{kv.Key}' AS src, '{kv.Value.Label}' AS label, logged_at, changed_by, log_type, ({pkExpr}) AS pk
                      FROM public.""{hist}""
                     WHERE changed_off = @off AND (logged_at AT TIME ZONE 'Asia/Seoul')::date = @date
                       AND (@by IS NULL OR changed_by = @by)");
            }
            if (segments.Count == 0)
                return Ok(ResponseHelper.Success(new { items = new List<object>() }, "이력 없음"));

            // 대상(target): 물건이면 소재지(단지명/동/호), 고객이면 이름 — 네오봇 검색결과처럼 표기. LIMIT 없음(전건 조회)
            string sql = $@"
                SELECT u.src AS ""Src"", u.label AS ""Label"", u.logged_at AS ""LoggedAt"",
                       u.changed_by AS ""ChangedBy"", u.log_type AS ""LogType"", u.pk AS ""Pk"",
                       CASE
                         WHEN u.src IN ('pt_sale','pt_sale_holder') THEN
                           (SELECT NULLIF(TRIM(CONCAT_WS(' ',
                               NULLIF(TRIM(CONCAT_WS(' ', p.addr1, p.addr2, p.addr3)),''),
                               COALESCE(NULLIF(p.addr4,''), p.pt_name),
                               CASE WHEN COALESCE(p.dong,'')<>'' THEN p.dong||'동' END,
                               CASE WHEN COALESCE(p.ho,'')<>''   THEN p.ho||'호'   END)),'')
                             FROM pt_sale p WHERE p.pt_no = NULLIF(split_part(u.pk, ',', 1),'')::bigint)
                         WHEN u.src IN ('ct_cust','ct_cust_buyer') THEN
                           (SELECT NULLIF(c.name,'') FROM ct_cust c WHERE c.cust_no = NULLIF(split_part(u.pk, ',', 1),'')::bigint)
                         ELSE NULL
                       END AS ""Target""
                  FROM ( {string.Join("\n UNION ALL \n", segments)} ) u
                 ORDER BY u.logged_at ASC";
            var rows = await _db.QueryAsyncPg<ActRow>("DEV", sql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@off",  NpgsqlDbType.Bigint)  { Value = offNo },
                new NpgsqlParameter("@date", NpgsqlDbType.Date)    { Value = day },
                new NpgsqlParameter("@by",   NpgsqlDbType.Varchar) { Value = string.IsNullOrWhiteSpace(userId) ? DBNull.Value : userId },
            });
            var items = (rows ?? new List<ActRow>()).Select(r => new
            {
                loggedAt = r.LoggedAt, changedBy = r.ChangedBy, table = r.Src, label = r.Label,
                logType = r.LogType, pk = r.Pk, target = r.Target,
            }).ToList();
            return Ok(ResponseHelper.Success(new { items }, "날짜별 이력"));
        }

        // ── 오늘 업무 자동집계(hist 기반, best-effort) ──
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] string userId, [FromQuery] DateTime date)
        {
            DateTime day = date.Date; // KST 날짜 비교(date 파라미터) — timestamptz 파라미터 바인딩 예외 방지
            int Cnt(string table, string logType)
            {
                try
                {
                    var rows = _db.QueryAsyncPg<CntRow>("DEV",
                        $"SELECT count(*)::int AS \"N\" FROM public.\"{table}\" WHERE changed_by=@by AND log_type=@lt AND (logged_at AT TIME ZONE 'Asia/Seoul')::date = @date",
                        new List<NpgsqlParameter>
                        {
                            new NpgsqlParameter("@by",   NpgsqlDbType.Varchar) { Value = (object?)userId ?? DBNull.Value },
                            new NpgsqlParameter("@lt",   NpgsqlDbType.Varchar) { Value = logType },
                            new NpgsqlParameter("@date", NpgsqlDbType.Date)    { Value = day },
                        }).GetAwaiter().GetResult();
                    return rows?.FirstOrDefault()?.N ?? 0;
                }
                catch { return 0; }
            }
            // 원본 테이블(트리거 _hist 없음) — reg_id/upd_id + reg_dt/upd_dt 기준 집계
            //  tz=true: 컬럼이 timestamptz(KST 변환) / tz=false: timestamp(무TZ, 그대로 날짜 비교)
            int CntCol(string table, string userCol, string dateCol, bool tz)
            {
                try
                {
                    var dateExpr = tz ? $"({dateCol} AT TIME ZONE 'Asia/Seoul')::date" : $"{dateCol}::date";
                    var rows = _db.QueryAsyncPg<CntRow>("DEV",
                        $"SELECT count(*)::int AS \"N\" FROM public.\"{table}\" WHERE {userCol}=@by AND {dateExpr} = @date",
                        new List<NpgsqlParameter>
                        {
                            new NpgsqlParameter("@by",   NpgsqlDbType.Varchar) { Value = (object?)userId ?? DBNull.Value },
                            new NpgsqlParameter("@date", NpgsqlDbType.Date)    { Value = day },
                        }).GetAwaiter().GetResult();
                    return rows?.FirstOrDefault()?.N ?? 0;
                }
                catch { return 0; }
            }
            // 카테고리별 등록(I)/수정(U)/삭제(D) — 실제 *_hist 기반(없는 테이블은 0)
            var summary = new
            {
                // 물건
                propReg = Cnt("pt_sale_hist", "I"), propUpd = Cnt("pt_sale_hist", "U"), propDel = Cnt("pt_sale_hist", "D"),
                // 고객
                custReg = Cnt("ct_cust_hist", "I"), custUpd = Cnt("ct_cust_hist", "U"), custDel = Cnt("ct_cust_hist", "D"),
                // (가)계약서 작성/수정
                contractWrite = Cnt("contract_master_hist", "I"), contractUpd = Cnt("contract_master_hist", "U"),
                // 일정
                schedReg = Cnt("rt_schedule_hist", "I"), schedUpd = Cnt("rt_schedule_hist", "U"), schedDel = Cnt("rt_schedule_hist", "D"),
                // 중개망(공동중개망 등록)
                hubReg = Cnt("rt_trade_info_hist", "I"), hubUpd = Cnt("rt_trade_info_hist", "U"), hubDel = Cnt("rt_trade_info_hist", "D"),
                // 인바운드/아웃바운드 — 연동 보류(0)
                inbound = 0, outbound = 0,
                // 하위호환
                call = 0, consultMemo = Cnt("ct_interview_hist", "I"),

                // ── 추가 집계 ──
                // 업체(vd_vendor_info_hist)
                vendorReg = Cnt("vd_vendor_info_hist", "I"), vendorUpd = Cnt("vd_vendor_info_hist", "U"), vendorDel = Cnt("vd_vendor_info_hist", "D"),
                // 쪽지상담(rt_note_hist — 보낸 쪽지 I)
                note = Cnt("rt_note_hist", "I"),
                // 문자전송(rt_sms_send_hist, reg 기준 · timestamptz) / 전번편집(소스 미정 → 0)
                smsSend = CntCol("rt_sms_send_hist", "reg_id", "reg_dt", true), phoneEdit = 0,
                // 커뮤니티 전체 통합(community_post + community_job, reg/upd 기준 · timestamp)
                commReg = CntCol("community_post", "reg_id", "reg_dt", false) + CntCol("community_job", "reg_id", "reg_dt", false),
                commUpd = CntCol("community_post", "upd_id", "upd_dt", false) + CntCol("community_job", "upd_id", "upd_dt", false),
                commDel = 0,
            };
            return Ok(ResponseHelper.Success(new { summary }, "자동집계"));
        }

        // ── 공유설정 조회 ──
        [HttpGet("share")]
        public async Task<IActionResult> GetShare([FromQuery] long offNo)
        {
            const string sql = @"SELECT COALESCE((SELECT share_all FROM rt_work_journal_setting WHERE off_no=@off), 'Y') AS ""ShareAll""";
            var rows = await _db.QueryAsyncPg<ShareRow>("DEV", sql, new List<NpgsqlParameter>
            { new NpgsqlParameter("@off", NpgsqlDbType.Bigint) { Value = offNo } });
            string shareAll = rows?.FirstOrDefault()?.ShareAll ?? "Y";
            return Ok(ResponseHelper.Success(new { shareAll }, "공유설정 조회"));
        }

        // ── 공유설정 저장(upsert) ──
        [HttpPost("share")]
        public async Task<IActionResult> SetShare([FromBody] ShareDto dto)
        {
            if (dto == null || dto.OffNo <= 0)
                return Ok(ResponseHelper.Error("BAD_REQUEST", "사무소가 필요합니다."));
            string flag = (dto.ShareAll == "N") ? "N" : "Y";
            const string sql = @"
                INSERT INTO rt_work_journal_setting (off_no, share_all, upd_id, upd_dt)
                VALUES (@off, @flag, @uid, now())
                ON CONFLICT (off_no) DO UPDATE SET share_all=EXCLUDED.share_all, upd_id=EXCLUDED.upd_id, upd_dt=now()";
            await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@off",  NpgsqlDbType.Bigint)  { Value = dto.OffNo },
                new NpgsqlParameter("@flag", NpgsqlDbType.Char)    { Value = flag },
                new NpgsqlParameter("@uid",  NpgsqlDbType.Varchar) { Value = (object?)dto.UserId ?? DBNull.Value },
            });
            return Ok(ResponseHelper.Success(new { shareAll = flag }, "공유설정 저장"));
        }

        private sealed class StatusRow { public string? UserId { get; set; } public string? Date { get; set; } }
        private sealed class ActRow { public string? Src { get; set; } public string? Label { get; set; } public DateTime LoggedAt { get; set; } public string? ChangedBy { get; set; } public string? LogType { get; set; } public string? Pk { get; set; } public string? Target { get; set; } }
        private sealed class CntRow { public int N { get; set; } }
        private sealed class ShareRow { public string? ShareAll { get; set; } }
    }

    public class WorkJournalDto
    {
        public long? OffNo { get; set; }
        public int? RtNo { get; set; }
        public string? UserId { get; set; }
        public DateTime Date { get; set; }
        public int? PropReg { get; set; }
        public int? PropUpd { get; set; }
        public int? SchedReg { get; set; }
        public int? SchedUpd { get; set; }
        public int? Call { get; set; }
        public int? ConsultMemo { get; set; }
        public string? Content { get; set; }
        public string? Remark { get; set; }
        public JsonElement? ExtraPages { get; set; }
    }

    public class ShareDto
    {
        public long OffNo { get; set; }
        public string? ShareAll { get; set; }
        public string? UserId { get; set; }
    }
}

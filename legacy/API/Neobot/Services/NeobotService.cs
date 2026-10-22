using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Neobot.Models;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Neobot.Services
{
    public interface INeobotService
    {
        Task<NeobotSearchResult> Search(string? query, long? offNo, string? rtNo, int limit);
        Task<NeobotPropertyDetail> GetPropertyDetail(long ptNo);
        Task<NeobotCustomerDetail> GetCustomerDetail(long custNo);
        Task<NeobotContractDetail?> GetContractDetail(string masterId);
        Task<List<NeobotConsult>> SearchConsultations(string? query, long? offNo, string? rtNo, int limit);
    }

    /// <summary>
    /// 네오봇 전용 서비스 — 공용 통합검색(SearchService) 과 분리된 복사본.
    ///  · 검색: 물건(pt_sale + 소유자/임차인) + 고객(ct_cust + 희망지역) + 계약(contract_master) UNION
    ///  · 상세: 클릭 시 요약 + 상담이력(ct_interview) + 일정(rt_schedule) + 소유자/임차인/희망지역 을 한 번에 반환
    /// </summary>
    public class NeobotService : INeobotService
    {
        private readonly IPostgresDataService _dataService;

        public NeobotService(IPostgresDataService dataService)
        {
            _dataService = dataService;
        }

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        // 아파트 계열(단지형) — 건물표기 addr4, 그 외 addr5 사용
        private const string AptTypes = "'SYCA101','SYCA102','SYCA103','SYCA105','SYCA106','SYCA107'";

        public async Task<NeobotSearchResult> Search(string? query, long? offNo, string? rtNo, int limit)
        {
            var result = new NeobotSearchResult();
            var q = (query ?? "").Trim();
            if (q.Length == 0) return result;

            int lim = limit <= 0 ? 30 : (limit > 100 ? 100 : limit);

            // 전화번호 검색용 : 검색어에서 숫자만 추출(하이픈/공백 무시). 숫자 없으면 전화 조건은 건너뜀.
            var digits = new string(q.Where(char.IsDigit).ToArray());

            string sql = $@"
(
    SELECT
        'PT'::text AS ""Kind"",
        a.pt_no::text AS ""RefId"",
        a.pt_type  AS ""TypeCode"",
        NULLIF(TRIM(CONCAT_WS(' ',
            -- 단지형(아파트 계열)은 법정동(지역주소) 미표기 → 단지명+동+호만. 그 외는 지역주소 표기
            CASE WHEN a.pt_type IN ({AptTypes}) OR COALESCE(a.danji_code,'') <> ''
                 THEN NULL
                 ELSE NULLIF(TRIM(CONCAT_WS(' ', a.addr1, a.addr2, a.addr3)), '') END,
            COALESCE(
                NULLIF(CASE WHEN a.pt_type IN ({AptTypes}) OR COALESCE(a.danji_code,'') <> ''
                            THEN a.addr4 ELSE a.addr5 END, ''),
                a.pt_name),
            -- 단지형은 동/호까지 표기
            CASE WHEN a.pt_type IN ({AptTypes}) OR COALESCE(a.danji_code,'') <> ''
                 THEN NULLIF(TRIM(CONCAT_WS(' ',
                        CASE WHEN COALESCE(a.dong,'') <> '' THEN a.dong || '동' END,
                        CASE WHEN COALESCE(a.ho,'')   <> '' THEN a.ho   || '호' END)), '')
                 ELSE NULL END
        )), '') AS ""Addr"",
        (
            SELECT COALESCE(json_agg(json_build_object(
                        'name',  h.holder_name,
                        'phone', h.holder_phone,
                        'role',  CASE h.holder_type WHEN 'OWNER' THEN '소유자'
                                                    WHEN 'BUYER' THEN '임차인'
                                                    ELSE COALESCE(h.holder_type,'') END,
                        'past',  (h.holder_relation IN ('전 소유자','전 임차인')))
                        ORDER BY h.holder_idx)
                     FILTER (WHERE COALESCE(h.holder_name,'') <> '' OR COALESCE(h.holder_phone,'') <> ''),
                     '[]'::json)::text
            FROM pt_sale_holder h WHERE h.pt_no = a.pt_no
        ) AS ""PersonsJson"",
        (SELECT h2.holder_name  FROM pt_sale_holder h2 WHERE h2.pt_no = a.pt_no
                AND COALESCE(h2.holder_phone,'') <> '' ORDER BY h2.holder_idx LIMIT 1) AS ""Name"",
        (SELECT h2.holder_phone FROM pt_sale_holder h2 WHERE h2.pt_no = a.pt_no
                AND COALESCE(h2.holder_phone,'') <> '' ORDER BY h2.holder_idx LIMIT 1) AS ""Phone"",
        a.sale_amt::bigint AS ""Amount"",
        a.sale_div AS ""SubInfo"",
        NULL::date AS ""RefDate""
    FROM pt_sale a
    WHERE (@off_no IS NULL OR a.off_no = @off_no)
      AND (@rt_no  IS NULL OR a.rt_no::text = @rt_no)
      AND (
            a.pt_name ILIKE @like
         OR a.addr2 ILIKE @like OR a.addr3 ILIKE @like OR a.addr4 ILIKE @like OR a.addr5 ILIKE @like
         OR EXISTS (SELECT 1 FROM pt_sale_holder h3 WHERE h3.pt_no = a.pt_no
                      AND (h3.holder_name ILIKE @like
                           OR (@digits <> '' AND regexp_replace(h3.holder_phone,'[^0-9]','','g') LIKE '%'||@digits||'%')))
      )
    ORDER BY a.pt_no DESC
    LIMIT @lim
)
UNION ALL
(
    SELECT
        'CUST'::text AS ""Kind"",
        c.cust_no::text AS ""RefId"",
        c.want_type  AS ""TypeCode"",
        (SELECT string_agg(COALESCE(NULLIF(ta.bld_nm, ''), ta.addr3), ', ')
           FROM ct_trd_area ta WHERE ta.cust_no = c.cust_no) AS ""Addr"",
        COALESCE(
            (SELECT json_agg(json_build_object('name', b.name, 'phone', b.tel, 'role', '구입자') ORDER BY b.seq)
                    FILTER (WHERE COALESCE(b.name,'') <> '' OR COALESCE(b.tel,'') <> '')
               FROM ct_cust_buyer b WHERE b.cust_no = c.cust_no),
            json_build_array(json_build_object('name', c.name, 'phone', c.tel, 'role', '구입자'))
        )::text AS ""PersonsJson"",
        COALESCE(NULLIF(c.name,''), (SELECT b2.name FROM ct_cust_buyer b2 WHERE b2.cust_no = c.cust_no AND COALESCE(b2.name,'') <> '' ORDER BY b2.seq LIMIT 1)) AS ""Name"",
        COALESCE(NULLIF(c.tel,''),  (SELECT b3.tel  FROM ct_cust_buyer b3 WHERE b3.cust_no = c.cust_no AND COALESCE(b3.tel,'')  <> '' ORDER BY b3.seq LIMIT 1)) AS ""Phone"",
        NULL::bigint AS ""Amount"",
        c.want_nm AS ""SubInfo"",
        NULL::date AS ""RefDate""
    FROM ct_cust c
    -- 사무소(off_no) + 담당자(rt_no) 모두 일치하는 본인 관리 고객만 (직원 간 고객 중복 방지)
    WHERE (@off_no IS NULL OR c.off_no = @off_no)
      AND (@rt_no  IS NULL OR c.rt_no::text = @rt_no)
      AND (
            c.name ILIKE @like
         OR (@digits <> '' AND regexp_replace(c.tel,'[^0-9]','','g') LIKE '%'||@digits||'%')
         OR c.addr ILIKE @like
         OR c.want_nm ILIKE @like
         OR EXISTS (SELECT 1 FROM ct_trd_area ta WHERE ta.cust_no = c.cust_no
                      AND (ta.bld_nm ILIKE @like OR ta.addr3 ILIKE @like))
         OR EXISTS (SELECT 1 FROM ct_cust_buyer b WHERE b.cust_no = c.cust_no
                      AND (b.name ILIKE @like
                           OR (@digits <> '' AND regexp_replace(b.tel,'[^0-9]','','g') LIKE '%'||@digits||'%')))
      )
    ORDER BY c.cust_no DESC
    LIMIT @lim
)
UNION ALL
(
    SELECT
        'CT'::text AS ""Kind"",
        cm.master_id::text AS ""RefId"",
        cm.doc_type  AS ""TypeCode"",
        cm.addr AS ""Addr"",
        json_build_array(
            json_build_object('name', cm.buyer,  'phone', '', 'role', '취득의뢰인'),
            json_build_object('name', cm.seller, 'phone', '', 'role', '이전의뢰인')
        )::text AS ""PersonsJson"",
        COALESCE(NULLIF(cm.buyer,''), cm.seller) AS ""Name"",
        NULL::text AS ""Phone"",
        cm.amount::bigint AS ""Amount"",
        cm.trade_type AS ""SubInfo"",
        cm.contract_date AS ""RefDate""
    FROM contract_master cm
    WHERE cm.use_yn = 'Y'
      AND (@off_no IS NULL OR cm.off_no = @off_no)
      AND (@rt_no  IS NULL OR cm.rt_no::text = @rt_no)
      AND (
            cm.addr   ILIKE @like
         OR cm.buyer  ILIKE @like
         OR cm.seller ILIKE @like
         OR cm.title  ILIKE @like
         -- 계약서 문서(doc jsonb)에 저장된 매도인/매수인/임차인/임대인 등 이름·연락처까지 검색
         OR cm.doc::text ILIKE @like
         OR (@digits <> '' AND regexp_replace(cm.doc::text,'[^0-9]','','g') LIKE '%' || @digits || '%')
      )
    ORDER BY COALESCE(cm.contract_date, cm.reg_dt::date) DESC, cm.master_id DESC
    LIMIT @lim
)
UNION ALL
(
    -- 가계약(가계약 문자) — contract_document(doc_kind='가계약')의 data jsonb에서 당사자 이름·연락처 검색
    SELECT
        'PRE'::text AS ""Kind"",
        cd.master_id::text AS ""RefId"",
        cm.doc_type AS ""TypeCode"",
        cm.addr AS ""Addr"",
        '[]'::text AS ""PersonsJson"",
        COALESCE(NULLIF(cm.buyer,''), cm.seller) AS ""Name"",
        NULL::text AS ""Phone"",
        cm.amount::bigint AS ""Amount"",
        cm.trade_type AS ""SubInfo"",
        cm.contract_date AS ""RefDate""
    FROM contract_document cd
    JOIN contract_master cm ON cm.master_id = cd.master_id AND cm.use_yn = 'Y'
    WHERE cd.doc_kind = '가계약' AND cd.use_yn = 'Y'
      AND (@off_no IS NULL OR cm.off_no = @off_no)
      AND (@rt_no  IS NULL OR cm.rt_no::text = @rt_no)
      AND (
            cm.addr ILIKE @like OR cm.title ILIKE @like
         OR cd.data::text ILIKE @like
         OR (@digits <> '' AND regexp_replace(cd.data::text,'[^0-9]','','g') LIKE '%' || @digits || '%')
      )
    ORDER BY COALESCE(cm.contract_date, cm.reg_dt::date) DESC, cd.master_id DESC
    LIMIT @lim
)";

            var parameters = new List<NpgsqlParameter>
            {
                P("@like",   NpgsqlDbType.Varchar, "%" + q + "%"),
                P("@digits", NpgsqlDbType.Varchar, digits),
                P("@off_no", NpgsqlDbType.Bigint,  offNo),
                P("@rt_no",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(rtNo) ? null : rtNo),
                P("@lim",    NpgsqlDbType.Integer, lim),
            };

            result.Items = await _dataService.QueryAsyncPg<NeobotSearchRow>("DEV", sql, parameters);
            return result;
        }

        // 상담이력 검색 — 검색어가 전화번호(숫자)면 연락처(contact_phone) 포함검색, 그 외 내용/성함 검색.
        //  사무소(off_no) + 담당자(rt_no) 기준으로 본인 상담이력만 조회(직원 간 분리).
        public async Task<List<NeobotConsult>> SearchConsultations(string? query, long? offNo, string? rtNo, int limit)
        {
            var q = (query ?? "").Trim();
            if (q.Length == 0) return new List<NeobotConsult>();
            int lim = limit <= 0 ? 50 : (limit > 200 ? 200 : limit);
            var digits = new string(q.Where(char.IsDigit).ToArray());

            // 같은 상담이 물건·고객 양쪽에 각각 저장되면(동일 내용·전화·일자·작성자·작성시각) 중복 표시됨.
            //  → 그룹키(전화번호 숫자·일자·작성자·내용·작성시각)로 1건만 대표 노출. 편집은 그룹 전체에 반영(UpdateInterview).
            string sql = @"
SELECT * FROM (
  SELECT DISTINCT ON (
           regexp_replace(COALESCE(contact_phone,''),'[^0-9]','','g'),
           itv_date::text, COALESCE(reg_id,''), COALESCE(itv_content,''), reg_dt
         )
         itv_no AS ""ItvNo"", itv_date AS ""ItvDate"", itv_content AS ""ItvContent"",
         contact_name AS ""ContactName"", contact_phone AS ""ContactPhone"",
         reg_id AS ""RegId"", reg_dt AS ""RegDt""
  FROM ct_interview
  WHERE (@off_no IS NULL OR off_no = @off_no)
    AND (@rt_no  IS NULL OR rt_no::text = @rt_no)
    AND (
          (@digits <> '' AND regexp_replace(COALESCE(contact_phone,''),'[^0-9]','','g') LIKE '%' || @digits || '%')
       OR (@digits <> '' AND regexp_replace(COALESCE(cust_phone,''),'[^0-9]','','g') LIKE '%' || @digits || '%')
       OR itv_content ILIKE @like
       OR contact_name ILIKE @like
       OR cust_name ILIKE @like
        )
  ORDER BY regexp_replace(COALESCE(contact_phone,''),'[^0-9]','','g'), itv_date::text, COALESCE(reg_id,''), COALESCE(itv_content,''), reg_dt, itv_no DESC
) d
ORDER BY d.""ItvNo"" DESC
LIMIT @lim";

            var parameters = new List<NpgsqlParameter>
            {
                P("@off_no", NpgsqlDbType.Bigint,  offNo),
                P("@rt_no",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(rtNo) ? null : rtNo),
                P("@digits", NpgsqlDbType.Varchar, digits),
                P("@like",   NpgsqlDbType.Varchar, "%" + q + "%"),
                P("@lim",    NpgsqlDbType.Integer, lim),
            };
            return await _dataService.QueryAsyncPg<NeobotConsult>("DEV", sql, parameters);
        }

        public async Task<NeobotPropertyDetail> GetPropertyDetail(long ptNo)
        {
            var detail = new NeobotPropertyDetail();

            string sumSql = $@"
SELECT a.pt_no AS ""PtNo"", a.pt_name AS ""PtName"", a.pt_type AS ""PtType"",
    NULLIF(TRIM(CONCAT_WS(' ',
        NULLIF(TRIM(CONCAT_WS(' ', a.addr1, a.addr2, a.addr3)), ''),
        COALESCE(
            NULLIF(CASE WHEN a.pt_type IN ({AptTypes}) OR COALESCE(a.danji_code,'') <> ''
                        THEN a.addr4 ELSE a.addr5 END, ''),
            a.pt_name)
    )), '') AS ""Addr"",
    a.sale_div AS ""SaleDiv"", a.sale_amt AS ""SaleAmt"", a.les_amt AS ""LesAmt"",
    a.prot_amt AS ""ProtAmt"", a.mon_amt AS ""MonAmt"",
    a.sup_area AS ""SupArea"", a.exc_area AS ""ExcArea"", a.floor AS ""Floor"",
    a.dir_std AS ""DirStd"", a.current_status AS ""CurrentStatus"", a.pt_sts AS ""PtSts""
FROM pt_sale a
WHERE a.pt_no = @pt_no";

            string holderSql = @"
SELECT holder_type AS ""HolderType"", holder_name AS ""HolderName"", holder_phone AS ""HolderPhone"",
       holder_relation AS ""HolderRelation"", holder_reg_date AS ""HolderRegDate"",
       (holder_relation IN ('전 소유자','전 임차인')) AS ""IsPast""
FROM pt_sale_holder
WHERE pt_no = @pt_no
  AND (COALESCE(holder_name,'') <> '' OR COALESCE(holder_phone,'') <> '')
ORDER BY (holder_relation IN ('전 소유자','전 임차인')), holder_reg_date DESC NULLS LAST, holder_idx";

            string consultSql = @"
SELECT itv_no AS ""ItvNo"", itv_date AS ""ItvDate"", itv_content AS ""ItvContent"",
       contact_name AS ""ContactName"", contact_phone AS ""ContactPhone"",
       reg_id AS ""RegId"", reg_dt AS ""RegDt""
FROM ct_interview WHERE pt_no = @pt_no ORDER BY itv_no DESC";

            var pSum = new List<NpgsqlParameter> { P("@pt_no", NpgsqlDbType.Bigint, ptNo) };
            var sums = await _dataService.QueryAsyncPg<NeobotPropSummary>("DEV", sumSql, pSum);
            detail.Summary = sums.FirstOrDefault();
            detail.Holders = await _dataService.QueryAsyncPg<NeobotHolder>("DEV", holderSql, new List<NpgsqlParameter> { P("@pt_no", NpgsqlDbType.Bigint, ptNo) });
            detail.Consultations = await _dataService.QueryAsyncPg<NeobotConsult>("DEV", consultSql, new List<NpgsqlParameter> { P("@pt_no", NpgsqlDbType.Bigint, ptNo) });
            detail.Schedules = await GetSchedules("PT", ptNo.ToString());
            return detail;
        }

        public async Task<NeobotCustomerDetail> GetCustomerDetail(long custNo)
        {
            var detail = new NeobotCustomerDetail();

            string sumSql = @"
SELECT c.cust_no AS ""CustNo"", c.name AS ""Name"", c.tel AS ""Tel"", c.addr AS ""Addr"",
       c.want_type AS ""WantType"", c.want_nm AS ""WantNm"", c.feature_note AS ""FeatureNote"", c.memo AS ""Memo""
FROM ct_cust c WHERE c.cust_no = @cust_no";

            string buyerSql = @"
SELECT name AS ""Name"", relation AS ""Relation"", tel AS ""Tel"", addr AS ""Addr"", reg_dt AS ""RegDt""
FROM ct_cust_buyer
WHERE cust_no = @cust_no AND (COALESCE(name,'') <> '' OR COALESCE(tel,'') <> '')
ORDER BY reg_dt DESC NULLS LAST, seq";

            string areaSql = @"
SELECT addr1 AS ""Addr1"", addr2 AS ""Addr2"", addr3 AS ""Addr3"", bld_nm AS ""BldNm"", trade_status AS ""TradeStatus""
FROM ct_trd_area WHERE cust_no = @cust_no ORDER BY reg_dt";

            string consultSql = @"
SELECT itv_no AS ""ItvNo"", itv_date AS ""ItvDate"", itv_content AS ""ItvContent"",
       contact_name AS ""ContactName"", contact_phone AS ""ContactPhone"",
       reg_id AS ""RegId"", reg_dt AS ""RegDt""
FROM ct_interview WHERE cust_no = @cust_no ORDER BY itv_no DESC";

            var sums = await _dataService.QueryAsyncPg<NeobotCustSummary>("DEV", sumSql, new List<NpgsqlParameter> { P("@cust_no", NpgsqlDbType.Bigint, custNo) });
            detail.Summary = sums.FirstOrDefault();
            detail.Buyers = await _dataService.QueryAsyncPg<NeobotBuyer>("DEV", buyerSql, new List<NpgsqlParameter> { P("@cust_no", NpgsqlDbType.Bigint, custNo) });
            detail.WishAreas = await _dataService.QueryAsyncPg<NeobotWishArea>("DEV", areaSql, new List<NpgsqlParameter> { P("@cust_no", NpgsqlDbType.Bigint, custNo) });
            detail.Consultations = await _dataService.QueryAsyncPg<NeobotConsult>("DEV", consultSql, new List<NpgsqlParameter> { P("@cust_no", NpgsqlDbType.Bigint, custNo) });
            detail.Schedules = await GetSchedules("CUST", custNo.ToString());
            return detail;
        }

        public async Task<NeobotContractDetail?> GetContractDetail(string masterId)
        {
            if (string.IsNullOrWhiteSpace(masterId)) return null;
            string sql = @"
SELECT master_id::text AS ""MasterId"", contract_kind AS ""ContractKind"", doc_type AS ""DocType"",
       trade_type AS ""TradeType"", title AS ""Title"", addr AS ""Addr"", seller AS ""Seller"", buyer AS ""Buyer"",
       amount AS ""Amount"", contract_date AS ""ContractDate"", status AS ""Status"", report_done_date AS ""ReportDoneDate""
FROM contract_master WHERE master_id = @id::uuid AND use_yn = 'Y'";
            var rows = await _dataService.QueryAsyncPg<NeobotContractDetail>("DEV", sql, new List<NpgsqlParameter> { P("@id", NpgsqlDbType.Varchar, masterId) });
            return rows.FirstOrDefault();
        }

        // 일정 — rt_schedule + rt_schedule_link (link_type: PT/CUST, link_key: pt_no/cust_no)
        private async Task<List<NeobotSchedule>> GetSchedules(string linkType, string linkKey)
        {
            string sql = @"
SELECT s.schedule_id AS ""ScheduleId"", s.title AS ""Title"", s.content AS ""Content"",
       s.category AS ""Category"", s.start_at AS ""StartAt"", s.end_at AS ""EndAt"", s.location AS ""Location""
FROM rt_schedule s
JOIN rt_schedule_link l ON l.schedule_id = s.schedule_id
WHERE s.use_yn = 'Y' AND l.link_type = @lt AND l.link_key = @lk
ORDER BY s.start_at DESC";
            var p = new List<NpgsqlParameter>
            {
                P("@lt", NpgsqlDbType.Varchar, linkType),
                P("@lk", NpgsqlDbType.Varchar, linkKey),
            };
            return await _dataService.QueryAsyncPg<NeobotSchedule>("DEV", sql, p);
        }
    }
}

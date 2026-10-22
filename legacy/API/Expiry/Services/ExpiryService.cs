using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Expiry.Models;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Expiry.Services
{
    public interface IExpiryService
    {
        Task<ExpiryResult> GetList(string? ptTypes, string? frDate, string? toDate, long? offNo, string? rtNo, int page, int pageSize);
    }

    /// <summary>
    /// 만기관리 조회 — 유형별 만기일(pt_sale.mtry_date)로 기간검색. 건물(SYCA108)은 만기 데이터를 가져오지 않음(목록 제외).
    /// </summary>
    public class ExpiryService : IExpiryService
    {
        private readonly IPostgresDataService _dataService;
        public ExpiryService(IPostgresDataService dataService) { _dataService = dataService; }

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        private const string AptTypes = "'SYCA101','SYCA102','SYCA103','SYCA105','SYCA106','SYCA107'";

        // 'YYYY-MM-DD' 등 → 숫자 8자리(YYYYMMDD). 비교 안정용.
        private static string? Digits8(string? v)
        {
            if (string.IsNullOrWhiteSpace(v)) return null;
            var d = new string(v.Where(char.IsDigit).ToArray());
            return d.Length >= 8 ? d.Substring(0, 8) : (d.Length > 0 ? d : null);
        }

        public async Task<ExpiryResult> GetList(string? ptTypes, string? frDate, string? toDate, long? offNo, string? rtNo, int page, int pageSize)
        {
            var result = new ExpiryResult();
            int pg = page <= 0 ? 1 : page;
            int sz = pageSize <= 0 ? 50 : (pageSize > 5000 ? 5000 : pageSize);
            var frD = Digits8(frDate);
            var toD = Digits8(toDate);

            // 현재(과거 아님) 소유자/임차인 대표 1인 서브쿼리 헬퍼
            string holder(string type, string col) => $@"
        (SELECT h.{col} FROM pt_sale_holder h
          WHERE h.pt_no = a.pt_no AND h.holder_type = '{type}'
            AND COALESCE(h.{col},'') <> ''
            AND COALESCE(h.holder_relation,'') NOT IN ('전 소유자','전 임차인')
          ORDER BY h.holder_idx LIMIT 1)";

            string sql = $@"
SELECT * FROM (
  SELECT
    a.pt_no    AS ""PtNo"",
    a.pt_type  AS ""PtType"",
    a.pt_name  AS ""PtName"",
    NULLIF(TRIM(CONCAT_WS(' ',
        NULLIF(TRIM(CONCAT_WS(' ', a.addr1, a.addr2, a.addr3)), ''),
        COALESCE(NULLIF(CASE WHEN a.pt_type IN ({AptTypes}) OR COALESCE(a.danji_code,'') <> ''
                             THEN a.addr4 ELSE a.addr5 END, ''), a.pt_name)
    )), '') AS ""Addr"",
    a.addr1    AS ""Addr1"",
    a.addr2    AS ""Addr2"",
    a.addr3    AS ""Addr3"",
    a.addr4    AS ""Addr4"",
    a.addr5    AS ""Addr5"",
    a.danji_code AS ""DanjiCode"",
    a.current_status AS ""CurrentStatus"",
    a.pt_sts   AS ""PtSts"",
    a.sale_div AS ""SaleDiv"",
    '물건관리' AS ""Source"",
    a.apt_typ  AS ""AptTyp"",
    a.sup_area::text AS ""SupArea"",
    a.exc_area::text AS ""ExcArea"",
    a.sale_amt::text AS ""SaleAmt"",
    a.les_amt::text  AS ""LesAmt"",
    a.prot_amt::text AS ""ProtAmt"",
    a.mon_amt::text  AS ""MonAmt"",
    a.etc_amt::text  AS ""EtcAmt"",
    a.etc_amt2::text AS ""EtcAmt2"",
    a.dong     AS ""Dong"",
    a.ho       AS ""Ho"",
    a.jibun    AS ""Jibun"",
    -- 건물(SYCA108)은 임대차현황서 계약만기일을 만기로 가져오지 않음(만기관리 목록 제외)
    CASE WHEN a.pt_type = 'SYCA108'
         THEN NULL
         ELSE NULLIF(a.mtry_date,'') END AS ""ExpiryDate"",
    {holder("OWNER", "holder_name")}  AS ""OwnerName"",
    {holder("OWNER", "holder_phone")} AS ""OwnerPhone"",
    {holder("BUYER", "holder_name")}  AS ""TenantName"",
    {holder("BUYER", "holder_phone")} AS ""TenantPhone""
  FROM pt_sale a
  WHERE (@off_no IS NULL OR a.off_no = @off_no)
    AND (@rt_no  IS NULL OR a.rt_no::text = @rt_no)
    AND (@pt_types IS NULL OR a.pt_type = ANY(string_to_array(@pt_types, ',')))
    -- 현상태(현상태) 기준: 주인거주/공실 제외, 전세·월세·기타임대만 만기관리 대상
    AND a.current_status IN ('전세','월세','기타임대')
) x
WHERE x.""ExpiryDate"" IS NOT NULL
  AND (@fr IS NULL OR LEFT(regexp_replace(x.""ExpiryDate"",'[^0-9]','','g'),8) >= @fr)
  AND (@to IS NULL OR LEFT(regexp_replace(x.""ExpiryDate"",'[^0-9]','','g'),8) <= @to)
";

            // 총건수
            string countSql = $"SELECT COUNT(*)::int AS cnt FROM ({sql}) c";
            // 페이지
            string pageSql = sql + @"
ORDER BY LEFT(regexp_replace(x.""ExpiryDate"",'[^0-9]','','g'),8) ASC, x.""PtNo"" DESC
LIMIT @sz OFFSET (@pg - 1) * @sz";

            List<NpgsqlParameter> ps() => new List<NpgsqlParameter>
            {
                P("@off_no",   NpgsqlDbType.Bigint,  offNo),
                P("@rt_no",    NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(rtNo) ? null : rtNo),
                P("@pt_types", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(ptTypes) ? null : ptTypes),
                P("@fr",       NpgsqlDbType.Varchar, frD),
                P("@to",       NpgsqlDbType.Varchar, toD),
            };

            var cntParams = ps();
            var cntRows = await _dataService.QueryAsyncPg<CountRow>("DEV", countSql, cntParams);
            result.TotalCount = cntRows.FirstOrDefault()?.Cnt ?? 0;

            var pageParams = ps();
            pageParams.Add(P("@sz", NpgsqlDbType.Integer, sz));
            pageParams.Add(P("@pg", NpgsqlDbType.Integer, pg));
            result.Items = await _dataService.QueryAsyncPg<ExpiryRow>("DEV", pageSql, pageParams);
            return result;
        }

        private class CountRow { public int Cnt { get; set; } }
    }
}

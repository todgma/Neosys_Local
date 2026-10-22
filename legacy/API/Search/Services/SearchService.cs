using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Search.Models;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Search.Services
{
    public interface ISearchService
    {
        Task<UnifiedSearchResult> SearchUnified(string? query, long? offNo, string? rtNo, int limit);
    }

    public class SearchService : ISearchService
    {
        private readonly IPostgresDataService _dataService;

        public SearchService(IPostgresDataService dataService)
        {
            _dataService = dataService;
        }

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        /// <summary>
        /// 통합검색 — 함수 미사용, 인라인 UNION 쿼리로 직접 조회.
        ///  물건(pt_sale + pt_sale_holder 소유자/임차인) + 고객(ct_cust 구입자 + ct_trd_area 희망지역)
        /// </summary>
        public async Task<UnifiedSearchResult> SearchUnified(string? query, long? offNo, string? rtNo, int limit)
        {
            var result = new UnifiedSearchResult();
            var q = (query ?? "").Trim();
            if (q.Length == 0) return result;

            int lim = limit <= 0 ? 30 : (limit > 100 ? 100 : limit);

            // 전화번호 검색용 : 검색어에서 숫자만 추출(하이픈/공백 무시). 숫자 없으면 전화 조건 스킵.
            var digits = new string(q.Where(char.IsDigit).ToArray());

            // 아파트 계열(단지형) — 건물표기 addr4, 그 외 addr5 사용
            const string aptTypes = "'SYCA101','SYCA102','SYCA103','SYCA105','SYCA106','SYCA107'";

            string sql = $@"
(
    SELECT
        'PT'::text AS ""Kind"",
        a.pt_no    AS ""RefId"",
        a.pt_type  AS ""TypeCode"",
        NULLIF(TRIM(CONCAT_WS(' ',
            NULLIF(TRIM(CONCAT_WS(' ', a.addr1, a.addr2, a.addr3)), ''),
            COALESCE(
                NULLIF(CASE WHEN a.pt_type IN ({aptTypes}) OR COALESCE(a.danji_code,'') <> ''
                            THEN a.addr4 ELSE a.addr5 END, ''),
                a.pt_name)
        )), '') AS ""Addr"",
        (
            SELECT COALESCE(json_agg(json_build_object(
                        'name',  h.holder_name,
                        'phone', h.holder_phone,
                        'role',  CASE h.holder_type WHEN 'OWNER' THEN '소유자'
                                                    WHEN 'BUYER' THEN '임차인'
                                                    ELSE COALESCE(h.holder_type,'') END)
                        ORDER BY h.holder_idx)
                     FILTER (WHERE COALESCE(h.holder_name,'') <> '' OR COALESCE(h.holder_phone,'') <> ''),
                     '[]'::json)::text
            FROM pt_sale_holder h WHERE h.pt_no = a.pt_no
        ) AS ""PersonsJson"",
        (SELECT h2.holder_name  FROM pt_sale_holder h2 WHERE h2.pt_no = a.pt_no
                AND COALESCE(h2.holder_phone,'') <> '' ORDER BY h2.holder_idx LIMIT 1) AS ""Name"",
        (SELECT h2.holder_phone FROM pt_sale_holder h2 WHERE h2.pt_no = a.pt_no
                AND COALESCE(h2.holder_phone,'') <> '' ORDER BY h2.holder_idx LIMIT 1) AS ""Phone""
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
        c.cust_no    AS ""RefId"",
        c.want_type  AS ""TypeCode"",
        (SELECT string_agg(COALESCE(NULLIF(ta.bld_nm, ''), ta.addr3), ', ')
           FROM ct_trd_area ta WHERE ta.cust_no = c.cust_no) AS ""Addr"",
        json_build_array(json_build_object('name', c.name, 'phone', c.tel, 'role', '구입자'))::text AS ""PersonsJson"",
        c.name AS ""Name"",
        c.tel  AS ""Phone""
    FROM ct_cust c
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
)";

            var parameters = new List<NpgsqlParameter>
            {
                P("@like",   NpgsqlDbType.Varchar, "%" + q + "%"),
                P("@digits", NpgsqlDbType.Varchar, digits),
                P("@off_no", NpgsqlDbType.Bigint,  offNo),
                P("@rt_no",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(rtNo) ? null : rtNo),
                P("@lim",    NpgsqlDbType.Integer, lim),
            };

            result.Items = await _dataService.QueryAsyncPg<UnifiedSearchRow>("DEV", sql, parameters);
            return result;
        }
    }
}

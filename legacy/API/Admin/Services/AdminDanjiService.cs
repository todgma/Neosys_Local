using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Admin.Services
{
    public class DanjiDto
    {
        public string? BuildingName { get; set; }
        public string? BjdCode { get; set; }
        public string? AddressBunji { get; set; }
        public string? NaverDanjiCode { get; set; }
        public int? FamilyCnt { get; set; }
        public int? MaxFloor { get; set; }
        public int? MinFloor { get; set; }
        public int? TotBldCnt { get; set; }
        public string? ApproveDate { get; set; }
    }
    public class DanjiHoDto
    {
        public string NaverDanjiCode { get; set; } = "";
        public string DongNo { get; set; } = "";
        public string HoNumber { get; set; } = "";
        public string? HoName { get; set; }
        public string? PtpNo { get; set; }
        public string? PtpName { get; set; }
        public string? Floor { get; set; }
        public string? SplySpc { get; set; }
        public string? ExclsSpc { get; set; }
        public string? CtrtSpc { get; set; }
        public string? PilotiYn { get; set; }   // 필로티 여부(Y/N) — 하위호환(HoGubun에서 파생)
        public string? StoreYn { get; set; }     // 상가 여부(Y/N) — 하위호환(HoGubun에서 파생)
        public string? HoGubun { get; set; }     // 호 구분(일반/상가/필로티/기타/직접입력) — 신규 단일 컬럼
        public string? LineNo { get; set; }      // 호 라인 번호(열 위치)
    }
    // 동(棟) — danji_dong_new
    public class DanjiDongDto
    {
        public string NaverDanjiCode { get; set; } = "";
        public string DongNo { get; set; } = "";
        public string? DongName { get; set; }
        public int? HighestFloorCnt { get; set; }
        public string? DirectionTypeCode { get; set; }
        public string? EntranceTypeCd { get; set; }
        public string? InUse { get; set; }
    }
    // 조합원분(배치도) 일괄 설정 — danji_occupancy 의 off_no=0(관리자/전체공통) 스코프에 UNION 기록
    public class UnionSetDto
    {
        public string? NaverCode { get; set; }
        public bool On { get; set; }                       // true=설정, false=해제
        public List<UnionHoDto> Items { get; set; } = new List<UnionHoDto>();
    }
    public class UnionHoDto
    {
        public string? DongNo { get; set; }
        public string? HoNumber { get; set; }
        public string? Floor { get; set; }
    }

    // 면적(평형) — danji_area_new
    public class DanjiAreaDto
    {
        public long? Idx { get; set; }
        public string NaverDanjiCode { get; set; } = "";
        public string? PlanTypeName { get; set; }
        public string? PtpNo { get; set; }
        public decimal? SplySpc { get; set; }
        public decimal? ExclsSpc { get; set; }
        public decimal? CtrtSpc { get; set; }
        public int? RoomCnt { get; set; }
        public int? BathroomCnt { get; set; }
        public string? InUse { get; set; }
    }

    public interface IAdminDanjiService
    {
        Task<List<dynamic>> SearchDanji(string? q);
        Task<List<object>> GetBjdList(int addressType, string? addressCode);         // fn_get_bjd_list
        Task<(List<object> items, int total)> GetDanjiList(string? bjdCode, string? q, int page, int pageSize, string? hscpType = null);
        Task<object?> GetDanjiDetail(long id);
        Task<object?> GetModifiedSummary(string naverCode);
        Task<List<object>> GetDongList(string naverCode);
        Task<bool> UpsertDong(DanjiDongDto d);
        Task<bool> DeleteDong(string naverCode, string dongNo);
        Task<List<object>> GetHoList(string naverCode);
        Task<List<object>> GetAreaList(string naverCode);
        Task<long> InsertDanji(DanjiDto d);
        Task<bool> UpdateDanji(long id, DanjiDto d);
        Task<bool> DeleteDanji(long id);
        Task<bool> UpsertHo(DanjiHoDto d);
        Task<bool> DeleteHo(string naverCode, string dongNo, string hoNumber);
        // 조합원분(배치도) — 관리자 전체공통(off_no=0) 스코프
        Task<List<object>> GetUnionShares(string naverCode);
        Task<bool> SetUnionShares(UnionSetDto dto);
        Task<bool> UpsertArea(DanjiAreaDto d);
        Task<bool> DeleteArea(long idx);
    }

    public class AdminDanjiService : IAdminDanjiService
    {
        private readonly IPostgresDataService _db;
        public AdminDanjiService(IPostgresDataService db) { _db = db; }
        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };

        // to_jsonb 로 실제 컬럼 전체를 JSON으로 받아 매핑(dynamic 매핑 이슈 회피)
        private sealed class JsonRow { public string? Json { get; set; } }
        private sealed class CountRow { public long Cnt { get; set; } }
        private static List<object> Parse(List<JsonRow>? rows)
            => (rows ?? new List<JsonRow>())
                .Where(x => !string.IsNullOrWhiteSpace(x.Json))
                .Select(x => (object)JsonSerializer.Deserialize<JsonElement>(x.Json!))
                .ToList();

        // 네이버단지코드: danji_area_new는 숫자형(bigint/numeric)일 수 있어 bigint 파라미터로 통일(양쪽 호환)
        private static long? NaverLong(string? code) => (long.TryParse((code ?? "").Trim(), out var v) ? v : (long?)null);
        // danji_dong_new/danji_ho_new(naver_danji_code/dong_no/ho_number/ptp_no)는 정수형 → int 파라미터
        private static int? IntOrNull(string? v) => (int.TryParse((v ?? "").Trim(), out var n) ? n : (int?)null);
        // 면적(sply/excls/ctrt)은 실수형 컬럼 → double 파라미터
        private static double? DblOrNull(string? v) => (double.TryParse((v ?? "").Trim(), out var n) ? n : (double?)null);

        public async Task<List<dynamic>> SearchDanji(string? q)
        {
            string sql = @"SELECT id, building_code, building_name, bjd_code, address_bunji, naver_danji_code,
                                  family_cnt, max_floor, min_floor, tot_bld_cnt, approve_date
                             FROM danji
                            WHERE (@q IS NULL OR building_name ILIKE '%'||@q||'%' OR bjd_code ILIKE '%'||@q||'%' OR naver_danji_code ILIKE '%'||@q||'%')
                            ORDER BY building_name LIMIT 300";
            var ps = new List<NpgsqlParameter> { P("@q", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(q) ? null : q.Trim()) };
            var rows = await _db.QueryAsyncPg<dynamic>("DEV", sql, ps);
            return rows?.ToList() ?? new List<dynamic>();
        }

        // 법정동 select 소스 — 시도(1)/시군구(2)/법정동(4) 단계. fn_get_bjd_list 재사용.
        public async Task<List<object>> GetBjdList(int addressType, string? addressCode)
        {
            const string sql = @"SELECT to_jsonb(t)::text AS ""Json"" FROM fn_get_bjd_list(@type, @code) t";
            var ps = new List<NpgsqlParameter>
            {
                P("@type", NpgsqlDbType.Integer, addressType),
                P("@code", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(addressCode) ? null : addressCode.Trim()),
            };
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, ps);
            return Parse(rows);
        }

        // 단지 목록(법정동/유형/검색 + 페이징). bjdCode 없으면 최근 등록 순.
        public async Task<(List<object> items, int total)> GetDanjiList(string? bjdCode, string? q, int page, int pageSize, string? hscpType = null)
        {
            int pg = page <= 0 ? 1 : page, sz = pageSize <= 0 ? 20 : pageSize;
            const string where = @"
                 WHERE COALESCE(is_active, TRUE) = TRUE AND deleted_at IS NULL
                   AND (@bjd IS NULL OR bjd_code = @bjd)
                   AND (@hscp IS NULL OR hscp_type_code = @hscp)
                   AND (@q IS NULL OR building_name ILIKE '%'||@q||'%' OR naver_danji_code ILIKE '%'||@q||'%')";
            List<NpgsqlParameter> Filter() => new List<NpgsqlParameter>
            {
                P("@bjd", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(bjdCode) ? null : bjdCode.Trim()),
                P("@hscp", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(hscpType) ? null : hscpType.Trim()),
                P("@q",   NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(q) ? null : q.Trim()),
            };
            string orderBy = string.IsNullOrWhiteSpace(bjdCode) ? "id DESC" : "building_name";
            string listSql = $@"
                SELECT to_jsonb(t)::text AS ""Json"" FROM (
                    SELECT id, building_code, building_name, bjd_code, address_bunji, naver_danji_code,
                           family_cnt, max_floor, min_floor, tot_bld_cnt, approve_date, hscp_type_code,
                           (SELECT max(v) FROM (
                               SELECT COALESCE(NULLIF(update_date,''), reg_date) AS v FROM danji_dong_new WHERE naver_danji_code = danji.naver_danji_code::int
                               UNION ALL SELECT COALESCE(NULLIF(update_date,''), reg_date) FROM danji_area_new WHERE naver_danji_code = danji.naver_danji_code::int
                               UNION ALL SELECT COALESCE(NULLIF(update_date,''), reg_date) FROM danji_ho_new  WHERE naver_danji_code = danji.naver_danji_code::int
                           ) u) AS last_modified
                      FROM danji {where}
                     ORDER BY {orderBy}
                     LIMIT @sz OFFSET (@pg - 1) * @sz) t";
            var lp = Filter(); lp.Add(P("@sz", NpgsqlDbType.Integer, sz)); lp.Add(P("@pg", NpgsqlDbType.Integer, pg));
            var items = Parse(await _db.QueryAsyncPg<JsonRow>("DEV", listSql, lp));

            var cnt = await _db.QueryAsyncPg<CountRow>("DEV", $@"SELECT count(*) AS ""Cnt"" FROM danji {where}", Filter());
            int total = cnt?.FirstOrDefault()?.Cnt is long c ? (int)c : items.Count;
            return (items, total);
        }

        public async Task<object?> GetDanjiDetail(long id)
        {
            const string sql = @"SELECT to_jsonb(d)::text AS ""Json"" FROM danji d WHERE d.id = @id";
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, new List<NpgsqlParameter> { P("@id", NpgsqlDbType.Bigint, id) });
            return Parse(rows).FirstOrDefault();
        }

        // 섹션별 최근수정일(동/면적/호) — update_date 우선, 없으면 reg_date
        public async Task<object?> GetModifiedSummary(string naverCode)
        {
            const string sql = @"SELECT to_jsonb(t)::text AS ""Json"" FROM (
                SELECT
                  (SELECT max(COALESCE(NULLIF(update_date,''), reg_date)) FROM danji_dong_new WHERE naver_danji_code = @code) AS dong,
                  (SELECT max(COALESCE(NULLIF(update_date,''), reg_date)) FROM danji_area_new WHERE naver_danji_code = @code) AS area,
                  (SELECT max(COALESCE(NULLIF(update_date,''), reg_date)) FROM danji_ho_new  WHERE naver_danji_code = @code) AS ho
            ) t";
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, new List<NpgsqlParameter> { P("@code", NpgsqlDbType.Integer, IntOrNull(naverCode)) });
            return Parse(rows).FirstOrDefault();
        }

        // 동(棟) 목록 — danji_dong_new
        public async Task<List<object>> GetDongList(string naverCode)
        {
            const string sql = @"SELECT to_jsonb(t)::text AS ""Json"" FROM (
                                    SELECT naver_danji_code, dong_no, dong_name, highest_floor_cnt,
                                           direction_type_code, entrance_type_cd, in_use
                                      FROM danji_dong_new
                                     WHERE naver_danji_code = @code
                                     ORDER BY dong_no) t";
            var ps = new List<NpgsqlParameter> { P("@code", NpgsqlDbType.Integer, IntOrNull(naverCode)) };
            return Parse(await _db.QueryAsyncPg<JsonRow>("DEV", sql, ps));
        }

        // 동 등록/수정 — (naver_danji_code, dong_no) 기준 upsert (수동 존재확인)
        public async Task<bool> UpsertDong(DanjiDongDto d)
        {
            const string exist = @"SELECT 1 FROM danji_dong_new WHERE naver_danji_code=@code AND dong_no=@dong LIMIT 1";
            var key = new List<NpgsqlParameter>
            {
                P("@code", NpgsqlDbType.Integer, IntOrNull(d.NaverDanjiCode)),
                P("@dong", NpgsqlDbType.Integer, IntOrNull(d.DongNo)),
            };
            var found = await _db.QueryAsyncPg<dynamic>("DEV", exist, key);
            // NpgsqlParameter는 한 커맨드에만 속할 수 있어 exist용 key와 분리해 새로 생성
            var fields = new List<NpgsqlParameter>
            {
                P("@code", NpgsqlDbType.Integer, IntOrNull(d.NaverDanjiCode)),
                P("@dong", NpgsqlDbType.Integer, IntOrNull(d.DongNo)),
                P("@dongnm", NpgsqlDbType.Varchar, d.DongName),
                P("@hfc", NpgsqlDbType.Integer, d.HighestFloorCnt),
                P("@dir", NpgsqlDbType.Varchar, d.DirectionTypeCode),
                P("@ent", NpgsqlDbType.Varchar, d.EntranceTypeCd),
                P("@inuse", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(d.InUse) ? "Y" : d.InUse),
            };
            string sql = (found != null && found.Any())
                ? @"UPDATE danji_dong_new SET dong_name=@dongnm, highest_floor_cnt=@hfc, direction_type_code=@dir,
                        entrance_type_cd=@ent, in_use=@inuse, update_date=to_char(CURRENT_TIMESTAMP,'YYYY-MM-DD HH24:MI:SS')
                     WHERE naver_danji_code=@code AND dong_no=@dong"
                : @"INSERT INTO danji_dong_new (naver_danji_code, dong_no, dong_name, highest_floor_cnt, direction_type_code, entrance_type_cd, in_use, reg_date)
                     VALUES (@code, @dong, @dongnm, @hfc, @dir, @ent, @inuse, to_char(CURRENT_TIMESTAMP,'YYYY-MM-DD HH24:MI:SS'))";
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, fields) > 0;
        }

        public async Task<bool> DeleteDong(string naverCode, string dongNo)
        {
            var ps = new List<NpgsqlParameter>
            {
                P("@code", NpgsqlDbType.Integer, IntOrNull(naverCode)),
                P("@dong", NpgsqlDbType.Integer, IntOrNull(dongNo)),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", "DELETE FROM danji_dong_new WHERE naver_danji_code=@code AND dong_no=@dong", ps) > 0;
        }

        public async Task<List<object>> GetHoList(string naverCode)
        {
            try { await _db.ExecuteNonQueryAsyncPg("DEV", "ALTER TABLE danji_ho_new ADD COLUMN IF NOT EXISTS store_yn bit(1) DEFAULT B'0'; ALTER TABLE danji_ho_new ADD COLUMN IF NOT EXISTS ho_gubun varchar(20);", new List<NpgsqlParameter>()); } catch { /* ignore */ }
            const string sql = @"SELECT to_jsonb(t)::text AS ""Json"" FROM (
                                    SELECT h.naver_danji_code, h.dong_no, d.dong_name, h.ho_number, h.ho_name, h.ptp_no, h.ptp_name,
                                           h.floor, h.sply_spc, h.excls_spc, h.ctrt_spc, h.line_no,
                                           CASE WHEN h.piloti_yn = B'1' THEN 'Y' ELSE 'N' END AS piloti_yn,
                                           CASE WHEN h.store_yn = B'1' THEN 'Y' ELSE 'N' END AS store_yn,
                                           COALESCE(NULLIF(h.ho_gubun,''), CASE WHEN h.store_yn=B'1' THEN '상가' WHEN h.piloti_yn=B'1' THEN '필로티' ELSE '일반' END) AS ho_gubun
                                      FROM danji_ho_new h
                                      LEFT JOIN danji_dong_new d ON d.naver_danji_code = h.naver_danji_code AND d.dong_no = h.dong_no
                                     WHERE h.naver_danji_code = @code
                                     ORDER BY h.dong_no, h.line_no, h.ho_number LIMIT 50000) t";
            var ps = new List<NpgsqlParameter> { P("@code", NpgsqlDbType.Integer, IntOrNull(naverCode)) };
            return Parse(await _db.QueryAsyncPg<JsonRow>("DEV", sql, ps));
        }

        // 면적(평형) 목록 — danji_area_new
        public async Task<List<object>> GetAreaList(string naverCode)
        {
            const string sql = @"SELECT to_jsonb(a)::text AS ""Json""
                                   FROM danji_area_new a
                                  WHERE a.naver_danji_code = @code
                                  ORDER BY a.sply_spc";
            var ps = new List<NpgsqlParameter> { P("@code", NpgsqlDbType.Bigint, NaverLong(naverCode)) };
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, ps);
            return Parse(rows);
        }

        public async Task<long> InsertDanji(DanjiDto d)
        {
            const string sql = @"
                INSERT INTO danji (building_name, bjd_code, address_bunji, naver_danji_code, family_cnt, max_floor, min_floor, tot_bld_cnt, approve_date, is_active)
                VALUES (@nm, @bjd, @addr, @code, @fam, @maxf, @minf, @tot, @app, TRUE)
             RETURNING id AS ""Id""";
            var ps = new List<NpgsqlParameter>
            {
                P("@nm", NpgsqlDbType.Varchar, d.BuildingName), P("@bjd", NpgsqlDbType.Varchar, d.BjdCode),
                P("@addr", NpgsqlDbType.Varchar, d.AddressBunji), P("@code", NpgsqlDbType.Varchar, d.NaverDanjiCode),
                P("@fam", NpgsqlDbType.Integer, d.FamilyCnt), P("@maxf", NpgsqlDbType.Integer, d.MaxFloor),
                P("@minf", NpgsqlDbType.Integer, d.MinFloor), P("@tot", NpgsqlDbType.Integer, d.TotBldCnt),
                P("@app", NpgsqlDbType.Varchar, d.ApproveDate),
            };
            var rows = await _db.QueryAsyncPg<dynamic>("DEV", sql, ps);
            var first = rows?.FirstOrDefault();
            return first == null ? 0 : Convert.ToInt64(((IDictionary<string, object>)first)["Id"]);
        }

        public async Task<bool> UpdateDanji(long id, DanjiDto d)
        {
            const string sql = @"
                UPDATE danji SET building_name=@nm, bjd_code=@bjd, address_bunji=@addr, naver_danji_code=@code,
                                 family_cnt=@fam, max_floor=@maxf, min_floor=@minf, tot_bld_cnt=@tot, approve_date=@app
                 WHERE id=@id";
            var ps = new List<NpgsqlParameter>
            {
                P("@id", NpgsqlDbType.Bigint, id), P("@nm", NpgsqlDbType.Varchar, d.BuildingName),
                P("@bjd", NpgsqlDbType.Varchar, d.BjdCode), P("@addr", NpgsqlDbType.Varchar, d.AddressBunji),
                P("@code", NpgsqlDbType.Varchar, d.NaverDanjiCode), P("@fam", NpgsqlDbType.Integer, d.FamilyCnt),
                P("@maxf", NpgsqlDbType.Integer, d.MaxFloor), P("@minf", NpgsqlDbType.Integer, d.MinFloor),
                P("@tot", NpgsqlDbType.Integer, d.TotBldCnt), P("@app", NpgsqlDbType.Varchar, d.ApproveDate),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<bool> DeleteDanji(long id)
        {
            var ps = new List<NpgsqlParameter> { P("@id", NpgsqlDbType.Bigint, id) };
            return await _db.ExecuteNonQueryAsyncPg("DEV", "DELETE FROM danji WHERE id=@id", ps) > 0;
        }

        public async Task<bool> UpsertHo(DanjiHoDto d)
        {
            try { await _db.ExecuteNonQueryAsyncPg("DEV", "ALTER TABLE danji_ho_new ADD COLUMN IF NOT EXISTS store_yn bit(1) DEFAULT B'0'; ALTER TABLE danji_ho_new ADD COLUMN IF NOT EXISTS ho_gubun varchar(20);", new List<NpgsqlParameter>()); } catch { /* ignore */ }
            // 호 구분(단일 컬럼) 결정 — HoGubun 우선, 없으면 과거 PilotiYn/StoreYn에서 파생
            string gubun = !string.IsNullOrWhiteSpace(d.HoGubun) ? d.HoGubun!.Trim()
                         : (d.StoreYn == "Y") ? "상가" : (d.PilotiYn == "Y") ? "필로티" : "일반";
            // piloti_yn/store_yn 은 하위호환용으로 gubun에서 파생
            string pilotiBit = gubun == "필로티" ? "1" : "0";
            string storeBit = gubun == "상가" ? "1" : "0";
            // (naver_danji_code, dong_no, ho_number) 기준 upsert (제약 없을 수 있어 수동 존재확인)
            const string exist = @"SELECT 1 FROM danji_ho_new WHERE naver_danji_code=@code AND dong_no=@dong AND ho_number=@ho LIMIT 1";
            var key = new List<NpgsqlParameter>
            {
                P("@code", NpgsqlDbType.Integer, IntOrNull(d.NaverDanjiCode)), P("@dong", NpgsqlDbType.Integer, IntOrNull(d.DongNo)), P("@ho", NpgsqlDbType.Integer, IntOrNull(d.HoNumber)),
            };
            var found = await _db.QueryAsyncPg<dynamic>("DEV", exist, key);
            // NpgsqlParameter는 한 커맨드에만 속할 수 있어 exist용 key와 분리해 새로 생성
            var fields = new List<NpgsqlParameter>
            {
                P("@code", NpgsqlDbType.Integer, IntOrNull(d.NaverDanjiCode)), P("@dong", NpgsqlDbType.Integer, IntOrNull(d.DongNo)), P("@ho", NpgsqlDbType.Integer, IntOrNull(d.HoNumber)),
                P("@honm", NpgsqlDbType.Varchar, d.HoName), P("@ptpno", NpgsqlDbType.Integer, IntOrNull(d.PtpNo)),
                P("@ptpnm", NpgsqlDbType.Varchar, d.PtpName), P("@floor", NpgsqlDbType.Varchar, d.Floor),
                P("@sply", NpgsqlDbType.Double, DblOrNull(d.SplySpc)), P("@excls", NpgsqlDbType.Double, DblOrNull(d.ExclsSpc)),
                P("@ctrt", NpgsqlDbType.Double, DblOrNull(d.CtrtSpc)),
                // piloti_yn/store_yn 은 bit(1) → '1'/'0' 텍스트로 넘겨 ::bit(1) 캐스팅
                P("@piloti", NpgsqlDbType.Varchar, pilotiBit),
                P("@store", NpgsqlDbType.Varchar, storeBit),
                P("@gubun", NpgsqlDbType.Varchar, gubun),
                P("@line", NpgsqlDbType.Varchar, d.LineNo),
            };
            // reg_date/update_date 는 varchar(50) → 문자열로 저장
            string sql = (found != null && found.Any())
                ? @"UPDATE danji_ho_new SET ho_name=@honm, ptp_no=@ptpno, ptp_name=@ptpnm, floor=@floor,
                        sply_spc=@sply, excls_spc=@excls, ctrt_spc=@ctrt, piloti_yn=@piloti::bit(1), store_yn=@store::bit(1), ho_gubun=@gubun, line_no=@line,
                        update_date=to_char(CURRENT_TIMESTAMP,'YYYY-MM-DD HH24:MI:SS')
                     WHERE naver_danji_code=@code AND dong_no=@dong AND ho_number=@ho"
                : @"INSERT INTO danji_ho_new (naver_danji_code, dong_no, ho_number, ho_name, ptp_no, ptp_name, floor, sply_spc, excls_spc, ctrt_spc, piloti_yn, store_yn, ho_gubun, line_no, reg_date)
                     VALUES (@code, @dong, @ho, @honm, @ptpno, @ptpnm, @floor, @sply, @excls, @ctrt, @piloti::bit(1), @store::bit(1), @gubun, @line, to_char(CURRENT_TIMESTAMP,'YYYY-MM-DD HH24:MI:SS'))";
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, fields) > 0;
        }

        public async Task<bool> DeleteHo(string naverCode, string dongNo, string hoNumber)
        {
            var ps = new List<NpgsqlParameter>
            {
                P("@code", NpgsqlDbType.Integer, IntOrNull(naverCode)), P("@dong", NpgsqlDbType.Integer, IntOrNull(dongNo)), P("@ho", NpgsqlDbType.Integer, IntOrNull(hoNumber)),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", "DELETE FROM danji_ho_new WHERE naver_danji_code=@code AND dong_no=@dong AND ho_number=@ho", ps) > 0;
        }

        // ── 조합원분(배치도) — danji_occupancy 의 off_no=0(관리자/전체공통) 스코프 ──
        public async Task<List<object>> GetUnionShares(string naverCode)
        {
            const string sql = @"SELECT to_jsonb(t)::text AS ""Json"" FROM (
                                    SELECT dong_no, ho_number FROM danji_occupancy
                                     WHERE naver_danji_code = @code AND off_no = 0 AND occupancy_status LIKE '%UNION%'
                                ) t";
            var ps = new List<NpgsqlParameter> { P("@code", NpgsqlDbType.Integer, IntOrNull(naverCode)) };
            return Parse(await _db.QueryAsyncPg<JsonRow>("DEV", sql, ps));
        }

        public async Task<bool> SetUnionShares(UnionSetDto dto)
        {
            int? code = IntOrNull(dto?.NaverCode);
            if (code == null || dto?.Items == null || dto.Items.Count == 0) return false;

            foreach (var it in dto.Items)
            {
                int? dong = IntOrNull(it?.DongNo);
                int? ho = IntOrNull(it?.HoNumber);
                if (dong == null || ho == null) continue;

                if (dto.On)
                {
                    // off_no=0 전용 UNION upsert ((off_no,naver,dong,ho) UNIQUE)
                    const string up = @"
                        INSERT INTO danji_occupancy (off_no, naver_danji_code, dong_no, ho_number, floor, occupancy_status, reg_dt, reg_id, upd_dt, upd_id)
                        VALUES (0, @code, @dong, @ho, @floor, 'UNION', CURRENT_TIMESTAMP, 'admin', CURRENT_TIMESTAMP, 'admin')
                        ON CONFLICT (off_no, naver_danji_code, dong_no, ho_number)
                        DO UPDATE SET occupancy_status='UNION', floor=EXCLUDED.floor, upd_dt=CURRENT_TIMESTAMP, upd_id='admin'";
                    await _db.ExecuteNonQueryAsyncPg("DEV", up, new List<NpgsqlParameter>
                    {
                        P("@code", NpgsqlDbType.Integer, code), P("@dong", NpgsqlDbType.Integer, dong),
                        P("@ho", NpgsqlDbType.Integer, ho), P("@floor", NpgsqlDbType.Varchar, it?.Floor),
                    });
                }
                else
                {
                    const string del = @"DELETE FROM danji_occupancy WHERE off_no=0 AND naver_danji_code=@code AND dong_no=@dong AND ho_number=@ho";
                    await _db.ExecuteNonQueryAsyncPg("DEV", del, new List<NpgsqlParameter>
                    {
                        P("@code", NpgsqlDbType.Integer, code), P("@dong", NpgsqlDbType.Integer, dong), P("@ho", NpgsqlDbType.Integer, ho),
                    });
                }
            }
            return true;
        }

        // 면적(평형) 등록/수정 — idx 있으면 UPDATE, 없으면 INSERT
        public async Task<bool> UpsertArea(DanjiAreaDto d)
        {
            var fields = new List<NpgsqlParameter>
            {
                P("@code", NpgsqlDbType.Bigint, NaverLong(d.NaverDanjiCode)),
                P("@ptn", NpgsqlDbType.Varchar, d.PlanTypeName), P("@ptpno", NpgsqlDbType.Integer, IntOrNull(d.PtpNo)),
                P("@sply", NpgsqlDbType.Numeric, d.SplySpc), P("@excls", NpgsqlDbType.Numeric, d.ExclsSpc),
                P("@ctrt", NpgsqlDbType.Numeric, d.CtrtSpc), P("@room", NpgsqlDbType.Integer, d.RoomCnt),
                P("@bath", NpgsqlDbType.Integer, d.BathroomCnt), P("@inuse", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(d.InUse) ? "Y" : d.InUse),
            };
            string sql;
            if (d.Idx.HasValue && d.Idx.Value > 0)
            {
                sql = @"UPDATE danji_area_new SET plan_type_name=@ptn, ptp_no=@ptpno, sply_spc=@sply, excls_spc=@excls,
                             ctrt_spc=@ctrt, room_cnt=@room, bathroom_cnt=@bath, in_use=@inuse
                         WHERE idx=@idx";
                fields.Add(P("@idx", NpgsqlDbType.Bigint, d.Idx.Value));
            }
            else
            {
                sql = @"INSERT INTO danji_area_new (naver_danji_code, plan_type_name, ptp_no, sply_spc, excls_spc, ctrt_spc, room_cnt, bathroom_cnt, in_use)
                         VALUES (@code, @ptn, @ptpno, @sply, @excls, @ctrt, @room, @bath, @inuse)";
            }
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, fields) > 0;
        }

        public async Task<bool> DeleteArea(long idx)
        {
            var ps = new List<NpgsqlParameter> { P("@idx", NpgsqlDbType.Bigint, idx) };
            return await _db.ExecuteNonQueryAsyncPg("DEV", "DELETE FROM danji_area_new WHERE idx=@idx", ps) > 0;
        }
    }
}

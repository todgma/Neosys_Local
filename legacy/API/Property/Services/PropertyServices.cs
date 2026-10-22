using System.Data;
using System.Linq;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using RealestateAPI.Shared.Infrastructure;
using Newtonsoft.Json;
using System.Collections.Generic;
using Npgsql;
using NpgsqlTypes;
using Newtonsoft.Json.Linq;
using System.Text.RegularExpressions;
using System.Numerics;
using RealestateAPI.Property.Models;
using RealestateAPI.Admin.Models;
using RealestateAPI.Property.Controllers;
using static Org.BouncyCastle.Math.EC.ECCurve;
using RealestateAPI.Customer.Models;

namespace RealestateAPI.Property.Services
{
    public interface IPropertyServices
    {
        //물건정보 관리
        public Task<PtSaleList> SelectPropertyList(int? PtNo, string? PtName, long? OffNo, string? RtNo, string? DanjiCode, string? Addr3, string? PtType, string? SaleDiv, string? BjdCodes, int Page, int PageSize, string? Dong = null, string? FloorFilter = null, string? ProgressOnly = null, string? OrderBy = null, string? OrderDirection = null, string? Keyword = null,
            string? Ho = null, decimal? AreaMin = null, decimal? AreaMax = null, int? AmtMin = null, int? AmtMax = null, int? MonMin = null, int? MonMax = null);
        public Task<PtSale?> GetPropertyDetail(long PtNo);
        public Task<long> InsertProperty(PropertyCreateDto Dto);
        // 엑셀 일괄 업로드 — 동/호 명칭을 DB(danji_dong_new/danji_ho_new)로 정규화 후 건별 등록
        public Task<PropertyBulkResult> BulkInsertProperties(PropertyBulkUploadDto Dto);
        public Task<bool> UpdateProperty(long PtNo, PropertyUpdateDto Dto);
        public Task<bool> DeleteProperty(long PtNo, string? UserId);
        // 물건상태(pt_sts) 변경 — 값이 null이면 컬럼을 NULL로 설정(진행중 해제)
        public Task<bool> UpdatePropertyStatus(long PtNo, string? PtSts, string? UserId);
        public Task<bool> SyncPropertyHolders(long PtNo, List<PropertyHolderDto>? Holders, string? UserId);
        // 과거내역(pt_sale_old)
        public Task<bool> ArchivePropertyHistory(long PtNo, string? UserId);
        public Task<int> GetPropertyHistoryCount(long PtNo);
        public Task<List<PtSaleHistory>> GetPropertyHistoryList(long PtNo);
    }

    public class PropertyServices : IPropertyServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public PropertyServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        // pt_sale 조회 컬럼 별칭 (fn_pt_sale 미사용 직접 조회)
        private const string PT_COLS = @"
            a.pt_no AS ""PtNo"", a.pt_name AS ""PtName"", a.pt_sts AS ""PtSts"", a.pt_type AS ""PtType"", a.pt_expl AS ""PtExpl"", a.sale_div AS ""SaleDiv"",
            a.addr1 AS ""Addr1"", a.addr2 AS ""Addr2"", a.addr3 AS ""Addr3"", a.addr4 AS ""Addr4"", a.addr5 AS ""Addr5"", a.addr_post AS ""AddrPost"",
            a.bjd_code AS ""BjdCode"", a.danji_code AS ""DanjiCode"", a.dong AS ""Dong"", a.ho AS ""Ho"", a.floor AS ""Floor"", a.opt AS ""Opt"", a.house_cnt AS ""HouseCnt"",
            a.apt_typ AS ""AptTyp"", a.sup_area AS ""SupArea"", a.exc_area AS ""ExcArea"", a.land_share AS ""LandShare"", a.room_cnt AS ""RoomCnt"", a.bath_cnt AS ""BathCnt"", a.ev_charger_cnt AS ""EvChargerCnt"",
            a.dir_std AS ""DirStd"", a.heat_method AS ""HeatMethod"", a.heat_fuel AS ""HeatFuel"", a.entr_struct AS ""EntrStruct"", a.buid_struct AS ""BuidStruct"",
            a.balc_ext AS ""BalcExt"", a.floor1 AS ""Floor1"", a.floor2 AS ""Floor2"", a.pk_cnt AS ""PkCnt"", a.maint_cost AS ""MaintCost"", a.maint_dtl AS ""MaintDtl"",
            a.sale_amt AS ""SaleAmt"", a.les_amt AS ""LesAmt"", a.prot_amt AS ""ProtAmt"", a.mon_amt AS ""MonAmt"", a.etc_amt AS ""EtcAmt"", a.lay_amt AS ""LayAmt"",
            a.now_dep_amt AS ""NowDepAmt"", a.now_mon_amt AS ""NowMonAmt"", a.loan_amt AS ""LoanAmt"", a.loan_amt_aft AS ""LoanAmtAft"", a.mtry_date AS ""MtryDate"",
            a.expt_mov_date AS ""ExptMovDate"", a.expt_date AS ""ExptDate"", a.expt_com_date AS ""ExptComDate"", a.comp_year AS ""CompYear"", a.sha_yn AS ""ShaYn"",
            a.cust_no AS ""CustNo"", a.off_no AS ""OffNo"", a.rt_no AS ""RtNo"", a.cn_no AS ""CnNo"", a.mvn_psb_yn AS ""MvnPsbYn"", a.house_rental AS ""HouseRental"",
            a.pet_yn AS ""PetYn"", a.top AS ""Top"", a.pt_memo AS ""PtMemo"", a.business_type AS ""BusinessType"", a.business_name AS ""BusinessName"",
            a.registry_owner AS ""RegistryOwner"", a.contract_tenant AS ""ContractTenant"", a.etc_amt2 AS ""EtcAmt2"", a.etc_lease_type AS ""EtcLeaseType"", a.jibun AS ""Jibun"", a.maint_zone_name AS ""MaintZoneName"", a.child_yn AS ""ChildYn"", a.child_cond AS ""ChildCond"", a.pet_allow AS ""PetAllow"", a.pet_cond AS ""PetCond"",
            a.lend_amt AS ""LendAmt"", a.lend_amt_aft AS ""LendAmtAft"", a.dep_loan_bank AS ""DepLoanBank"", a.dep_loan_amt AS ""DepLoanAmt"", a.past_data_yn AS ""PastDataYn"",
            a.reg_dt AS ""RegDt"", a.reg_id AS ""RegId"", a.upd_dt AS ""UpdDt"", a.upd_id AS ""UpdId"",
            a.current_status AS ""CurrentStatus"", a.contract_renewal_right AS ""ContractRenewalRight"", a.building_use AS ""BuildingUse"", a.land_use AS ""LandUse"",
            a.land_category AS ""LandCategory"", a.other_restrictions AS ""OtherRestrictions"", a.dir_base AS ""DirBase"", a.recommended_business AS ""RecommendedBusiness"",
            a.sub_type AS ""SubType"", a.building_form AS ""BuildingForm"", a.main_building_use AS ""MainBuildingUse"", a.community_facility AS ""CommunityFacility"",
            a.addr_detail AS ""AddrDetail"", a.toilet AS ""Toilet"", a.contract_date AS ""ContractDate"", a.hold_date AS ""HoldDate"", a.permit_date AS ""PermitDate"",
            a.former_pt_type AS ""FormerPtType"", a.former_bjd_code AS ""FormerBjdCode"", a.former_danji_code AS ""FormerDanjiCode"", a.former_addr1 AS ""FormerAddr1"", a.former_addr2 AS ""FormerAddr2"", a.former_addr3 AS ""FormerAddr3"", a.former_addr4 AS ""FormerAddr4"", a.former_addr5 AS ""FormerAddr5"", a.former_jibun AS ""FormerJibun"", a.former_dong AS ""FormerDong"", a.former_ho AS ""FormerHo"",
            a.former_apt_typ AS ""FormerAptTyp"", a.former_sup_area AS ""FormerSupArea"", a.former_exc_area AS ""FormerExcArea"", a.former_total_floor_area AS ""FormerTotalFloorArea"", a.former_land_area AS ""FormerLandArea"", a.former_land_share_ratio AS ""FormerLandShareRatio"",
            a.gross_area AS ""GrossArea"", a.building_area AS ""BuildingArea"", a.land_share_ratio AS ""LandShareRatio"", a.access_road AS ""AccessRoad"", a.office_area AS ""OfficeArea"", a.road_info AS ""RoadInfo"",
            a.facility_cost AS ""FacilityCost"", a.city_gas AS ""CityGas"", a.power_receiving AS ""PowerReceiving"", a.elec_capacity AS ""ElecCapacity"", a.elevator_cnt AS ""ElevatorCnt"", a.stairs_cnt AS ""StairsCnt"", a.basement_floor AS ""BasementFloor"", a.ground_floor AS ""GroundFloor"", a.guest_room_cnt AS ""GuestRoomCnt"",
            a.presale_amt AS ""PresaleAmt"", a.expansion_amt AS ""ExpansionAmt"", a.option_amt AS ""OptionAmt"", a.premium_amt AS ""PremiumAmt"", a.former_area AS ""FormerArea"", a.add_contrib_amt AS ""AddContribAmt"", a.right_value_amt AS ""RightValueAmt"", a.moving_cost AS ""MovingCost"", a.deposit_total AS ""DepositTotal"", a.loan_total AS ""LoanTotal"", a.invest_amt AS ""InvestAmt"",
            a.inc_rent_m AS ""IncRentM"", a.inc_rent_y AS ""IncRentY"", a.inc_mgmt_m AS ""IncMgmtM"", a.inc_mgmt_y AS ""IncMgmtY"", a.inc_etc_m AS ""IncEtcM"", a.inc_etc_y AS ""IncEtcY"",
            a.exp_labor_m AS ""ExpLaborM"", a.exp_labor_y AS ""ExpLaborY"", a.exp_util_m AS ""ExpUtilM"", a.exp_util_y AS ""ExpUtilY"", a.exp_loan_m AS ""ExpLoanM"", a.exp_loan_y AS ""ExpLoanY"", a.exp_etc_m AS ""ExpEtcM"", a.exp_etc_y AS ""ExpEtcY"",
            a.zone_adjust AS ""ZoneAdjust"", a.zone_overheat AS ""ZoneOverheat"", a.zone_spec AS ""ZoneSpec"", a.zone_land_permit AS ""ZoneLandPermit"", a.build_permit AS ""BuildPermit"", a.zone_dev_restrict AS ""ZoneDevRestrict"",
            a.right_surface AS ""RightSurface"", a.right_grave AS ""RightGrave"", a.right_easement AS ""RightEasement"",
            (SELECT MAX(t.reg_dt) FROM rt_trade_info t
               WHERE t.pt_no = a.pt_no::text AND COALESCE(t.trade_status,'Y') <> 'N') AS ""TransmitDt"",
            (SELECT MAX(r.report_no) FROM report r WHERE r.pt_no = a.pt_no) AS ""ReportNo"",
            (SELECT i.itv_content FROM ct_interview i WHERE i.pt_no = a.pt_no ORDER BY i.itv_no DESC LIMIT 1) AS ""ConsultContent"",
            (SELECT COALESCE(SUM(l.deposit),0)      FROM pt_lease_status l WHERE l.pt_no = a.pt_no) AS ""DepositSum"",
            (SELECT COALESCE(SUM(l.monthly_rent),0) FROM pt_lease_status l WHERE l.pt_no = a.pt_no) AS ""MonSum""";

        // 목록 공통 WHERE (pt_type 은 실제 SYCA 코드, 콤마 다중 지원)
        private const string PT_WHERE = @"
                 WHERE (@pt_no      IS NULL OR a.pt_no = @pt_no)
                   AND (@pt_name    IS NULL OR a.pt_name LIKE '%' || @pt_name || '%')
                   AND (@keyword    IS NULL
                        OR a.pt_name       ILIKE '%' || @keyword || '%'
                        OR a.addr1         ILIKE '%' || @keyword || '%'
                        OR a.addr2         ILIKE '%' || @keyword || '%'
                        OR a.addr3         ILIKE '%' || @keyword || '%'
                        OR a.addr4         ILIKE '%' || @keyword || '%'
                        OR a.addr5         ILIKE '%' || @keyword || '%'
                        OR a.jibun         ILIKE '%' || @keyword || '%'
                        OR a.pt_memo       ILIKE '%' || @keyword || '%'
                        OR a.business_name ILIKE '%' || @keyword || '%'
                        OR CAST(a.dong AS TEXT) ILIKE '%' || @keyword || '%'
                        OR a.ho            ILIKE '%' || @keyword || '%')
                   AND (@pt_type    IS NULL OR a.pt_type = ANY(string_to_array(@pt_type, ',')))
                   AND (@sale_div   IS NULL OR EXISTS (
                          SELECT 1 FROM unnest(string_to_array(@sale_div, ',')) AS sale_div_filter
                           WHERE a.sale_div LIKE '%' || sale_div_filter || '%'))
                   AND (@off_no     IS NULL OR a.off_no = @off_no)
                   AND (@rt_no      IS NULL OR a.rt_no = @rt_no)
                   AND (@danji_code IS NULL OR a.danji_code = @danji_code)
                   AND (@addr3      IS NULL OR a.addr3 LIKE '%' || @addr3 || '%')
                   AND (@bjd_codes  IS NULL OR EXISTS (
                          SELECT 1 FROM unnest(string_to_array(@bjd_codes, ',')) AS bjd_filter
                           WHERE a.bjd_code LIKE bjd_filter || '%'))
                   AND (@dong       IS NULL OR CAST(a.dong AS TEXT) LIKE '%' || @dong || '%')
                   AND (@floor_filter IS NULL
                        OR (@floor_filter = 'top'   AND a.floor1 IS NOT NULL AND a.floor2 IS NOT NULL AND a.floor1 = a.floor2)
                        OR (@floor_filter = 'first' AND a.floor1 = 1)
                        OR (@floor_filter = 'exceptFirst' AND (a.floor1 IS NULL OR a.floor1 <> 1)))
                   AND (@progress_only IS NULL OR a.pt_sts LIKE '%' || @progress_only || '%')
                   AND (@ho IS NULL OR a.ho ILIKE '%' || @ho || '%')
                   -- 면적(㎡): 토지=대지지분(land_share), 그 외=전용면적(exc_area)
                   AND (@area_min IS NULL OR (CASE WHEN a.pt_type = 'SYCA115' THEN a.land_share ELSE a.exc_area END) >= @area_min)
                   AND (@area_max IS NULL OR (CASE WHEN a.pt_type = 'SYCA115' THEN a.land_share ELSE a.exc_area END) <= @area_max)
                   -- 거래금액(만원): 매매/전세/보증금/기타보증금 중 하나라도 범위
                   AND ((@amt_min IS NULL AND @amt_max IS NULL) OR EXISTS (
                          SELECT 1 FROM unnest(ARRAY[a.sale_amt, a.les_amt, a.prot_amt, a.etc_amt]) AS v
                           WHERE v IS NOT NULL AND v > 0
                             AND (@amt_min IS NULL OR v >= @amt_min) AND (@amt_max IS NULL OR v <= @amt_max)))
                   -- 월차임(만원): 월세차임 범위
                   AND ((@mon_min IS NULL AND @mon_max IS NULL) OR EXISTS (
                          SELECT 1 FROM unnest(ARRAY[a.mon_amt]) AS v
                           WHERE v IS NOT NULL AND v > 0
                             AND (@mon_min IS NULL OR v >= @mon_min) AND (@mon_max IS NULL OR v <= @mon_max)))";

        private static List<NpgsqlParameter> PtFilterParams(int? PtNo, string? PtName, string? PtType, string? SaleDiv, long? OffNo, string? RtNo, string? DanjiCode, string? Addr3, string? BjdCodes, string? Dong, string? FloorFilter, string? ProgressOnly = null, string? Keyword = null,
            string? Ho = null, decimal? AreaMin = null, decimal? AreaMax = null, int? AmtMin = null, int? AmtMax = null, int? MonMin = null, int? MonMax = null)
            => new List<NpgsqlParameter>
            {
                P("@pt_no",      NpgsqlDbType.Bigint,  PtNo),
                P("@pt_name",    NpgsqlDbType.Varchar, PtName),
                P("@keyword",    NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(Keyword) ? null : Keyword),
                P("@pt_type",    NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(PtType) ? null : PtType),
                P("@sale_div",   NpgsqlDbType.Varchar, SaleDiv),
                P("@off_no",     NpgsqlDbType.Bigint,  OffNo),
                P("@rt_no",      NpgsqlDbType.Varchar, RtNo),
                P("@danji_code", NpgsqlDbType.Varchar, DanjiCode),
                P("@addr3",      NpgsqlDbType.Varchar, Addr3),
                P("@bjd_codes",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(BjdCodes) ? null : BjdCodes),
                P("@dong",       NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(Dong) ? null : Dong),
                P("@floor_filter", NpgsqlDbType.Varchar, (string.IsNullOrWhiteSpace(FloorFilter) || FloorFilter == "all") ? null : FloorFilter),
                // 상태 탭: 전달된 pt_sts 코드(PTSTS01~04)로 LIKE 필터 적용
                P("@progress_only", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(ProgressOnly) ? null : ProgressOnly),
                // 호/면적/금액/월차임 범위 필터
                P("@ho",       NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(Ho) ? null : Ho),
                P("@area_min", NpgsqlDbType.Numeric, AreaMin),
                P("@area_max", NpgsqlDbType.Numeric, AreaMax),
                P("@amt_min",  NpgsqlDbType.Integer, AmtMin),
                P("@amt_max",  NpgsqlDbType.Integer, AmtMax),
                P("@mon_min",  NpgsqlDbType.Integer, MonMin),
                P("@mon_max",  NpgsqlDbType.Integer, MonMax),
            };

        // 단지 배치도 호(danji_ho_new + dong_name) — ghost 행 생성용
        private class DanjiHoUnit
        {
            public string? DongName { get; set; }
            public int? DongNo { get; set; }
            public int? HoNumber { get; set; }
            public string? HoName { get; set; }
            public string? PtpName { get; set; }
            public int? Floor { get; set; }
            public decimal? SplySpc { get; set; }
            public decimal? ExclsSpc { get; set; }
        }

        public async Task<PtSaleList> SelectPropertyList(int? PtNo, string? PtName, long? OffNo, string? RtNo, string? DanjiCode, string? Addr3, string? PtType, string? SaleDiv, string? BjdCodes, int Page, int PageSize, string? Dong = null, string? FloorFilter = null, string? ProgressOnly = null, string? OrderBy = null, string? OrderDirection = null, string? Keyword = null,
            string? Ho = null, decimal? AreaMin = null, decimal? AreaMax = null, int? AmtMin = null, int? AmtMax = null, int? MonMin = null, int? MonMax = null)
        {
            // 정렬: 화이트리스트만 허용 (raw OrderBy 절대 미보간)
            // 프론트 전달값: recent_reg/first_reg → 'crt_dt', modified → 'upd_dt'
            string orderColumn = (OrderBy ?? "").ToLower() switch
            {
                "upd_dt" or "modified" => "a.upd_dt",
                _ => "a.reg_dt",   // recent/crt_dt/reg_dt/first_reg 및 미지정 기본값
            };
            string orderDir = (OrderDirection ?? "").ToUpper() == "ASC" ? "ASC" : "DESC";

            // 목록 (fn_pt_sale 미사용, 직접 쿼리 — pt_type 은 실제 SYCA 코드로 필터)
            string sql = $@"
                SELECT {PT_COLS}
                  FROM pt_sale a
                {PT_WHERE}
                 ORDER BY {orderColumn} {orderDir}
                 LIMIT @page_size OFFSET (@page - 1) * @page_size";

            var parameters = PtFilterParams(PtNo, PtName, PtType, SaleDiv, OffNo, RtNo, DanjiCode, Addr3, BjdCodes, Dong, FloorFilter, ProgressOnly, Keyword, Ho, AreaMin, AreaMax, AmtMin, AmtMax, MonMin, MonMax);
            parameters.Add(P("@page_size", NpgsqlDbType.Integer, PageSize <= 0 ? 20 : PageSize));
            parameters.Add(P("@page", NpgsqlDbType.Integer, Page <= 0 ? 1 : Page));

            var ptSaleList = await _dataService.QueryAsyncPg<PtSale>("DEV", sql, parameters);

            // 전체 개수 (페이징용) - 직접 count
            int totalCount = 0;
            string countSql = $@"SELECT count(*)::int AS cnt FROM pt_sale a {PT_WHERE}";
            try
            {
                using (var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV")))
                {
                    await connection.OpenAsync();
                    using (var cmd = new NpgsqlCommand(countSql, connection))
                    {
                        cmd.Parameters.AddRange(PtFilterParams(PtNo, PtName, PtType, SaleDiv, OffNo, RtNo, DanjiCode, Addr3, BjdCodes, Dong, FloorFilter, ProgressOnly, Keyword, Ho, AreaMin, AreaMax, AmtMin, AmtMax, MonMin, MonMax).ToArray());
                        var result = await cmd.ExecuteScalarAsync();
                        totalCount = (result != null && result != DBNull.Value) ? Convert.ToInt32(result) : 0;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting total count: {ex.Message}");
                totalCount = ptSaleList?.Count ?? 0;
            }

            // ── 단지 배치도 호 UNION(ghost) ──
            //  단지(danjiCode) 조회 시: 해당 단지 등록 물건 + danji_ho_new 미등록 호(ghost)를 병합해 C#에서 페이징.
            //  실패 시 기본 목록 유지(fail-safe). danji_code = danji_ho_new.naver_danji_code(정수) 일치.
            // 진행중(ProgressOnly) 등 상태 필터 시에는 ghost(미등록 호)를 제외 — ghost는 상태값이 없음
            if (!string.IsNullOrWhiteSpace(DanjiCode) && string.IsNullOrWhiteSpace(ProgressOnly) && int.TryParse(DanjiCode, out int danjiCodeInt))
            {
                try
                {
                    // 1) 이 단지의 등록 물건 전체(페이지 무시)
                    string allSql = $@"SELECT {PT_COLS} FROM pt_sale a {PT_WHERE} ORDER BY a.dong NULLS FIRST, a.ho NULLS FIRST";
                    var allReg = await _dataService.QueryAsyncPg<PtSale>("DEV", allSql,
                        PtFilterParams(PtNo, PtName, PtType, SaleDiv, OffNo, RtNo, DanjiCode, Addr3, BjdCodes, Dong, FloorFilter, ProgressOnly, Keyword, Ho, AreaMin, AreaMax, AmtMin, AmtMax, MonMin, MonMax));

                    if (allReg != null && allReg.Count > 0)
                    {
                        var rep = allReg[0];
                        // 2) danji_ho_new(+dong_name) 전체 호
                        const string hoSql = @"
                            SELECT d.dong_name AS ""DongName"", h.dong_no AS ""DongNo"", h.ho_number AS ""HoNumber"",
                                   h.ho_name AS ""HoName"", h.ptp_name AS ""PtpName"", h.floor AS ""Floor"",
                                   h.sply_spc AS ""SplySpc"", h.excls_spc AS ""ExclsSpc""
                              FROM danji_ho_new h
                              LEFT JOIN danji_dong_new d ON d.naver_danji_code = h.naver_danji_code AND d.dong_no = h.dong_no
                             WHERE h.naver_danji_code = @code
                               AND btrim(COALESCE(h.ho_name, '')) <> ''   -- 빈 호 제외
                               AND COALESCE(h.store_yn, B'0') <> B'1'     -- 상가 제외
                               AND COALESCE(h.piloti_yn, B'0') <> B'1'    -- 필로티 제외
                               AND COALESCE(NULLIF(h.ho_gubun, ''), '일반') NOT IN ('상가', '필로티', '기타')  -- 기타(입력) 제외
                             ORDER BY h.dong_no, h.ho_number";
                        var hoRows = await _dataService.QueryAsyncPg<DanjiHoUnit>("DEV", hoSql,
                            new List<NpgsqlParameter> { P("@code", NpgsqlDbType.Integer, danjiCodeInt) });

                        var regKeys = new HashSet<string>(allReg.Select(r => $"{(r.Dong ?? "").Trim()}|{(r.Ho ?? "").Trim()}"));
                        var ghosts = new List<PtSale>();
                        foreach (var h in hoRows ?? new List<DanjiHoUnit>())
                        {
                            string dong = (h.DongName ?? (h.DongNo?.ToString()) ?? "").Trim();
                            string ho = (h.HoName ?? (h.HoNumber?.ToString()) ?? "").Trim();
                            if (dong == "" && ho == "") continue;
                            if (regKeys.Contains($"{dong}|{ho}")) continue; // 이미 등록된 호 제외
                            ghosts.Add(new PtSale
                            {
                                PtNo = 0,
                                IsGhost = true,
                                PtName = rep.Addr4 ?? rep.PtName ?? "",
                                PtType = rep.PtType,
                                DanjiCode = DanjiCode,
                                Addr1 = rep.Addr1, Addr2 = rep.Addr2, Addr3 = rep.Addr3, Addr4 = rep.Addr4,
                                Jibun = rep.Jibun, BjdCode = rep.BjdCode,
                                Dong = dong, Ho = ho, Floor = h.Floor,
                                AptTyp = h.PtpName, SupArea = h.SplySpc, ExcArea = h.ExclsSpc,
                                PtSts = "",
                            });
                        }

                        int Num(string? s) { var d = new string((s ?? "").Where(char.IsDigit).ToArray()); return int.TryParse(d, out var n) ? n : 0; }
                        var combined = allReg.Concat(ghosts)
                            .OrderBy(r => Num(r.Dong)).ThenBy(r => Num(r.Ho)).ToList();
                        totalCount = combined.Count;
                        int psz = PageSize <= 0 ? 100 : PageSize;
                        int pg = Page <= 0 ? 1 : Page;
                        ptSaleList = combined.Skip((pg - 1) * psz).Take(psz).ToList();
                    }
                }
                catch (Exception ex) { Console.WriteLine("단지 호 UNION 스킵: " + ex.Message); }
            }

            // 물건 요약 정보 조회 (OffNo는 필수)
            List<PropertySummary>? summaries = null;
            List<PropertyTypeCount>? typeCounts = null;
            int progressCount = 0;

            if (OffNo.HasValue)
            {
                // 물건 요약 정보 조회
                const string summarySql = @"
                    WITH danji_summary AS (
                        SELECT
                            ps.danji_code AS ""DanjiCode"",
                            COALESCE(d.building_name, ps.danji_code) AS ""DisplayName"",
                            ps.danji_code AS ""GroupKey"",
                            NULL AS ""Addr3"",
                            MAX(ps.pt_type) AS ""PtType"",
                            NULL AS ""SaleDiv"",
                            COUNT(ps.pt_no) AS ""PropertyCount"",
                            MAX(d.family_cnt) AS ""FamilyCnt""
                        FROM pt_sale ps
                        LEFT JOIN danji d ON ps.danji_code = d.naver_danji_code
                        WHERE ps.danji_code IS NOT NULL
                          AND ps.danji_code != ''
                          AND ps.off_no = @pr_off_no
                          AND (@pr_rt_no IS NULL OR ps.rt_no = @pr_rt_no)
                        GROUP BY ps.danji_code, d.building_name
                    ),
                    non_danji_summary AS (
                        SELECT
                            NULL AS ""DanjiCode"",
                            COALESCE(NULLIF(ps.pt_name, ''), ps.addr3 || ' ' ||
                            CASE ps.pt_type
                                WHEN 'SYCA101' THEN '아파트'
                                WHEN 'SYCA102' THEN '오피스텔'
                                WHEN 'SYCA103' THEN '주상복합'
                                WHEN 'SYCA104' THEN '재건축'
                                WHEN 'SYCA105' THEN '아파트 분양권'
                                WHEN 'SYCA106' THEN '오피스텔 분양권'
                                WHEN 'SYCA107' THEN '주상복합 분양권'
                                WHEN 'SYCA108' THEN '빌딩/건물'
                                WHEN 'SYCA109' THEN '상가건물'
                                WHEN 'SYCA110' THEN '숙박/콘도'
                                WHEN 'SYCA111' THEN '공장/창고'
                                WHEN 'SYCA112' THEN '기타'
                                WHEN 'SYCA113' THEN '사무실'
                                WHEN 'SYCA114' THEN '상가점포'
                                WHEN 'SYCA115' THEN '토지'
                                WHEN 'SYCA116' THEN '지식산업센터'
                                WHEN 'SYCA117' THEN '원룸'
                                WHEN 'SYCA118' THEN '빌라/연립'
                                WHEN 'SYCA119' THEN '주택'
                                WHEN 'SYCA120' THEN '재개발'
                                ELSE '기타'
                            END) AS ""DisplayName"",
                            'PT_' || ps.pt_no AS ""GroupKey"",
                            ps.addr3 AS ""Addr3"",
                            ps.pt_type AS ""PtType"",
                            NULL AS ""SaleDiv"",
                            1 AS ""PropertyCount"",
                            NULL::integer AS ""FamilyCnt""
                        FROM pt_sale ps
                        WHERE (ps.danji_code IS NULL OR ps.danji_code = '')
                          AND ps.off_no = @pr_off_no
                          AND (@pr_rt_no IS NULL OR ps.rt_no = @pr_rt_no)
                          AND ps.addr3 IS NOT NULL
                    )
                    SELECT * FROM danji_summary
                    UNION ALL
                    SELECT * FROM non_danji_summary
                    ORDER BY ""PropertyCount"" DESC, ""DisplayName"";";

                var summaryParams = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@pr_off_no", NpgsqlDbType.Bigint) { Value = (object?)OffNo ?? DBNull.Value },
                    new NpgsqlParameter("@pr_rt_no", NpgsqlDbType.Varchar) { Value = (object?)RtNo ?? DBNull.Value }
                };

                summaries = await _dataService.QueryAsyncPg<PropertySummary>("DEV", summarySql, summaryParams);

                // 물건유형별 건수 (좌측 패널 '모든유형' 표기용) — 사무소/중개인 범위, 페이징 무관
                const string typeCountSql = @"
                    SELECT ps.pt_type AS ""PtType"", COUNT(ps.pt_no)::integer AS ""Cnt""
                    FROM pt_sale ps
                    WHERE ps.off_no = @pr_off_no
                      AND (@pr_rt_no IS NULL OR ps.rt_no = @pr_rt_no)
                      AND ps.pt_type IS NOT NULL AND ps.pt_type != ''
                    GROUP BY ps.pt_type;";
                var typeCountParams = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@pr_off_no", NpgsqlDbType.Bigint) { Value = (object?)OffNo ?? DBNull.Value },
                    new NpgsqlParameter("@pr_rt_no", NpgsqlDbType.Varchar) { Value = (object?)RtNo ?? DBNull.Value }
                };
                typeCounts = await _dataService.QueryAsyncPg<PropertyTypeCount>("DEV", typeCountSql, typeCountParams);

                // 진행물건 수 조회 (물건상태가 '진행중'인 것)
                const string progressSql = @"
                    SELECT COUNT(*)::integer as cnt
                    FROM pt_sale
                    WHERE off_no = @pr_off_no
                      AND (@pr_rt_no IS NULL OR rt_no = @pr_rt_no)
                      AND pt_sts LIKE '%PTSTS01%';";

                var progressParams = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@pr_off_no", (object?)OffNo ?? DBNull.Value),
                    new NpgsqlParameter("@pr_rt_no", (object?)RtNo ?? DBNull.Value)
                };

                try
                {
                    using (var connection = new Npgsql.NpgsqlConnection(_configuration.GetConnectionString("DEV")))
                    {
                        await connection.OpenAsync();
                        using (var command = new Npgsql.NpgsqlCommand(progressSql, connection))
                        {
                            command.Parameters.AddRange(progressParams.ToArray());
                            var result = await command.ExecuteScalarAsync();
                            if (result != null && result != DBNull.Value)
                            {
                                progressCount = Convert.ToInt32(result);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error getting progress count: {ex.Message}");
                    progressCount = 0;
                }
            }

            return new PtSaleList
            {
                PtSales = ptSaleList,
                Summaries = summaries ?? new List<PropertySummary>(),
                TypeCounts = typeCounts ?? new List<PropertyTypeCount>(),
                ProgressCount = progressCount,
                TotalCount = totalCount
            };
        }

        public async Task<PtSale?> GetPropertyDetail(long PtNo)
        {
            // 상세 (fn_pt_sale 미사용, 직접 쿼리)
            string sql = $@"SELECT {PT_COLS} FROM pt_sale a WHERE a.pt_no = @pt_no";
            var parameters = new List<NpgsqlParameter> { P("@pt_no", NpgsqlDbType.Bigint, PtNo) };

            var ptSaleList = await _dataService.QueryAsyncPg<PtSale>("DEV", sql, parameters);
            var property = ptSaleList.FirstOrDefault();

            if (property != null)
            {
                // Holder 정보 조회
                const string holderSql = @"
                    select *
                    from public.fn_pt_sale_holder(
                        pr_proc   => @pr_proc,
                        pr_pt_no  => @pr_pt_no,
                        pr_holder_idx => @pr_holder_idx,
                        pr_holder_type => @pr_holder_type,
                        pr_holder_reg_date => @pr_holder_reg_date,
                        pr_holder_name => @pr_holder_name,
                        pr_holder_phone => @pr_holder_phone,
                        pr_cust_no => @pr_cust_no,
                        pr_holder_relation => @pr_holder_relation,
                        pr_holder_memo => @pr_holder_memo,
                        pr_user_id => @pr_user_id
                );";

                var holderParameters = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@pr_proc", "SEL"),
                    new NpgsqlParameter("@pr_pt_no", PtNo),
                    new NpgsqlParameter("@pr_holder_idx", DBNull.Value),
                    new NpgsqlParameter("@pr_holder_type", DBNull.Value),
                    new NpgsqlParameter("@pr_holder_reg_date", DBNull.Value),
                    new NpgsqlParameter("@pr_holder_name", DBNull.Value),
                    new NpgsqlParameter("@pr_holder_phone", DBNull.Value),
                    new NpgsqlParameter("@pr_cust_no", DBNull.Value),
                    new NpgsqlParameter("@pr_holder_relation", DBNull.Value),
                    new NpgsqlParameter("@pr_holder_memo", DBNull.Value),
                    new NpgsqlParameter("@pr_user_id", DBNull.Value)
                };

                property.Holders = await _dataService.QueryAsyncPg<PtHolder>("DEV", holderSql, holderParameters);

                // 부동산공유(공인중개사) 이력 조회 (직접 쿼리)
                const string shareSql = @"
                    SELECT pt_no       AS ""PtNo"",
                           share_idx   AS ""ShareIdx"",
                           office_name AS ""OfficeName"",
                           region_name AS ""RegionName"",
                           office_phone AS ""OfficePhone"",
                           memo        AS ""Memo"",
                           share_date  AS ""Date""
                      FROM pt_share
                     WHERE pt_no = @pt_no
                     ORDER BY share_idx";
                var shareParameters = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@pt_no", PtNo)
                };
                property.Shares = await _dataService.QueryAsyncPg<PtShare>("DEV", shareSql, shareParameters);

                // 과거내역(pt_sale_old) 건수
                property.HistoryCount = await GetPropertyHistoryCount(PtNo);

                // 임대차현황서(pt_lease_status) 조회 - DDL 미적용 시에도 500 방지
                try
                {
                    const string leaseSql = @"
                        SELECT lease_id AS ""LeaseId"", pt_no AS ""PtNo"", seq AS ""Seq"", room_no AS ""RoomNo"", area AS ""Area"", cur_status AS ""CurStatus"", deposit AS ""Deposit"", monthly_rent AS ""MonthlyRent"", maint_cost AS ""MaintCost"", contract_start AS ""ContractStart"", contract_end AS ""ContractEnd"", business_type AS ""BusinessType"", business_name AS ""BusinessName"" FROM pt_lease_status WHERE pt_no=@pt_no ORDER BY seq, lease_id";
                    var leaseParameters = new List<NpgsqlParameter> { new NpgsqlParameter("@pt_no", PtNo) };
                    property.LeaseRows = await _dataService.QueryAsyncPg<PtLeaseStatus>("DEV", leaseSql, leaseParameters);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error getting lease rows: {ex.Message}");
                }

                // 토지 필지목록(pt_land_additional) 조회 - DDL 미적용 시에도 500 방지
                try
                {
                    const string landSql = @"
                        SELECT land_id AS ""LandId"", pt_no AS ""PtNo"", seq AS ""Seq"", dong AS ""Dong"", soji AS ""Soji"", bjd_code AS ""BjdCode"", jibun AS ""Jibun"", land_area AS ""LandArea"", land_category AS ""LandCategory"", land_use AS ""LandUse"", other_restrictions AS ""OtherRestrictions"" FROM pt_land_additional WHERE pt_no=@pt_no ORDER BY seq, land_id";
                    var landParameters = new List<NpgsqlParameter> { new NpgsqlParameter("@pt_no", PtNo) };
                    property.Parcels = await _dataService.QueryAsyncPg<PtLandAdditional>("DEV", landSql, landParameters);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error getting land parcels: {ex.Message}");
                }
            }

            return property;
        }

        // 과거내역 보관: 현재 pt_sale 행을 pt_sale_old로 복사 (함수 없이 직접 쿼리)
        // 물건상태(pt_sts) 직접 변경 — null이면 컬럼을 NULL로(진행중 해제). COALESCE 미사용(명시적 세팅)
        public async Task<bool> UpdatePropertyStatus(long PtNo, string? PtSts, string? UserId)
        {
            using (var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV")))
            {
                await connection.OpenAsync();
                const string sql = @"
                    UPDATE pt_sale
                       SET pt_sts = @pt_sts, upd_dt = now(), upd_id = @upd_id
                     WHERE pt_no = @pt_no";
                using (var cmd = new NpgsqlCommand(sql, connection))
                {
                    cmd.Parameters.Add(P("@pt_sts", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(PtSts) ? null : PtSts));
                    cmd.Parameters.Add(P("@upd_id", NpgsqlDbType.Varchar, UserId));
                    cmd.Parameters.AddWithValue("@pt_no", PtNo);
                    var rows = await cmd.ExecuteNonQueryAsync();
                    return rows > 0;
                }
            }
        }

        public async Task<bool> ArchivePropertyHistory(long PtNo, string? UserId)
        {
            using (var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV")))
            {
                await connection.OpenAsync();
                // pt_sale의 모든 컬럼 + org_pt_no + archived_dt
                // pt_sale_old = (org_pt_no, archived_dt, pt_sale 전체컬럼) 순서.
                // extras를 앞에 두어, 이후 pt_sale에 컬럼이 추가돼도 정렬이 유지되게 함(DDL로 pt_sale_old 재생성 필요).
                const string sql = @"
                    INSERT INTO pt_sale_old
                    SELECT @org_pt_no, now(), t.*
                      FROM pt_sale t
                     WHERE t.pt_no = @pt_no";
                using (var cmd = new NpgsqlCommand(sql, connection))
                {
                    cmd.Parameters.AddWithValue("@org_pt_no", PtNo);
                    cmd.Parameters.AddWithValue("@pt_no", PtNo);
                    var rows = await cmd.ExecuteNonQueryAsync();
                    return rows > 0;
                }
            }
        }

        // 과거내역 건수
        public async Task<int> GetPropertyHistoryCount(long PtNo)
        {
            using (var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV")))
            {
                await connection.OpenAsync();
                using (var cmd = new NpgsqlCommand("SELECT count(*)::int FROM pt_sale_old WHERE org_pt_no = @pt_no", connection))
                {
                    cmd.Parameters.AddWithValue("@pt_no", PtNo);
                    var result = await cmd.ExecuteScalarAsync();
                    return (result != null && result != DBNull.Value) ? Convert.ToInt32(result) : 0;
                }
            }
        }

        // 과거내역 목록 (모달)
        public async Task<List<PtSaleHistory>> GetPropertyHistoryList(long PtNo)
        {
            const string sql = @"
                SELECT org_pt_no      AS ""OrgPtNo"",
                       archived_dt    AS ""ArchivedDt"",
                       pt_no          AS ""PtNo"",
                       pt_name        AS ""PtName"",
                       pt_type        AS ""PtType"",
                       sale_div       AS ""SaleDiv"",
                       addr1          AS ""Addr1"",
                       addr2          AS ""Addr2"",
                       addr3          AS ""Addr3"",
                       dong           AS ""Dong"",
                       ho             AS ""Ho"",
                       sale_amt       AS ""SaleAmt"",
                       les_amt        AS ""LesAmt"",
                       prot_amt       AS ""ProtAmt"",
                       mon_amt        AS ""MonAmt"",
                       current_status AS ""CurrentStatus""
                  FROM pt_sale_old
                 WHERE org_pt_no = @pt_no
                 ORDER BY archived_dt DESC";
            var parameters = new List<NpgsqlParameter> { new NpgsqlParameter("@pt_no", PtNo) };
            return await _dataService.QueryAsyncPg<PtSaleHistory>("DEV", sql, parameters);
        }

        // 부동산공유(공인중개사) 이력 저장 - 함수 없이 직접 쿼리 (전체 삭제 후 재삽입)
        // 물건메모 일괄 동기화 (신규 INSERT / 변경분만 UPDATE / 없어진 것 DELETE)
        // 변경되지 않은 메모는 건드리지 않아 upd_dt가 유지됨
        private async Task SyncPropertyMemos(NpgsqlConnection connection, NpgsqlTransaction tx, long ptNo, List<PropertyMemoSyncDto>? memos, string? userId)
        {
            if (memos == null) return; // null이면 동기화 대상 아님(전달 안 함)

            // 기존 memo_no 목록
            var existingIds = new List<long>();
            using (var sel = new NpgsqlCommand("SELECT memo_no FROM pt_memo WHERE pt_no = @pt_no", connection, tx))
            {
                sel.Parameters.AddWithValue("@pt_no", ptNo);
                using var r = await sel.ExecuteReaderAsync();
                while (await r.ReadAsync()) existingIds.Add(r.GetInt64(0));
            }

            var keepIds = memos.Where(m => m.MemoNo.HasValue && m.MemoNo.Value > 0)
                               .Select(m => m.MemoNo!.Value).ToHashSet();

            // 삭제: 기존에는 있으나 들어온 목록에 없는 것
            foreach (var id in existingIds.Where(id => !keepIds.Contains(id)))
            {
                using var del = new NpgsqlCommand("DELETE FROM pt_memo WHERE memo_no = @memo_no AND pt_no = @pt_no", connection, tx);
                del.Parameters.AddWithValue("@memo_no", id);
                del.Parameters.AddWithValue("@pt_no", ptNo);
                await del.ExecuteNonQueryAsync();
            }

            foreach (var m in memos)
            {
                bool isNew = !(m.MemoNo.HasValue && m.MemoNo.Value > 0);
                if (isNew)
                {
                    if (string.IsNullOrWhiteSpace(m.MemoContent)) continue;
                    using var ins = new NpgsqlCommand(@"
                        INSERT INTO pt_memo (pt_no, memo_date, memo_content, contact_name, contact_phone, user_id, reg_id, reg_dt)
                        VALUES (@pt_no, CAST(@memo_date AS timestamp), @memo_content, @contact_name, @contact_phone, @user_id, @reg_id, CURRENT_TIMESTAMP)", connection, tx);
                    ins.Parameters.AddWithValue("@pt_no", ptNo);
                    ins.Parameters.AddWithValue("@memo_date", (object?)m.MemoDate ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@memo_content", (object?)m.MemoContent ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@contact_name", (object?)m.ContactName ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@contact_phone", (object?)m.ContactPhone ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@user_id", (object?)(m.UserId ?? userId) ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@reg_id", (object?)(m.UserId ?? userId) ?? DBNull.Value);
                    await ins.ExecuteNonQueryAsync();
                }
                else
                {
                    // 내용/연락처가 실제로 다를 때만 갱신 → 변경 없으면 upd_dt 유지
                    using var upd = new NpgsqlCommand(@"
                        UPDATE pt_memo
                           SET memo_date = CAST(@memo_date AS timestamp), memo_content = @memo_content,
                               contact_name = @contact_name, contact_phone = @contact_phone,
                               upd_dt = CURRENT_TIMESTAMP, upd_id = @upd_id
                         WHERE memo_no = @memo_no AND pt_no = @pt_no
                           AND (memo_content IS DISTINCT FROM @memo_content
                                OR contact_name IS DISTINCT FROM @contact_name
                                OR contact_phone IS DISTINCT FROM @contact_phone)", connection, tx);
                    upd.Parameters.AddWithValue("@memo_no", m.MemoNo!.Value);
                    upd.Parameters.AddWithValue("@pt_no", ptNo);
                    upd.Parameters.AddWithValue("@memo_date", (object?)m.MemoDate ?? DBNull.Value);
                    upd.Parameters.AddWithValue("@memo_content", (object?)m.MemoContent ?? DBNull.Value);
                    upd.Parameters.AddWithValue("@contact_name", (object?)m.ContactName ?? DBNull.Value);
                    upd.Parameters.AddWithValue("@contact_phone", (object?)m.ContactPhone ?? DBNull.Value);
                    upd.Parameters.AddWithValue("@upd_id", (object?)(m.UserId ?? userId) ?? DBNull.Value);
                    await upd.ExecuteNonQueryAsync();
                }
            }
        }

        // 상담이력(ct_interview) 일괄 동기화 (신규 INSERT / 변경분만 UPDATE / 없어진 것 DELETE)
        private async Task SyncPropertyConsults(NpgsqlConnection connection, NpgsqlTransaction tx, long ptNo, List<PropertyConsultSyncDto>? consults, string? userId, string? custName, long? offNo, string? rtNo)
        {
            if (consults == null) return;

            // rt_no(담당자) — ct_interview.rt_no는 bigint. 물건 Dto.RtNo는 문자열이라 숫자로 변환(실패 시 NULL)
            object rtNoParam = (long.TryParse(rtNo, out var rtNoVal) ? rtNoVal : (object?)null) ?? DBNull.Value;

            var existingIds = new List<long>();
            using (var sel = new NpgsqlCommand("SELECT itv_no FROM ct_interview WHERE pt_no = @pt_no", connection, tx))
            {
                sel.Parameters.AddWithValue("@pt_no", ptNo);
                using var r = await sel.ExecuteReaderAsync();
                while (await r.ReadAsync()) existingIds.Add(r.GetInt64(0));
            }

            var keepIds = consults.Where(c => c.ItvNo.HasValue && c.ItvNo.Value > 0)
                                  .Select(c => c.ItvNo!.Value).ToHashSet();

            foreach (var id in existingIds.Where(id => !keepIds.Contains(id)))
            {
                using var del = new NpgsqlCommand("DELETE FROM ct_interview WHERE itv_no = @itv_no", connection, tx);
                del.Parameters.AddWithValue("@itv_no", id);
                await del.ExecuteNonQueryAsync();
            }

            var itvDateDefault = DateTime.UtcNow.AddHours(9).ToString("yyyy-MM-dd"); // KST

            foreach (var c in consults)
            {
                bool isNew = !(c.ItvNo.HasValue && c.ItvNo.Value > 0);
                if (isNew)
                {
                    if (string.IsNullOrWhiteSpace(c.ItvContent)) continue;
                    using var ins = new NpgsqlCommand(@"
                        INSERT INTO ct_interview (itv_type, itv_date, cust_name, pt_no, itv_content, contact_name, contact_phone, off_no, rt_no, reg_dt, reg_id)
                        VALUES ('ITVTYP01', @itv_date, @cust_name, @pt_no, @itv_content, @contact_name, @contact_phone, @off_no, @rt_no, NOW(), @reg_id)", connection, tx);
                    ins.Parameters.AddWithValue("@itv_date", (object?)(c.ItvDate ?? itvDateDefault) ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@cust_name", (object?)custName ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@pt_no", ptNo);
                    ins.Parameters.AddWithValue("@itv_content", (object?)c.ItvContent ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@contact_name", (object?)c.ContactName ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@contact_phone", (object?)c.ContactPhone ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@off_no", (object?)offNo ?? DBNull.Value);
                    ins.Parameters.AddWithValue("@rt_no", rtNoParam);
                    ins.Parameters.AddWithValue("@reg_id", (object?)userId ?? DBNull.Value);
                    await ins.ExecuteNonQueryAsync();

                    // 입력 연락처가 고객 구입자(ct_cust_buyer.tel)와 일치하면 해당 고객 상담이력에도 동시 저장(cust_no로 연결, pt_no 없음)
                    if (!string.IsNullOrWhiteSpace(c.ContactPhone))
                    {
                        // 매칭 고객의 사무소(off_no)/담당자(rt_no)를 그대로 부여 → 그 고객 담당자가 네오봇에서 조회 가능
                        using var xins = new NpgsqlCommand(@"
                            INSERT INTO ct_interview (itv_type, itv_date, cust_no, cust_name, itv_content, contact_name, contact_phone, off_no, rt_no, reg_dt, reg_id)
                            SELECT 'ITVTYP01', @itv_date, c.cust_no, @cust_name, @itv_content, @contact_name, @contact_phone, c.off_no, c.rt_no, NOW(), @reg_id
                              FROM (SELECT DISTINCT cc.cust_no, cc.off_no, cc.rt_no
                                      FROM ct_cust_buyer b JOIN ct_cust cc ON cc.cust_no = b.cust_no
                                     WHERE COALESCE(b.tel,'') <> ''
                                       AND regexp_replace(b.tel,'[^0-9]','','g') = regexp_replace(COALESCE(@contact_phone,''),'[^0-9]','','g')) c
                             WHERE length(regexp_replace(COALESCE(@contact_phone,''),'[^0-9]','','g')) >= 9", connection, tx);
                        xins.Parameters.AddWithValue("@itv_date", (object?)(c.ItvDate ?? itvDateDefault) ?? DBNull.Value);
                        xins.Parameters.AddWithValue("@cust_name", (object?)custName ?? DBNull.Value);
                        xins.Parameters.AddWithValue("@itv_content", (object?)c.ItvContent ?? DBNull.Value);
                        xins.Parameters.AddWithValue("@contact_name", (object?)c.ContactName ?? DBNull.Value);
                        xins.Parameters.AddWithValue("@contact_phone", (object?)c.ContactPhone ?? DBNull.Value);
                        xins.Parameters.AddWithValue("@reg_id", (object?)userId ?? DBNull.Value);
                        await xins.ExecuteNonQueryAsync();
                    }
                }
                else
                {
                    using var upd = new NpgsqlCommand(@"
                        UPDATE ct_interview
                           SET itv_content = @itv_content, contact_name = @contact_name, contact_phone = @contact_phone,
                               upd_dt = NOW(), upd_id = @upd_id
                         WHERE itv_no = @itv_no AND pt_no = @pt_no
                           AND (itv_content IS DISTINCT FROM @itv_content
                                OR contact_name IS DISTINCT FROM @contact_name
                                OR contact_phone IS DISTINCT FROM @contact_phone)", connection, tx);
                    upd.Parameters.AddWithValue("@itv_no", c.ItvNo!.Value);
                    upd.Parameters.AddWithValue("@pt_no", ptNo);
                    upd.Parameters.AddWithValue("@itv_content", (object?)c.ItvContent ?? DBNull.Value);
                    upd.Parameters.AddWithValue("@contact_name", (object?)c.ContactName ?? DBNull.Value);
                    upd.Parameters.AddWithValue("@contact_phone", (object?)c.ContactPhone ?? DBNull.Value);
                    upd.Parameters.AddWithValue("@upd_id", (object?)userId ?? DBNull.Value);
                    await upd.ExecuteNonQueryAsync();
                }
            }
        }

        private async Task SyncPropertyShares(NpgsqlConnection connection, NpgsqlTransaction tx, long ptNo, List<PropertyShareDto>? shares, string? userId)
        {
            // 기존 데이터 전체 삭제
            using (var delCmd = new NpgsqlCommand("DELETE FROM pt_share WHERE pt_no = @pt_no", connection, tx))
            {
                delCmd.Parameters.AddWithValue("@pt_no", ptNo);
                await delCmd.ExecuteNonQueryAsync();
            }

            if (shares == null || shares.Count == 0) return;

            int idx = 1;
            foreach (var s in shares)
            {
                // 상호/전화번호/지역명/내용 모두 비어있으면 스킵
                if (string.IsNullOrWhiteSpace(s.OfficeName)
                    && string.IsNullOrWhiteSpace(s.OfficePhone)
                    && string.IsNullOrWhiteSpace(s.RegionName)
                    && string.IsNullOrWhiteSpace(s.Memo))
                {
                    continue;
                }

                const string insSql = @"
                    INSERT INTO pt_share(pt_no, share_idx, office_name, region_name, office_phone, memo, share_date, reg_dt, reg_id)
                    VALUES(@pt_no, @share_idx, @office_name, @region_name, @office_phone, @memo, @share_date, now(), @reg_id)";

                using (var insCmd = new NpgsqlCommand(insSql, connection, tx))
                {
                    insCmd.Parameters.AddWithValue("@pt_no", ptNo);
                    insCmd.Parameters.AddWithValue("@share_idx", idx++);
                    insCmd.Parameters.AddWithValue("@office_name", (object?)s.OfficeName ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@region_name", (object?)s.RegionName ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@office_phone", (object?)s.OfficePhone ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@memo", (object?)s.Memo ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@share_date", (object?)s.Date ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@reg_id", (object?)userId ?? DBNull.Value);
                    await insCmd.ExecuteNonQueryAsync();
                }
            }
        }

        // 임대차현황서(pt_lease_status) 동기화 - 전체 삭제 후 재삽입
        private async Task SyncPropertyLeaseRows(NpgsqlConnection connection, NpgsqlTransaction tx, long ptNo, List<PropertyLeaseRowDto>? rows, string? userId)
        {
            if (rows == null) return; // null이면 동기화 대상 아님(전달 안 함)

            // 기존 데이터 전체 삭제
            using (var delCmd = new NpgsqlCommand("DELETE FROM pt_lease_status WHERE pt_no = @pt_no", connection, tx))
            {
                delCmd.Parameters.AddWithValue("@pt_no", ptNo);
                await delCmd.ExecuteNonQueryAsync();
            }

            int seq = 1;
            foreach (var r in rows)
            {
                // 모든 값이 비어있으면 스킵
                if (string.IsNullOrWhiteSpace(r.RoomNo)
                    && r.Area == null
                    && string.IsNullOrWhiteSpace(r.CurStatus)
                    && r.Deposit == null
                    && r.MonthlyRent == null
                    && r.MaintCost == null
                    && string.IsNullOrWhiteSpace(r.ContractStart)
                    && string.IsNullOrWhiteSpace(r.ContractEnd)
                    && string.IsNullOrWhiteSpace(r.BusinessType)
                    && string.IsNullOrWhiteSpace(r.BusinessName))
                {
                    continue;
                }

                const string insSql = @"
                    INSERT INTO pt_lease_status(pt_no, seq, room_no, area, cur_status, deposit, monthly_rent, maint_cost, contract_start, contract_end, business_type, business_name, reg_dt, reg_id)
                    VALUES(@pt_no, @seq, @room_no, @area, @cur_status, @deposit, @monthly_rent, @maint_cost, @contract_start, @contract_end, @business_type, @business_name, now(), @reg_id)";

                using (var insCmd = new NpgsqlCommand(insSql, connection, tx))
                {
                    insCmd.Parameters.AddWithValue("@pt_no", ptNo);
                    insCmd.Parameters.AddWithValue("@seq", seq++);
                    insCmd.Parameters.AddWithValue("@room_no", (object?)r.RoomNo ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@area", (object?)r.Area ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@cur_status", (object?)r.CurStatus ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@deposit", (object?)r.Deposit ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@monthly_rent", (object?)r.MonthlyRent ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@maint_cost", (object?)r.MaintCost ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@contract_start", (object?)r.ContractStart ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@contract_end", (object?)r.ContractEnd ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@business_type", (object?)r.BusinessType ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@business_name", (object?)r.BusinessName ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@reg_id", (object?)userId ?? DBNull.Value);
                    await insCmd.ExecuteNonQueryAsync();
                }
            }
        }

        // 토지 필지목록(pt_land_additional) 동기화 - 전체 삭제 후 재삽입
        private async Task SyncPropertyLandParcels(NpgsqlConnection connection, NpgsqlTransaction tx, long ptNo, List<PropertyLandParcelDto>? rows, string? userId)
        {
            if (rows == null) return; // null이면 동기화 대상 아님(전달 안 함)

            // 기존 데이터 전체 삭제
            using (var delCmd = new NpgsqlCommand("DELETE FROM pt_land_additional WHERE pt_no = @pt_no", connection, tx))
            {
                delCmd.Parameters.AddWithValue("@pt_no", ptNo);
                await delCmd.ExecuteNonQueryAsync();
            }

            int seq = 1;
            foreach (var r in rows)
            {
                // 모든 값이 비어있으면 스킵
                if (string.IsNullOrWhiteSpace(r.Jibun)
                    && r.LandArea == null
                    && string.IsNullOrWhiteSpace(r.LandCategory)
                    && string.IsNullOrWhiteSpace(r.LandUse)
                    && string.IsNullOrWhiteSpace(r.OtherRestrictions))
                {
                    continue;
                }

                const string insSql = @"
                    INSERT INTO pt_land_additional(pt_no, seq, dong, soji, bjd_code, jibun, land_area, land_category, land_use, other_restrictions, reg_dt, reg_id)
                    VALUES(@pt_no, @seq, @dong, @soji, @bjd_code, @jibun, @land_area, @land_category, @land_use, @other_restrictions, now(), @reg_id)";

                using (var insCmd = new NpgsqlCommand(insSql, connection, tx))
                {
                    insCmd.Parameters.AddWithValue("@pt_no", ptNo);
                    insCmd.Parameters.AddWithValue("@seq", seq++);
                    insCmd.Parameters.AddWithValue("@dong", (object?)r.Dong ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@soji", (object?)r.Soji ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@bjd_code", (object?)r.BjdCode ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@jibun", (object?)r.Jibun ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@land_area", (object?)r.LandArea ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@land_category", (object?)r.LandCategory ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@land_use", (object?)r.LandUse ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@other_restrictions", (object?)r.OtherRestrictions ?? DBNull.Value);
                    insCmd.Parameters.AddWithValue("@reg_id", (object?)userId ?? DBNull.Value);
                    await insCmd.ExecuteNonQueryAsync();
                }
            }
        }

        public async Task<long> InsertProperty(PropertyCreateDto Dto)
        {
            long rtnVal = 0;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "INS"),
                //new NpgsqlParameter("@pr_pt_no", (object?)Dto.PtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_name", (object?)Dto.PtName ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_sts", (object?)Dto.PtSts ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_type", (object?)Dto.PtType ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_expl", (object?)Dto.PtExpl ?? DBNull.Value),
                new NpgsqlParameter("@pr_sale_div", (object?)Dto.SaleDiv ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr1", (object?)Dto.Addr1 ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr2", (object?)Dto.Addr2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr3", (object?)Dto.Addr3 ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr4", (object?)Dto.Addr4 ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr5", (object?)Dto.Addr5 ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr_post", (object?)Dto.AddrPost ?? DBNull.Value),
                new NpgsqlParameter("@pr_bjd_code", (object?)Dto.BjdCode ?? DBNull.Value),
                new NpgsqlParameter("@pr_danji_code", (object?)Dto.DanjiCode ?? DBNull.Value),
                new NpgsqlParameter("@pr_dong", (object?)Dto.Dong ?? DBNull.Value),
                new NpgsqlParameter("@pr_ho", (object?)Dto.Ho ?? DBNull.Value),
                new NpgsqlParameter("@pr_floor", (object?)Dto.Floor ?? DBNull.Value),
                new NpgsqlParameter("@pr_opt", (object?)Dto.Opt ?? DBNull.Value),
                new NpgsqlParameter("@pr_house_cnt", (object?)Dto.HouseCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_apt_typ", (object?)Dto.AptTyp ?? DBNull.Value),
                new NpgsqlParameter("@pr_sup_area", (object?)Dto.SupArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_exc_area", (object?)Dto.ExcArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_share", (object?)Dto.LandShare ?? DBNull.Value),
                new NpgsqlParameter("@pr_room_cnt", (object?)Dto.RoomCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_bath_cnt", (object?)Dto.BathCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_ev_charger_cnt", (object?)Dto.EvChargerCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_dir_std", (object?)Dto.DirStd ?? DBNull.Value),
                new NpgsqlParameter("@pr_heat_method", (object?)Dto.HeatMethod ?? DBNull.Value),
                new NpgsqlParameter("@pr_heat_fuel", (object?)Dto.HeatFuel ?? DBNull.Value),
                new NpgsqlParameter("@pr_entr_struct", (object?)Dto.EntrStruct ?? DBNull.Value),
                new NpgsqlParameter("@pr_buid_struct", (object?)Dto.BuidStruct ?? DBNull.Value),
                new NpgsqlParameter("@pr_balc_ext", (object?)Dto.BalcExt ?? DBNull.Value),
                new NpgsqlParameter("@pr_floor1", (object?)Dto.Floor1 ?? DBNull.Value),
                new NpgsqlParameter("@pr_floor2", (object?)Dto.Floor2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_pk_cnt", (object?)Dto.PkCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_maint_cost", (object?)Dto.MaintCost ?? DBNull.Value),
                new NpgsqlParameter("@pr_maint_dtl", (object?)Dto.MaintDtl ?? DBNull.Value),
                new NpgsqlParameter("@pr_sale_amt", (object?)Dto.SaleAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_les_amt", (object?)Dto.LesAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_prot_amt", (object?)Dto.ProtAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_mon_amt", (object?)Dto.MonAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_amt", (object?)Dto.EtcAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_lay_amt", (object?)Dto.LayAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_now_dep_amt", (object?)Dto.NowDepAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_now_mon_amt", (object?)Dto.NowMonAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_loan_amt", (object?)Dto.LoanAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_loan_amt_aft", (object?)Dto.LoanAmtAft ?? DBNull.Value),
                new NpgsqlParameter("@pr_mtry_date", (object?)Dto.MtryDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_expt_mov_date", (object?)Dto.ExptMovDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_expt_date", (object?)Dto.ExptDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_expt_com_date", (object?)Dto.ExptComDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_comp_year", (object?)Dto.CompYear ?? DBNull.Value),
                new NpgsqlParameter("@pr_sha_yn", (object?)Dto.ShaYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", (object?)Dto.CustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_off_no", (object?)Dto.OffNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_rt_no", (object?)Dto.RtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cn_no", (object?)Dto.CnNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_mvn_psb_yn", (object?)Dto.MvnPsbYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_house_rental", (object?)Dto.HouseRental ?? DBNull.Value),
                new NpgsqlParameter("@pr_pet_yn", (object?)Dto.PetYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_top", (object?)Dto.Top ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_memo", (object?)Dto.PtMemo ?? DBNull.Value),
                new NpgsqlParameter("@pr_registry_owner", (object?)Dto.RegistryOwner ?? DBNull.Value),
                new NpgsqlParameter("@pr_contract_tenant", (object?)Dto.ContractTenant ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_amt2", (object?)Dto.EtcAmt2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_lease_type", (object?)Dto.EtcLeaseType ?? DBNull.Value),
                new NpgsqlParameter("@pr_jibun", (object?)Dto.Jibun ?? DBNull.Value),
                new NpgsqlParameter("@pr_maint_zone_name", (object?)Dto.MaintZoneName ?? DBNull.Value),
                new NpgsqlParameter("@pr_child_yn", (object?)Dto.ChildYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_child_cond", (object?)Dto.ChildCond ?? DBNull.Value),
                new NpgsqlParameter("@pr_pet_allow", (object?)Dto.PetAllow ?? DBNull.Value),
                new NpgsqlParameter("@pr_pet_cond", (object?)Dto.PetCond ?? DBNull.Value),
                new NpgsqlParameter("@pr_lend_amt", (object?)Dto.LendAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_lend_amt_aft", (object?)Dto.LendAmtAft ?? DBNull.Value),
                new NpgsqlParameter("@pr_dep_loan_bank", (object?)Dto.DepLoanBank ?? DBNull.Value),
                new NpgsqlParameter("@pr_dep_loan_amt", (object?)Dto.DepLoanAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_past_data_yn", (object?)Dto.PastDataYn ?? DBNull.Value),
                // 추가 스칼라 컬럼
                new NpgsqlParameter("@pr_current_status", (object?)Dto.CurrentStatus ?? DBNull.Value),
                new NpgsqlParameter("@pr_contract_renewal_right", (object?)Dto.ContractRenewalRight ?? DBNull.Value),
                new NpgsqlParameter("@pr_building_use", (object?)Dto.BuildingUse ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_use", (object?)Dto.LandUse ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_category", (object?)Dto.LandCategory ?? DBNull.Value),
                new NpgsqlParameter("@pr_other_restrictions", (object?)Dto.OtherRestrictions ?? DBNull.Value),
                new NpgsqlParameter("@pr_dir_base", (object?)Dto.DirBase ?? DBNull.Value),
                new NpgsqlParameter("@pr_recommended_business", (object?)Dto.RecommendedBusiness ?? DBNull.Value),
                new NpgsqlParameter("@pr_business_type", (object?)Dto.BusinessType ?? DBNull.Value),
                new NpgsqlParameter("@pr_business_name", (object?)Dto.BusinessName ?? DBNull.Value),
                new NpgsqlParameter("@pr_sub_type", (object?)Dto.SubType ?? DBNull.Value),
                new NpgsqlParameter("@pr_building_form", (object?)Dto.BuildingForm ?? DBNull.Value),
                new NpgsqlParameter("@pr_main_building_use", (object?)Dto.MainBuildingUse ?? DBNull.Value),
                new NpgsqlParameter("@pr_community_facility", (object?)Dto.CommunityFacility ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr_detail", (object?)Dto.AddrDetail ?? DBNull.Value),
                new NpgsqlParameter("@pr_toilet", (object?)Dto.Toilet ?? DBNull.Value),
                new NpgsqlParameter("@pr_contract_date", (object?)Dto.ContractDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_hold_date", (object?)Dto.HoldDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_permit_date", (object?)Dto.PermitDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_pt_type", (object?)Dto.FormerPtType ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_bjd_code", (object?)Dto.FormerBjdCode ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_danji_code", (object?)Dto.FormerDanjiCode ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_addr1", (object?)Dto.FormerAddr1 ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_addr2", (object?)Dto.FormerAddr2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_addr3", (object?)Dto.FormerAddr3 ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_addr4", (object?)Dto.FormerAddr4 ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_addr5", (object?)Dto.FormerAddr5 ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_jibun", (object?)Dto.FormerJibun ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_dong", (object?)Dto.FormerDong ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_ho", (object?)Dto.FormerHo ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_apt_typ", (object?)Dto.FormerAptTyp ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_sup_area", (object?)Dto.FormerSupArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_exc_area", (object?)Dto.FormerExcArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_total_floor_area", (object?)Dto.FormerTotalFloorArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_land_area", (object?)Dto.FormerLandArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_land_share_ratio", (object?)Dto.FormerLandShareRatio ?? DBNull.Value),
                new NpgsqlParameter("@pr_gross_area", (object?)Dto.GrossArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_building_area", (object?)Dto.BuildingArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_share_ratio", (object?)Dto.LandShareRatio ?? DBNull.Value),
                new NpgsqlParameter("@pr_access_road", (object?)Dto.AccessRoad ?? DBNull.Value),
                new NpgsqlParameter("@pr_office_area", (object?)Dto.OfficeArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_road_info", (object?)Dto.RoadInfo ?? DBNull.Value),
                new NpgsqlParameter("@pr_facility_cost", (object?)Dto.FacilityCost ?? DBNull.Value),
                new NpgsqlParameter("@pr_city_gas", (object?)Dto.CityGas ?? DBNull.Value),
                new NpgsqlParameter("@pr_power_receiving", (object?)Dto.PowerReceiving ?? DBNull.Value),
                new NpgsqlParameter("@pr_elec_capacity", (object?)Dto.ElecCapacity ?? DBNull.Value),
                new NpgsqlParameter("@pr_elevator_cnt", (object?)Dto.ElevatorCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_stairs_cnt", (object?)Dto.StairsCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_basement_floor", (object?)Dto.BasementFloor ?? DBNull.Value),
                new NpgsqlParameter("@pr_ground_floor", (object?)Dto.GroundFloor ?? DBNull.Value),
                new NpgsqlParameter("@pr_guest_room_cnt", (object?)Dto.GuestRoomCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_presale_amt", (object?)Dto.PresaleAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_expansion_amt", (object?)Dto.ExpansionAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_option_amt", (object?)Dto.OptionAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_premium_amt", (object?)Dto.PremiumAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_former_area", (object?)Dto.FormerArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_add_contrib_amt", (object?)Dto.AddContribAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_right_value_amt", (object?)Dto.RightValueAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_moving_cost", (object?)Dto.MovingCost ?? DBNull.Value),
                new NpgsqlParameter("@pr_deposit_total", (object?)Dto.DepositTotal ?? DBNull.Value),
                new NpgsqlParameter("@pr_loan_total", (object?)Dto.LoanTotal ?? DBNull.Value),
                new NpgsqlParameter("@pr_invest_amt", (object?)Dto.InvestAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_inc_rent_m", (object?)Dto.IncRentM ?? DBNull.Value),
                new NpgsqlParameter("@pr_inc_rent_y", (object?)Dto.IncRentY ?? DBNull.Value),
                new NpgsqlParameter("@pr_inc_mgmt_m", (object?)Dto.IncMgmtM ?? DBNull.Value),
                new NpgsqlParameter("@pr_inc_mgmt_y", (object?)Dto.IncMgmtY ?? DBNull.Value),
                new NpgsqlParameter("@pr_inc_etc_m", (object?)Dto.IncEtcM ?? DBNull.Value),
                new NpgsqlParameter("@pr_inc_etc_y", (object?)Dto.IncEtcY ?? DBNull.Value),
                new NpgsqlParameter("@pr_exp_labor_m", (object?)Dto.ExpLaborM ?? DBNull.Value),
                new NpgsqlParameter("@pr_exp_labor_y", (object?)Dto.ExpLaborY ?? DBNull.Value),
                new NpgsqlParameter("@pr_exp_util_m", (object?)Dto.ExpUtilM ?? DBNull.Value),
                new NpgsqlParameter("@pr_exp_util_y", (object?)Dto.ExpUtilY ?? DBNull.Value),
                new NpgsqlParameter("@pr_exp_loan_m", (object?)Dto.ExpLoanM ?? DBNull.Value),
                new NpgsqlParameter("@pr_exp_loan_y", (object?)Dto.ExpLoanY ?? DBNull.Value),
                new NpgsqlParameter("@pr_exp_etc_m", (object?)Dto.ExpEtcM ?? DBNull.Value),
                new NpgsqlParameter("@pr_exp_etc_y", (object?)Dto.ExpEtcY ?? DBNull.Value),
                new NpgsqlParameter("@pr_zone_adjust", (object?)Dto.ZoneAdjust ?? DBNull.Value),
                new NpgsqlParameter("@pr_zone_overheat", (object?)Dto.ZoneOverheat ?? DBNull.Value),
                new NpgsqlParameter("@pr_zone_spec", (object?)Dto.ZoneSpec ?? DBNull.Value),
                new NpgsqlParameter("@pr_zone_land_permit", (object?)Dto.ZoneLandPermit ?? DBNull.Value),
                new NpgsqlParameter("@pr_build_permit", (object?)Dto.BuildPermit ?? DBNull.Value),
                new NpgsqlParameter("@pr_zone_dev_restrict", (object?)Dto.ZoneDevRestrict ?? DBNull.Value),
                new NpgsqlParameter("@pr_right_surface", (object?)Dto.RightSurface ?? DBNull.Value),
                new NpgsqlParameter("@pr_right_grave", (object?)Dto.RightGrave ?? DBNull.Value),
                new NpgsqlParameter("@pr_right_easement", (object?)Dto.RightEasement ?? DBNull.Value),
                new NpgsqlParameter("@pr_user_id", (object?)Dto.UserId ?? DBNull.Value)
            };

            // fn_pt_sale 미사용, 직접 INSERT (RETURNING pt_no)
            const string insSql = @"
                INSERT INTO pt_sale (
                    pt_name, pt_sts, pt_type, pt_expl, sale_div, addr1, addr2, addr3, addr4, addr5, addr_post,
                    bjd_code, danji_code, dong, ho, floor, opt, house_cnt, apt_typ, sup_area, exc_area, land_share,
                    room_cnt, bath_cnt, ev_charger_cnt, dir_std, heat_method, heat_fuel, entr_struct, buid_struct, balc_ext, floor1, floor2,
                    pk_cnt, maint_cost, maint_dtl, sale_amt, les_amt, prot_amt, mon_amt, etc_amt, lay_amt, now_dep_amt,
                    now_mon_amt, loan_amt, loan_amt_aft, mtry_date, expt_mov_date, expt_date, expt_com_date, comp_year, sha_yn,
                    cust_no, off_no, rt_no, cn_no, mvn_psb_yn, house_rental, pet_yn, top, pt_memo,
                    registry_owner, contract_tenant, etc_amt2, etc_lease_type, jibun, maint_zone_name, child_yn, child_cond, pet_allow, pet_cond,
                    lend_amt, lend_amt_aft, dep_loan_bank, dep_loan_amt, past_data_yn,
                    current_status, contract_renewal_right, building_use, land_use, land_category, other_restrictions, dir_base, recommended_business,
                    business_type, business_name,
                    sub_type, building_form, main_building_use, community_facility, addr_detail, toilet, contract_date, hold_date, permit_date,
                    former_pt_type, former_bjd_code, former_danji_code, former_addr1, former_addr2, former_addr3, former_addr4, former_addr5, former_jibun, former_dong, former_ho,
                    former_apt_typ, former_sup_area, former_exc_area, former_total_floor_area, former_land_area, former_land_share_ratio,
                    gross_area, building_area, land_share_ratio, access_road, office_area, road_info,
                    facility_cost, city_gas, power_receiving, elec_capacity, elevator_cnt, stairs_cnt, basement_floor, ground_floor, guest_room_cnt,
                    presale_amt, expansion_amt, option_amt, premium_amt, former_area, add_contrib_amt, right_value_amt, moving_cost, deposit_total, loan_total, invest_amt,
                    inc_rent_m, inc_rent_y, inc_mgmt_m, inc_mgmt_y, inc_etc_m, inc_etc_y,
                    exp_labor_m, exp_labor_y, exp_util_m, exp_util_y, exp_loan_m, exp_loan_y, exp_etc_m, exp_etc_y,
                    zone_adjust, zone_overheat, zone_spec, zone_land_permit, build_permit, zone_dev_restrict, right_surface, right_grave, right_easement,
                    reg_dt, reg_id
                ) VALUES (
                    @pr_pt_name, @pr_pt_sts, @pr_pt_type, @pr_pt_expl, @pr_sale_div, @pr_addr1, @pr_addr2, @pr_addr3, @pr_addr4, @pr_addr5, @pr_addr_post,
                    @pr_bjd_code, @pr_danji_code, @pr_dong, @pr_ho, @pr_floor, @pr_opt, @pr_house_cnt, @pr_apt_typ, @pr_sup_area, @pr_exc_area, @pr_land_share,
                    @pr_room_cnt, @pr_bath_cnt, @pr_ev_charger_cnt, @pr_dir_std, @pr_heat_method, @pr_heat_fuel, @pr_entr_struct, @pr_buid_struct, @pr_balc_ext, @pr_floor1, @pr_floor2,
                    @pr_pk_cnt, @pr_maint_cost, @pr_maint_dtl, @pr_sale_amt, @pr_les_amt, @pr_prot_amt, @pr_mon_amt, @pr_etc_amt, @pr_lay_amt, @pr_now_dep_amt,
                    @pr_now_mon_amt, @pr_loan_amt, @pr_loan_amt_aft, @pr_mtry_date, @pr_expt_mov_date, @pr_expt_date, @pr_expt_com_date, @pr_comp_year, @pr_sha_yn,
                    @pr_cust_no, @pr_off_no, @pr_rt_no, @pr_cn_no, @pr_mvn_psb_yn, @pr_house_rental, @pr_pet_yn, @pr_top, @pr_pt_memo,
                    @pr_registry_owner, @pr_contract_tenant, @pr_etc_amt2, @pr_etc_lease_type, @pr_jibun, @pr_maint_zone_name, @pr_child_yn, @pr_child_cond, @pr_pet_allow, @pr_pet_cond,
                    @pr_lend_amt, @pr_lend_amt_aft, @pr_dep_loan_bank, @pr_dep_loan_amt, @pr_past_data_yn,
                    @pr_current_status, @pr_contract_renewal_right, @pr_building_use, @pr_land_use, @pr_land_category, @pr_other_restrictions, @pr_dir_base, @pr_recommended_business,
                    @pr_business_type, @pr_business_name,
                    @pr_sub_type, @pr_building_form, @pr_main_building_use, @pr_community_facility, @pr_addr_detail, @pr_toilet, @pr_contract_date, @pr_hold_date, @pr_permit_date,
                    @pr_former_pt_type, @pr_former_bjd_code, @pr_former_danji_code, @pr_former_addr1, @pr_former_addr2, @pr_former_addr3, @pr_former_addr4, @pr_former_addr5, @pr_former_jibun, @pr_former_dong, @pr_former_ho,
                    @pr_former_apt_typ, @pr_former_sup_area, @pr_former_exc_area, @pr_former_total_floor_area, @pr_former_land_area, @pr_former_land_share_ratio,
                    @pr_gross_area, @pr_building_area, @pr_land_share_ratio, @pr_access_road, @pr_office_area, @pr_road_info,
                    @pr_facility_cost, @pr_city_gas, @pr_power_receiving, @pr_elec_capacity, @pr_elevator_cnt, @pr_stairs_cnt, @pr_basement_floor, @pr_ground_floor, @pr_guest_room_cnt,
                    @pr_presale_amt, @pr_expansion_amt, @pr_option_amt, @pr_premium_amt, @pr_former_area, @pr_add_contrib_amt, @pr_right_value_amt, @pr_moving_cost, @pr_deposit_total, @pr_loan_total, @pr_invest_amt,
                    @pr_inc_rent_m, @pr_inc_rent_y, @pr_inc_mgmt_m, @pr_inc_mgmt_y, @pr_inc_etc_m, @pr_inc_etc_y,
                    @pr_exp_labor_m, @pr_exp_labor_y, @pr_exp_util_m, @pr_exp_util_y, @pr_exp_loan_m, @pr_exp_loan_y, @pr_exp_etc_m, @pr_exp_etc_y,
                    @pr_zone_adjust, @pr_zone_overheat, @pr_zone_spec, @pr_zone_land_permit, @pr_build_permit, @pr_zone_dev_restrict, @pr_right_surface, @pr_right_grave, @pr_right_easement,
                    now(), @pr_user_id
                ) RETURNING pt_no";

            using (var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV")))
            {
                await connection.OpenAsync();
                await connection.SetAppUidAsync(Dto.UserId); // _hist 작성자(app.uid) — 트랜잭션 전에 설정
                using var tx = connection.BeginTransaction();
                try
                {
                    long ptNo = 0;
                    using (var cmd = new NpgsqlCommand(insSql, connection, tx))
                    {
                        cmd.Parameters.AddRange(parameters.Where(p => p.ParameterName.Replace("@", "") != "pr_proc").ToArray());
                        var scalar = await cmd.ExecuteScalarAsync();
                        ptNo = Convert.ToInt64(scalar);
                    }

                    if (ptNo > 0)
                    {
                        // Holder 정보 동기화
                        if (Dto.Holders != null && Dto.Holders.Count > 0)
                        {
                            await SyncPropertyHolders(connection, tx, ptNo, Dto.Holders, Dto.UserId);
                        }

                        // 부동산공유(공인중개사) 정보 동기화 - 물건번호 받은 뒤 함께 저장
                        await SyncPropertyShares(connection, tx, ptNo, Dto.Shares, Dto.UserId);

                        // 물건메모 / 상담이력 동기화 (한 번에 저장)
                        await SyncPropertyMemos(connection, tx, ptNo, Dto.Memos, Dto.UserId);
                        await SyncPropertyConsults(connection, tx, ptNo, Dto.Consultations, Dto.UserId, Dto.PtName, Dto.OffNo, Dto.RtNo);

                        // 임대차현황서 / 토지 필지목록 동기화
                        await SyncPropertyLeaseRows(connection, tx, ptNo, Dto.LeaseRows, Dto.UserId);
                        await SyncPropertyLandParcels(connection, tx, ptNo, Dto.Parcels, Dto.UserId);
                    }

                    await tx.CommitAsync();
                    rtnVal = ptNo;
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }

            return rtnVal;
        }

        // ───────────────────────── 엑셀 일괄 업로드 ─────────────────────────
        private sealed class BulkDongRow { public int DongNo { get; set; } public string? DongName { get; set; } }
        private sealed class BulkHoRow { public string? HoName { get; set; } }

        // 라벨 정규화(공백 제거 + 동/호 접미사 제거) — '101동'/'101 '/'101' 을 동일 취급
        private static string CanonLabel(string? s, char suffix)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            var t = new string(s.Where(ch => !char.IsWhiteSpace(ch)).ToArray());
            if (t.Length > 0 && t[t.Length - 1] == suffix) t = t.Substring(0, t.Length - 1);
            return t;
        }

        private async Task<List<BulkDongRow>> LoadDongs(int naverCode, Dictionary<int, List<BulkDongRow>> cache)
        {
            if (cache.TryGetValue(naverCode, out var hit)) return hit;
            const string sql = @"SELECT dong_no AS ""DongNo"", dong_name AS ""DongName"" FROM danji_dong_new WHERE naver_danji_code = @code";
            var rows = await _dataService.QueryAsyncPg<BulkDongRow>("DEV", sql,
                new List<NpgsqlParameter> { P("@code", NpgsqlDbType.Integer, naverCode) }) ?? new List<BulkDongRow>();
            cache[naverCode] = rows;
            return rows;
        }

        private async Task<List<BulkHoRow>> LoadHos(int naverCode, int dongNo, Dictionary<string, List<BulkHoRow>> cache)
        {
            string key = naverCode + "|" + dongNo;
            if (cache.TryGetValue(key, out var hit)) return hit;
            const string sql = @"SELECT ho_name AS ""HoName"" FROM danji_ho_new
                                  WHERE naver_danji_code = @code AND dong_no = @dong AND COALESCE(ho_name,'') <> ''";
            var rows = await _dataService.QueryAsyncPg<BulkHoRow>("DEV", sql,
                new List<NpgsqlParameter> { P("@code", NpgsqlDbType.Integer, naverCode), P("@dong", NpgsqlDbType.Integer, dongNo) }) ?? new List<BulkHoRow>();
            cache[key] = rows;
            return rows;
        }

        public async Task<PropertyBulkResult> BulkInsertProperties(PropertyBulkUploadDto Dto)
        {
            var res = new PropertyBulkResult { Total = Dto?.Items?.Count ?? 0 };
            if (Dto?.Items == null || Dto.Items.Count == 0) return res;

            var dongCache = new Dictionary<int, List<BulkDongRow>>();
            var hoCache = new Dictionary<string, List<BulkHoRow>>();

            for (int i = 0; i < Dto.Items.Count; i++)
            {
                var item = Dto.Items[i];
                int rowNo = i + 1;
                try
                {
                    // 공통 컨텍스트 주입(개별 값이 없을 때만)
                    if (item.OffNo == null) item.OffNo = Dto.OffNo;
                    if (string.IsNullOrWhiteSpace(item.RtNo)) item.RtNo = Dto.RtNo;
                    if (string.IsNullOrWhiteSpace(item.UserId)) item.UserId = Dto.UserId;
                    if (string.IsNullOrWhiteSpace(item.DanjiCode)) item.DanjiCode = Dto.DanjiCode;

                    int? naverCode = int.TryParse((item.DanjiCode ?? "").Trim(), out var nc) ? nc : (int?)null;

                    // 단지(naver_danji_code)가 있는 경우에만 동/호 명칭을 DB로 정규화.
                    // 단지가 없으면(비단지형) 입력값을 그대로 저장.
                    if (naverCode != null)
                    {
                        // 동 명칭 → DB 정규화(없으면 해당 행 실패)
                        int? resolvedDongNo = null;
                        if (!string.IsNullOrWhiteSpace(item.Dong))
                        {
                            var dongs = await LoadDongs(naverCode.Value, dongCache);
                            string want = CanonLabel(item.Dong, '동');
                            var m = dongs.FirstOrDefault(d => CanonLabel(d.DongName, '동') == want && want.Length > 0);
                            if (m == null) throw new Exception($"동 '{item.Dong}' 을(를) 단지에서 찾을 수 없습니다.");
                            item.Dong = m.DongName;          // 정규화된 동명으로 저장
                            resolvedDongNo = m.DongNo;
                        }

                        // 호 명칭 → DB 정규화(동이 먼저 확인되어야 함)
                        if (!string.IsNullOrWhiteSpace(item.Ho))
                        {
                            if (resolvedDongNo == null)
                                throw new Exception("호를 조회하려면 동이 먼저 지정/확인되어야 합니다.");
                            var hos = await LoadHos(naverCode.Value, resolvedDongNo.Value, hoCache);
                            string want = CanonLabel(item.Ho, '호');
                            var m = hos.FirstOrDefault(h => CanonLabel(h.HoName, '호') == want && want.Length > 0);
                            if (m == null) throw new Exception($"호 '{item.Ho}' 을(를) 해당 동에서 찾을 수 없습니다.");
                            item.Ho = m.HoName;              // 정규화된 호명으로 저장
                        }
                    }

                    long ptNo = await InsertProperty(item);
                    if (ptNo > 0) res.Success++;
                    else { res.Failed++; res.Errors.Add(new PropertyBulkError { Row = rowNo, Message = "등록 실패" }); }
                }
                catch (Exception ex)
                {
                    res.Failed++;
                    res.Errors.Add(new PropertyBulkError { Row = rowNo, Message = ex.Message });
                }
            }
            return res;
        }

        public async Task<bool> UpdateProperty(long PtNo, PropertyUpdateDto Dto)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("pr_proc", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = "UPD" },
                new NpgsqlParameter("pr_pt_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = PtNo },
                new NpgsqlParameter("pr_pt_name", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PtName ?? DBNull.Value },
                new NpgsqlParameter("pr_pt_sts", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PtSts ?? DBNull.Value },
                new NpgsqlParameter("pr_pt_type", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PtType ?? DBNull.Value },
                new NpgsqlParameter("pr_pt_expl", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PtExpl ?? DBNull.Value },
                new NpgsqlParameter("pr_sale_div", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.SaleDiv ?? DBNull.Value },
                new NpgsqlParameter("pr_addr1", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Addr1 ?? DBNull.Value },
                new NpgsqlParameter("pr_addr2", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Addr2 ?? DBNull.Value },
                new NpgsqlParameter("pr_addr3", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Addr3 ?? DBNull.Value },
                new NpgsqlParameter("pr_addr4", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Addr4 ?? DBNull.Value },
                new NpgsqlParameter("pr_addr5", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Addr5 ?? DBNull.Value },
                new NpgsqlParameter("pr_addr_post", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.AddrPost ?? DBNull.Value },
                new NpgsqlParameter("pr_bjd_code", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.BjdCode ?? DBNull.Value },
                new NpgsqlParameter("pr_danji_code", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.DanjiCode ?? DBNull.Value },
                new NpgsqlParameter("pr_dong", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Dong ?? DBNull.Value },
                new NpgsqlParameter("pr_ho", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Ho ?? DBNull.Value },
                new NpgsqlParameter("pr_floor", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.Floor ?? DBNull.Value },
                new NpgsqlParameter("pr_opt", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Opt ?? DBNull.Value },
                new NpgsqlParameter("pr_house_cnt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.HouseCnt ?? DBNull.Value },
                new NpgsqlParameter("pr_apt_typ", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.AptTyp ?? DBNull.Value },
                new NpgsqlParameter("pr_sup_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.SupArea ?? DBNull.Value },
                new NpgsqlParameter("pr_exc_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.ExcArea ?? DBNull.Value },
                new NpgsqlParameter("pr_land_share", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.LandShare ?? DBNull.Value },
                new NpgsqlParameter("pr_room_cnt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.RoomCnt ?? DBNull.Value },
                new NpgsqlParameter("pr_bath_cnt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.BathCnt ?? DBNull.Value },
                new NpgsqlParameter("pr_ev_charger_cnt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.EvChargerCnt ?? DBNull.Value },
                new NpgsqlParameter("pr_dir_std", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.DirStd ?? DBNull.Value },
                new NpgsqlParameter("pr_heat_method", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.HeatMethod ?? DBNull.Value },
                new NpgsqlParameter("pr_heat_fuel", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.HeatFuel ?? DBNull.Value },
                new NpgsqlParameter("pr_entr_struct", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.EntrStruct ?? DBNull.Value },
                new NpgsqlParameter("pr_buid_struct", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.BuidStruct ?? DBNull.Value },
                new NpgsqlParameter("pr_balc_ext", NpgsqlTypes.NpgsqlDbType.Char) { Value = (object?)Dto.BalcExt ?? DBNull.Value },
                new NpgsqlParameter("pr_floor1", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.Floor1 ?? DBNull.Value },
                new NpgsqlParameter("pr_floor2", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.Floor2 ?? DBNull.Value },
                new NpgsqlParameter("pr_pk_cnt", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.PkCnt ?? DBNull.Value },
                new NpgsqlParameter("pr_maint_cost", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.MaintCost ?? DBNull.Value },
                new NpgsqlParameter("pr_maint_dtl", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.MaintDtl ?? DBNull.Value },
                new NpgsqlParameter("pr_sale_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.SaleAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_les_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.LesAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_prot_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ProtAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_mon_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.MonAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_etc_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.EtcAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_lay_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.LayAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_now_dep_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.NowDepAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_now_mon_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.NowMonAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_loan_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.LoanAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_loan_amt_aft", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.LoanAmtAft ?? DBNull.Value },
                new NpgsqlParameter("pr_mtry_date", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.MtryDate ?? DBNull.Value },
                new NpgsqlParameter("pr_expt_mov_date", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.ExptMovDate ?? DBNull.Value },
                new NpgsqlParameter("pr_expt_date", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.ExptDate ?? DBNull.Value },
                new NpgsqlParameter("pr_expt_com_date", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.ExptComDate ?? DBNull.Value },
                new NpgsqlParameter("pr_comp_year", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.CompYear ?? DBNull.Value },
                new NpgsqlParameter("pr_sha_yn", NpgsqlTypes.NpgsqlDbType.Char) { Value = (object?)Dto.ShaYn ?? DBNull.Value },
                new NpgsqlParameter("pr_cust_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)Dto.CustNo ?? DBNull.Value },
                new NpgsqlParameter("pr_off_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)Dto.OffNo ?? DBNull.Value },
                new NpgsqlParameter("pr_rt_no", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.RtNo ?? DBNull.Value },
                new NpgsqlParameter("pr_cn_no", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.CnNo ?? DBNull.Value },
                new NpgsqlParameter("pr_mvn_psb_yn", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.MvnPsbYn ?? DBNull.Value },
                new NpgsqlParameter("pr_house_rental", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.HouseRental ?? DBNull.Value },
                new NpgsqlParameter("pr_pet_yn", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PetYn ?? DBNull.Value },
                new NpgsqlParameter("pr_top", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Top ?? DBNull.Value },
                new NpgsqlParameter("pr_pt_memo", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PtMemo ?? DBNull.Value },
                new NpgsqlParameter("pr_registry_owner", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.RegistryOwner ?? DBNull.Value },
                new NpgsqlParameter("pr_contract_tenant", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.ContractTenant ?? DBNull.Value },
                new NpgsqlParameter("pr_etc_amt2", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.EtcAmt2 ?? DBNull.Value },
                new NpgsqlParameter("pr_etc_lease_type", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.EtcLeaseType ?? DBNull.Value },
                new NpgsqlParameter("pr_jibun", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Jibun ?? DBNull.Value },
                new NpgsqlParameter("pr_maint_zone_name", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.MaintZoneName ?? DBNull.Value },
                new NpgsqlParameter("pr_child_yn", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.ChildYn ?? DBNull.Value },
                new NpgsqlParameter("pr_child_cond", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.ChildCond ?? DBNull.Value },
                new NpgsqlParameter("pr_pet_allow", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PetAllow ?? DBNull.Value },
                new NpgsqlParameter("pr_pet_cond", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PetCond ?? DBNull.Value },
                new NpgsqlParameter("pr_lend_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.LendAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_lend_amt_aft", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.LendAmtAft ?? DBNull.Value },
                new NpgsqlParameter("pr_dep_loan_bank", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.DepLoanBank ?? DBNull.Value },
                new NpgsqlParameter("pr_dep_loan_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.DepLoanAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_past_data_yn", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PastDataYn ?? DBNull.Value },
                // 추가 스칼라 컬럼
                new NpgsqlParameter("pr_current_status", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.CurrentStatus ?? DBNull.Value },
                new NpgsqlParameter("pr_contract_renewal_right", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.ContractRenewalRight ?? DBNull.Value },
                new NpgsqlParameter("pr_building_use", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.BuildingUse ?? DBNull.Value },
                new NpgsqlParameter("pr_land_use", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.LandUse ?? DBNull.Value },
                new NpgsqlParameter("pr_land_category", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.LandCategory ?? DBNull.Value },
                new NpgsqlParameter("pr_other_restrictions", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.OtherRestrictions ?? DBNull.Value },
                new NpgsqlParameter("pr_dir_base", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.DirBase ?? DBNull.Value },
                new NpgsqlParameter("pr_recommended_business", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.RecommendedBusiness ?? DBNull.Value },
                new NpgsqlParameter("pr_business_type", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.BusinessType ?? DBNull.Value },
                new NpgsqlParameter("pr_business_name", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.BusinessName ?? DBNull.Value },
                new NpgsqlParameter("pr_sub_type", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.SubType ?? DBNull.Value },
                new NpgsqlParameter("pr_building_form", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.BuildingForm ?? DBNull.Value },
                new NpgsqlParameter("pr_main_building_use", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.MainBuildingUse ?? DBNull.Value },
                new NpgsqlParameter("pr_community_facility", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.CommunityFacility ?? DBNull.Value },
                new NpgsqlParameter("pr_addr_detail", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.AddrDetail ?? DBNull.Value },
                new NpgsqlParameter("pr_toilet", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.Toilet ?? DBNull.Value },
                new NpgsqlParameter("pr_contract_date", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.ContractDate ?? DBNull.Value },
                new NpgsqlParameter("pr_hold_date", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.HoldDate ?? DBNull.Value },
                new NpgsqlParameter("pr_permit_date", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PermitDate ?? DBNull.Value },
                new NpgsqlParameter("pr_former_pt_type", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerPtType ?? DBNull.Value },
                new NpgsqlParameter("pr_former_bjd_code", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerBjdCode ?? DBNull.Value },
                new NpgsqlParameter("pr_former_danji_code", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerDanjiCode ?? DBNull.Value },
                new NpgsqlParameter("pr_former_addr1", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerAddr1 ?? DBNull.Value },
                new NpgsqlParameter("pr_former_addr2", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerAddr2 ?? DBNull.Value },
                new NpgsqlParameter("pr_former_addr3", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerAddr3 ?? DBNull.Value },
                new NpgsqlParameter("pr_former_addr4", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerAddr4 ?? DBNull.Value },
                new NpgsqlParameter("pr_former_addr5", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerAddr5 ?? DBNull.Value },
                new NpgsqlParameter("pr_former_jibun", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerJibun ?? DBNull.Value },
                new NpgsqlParameter("pr_former_dong", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerDong ?? DBNull.Value },
                new NpgsqlParameter("pr_former_ho", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerHo ?? DBNull.Value },
                new NpgsqlParameter("pr_former_apt_typ", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.FormerAptTyp ?? DBNull.Value },
                new NpgsqlParameter("pr_former_sup_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.FormerSupArea ?? DBNull.Value },
                new NpgsqlParameter("pr_former_exc_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.FormerExcArea ?? DBNull.Value },
                new NpgsqlParameter("pr_former_total_floor_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.FormerTotalFloorArea ?? DBNull.Value },
                new NpgsqlParameter("pr_former_land_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.FormerLandArea ?? DBNull.Value },
                new NpgsqlParameter("pr_former_land_share_ratio", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.FormerLandShareRatio ?? DBNull.Value },
                new NpgsqlParameter("pr_gross_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.GrossArea ?? DBNull.Value },
                new NpgsqlParameter("pr_building_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.BuildingArea ?? DBNull.Value },
                new NpgsqlParameter("pr_land_share_ratio", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.LandShareRatio ?? DBNull.Value },
                new NpgsqlParameter("pr_access_road", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.AccessRoad ?? DBNull.Value },
                new NpgsqlParameter("pr_office_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.OfficeArea ?? DBNull.Value },
                new NpgsqlParameter("pr_road_info", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.RoadInfo ?? DBNull.Value },
                new NpgsqlParameter("pr_facility_cost", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.FacilityCost ?? DBNull.Value },
                new NpgsqlParameter("pr_city_gas", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.CityGas ?? DBNull.Value },
                new NpgsqlParameter("pr_power_receiving", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.PowerReceiving ?? DBNull.Value },
                new NpgsqlParameter("pr_elec_capacity", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.ElecCapacity ?? DBNull.Value },
                new NpgsqlParameter("pr_elevator_cnt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ElevatorCnt ?? DBNull.Value },
                new NpgsqlParameter("pr_stairs_cnt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.StairsCnt ?? DBNull.Value },
                new NpgsqlParameter("pr_basement_floor", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.BasementFloor ?? DBNull.Value },
                new NpgsqlParameter("pr_ground_floor", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.GroundFloor ?? DBNull.Value },
                new NpgsqlParameter("pr_guest_room_cnt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.GuestRoomCnt ?? DBNull.Value },
                new NpgsqlParameter("pr_presale_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.PresaleAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_expansion_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ExpansionAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_option_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.OptionAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_premium_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.PremiumAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_former_area", NpgsqlTypes.NpgsqlDbType.Numeric) { Value = (object?)Dto.FormerArea ?? DBNull.Value },
                new NpgsqlParameter("pr_add_contrib_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.AddContribAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_right_value_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.RightValueAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_moving_cost", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.MovingCost ?? DBNull.Value },
                new NpgsqlParameter("pr_deposit_total", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.DepositTotal ?? DBNull.Value },
                new NpgsqlParameter("pr_loan_total", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.LoanTotal ?? DBNull.Value },
                new NpgsqlParameter("pr_invest_amt", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.InvestAmt ?? DBNull.Value },
                new NpgsqlParameter("pr_inc_rent_m", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.IncRentM ?? DBNull.Value },
                new NpgsqlParameter("pr_inc_rent_y", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.IncRentY ?? DBNull.Value },
                new NpgsqlParameter("pr_inc_mgmt_m", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.IncMgmtM ?? DBNull.Value },
                new NpgsqlParameter("pr_inc_mgmt_y", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.IncMgmtY ?? DBNull.Value },
                new NpgsqlParameter("pr_inc_etc_m", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.IncEtcM ?? DBNull.Value },
                new NpgsqlParameter("pr_inc_etc_y", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.IncEtcY ?? DBNull.Value },
                new NpgsqlParameter("pr_exp_labor_m", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ExpLaborM ?? DBNull.Value },
                new NpgsqlParameter("pr_exp_labor_y", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ExpLaborY ?? DBNull.Value },
                new NpgsqlParameter("pr_exp_util_m", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ExpUtilM ?? DBNull.Value },
                new NpgsqlParameter("pr_exp_util_y", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ExpUtilY ?? DBNull.Value },
                new NpgsqlParameter("pr_exp_loan_m", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ExpLoanM ?? DBNull.Value },
                new NpgsqlParameter("pr_exp_loan_y", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ExpLoanY ?? DBNull.Value },
                new NpgsqlParameter("pr_exp_etc_m", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ExpEtcM ?? DBNull.Value },
                new NpgsqlParameter("pr_exp_etc_y", NpgsqlTypes.NpgsqlDbType.Integer) { Value = (object?)Dto.ExpEtcY ?? DBNull.Value },
                new NpgsqlParameter("pr_zone_adjust", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)Dto.ZoneAdjust ?? DBNull.Value },
                new NpgsqlParameter("pr_zone_overheat", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)Dto.ZoneOverheat ?? DBNull.Value },
                new NpgsqlParameter("pr_zone_spec", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)Dto.ZoneSpec ?? DBNull.Value },
                new NpgsqlParameter("pr_zone_land_permit", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)Dto.ZoneLandPermit ?? DBNull.Value },
                new NpgsqlParameter("pr_build_permit", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)Dto.BuildPermit ?? DBNull.Value },
                new NpgsqlParameter("pr_zone_dev_restrict", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)Dto.ZoneDevRestrict ?? DBNull.Value },
                new NpgsqlParameter("pr_right_surface", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)Dto.RightSurface ?? DBNull.Value },
                new NpgsqlParameter("pr_right_grave", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)Dto.RightGrave ?? DBNull.Value },
                new NpgsqlParameter("pr_right_easement", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)Dto.RightEasement ?? DBNull.Value },
                new NpgsqlParameter("pr_user_id", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Dto.UserId ?? DBNull.Value }
            };

            // fn_pt_sale 미사용, 직접 UPDATE
            //  · 수정폼은 상세조회(PT_COLS) 전체 값을 되돌려 보내므로(라운드트립) 직접 대입한다.
            //  · COALESCE(@p, col)를 쓰면 사용자가 값을 '지우고' 저장할 때 null 이 되어 기존값이 되살아나는 버그가 있어 제거.
            //  · 부분 업데이트(일부 컬럼만)는 /status 등 별도 엔드포인트를 사용(이 쿼리는 전체 폼 저장 전용).
            const string updSql = @"
                UPDATE pt_sale SET
                    pt_name = @pr_pt_name, pt_sts = @pr_pt_sts,
                    pt_type = @pr_pt_type, pt_expl = @pr_pt_expl, sale_div = @pr_sale_div,
                    addr1 = @pr_addr1, addr2 = @pr_addr2, addr3 = @pr_addr3,
                    addr4 = @pr_addr4, addr5 = @pr_addr5, addr_post = @pr_addr_post,
                    bjd_code = @pr_bjd_code, danji_code = @pr_danji_code,
                    dong = @pr_dong, ho = @pr_ho, floor = @pr_floor,
                    opt = @pr_opt, house_cnt = @pr_house_cnt, apt_typ = @pr_apt_typ,
                    sup_area = @pr_sup_area, exc_area = @pr_exc_area, land_share = @pr_land_share,
                    room_cnt = @pr_room_cnt, bath_cnt = @pr_bath_cnt, ev_charger_cnt = @pr_ev_charger_cnt,
                    dir_std = @pr_dir_std, heat_method = @pr_heat_method, heat_fuel = @pr_heat_fuel,
                    entr_struct = @pr_entr_struct, buid_struct = @pr_buid_struct, balc_ext = @pr_balc_ext,
                    floor1 = @pr_floor1, floor2 = @pr_floor2, pk_cnt = @pr_pk_cnt,
                    maint_cost = @pr_maint_cost, maint_dtl = @pr_maint_dtl,
                    sale_amt = @pr_sale_amt, les_amt = @pr_les_amt, prot_amt = @pr_prot_amt,
                    mon_amt = @pr_mon_amt, etc_amt = @pr_etc_amt, lay_amt = @pr_lay_amt,
                    now_dep_amt = @pr_now_dep_amt, now_mon_amt = @pr_now_mon_amt,
                    loan_amt = @pr_loan_amt, loan_amt_aft = @pr_loan_amt_aft,
                    mtry_date = @pr_mtry_date, expt_mov_date = @pr_expt_mov_date,
                    expt_date = @pr_expt_date, expt_com_date = @pr_expt_com_date,
                    comp_year = @pr_comp_year, sha_yn = @pr_sha_yn,
                    cust_no = @pr_cust_no, off_no = COALESCE(@pr_off_no, off_no), rt_no = COALESCE(@pr_rt_no, rt_no), cn_no = @pr_cn_no,
                    mvn_psb_yn = @pr_mvn_psb_yn, house_rental = @pr_house_rental,
                    pet_yn = @pr_pet_yn, top = @pr_top, pt_memo = @pr_pt_memo,
                    registry_owner = @pr_registry_owner, contract_tenant = @pr_contract_tenant,
                    etc_amt2 = @pr_etc_amt2, etc_lease_type = @pr_etc_lease_type, jibun = @pr_jibun, maint_zone_name = @pr_maint_zone_name, child_yn = @pr_child_yn,
                    child_cond = @pr_child_cond,
                    pet_allow = @pr_pet_allow, pet_cond = @pr_pet_cond,
                    lend_amt = @pr_lend_amt, lend_amt_aft = @pr_lend_amt_aft,
                    dep_loan_bank = @pr_dep_loan_bank, dep_loan_amt = @pr_dep_loan_amt,
                    past_data_yn = @pr_past_data_yn,
                    current_status = @pr_current_status, contract_renewal_right = @pr_contract_renewal_right,
                    building_use = @pr_building_use, land_use = @pr_land_use,
                    land_category = @pr_land_category, other_restrictions = @pr_other_restrictions,
                    dir_base = @pr_dir_base, recommended_business = @pr_recommended_business,
                    business_type = @pr_business_type, business_name = @pr_business_name,
                    sub_type = @pr_sub_type, building_form = @pr_building_form,
                    main_building_use = @pr_main_building_use, community_facility = @pr_community_facility,
                    addr_detail = @pr_addr_detail, toilet = @pr_toilet,
                    contract_date = @pr_contract_date, hold_date = @pr_hold_date, permit_date = @pr_permit_date,
                    former_pt_type = @pr_former_pt_type, former_bjd_code = @pr_former_bjd_code, former_danji_code = @pr_former_danji_code,
                    former_addr1 = @pr_former_addr1, former_addr2 = @pr_former_addr2, former_addr3 = @pr_former_addr3,
                    former_addr4 = @pr_former_addr4, former_addr5 = @pr_former_addr5,
                    former_jibun = @pr_former_jibun, former_dong = @pr_former_dong, former_ho = @pr_former_ho,
                    former_apt_typ = @pr_former_apt_typ, former_sup_area = @pr_former_sup_area, former_exc_area = @pr_former_exc_area,
                    former_total_floor_area = @pr_former_total_floor_area, former_land_area = @pr_former_land_area, former_land_share_ratio = @pr_former_land_share_ratio,
                    gross_area = @pr_gross_area, building_area = @pr_building_area, land_share_ratio = @pr_land_share_ratio,
                    access_road = @pr_access_road, office_area = @pr_office_area, road_info = @pr_road_info,
                    facility_cost = @pr_facility_cost, city_gas = @pr_city_gas, power_receiving = @pr_power_receiving, elec_capacity = @pr_elec_capacity, elevator_cnt = @pr_elevator_cnt, stairs_cnt = @pr_stairs_cnt,
                    basement_floor = @pr_basement_floor, ground_floor = @pr_ground_floor, guest_room_cnt = @pr_guest_room_cnt,
                    presale_amt = @pr_presale_amt, expansion_amt = @pr_expansion_amt, option_amt = @pr_option_amt,
                    premium_amt = @pr_premium_amt, former_area = @pr_former_area, add_contrib_amt = @pr_add_contrib_amt, right_value_amt = @pr_right_value_amt, moving_cost = @pr_moving_cost, deposit_total = @pr_deposit_total, loan_total = @pr_loan_total, invest_amt = @pr_invest_amt,
                    inc_rent_m = @pr_inc_rent_m, inc_rent_y = @pr_inc_rent_y, inc_mgmt_m = @pr_inc_mgmt_m, inc_mgmt_y = @pr_inc_mgmt_y,
                    inc_etc_m = @pr_inc_etc_m, inc_etc_y = @pr_inc_etc_y,
                    exp_labor_m = @pr_exp_labor_m, exp_labor_y = @pr_exp_labor_y, exp_util_m = @pr_exp_util_m, exp_util_y = @pr_exp_util_y,
                    exp_loan_m = @pr_exp_loan_m, exp_loan_y = @pr_exp_loan_y, exp_etc_m = @pr_exp_etc_m, exp_etc_y = @pr_exp_etc_y,
                    zone_adjust = @pr_zone_adjust, zone_overheat = @pr_zone_overheat, zone_spec = @pr_zone_spec,
                    zone_land_permit = @pr_zone_land_permit, build_permit = @pr_build_permit, zone_dev_restrict = @pr_zone_dev_restrict,
                    right_surface = @pr_right_surface, right_grave = @pr_right_grave, right_easement = @pr_right_easement,
                    upd_dt = now(), upd_id = @pr_user_id
                 WHERE pt_no = @pr_pt_no";
            using (var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV")))
            {
                await connection.OpenAsync();
                await connection.SetAppUidAsync(Dto.UserId); // _hist 작성자(app.uid) — 트랜잭션 전에 설정
                using var tx = connection.BeginTransaction();
                try
                {
                    using (var cmd = new NpgsqlCommand(updSql, connection, tx))
                    {
                        cmd.Parameters.AddRange(parameters.Where(p => p.ParameterName.Replace("@", "") != "pr_proc").ToArray());
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // Holder 정보 동기화
                    if (Dto.Holders != null)
                    {
                        await SyncPropertyHolders(connection, tx, PtNo, Dto.Holders, Dto.UserId);
                    }

                    // 부동산공유(공인중개사) 정보 동기화
                    await SyncPropertyShares(connection, tx, PtNo, Dto.Shares, Dto.UserId);

                    // 물건메모 / 상담이력 동기화 (한 번에 저장 - 변경분만 반영)
                    await SyncPropertyMemos(connection, tx, PtNo, Dto.Memos, Dto.UserId);
                    await SyncPropertyConsults(connection, tx, PtNo, Dto.Consultations, Dto.UserId, Dto.PtName, Dto.OffNo, Dto.RtNo);

                    // 임대차현황서 / 토지 필지목록 동기화
                    await SyncPropertyLeaseRows(connection, tx, PtNo, Dto.LeaseRows, Dto.UserId);
                    await SyncPropertyLandParcels(connection, tx, PtNo, Dto.Parcels, Dto.UserId);

                    await tx.CommitAsync();
                    rtnVal = true;
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }

            return rtnVal;
        }
        public async Task<bool> DeleteProperty(long PtNo, string? UserId)
        {
            // fn_pt_sale 미사용, 직접 삭제
            using (var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV")))
            {
                await connection.OpenAsync();
                using (var cmd = new NpgsqlCommand("DELETE FROM pt_sale WHERE pt_no = @pt_no", connection))
                {
                    cmd.Parameters.Add(P("@pt_no", NpgsqlDbType.Bigint, PtNo));
                    await cmd.ExecuteNonQueryAsync();
                }
            }
            return true;
        }

        // 기존 public 시그니처 유지(인터페이스) — 자체 트랜잭션으로 실행
        public async Task<bool> SyncPropertyHolders(long PtNo, List<PropertyHolderDto>? Holders, string? UserId)
        {
            using var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV"));
            await connection.OpenAsync();
            await connection.SetAppUidAsync(UserId); // _hist 작성자(app.uid) — 트랜잭션 전에 설정
            using var tx = connection.BeginTransaction();
            await SyncPropertyHolders(connection, tx, PtNo, Holders, UserId);
            await tx.CommitAsync();
            return true;
        }

        // fn_pt_sale_holder 를 전달된 커넥션/트랜잭션 위에서 직접 호출 (SQL 시맨틱 동일)
        private async Task SyncPropertyHolders(NpgsqlConnection connection, NpgsqlTransaction tx, long PtNo, List<PropertyHolderDto>? Holders, string? UserId)
        {
            // fn_pt_sale_holder 호출 SQL (PostgresDataService.ExecFunctionAsyncPg 와 동일 형태)
            const string holderFnSql = @"SELECT * FROM fn_pt_sale_holder(
                    pr_proc => @pr_proc,
                    pr_pt_no => @pr_pt_no,
                    pr_holder_idx => @pr_holder_idx,
                    pr_holder_type => @pr_holder_type,
                    pr_holder_reg_date => @pr_holder_reg_date,
                    pr_holder_name => @pr_holder_name,
                    pr_holder_phone => @pr_holder_phone,
                    pr_cust_no => @pr_cust_no,
                    pr_holder_relation => @pr_holder_relation,
                    pr_holder_memo => @pr_holder_memo,
                    pr_user_id => @pr_user_id)";

            NpgsqlCommand BuildHolderCmd(string proc, object? holderIdx, object? holderType, object? holderRegDate,
                object? holderName, object? holderPhone, object? custNo, object? holderRelation, object? holderMemo, object? userId)
            {
                var cmd = new NpgsqlCommand(holderFnSql, connection, tx);
                cmd.Parameters.AddWithValue("@pr_proc", proc);
                cmd.Parameters.AddWithValue("@pr_pt_no", PtNo);
                cmd.Parameters.AddWithValue("@pr_holder_idx", holderIdx ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@pr_holder_type", holderType ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@pr_holder_reg_date", holderRegDate ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@pr_holder_name", holderName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@pr_holder_phone", holderPhone ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@pr_cust_no", custNo ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@pr_holder_relation", holderRelation ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@pr_holder_memo", holderMemo ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@pr_user_id", userId ?? DBNull.Value);
                return cmd;
            }

            // 기존 Holder idx 목록 조회 (SEL)
            var existingIdxList = new List<int>();
            using (var sel = BuildHolderCmd("SEL", null, null, null, null, null, null, null, null, null))
            {
                using var r = await sel.ExecuteReaderAsync();
                int ordinal = -1;
                while (await r.ReadAsync())
                {
                    if (ordinal < 0)
                    {
                        try { ordinal = r.GetOrdinal("holder_idx"); }
                        catch { ordinal = r.GetOrdinal("HolderIdx"); }
                    }
                    existingIdxList.Add(Convert.ToInt32(r.GetValue(ordinal)));
                }
            }

            if (Holders == null || Holders.Count == 0)
            {
                // Holder 정보가 없으면 기존 데이터 모두 삭제
                if (existingIdxList.Count > 0)
                {
                    using var del = BuildHolderCmd("DELALL", null, null, null, null, null, null, null, null, null);
                    await del.ExecuteNonQueryAsync();
                }
                return;
            }

            // 새로운 Holder idx 목록
            var newHolderIdxList = Holders.Where(h => h.HolderIdx.HasValue).Select(h => h.HolderIdx!.Value).ToList();

            // 삭제 대상: 기존에는 있지만 새로운 목록에 없는 것
            foreach (var idx in existingIdxList.Where(e => !newHolderIdxList.Contains(e)))
            {
                using var del = BuildHolderCmd("DEL", idx, null, null, null, null, null, null, null, null);
                await del.ExecuteNonQueryAsync();
            }

            // Insert 또는 Update
            foreach (var holder in Holders)
            {
                if (holder.HolderIdx.HasValue && holder.HolderIdx.Value > 0)
                {
                    // 기존 데이터 존재 시 Update
                    using var upd = BuildHolderCmd("UPD", holder.HolderIdx.Value, holder.HolderType, holder.HolderRegDate,
                        holder.HolderName, holder.HolderPhone, holder.CustNo, holder.HolderRelation, holder.HolderMemo, UserId);
                    await upd.ExecuteNonQueryAsync();
                }
                else
                {
                    // 신규 Insert (HolderIdx 자동 채번)
                    int nextIdx = existingIdxList.Count > 0 ? existingIdxList.Max() + 1 : 1;

                    using var ins = BuildHolderCmd("INS", nextIdx, holder.HolderType, holder.HolderRegDate,
                        holder.HolderName, holder.HolderPhone, holder.CustNo, holder.HolderRelation, holder.HolderMemo, UserId);
                    await ins.ExecuteNonQueryAsync();

                    // 다음 항목을 위해 idx 증가
                    existingIdxList.Add(nextIdx);
                }
            }
        }
    }
}

using System.Data;
using RealestateAPI.Hub.Models;
using RealestateAPI.Hub.Realtime;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using Microsoft.AspNetCore.SignalR;
using Npgsql;
using NpgsqlTypes;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.Customer.Services;
using RealestateAPI.Customer.Controllers;
using RealestateAPI.Property.Services;
using RealestateAPI.Property.Controllers;

namespace RealestateAPI.Hub.Services
{
    public interface IHubService
    {
        Task<TradeInfoList> GetTradeInfoList(
            long? tradeId, string? tradeDiv, string? offNo, string? tradeState,
            string? custNo, string? ptNo, DateTime? regDtFr, DateTime? regDtTo,
            int page, int pageSize, string? viewerOffNo = null);

        Task<TradeInfoList> GetRecentTradeInfo(string? tradeDiv, string? offNo, string? tradeState, int recentCnt, string? viewerOffNo = null);

        // 비공유업체
        Task<List<OfficeBlock>> GetOfficeBlocks(long offNo);
        Task<OfficeBlock?> InsertOfficeBlock(OfficeBlockCreateDto dto);
        Task<bool> DeleteOfficeBlock(long blockId);

        Task<TradeInfo?> InsertTradeInfo(TradeInfoCreateDto dto, string userId, bool autoRegisterCustomer = false, bool autoRegisterProperty = false);

        Task<TradeInfo?> UpdateTradeInfo(long tradeId, TradeInfoUpdateDto dto);

        Task<bool> DeleteTradeInfo(long tradeId);

        // 주거래지역
        Task<List<MainRegion>> GetMainRegions(string? offNo, string? rtNo);
        Task<MainRegion?> InsertMainRegion(MainRegionCreateDto dto);
        Task<bool> DeleteMainRegion(long regionId);

        // 쪽지
        Task<List<Note>> GetNotes(string userId, string box, string? regDtFr = null, string? regDtTo = null, string? keyword = null, string? bizKeyword = null);
        Task<long> GetUnreadNoteCount(string userId);
        Task<int> SendNote(NoteSendDto dto);
        Task<bool> MarkNoteRead(long noteId);
        Task<bool> DeleteNote(long noteId, string userId);

        // 쪽지 - 사무소 대화목록 / 대화방 공개여부
        Task<List<Note>> GetOfficeNotes(long offNo, string userId, string? regDtFr = null, string? regDtTo = null, string? keyword = null, string? bizKeyword = null);
        Task<List<NoteShare>> GetNoteShares(long offNo);
        Task<bool> SetNoteShare(NoteShareSetDto dto);
        Task<int> SetAllNoteShare(NoteShareAllDto dto);
    }

    public class HubService : IHubService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;
        private readonly IHubContext<NoteHub> _noteHub;
        private readonly ICustomersServices _customersService;
        private readonly IPropertyServices _propertyService;

        public HubService(IPostgresDataService dataService, IConfiguration configuration, IHubContext<NoteHub> noteHub,
            ICustomersServices customersService, IPropertyServices propertyService)
        {
            _dataService = dataService;
            _configuration = configuration;
            _noteHub = noteHub;
            _customersService = customersService;
            _propertyService = propertyService;
        }

        // null 안전 파라미터 헬퍼 (직접쿼리용 - 명시적 타입으로 null 추론 오류 방지)
        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        // char? -> string 변환 (CHAR(1) 컬럼 바인딩용)
        private static object? C(char? v) => v.HasValue ? v.Value.ToString() : null;
        // p_comp_year VARCHAR(4) — 'YYYYMMDD'/'YYYY-MM-DD' 등이 와도 연도 4자리만 저장
        private static string? Y4(string? v)
        {
            if (string.IsNullOrWhiteSpace(v)) return null;
            var d = new string(v.Where(char.IsDigit).ToArray());
            return d.Length >= 4 ? d[..4] : (d.Length > 0 ? d : null);
        }

        // ===== 자동등록(전송→실제 고객/물건 생성) 매핑 헬퍼 =====
        private static string? SC(char? c) => c.HasValue ? c.Value.ToString() : null;
        private static string? SD(decimal? v) => v?.ToString();
        private static int? ToInt(decimal? v) => v.HasValue ? (int?)Math.Round(v.Value, MidpointRounding.AwayFromZero) : null;
        private static int? ParseIntN(string? s) => int.TryParse(s, out var n) ? n : (int?)null;
        private static long? ParseLongN(string? s) => long.TryParse(s, out var n) ? n : (long?)null;
        private static string? DStr(DateTime? d) => d?.ToString("yyyy-MM-dd");

        // 공동중개 전송 DTO → 고객등록 DTO (자동등록용, 핵심 필드 매핑)
        private static CustomersCreateDto BuildCustomerDto(TradeInfoCreateDto d, string userId) => new CustomersCreateDto
        {
            CustType     = ParseIntN(d.CustType),
            Name         = string.IsNullOrWhiteSpace(d.CustName) ? "-" : d.CustName!,
            Alias        = d.CustAlias,
            Tel          = d.CustTel,
            Addr         = d.CustAddr,
            Memo         = d.CustMemo,
            RentBsnYn    = SC(d.CustRentBsnYn),
            TrdPrg       = d.CustTrdPrg,
            WantType     = d.CustWantType,
            ExcAreaFr    = d.CustExcAreaFr,
            ExcAreaTo    = d.CustExcAreaTo,
            TrdType      = d.CustTrdType,
            MoveinYn     = SC(d.CustMoveinYn),
            MoveDateFr   = DStr(d.CustMoveDateFr),
            MoveDateTo   = DStr(d.CustMoveDateTo),
            CashAblt     = SD(d.CustCashAblt),
            SaleAmtFr    = ToInt(d.CustSaleAmtFr),
            SaleAmtTo    = ToInt(d.CustSaleAmtTo),
            LesAmtFr     = ToInt(d.CustLesAmtFr),
            LesAmtTo     = ToInt(d.CustLesAmtTo),
            ProtAmtFr    = ToInt(d.CustProtAmtFr),
            ProtAmtTo    = ToInt(d.CustProtAmtTo),
            MonAmtFr     = ToInt(d.CustMonAmtFr),
            MonAmtTo     = ToInt(d.CustMonAmtTo),
            EtcProtAmtFr = ToInt(d.CustEtcProtAmtFr),
            EtcProtAmtTo = ToInt(d.CustEtcProtAmtTo),
            EtcMonAmtFr  = ToInt(d.CustEtcMonAmtFr),
            EtcMonAmtTo  = ToInt(d.CustEtcMonAmtTo),
            EtcType      = d.CustEtcType,
            Rmk          = d.CustRmk,
            OffNo        = ParseLongN(d.OffNo),
            UserId       = userId,
            RoomCnt      = d.CustRoomCnt,
            BathCnt      = d.CustBathCnt,
            ParkCnt      = d.CustParkCnt,
            CommunityFac = d.CustCommunityFac,
            FeatureNote  = d.CustFeatureNote,
            ChildYn      = SC(d.CustChildYn),
            ChildCond    = d.CustChildCond,
            PetAllow     = d.CustPetAllow,
            Opt          = d.CustOpt,
            BuildingUse  = d.CustBuildingUse,
            BizType      = d.CustBizType,
            ElevatorCnt  = d.CustElevatorCnt,
            StairCnt     = d.CustStairCnt,
            CityGasYn    = d.CustCityGasYn,
            ElecCapacity = d.CustElecCapacity,
            AccessRoad   = d.CustAccessRoad,
            LandUse      = d.CustLandUse,
            LandCategory = d.CustLandCategory,
        };

        // 공동중개 전송 DTO → 물건등록 DTO (자동등록용, 핵심 필드 매핑)
        private static PropertyCreateDto BuildPropertyDto(TradeInfoCreateDto d, string userId) => new PropertyCreateDto
        {
            PtName     = string.IsNullOrWhiteSpace(d.PPtName) ? "-" : d.PPtName!,
            PtSts      = "PTSTS01",   // 신규 등록 기본상태(진행중)
            PtType     = d.PPtType,
            PtExpl     = d.PPtExpl,
            SaleDiv    = d.PSaleDiv,
            Addr1      = d.PAddr1,
            Addr2      = d.PAddr2,
            Addr3      = d.PAddr3,
            Addr4      = d.PAddr4,
            Addr5      = d.PAddr5,
            BjdCode    = d.PBjdCode,
            DanjiCode  = d.PDanjiCode,
            Dong       = d.PDong,
            Ho         = d.PHo,
            Opt        = d.POpt,
            HouseCnt   = d.PHouseCnt,
            AptTyp     = d.PAptTyp,
            SupArea    = d.PSupArea,
            ExcArea    = d.PExcArea,
            LandShare  = d.PLandShare,
            RoomCnt    = d.PRoomCnt,
            BathCnt    = d.PBathCnt,
            DirStd     = d.PDirStd,
            HeatMethod = d.PHeatMethod,
            HeatFuel   = d.PHeatFuel,
            EntrStruct = d.PEntrStruct,
            BuidStruct = d.PBuidStruct,
            BalcExt    = d.PBalcExt,
            Floor1     = d.PFloor1,
            Floor2     = d.PFloor2,
            PkCnt      = d.PPkCnt,
            MaintCost  = ToInt(d.PMaintCost),
            SaleAmt    = ToInt(d.PSaleAmt),
            LesAmt     = ToInt(d.PLesAmt),
            NowDepAmt  = ToInt(d.PNowDepAmt),
            NowMonAmt  = ToInt(d.PNowMonAmt),
            CompYear   = d.PCompYear,
            OffNo      = ParseLongN(d.OffNo),
            PtMemo     = d.CoBrokerageMemo,
            UserId     = userId,
        };

        /// <summary>
        /// 공동중개망 조회 (페이징) - 직접쿼리
        /// </summary>
        // 비공유업체(양방향) 제외 절 — 뷰어 사무소와 대상(t.off_no) 사무소의 부동산등록번호를 비교
        private const string BLOCK_EXCLUDE = @"
                  AND (@viewer_off_no IS NULL OR NOT EXISTS (
                        SELECT 1 FROM public.rt_office_block b
                         WHERE (b.my_reg_no      = (SELECT o1.""RegNo"" FROM ofc_realter_office o1 WHERE o1.""OffNo""::text = @viewer_off_no LIMIT 1)
                                AND b.blocked_reg_no = (SELECT o2.""RegNo"" FROM ofc_realter_office o2 WHERE o2.""OffNo""::text = t.off_no       LIMIT 1))
                            OR (b.blocked_reg_no = (SELECT o1.""RegNo"" FROM ofc_realter_office o1 WHERE o1.""OffNo""::text = @viewer_off_no LIMIT 1)
                                AND b.my_reg_no      = (SELECT o2.""RegNo"" FROM ofc_realter_office o2 WHERE o2.""OffNo""::text = t.off_no       LIMIT 1))))";

        public async Task<TradeInfoList> GetTradeInfoList(
            long? tradeId, string? tradeDiv, string? offNo, string? tradeState,
            string? custNo, string? ptNo, DateTime? regDtFr, DateTime? regDtTo,
            int page, int pageSize, string? viewerOffNo = null)
        {
            int offset = (Math.Max(page, 1) - 1) * pageSize;

            const string sql = @"
                SELECT t.*, COUNT(*) OVER() AS total_count,
                       (SELECT o.""OffNm""    FROM ofc_realter_office o WHERE o.""OffNo""::text = t.off_no) AS ""OffNm"",
                       (SELECT o.""RpsPhone"" FROM ofc_realter_office o WHERE o.""OffNo""::text = t.off_no) AS ""OffRpsPhone"",
                       (SELECT o.""RpsNm""    FROM ofc_realter_office o WHERE o.""OffNo""::text = t.off_no) AS ""RpsNm"",
                       (SELECT o.""OffTel""   FROM ofc_realter_office o WHERE o.""OffNo""::text = t.off_no) AS ""OffTel"",
                       (SELECT r.""RtTel""    FROM rt_realtor_info r    WHERE r.""Id"" = t.reg_user_id LIMIT 1) AS ""RegUserTel"",
                       (SELECT string_agg(TRIM(CONCAT_WS(' ', a.addr1, a.addr2, a.addr3, a.bld_nm)), '|' ORDER BY a.seq)
                          FROM ct_trd_area a WHERE a.cust_no::text = t.cust_no) AS ""CustRegionsText""
                FROM public.rt_trade_info t
                WHERE (@trade_id   IS NULL OR t.trade_id   = @trade_id)
                  AND (@trade_div  IS NULL OR t.trade_div  = @trade_div)
                  AND (@off_no     IS NULL OR t.off_no     = @off_no)
                  AND (@trade_state IS NULL OR t.trade_state = @trade_state)
                  AND (@cust_no    IS NULL OR t.cust_no    = @cust_no)
                  AND (@pt_no      IS NULL OR t.pt_no      = @pt_no)
                  AND (@reg_dt_fr  IS NULL OR t.reg_dt    >= @reg_dt_fr)
                  AND (@reg_dt_to  IS NULL OR t.reg_dt    <= @reg_dt_to)" + BLOCK_EXCLUDE + @"
                ORDER BY t.reg_dt DESC
                LIMIT @page_size OFFSET @offset;";

            var parameters = new List<NpgsqlParameter>
            {
                P("@trade_id",   NpgsqlDbType.Bigint,        tradeId),
                P("@trade_div",  NpgsqlDbType.Varchar,       tradeDiv),
                P("@off_no",     NpgsqlDbType.Varchar,       offNo),
                P("@trade_state",NpgsqlDbType.Varchar,       tradeState),
                P("@cust_no",    NpgsqlDbType.Varchar,       custNo),
                P("@pt_no",      NpgsqlDbType.Varchar,       ptNo),
                P("@reg_dt_fr",  NpgsqlDbType.TimestampTz,   regDtFr),
                P("@reg_dt_to",  NpgsqlDbType.TimestampTz,   regDtTo),
                P("@viewer_off_no", NpgsqlDbType.Varchar,    string.IsNullOrWhiteSpace(viewerOffNo) ? null : viewerOffNo),
                P("@page_size",  NpgsqlDbType.Integer,       pageSize),
                P("@offset",     NpgsqlDbType.Integer,       offset)
            };

            var items = await _dataService.QueryAsyncPg<TradeInfo>("DEV", sql, parameters);
            long totalCount = items?.FirstOrDefault()?.TotalCount ?? 0;

            return new TradeInfoList { Items = items, TotalCount = totalCount };
        }

        /// <summary>
        /// 최근 N개 공동중개망 조회 - 직접쿼리
        /// </summary>
        public async Task<TradeInfoList> GetRecentTradeInfo(string? tradeDiv, string? offNo, string? tradeState, int recentCnt, string? viewerOffNo = null)
        {
            const string sql = @"
                SELECT t.*, 0::BIGINT AS total_count,
                       (SELECT o.""OffNm""    FROM ofc_realter_office o WHERE o.""OffNo""::text = t.off_no) AS ""OffNm"",
                       (SELECT o.""RpsPhone"" FROM ofc_realter_office o WHERE o.""OffNo""::text = t.off_no) AS ""OffRpsPhone"",
                       (SELECT o.""RpsNm""    FROM ofc_realter_office o WHERE o.""OffNo""::text = t.off_no) AS ""RpsNm"",
                       (SELECT o.""OffTel""   FROM ofc_realter_office o WHERE o.""OffNo""::text = t.off_no) AS ""OffTel"",
                       (SELECT r.""RtTel""    FROM rt_realtor_info r    WHERE r.""Id"" = t.reg_user_id LIMIT 1) AS ""RegUserTel"",
                       (SELECT string_agg(TRIM(CONCAT_WS(' ', a.addr1, a.addr2, a.addr3, a.bld_nm)), '|' ORDER BY a.seq)
                          FROM ct_trd_area a WHERE a.cust_no::text = t.cust_no) AS ""CustRegionsText""
                FROM public.rt_trade_info t
                WHERE (@trade_div  IS NULL OR t.trade_div  = @trade_div)
                  AND (@off_no     IS NULL OR t.off_no     = @off_no)
                  AND (@trade_state IS NULL OR t.trade_state = @trade_state)" + BLOCK_EXCLUDE + @"
                ORDER BY t.reg_dt DESC
                LIMIT @recent_cnt;";

            var parameters = new List<NpgsqlParameter>
            {
                P("@trade_div",  NpgsqlDbType.Varchar, tradeDiv),
                P("@off_no",     NpgsqlDbType.Varchar, offNo),
                P("@trade_state",NpgsqlDbType.Varchar, tradeState),
                P("@viewer_off_no", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(viewerOffNo) ? null : viewerOffNo),
                P("@recent_cnt", NpgsqlDbType.Integer, recentCnt)
            };

            var items = await _dataService.QueryAsyncPg<TradeInfo>("DEV", sql, parameters);
            return new TradeInfoList { Items = items, TotalCount = items?.Count ?? 0 };
        }

        // ==================== 비공유업체 ====================
        public async Task<List<OfficeBlock>> GetOfficeBlocks(long offNo)
        {
            const string sql = @"
                SELECT block_id       AS ""BlockId"",
                       off_no         AS ""OffNo"",
                       my_reg_no      AS ""MyRegNo"",
                       blocked_reg_no AS ""BlockedRegNo"",
                       blocked_nm     AS ""BlockedNm"",
                       reg_dt         AS ""RegDt"",
                       reg_id         AS ""RegId""
                FROM public.rt_office_block
                WHERE off_no = @off_no
                ORDER BY reg_dt DESC, block_id DESC;";
            var parameters = new List<NpgsqlParameter> { P("@off_no", NpgsqlDbType.Bigint, offNo) };
            var items = await _dataService.QueryAsyncPg<OfficeBlock>("DEV", sql, parameters);
            return items ?? new List<OfficeBlock>();
        }

        public async Task<OfficeBlock?> InsertOfficeBlock(OfficeBlockCreateDto dto)
        {
            // my_reg_no 는 등록 사무소의 부동산등록번호를 스냅샷으로 저장
            const string sql = @"
                INSERT INTO public.rt_office_block (off_no, my_reg_no, blocked_reg_no, blocked_nm, reg_id)
                VALUES (@off_no,
                        (SELECT o.""RegNo"" FROM ofc_realter_office o WHERE o.""OffNo"" = @off_no LIMIT 1),
                        @blocked_reg_no, @blocked_nm, @reg_id)
                ON CONFLICT (off_no, blocked_reg_no) DO UPDATE SET blocked_nm = EXCLUDED.blocked_nm
                RETURNING block_id       AS ""BlockId"",
                          off_no         AS ""OffNo"",
                          my_reg_no      AS ""MyRegNo"",
                          blocked_reg_no AS ""BlockedRegNo"",
                          blocked_nm     AS ""BlockedNm"",
                          reg_dt         AS ""RegDt"",
                          reg_id         AS ""RegId"";";
            var parameters = new List<NpgsqlParameter>
            {
                P("@off_no",         NpgsqlDbType.Bigint,  dto.OffNo),
                P("@blocked_reg_no", NpgsqlDbType.Varchar, dto.BlockedRegNo),
                P("@blocked_nm",     NpgsqlDbType.Varchar, dto.BlockedNm),
                P("@reg_id",         NpgsqlDbType.Varchar, dto.RegId)
            };
            var items = await _dataService.QueryAsyncPg<OfficeBlock>("DEV", sql, parameters);
            return items?.FirstOrDefault();
        }

        public async Task<bool> DeleteOfficeBlock(long blockId)
        {
            const string sql = @"DELETE FROM public.rt_office_block WHERE block_id = @block_id;";
            var parameters = new List<NpgsqlParameter> { P("@block_id", NpgsqlDbType.Bigint, blockId) };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        /// <summary>
        /// 공동중개망 신규 등록 - 직접쿼리 (INSERT ... RETURNING *)
        /// </summary>
        public async Task<TradeInfo?> InsertTradeInfo(TradeInfoCreateDto dto, string userId, bool autoRegisterCustomer = false, bool autoRegisterProperty = false)
        {
            const string sql = @"
                INSERT INTO public.rt_trade_info (
                    trade_div, cust_no, pt_no, reg_user_id, off_no,
                    is_cust_registered, is_pt_registered, trade_state, trade_state_desc,
                    co_brokerage_title, co_brokerage_content, co_brokerage_memo,
                    cust_type, cust_name, cust_alias, cust_tel, cust_addr, cust_memo,
                    cust_rent_bsn_yn, cust_trd_prg, cust_want_type, cust_exc_area_fr, cust_exc_area_to,
                    cust_region1, cust_region2, cust_region3, cust_trd_type, cust_trd_type_detail,
                    cust_sale_amt_fr, cust_sale_amt_to, cust_les_amt_fr, cust_les_amt_to,
                    cust_prot_amt_fr, cust_prot_amt_to, cust_mon_amt_fr, cust_mon_amt_to,
                    cust_etc_prot_amt_fr, cust_etc_prot_amt_to, cust_etc_mon_amt_fr, cust_etc_mon_amt_to,
                    cust_etc_type, cust_movein_yn, cust_move_date_fr, cust_move_date_to,
                    cust_cash_ablt, cust_rmk,
                    cust_bld_nm, cust_bjd_code, cust_danji_code,
                    cust_room_cnt, cust_bath_cnt, cust_park_cnt,
                    cust_child_yn, cust_pet_yn, cust_community_fac, cust_feature_note,
                    p_pt_name, p_pt_type, p_sale_div, p_sale_amt, p_now_dep_amt, p_now_mon_amt,
                    p_exc_area, p_sup_area, p_addr_full, p_dong, p_ho,
                    p_floor1, p_floor2, p_floor_desc, p_dir_std, p_balc_ext,
                    p_room_cnt, p_bath_cnt, p_pk_cnt, p_maint_cost,
                    p_heat_method, p_heat_fuel, p_heat_system, p_buid_struct,
                    immediate_movein_yn, p_expt_date, p_prg_sts, p_opt, p_pt_expl,
                    p_comp_year, owner_rent_bsn_yn, trade_status,
                    p_addr1, p_addr2, p_addr3, p_addr4, p_addr5, p_bjd_code, p_danji_code,
                    p_apt_typ, p_land_share, p_current_status, p_les_amt, p_maturity_date,
                    p_bond_max_amt, p_loan_amt, p_loan_amt_aft, p_contract_renewal_right, p_maint_dtl,
                    p_house_cnt, p_entr_struct, p_sub_type, p_dir_base,
                    p_access_road, p_add_contrib_amt, p_basement_floor, p_building_area,
                    p_building_form, p_building_use, p_business_name, p_business_type,
                    p_child_cond, p_child_yn, p_community_facility, p_elevator_cnt,
                    p_etc_dep_amt, p_etc_mon_amt, p_exp_etc_m, p_exp_etc_y,
                    p_exp_labor_m, p_exp_labor_y, p_exp_loan_m, p_exp_loan_y,
                    p_exp_util_m, p_exp_util_y, p_expansion_amt, p_facility_cost,
                    p_ground_floor, p_guest_room_cnt, p_inc_etc_m, p_inc_etc_y,
                    p_inc_mgmt_m, p_inc_mgmt_y, p_inc_rent_m, p_inc_rent_y,
                    p_land_area, p_land_category, p_land_share_ratio, p_land_use,
                    p_lay_amt, p_moving_cost, p_option_amt, p_other_restrictions,
                    p_pet_allow, p_premium_amt, p_presale_amt, p_right_value_amt,
                    p_road_info, p_stair_cnt, p_toilet, p_total_floor_area,
                    p_zone_adjust, p_zone_land_permit, p_zone_overheat, p_zone_spec,
                    cust_access_road, cust_balc_ext, cust_biz_type, cust_build_permit_pref,
                    cust_building_form, cust_building_use, cust_child_cond, cust_city_gas_yn,
                    cust_elec_capacity, cust_elevator_cnt, cust_entr_struct, cust_land_category,
                    cust_land_use, cust_opt, cust_pet_allow, cust_stair_cnt,
                    charge_name
                ) VALUES (
                    @trade_div, @cust_no, @pt_no, @reg_user_id, @off_no,
                    @is_cust_registered, @is_pt_registered, COALESCE(@trade_state, 'active'), @trade_state_desc,
                    @co_brokerage_title, @co_brokerage_content, @co_brokerage_memo,
                    @cust_type, @cust_name, @cust_alias, @cust_tel, @cust_addr, @cust_memo,
                    @cust_rent_bsn_yn, @cust_trd_prg, @cust_want_type, @cust_exc_area_fr, @cust_exc_area_to,
                    @cust_region1, @cust_region2, @cust_region3, @cust_trd_type, @cust_trd_type_detail,
                    @cust_sale_amt_fr, @cust_sale_amt_to, @cust_les_amt_fr, @cust_les_amt_to,
                    @cust_prot_amt_fr, @cust_prot_amt_to, @cust_mon_amt_fr, @cust_mon_amt_to,
                    @cust_etc_prot_amt_fr, @cust_etc_prot_amt_to, @cust_etc_mon_amt_fr, @cust_etc_mon_amt_to,
                    @cust_etc_type, @cust_movein_yn, @cust_move_date_fr, @cust_move_date_to,
                    @cust_cash_ablt, @cust_rmk,
                    @cust_bld_nm, @cust_bjd_code, @cust_danji_code,
                    @cust_room_cnt, @cust_bath_cnt, @cust_park_cnt,
                    @cust_child_yn, @cust_pet_yn, @cust_community_fac, @cust_feature_note,
                    @p_pt_name, @p_pt_type, @p_sale_div, @p_sale_amt, @p_now_dep_amt, @p_now_mon_amt,
                    @p_exc_area, @p_sup_area, @p_addr_full, @p_dong, @p_ho,
                    @p_floor1, @p_floor2, @p_floor_desc, @p_dir_std, @p_balc_ext,
                    @p_room_cnt, @p_bath_cnt, @p_pk_cnt, @p_maint_cost,
                    @p_heat_method, @p_heat_fuel, @p_heat_system, @p_buid_struct,
                    @immediate_movein_yn, @p_expt_date, @p_prg_sts, @p_opt, @p_pt_expl,
                    @p_comp_year, @owner_rent_bsn_yn, COALESCE(@trade_status, 'Y'),
                    @p_addr1, @p_addr2, @p_addr3, @p_addr4, @p_addr5, @p_bjd_code, @p_danji_code,
                    @p_apt_typ, @p_land_share, @p_current_status, @p_les_amt, @p_maturity_date,
                    @p_bond_max_amt, @p_loan_amt, @p_loan_amt_aft, @p_contract_renewal_right, @p_maint_dtl,
                    @p_house_cnt, @p_entr_struct, @p_sub_type, @p_dir_base,
                    @p_access_road, @p_add_contrib_amt, @p_basement_floor, @p_building_area,
                    @p_building_form, @p_building_use, @p_business_name, @p_business_type,
                    @p_child_cond, @p_child_yn, @p_community_facility, @p_elevator_cnt,
                    @p_etc_dep_amt, @p_etc_mon_amt, @p_exp_etc_m, @p_exp_etc_y,
                    @p_exp_labor_m, @p_exp_labor_y, @p_exp_loan_m, @p_exp_loan_y,
                    @p_exp_util_m, @p_exp_util_y, @p_expansion_amt, @p_facility_cost,
                    @p_ground_floor, @p_guest_room_cnt, @p_inc_etc_m, @p_inc_etc_y,
                    @p_inc_mgmt_m, @p_inc_mgmt_y, @p_inc_rent_m, @p_inc_rent_y,
                    @p_land_area, @p_land_category, @p_land_share_ratio, @p_land_use,
                    @p_lay_amt, @p_moving_cost, @p_option_amt, @p_other_restrictions,
                    @p_pet_allow, @p_premium_amt, @p_presale_amt, @p_right_value_amt,
                    @p_road_info, @p_stair_cnt, @p_toilet, @p_total_floor_area,
                    @p_zone_adjust, @p_zone_land_permit, @p_zone_overheat, @p_zone_spec,
                    @cust_access_road, @cust_balc_ext, @cust_biz_type, @cust_build_permit_pref,
                    @cust_building_form, @cust_building_use, @cust_child_cond, @cust_city_gas_yn,
                    @cust_elec_capacity, @cust_elevator_cnt, @cust_entr_struct, @cust_land_category,
                    @cust_land_use, @cust_opt, @cust_pet_allow, @cust_stair_cnt,
                    @charge_name
                )
                RETURNING *, 1::BIGINT AS total_count;";

            var parameters = new List<NpgsqlParameter>
            {
                P("@trade_div",           NpgsqlDbType.Varchar,     dto.TradeDiv),
                P("@cust_no",             NpgsqlDbType.Varchar,     dto.CustNo),
                P("@pt_no",               NpgsqlDbType.Varchar,     dto.PtNo),
                P("@reg_user_id",         NpgsqlDbType.Varchar,     userId),
                P("@p_access_road",           NpgsqlDbType.Varchar,  dto.PAccessRoad),
                P("@p_add_contrib_amt",       NpgsqlDbType.Numeric,  dto.PAddContribAmt),
                P("@p_basement_floor",        NpgsqlDbType.Integer,  dto.PBasementFloor),
                P("@p_building_area",         NpgsqlDbType.Numeric,  dto.PBuildingArea),
                P("@p_building_form",         NpgsqlDbType.Varchar,  dto.PBuildingForm),
                P("@p_building_use",          NpgsqlDbType.Varchar,  dto.PBuildingUse),
                P("@p_business_name",         NpgsqlDbType.Varchar,  dto.PBusinessName),
                P("@p_business_type",         NpgsqlDbType.Varchar,  dto.PBusinessType),
                P("@p_child_cond",            NpgsqlDbType.Varchar,  dto.PChildCond),
                P("@p_child_yn",              NpgsqlDbType.Varchar,  dto.PChildYn),
                P("@p_community_facility",    NpgsqlDbType.Varchar,  dto.PCommunityFacility),
                P("@p_elevator_cnt",          NpgsqlDbType.Integer,  dto.PElevatorCnt),
                P("@p_etc_dep_amt",           NpgsqlDbType.Numeric,  dto.PEtcDepAmt),
                P("@p_etc_mon_amt",           NpgsqlDbType.Numeric,  dto.PEtcMonAmt),
                P("@p_exp_etc_m",             NpgsqlDbType.Numeric,  dto.PExpEtcM),
                P("@p_exp_etc_y",             NpgsqlDbType.Numeric,  dto.PExpEtcY),
                P("@p_exp_labor_m",           NpgsqlDbType.Numeric,  dto.PExpLaborM),
                P("@p_exp_labor_y",           NpgsqlDbType.Numeric,  dto.PExpLaborY),
                P("@p_exp_loan_m",            NpgsqlDbType.Numeric,  dto.PExpLoanM),
                P("@p_exp_loan_y",            NpgsqlDbType.Numeric,  dto.PExpLoanY),
                P("@p_exp_util_m",            NpgsqlDbType.Numeric,  dto.PExpUtilM),
                P("@p_exp_util_y",            NpgsqlDbType.Numeric,  dto.PExpUtilY),
                P("@p_expansion_amt",         NpgsqlDbType.Numeric,  dto.PExpansionAmt),
                P("@p_facility_cost",         NpgsqlDbType.Numeric,  dto.PFacilityCost),
                P("@p_ground_floor",          NpgsqlDbType.Integer,  dto.PGroundFloor),
                P("@p_guest_room_cnt",        NpgsqlDbType.Integer,  dto.PGuestRoomCnt),
                P("@p_inc_etc_m",             NpgsqlDbType.Numeric,  dto.PIncEtcM),
                P("@p_inc_etc_y",             NpgsqlDbType.Numeric,  dto.PIncEtcY),
                P("@p_inc_mgmt_m",            NpgsqlDbType.Numeric,  dto.PIncMgmtM),
                P("@p_inc_mgmt_y",            NpgsqlDbType.Numeric,  dto.PIncMgmtY),
                P("@p_inc_rent_m",            NpgsqlDbType.Numeric,  dto.PIncRentM),
                P("@p_inc_rent_y",            NpgsqlDbType.Numeric,  dto.PIncRentY),
                P("@p_land_area",             NpgsqlDbType.Numeric,  dto.PLandArea),
                P("@p_land_category",         NpgsqlDbType.Varchar,  dto.PLandCategory),
                P("@p_land_share_ratio",      NpgsqlDbType.Numeric,  dto.PLandShareRatio),
                P("@p_land_use",              NpgsqlDbType.Varchar,  dto.PLandUse),
                P("@p_lay_amt",               NpgsqlDbType.Numeric,  dto.PLayAmt),
                P("@p_moving_cost",           NpgsqlDbType.Numeric,  dto.PMovingCost),
                P("@p_option_amt",            NpgsqlDbType.Numeric,  dto.POptionAmt),
                P("@p_other_restrictions",    NpgsqlDbType.Varchar,  dto.POtherRestrictions),
                P("@p_pet_allow",             NpgsqlDbType.Varchar,  dto.PPetAllow),
                P("@p_premium_amt",           NpgsqlDbType.Numeric,  dto.PPremiumAmt),
                P("@p_presale_amt",           NpgsqlDbType.Numeric,  dto.PPresaleAmt),
                P("@p_right_value_amt",       NpgsqlDbType.Numeric,  dto.PRightValueAmt),
                P("@p_road_info",             NpgsqlDbType.Varchar,  dto.PRoadInfo),
                P("@p_stair_cnt",             NpgsqlDbType.Integer,  dto.PStairCnt),
                P("@p_toilet",                NpgsqlDbType.Varchar,  dto.PToilet),
                P("@p_total_floor_area",      NpgsqlDbType.Numeric,  dto.PTotalFloorArea),
                P("@p_zone_adjust",           NpgsqlDbType.Boolean,  dto.PZoneAdjust),
                P("@p_zone_land_permit",      NpgsqlDbType.Boolean,  dto.PZoneLandPermit),
                P("@p_zone_overheat",         NpgsqlDbType.Boolean,  dto.PZoneOverheat),
                P("@p_zone_spec",             NpgsqlDbType.Boolean,  dto.PZoneSpec),
                P("@cust_access_road",        NpgsqlDbType.Varchar,  dto.CustAccessRoad),
                P("@cust_balc_ext",           NpgsqlDbType.Varchar,  dto.CustBalcExt),
                P("@cust_biz_type",           NpgsqlDbType.Varchar,  dto.CustBizType),
                P("@cust_build_permit_pref",  NpgsqlDbType.Varchar,  dto.CustBuildPermitPref),
                P("@cust_building_form",      NpgsqlDbType.Varchar,  dto.CustBuildingForm),
                P("@cust_building_use",       NpgsqlDbType.Varchar,  dto.CustBuildingUse),
                P("@cust_child_cond",         NpgsqlDbType.Varchar,  dto.CustChildCond),
                P("@cust_city_gas_yn",        NpgsqlDbType.Varchar,  dto.CustCityGasYn),
                P("@cust_elec_capacity",      NpgsqlDbType.Varchar,  dto.CustElecCapacity),
                P("@cust_elevator_cnt",       NpgsqlDbType.Integer,  dto.CustElevatorCnt),
                P("@cust_entr_struct",        NpgsqlDbType.Varchar,  dto.CustEntrStruct),
                P("@cust_land_category",      NpgsqlDbType.Varchar,  dto.CustLandCategory),
                P("@cust_land_use",           NpgsqlDbType.Varchar,  dto.CustLandUse),
                P("@cust_opt",                NpgsqlDbType.Text,     dto.CustOpt),
                P("@cust_pet_allow",          NpgsqlDbType.Varchar,  dto.CustPetAllow),
                P("@cust_stair_cnt",          NpgsqlDbType.Integer,  dto.CustStairCnt),
                P("@charge_name",             NpgsqlDbType.Varchar,  dto.ChargeName),
                P("@off_no",              NpgsqlDbType.Varchar,     dto.OffNo),
                P("@is_cust_registered",  NpgsqlDbType.Boolean,     dto.IsCustRegistered),
                P("@is_pt_registered",    NpgsqlDbType.Boolean,     dto.IsPtRegistered),
                P("@trade_state",         NpgsqlDbType.Varchar,     dto.TradeState),
                P("@trade_state_desc",    NpgsqlDbType.Varchar,     dto.TradeStateDesc),
                P("@co_brokerage_title",  NpgsqlDbType.Varchar,     dto.CoBrokerageTitle),
                P("@co_brokerage_content",NpgsqlDbType.Text,        dto.CoBrokerageContent),
                P("@co_brokerage_memo",   NpgsqlDbType.Text,        dto.CoBrokerageMemo),
                P("@cust_type",           NpgsqlDbType.Varchar,     dto.CustType),
                P("@cust_name",           NpgsqlDbType.Varchar,     dto.CustName),
                P("@cust_alias",          NpgsqlDbType.Varchar,     dto.CustAlias),
                P("@cust_tel",            NpgsqlDbType.Varchar,     dto.CustTel),
                P("@cust_addr",           NpgsqlDbType.Varchar,     dto.CustAddr),
                P("@cust_memo",           NpgsqlDbType.Text,        dto.CustMemo),
                P("@cust_rent_bsn_yn",    NpgsqlDbType.Varchar,     C(dto.CustRentBsnYn)),
                P("@cust_trd_prg",        NpgsqlDbType.Varchar,     dto.CustTrdPrg),
                P("@cust_want_type",      NpgsqlDbType.Varchar,     dto.CustWantType),
                P("@cust_exc_area_fr",    NpgsqlDbType.Numeric,     dto.CustExcAreaFr),
                P("@cust_exc_area_to",    NpgsqlDbType.Numeric,     dto.CustExcAreaTo),
                P("@cust_region1",        NpgsqlDbType.Varchar,     dto.CustRegion1),
                P("@cust_region2",        NpgsqlDbType.Varchar,     dto.CustRegion2),
                P("@cust_region3",        NpgsqlDbType.Varchar,     dto.CustRegion3),
                P("@cust_trd_type",       NpgsqlDbType.Varchar,     dto.CustTrdType),
                P("@cust_trd_type_detail",NpgsqlDbType.Varchar,     dto.CustTrdTypeDetail),
                P("@cust_sale_amt_fr",    NpgsqlDbType.Numeric,     dto.CustSaleAmtFr),
                P("@cust_sale_amt_to",    NpgsqlDbType.Numeric,     dto.CustSaleAmtTo),
                P("@cust_les_amt_fr",     NpgsqlDbType.Numeric,     dto.CustLesAmtFr),
                P("@cust_les_amt_to",     NpgsqlDbType.Numeric,     dto.CustLesAmtTo),
                P("@cust_prot_amt_fr",    NpgsqlDbType.Numeric,     dto.CustProtAmtFr),
                P("@cust_prot_amt_to",    NpgsqlDbType.Numeric,     dto.CustProtAmtTo),
                P("@cust_mon_amt_fr",     NpgsqlDbType.Numeric,     dto.CustMonAmtFr),
                P("@cust_mon_amt_to",     NpgsqlDbType.Numeric,     dto.CustMonAmtTo),
                P("@cust_etc_prot_amt_fr",NpgsqlDbType.Numeric,     dto.CustEtcProtAmtFr),
                P("@cust_etc_prot_amt_to",NpgsqlDbType.Numeric,     dto.CustEtcProtAmtTo),
                P("@cust_etc_mon_amt_fr", NpgsqlDbType.Numeric,     dto.CustEtcMonAmtFr),
                P("@cust_etc_mon_amt_to", NpgsqlDbType.Numeric,     dto.CustEtcMonAmtTo),
                P("@cust_etc_type",       NpgsqlDbType.Varchar,     dto.CustEtcType),
                P("@cust_movein_yn",      NpgsqlDbType.Varchar,     C(dto.CustMoveinYn)),
                P("@cust_move_date_fr",   NpgsqlDbType.Date,        dto.CustMoveDateFr),
                P("@cust_move_date_to",   NpgsqlDbType.Date,        dto.CustMoveDateTo),
                P("@cust_cash_ablt",      NpgsqlDbType.Numeric,     dto.CustCashAblt),
                P("@cust_rmk",            NpgsqlDbType.Text,        dto.CustRmk),
                P("@cust_bld_nm",         NpgsqlDbType.Varchar,     dto.CustBldNm),
                P("@cust_bjd_code",       NpgsqlDbType.Varchar,     dto.CustBjdCode),
                P("@cust_danji_code",     NpgsqlDbType.Varchar,     dto.CustDanjiCode),
                P("@cust_room_cnt",       NpgsqlDbType.Integer,     dto.CustRoomCnt),
                P("@cust_bath_cnt",       NpgsqlDbType.Integer,     dto.CustBathCnt),
                P("@cust_park_cnt",       NpgsqlDbType.Integer,     dto.CustParkCnt),
                P("@cust_child_yn",       NpgsqlDbType.Varchar,     C(dto.CustChildYn)),
                P("@cust_pet_yn",         NpgsqlDbType.Varchar,     C(dto.CustPetYn)),
                P("@cust_community_fac",  NpgsqlDbType.Varchar,     dto.CustCommunityFac),
                P("@cust_feature_note",   NpgsqlDbType.Text,        dto.CustFeatureNote),
                P("@p_pt_name",           NpgsqlDbType.Varchar,     dto.PPtName),
                P("@p_pt_type",           NpgsqlDbType.Varchar,     dto.PPtType),
                P("@p_sale_div",          NpgsqlDbType.Varchar,     dto.PSaleDiv),
                P("@p_sale_amt",          NpgsqlDbType.Numeric,     dto.PSaleAmt),
                P("@p_now_dep_amt",       NpgsqlDbType.Numeric,     dto.PNowDepAmt),
                P("@p_now_mon_amt",       NpgsqlDbType.Numeric,     dto.PNowMonAmt),
                P("@p_exc_area",          NpgsqlDbType.Numeric,     dto.PExcArea),
                P("@p_sup_area",          NpgsqlDbType.Numeric,     dto.PSupArea),
                P("@p_addr_full",         NpgsqlDbType.Varchar,     dto.PAddrFull),
                P("@p_dong",              NpgsqlDbType.Varchar,     dto.PDong),
                P("@p_ho",                NpgsqlDbType.Varchar,     dto.PHo),
                P("@p_floor1",            NpgsqlDbType.Integer,     dto.PFloor1),
                P("@p_floor2",            NpgsqlDbType.Integer,     dto.PFloor2),
                P("@p_floor_desc",        NpgsqlDbType.Varchar,     dto.PFloorDesc),
                P("@p_dir_std",           NpgsqlDbType.Varchar,     dto.PDirStd),
                P("@p_dir_base",          NpgsqlDbType.Varchar,     dto.PDirBase),
                P("@p_sub_type",          NpgsqlDbType.Varchar,     dto.PSubType),
                P("@p_balc_ext",          NpgsqlDbType.Varchar,     dto.PBalcExt),
                P("@p_room_cnt",          NpgsqlDbType.Integer,     dto.PRoomCnt),
                P("@p_bath_cnt",          NpgsqlDbType.Integer,     dto.PBathCnt),
                P("@p_pk_cnt",            NpgsqlDbType.Numeric,     dto.PPkCnt),
                P("@p_maint_cost",        NpgsqlDbType.Numeric,     dto.PMaintCost),
                P("@p_heat_method",       NpgsqlDbType.Varchar,     dto.PHeatMethod),
                P("@p_heat_fuel",         NpgsqlDbType.Varchar,     dto.PHeatFuel),
                P("@p_heat_system",       NpgsqlDbType.Varchar,     dto.PHeatSystem),
                P("@p_buid_struct",       NpgsqlDbType.Varchar,     dto.PBuidStruct),
                P("@immediate_movein_yn", NpgsqlDbType.Varchar,     C(dto.ImmediateMoveinYn)),
                P("@p_expt_date",         NpgsqlDbType.Date,        dto.PExptDate),
                P("@p_prg_sts",           NpgsqlDbType.Varchar,     dto.PPrgSts),
                P("@p_opt",               NpgsqlDbType.Text,        dto.POpt),
                P("@p_pt_expl",           NpgsqlDbType.Text,        dto.PPtExpl),
                P("@p_comp_year",         NpgsqlDbType.Varchar,     Y4(dto.PCompYear)),
                P("@owner_rent_bsn_yn",   NpgsqlDbType.Varchar,     C(dto.OwnerRentBsnYn)),
                P("@trade_status",        NpgsqlDbType.Varchar,     dto.TradeStatus),
                P("@p_addr1",             NpgsqlDbType.Varchar,     dto.PAddr1),
                P("@p_addr2",             NpgsqlDbType.Varchar,     dto.PAddr2),
                P("@p_addr3",             NpgsqlDbType.Varchar,     dto.PAddr3),
                P("@p_addr4",             NpgsqlDbType.Varchar,     dto.PAddr4),
                P("@p_addr5",             NpgsqlDbType.Varchar,     dto.PAddr5),
                P("@p_bjd_code",          NpgsqlDbType.Varchar,     dto.PBjdCode),
                P("@p_danji_code",        NpgsqlDbType.Varchar,     dto.PDanjiCode),
                P("@p_apt_typ",           NpgsqlDbType.Varchar,     dto.PAptTyp),
                P("@p_land_share",        NpgsqlDbType.Numeric,     dto.PLandShare),
                P("@p_current_status",    NpgsqlDbType.Varchar,     dto.PCurrentStatus),
                P("@p_les_amt",           NpgsqlDbType.Numeric,     dto.PLesAmt),
                P("@p_maturity_date",     NpgsqlDbType.Date,        dto.PMaturityDate),
                P("@p_bond_max_amt",      NpgsqlDbType.Numeric,     dto.PBondMaxAmt),
                P("@p_loan_amt",          NpgsqlDbType.Numeric,     dto.PLoanAmt),
                P("@p_loan_amt_aft",      NpgsqlDbType.Numeric,     dto.PLoanAmtAft),
                P("@p_contract_renewal_right", NpgsqlDbType.Varchar, dto.PContractRenewalRight),
                P("@p_maint_dtl",         NpgsqlDbType.Varchar,     dto.PMaintDtl),
                P("@p_house_cnt",         NpgsqlDbType.Integer,     dto.PHouseCnt),
                P("@p_entr_struct",       NpgsqlDbType.Varchar,     dto.PEntrStruct)
            };

            var result = await _dataService.QueryAsyncPg<TradeInfo>("DEV", sql, parameters);
            var inserted = result?.FirstOrDefault();
            if (inserted == null) return inserted;

            // 자동등록: 전송과 함께 실제 고객/물건 레코드를 생성하고 tradeId에 back-fill
            long newCustNo = 0, newPtNo = 0;
            if (autoRegisterCustomer && string.IsNullOrWhiteSpace(dto.CustNo))
            {
                newCustNo = await _customersService.InsertCustomer(BuildCustomerDto(dto, userId), userId);
            }
            if (autoRegisterProperty && string.IsNullOrWhiteSpace(dto.PtNo))
            {
                newPtNo = await _propertyService.InsertProperty(BuildPropertyDto(dto, userId));
            }

            if (newCustNo > 0 || newPtNo > 0)
            {
                const string backfillSql = @"
                    UPDATE public.rt_trade_info SET
                        cust_no            = COALESCE(@cust_no, cust_no),
                        pt_no              = COALESCE(@pt_no, pt_no),
                        is_cust_registered = CASE WHEN @cust_no IS NOT NULL THEN TRUE ELSE is_cust_registered END,
                        is_pt_registered   = CASE WHEN @pt_no  IS NOT NULL THEN TRUE ELSE is_pt_registered END,
                        upd_dt             = NOW()
                    WHERE trade_id = @trade_id
                    RETURNING *, 1::BIGINT AS total_count;";
                var backfillParams = new List<NpgsqlParameter>
                {
                    P("@trade_id", NpgsqlDbType.Bigint,  inserted.TradeId),
                    P("@cust_no",  NpgsqlDbType.Varchar, newCustNo > 0 ? newCustNo.ToString() : null),
                    P("@pt_no",    NpgsqlDbType.Varchar, newPtNo  > 0 ? newPtNo.ToString()  : null),
                };
                var updated = await _dataService.QueryAsyncPg<TradeInfo>("DEV", backfillSql, backfillParams);
                return updated?.FirstOrDefault() ?? inserted;
            }

            return inserted;
        }

        /// <summary>
        /// 공동중개망 수정 - 직접쿼리 (UPDATE ... COALESCE ... RETURNING *)
        /// </summary>
        public async Task<TradeInfo?> UpdateTradeInfo(long tradeId, TradeInfoUpdateDto dto)
        {
            const string sql = @"
                UPDATE public.rt_trade_info SET
                    trade_div            = COALESCE(@trade_div, trade_div),
                    cust_no              = COALESCE(@cust_no, cust_no),
                    pt_no                = COALESCE(@pt_no, pt_no),
                    off_no               = COALESCE(@off_no, off_no),
                    upd_dt               = NOW(),
                    is_cust_registered   = COALESCE(@is_cust_registered, is_cust_registered),
                    is_pt_registered     = COALESCE(@is_pt_registered, is_pt_registered),
                    trade_state          = COALESCE(@trade_state, trade_state),
                    trade_state_desc     = COALESCE(@trade_state_desc, trade_state_desc),
                    co_brokerage_title   = COALESCE(@co_brokerage_title, co_brokerage_title),
                    co_brokerage_content = COALESCE(@co_brokerage_content, co_brokerage_content),
                    co_brokerage_memo    = COALESCE(@co_brokerage_memo, co_brokerage_memo),
                    cust_type            = COALESCE(@cust_type, cust_type),
                    cust_name            = COALESCE(@cust_name, cust_name),
                    cust_alias           = COALESCE(@cust_alias, cust_alias),
                    cust_tel             = COALESCE(@cust_tel, cust_tel),
                    cust_addr            = COALESCE(@cust_addr, cust_addr),
                    cust_memo            = COALESCE(@cust_memo, cust_memo),
                    cust_rent_bsn_yn     = COALESCE(@cust_rent_bsn_yn, cust_rent_bsn_yn),
                    cust_trd_prg         = COALESCE(@cust_trd_prg, cust_trd_prg),
                    cust_want_type       = COALESCE(@cust_want_type, cust_want_type),
                    cust_exc_area_fr     = COALESCE(@cust_exc_area_fr, cust_exc_area_fr),
                    cust_exc_area_to     = COALESCE(@cust_exc_area_to, cust_exc_area_to),
                    cust_region1         = COALESCE(@cust_region1, cust_region1),
                    cust_region2         = COALESCE(@cust_region2, cust_region2),
                    cust_region3         = COALESCE(@cust_region3, cust_region3),
                    cust_trd_type        = COALESCE(@cust_trd_type, cust_trd_type),
                    cust_trd_type_detail = COALESCE(@cust_trd_type_detail, cust_trd_type_detail),
                    cust_sale_amt_fr     = COALESCE(@cust_sale_amt_fr, cust_sale_amt_fr),
                    cust_sale_amt_to     = COALESCE(@cust_sale_amt_to, cust_sale_amt_to),
                    cust_les_amt_fr      = COALESCE(@cust_les_amt_fr, cust_les_amt_fr),
                    cust_les_amt_to      = COALESCE(@cust_les_amt_to, cust_les_amt_to),
                    cust_prot_amt_fr     = COALESCE(@cust_prot_amt_fr, cust_prot_amt_fr),
                    cust_prot_amt_to     = COALESCE(@cust_prot_amt_to, cust_prot_amt_to),
                    cust_mon_amt_fr      = COALESCE(@cust_mon_amt_fr, cust_mon_amt_fr),
                    cust_mon_amt_to      = COALESCE(@cust_mon_amt_to, cust_mon_amt_to),
                    cust_etc_prot_amt_fr = COALESCE(@cust_etc_prot_amt_fr, cust_etc_prot_amt_fr),
                    cust_etc_prot_amt_to = COALESCE(@cust_etc_prot_amt_to, cust_etc_prot_amt_to),
                    cust_etc_mon_amt_fr  = COALESCE(@cust_etc_mon_amt_fr, cust_etc_mon_amt_fr),
                    cust_etc_mon_amt_to  = COALESCE(@cust_etc_mon_amt_to, cust_etc_mon_amt_to),
                    cust_etc_type        = COALESCE(@cust_etc_type, cust_etc_type),
                    cust_movein_yn       = COALESCE(@cust_movein_yn, cust_movein_yn),
                    cust_move_date_fr    = COALESCE(@cust_move_date_fr, cust_move_date_fr),
                    cust_move_date_to    = COALESCE(@cust_move_date_to, cust_move_date_to),
                    cust_cash_ablt       = COALESCE(@cust_cash_ablt, cust_cash_ablt),
                    cust_rmk             = COALESCE(@cust_rmk, cust_rmk),
                    cust_bld_nm          = COALESCE(@cust_bld_nm, cust_bld_nm),
                    cust_bjd_code        = COALESCE(@cust_bjd_code, cust_bjd_code),
                    cust_danji_code      = COALESCE(@cust_danji_code, cust_danji_code),
                    cust_room_cnt        = COALESCE(@cust_room_cnt, cust_room_cnt),
                    cust_bath_cnt        = COALESCE(@cust_bath_cnt, cust_bath_cnt),
                    cust_park_cnt        = COALESCE(@cust_park_cnt, cust_park_cnt),
                    cust_child_yn        = COALESCE(@cust_child_yn, cust_child_yn),
                    cust_pet_yn          = COALESCE(@cust_pet_yn, cust_pet_yn),
                    cust_community_fac   = COALESCE(@cust_community_fac, cust_community_fac),
                    cust_feature_note    = COALESCE(@cust_feature_note, cust_feature_note),
                    p_pt_name            = COALESCE(@p_pt_name, p_pt_name),
                    p_pt_type            = COALESCE(@p_pt_type, p_pt_type),
                    p_sale_div           = COALESCE(@p_sale_div, p_sale_div),
                    p_sale_amt           = COALESCE(@p_sale_amt, p_sale_amt),
                    p_now_dep_amt        = COALESCE(@p_now_dep_amt, p_now_dep_amt),
                    p_now_mon_amt        = COALESCE(@p_now_mon_amt, p_now_mon_amt),
                    p_exc_area           = COALESCE(@p_exc_area, p_exc_area),
                    p_sup_area           = COALESCE(@p_sup_area, p_sup_area),
                    p_addr_full          = COALESCE(@p_addr_full, p_addr_full),
                    p_dong               = COALESCE(@p_dong, p_dong),
                    p_ho                 = COALESCE(@p_ho, p_ho),
                    p_floor1             = COALESCE(@p_floor1, p_floor1),
                    p_floor2             = COALESCE(@p_floor2, p_floor2),
                    p_floor_desc         = COALESCE(@p_floor_desc, p_floor_desc),
                    p_dir_std            = COALESCE(@p_dir_std, p_dir_std),
                    p_dir_base           = COALESCE(@p_dir_base, p_dir_base),
                    p_sub_type           = COALESCE(@p_sub_type, p_sub_type),
                    p_balc_ext           = COALESCE(@p_balc_ext, p_balc_ext),
                    p_room_cnt           = COALESCE(@p_room_cnt, p_room_cnt),
                    p_bath_cnt           = COALESCE(@p_bath_cnt, p_bath_cnt),
                    p_pk_cnt             = COALESCE(@p_pk_cnt, p_pk_cnt),
                    p_maint_cost         = COALESCE(@p_maint_cost, p_maint_cost),
                    p_heat_method        = COALESCE(@p_heat_method, p_heat_method),
                    p_heat_fuel          = COALESCE(@p_heat_fuel, p_heat_fuel),
                    p_heat_system        = COALESCE(@p_heat_system, p_heat_system),
                    p_buid_struct        = COALESCE(@p_buid_struct, p_buid_struct),
                    immediate_movein_yn  = COALESCE(@immediate_movein_yn, immediate_movein_yn),
                    p_expt_date          = COALESCE(@p_expt_date, p_expt_date),
                    p_prg_sts            = COALESCE(@p_prg_sts, p_prg_sts),
                    p_opt                = COALESCE(@p_opt, p_opt),
                    p_pt_expl            = COALESCE(@p_pt_expl, p_pt_expl),
                    p_comp_year          = COALESCE(@p_comp_year, p_comp_year),
                    owner_rent_bsn_yn    = COALESCE(@owner_rent_bsn_yn, owner_rent_bsn_yn),
                    trade_status         = COALESCE(@trade_status, trade_status),
                    p_addr1              = COALESCE(@p_addr1, p_addr1),
                    p_addr2              = COALESCE(@p_addr2, p_addr2),
                    p_addr3              = COALESCE(@p_addr3, p_addr3),
                    p_addr4              = COALESCE(@p_addr4, p_addr4),
                    p_addr5              = COALESCE(@p_addr5, p_addr5),
                    p_bjd_code           = COALESCE(@p_bjd_code, p_bjd_code),
                    p_danji_code         = COALESCE(@p_danji_code, p_danji_code),
                    p_apt_typ            = COALESCE(@p_apt_typ, p_apt_typ),
                    p_land_share         = COALESCE(@p_land_share, p_land_share),
                    p_current_status     = COALESCE(@p_current_status, p_current_status),
                    p_les_amt            = COALESCE(@p_les_amt, p_les_amt),
                    p_maturity_date      = COALESCE(@p_maturity_date, p_maturity_date),
                    p_bond_max_amt       = COALESCE(@p_bond_max_amt, p_bond_max_amt),
                    p_loan_amt           = COALESCE(@p_loan_amt, p_loan_amt),
                    p_loan_amt_aft       = COALESCE(@p_loan_amt_aft, p_loan_amt_aft),
                    p_contract_renewal_right = COALESCE(@p_contract_renewal_right, p_contract_renewal_right),
                    p_maint_dtl          = COALESCE(@p_maint_dtl, p_maint_dtl),
                    p_house_cnt          = COALESCE(@p_house_cnt, p_house_cnt),
                    p_entr_struct        = COALESCE(@p_entr_struct, p_entr_struct),
                    p_access_road            = COALESCE(@p_access_road, p_access_road),
                    p_add_contrib_amt        = COALESCE(@p_add_contrib_amt, p_add_contrib_amt),
                    p_basement_floor         = COALESCE(@p_basement_floor, p_basement_floor),
                    p_building_area          = COALESCE(@p_building_area, p_building_area),
                    p_building_form          = COALESCE(@p_building_form, p_building_form),
                    p_building_use           = COALESCE(@p_building_use, p_building_use),
                    p_business_name          = COALESCE(@p_business_name, p_business_name),
                    p_business_type          = COALESCE(@p_business_type, p_business_type),
                    p_child_cond             = COALESCE(@p_child_cond, p_child_cond),
                    p_child_yn               = COALESCE(@p_child_yn, p_child_yn),
                    p_community_facility     = COALESCE(@p_community_facility, p_community_facility),
                    p_elevator_cnt           = COALESCE(@p_elevator_cnt, p_elevator_cnt),
                    p_etc_dep_amt            = COALESCE(@p_etc_dep_amt, p_etc_dep_amt),
                    p_etc_mon_amt            = COALESCE(@p_etc_mon_amt, p_etc_mon_amt),
                    p_exp_etc_m              = COALESCE(@p_exp_etc_m, p_exp_etc_m),
                    p_exp_etc_y              = COALESCE(@p_exp_etc_y, p_exp_etc_y),
                    p_exp_labor_m            = COALESCE(@p_exp_labor_m, p_exp_labor_m),
                    p_exp_labor_y            = COALESCE(@p_exp_labor_y, p_exp_labor_y),
                    p_exp_loan_m             = COALESCE(@p_exp_loan_m, p_exp_loan_m),
                    p_exp_loan_y             = COALESCE(@p_exp_loan_y, p_exp_loan_y),
                    p_exp_util_m             = COALESCE(@p_exp_util_m, p_exp_util_m),
                    p_exp_util_y             = COALESCE(@p_exp_util_y, p_exp_util_y),
                    p_expansion_amt          = COALESCE(@p_expansion_amt, p_expansion_amt),
                    p_facility_cost          = COALESCE(@p_facility_cost, p_facility_cost),
                    p_ground_floor           = COALESCE(@p_ground_floor, p_ground_floor),
                    p_guest_room_cnt         = COALESCE(@p_guest_room_cnt, p_guest_room_cnt),
                    p_inc_etc_m              = COALESCE(@p_inc_etc_m, p_inc_etc_m),
                    p_inc_etc_y              = COALESCE(@p_inc_etc_y, p_inc_etc_y),
                    p_inc_mgmt_m             = COALESCE(@p_inc_mgmt_m, p_inc_mgmt_m),
                    p_inc_mgmt_y             = COALESCE(@p_inc_mgmt_y, p_inc_mgmt_y),
                    p_inc_rent_m             = COALESCE(@p_inc_rent_m, p_inc_rent_m),
                    p_inc_rent_y             = COALESCE(@p_inc_rent_y, p_inc_rent_y),
                    p_land_area              = COALESCE(@p_land_area, p_land_area),
                    p_land_category          = COALESCE(@p_land_category, p_land_category),
                    p_land_share_ratio       = COALESCE(@p_land_share_ratio, p_land_share_ratio),
                    p_land_use               = COALESCE(@p_land_use, p_land_use),
                    p_lay_amt                = COALESCE(@p_lay_amt, p_lay_amt),
                    p_moving_cost            = COALESCE(@p_moving_cost, p_moving_cost),
                    p_option_amt             = COALESCE(@p_option_amt, p_option_amt),
                    p_other_restrictions     = COALESCE(@p_other_restrictions, p_other_restrictions),
                    p_pet_allow              = COALESCE(@p_pet_allow, p_pet_allow),
                    p_premium_amt            = COALESCE(@p_premium_amt, p_premium_amt),
                    p_presale_amt            = COALESCE(@p_presale_amt, p_presale_amt),
                    p_right_value_amt        = COALESCE(@p_right_value_amt, p_right_value_amt),
                    p_road_info              = COALESCE(@p_road_info, p_road_info),
                    p_stair_cnt              = COALESCE(@p_stair_cnt, p_stair_cnt),
                    p_toilet                 = COALESCE(@p_toilet, p_toilet),
                    p_total_floor_area       = COALESCE(@p_total_floor_area, p_total_floor_area),
                    p_zone_adjust            = COALESCE(@p_zone_adjust, p_zone_adjust),
                    p_zone_land_permit       = COALESCE(@p_zone_land_permit, p_zone_land_permit),
                    p_zone_overheat          = COALESCE(@p_zone_overheat, p_zone_overheat),
                    p_zone_spec              = COALESCE(@p_zone_spec, p_zone_spec),
                    cust_access_road         = COALESCE(@cust_access_road, cust_access_road),
                    cust_balc_ext            = COALESCE(@cust_balc_ext, cust_balc_ext),
                    cust_biz_type            = COALESCE(@cust_biz_type, cust_biz_type),
                    cust_build_permit_pref   = COALESCE(@cust_build_permit_pref, cust_build_permit_pref),
                    cust_building_form       = COALESCE(@cust_building_form, cust_building_form),
                    cust_building_use        = COALESCE(@cust_building_use, cust_building_use),
                    cust_child_cond          = COALESCE(@cust_child_cond, cust_child_cond),
                    cust_city_gas_yn         = COALESCE(@cust_city_gas_yn, cust_city_gas_yn),
                    cust_elec_capacity       = COALESCE(@cust_elec_capacity, cust_elec_capacity),
                    cust_elevator_cnt        = COALESCE(@cust_elevator_cnt, cust_elevator_cnt),
                    cust_entr_struct         = COALESCE(@cust_entr_struct, cust_entr_struct),
                    cust_land_category       = COALESCE(@cust_land_category, cust_land_category),
                    cust_land_use            = COALESCE(@cust_land_use, cust_land_use),
                    cust_opt                 = COALESCE(@cust_opt, cust_opt),
                    cust_pet_allow           = COALESCE(@cust_pet_allow, cust_pet_allow),
                    cust_stair_cnt           = COALESCE(@cust_stair_cnt, cust_stair_cnt),
                    charge_name              = COALESCE(@charge_name, charge_name)
                WHERE trade_id = @trade_id
                RETURNING *, 1::BIGINT AS total_count;";

            var parameters = new List<NpgsqlParameter>
            {
                P("@trade_id",            NpgsqlDbType.Bigint,      tradeId),
                P("@p_access_road",           NpgsqlDbType.Varchar,  dto.PAccessRoad),
                P("@p_add_contrib_amt",       NpgsqlDbType.Numeric,  dto.PAddContribAmt),
                P("@p_basement_floor",        NpgsqlDbType.Integer,  dto.PBasementFloor),
                P("@p_building_area",         NpgsqlDbType.Numeric,  dto.PBuildingArea),
                P("@p_building_form",         NpgsqlDbType.Varchar,  dto.PBuildingForm),
                P("@p_building_use",          NpgsqlDbType.Varchar,  dto.PBuildingUse),
                P("@p_business_name",         NpgsqlDbType.Varchar,  dto.PBusinessName),
                P("@p_business_type",         NpgsqlDbType.Varchar,  dto.PBusinessType),
                P("@p_child_cond",            NpgsqlDbType.Varchar,  dto.PChildCond),
                P("@p_child_yn",              NpgsqlDbType.Varchar,  dto.PChildYn),
                P("@p_community_facility",    NpgsqlDbType.Varchar,  dto.PCommunityFacility),
                P("@p_elevator_cnt",          NpgsqlDbType.Integer,  dto.PElevatorCnt),
                P("@p_etc_dep_amt",           NpgsqlDbType.Numeric,  dto.PEtcDepAmt),
                P("@p_etc_mon_amt",           NpgsqlDbType.Numeric,  dto.PEtcMonAmt),
                P("@p_exp_etc_m",             NpgsqlDbType.Numeric,  dto.PExpEtcM),
                P("@p_exp_etc_y",             NpgsqlDbType.Numeric,  dto.PExpEtcY),
                P("@p_exp_labor_m",           NpgsqlDbType.Numeric,  dto.PExpLaborM),
                P("@p_exp_labor_y",           NpgsqlDbType.Numeric,  dto.PExpLaborY),
                P("@p_exp_loan_m",            NpgsqlDbType.Numeric,  dto.PExpLoanM),
                P("@p_exp_loan_y",            NpgsqlDbType.Numeric,  dto.PExpLoanY),
                P("@p_exp_util_m",            NpgsqlDbType.Numeric,  dto.PExpUtilM),
                P("@p_exp_util_y",            NpgsqlDbType.Numeric,  dto.PExpUtilY),
                P("@p_expansion_amt",         NpgsqlDbType.Numeric,  dto.PExpansionAmt),
                P("@p_facility_cost",         NpgsqlDbType.Numeric,  dto.PFacilityCost),
                P("@p_ground_floor",          NpgsqlDbType.Integer,  dto.PGroundFloor),
                P("@p_guest_room_cnt",        NpgsqlDbType.Integer,  dto.PGuestRoomCnt),
                P("@p_inc_etc_m",             NpgsqlDbType.Numeric,  dto.PIncEtcM),
                P("@p_inc_etc_y",             NpgsqlDbType.Numeric,  dto.PIncEtcY),
                P("@p_inc_mgmt_m",            NpgsqlDbType.Numeric,  dto.PIncMgmtM),
                P("@p_inc_mgmt_y",            NpgsqlDbType.Numeric,  dto.PIncMgmtY),
                P("@p_inc_rent_m",            NpgsqlDbType.Numeric,  dto.PIncRentM),
                P("@p_inc_rent_y",            NpgsqlDbType.Numeric,  dto.PIncRentY),
                P("@p_land_area",             NpgsqlDbType.Numeric,  dto.PLandArea),
                P("@p_land_category",         NpgsqlDbType.Varchar,  dto.PLandCategory),
                P("@p_land_share_ratio",      NpgsqlDbType.Numeric,  dto.PLandShareRatio),
                P("@p_land_use",              NpgsqlDbType.Varchar,  dto.PLandUse),
                P("@p_lay_amt",               NpgsqlDbType.Numeric,  dto.PLayAmt),
                P("@p_moving_cost",           NpgsqlDbType.Numeric,  dto.PMovingCost),
                P("@p_option_amt",            NpgsqlDbType.Numeric,  dto.POptionAmt),
                P("@p_other_restrictions",    NpgsqlDbType.Varchar,  dto.POtherRestrictions),
                P("@p_pet_allow",             NpgsqlDbType.Varchar,  dto.PPetAllow),
                P("@p_premium_amt",           NpgsqlDbType.Numeric,  dto.PPremiumAmt),
                P("@p_presale_amt",           NpgsqlDbType.Numeric,  dto.PPresaleAmt),
                P("@p_right_value_amt",       NpgsqlDbType.Numeric,  dto.PRightValueAmt),
                P("@p_road_info",             NpgsqlDbType.Varchar,  dto.PRoadInfo),
                P("@p_stair_cnt",             NpgsqlDbType.Integer,  dto.PStairCnt),
                P("@p_toilet",                NpgsqlDbType.Varchar,  dto.PToilet),
                P("@p_total_floor_area",      NpgsqlDbType.Numeric,  dto.PTotalFloorArea),
                P("@p_zone_adjust",           NpgsqlDbType.Boolean,  dto.PZoneAdjust),
                P("@p_zone_land_permit",      NpgsqlDbType.Boolean,  dto.PZoneLandPermit),
                P("@p_zone_overheat",         NpgsqlDbType.Boolean,  dto.PZoneOverheat),
                P("@p_zone_spec",             NpgsqlDbType.Boolean,  dto.PZoneSpec),
                P("@cust_access_road",        NpgsqlDbType.Varchar,  dto.CustAccessRoad),
                P("@cust_balc_ext",           NpgsqlDbType.Varchar,  dto.CustBalcExt),
                P("@cust_biz_type",           NpgsqlDbType.Varchar,  dto.CustBizType),
                P("@cust_build_permit_pref",  NpgsqlDbType.Varchar,  dto.CustBuildPermitPref),
                P("@cust_building_form",      NpgsqlDbType.Varchar,  dto.CustBuildingForm),
                P("@cust_building_use",       NpgsqlDbType.Varchar,  dto.CustBuildingUse),
                P("@cust_child_cond",         NpgsqlDbType.Varchar,  dto.CustChildCond),
                P("@cust_city_gas_yn",        NpgsqlDbType.Varchar,  dto.CustCityGasYn),
                P("@cust_elec_capacity",      NpgsqlDbType.Varchar,  dto.CustElecCapacity),
                P("@cust_elevator_cnt",       NpgsqlDbType.Integer,  dto.CustElevatorCnt),
                P("@cust_entr_struct",        NpgsqlDbType.Varchar,  dto.CustEntrStruct),
                P("@cust_land_category",      NpgsqlDbType.Varchar,  dto.CustLandCategory),
                P("@cust_land_use",           NpgsqlDbType.Varchar,  dto.CustLandUse),
                P("@cust_opt",                NpgsqlDbType.Text,     dto.CustOpt),
                P("@cust_pet_allow",          NpgsqlDbType.Varchar,  dto.CustPetAllow),
                P("@cust_stair_cnt",          NpgsqlDbType.Integer,  dto.CustStairCnt),
                P("@charge_name",             NpgsqlDbType.Varchar,  dto.ChargeName),
                P("@trade_div",           NpgsqlDbType.Varchar,     dto.TradeDiv),
                P("@cust_no",             NpgsqlDbType.Varchar,     dto.CustNo),
                P("@pt_no",               NpgsqlDbType.Varchar,     dto.PtNo),
                P("@off_no",              NpgsqlDbType.Varchar,     dto.OffNo),
                P("@is_cust_registered",  NpgsqlDbType.Boolean,     dto.IsCustRegistered),
                P("@is_pt_registered",    NpgsqlDbType.Boolean,     dto.IsPtRegistered),
                P("@trade_state",         NpgsqlDbType.Varchar,     dto.TradeState),
                P("@trade_state_desc",    NpgsqlDbType.Varchar,     dto.TradeStateDesc),
                P("@co_brokerage_title",  NpgsqlDbType.Varchar,     dto.CoBrokerageTitle),
                P("@co_brokerage_content",NpgsqlDbType.Text,        dto.CoBrokerageContent),
                P("@co_brokerage_memo",   NpgsqlDbType.Text,        dto.CoBrokerageMemo),
                P("@cust_type",           NpgsqlDbType.Varchar,     dto.CustType),
                P("@cust_name",           NpgsqlDbType.Varchar,     dto.CustName),
                P("@cust_alias",          NpgsqlDbType.Varchar,     dto.CustAlias),
                P("@cust_tel",            NpgsqlDbType.Varchar,     dto.CustTel),
                P("@cust_addr",           NpgsqlDbType.Varchar,     dto.CustAddr),
                P("@cust_memo",           NpgsqlDbType.Text,        dto.CustMemo),
                P("@cust_rent_bsn_yn",    NpgsqlDbType.Varchar,     C(dto.CustRentBsnYn)),
                P("@cust_trd_prg",        NpgsqlDbType.Varchar,     dto.CustTrdPrg),
                P("@cust_want_type",      NpgsqlDbType.Varchar,     dto.CustWantType),
                P("@cust_exc_area_fr",    NpgsqlDbType.Numeric,     dto.CustExcAreaFr),
                P("@cust_exc_area_to",    NpgsqlDbType.Numeric,     dto.CustExcAreaTo),
                P("@cust_region1",        NpgsqlDbType.Varchar,     dto.CustRegion1),
                P("@cust_region2",        NpgsqlDbType.Varchar,     dto.CustRegion2),
                P("@cust_region3",        NpgsqlDbType.Varchar,     dto.CustRegion3),
                P("@cust_trd_type",       NpgsqlDbType.Varchar,     dto.CustTrdType),
                P("@cust_trd_type_detail",NpgsqlDbType.Varchar,     dto.CustTrdTypeDetail),
                P("@cust_sale_amt_fr",    NpgsqlDbType.Numeric,     dto.CustSaleAmtFr),
                P("@cust_sale_amt_to",    NpgsqlDbType.Numeric,     dto.CustSaleAmtTo),
                P("@cust_les_amt_fr",     NpgsqlDbType.Numeric,     dto.CustLesAmtFr),
                P("@cust_les_amt_to",     NpgsqlDbType.Numeric,     dto.CustLesAmtTo),
                P("@cust_prot_amt_fr",    NpgsqlDbType.Numeric,     dto.CustProtAmtFr),
                P("@cust_prot_amt_to",    NpgsqlDbType.Numeric,     dto.CustProtAmtTo),
                P("@cust_mon_amt_fr",     NpgsqlDbType.Numeric,     dto.CustMonAmtFr),
                P("@cust_mon_amt_to",     NpgsqlDbType.Numeric,     dto.CustMonAmtTo),
                P("@cust_etc_prot_amt_fr",NpgsqlDbType.Numeric,     dto.CustEtcProtAmtFr),
                P("@cust_etc_prot_amt_to",NpgsqlDbType.Numeric,     dto.CustEtcProtAmtTo),
                P("@cust_etc_mon_amt_fr", NpgsqlDbType.Numeric,     dto.CustEtcMonAmtFr),
                P("@cust_etc_mon_amt_to", NpgsqlDbType.Numeric,     dto.CustEtcMonAmtTo),
                P("@cust_etc_type",       NpgsqlDbType.Varchar,     dto.CustEtcType),
                P("@cust_movein_yn",      NpgsqlDbType.Varchar,     C(dto.CustMoveinYn)),
                P("@cust_move_date_fr",   NpgsqlDbType.Date,        dto.CustMoveDateFr),
                P("@cust_move_date_to",   NpgsqlDbType.Date,        dto.CustMoveDateTo),
                P("@cust_cash_ablt",      NpgsqlDbType.Numeric,     dto.CustCashAblt),
                P("@cust_rmk",            NpgsqlDbType.Text,        dto.CustRmk),
                P("@cust_bld_nm",         NpgsqlDbType.Varchar,     dto.CustBldNm),
                P("@cust_bjd_code",       NpgsqlDbType.Varchar,     dto.CustBjdCode),
                P("@cust_danji_code",     NpgsqlDbType.Varchar,     dto.CustDanjiCode),
                P("@cust_room_cnt",       NpgsqlDbType.Integer,     dto.CustRoomCnt),
                P("@cust_bath_cnt",       NpgsqlDbType.Integer,     dto.CustBathCnt),
                P("@cust_park_cnt",       NpgsqlDbType.Integer,     dto.CustParkCnt),
                P("@cust_child_yn",       NpgsqlDbType.Varchar,     C(dto.CustChildYn)),
                P("@cust_pet_yn",         NpgsqlDbType.Varchar,     C(dto.CustPetYn)),
                P("@cust_community_fac",  NpgsqlDbType.Varchar,     dto.CustCommunityFac),
                P("@cust_feature_note",   NpgsqlDbType.Text,        dto.CustFeatureNote),
                P("@p_pt_name",           NpgsqlDbType.Varchar,     dto.PPtName),
                P("@p_pt_type",           NpgsqlDbType.Varchar,     dto.PPtType),
                P("@p_sale_div",          NpgsqlDbType.Varchar,     dto.PSaleDiv),
                P("@p_sale_amt",          NpgsqlDbType.Numeric,     dto.PSaleAmt),
                P("@p_now_dep_amt",       NpgsqlDbType.Numeric,     dto.PNowDepAmt),
                P("@p_now_mon_amt",       NpgsqlDbType.Numeric,     dto.PNowMonAmt),
                P("@p_exc_area",          NpgsqlDbType.Numeric,     dto.PExcArea),
                P("@p_sup_area",          NpgsqlDbType.Numeric,     dto.PSupArea),
                P("@p_addr_full",         NpgsqlDbType.Varchar,     dto.PAddrFull),
                P("@p_dong",              NpgsqlDbType.Varchar,     dto.PDong),
                P("@p_ho",                NpgsqlDbType.Varchar,     dto.PHo),
                P("@p_floor1",            NpgsqlDbType.Integer,     dto.PFloor1),
                P("@p_floor2",            NpgsqlDbType.Integer,     dto.PFloor2),
                P("@p_floor_desc",        NpgsqlDbType.Varchar,     dto.PFloorDesc),
                P("@p_dir_std",           NpgsqlDbType.Varchar,     dto.PDirStd),
                P("@p_dir_base",          NpgsqlDbType.Varchar,     dto.PDirBase),
                P("@p_sub_type",          NpgsqlDbType.Varchar,     dto.PSubType),
                P("@p_balc_ext",          NpgsqlDbType.Varchar,     dto.PBalcExt),
                P("@p_room_cnt",          NpgsqlDbType.Integer,     dto.PRoomCnt),
                P("@p_bath_cnt",          NpgsqlDbType.Integer,     dto.PBathCnt),
                P("@p_pk_cnt",            NpgsqlDbType.Numeric,     dto.PPkCnt),
                P("@p_maint_cost",        NpgsqlDbType.Numeric,     dto.PMaintCost),
                P("@p_heat_method",       NpgsqlDbType.Varchar,     dto.PHeatMethod),
                P("@p_heat_fuel",         NpgsqlDbType.Varchar,     dto.PHeatFuel),
                P("@p_heat_system",       NpgsqlDbType.Varchar,     dto.PHeatSystem),
                P("@p_buid_struct",       NpgsqlDbType.Varchar,     dto.PBuidStruct),
                P("@immediate_movein_yn", NpgsqlDbType.Varchar,     C(dto.ImmediateMoveinYn)),
                P("@p_expt_date",         NpgsqlDbType.Date,        dto.PExptDate),
                P("@p_prg_sts",           NpgsqlDbType.Varchar,     dto.PPrgSts),
                P("@p_opt",               NpgsqlDbType.Text,        dto.POpt),
                P("@p_pt_expl",           NpgsqlDbType.Text,        dto.PPtExpl),
                P("@p_comp_year",         NpgsqlDbType.Varchar,     Y4(dto.PCompYear)),
                P("@owner_rent_bsn_yn",   NpgsqlDbType.Varchar,     C(dto.OwnerRentBsnYn)),
                P("@trade_status",        NpgsqlDbType.Varchar,     dto.TradeStatus),
                P("@p_addr1",             NpgsqlDbType.Varchar,     dto.PAddr1),
                P("@p_addr2",             NpgsqlDbType.Varchar,     dto.PAddr2),
                P("@p_addr3",             NpgsqlDbType.Varchar,     dto.PAddr3),
                P("@p_addr4",             NpgsqlDbType.Varchar,     dto.PAddr4),
                P("@p_addr5",             NpgsqlDbType.Varchar,     dto.PAddr5),
                P("@p_bjd_code",          NpgsqlDbType.Varchar,     dto.PBjdCode),
                P("@p_danji_code",        NpgsqlDbType.Varchar,     dto.PDanjiCode),
                P("@p_apt_typ",           NpgsqlDbType.Varchar,     dto.PAptTyp),
                P("@p_land_share",        NpgsqlDbType.Numeric,     dto.PLandShare),
                P("@p_current_status",    NpgsqlDbType.Varchar,     dto.PCurrentStatus),
                P("@p_les_amt",           NpgsqlDbType.Numeric,     dto.PLesAmt),
                P("@p_maturity_date",     NpgsqlDbType.Date,        dto.PMaturityDate),
                P("@p_bond_max_amt",      NpgsqlDbType.Numeric,     dto.PBondMaxAmt),
                P("@p_loan_amt",          NpgsqlDbType.Numeric,     dto.PLoanAmt),
                P("@p_loan_amt_aft",      NpgsqlDbType.Numeric,     dto.PLoanAmtAft),
                P("@p_contract_renewal_right", NpgsqlDbType.Varchar, dto.PContractRenewalRight),
                P("@p_maint_dtl",         NpgsqlDbType.Varchar,     dto.PMaintDtl),
                P("@p_house_cnt",         NpgsqlDbType.Integer,     dto.PHouseCnt),
                P("@p_entr_struct",       NpgsqlDbType.Varchar,     dto.PEntrStruct)
            };

            var result = await _dataService.QueryAsyncPg<TradeInfo>("DEV", sql, parameters);
            return result?.FirstOrDefault();
        }

        /// <summary>
        /// 공동중개망 삭제 (논리 삭제) - 직접쿼리
        /// </summary>
        public async Task<bool> DeleteTradeInfo(long tradeId)
        {
            const string sql = @"
                UPDATE public.rt_trade_info
                SET trade_status = 'N', upd_dt = NOW()
                WHERE trade_id = @trade_id;";

            var parameters = new List<NpgsqlParameter>
            {
                P("@trade_id", NpgsqlDbType.Bigint, tradeId)
            };

            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        // ==================== 주거래지역 ====================

        /// <summary>
        /// 주거래지역 목록 조회 (개인 rt_no 기준, off_no 병행 보관)
        /// </summary>
        public async Task<List<MainRegion>> GetMainRegions(string? offNo, string? rtNo)
        {
            const string sql = @"
                SELECT region_id  AS ""RegionId"",
                       off_no      AS ""OffNo"",
                       rt_no       AS ""RtNo"",
                       bjd_code    AS ""BjdCode"",
                       region_name AS ""RegionName"",
                       reg_dt      AS ""RegDt"",
                       reg_id      AS ""RegId""
                FROM public.rt_main_region
                WHERE (@rt_no  IS NULL OR rt_no  = @rt_no)
                  AND (@off_no IS NULL OR off_no = @off_no)
                ORDER BY reg_dt DESC, region_id DESC;";

            var parameters = new List<NpgsqlParameter>
            {
                P("@rt_no",  NpgsqlDbType.Varchar, rtNo),
                P("@off_no", NpgsqlDbType.Bigint,  string.IsNullOrWhiteSpace(offNo) ? (object?)null : long.Parse(offNo))
            };

            var items = await _dataService.QueryAsyncPg<MainRegion>("DEV", sql, parameters);
            return items ?? new List<MainRegion>();
        }

        /// <summary>
        /// 주거래지역 추가 (off_no + rt_no + bjd_code 유니크, 중복 무시)
        /// </summary>
        public async Task<MainRegion?> InsertMainRegion(MainRegionCreateDto dto)
        {
            const string sql = @"
                INSERT INTO public.rt_main_region (off_no, rt_no, bjd_code, region_name, reg_id)
                VALUES (@off_no, @rt_no, @bjd_code, @region_name, @reg_id)
                ON CONFLICT (off_no, rt_no, bjd_code) DO UPDATE SET region_name = EXCLUDED.region_name
                RETURNING region_id  AS ""RegionId"",
                          off_no      AS ""OffNo"",
                          rt_no       AS ""RtNo"",
                          bjd_code    AS ""BjdCode"",
                          region_name AS ""RegionName"",
                          reg_dt      AS ""RegDt"",
                          reg_id      AS ""RegId"";";

            var parameters = new List<NpgsqlParameter>
            {
                P("@off_no",      NpgsqlDbType.Bigint,  dto.OffNo),
                P("@rt_no",       NpgsqlDbType.Varchar, dto.RtNo),
                P("@bjd_code",    NpgsqlDbType.Varchar, dto.BjdCode),
                P("@region_name", NpgsqlDbType.Varchar, dto.RegionName),
                P("@reg_id",      NpgsqlDbType.Varchar, dto.RegId)
            };

            var items = await _dataService.QueryAsyncPg<MainRegion>("DEV", sql, parameters);
            return items?.FirstOrDefault();
        }

        /// <summary>
        /// 주거래지역 삭제
        /// </summary>
        public async Task<bool> DeleteMainRegion(long regionId)
        {
            const string sql = @"DELETE FROM public.rt_main_region WHERE region_id = @region_id;";
            var parameters = new List<NpgsqlParameter>
            {
                P("@region_id", NpgsqlDbType.Bigint, regionId)
            };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        // ==================== 쪽지 ====================

        /// <summary>
        /// 쪽지 목록 조회 (box: all=전체 / received=받은쪽지 / sent=보낸쪽지)
        /// </summary>
        public async Task<List<Note>> GetNotes(string userId, string box, string? regDtFr = null, string? regDtTo = null, string? keyword = null, string? bizKeyword = null)
        {
            string where;
            switch ((box ?? "all").ToLower())
            {
                case "received":
                    where = @"(receiver_id = @uid AND receiver_del = 'N')";
                    break;
                case "sent":
                    where = @"(sender_id = @uid AND sender_del = 'N')";
                    break;
                default: // all
                    where = @"((receiver_id = @uid AND receiver_del = 'N') OR (sender_id = @uid AND sender_del = 'N'))";
                    break;
            }

            var sql = $@"
                SELECT note_id       AS ""NoteId"",
                       sender_id     AS ""SenderId"",
                       sender_name   AS ""SenderName"",
                       receiver_id   AS ""ReceiverId"",
                       receiver_name AS ""ReceiverName"",
                       title         AS ""Title"",
                       content       AS ""Content"",
                       ref_trade_id  AS ""RefTradeId"",
                       is_read       AS ""IsRead"",
                       read_dt       AS ""ReadDt"",
                       reg_dt        AS ""RegDt""
                FROM public.rt_note
                WHERE {where}
                {NOTE_SEARCH_WHERE}
                ORDER BY reg_dt DESC, note_id DESC;";

            var parameters = new List<NpgsqlParameter> { P("@uid", NpgsqlDbType.Varchar, userId) };
            AddNoteSearchParams(parameters, regDtFr, regDtTo, keyword, bizKeyword);
            var items = await _dataService.QueryAsyncPg<Note>("DEV", sql, parameters);
            return items ?? new List<Note>();
        }

        // 쪽지 목록 공통 검색조건(기간/통합/상호) — reg_dt 범위 + 이름·제목·내용 ILIKE
        private const string NOTE_SEARCH_WHERE = @"
                  AND (@reg_dt_fr   IS NULL OR reg_dt >= @reg_dt_fr::timestamp)
                  AND (@reg_dt_to   IS NULL OR reg_dt <  (@reg_dt_to::date + 1))
                  AND (@keyword     IS NULL
                       OR sender_name   ILIKE '%' || @keyword || '%'
                       OR receiver_name ILIKE '%' || @keyword || '%'
                       OR title         ILIKE '%' || @keyword || '%'
                       OR content       ILIKE '%' || @keyword || '%')
                  AND (@biz_keyword IS NULL
                       OR sender_name   ILIKE '%' || @biz_keyword || '%'
                       OR receiver_name ILIKE '%' || @biz_keyword || '%')";

        private static void AddNoteSearchParams(List<NpgsqlParameter> p, string? regDtFr, string? regDtTo, string? keyword, string? bizKeyword)
        {
            p.Add(P("@reg_dt_fr",   NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(regDtFr)    ? null : regDtFr));
            p.Add(P("@reg_dt_to",   NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(regDtTo)    ? null : regDtTo));
            p.Add(P("@keyword",     NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(keyword)    ? null : keyword.Trim()));
            p.Add(P("@biz_keyword", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(bizKeyword) ? null : bizKeyword.Trim()));
        }

        /// <summary>
        /// 받은 쪽지 중 안읽음 개수
        /// </summary>
        public async Task<long> GetUnreadNoteCount(string userId)
        {
            const string sql = @"
                SELECT COUNT(*) AS ""Cnt""
                FROM public.rt_note
                WHERE receiver_id = @uid AND is_read = 'N' AND receiver_del = 'N';";
            var parameters = new List<NpgsqlParameter> { P("@uid", NpgsqlDbType.Varchar, userId) };
            var items = await _dataService.QueryAsyncPg<NoteCount>("DEV", sql, parameters);
            return items?.FirstOrDefault()?.Cnt ?? 0;
        }

        /// <summary>
        /// 쪽지 발송 (수신자 복수 → 각각 1행 삽입)
        /// </summary>
        public async Task<int> SendNote(NoteSendDto dto)
        {
            var receivers = (dto.ReceiverIds ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();
            if (receivers.Count == 0) return 0;

            const string sql = @"
                INSERT INTO public.rt_note (sender_id, sender_name, receiver_id, receiver_name, title, content, ref_trade_id)
                VALUES (@sender_id, @sender_name, @receiver_id, @receiver_name, @title, @content, @ref_trade_id);";

            int affected = 0;
            for (int i = 0; i < receivers.Count; i++)
            {
                string? rname = (dto.ReceiverNames != null && i < dto.ReceiverNames.Count) ? dto.ReceiverNames[i] : null;
                var parameters = new List<NpgsqlParameter>
                {
                    P("@sender_id",     NpgsqlDbType.Varchar, dto.SenderId),
                    P("@sender_name",   NpgsqlDbType.Varchar, dto.SenderName),
                    P("@receiver_id",   NpgsqlDbType.Varchar, receivers[i]),
                    P("@receiver_name", NpgsqlDbType.Varchar, rname),
                    P("@title",         NpgsqlDbType.Varchar, dto.Title),
                    P("@content",       NpgsqlDbType.Varchar, dto.Content),
                    P("@ref_trade_id",  NpgsqlDbType.Bigint,  dto.RefTradeId)
                };
                affected += await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            }

            // 실시간 알림: 각 수신자 그룹으로 푸시 (클라이언트는 안읽음 개수 재조회/토스트 처리)
            try
            {
                foreach (var rid in receivers)
                {
                    await _noteHub.Clients.Group(NoteHub.GroupName(rid)).SendAsync("noteReceived", new
                    {
                        senderId = dto.SenderId,
                        senderName = dto.SenderName,
                        title = dto.Title,
                        refTradeId = dto.RefTradeId
                    });
                }
            }
            catch { /* 알림 실패는 발송 자체를 막지 않음 */ }

            return affected;
        }

        /// <summary>
        /// 쪽지 읽음 처리
        /// </summary>
        public async Task<bool> MarkNoteRead(long noteId)
        {
            const string sql = @"
                UPDATE public.rt_note
                SET is_read = 'Y', read_dt = COALESCE(read_dt, NOW())
                WHERE note_id = @note_id;";
            var parameters = new List<NpgsqlParameter> { P("@note_id", NpgsqlDbType.Bigint, noteId) };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        /// <summary>
        /// 쪽지 삭제 (해당 사용자 쪽만 논리 삭제)
        /// </summary>
        public async Task<bool> DeleteNote(long noteId, string userId)
        {
            const string sql = @"
                UPDATE public.rt_note
                SET sender_del   = CASE WHEN sender_id   = @uid THEN 'Y' ELSE sender_del   END,
                    receiver_del = CASE WHEN receiver_id = @uid THEN 'Y' ELSE receiver_del END
                WHERE note_id = @note_id;";
            var parameters = new List<NpgsqlParameter>
            {
                P("@note_id", NpgsqlDbType.Bigint,  noteId),
                P("@uid",     NpgsqlDbType.Varchar, userId)
            };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        /// <summary>
        /// 사무소 대화목록 조회 — 사무소 소속 사용자(rt_realtor_info.OffNo)가 주고받은 쪽지 전체.
        /// 역할 판단 없이 전체를 내려주고 표시범위는 프론트에서 공개여부로 결정.
        /// </summary>
        public async Task<List<Note>> GetOfficeNotes(long offNo, string userId, string? regDtFr = null, string? regDtTo = null, string? keyword = null, string? bizKeyword = null)
        {
            const string sql = @"
                SELECT note_id       AS ""NoteId"",
                       sender_id     AS ""SenderId"",
                       sender_name   AS ""SenderName"",
                       receiver_id   AS ""ReceiverId"",
                       receiver_name AS ""ReceiverName"",
                       title         AS ""Title"",
                       content       AS ""Content"",
                       ref_trade_id  AS ""RefTradeId"",
                       is_read       AS ""IsRead"",
                       read_dt       AS ""ReadDt"",
                       reg_dt        AS ""RegDt""
                FROM public.rt_note
                WHERE ((sender_id   IN (SELECT r.""Id"" FROM rt_realtor_info r WHERE r.""OffNo"" = @off_no) AND sender_del   = 'N')
                    OR (receiver_id IN (SELECT r.""Id"" FROM rt_realtor_info r WHERE r.""OffNo"" = @off_no) AND receiver_del = 'N'))
                {NOTE_SEARCH_WHERE}
                ORDER BY reg_dt DESC, note_id DESC;";

            var parameters = new List<NpgsqlParameter> { P("@off_no", NpgsqlDbType.Bigint, offNo) };
            AddNoteSearchParams(parameters, regDtFr, regDtTo, keyword, bizKeyword);
            var items = await _dataService.QueryAsyncPg<Note>("DEV", sql, parameters);
            return items ?? new List<Note>();
        }

        /// <summary>
        /// 대화방 공개여부 목록 조회
        /// </summary>
        public async Task<List<NoteShare>> GetNoteShares(long offNo)
        {
            const string sql = @"
                SELECT owner_id   AS ""OwnerId"",
                       partner_id AS ""PartnerId"",
                       share      AS ""Share""
                FROM public.rt_note_share
                WHERE off_no = @off_no;";
            var parameters = new List<NpgsqlParameter> { P("@off_no", NpgsqlDbType.Bigint, offNo) };
            var items = await _dataService.QueryAsyncPg<NoteShare>("DEV", sql, parameters);
            return items ?? new List<NoteShare>();
        }

        /// <summary>
        /// 대화방 공개여부 설정(대표 전용) — upsert
        /// </summary>
        public async Task<bool> SetNoteShare(NoteShareSetDto dto)
        {
            const string sql = @"
                INSERT INTO public.rt_note_share (off_no, owner_id, partner_id, share, reg_dt, upd_dt)
                VALUES (@off_no, @owner_id, @partner_id, @share, now(), now())
                ON CONFLICT (off_no, owner_id, partner_id)
                DO UPDATE SET share = EXCLUDED.share, upd_dt = now();";
            var parameters = new List<NpgsqlParameter>
            {
                P("@off_no",     NpgsqlDbType.Bigint,  dto.OffNo),
                P("@owner_id",   NpgsqlDbType.Varchar, dto.OwnerId),
                P("@partner_id", NpgsqlDbType.Varchar, dto.PartnerId),
                P("@share",      NpgsqlDbType.Varchar, string.IsNullOrEmpty(dto.Share) ? "N" : dto.Share)
            };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        /// <summary>
        /// 사무소 전체 대화방 공개여부 일괄 설정(대표 전용)
        /// — 사무소 소속 구성원 간 모든 (owner, partner) 쌍에 대해 upsert.
        /// </summary>
        public async Task<int> SetAllNoteShare(NoteShareAllDto dto)
        {
            const string sql = @"
                INSERT INTO public.rt_note_share (off_no, owner_id, partner_id, share, reg_dt, upd_dt)
                SELECT @off_no, a.""Id"", b.""Id"", @share, now(), now()
                FROM rt_realtor_info a
                JOIN rt_realtor_info b ON a.""OffNo"" = b.""OffNo"" AND a.""Id"" <> b.""Id""
                WHERE a.""OffNo"" = @off_no
                ON CONFLICT (off_no, owner_id, partner_id)
                DO UPDATE SET share = EXCLUDED.share, upd_dt = now();";
            var parameters = new List<NpgsqlParameter>
            {
                P("@off_no", NpgsqlDbType.Bigint, dto.OffNo),
                P("@share",  NpgsqlDbType.Varchar, string.IsNullOrEmpty(dto.Share) ? "N" : dto.Share)
            };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
        }
    }

    // ==================== DTOs ====================

    public class TradeInfoCreateDto
    {
        [Required]
        public string TradeDiv { get; set; } = default!;  // CUST or PT

        public string? CustNo { get; set; }
        public string? PtNo { get; set; }

        [Required]
        public string OffNo { get; set; } = default!;

        public bool IsCustRegistered { get; set; }
        public bool IsPtRegistered { get; set; }

        public string? TradeState { get; set; }
        public string? TradeStateDesc { get; set; }

        // 공동중개 필드
        public string? CoBrokerageTitle { get; set; }
        public string? CoBrokerageContent { get; set; }
        public string? CoBrokerageMemo { get; set; }

        // 고객정보 필드
        public string? CustType { get; set; }
        public string? CustName { get; set; }
        public string? CustAlias { get; set; }
        public string? CustTel { get; set; }
        public string? CustAddr { get; set; }
        public string? CustMemo { get; set; }
        public char? CustRentBsnYn { get; set; }
        public string? CustTrdPrg { get; set; }
        public string? CustWantType { get; set; }
        public decimal? CustExcAreaFr { get; set; }
        public decimal? CustExcAreaTo { get; set; }
        public string? CustRegion1 { get; set; }
        public string? CustRegion2 { get; set; }
        public string? CustRegion3 { get; set; }
        public string? CustTrdType { get; set; }
        public string? CustTrdTypeDetail { get; set; }
        public decimal? CustSaleAmtFr { get; set; }
        public decimal? CustSaleAmtTo { get; set; }
        public decimal? CustLesAmtFr { get; set; }
        public decimal? CustLesAmtTo { get; set; }
        public decimal? CustProtAmtFr { get; set; }
        public decimal? CustProtAmtTo { get; set; }
        public decimal? CustMonAmtFr { get; set; }
        public decimal? CustMonAmtTo { get; set; }
        public decimal? CustEtcProtAmtFr { get; set; }
        public decimal? CustEtcProtAmtTo { get; set; }
        public decimal? CustEtcMonAmtFr { get; set; }
        public decimal? CustEtcMonAmtTo { get; set; }
        public string? CustEtcType { get; set; }
        public char? CustMoveinYn { get; set; }
        public DateTime? CustMoveDateFr { get; set; }
        public DateTime? CustMoveDateTo { get; set; }
        public decimal? CustCashAblt { get; set; }
        public string? CustRmk { get; set; }

        // 고객 중개정보 추가 필드
        public string? CustBldNm { get; set; }
        public string? CustBjdCode { get; set; }
        public string? CustDanjiCode { get; set; }
        public int? CustRoomCnt { get; set; }
        public int? CustBathCnt { get; set; }
        public int? CustParkCnt { get; set; }
        public char? CustChildYn { get; set; }
        public char? CustPetYn { get; set; }
        public string? CustCommunityFac { get; set; }
        public string? CustFeatureNote { get; set; }

        // 물건정보 필드
        public string? PPtName { get; set; }
        public string? PPtType { get; set; }
        public string? PSaleDiv { get; set; }
        public decimal? PSaleAmt { get; set; }
        public decimal? PNowDepAmt { get; set; }
        public decimal? PNowMonAmt { get; set; }
        public decimal? PExcArea { get; set; }
        public decimal? PSupArea { get; set; }
        public string? PAddrFull { get; set; }
        public string? PDong { get; set; }
        public string? PHo { get; set; }
        public int? PFloor1 { get; set; }
        public int? PFloor2 { get; set; }
        public string? PFloorDesc { get; set; }
        public string? PDirStd { get; set; }
        public string? PDirBase { get; set; }
        public string? PSubType { get; set; }
        public string? PBalcExt { get; set; }
        public int? PRoomCnt { get; set; }
        public int? PBathCnt { get; set; }
        public decimal? PPkCnt { get; set; }
        public decimal? PMaintCost { get; set; }
        public string? PHeatMethod { get; set; }
        public string? PHeatFuel { get; set; }
        public string? PHeatSystem { get; set; }
        public string? PBuidStruct { get; set; }
        public char? ImmediateMoveinYn { get; set; }
        public DateTime? PExptDate { get; set; }
        public string? PPrgSts { get; set; }
        public string? POpt { get; set; }
        public string? PPtExpl { get; set; }
        public string? PCompYear { get; set; }
        public char? OwnerRentBsnYn { get; set; }
        public string? TradeStatus { get; set; }

        // 소재지(주소) 구조화 필드
        public string? PAddr1 { get; set; }
        public string? PAddr2 { get; set; }
        public string? PAddr3 { get; set; }
        public string? PAddr4 { get; set; }
        public string? PAddr5 { get; set; }
        public string? PBjdCode { get; set; }
        public string? PDanjiCode { get; set; }

        // 중개정보 추가 필드
        public string? PAptTyp { get; set; }
        public decimal? PLandShare { get; set; }
        public string? PCurrentStatus { get; set; }
        public decimal? PLesAmt { get; set; }
        public DateTime? PMaturityDate { get; set; }
        public decimal? PBondMaxAmt { get; set; }
        public decimal? PLoanAmt { get; set; }
        public decimal? PLoanAmtAft { get; set; }
        public string? PContractRenewalRight { get; set; }
        public string? PMaintDtl { get; set; }
        public int? PHouseCnt { get; set; }
        public string? PEntrStruct { get; set; }

        // ===== 유형별(물건/고객) 전송 폼 추가 필드 =====
        public string? PAccessRoad { get; set; }
        public decimal? PAddContribAmt { get; set; }
        public int? PBasementFloor { get; set; }
        public decimal? PBuildingArea { get; set; }
        public string? PBuildingForm { get; set; }
        public string? PBuildingUse { get; set; }
        public string? PBusinessName { get; set; }
        public string? PBusinessType { get; set; }
        public string? PChildCond { get; set; }
        public string? PChildYn { get; set; }
        public string? PCommunityFacility { get; set; }
        public int? PElevatorCnt { get; set; }
        public decimal? PEtcDepAmt { get; set; }
        public decimal? PEtcMonAmt { get; set; }
        public decimal? PExpEtcM { get; set; }
        public decimal? PExpEtcY { get; set; }
        public decimal? PExpLaborM { get; set; }
        public decimal? PExpLaborY { get; set; }
        public decimal? PExpLoanM { get; set; }
        public decimal? PExpLoanY { get; set; }
        public decimal? PExpUtilM { get; set; }
        public decimal? PExpUtilY { get; set; }
        public decimal? PExpansionAmt { get; set; }
        public decimal? PFacilityCost { get; set; }
        public int? PGroundFloor { get; set; }
        public int? PGuestRoomCnt { get; set; }
        public decimal? PIncEtcM { get; set; }
        public decimal? PIncEtcY { get; set; }
        public decimal? PIncMgmtM { get; set; }
        public decimal? PIncMgmtY { get; set; }
        public decimal? PIncRentM { get; set; }
        public decimal? PIncRentY { get; set; }
        public decimal? PLandArea { get; set; }
        public string? PLandCategory { get; set; }
        public decimal? PLandShareRatio { get; set; }
        public string? PLandUse { get; set; }
        public decimal? PLayAmt { get; set; }
        public decimal? PMovingCost { get; set; }
        public decimal? POptionAmt { get; set; }
        public string? POtherRestrictions { get; set; }
        public string? PPetAllow { get; set; }
        public decimal? PPremiumAmt { get; set; }
        public decimal? PPresaleAmt { get; set; }
        public decimal? PRightValueAmt { get; set; }
        public string? PRoadInfo { get; set; }
        public int? PStairCnt { get; set; }
        public string? PToilet { get; set; }
        public decimal? PTotalFloorArea { get; set; }
        public bool? PZoneAdjust { get; set; }
        public bool? PZoneLandPermit { get; set; }
        public bool? PZoneOverheat { get; set; }
        public bool? PZoneSpec { get; set; }
        public string? CustAccessRoad { get; set; }
        public string? CustBalcExt { get; set; }
        public string? CustBizType { get; set; }
        public string? CustBuildPermitPref { get; set; }
        public string? CustBuildingForm { get; set; }
        public string? CustBuildingUse { get; set; }
        public string? CustChildCond { get; set; }
        public string? CustCityGasYn { get; set; }
        public string? CustElecCapacity { get; set; }
        public int? CustElevatorCnt { get; set; }
        public string? CustEntrStruct { get; set; }
        public string? CustLandCategory { get; set; }
        public string? CustLandUse { get; set; }
        public string? CustOpt { get; set; }
        public string? CustPetAllow { get; set; }
        public int? CustStairCnt { get; set; }
        public string? ChargeName { get; set; }
    }

    public class TradeInfoUpdateDto
    {
        public string? TradeDiv { get; set; }
        public string? CustNo { get; set; }
        public string? PtNo { get; set; }
        public string? OffNo { get; set; }
        public bool? IsCustRegistered { get; set; }
        public bool? IsPtRegistered { get; set; }
        public string? TradeState { get; set; }
        public string? TradeStateDesc { get; set; }

        // 공동중개 필드
        public string? CoBrokerageTitle { get; set; }
        public string? CoBrokerageContent { get; set; }
        public string? CoBrokerageMemo { get; set; }

        // 고객정보 필드
        public string? CustType { get; set; }
        public string? CustName { get; set; }
        public string? CustAlias { get; set; }
        public string? CustTel { get; set; }
        public string? CustAddr { get; set; }
        public string? CustMemo { get; set; }
        public char? CustRentBsnYn { get; set; }
        public string? CustTrdPrg { get; set; }
        public string? CustWantType { get; set; }
        public decimal? CustExcAreaFr { get; set; }
        public decimal? CustExcAreaTo { get; set; }
        public string? CustRegion1 { get; set; }
        public string? CustRegion2 { get; set; }
        public string? CustRegion3 { get; set; }
        public string? CustTrdType { get; set; }
        public string? CustTrdTypeDetail { get; set; }
        public decimal? CustSaleAmtFr { get; set; }
        public decimal? CustSaleAmtTo { get; set; }
        public decimal? CustLesAmtFr { get; set; }
        public decimal? CustLesAmtTo { get; set; }
        public decimal? CustProtAmtFr { get; set; }
        public decimal? CustProtAmtTo { get; set; }
        public decimal? CustMonAmtFr { get; set; }
        public decimal? CustMonAmtTo { get; set; }
        public decimal? CustEtcProtAmtFr { get; set; }
        public decimal? CustEtcProtAmtTo { get; set; }
        public decimal? CustEtcMonAmtFr { get; set; }
        public decimal? CustEtcMonAmtTo { get; set; }
        public string? CustEtcType { get; set; }
        public char? CustMoveinYn { get; set; }
        public DateTime? CustMoveDateFr { get; set; }
        public DateTime? CustMoveDateTo { get; set; }
        public decimal? CustCashAblt { get; set; }
        public string? CustRmk { get; set; }

        // 고객 중개정보 추가 필드
        public string? CustBldNm { get; set; }
        public string? CustBjdCode { get; set; }
        public string? CustDanjiCode { get; set; }
        public int? CustRoomCnt { get; set; }
        public int? CustBathCnt { get; set; }
        public int? CustParkCnt { get; set; }
        public char? CustChildYn { get; set; }
        public char? CustPetYn { get; set; }
        public string? CustCommunityFac { get; set; }
        public string? CustFeatureNote { get; set; }

        // 물건정보 필드
        public string? PPtName { get; set; }
        public string? PPtType { get; set; }
        public string? PSaleDiv { get; set; }
        public decimal? PSaleAmt { get; set; }
        public decimal? PNowDepAmt { get; set; }
        public decimal? PNowMonAmt { get; set; }
        public decimal? PExcArea { get; set; }
        public decimal? PSupArea { get; set; }
        public string? PAddrFull { get; set; }
        public string? PDong { get; set; }
        public string? PHo { get; set; }
        public int? PFloor1 { get; set; }
        public int? PFloor2 { get; set; }
        public string? PFloorDesc { get; set; }
        public string? PDirStd { get; set; }
        public string? PDirBase { get; set; }
        public string? PSubType { get; set; }
        public string? PBalcExt { get; set; }
        public int? PRoomCnt { get; set; }
        public int? PBathCnt { get; set; }
        public decimal? PPkCnt { get; set; }
        public decimal? PMaintCost { get; set; }
        public string? PHeatMethod { get; set; }
        public string? PHeatFuel { get; set; }
        public string? PHeatSystem { get; set; }
        public string? PBuidStruct { get; set; }
        public char? ImmediateMoveinYn { get; set; }
        public DateTime? PExptDate { get; set; }
        public string? PPrgSts { get; set; }
        public string? POpt { get; set; }
        public string? PPtExpl { get; set; }
        public string? PCompYear { get; set; }
        public char? OwnerRentBsnYn { get; set; }
        public string? TradeStatus { get; set; }

        // 소재지(주소) 구조화 필드
        public string? PAddr1 { get; set; }
        public string? PAddr2 { get; set; }
        public string? PAddr3 { get; set; }
        public string? PAddr4 { get; set; }
        public string? PAddr5 { get; set; }
        public string? PBjdCode { get; set; }
        public string? PDanjiCode { get; set; }

        // 중개정보 추가 필드
        public string? PAptTyp { get; set; }
        public decimal? PLandShare { get; set; }
        public string? PCurrentStatus { get; set; }
        public decimal? PLesAmt { get; set; }
        public DateTime? PMaturityDate { get; set; }
        public decimal? PBondMaxAmt { get; set; }
        public decimal? PLoanAmt { get; set; }
        public decimal? PLoanAmtAft { get; set; }
        public string? PContractRenewalRight { get; set; }
        public string? PMaintDtl { get; set; }
        public int? PHouseCnt { get; set; }
        public string? PEntrStruct { get; set; }

        // ===== 유형별(물건/고객) 전송 폼 추가 필드 =====
        public string? PAccessRoad { get; set; }
        public decimal? PAddContribAmt { get; set; }
        public int? PBasementFloor { get; set; }
        public decimal? PBuildingArea { get; set; }
        public string? PBuildingForm { get; set; }
        public string? PBuildingUse { get; set; }
        public string? PBusinessName { get; set; }
        public string? PBusinessType { get; set; }
        public string? PChildCond { get; set; }
        public string? PChildYn { get; set; }
        public string? PCommunityFacility { get; set; }
        public int? PElevatorCnt { get; set; }
        public decimal? PEtcDepAmt { get; set; }
        public decimal? PEtcMonAmt { get; set; }
        public decimal? PExpEtcM { get; set; }
        public decimal? PExpEtcY { get; set; }
        public decimal? PExpLaborM { get; set; }
        public decimal? PExpLaborY { get; set; }
        public decimal? PExpLoanM { get; set; }
        public decimal? PExpLoanY { get; set; }
        public decimal? PExpUtilM { get; set; }
        public decimal? PExpUtilY { get; set; }
        public decimal? PExpansionAmt { get; set; }
        public decimal? PFacilityCost { get; set; }
        public int? PGroundFloor { get; set; }
        public int? PGuestRoomCnt { get; set; }
        public decimal? PIncEtcM { get; set; }
        public decimal? PIncEtcY { get; set; }
        public decimal? PIncMgmtM { get; set; }
        public decimal? PIncMgmtY { get; set; }
        public decimal? PIncRentM { get; set; }
        public decimal? PIncRentY { get; set; }
        public decimal? PLandArea { get; set; }
        public string? PLandCategory { get; set; }
        public decimal? PLandShareRatio { get; set; }
        public string? PLandUse { get; set; }
        public decimal? PLayAmt { get; set; }
        public decimal? PMovingCost { get; set; }
        public decimal? POptionAmt { get; set; }
        public string? POtherRestrictions { get; set; }
        public string? PPetAllow { get; set; }
        public decimal? PPremiumAmt { get; set; }
        public decimal? PPresaleAmt { get; set; }
        public decimal? PRightValueAmt { get; set; }
        public string? PRoadInfo { get; set; }
        public int? PStairCnt { get; set; }
        public string? PToilet { get; set; }
        public decimal? PTotalFloorArea { get; set; }
        public bool? PZoneAdjust { get; set; }
        public bool? PZoneLandPermit { get; set; }
        public bool? PZoneOverheat { get; set; }
        public bool? PZoneSpec { get; set; }
        public string? CustAccessRoad { get; set; }
        public string? CustBalcExt { get; set; }
        public string? CustBizType { get; set; }
        public string? CustBuildPermitPref { get; set; }
        public string? CustBuildingForm { get; set; }
        public string? CustBuildingUse { get; set; }
        public string? CustChildCond { get; set; }
        public string? CustCityGasYn { get; set; }
        public string? CustElecCapacity { get; set; }
        public int? CustElevatorCnt { get; set; }
        public string? CustEntrStruct { get; set; }
        public string? CustLandCategory { get; set; }
        public string? CustLandUse { get; set; }
        public string? CustOpt { get; set; }
        public string? CustPetAllow { get; set; }
        public int? CustStairCnt { get; set; }
        public string? ChargeName { get; set; }
    }
}

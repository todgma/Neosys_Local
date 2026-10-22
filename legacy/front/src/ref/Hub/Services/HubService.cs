using System.Data;
using RealestateAPI.Hub.Models;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using Npgsql;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Hub.Services
{
    public interface IHubService
    {
        Task<TradeInfoList> GetTradeInfoList(
            long? tradeId, string? tradeDiv, string? offNo, string? tradeState,
            string? custNo, string? ptNo, DateTime? regDtFr, DateTime? regDtTo,
            int page, int pageSize);

        Task<TradeInfoList> GetRecentTradeInfo(string? tradeDiv, string? offNo, string? tradeState, int recentCnt);

        Task<TradeInfo?> InsertTradeInfo(TradeInfoCreateDto dto, string userId, bool autoRegisterCustomer = false, bool autoRegisterProperty = false);

        Task<TradeInfo?> UpdateTradeInfo(long tradeId, TradeInfoUpdateDto dto);

        Task<bool> DeleteTradeInfo(long tradeId);
    }

    public class HubService : IHubService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public HubService(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        /// <summary>
        /// 공동중개망 조회 (페이징)
        /// </summary>
        public async Task<TradeInfoList> GetTradeInfoList(
            long? tradeId, string? tradeDiv, string? offNo, string? tradeState,
            string? custNo, string? ptNo, DateTime? regDtFr, DateTime? regDtTo,
            int page, int pageSize)
        {
            const string sql = @"
                SELECT *
                FROM public.fn_rt_trade_info(
                    pr_mode => @pr_mode,
                    pr_trade_id => @pr_trade_id,
                    pr_trade_div => @pr_trade_div,
                    pr_off_no => @pr_off_no,
                    pr_trade_state => @pr_trade_state,
                    pr_cust_no => @pr_cust_no,
                    pr_pt_no => @pr_pt_no,
                    pr_reg_dt_fr => @pr_reg_dt_fr,
                    pr_reg_dt_to => @pr_reg_dt_to,
                    pr_page => @pr_page,
                    pr_page_size => @pr_page_size
                );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_mode", "SEL"),
                new NpgsqlParameter("@pr_trade_id", (object?)tradeId ?? DBNull.Value),
                new NpgsqlParameter("@pr_trade_div", (object?)tradeDiv ?? DBNull.Value),
                new NpgsqlParameter("@pr_off_no", (object?)offNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_trade_state", (object?)tradeState ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", (object?)custNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_no", (object?)ptNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_reg_dt_fr", (object?)regDtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_reg_dt_to", (object?)regDtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_page", page),
                new NpgsqlParameter("@pr_page_size", pageSize)
            };

            var items = await _dataService.QueryAsyncPg<TradeInfo>("DEV", sql, parameters);

            long totalCount = items?.FirstOrDefault()?.TotalCount ?? 0;

            return new TradeInfoList
            {
                Items = items,
                TotalCount = totalCount
            };
        }

        /// <summary>
        /// 최근 N개 공동중개망 조회
        /// </summary>
        public async Task<TradeInfoList> GetRecentTradeInfo(string? tradeDiv, string? offNo, string? tradeState, int recentCnt)
        {
            const string sql = @"
                SELECT *
                FROM public.fn_rt_trade_info(
                    pr_mode => @pr_mode,
                    pr_trade_div => @pr_trade_div,
                    pr_off_no => @pr_off_no,
                    pr_trade_state => @pr_trade_state,
                    pr_recent_cnt => @pr_recent_cnt
                );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_mode", "RECENT"),
                new NpgsqlParameter("@pr_trade_div", (object?)tradeDiv ?? DBNull.Value),
                new NpgsqlParameter("@pr_off_no", (object?)offNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_trade_state", (object?)tradeState ?? DBNull.Value),
                new NpgsqlParameter("@pr_recent_cnt", recentCnt)
            };

            var items = await _dataService.QueryAsyncPg<TradeInfo>("DEV", sql, parameters);

            return new TradeInfoList
            {
                Items = items,
                TotalCount = items?.Count ?? 0
            };
        }

        /// <summary>
        /// 공동중개망 신규 등록
        /// </summary>
        public async Task<TradeInfo?> InsertTradeInfo(TradeInfoCreateDto dto, string userId, bool autoRegisterCustomer = false, bool autoRegisterProperty = false)
        {
            const string sql = @"
                SELECT *
                FROM public.fn_rt_trade_info(
                    pr_mode => @pr_mode,
                    pr_trade_div => @pr_trade_div,
                    pr_cust_no => @pr_cust_no,
                    pr_pt_no => @pr_pt_no,
                    pr_reg_user_id => @pr_reg_user_id,
                    pr_off_no => @pr_off_no,
                    pr_is_cust_registered => @pr_is_cust_registered,
                    pr_is_pt_registered => @pr_is_pt_registered,
                    pr_trade_state => @pr_trade_state,
                    pr_trade_state_desc => @pr_trade_state_desc,
                    pr_cust_type => @pr_cust_type,
                    pr_cust_name => @pr_cust_name,
                    pr_cust_alias => @pr_cust_alias,
                    pr_cust_tel => @pr_cust_tel,
                    pr_cust_addr => @pr_cust_addr,
                    pr_cust_memo => @pr_cust_memo,
                    pr_cust_rent_bsn_yn => @pr_cust_rent_bsn_yn,
                    pr_cust_trd_prg => @pr_cust_trd_prg,
                    pr_cust_want_type => @pr_cust_want_type,
                    pr_cust_exc_area_fr => @pr_cust_exc_area_fr,
                    pr_cust_exc_area_to => @pr_cust_exc_area_to,
                    pr_cust_region1 => @pr_cust_region1,
                    pr_cust_region2 => @pr_cust_region2,
                    pr_cust_region3 => @pr_cust_region3,
                    pr_cust_trd_type => @pr_cust_trd_type,
                    pr_cust_trd_type_detail => @pr_cust_trd_type_detail,
                    pr_cust_sale_amt_fr => @pr_cust_sale_amt_fr,
                    pr_cust_sale_amt_to => @pr_cust_sale_amt_to,
                    pr_cust_les_amt_fr => @pr_cust_les_amt_fr,
                    pr_cust_les_amt_to => @pr_cust_les_amt_to,
                    pr_cust_prot_amt_fr => @pr_cust_prot_amt_fr,
                    pr_cust_prot_amt_to => @pr_cust_prot_amt_to,
                    pr_cust_mon_amt_fr => @pr_cust_mon_amt_fr,
                    pr_cust_mon_amt_to => @pr_cust_mon_amt_to,
                    pr_cust_etc_prot_amt_fr => @pr_cust_etc_prot_amt_fr,
                    pr_cust_etc_prot_amt_to => @pr_cust_etc_prot_amt_to,
                    pr_cust_etc_mon_amt_fr => @pr_cust_etc_mon_amt_fr,
                    pr_cust_etc_mon_amt_to => @pr_cust_etc_mon_amt_to,
                    pr_cust_etc_type => @pr_cust_etc_type,
                    pr_cust_movein_yn => @pr_cust_movein_yn,
                    pr_cust_move_date_fr => @pr_cust_move_date_fr,
                    pr_cust_move_date_to => @pr_cust_move_date_to,
                    pr_cust_cash_ablt => @pr_cust_cash_ablt,
                    pr_cust_rmk => @pr_cust_rmk,
                    pr_p_pt_name => @pr_p_pt_name,
                    pr_p_pt_type => @pr_p_pt_type,
                    pr_p_sale_div => @pr_p_sale_div,
                    pr_p_sale_amt => @pr_p_sale_amt,
                    pr_p_now_dep_amt => @pr_p_now_dep_amt,
                    pr_p_now_mon_amt => @pr_p_now_mon_amt,
                    pr_p_exc_area => @pr_p_exc_area,
                    pr_p_sup_area => @pr_p_sup_area,
                    pr_p_addr_full => @pr_p_addr_full,
                    pr_p_dong => @pr_p_dong,
                    pr_p_ho => @pr_p_ho,
                    pr_p_floor1 => @pr_p_floor1,
                    pr_p_floor2 => @pr_p_floor2,
                    pr_p_floor_desc => @pr_p_floor_desc,
                    pr_p_dir_std => @pr_p_dir_std,
                    pr_p_balc_ext => @pr_p_balc_ext,
                    pr_p_room_cnt => @pr_p_room_cnt,
                    pr_p_bath_cnt => @pr_p_bath_cnt,
                    pr_p_pk_cnt => @pr_p_pk_cnt,
                    pr_p_maint_cost => @pr_p_maint_cost,
                    pr_p_heat_method => @pr_p_heat_method,
                    pr_p_heat_fuel => @pr_p_heat_fuel,
                    pr_p_heat_system => @pr_p_heat_system,
                    pr_p_buid_struct => @pr_p_buid_struct,
                    pr_immediate_movein_yn => @pr_immediate_movein_yn,
                    pr_p_expt_date => @pr_p_expt_date,
                    pr_p_prg_sts => @pr_p_prg_sts,
                    pr_p_opt => @pr_p_opt,
                    pr_p_pt_expl => @pr_p_pt_expl,
                    pr_p_comp_year => @pr_p_comp_year,
                    pr_owner_rent_bsn_yn => @pr_owner_rent_bsn_yn,
                    pr_trade_status => @pr_trade_status,
                    pr_auto_register_customer => @pr_auto_register_customer,
                    pr_auto_register_property => @pr_auto_register_property
                );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_mode", "INS"),
                new NpgsqlParameter("@pr_trade_div", dto.TradeDiv),
                new NpgsqlParameter("@pr_cust_no", (object?)dto.CustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_no", (object?)dto.PtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_reg_user_id", userId),
                new NpgsqlParameter("@pr_off_no", dto.OffNo),
                new NpgsqlParameter("@pr_is_cust_registered", dto.IsCustRegistered),
                new NpgsqlParameter("@pr_is_pt_registered", dto.IsPtRegistered),
                new NpgsqlParameter("@pr_trade_state", (object?)dto.TradeState ?? DBNull.Value),
                new NpgsqlParameter("@pr_trade_state_desc", (object?)dto.TradeStateDesc ?? DBNull.Value),
                new NpgsqlParameter("@pr_co_brokerage_title", (object?)dto.CoBrokerageTitle ?? DBNull.Value),
                new NpgsqlParameter("@pr_co_brokerage_content", (object?)dto.CoBrokerageContent ?? DBNull.Value),
                new NpgsqlParameter("@pr_co_brokerage_memo", (object?)dto.CoBrokerageMemo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_type", (object?)dto.CustType ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_name", (object?)dto.CustName ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_alias", (object?)dto.CustAlias ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_tel", (object?)dto.CustTel ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_addr", (object?)dto.CustAddr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_memo", (object?)dto.CustMemo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_rent_bsn_yn", (object?)dto.CustRentBsnYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_trd_prg", (object?)dto.CustTrdPrg ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_want_type", (object?)dto.CustWantType ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_exc_area_fr", (object?)dto.CustExcAreaFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_exc_area_to", (object?)dto.CustExcAreaTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_region1", (object?)dto.CustRegion1 ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_region2", (object?)dto.CustRegion2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_region3", (object?)dto.CustRegion3 ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_trd_type", (object?)dto.CustTrdType ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_trd_type_detail", (object?)dto.CustTrdTypeDetail ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_sale_amt_fr", (object?)dto.CustSaleAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_sale_amt_to", (object?)dto.CustSaleAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_les_amt_fr", (object?)dto.CustLesAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_les_amt_to", (object?)dto.CustLesAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_prot_amt_fr", (object?)dto.CustProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_prot_amt_to", (object?)dto.CustProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_mon_amt_fr", (object?)dto.CustMonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_mon_amt_to", (object?)dto.CustMonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_prot_amt_fr", (object?)dto.CustEtcProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_prot_amt_to", (object?)dto.CustEtcProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_mon_amt_fr", (object?)dto.CustEtcMonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_mon_amt_to", (object?)dto.CustEtcMonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_type", (object?)dto.CustEtcType ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_movein_yn", (object?)dto.CustMoveinYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_move_date_fr", (object?)dto.CustMoveDateFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_move_date_to", (object?)dto.CustMoveDateTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_cash_ablt", (object?)dto.CustCashAblt ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_rmk", (object?)dto.CustRmk ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_pt_name", (object?)dto.PPtName ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_pt_type", (object?)dto.PPtType ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_sale_div", (object?)dto.PSaleDiv ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_sale_amt", (object?)dto.PSaleAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_now_dep_amt", (object?)dto.PNowDepAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_now_mon_amt", (object?)dto.PNowMonAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_exc_area", (object?)dto.PExcArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_sup_area", (object?)dto.PSupArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_addr_full", (object?)dto.PAddrFull ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_dong", (object?)dto.PDong ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_ho", (object?)dto.PHo ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_floor1", (object?)dto.PFloor1 ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_floor2", (object?)dto.PFloor2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_floor_desc", (object?)dto.PFloorDesc ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_dir_std", (object?)dto.PDirStd ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_balc_ext", (object?)dto.PBalcExt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_room_cnt", (object?)dto.PRoomCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_bath_cnt", (object?)dto.PBathCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_pk_cnt", (object?)dto.PPkCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_maint_cost", (object?)dto.PMaintCost ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_heat_method", (object?)dto.PHeatMethod ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_heat_fuel", (object?)dto.PHeatFuel ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_heat_system", (object?)dto.PHeatSystem ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_buid_struct", (object?)dto.PBuidStruct ?? DBNull.Value),
                new NpgsqlParameter("@pr_immediate_movein_yn", (object?)dto.ImmediateMoveinYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_expt_date", (object?)dto.PExptDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_prg_sts", (object?)dto.PPrgSts ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_opt", (object?)dto.POpt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_pt_expl", (object?)dto.PPtExpl ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_comp_year", (object?)dto.PCompYear ?? DBNull.Value),
                new NpgsqlParameter("@pr_owner_rent_bsn_yn", (object?)dto.OwnerRentBsnYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_trade_status", (object?)dto.TradeStatus ?? "Y"),
                new NpgsqlParameter("@pr_auto_register_customer", autoRegisterCustomer),
                new NpgsqlParameter("@pr_auto_register_property", autoRegisterProperty)
            };

            var result = await _dataService.QueryAsyncPg<TradeInfo>("DEV", sql, parameters);
            return result?.FirstOrDefault();
        }

        /// <summary>
        /// 공동중개망 수정
        /// </summary>
        public async Task<TradeInfo?> UpdateTradeInfo(long tradeId, TradeInfoUpdateDto dto)
        {
            const string sql = @"
                SELECT *
                FROM public.fn_rt_trade_info(
                    pr_mode => @pr_mode,
                    pr_trade_id => @pr_trade_id,
                    pr_trade_div => @pr_trade_div,
                    pr_cust_no => @pr_cust_no,
                    pr_pt_no => @pr_pt_no,
                    pr_off_no => @pr_off_no,
                    pr_is_cust_registered => @pr_is_cust_registered,
                    pr_is_pt_registered => @pr_is_pt_registered,
                    pr_trade_state => @pr_trade_state,
                    pr_trade_state_desc => @pr_trade_state_desc,
                    pr_cust_type => @pr_cust_type,
                    pr_cust_name => @pr_cust_name,
                    pr_cust_alias => @pr_cust_alias,
                    pr_cust_tel => @pr_cust_tel,
                    pr_cust_addr => @pr_cust_addr,
                    pr_cust_memo => @pr_cust_memo,
                    pr_cust_rent_bsn_yn => @pr_cust_rent_bsn_yn,
                    pr_cust_trd_prg => @pr_cust_trd_prg,
                    pr_cust_want_type => @pr_cust_want_type,
                    pr_cust_exc_area_fr => @pr_cust_exc_area_fr,
                    pr_cust_exc_area_to => @pr_cust_exc_area_to,
                    pr_cust_region1 => @pr_cust_region1,
                    pr_cust_region2 => @pr_cust_region2,
                    pr_cust_region3 => @pr_cust_region3,
                    pr_cust_trd_type => @pr_cust_trd_type,
                    pr_cust_trd_type_detail => @pr_cust_trd_type_detail,
                    pr_cust_sale_amt_fr => @pr_cust_sale_amt_fr,
                    pr_cust_sale_amt_to => @pr_cust_sale_amt_to,
                    pr_cust_les_amt_fr => @pr_cust_les_amt_fr,
                    pr_cust_les_amt_to => @pr_cust_les_amt_to,
                    pr_cust_prot_amt_fr => @pr_cust_prot_amt_fr,
                    pr_cust_prot_amt_to => @pr_cust_prot_amt_to,
                    pr_cust_mon_amt_fr => @pr_cust_mon_amt_fr,
                    pr_cust_mon_amt_to => @pr_cust_mon_amt_to,
                    pr_cust_etc_prot_amt_fr => @pr_cust_etc_prot_amt_fr,
                    pr_cust_etc_prot_amt_to => @pr_cust_etc_prot_amt_to,
                    pr_cust_etc_mon_amt_fr => @pr_cust_etc_mon_amt_fr,
                    pr_cust_etc_mon_amt_to => @pr_cust_etc_mon_amt_to,
                    pr_cust_etc_type => @pr_cust_etc_type,
                    pr_cust_movein_yn => @pr_cust_movein_yn,
                    pr_cust_move_date_fr => @pr_cust_move_date_fr,
                    pr_cust_move_date_to => @pr_cust_move_date_to,
                    pr_cust_cash_ablt => @pr_cust_cash_ablt,
                    pr_cust_rmk => @pr_cust_rmk,
                    pr_p_pt_name => @pr_p_pt_name,
                    pr_p_pt_type => @pr_p_pt_type,
                    pr_p_sale_div => @pr_p_sale_div,
                    pr_p_sale_amt => @pr_p_sale_amt,
                    pr_p_now_dep_amt => @pr_p_now_dep_amt,
                    pr_p_now_mon_amt => @pr_p_now_mon_amt,
                    pr_p_exc_area => @pr_p_exc_area,
                    pr_p_sup_area => @pr_p_sup_area,
                    pr_p_addr_full => @pr_p_addr_full,
                    pr_p_dong => @pr_p_dong,
                    pr_p_ho => @pr_p_ho,
                    pr_p_floor1 => @pr_p_floor1,
                    pr_p_floor2 => @pr_p_floor2,
                    pr_p_floor_desc => @pr_p_floor_desc,
                    pr_p_dir_std => @pr_p_dir_std,
                    pr_p_balc_ext => @pr_p_balc_ext,
                    pr_p_room_cnt => @pr_p_room_cnt,
                    pr_p_bath_cnt => @pr_p_bath_cnt,
                    pr_p_pk_cnt => @pr_p_pk_cnt,
                    pr_p_maint_cost => @pr_p_maint_cost,
                    pr_p_heat_method => @pr_p_heat_method,
                    pr_p_heat_fuel => @pr_p_heat_fuel,
                    pr_p_heat_system => @pr_p_heat_system,
                    pr_p_buid_struct => @pr_p_buid_struct,
                    pr_immediate_movein_yn => @pr_immediate_movein_yn,
                    pr_p_expt_date => @pr_p_expt_date,
                    pr_p_prg_sts => @pr_p_prg_sts,
                    pr_p_opt => @pr_p_opt,
                    pr_p_pt_expl => @pr_p_pt_expl,
                    pr_p_comp_year => @pr_p_comp_year,
                    pr_owner_rent_bsn_yn => @pr_owner_rent_bsn_yn,
                    pr_trade_status => @pr_trade_status
                );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_mode", "UPD"),
                new NpgsqlParameter("@pr_trade_id", tradeId),
                new NpgsqlParameter("@pr_trade_div", (object?)dto.TradeDiv ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", (object?)dto.CustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_no", (object?)dto.PtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_off_no", (object?)dto.OffNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_is_cust_registered", (object?)dto.IsCustRegistered ?? DBNull.Value),
                new NpgsqlParameter("@pr_is_pt_registered", (object?)dto.IsPtRegistered ?? DBNull.Value),
                new NpgsqlParameter("@pr_trade_state", (object?)dto.TradeState ?? DBNull.Value),
                new NpgsqlParameter("@pr_trade_state_desc", (object?)dto.TradeStateDesc ?? DBNull.Value),
                new NpgsqlParameter("@pr_co_brokerage_title", (object?)dto.CoBrokerageTitle ?? DBNull.Value),
                new NpgsqlParameter("@pr_co_brokerage_content", (object?)dto.CoBrokerageContent ?? DBNull.Value),
                new NpgsqlParameter("@pr_co_brokerage_memo", (object?)dto.CoBrokerageMemo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_type", (object?)dto.CustType ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_name", (object?)dto.CustName ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_alias", (object?)dto.CustAlias ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_tel", (object?)dto.CustTel ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_addr", (object?)dto.CustAddr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_memo", (object?)dto.CustMemo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_rent_bsn_yn", (object?)dto.CustRentBsnYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_trd_prg", (object?)dto.CustTrdPrg ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_want_type", (object?)dto.CustWantType ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_exc_area_fr", (object?)dto.CustExcAreaFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_exc_area_to", (object?)dto.CustExcAreaTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_region1", (object?)dto.CustRegion1 ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_region2", (object?)dto.CustRegion2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_region3", (object?)dto.CustRegion3 ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_trd_type", (object?)dto.CustTrdType ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_trd_type_detail", (object?)dto.CustTrdTypeDetail ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_sale_amt_fr", (object?)dto.CustSaleAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_sale_amt_to", (object?)dto.CustSaleAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_les_amt_fr", (object?)dto.CustLesAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_les_amt_to", (object?)dto.CustLesAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_prot_amt_fr", (object?)dto.CustProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_prot_amt_to", (object?)dto.CustProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_mon_amt_fr", (object?)dto.CustMonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_mon_amt_to", (object?)dto.CustMonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_prot_amt_fr", (object?)dto.CustEtcProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_prot_amt_to", (object?)dto.CustEtcProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_mon_amt_fr", (object?)dto.CustEtcMonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_mon_amt_to", (object?)dto.CustEtcMonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_etc_type", (object?)dto.CustEtcType ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_movein_yn", (object?)dto.CustMoveinYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_move_date_fr", (object?)dto.CustMoveDateFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_move_date_to", (object?)dto.CustMoveDateTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_cash_ablt", (object?)dto.CustCashAblt ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_rmk", (object?)dto.CustRmk ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_pt_name", (object?)dto.PPtName ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_pt_type", (object?)dto.PPtType ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_sale_div", (object?)dto.PSaleDiv ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_sale_amt", (object?)dto.PSaleAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_now_dep_amt", (object?)dto.PNowDepAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_now_mon_amt", (object?)dto.PNowMonAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_exc_area", (object?)dto.PExcArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_sup_area", (object?)dto.PSupArea ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_addr_full", (object?)dto.PAddrFull ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_dong", (object?)dto.PDong ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_ho", (object?)dto.PHo ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_floor1", (object?)dto.PFloor1 ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_floor2", (object?)dto.PFloor2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_floor_desc", (object?)dto.PFloorDesc ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_dir_std", (object?)dto.PDirStd ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_balc_ext", (object?)dto.PBalcExt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_room_cnt", (object?)dto.PRoomCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_bath_cnt", (object?)dto.PBathCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_pk_cnt", (object?)dto.PPkCnt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_maint_cost", (object?)dto.PMaintCost ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_heat_method", (object?)dto.PHeatMethod ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_heat_fuel", (object?)dto.PHeatFuel ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_heat_system", (object?)dto.PHeatSystem ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_buid_struct", (object?)dto.PBuidStruct ?? DBNull.Value),
                new NpgsqlParameter("@pr_immediate_movein_yn", (object?)dto.ImmediateMoveinYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_expt_date", (object?)dto.PExptDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_prg_sts", (object?)dto.PPrgSts ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_opt", (object?)dto.POpt ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_pt_expl", (object?)dto.PPtExpl ?? DBNull.Value),
                new NpgsqlParameter("@pr_p_comp_year", (object?)dto.PCompYear ?? DBNull.Value),
                new NpgsqlParameter("@pr_owner_rent_bsn_yn", (object?)dto.OwnerRentBsnYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_trade_status", (object?)dto.TradeStatus ?? DBNull.Value)
            };

            var result = await _dataService.QueryAsyncPg<TradeInfo>("DEV", sql, parameters);
            return result?.FirstOrDefault();
        }

        /// <summary>
        /// 공동중개망 삭제 (논리 삭제)
        /// </summary>
        public async Task<bool> DeleteTradeInfo(long tradeId)
        {
            const string sql = @"
                SELECT *
                FROM public.fn_rt_trade_info(
                    pr_mode => @pr_mode,
                    pr_trade_id => @pr_trade_id
                );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_mode", "DEL"),
                new NpgsqlParameter("@pr_trade_id", tradeId)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_rt_trade_info", parameters);
            return true;
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
    }
}

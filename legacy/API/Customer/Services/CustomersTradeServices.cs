using System.Data;
using RealestateAPI.Customer.Models;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using Newtonsoft.Json;
using System.Collections.Generic;
using Npgsql;
using Microsoft.OpenApi.Any;
using Org.BouncyCastle.Asn1.X500;
using Org.BouncyCastle.Ocsp;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.Customer.Controllers;

namespace RealestateAPI.Customer.Services
{
    public interface ICustomersTradeServices
    {
        public Task<CustTradeList> SelecCustomerTradeList(long? TrdNo, string? TrdPrg, long? CustNo, string? WantType, string? WantNm,
                                                    decimal? ExcAreaFr, decimal? ExcAreaTo, decimal? LandShareFr, decimal? LandShareTo,
                                                    string? TrdType, string? MoveinYn, string? MoveDateFr, string? MoveDateTo, string? CashAblt,
                                                    int? SaleAmtFr, int? SaleAmtTo, int? LesAmtFr, int? LesAmtTo, int? ProtAmtFr, int? ProtAmtTo,
                                                    int? MonAmtFr, int? MonAmtTo, int? EtcProtAmtFr, int? EtcProtAmtTo, int? EtcMonAmtFr, int? EtcMonAmtTo,
                                                    string? EtcType, string? Rnk, long? RtNo, long? OffNo, int Page, int PageSize);
        public Task<bool> InsertCustomerTrade(CustomersTradeCreateDto Dto);
        public Task<bool> UpdateCustomerTrade(long TrdNo, CustomersTradeUpdateDto Dto);
        public Task<bool> DeleteCustomerTrade(long TrdNo, string? UserId);


        //거래지역정보
        public Task<CustTradeAreaList> SelecCustomerTradeAreaList(long? trdNo, int? seq, string? addr1, string? addr2, string? addr3, string? addr4);
        public Task<bool> InsertCustomerTradeArea(long trdNo, int seq, string? addr1, string? addr2, string? addr3, string? addr4, string? userId);
        public Task<bool> UpdateCustomerTradeArea(long trdNo, int seq, string? addr1, string? addr2, string? addr3, string? addr4, string? userId);
        public Task<bool> DeleteCustomerTradeArea(long trdNo, int seq, string? userId);
    }


    public class CustomersTradeServices : ICustomersTradeServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public CustomersTradeServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        public async Task<CustTradeList> SelecCustomerTradeList(long? TrdNo, string? TrdPrg, long? CustNo, string? WantType, string? WantNm,
                                                    decimal? ExcAreaFr, decimal? ExcAreaTo, decimal? LandShareFr, decimal? LandShareTo,
                                                    string? TrdType, string? MoveinYn, string? MoveDateFr, string? MoveDateTo, string? CashAblt,
                                                    int? SaleAmtFr, int? SaleAmtTo, int? LesAmtFr, int? LesAmtTo, int? ProtAmtFr, int? ProtAmtTo,
                                                    int? MonAmtFr, int? MonAmtTo, int? EtcProtAmtFr, int? EtcProtAmtTo, int? EtcMonAmtFr, int? EtcMonAmtTo,
                                                    string? EtcType, string? Rnk, long? RtNo, long? OffNo, int Page , int PageSize)
        {
            const string sql = @"
                SELECT *
                FROM public.fn_ct_trd_info(
                    pr_proc             => @pr_proc,
                    pr_trd_no           => @pr_trd_no,
                    pr_trd_prg          => @pr_trd_prg,
                    pr_cust_no          => @pr_cust_no,
                    pr_want_type        => @pr_want_type,
                    pr_want_nm          => @pr_want_nm,
                    pr_exc_area_fr      => @pr_exc_area_fr,
                    pr_exc_area_to      => @pr_exc_area_to,
                    pr_land_share_fr    => @pr_land_share_fr,
                    pr_land_share_to    => @pr_land_share_to,
                    pr_trd_type         => @pr_trd_type,
                    pr_movein_yn        => @pr_movein_yn,
                    pr_move_date_fr     => @pr_move_date_fr,
                    pr_move_date_to     => @pr_move_date_to,
                    pr_cash_ablt        => @pr_cash_ablt,
                    pr_sale_amt_fr      => @pr_sale_amt_fr,
                    pr_sale_amt_to      => @pr_sale_amt_to,
                    pr_les_amt_fr       => @pr_les_amt_fr,
                    pr_les_amt_to       => @pr_les_amt_to,
                    pr_prot_amt_fr      => @pr_prot_amt_fr,
                    pr_prot_amt_to      => @pr_prot_amt_to,
                    pr_mon_amt_fr       => @pr_mon_amt_fr,
                    pr_mon_amt_to       => @pr_mon_amt_to,
                    pr_etc_prot_amt_fr  => @pr_etc_prot_amt_fr,
                    pr_etc_prot_amt_to  => @pr_etc_prot_amt_to,
                    pr_etc_mon_amt_fr   => @pr_etc_mon_amt_fr,
                    pr_etc_mon_amt_to   => @pr_etc_mon_amt_to,
                    pr_etc_type         => @pr_etc_type,
                    pr_rnk              => @pr_rnk,
                    pr_rt_no            => @pr_rt_no,
                    pr_off_no           => @pr_off_no,
                    pr_page             => @pr_page,
                    pr_page_size        => @pr_page_size
                );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "SEL"),
                new NpgsqlParameter("@pr_trd_no", (object?)TrdNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_trd_prg", (object?)TrdPrg ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", (object?)CustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_want_type", (object?)WantType ?? DBNull.Value),
                new NpgsqlParameter("@pr_want_nm", (object?)WantNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_exc_area_fr", (object?)ExcAreaFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_exc_area_to", (object?)ExcAreaTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_share_fr", (object?)LandShareFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_share_to", (object?)LandShareTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_trd_type", (object?)TrdType ?? DBNull.Value),
                new NpgsqlParameter("@pr_movein_yn", (object?)MoveinYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_move_date_fr", (object?)MoveDateFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_move_date_to", (object?)MoveDateTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cash_ablt", (object?)CashAblt ?? DBNull.Value),
                new NpgsqlParameter("@pr_sale_amt_fr", (object?)SaleAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_sale_amt_to", (object?)SaleAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_les_amt_fr", (object?)LesAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_les_amt_to", (object?)LesAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_prot_amt_fr", (object?)ProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_prot_amt_to", (object?)ProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_mon_amt_fr", (object?)MonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_mon_amt_to", (object?)MonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_prot_amt_fr", (object?)EtcProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_prot_amt_to", (object?)EtcProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_mon_amt_fr", (object?)EtcMonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_mon_amt_to", (object?)EtcMonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_type", (object?)EtcType ?? DBNull.Value),
                new NpgsqlParameter("@pr_rnk", (object?)Rnk ?? DBNull.Value),
                new NpgsqlParameter("@pr_rt_no", (object?)RtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_off_no", (object?)OffNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_page", (object?)Page ?? 1),
                new NpgsqlParameter("@pr_page_size", (object?)PageSize ?? 10)
};

            var tradeList = await _dataService.QueryAsyncPg<CustTradeInfo>("DEV", sql, parameters);

            return new CustTradeList
            {
                TradeInfos = tradeList,
            };
        }

        public async Task<bool> InsertCustomerTrade(CustomersTradeCreateDto Dto)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "INS"),
                new NpgsqlParameter("@pr_trd_no", DBNull.Value),
                new NpgsqlParameter("@pr_trd_prg", (object?)Dto.TrdPrg ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", (object?)Dto.CustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_want_type", (object?)Dto.WantType ?? DBNull.Value),
                new NpgsqlParameter("@pr_want_nm", (object?)Dto.WantNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_exc_area_fr", (object?)Dto.ExcAreaFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_exc_area_to", (object?)Dto.ExcAreaTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_share_fr", (object?)Dto.LandShareFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_share_to", (object?)Dto.LandShareTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_trd_type", (object?)Dto.TrdType ?? DBNull.Value),
                new NpgsqlParameter("@pr_movein_yn", (object?)Dto.MoveinYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_move_date_fr", (object?)Dto.MoveDateFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_move_date_to", (object?)Dto.MoveDateTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cash_ablt", (object?)Dto.CashAblt ?? DBNull.Value),
                new NpgsqlParameter("@pr_sale_amt_fr", (object?)Dto.SaleAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_sale_amt_to", (object?)Dto.SaleAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_les_amt_fr", (object?)Dto.LesAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_les_amt_to", (object?)Dto.LesAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_prot_amt_fr", (object?)Dto.ProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_prot_amt_to", (object?)Dto.ProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_mon_amt_fr", (object?)Dto.MonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_mon_amt_to", (object?)Dto.MonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_prot_amt_fr", (object?)Dto.EtcProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_prot_amt_to", (object?)Dto.EtcProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_mon_amt_fr", (object?)Dto.EtcMonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_mon_amt_to", (object?)Dto.EtcMonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_type", (object?)Dto.EtcType ?? DBNull.Value),
                new NpgsqlParameter("@pr_rnk", (object?)Dto.Rnk ?? DBNull.Value),
                new NpgsqlParameter("@pr_rt_no", (object?)Dto.RtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_off_no", (object?)Dto.OffNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_user_id", (object?)Dto.UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_ct_trd_info", parameters);

            rtnVal = true;

            return rtnVal;
        }

        public async Task<bool> UpdateCustomerTrade(long TrdNo, CustomersTradeUpdateDto Dto)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "UPD"),
                new NpgsqlParameter("@pr_trd_no", TrdNo),
                new NpgsqlParameter("@pr_trd_prg", (object?)Dto.TrdPrg ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", (object?)Dto.CustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_want_type", (object?)Dto.WantType ?? DBNull.Value),
                new NpgsqlParameter("@pr_want_nm", (object?)Dto.WantNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_exc_area_fr", (object?)Dto.ExcAreaFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_exc_area_to", (object?)Dto.ExcAreaTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_share_fr", (object?)Dto.LandShareFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_land_share_to", (object?)Dto.LandShareTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_trd_type", (object?)Dto.TrdType ?? DBNull.Value),
                new NpgsqlParameter("@pr_movein_yn", (object?)Dto.MoveinYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_move_date_fr", (object?)Dto.MoveDateFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_move_date_to", (object?)Dto.MoveDateTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cash_ablt", (object?)Dto.CashAblt ?? DBNull.Value),
                new NpgsqlParameter("@pr_sale_amt_fr", (object?)Dto.SaleAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_sale_amt_to", (object?)Dto.SaleAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_les_amt_fr", (object?)Dto.LesAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_les_amt_to", (object?)Dto.LesAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_prot_amt_fr", (object?)Dto.ProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_prot_amt_to", (object?)Dto.ProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_mon_amt_fr", (object?)Dto.MonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_mon_amt_to", (object?)Dto.MonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_prot_amt_fr", (object?)Dto.EtcProtAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_prot_amt_to", (object?)Dto.EtcProtAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_mon_amt_fr", (object?)Dto.EtcMonAmtFr ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_mon_amt_to", (object?)Dto.EtcMonAmtTo ?? DBNull.Value),
                new NpgsqlParameter("@pr_etc_type", (object?)Dto.EtcType ?? DBNull.Value),
                new NpgsqlParameter("@pr_rnk", (object?)Dto.Rnk ?? DBNull.Value),
                new NpgsqlParameter("@pr_rt_no", (object?)Dto.RtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_off_no", (object?)Dto.OffNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_user_id", (object?)Dto.UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_ct_trd_info", parameters);

            rtnVal = true;

            return rtnVal;
        }

        public async Task<bool> DeleteCustomerTrade(long TrdNo, string? UserId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "DEL"),
                new NpgsqlParameter("@pr_trd_no", TrdNo),
                new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_ct_trd_info", parameters);

            rtnVal = true;

            return rtnVal;
        }
        public async Task<CustTradeAreaList> SelecCustomerTradeAreaList(long? trdNo, int? seq, string? addr1, string? addr2, string? addr3, string? addr4)
        {
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_proc", "SEL"),
                new NpgsqlParameter("@p_trd_no", (object?)trdNo ?? DBNull.Value),
                new NpgsqlParameter("@p_seq", (object?)seq ?? DBNull.Value),
                new NpgsqlParameter("@p_addr1", (object?)addr1 ?? DBNull.Value),
                new NpgsqlParameter("@p_addr2", (object?)addr2 ?? DBNull.Value),
                new NpgsqlParameter("@p_addr3", (object?)addr3 ?? DBNull.Value),
                new NpgsqlParameter("@p_addr4", (object?)addr4 ?? DBNull.Value)
            };

            var custtradearealist = await _dataService.GetListFromFunctionAsyncPg<CustTradeArea>("DEV", "fn_ct_trd_area", parameters);

            return new CustTradeAreaList
            {
                TradeAreas = custtradearealist,
            };
        }
        public async Task<bool> InsertCustomerTradeArea(long trdNo, int seq, string? addr1, string? addr2, string? addr3, string? addr4, string? userId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_proc", "INS"),
                new NpgsqlParameter("@p_trd_no", (object?)trdNo ?? DBNull.Value),
                new NpgsqlParameter("@p_seq", (object?)seq ?? DBNull.Value),
                new NpgsqlParameter("@p_addr1", (object?)addr1 ?? DBNull.Value),
                new NpgsqlParameter("@p_addr2", (object?)addr2 ?? DBNull.Value),
                new NpgsqlParameter("@p_addr3", (object?)addr3 ?? DBNull.Value),
                new NpgsqlParameter("@p_addr4", (object?)addr4 ?? DBNull.Value),
                new NpgsqlParameter("@p_user_id", (object?)userId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_ct_trd_area", parameters);

            rtnVal = true;

            return rtnVal;
        }
        public async Task<bool> UpdateCustomerTradeArea(long trdNo, int seq, string? addr1, string? addr2, string? addr3, string? addr4, string? userId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_proc", "UPD"),
                new NpgsqlParameter("@p_trd_no", (object?)trdNo ?? DBNull.Value),
                new NpgsqlParameter("@p_seq", (object?)seq ?? DBNull.Value),
                new NpgsqlParameter("@p_addr1", (object?)addr1 ?? DBNull.Value),
                new NpgsqlParameter("@p_addr2", (object?)addr2 ?? DBNull.Value),
                new NpgsqlParameter("@p_addr3", (object?)addr3 ?? DBNull.Value),
                new NpgsqlParameter("@p_addr4", (object?)addr4 ?? DBNull.Value),
                new NpgsqlParameter("@p_user_id", (object?)userId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_ct_trd_area", parameters);

            rtnVal = true;

            return rtnVal;
        }
        public async Task<bool> DeleteCustomerTradeArea(long trdNo, int seq, string? userId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_proc", "DEL"),
                new NpgsqlParameter("@p_trd_no", (object?)trdNo ?? DBNull.Value),
                new NpgsqlParameter("@p_seq", (object?)seq ?? DBNull.Value),
                new NpgsqlParameter("@p_user_id", (object?)userId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_ct_trd_area", parameters);

            rtnVal = true;

            return rtnVal;
        }
    }
}
using System.Data;
using RealestateAPI.Contract.Models;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using Newtonsoft.Json;
using System.Collections.Generic;
using Npgsql;
using RealestateAPI.Contract.Controllers;
using Microsoft.AspNetCore.Mvc.RazorPages;
using RealestateAPI.Customer.Controllers;
using RealestateAPI.Customer.Models;
using System;
using System.Text.Json;
using NpgsqlTypes;

namespace RealestateAPI.Contract.Services
{
    public interface IContractServices
    {
        public Task<ContractList> SelectContractList(string FrDate, string ToDate, int? CnNo, string? CnSts, string? Addr, string? PtNm, string? Seller, string? Buyer, int Page, int PageSize);
        public Task<bool> InsertContract(ContractCreateDto? Dto, string? UserId);
        public Task<bool> UpdateContract(int CnNo, ContractUpdateDto Dto, string? UserId);
        public Task<bool> DeleteContract(int CnNo, string? UserId);

        public Task<ContractSpclList> SelectContractSpclList(int? CnNo, int? CnsNo, string? SpclDesc, int Page, int PageSize);
        public Task<bool> InsertContractSpcl(int CnNo, ContractSpclListCreateDto Dto, string? UserId);
        public Task<bool> UpdateContractSpcl(int CnNo, ContractSpclListUpdateDto Dto, string? UserId);
        public Task<bool> DeleteContractSpcl(int CnNo, int CnsNo, string? UserId);
    }

    public class ContractServices: IContractServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public ContractServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        public async Task<ContractList> SelectContractList(string FrDate, string ToDate, int? CnNo, string? CnSts, string? Addr, string? PtNm, string? Seller, string? Buyer, int Page, int PageSize)
        {
            const string sql = @"
                select *
                from public.fn_cn_contract_mgt(
                    pr_proc   => @pr_proc,
                    pr_fr_date  => @pr_fr_date,
                    pr_to_date => @pr_to_date,
                    pr_cn_no => @pr_cn_no,
                    pr_cn_sts => @pr_cn_sts,
                    pr_addr => @pr_addr,
                    pr_pt_nm => @pr_pt_nm,
                    pr_seller_nm => @pr_seller_nm,
                    pr_buyer_nm => @pr_buyer_nm,
                    pr_page => @pr_page,
                    pr_page_size => @pr_page_size
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "SEL"),
                new NpgsqlParameter("@pr_fr_date", (object?)FrDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_to_date", (object?)ToDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_cn_no", (object?)CnNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cn_sts", (object?)CnSts ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr", (object?)Addr ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_nm", (object?)PtNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_seller_nm", (object?)Seller ?? DBNull.Value),
                new NpgsqlParameter("@pr_buyer_nm", (object?)Buyer ?? DBNull.Value),
                new NpgsqlParameter("@pr_page", (object?)Page ?? DBNull.Value),
                new NpgsqlParameter("@pr_page_size", (object?)PageSize ?? DBNull.Value)
            };

            var Contracts = await _dataService.QueryAsyncPg<ContractInfo>("DEV", sql, parameters); // 쿼리 실행 전용 메서드


            return new ContractList { Contracts = Contracts };
        }

        public async Task<bool> InsertContract(ContractCreateDto? Dto, string? UserId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "INS"),
                //new NpgsqlParameter("@pr_cn_no", (object?)Dto.CnNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cn_sts", (object?)Dto.CnSts ?? DBNull.Value),
                new NpgsqlParameter("@pr_cn_date", (object?)Dto.CnDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_type", (object?)Dto.PtType ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr", (object?)Dto.Addr ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_nm", (object?)Dto.PtNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_dong", (object?)Dto.Dong ?? DBNull.Value),
                new NpgsqlParameter("@pr_ho", (object?)Dto.Ho ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_no", (object?)Dto.PtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_seller_nm", (object?)Dto.SellerNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_seller_tel", (object?)Dto.SellerTel ?? DBNull.Value),
                new NpgsqlParameter("@pr_seller_cust_no", (object?)Dto.SellerCustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_buyer_nm", (object?)Dto.BuyerNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_buyer_tel", (object?)Dto.BuyerTel ?? DBNull.Value),
                new NpgsqlParameter("@pr_buyer_cust_no", (object?)Dto.BuyerCustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_trd_type", (object?)Dto.TrdType ?? DBNull.Value),
                new NpgsqlParameter("@pr_sell_amt", (object?)Dto.SellAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_mid_amt1", (object?)Dto.MidAmt1 ?? DBNull.Value),
                new NpgsqlParameter("@pr_mid_amt2", (object?)Dto.MidAmt2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_bal_amt_date", (object?)Dto.BalAmtDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_trd_report", (object?)Dto.TrdReport ?? DBNull.Value),
                new NpgsqlParameter("@pr_contract_yn", (object?)Dto.ContractYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_broker_type", (object?)Dto.BrokerType ?? DBNull.Value),
                new NpgsqlParameter("@pr_rt_no", (object?)Dto.RtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_off_no", (object?)Dto.OffNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_vendor_id", (object?)Dto.VendorId ?? DBNull.Value),
                new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_cn_contract_mgt", parameters);

            rtnVal = true;

            return rtnVal;
        }
        public async Task<bool> UpdateContract(int CnNo, ContractUpdateDto Dto, string? UserId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "UPD"),
                new NpgsqlParameter("@pr_cn_no", (object?)CnNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cn_sts", (object?)Dto.CnSts ?? DBNull.Value),
                new NpgsqlParameter("@pr_cn_date", (object?)Dto.CnDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_type", (object?)Dto.PtType ?? DBNull.Value),
                new NpgsqlParameter("@pr_addr", (object?)Dto.Addr ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_nm", (object?)Dto.PtNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_dong", (object?)Dto.Dong ?? DBNull.Value),
                new NpgsqlParameter("@pr_ho", (object?)Dto.Ho ?? DBNull.Value),
                new NpgsqlParameter("@pr_pt_no", (object?)Dto.PtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_seller_nm", (object?)Dto.SellerNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_seller_tel", (object?)Dto.SellerTel ?? DBNull.Value),
                new NpgsqlParameter("@pr_seller_cust_no", (object?)Dto.SellerCustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_buyer_nm", (object?)Dto.BuyerNm ?? DBNull.Value),
                new NpgsqlParameter("@pr_buyer_tel", (object?)Dto.BuyerTel ?? DBNull.Value),
                new NpgsqlParameter("@pr_buyer_cust_no", (object?)Dto.BuyerCustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_trd_type", (object?)Dto.TrdType ?? DBNull.Value),
                new NpgsqlParameter("@pr_sell_amt", (object?)Dto.SellAmt ?? DBNull.Value),
                new NpgsqlParameter("@pr_mid_amt1", (object?)Dto.MidAmt1 ?? DBNull.Value),
                new NpgsqlParameter("@pr_mid_amt2", (object?)Dto.MidAmt2 ?? DBNull.Value),
                new NpgsqlParameter("@pr_bal_amt_date", (object?)Dto.BalAmtDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_trd_report", (object?)Dto.TrdReport ?? DBNull.Value),
                new NpgsqlParameter("@pr_contract_yn", (object?)Dto.ContractYn ?? DBNull.Value),
                new NpgsqlParameter("@pr_broker_type", (object?)Dto.BrokerType ?? DBNull.Value),
                new NpgsqlParameter("@pr_rt_no", (object?)Dto.RtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_off_no", (object?)Dto.OffNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_vendor_id", (object?)Dto.VendorId ?? DBNull.Value),
                new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_cn_contract_mgt", parameters);

            rtnVal = true;

            return rtnVal;
        }
        public async Task<bool> DeleteContract(int CnNo, string? UserId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "DEL"),
                new NpgsqlParameter("@pr_cn_no", (object?)CnNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_cn_contract_mgt", parameters);

            rtnVal = true;

            return rtnVal;
        }

        public async Task<ContractSpclList> SelectContractSpclList(int? CnNo, int? CnsNo, string? SpclDesc, int Page, int PageSize)
        {
            const string sql = @"
                select *
                from public.fn_cn_contract_spcl(
                    pr_proc   => @pr_proc,
                    pr_cn_no  => @pr_cn_no,
                    pr_cns_no => @pr_cns_no,
                    pr_spcl_desc => @pr_spcl_desc,
                    pr_page => @pr_page,
                    pr_page_size => @pr_page_size
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "SEL"),
                new NpgsqlParameter("@pr_cn_no", (object?)CnNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_cns_no", (object?)CnsNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_spcl_desc", (object?)CnNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_page", (object?)Page ?? DBNull.Value),
                new NpgsqlParameter("@pr_page_size", (object?)PageSize ?? DBNull.Value)
            };

            var ContractSpcls = await _dataService.QueryAsyncPg<ContractSpcl>("DEV", sql, parameters); // 쿼리 실행 전용 메서드


            return new ContractSpclList { ContractSpcls = ContractSpcls };
        }
        public async Task<bool> InsertContractSpcl(int CnNo, ContractSpclListCreateDto Dto, string? UserId)
        {
            bool rtnVal = false;

            string jsonData = global::System.Text.Json.JsonSerializer.Serialize(Dto.ContractSpcls);

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "INS"),
                new NpgsqlParameter("@pr_cn_no", CnNo),
                new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value),
                new NpgsqlParameter("@pr_json_data", NpgsqlDbType.Jsonb) { Value = jsonData }
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_cn_contract_spcl", parameters);

            rtnVal = true;

            return rtnVal;
        }
        public async Task<bool> UpdateContractSpcl(int CnNo, ContractSpclListUpdateDto Dto, string? UserId)
        {
            bool rtnVal = false;

            string jsonData = global::System.Text.Json.JsonSerializer.Serialize(Dto.ContractSpcls);

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "UPD"),
                new NpgsqlParameter("@pr_cn_no", CnNo),
                new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value),
                new NpgsqlParameter("@pr_json_data", NpgsqlDbType.Jsonb) { Value = jsonData }
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_cn_contract_spcl", parameters);

            rtnVal = true;

            return rtnVal;
        }
        public async Task<bool> DeleteContractSpcl(int CnNo, int CnsNo, string? UserId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "DEL"),
                new NpgsqlParameter("@pr_cn_no", (object?)CnNo),
                new NpgsqlParameter("@pr_cns_no", (object?)CnsNo),
                new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_cn_contract_spcl", parameters);

            rtnVal = true;

            return rtnVal;
        }
    }
}

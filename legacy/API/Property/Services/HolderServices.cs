using System.Data;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using Newtonsoft.Json;
using System.Collections.Generic;
using Npgsql;
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
    public interface IHolderServices
    {
        //시스템 메뉴관리
        public Task<PtHolderList> SelectHolderList(int? PtNo, string? HolderName, string? HolderPhone, int Page, int PageSize);
        public Task<bool> InsertHolder(int PtNo, PtHolderSaveDto Dto, string UserId);
        public Task<bool> UpdateHolder(int PtNo, int Idx, PtHolderUpdateDto Dto, string UserId);
        public Task<bool> DeleteHolder(int PtNo, int Idx, string? UserId);
    }

    public class HolderServices : IHolderServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public HolderServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        public async Task<PtHolderList> SelectHolderList(int? PtNo, string? HolderName, string? HolderPhone, int Page, int PageSize)
        {
            const string sql = @"
                select *
                from public.fn_pt_sale_holder(
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
                    pr_holder_address => @pr_holder_address,
                    pr_user_id => @pr_user_id
                );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "SEL"),
                new NpgsqlParameter("@pr_pt_no", (object?)PtNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_idx", DBNull.Value),
                new NpgsqlParameter("@pr_holder_type", DBNull.Value),
                new NpgsqlParameter("@pr_holder_reg_date", DBNull.Value),
                new NpgsqlParameter("@pr_holder_name", (object?)HolderName ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_phone", (object?)HolderPhone ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", DBNull.Value),
                new NpgsqlParameter("@pr_holder_relation", DBNull.Value),
                new NpgsqlParameter("@pr_holder_memo", DBNull.Value),
                new NpgsqlParameter("@pr_holder_address", DBNull.Value),
                new NpgsqlParameter("@pr_user_id", DBNull.Value)
            };

            var ptHolderList = await _dataService.QueryAsyncPg<PtHolder>("DEV", sql, parameters); // 쿼리 실행 전용 메서드

            return new PtHolderList { PtHolders = ptHolderList };
        }

        public async Task<bool> InsertHolder(int PtNo, PtHolderSaveDto Dto, string UserId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "INS"),
                new NpgsqlParameter("@pr_pt_no", PtNo),
                new NpgsqlParameter("@pr_idx", DBNull.Value),
                new NpgsqlParameter("@pr_holder_type", (object?)Dto.HolderType ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_reg_date", (object?)Dto.HolderRegDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_name", (object?)Dto.HolderName ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_phone", (object?)Dto.HolderPhone ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", (object?)Dto.CustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_relation", (object?)Dto.HolderRelation ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_memo", (object?)Dto.HolderMemo ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_address", (object?)Dto.HolderAddress ?? DBNull.Value),
                new NpgsqlParameter("@pr_user_id", UserId)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_pt_sale_holder", parameters);

            rtnVal = true;

            return rtnVal;
        }

        public async Task<bool> UpdateHolder(int PtNo, int Idx, PtHolderUpdateDto Dto, string UserId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "UPD"),
                new NpgsqlParameter("@pr_pt_no",PtNo),
                new NpgsqlParameter("@pr_idx", Idx),
                new NpgsqlParameter("@pr_holder_type", (object?)Dto.HolderType ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_reg_date", (object?)Dto.HolderRegDate ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_name", (object?)Dto.HolderName ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_phone", (object?)Dto.HolderPhone ?? DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", (object?)Dto.CustNo ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_relation", (object?)Dto.HolderRelation ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_memo", (object?)Dto.HolderMemo ?? DBNull.Value),
                new NpgsqlParameter("@pr_holder_address", (object?)Dto.HolderAddress ?? DBNull.Value),
                new NpgsqlParameter("@pr_user_id", UserId)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_pt_sale_holder", parameters);

            rtnVal = true;

            return rtnVal;
        }

        public async Task<bool> DeleteHolder(int PtNo, int Idx, string? UserId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "DEL"),
                new NpgsqlParameter("@pr_pt_no",PtNo),
                new NpgsqlParameter("@pr_idx", Idx),
                new NpgsqlParameter("@pr_holder_type", DBNull.Value),
                new NpgsqlParameter("@pr_holder_reg_date", DBNull.Value),
                new NpgsqlParameter("@pr_holder_name", DBNull.Value),
                new NpgsqlParameter("@pr_holder_phone", DBNull.Value),
                new NpgsqlParameter("@pr_cust_no", DBNull.Value),
                new NpgsqlParameter("@pr_holder_relation", DBNull.Value),
                new NpgsqlParameter("@pr_holder_memo", DBNull.Value),
                new NpgsqlParameter("@pr_holder_address", DBNull.Value),
                new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_pt_sale_holder", parameters);

            rtnVal = true;

            return rtnVal;
        }
    }
}

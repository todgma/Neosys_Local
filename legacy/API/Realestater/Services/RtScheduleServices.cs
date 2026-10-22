using System.Data;
using RealestateAPI.Realestater.Models;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using Newtonsoft.Json;
using System.Collections.Generic;
using Npgsql;
using Newtonsoft.Json.Linq;
using System.Text.RegularExpressions;
using System.Numerics;
using RealestateAPI.Office.Models;
using Org.BouncyCastle.Crypto.Generators;
using BCrypt.Net;
using RealestateAPI.Realestater.Controllers;
using Org.BouncyCastle.Asn1.Tsp;
using System.Security.AccessControl;

namespace RealestateAPI.Realestater.Services
{
    public interface IRtScheduleServices
    {
        public Task<RtScheduleList> SelectRtScheduleList(long? SchIdx, long? RtNo, string? SchType, string? ShaYn, string? Title, string? content, long? CustNo, string? CustInfo, string? SchDateFr, string? scjDateTo, int Page, int PageSize);
        public Task<bool> InsertRtSchedule(RtScheduleCreateDto Dto);
        public Task<bool> UpdateRtSchedule(long SchIdx, RtScheduleUpdateDto? Dto);
        public Task<bool> DeleteRtSchedule(long SchIdx, string? UserId);
    }

    public class RtScheduleServices : IRtScheduleServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public RtScheduleServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }


        public async Task<RtScheduleList> SelectRtScheduleList(long? SchIdx, long? RtNo, string? SchType, string? ShaYn, string? Title, string? Content, long? CustNo, string? CustInfo, string? SchDateFr, string? SchDateTo, int Page, int PageSize)
        {
            const string sql = @"
            select *
            from public.fn_rt_realtor_sche(
                pr_proc   => @p_proc,
                pr_sch_idx  => @pr_sch_idx,
                pr_rt_no => @pr_rt_no,
                pr_sch_type => @pr_sch_type,
                pr_sha_yn => @pr_sha_yn,
                pr_title => @pr_title,
                pr_content => @pr_content,
                pr_cust_no1 => @pt_cust_no1,
                pr_cust_info1 => @pr_cust_info1,
                pr_sch_date_fr => @pr_sch_date_fr,
                pr_sch_date_to => @pr_sch_date_to
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_proc", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = "SEL" },
                new NpgsqlParameter("@pr_sch_idx", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)SchIdx ?? DBNull.Value },
                new NpgsqlParameter("@pr_rt_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)RtNo ?? DBNull.Value },
                new NpgsqlParameter("@pr_sch_type", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)SchType ?? DBNull.Value },
                new NpgsqlParameter("@pr_sha_yn", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)ShaYn ?? DBNull.Value },
                new NpgsqlParameter("@pr_title", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Title ?? DBNull.Value },
                new NpgsqlParameter("@pr_content", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)Content ?? DBNull.Value },
                new NpgsqlParameter("@pt_cust_no1", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)CustNo ?? DBNull.Value },
                new NpgsqlParameter("@pr_cust_info1", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)CustInfo ?? DBNull.Value },
                new NpgsqlParameter("@pr_sch_date_fr", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)SchDateFr ?? DBNull.Value },
                new NpgsqlParameter("@pr_sch_date_to", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)SchDateTo ?? DBNull.Value },
                new NpgsqlParameter("@pr_page", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)Page ?? DBNull.Value },
                new NpgsqlParameter("@pr_page_size", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)PageSize ?? DBNull.Value }
            };

            var rows = await _dataService.QueryAsyncPg<RtSchedule>("DEV", sql, parameters); // 쿼리 실행 전용 메서드
            return new RtScheduleList { RtSchedules = rows };
        }

        public async Task<bool> InsertRtSchedule(RtScheduleCreateDto Dto)
        {
            
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "INS"),
                new NpgsqlParameter("@pr_rt_no", (object?)Dto.RtNo ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sch_type", (object?)Dto.SchType ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sha_yn", (object?)Dto.ShaYn ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sch_date", (object?)Dto.SchDate ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sch_time", (object?)Dto.SchTime ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sch_min", (object?)Dto.SchMin ?? DBNull.Value ),
                new NpgsqlParameter("@pr_title", (object?)Dto.Title ?? DBNull.Value ),
                new NpgsqlParameter("@pr_content", (object?)Dto.Content ?? DBNull.Value ),
                new NpgsqlParameter("@pr_cust_no1", (object?)Dto.CustNo1 ?? DBNull.Value ),
                new NpgsqlParameter("@pr_cust_no2", (object?)Dto.CustNo2 ?? DBNull.Value ),
                new NpgsqlParameter("@pr_cust_info1", (object?)Dto.CustInfo1 ?? DBNull.Value ),
                new NpgsqlParameter("@pr_cust_info2", (object?)Dto.CustInfo2 ?? DBNull.Value ),
                new NpgsqlParameter("@pr_user_id", (object?)Dto.UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_rt_realtor_sche", parameters);

            rtnVal = true;

            return rtnVal;
        }

        public async Task<bool> UpdateRtSchedule(long SchIdx, RtScheduleUpdateDto? Dto)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "UPD" ),
                new NpgsqlParameter("@pr_sch_idx", (object?)SchIdx),
                new NpgsqlParameter("@pr_rt_no", (object?)Dto.RtNo ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sch_type", (object?)Dto.SchType ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sha_yn", (object?)Dto.ShaYn ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sch_date", (object?)Dto.SchDate ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sch_time", (object?)Dto.SchTime ?? DBNull.Value ),
                new NpgsqlParameter("@pr_sch_min", (object?)Dto.SchMin ?? DBNull.Value ),
                new NpgsqlParameter("@pr_title", (object?)Dto.Title ?? DBNull.Value ),
                new NpgsqlParameter("@pr_content", (object?)Dto.Content ?? DBNull.Value ),
                new NpgsqlParameter("@pr_cust_no1", (object?)Dto.CustNo1 ?? DBNull.Value ),
                new NpgsqlParameter("@pr_cust_no2", (object?)Dto.CustNo2 ?? DBNull.Value ),
                new NpgsqlParameter("@pr_cust_info1", (object?)Dto.CustInfo1 ?? DBNull.Value ),
                new NpgsqlParameter("@pr_cust_info2", (object?)Dto.CustInfo2 ?? DBNull.Value ),
                new NpgsqlParameter("@pr_user_id", (object?)Dto.UserId ?? DBNull.Value)
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_rt_realtor_sche", parameters);

            rtnVal = true;

            return rtnVal;
        }

        public async Task<bool> DeleteRtSchedule(long SchIdx, string? UserId)
        {
            bool rtnVal = false;

            var parameters = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@pr_proc", "DEL"),
                    new NpgsqlParameter("@pr_Sch_idx", (object?)SchIdx ?? DBNull.Value ),
                    new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
                };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_rt_realtor_sche", parameters);

            rtnVal = true;

            return rtnVal;
        }
    }
}

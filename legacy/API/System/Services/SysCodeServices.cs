using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using Newtonsoft.Json;
using System.Collections.Generic;
using Npgsql;
using Newtonsoft.Json.Linq;
using System.Text.RegularExpressions;
using System.Numerics;
using RealestateAPI.Admin.Models;
using RealestateAPI.System.Models;
using RealestateAPI.Realestater.Models;
using RealestateAPI.System.Controllers;
using static RealestateAPI.System.Controllers.SysCodeControllers;

namespace RealestateAPI.System.Services
{
    public interface ISysCodeServices
    {
        //시스템 메뉴관리
        public Task<SysCodeSubList> SelectSysCodeList(string? CatCd, string? MidCd, string? SubCd, string? SubNm, string? UseYn);
        public Task<bool> InsertSysCodeList(SysCodeSubCreateListDto Dto, string? UserId);
        public Task<bool> UpdateSysCodeList(SysCodeSubCreateListDto Dto, string? UserId);
        public Task<bool> DeleteSysCodeList(string CatCd, string MIdCd, string SubCd);
    }

    public class SysCodeServices : ISysCodeServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public SysCodeServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        public async Task<SysCodeSubList> SelectSysCodeList(string? CatCd, string? MidCd, string? SubCd, string? SubNm, string? UseYn)
        {
            const string sql = @"
            select *
            from public.fn_sys_code_sub(
                pr_proc   => @pr_proc,
                pr_cat_cd  => @pr_cat_cd,
                pr_mid_cd => @pr_mid_cd,
                pr_sub_cd => @pr_sub_cd,
                pr_sub_nm => @pr_sub_nm,
                pr_use_yn => @pr_use_yn
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = "SEL" },
                new NpgsqlParameter("@pr_cat_cd", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)CatCd ?? DBNull.Value },
                new NpgsqlParameter("@pr_mid_cd", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)MidCd ?? DBNull.Value },
                new NpgsqlParameter("@pr_sub_cd", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)SubCd ?? DBNull.Value },
                new NpgsqlParameter("@pr_sub_nm", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)SubNm ?? DBNull.Value },
                new NpgsqlParameter("@pr_use_yn", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)UseYn ?? DBNull.Value },
            };

            var rows = await _dataService.QueryAsyncPg<SysCodeSub>("DEV", sql, parameters); // 쿼리 실행 전용 메서드

            return new SysCodeSubList {SysCodeSubs = rows };
        }

        public async Task<bool> InsertSysCodeList(SysCodeSubCreateListDto Dto, string? UserId)
        {
            try
            {
                bool rtnVal = false;

                if (Dto?.CreateSubCodes == null)
                    return true;

                foreach (SysCodeSubCreateDto subCd in Dto.CreateSubCodes)
                {
                    var parameters = new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@pr_proc", "INS"),
                        new NpgsqlParameter("@pr_cat_cd", (object?)subCd.CatCd?? DBNull.Value),
                        new NpgsqlParameter("@pr_mid_cd", (object?)subCd.MidCd ?? DBNull.Value),
                        new NpgsqlParameter("@pr_sub_cd", (object?)subCd.SubCd ?? DBNull.Value),
                        new NpgsqlParameter("@pr_sub_nm", (object?)subCd.SubNm ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc1", (object?)subCd.Etc1 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc2", (object?)subCd.Etc2 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc3", (object?)subCd.Etc3 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc4", (object?)subCd.Etc4 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc5", (object?)subCd.Etc5 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc6", (object?)subCd.Etc6 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc7", (object?)subCd.Etc7 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc8", (object?)subCd.Etc8 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc9", (object?)subCd.Etc9 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc10", (object?)subCd.Etc10 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_use_yn", (object?)subCd.UseYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_sort", (object?)subCd.Sort ?? DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
                    };

                    await _dataService.ExecFunctionAsyncPg("DEV", "fn_sys_code_sub", parameters);
                }

                rtnVal = true;

                return rtnVal;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<bool> UpdateSysCodeList(SysCodeSubCreateListDto Dto, string? UserId)
        {
            try
            {
                bool rtnVal = false;

                if (Dto?.CreateSubCodes == null)
                    return true;

                foreach (SysCodeSubCreateDto subCd in Dto.CreateSubCodes)
                {
                    var parameters = new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@pr_proc", "UPD"),
                        new NpgsqlParameter("@pr_cat_cd", (object?)subCd.CatCd?? DBNull.Value),
                        new NpgsqlParameter("@pr_mid_cd", (object?)subCd.MidCd ?? DBNull.Value),
                        new NpgsqlParameter("@pr_sub_cd", (object?)subCd.SubCd ?? DBNull.Value),
                        new NpgsqlParameter("@pr_sub_nm", (object?)subCd.SubNm ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc1", (object?)subCd.Etc1 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc2", (object?)subCd.Etc2 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc3", (object?)subCd.Etc3 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc4", (object?)subCd.Etc4 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc5", (object?)subCd.Etc5 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc6", (object?)subCd.Etc6 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc7", (object?)subCd.Etc7 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc8", (object?)subCd.Etc8 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc9", (object?)subCd.Etc9 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_etc10", (object?)subCd.Etc10 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_use_yn", (object?)subCd.UseYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_sort", (object?)subCd.Sort ?? DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
                    };

                    await _dataService.ExecFunctionAsyncPg("DEV", "fn_sys_code_sub", parameters);
                }

                rtnVal = true;

                return rtnVal;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<bool> DeleteSysCodeList(string CatCd, string MIdCd, string SubCd)
        {
            try
            {
                bool rtnVal = false;

                var parameters = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@pr_proc", "DEL"),
                    new NpgsqlParameter("@pr_cat_cd", CatCd),
                    new NpgsqlParameter("@pr_mid_cd", MIdCd),
                    new NpgsqlParameter("@pr_sub_cd", SubCd)
                };

                await _dataService.ExecFunctionAsyncPg("DEV", "fn_sys_code_sub", parameters);

                rtnVal = true;

                return rtnVal;
            }
            catch (Exception ex)
            {
                throw;
            }
        }
    }
}

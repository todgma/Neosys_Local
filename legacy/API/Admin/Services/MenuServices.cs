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
using RealestateAPI.Admin.Models;
using System.Net;
using static RealestateAPI.Admin.Controllers.MenuControllers;

namespace RealestateAPI.Admin.Services
{
    public interface IMenuServices
    {
        //시스템 메뉴관리
        public Task<MenuList> SelectMenuList();
        public Task<bool> InsertMenuList(MenuCreateListDto Dto, string? UserId);
        public Task<bool> UpdateMenuList(MenuUpdateListDto Dto, string? UserId);
        public Task<bool> DeleteMenuList(MenuDeleteListDto Dto, string? UserId);

        //사용자 메뉴관리
        public Task<MenuListRt> SelectMenuListRt(int RtNo);
        public Task<bool> InsertMenuListRt(MenuRtCreateListDto Dto, string? UserId);
        public Task<bool> UpdateMenuListRt(MenuRtUpdateListDto Dto, string? UserId);
        public Task<bool> DeleteMenuListRt(MenuRtDeleteListDto Dto, string? UserId);

    }

    public class MenuServices : IMenuServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public MenuServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        public async Task<MenuList> SelectMenuList()
        {
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", "SEL")
            };

            var menuList = await _dataService.GetListFromFunctionAsyncPg<MenuInfo>("DEV", "fn_sys_menu", parameters);

            return new MenuList
            {
                Menus = menuList,
            };
        }

        public async Task<bool> InsertMenuList(MenuCreateListDto Dto, string? UserId)
        {
            try
            {
                bool rtnVal = false;

                if (Dto?.CreateMenus == null)
                    return true;

                foreach (MenuCreateDto menu in Dto.CreateMenus)
                {
                    var parameters = new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@pr_proc", "INS"),
                        //new NpgsqlParameter("@pr_id", (object?)menu.Id ?? DBNull.Value ),
                        new NpgsqlParameter("@pr_mnu_nm", (object?)menu.MnuNm ?? DBNull.Value),
                        new NpgsqlParameter("@pr_lvl", (object?)menu.Lvl ?? DBNull.Value),
                        new NpgsqlParameter("@pr_parent_id", (object?)menu.ParentId ?? DBNull.Value),
                        new NpgsqlParameter("@pr_use_yn", (object?)menu.UseYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_sort", (object?)menu.Sort ?? DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
                    };

                        await _dataService.ExecFunctionAsyncPg("DEV", "fn_sys_menu", parameters);
                }

                rtnVal = true;

                return rtnVal;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<bool> UpdateMenuList(MenuUpdateListDto Dto, string? UserId)
        {
            try
            {
                bool rtnVal = false;

                if (Dto?.UpdateMenus == null)
                    return true;

                foreach (MenuUpdateDto menu in Dto.UpdateMenus)
                {
                    var parameters = new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@pr_proc", "UPD"),
                        new NpgsqlParameter("@pr_id", (object?)menu.Id ?? DBNull.Value ),
                        new NpgsqlParameter("@pr_mnu_nm", (object?)menu.MnuNm ?? DBNull.Value),
                        new NpgsqlParameter("@pr_lvl", (object?)menu.Lvl ?? DBNull.Value),
                        new NpgsqlParameter("@pr_parent_id", (object?)menu.ParentId ?? DBNull.Value),
                        new NpgsqlParameter("@pr_use_yn", (object?)menu.UseYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_sort", (object?)menu.Sort ?? DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
                    };

                    await _dataService.ExecFunctionAsyncPg("DEV", "fn_sys_menu", parameters);
                }

                rtnVal = true;

                return rtnVal;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<bool> DeleteMenuList(MenuDeleteListDto Dto, string? UserId)
        {
            try
            {
                bool rtnVal = false;

                if (Dto?.DeleteMenus == null)
                    return true;

                foreach (MenuDeleteDto menu in Dto.DeleteMenus)
                {
                    var parameters = new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@pr_proc", "DEL"),
                        new NpgsqlParameter("@pr_id", (object?)menu.Id ?? DBNull.Value ),
                        new NpgsqlParameter("@pr_mnu_nm", DBNull.Value),
                        new NpgsqlParameter("@pr_lvl", DBNull.Value),
                        new NpgsqlParameter("@pr_parent_id", DBNull.Value),
                        new NpgsqlParameter("@pr_use_yn", (object?)menu.UseYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_sort", DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
                    };

                    await _dataService.ExecFunctionAsyncPg("DEV", "fn_sys_menu", parameters);
                }

                rtnVal = true;

                return rtnVal;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<MenuListRt> SelectMenuListRt(int RtNo)
        {
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_rt_no", RtNo)
            };

            var menuListRt = await _dataService.GetListFromFunctionAsyncPg<MenuRt>("DEV", "fn_sys_menu_rt_sel", parameters);

            return new MenuListRt
            {
                MenusRt = menuListRt,
            };
        }

        public async Task<bool> InsertMenuListRt(MenuRtCreateListDto Dto, string? UserId)
        {
            try
            {
                bool rtnVal = false;

                if (Dto?.CreateMenusRt == null)
                    return true;

                foreach (MenuRtCreate menuRt in Dto.CreateMenusRt)
                {
                    var parameters = new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@pr_proc", "INS"),
                        new NpgsqlParameter("@pr_rt_no", (object?)menuRt.RtNo ?? DBNull.Value ),
                        new NpgsqlParameter("@pr_id", (object?)menuRt.Id ?? DBNull.Value ),
                        new NpgsqlParameter("@pr_c_yn", (object?)menuRt.CYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_r_yn", (object?)menuRt.RYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_u_yn", (object?)menuRt.UYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_d_yn", (object?)menuRt.DYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_use_yn", (object?)menuRt.UseYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
                    };

                    await _dataService.ExecFunctionAsyncPg("DEV", "fn_sys_menu_rt", parameters);
                }

                rtnVal = true;

                return rtnVal;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<bool> UpdateMenuListRt(MenuRtUpdateListDto Dto, string? UserId)
        {
            try
            {
                bool rtnVal = false;

                if (Dto?.UpdateMenusRt == null)
                    return true;

                foreach (MenuRtUpdate menuRt in Dto.UpdateMenusRt)
                {
                    var parameters = new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@pr_proc", "UPD"),
                        new NpgsqlParameter("@pr_rt_no", (object?)menuRt.RtNo ?? DBNull.Value ),
                        new NpgsqlParameter("@pr_id", (object?)menuRt.Id ?? DBNull.Value ),
                        new NpgsqlParameter("@pr_c_yn", (object?)menuRt.CYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_r_yn", (object?)menuRt.RYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_u_yn", (object?)menuRt.UYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_d_yn", (object?)menuRt.DYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_use_yn", (object?)menuRt.UseYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
                    };

                    await _dataService.ExecFunctionAsyncPg("DEV", "fn_sys_menu_rt", parameters);
                }

                rtnVal = true;

                return rtnVal;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<bool> DeleteMenuListRt(MenuRtDeleteListDto Dto, string? UserId)
        {
            try
            {
                bool rtnVal = false;

                if (Dto?.DeleteMenusRt == null)
                    return true;

                foreach (MenuRtDelete menuRt in Dto.DeleteMenusRt)
                {
                    var parameters = new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@pr_proc", "DEL"),
                        new NpgsqlParameter("@pr_rt_no", (object?)menuRt.RtNo ?? DBNull.Value ),
                        new NpgsqlParameter("@pr_id", (object?)menuRt.Id ?? DBNull.Value ),
                        new NpgsqlParameter("@pr_c_yn", DBNull.Value),
                        new NpgsqlParameter("@pr_r_yn", DBNull.Value),
                        new NpgsqlParameter("@pr_u_yn", DBNull.Value),
                        new NpgsqlParameter("@pr_d_yn", DBNull.Value),
                        new NpgsqlParameter("@pr_use_yn", (object?)menuRt.UseYn ?? DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)UserId ?? DBNull.Value)
                    };

                    await _dataService.ExecFunctionAsyncPg("DEV", "fn_sys_menu_rt", parameters);
                }

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

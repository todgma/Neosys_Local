using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Models;
using RealestateAPI.Admin.Services;
using System.Numerics;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Admin.Controllers
{
    [ApiController]
    [Route("/api/menu")]

    public class MenuControllers : ControllerBase
    {
        private readonly IMenuServices _menueService;

        private readonly ILogger<MenuControllers> _logger;

        private readonly IConfiguration _config;

        public MenuControllers(ILogger<MenuControllers> logger, IMenuServices menuService, IConfiguration config)
        {
            _menueService = menuService;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 메뉴조회
        /// </summary>
        /// <returns></returns>
        [HttpGet("GetMenuList")]
        public async Task<IActionResult> SelectMenuList()
        {
            var menuList = await _menueService.SelectMenuList();

            if (menuList == null || menuList.Menus?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "메뉴 정보 없음");
            }

            return Ok(ResponseHelper.Success(menuList, "메뉴 목록 조회 성공"));
        }

        /// <summary>
        /// 메뉴등록
        /// </summary>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPost("InsertMenuList")]
        public async Task<IActionResult> InsertMenuList([FromBody] MenuCreateListDto Dto, [FromQuery] string? UserId)
        {
            bool result = await _menueService.InsertMenuList(Dto, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "메뉴 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "메뉴 등록 성공"));
        }

        /// <summary>
        /// 메뉴수정
        /// </summary>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPut("UpdateMenuList")]
        public async Task<IActionResult> UpdateMenuList([FromBody] MenuUpdateListDto Dto, [FromQuery] string? UserId)
        {
            bool result = await _menueService.UpdateMenuList(Dto, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "메뉴 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "메뉴 수정 성공"));
        }

        /// <summary>
        /// 메뉴삭제
        /// </summary>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpDelete("DeleteRealestater")]
        public async Task<IActionResult> DeleteRealestater([FromBody] MenuDeleteListDto Dto, [FromQuery] string? UserId)
        {
            bool result = await _menueService.DeleteMenuList(Dto, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "메뉴 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "메뉴 삭제 성공"));
        }

        /// <summary>
        /// 사용자메뉴조회
        /// </summary>
        /// <param name="rtNo"></param>
        /// <returns></returns>
        [HttpGet("GetMenuListRt")]
        public async Task<IActionResult> SelectMenuListRt([FromQuery] int rtNo)
        {
            var menuList = await _menueService.SelectMenuListRt(rtNo);

            if (menuList == null || menuList.MenusRt?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "사용자메뉴 정보 없음");
            }

            return Ok(ResponseHelper.Success(menuList, "사용자메뉴 목록 조회 성공"));
        }

        /// <summary>
        /// 사용자메뉴등록
        /// </summary>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPost("InsertMenuListRt")]
        public async Task<IActionResult> InsertMenuListRt([FromBody] MenuRtCreateListDto Dto, [FromQuery] string? UserId)
        {
            bool result = await _menueService.InsertMenuListRt(Dto, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "사용자메뉴메뉴 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "사용자메뉴메뉴 등록 성공"));
        }

        /// <summary>
        /// 사용자메뉴수정
        /// </summary>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPut("UpdateMenuListRt")]
        public async Task<IActionResult> UpdateMenuList([FromBody] MenuRtUpdateListDto Dto, [FromQuery] string? UserId)
        {
            bool result = await _menueService.UpdateMenuListRt(Dto, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "사용자메뉴메뉴 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "사용자메뉴메뉴 수정 성공"));
        }

        /// <summary>
        /// 사용자메뉴삭제
        /// </summary>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpDelete("DeleteRealestaterRt")]
        public async Task<IActionResult> DeleteRealestater([FromBody] MenuRtDeleteListDto Dto, [FromQuery] string? UserId)
        {
            bool result = await _menueService.DeleteMenuListRt(Dto, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "사용자메뉴메뉴 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "사용자메뉴메뉴 삭제 성공"));
        }


        //DTO 영역//
        public class MenuCreateDto
        {
            public string MnuNm { get; set; } = default!;
            public int Lvl { get; set; }
            public int ParentId { get; set; }
            public string UseYn { get; set; } = default!;
            public int Sort { get; set; } = default!;
        }

        public class MenuCreateListDto
        {
            public List<MenuCreateDto>? CreateMenus { get; set; }
        }

        public class MenuUpdateDto
        {
            public int Id { get; set; }
            public string? MnuNm { get; set; }
            public int? Lvl { get; set; }
            public int? ParentId { get; set; }
            public string? UseYn { get; set; }
            public int? Sort {  get; set; }
        }

        public class MenuUpdateListDto
        {
            public List<MenuUpdateDto>? UpdateMenus { get; set; }
        }

        public class MenuDeleteDto
        {
            public int? Id { get; set; }
            public string? UseYn { get; set; }
        }

        public class MenuDeleteListDto
        {
            public List<MenuDeleteDto>? DeleteMenus { get; set; }
        }

        public class MenuRtCreate
        {
            public int RtNo { get; set; } = default!;
            public int Id { get; set; }
            public string? CYn { get; set; }
            public string? RYn { get; set; }
            public string? UYn { get; set; }
            public string? DYn { get; set; }
            public string? UseYn { get; set; }
        }

        public class MenuRtCreateListDto
        {
            public List<MenuRtCreate>? CreateMenusRt { get; set; }
        }

        public class MenuRtUpdate
        {
            public int RtNo { get; set; } = default!;
            public int Id { get; set; }
            public string? CYn { get; set; }
            public string? RYn { get; set; }
            public string? UYn { get; set; }
            public string? DYn { get; set; }
            public string? UseYn { get; set; }
        }

        public class MenuRtUpdateListDto
        {
            public List<MenuRtUpdate>? UpdateMenusRt { get; set; }
        }

        public class MenuRtDelete
        {
            public int RtNo { get; set; } = default!;
            public int Id { get; set; }
            public string? UseYn { get; set; }
        }

        public class MenuRtDeleteListDto
        {
            public List<MenuRtDelete>? DeleteMenusRt { get; set; }
        }

    }
}

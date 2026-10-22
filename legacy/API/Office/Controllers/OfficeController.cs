using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Office.Models;
using RealestateAPI.Office.Services;
using System.Numerics;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.Realestater.Controllers;
using System.Text.RegularExpressions;

namespace RealestateAPI.Office.Controllers
{
    [ApiController]
    [Route("/api/office")]

    public class OfficeController : ControllerBase
    {
        private readonly IOfficeServices _officeService;

        private readonly ILogger<OfficeController> _logger;

        private readonly IConfiguration _config;

        public OfficeController(ILogger<OfficeController> logger, IOfficeServices adminUserService, IConfiguration config)
        {
            _officeService = adminUserService;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 사무실정보조회
        /// </summary>
        /// <param name="offNo">USER_ID</param>
        /// <param name="offNm">USER_ID</param>
        /// <returns></returns>
        [HttpGet("GetOfficeList")]
        public async Task<IActionResult> SelectOfficeList(int? offNo, string? offNm)
        {
            var offices = await _officeService.SelectOfficeList(offNo, offNm);

            if (offices == null || offices.Offices?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "사무실 정보 없음");
            }

            return Ok(ResponseHelper.Success(offices, "사무실 목록 조회 성공"));
        }

        /// <summary>
        /// 사무실정보등록
        /// </summary>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] OfficeInfoCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            bool result = await _officeService.InsertOffice(dto.OffNm, dto.Addr, dto.RpsNm, dto.RpsPhone, dto.OffTel, dto.OffFax, dto.RegNo, dto.BizNo, dto.UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "사무실 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "사무실 등록 성공"));
        }

        /// <summary>
        /// 사무실정보수정
        /// </summary>
        /// <param name="offNo"></param>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPut("{offNo:int}")]
        public async Task<IActionResult> Update([FromRoute] int offNo, [FromBody] OfficeInfoUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }
            bool result = await _officeService.UpdateOffice(offNo, dto.OffNm, dto.Addr, dto.RpsNm, dto.RpsPhone, dto.OffTel, dto.OffFax, dto.RegNo, dto.BizNo, dto.UserId);

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "사무실정보 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "사무실정보 수정 성공"));
        }

        /// <summary>
        /// 사무실정보삭제
        /// </summary>
        /// <param name="offNo"></param>
        /// <param name="userId"></param>
        /// <returns></returns>
        [HttpDelete("{offNo:int}")]
        public async Task<IActionResult> Delete([FromRoute] int offNo, [FromQuery] string? userId)
        {
            bool result = await _officeService.DeleteOffice(offNo, userId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "사무실 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "사무실 삭제 성공"));
        }

        /// <summary>
        /// 사용자사무실정보조회
        /// </summary>
        /// <param name="userId"></param>
        /// <returns></returns>
        [HttpGet("GetUserOffice")]
        public async Task<IActionResult> SelectOfficeByUser(string userId)
        {
            var offices = await _officeService.SelectOfficeByUser(userId);

            if (offices.OffNo == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "사무실 정보 없음");
            }

            return Ok(ResponseHelper.Success(offices, "사무실 목록 조회 성공"));
        }

        /// <summary>인사말(사무소 공유) 저장 — 소속 전원 동일 표기</summary>
        [HttpPut("{offNo:int}/greeting")]
        public async Task<IActionResult> UpdateGreeting([FromRoute] int offNo, [FromBody] OfficeGreetingDto dto)
        {
            bool result = await _officeService.UpdateGreeting(offNo, dto?.Greeting, dto?.UserId);
            if (!result) ResponseHelper.Error("UPDATE_FAILED", "인사말 저장 실패");
            return Ok(ResponseHelper.Success(result, "인사말 저장 성공"));
        }
    }

    // ===== DTOs =====
    public class OfficeGreetingDto
    {
        public string? Greeting { get; set; }
        public string? UserId { get; set; }
    }

    public class OfficeInfoCreateDto
    {
        public string OffNm { get; set; } = default!;
        public string RpsNm { get; set; } = default!;
        public string? Addr { get; set; } 
        public string? RpsPhone { get; set; }
        public string? OffTel { get; set; }
        public string? OffFax { get; set; }
        public string? RegNo { get; set; }
        public string? BizNo { get; set; }
        public string? UserId { get; set; }
    }

    public class OfficeInfoUpdateDto
    {
        public string? OffNm { get; set; }
        public string? RpsNm { get; set; }
        public string? Addr { get; set; }
        public string? RpsPhone { get; set; }
        public string? OffTel { get; set; }
        public string? OffFax { get; set; }
        public string? RegNo { get; set; }
        public string? BizNo { get; set; }
        public string? UserId { get; set; }
    }
}

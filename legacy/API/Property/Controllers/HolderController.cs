using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Property.Models;
using RealestateAPI.Property.Services;
using System.Numerics;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.Realestater.Controllers;
using System.Text.RegularExpressions;
using RealestateAPI.Office.Controllers;
using RealestateAPI.Office.Services;

namespace RealestateAPI.Property.Controllers
{
    [ApiController]
    [Route("/api/holder")]

    public class HolderController : ControllerBase
    {
        private readonly IHolderServices _service;

        private readonly ILogger<HolderController> _logger;

        private readonly IConfiguration _config;

        public HolderController(ILogger<HolderController> logger, IHolderServices service, IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 소유자정보조회
        /// </summary>
        /// <param name="ptNo"></param>
        /// <param name="HolderName"></param>
        /// <param name="HolderPhone"></param>
        /// <param name="Page"></param>
        /// <param name="PageSize"></param>
        /// <returns></returns>
        [HttpGet("GetPropertyList")]
        public async Task<IActionResult> SelectHolderList([FromQuery] int? ptNo, [FromQuery] string? HolderName, [FromQuery] string? HolderPhone, [FromQuery][Required] int Page = 1, [FromQuery][Required] int PageSize = 20)
        {
            var holders = await _service.SelectHolderList(ptNo, HolderName, HolderPhone, Page, PageSize);

            if (holders == null || holders.PtHolders?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "소유자정보 없음");
            }

            return Ok(ResponseHelper.Success(holders, "소유자정보 목록 조회 성공"));
        }

        /// <summary>
        /// 소유자정보등록
        /// </summary>
        /// <param name="PtNo"></param>
        /// <param name="dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> InsertHolder([FromQuery][Required] int PtNo, [FromBody] PtHolderSaveDto dto, string UserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            bool result = await _service.InsertHolder(PtNo, dto, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "소유자정보 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "소유자정보 등록 성공"));
        }

        /// <summary>
        /// 소유자정보 수정
        /// </summary>
        /// <param name="PtNo"></param>
        /// <param name="Idx"></param>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPut("{PtNo:int}")]
        public async Task<IActionResult> UpdateHolder([Required] int PtNo, [FromQuery][Required] int Idx, PtHolderUpdateDto Dto, string UserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            bool result = await _service.UpdateHolder(PtNo, Idx, Dto, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "소유자정보 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "소유자정보 수정 성공"));
        }

        /// <summary>
        /// 소유자정보삭제
        /// </summary>
        /// <param name="PtNo"></param>
        /// <param name="Idx"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpDelete("{PtNo:int}")]
        public async Task<IActionResult> Delete([FromRoute][Required] int PtNo, [FromQuery][Required] int Idx, [FromQuery] string? UserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            bool result = await _service.DeleteHolder(PtNo, Idx, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "소유자정보 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "소유자정보 삭제 성공"));
        }
    }
}
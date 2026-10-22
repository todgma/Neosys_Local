using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Realestater.Services;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Realestater.Controllers
{
    [ApiController]
    [Route("api/realestater_schedule")]
    public class RtScheduleController : ControllerBase
    {
        private readonly IRtScheduleServices _service;
        private readonly ILogger<RtScheduleController> _logger;
        private readonly IConfiguration _config;

        public RtScheduleController(
            ILogger<RtScheduleController> logger,
            IRtScheduleServices service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 중계인일정 목록조회
        /// </summary>
        /// <param name="SchDateFr"></param>
        /// <param name="SchDateTo"></param>
        /// <param name="SchIdx"></param>
        /// <param name="RtNo"></param>
        /// <param name="SchType"></param>
        /// <param name="ShaYn"></param>
        /// <param name="Title"></param>
        /// <param name="Content"></param>
        /// <param name="CustNo"></param>
        /// <param name="CustInfo"></param>
        /// <param name="Page"></param>
        /// <param name="PageSize"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery][Required] string SchDateFr, [FromQuery][Required] string SchDateTo, [FromQuery] long? SchIdx, [FromQuery] long? RtNo, [FromQuery] string? SchType, [FromQuery] string? ShaYn, [FromQuery] string? Title, [FromQuery] string? Content, [FromQuery] long? CustNo, [FromQuery] string? CustInfo, [FromQuery] int Page = 1, [FromQuery] int PageSize = 20)
        {
            var list = await _service.SelectRtScheduleList(SchIdx, RtNo, SchType, ShaYn, Title, Content, CustNo, CustInfo, SchDateFr, SchDateTo, Page, PageSize);

            if (list == null || list.RtSchedules?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "중개인일정 정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "중개인일정 목록 조회 성공"));
        }

        /// <summary>
        /// 중개인일정 등록
        /// </summary>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] RtScheduleCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.InsertRtSchedule(dto);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "중개인일정 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "중개인일정 등록 성공"));
        }

        /// <summary>
        /// 중개인일정업데이트
        /// </summary>
        /// <param name="SchIdx"></param>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPut("{SchIdx:int}")]
        public async Task<IActionResult> Update([FromRoute][Required] long SchIdx, [FromBody] RtScheduleUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.UpdateRtSchedule(SchIdx, dto);

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "중개인일정 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "중개인일정 수정 성공"));
        }

        /// <summary>
        /// 중계인일정삭제
        /// </summary>
        /// <param name="SchIdx"></param>
        /// <param name="userId"></param>
        /// <returns></returns>
        [HttpDelete("{SchIdx:int}")]
        public async Task<IActionResult> Delete([FromRoute] long SchIdx, [FromQuery] string? userId)
        {
            var result = await _service.DeleteRtSchedule(SchIdx, userId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "중개인일정 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "중개인일정 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class RtScheduleCreateDto
    {
        public long RtNo { get; set; } = default!;
        public string SchType { get; set; } = default!;
        public string? ShaYn { get; set; }
        public string SchDate { get; set; } = default!;
        public int? SchTime { get; set; }
        public int? SchMin { get; set; }
        public string Title { get; set; } = default!;
        public string? Content { get; set; }
        public long? CustNo1 { get; set; }
        public long? CustNo2 { get; set; }
        public string? CustInfo1 { get; set; }
        public string? CustInfo2 { get; set; }
        public string? UserId { get; set; }
    }

    public class RtScheduleUpdateDto
    {
        public long? RtNo { get; set; }
        public string? SchType { get; set; }
        public string? ShaYn { get; set; }
        public string? SchDate { get; set; }
        public int? SchTime { get; set; }
        public int? SchMin { get; set; }
        public string? Title { get; set; }
        public string? Content { get; set; }
        public long? CustNo1 { get; set; }
        public long? CustNo2 { get; set; }
        public string? CustInfo1 { get; set; }
        public string? CustInfo2 { get; set; }
        public string? UserId { get; set; }
    }
}

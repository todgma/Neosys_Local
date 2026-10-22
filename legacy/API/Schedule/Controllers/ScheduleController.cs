using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.Schedule.Services;

namespace RealestateAPI.Schedule.Controllers
{
    [ApiController]
    [Route("api/Schedule")]
    public class ScheduleController : ControllerBase
    {
        private readonly IScheduleServices _service;
        private readonly ILogger<ScheduleController> _logger;
        private readonly IConfiguration _config;

        public ScheduleController(
            ILogger<ScheduleController> logger,
            IScheduleServices service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 일정 목록 조회
        /// </summary>
        /// <param name="StartDate"></param>
        /// <param name="EndDate"></param>
        /// <param name="ScheduleId"></param>
        /// <param name="ScopeDiv"></param>
        /// <param name="OwnerUserId"></param>
        /// <param name="OfficeId"></param>
        /// <param name="Page"></param>
        /// <param name="PageSize"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetList(
            [FromQuery][Required] string StartDate,
            [FromQuery][Required] string EndDate,
            [FromQuery] long? ScheduleId,
            [FromQuery] string? ScopeDiv,
            [FromQuery] string? OwnerUserId,
            [FromQuery] long? OfficeId,
            [FromQuery][Required] int Page = 1,
            [FromQuery][Required] int PageSize = 20)
        {
            var list = await _service.SelectScheduleList(StartDate, EndDate, ScheduleId, ScopeDiv, OwnerUserId, OfficeId, Page, PageSize);

            if (list == null || list.Schedules?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "일정 정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "일정 목록 조회 성공"));
        }

        /// <summary>
        /// 물건번호로 연동된 일정 조회
        /// </summary>
        [HttpGet("by-property/{ptNo}")]
        public async Task<IActionResult> GetListByProperty([FromRoute] string ptNo)
        {
            var list = await _service.SelectScheduleListByProperty(ptNo);
            return Ok(ResponseHelper.Success(list, "물건 일정 조회 성공"));
        }

        /// <summary>
        /// 일정 등록
        /// </summary>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ScheduleCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.InsertSchedule(dto);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "일정 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "일정 등록 성공"));
        }

        /// <summary>
        /// 일정 수정
        /// </summary>
        /// <param name="scheduleId"></param>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPut("{scheduleId:long}")]
        public async Task<IActionResult> Update([FromRoute] long scheduleId, [FromBody] ScheduleUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.UpdateSchedule(scheduleId, dto);

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "일정 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "일정 수정 성공"));
        }

        /// <summary>
        /// 일정 삭제
        /// </summary>
        /// <param name="scheduleId"></param>
        /// <param name="userId"></param>
        /// <returns></returns>
        [HttpDelete("{scheduleId:long}")]
        public async Task<IActionResult> Delete([FromRoute] long scheduleId, [FromQuery] string? userId)
        {
            var result = await _service.DeleteSchedule(scheduleId, userId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "일정 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "일정 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class ScheduleCreateDto
    {
        [Required]
        [RegularExpression("^(MY|OFFICE|SHARE)$", ErrorMessage = "ScopeDiv must be one of: MY, OFFICE, SHARE")]
        public string ScopeDiv { get; set; } = default!;

        [Required]
        public string OwnerUserId { get; set; } = default!;

        public long? OfficeId { get; set; }

        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Phone { get; set; }
        public string? Location { get; set; }

        [Required]
        public string StartAt { get; set; } = default!;

        public string? EndAt { get; set; }

        public bool AllDay { get; set; } = false;
        public bool IsShared { get; set; } = false;
        public bool IsPrivate { get; set; } = false;

        public string? Category { get; set; }
        public decimal? Amount { get; set; }
        public string? ContactName { get; set; }
        public string? ContactRole { get; set; }   // 1연락처 구분(매도인/매수인)
        public string? Phone2 { get; set; }         // 2연락처
        public string? ContactName2 { get; set; }   // 2연락처 성함
        public string? ContactRole2 { get; set; }   // 2연락처 구분

        public string? UserId { get; set; }

        // 연동 정보 (선택)
        public List<ScheduleLinkDto>? Links { get; set; }
    }

    public class ScheduleUpdateDto
    {
        [RegularExpression("^(MY|OFFICE|SHARE)$", ErrorMessage = "ScopeDiv must be one of: MY, OFFICE, SHARE")]
        public string? ScopeDiv { get; set; }
        public string? OwnerUserId { get; set; }
        public long? OfficeId { get; set; }
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Phone { get; set; }
        public string? Location { get; set; }
        public string? StartAt { get; set; }
        public string? EndAt { get; set; }
        public bool? AllDay { get; set; }
        public bool? IsShared { get; set; }
        public bool? IsPrivate { get; set; }
        public string? Category { get; set; }
        public decimal? Amount { get; set; }
        public string? ContactName { get; set; }
        public string? ContactRole { get; set; }
        public string? Phone2 { get; set; }
        public string? ContactName2 { get; set; }
        public string? ContactRole2 { get; set; }
        public string? UserId { get; set; }

        // 연동 정보 (선택)
        public List<ScheduleLinkDto>? Links { get; set; }
    }

    public class ScheduleLinkDto
    {
        [Required]
        public string LinkType { get; set; } = default!;

        public string? LinkKey { get; set; }
        public string? Meta { get; set; }
    }
}

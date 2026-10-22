using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Sms.Services;
using RealestateAPI.Sms.Models;

namespace RealestateAPI.Sms.Controllers
{
    [ApiController]
    [Route("api/Sms")]
    public class SmsController : ControllerBase
    {
        private readonly ISmsServices _service;
        private readonly ILogger<SmsController> _logger;

        public SmsController(ILogger<SmsController> logger, ISmsServices service)
        {
            _service = service;
            _logger = logger;
        }

        /// <summary>주소록 그룹 목록(중개인 rt_no 단위 — 같은 사무소라도 회원별 분리)</summary>
        [HttpGet("groups")]
        public async Task<IActionResult> GetGroups([FromQuery] long rtNo)
        {
            var list = await _service.GetGroups(rtNo);
            return Ok(ResponseHelper.Success(list, "그룹 목록 조회 성공"));
        }

        /// <summary>주소록 그룹 생성(멤버 포함 · 멤버는 생성 시점 고정)</summary>
        [HttpPost("groups")]
        public async Task<IActionResult> CreateGroup([FromBody] SmsGroupCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다."));
            var result = await _service.CreateGroup(dto);
            if (result == null)
                return Ok(ResponseHelper.Error("INSERT_FAILED", "그룹 등록 실패"));
            return Ok(ResponseHelper.Success(result, "그룹 등록 성공"));
        }

        /// <summary>그룹명/메모 수정(멤버·전송이력은 수정하지 않음)</summary>
        [HttpPut("groups/{groupId:long}")]
        public async Task<IActionResult> UpdateGroup([FromRoute] long groupId, [FromBody] SmsGroupUpdateDto dto)
        {
            var result = await _service.UpdateGroup(groupId, dto);
            return Ok(ResponseHelper.Success(result, "그룹 수정 성공"));
        }

        /// <summary>그룹 삭제(논리 삭제)</summary>
        [HttpDelete("groups/{groupId:long}")]
        public async Task<IActionResult> DeleteGroup([FromRoute] long groupId)
        {
            var result = await _service.DeleteGroup(groupId);
            return Ok(ResponseHelper.Success(result, "그룹 삭제 성공"));
        }

        /// <summary>발송 이력 조회(중개인 rt_no 단위 — 전체 또는 특정 그룹)</summary>
        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] long rtNo, [FromQuery] long? groupId)
        {
            var list = await _service.GetHistory(rtNo, groupId);
            return Ok(ResponseHelper.Success(list, "발송 이력 조회 성공"));
        }

        /// <summary>문자 전송 기록(실제 전송 시 전송일/내용 자동 적재)</summary>
        [HttpPost("send")]
        public async Task<IActionResult> Send([FromBody] SmsSendDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다."));
            var result = await _service.LogSend(dto);
            if (result == null)
                return Ok(ResponseHelper.Error("SEND_LOG_FAILED", "발송 기록 실패"));
            return Ok(ResponseHelper.Success(result, "발송 기록 성공"));
        }
    }
}

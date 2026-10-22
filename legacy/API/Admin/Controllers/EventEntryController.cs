using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Models;
using RealestateAPI.Admin.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    /// <summary>참여형 이벤트 참여 제출/조회/확인</summary>
    [ApiController]
    [Route("api/events")]
    public class EventEntryController : ControllerBase
    {
        private readonly IEventEntryService _service;
        public EventEntryController(IEventEntryService service) { _service = service; }

        /// <summary>이벤트 참여 제출 — 참여 1행 + 첨부파일 메타 저장</summary>
        [HttpPost("entries")]
        public async Task<IActionResult> Submit([FromBody] EventEntrySubmitDto dto)
        {
            if (dto == null || dto.EventId <= 0) return Ok(ResponseHelper.Error("BAD_REQUEST", "이벤트 정보가 올바르지 않습니다."));
            var entryId = await _service.SubmitEntry(dto);
            if (entryId <= 0) return Ok(ResponseHelper.Error("SUBMIT_FAILED", "참여 제출에 실패했습니다."));
            return Ok(ResponseHelper.Success(new { entryId }, "참여가 제출되었습니다."));
        }

        /// <summary>내 참여 내역 — userId/offNo 기준 (참여형 상태 확인용)</summary>
        [HttpGet("entries")]
        public async Task<IActionResult> MyEntries([FromQuery] string? userId, [FromQuery] long? offNo)
        {
            var items = await _service.GetMyEntries(userId, offNo);
            return Ok(ResponseHelper.Success(new { items }, "내 참여 내역 조회"));
        }

        /// <summary>확인완료 + 미확인(대시보드 팝업용) — 대표자 로그인 시 1회 노출 대상</summary>
        [HttpGet("entries/confirmed-unseen")]
        public async Task<IActionResult> ConfirmedUnseen([FromQuery] string? userId, [FromQuery] long? offNo)
        {
            var items = await _service.GetConfirmedUnseen(userId, offNo);
            return Ok(ResponseHelper.Success(new { items }, "확인완료 미확인 조회"));
        }

        /// <summary>대시보드 팝업 표시 후 확인 처리(user_seen='Y')</summary>
        [HttpPost("entries/mark-seen")]
        public async Task<IActionResult> MarkSeen([FromBody] MarkSeenDto dto)
        {
            var cnt = await _service.MarkSeen(dto?.EntryIds ?? new List<long>());
            return Ok(ResponseHelper.Success(new { marked = cnt }, "확인 처리"));
        }

        /// <summary>[관리자] 특정 이벤트의 참여자 목록</summary>
        [HttpGet("~/api/admin/events/{eventId:long}/entries")]
        public async Task<IActionResult> EventEntries([FromRoute] long eventId)
        {
            var items = await _service.GetEventEntries(eventId);
            return Ok(ResponseHelper.Success(new { items }, "이벤트 참여자 조회"));
        }

        /// <summary>[관리자] 참여 확인 처리 — 확인완료/반려</summary>
        [HttpPut("~/api/admin/event-entries/{entryId:long}/confirm")]
        public async Task<IActionResult> Confirm([FromRoute] long entryId, [FromBody] EventEntryConfirmDto dto)
        {
            var ok = await _service.ConfirmEntry(entryId, dto);
            return Ok(ResponseHelper.Success(new { updated = ok }, ok ? "처리되었습니다." : "대상 없음"));
        }
    }

    public class MarkSeenDto
    {
        public List<long>? EntryIds { get; set; }
    }
}

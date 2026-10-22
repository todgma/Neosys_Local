using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Services;
using System;
using System.Threading.Tasks;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/events")]
    public class EventController : ControllerBase
    {
        private readonly IEventService _service;
        public EventController(IEventService service) { _service = service; }

        /// <summary>이벤트 목록 (isPublic='Y'로 공개분만 필터 가능)</summary>
        [HttpGet]
        public async Task<IActionResult> GetList(
            [FromQuery] long? eventId, [FromQuery] string? isPublic, [FromQuery] string? isPopup, [FromQuery] string? showDashboard,
            [FromQuery] string? isParticipatory,
            [FromQuery] int pageNumber = 1, [FromQuery] int rowsPerPage = 100)
        {
            var list = await _service.SelectEventList(eventId, isPublic, isPopup, showDashboard, isParticipatory, pageNumber, rowsPerPage);
            return Ok(ResponseHelper.Success(list, "이벤트 목록 조회 성공"));
        }

        /// <summary>이벤트 상세 (조회수 하루 1회 +1)</summary>
        [HttpGet("{eventId:long}")]
        public async Task<IActionResult> GetDetail([FromRoute] long eventId, [FromQuery] string? viewerId)
        {
            var row = await _service.GetDetail(eventId, viewerId);
            if (row == null) return Ok(ResponseHelper.Success(null, "이벤트 없음"));
            return Ok(ResponseHelper.Success(row, "이벤트 상세 조회"));
        }

        [HttpPost]
        public async Task<IActionResult> Insert([FromBody] EventInsertDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title)) return Ok(ResponseHelper.Error("BAD_REQUEST", "제목은 필수입니다."));
            var ok = await _service.InsertEvent(dto.Title, dto.Content, dto.ImageUrl, dto.LinkUrl, dto.IsPublic, dto.IsPopup, dto.ShowOnDashboard,
                dto.PopupW, dto.PopupH, dto.StartDate, dto.EndDate, dto.SortOrder, dto.IsParticipatory, dto.UserId);
            return Ok(ResponseHelper.Success(ok, ok ? "이벤트 등록 성공" : "등록 실패"));
        }

        [HttpPut("{eventId:long}")]
        public async Task<IActionResult> Update([FromRoute] long eventId, [FromBody] EventUpdateDto dto)
        {
            var ok = await _service.UpdateEvent(eventId, dto.Title, dto.Content, dto.ImageUrl, dto.LinkUrl, dto.IsPublic, dto.IsPopup, dto.ShowOnDashboard,
                dto.PopupW, dto.PopupH, dto.StartDate, dto.EndDate, dto.SortOrder, dto.IsParticipatory, dto.UserId);
            return Ok(ResponseHelper.Success(ok, ok ? "이벤트 수정 성공" : "수정 실패"));
        }

        [HttpDelete("{eventId:long}")]
        public async Task<IActionResult> Delete([FromRoute] long eventId, [FromQuery] string? userId)
        {
            var ok = await _service.DeleteEvent(eventId, userId);
            return Ok(ResponseHelper.Success(ok, ok ? "이벤트 삭제 성공" : "삭제 실패"));
        }
    }

    public class EventInsertDto
    {
        public string Title { get; set; } = default!;
        public string? Content { get; set; }
        public string? ImageUrl { get; set; }
        public string? LinkUrl { get; set; }
        public string? IsPublic { get; set; }
        public string? IsPopup { get; set; }
        public string? ShowOnDashboard { get; set; }
        public int? PopupW { get; set; }
        public int? PopupH { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? SortOrder { get; set; }
        public string? IsParticipatory { get; set; }   // 참여형 여부 'Y'/'N'
        public string? UserId { get; set; }
    }

    public class EventUpdateDto : EventInsertDto { }
}

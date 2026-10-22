using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Services;
using RealestateAPI.Admin.Models;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/notices")]
    public class NoticeController : ControllerBase
    {
        private readonly INoticeService _service;
        private readonly ILogger<NoticeController> _logger;
        private readonly IConfiguration _config;

        public NoticeController(
            ILogger<NoticeController> logger,
            INoticeService service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 공지사항 목록조회 (페이징)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetNoticeList(
            [FromQuery] long? noticeId,
            [FromQuery] string? category,
            [FromQuery] string? isPublic,
            [FromQuery] string? isPopup,
            [FromQuery] string? showDashboard,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int rowsPerPage = 10)
        {
            var list = await _service.SelectNoticeList(noticeId, category, isPublic, isPopup, showDashboard, pageNumber, rowsPerPage);

            if (list == null || list.Notices?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "공지사항 정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "공지사항 목록 조회 성공"));
        }

        /// <summary>
        /// 공지사항 등록
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> InsertNotice([FromBody] NoticeInsertDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.InsertNotice(
                dto.Title, dto.Content, dto.Category, dto.IsTop, dto.IsPublic, dto.IsPopup, dto.ShowOnDashboard,
                dto.PopupW, dto.PopupH, dto.AttachFile, dto.StartDate, dto.EndDate, dto.SortOrder, dto.UserId
            );

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "공지사항 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "공지사항 등록 성공"));
        }

        /// <summary>
        /// 공지사항 수정
        /// </summary>
        [HttpPut("{noticeId:long}")]
        public async Task<IActionResult> UpdateNotice(
            [FromRoute] long noticeId,
            [FromBody] NoticeUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.UpdateNotice(
                noticeId, dto.Title, dto.Content, dto.Category, dto.IsTop, dto.IsPublic, dto.IsPopup, dto.ShowOnDashboard,
                dto.PopupW, dto.PopupH, dto.AttachFile, dto.StartDate, dto.EndDate, dto.SortOrder, dto.UserId
            );

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "공지사항 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "공지사항 수정 성공"));
        }

        /// <summary>
        /// 공지사항 삭제
        /// </summary>
        [HttpDelete("{noticeId:long}")]
        public async Task<IActionResult> DeleteNotice(
            [FromRoute] long noticeId,
            [FromQuery] string? userId)
        {
            var result = await _service.DeleteNotice(noticeId, userId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "공지사항 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "공지사항 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class NoticeInsertDto
    {
        public string Title { get; set; } = default!;
        public string Content { get; set; } = default!;
        public string? Category { get; set; }
        public string? IsTop { get; set; }
        public string? IsPublic { get; set; }
        public string? IsPopup { get; set; }
        public string? ShowOnDashboard { get; set; }
        public int? PopupW { get; set; }
        public int? PopupH { get; set; }
        public string? AttachFile { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? SortOrder { get; set; }
        public string? UserId { get; set; }
    }

    public class NoticeUpdateDto
    {
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Category { get; set; }
        public string? IsTop { get; set; }
        public string? IsPublic { get; set; }
        public string? IsPopup { get; set; }
        public string? ShowOnDashboard { get; set; }
        public int? PopupW { get; set; }
        public int? PopupH { get; set; }
        public string? AttachFile { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? SortOrder { get; set; }
        public string? UserId { get; set; }
    }
}

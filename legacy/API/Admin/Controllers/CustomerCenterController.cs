using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Services;
using RealestateAPI.Admin.Models;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/inquiries")]
    public class CustomerCenterController : ControllerBase
    {
        private readonly ICustomerCenterService _service;
        private readonly ILogger<CustomerCenterController> _logger;
        private readonly IConfiguration _config;

        public CustomerCenterController(
            ILogger<CustomerCenterController> logger,
            ICustomerCenterService service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 고객센터 문의 목록조회 (페이징)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetInquiryList(
            [FromQuery] long? inquiryId,
            [FromQuery] string? userId,
            [FromQuery] string? category,
            [FromQuery] string? status,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int rowsPerPage = 10)
        {
            var list = await _service.SelectInquiryList(inquiryId, userId, category, status, pageNumber, rowsPerPage);

            if (list == null || list.Inquiries?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "문의 정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "문의 목록 조회 성공"));
        }

        /// <summary>
        /// 고객센터 문의 등록
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> InsertInquiry([FromBody] InquiryInsertDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.InsertInquiry(
                dto.UserId, dto.Name, dto.Email, dto.Phone, dto.Category,
                dto.Title, dto.Content, dto.SortOrder, dto.RegId
            );

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "문의 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "문의 등록 성공"));
        }

        /// <summary>
        /// 고객센터 문의 수정
        /// </summary>
        [HttpPut("{inquiryId:long}")]
        public async Task<IActionResult> UpdateInquiry(
            [FromRoute] long inquiryId,
            [FromBody] InquiryUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.UpdateInquiry(
                inquiryId, dto.Name, dto.Email, dto.Phone, dto.Category,
                dto.Title, dto.Content, dto.Status, dto.SortOrder, dto.RegId
            );

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "문의 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "문의 수정 성공"));
        }

        /// <summary>
        /// 고객센터 문의 답변등록
        /// </summary>
        [HttpPost("{inquiryId:long}/answer")]
        public async Task<IActionResult> AnswerInquiry(
            [FromRoute] long inquiryId,
            [FromBody] InquiryAnswerDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.AnswerInquiry(inquiryId, dto.Answer, dto.AnswerId);

            if (!result)
            {
                ResponseHelper.Error("ANSWER_FAILED", "답변 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "답변 등록 성공"));
        }

        /// <summary>
        /// 고객센터 문의 삭제
        /// </summary>
        [HttpDelete("{inquiryId:long}")]
        public async Task<IActionResult> DeleteInquiry(
            [FromRoute] long inquiryId,
            [FromQuery] string? regId)
        {
            var result = await _service.DeleteInquiry(inquiryId, regId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "문의 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "문의 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class InquiryInsertDto
    {
        public string? UserId { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Category { get; set; }
        public string Title { get; set; } = default!;
        public string Content { get; set; } = default!;
        public int? SortOrder { get; set; }
        public string? RegId { get; set; }
    }

    public class InquiryUpdateDto
    {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Category { get; set; }
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Status { get; set; }
        public int? SortOrder { get; set; }
        public string? RegId { get; set; }
    }

    public class InquiryAnswerDto
    {
        public string Answer { get; set; } = default!;
        public string AnswerId { get; set; } = default!;
    }
}

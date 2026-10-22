using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.Interview.Services;

namespace RealestateAPI.Interview.Controllers
{
    [ApiController]
    [Route("api/Interview")]
    public class InterviewController : ControllerBase
    {
        private readonly IInterviewServices _service;
        private readonly ILogger<InterviewController> _logger;
        private readonly IConfiguration _config;

        public InterviewController(
            ILogger<InterviewController> logger,
            IInterviewServices service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 고객면담
        /// </summary>
        /// <param name="ItvFrDate"></param>
        /// <param name="ItvToDate"></param>
        /// <param name="ItvNo"></param>
        /// <param name="CustName"></param>
        /// <param name="ItvContent"></param>
        /// <param name="ItvMemo"></param>
        /// <param name="VendorId"></param>
        /// <param name="Page"></param>
        /// <param name="PageSize"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery][Required] string ItvFrDate, [FromQuery][Required] string ItvToDate, [FromQuery] int? ItvNo, [FromQuery] string? CustName, [FromQuery] string? ItvContent, [FromQuery] string? ItvMemo, [FromQuery] int? VendorId, [FromQuery][Required] int Page = 1, [FromQuery][Required] int PageSize = 20)
        {
            var list = await _service.SelectInterviewList(ItvFrDate, ItvToDate, ItvNo, CustName, ItvContent, ItvMemo, VendorId, Page, PageSize);

            if (list == null || list.Interviews?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "면담 정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "면담 목록 조회 성공"));
        }

        /// <summary>
        /// 고객의 상담이력 (cust_no 기준) — 고객폼 상담이력
        /// </summary>
        [HttpGet("by-customer/{custNo:int}")]
        public async Task<IActionResult> GetByCustomer([FromRoute] int custNo)
        {
            var list = await _service.GetInterviewsByCustomer(custNo);
            return Ok(ResponseHelper.Success(list, "고객 상담이력 조회 성공"));
        }

        /// <summary>
        /// 물건의 상담이력 (pt_no 기준) — 물건폼 상담이력
        /// </summary>
        [HttpGet("by-property/{ptNo:int}")]
        public async Task<IActionResult> GetByProperty([FromRoute] int ptNo)
        {
            var list = await _service.GetInterviewsByProperty(ptNo);
            return Ok(ResponseHelper.Success(list, "물건 상담이력 조회 성공"));
        }

        /// <summary>
        /// 협력업체의 상담이력 (vendor_id 기준) — 협력업체폼 상담이력
        /// </summary>
        [HttpGet("by-vendor/{vendorId:int}")]
        public async Task<IActionResult> GetByVendor([FromRoute] int vendorId)
        {
            var list = await _service.GetInterviewsByVendor(vendorId);
            return Ok(ResponseHelper.Success(list, "협력업체 상담이력 조회 성공"));
        }

        /// <summary>
        /// 고객면담 등록
        /// </summary>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] InterviewCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.InsertInterview(dto);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "면담 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "면담 등록 성공"));
        }

        /// <summary>
        /// 고객면담 수정
        /// </summary>
        /// <param name="itvNo"></param>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPut("{itvNo:int}")]
        public async Task<IActionResult> Update([FromRoute] int itvNo, [FromBody] InterviewUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.UpdateInterview(itvNo, dto);

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "면담 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "면담 수정 성공"));
        }

        /// <summary>
        /// 고객면담 삭제
        /// </summary>
        /// <param name="itvNo"></param>
        /// <param name="userId"></param>
        /// <returns></returns>
        [HttpDelete("{itvNo:int}")]
        public async Task<IActionResult> Delete([FromRoute] int itvNo, [FromQuery] string? userId)
        {
            var result = await _service.DeleteInterview(itvNo, userId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "면담 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "면담 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class InterviewCreateDto
    {
        public string ItvType { get; set; } = default!;
        public string ItvDate { get; set; } = default!;
        public int? CustNo { get; set; }
        public string CustName { get; set; } = string.Empty;
        public string? CustPhone { get; set; } = string.Empty;
        public int? PtNo { get; set; }
        public string? ItvContent { get; set; }
        public string? ItvMemo { get; set; }
        public int? RtNo { get; set; }
        public int? OffNo { get; set; }
        public int? VendorId { get; set; }
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }
        public string? UserId { get; set; }
    }

    public class InterviewUpdateDto
    {
        public string? ItvType { get; set; }
        public string? ItvDate { get; set; }
        public int? CustNo { get; set; }
        public string ?CustName { get; set; }
        public string? CustPhone { get; set; }
        public int? PtNo { get; set; }
        public string? ItvContent { get; set; }
        public string? ItvMemo { get; set; }
        public int? RtNo { get; set; }
        public int? OffNo { get; set; }
        public int? VendorId { get; set; }
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }
        public string? UserId { get; set; }
    }
}

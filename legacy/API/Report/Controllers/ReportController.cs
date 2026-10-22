using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Report.Models;
using RealestateAPI.Report.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Report.Controllers
{
    [ApiController]
    [Route("/api/reports")]
    public class ReportController : ControllerBase
    {
        private readonly IReportService _service;
        private readonly ILogger<ReportController> _logger;

        public ReportController(ILogger<ReportController> logger, IReportService service)
        {
            _service = service;
            _logger = logger;
        }

        // 보고서 생성 (+ 고객 배포)
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ReportCreateDto dto, [FromQuery] string? userId)
        {
            if (dto != null && userId != null) dto.UserId = userId;
            var reportNo = await _service.CreateReport(dto!);
            if (reportNo <= 0)
            {
                return BadRequest(ResponseHelper.Error("CREATE_FAILED", "보고서 생성 실패"));
            }
            return Ok(ResponseHelper.Success(reportNo, "보고서 생성 성공"));
        }

        // 보고서 상세
        [HttpGet("{reportNo:long}")]
        public async Task<IActionResult> Get(long reportNo)
        {
            var report = await _service.GetReport(reportNo);
            if (report == null)
            {
                return Ok(ResponseHelper.Error("NOT_FOUND", "보고서 없음"));
            }
            return Ok(ResponseHelper.Success(report, "보고서 조회 성공"));
        }

        // 고객별 보고서 목록
        [HttpGet("by-customer/{custNo:long}")]
        public async Task<IActionResult> ByCustomer(long custNo)
        {
            var list = await _service.GetReportsByCustomer(custNo);
            return Ok(ResponseHelper.Success(list, "고객 보고서 목록 조회 성공"));
        }

        // 물건별 보고서 목록
        [HttpGet("by-property/{ptNo:long}")]
        public async Task<IActionResult> ByProperty(long ptNo)
        {
            var list = await _service.GetReportsByProperty(ptNo);
            return Ok(ResponseHelper.Success(list, "물건 보고서 목록 조회 성공"));
        }

        // 사용자(내가 만든) 보고서 목록
        [HttpGet("by-user/{userId}")]
        public async Task<IActionResult> ByUser(string userId)
        {
            var list = await _service.GetReportsByUser(userId);
            return Ok(ResponseHelper.Success(list, "사용자 보고서 목록 조회 성공"));
        }

        // 기존 보고서에 고객 추가 배포
        [HttpPost("{reportNo:long}/customers")]
        public async Task<IActionResult> AttachCustomers(long reportNo, [FromBody] List<long> custNos, [FromQuery] string? userId)
        {
            var result = await _service.AttachCustomers(reportNo, custNos, userId);
            return Ok(ResponseHelper.Success(result, "고객 배포 성공"));
        }

        // 보고서별 공유(고객) 이력
        [HttpGet("{reportNo:long}/customers")]
        public async Task<IActionResult> GetShares(long reportNo)
        {
            var list = await _service.GetReportShares(reportNo);
            return Ok(ResponseHelper.Success(list, "보고서 공유이력 조회 성공"));
        }

        // 보고서 삭제
        [HttpDelete("{reportNo:long}")]
        public async Task<IActionResult> Delete(long reportNo)
        {
            var ok = await _service.DeleteReport(reportNo);
            if (!ok)
            {
                return Ok(ResponseHelper.Error("DELETE_FAILED", "보고서 삭제 실패"));
            }
            return Ok(ResponseHelper.Success(true, "보고서 삭제 성공"));
        }
    }
}

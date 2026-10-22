using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Neobot.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Neobot.Controllers
{
    /// <summary>
    /// 네오봇 전용 API — 공용 통합검색(/api/search)과 분리.
    ///  GET /api/neobot/search               통합검색(물건/고객/계약)
    ///  GET /api/neobot/detail/property/{id} 물건 상세(요약+소유자/임차인+상담+일정)
    ///  GET /api/neobot/detail/customer/{id} 고객 상세(요약+희망지역+상담+일정)
    ///  GET /api/neobot/detail/contract/{id} 계약 상세
    /// </summary>
    [ApiController]
    [Route("/api/neobot")]
    public class NeobotController : ControllerBase
    {
        private readonly INeobotService _neobotService;
        private readonly ILogger<NeobotController> _logger;

        public NeobotController(ILogger<NeobotController> logger, INeobotService neobotService)
        {
            _logger = logger;
            _neobotService = neobotService;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search(string? q, long? offNo, string? rtNo, int limit = 30)
        {
            var data = await _neobotService.Search(q, offNo, rtNo, limit);
            return Ok(ResponseHelper.Success(data, "네오봇 통합검색 성공"));
        }

        [HttpGet("consultations")]
        public async Task<IActionResult> ConsultationSearch(string? q, long? offNo, string? rtNo, int limit = 50)
        {
            var data = await _neobotService.SearchConsultations(q, offNo, rtNo, limit);
            return Ok(ResponseHelper.Success(new { consultations = data }, "네오봇 상담이력 검색 성공"));
        }

        [HttpGet("detail/property/{ptNo:long}")]
        public async Task<IActionResult> PropertyDetail(long ptNo)
        {
            var data = await _neobotService.GetPropertyDetail(ptNo);
            return Ok(ResponseHelper.Success(data, "네오봇 물건 상세 성공"));
        }

        [HttpGet("detail/customer/{custNo:long}")]
        public async Task<IActionResult> CustomerDetail(long custNo)
        {
            var data = await _neobotService.GetCustomerDetail(custNo);
            return Ok(ResponseHelper.Success(data, "네오봇 고객 상세 성공"));
        }

        [HttpGet("detail/contract/{masterId}")]
        public async Task<IActionResult> ContractDetail(string masterId)
        {
            var data = await _neobotService.GetContractDetail(masterId);
            return Ok(ResponseHelper.Success(data, "네오봇 계약 상세 성공"));
        }
    }
}

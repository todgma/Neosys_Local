using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Expiry.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Expiry.Controllers
{
    /// <summary>
    /// 만기관리 — 물건 만기일(유형별 mtry_date / 건물은 임대차현황서 계약만기일) 기간 조회.
    ///  GET /api/expiry?ptTypes=SYCA101,SYCA103&frDate=2026-09-01&toDate=2026-12-31&offNo=&rtNo=&page=1&pageSize=50
    /// </summary>
    [ApiController]
    [Route("/api/expiry")]
    public class ExpiryController : ControllerBase
    {
        private readonly IExpiryService _expiryService;
        private readonly ILogger<ExpiryController> _logger;

        public ExpiryController(ILogger<ExpiryController> logger, IExpiryService expiryService)
        {
            _logger = logger;
            _expiryService = expiryService;
        }

        [HttpGet]
        public async Task<IActionResult> GetList(string? ptTypes, string? frDate, string? toDate, long? offNo, string? rtNo, int page = 1, int pageSize = 50)
        {
            var data = await _expiryService.GetList(ptTypes, frDate, toDate, offNo, rtNo, page, pageSize);
            return Ok(ResponseHelper.Success(data, "만기관리 조회 성공"));
        }
    }
}

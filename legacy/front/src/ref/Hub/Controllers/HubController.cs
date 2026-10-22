using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Hub.Services;
using RealestateAPI.Shared;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Hub.Controllers
{
    [ApiController]
    [Route("api/Hub")]
    public class HubController : ControllerBase
    {
        private readonly IHubService _service;
        private readonly ILogger<HubController> _logger;

        public HubController(IHubService service, ILogger<HubController> logger)
        {
            _service = service;
            _logger = logger;
        }

        /// <summary>
        /// 공동중개망 목록 조회 (페이징)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetList(
            [FromQuery] long? TradeId,
            [FromQuery] string? TradeDiv,
            [FromQuery] string? OffNo,
            [FromQuery] string? TradeState,
            [FromQuery] string? CustNo,
            [FromQuery] string? PtNo,
            [FromQuery] DateTime? RegDtFr,
            [FromQuery] DateTime? RegDtTo,
            [FromQuery][Required] int Page = 1,
            [FromQuery][Required] int PageSize = 20)
        {
            var result = await _service.GetTradeInfoList(
                TradeId, TradeDiv, OffNo, TradeState, CustNo, PtNo,
                RegDtFr, RegDtTo, Page, PageSize);

            if (result == null || result.Items?.Count == 0)
            {
                return Ok(ResponseHelper.Success(result, "공동중개망 조회 결과 없음"));
            }

            return Ok(ResponseHelper.Success(result, "공동중개망 목록 조회 성공"));
        }

        /// <summary>
        /// 최근 N개 공동중개망 조회
        /// </summary>
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent(
            [FromQuery] string? TradeDiv,
            [FromQuery] string? OffNo,
            [FromQuery] string? TradeState,
            [FromQuery] int RecentCnt = 10)
        {
            var result = await _service.GetRecentTradeInfo(TradeDiv, OffNo, TradeState, RecentCnt);

            if (result == null || result.Items?.Count == 0)
            {
                return Ok(ResponseHelper.Success(result, "최근 공동중개망 조회 결과 없음"));
            }

            return Ok(ResponseHelper.Success(result, "최근 공동중개망 조회 성공"));
        }

        /// <summary>
        /// 공동중개망 신규 등록
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] TradeInfoCreateDto Dto,
            [FromQuery][Required] string UserId,
            [FromQuery] bool AutoRegisterCustomer = false,
            [FromQuery] bool AutoRegisterProperty = false)
        {
            if (!ModelState.IsValid)
            {
                ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.");
            }

            var result = await _service.InsertTradeInfo(Dto, UserId, AutoRegisterCustomer, AutoRegisterProperty);

            if (result == null)
            {
                ResponseHelper.Error("INSERT_FAILED", "공동중개망 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "공동중개망 등록 성공"));
        }

        /// <summary>
        /// 공동중개망 수정
        /// </summary>
        [HttpPut("{TradeId:long}")]
        public async Task<IActionResult> Update(
            long TradeId,
            [FromBody] TradeInfoUpdateDto Dto)
        {
            if (!ModelState.IsValid)
            {
                ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.");
            }

            var result = await _service.UpdateTradeInfo(TradeId, Dto);

            if (result == null)
            {
                ResponseHelper.Error("UPDATE_FAILED", "공동중개망 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "공동중개망 수정 성공"));
        }

        /// <summary>
        /// 공동중개망 삭제 (논리 삭제)
        /// </summary>
        [HttpDelete("{TradeId:long}")]
        public async Task<IActionResult> Delete(long TradeId)
        {
            var result = await _service.DeleteTradeInfo(TradeId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "공동중개망 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "공동중개망 삭제 성공"));
        }
    }
}

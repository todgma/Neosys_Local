using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Property.Services;
using RealestateAPI.Property.Models;

namespace RealestateAPI.Property.Controllers
{
    [ApiController]
    [Route("/api/layout")]
    public class LayoutController : ControllerBase
    {
        private readonly ILayoutService _layoutService;
        private readonly ILogger<LayoutController> _logger;

        public LayoutController(ILogger<LayoutController> logger, ILayoutService layoutService)
        {
            _layoutService = layoutService;
            _logger = logger;
        }

        /// <summary>
        /// 동 목록 조회
        /// </summary>
        /// <param name="danjiCode">네이버 단지 코드</param>
        /// <returns></returns>
        [HttpGet("dong/{danjiCode}")]
        public async Task<IActionResult> GetDongList(int danjiCode)
        {
            try
            {
                var dongList = await _layoutService.GetDongListAsync(danjiCode);
                return Ok(dongList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "동 목록 조회 실패: danjiCode={DanjiCode}", danjiCode);
                return StatusCode(500, new { message = "동 목록 조회에 실패했습니다." });
            }
        }

        /// <summary>
        /// 호 목록 조회 (동별)
        /// </summary>
        /// <param name="danjiCode">네이버 단지 코드</param>
        /// <param name="dongNo">동 번호</param>
        /// <returns></returns>
        [HttpGet("ho/{danjiCode}/{dongNo}")]
        public async Task<IActionResult> GetHoList(int danjiCode, int dongNo)
        {
            try
            {
                var hoList = await _layoutService.GetHoListAsync(danjiCode, dongNo);
                return Ok(hoList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "호 목록 조회 실패: danjiCode={DanjiCode}, dongNo={DongNo}", danjiCode, dongNo);
                return StatusCode(500, new { message = "호 목록 조회에 실패했습니다." });
            }
        }

        /// <summary>
        /// 전체 배치도 데이터 조회 (단지코드로 모든 동의 호 리스트 + 점유현황 한번에 조회)
        /// </summary>
        /// <param name="danjiCode">네이버 단지 코드</param>
        /// <returns></returns>
        [HttpGet("all/{danjiCode}")]
        public async Task<IActionResult> GetAllLayoutData(int danjiCode, [FromQuery] long offNo = 0)
        {
            try
            {
                var layoutData = await _layoutService.GetAllLayoutDataAsync(danjiCode, offNo);
                return Ok(layoutData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "배치도 전체 데이터 조회 실패: danjiCode={DanjiCode}", danjiCode);
                return StatusCode(500, new { message = "배치도 데이터 조회에 실패했습니다." });
            }
        }

        /// <summary>
        /// 점유현황 조회 (동별)
        /// </summary>
        /// <param name="danjiCode">네이버 단지 코드</param>
        /// <param name="dongNo">동 번호</param>
        /// <returns></returns>
        [HttpGet("occupancy/{danjiCode}/{dongNo}")]
        public async Task<IActionResult> GetOccupancyList(int danjiCode, int dongNo, [FromQuery] long offNo = 0)
        {
            try
            {
                var occupancyList = await _layoutService.GetOccupancyListAsync(danjiCode, dongNo, offNo);
                return Ok(occupancyList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "점유현황 조회 실패: danjiCode={DanjiCode}, dongNo={DongNo}", danjiCode, dongNo);
                return StatusCode(500, new { message = "점유현황 조회에 실패했습니다." });
            }
        }

        /// <summary>
        /// 점유현황 저장
        /// </summary>
        /// <param name="request">점유현황 정보</param>
        /// <returns></returns>
        [HttpPost("occupancy")]
        public async Task<IActionResult> SaveOccupancy([FromBody] OccupancyRequest request)
        {
            try
            {
                var occupancyNo = await _layoutService.SaveOccupancyAsync(request);
                return Ok(new
                {
                    success = true,
                    message = "점유현황이 저장되었습니다.",
                    data = new { occupancyNo }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "점유현황 저장 실패: {@Request}", request);
                return StatusCode(500, new
                {
                    success = false,
                    message = "점유현황 저장에 실패했습니다."
                });
            }
        }
    }
}

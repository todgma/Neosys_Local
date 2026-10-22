using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Domains
{
    [ApiController]
    [Route("/api/danji")]
    public class DanjiController : ControllerBase
    {
        private readonly IDanjiServices _danjiService;
        private readonly ILogger<DanjiController> _logger;

        public DanjiController(IDanjiServices danjiService, ILogger<DanjiController> logger)
        {
            _danjiService = danjiService;
            _logger = logger;
        }

        /// <summary>
        /// 법정동 코드로 단지 목록 조회
        /// </summary>
        /// <param name="bjdCode">법정동 코드 (예: 1168010100)</param>
        /// <returns>단지 목록</returns>
        [HttpGet("list")]
        public async Task<IActionResult> GetDanjiListByBjdCode([FromQuery][Required] string bjdCode)
        {
            if (string.IsNullOrWhiteSpace(bjdCode))
            {
                return BadRequest(ResponseHelper.Error("INVALID_PARAMETER", "법정동 코드는 필수입니다."));
            }

            var danjis = await _danjiService.GetDanjiListByBjdCode(bjdCode);

            if (danjis == null || danjis.Danjis?.Count == 0)
            {
                return Ok(ResponseHelper.Success(new DanjiList { Danjis = new List<Danji>() }, "단지 정보 없음"));
            }

            return Ok(ResponseHelper.Success(danjis, "단지 목록 조회 성공"));
        }

        /// <summary>
        /// 네이버 단지 코드로 단지 상세 조회
        /// </summary>
        /// <param name="naverDanjiCode">네이버 단지 코드</param>
        /// <returns>단지 상세 정보</returns>
        [HttpGet("detail/{naverDanjiCode}")]
        public async Task<IActionResult> GetDanjiByNaverCode(string naverDanjiCode)
        {
            if (string.IsNullOrWhiteSpace(naverDanjiCode))
            {
                return BadRequest(ResponseHelper.Error("INVALID_PARAMETER", "네이버 단지 코드는 필수입니다."));
            }

            var danji = await _danjiService.GetDanjiByNaverCode(naverDanjiCode);

            if (danji == null)
            {
                return NotFound(ResponseHelper.Error("NOT_FOUND", "단지 정보를 찾을 수 없습니다."));
            }

            return Ok(ResponseHelper.Success(danji, "단지 상세 조회 성공"));
        }
    }
}

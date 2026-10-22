using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Services;
using RealestateAPI.Admin.Models;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/api")]

    public class ApiController : ControllerBase
    {
        private readonly IApiService _service;
        private readonly ILogger<ApiController> _logger;
        private readonly IConfiguration _config;

        public ApiController(ILogger<ApiController> logger, IApiService service, IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 사업자 정보 조회 (숫자만입력)
        /// </summary>
        /// <param name="bizNo"></param>
        /// <returns></returns>
        [HttpPost("GetBizDtl")]
        public async Task<IActionResult> GetBizDtl(int bizNo)
        {
            var result = await _service.GetBizDtl(bizNo);

            return Ok(result);
        }


        /// <summary>
        /// 부동산 실거래가 조회
        /// </summary>
        /// <param name="addr1"></param>
        /// <param name="addr2"></param>
        /// <param name="type"></param>
        /// <param name="year"></param>
        /// <returns></returns>
        [HttpPost("GetLandRtPrice")]
        public async Task<IActionResult> GetLandRtPrice([FromQuery]CityInfoSel addr1, string addr2, [FromQuery]ArtTypeSel type, string year)
        {
            var result = await _service.GetLandRtPrice(addr1, addr2, type, year);

            return Ok(result);
        }


        /// <summary>
        /// 부동산등기부등본 열람
        /// </summary>
        /// <param name="address"></param>
        /// <param name="unique_num"></param>
        /// <param name="type"></param>
        /// <returns></returns>
        [HttpPost("GetArtiros")]
        public async Task<IActionResult> GetArtIros(string? address, string? unique_num, string? type)
        {
            var result = await _service.GetArtIros(address, unique_num, type);

            return Ok(result);
        }

        /// <summary>
        /// 부동산등기부등봄 다운로드
        /// </summary>
        /// <param name="ic_id"></param>
        /// <param name="format"></param>
        /// <returns></returns>
        [HttpPost("GetArtIrosDownload")]
        public async Task<IActionResult> GetArtIrosDownload(string ic_id, string? format)
        {
            var result = await _service.GetArtIrosDownload(ic_id, format);

            return Ok(result);
        }
    }
}

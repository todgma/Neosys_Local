using Microsoft.AspNetCore.Mvc;
using RealestateAPI.AppVersion.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.AppVersion.Controllers
{
    [ApiController]
    [Route("api/version")]
    public class VersionController : ControllerBase
    {
        private readonly IVersionService _service;
        private readonly ILogger<VersionController> _logger;

        public VersionController(IVersionService service, ILogger<VersionController> logger)
        {
            _service = service;
            _logger = logger;
        }

        /// <summary>
        /// 최신 버전 조회 (자동 업데이트용)
        /// GET /api/version/latest?platform=win
        /// 응답: { success, data: { version, downloadUrl, mandatory, releaseNote } }
        /// </summary>
        [HttpGet("latest")]
        public async Task<IActionResult> GetLatest([FromQuery] string platform = "win")
        {
            var info = await _service.GetLatestVersion(platform);

            if (info == null)
            {
                return Ok(ResponseHelper.Success(null, "등록된 버전 정보가 없습니다."));
            }

            var result = new
            {
                version = info.Version,
                downloadUrl = info.DownloadUrl,
                mandatory = info.MandatoryYn == 'Y',
                releaseNote = info.ReleaseNote,
                platform = info.Platform,
            };

            return Ok(ResponseHelper.Success(result, "최신 버전 조회 성공"));
        }
    }
}

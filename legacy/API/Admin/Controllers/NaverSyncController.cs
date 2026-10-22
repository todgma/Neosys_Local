using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    /// <summary>
    /// 외부 플랫폼(네이버 부동산) 동기화 전용 — 단지/면적/동/호 수집.
    /// </summary>
    [ApiController]
    [Route("api/admin/naver-sync")]
    public class NaverSyncController : ControllerBase
    {
        private readonly INaverSyncService _service;
        public NaverSyncController(INaverSyncService service) { _service = service; }

        /// <summary>네이버 단지코드로 단지 기본정보 조회(등록폼 프리필용, DB 미저장)</summary>
        [HttpGet("{naverCode}/complex")]
        public async Task<IActionResult> Lookup(string naverCode)
        {
            if (string.IsNullOrWhiteSpace(naverCode))
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "네이버 단지코드가 필요합니다."));
            try
            {
                var result = await _service.LookupComplex(naverCode.Trim());
                return Ok(ResponseHelper.Success(result, "단지 조회 성공"));
            }
            catch (global::System.Exception ex)
            {
                return Ok(ResponseHelper.Error("LOOKUP_FAILED", ex.Message));
            }
        }

        /// <summary>네이버 단지코드로 단지/면적/동/호 동기화</summary>
        [HttpPost("{naverCode}")]
        public async Task<IActionResult> Sync(string naverCode)
        {
            if (string.IsNullOrWhiteSpace(naverCode))
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "네이버 단지코드가 필요합니다."));
            try
            {
                var result = await _service.SyncDanji(naverCode.Trim());
                return Ok(ResponseHelper.Success(result, "네이버 동기화 성공"));
            }
            catch (global::System.Exception ex)
            {
                return Ok(ResponseHelper.Error("SYNC_FAILED", ex.Message));
            }
        }

        /// <summary>동만 동기화</summary>
        [HttpPost("{naverCode}/dong")]
        public async Task<IActionResult> SyncDong(string naverCode)
        {
            if (string.IsNullOrWhiteSpace(naverCode))
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "네이버 단지코드가 필요합니다."));
            try { return Ok(ResponseHelper.Success(await _service.SyncDong(naverCode.Trim()), "동 동기화 성공")); }
            catch (global::System.Exception ex) { return Ok(ResponseHelper.Error("SYNC_FAILED", ex.Message)); }
        }

        /// <summary>면적만 동기화 (방/욕실 포함)</summary>
        [HttpPost("{naverCode}/area")]
        public async Task<IActionResult> SyncArea(string naverCode)
        {
            if (string.IsNullOrWhiteSpace(naverCode))
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "네이버 단지코드가 필요합니다."));
            try { return Ok(ResponseHelper.Success(await _service.SyncArea(naverCode.Trim()), "면적 동기화 성공")); }
            catch (global::System.Exception ex) { return Ok(ResponseHelper.Error("SYNC_FAILED", ex.Message)); }
        }

        /// <summary>호만 동기화</summary>
        [HttpPost("{naverCode}/ho")]
        public async Task<IActionResult> SyncHo(string naverCode)
        {
            if (string.IsNullOrWhiteSpace(naverCode))
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "네이버 단지코드가 필요합니다."));
            try { return Ok(ResponseHelper.Success(await _service.SyncHo(naverCode.Trim()), "호 동기화 성공")); }
            catch (global::System.Exception ex) { return Ok(ResponseHelper.Error("SYNC_FAILED", ex.Message)); }
        }
    }
}

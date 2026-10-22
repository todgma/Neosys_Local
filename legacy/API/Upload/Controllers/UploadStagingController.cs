using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Upload.Services;

namespace RealestateAPI.Upload.Controllers
{
    // 엑셀 업로드 임시저장(스테이징) — 저장/목록/삭제. 확정은 프론트가 기존 bulk로 재전송 후 삭제.
    [ApiController]
    [Route("api/upload-staging")]
    public class UploadStagingController : ControllerBase
    {
        private readonly IUploadStagingService _svc;
        public UploadStagingController(IUploadStagingService svc) { _svc = svc; }

        /// <summary>임시저장 — 업로드 payload 목록을 스테이징에 보관</summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] StagingSaveDto dto)
        {
            var saved = await _svc.SaveMany(dto);
            return Ok(ResponseHelper.Success(new { saved }, $"{saved}건 임시저장되었습니다."));
        }

        /// <summary>임시저장 목록 — target(property|customer) / offNo 필터</summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] string? target, [FromQuery] long? offNo)
        {
            var items = await _svc.GetList(target, offNo);
            return Ok(ResponseHelper.Success(new { items }, "임시저장 목록 조회"));
        }

        /// <summary>임시저장 1건 삭제</summary>
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            var ok = await _svc.Delete(id);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제되었습니다." : "대상 없음"));
        }

        /// <summary>임시저장 여러 건 삭제(확정 후 일괄 제거용)</summary>
        [HttpPost("delete-batch")]
        public async Task<IActionResult> DeleteMany([FromBody] StagingDeleteDto dto)
        {
            var n = await _svc.DeleteMany(dto?.Ids);
            return Ok(ResponseHelper.Success(new { deleted = n }, $"{n}건 삭제되었습니다."));
        }
    }
}

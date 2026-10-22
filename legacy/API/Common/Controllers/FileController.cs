using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Common.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Common.Controllers
{
    /// <summary>공용 파일 API — presigned 업로드/조회(네이버클라우드 Object Storage)</summary>
    [ApiController]
    [Route("api/files")]
    public class FileController : ControllerBase
    {
        private readonly IFileService _service;
        public FileController(IFileService service) { _service = service; }

        public class PresignDto { public string? FileDiv { get; set; } public string? FileName { get; set; } }

        /// <summary>업로드용 presigned PUT URL 발급 → 브라우저가 이 URL로 직접 PUT</summary>
        [HttpPost("presign")]
        public IActionResult Presign([FromBody] PresignDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.FileName))
                return Ok(ResponseHelper.Error("BAD_REQUEST", "파일명이 필요합니다."));
            var (objectKey, uploadUrl) = _service.PresignPut(dto.FileDiv ?? "etc", dto.FileName!);
            return Ok(ResponseHelper.Success(new { objectKey, uploadUrl }, "presign 발급 성공"));
        }

        /// <summary>업로드 완료 후 메타 저장(sys_file)</summary>
        [HttpPost]
        public async Task<IActionResult> Register([FromBody] FileMetaDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.ObjectKey))
                return Ok(ResponseHelper.Error("BAD_REQUEST", "objectKey가 필요합니다."));
            var id = await _service.SaveFile(dto);
            return Ok(ResponseHelper.Success(new { fileId = id }, "파일 저장 성공"));
        }

        /// <summary>파일 목록(조회용 URL 포함)</summary>
        [HttpGet]
        public async Task<IActionResult> List([FromQuery] string? fileTyp, [FromQuery] string? fileDiv, [FromQuery] string? refKey)
        {
            var items = await _service.GetFiles(fileTyp, fileDiv, refKey);
            return Ok(ResponseHelper.Success(new { items }, "파일 목록 조회 성공"));
        }

        /// <summary>단건 조회용 presigned GET URL</summary>
        [HttpGet("url")]
        public IActionResult GetUrl([FromQuery] string objectKey)
        {
            return Ok(ResponseHelper.Success(new { url = _service.PresignGet(objectKey) }, "url 발급"));
        }

        [HttpDelete("{fileId:long}")]
        public async Task<IActionResult> Delete(long fileId, [FromQuery] string? userId)
        {
            var ok = await _service.DeleteFile(fileId, userId);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }
    }
}

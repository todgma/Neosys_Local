using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Contract.Models;
using RealestateAPI.Contract.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Contract.Controllers
{
    // 계약서 서식 템플릿(조항) — 프로그램 캐시 로드 + 관리자 편집
    [ApiController]
    [Route("api/contract-template")]
    public class ContractTemplateController : ControllerBase
    {
        private readonly IContractTemplateService _service;
        public ContractTemplateController(IContractTemplateService service) { _service = service; }

        /// <summary>전체 템플릿 목록(+최대 ver). 프로그램 실행 시 캐시 로드용</summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] bool includeDisabled = false)
        {
            var items = await _service.GetList(includeDisabled);
            var ver = await _service.GetMaxVer();
            return Ok(ResponseHelper.Success(new { items, ver }, "계약서 템플릿 목록"));
        }

        /// <summary>캐시 갱신 감지용 — 현재 최대 ver만 반환(가벼움)</summary>
        [HttpGet("version")]
        public async Task<IActionResult> GetVersion()
        {
            var ver = await _service.GetMaxVer();
            return Ok(ResponseHelper.Success(new { ver }, "템플릿 버전"));
        }

        /// <summary>단건 조회</summary>
        [HttpGet("{tplCode}")]
        public async Task<IActionResult> GetByCode(string tplCode)
        {
            var row = await _service.GetByCode(tplCode);
            if (row == null) return Ok(ResponseHelper.Success(null, "템플릿 없음"));
            return Ok(ResponseHelper.Success(row, "템플릿 조회"));
        }

        /// <summary>저장(신규/수정 upsert) — 관리자 편집/시드</summary>
        [HttpPost]
        public async Task<IActionResult> Upsert([FromBody] ContractTemplateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.TplCode))
                return Ok(ResponseHelper.Error("BAD_REQUEST", "tplCode는 필수입니다."));
            var ok = await _service.Upsert(dto);
            return Ok(ResponseHelper.Success(new { saved = ok }, ok ? "템플릿 저장 성공" : "실패"));
        }

        [HttpDelete("{tplCode}")]
        public async Task<IActionResult> Delete(string tplCode, [FromQuery] string? userId)
        {
            var ok = await _service.Delete(tplCode, userId);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }
    }
}

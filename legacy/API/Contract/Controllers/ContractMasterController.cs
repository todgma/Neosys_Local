using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Contract.Models;
using RealestateAPI.Contract.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Contract.Controllers
{
    // 계약서 마스터 + 부속문서 (신규 백엔드 연동)
    [ApiController]
    [Route("api/contract-master")]
    public class ContractMasterController : ControllerBase
    {
        private readonly IContractMasterService _service;
        public ContractMasterController(IContractMasterService service) { _service = service; }

        /// <summary>목록(기간/검색/페이징) — 계약목록 헤드라인용</summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] string? frDate, [FromQuery] string? toDate,
            [FromQuery] long? offNo, [FromQuery] string? rtNo, [FromQuery] string? keyword,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            var res = await _service.GetList(frDate, toDate, offNo, rtNo, keyword, page, pageSize);
            return Ok(ResponseHelper.Success(res, "계약 목록 조회 성공"));
        }

        /// <summary>상세(마스터 + doc 본문)</summary>
        [HttpGet("{masterId}")]
        public async Task<IActionResult> GetDetail(string masterId)
        {
            var m = await _service.GetDetail(masterId);
            if (m == null) return Ok(ResponseHelper.Success(null, "계약 없음"));
            return Ok(ResponseHelper.Success(m, "계약 상세 조회 성공"));
        }

        /// <summary>마스터 저장(신규/수정 upsert)</summary>
        [HttpPost]
        public async Task<IActionResult> Save([FromBody] ContractMasterDto dto)
        {
            if (dto == null) return Ok(ResponseHelper.Success(null, "요청 없음"));
            var id = await _service.SaveMaster(dto);
            return Ok(ResponseHelper.Success(new { masterId = id }, "계약 저장 성공"));
        }

        /// <summary>계약서 복사 — 계약서(마스터)만 복제(부속문서 제외). 소재지에 '(복사본)' 부기, origin_master_id=원본</summary>
        [HttpPost("{masterId}/copy")]
        public async Task<IActionResult> Copy(string masterId, [FromQuery] string? userId)
        {
            var newId = await _service.CopyMaster(masterId, userId);
            if (string.IsNullOrEmpty(newId)) return Ok(ResponseHelper.Error("COPY_FAILED", "복사할 원본을 찾을 수 없습니다."));
            return Ok(ResponseHelper.Success(new { masterId = newId }, "계약서 복사 성공"));
        }

        [HttpDelete("{masterId}")]
        public async Task<IActionResult> Delete(string masterId, [FromQuery] string? userId)
        {
            var ok = await _service.DeleteMaster(masterId, userId);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }

        /// <summary>거래신고 완료일 저장(null이면 완료 취소)</summary>
        [HttpPut("{masterId}/report-date")]
        public async Task<IActionResult> SaveReportDate(string masterId, [FromBody] ReportDateDto dto)
        {
            var ok = await _service.SaveReportDate(masterId, dto?.ReportDoneDate, dto?.UserId);
            return Ok(ResponseHelper.Success(new { saved = ok }, ok ? "거래신고 완료일 저장 성공" : "대상 없음"));
        }

        /// <summary>부속 문서 저장(upsert) — kind: 확인설명서/개인정보동의서/영수증/가계약문자/현금영수증/공동중개사전송/거래관련서식:*/준비서면:*</summary>
        [HttpPut("{masterId}/document/{kind}")]
        public async Task<IActionResult> SaveDocument(string masterId, string kind, [FromBody] ContractDocumentDto dto)
        {
            var ok = await _service.SaveDocument(masterId, kind, dto?.Data, dto?.UserId,
                dto?.ContractKind, dto?.DocType, dto?.TradeType);
            return Ok(ResponseHelper.Success(new { saved = ok }, ok ? "부속문서 저장 성공" : "실패"));
        }

        /// <summary>마스터 보장 — 파일(공제증서 등)만 첨부 시 마스터 행 생성(소재지=(임시) + 현재 계약 메타)</summary>
        [HttpPost("{masterId}/ensure")]
        public async Task<IActionResult> EnsureMaster(string masterId, [FromBody] ContractDocumentDto dto)
        {
            var ok = await _service.EnsureMaster(masterId, dto?.UserId, dto?.ContractKind, dto?.DocType, dto?.TradeType);
            return Ok(ResponseHelper.Success(new { ensured = ok }, ok ? "마스터 보장 성공" : "실패"));
        }

        /// <summary>부속 문서 조회</summary>
        [HttpGet("{masterId}/document/{kind}")]
        public async Task<IActionResult> GetDocument(string masterId, string kind)
        {
            var row = await _service.GetDocument(masterId, kind);
            return Ok(ResponseHelper.Success(row, "부속문서 조회"));
        }

        /// <summary>저장된 부속 문서 kind 목록</summary>
        [HttpGet("{masterId}/documents")]
        public async Task<IActionResult> GetDocumentKinds(string masterId)
        {
            var kinds = await _service.GetDocumentKinds(masterId);
            return Ok(ResponseHelper.Success(new { kinds }, "부속문서 목록"));
        }
    }
}

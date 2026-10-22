using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/danji")]
    public class AdminDanjiController : ControllerBase
    {
        private readonly IAdminDanjiService _service;
        public AdminDanjiController(IAdminDanjiService service) { _service = service; }

        /// <summary>단지 검색(단지명/법정동코드/네이버단지코드) — 레거시</summary>
        [HttpGet]
        public async Task<IActionResult> Search([FromQuery] string? q)
        {
            var items = await _service.SearchDanji(q);
            return Ok(ResponseHelper.Success(new { items }, "단지 목록 조회 성공"));
        }

        /// <summary>법정동 select 소스 — type: 1(시도)/2(시군구)/4(법정동). code: 상위 코드</summary>
        [HttpGet("bjd")]
        public async Task<IActionResult> BjdList([FromQuery] int type = 1, [FromQuery] string? code = null)
        {
            var items = await _service.GetBjdList(type, code);
            return Ok(ResponseHelper.Success(new { items }, "법정동 목록 조회 성공"));
        }

        /// <summary>단지 목록(법정동/검색 + 페이징)</summary>
        [HttpGet("list")]
        public async Task<IActionResult> List([FromQuery] string? bjdCode, [FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? hscpType = null)
        {
            var (items, total) = await _service.GetDanjiList(bjdCode, q, page, pageSize, hscpType);
            int totalPages = pageSize > 0 ? (int)global::System.Math.Ceiling(total / (double)pageSize) : 1;
            return Ok(ResponseHelper.Success(new { items, total, totalPages, page }, "단지 목록 조회 성공"));
        }

        /// <summary>단지 상세(동정보 카드)</summary>
        [HttpGet("{id:long}")]
        public async Task<IActionResult> Detail(long id)
        {
            var item = await _service.GetDanjiDetail(id);
            return Ok(ResponseHelper.Success(new { item }, item == null ? "단지 없음" : "단지 상세 조회 성공"));
        }

        /// <summary>면적(평형) 목록(danji_area_new)</summary>
        [HttpGet("{naverCode}/area")]
        public async Task<IActionResult> AreaList(string naverCode)
        {
            var items = await _service.GetAreaList(naverCode);
            return Ok(ResponseHelper.Success(new { items }, "면적 목록 조회 성공"));
        }

        /// <summary>면적(평형) 등록/수정(upsert)</summary>
        [HttpPost("area")]
        public async Task<IActionResult> UpsertArea([FromBody] DanjiAreaDto dto)
        {
            var ok = await _service.UpsertArea(dto);
            return Ok(ResponseHelper.Success(new { saved = ok }, ok ? "저장 성공" : "실패"));
        }

        [HttpDelete("area/{idx:long}")]
        public async Task<IActionResult> DeleteArea(long idx)
        {
            var ok = await _service.DeleteArea(idx);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }

        /// <summary>섹션별 최근수정일(동/면적/호)</summary>
        [HttpGet("{naverCode}/modified")]
        public async Task<IActionResult> Modified(string naverCode)
        {
            var item = await _service.GetModifiedSummary(naverCode);
            return Ok(ResponseHelper.Success(new { item }, "최근수정일 조회 성공"));
        }

        /// <summary>동(棟) 목록(danji_dong_new)</summary>
        [HttpGet("{naverCode}/dong")]
        public async Task<IActionResult> DongList(string naverCode)
        {
            var items = await _service.GetDongList(naverCode);
            return Ok(ResponseHelper.Success(new { items }, "동 목록 조회 성공"));
        }

        /// <summary>동 등록/수정(upsert)</summary>
        [HttpPost("dong")]
        public async Task<IActionResult> UpsertDong([FromBody] DanjiDongDto dto)
        {
            var ok = await _service.UpsertDong(dto);
            return Ok(ResponseHelper.Success(new { saved = ok }, ok ? "저장 성공" : "실패"));
        }

        [HttpDelete("dong")]
        public async Task<IActionResult> DeleteDong([FromQuery] string naverCode, [FromQuery] string dongNo)
        {
            var ok = await _service.DeleteDong(naverCode, dongNo);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }

        /// <summary>단지 호 목록(danji_ho_new)</summary>
        [HttpGet("{naverCode}/ho")]
        public async Task<IActionResult> HoList(string naverCode)
        {
            var items = await _service.GetHoList(naverCode);
            return Ok(ResponseHelper.Success(new { items }, "호 목록 조회 성공"));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DanjiDto dto)
        {
            var id = await _service.InsertDanji(dto);
            return Ok(ResponseHelper.Success(new { id }, "단지 등록 성공"));
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] DanjiDto dto)
        {
            var ok = await _service.UpdateDanji(id, dto);
            return Ok(ResponseHelper.Success(new { updated = ok }, ok ? "수정 성공" : "대상 없음"));
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            var ok = await _service.DeleteDanji(id);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }

        /// <summary>호 등록/수정(upsert)</summary>
        [HttpPost("ho")]
        public async Task<IActionResult> UpsertHo([FromBody] DanjiHoDto dto)
        {
            var ok = await _service.UpsertHo(dto);
            return Ok(ResponseHelper.Success(new { saved = ok }, ok ? "저장 성공" : "실패"));
        }

        [HttpDelete("ho")]
        public async Task<IActionResult> DeleteHo([FromQuery] string naverCode, [FromQuery] string dongNo, [FromQuery] string hoNumber)
        {
            var ok = await _service.DeleteHo(naverCode, dongNo, hoNumber);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }

        /// <summary>조합원분(배치도) 목록 — 전체공통(off_no=0)</summary>
        [HttpGet("{naverCode}/union")]
        public async Task<IActionResult> UnionList(string naverCode)
        {
            var items = await _service.GetUnionShares(naverCode);
            return Ok(ResponseHelper.Success(new { items }, "조합원분 목록 조회 성공"));
        }

        /// <summary>조합원분 일괄 설정/해제(다수 호)</summary>
        [HttpPost("union")]
        public async Task<IActionResult> SetUnion([FromBody] UnionSetDto dto)
        {
            var ok = await _service.SetUnionShares(dto);
            return Ok(ResponseHelper.Success(new { saved = ok }, ok ? "조합원분 설정 성공" : "실패"));
        }
    }
}

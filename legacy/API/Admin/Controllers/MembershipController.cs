using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Models;
using RealestateAPI.Admin.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/memberships")]
    public class MembershipController : ControllerBase
    {
        private readonly IMembershipService _service;
        public MembershipController(IMembershipService service) { _service = service; }

        /// <summary>멤버십 상품 목록 (all=true면 숨김 포함)</summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] bool all = false)
        {
            var items = await _service.GetProducts(all);
            return Ok(ResponseHelper.Success(new MembershipListResult { Items = items }, "멤버십 상품 목록 조회 성공"));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MembershipProductDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.ProdName))
                return Ok(ResponseHelper.Success(null, "상품명 누락"));
            var id = await _service.CreateProduct(dto);
            return Ok(ResponseHelper.Success(new { prodId = id }, "멤버십 상품 등록 성공"));
        }

        [HttpPut("{prodId:long}")]
        public async Task<IActionResult> Update(long prodId, [FromBody] MembershipProductDto dto)
        {
            var ok = await _service.UpdateProduct(prodId, dto);
            return Ok(ResponseHelper.Success(new { updated = ok }, ok ? "수정 성공" : "대상 없음"));
        }

        [HttpDelete("{prodId:long}")]
        public async Task<IActionResult> Delete(long prodId)
        {
            var ok = await _service.DeleteProduct(prodId);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }

        /// <summary>사무소 적용 상품 조회</summary>
        [HttpGet("office/{offNo:long}")]
        public async Task<IActionResult> GetOffice(long offNo)
        {
            var m = await _service.GetOfficeMembership(offNo);
            return Ok(ResponseHelper.Success(m, "사무소 멤버십 조회"));
        }

        /// <summary>사무소 적용 상품 설정</summary>
        [HttpPut("office/{offNo:long}")]
        public async Task<IActionResult> SetOffice(long offNo, [FromBody] SetOfficeMembershipDto dto)
        {
            var ok = await _service.SetOfficeMembership(offNo, dto?.ProdId ?? 0, dto?.Memo, dto?.UserId);
            return Ok(ResponseHelper.Success(new { updated = ok }, ok ? "적용 성공" : "실패"));
        }

        /// <summary>기간연장(이벤트/보상) — 이력 저장 + 만료일 연장</summary>
        [HttpPost("office/{offNo:long}/extend")]
        public async Task<IActionResult> Extend(long offNo, [FromBody] ExtendDto dto)
        {
            if (dto == null || dto.Qty <= 0) return Ok(ResponseHelper.Error("BAD_REQUEST", "기간(수량)을 입력하세요."));
            var ok = await _service.ExtendMembership(offNo, dto.Kind ?? "EVENT", dto.Title, dto.Qty, dto.Unit ?? "DAY", dto.UserId, dto.Memo);
            return Ok(ResponseHelper.Success(new { extended = ok }, ok ? "기간연장 성공" : "실패"));
        }

        /// <summary>멤버십 변동 이력</summary>
        [HttpGet("office/{offNo:long}/history")]
        public async Task<IActionResult> History(long offNo)
        {
            var items = await _service.GetMembershipHistory(offNo);
            return Ok(ResponseHelper.Success(new { items }, "이력 조회 성공"));
        }
    }

    public class SetOfficeMembershipDto { public long ProdId { get; set; } public string? Memo { get; set; } public string? UserId { get; set; } }
    public class ExtendDto { public string? Kind { get; set; } public string? Title { get; set; } public int Qty { get; set; } public string? Unit { get; set; } public string? UserId { get; set; } public string? Memo { get; set; } }
}

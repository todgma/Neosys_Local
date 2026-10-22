using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/members")]
    public class AdminMemberController : ControllerBase
    {
        private readonly IAdminMemberService _service;
        public AdminMemberController(IAdminMemberService service) { _service = service; }

        /// <summary>회원(중개사) 목록 — 이름/아이디 검색, 사무소 멤버십 포함</summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] string? q)
        {
            var items = await _service.GetMembers(q);
            return Ok(ResponseHelper.Success(new { items }, "회원 목록 조회 성공"));
        }

        /// <summary>탈퇴회원 목록 — 비활성화된 사무소 소속 회원</summary>
        [HttpGet("withdrawn")]
        public async Task<IActionResult> GetWithdrawn([FromQuery] string? q)
        {
            var items = await _service.GetWithdrawnMembers(q);
            return Ok(ResponseHelper.Success(new { items }, "탈퇴회원 목록 조회 성공"));
        }

        /// <summary>회원 상세</summary>
        [HttpGet("{rtNo:long}")]
        public async Task<IActionResult> Detail(long rtNo)
        {
            var item = await _service.GetMemberDetail(rtNo);
            return Ok(ResponseHelper.Success(new { item }, item == null ? "회원 없음" : "회원 상세 조회 성공"));
        }

        /// <summary>회원정보 수정</summary>
        [HttpPut("{rtNo:long}")]
        public async Task<IActionResult> Update(long rtNo, [FromBody] MemberUpdateDto dto)
        {
            var ok = await _service.UpdateMember(rtNo, dto);
            return Ok(ResponseHelper.Success(new { updated = ok }, ok ? "수정 성공" : "대상 없음"));
        }

        /// <summary>비밀번호 초기화(관리자 입력값 → BCrypt 해시)</summary>
        [HttpPut("{rtNo:long}/password")]
        public async Task<IActionResult> ResetPassword(long rtNo, [FromBody] PasswordResetDto dto)
        {
            var ok = await _service.ResetPassword(rtNo, dto?.NewPw ?? "");
            return Ok(ResponseHelper.Success(new { reset = ok }, ok ? "비밀번호 초기화 성공" : "실패(비밀번호 확인)"));
        }
    }

    public class PasswordResetDto
    {
        public string? NewPw { get; set; }
    }
}

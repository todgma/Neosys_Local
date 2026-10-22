using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Realestater.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Realestater.Controllers
{
    /// <summary>직원 메뉴 권한(rt_menu_perm) — 대시보드 메뉴 대상 체크박스 권한</summary>
    [ApiController]
    [Route("api/staff-menu-perm")]
    public class StaffMenuPermController : ControllerBase
    {
        private readonly IStaffMenuPermService _service;
        public StaffMenuPermController(IStaffMenuPermService service) { _service = service; }

        public class SetPermDto { public List<string>? Keys { get; set; } public string? UserId { get; set; } }

        /// <summary>직원 허용 메뉴 키 목록</summary>
        [HttpGet("{rtNo:long}")]
        public async Task<IActionResult> Get(long rtNo)
        {
            var keys = await _service.GetPerm(rtNo);
            return Ok(ResponseHelper.Success(new { keys }, "메뉴 권한 조회 성공"));
        }

        /// <summary>직원 메뉴 권한 저장(전체 교체)</summary>
        [HttpPut("{rtNo:long}")]
        public async Task<IActionResult> Set(long rtNo, [FromBody] SetPermDto dto)
        {
            var ok = await _service.SetPerm(rtNo, dto?.Keys ?? new List<string>(), dto?.UserId);
            return Ok(ResponseHelper.Success(new { saved = ok }, "메뉴 권한 저장 성공"));
        }
    }
}

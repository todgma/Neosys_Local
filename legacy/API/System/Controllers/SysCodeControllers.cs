using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Models;
using RealestateAPI.Admin.Services;
using System.Numerics;
using RealestateAPI.Shared;
using RealestateAPI.Admin.Controllers;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.System.Services;

namespace RealestateAPI.System.Controllers
{
    [ApiController]
    [Route("/api/syscode")]

    public class SysCodeControllers : ControllerBase
    {
        private readonly ISysCodeServices _service;

        private readonly ILogger<SysCodeControllers> _logger;

        private readonly IConfiguration _config;

        public SysCodeControllers(ILogger<SysCodeControllers> logger, ISysCodeServices syscodeService, IConfiguration config)
        {
            _service = syscodeService;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 공통코드조회
        /// </summary>
        /// <param name="CatCd"></param>
        /// <param name="MidCd"></param>
        /// <param name="SubCd"></param>
        /// <param name="SubNm"></param>
        /// <param name="UseYn"></param>
        /// <returns></returns>
        [HttpGet("GetSubCodeList")]
        public async Task<IActionResult> SelectSubCodeList([FromQuery] string? CatCd, [FromQuery] string? MidCd, [FromQuery] string? SubCd, [FromQuery] string? SubNm, [FromQuery] string? UseYn)
        {
            var SubCodeList = await _service.SelectSysCodeList(CatCd, MidCd, SubCd, SubNm, UseYn);

            if (SubCodeList == null || SubCodeList.SysCodeSubs?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "공통코드 정보 없음");
            }

            return Ok(ResponseHelper.Success(SubCodeList, "공통코드 조회 성공"));
        }

        /// <summary>공통코드 등록(다건)</summary>
        [HttpPost]
        public async Task<IActionResult> InsertSubCode([FromBody] SysCodeSubCreateListDto Dto, [FromQuery] string? UserId)
        {
            var ok = await _service.InsertSysCodeList(Dto, UserId);
            return Ok(ResponseHelper.Success(new { saved = ok }, ok ? "공통코드 등록 성공" : "실패"));
        }

        /// <summary>공통코드 수정(다건)</summary>
        [HttpPut]
        public async Task<IActionResult> UpdateSubCode([FromBody] SysCodeSubCreateListDto Dto, [FromQuery] string? UserId)
        {
            var ok = await _service.UpdateSysCodeList(Dto, UserId);
            return Ok(ResponseHelper.Success(new { updated = ok }, ok ? "공통코드 수정 성공" : "실패"));
        }

        /// <summary>공통코드 삭제</summary>
        [HttpDelete]
        public async Task<IActionResult> DeleteSubCode([FromQuery] string CatCd, [FromQuery] string MidCd, [FromQuery] string SubCd)
        {
            var ok = await _service.DeleteSysCodeList(CatCd, MidCd, SubCd);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "공통코드 삭제 성공" : "대상 없음"));
        }

        //DTO 영역//
        public class SysCodeSubCreateDto
        {
            public string CatCd { get; set; } = default!;
            public string MidCd { get; set; } = default!;
            public string SubCd { get; set; } = default!;
            public string SubNm { get; set; } = default!;
            public string? Etc1 { get; set; } 
            public string? Etc2 { get; set; } 
            public string? Etc3 { get; set; } 
            public string? Etc4 { get; set; } 
            public string? Etc5 { get; set; } 
            public string? Etc6 { get; set; } 
            public string? Etc7 { get; set; } 
            public string? Etc8 { get; set; } 
            public string? Etc9 { get; set; } 
            public string? Etc10 { get; set; }
            public string? UseYn { get; set; }
            public int? Sort { get; set; }
        }

        public class SysCodeSubCreateListDto
        {
            public List<SysCodeSubCreateDto>? CreateSubCodes { get; set; }
        }
        public class SysCodeSubUpdateDto
        {
            public string CatCd { get; set; } = default!;
            public string MidCd { get; set; } = default!;
            public string SubCd { get; set; } = default!;
            public string? SubNm { get; set; }
            public string? Etc1 { get; set; }
            public string? Etc2 { get; set; }
            public string? Etc3 { get; set; }
            public string? Etc4 { get; set; }
            public string? Etc5 { get; set; }
            public string? Etc6 { get; set; }
            public string? Etc7 { get; set; }
            public string? Etc8 { get; set; }
            public string? Etc9 { get; set; }
            public string? Etc10 { get; set; }
            public string? UseYn { get; set; }
            public int? Sort { get; set; }
        }
    }
}

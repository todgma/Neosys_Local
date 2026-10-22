using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Realestater.Services;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;
using System.Collections.Generic;

namespace RealestateAPI.Realestater.Controllers
{
    [ApiController]
    [Route("api/realestaters")]
    public class RealestaterController : ControllerBase
    {
        private readonly IRealestaterServices _service;
        private readonly ILogger<RealestaterController> _logger;
        private readonly IConfiguration _config;

        public RealestaterController(
            ILogger<RealestaterController> logger,
            IRealestaterServices service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 중계인 목록조회
        /// </summary>
        /// <param name="rtNo"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] long? rtNo, [FromQuery] long? offNo)
        {
            var list = await _service.SelectRealestaterList(rtNo,offNo);

            if (list == null || list.Relaters?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "중개인 정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "중개인 목록 조회 성공"));
        }

        /// <summary>
        /// 중개인 상세조회 (단건)
        /// </summary>
        /// <param name="rtNo">중개인 번호</param>
        /// <returns></returns>
        [HttpGet("{rtNo:long}")]
        public async Task<IActionResult> GetDetail([FromRoute] long rtNo)
        {
            var realtor = await _service.SelectRealestaterDetail(rtNo);

            if (realtor == null)
            {
                ResponseHelper.Error("NOT_FOUND", "중개인 정보 없음");
            }

            return Ok(ResponseHelper.Success(realtor, "중개인 상세 조회 성공"));
        }

        /// <summary>
        /// 중개인 등록
        /// </summary>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] RealestaterCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.InsertRealestater(
                dto.RtType, dto.RtNm, dto.RtTel, dto.RtRegNo, dto.OffNo, dto.Grade, dto.Id, dto.Pw, dto.UserId, dto.ReferralCode,
                dto.OffNm, dto.OffAddr, dto.OffTel, dto.OffFax, dto.OffRegNo, dto.BizNo,
                dto.BizObjectKey, dto.BizOrigName, dto.BizContentType, dto.BizFileSize, dto.BizExt,
                null, null, null, null,
                dto.OpenObjectKey, dto.OpenOrigName, dto.OpenContentType, dto.OpenFileSize, dto.OpenExt
            );

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "중개인 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "중개인 등록 성공"));
        }

        /// <summary>
        /// 중개인 수정
        /// </summary>
        /// <param name="rtNo"></param>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPut("{rtNo:int}")]
        public async Task<IActionResult> Update([FromRoute] int rtNo, [FromBody] RealestaterUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.UpdateRealestater(
                rtNo, dto.RtType, dto.RtNm, dto.RtTel, dto.RtRegNo, dto.OffNo, dto.Grade, dto.Id, dto.Pw, dto.UserId,
                dto.Email, dto.JoinDate, dto.LeaveDate, dto.Note
            );

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "중개인 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "중개인 수정 성공"));
        }

        /// <summary>
        /// 중개인 삭제
        /// </summary>
        /// <param name="rtNo"></param>
        /// <param name="userId"></param>
        /// <returns></returns>
        [HttpDelete("{rtNo:int}")]
        public async Task<IActionResult> Delete([FromRoute] int rtNo, [FromQuery] string? userId)
        {
            var result = await _service.DeleteRealestater(rtNo, userId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "중개인 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "중개인 삭제 성공"));
        }

        /// <summary>
        /// 로그인
        /// </summary>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] RealestaterLoginDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.LoginRealestater(dto.Id, dto.Pw);

            // 성공이면 realtor 객체 JSON('{'로 시작). 그 외 문자열은 모두 로그인 실패 메시지로 처리
            //  (비밀번호 불일치 / ID 없음 / 소속중개사 멤버십 미가입 등) → 로그인 화면에 메시지 노출
            if (string.IsNullOrWhiteSpace(result) || !result.TrimStart().StartsWith("{"))
            {
                return Ok(ResponseHelper.Error("LOGIN_FAILED", string.IsNullOrWhiteSpace(result) ? "로그인에 실패했습니다." : result));
            }

            // 로그인 성공 (realtor 객체 JSON)
            return Ok(ResponseHelper.Success(result, "로그인 성공"));
        }

        /// <summary>
        /// ID 중복조회
        /// </summary>
        /// <param name="id">USER_ID</param>
        /// <returns></returns>
        [HttpGet("CheckRealestaterId")]
        public async Task<IActionResult> CheckRealestaterId(string id)
        {
            var result = await _service.CheckRealestaterId(id);

            if (result)
            {
                ResponseHelper.Error("OVERLAP_ID", "사용중인 ID");
            }

            return Ok(ResponseHelper.Success(result, "사용가능 ID"));
        }

        /// <summary>추천인 코드 검증 — 대표중개사 성명/사무소명 반환(가입 전 확인용)</summary>
        [HttpGet("referral-info")]
        public async Task<IActionResult> GetReferralInfo([FromQuery] string code)
        {
            var info = await _service.GetReferralInfo(code);
            if (info == null)
                return Ok(ResponseHelper.Error("INVALID_REFERRAL", "유효하지 않은 추천인 코드입니다."));
            return Ok(ResponseHelper.Success(new { valid = true, rtNm = info.RtNm, offNm = info.OffNm }, "추천인 확인"));
        }

        /// <summary>내 추천 혜택(추천한 목록) — 팝업 열 때 최신 조회(로그인 응답과 분리)</summary>
        [HttpGet("referrals")]
        public async Task<IActionResult> GetReferrals([FromQuery] long rtNo)
        {
            var info = await _service.GetReferralBenefits(rtNo);
            return Ok(ResponseHelper.Success(info, "추천 목록 조회"));
        }

        /// <summary>패스워드 변경 — 현재 패스워드 검증 후 새 패스워드로 변경</summary>
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Id) || string.IsNullOrWhiteSpace(dto.CurrentPw) || string.IsNullOrWhiteSpace(dto.NewPw))
                return Ok(ResponseHelper.Error("INVALID", "요청 형식이 올바르지 않습니다."));

            var err = await _service.ChangePassword(dto.Id, dto.CurrentPw, dto.NewPw);
            if (!string.IsNullOrEmpty(err))
                return Ok(ResponseHelper.Error("CHANGE_PW_FAILED", err));
            return Ok(ResponseHelper.Success(true, "패스워드가 변경되었습니다."));
        }

        /// <summary>웹 결제창 자동로그인 1회용 토큰 발급(프로그램에서 호출)</summary>
        [HttpPost("payment-token")]
        public async Task<IActionResult> IssuePaymentToken([FromBody] PaymentTokenReqDto dto)
        {
            if (dto == null || dto.RtNo <= 0) return Ok(ResponseHelper.Error("INVALID", "요청 형식이 올바르지 않습니다."));
            var token = await _service.IssuePaymentToken(dto.RtNo);
            if (string.IsNullOrEmpty(token)) return Ok(ResponseHelper.Error("TOKEN_FAILED", "토큰 발급에 실패했습니다."));
            return Ok(ResponseHelper.Success(new { token }, "토큰 발급"));
        }

        /// <summary>자동로그인 토큰 검증(웹 결제 페이지에서 호출) → 중개인 정보 반환</summary>
        [HttpPost("payment-token/redeem")]
        public async Task<IActionResult> RedeemPaymentToken([FromBody] PaymentTokenRedeemDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Token)) return Ok(ResponseHelper.Error("INVALID", "토큰이 없습니다."));
            var realtor = await _service.RedeemPaymentToken(dto.Token);
            if (realtor == null) return Ok(ResponseHelper.Error("INVALID_TOKEN", "유효하지 않거나 만료된 토큰입니다."));
            return Ok(ResponseHelper.Success(realtor, "토큰 확인"));
        }
    }

    public class PaymentTokenReqDto { public long RtNo { get; set; } }
    public class PaymentTokenRedeemDto { public string Token { get; set; } = default!; }

    // ===== DTOs =====
    public class RealestaterCreateDto
    {
        public string RtType { get; set; } = default!;
        public string RtNm { get; set; } = default!;
        public string? RtTel { get; set; }
        public string? RtRegNo { get; set; }
        public int? OffNo { get; set; }
        public string? Grade { get; set; }
        public string? Id { get; set; }
        public string? Pw { get; set; }  // 실제 운영에서는 해시 전달/저장 권장
        public string? UserId { get; set; }
        public string? ReferralCode { get; set; }  // 추천인 코드
        // 사무소 정보(대표중개사 신규 가입 시 함께 등록 → ofc_realter_office)
        public string? OffNm { get; set; }
        public string? OffAddr { get; set; }
        public string? OffTel { get; set; }
        public string? OffFax { get; set; }
        public string? OffRegNo { get; set; }
        public string? BizNo { get; set; }
        // 사업자등록증 첨부(업로드 완료된 objectKey 전달 → sys_file 저장, ref_key=신규 RtNo)
        public string? BizObjectKey { get; set; }
        public string? BizOrigName { get; set; }
        public string? BizContentType { get; set; }
        public long? BizFileSize { get; set; }
        public string? BizExt { get; set; }
        // 개설등록증 첨부(SYFDV04)
        public string? OpenObjectKey { get; set; }
        public string? OpenOrigName { get; set; }
        public string? OpenContentType { get; set; }
        public long? OpenFileSize { get; set; }
        public string? OpenExt { get; set; }
        // 직원(소속중개사) 필드
        public string? Email { get; set; }
        public string? JoinDate { get; set; }
        public string? LeaveDate { get; set; }
        public string? Note { get; set; }
    }

    public class RealestaterUpdateDto
    {
        public string? RtType { get; set; }
        public string? RtNm { get; set; }
        public string? RtTel { get; set; }
        public string? RtRegNo { get; set; }
        public int? OffNo { get; set; }
        public string? Grade { get; set; }
        public string? Id { get; set; }
        public string? Pw { get; set; }
        public string? UserId { get; set; }
        // 직원(소속중개사) 필드
        public string? Email { get; set; }
        public string? JoinDate { get; set; }
        public string? LeaveDate { get; set; }
        public string? Note { get; set; }
    }

    public class RealestaterLoginDto
    {
        public string Id { get; set; } = default!;
        public string Pw { get; set; } = default!;
    }

    public class ChangePasswordDto
    {
        public string Id { get; set; } = default!;
        public string CurrentPw { get; set; } = default!;
        public string NewPw { get; set; } = default!;
    }
}

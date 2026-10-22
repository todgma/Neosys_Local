using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Admin.Models;
using RealestateAPI.Admin.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Admin.Controllers
{
    /// <summary>결제(토스페이먼츠 카드결제) — 승인 및 결제 이력 조회</summary>
    [ApiController]
    [Route("api/payments")]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _service;
        public PaymentController(IPaymentService service) { _service = service; }

        /// <summary>결제 승인 — 결제창 성공 리다이렉트 후 호출(토스 confirm + 이력 저장)</summary>
        [HttpPost("confirm")]
        public async Task<IActionResult> Confirm([FromBody] ConfirmPaymentDto dto)
        {
            var (ok, row, code, msg) = await _service.ConfirmAsync(dto);
            if (!ok)
            {
                ResponseHelper.Error(code ?? "PAYMENT_FAILED", msg ?? "결제 승인에 실패했습니다.");
            }
            return Ok(ResponseHelper.Success(row, "결제가 완료되었습니다."));
        }

        /// <summary>결제 이력 목록 — offNo(사무소) 또는 q(검색어)로 필터</summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] long? offNo, [FromQuery] string? q)
        {
            var items = await _service.GetList(offNo, q);
            return Ok(ResponseHelper.Success(new { items }, "결제 이력 조회 성공"));
        }

        /// <summary>사무소 가입비 결제 여부</summary>
        [HttpGet("entry-fee")]
        public async Task<IActionResult> GetEntryFee([FromQuery] long offNo)
        {
            var status = await _service.GetEntryFee(offNo);
            return Ok(ResponseHelper.Success(status, "가입비 상태 조회"));
        }
    }
}

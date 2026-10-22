using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Property.Models;   // PtMemoDto / CreatePtMemoRequest / UpdatePtMemoRequest 재사용
using RealestateAPI.Customer.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Customer.Controllers
{
    [ApiController]
    [Route("/api/Customers")]
    public class CustomerMemoController : ControllerBase
    {
        private readonly ICustomerMemoService _memoService;
        private readonly ILogger<CustomerMemoController> _logger;

        public CustomerMemoController(ILogger<CustomerMemoController> logger, ICustomerMemoService memoService)
        {
            _memoService = memoService;
            _logger = logger;
        }

        [HttpGet("{custNo:long}/memos")]
        public async Task<IActionResult> GetMemoList(long custNo)
        {
            var memos = await _memoService.GetMemoList(custNo);
            return Ok(ResponseHelper.Success(memos, "상담메모 목록 조회 성공"));
        }

        [HttpPost("{custNo:long}/memos")]
        public async Task<IActionResult> CreateMemo(long custNo, [FromBody] CreatePtMemoRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ResponseHelper.Error("INVALID_REQUEST", "요청 형식이 올바르지 않습니다."));
            }
            var result = await _memoService.CreateMemo(custNo, request);
            if (!result)
            {
                return BadRequest(ResponseHelper.Error("CREATE_FAILED", "상담메모 등록 실패"));
            }
            return Ok(ResponseHelper.Success(result, "상담메모 등록 성공"));
        }

        [HttpPut("{custNo:long}/memos/{memoNo:int}")]
        public async Task<IActionResult> UpdateMemo(long custNo, int memoNo, [FromBody] UpdatePtMemoRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ResponseHelper.Error("INVALID_REQUEST", "요청 형식이 올바르지 않습니다."));
            }
            var result = await _memoService.UpdateMemo(custNo, memoNo, request);
            if (!result)
            {
                return BadRequest(ResponseHelper.Error("UPDATE_FAILED", "상담메모 수정 실패"));
            }
            return Ok(ResponseHelper.Success(result, "상담메모 수정 성공"));
        }

        [HttpDelete("{custNo:long}/memos/{memoNo:int}")]
        public async Task<IActionResult> DeleteMemo(long custNo, int memoNo)
        {
            var result = await _memoService.DeleteMemo(custNo, memoNo);
            if (!result)
            {
                return BadRequest(ResponseHelper.Error("DELETE_FAILED", "상담메모 삭제 실패"));
            }
            return Ok(ResponseHelper.Success(result, "상담메모 삭제 성공"));
        }
    }
}

using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.Shared;
using RealestateAPI.Memo.Services;
using RealestateAPI.Memo.Models;

namespace RealestateAPI.Memo.Controllers
{
    [ApiController]
    [Route("api/Memo")]
    public class MemoController : ControllerBase
    {
        private readonly IMemoServices _service;
        private readonly ILogger<MemoController> _logger;

        public MemoController(ILogger<MemoController> logger, IMemoServices service)
        {
            _service = service;
            _logger = logger;
        }

        /// <summary>
        /// 스티커 메모 목록 조회 (사용자별)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery][Required] string UserId)
        {
            var list = await _service.GetMemos(UserId);
            return Ok(ResponseHelper.Success(list, "메모 목록 조회 성공"));
        }

        /// <summary>
        /// 스티커 메모 등록
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] StickyMemoCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다."));
            }
            var result = await _service.InsertMemo(dto);
            if (result == null)
            {
                return Ok(ResponseHelper.Error("INSERT_FAILED", "메모 등록 실패"));
            }
            return Ok(ResponseHelper.Success(result, "메모 등록 성공"));
        }

        /// <summary>
        /// 스티커 메모 수정 (내용/색상)
        /// </summary>
        [HttpPut("{memoId:long}")]
        public async Task<IActionResult> Update([FromRoute] long memoId, [FromBody] StickyMemoUpdateDto dto)
        {
            var result = await _service.UpdateMemo(memoId, dto);
            return Ok(ResponseHelper.Success(result, "메모 수정 성공"));
        }

        /// <summary>
        /// 스티커 메모 삭제 (논리 삭제)
        /// </summary>
        [HttpDelete("{memoId:long}")]
        public async Task<IActionResult> Delete([FromRoute] long memoId, [FromQuery] string? userId)
        {
            var result = await _service.DeleteMemo(memoId, userId);
            return Ok(ResponseHelper.Success(result, "메모 삭제 성공"));
        }
    }
}

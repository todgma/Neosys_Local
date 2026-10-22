using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Property.Models;
using RealestateAPI.Property.Services;
using RealestateAPI.Shared;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Property.Controllers
{
    [ApiController]
    [Route("/api/property")]
    public class PropertyMemoController : ControllerBase
    {
        private readonly IPropertyMemoService _memoService;
        private readonly ILogger<PropertyMemoController> _logger;

        public PropertyMemoController(ILogger<PropertyMemoController> logger, IPropertyMemoService memoService)
        {
            _memoService = memoService;
            _logger = logger;
        }

        /// <summary>
        /// 특정 매물의 메모 목록 조회 (날짜 내림차순)
        /// </summary>
        /// <param name="ptNo">매물번호</param>
        /// <returns></returns>
        [HttpGet("{ptNo}/memos")]
        public async Task<IActionResult> GetMemoList(int ptNo)
        {
            var memos = await _memoService.GetMemoList(ptNo);
            return Ok(ResponseHelper.Success(memos, "메모 목록 조회 성공"));
        }

        /// <summary>
        /// 특정 매물의 최신 메모 1건 조회 (목록용)
        /// </summary>
        /// <param name="ptNo">매물번호</param>
        /// <returns></returns>
        [HttpGet("{ptNo}/memos/latest")]
        public async Task<IActionResult> GetLatestMemo(int ptNo)
        {
            var memo = await _memoService.GetLatestMemo(ptNo);
            if (memo == null)
            {
                return Ok(ResponseHelper.Success(null, "메모가 없습니다."));
            }
            return Ok(ResponseHelper.Success(memo, "최신 메모 조회 성공"));
        }

        /// <summary>
        /// 메모 등록
        /// </summary>
        /// <param name="ptNo">매물번호</param>
        /// <param name="request">메모 생성 요청</param>
        /// <returns></returns>
        [HttpPost("{ptNo}/memos")]
        public async Task<IActionResult> CreateMemo(int ptNo, [FromBody] CreatePtMemoRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ResponseHelper.Error("INVALID_REQUEST", "요청 형식이 올바르지 않습니다."));
            }

            var result = await _memoService.CreateMemo(ptNo, request);
            if (!result)
            {
                return BadRequest(ResponseHelper.Error("CREATE_FAILED", "메모 등록 실패"));
            }

            return Ok(ResponseHelper.Success(result, "메모 등록 성공"));
        }

        /// <summary>
        /// 메모 수정
        /// </summary>
        /// <param name="ptNo">매물번호</param>
        /// <param name="memoNo">메모번호</param>
        /// <param name="request">메모 수정 요청</param>
        /// <returns></returns>
        [HttpPut("{ptNo}/memos/{memoNo}")]
        public async Task<IActionResult> UpdateMemo(int ptNo, int memoNo, [FromBody] UpdatePtMemoRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ResponseHelper.Error("INVALID_REQUEST", "요청 형식이 올바르지 않습니다."));
            }

            var result = await _memoService.UpdateMemo(ptNo, memoNo, request);
            if (!result)
            {
                return BadRequest(ResponseHelper.Error("UPDATE_FAILED", "메모 수정 실패"));
            }

            return Ok(ResponseHelper.Success(result, "메모 수정 성공"));
        }

        /// <summary>
        /// 메모 삭제
        /// </summary>
        /// <param name="ptNo">매물번호</param>
        /// <param name="memoNo">메모번호</param>
        /// <returns></returns>
        [HttpDelete("{ptNo}/memos/{memoNo}")]
        public async Task<IActionResult> DeleteMemo(int ptNo, int memoNo)
        {
            var result = await _memoService.DeleteMemo(ptNo, memoNo);
            if (!result)
            {
                return BadRequest(ResponseHelper.Error("DELETE_FAILED", "메모 삭제 실패"));
            }

            return Ok(ResponseHelper.Success(result, "메모 삭제 성공"));
        }
    }
}

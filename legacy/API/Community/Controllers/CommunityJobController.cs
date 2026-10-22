using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Community.Models;
using RealestateAPI.Community.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Community.Controllers
{
    // 구인·구직 게시판(정형 입력) — 사무소 게시판(CommunityController)과 엔드포인트 분리
    [ApiController]
    [Route("/api/community/job")]
    public class CommunityJobController : ControllerBase
    {
        private readonly ICommunityJobService _service;
        private readonly ILogger<CommunityJobController> _logger;

        public CommunityJobController(ILogger<CommunityJobController> logger, ICommunityJobService service)
        {
            _logger = logger;
            _service = service;
        }

        /// <summary>구인·구직 목록 — kind(구인|구직)/검색어</summary>
        [HttpGet("list")]
        public async Task<IActionResult> GetList(string? kind, string? q)
        {
            var items = await _service.GetList(kind, q);
            return Ok(ResponseHelper.Success(new CommunityJobListResult { Items = items }, "구인구직 목록 조회 성공"));
        }

        /// <summary>구인·구직 상세 — 조회 시 조회수 +1</summary>
        [HttpGet("{postId:long}")]
        public async Task<IActionResult> GetDetail(long postId, [FromQuery] string? viewerId)
        {
            var post = await _service.GetDetail(postId, viewerId);
            if (post == null) return Ok(ResponseHelper.Success(null, "게시글 없음"));
            return Ok(ResponseHelper.Success(post, "구인구직 상세 조회 성공"));
        }

        /// <summary>구인·구직 등록</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CommunityJobCreateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Kind) || string.IsNullOrWhiteSpace(dto.Title))
                return Ok(ResponseHelper.Success(null, "필수값(구분/제목) 누락"));
            var postId = await _service.Create(dto);
            return Ok(ResponseHelper.Success(new { postId }, "구인구직 등록 성공"));
        }

        /// <summary>구인·구직 삭제(소프트)</summary>
        [HttpDelete("{postId:long}")]
        public async Task<IActionResult> Delete(long postId)
        {
            var ok = await _service.Delete(postId);
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "삭제 대상 없음"));
        }
    }
}

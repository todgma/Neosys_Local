using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Search.Services;
using RealestateAPI.Shared;

namespace RealestateAPI.Search.Controllers
{
    [ApiController]
    [Route("/api/search")]
    public class SearchController : ControllerBase
    {
        private readonly ISearchService _searchService;
        private readonly ILogger<SearchController> _logger;

        public SearchController(ILogger<SearchController> logger, ISearchService searchService)
        {
            _logger = logger;
            _searchService = searchService;
        }

        /// <summary>
        /// 통합검색 — 내 물건(소유자/임차인) + 고객(구입자)을 한 번에 조회.
        /// GET /api/search/unified?q=&offNo=&rtNo=&limit=
        /// </summary>
        [HttpGet("unified")]
        public async Task<IActionResult> SearchUnified(string? q, long? offNo, string? rtNo, int limit = 30)
        {
            var data = await _searchService.SearchUnified(q, offNo, rtNo, limit);
            return Ok(ResponseHelper.Success(data, "통합검색 조회 성공"));
        }
    }
}

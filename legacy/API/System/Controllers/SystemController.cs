using RealestateAPI.System.Models;
using RealestateAPI.System.Services;
using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using global::System;
using global::System.Collections.Generic;
using global::System.Threading.Tasks;

namespace RealestateAPI.System.Controllers
{
    [ApiController]
    [Route("api/system")]
    public class SystemController : ControllerBase
    {
        private readonly ISystemService _systemService;
        private readonly ILogger<SystemController> _logger;
        private readonly IPostgresDataService _db;

        public SystemController(ISystemService systemService, ILogger<SystemController> logger, IPostgresDataService db)
        {
            _systemService = systemService;
            _logger = logger;
            _db = db;
        }

        /// <summary>
        /// 행정동/법정동 목록 조회
        /// </summary>
        /// <param name="request">addressType: 1=시도, 2=시군구, 3=읍면동(행정), 4=법정동, 5=행정동상세, 6=법정동상세, 7=리</param>
        [HttpGet("bjd-list")]
        public async Task<IActionResult> GetBjdList([FromQuery] BjdListRequest request)
        {
            try
            {
                var result = await _systemService.GetBjdListAsync(request.AddressType, request.AddressCode);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetBjdList 오류 - addressType: {AddressType}, addressCode: {AddressCode}",
                    request.AddressType, request.AddressCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// 법정동코드로 단지 목록 조회 (단지 기본정보 + 평형 목록 포함)
        /// </summary>
        /// <param name="bjdCode">법정동코드 (예: 1174010600)</param>
        /// <param name="hscpType">단지유형(hscp_type_code, 예: SYCA101/SYCA104). 미지정 시 전체</param>
        [HttpGet("danji-list")]
        public async Task<IActionResult> GetDanjiListByBjdCode([FromQuery] string bjdCode, [FromQuery] string? hscpType = null)
        {
            if (string.IsNullOrWhiteSpace(bjdCode))
                return BadRequest(new { message = "bjdCode는 필수입니다." });

            try
            {
                var result = await _systemService.GetDanjiListByBjdCodeAsync(bjdCode, hscpType);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDanjiListByBjdCode 오류 - bjdCode: {BjdCode}", bjdCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// 단지 코드로 동 목록 조회
        /// </summary>
        /// <param name="danjiCode">네이버 단지 코드</param>
        [HttpGet("dong-list")]
        public async Task<IActionResult> GetDongListByDanji([FromQuery] string danjiCode)
        {
            if (string.IsNullOrEmpty(danjiCode))
                return BadRequest(new { message = "danjiCode는 필수입니다." });

            try
            {
                var result = await _systemService.GetDongListByDanjiAsync(danjiCode);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDongListByDanji 오류 - danjiCode: {DanjiCode}", danjiCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// 단지 코드와 동번호로 호 목록 조회
        /// </summary>
        /// <param name="danjiCode">네이버 단지 코드</param>
        /// <param name="dongNo">동 번호</param>
        [HttpGet("ho-list")]
        public async Task<IActionResult> GetHoListByDong([FromQuery] string danjiCode, [FromQuery] int dongNo)
        {
            if (string.IsNullOrWhiteSpace(danjiCode) || dongNo <= 0)
                return BadRequest(new { message = "danjiCode와 dongNo는 필수입니다." });

            try
            {
                var result = await _systemService.GetHoListByDongAsync(danjiCode, dongNo);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetHoListByDong 오류 - danjiCode: {DanjiCode}, dongNo: {DongNo}", danjiCode, dongNo);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// 단지 코드로 타입(면적) 목록 조회
        /// </summary>
        /// <param name="danjiCode">네이버 단지 코드</param>
        [HttpGet("area-list")]
        public async Task<IActionResult> GetAreaListByDanji([FromQuery] string danjiCode)
        {
            if (string.IsNullOrWhiteSpace(danjiCode))
                return BadRequest(new { message = "danjiCode는 필수입니다." });

            try
            {
                var result = await _systemService.GetAreaListByDanjiAsync(danjiCode);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAreaListByDanji 오류 - danjiCode: {DanjiCode}", danjiCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// 공지사항 목록 조회 (공개된 공지사항만)
        /// </summary>
        /// <param name="category">카테고리</param>
        /// <param name="isPopup">팝업여부 (Y/N)</param>
        /// <param name="pageNumber">페이지 번호 (기본값: 1)</param>
        /// <param name="rowsPerPage">페이지당 행 수 (기본값: 10)</param>
        [HttpGet("notices")]
        public async Task<IActionResult> GetNoticeList(
            [FromQuery] string? category,
            [FromQuery] string? isPopup,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int rowsPerPage = 10)
        {
            try
            {
                // 공개된 공지사항만 조회 (isPublic = 'Y')
                var result = await _systemService.GetNoticeListAsync(null, category, "Y", isPopup, pageNumber, rowsPerPage);

                if (result == null || result.Notices?.Count == 0)
                {
                    return Ok(ResponseHelper.Success(new { notices = new List<object>(), totalCount = 0 }, "공지사항이 없습니다."));
                }

                return Ok(ResponseHelper.Success(result, "공지사항 목록 조회 성공"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetNoticeList 오류 - category: {Category}", category);
                return StatusCode(500, ResponseHelper.Error("SERVER_ERROR", ex.Message));
            }
        }

        /// <summary>
        /// 공지사항 상세 조회
        /// </summary>
        /// <param name="noticeId">공지사항 ID</param>
        [HttpGet("notices/{noticeId:long}")]
        public async Task<IActionResult> GetNoticeDetail([FromRoute] long noticeId, [FromQuery] string? viewerId)
        {
            try
            {
                // 조회수 하루 1회 +1 (rt_view_log 유니크로 중복 방지) — 상세 조회 전에 반영
                try
                {
                    const string incSql = @"
                        WITH ins AS (
                            INSERT INTO rt_view_log(post_type, post_id, viewer_id, view_ymd, reg_dt)
                            VALUES ('NOTICE', @id, COALESCE(@viewer,'anon'), to_char(now(),'YYYYMMDD'), now())
                            ON CONFLICT DO NOTHING RETURNING 1
                        )
                        UPDATE public.nt_notice
                           SET view_count = view_count + (SELECT count(*) FROM ins)
                         WHERE notice_id = @id";
                    await _db.ExecuteNonQueryAsyncPg("DEV", incSql, new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@id", NpgsqlDbType.Bigint) { Value = noticeId },
                        new NpgsqlParameter("@viewer", NpgsqlDbType.Varchar) { Value = (object?)(string.IsNullOrWhiteSpace(viewerId) ? null : viewerId) ?? DBNull.Value },
                    });
                }
                catch (global::System.Exception incEx) { _logger.LogWarning(incEx, "공지 조회수 증가 실패 - noticeId: {NoticeId}", noticeId); }

                // 특정 공지사항 조회 (공개된 것만)
                var result = await _systemService.GetNoticeListAsync(noticeId, null, "Y", null, 1, 1);

                if (result == null || result.Notices?.Count == 0)
                {
                    return NotFound(ResponseHelper.Error("NOT_FOUND", "공지사항을 찾을 수 없습니다."));
                }

                return Ok(ResponseHelper.Success(result.Notices![0], "공지사항 조회 성공"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetNoticeDetail 오류 - noticeId: {NoticeId}", noticeId);
                return StatusCode(500, ResponseHelper.Error("SERVER_ERROR", ex.Message));
            }
        }
    }
}

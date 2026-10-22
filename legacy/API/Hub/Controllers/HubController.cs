using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Hub.Services;
using RealestateAPI.Shared;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Hub.Controllers
{
    [ApiController]
    [Route("api/Hub")]
    public class HubController : ControllerBase
    {
        private readonly IHubService _service;
        private readonly ILogger<HubController> _logger;

        public HubController(IHubService service, ILogger<HubController> logger)
        {
            _service = service;
            _logger = logger;
        }

        /// <summary>
        /// 공동중개망 목록 조회 (페이징)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetList(
            [FromQuery] long? TradeId,
            [FromQuery] string? TradeDiv,
            [FromQuery] string? OffNo,
            [FromQuery] string? TradeState,
            [FromQuery] string? CustNo,
            [FromQuery] string? PtNo,
            [FromQuery] DateTime? RegDtFr,
            [FromQuery] DateTime? RegDtTo,
            [FromQuery] string? ViewerOffNo = null,
            [FromQuery][Required] int Page = 1,
            [FromQuery][Required] int PageSize = 20)
        {
            var result = await _service.GetTradeInfoList(
                TradeId, TradeDiv, OffNo, TradeState, CustNo, PtNo,
                RegDtFr, RegDtTo, Page, PageSize, ViewerOffNo);

            if (result == null || result.Items?.Count == 0)
            {
                return Ok(ResponseHelper.Success(result, "공동중개망 조회 결과 없음"));
            }

            return Ok(ResponseHelper.Success(result, "공동중개망 목록 조회 성공"));
        }

        /// <summary>
        /// 최근 N개 공동중개망 조회
        /// </summary>
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent(
            [FromQuery] string? TradeDiv,
            [FromQuery] string? OffNo,
            [FromQuery] string? TradeState,
            [FromQuery] string? ViewerOffNo = null,
            [FromQuery] int RecentCnt = 10)
        {
            var result = await _service.GetRecentTradeInfo(TradeDiv, OffNo, TradeState, RecentCnt, ViewerOffNo);

            if (result == null || result.Items?.Count == 0)
            {
                return Ok(ResponseHelper.Success(result, "최근 공동중개망 조회 결과 없음"));
            }

            return Ok(ResponseHelper.Success(result, "최근 공동중개망 조회 성공"));
        }

        /// <summary>
        /// 공동중개망 신규 등록
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] TradeInfoCreateDto Dto,
            [FromQuery][Required] string UserId,
            [FromQuery] bool AutoRegisterCustomer = false,
            [FromQuery] bool AutoRegisterProperty = false)
        {
            if (!ModelState.IsValid)
            {
                ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.");
            }

            var result = await _service.InsertTradeInfo(Dto, UserId, AutoRegisterCustomer, AutoRegisterProperty);

            if (result == null)
            {
                ResponseHelper.Error("INSERT_FAILED", "공동중개망 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "공동중개망 등록 성공"));
        }

        /// <summary>
        /// 공동중개망 수정
        /// </summary>
        [HttpPut("{TradeId:long}")]
        public async Task<IActionResult> Update(
            long TradeId,
            [FromBody] TradeInfoUpdateDto Dto)
        {
            if (!ModelState.IsValid)
            {
                ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.");
            }

            var result = await _service.UpdateTradeInfo(TradeId, Dto);

            if (result == null)
            {
                ResponseHelper.Error("UPDATE_FAILED", "공동중개망 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "공동중개망 수정 성공"));
        }

        /// <summary>
        /// 공동중개망 삭제 (논리 삭제)
        /// </summary>
        [HttpDelete("{TradeId:long}")]
        public async Task<IActionResult> Delete(long TradeId)
        {
            var result = await _service.DeleteTradeInfo(TradeId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "공동중개망 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "공동중개망 삭제 성공"));
        }

        // ==================== 주거래지역 ====================

        /// <summary>
        /// 주거래지역 목록 조회 (개인 rt_no 기준)
        /// </summary>
        [HttpGet("main-region")]
        public async Task<IActionResult> GetMainRegions(
            [FromQuery] string? OffNo,
            [FromQuery] string? RtNo)
        {
            var result = await _service.GetMainRegions(OffNo, RtNo);
            return Ok(ResponseHelper.Success(result, "주거래지역 조회 성공"));
        }

        /// <summary>
        /// 주거래지역 추가
        /// </summary>
        [HttpPost("main-region")]
        public async Task<IActionResult> CreateMainRegion([FromBody] Models.MainRegionCreateDto Dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다."));
            }
            var result = await _service.InsertMainRegion(Dto);
            return Ok(ResponseHelper.Success(result, "주거래지역 추가 성공"));
        }

        /// <summary>
        /// 주거래지역 삭제
        /// </summary>
        [HttpDelete("main-region/{RegionId:long}")]
        public async Task<IActionResult> DeleteMainRegion(long RegionId)
        {
            var result = await _service.DeleteMainRegion(RegionId);
            return Ok(ResponseHelper.Success(result, "주거래지역 삭제 성공"));
        }

        // ==================== 비공유업체 ====================

        /// <summary>비공유업체 목록(중개사무소 단위)</summary>
        [HttpGet("block")]
        public async Task<IActionResult> GetOfficeBlocks([FromQuery][Required] long OffNo)
        {
            var result = await _service.GetOfficeBlocks(OffNo);
            return Ok(ResponseHelper.Success(result, "비공유업체 조회 성공"));
        }

        /// <summary>비공유업체 등록(부동산등록번호 기준)</summary>
        [HttpPost("block")]
        public async Task<IActionResult> CreateOfficeBlock([FromBody] Models.OfficeBlockCreateDto Dto)
        {
            if (Dto == null || Dto.OffNo <= 0 || string.IsNullOrWhiteSpace(Dto.BlockedRegNo))
            {
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "사무소/부동산등록번호가 필요합니다."));
            }
            var result = await _service.InsertOfficeBlock(Dto);
            return Ok(ResponseHelper.Success(result, "비공유업체 등록 성공"));
        }

        /// <summary>비공유업체 삭제</summary>
        [HttpDelete("block/{BlockId:long}")]
        public async Task<IActionResult> DeleteOfficeBlock(long BlockId)
        {
            var result = await _service.DeleteOfficeBlock(BlockId);
            return Ok(ResponseHelper.Success(result, "비공유업체 삭제 성공"));
        }

        // ==================== 쪽지 ====================

        /// <summary>
        /// 쪽지 목록 조회 (box: all/received/sent)
        /// </summary>
        [HttpGet("note")]
        public async Task<IActionResult> GetNotes(
            [FromQuery][Required] string UserId,
            [FromQuery] string Box = "all",
            [FromQuery] string? RegDtFr = null,
            [FromQuery] string? RegDtTo = null,
            [FromQuery] string? Keyword = null,
            [FromQuery] string? BizKeyword = null)
        {
            var result = await _service.GetNotes(UserId, Box, RegDtFr, RegDtTo, Keyword, BizKeyword);
            return Ok(ResponseHelper.Success(result, "쪽지 조회 성공"));
        }

        /// <summary>
        /// 안읽은 쪽지 개수
        /// </summary>
        [HttpGet("note/unread-count")]
        public async Task<IActionResult> GetUnreadNoteCount([FromQuery][Required] string UserId)
        {
            var result = await _service.GetUnreadNoteCount(UserId);
            return Ok(ResponseHelper.Success(new { count = result }, "안읽은 쪽지 개수 조회 성공"));
        }

        /// <summary>
        /// 쪽지 발송 (수신자 복수)
        /// </summary>
        [HttpPost("note")]
        public async Task<IActionResult> SendNote([FromBody] Models.NoteSendDto Dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다."));
            }
            var result = await _service.SendNote(Dto);
            return Ok(ResponseHelper.Success(new { sent = result }, "쪽지 발송 성공"));
        }

        /// <summary>
        /// 쪽지 읽음 처리
        /// </summary>
        [HttpPut("note/{NoteId:long}/read")]
        public async Task<IActionResult> MarkNoteRead(long NoteId)
        {
            var result = await _service.MarkNoteRead(NoteId);
            return Ok(ResponseHelper.Success(result, "쪽지 읽음 처리 성공"));
        }

        /// <summary>
        /// 쪽지 삭제 (해당 사용자만 논리 삭제)
        /// </summary>
        [HttpDelete("note/{NoteId:long}")]
        public async Task<IActionResult> DeleteNote(long NoteId, [FromQuery][Required] string UserId)
        {
            var result = await _service.DeleteNote(NoteId, UserId);
            return Ok(ResponseHelper.Success(result, "쪽지 삭제 성공"));
        }

        /// <summary>
        /// 사무소 대화목록 조회 (사무소 소속 구성원 쪽지 전체)
        /// </summary>
        [HttpGet("note/office")]
        public async Task<IActionResult> GetOfficeNotes(
            [FromQuery][Required] long OffNo,
            [FromQuery] string? UserId,
            [FromQuery] string? RegDtFr = null,
            [FromQuery] string? RegDtTo = null,
            [FromQuery] string? Keyword = null,
            [FromQuery] string? BizKeyword = null)
        {
            var result = await _service.GetOfficeNotes(OffNo, UserId ?? "", RegDtFr, RegDtTo, Keyword, BizKeyword);
            return Ok(ResponseHelper.Success(result, "사무소 쪽지 조회 성공"));
        }

        /// <summary>
        /// 대화방 공개여부 목록 조회
        /// </summary>
        [HttpGet("note/share")]
        public async Task<IActionResult> GetNoteShares([FromQuery][Required] long OffNo)
        {
            var result = await _service.GetNoteShares(OffNo);
            return Ok(ResponseHelper.Success(result, "대화방 공개여부 조회 성공"));
        }

        /// <summary>
        /// 대화방 공개여부 설정 (대표 전용)
        /// </summary>
        [HttpPut("note/share")]
        public async Task<IActionResult> SetNoteShare([FromBody] Models.NoteShareSetDto Dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다."));
            }
            var result = await _service.SetNoteShare(Dto);
            return Ok(ResponseHelper.Success(result, "대화방 공개여부 설정 성공"));
        }

        /// <summary>
        /// 사무소 전체 대화방 공개여부 일괄 설정 (대표 전용)
        /// </summary>
        [HttpPut("note/share/all")]
        public async Task<IActionResult> SetAllNoteShare([FromBody] Models.NoteShareAllDto Dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다."));
            }
            var result = await _service.SetAllNoteShare(Dto);
            return Ok(ResponseHelper.Success(new { updated = result }, "대화방 공개여부 일괄 설정 성공"));
        }
    }
}

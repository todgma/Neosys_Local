using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Property.Models;
using RealestateAPI.Property.Services;
using System.Numerics;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.Realestater.Controllers;
using System.Text.RegularExpressions;
using RealestateAPI.Office.Controllers;
using RealestateAPI.Office.Services;

namespace RealestateAPI.Property.Controllers
{
    [ApiController]
    [Route("/api/property")]

    public class PropertyController : ControllerBase
    {
        private readonly IPropertyServices _propertyService;

        private readonly ILogger<PropertyController> _logger;

        private readonly IConfiguration _config;

        public PropertyController(ILogger<PropertyController> logger, IPropertyServices adminUserService, IConfiguration config)
        {
            _propertyService = adminUserService;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 물건정보 목록 조회
        /// </summary>
        /// <param name="ptNo"></param>
        /// <param name="ptName"></param>
        /// <param name="offNo"></param>
        /// <param name="rtNo"></param>
        /// <param name="danjiCode"></param>
        /// <returns></returns>
        [HttpGet("GetPropertyList")]
        public async Task<IActionResult> SelectPropertyList(int? ptNo, string? ptName, long? offNo, string? rtNo, string? danjiCode, string? addr3, string? ptType, string? saleDiv, string? bjdCodes, [FromQuery][Required] int Page = 1, [FromQuery][Required] int PageSize = 20, string? dong = null, string? floorFilter = null, string? progressOnly = null, string? orderBy = null, string? orderDirection = null, string? keyword = null,
            string? ho = null, decimal? areaMin = null, decimal? areaMax = null, int? amtMin = null, int? amtMax = null, int? monMin = null, int? monMax = null)
        {
            var propertys = await _propertyService.SelectPropertyList(ptNo, ptName, offNo, rtNo, danjiCode, addr3, ptType, saleDiv, bjdCodes, Page, PageSize, dong, floorFilter, progressOnly, orderBy, orderDirection, keyword, ho, areaMin, areaMax, amtMin, amtMax, monMin, monMax);

            if (propertys == null || propertys.PtSales?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "물건정보 없음");
            }

            return Ok(ResponseHelper.Success(propertys, "물건정보 목록 조회 성공"));
        }

        /// <summary>
        /// 물건정보 상세 조회
        /// </summary>
        /// <param name="ptNo">물건번호</param>
        /// <returns></returns>
        [HttpGet("detail/{ptNo:long}")]
        public async Task<IActionResult> GetPropertyDetail(long ptNo)
        {
            var property = await _propertyService.GetPropertyDetail(ptNo);

            if (property == null)
            {
                ResponseHelper.Error("NOT_FOUND", "물건정보 없음");
            }

            return Ok(ResponseHelper.Success(property, "물건정보 상세 조회 성공"));
        }

        /// <summary>
        /// 물건정보등록
        /// </summary>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PropertyCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            long result = await _propertyService.InsertProperty(dto);

            if (result <= 0)
            {
                ResponseHelper.Error("INSERT_FAILED", "물건정보 등록 실패");
            }

            return Ok(ResponseHelper.Success(result > 0, "물건정보 등록 성공"));
        }

        /// <summary>
        /// 물건정보 엑셀 일괄 업로드 — 동/호는 명칭으로 받아 DB에서 dong_no/ho 로 정규화 후 건별 등록
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> BulkCreate([FromBody] PropertyBulkUploadDto dto)
        {
            if (dto?.Items == null || dto.Items.Count == 0)
            {
                return Ok(ResponseHelper.Success(new PropertyBulkResult(), "업로드할 데이터가 없습니다."));
            }

            var result = await _propertyService.BulkInsertProperties(dto);
            return Ok(ResponseHelper.Success(result, $"업로드 완료 — 성공 {result.Success} / 실패 {result.Failed}"));
        }

        /// <summary>
        /// 물건정보수정
        /// </summary>
        /// <param name="PtNo"></param>
        /// <param name="Dto"></param>
        /// <returns></returns>
        [HttpPut("{PtNo:long}")]
        public async Task<IActionResult> Update(long PtNo, [FromBody] PropertyUpdateDto Dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            bool result = await _propertyService.UpdateProperty(PtNo, Dto);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "물건정보 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "물건정보 수정 성공"));
        }

        /// <summary>
        /// 물건상태(pt_sts) 변경 — PtSts=null 이면 컬럼을 NULL로(진행중 해제)
        /// </summary>
        [HttpPut("{PtNo:long}/status")]
        public async Task<IActionResult> UpdateStatus([FromRoute] long PtNo, [FromBody] PropertyStatusDto Dto)
        {
            bool result = await _propertyService.UpdatePropertyStatus(PtNo, Dto?.PtSts, Dto?.UserId);
            if (!result)
            {
                return Ok(ResponseHelper.Error("UPDATE_FAILED", "물건상태 변경 실패"));
            }
            return Ok(ResponseHelper.Success(result, "물건상태 변경 성공"));
        }

        /// <summary>
        /// 물건정보삭제
        /// </summary>
        /// <param name="PtNo"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpDelete("{PtNo:long}")]
        public async Task<IActionResult> Delete([FromRoute] long PtNo, [FromQuery] string? UserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            bool result = await _propertyService.DeleteProperty(PtNo, UserId);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "물건정보 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "물건정보 삭제 성공"));
        }

        /// <summary>
        /// 과거내역 보관 (현재 물건 데이터를 pt_sale_old로 복사)
        /// </summary>
        [HttpPost("archive/{PtNo:long}")]
        public async Task<IActionResult> ArchiveHistory([FromRoute] long PtNo, [FromQuery] string? UserId)
        {
            bool result = await _propertyService.ArchivePropertyHistory(PtNo, UserId);
            if (!result)
            {
                ResponseHelper.Error("ARCHIVE_FAILED", "과거내역 보관 실패");
            }
            return Ok(ResponseHelper.Success(result, "과거내역 보관 성공"));
        }

        /// <summary>
        /// 과거내역 목록 조회 (모달)
        /// </summary>
        [HttpGet("history/{PtNo:long}")]
        public async Task<IActionResult> GetHistory([FromRoute] long PtNo)
        {
            var list = await _propertyService.GetPropertyHistoryList(PtNo);
            return Ok(ResponseHelper.Success(list, "과거내역 목록 조회 성공"));
        }
    }

    // 물건상태 변경 전용 DTO — PtSts null 허용(진행중 해제)
    public class PropertyStatusDto
    {
        public string? PtSts { get; set; }
        public string? UserId { get; set; }
    }

    public class PropertyCreateDto
    {
        public string? PtName { get; set; }   // 단지/건물명(선택) — 미사용/미입력 허용
        public string PtSts { get; set; } = default!;
        public string? PtType { get; set; }
        public string? PtExpl { get; set; }
        public string? SaleDiv { get; set; }
        public string? Addr1 { get; set; }
        public string? Addr2 { get; set; }
        public string? Addr3 { get; set; }
        public string? Addr4 { get; set; }
        public string? Addr5 { get; set; }
        public string? AddrPost { get; set; }
        public string? BjdCode { get; set; }
        public string? DanjiCode { get; set; }
        public string? Dong { get; set; }
        public string? Ho { get; set; }
        public int? Floor { get; set; }
        public string? Opt { get; set; }
        public int? HouseCnt { get; set; }
        public string? AptTyp { get; set; }
        public decimal? SupArea { get; set; }
        public decimal? ExcArea { get; set; }
        public decimal? LandShare { get; set; }
        public int? RoomCnt { get; set; }
        public int? BathCnt { get; set; }
        public int? EvChargerCnt { get; set; }   // 전기차충전대수
        public string? DirStd { get; set; }
        public string? HeatMethod { get; set; }
        public string? HeatFuel { get; set; }
        public string? EntrStruct { get; set; }
        public string? BuidStruct { get; set; }
        public string? BalcExt { get; set; }
        public int? Floor1 { get; set; }
        public int? Floor2 { get; set; }
        public decimal? PkCnt { get; set; }
        public int? MaintCost { get; set; }
        public string? MaintDtl { get; set; }
        public int? SaleAmt { get; set; }
        public int? LesAmt { get; set; }
        public int? ProtAmt { get; set; }
        public int? MonAmt { get; set; }
        public int? EtcAmt { get; set; }
        public int? LayAmt { get; set; }
        public int? NowDepAmt { get; set; }
        public int? NowMonAmt { get; set; }
        public int? LoanAmt { get; set; }
        public int? LoanAmtAft { get; set; }
        public string? MtryDate { get; set; }
        public string? ExptMovDate { get; set; }
        public string? ExptDate { get; set; }
        public string? ExptComDate { get; set; }
        public string? CompYear { get; set; }
        public string? ShaYn { get; set; }
        public long? CustNo { get; set; }
        public long? OffNo { get; set; }
        public string? RtNo { get; set; }
        public int? CnNo { get; set; }
        public string? MvnPsbYn { get; set; }
        public string? HouseRental { get; set; }
        public string? PetYn { get; set; }
        public string? Top { get; set; }
        public string? PtMemo { get; set; }
        public string? RegistryOwner { get; set; }   // 등기상 소유자
        public string? ContractTenant { get; set; }  // 계약서상 임차인
        public int? EtcAmt2 { get; set; }            // 기타임대 금액2
        public string? EtcLeaseType { get; set; }    // 기타임대유형 (단기임대/깔세/연세, 복수선택 콤마구분)
        public string? Jibun { get; set; }           // 지번
        public string? MaintZoneName { get; set; }   // 정비구역명 (재건축)
        public string? ChildYn { get; set; }         // 어린이 가능여부 (Y/N/C=조건부)
        public string? ChildCond { get; set; }       // 어린이 조건부 내용
        public string? PetAllow { get; set; }        // 반려동물 가능여부 (가능/불가능/조건부)
        public string? PetCond { get; set; }         // 반려동물 조건부 내용
        public int? LendAmt { get; set; }            // 대출액
        public int? LendAmtAft { get; set; }         // 잔금 후 대출액
        public string? DepLoanBank { get; set; }     // 보증금대출 은행
        public int? DepLoanAmt { get; set; }         // 보증금대출 금액
        public string? PastDataYn { get; set; }      // 과거데이터 여부
        // 추가 스칼라 컬럼 (STRING)
        public string? CurrentStatus { get; set; }
        public string? ContractRenewalRight { get; set; }
        public string? BuildingUse { get; set; }
        public string? LandUse { get; set; }
        public string? LandCategory { get; set; }
        public string? OtherRestrictions { get; set; }
        public string? DirBase { get; set; }
        public string? RecommendedBusiness { get; set; }
        public string? BusinessType { get; set; }   // 업종
        public string? BusinessName { get; set; }   // 상호
        public string? SubType { get; set; }
        public string? BuildingForm { get; set; }
        public string? MainBuildingUse { get; set; }
        public string? CommunityFacility { get; set; }
        public string? AddrDetail { get; set; }
        public string? Toilet { get; set; }
        public string? ContractDate { get; set; }
        public string? HoldDate { get; set; }
        public string? PermitDate { get; set; }
        // 종전물건유형 / 종전소재지 (재개발·재건축)
        public string? FormerPtType { get; set; }
        public string? FormerBjdCode { get; set; }
        public string? FormerDanjiCode { get; set; }
        public string? FormerAddr1 { get; set; }
        public string? FormerAddr2 { get; set; }
        public string? FormerAddr3 { get; set; }
        public string? FormerAddr4 { get; set; }
        public string? FormerAddr5 { get; set; }
        public string? FormerJibun { get; set; }
        public string? FormerDong { get; set; }
        public string? FormerHo { get; set; }
        public string? FormerAptTyp { get; set; }
        public decimal? FormerSupArea { get; set; }
        public decimal? FormerExcArea { get; set; }
        public decimal? FormerTotalFloorArea { get; set; }
        public decimal? FormerLandArea { get; set; }
        public decimal? FormerLandShareRatio { get; set; }
        // 추가 스칼라 컬럼 (DECIMAL)
        public decimal? GrossArea { get; set; }
        public decimal? BuildingArea { get; set; }
        public decimal? LandShareRatio { get; set; }
        public decimal? AccessRoad { get; set; }
        public decimal? OfficeArea { get; set; }
        public decimal? RoadInfo { get; set; }
        // 추가 스칼라 컬럼 (INT)
        public int? FacilityCost { get; set; }
        public string? CityGas { get; set; }        // 도시가스(상가/사무실: 인입완료/인입가능/인입불가)
        public string? PowerReceiving { get; set; }  // 수전(설치/미설치)
        public string? ElecCapacity { get; set; }    // 전기용량(kW)
        public int? ElevatorCnt { get; set; }
        public int? StairsCnt { get; set; }
        public int? BasementFloor { get; set; }
        public int? GroundFloor { get; set; }
        public int? GuestRoomCnt { get; set; }
        public int? PresaleAmt { get; set; }
        public int? ExpansionAmt { get; set; }
        public int? OptionAmt { get; set; }
        public int? PremiumAmt { get; set; }
        public decimal? FormerArea { get; set; }
        public int? AddContribAmt { get; set; }
        public int? RightValueAmt { get; set; }
        public int? MovingCost { get; set; }
        public int? DepositTotal { get; set; }
        public int? LoanTotal { get; set; }
        public int? InvestAmt { get; set; }
        public int? IncRentM { get; set; }
        public int? IncRentY { get; set; }
        public int? IncMgmtM { get; set; }
        public int? IncMgmtY { get; set; }
        public int? IncEtcM { get; set; }
        public int? IncEtcY { get; set; }
        public int? ExpLaborM { get; set; }
        public int? ExpLaborY { get; set; }
        public int? ExpUtilM { get; set; }
        public int? ExpUtilY { get; set; }
        public int? ExpLoanM { get; set; }
        public int? ExpLoanY { get; set; }
        public int? ExpEtcM { get; set; }
        public int? ExpEtcY { get; set; }
        // 추가 스칼라 컬럼 (BOOL)
        public bool? ZoneAdjust { get; set; }
        public bool? ZoneOverheat { get; set; }
        public bool? ZoneSpec { get; set; }
        public bool? ZoneLandPermit { get; set; }
        public bool? BuildPermit { get; set; }
        public bool? ZoneDevRestrict { get; set; }
        public bool? RightSurface { get; set; }
        public bool? RightGrave { get; set; }
        public bool? RightEasement { get; set; }
        public string? UserId { get; set; }
        public List<PropertyHolderDto>? Holders { get; set; }
        public List<PropertyShareDto>? Shares { get; set; }
        public List<PropertyMemoSyncDto>? Memos { get; set; }
        public List<PropertyConsultSyncDto>? Consultations { get; set; }
        public List<PropertyLeaseRowDto>? LeaseRows { get; set; }
        public List<PropertyLandParcelDto>? Parcels { get; set; }
    }

    // 엑셀 일괄 업로드 요청 — 공통 단지/사무소 컨텍스트 + 물건 목록(PropertyCreateDto)
    public class PropertyBulkUploadDto
    {
        public string? DanjiCode { get; set; }   // 공통 단지(naver_danji_code) — 동/호 조회 기준
        public long? OffNo { get; set; }
        public string? RtNo { get; set; }
        public string? UserId { get; set; }
        public List<PropertyCreateDto> Items { get; set; } = new List<PropertyCreateDto>();
    }

    public class PropertyBulkError
    {
        public int Row { get; set; }
        public string? Message { get; set; }
    }

    public class PropertyBulkResult
    {
        public int Total { get; set; }
        public int Success { get; set; }
        public int Failed { get; set; }
        public List<PropertyBulkError> Errors { get; set; } = new List<PropertyBulkError>();
    }

    public class PropertyUpdateDto
    {
        public string? PtName { get; set; }
        public string? PtSts { get; set; }
        public string? PtType { get; set; }
        public string? PtExpl { get; set; }
        public string? SaleDiv { get; set; }
        public string? Addr1 { get; set; }
        public string? Addr2 { get; set; }
        public string? Addr3 { get; set; }
        public string? Addr4 { get; set; }
        public string? Addr5 { get; set; }
        public string? AddrPost { get; set; }
        public string? BjdCode { get; set; }
        public string? DanjiCode { get; set; }
        public string? Dong { get; set; }
        public string? Ho { get; set; }
        public int? Floor { get; set; }
        public string? Opt { get; set; }
        public int? HouseCnt { get; set; }
        public string? AptTyp { get; set; }
        public decimal? SupArea { get; set; }
        public decimal? ExcArea { get; set; }
        public decimal? LandShare { get; set; }
        public int? RoomCnt { get; set; }
        public int? BathCnt { get; set; }
        public int? EvChargerCnt { get; set; }   // 전기차충전대수
        public string? DirStd { get; set; }
        public string? HeatMethod { get; set; }
        public string? HeatFuel { get; set; }
        public string? EntrStruct { get; set; }
        public string? BuidStruct { get; set; }
        public string? BalcExt { get; set; }
        public int? Floor1 { get; set; }
        public int? Floor2 { get; set; }
        public decimal? PkCnt { get; set; }
        public int? MaintCost { get; set; }
        public string? MaintDtl { get; set; }
        public int? SaleAmt { get; set; }
        public int? LesAmt { get; set; }
        public int? ProtAmt { get; set; }
        public int? MonAmt { get; set; }
        public int? EtcAmt { get; set; }
        public int? LayAmt { get; set; }
        public int? NowDepAmt { get; set; }
        public int? NowMonAmt { get; set; }
        public int? LoanAmt { get; set; }
        public int? LoanAmtAft { get; set; }
        public string? MtryDate { get; set; }
        public string? ExptMovDate { get; set; }
        public string? ExptDate { get; set; }
        public string? ExptComDate { get; set; }
        public string? CompYear { get; set; }
        public string? ShaYn { get; set; }
        public long? CustNo { get; set; }
        public long? OffNo { get; set; }
        public string? RtNo { get; set; }
        public int? CnNo { get; set; }
        public string? MvnPsbYn { get; set; }
        public string? HouseRental { get; set; }
        public string? PetYn { get; set; }
        public string? Top { get; set; }
        public string? PtMemo { get; set; }
        public string? RegistryOwner { get; set; }   // 등기상 소유자
        public string? ContractTenant { get; set; }  // 계약서상 임차인
        public int? EtcAmt2 { get; set; }            // 기타임대 금액2
        public string? EtcLeaseType { get; set; }    // 기타임대유형 (단기임대/깔세/연세, 복수선택 콤마구분)
        public string? Jibun { get; set; }           // 지번
        public string? MaintZoneName { get; set; }   // 정비구역명 (재건축)
        public string? ChildYn { get; set; }         // 어린이 가능여부 (Y/N/C=조건부)
        public string? ChildCond { get; set; }       // 어린이 조건부 내용
        public string? PetAllow { get; set; }        // 반려동물 가능여부 (가능/불가능/조건부)
        public string? PetCond { get; set; }         // 반려동물 조건부 내용
        public int? LendAmt { get; set; }            // 대출액
        public int? LendAmtAft { get; set; }         // 잔금 후 대출액
        public string? DepLoanBank { get; set; }     // 보증금대출 은행
        public int? DepLoanAmt { get; set; }         // 보증금대출 금액
        public string? PastDataYn { get; set; }      // 과거데이터 여부
        // 추가 스칼라 컬럼 (STRING)
        public string? CurrentStatus { get; set; }
        public string? ContractRenewalRight { get; set; }
        public string? BuildingUse { get; set; }
        public string? LandUse { get; set; }
        public string? LandCategory { get; set; }
        public string? OtherRestrictions { get; set; }
        public string? DirBase { get; set; }
        public string? RecommendedBusiness { get; set; }
        public string? BusinessType { get; set; }   // 업종
        public string? BusinessName { get; set; }   // 상호
        public string? SubType { get; set; }
        public string? BuildingForm { get; set; }
        public string? MainBuildingUse { get; set; }
        public string? CommunityFacility { get; set; }
        public string? AddrDetail { get; set; }
        public string? Toilet { get; set; }
        public string? ContractDate { get; set; }
        public string? HoldDate { get; set; }
        public string? PermitDate { get; set; }
        // 종전물건유형 / 종전소재지 (재개발·재건축)
        public string? FormerPtType { get; set; }
        public string? FormerBjdCode { get; set; }
        public string? FormerDanjiCode { get; set; }
        public string? FormerAddr1 { get; set; }
        public string? FormerAddr2 { get; set; }
        public string? FormerAddr3 { get; set; }
        public string? FormerAddr4 { get; set; }
        public string? FormerAddr5 { get; set; }
        public string? FormerJibun { get; set; }
        public string? FormerDong { get; set; }
        public string? FormerHo { get; set; }
        public string? FormerAptTyp { get; set; }
        public decimal? FormerSupArea { get; set; }
        public decimal? FormerExcArea { get; set; }
        public decimal? FormerTotalFloorArea { get; set; }
        public decimal? FormerLandArea { get; set; }
        public decimal? FormerLandShareRatio { get; set; }
        // 추가 스칼라 컬럼 (DECIMAL)
        public decimal? GrossArea { get; set; }
        public decimal? BuildingArea { get; set; }
        public decimal? LandShareRatio { get; set; }
        public decimal? AccessRoad { get; set; }
        public decimal? OfficeArea { get; set; }
        public decimal? RoadInfo { get; set; }
        // 추가 스칼라 컬럼 (INT)
        public int? FacilityCost { get; set; }
        public string? CityGas { get; set; }        // 도시가스(상가/사무실: 인입완료/인입가능/인입불가)
        public string? PowerReceiving { get; set; }  // 수전(설치/미설치)
        public string? ElecCapacity { get; set; }    // 전기용량(kW)
        public int? ElevatorCnt { get; set; }
        public int? StairsCnt { get; set; }
        public int? BasementFloor { get; set; }
        public int? GroundFloor { get; set; }
        public int? GuestRoomCnt { get; set; }
        public int? PresaleAmt { get; set; }
        public int? ExpansionAmt { get; set; }
        public int? OptionAmt { get; set; }
        public int? PremiumAmt { get; set; }
        public decimal? FormerArea { get; set; }
        public int? AddContribAmt { get; set; }
        public int? RightValueAmt { get; set; }
        public int? MovingCost { get; set; }
        public int? DepositTotal { get; set; }
        public int? LoanTotal { get; set; }
        public int? InvestAmt { get; set; }
        public int? IncRentM { get; set; }
        public int? IncRentY { get; set; }
        public int? IncMgmtM { get; set; }
        public int? IncMgmtY { get; set; }
        public int? IncEtcM { get; set; }
        public int? IncEtcY { get; set; }
        public int? ExpLaborM { get; set; }
        public int? ExpLaborY { get; set; }
        public int? ExpUtilM { get; set; }
        public int? ExpUtilY { get; set; }
        public int? ExpLoanM { get; set; }
        public int? ExpLoanY { get; set; }
        public int? ExpEtcM { get; set; }
        public int? ExpEtcY { get; set; }
        // 추가 스칼라 컬럼 (BOOL)
        public bool? ZoneAdjust { get; set; }
        public bool? ZoneOverheat { get; set; }
        public bool? ZoneSpec { get; set; }
        public bool? ZoneLandPermit { get; set; }
        public bool? BuildPermit { get; set; }
        public bool? ZoneDevRestrict { get; set; }
        public bool? RightSurface { get; set; }
        public bool? RightGrave { get; set; }
        public bool? RightEasement { get; set; }
        public string? UserId { get; set; }
        public List<PropertyHolderDto>? Holders { get; set; }
        public List<PropertyShareDto>? Shares { get; set; }
        public List<PropertyMemoSyncDto>? Memos { get; set; }
        public List<PropertyConsultSyncDto>? Consultations { get; set; }
        public List<PropertyLeaseRowDto>? LeaseRows { get; set; }
        public List<PropertyLandParcelDto>? Parcels { get; set; }
    }

    public class PropertyHolderDto
    {
        public int? HolderIdx { get; set; }
        public string? HolderType { get; set; }
        public string? HolderRegDate { get; set; }
        public string? HolderName { get; set; }
        public string? HolderPhone { get; set; }
        public long? CustNo { get; set; }
        public string? HolderRelation { get; set; }
        public string? HolderMemo { get; set; }
    }

    // 부동산공유(공인중개사) 이력
    public class PropertyShareDto
    {
        public string? OfficeName { get; set; }   // 상호
        public string? RegionName { get; set; }   // 지역명
        public string? OfficePhone { get; set; }  // 전화번호
        public string? Memo { get; set; }         // 내용
        public string? Date { get; set; }         // 공유일자
    }

    // 물건메모 일괄 동기화 (MemoNo 있으면 기존, 없으면 신규 / 없어진 것은 삭제)
    public class PropertyMemoSyncDto
    {
        public long? MemoNo { get; set; }
        public string? MemoDate { get; set; }
        public string? MemoContent { get; set; }
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }
        public string? UserId { get; set; }
    }

    // 상담이력 일괄 동기화 (ItvNo 있으면 기존, 없으면 신규 / 없어진 것은 삭제)
    public class PropertyConsultSyncDto
    {
        public long? ItvNo { get; set; }
        public string? ItvDate { get; set; }
        public string? ItvContent { get; set; }
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }
    }

    // 임대차현황서 행 (pt_lease_status)
    public class PropertyLeaseRowDto
    {
        public string? RoomNo { get; set; }
        public decimal? Area { get; set; }
        public string? CurStatus { get; set; }
        public int? Deposit { get; set; }
        public int? MonthlyRent { get; set; }
        public int? MaintCost { get; set; }
        public string? ContractStart { get; set; }
        public string? ContractEnd { get; set; }
        public string? BusinessType { get; set; }
        public string? BusinessName { get; set; }
    }

    // 토지 필지목록 행 (pt_land_additional)
    public class PropertyLandParcelDto
    {
        public string? Dong { get; set; }
        public string? Soji { get; set; }
        public string? BjdCode { get; set; }
        public string? Jibun { get; set; }
        public decimal? LandArea { get; set; }
        public string? LandCategory { get; set; }
        public string? LandUse { get; set; }
        public string? OtherRestrictions { get; set; }
    }
}
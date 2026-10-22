using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Customer.Services;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Xml.Linq;
using RealestateAPI.Shared.Services;

namespace RealestateAPI.Customer.Controllers
{
    [ApiController]
    [Route("api/Customers")]
    public class CustomersController : ControllerBase
    {
        private readonly ICustomersServices _service;
        private readonly ILogger<CustomersController> _logger;
        private readonly IConfiguration _config;
        private readonly IErrorLogService _errorLogService;

        public CustomersController(
            ILogger<CustomersController> logger,
            ICustomersServices service,
            IConfiguration config,
            IErrorLogService errorLogService
            )
        {
            _service = service;
            _logger = logger;
            _config = config;
            _errorLogService= errorLogService;
        }

        /// <summary>
        /// 고객조회
        /// </summary>
        /// <param name="CustNo"></param>
        /// <param name="Name"></param>
        /// <param name="Alias"></param>
        /// <param name="Tel"></param>
        /// <param name="OffNo"></param>
        /// <param name="VendorId"></param>
        /// <param name="Page"></param>
        /// <param name="PageSize"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] int? CustNo, [FromQuery] string? Name, [FromQuery] string? Alias, [FromQuery] string? Tel, [FromQuery] int? OffNo, [FromQuery] int? VendorId, [FromQuery] string? WantType, [FromQuery] string? TrdType, [FromQuery] string? TrdPrg, [FromQuery][Required] int Page = 1, [FromQuery][Required] int PageSize = 20, [FromQuery] string? SortBy = null, [FromQuery] string? SortDir = null, [FromQuery] string? Keyword = null)
        {
            var list = await _service.SelecCustomerList(CustNo, Name, Alias, Tel, OffNo, VendorId, WantType, TrdType, TrdPrg, Page, PageSize, SortBy, SortDir, Keyword);

            if (list == null || list.Customers?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "고객 정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "고객 목록 조회 성공"));
        }

        /// <summary>
        /// 고객 상세조회 (희망지역/구입자 포함)
        /// </summary>
        [HttpGet("{CustNo:long}")]
        public async Task<IActionResult> GetDetail([FromRoute] long CustNo)
        {
            var detail = await _service.GetCustomerDetail(CustNo);
            if (detail == null)
            {
                ResponseHelper.Error("NOT_FOUND", "고객 정보 없음");
            }
            return Ok(ResponseHelper.Success(detail, "고객 상세 조회 성공"));
        }

        /// <summary>
        /// 고객등록
        /// </summary>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CustomersCreateDto Dto, [FromQuery] string? UserId)
        {
            if (!ModelState.IsValid)
            {
                ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.");
            }

            var custNo = await _service.InsertCustomer(Dto, UserId);

            if (custNo <= 0)
            {
                ResponseHelper.Error("INSERT_FAILED", "고객 등록 실패");
            }

            return Ok(ResponseHelper.Success(custNo, "고객 등록 성공"));
        }

        /// <summary>
        /// 고객 엑셀 일괄 업로드 — 구입자/희망지역 등 자식 포함 건별 등록
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> BulkCreate([FromBody] CustomerBulkUploadDto dto)
        {
            if (dto?.Items == null || dto.Items.Count == 0)
            {
                return Ok(ResponseHelper.Success(new CustomerBulkResult(), "업로드할 데이터가 없습니다."));
            }

            var result = await _service.BulkInsertCustomers(dto);
            return Ok(ResponseHelper.Success(result, $"업로드 완료 — 성공 {result.Success} / 실패 {result.Failed}"));
        }

        /// <summary>
        /// 고객수정
        /// </summary>
        /// <param name="CustNo"></param>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPut("{CustNo:long}")]
        public async Task<IActionResult> Update(long CustNo, [FromBody] CustomersUpdateDto Dto, [FromQuery] string? UserId)
        {
            if (!ModelState.IsValid)
            {
                ResponseHelper.Error("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.");
            }

            var Result = await _service.UpdateCustomer(CustNo, Dto, UserId);

            if (!Result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "고객 수정 실패");
            }

            return Ok(ResponseHelper.Success(Result, "고객 수정 성공"));
        }

        /// <summary>
        /// 고객삭제
        /// </summary>
        /// <param name="CustNo"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpDelete("{CustNo:int}")]
        public async Task<IActionResult> Delete([FromRoute] int CustNo, [FromQuery] string? UserId)
        {
            var Result = await _service.DeleteCustomer(CustNo, UserId);

            if (!Result)
            {
                ResponseHelper.Error("DELETE_FAILED", "고객 삭제 실패");
            }

            return Ok(ResponseHelper.Success(Result, "고객 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class CustomersCreateDto
    {
        public int? CustType { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string? Alias { get; set; }
        public string? Tel { get; set; }   // 대표 연락처 (선택 — 미입력 시 null 허용)
        public string? Addr { get; set; }
        public string? Memo { get; set; }
        public string? RentBsnYn { get; set; }
        public string? TrdPrg { get; set; } = default!;   // 거래 진행 상태
        public string? WantType { get; set; }           // 원하는 유형
        public string? WantNm { get; set; }             // 원하는 이름
        public decimal? ExcAreaFr { get; set; }         // 면적 범위 시작
        public decimal? ExcAreaTo { get; set; }         // 면적 범위 끝
        public decimal? LandShareFr { get; set; }       // 지분 범위 시작
        public decimal? LandShareTo { get; set; }       // 지분 범위 끝
        public string? TrdType { get; set; }            // 거래 유형
        public string? MoveinYn { get; set; }           // 입주 여부
        public string? MoveDateFr { get; set; }         // 입주일 시작
        public string? MoveDateTo { get; set; }         // 입주일 종료
        public string? CashAblt { get; set; }           // 현금 가능 여부
        public int? SaleAmtFr { get; set; }             // 매매 금액 시작
        public int? SaleAmtTo { get; set; }             // 매매 금액 종료
        public int? LesAmtFr { get; set; }              // 전세 금액 시작
        public int? LesAmtTo { get; set; }              // 전세 금액 종료
        public int? ProtAmtFr { get; set; }             // 보증금 시작
        public int? ProtAmtTo { get; set; }             // 보증금 종료
        public int? MonAmtFr { get; set; }              // 월세 시작
        public int? MonAmtTo { get; set; }              // 월세 종료
        public int? EtcProtAmtFr { get; set; }          // 기타 보증금 시작
        public int? EtcProtAmtTo { get; set; }          // 기타 보증금 종료
        public int? EtcMonAmtFr { get; set; }           // 기타 월세 시작
        public int? EtcMonAmtTo { get; set; }           // 기타 월세 종료
        public string? EtcType { get; set; }            // 기타 유형
        public string? Rmk { get; set; }                // 비고/상세정보
        public long? RtNo { get; set; }
        public long? OffNo { get; set; }
        public long? VendorId { get; set; }
        public string? UserId { get; set; }

        // 재정립 신규
        public int? RoomCnt { get; set; }
        public int? BathCnt { get; set; }
        public int? ParkCnt { get; set; }
        public string? CommunityFac { get; set; }
        public string? FeatureNote { get; set; }
        public string? GapInvestYn { get; set; }
        public string? IrrelevantYn { get; set; }
        public string? Rnk { get; set; }

        // 감사 신규(프론트 전송 필드 반영)
        public string? WantSubType { get; set; }
        public decimal? GrossAreaFr { get; set; }
        public decimal? GrossAreaTo { get; set; }
        public string? AreaKind { get; set; }
        public decimal? LandShareRatioFr { get; set; }
        public decimal? LandShareRatioTo { get; set; }
        public string? AreaUnit { get; set; }
        public string? InvestYn { get; set; }
        public string? ChildYn { get; set; }
        public string? ChildCond { get; set; }
        public string? PetAllow { get; set; }
        public string? PetCond { get; set; }
        public string? Opt { get; set; }
        public string? BuildingUse { get; set; }
        public string? BizType { get; set; }
        public int? ElevatorCnt { get; set; }
        public int? StairCnt { get; set; }
        public string? CityGasYn { get; set; }
        public string? ElectricYn { get; set; }
        public string? ElecCapacity { get; set; }
        public string? AccessRoad { get; set; }
        public string? LandUse { get; set; }
        public string? LandCategory { get; set; }
        public string? ContractDate { get; set; }
        public string? HoldDate { get; set; }
        public string? BalcExt { get; set; }          // 발코니(주거용)
        public string? EntrStruct { get; set; }       // 현관구조(주거용)
        public string? BuildingForm { get; set; }     // 건물형태(주거용)
        public string? BuildPermitPref { get; set; }  // 건축허가 선호(토지)

        public List<CustAreaDto>? Areas { get; set; }
        public List<CustBuyerDto>? Buyers { get; set; }
        public List<CustShareDto>? Shares { get; set; }

        // 상담메모 / 상담이력 (고객 저장 트랜잭션에 포함)
        public List<CustMemoDto>? Memos { get; set; }
        public List<CustConsultDto>? Consultations { get; set; }
        public List<long>? DeletedMemoNos { get; set; }
        public List<long>? DeletedItvNos { get; set; }
    }

    // 엑셀 일괄 업로드 요청 — 공통 사무소 컨텍스트 + 고객 목록
    public class CustomerBulkUploadDto
    {
        public long? OffNo { get; set; }
        public long? RtNo { get; set; }
        public long? VendorId { get; set; }
        public string? UserId { get; set; }
        public List<CustomersCreateDto> Items { get; set; } = new List<CustomersCreateDto>();
    }

    public class CustomerBulkError
    {
        public int Row { get; set; }
        public string? Message { get; set; }
    }

    public class CustomerBulkResult
    {
        public int Total { get; set; }
        public int Success { get; set; }
        public int Failed { get; set; }
        public List<CustomerBulkError> Errors { get; set; } = new List<CustomerBulkError>();
    }

    public class CustomersUpdateDto
    {
        public int? CustType { get; set; }
        public string? Name { get; set; }
        public string? Alias { get; set; }
        public string? Tel { get; set; }
        public string? Addr { get; set; }
        public string? Memo { get; set; }
        public string? RentBsnYn { get; set; }
        public string? TrdPrg { get; set; }   // 거래 진행 상태
        public string? WantType { get; set; }           // 원하는 유형
        public string? WantNm { get; set; }             // 원하는 이름
        public decimal? ExcAreaFr { get; set; }         // 면적 범위 시작
        public decimal? ExcAreaTo { get; set; }         // 면적 범위 끝
        public decimal? LandShareFr { get; set; }       // 지분 범위 시작
        public decimal? LandShareTo { get; set; }       // 지분 범위 끝
        public string? TrdType { get; set; }            // 거래 유형
        public string? MoveinYn { get; set; }           // 입주 여부
        public string? MoveDateFr { get; set; }         // 입주일 시작
        public string? MoveDateTo { get; set; }         // 입주일 종료
        public string? CashAblt { get; set; }           // 현금 가능 여부
        public int? SaleAmtFr { get; set; }             // 매매 금액 시작
        public int? SaleAmtTo { get; set; }             // 매매 금액 종료
        public int? LesAmtFr { get; set; }              // 전세 금액 시작
        public int? LesAmtTo { get; set; }              // 전세 금액 종료
        public int? ProtAmtFr { get; set; }             // 보증금 시작
        public int? ProtAmtTo { get; set; }             // 보증금 종료
        public int? MonAmtFr { get; set; }              // 월세 시작
        public int? MonAmtTo { get; set; }              // 월세 종료
        public int? EtcProtAmtFr { get; set; }          // 기타 보증금 시작
        public int? EtcProtAmtTo { get; set; }          // 기타 보증금 종료
        public int? EtcMonAmtFr { get; set; }           // 기타 월세 시작
        public int? EtcMonAmtTo { get; set; }           // 기타 월세 종료
        public string? EtcType { get; set; }            // 기타 유형
        public string? Rmk { get; set; }                // 비고/상세정보
        public long? RtNo { get; set; }
        public long? OffNo { get; set; }
        public long? VendorId { get; set; }
        public string? UserId { get; set; }

        // 재정립 신규
        public int? RoomCnt { get; set; }
        public int? BathCnt { get; set; }
        public int? ParkCnt { get; set; }
        public string? CommunityFac { get; set; }
        public string? FeatureNote { get; set; }
        public string? GapInvestYn { get; set; }
        public string? IrrelevantYn { get; set; }
        public string? Rnk { get; set; }

        // 감사 신규(프론트 전송 필드 반영)
        public string? WantSubType { get; set; }
        public decimal? GrossAreaFr { get; set; }
        public decimal? GrossAreaTo { get; set; }
        public string? AreaKind { get; set; }
        public decimal? LandShareRatioFr { get; set; }
        public decimal? LandShareRatioTo { get; set; }
        public string? AreaUnit { get; set; }
        public string? InvestYn { get; set; }
        public string? ChildYn { get; set; }
        public string? ChildCond { get; set; }
        public string? PetAllow { get; set; }
        public string? PetCond { get; set; }
        public string? Opt { get; set; }
        public string? BuildingUse { get; set; }
        public string? BizType { get; set; }
        public int? ElevatorCnt { get; set; }
        public int? StairCnt { get; set; }
        public string? CityGasYn { get; set; }
        public string? ElectricYn { get; set; }
        public string? ElecCapacity { get; set; }
        public string? AccessRoad { get; set; }
        public string? LandUse { get; set; }
        public string? LandCategory { get; set; }
        public string? ContractDate { get; set; }
        public string? HoldDate { get; set; }
        public string? BalcExt { get; set; }          // 발코니(주거용)
        public string? EntrStruct { get; set; }       // 현관구조(주거용)
        public string? BuildingForm { get; set; }     // 건물형태(주거용)
        public string? BuildPermitPref { get; set; }  // 건축허가 선호(토지)

        public List<CustAreaDto>? Areas { get; set; }
        public List<CustBuyerDto>? Buyers { get; set; }
        public List<CustShareDto>? Shares { get; set; }

        // 상담메모 / 상담이력 (고객 저장 트랜잭션에 포함)
        public List<CustMemoDto>? Memos { get; set; }
        public List<CustConsultDto>? Consultations { get; set; }
        public List<long>? DeletedMemoNos { get; set; }
        public List<long>? DeletedItvNos { get; set; }
    }

    // 희망지역 DTO
    public class CustAreaDto
    {
        public string? Addr1 { get; set; }
        public string? Addr2 { get; set; }
        public string? Addr3 { get; set; }
        public string? BjdCode { get; set; }
        public string? BldNm { get; set; }
        public string? DanjiCode { get; set; }
        public string? DetailLoc { get; set; }
    }

    // 구입자정보 DTO
    public class CustBuyerDto
    {
        public string? Name { get; set; }
        public string? Relation { get; set; }
        public string? Tel { get; set; }
        public string? Addr { get; set; }
    }

    // 공동중개사 사무소 DTO
    public class CustShareDto
    {
        public string? OfficeName { get; set; }
        public string? RegionName { get; set; }
        public string? OfficePhone { get; set; }
        public string? Memo { get; set; }
        public string? Date { get; set; }
    }

    // 고객 상담메모 DTO (pt_memo, cust_no 기준)
    public class CustMemoDto
    {
        public long? MemoNo { get; set; }
        public string? MemoDate { get; set; }
        public string? MemoContent { get; set; }
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }
        public string? UserId { get; set; }
        public bool? Deleted { get; set; }
    }

    // 고객 상담이력 DTO (ct_interview, cust_no 기준)
    public class CustConsultDto
    {
        public long? ItvNo { get; set; }
        public string? ItvContent { get; set; }
        public string? ItvDate { get; set; }
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }
        public bool? Deleted { get; set; }
    }
}

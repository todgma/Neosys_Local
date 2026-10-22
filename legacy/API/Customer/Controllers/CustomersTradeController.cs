using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Customer.Services;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Xml.Linq;
using Org.BouncyCastle.Asn1.X500;
using System.Data;

namespace RealestateAPI.Customer.Controllers
{
    [ApiController]
    [Route("api/CustomersTrade")]
    public class CustomersTradeController : ControllerBase
    {
        private readonly ICustomersTradeServices _service;
        private readonly ILogger<CustomersTradeController> _logger;
        private readonly IConfiguration _config;

        public CustomersTradeController(
            ILogger<CustomersTradeController> logger,
            ICustomersTradeServices service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 고객거래정보조회
        /// </summary>
        /// <param name="TrdNo"></param>
        /// <param name="TrdPrg"></param>
        /// <param name="CustNo"></param>
        /// <param name="WantType"></param>
        /// <param name="WantNm"></param>
        /// <param name="ExcAreaFr"></param>
        /// <param name="ExcAreaTo"></param>
        /// <param name="LandShareFr"></param>
        /// <param name="LandShareTo"></param>
        /// <param name="TrdType"></param>
        /// <param name="MoveinYn"></param>
        /// <param name="MoveDateFr"></param>
        /// <param name="MoveDateTo"></param>
        /// <param name="CashAblt"></param>
        /// <param name="SaleAmtFr"></param>
        /// <param name="SaleAmtTo"></param>
        /// <param name="LesAmtFr"></param>
        /// <param name="LesAmtTo"></param>
        /// <param name="ProtAmtFr"></param>
        /// <param name="ProtAmtTo"></param>
        /// <param name="MonAmtFr"></param>
        /// <param name="MonAmtTo"></param>
        /// <param name="EtcProtAmtFr"></param>
        /// <param name="EtcProtAmtTo"></param>
        /// <param name="EtcMonAmtFr"></param>
        /// <param name="EtcMonAmtTo"></param>
        /// <param name="EtcType"></param>
        /// <param name="Rnk"></param>
        /// <param name="RtNo"></param>
        /// <param name="OffNo"></param>
        /// <param name="Page"></param>
        /// <param name="PageSize"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] long? TrdNo, [FromQuery] string? TrdPrg, [FromQuery] long? CustNo, [FromQuery] string? WantType, [FromQuery] string? WantNm,
                                                    [FromQuery] decimal? ExcAreaFr, [FromQuery] decimal? ExcAreaTo, [FromQuery] decimal? LandShareFr, [FromQuery] decimal? LandShareTo,
                                                    [FromQuery] string? TrdType, [FromQuery] string? MoveinYn, [FromQuery] string? MoveDateFr, [FromQuery] string? MoveDateTo, [FromQuery] string? CashAblt,
                                                    [FromQuery] int? SaleAmtFr, [FromQuery] int? SaleAmtTo, [FromQuery] int? LesAmtFr, [FromQuery] int? LesAmtTo, [FromQuery] int? ProtAmtFr, [FromQuery] int? ProtAmtTo,
                                                    [FromQuery] int? MonAmtFr, [FromQuery] int? MonAmtTo, [FromQuery] int? EtcProtAmtFr, [FromQuery] int? EtcProtAmtTo, [FromQuery] int? EtcMonAmtFr, [FromQuery] int? EtcMonAmtTo,
                                                    [FromQuery] string? EtcType, [FromQuery] string? Rnk, [FromQuery] long? RtNo, [FromQuery] long? OffNo, [FromQuery][Required] int Page = 1, [FromQuery][Required] int PageSize = 20)
        {
            var list = await _service.SelecCustomerTradeList(TrdNo, TrdPrg, CustNo, WantType, WantNm, ExcAreaFr, ExcAreaTo, LandShareFr, LandShareTo, TrdType, MoveinYn, MoveDateFr, MoveDateTo,
                                                             CashAblt, SaleAmtFr, SaleAmtTo, LesAmtFr, LesAmtTo, ProtAmtFr, ProtAmtTo, MonAmtFr, MonAmtTo, EtcProtAmtFr, EtcProtAmtTo, EtcMonAmtFr, EtcMonAmtTo,
                                                             EtcType, Rnk, RtNo, OffNo, Page, PageSize);

            if (list == null || list.TradeInfos?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "고객 거래정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "고객 거래정보 조회 성공"));
        }

        /// <summary>
        /// 고객거래정보등록
        /// </summary>
        /// <param name="Dto"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CustomersTradeCreateDto Dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.InsertCustomerTrade(Dto);

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "고객거래정보 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "고객거래정보 등록 성공"));
        }

        /// <summary>
        /// 고객거래정보수정
        /// </summary>
        /// <param name="TrdNo"></param>
        /// <param name="Dto"></param>
        /// <returns></returns>
        [HttpPut("{TrdNo:long}")]
        public async Task<IActionResult> Update([FromRoute] long TrdNo, [FromBody] CustomersTradeUpdateDto Dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.UpdateCustomerTrade(TrdNo, Dto);

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "고객거래정보 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "고객거래정보 수정 성공"));
        }

        /// <summary>
        /// 고객거래정보삭제
        /// </summary>
        /// <param name="TrdNo"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpDelete("{TrdNo:long}")]
        public async Task<IActionResult> Delete([FromRoute] int TrdNo, [FromQuery] string? UserId)
        {
            var result = await _service.DeleteCustomerTrade(TrdNo, UserId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "고객거래정보 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "고객거래정보 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class CustomersTradeCreateDto
    {
        public string TrdPrg { get; set; } = default!;             // 거래 진행 상태
        public long? CustNo { get; set; }               // 고객번호
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
        public string? Rnk { get; set; }                // 순위
        public long? RtNo { get; set; }                 // 중개사 번호
        public long? OffNo { get; set; }                // 지점 번호
        public string? UserId { get; set; }
    }

    public class CustomersTradeUpdateDto
    {
        public string? TrdPrg { get; set; }              // 거래 진행 상태
        public long? CustNo { get; set; }               // 고객번호
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
        public string? Rnk { get; set; }                // 순위
        public long? RtNo { get; set; }                 // 중개사 번호
        public long? OffNo { get; set; }                // 지점 번호
        public string? UserId { get; set; }
    }
}



using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Customer.Services;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Xml.Linq;
using Org.BouncyCastle.Asn1.X500;

namespace RealestateAPI.Customer.Controllers
{
    [ApiController]
    [Route("api/CustomersTradeArea")]
    public class CustomersTradeAreaController : ControllerBase
    {
        private readonly ICustomersTradeServices _service;
        private readonly ILogger<CustomersTradeController> _logger;
        private readonly IConfiguration _config;

        public CustomersTradeAreaController(
            ILogger<CustomersTradeController> logger,
            ICustomersTradeServices service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 고객지역정보조회
        /// </summary>
        /// <param name="trdNo"></param>
        /// <param name="seq"></param>
        /// <param name="addr1"></param>
        /// <param name="addr2"></param>
        /// <param name="addr3"></param>
        /// <param name="addr4"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] long? trdNo, [FromQuery] int? seq, [FromQuery] string? addr1, [FromQuery] string? addr2, [FromQuery] string? addr3, [FromQuery] string? addr4)
        {
            var list = await _service.SelecCustomerTradeAreaList(trdNo, seq, addr1, addr2, addr3, addr4);

            if (list == null || list.TradeAreas?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "고객 거래지역정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "고객 거래지역정보 조회 성공"));
        }


        /// <summary>
        /// 고객지역정보등록
        /// </summary>
        /// <param name="trdNo"></param>
        /// <param name="dtoList"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromQuery] int trdNo, [FromBody] List<CustomersTradeAreaCreateDto> dtoList)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            if (dtoList == null || !dtoList.Any())
                return BadRequest("등록할 데이터가 없습니다.");

            int cnt = 0;

            var result = false;

            foreach (var dto in dtoList)
            {
                // 각 dto에 대해 insert 처리
                result = await _service.InsertCustomerTradeArea(trdNo, dto.Seq, dto.Addr1, dto.Addr2, dto.Addr3, dto.Addr4, dto.UserId);
                cnt = cnt + 1;
            }

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "고객지영정보 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, cnt.ToString() + "개 고객지영정보 등록 성공"));


        }

        /// <summary>
        /// 고객지역정보수정
        /// </summary>
        /// <param name="trdNo"></param>
        /// <param name="dtoList"></param>
        /// <returns></returns>
        [HttpPut("{trdNo:long}")]
        public async Task<IActionResult> Update([FromRoute] long trdNo, [FromBody] List<CustomersTradeAreaUpdateDto> dtoList)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            if (dtoList == null || !dtoList.Any())
                return BadRequest("등록할 데이터가 없습니다.");

            int cnt = 0;

            var result = false;

            foreach (var dto in dtoList)
            {
                // 각 dto에 대해 insert 처리
                result = await _service.UpdateCustomerTradeArea(trdNo, dto.Seq, dto.Addr1, dto.Addr2, dto.Addr3, dto.Addr4, dto.UserId);
                cnt = cnt + 1;
            }

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "고객지영정보 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, cnt.ToString() + "개 고객지영정보 수정 성공"));
        }

        /// <summary>
        /// 고객지역정보삭제
        /// </summary>
        /// <param name="trdNo"></param>
        /// <param name="dtoList"></param>
        /// <returns></returns>
        [HttpDelete("{trdNo:long}")]
        public async Task<IActionResult> Delete([FromRoute] long trdNo, [FromBody] List<CustomersTradeAreaDeleteDto> dtoList)
        {
            int cnt = 0;

            var result = false;

            foreach (var dto in dtoList)
            {
                // 각 dto에 대해 insert 처리
                result = await _service.DeleteCustomerTradeArea(trdNo, dto.Seq, dto.UserId);
                cnt = cnt + 1;
            }

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "고객지역정보 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, cnt.ToString() + "개 고객지역정보 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class CustomersTradeAreaCreateDto
    {
        public int Seq { get; set; }                // 순번
        public string? Addr1 { get; set; }
        public string? Addr2 { get; set; }
        public string? Addr3 { get; set; }
        public string? Addr4 { get; set; }
        public string? UserId { get; set; }
    }

    public class CustomersTradeAreaUpdateDto
    {
        public int Seq { get; set; }                // 순번
        public string? Addr1 { get; set; }
        public string? Addr2 { get; set; }
        public string? Addr3 { get; set; }
        public string? Addr4 { get; set; }
        public string? UserId { get; set; }
    }

    public class CustomersTradeAreaDeleteDto
    {
        public int Seq { get; set; }                // 순번
        public string? UserId { get; set; }
    }
}



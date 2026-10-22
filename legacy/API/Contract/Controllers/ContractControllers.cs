using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Customer.Services;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using RealestateAPI.Customer.Controllers;
using RealestateAPI.Contract.Services;

namespace RealestateAPI.Contract.Controllers
{
    [ApiController]
    [Route("api/Contract")]
    public class ContractControllers : ControllerBase
    {
        private readonly IContractServices _service;
        private readonly ILogger<ContractControllers> _logger;
        private readonly IConfiguration _config;

        public ContractControllers(
            ILogger<ContractControllers> logger,
            IContractServices service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// 계약정보조회
        /// </summary>
        /// <param name="FrDate"></param>
        /// <param name="ToDate"></param>
        /// <param name="CnNo"></param>
        /// <param name="CnSts"></param>
        /// <param name="Addr"></param>
        /// <param name="PtNm"></param>
        /// <param name="Seller"></param>
        /// <param name="Buyer"></param>
        /// <param name="Page"></param>
        /// <param name="PageSize"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] [Required] string FrDate, [FromQuery] [Required]string ToDate, [FromQuery] int? CnNo, [FromQuery] string? CnSts, [FromQuery] string? Addr, [FromQuery] string? PtNm, [FromQuery] string? Seller, [FromQuery] string? Buyer, [FromQuery][Required] int Page = 1, [FromQuery][Required] int PageSize = 20)
        {
            var list = await _service.SelectContractList(FrDate, ToDate, CnNo, CnSts, Addr, PtNm, Seller, Buyer, Page, PageSize);

            if (list == null || list.Contracts?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "계약정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "계약정보 목록 조회 성공"));
        }

        /// <summary>
        /// 계약정보등록
        /// </summary>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ContractCreateDto Dto, [FromQuery] string? UserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var Result = await _service.InsertContract(Dto, UserId);

            if (!Result)
            {
                ResponseHelper.Error("INSERT_FAILED", "계약정보 등록 실패");
            }

            return Ok(ResponseHelper.Success(Result, "계약정보 등록 성공"));
        }

        /// <summary>
        /// 계약정보수정
        /// </summary>
        /// <param name="CnNo"></param>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPut("{CnNo:int}")]
        public async Task<IActionResult> Update(int CnNo, [FromBody] ContractUpdateDto Dto, [FromQuery] string? UserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var Result = await _service.UpdateContract(CnNo, Dto, UserId);

            if (!Result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "계약정보 수정 실패");
            }

            return Ok(ResponseHelper.Success(Result, "계약정보 수정 성공"));
        }

        /// <summary>
        /// 계약정보삭제
        /// </summary>
        /// <param name="CnNo"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpDelete("{CnNo:int}")]
        public async Task<IActionResult> Delete([FromRoute] int CnNo, [FromQuery] string? UserId)
        {
            var Result = await _service.DeleteContract(CnNo, UserId);

            if (!Result)
            {
                ResponseHelper.Error("DELETE_FAILED", "계약정보 삭제 실패");
            }

            return Ok(ResponseHelper.Success(Result, "계약정보 삭제 성공"));
        }

        /// <summary>
        /// 계약특약조회
        /// </summary>
        /// <param name="CnNo"></param>
        /// <param name="CnsNo"></param>
        /// <param name="SpclDesc"></param>
        /// <param name="Page"></param>
        /// <param name="PageSize"></param>
        /// <returns></returns>
        [HttpGet("Spcl")]
        public async Task<IActionResult> GetSpclList([FromQuery] int? CnNo, [FromQuery] int? CnsNo, [FromQuery] string? SpclDesc, [FromQuery][Required] int Page = 1, [FromQuery][Required] int PageSize = 20)
        {
            var list = await _service.SelectContractSpclList(CnNo, CnsNo, SpclDesc, Page, PageSize);

            if (list == null || list.ContractSpcls?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "계약특약정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "계약특약정보 목록 조회 성공"));
        }

        /// <summary>
        /// 계약특약정보등록
        /// </summary>
        /// <param name="CnNo"></param>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPost("Spcl")]
        public async Task<IActionResult> CreateSpcl(int CnNo, [FromBody] ContractSpclListCreateDto Dto, [FromQuery] string? UserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var Result = await _service.InsertContractSpcl(CnNo, Dto, UserId);

            if (!Result)
            {
                ResponseHelper.Error("INSERT_FAILED", "계약특약정보 등록 실패");
            }

            return Ok(ResponseHelper.Success(Result, "계약특약정보 등록 성공"));
        }

        /// <summary>
        /// 계약특약정보수정
        /// </summary>
        /// <param name="CnNo"></param>
        /// <param name="Dto"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpPut("Spcl{CnNo:int}")]
        public async Task<IActionResult> UpdateSpcl(int CnNo, [FromBody] ContractSpclListUpdateDto Dto, [FromQuery] string? UserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var Result = await _service.UpdateContractSpcl(CnNo, Dto, UserId);

            if (!Result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "계약특약정보 수정 실패");
            }

            return Ok(ResponseHelper.Success(Result, "계약특약정보 수정 성공"));
        }

        /// <summary>
        /// 계약특약정보삭제
        /// </summary>
        /// <param name="CnNo"></param>
        /// <param name="CnsNo"></param>
        /// <param name="UserId"></param>
        /// <returns></returns>
        [HttpDelete("Spcl{CnNo:int}")]
        public async Task<IActionResult> DeleteSpcl([FromRoute] int CnNo, [FromRoute] int CnsNo, [FromQuery] string? UserId)
        {
            var Result = await _service.DeleteContractSpcl(CnNo, CnsNo, UserId);

            if (!Result)
            {
                ResponseHelper.Error("DELETE_FAILED", "계약특약정보 삭제 실패");
            }

            return Ok(ResponseHelper.Success(Result, "계약특약정보 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class ContractCreateDto
    {
        public string CnSts { get; set; } = default!;
        public string PtType { get; set; } = default!;
        public string CnDate { get; set; } = default!;
        public string? Addr { get; set; }
        public string? PtNm { get; set; }
        public int? Dong { get; set; }
        public int? Ho { get; set; }
        public long? PtNo { get; set; }
        public string? SellerNm { get; set; }
        public string? SellerTel { get; set; }
        public int? SellerCustNo { get; set; }
        public string? BuyerNm { get; set; }
        public string? BuyerTel { get; set; }
        public int? BuyerCustNo { get; set; }
        public string? TrdType { get; set; }
        public int? SellAmt { get; set; }
        public int? MidAmt1 { get; set; }
        public int? MidAmt2 { get; set; }
        public string? BalAmtDate { get; set; }
        public string? TrdReport { get; set; }
        public string? ContractYn { get; set; }
        public string? BrokerType { get; set; }
        public int? RtNo { get; set; }
        public int? OffNo { get; set; }
        public int? VendorId { get; set; }
    }

    public class ContractUpdateDto
    {
        public string? CnSts { get; set; } = default!;
        public string? PtType { get; set; } = default!;
        public string? CnDate { get; set; } = default!;
        public string? Addr { get; set; }
        public string? PtNm { get; set; }
        public int? Dong { get; set; }
        public int? Ho { get; set; }
        public long? PtNo { get; set; }
        public string? SellerNm { get; set; }
        public string? SellerTel { get; set; }
        public int? SellerCustNo { get; set; }
        public string? BuyerNm { get; set; }
        public string? BuyerTel { get; set; }
        public int? BuyerCustNo { get; set; }
        public string? TrdType { get; set; }
        public int? SellAmt { get; set; }
        public int? MidAmt1 { get; set; }
        public int? MidAmt2 { get; set; }
        public string? BalAmtDate { get; set; }
        public string? TrdReport { get; set; }
        public string? ContractYn { get; set; }
        public string? BrokerType { get; set; }
        public int? RtNo { get; set; }
        public int? OffNo { get; set; }
        public int? VendorId { get; set; }
    }

    public class ContractSpclListCreateDto
    {
        public List<ContractSpclCreateDto>? ContractSpcls { get; set; }
    }

    public class ContractSpclCreateDto
    {
        public int CnsNo { get; set; }

        public string SpclDesc { get; set; } = string.Empty;

        public string FileId { get; set; } = string.Empty;
    }

    public class ContractSpclListUpdateDto
    {
        public List<ContractSpclUpdateDto>? ContractSpcls { get; set; }
    }

    public class ContractSpclUpdateDto
    {
        public int CnsNo { get; set; }

        public string SpclDesc { get; set; } = string.Empty;

        public string FileId { get; set; } = string.Empty;
    }
}

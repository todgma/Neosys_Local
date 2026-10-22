using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Vendor.Services;
using RealestateAPI.Vendor.Models;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using RealestateAPI.Shared;

namespace RealestateAPI.Vendor.Controllers
{
    [ApiController]
    [Route("api/vendors")]
    public class VendorController : ControllerBase
    {
        private readonly IVendorService _service;
        private readonly ILogger<VendorController> _logger;
        private readonly IConfiguration _config;

        public VendorController(
            ILogger<VendorController> logger,
            IVendorService service,
            IConfiguration config)
        {
            _service = service;
            _logger = logger;
            _config = config;
        }

        // ===== 협력업체 관련 =====

        /// <summary>
        /// 협력업체 목록조회 (페이징)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetVendorList(
            [FromQuery] long? vendorId,
            [FromQuery] long? offNo,
            [FromQuery] long? rtNo,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int rowsPerPage = 10)
        {
            var list = await _service.SelectVendorList(vendorId, offNo, rtNo, pageNumber, rowsPerPage);

            if (list == null || list.Vendors?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "협력업체 정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "협력업체 목록 조회 성공"));
        }

        /// <summary>
        /// 협력업체 등록
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> InsertVendor([FromBody] VendorInsertDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.InsertVendor(
                dto.VendorName, dto.Category1, dto.Category2, dto.Category3,
                dto.CeoName, dto.CeoPhone, dto.ManagerName, dto.ManagerPhone, dto.ManagerTel, dto.ManagerFax,
                dto.HomepageUrl, dto.ProductDesc, dto.ConsultationNote, dto.RegType,
                dto.BusinessRegionCode, dto.DetailAddress, dto.OffNo, dto.RtNo,
                dto.SortOrder, dto.UseYn, dto.UserId, dto.BusinessAreas
            );

            if (result <= 0)
            {
                ResponseHelper.Error("INSERT_FAILED", "협력업체 등록 실패");
            }

            // 신규 vendor_id 반환(프론트에서 상담이력 저장에 사용)
            return Ok(ResponseHelper.Success(new { vendorId = result }, "협력업체 등록 성공"));
        }

        /// <summary>
        /// 협력업체 수정
        /// </summary>
        [HttpPut("{vendorId:long}")]
        public async Task<IActionResult> UpdateVendor(
            [FromRoute] long vendorId,
            [FromBody] VendorUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.UpdateVendor(
                vendorId, dto.VendorName, dto.Category1, dto.Category2, dto.Category3,
                dto.CeoName, dto.CeoPhone, dto.ManagerName, dto.ManagerPhone, dto.ManagerTel, dto.ManagerFax,
                dto.HomepageUrl, dto.ProductDesc, dto.ConsultationNote, dto.RegType,
                dto.BusinessRegionCode, dto.DetailAddress, dto.OffNo, dto.RtNo,
                dto.SortOrder, dto.UseYn, dto.UserId, dto.BusinessAreas
            );

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "협력업체 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "협력업체 수정 성공"));
        }

        /// <summary>
        /// 협력업체 삭제
        /// </summary>
        [HttpDelete("{vendorId:long}")]
        public async Task<IActionResult> DeleteVendor(
            [FromRoute] long vendorId,
            [FromQuery] string? userId)
        {
            var result = await _service.DeleteVendor(vendorId, userId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "협력업체 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "협력업체 삭제 성공"));
        }

        // ===== 협력업체 영업지역 관련 =====

        /// <summary>
        /// 협력업체 영업지역 목록조회 (페이징)
        /// </summary>
        [HttpGet("regions")]
        public async Task<IActionResult> GetVendorRegionList(
            [FromQuery] long? vendorRegionId,
            [FromQuery] long? vendorId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int rowsPerPage = 10)
        {
            var list = await _service.SelectVendorRegionList(vendorRegionId, vendorId, pageNumber, rowsPerPage);

            if (list == null || list.VendorRegions?.Count == 0)
            {
                ResponseHelper.Error("NOT_FOUND", "협력업체 영업지역 정보 없음");
            }

            return Ok(ResponseHelper.Success(list, "협력업체 영업지역 목록 조회 성공"));
        }

        /// <summary>
        /// 협력업체 영업지역 등록
        /// </summary>
        [HttpPost("regions")]
        public async Task<IActionResult> InsertVendorRegion([FromBody] VendorRegionInsertDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.InsertVendorRegion(
                dto.VendorId, dto.RegionCode, dto.SortOrder, dto.UseYn, dto.UserId
            );

            if (!result)
            {
                ResponseHelper.Error("INSERT_FAILED", "협력업체 영업지역 등록 실패");
            }

            return Ok(ResponseHelper.Success(result, "협력업체 영업지역 등록 성공"));
        }

        /// <summary>
        /// 협력업체 영업지역 수정
        /// </summary>
        [HttpPut("regions/{vendorRegionId:long}")]
        public async Task<IActionResult> UpdateVendorRegion(
            [FromRoute] long vendorRegionId,
            [FromBody] VendorRegionUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "요청 형식이 올바르지 않습니다."
                });
            }

            var result = await _service.UpdateVendorRegion(
                vendorRegionId, dto.VendorId, dto.RegionCode, dto.SortOrder, dto.UseYn, dto.UserId
            );

            if (!result)
            {
                ResponseHelper.Error("UPDATE_FAILED", "협력업체 영업지역 수정 실패");
            }

            return Ok(ResponseHelper.Success(result, "협력업체 영업지역 수정 성공"));
        }

        /// <summary>
        /// 협력업체 영업지역 삭제
        /// </summary>
        [HttpDelete("regions/{vendorRegionId:long}")]
        public async Task<IActionResult> DeleteVendorRegion(
            [FromRoute] long vendorRegionId,
            [FromQuery] string? userId)
        {
            var result = await _service.DeleteVendorRegion(vendorRegionId, userId);

            if (!result)
            {
                ResponseHelper.Error("DELETE_FAILED", "협력업체 영업지역 삭제 실패");
            }

            return Ok(ResponseHelper.Success(result, "협력업체 영업지역 삭제 성공"));
        }
    }

    // ===== DTOs =====
    public class VendorInsertDto
    {
        public string? VendorName { get; set; }
        public string? Category1 { get; set; }
        public string? Category2 { get; set; }
        public string? Category3 { get; set; }
        public string? CeoName { get; set; }
        public string? CeoPhone { get; set; }
        public string? ManagerName { get; set; }
        public string? ManagerPhone { get; set; }
        public string? ManagerTel { get; set; }
        public string? ManagerFax { get; set; }
        public string? HomepageUrl { get; set; }
        public string? ProductDesc { get; set; }
        public string? ConsultationNote { get; set; }
        public string? RegType { get; set; }
        public string? BusinessRegionCode { get; set; }
        public string? DetailAddress { get; set; }
        public long? OffNo { get; set; }
        public long? RtNo { get; set; }
        public int? SortOrder { get; set; }
        public string? UseYn { get; set; }
        public string? UserId { get; set; }
        public string? BjdCode { get; set; }
        public List<VendorAreaDto>? BusinessAreas { get; set; }
    }

    public class VendorUpdateDto
    {
        public string? VendorName { get; set; }
        public string? Category1 { get; set; }
        public string? Category2 { get; set; }
        public string? Category3 { get; set; }
        public string? CeoName { get; set; }
        public string? CeoPhone { get; set; }
        public string? ManagerName { get; set; }
        public string? ManagerPhone { get; set; }
        public string? ManagerTel { get; set; }
        public string? ManagerFax { get; set; }
        public string? HomepageUrl { get; set; }
        public string? ProductDesc { get; set; }
        public string? ConsultationNote { get; set; }
        public string? RegType { get; set; }
        public string? BusinessRegionCode { get; set; }
        public string? DetailAddress { get; set; }
        public long? OffNo { get; set; }
        public long? RtNo { get; set; }
        public int? SortOrder { get; set; }
        public string? UseYn { get; set; }
        public string? UserId { get; set; }
        public string? BjdCode { get; set; }
        public List<VendorAreaDto>? BusinessAreas { get; set; }
    }

    public class VendorRegionInsertDto
    {
        public long VendorId { get; set; }
        public string RegionCode { get; set; } = default!;
        public int? SortOrder { get; set; }
        public string? UseYn { get; set; }
        public string? UserId { get; set; }
    }

    public class VendorRegionUpdateDto
    {
        public long VendorId { get; set; }
        public string RegionCode { get; set; } = default!;
        public int? SortOrder { get; set; }
        public string? UseYn { get; set; }
        public string? UserId { get; set; }
    }
}

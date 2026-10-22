using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RealestateAPI.Vendor.Models
{
    public class VendorList
    {
        public List<VendorInfo>? Vendors { get; set; }
        public int? TotalCount { get; set; }
        public int? TotalPages { get; set; }
    }

    public class VendorInfo
    {
        [Column("vendor_id")] 
        public long VendorId { get; set; }

        [Column("vendor_name")]
        public string? VendorName { get; set; }

        [Column("category1")]
        public string? Category1 { get; set; }

        [Column("category2")]
        public string? Category2 { get; set; }

        [Column("category3")]
        public string? Category3 { get; set; }

        [Column("ceo_name")]
        public string? CeoName { get; set; }

        [Column("ceo_phone")]
        public string? CeoPhone { get; set; }

        [Column("manager_name")]
        public string? ManagerName { get; set; }

        [Column("manager_phone")]
        public string? ManagerPhone { get; set; }

        [Column("manager_tel")]
        public string? ManagerTel { get; set; }

        [Column("manager_fax")]
        public string? ManagerFax { get; set; }

        [Column("homepage_url")]
        public string? HomepageUrl { get; set; }

        [Column("product_desc")]
        public string? ProductDesc { get; set; }

        [Column("consultation_note")]
        public string? ConsultationNote { get; set; }

        [Column("reg_type")]
        public string? RegType { get; set; }

        [Column("business_region_code")]
        public string? BusinessRegionCode { get; set; }

        [Column("detail_address")]
        public string? DetailAddress { get; set; }

        [Column("off_no")]
        public long? OffNo { get; set; }

        [Column("rt_no")]
        public long? RtNo { get; set; }

        [Column("sort_order")]
        public int? SortOrder { get; set; }

        [Column("use_yn")]
        public string? UseYn { get; set; }

        [Column("reg_id")]
        public string? RegId { get; set; }

        [Column("reg_dt")]
        public DateTime? RegDt { get; set; }

        [Column("mod_id")]
        public string? ModId { get; set; }

        [Column("mod_dt")]
        public DateTime? ModDt { get; set; }

        // --- 조회 전용(집계) ---
        public int ConsultCnt { get; set; }              // 상담이력 건수(ct_interview.vendor_id)
        public string? BusinessRegion { get; set; }      // 영업지역 표시명 결합("○○, ○○")
        public string? BusinessAreasJson { get; set; }   // 영업지역 구조화 JSON([{bjdCode,regionName}])
    }

    // 협력업체 영업지역 입력 항목(등록/수정 시 전달)
    public class VendorAreaDto
    {
        public string? BjdCode { get; set; }
        public string? RegionName { get; set; }
    }

    public class VendorRegionList
    {
        public List<VendorRegion>? VendorRegions { get; set; }
        public int? TotalCount { get; set; }
    }

    public class VendorRegion
    {
        [Column("vendor_region_id")]
        public long VendorRegionId { get; set; }

        [Column("vendor_id")]
        public long VendorId { get; set; }

        [Column("region_code")]
        public string? RegionCode { get; set; }

        [Column("sort_order")]
        public int? SortOrder { get; set; }

        [Column("use_yn")]
        public string? UseYn { get; set; }

        [Column("reg_id")]
        public string? RegId { get; set; }

        [Column("reg_dt")]
        public DateTime? RegDt { get; set; }

        [Column("mod_id")]
        public string? ModId { get; set; }

        [Column("mod_dt")]
        public DateTime? ModDt { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Hub.Models
{
    /// <summary>
    /// 주거래지역 (공동중개망에서 본인이 설정한 주 거래 지역, 복수)
    /// 소유 단위: off_no(사무소) / rt_no(개인) 두 컬럼 모두 보관, 현재는 개인(rt_no) 기준 사용
    /// </summary>
    public class MainRegion
    {
        public long RegionId { get; set; }
        public long? OffNo { get; set; }
        public string? RtNo { get; set; }
        public string BjdCode { get; set; } = string.Empty;   // 법정동 코드(최하위 리까지)
        public string? RegionName { get; set; }               // 표시용 지역명
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
    }

    public class MainRegionCreateDto
    {
        public long? OffNo { get; set; }
        public string? RtNo { get; set; }

        [Required]
        public string BjdCode { get; set; } = default!;
        public string? RegionName { get; set; }
        public string? RegId { get; set; }
    }
}

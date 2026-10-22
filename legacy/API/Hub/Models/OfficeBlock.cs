namespace RealestateAPI.Hub.Models
{
    /// <summary>비공유업체 (중개사무소 단위 · 부동산등록번호 기준)</summary>
    public class OfficeBlock
    {
        public long BlockId { get; set; }
        public long OffNo { get; set; }
        public string? MyRegNo { get; set; }
        public string? BlockedRegNo { get; set; }
        public string? BlockedNm { get; set; }
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
    }

    public class OfficeBlockCreateDto
    {
        public long OffNo { get; set; }
        public string? BlockedRegNo { get; set; }
        public string? BlockedNm { get; set; }
        public string? RegId { get; set; }
    }
}

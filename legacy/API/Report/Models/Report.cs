namespace RealestateAPI.Report.Models
{
    public class ReportInfo
    {
        public long ReportNo { get; set; }
        public long? PtNo { get; set; }
        public string? Title { get; set; }
        public string? Comment { get; set; }
        public string? Snapshot { get; set; }   // JSON 문자열 (단일 물건 or 여러 물건 배열)
        public string? ContentHtml { get; set; }// 보고서 본문 HTML
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
        public List<long>? CustNos { get; set; } // 배포된 고객
        public int CustCount { get; set; }       // 배포 고객 수 (목록용)
    }

    // 보고서별 공유(고객) 이력
    public class ReportShareInfo
    {
        public long CustNo { get; set; }
        public string? Name { get; set; }
        public string? Tel { get; set; }
        public DateTime? SharedDt { get; set; }
    }

    public class ReportCreateDto
    {
        public long? ReportNo { get; set; }          // 값 있으면 수정(upsert)
        public long? PtNo { get; set; }
        public string? Title { get; set; }
        public string? Comment { get; set; }
        public string? Snapshot { get; set; }       // JSON 문자열 (단일 or 배열)
        public string? ContentHtml { get; set; }    // 보고서 본문 HTML
        public List<long>? CustNos { get; set; }     // 배포 대상 고객
        public string? UserId { get; set; }
    }
}

namespace RealestateAPI.Contract.Models
{
    // 계약서 서식 템플릿 (계약서종류 + 거래유형) — 조항 외부화
    public class ContractTemplate
    {
        public string TplCode { get; set; } = string.Empty;
        public string KindCd { get; set; } = string.Empty;
        public string? KindNm { get; set; }
        public string? TradeCd { get; set; }
        public string? TradeNm { get; set; }
        public string Label { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? BodyJson { get; set; }   // jsonb → text
        public int Ver { get; set; }
        public int Sort { get; set; }
        public string? UseYn { get; set; }
        public string? UpdDt { get; set; }
    }

    // 저장(upsert) 요청 DTO
    public class ContractTemplateDto
    {
        public string TplCode { get; set; } = string.Empty;
        public string KindCd { get; set; } = string.Empty;
        public string? KindNm { get; set; }
        public string? TradeCd { get; set; }
        public string? TradeNm { get; set; }
        public string Label { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? BodyJson { get; set; }   // 직렬화된 서식 JSON(조항 포함)
        public int? Sort { get; set; }
        public string? UseYn { get; set; }
        public string? UserId { get; set; }
    }
}

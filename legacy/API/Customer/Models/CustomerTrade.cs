using RealestateAPI.Realestater.Models;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Customer.Models
{
    public class CustTradeList
    {
        public List<CustTradeInfo>? TradeInfos { get; set; }
    }

    public class CustTradeInfo
    {
        [Required]
        public long TrdNo { get; set; }                  // 거래번호 (PK)
        public string? TrdPrg { get; set; } = string.Empty;             // 거래 진행 상태
        [Required]
        public long CustNo { get; set; }               // 고객번호
        public string? WantType { get; set; }           // 원하는 유형
        public string? WantNm { get; set; }             // 원하는 이름
        public decimal? ExcAreaFr { get; set; }         // 면적 범위 시작
        public decimal? ExcAreaTo { get; set; }         // 면적 범위 끝
        public decimal? LantShareFr { get; set; }       // 지분 범위 시작
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
        public DateTime? RegDt { get; set; }            // 등록일
        public string? RegId { get; set; }              // 등록자
        public DateTime? UpdDt { get; set; }            // 수정일
        public string? UpdId { get; set; }              // 수정자
    }

    public class CustTradeArea
    {
        [Required]
        public long TrdNo { get; set; }                  // 거래번호 (PK)
        [Required]
        public int Seq { get; set; }                  // 순번
        public string Addr1 { get; set; } = string.Empty;
        public string Addr2 { get; set; } = string.Empty;
        public string Addr3 { get; set; } = string.Empty;
        public string Addr4 { get; set; } = string.Empty;
        public DateTime? RegDt { get; set; }            // 등록일
        public string? RegId { get; set; }              // 등록자
        public DateTime? UpdDt { get; set; }            // 수정일
        public string? UpdId { get; set; }              // 수정자
    }

    public class CustTradeAreaList
    {
        public List<CustTradeArea>? TradeAreas { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Hub.Models
{
    public class TradeInfoList
    {
        public List<TradeInfo>? Items { get; set; }
        public long TotalCount { get; set; }
    }

    public class TradeInfo
    {
        public long TradeId { get; set; }

        [Required]
        public string TradeDiv { get; set; } = string.Empty;  // CUST or PT

        public string? CustNo { get; set; }
        public string? PtNo { get; set; }

        [Required]
        public string RegUserId { get; set; } = string.Empty;

        [Required]
        public string OffNo { get; set; } = string.Empty;

        public DateTime? RegDt { get; set; }
        public DateTime? UpdDt { get; set; }

        public bool IsCustRegistered { get; set; }
        public bool IsPtRegistered { get; set; }

        public string? TradeState { get; set; }
        public string? TradeStateDesc { get; set; }

        // ==================== 공동중개 필드 ====================
        public string? CoBrokerageTitle { get; set; }
        public string? CoBrokerageContent { get; set; }
        public string? CoBrokerageMemo { get; set; }

        // ==================== 고객정보 필드 ====================
        public string? CustType { get; set; }
        public string? CustName { get; set; }
        public string? CustAlias { get; set; }
        public string? CustTel { get; set; }
        public string? CustAddr { get; set; }
        public string? CustMemo { get; set; }
        public char? CustRentBsnYn { get; set; }
        public string? CustTrdPrg { get; set; }

        public string? CustWantType { get; set; }
        public decimal? CustExcAreaFr { get; set; }
        public decimal? CustExcAreaTo { get; set; }

        public string? CustRegion1 { get; set; }
        public string? CustRegion2 { get; set; }
        public string? CustRegion3 { get; set; }

        public string? CustTrdType { get; set; }
        public string? CustTrdTypeDetail { get; set; }

        public decimal? CustSaleAmtFr { get; set; }
        public decimal? CustSaleAmtTo { get; set; }
        public decimal? CustLesAmtFr { get; set; }
        public decimal? CustLesAmtTo { get; set; }

        public decimal? CustProtAmtFr { get; set; }
        public decimal? CustProtAmtTo { get; set; }
        public decimal? CustMonAmtFr { get; set; }
        public decimal? CustMonAmtTo { get; set; }

        public decimal? CustEtcProtAmtFr { get; set; }
        public decimal? CustEtcProtAmtTo { get; set; }
        public decimal? CustEtcMonAmtFr { get; set; }
        public decimal? CustEtcMonAmtTo { get; set; }

        public string? CustEtcType { get; set; }
        public char? CustMoveinYn { get; set; }

        public DateTime? CustMoveDateFr { get; set; }
        public DateTime? CustMoveDateTo { get; set; }

        public decimal? CustCashAblt { get; set; }
        public string? CustRmk { get; set; }

        // ==================== 물건정보 필드 ====================
        public string? PPtName { get; set; }
        public string? PPtType { get; set; }
        public string? PSaleDiv { get; set; }
        public decimal? PSaleAmt { get; set; }
        public decimal? PNowDepAmt { get; set; }
        public decimal? PNowMonAmt { get; set; }

        public decimal? PExcArea { get; set; }
        public decimal? PSupArea { get; set; }

        public string? PAddrFull { get; set; }
        public string? PDong { get; set; }
        public string? PHo { get; set; }

        public int? PFloor1 { get; set; }
        public int? PFloor2 { get; set; }
        public string? PFloorDesc { get; set; }

        public string? PDirStd { get; set; }
        public string? PBalcExt { get; set; }
        public int? PRoomCnt { get; set; }
        public int? PBathCnt { get; set; }
        public decimal? PPkCnt { get; set; }
        public decimal? PMaintCost { get; set; }

        public string? PHeatMethod { get; set; }
        public string? PHeatFuel { get; set; }
        public string? PHeatSystem { get; set; }
        public string? PBuidStruct { get; set; }

        public char? ImmediateMoveinYn { get; set; }
        public DateTime? PExptDate { get; set; }
        public string? PPrgSts { get; set; }

        public string? POpt { get; set; }
        public string? PPtExpl { get; set; }
        public string? PCompYear { get; set; }

        public char? OwnerRentBsnYn { get; set; }

        public string? TradeStatus { get; set; }

        // SQL 함수에서 반환하는 total_count 필드
        public long TotalCount { get; set; }
    }
}

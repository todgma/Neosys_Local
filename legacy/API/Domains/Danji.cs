using System.Text.Json.Serialization;

namespace RealestateAPI.Domains
{
    public class DanjiList
    {
        public List<Danji>? Danjis { get; set; }
    }

    public class Danji
    {
        public long Id { get; set; }
        public string? BuildingCode { get; set; }
        public string? BuildingName { get; set; }
        public string? BjdCode { get; set; }
        public string? AddressBunji { get; set; }
        public string? NaverDanjiCode { get; set; }
        public int? FamilyCnt { get; set; }
        public int? MaxFloor { get; set; }
        public int? MinFloor { get; set; }
        public int? TotBldCnt { get; set; }
        public string? ApproveDate { get; set; }
        public string? HeatType { get; set; }
        public string? HeatFul { get; set; }
        public bool? IsPrk { get; set; }
        public int? TotprkCnt { get; set; }
        public string? BuildingClosingRate { get; set; }
        public string? FloorAreaRate { get; set; }
        public string? MapX { get; set; }
        public string? MapY { get; set; }
        public string? HscpTypeCode { get; set; }
        public bool? IsService { get; set; }
        public string? CscoName { get; set; }
        public string? PictureUrl { get; set; }
        public decimal? TotprkCntPer { get; set; }
        [JsonPropertyName("areas")]
        public List<DanjiArea>? Areas { get; set; }
    }

    public class DanjiArea
    {
        public long Id { get; set; }
        public string? PlanTypeName { get; set; }
        public string? PtpNo { get; set; }
        public decimal? SplySpc { get; set; }
        public decimal? ExclsSpc { get; set; }
        public decimal? CtrtSpc { get; set; }
        public int? RoomCount { get; set; }
        public int? BathroomCount { get; set; }
        public bool? InUse { get; set; }
    }
}

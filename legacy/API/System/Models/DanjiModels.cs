using System.Text.Json;

namespace RealestateAPI.System.Models
{
    public class DanjiDto
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
        public List<DanjiAreaDto>? Areas { get; set; }
    }

    public class DanjiAreaDto
    {
        public long Id { get; set; }
        public string? PlanTypeName { get; set; }
        public string? PtpNo { get; set; }
        public string? SplySpc { get; set; }
        public string? ExclsSpc { get; set; }
        public string? CtrtSpc { get; set; }
        public int? RoomCount { get; set; }
        public int? BathroomCount { get; set; }
        public bool? InUse { get; set; }
    }

    public class DanjiDongDto
    {
        public string? dong_name { get; set; }
        public int? naver_danji_code { get; set; }
        public int? dong_no { get; set; }
        public int? highest_floor_cnt { get; set; }
        public string? direction_type_code { get; set; }
        public string? entrance_type_cd { get; set; }
        public string? in_use { get; set; }
        public string? reg_date { get; set; }
        public string? update_date { get; set; }
    }

    public class DanjiHoDto
    {
        public int? dong_no { get; set; }
        public int? naver_danji_code { get; set; }
        public string? ho_name { get; set; }
        public int? ptp_no { get; set; }
        public int? ho_number { get; set; }
        public string? floor { get; set; }
        public float? sply_spc { get; set; }
        public float? excls_spc { get; set; }
        public float? ctrt_spc { get; set; }
        public string? reg_date { get; set; }
        public string? update_date { get; set; }
        public string? ptp_name { get; set; }
    }

    public class DanjiAreaDto2
    {
        public int? idx { get; set; }
        public string? plan_type_name { get; set; }
        public int? ptp_no { get; set; }
        public float? sply_spc { get; set; }
        public float? excls_spc { get; set; }
        public float? ctrt_spc { get; set; }
        public string? in_use { get; set; }
        public int? naver_danji_code { get; set; }
        public string? reg_date { get; set; }
        public string? update_date { get; set; }
        public int? room_cnt { get; set; }
        public int? bathroom_cnt { get; set; }
    }
}

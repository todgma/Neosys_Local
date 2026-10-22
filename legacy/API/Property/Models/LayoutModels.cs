namespace RealestateAPI.Property.Models
{
    /// <summary>
    /// 동 정보
    /// </summary>
    public class DanjiDong
    {
        public int DongNo { get; set; }
        public string? DongName { get; set; }
        public int? HighestFloorCnt { get; set; }
        public string? DirectionTypeCd { get; set; }
        public string? EntranceTypeCd { get; set; }
        public string? InUse { get; set; }
        public string? RegDate { get; set; }
        public string? UpdateDate { get; set; }
    }

    /// <summary>
    /// 호 정보
    /// </summary>
    public class DanjiHo
    {
        public int DongNo { get; set; }
        public int HoNumber { get; set; }
        public string? HoName { get; set; }
        public int? PtpNo { get; set; }
        public string? PtpName { get; set; }
        public string? Floor { get; set; }
        public float? SplySpc { get; set; }
        public float? ExclsSpc { get; set; }
        public float? CtrtSpc { get; set; }
        public string? LineNo { get; set; }      // 호 라인 번호(열 위치)
        public string? PilotiYn { get; set; }    // 필로티 여부(Y/N) — 하위호환
        public string? StoreYn { get; set; }     // 상가 여부(Y/N) — 하위호환
        public string? HoGubun { get; set; }     // 호 구분(일반/상가/필로티/기타/직접입력) — 신규 단일 컬럼
        public string? RegDate { get; set; }
        public string? UpdateDate { get; set; }
    }

    /// <summary>
    /// 배치도 상단 단지 헤더 정보 (아파트명/주소/세대수)
    /// </summary>
    public class DanjiHeader
    {
        public string? BuildingName { get; set; }   // 아파트명
        public string? AddressBunji { get; set; }    // 주소(지번)
        public int? FamilyCnt { get; set; }          // 세대수
        public string? FullAddress { get; set; }     // 전체주소(시도+시군구+읍면동+지번, hjd_bjd 조인)
        public string? BjdCode { get; set; }         // 법정동 코드(등록창 단지 자동입력용)
        public string? SidoName { get; set; }        // 시도명(등록창 소재지 자동입력용)
        public string? SigunguName { get; set; }     // 시군구명
        public string? BjdName { get; set; }         // 읍면동명
    }

    /// <summary>
    /// 점유현황 정보
    /// </summary>
    public class Occupancy
    {
        public int OccupancyNo { get; set; }
        public long OffNo { get; set; }           // 중개사무소(공유 단위)
        public int NaverDanjiCode { get; set; }
        public int DongNo { get; set; }
        public int HoNumber { get; set; }
        public string? Floor { get; set; }
        public string OccupancyStatus { get; set; } = "NEED_CHECK";
        public string? CustomStatus { get; set; }
        public string? OccupancyName { get; set; }
        public string? OccupancyPhone { get; set; }
        public string? Memo { get; set; }
        public DateTime CrtDt { get; set; }
        public string? CrtId { get; set; }
        public DateTime UpdDt { get; set; }
        public string? UpdId { get; set; }
    }

    /// <summary>
    /// 점유현황 저장 요청
    /// </summary>
    public class OccupancyRequest
    {
        public long OffNo { get; set; }           // 중개사무소(공유 단위)
        public int NaverDanjiCode { get; set; }
        public int DongNo { get; set; }
        public int HoNumber { get; set; }
        public string? Floor { get; set; }
        public string OccupancyStatus { get; set; } = "NEED_CHECK";
        public string? CustomStatus { get; set; }
        public string? OccupancyName { get; set; }
        public string? OccupancyPhone { get; set; }
        public string? Memo { get; set; }
        public string? UserId { get; set; }       // 등록/수정자
    }
}

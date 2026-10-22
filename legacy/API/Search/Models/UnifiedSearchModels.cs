using System.Collections.Generic;

namespace RealestateAPI.Search.Models
{
    /// <summary>
    /// 통합검색 결과 한 행 (물건 소유자/임차인 + 고객 구입자 공통)
    ///  - Kind    : "PT"(물건) | "CUST"(고객)
    ///  - RefId   : pt_no | cust_no
    ///  - TypeCode: 물건유형(pt_type) | 희망물건유형(want_type) 코드 (라벨 변환은 프론트)
    ///  - Addr    : 물건=조합주소 / 고객=희망지역(쉼표구분 원문)
    ///  - PersonsJson: 관련 인물 JSON 배열 [{name,phone,role}] (물건=소유자/임차인, 고객=구입자)
    ///  - Name/Phone : 대표 인물(주소록 추가용)
    /// </summary>
    public class UnifiedSearchRow
    {
        public string Kind { get; set; } = "";
        public long RefId { get; set; }
        public string? TypeCode { get; set; }
        public string? Addr { get; set; }
        public string? PersonsJson { get; set; }
        public string? Name { get; set; }
        public string? Phone { get; set; }
    }

    public class UnifiedSearchResult
    {
        public List<UnifiedSearchRow> Items { get; set; } = new();
    }
}

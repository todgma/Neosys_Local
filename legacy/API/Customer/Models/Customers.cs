using RealestateAPI.Realestater.Models;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Customer.Models
{
    public class CustomerList
    {
        public List<CustomerInfo>? Customers { get; set; }
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class CustomerInfo
    {
        [Required]
        public long CustNo { get; set; }

        public int? CustType { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public string? Alias { get; set; }

        [Required]
        public string Tel { get; set; } = string.Empty;

        public string? Addr { get; set; }

        public string? Memo { get; set; }

        public string? RentBsnYn { get; set; } = string.Empty;
        public string TrdPrg { get; set; } = string.Empty;   // 거래 진행 상태
        public string? WantType { get; set; } = string.Empty;           // 원하는 유형
        public string? WantNm { get; set; } = string.Empty;             // 원하는 이름
        public decimal? ExcAreaFr { get; set; }         // 면적 범위 시작
        public decimal? ExcAreaTo { get; set; }         // 면적 범위 끝
        public decimal? LandShareFr { get; set; }       // 지분 범위 시작
        public decimal? LandShareTo { get; set; }       // 지분 범위 끝
        public string? TrdType { get; set; } = string.Empty;            // 거래 유형
        public string? MoveinYn { get; set; } = string.Empty;           // 입주 여부
        public string? MoveDateFr { get; set; } = string.Empty;         // 입주일 시작
        public string? MoveDateTo { get; set; } = string.Empty;         // 입주일 종료
        public string? CashAblt { get; set; } = string.Empty;           // 현금 가능 여부
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
        public string? EtcType { get; set; } = string.Empty;            // 기타 유형
        public string? Rmk { get; set; }                                // 비고/상세정보
        public string? Rnk { get; set; } = string.Empty;                // 순위
        public long? RtNo { get; set; }
        public long? OffNo { get; set; }
        public long? VendorId { get; set; }
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
        public DateTime? UpdDt { get; set; }
        public string? UpdId { get; set; }

        // 재정립 신규 컬럼
        public int? RoomCnt { get; set; }             // 방 개수
        public int? BathCnt { get; set; }             // 욕실 개수
        public int? ParkCnt { get; set; }             // 주차 차량 수
        public string? CommunityFac { get; set; }     // 커뮤니티시설(텍스트)
        public string? FeatureNote { get; set; }      // 물건특징(메모)
        public string? GapInvestYn { get; set; }      // 갭투자 여부(Y/N)
        public string? IrrelevantYn { get; set; }     // 무관(Y/N)

        // 재정립 신규 컬럼(2차) — 상세유형/면적/옵션 등 (getDetail·getList SELECT엔 있으나 매핑 누락되어 있던 항목)
        public string? WantSubType { get; set; }       // 상세유형(CSV 복수)
        public decimal? GrossAreaFr { get; set; }      // 연면적 시작
        public decimal? GrossAreaTo { get; set; }      // 연면적 끝
        public string? AreaKind { get; set; }          // 면적 종류(공급/전용/대지 등)
        public decimal? LandShareRatioFr { get; set; } // 대지지분율 시작
        public decimal? LandShareRatioTo { get; set; } // 대지지분율 끝
        public string? AreaUnit { get; set; }          // 면적 단위(평/㎡)
        public string? InvestYn { get; set; }          // 투자 여부
        public string? ChildYn { get; set; }           // 자녀 여부
        public string? ChildCond { get; set; }         // 자녀 조건
        public string? PetAllow { get; set; }          // 반려동물 허용
        public string? PetCond { get; set; }           // 반려동물 조건
        public string? Opt { get; set; }               // 옵션
        public string? BuildingUse { get; set; }       // 건축물용도
        public string? BizType { get; set; }           // 업종
        public int? ElevatorCnt { get; set; }          // 승강기 수
        public int? StairCnt { get; set; }             // 계단 수
        public string? CityGasYn { get; set; }         // 도시가스 여부
        public string? ElectricYn { get; set; }        // 전기 여부
        public string? ElecCapacity { get; set; }      // 전기용량
        public string? AccessRoad { get; set; }        // 진입도로
        public string? LandUse { get; set; }           // 용도지역
        public string? LandCategory { get; set; }      // 지목
        public string? BalcExt { get; set; }           // 발코니(주거용)
        public string? EntrStruct { get; set; }        // 현관구조(주거용)
        public string? BuildingForm { get; set; }      // 건물형태(주거용)
        public string? BuildPermitPref { get; set; }   // 건축허가 선호(토지)
        public string? ContractDate { get; set; }      // 계약일(고객상태=계약)
        public string? HoldDate { get; set; }          // 보류일(고객상태=보류)

        // 목록 표시용 집계
        public string? WishAreas { get; set; }        // 희망지역 요약(콤마)
        public int ReportCount { get; set; }          // 보고서 건수
        public DateTime? TransmitDt { get; set; }     // 정보망 전송일시(있으면 전송 이력 있음)

        // 1:N
        public List<CustArea>? Areas { get; set; }    // 희망지역
        public List<CustBuyer>? Buyers { get; set; }  // 구입자정보
        public List<CustShare>? Shares { get; set; }  // 공동중개사 사무소 (pt_share)
    }

    // 공동중개사 사무소 - pt_share (cust_no 기준)
    public class CustShare
    {
        public string? OfficeName { get; set; }   // 상호
        public string? RegionName { get; set; }   // 지역명
        public string? OfficePhone { get; set; }  // 전화번호
        public string? Memo { get; set; }         // 내용
        public string? Date { get; set; }         // 공유일자
    }

    // 희망지역 - ct_trd_area (cust_no 기준)
    public class CustArea
    {
        public long CustNo { get; set; }
        public int Seq { get; set; }
        public string? Addr1 { get; set; }       // 시/도
        public string? Addr2 { get; set; }       // 시/군/구
        public string? Addr3 { get; set; }       // 읍/면/동
        public string? BjdCode { get; set; }     // 법정동코드
        public string? BldNm { get; set; }       // 건물명/단지명
        public string? DanjiCode { get; set; }   // 단지코드
        public string? DetailLoc { get; set; }   // 상세위치
    }

    // 구입자정보 - ct_cust_buyer
    public class CustBuyer
    {
        public long CustNo { get; set; }
        public int Seq { get; set; }
        public string? Name { get; set; }        // 성함
        public string? Relation { get; set; }    // 관계
        public string? Tel { get; set; }         // 전화번호
        public string? Addr { get; set; }        // 주소
    }
}

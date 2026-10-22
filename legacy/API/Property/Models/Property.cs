using RealestateAPI.Admin.Models;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.Eventing.Reader;

namespace RealestateAPI.Property.Models
{
    public class PtSaleList
    {
        public List<PtSale>? PtSales { get; set; }
        public List<PropertySummary>? Summaries { get; set; }
        public List<PropertyTypeCount>? TypeCounts { get; set; } // 물건유형별 건수(좌측 패널 '모든유형' 표기용)
        public int ProgressCount { get; set; } // 진행물건 수
        public int TotalCount { get; set; } // 전체 물건 수 (페이징용)
    }

    public class PropertyTypeCount
    {
        public string? PtType { get; set; }  // SYCA1xx
        public int Cnt { get; set; }          // 해당 유형 건수
    }

    public class PropertySummary
    {
        public string? GroupKey { get; set; }      // danji_code 또는 addr3_pttype 조합
        public string? DisplayName { get; set; }   // 표시 이름 (단지명 또는 "개포동 토지")
        public int PropertyCount { get; set; }     // 물건 수
        public string? DanjiCode { get; set; }     // 단지코드 (단지인 경우)
        public string? Addr3 { get; set; }         // 동 이름 (단지가 아닌 경우)
        public string? PtType { get; set; }        // 물건종류 (단지가 아닌 경우)
        public string? SaleDiv { get; set; }       // 매물유형
        public int? FamilyCnt { get; set; }        // 세대수 (단지인 경우)
    }

    public class PtSale

    {
        [Required]
        public long PtNo { get; set; }
        // 단지 배치도 미등록 호(ghost) 행 여부 — 목록에서 동/호/타입/면적만 채워 표시, 더블클릭 시 신규등록
        public bool IsGhost { get; set; } = false;
        [Required]
        public string PtName { get; set; } = string.Empty;
        [Required]
        public string? PtSts { get; set; } = string.Empty;
        public string? PtType { get; set; }
        public string? PtExpl { get; set; }
        public string? SaleDiv { get; set; }
        public string? Addr1 { get; set; }
        public string? Addr2 { get; set; }
        public string? Addr3 { get; set; }
        public string? Addr4 { get; set; }
        public string? Addr5 { get; set; }
        public string? AddrPost { get; set; }
        public string? BjdCode { get; set; }
        public string? DanjiCode { get; set; }
        public string? Dong { get; set; }
        public string? Ho { get; set; }
        public int? Floor { get; set; }
        public string? Opt { get; set; }
        public int? HouseCnt { get; set; }
        public string? AptTyp { get; set; }
        public decimal? SupArea { get; set; }
        public decimal? ExcArea { get; set; }
        public decimal? LandShare { get; set; }
        public int? RoomCnt { get; set; }
        public int? BathCnt { get; set; }
        public int? EvChargerCnt { get; set; }   // 전기차충전대수(아파트 계열)
        public string? DirStd { get; set; }
        public string? HeatMethod { get; set; }
        public string? HeatFuel { get; set; }
        public string? EntrStruct { get; set; }
        public string? BuidStruct { get; set; }
        public string? BalcExt { get; set; }
        public int? Floor1 { get; set; }
        public int? Floor2 { get; set; }
        public decimal? PkCnt { get; set; }
        public int? MaintCost { get; set; }
        public string? MaintDtl { get; set; }
        public int? SaleAmt { get; set; }
        public int? LesAmt { get; set; }
        public int? ProtAmt { get; set; }
        public int? MonAmt { get; set; }
        public int? EtcAmt { get; set; }
        public int? LayAmt { get; set; }
        public int? NowDepAmt { get; set; }
        public int? NowMonAmt { get; set; }
        public int? LoanAmt { get; set; }
        public int? LoanAmtAft { get; set; }
        public string? MtryDate { get; set; }
        public string? ExptMovDate { get; set; }
        public string? ExptDate { get; set; }
        public string? ExptComDate { get; set; }
        public string? CompYear { get; set; }
        public string? ShaYn { get; set; }
        public long? CustNo { get; set; }
        public long? OffNo { get; set; }
        public string? RtNo { get; set; }
        public int? CnNo { get; set; }
        public string? MvnPsbYn { get; set; }
        public string? HouseRental { get; set; }
        public string? PetYn { get; set; }
        public string? Top { get; set; }
        public string? PtMemo { get; set; }
        public string? ConsultContent { get; set; }   // 목록용: 가장 최근 상담내용 top1
        public int? DepositSum { get; set; }           // 목록용: 임대차현황 보증금 합계(단독|다가구)
        public int? MonSum { get; set; }               // 목록용: 임대차현황 월세 합계(단독|다가구)
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
        public DateTime? UpdDt { get; set; }
        public string? UpdId { get; set; }
        public List<PtHolder>? Holders { get; set; }

        // 목록 상태 플래그 (정보망 전송일시 / 보고서번호)
        public DateTime? TransmitDt { get; set; }
        public long? ReportNo { get; set; }

        // 추가 필드
        public string? LandUse { get; set; }              // 용도지역
        public string? BuildingUse { get; set; }          // 건축물용도
        public string? LandCategory { get; set; }         // 지목
        public string? OtherRestrictions { get; set; }    // 기타제한사항
        public string? ContractRenewalRight { get; set; } // 계약갱신청구권 (사용/미사용)
        public string? HousingRentalBusiness { get; set; }// 주택임대사업자 (등록/미등록/무관/날짜)
        public string? CurrentStatus { get; set; }        // 현상태 (주인거주/전세/공실/월세/기타임대)
        public string? BusinessType { get; set; }         // 업종 (상가/사무실/지식산업센터)
        public string? BusinessName { get; set; }         // 상호 (상가/사무실/지식산업센터)
        public string? EtcLeaseType { get; set; }         // 기타임대유형 (단기임대/깔세/연세, 복수선택 콤마구분)
        public string? Jibun { get; set; }                // 지번
        public string? MaintZoneName { get; set; }        // 정비구역명 (재건축)
        public string? RegistryOwner { get; set; }        // 등기상 소유자
        public string? ContractTenant { get; set; }       // 계약서상 임차인
        public int? EtcAmt2 { get; set; }                 // 기타임대 금액2
        public string? ChildYn { get; set; }              // 어린이 가능여부 (Y/N/C=조건부)
        public string? ChildCond { get; set; }            // 어린이 조건부 내용
        public string? PetAllow { get; set; }             // 반려동물 가능여부 (가능/불가능/조건부)
        public string? PetCond { get; set; }              // 반려동물 조건부 내용
        public int? LendAmt { get; set; }                 // 대출액
        public int? LendAmtAft { get; set; }              // 잔금 후 대출액
        public string? DepLoanBank { get; set; }          // 보증금대출 은행
        public int? DepLoanAmt { get; set; }              // 보증금대출 금액
        public string? PastDataYn { get; set; }           // 과거데이터 여부 (Y/N)

        public List<PtShare>? Shares { get; set; }        // 부동산공유(공인중개사) 이력
        public int HistoryCount { get; set; }             // 과거내역(pt_sale_old) 건수

        // 추가 스칼라 컬럼 (STRING)
        // 주의: CurrentStatus / ContractRenewalRight / BuildingUse / LandUse / LandCategory / OtherRestrictions
        //       프로퍼티는 위(추가 필드)에 이미 선언되어 있어 재사용한다.
        public string? DirBase { get; set; }
        public string? RecommendedBusiness { get; set; }
        public string? SubType { get; set; }
        public string? BuildingForm { get; set; }
        public string? MainBuildingUse { get; set; }
        public string? CommunityFacility { get; set; }
        public string? AddrDetail { get; set; }
        public string? Toilet { get; set; }
        public string? ContractDate { get; set; }
        public string? HoldDate { get; set; }
        public string? PermitDate { get; set; }
        // 종전물건유형 / 종전소재지 (재개발·재건축)
        public string? FormerPtType { get; set; }
        public string? FormerBjdCode { get; set; }
        public string? FormerDanjiCode { get; set; }
        public string? FormerAddr1 { get; set; }
        public string? FormerAddr2 { get; set; }
        public string? FormerAddr3 { get; set; }
        public string? FormerJibun { get; set; }
        public string? FormerDong { get; set; }
        public string? FormerHo { get; set; }
        public string? FormerAptTyp { get; set; }
        public decimal? FormerSupArea { get; set; }
        public decimal? FormerExcArea { get; set; }
        public decimal? FormerTotalFloorArea { get; set; }
        public decimal? FormerLandArea { get; set; }
        public decimal? FormerLandShareRatio { get; set; }
        // 추가 스칼라 컬럼 (DECIMAL)
        public decimal? GrossArea { get; set; }
        public decimal? BuildingArea { get; set; }
        public decimal? LandShareRatio { get; set; }
        public decimal? AccessRoad { get; set; }
        public decimal? OfficeArea { get; set; }
        public decimal? RoadInfo { get; set; }
        // 추가 스칼라 컬럼 (INT)
        public int? FacilityCost { get; set; }
        public string? CityGas { get; set; }
        public string? PowerReceiving { get; set; }
        public string? ElecCapacity { get; set; }
        public int? ElevatorCnt { get; set; }
        public int? StairsCnt { get; set; }
        public int? BasementFloor { get; set; }
        public int? GroundFloor { get; set; }
        public int? GuestRoomCnt { get; set; }
        public int? PresaleAmt { get; set; }
        public int? ExpansionAmt { get; set; }
        public int? OptionAmt { get; set; }
        public int? PremiumAmt { get; set; }
        public decimal? FormerArea { get; set; }
        public int? AddContribAmt { get; set; }
        public int? RightValueAmt { get; set; }
        public int? MovingCost { get; set; }
        public int? DepositTotal { get; set; }
        public int? LoanTotal { get; set; }
        public int? InvestAmt { get; set; }
        public int? IncRentM { get; set; }
        public int? IncRentY { get; set; }
        public int? IncMgmtM { get; set; }
        public int? IncMgmtY { get; set; }
        public int? IncEtcM { get; set; }
        public int? IncEtcY { get; set; }
        public int? ExpLaborM { get; set; }
        public int? ExpLaborY { get; set; }
        public int? ExpUtilM { get; set; }
        public int? ExpUtilY { get; set; }
        public int? ExpLoanM { get; set; }
        public int? ExpLoanY { get; set; }
        public int? ExpEtcM { get; set; }
        public int? ExpEtcY { get; set; }
        // 추가 스칼라 컬럼 (BOOL)
        public bool? ZoneAdjust { get; set; }
        public bool? ZoneOverheat { get; set; }
        public bool? ZoneSpec { get; set; }
        public bool? ZoneLandPermit { get; set; }
        public bool? BuildPermit { get; set; }
        public bool? ZoneDevRestrict { get; set; }
        public bool? RightSurface { get; set; }
        public bool? RightGrave { get; set; }
        public bool? RightEasement { get; set; }

        // 자식 테이블 (임대차현황서 / 토지 필지목록)
        public List<PtLeaseStatus>? LeaseRows { get; set; }
        public List<PtLandAdditional>? Parcels { get; set; }
    }

    // 물건 과거내역(pt_sale_old) 목록용 (모달 리스트)
    public class PtSaleHistory
    {
        public long OrgPtNo { get; set; }
        public DateTime? ArchivedDt { get; set; }
        public long PtNo { get; set; }
        public string? PtName { get; set; }
        public string? PtType { get; set; }
        public string? SaleDiv { get; set; }
        public string? Addr1 { get; set; }
        public string? Addr2 { get; set; }
        public string? Addr3 { get; set; }
        public string? Dong { get; set; }
        public string? Ho { get; set; }
        public int? SaleAmt { get; set; }
        public int? LesAmt { get; set; }
        public int? ProtAmt { get; set; }
        public int? MonAmt { get; set; }
        public string? CurrentStatus { get; set; }
    }

    // 부동산공유(공인중개사) 이력 - pt_share
    public class PtShare
    {
        public long PtNo { get; set; }
        public int ShareIdx { get; set; }
        public string? OfficeName { get; set; }   // 상호
        public string? RegionName { get; set; }   // 지역명
        public string? OfficePhone { get; set; }  // 전화번호
        public string? Memo { get; set; }         // 내용
        public string? Date { get; set; }         // 공유일자
    }

    // 임대차현황서 - pt_lease_status
    public class PtLeaseStatus
    {
        public long LeaseId { get; set; }
        public long PtNo { get; set; }
        public int? Seq { get; set; }
        public string? RoomNo { get; set; }
        public decimal? Area { get; set; }
        public string? CurStatus { get; set; }
        public int? Deposit { get; set; }
        public int? MonthlyRent { get; set; }
        public int? MaintCost { get; set; }
        public string? ContractStart { get; set; }
        public string? ContractEnd { get; set; }
        public string? BusinessType { get; set; }
        public string? BusinessName { get; set; }
    }

    // 토지 필지목록 - pt_land_additional
    public class PtLandAdditional
    {
        public long LandId { get; set; }
        public long PtNo { get; set; }
        public int? Seq { get; set; }
        public string? Dong { get; set; }
        public string? Soji { get; set; }
        public string? BjdCode { get; set; }
        public string? Jibun { get; set; }
        public decimal? LandArea { get; set; }
        public string? LandCategory { get; set; }
        public string? LandUse { get; set; }
        public string? OtherRestrictions { get; set; }
    }
}

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
        // 고객 희망지역 전체 목록('|' 구분) — 여러 지역이면 프론트에서 "외 N곳" + 툴팁 표시
        public string? CustRegionsText { get; set; }

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

        // ==================== 고객 중개정보 추가 필드 ====================
        public string? CustBldNm { get; set; }        // 희망지역 건물/단지명
        public string? CustBjdCode { get; set; }
        public string? CustDanjiCode { get; set; }
        public int? CustRoomCnt { get; set; }
        public int? CustBathCnt { get; set; }
        public int? CustParkCnt { get; set; }
        public char? CustChildYn { get; set; }
        public char? CustPetYn { get; set; }
        public string? CustCommunityFac { get; set; }
        public string? CustFeatureNote { get; set; }

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
        public string? PDirBase { get; set; }   // 방향기준(거실기준/안방기준/주된출입구)
        public string? PSubType { get; set; }   // 물건 세부유형
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

        // ==================== 소재지(주소) 구조화 필드 ====================
        public string? PAddr1 { get; set; }
        public string? PAddr2 { get; set; }
        public string? PAddr3 { get; set; }
        public string? PAddr4 { get; set; }   // 지번 또는 단지명
        public string? PAddr5 { get; set; }   // 건물명
        public string? PBjdCode { get; set; }
        public string? PDanjiCode { get; set; }

        // ==================== 중개정보 추가 필드 ====================
        public string? PAptTyp { get; set; }              // 타입(평형)
        public decimal? PLandShare { get; set; }          // 대지지분
        public string? PCurrentStatus { get; set; }       // 현상황
        public decimal? PLesAmt { get; set; }             // 전세금액
        public DateTime? PMaturityDate { get; set; }      // 만기일
        public decimal? PBondMaxAmt { get; set; }         // 채권최고액
        public decimal? PLoanAmt { get; set; }            // 대출금(물건등록폼 대출금액 연동)
        public decimal? PLoanAmtAft { get; set; }         // 잔금후대출액
        public string? PContractRenewalRight { get; set; }// 계약갱신청구권
        public string? PMaintDtl { get; set; }            // 관리비내역
        public int? PHouseCnt { get; set; }               // 세대수
        public string? PEntrStruct { get; set; }          // 현관구조

        // ==================== 유형별(물건/고객) 전송 폼 추가 필드 ====================
        public string? PAccessRoad { get; set; }
        public decimal? PAddContribAmt { get; set; }
        public int? PBasementFloor { get; set; }
        public decimal? PBuildingArea { get; set; }
        public string? PBuildingForm { get; set; }
        public string? PBuildingUse { get; set; }
        public string? PBusinessName { get; set; }
        public string? PBusinessType { get; set; }
        public string? PChildCond { get; set; }
        public string? PChildYn { get; set; }
        public string? PCommunityFacility { get; set; }
        public int? PElevatorCnt { get; set; }
        public decimal? PEtcDepAmt { get; set; }
        public decimal? PEtcMonAmt { get; set; }
        public decimal? PExpEtcM { get; set; }
        public decimal? PExpEtcY { get; set; }
        public decimal? PExpLaborM { get; set; }
        public decimal? PExpLaborY { get; set; }
        public decimal? PExpLoanM { get; set; }
        public decimal? PExpLoanY { get; set; }
        public decimal? PExpUtilM { get; set; }
        public decimal? PExpUtilY { get; set; }
        public decimal? PExpansionAmt { get; set; }
        public decimal? PFacilityCost { get; set; }
        public int? PGroundFloor { get; set; }
        public int? PGuestRoomCnt { get; set; }
        public decimal? PIncEtcM { get; set; }
        public decimal? PIncEtcY { get; set; }
        public decimal? PIncMgmtM { get; set; }
        public decimal? PIncMgmtY { get; set; }
        public decimal? PIncRentM { get; set; }
        public decimal? PIncRentY { get; set; }
        public decimal? PLandArea { get; set; }
        public string? PLandCategory { get; set; }
        public decimal? PLandShareRatio { get; set; }
        public string? PLandUse { get; set; }
        public decimal? PLayAmt { get; set; }
        public decimal? PMovingCost { get; set; }
        public decimal? POptionAmt { get; set; }
        public string? POtherRestrictions { get; set; }
        public string? PPetAllow { get; set; }
        public decimal? PPremiumAmt { get; set; }
        public decimal? PPresaleAmt { get; set; }
        public decimal? PRightValueAmt { get; set; }
        public string? PRoadInfo { get; set; }
        public int? PStairCnt { get; set; }
        public string? PToilet { get; set; }
        public decimal? PTotalFloorArea { get; set; }
        public bool? PZoneAdjust { get; set; }
        public bool? PZoneLandPermit { get; set; }
        public bool? PZoneOverheat { get; set; }
        public bool? PZoneSpec { get; set; }
        public string? CustAccessRoad { get; set; }
        public string? CustBalcExt { get; set; }
        public string? CustBizType { get; set; }
        public string? CustBuildPermitPref { get; set; }
        public string? CustBuildingForm { get; set; }
        public string? CustBuildingUse { get; set; }
        public string? CustChildCond { get; set; }
        public string? CustCityGasYn { get; set; }
        public string? CustElecCapacity { get; set; }
        public int? CustElevatorCnt { get; set; }
        public string? CustEntrStruct { get; set; }
        public string? CustLandCategory { get; set; }
        public string? CustLandUse { get; set; }
        public string? CustOpt { get; set; }
        public string? CustPetAllow { get; set; }
        public int? CustStairCnt { get; set; }
        public string? ChargeName { get; set; }

        // ==================== 조회 조인 필드(부동산/직원) ====================
        public string? OffNm { get; set; }          // 부동산 상호(ofc_realter_office)
        public string? OffRpsPhone { get; set; }    // 대표님 번호
        public string? RpsNm { get; set; }          // 대표자명(ofc_realter_office)
        public string? OffTel { get; set; }         // 사무실 번호
        public string? RegUserTel { get; set; }     // 담당자(등록자) 번호(rt_realtor_info)

        // SQL 함수에서 반환하는 total_count 필드
        public long TotalCount { get; set; }
    }
}

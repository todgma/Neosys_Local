using System;
using System.Collections.Generic;

namespace RealestateAPI.Neobot.Models
{
    /// <summary>
    /// 네오봇 통합검색 결과 한 행 (물건 PT / 고객 CUST / 계약 CT)
    ///  - Kind    : "PT" | "CUST" | "CT"
    ///  - RefId   : pt_no | cust_no | master_id(uuid) 를 text 로 통일
    ///  - TypeCode: 물건유형(pt_type) | 희망유형(want_type) | 계약문서유형(doc_type)
    ///  - Addr    : 물건=조합주소 / 고객=희망지역 / 계약=소재지(addr)
    ///  - PersonsJson: 관련 인물 [{name,phone,role}] (물건=소유자/임차인, 고객=구입자, 계약=취득/이전의뢰인)
    ///  - Amount  : 대표금액(물건 매매가 / 계약 거래금액), SubInfo: 거래유형 등, RefDate: 계약일 등
    /// </summary>
    public class NeobotSearchRow
    {
        public string Kind { get; set; } = "";
        public string RefId { get; set; } = "";
        public string? TypeCode { get; set; }
        public string? Addr { get; set; }
        public string? PersonsJson { get; set; }
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public long? Amount { get; set; }
        public string? SubInfo { get; set; }
        public DateTime? RefDate { get; set; }
    }

    public class NeobotSearchResult
    {
        public List<NeobotSearchRow> Items { get; set; } = new();
    }

    // 상담이력(ct_interview)
    public class NeobotConsult
    {
        public long ItvNo { get; set; }
        public string? ItvDate { get; set; }
        public string? ItvContent { get; set; }
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }
        public string? RegId { get; set; }
        public DateTime? RegDt { get; set; }
    }

    // 일정(rt_schedule + rt_schedule_link)
    public class NeobotSchedule
    {
        public long ScheduleId { get; set; }
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Category { get; set; }
        public DateTime? StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public string? Location { get; set; }
    }

    // 소유자/임차인(pt_sale_holder)
    public class NeobotHolder
    {
        public string? HolderType { get; set; }     // OWNER | BUYER(임차인) | SHARE
        public string? HolderName { get; set; }
        public string? HolderPhone { get; set; }
        public string? HolderRelation { get; set; } // '전 소유자'/'전 임차인' 이면 과거
        public DateTime? HolderRegDate { get; set; }
        public bool IsPast { get; set; }
    }

    // 물건 요약(pt_sale)
    public class NeobotPropSummary
    {
        public long PtNo { get; set; }
        public string? PtName { get; set; }
        public string? PtType { get; set; }
        public string? Addr { get; set; }
        public string? SaleDiv { get; set; }
        public int? SaleAmt { get; set; }
        public int? LesAmt { get; set; }
        public int? ProtAmt { get; set; }
        public int? MonAmt { get; set; }
        public decimal? SupArea { get; set; }
        public decimal? ExcArea { get; set; }
        public int? Floor { get; set; }
        public string? DirStd { get; set; }
        public string? CurrentStatus { get; set; }
        public string? PtSts { get; set; }
    }

    // 고객 요약(ct_cust)
    public class NeobotCustSummary
    {
        public long CustNo { get; set; }
        public string? Name { get; set; }
        public string? Tel { get; set; }
        public string? Addr { get; set; }
        public string? WantType { get; set; }
        public string? WantNm { get; set; }
        public string? FeatureNote { get; set; }
        public string? Memo { get; set; }
    }

    // 고객 희망지역(ct_trd_area)
    public class NeobotWishArea
    {
        public string? Addr1 { get; set; }
        public string? Addr2 { get; set; }
        public string? Addr3 { get; set; }
        public string? BldNm { get; set; }
        public string? TradeStatus { get; set; }
    }

    // 구입자(ct_cust_buyer) — N행 가능, 저장일(reg_dt) 함께
    public class NeobotBuyer
    {
        public string? Name { get; set; }
        public string? Relation { get; set; }
        public string? Tel { get; set; }
        public string? Addr { get; set; }
        public DateTime? RegDt { get; set; }
    }

    // 계약 상세(contract_master)
    public class NeobotContractDetail
    {
        public string? MasterId { get; set; }
        public string? ContractKind { get; set; }
        public string? DocType { get; set; }
        public string? TradeType { get; set; }
        public string? Title { get; set; }
        public string? Addr { get; set; }
        public string? Seller { get; set; }
        public string? Buyer { get; set; }
        public long? Amount { get; set; }
        public DateTime? ContractDate { get; set; }
        public string? Status { get; set; }
        public DateTime? ReportDoneDate { get; set; }
    }

    public class NeobotPropertyDetail
    {
        public NeobotPropSummary? Summary { get; set; }
        public List<NeobotHolder> Holders { get; set; } = new();
        public List<NeobotConsult> Consultations { get; set; } = new();
        public List<NeobotSchedule> Schedules { get; set; } = new();
    }

    public class NeobotCustomerDetail
    {
        public NeobotCustSummary? Summary { get; set; }
        public List<NeobotBuyer> Buyers { get; set; } = new();
        public List<NeobotWishArea> WishAreas { get; set; } = new();
        public List<NeobotConsult> Consultations { get; set; } = new();
        public List<NeobotSchedule> Schedules { get; set; } = new();
    }
}

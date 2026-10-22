using System.Collections.Generic;

namespace RealestateAPI.Expiry.Models
{
    /// <summary>
    /// 만기관리 목록 한 행.
    ///  · ExpiryDate: 만기일자 — 건물(SYCA108)은 임대차현황서(pt_lease_status.contract_end) 최소값, 그 외는 pt_sale.mtry_date
    ///  · Owner/Tenant: pt_sale_holder 현재 소유자(OWNER)/임차인(BUYER) 대표 1인
    /// </summary>
    public class ExpiryRow
    {
        public long PtNo { get; set; }
        public string? PtType { get; set; }
        public string? PtName { get; set; }
        public string? Addr { get; set; }
        // 주소 상세(물건명/상세주소 구성용)
        public string? Addr1 { get; set; }
        public string? Addr2 { get; set; }
        public string? Addr3 { get; set; }
        public string? Addr4 { get; set; }
        public string? Addr5 { get; set; }
        public string? DanjiCode { get; set; }
        public string? CurrentStatus { get; set; }
        public string? PtSts { get; set; }
        public string? SaleDiv { get; set; }
        // 출처(물건관리/계약관리)
        public string? Source { get; set; }
        // 면적/금액
        public string? AptTyp { get; set; }
        public string? SupArea { get; set; }
        public string? ExcArea { get; set; }
        public string? SaleAmt { get; set; }
        public string? LesAmt { get; set; }
        public string? ProtAmt { get; set; }
        public string? MonAmt { get; set; }
        public string? EtcAmt { get; set; }
        public string? EtcAmt2 { get; set; }
        public string? Dong { get; set; }
        public string? Ho { get; set; }
        public string? Jibun { get; set; }
        public string? ExpiryDate { get; set; }
        public string? OwnerName { get; set; }
        public string? OwnerPhone { get; set; }
        public string? TenantName { get; set; }
        public string? TenantPhone { get; set; }
        public int TotalCount { get; set; }
    }

    public class ExpiryResult
    {
        public List<ExpiryRow> Items { get; set; } = new();
        public int TotalCount { get; set; }
    }
}

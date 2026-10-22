using System;
using System.Collections.Generic;

namespace RealestateAPI.Contract.Models
{
    // 계약서 마스터
    public class ContractMaster
    {
        public string? MasterId { get; set; }     // UUID 문자열
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
        public string? Doc { get; set; }          // JSON 문자열
        public DateTime? ReportDoneDate { get; set; }  // 거래신고 완료일
        public DateTime? RegDt { get; set; }
        public DateTime? UpdDt { get; set; }
        public bool HasPreSms { get; set; }        // 가계약문자 작성 여부(목록용)
    }

    public class ContractMasterList
    {
        public List<ContractMaster> Items { get; set; } = new();
        public int TotalCount { get; set; }
    }

    public class ContractMasterDto
    {
        public string? MasterId { get; set; }     // UUID 문자열(클라이언트 생성)
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
        public string? Doc { get; set; }          // JSON 문자열
        public long? OffNo { get; set; }
        public string? RtNo { get; set; }
        public string? UserId { get; set; }
    }

    public class ContractDocumentRow
    {
        public long DocId { get; set; }
        public string? MasterId { get; set; }     // UUID 문자열
        public string DocKind { get; set; } = "";
        public string? Data { get; set; }         // JSON 문자열
        public DateTime? UpdDt { get; set; }
    }

    public class ContractDocumentDto
    {
        public string? Data { get; set; }         // JSON 문자열
        public string? UserId { get; set; }
        // 부속문서만 저장(계약서 미저장)해도 마스터에 기록할 현재 계약 메타. 마스터가 없을 때만 채움(소재지=(임시))
        public string? ContractKind { get; set; }
        public string? DocType { get; set; }
        public string? TradeType { get; set; }
    }

    public class ReportDateDto
    {
        public string? ReportDoneDate { get; set; }   // 'YYYY-MM-DD' (null=완료 취소)
        public string? UserId { get; set; }
    }
}

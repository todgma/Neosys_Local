namespace RealestateAPI.Admin.Models
{
    /// <summary>결제 이력 행(payment_history) — 목록/상세 조회 응답</summary>
    public class PaymentHistory
    {
        public long PayId { get; set; }
        public long? OffNo { get; set; }
        public long? RtNo { get; set; }
        public string? UserId { get; set; }          // 결제한 사용자 로그인 아이디
        public string? OrderId { get; set; }
        public string? OrderName { get; set; }
        public string? PaymentKey { get; set; }
        public long? ProdId { get; set; }
        public string? ProdName { get; set; }
        public int Amount { get; set; }
        public string? Method { get; set; }
        public string? Status { get; set; }
        public string? CardCompany { get; set; }
        public string? CardNumber { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? ReceiptUrl { get; set; }
        public string? FailCode { get; set; }
        public string? FailMsg { get; set; }
        public DateTime? RegDt { get; set; }
        // 사무소명(목록 조인용)
        public string? OffNm { get; set; }
    }

    /// <summary>결제 승인 요청(토스 confirm) — 결제창 성공 후 프런트가 전달</summary>
    public class ConfirmPaymentDto
    {
        // 토스 결제창에서 받은 값
        public string PaymentKey { get; set; } = default!;
        public string OrderId { get; set; } = default!;
        public long Amount { get; set; }
        // 상점(내부) 정보
        public string? OrderName { get; set; }
        public long? OffNo { get; set; }
        public long? RtNo { get; set; }
        public string? UserId { get; set; }
        public long? ProdId { get; set; }
        public string? ProdName { get; set; }
        public string? Kind { get; set; }   // 'ENTRY_FEE'(가입비) 등 — 가입비면 office_entry_fee 처리
    }

    public class EntryFeeStatus
    {
        public bool Paid { get; set; }
        public DateTime? PaidDt { get; set; }
        public int? Amount { get; set; }
    }
}

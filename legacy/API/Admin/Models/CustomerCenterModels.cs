using System;
using System.Collections.Generic;

namespace RealestateAPI.Admin.Models
{
    // 고객센터 문의 정보
    public class CustomerInquiry
    {
        public long InquiryId { get; set; }
        public string? UserId { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Category { get; set; }
        public string Title { get; set; } = default!;
        public string Content { get; set; } = default!;
        public string? Answer { get; set; }
        public string? AnswerId { get; set; }
        public DateTime? AnswerDt { get; set; }
        public string Status { get; set; } = "PENDING";
        public int SortOrder { get; set; }
        public string RegId { get; set; } = default!;
        public DateTime RegDt { get; set; }
        public string? ModId { get; set; }
        public DateTime? ModDt { get; set; }
    }

    // 고객센터 문의 목록
    public class CustomerInquiryList
    {
        public List<CustomerInquiry>? Inquiries { get; set; }
        public int TotalCount { get; set; }
    }
}

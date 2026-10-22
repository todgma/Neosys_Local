using System;
using System.Collections.Generic;

namespace RealestateAPI.Admin.Models
{
    // 공지사항 정보
    public class Notice
    {
        public long NoticeId { get; set; }
        public string Title { get; set; } = default!;
        public string Content { get; set; } = default!;
        public string? Category { get; set; }
        public int ViewCount { get; set; }
        public string IsTop { get; set; } = "N";
        public string IsPublic { get; set; } = "Y";
        public string IsPopup { get; set; } = "N";
        public string? ShowOnDashboard { get; set; } = "Y";
        public int? PopupW { get; set; }
        public int? PopupH { get; set; }
        public string? AttachFile { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int SortOrder { get; set; }
        public string RegId { get; set; } = default!;
        public DateTime RegDt { get; set; }
        public string? ModId { get; set; }
        public DateTime? ModDt { get; set; }
    }

    // 공지사항 목록
    public class NoticeList
    {
        public List<Notice>? Notices { get; set; }
        public int TotalCount { get; set; }
    }
}

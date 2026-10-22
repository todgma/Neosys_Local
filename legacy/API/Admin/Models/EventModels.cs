using System;
using System.Collections.Generic;

namespace RealestateAPI.Admin.Models
{
    public class Event
    {
        public long EventId { get; set; }
        public string Title { get; set; } = default!;
        public string? Content { get; set; }
        public string? ImageUrl { get; set; }
        public string? LinkUrl { get; set; }
        public int ViewCount { get; set; }
        public string? IsPublic { get; set; }
        public string? IsPopup { get; set; }
        public string? ShowOnDashboard { get; set; }
        public int? PopupW { get; set; }
        public int? PopupH { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int SortOrder { get; set; }
        public string? IsParticipatory { get; set; }   // 참여형 여부 'Y'/'N'
        public string? RegId { get; set; }
        public DateTime? RegDt { get; set; }
        public string? ModId { get; set; }
        public DateTime? ModDt { get; set; }
    }

    public class EventList
    {
        public List<Event>? Events { get; set; }
        public int TotalCount { get; set; }
    }

    // ── 참여형 이벤트: 참여 제출 ──
    public class EventEntry
    {
        public long EntryId { get; set; }
        public long EventId { get; set; }
        public long? OffNo { get; set; }
        public long? RtNo { get; set; }
        public string? UserId { get; set; }
        public string? UserNm { get; set; }
        public string? Content { get; set; }
        public string? Status { get; set; }       // SUBMITTED/CONFIRMED/REJECTED
        public string? AdminMemo { get; set; }
        public string? ConfirmedBy { get; set; }
        public DateTime? ConfirmedDt { get; set; }
        public DateTime? RegDt { get; set; }
        public string? EventTitle { get; set; }   // join(nt_event.title)
        public int FileCnt { get; set; }          // 첨부 수
        public string? OffNm { get; set; }         // 사무소명(join)
        public string? Phone { get; set; }         // 참여자 연락처(join)
        public int SeqNo { get; set; }             // 참여횟수(동일 사무소 기준 순번)
    }

    public class EventEntryFileDto
    {
        public string ObjectKey { get; set; } = default!;
        public string? OrigName { get; set; }
        public string? ContentType { get; set; }
        public long? FileSize { get; set; }
        public string? Ext { get; set; }
    }

    public class EventEntrySubmitDto
    {
        public long EventId { get; set; }
        public long? OffNo { get; set; }
        public long? RtNo { get; set; }
        public string? UserId { get; set; }
        public string? UserNm { get; set; }
        public string? Content { get; set; }
        public List<EventEntryFileDto>? Files { get; set; }
    }

    public class EventEntryConfirmDto
    {
        public string? Status { get; set; }       // CONFIRMED/REJECTED/SUBMITTED
        public string? AdminMemo { get; set; }
        public string? UserId { get; set; }
    }
}

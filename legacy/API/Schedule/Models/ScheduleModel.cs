using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Schedule.Models
{
    public class ScheduleList
    {
        public List<ScheduleModel>? Schedules { get; set; }
    }

    public class ScheduleModel
    {
        [Required]
        public long ScheduleId { get; set; }

        [Required]
        public string ScopeDiv { get; set; } = string.Empty;

        [Required]
        public string OwnerUserId { get; set; } = string.Empty;

        public long? OfficeId { get; set; }

        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Phone { get; set; }
        public string? Location { get; set; }

        [Required]
        public DateTime StartAt { get; set; }

        public DateTime? EndAt { get; set; }

        [Required]
        public bool AllDay { get; set; }

        [Required]
        public string UseYn { get; set; } = string.Empty;

        [Required]
        public bool IsShared { get; set; }

        [Required]
        public bool IsPrivate { get; set; }

        public string? Category { get; set; }
        public decimal? Amount { get; set; }
        public string? ContactName { get; set; }
        public string? ContactRole { get; set; }
        public string? Phone2 { get; set; }
        public string? ContactName2 { get; set; }
        public string? ContactRole2 { get; set; }

        public string? RegId { get; set; }
        public DateTime? RegDt { get; set; }
        public string? UpdId { get; set; }
        public DateTime? UpdDt { get; set; }

        // 연동 정보
        public List<ScheduleLinkModel>? Links { get; set; }
    }

    public class ScheduleLinkModel
    {
        [Required]
        public long LinkId { get; set; }

        [Required]
        public long ScheduleId { get; set; }

        [Required]
        public string LinkType { get; set; } = string.Empty;

        public string? LinkKey { get; set; }
        public string? Meta { get; set; }

        public string? RegId { get; set; }
        public DateTime? RegDt { get; set; }
        public string? UpdId { get; set; }
        public DateTime? UpdDt { get; set; }
    }
}

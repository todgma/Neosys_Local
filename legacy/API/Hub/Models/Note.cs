using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Hub.Models
{
    /// <summary>
    /// 쪽지 (공동중개망 개인 간 메시지) — 소유 단위: 개인(사용자 ID)
    /// </summary>
    public class Note
    {
        public long NoteId { get; set; }
        public string? SenderId { get; set; }
        public string? SenderName { get; set; }
        public string? ReceiverId { get; set; }
        public string? ReceiverName { get; set; }
        public string? Title { get; set; }
        public string? Content { get; set; }
        public long? RefTradeId { get; set; }
        public string? IsRead { get; set; }
        public DateTime? ReadDt { get; set; }
        public DateTime? RegDt { get; set; }
    }

    public class NoteCount
    {
        public long Cnt { get; set; }
    }

    public class NoteSendDto
    {
        [Required]
        public List<string> ReceiverIds { get; set; } = new();
        public List<string>? ReceiverNames { get; set; }

        [Required]
        public string SenderId { get; set; } = default!;
        public string? SenderName { get; set; }

        [MaxLength(50)]
        public string? Title { get; set; }
        [MaxLength(500)]
        public string? Content { get; set; }

        public long? RefTradeId { get; set; }
    }

    /// <summary>
    /// 쪽지 대화방 공개여부(대표↔직원)
    /// </summary>
    public class NoteShare
    {
        public string? OwnerId { get; set; }
        public string? PartnerId { get; set; }
        public string? Share { get; set; }
    }

    public class NoteShareSetDto
    {
        public long OffNo { get; set; }
        [Required]
        public string OwnerId { get; set; } = default!;
        [Required]
        public string PartnerId { get; set; } = default!;
        [RegularExpression("^[YN]$", ErrorMessage = "Share must be Y or N")]
        public string Share { get; set; } = "N";
    }

    public class NoteShareAllDto
    {
        public long OffNo { get; set; }
        [RegularExpression("^[YN]$", ErrorMessage = "Share must be Y or N")]
        public string Share { get; set; } = "N";
    }
}

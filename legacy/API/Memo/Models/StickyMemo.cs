using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Memo.Models
{
    /// <summary>
    /// 대시보드 스티커 메모(개인) — rt_sticky_memo
    /// </summary>
    public class StickyMemo
    {
        public long MemoId { get; set; }
        public string? UserId { get; set; }
        public string? Content { get; set; }
        public string? Color { get; set; }
        public int SortOrder { get; set; }
        public DateTime? RegDt { get; set; }
        public DateTime? UpdDt { get; set; }
    }

    public class StickyMemoCreateDto
    {
        [Required]
        public string UserId { get; set; } = default!;
        public string? Content { get; set; }
        public string? Color { get; set; }
        public int? SortOrder { get; set; }
    }

    public class StickyMemoUpdateDto
    {
        public string? Content { get; set; }
        public string? Color { get; set; }
        public int? SortOrder { get; set; }
        public string? UserId { get; set; }
    }
}

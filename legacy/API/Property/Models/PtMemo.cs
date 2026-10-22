using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Property.Models
{
    public class PtMemo
    {
        public int MemoNo { get; set; }
        public int PtNo { get; set; }
        public DateTime MemoDate { get; set; }
        public string MemoContent { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string RegId { get; set; } = string.Empty;
        public DateTime RegDt { get; set; }
        public string? UpdId { get; set; }
        public DateTime? UpdDt { get; set; }
    }

    public class PtMemoDto
    {
        public int MemoNo { get; set; }
        public int PtNo { get; set; }

        [Required]
        public DateTime MemoDate { get; set; }

        [Required]
        public string MemoContent { get; set; } = string.Empty;

        // 전화번호입력으로 선택한 연락처
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;

        public string? RegId { get; set; }
        public DateTime? RegDt { get; set; }
        public string? UpdId { get; set; }
        public DateTime? UpdDt { get; set; }
    }

    public class CreatePtMemoRequest
    {
        [Required]
        public DateTime MemoDate { get; set; }

        [Required]
        public string MemoContent { get; set; } = string.Empty;

        [Required]
        public string UserId { get; set; } = string.Empty;
    }

    public class UpdatePtMemoRequest
    {
        [Required]
        public DateTime MemoDate { get; set; }

        [Required]
        public string MemoContent { get; set; } = string.Empty;
    }
}

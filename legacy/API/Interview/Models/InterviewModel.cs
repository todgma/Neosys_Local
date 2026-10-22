using RealestateAPI.Realestater.Models;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Interview.Models
{
    public class InterviewList
    {
        public List<InterviewModel>? Interviews { get; set; }
    }

    public class InterviewModel
    {
        [Required]
        public int ItvNo { get; set; }

        [Required]
        public string ItvType { get; set; } = string.Empty;

        [Required]
        public string ItvDate { get; set; } = string.Empty;

        [Required]
        public int CustNo { get; set; }

        [Required]
        public string CustName { get; set; } = string.Empty;

        [Required]
        public string CustPhone { get; set; } = string.Empty;

        [Required]
        public int PtNo { get; set; }

        [Required]
        public string ItvContent { get; set; } = string.Empty;

        [Required]
        public string ItvMemo { get; set; } = string.Empty;

        [Required]
        public int RtNo { get; set; }

        [Required]
        public int OffNo { get; set; }
        
        [Required]
        public int VendorId { get; set; }

        // 전화번호입력으로 선택한 연락처(소유자/임차인/구입자 등)
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }

        [Required]
        public DateTime? RegDt { get; set; }

        [Required]
        public string? RegId { get; set; } = string.Empty;

        [Required]
        public DateTime? UpdDt { get; set; }

        [Required]
        public string? UpdId { get; set; } = string.Empty;
    }
}

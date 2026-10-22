using Org.BouncyCastle.Ocsp;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RealestateAPI.Realestater.Models
{
    public class RtScheduleList
    {
        public List<RtSchedule>? RtSchedules { get; set; }
    }

    public class RtSchedule
    {
        [Required]
        public long? SchIdx { get; set; }
        [Required]
        public long? RtNo { get; set; }
        [Required]
        public string? SchType { get; set; } = string.Empty;
        [Required]
        public string? ShaYn { get; set; } = string.Empty;
        [Required]
        public string? SchDate { get; set; } = string.Empty ;
        [Required]
        public int? SchTime {  get; set; }
        [Required]
        public int? SchMin { get; set; }
        [Required]
        public string? Title {  get; set; } = string.Empty;
        [Required]
        public string? Content {  get; set; } = string.Empty;
        [Required]
        public long? CustNo1 { get; set; }
        [Required]
        public long? CustNo2 {  get; set; }
        [Required]
        public string? CustInfo1 {  get; set; } = string.Empty;
        [Required]
        public string? CustInfo2 {  get; set; } = string.Empty;
        [Required]
        public DateTime? RegD { get; set; }
        [Required]
        public string? RegId {  get; set; } = string.Empty;
        [Required]
        public DateTime? Upd_dt {  get; set; }
        [Required]
        public string? UpdId {  get; set; } = string.Empty;
    }
}

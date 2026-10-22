using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.System.Models
{
    public class SysCode
    {
    }

    public class SysCodeCat
    {
        [Required]
        public string CatCd { get; set; } = string.Empty;
        [Required]
        public string CatNm { get; set; } = string.Empty;
        public string? UseYn { get; set; } = string.Empty;
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
        public DateTime? UpdDt { get; set; }
        public string? UpdId { get; set; }
    }

    public class SysCodeCatList
    {
        public List<SysCodeCat>? SysCodeCats { get; set; }
    }

    public class SysCodeMid
    {
        [Required]
        public string CatCd { get; set; } = string.Empty;
        [Required]
        public string MidCd { get; set; } = string.Empty;
        [Required]
        public string MidNm { get; set; } = string.Empty;
        public string? UseYn { get; set; } = string.Empty;
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
        public DateTime? UpdDt { get; set; }
        public string? UpdId { get; set; }
    }

    public class SysCodeMidList
    {
        public List<SysCodeMid>? SysCodeMids { get; set; }
    }

    public class SysCodeSub
    {
        [Required]
        public string CatCd { get; set; } = string.Empty;
        [Required]
        public string MidCd { get; set; } = string.Empty;
        [Required]
        public string SubCd { get; set; } = string.Empty;
        [Required]
        public string SubNm { get; set; } = string.Empty;
        public string? Etc1 { get; set; } = string.Empty;
        public string? Etc2{ get; set; } = string.Empty;
        public string? Etc3 { get; set; } = string.Empty;
        public string? Etc4 { get; set; } = string.Empty;
        public string? Etc5 { get; set; } = string.Empty;
        public string? Etc6 { get; set; } = string.Empty;
        public string? Etc7 { get; set; } = string.Empty;
        public string? Etc8 { get; set; } = string.Empty;
        public string? Etc9 { get; set; } = string.Empty;
        public string? Etc10 { get; set; } = string.Empty;
        public string? UseYn { get; set; } = string.Empty;
        public int? sort {  get; set; }
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
        public DateTime? UpdDt { get; set; }
        public string? UpdId { get; set; }
    }

    public class SysCodeSubList
    {
        public List<SysCodeSub>? SysCodeSubs { get; set; }
    }

}

using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Office.Models
{
    public class OfficeList
    {
        public List<OfficeInfo>? Offices { get; set; }
    }

    public class OfficeInfo
    {
        [Required]
        public int OffNo { get; set; }

        [Required]
        public string OffNm { get; set; } = string.Empty;

        [Required]
        public string Addr { get; set; } = string.Empty;

        [Required]
        public string RpsNm { get; set; } = string.Empty;

        [Required]
        public string RpsPhone { get; set; } = string.Empty ;

        [Required]
        public string OffTel { get; set;} = string.Empty;

        [Required]
        public string OffFax { get; set;} = string.Empty;

        [Required]
        public string RegNo { get; set; } = string.Empty;

        [Required]
        public string BizNo { get; set; } = string.Empty;

        //REG_DT  등록일자
        [Required]
        public DateTime? RegDt { get; set; }

        //REG_ID  등록자
        [Required]
        public string? RegId { get; set; } = string.Empty;

        //UPD_DT  수정일
        [Required]
        public DateTime? UpdDt { get; set; }

        //UPD_ID  수정자
        [Required]
        public string? UpdId { get; set; } = string.Empty;

        //AllowIp  사무소 허용 IP(최초 로그인 시 캡처, 관리자 초기화/직접입력). null=미설정
        public string? AllowIp { get; set; }

        //Greeting  대시보드 인사말(사무소 공유 — 소속 전원 동일 표기)
        public string? Greeting { get; set; }
    }

    public class NonShared
    {
        [Required]
        public int OffNo { get; set; }

        [Required]
        public string OffNm { get; set; } = string.Empty;

        [Required]
        public string Addr { get; set; } = string.Empty;

        [Required]
        public string RpsNm { get; set;} = string.Empty;

        [Required]
        public string OffTel { get; set;} = string.Empty;

        [Required]
        public string RegNo { get; set;} = string.Empty;

        [Required]
        public string BizNo { get; set;}= string.Empty;

        //REG_DT  등록일자
        [Required]
        public DateTime? RegDt { get; set; }

        //REG_ID  등록자
        [Required]
        public string? RegId { get; set; } = string.Empty;

        //UPD_DT  수정일
        [Required]
        public DateTime? UpdDt { get; set; }

        //UPD_ID  수정자
        [Required]
        public string? UpdId { get; set; } = string.Empty;
    }

}

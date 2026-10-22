using System;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Admin.Models
{
    public class MenuList
    {
        public List<MenuInfo>? Menus { get; set; }
    }

    public class MenuInfo
    {
        [Required]
        public int Id { get; set; }

        [Required]
        public string MnuNm { get; set; } = string.Empty;

        [Required]
        public int Lvl { get; set; }
        
        [Required]
        public int? ParentId { get; set; }
        
        [Required]
        public char? UseYn { get; set; }

        [Required]
        public int? Sort { get; set; }

        [Required]
        public DateTime? RegDt { get; set; }

        [Required]
        public string? RegId { get; set; } = string.Empty;

        [Required]
        public DateTime? UpdDt { get; set; }

        [Required]
        public string? UpdId { get; set; } = string.Empty;
    }

    public class MenuListRt
    {
        public List<MenuRt>? MenusRt { get; set; }
    }

    public class MenuRt
    {
        //ID 메뉴ID                    INT
        [Required]
        public int Id { get; set; }
        
        [Required]
        public string MnuNm { get; set; } = string.Empty;

        [Required]
        public int lvl { get; set; }

        [Required]
        public int parentId { get; set; }

        //RT_NO 중개인번호             BIGINT
        [Required]
        public int RtNo { get; set; }

        //C_YN 등록(1 or 0)            CHAR
        [Required]
        public char? CYn { get; set; }

        //R_YN 읽기(1 or 0)            CHAR
        [Required]
        public char? RYn { get; set; }

        //U_YN 수정(1 or 0)            CHAR
        [Required]
        public char? UYn { get; set; }

        //D_YN 삭제(1 or 0)            CHAR
        [Required]
        public char? DYn { get; set; }

        //USE_YN 사용여부(1 or 0)      CHAR
        [Required]
        public char? UseYn { get; set; }

        //REG_DT 등록일자              DATE
        [Required]
        public DateTime? RegDt { get; set; }

        //REG_ID 등록자                NVARCHAR
        [Required]
        public string? RegId { get; set; } = string.Empty;

        //UPD_DT 수정일                DATE
        [Required]
        public DateTime? UpdDt { get; set; }

        //UPD_ID 수정자                NVARCHAR
        [Required]
        public string? UpdId { get; set; } = string.Empty;
    }
}

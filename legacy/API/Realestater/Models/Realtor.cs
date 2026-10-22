using RealestateAPI.Office.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RealestateAPI.Realestater.Models
{
    public class RelatorList
    {
        public List<Realtor>? Relaters { get; set; }
    }
    public class Realtor
    {
        [Required]
        [Column("RtNo")]
        public int rtNo { get; set; }

        [Required]
        [Column("RtType")]
        public string? rtType { get; set; }

        [Required]
        [Column("RtNm")]
        public string? rtNm { get; set; }

        [Required]
        [Column("RtTel")]
        public string? rtTel { get; set; } = string.Empty;

        [Required]
        [Column("RtRegNo")]
        public string? rtRegNo { get; set; } = string.Empty;

        [Required]
        [Column("OffNo")]
        public int? offNo { get; set;}

        [Required]
        [Column("Grade")]
        public string? grade { get; set;} = string.Empty;

        [Required]
        [Column("Id")]
        public string? id { get; set; } = string.Empty;

        [Required]
        [Column("Pw")]
        public string? pw { get; set; } = string.Empty ;

        [Required]
        [Column("RegDt")]
        public DateTime? regDt { get; set; }

        [Required]
        [Column("RegId")]
        public string? regId { get; set; } = string.Empty;

        [Required]
        [Column("UpdDt")]
        public DateTime? updDt { get; set; }

        [Required]
        [Column("UpdId")]
        public string? updId { get; set; } = string.Empty;

        [Column("referred_rt_no")]
        public long? referredRtNo { get; set; }

        // 추천인 코드 (대표중개사 RTTYP01 전용, 서비스에서 세팅 — 소속중개사는 null)
        public string? referralCode { get; set; }

        // 멤버십(사무소) 보유 여부 — 없으면 프론트에서 메뉴 잠금/안내(로그인 자체는 허용)
        public bool hasMembership { get; set; }

        // 가입비(사무소 단위) 결제 여부 — 가입비 결제가 선행되어야 상품가입·메뉴 이용 가능
        public bool hasEntryFee { get; set; }

        // 직원 관리 필드(소속중개사) — 이메일/입사일/퇴사일/비고. Grade=직급으로 사용.
        [Column("Email")]
        public string? email { get; set; }
        [Column("JoinDate")]
        public string? joinDate { get; set; }
        [Column("LeaveDate")]
        public string? leaveDate { get; set; }
        [Column("Note")]
        public string? note { get; set; }

        // 혜택 정보
        public EventInfo? eventInfo { get; set; }
    }

    public class EventInfo
    {
        public int referredCount { get; set; }  // 내가 소개한 사용자 수
        public int totalFreeDays { get; set; }  // 내가 받은 총 무료일수
        public List<ReferredUser>? referredUsers { get; set; }  // 소개한 사용자 목록
    }

    public class ReferredUser
    {
        public int rbId { get; set; }
        public string? offNm { get; set; }   // 상호(피추천 사무소명)
        public string? rtNm { get; set; }    // 대표님(피추천 대표 성명)
        public DateTime? regDt { get; set; }
        public int freeDays { get; set; }
    }

    public class RtSchedual
    {
        [Required]
        public int Idx { get; set; }

        [Required]
        public int RtNo { get; set; }

        [Required]
        public string SchType { get; set; } = string.Empty;

        [Required]
        public string ShaYn { get; set; } = string.Empty;

        [Required]
        public string SchDt {  get; set; } = string.Empty;

        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string? Content { get; set; } = string.Empty;

        [Required]
        public string CustNo1 { get; set;} = string.Empty;

        [Required]
        public string? CustNo2 { get; set;} = string.Empty;

        [Required]
        public DateTime? RegDt { get; set;}

        [Required]
        public string? RegId { get; set;} = string.Empty;

        [Required]
        public DateTime? UpdDt { get; set;}

        [Required]
        public string? UpdId { get; set; } = string.Empty;

    }
}

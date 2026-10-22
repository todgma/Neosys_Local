using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Sms.Models
{
    /// <summary>
    /// 대량문자관리 주소록 그룹 — rt_sms_group
    /// Members/Recipients 는 DB jsonb 를 text 로 반환한 JSON 문자열(프론트에서 parse)
    /// </summary>
    public class SmsGroup
    {
        public long GroupId { get; set; }
        public long? OffNo { get; set; }
        public long? RtNo { get; set; }
        public string? GroupName { get; set; }
        public string? GroupMemo { get; set; }
        public string? Members { get; set; }   // jsonb::text — [{name,phone,memo}]
        public int MemberCount { get; set; }
        public DateTime? RegDt { get; set; }
        public DateTime? UpdDt { get; set; }
    }

    public class SmsGroupCreateDto
    {
        [Required]
        public long OffNo { get; set; }
        public long? RtNo { get; set; }
        [Required]
        public string GroupName { get; set; } = default!;
        public string? GroupMemo { get; set; }
        /// <summary>멤버 배열 — [{name,phone,memo}]</summary>
        public List<SmsMemberDto>? Members { get; set; }
        public string? RegId { get; set; }
    }

    public class SmsGroupUpdateDto
    {
        public string? GroupName { get; set; }
        public string? GroupMemo { get; set; }
        public string? UpdId { get; set; }
    }

    public class SmsMemberDto
    {
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? Memo { get; set; }
    }

    /// <summary>
    /// 문자 발송 이력 — rt_sms_send_hist
    /// </summary>
    public class SmsSendHistory
    {
        public long SendId { get; set; }
        public long? GroupId { get; set; }
        public long? OffNo { get; set; }
        public long? RtNo { get; set; }
        public string? GroupName { get; set; }
        public string? SendMessage { get; set; }
        public string? Recipients { get; set; }  // jsonb::text — [{name,phone}]
        public int RecipientCount { get; set; }
        public string? SendType { get; set; }
        public string? SendStatus { get; set; }
        public DateTime? RegDt { get; set; }
    }

    public class SmsSendDto
    {
        [Required]
        public long OffNo { get; set; }
        public long? RtNo { get; set; }
        public long? GroupId { get; set; }
        public string? GroupName { get; set; }
        [Required]
        public string SendMessage { get; set; } = default!;
        /// <summary>수신자 배열 — [{name,phone}]</summary>
        public List<SmsMemberDto>? Recipients { get; set; }
        public string? SendType { get; set; }
        public string? RegId { get; set; }
    }
}

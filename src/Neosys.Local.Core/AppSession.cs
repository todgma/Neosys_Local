namespace Neosys.Local.Core;

/// <summary>로그인한 중개사. 로컬 데이터의 rt_no / off_no / reg_id·upd_id 에 쓴다.</summary>
public sealed class AppSession
{
    public long RtNo { get; init; }
    public long? OffNo { get; init; }
    public string UserId { get; init; } = "";
    public string? RtNm { get; init; }
    public string? RtType { get; init; }
    public string? Grade { get; init; }
    public string? OffNm { get; set; }
    /// <summary>대표 추천인 코드(서버 계정 정보 referralCode)</summary>
    public string? ReferralCode { get; init; }
    /// <summary>대시보드 인사말(사무소 공유 office.greeting)</summary>
    public string? Greeting { get; set; }

    /// <summary>대표(RTTYP01)는 메뉴 제한 없음. 그 외 직원은 AllowedMenus에 있는 메뉴만(기존 대시보드와 동일)</summary>
    public bool IsOwner => RtType == "RTTYP01";

    /// <summary>직원 허용 메뉴 키(rt_menu_perm). null = 제한 없음</summary>
    public IReadOnlySet<string>? AllowedMenus { get; set; }

    /// <summary>SP 공통 파라미터 — SQL에서 @session_rt_no, @session_off_no, @session_user_id 로 쓴다.</summary>
    public object Params => new { session_rt_no = RtNo, session_off_no = OffNo, session_user_id = UserId };
}

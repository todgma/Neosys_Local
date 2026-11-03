using System.Text.RegularExpressions;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>회원가입 입력값 — 기존 SignupPage(중개사무소 대표자 가입)</summary>
public sealed class SignupForm
{
    public string RtNm { get; set; } = "";
    public string RtTel { get; set; } = "";
    public string Id { get; set; } = "";
    /// <summary>아이디 중복확인을 마친 아이디(이후 바꾸면 다시 확인)</summary>
    public string? CheckedId { get; set; }
    public string Email { get; set; } = "";
    public string Pw { get; set; } = "";
    public string PwConfirm { get; set; } = "";
    public string OffNm { get; set; } = "";
    public string OffTel { get; set; } = "";
    public string OffAddr { get; set; } = "";
    public string OffRegNo { get; set; } = "";
    public string BizNo { get; set; } = "";
    /// <summary>추천인 '있음' 선택</summary>
    public bool HasReferral { get; set; }
    public string ReferralCode { get; set; } = "";
    /// <summary>추천인 확인을 마친 코드(이후 바꾸면 다시 확인)</summary>
    public string? CheckedReferralCode { get; set; }
    /// <summary>사업자등록증(SYFDV03)·개설등록증(SYFDV04) — 스토리지에 올린 파일 메타(ServerApi.UploadToStorageAsync). 선택</summary>
    public Row? BizFile { get; set; }
    public Row? OpenFile { get; set; }
}

/// <summary>회원가입 검증과 서버 요청 본문(POST /api/realestaters — 기존 authService.register와 같은 필드)</summary>
public static class SignupRules
{
    public const string BizFileDiv = "SYFDV03";
    public const string OpenFileDiv = "SYFDV04";
    public const string OwnerType = "RTTYP01";   // 회원가입은 대표만

    /// <summary>첫 번째 문제 문구(문제가 없으면 null)</summary>
    public static string? Validate(SignupForm f)
    {
        if (f.RtNm.Trim().Length == 0) return "이름을 입력해주세요.";
        if (f.RtTel.Trim().Length == 0) return "휴대폰번호를 입력해주세요.";
        if (!Regex.IsMatch(f.RtTel.Trim(), "^[0-9-]+$")) return "올바른 전화번호 형식이 아닙니다.";
        if (f.Id.Trim().Length == 0) return "아이디를 입력해주세요.";
        if (f.Id.Trim().Length < 4) return "아이디는 최소 4자 이상이어야 합니다.";
        if (f.CheckedId != f.Id.Trim()) return "아이디 중복확인을 해주세요.";
        if (f.Email.Trim().Length == 0) return "이메일을 입력해주세요.";
        if (!Regex.IsMatch(f.Email.Trim(), @"^[^\s@]+@[^\s@]+\.[^\s@]+$")) return "올바른 이메일 형식이 아닙니다.";
        if (f.Pw.Length == 0) return "비밀번호를 입력해주세요.";
        if (f.Pw.Length < 6) return "비밀번호는 최소 6자 이상이어야 합니다.";
        if (f.Pw != f.PwConfirm) return "비밀번호가 일치하지 않습니다.";
        if (f.OffNm.Trim().Length == 0) return "사무소명을 입력해주세요.";
        if (f.OffTel.Trim().Length == 0) return "사무소 전화를 입력해주세요.";
        if (f.OffAddr.Trim().Length == 0) return "사무소 소재지를 입력해주세요.";
        if (f.OffRegNo.Trim().Length == 0) return "개설등록번호를 입력해주세요.";
        if (f.BizNo.Trim().Length == 0) return "사업자등록번호를 입력해주세요.";
        if (f.HasReferral)
        {
            if (f.ReferralCode.Trim().Length == 0) return "추천인 코드를 입력하거나 [없음]을 선택하세요.";
            if (f.CheckedReferralCode != f.ReferralCode.Trim()) return "추천인 코드 [확인]을 먼저 눌러주세요.";
        }
        return null;
    }

    /// <summary>
    /// 서버 RealestaterCreateDto 필드. 추천인 코드는 앞뒤 공백을 지워 보낸다 — 서버의 확인(referral-info)은 공백을 지우지만
    /// 가입 처리(ProcessReferralCode)는 그대로 비교해서, 공백이 있으면 추천 혜택 행이 들어가지 않는다.
    /// </summary>
    public static Dictionary<string, object?> BuildRequest(SignupForm f)
    {
        var id = f.Id.Trim();
        var regNo = f.OffRegNo.Trim();
        return new Dictionary<string, object?>
        {
            ["RtType"] = OwnerType, ["RtNm"] = f.RtNm.Trim(), ["RtTel"] = f.RtTel.Trim(), ["RtRegNo"] = regNo,   // 개설등록번호 하나로 중개사·사무소 등록번호 통합
            ["OffNo"] = null, ["Grade"] = "user", ["Id"] = id, ["Pw"] = f.Pw, ["UserId"] = id, ["Email"] = f.Email.Trim(),
            ["ReferralCode"] = f.HasReferral ? f.ReferralCode.Trim() : null,
            ["OffNm"] = f.OffNm.Trim(), ["OffAddr"] = f.OffAddr.Trim(), ["OffTel"] = f.OffTel.Trim(), ["OffFax"] = null, ["OffRegNo"] = regNo, ["BizNo"] = f.BizNo.Trim(),
            ["BizObjectKey"] = f.BizFile?.Str("objectKey"), ["BizOrigName"] = f.BizFile?.Str("origName"), ["BizContentType"] = f.BizFile?.Str("contentType"),
            ["BizFileSize"] = f.BizFile?.Long("fileSize"), ["BizExt"] = f.BizFile?.Str("ext"),
            ["OpenObjectKey"] = f.OpenFile?.Str("objectKey"), ["OpenOrigName"] = f.OpenFile?.Str("origName"), ["OpenContentType"] = f.OpenFile?.Str("contentType"),
            ["OpenFileSize"] = f.OpenFile?.Long("fileSize"), ["OpenExt"] = f.OpenFile?.Str("ext"),
        };
    }

    /// <summary>첨부 파일의 Content-Type(기존 accept: pdf·jpg·jpeg·png)</summary>
    public static string ContentType(string fileName) => Path.GetExtension(fileName).ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".png" => "image/png",
        _ => "image/jpeg",
    };
}

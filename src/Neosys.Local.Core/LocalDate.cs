using System.Globalization;

namespace Neosys.Local.Core;

/// <summary>
/// 날짜 문자열 도우미. "오늘"은 항상 로컬 시간 기준(DateTime.Today).
/// 기존 프런트는 toISOString()(UTC) 때문에 오전 9시 전 어제 날짜가 들어가는 버그가 있었다.
/// </summary>
public static class LocalDate
{
    public const string DateFormat = "yyyy-MM-dd";
    public const string DateTimeFormat = "yyyy-MM-dd HH:mm:ss";

    public static string Today => DateTime.Today.ToString(DateFormat, CultureInfo.InvariantCulture);
    public static string Now => DateTime.Now.ToString(DateTimeFormat, CultureInfo.InvariantCulture);

    public static string Format(DateTime d) => d.ToString(DateFormat, CultureInfo.InvariantCulture);

    /// <summary>"20261019", "2026.10.19", "2026-10-19 13:00" 등을 yyyy-MM-dd로. 해석 못 하면 null</summary>
    public static string? Normalize(string? s)
    {
        var d = Parse(s);
        return d is null ? null : Format(d.Value);
    }

    public static DateTime? Parse(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        s = s.Trim();
        string[] formats = { "yyyy-MM-dd", "yyyyMMdd", "yyyy.MM.dd", "yyyy/MM/dd", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy-MM-ddTHH:mm:ss", "yyyy-M-d", "yyyy.M.d" };
        if (DateTime.TryParseExact(s, formats, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var d)) return d;
        if (s.Length >= 10 && DateTime.TryParseExact(s[..10], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out d)) return d;
        return DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out d) ? d : null;
    }
}

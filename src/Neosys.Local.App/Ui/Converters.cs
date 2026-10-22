using System.Globalization;
using System.Windows;
using System.Windows.Data;
using Neosys.Local.Core;

namespace Neosys.Local.App.Ui;

/// <summary>금액·정수: 표시 "1,234" ↔ 저장 long. 빈 칸은 null.</summary>
public sealed class AmountConverter : IValueConverter
{
    public static readonly AmountConverter Instance = new();

    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) => value switch
    {
        null => "",
        long l => l.ToString("#,0", CultureInfo.InvariantCulture),
        int i => i.ToString("#,0", CultureInfo.InvariantCulture),
        double d => d.ToString("#,0.##", CultureInfo.InvariantCulture),
        decimal m => m.ToString("#,0.##", CultureInfo.InvariantCulture),
        string s when long.TryParse(s.Replace(",", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out var l2) => l2.ToString("#,0", CultureInfo.InvariantCulture),
        _ => value.ToString() ?? "",
    };

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var s = (value as string)?.Replace(",", "").Trim();
        if (string.IsNullOrEmpty(s)) return null;
        return long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var l) ? l : DependencyProperty.UnsetValue;
    }
}

/// <summary>소수(면적 등): 표시 그대로 ↔ 저장 decimal(double). 빈 칸은 null.</summary>
public sealed class DecimalConverter : IValueConverter
{
    public static readonly DecimalConverter Instance = new();

    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) => value switch
    {
        null => "",
        double d => d.ToString("0.##", CultureInfo.InvariantCulture),
        decimal m => m.ToString("0.##", CultureInfo.InvariantCulture),
        IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
        _ => value.ToString() ?? "",
    };

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var s = (value as string)?.Replace(",", "").Trim();
        if (string.IsNullOrEmpty(s)) return null;
        return double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : DependencyProperty.UnsetValue;
    }
}

/// <summary>날짜 문자열(yyyy-MM-dd) ↔ DatePicker.SelectedDate</summary>
public sealed class DateStringConverter : IValueConverter
{
    public static readonly DateStringConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        LocalDate.Parse(value?.ToString());

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is DateTime d ? LocalDate.Format(d) : null;
}

/// <summary>체크박스 ↔ 'Y' / 해제값(기본 null). parameter로 해제값 지정 가능(예: "N")</summary>
public sealed class YnConverter : IValueConverter
{
    public static readonly YnConverter Instance = new();

    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        string.Equals(value?.ToString(), "Y", StringComparison.OrdinalIgnoreCase) || value is true || value is 1L;

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is true ? "Y" : parameter as string;
}

/// <summary>목록 표시용: 코드값 → 이름(공통코드 또는 지정 사전)</summary>
public sealed class LookupConverter : IValueConverter
{
    private readonly Func<string, string?> _lookup;
    public LookupConverter(Func<string, string?> lookup) => _lookup = lookup;

    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var s = value?.ToString();
        if (string.IsNullOrEmpty(s)) return "";
        // 콤마로 여러 코드가 들어간 값은 각각 바꿔 이어 붙인다
        return string.Join(", ", s.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(c => _lookup(c) ?? c));
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => throw new NotSupportedException();
}

/// <summary>목록 표시용: 날짜/일시 문자열을 지정 길이로 자른다(예: 10 = yyyy-MM-dd)</summary>
public sealed class DateCutConverter : IValueConverter
{
    private readonly int _len;
    public DateCutConverter(int len) => _len = len;

    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var s = value?.ToString()?.Replace('T', ' ') ?? "";
        return s.Length > _len ? s[.._len] : s;
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => throw new NotSupportedException();
}

/// <summary>체크박스 ↔ 정수 1/0(기존 boolean 컬럼: 개발제한구역·건축허가 등)</summary>
public sealed class BoolIntConverter : IValueConverter
{
    public static readonly BoolIntConverter Instance = new();

    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is true or 1L or 1 || string.Equals(value?.ToString(), "1") || string.Equals(value?.ToString(), "true", StringComparison.OrdinalIgnoreCase);

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => value is true ? 1L : 0L;
}

using System.Windows;
using Neosys.Local.Core;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

public enum FieldKind
{
    Section, Text, Multiline, Amount, Int, Decimal, Date, Combo, EditableCombo, Radio, Check, CsvChecks,
    AmountRange, DecimalRange, DateRange, ReadOnly, Custom, Bool,
}

/// <summary>
/// 입력 폼 필드 정의. Key = Row 키(DB 컬럼명). FormBuilder가 이 정의로 라벨+입력 컨트롤을 만든다.
/// 예: F.Amount("sale_amt", "매매가", "만원"), F.Combo("pt_type", "물건유형", Catalog.PropertyTypes).Span(2)
/// </summary>
public sealed class FieldDef
{
    public string Key { get; init; } = "";
    public string? Key2 { get; init; }
    public string Label { get; init; } = "";
    public FieldKind Kind { get; init; }
    public IReadOnlyList<Opt> Options { get; init; } = Array.Empty<Opt>();
    public string? Unit { get; init; }
    public string? Placeholder { get; init; }
    public string? FalseValue { get; init; }
    public int ColSpan { get; private set; } = 1;
    public double Height { get; private set; } = 60;
    public bool IsRequired { get; private set; }
    public Func<Row, bool>? VisibleWhen { get; private set; }
    public Func<Row, FrameworkElement>? Factory { get; init; }

    /// <summary>행 배치(RowFormBuilder)에서 입력칸 너비</summary>
    public double EditorWidth { get; private set; } = double.NaN;

    public FieldDef Span(int n) { ColSpan = n; return this; }
    public FieldDef W(double width) { EditorWidth = width; return this; }
    public FieldDef Tall(double h) { Height = h; return this; }
    public FieldDef Required() { IsRequired = true; return this; }
    public FieldDef When(Func<Row, bool> predicate) { VisibleWhen = predicate; return this; }
}

/// <summary>FieldDef 생성 도우미</summary>
public static class F
{
    public static FieldDef Section(string title) => new() { Kind = FieldKind.Section, Label = title };
    public static FieldDef Text(string key, string label, string? placeholder = null) => new() { Key = key, Label = label, Kind = FieldKind.Text, Placeholder = placeholder };
    public static FieldDef Memo(string key, string label, double height = 60) => new FieldDef { Key = key, Label = label, Kind = FieldKind.Multiline }.Tall(height);
    public static FieldDef Amount(string key, string label, string? unit = "만원") => new() { Key = key, Label = label, Kind = FieldKind.Amount, Unit = unit };
    public static FieldDef Int(string key, string label, string? unit = null) => new() { Key = key, Label = label, Kind = FieldKind.Int, Unit = unit };
    public static FieldDef Dec(string key, string label, string? unit = null) => new() { Key = key, Label = label, Kind = FieldKind.Decimal, Unit = unit };
    public static FieldDef Date(string key, string label) => new() { Key = key, Label = label, Kind = FieldKind.Date };
    public static FieldDef Combo(string key, string label, IReadOnlyList<Opt> options) => new() { Key = key, Label = label, Kind = FieldKind.Combo, Options = options };
    public static FieldDef Combo(string key, string label, params string[] options) => Combo(key, label, Opt.Of(options));
    /// <summary>목록에서 고르거나 직접 입력</summary>
    public static FieldDef Edit(string key, string label, params string[] options) => new() { Key = key, Label = label, Kind = FieldKind.EditableCombo, Options = Opt.Of(options) };
    public static FieldDef Radio(string key, string label, IReadOnlyList<Opt> options) => new() { Key = key, Label = label, Kind = FieldKind.Radio, Options = options };
    public static FieldDef Check(string key, string label, string? text = null, string? falseValue = null) => new() { Key = key, Label = label, Kind = FieldKind.Check, Placeholder = text, FalseValue = falseValue };
    /// <summary>체크 = 1, 해제 = 0 (boolean 컬럼)</summary>
    public static FieldDef Bool(string key, string label, string? text = null) => new() { Key = key, Label = label, Kind = FieldKind.Bool, Placeholder = text };
    public static FieldDef Checks(string key, string label, IReadOnlyList<Opt> options) => new() { Key = key, Label = label, Kind = FieldKind.CsvChecks, Options = options };
    public static FieldDef AmountRange(string key, string key2, string label, string? unit = "만원") => new() { Key = key, Key2 = key2, Label = label, Kind = FieldKind.AmountRange, Unit = unit };
    public static FieldDef DecRange(string key, string key2, string label, string? unit = null) => new() { Key = key, Key2 = key2, Label = label, Kind = FieldKind.DecimalRange, Unit = unit };
    public static FieldDef DateRange(string key, string key2, string label) => new() { Key = key, Key2 = key2, Label = label, Kind = FieldKind.DateRange };
    public static FieldDef View(string key, string label) => new() { Key = key, Label = label, Kind = FieldKind.ReadOnly };
    public static FieldDef Custom(string label, Func<Row, FrameworkElement> factory) => new() { Label = label, Kind = FieldKind.Custom, Factory = factory };
}

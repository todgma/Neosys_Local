using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

/// <summary>
/// 기존 등록 폼(PropertyFormPageV2·CustomerFormPageV2)의 "행" 배치:
/// 왼쪽 90px 보라 라벨(Section 제목) + 오른쪽에 작은 라벨·입력칸을 한 줄로 이어 붙이고 넘치면 줄바꿈.
/// Section 제목에 "|"를 넣으면 아래 줄은 노란 작은 글씨(예: "금액|단위(만원)").
/// Span(2)·여러 줄·선택 목록은 한 줄을 다 쓴다. 칸 라벨이 행 라벨과 같으면 칸 라벨을 생략한다.
/// </summary>
public static class RowFormBuilder
{
    public const double LabelWidth = 90;

    public static FrameworkElement Build(Row row, IEnumerable<FieldDef> fields)
    {
        var root = new StackPanel();
        var groups = new List<(FrameworkElement Row, List<(FieldDef Def, UIElement El)> Items)>();

        StackPanel? body = null;
        WrapPanel? line = null;
        List<(FieldDef, UIElement)>? items = null;
        string? rowLabel = null;

        foreach (var f in fields)
        {
            if (f.Kind == FieldKind.Section || body is null)
            {
                rowLabel = f.Kind == FieldKind.Section ? f.Label : "";
                body = new StackPanel { Margin = new Thickness(6, 4, 6, 4), VerticalAlignment = VerticalAlignment.Center };
                items = new List<(FieldDef, UIElement)>();
                line = null;
                var rowEl = MakeRow(rowLabel, body);
                root.Children.Add(rowEl);
                groups.Add((rowEl, items));
                if (f.Kind == FieldKind.Section) continue;
            }

            var showLabel = f.Label != rowLabel?.Split('|')[0] && !string.IsNullOrEmpty(f.Label);
            if (IsWide(f))
            {
                var dp = new DockPanel { Margin = new Thickness(0, 2, 0, 2) };
                if (showLabel)
                {
                    var l = SmallLabel(f);
                    l.VerticalAlignment = f.Kind == FieldKind.Multiline ? VerticalAlignment.Top : VerticalAlignment.Center;
                    DockPanel.SetDock(l, Dock.Left);
                    dp.Children.Add(l);
                }
                dp.Children.Add(FormBuilder.MakeEditor(row, f));
                body!.Children.Add(dp);
                items!.Add((f, dp));
                line = null;
            }
            else
            {
                if (line is null)
                {
                    line = new WrapPanel();
                    body!.Children.Add(line);
                }
                var sp = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 2, 10, 2) };
                if (showLabel) sp.Children.Add(SmallLabel(f));
                var ed = FormBuilder.MakeEditor(row, f);
                if (ed is FrameworkElement fe && double.IsNaN(fe.Width)) fe.Width = double.IsNaN(f.EditorWidth) ? WidthOf(f) : f.EditorWidth;
                sp.Children.Add(ed);
                line.Children.Add(sp);
                items!.Add((f, sp));
            }
        }

        void Layout()
        {
            foreach (var (rowEl, list) in groups)
            {
                var any = false;
                foreach (var (def, el) in list)
                {
                    var v = def.VisibleWhen?.Invoke(row) ?? true;
                    el.Visibility = v ? Visibility.Visible : Visibility.Collapsed;
                    any |= v;
                }
                rowEl.Visibility = any ? Visibility.Visible : Visibility.Collapsed;
            }
        }

        Layout();
        PropertyChangedEventHandler h = (_, _) => Layout();
        root.Loaded += (_, _) => { row.PropertyChanged -= h; row.PropertyChanged += h; Layout(); };
        root.Unloaded += (_, _) => row.PropertyChanged -= h;
        return new Border { BorderBrush = Brush("#CBD5E1"), BorderThickness = new Thickness(1, 1, 1, 0), Child = root };
    }

    /// <summary>보라 라벨 + 내용 한 행(아래 테두리)</summary>
    public static FrameworkElement MakeRow(string label, UIElement content, double? minHeight = null)
    {
        var g = new Grid { MinHeight = minHeight ?? 34 };
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(LabelWidth) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        var parts = label.Split('|');
        var text = new StackPanel { VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Center };
        text.Children.Add(new TextBlock { Text = parts[0], Foreground = Brushes.White, FontWeight = FontWeights.SemiBold, FontSize = 14, TextAlignment = TextAlignment.Center, TextWrapping = TextWrapping.Wrap });
        if (parts.Length > 1)
            text.Children.Add(new TextBlock { Text = parts[1], Foreground = Brush("#FEF08A"), FontSize = 12, Margin = new Thickness(0, 6, 0, 0), TextAlignment = TextAlignment.Center });
        var lb = new Border { Background = Brush("#8B7AD8"), BorderBrush = Brush("#5B4AA8"), BorderThickness = new Thickness(1), Padding = new Thickness(6), Child = text };
        g.Children.Add(lb);
        if (content is FrameworkElement fe) Grid.SetColumn(fe, 1);
        g.Children.Add(content);
        return new Border { BorderBrush = Brush("#CBD5E1"), BorderThickness = new Thickness(0, 0, 0, 1), Child = g };
    }

    public static TextBlock SmallLabel(FieldDef f) => SmallLabel(f.IsRequired ? f.Label + "*" : f.Label);

    public static TextBlock SmallLabel(string text) => new()
    {
        Text = text, FontSize = 12, FontWeight = FontWeights.SemiBold, Foreground = Brush("#111827"),
        VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 4, 0),
    };

    private static bool IsWide(FieldDef f) =>
        f.ColSpan > 1 || f.Kind is FieldKind.Multiline or FieldKind.CsvChecks;

    private static double WidthOf(FieldDef f) => f.Kind switch
    {
        FieldKind.Amount or FieldKind.Int or FieldKind.Decimal => string.IsNullOrEmpty(f.Unit) ? 80 : 80 + 14 + f.Unit.Length * 10,
        FieldKind.Date => 120,
        FieldKind.Combo or FieldKind.EditableCombo => 110,
        FieldKind.Text => 110,
        FieldKind.AmountRange or FieldKind.DecimalRange => 200,
        FieldKind.DateRange => 260,
        _ => double.NaN,
    };

    private static SolidColorBrush Brush(string hex) => (SolidColorBrush)new BrushConverter().ConvertFromString(hex)!;
}

using Neosys.Local.Core;
using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Automation;
using System.Windows.Data;
using System.Windows.Media;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

/// <summary>
/// FieldDef 목록으로 "보라색 라벨 + 입력칸" 표 형태의 폼을 만든다(기존 등록 창 레이아웃).
/// 모든 입력은 Row[key]에 양방향 바인딩된다. VisibleWhen이 있는 필드는 Row 값이 바뀔 때마다 다시 판단한다.
/// </summary>
public static class FormBuilder
{
    public static FrameworkElement Build(Row row, IEnumerable<FieldDef> fields, int columns = 2)
    {
        var grid = new Grid { Margin = new Thickness(0) };
        for (int c = 0; c < columns; c++)
        {
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto, MinWidth = 100 });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        }

        // 필드마다 라벨·입력칸(또는 섹션 제목)을 만들어 두고, 배치는 보이는 것만으로 다시 계산한다(숨긴 칸이 빈자리로 남지 않게)
        var entries = new List<(FieldDef Def, UIElement? Label, UIElement Main)>();
        foreach (var f in fields)
        {
            if (f.Kind == FieldKind.Section)
            {
                var header = new TextBlock { Text = f.Label, Style = (Style)Application.Current.FindResource("SectionHeader") };
                grid.Children.Add(header);
                entries.Add((f, null, header));
                continue;
            }
            var label = MakeLabel(f);
            var cell = new Border
            {
                BorderBrush = (Brush)Application.Current.FindResource("Border"),
                BorderThickness = new Thickness(0, 0, 1, 1),
                Padding = new Thickness(4, 3, 4, 3),
                Child = MakeEditor(row, f),
            };
            grid.Children.Add(label);
            grid.Children.Add(cell);
            entries.Add((f, label, cell));
        }

        void Layout()
        {
            grid.RowDefinitions.Clear();
            int r = -1, col = columns;
            foreach (var (def, label, main) in entries)
            {
                var visible = def.VisibleWhen?.Invoke(row) ?? true;
                var vis = visible ? Visibility.Visible : Visibility.Collapsed;
                main.Visibility = vis;
                if (label is not null) label.Visibility = vis;
                if (!visible) continue;

                if (def.Kind == FieldKind.Section)
                {
                    grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                    r++;
                    Grid.SetRow(main, r);
                    Grid.SetColumn(main, 0);
                    Grid.SetColumnSpan(main, columns * 2);
                    col = columns;
                    continue;
                }
                var span = Math.Min(def.ColSpan, columns);
                if (col + span > columns)
                {
                    grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                    r++;
                    col = 0;
                }
                Grid.SetRow(label!, r);
                Grid.SetColumn(label!, col * 2);
                Grid.SetRow(main, r);
                Grid.SetColumn(main, col * 2 + 1);
                Grid.SetColumnSpan(main, span * 2 - 1);
                col += span;
            }
        }

        Layout();
        if (entries.Any(e => e.Def.VisibleWhen is not null))
        {
            // 조건 필드가 있으면 값이 바뀔 때마다 다시 배치(보이는 항목이 실제로 바뀐 경우에만)
            string Signature() => string.Concat(entries.Select(e => e.Def.VisibleWhen?.Invoke(row) ?? true ? '1' : '0'));
            var last = Signature();
            PropertyChangedEventHandler h = (_, _) =>
            {
                var now = Signature();
                if (now == last) return;
                last = now;
                Layout();
            };
            row.PropertyChanged += h;
            grid.Unloaded += (_, _) => row.PropertyChanged -= h;
            grid.Loaded += (_, _) => { row.PropertyChanged -= h; row.PropertyChanged += h; last = Signature(); Layout(); };
        }
        return grid;
    }

    private static Border MakeLabel(FieldDef f) => new()
    {
        Style = (Style)Application.Current.FindResource("FieldLabel"),
        Child = new TextBlock
        {
            Text = f.IsRequired ? f.Label + " *" : f.Label,
            Foreground = (Brush)Application.Current.FindResource("LabelFore"),
            FontWeight = FontWeights.SemiBold,
            VerticalAlignment = VerticalAlignment.Center,
            HorizontalAlignment = HorizontalAlignment.Center,
            TextWrapping = TextWrapping.Wrap,
        },
    };

    public static FrameworkElement MakeEditor(Row row, FieldDef f)
    {
        switch (f.Kind)
        {
            case FieldKind.Text:
                return MakeTextBox(row, f.Key, f.Placeholder);
            case FieldKind.Multiline:
            {
                var tb = MakeTextBox(row, f.Key, f.Placeholder);
                tb.AcceptsReturn = true;
                tb.TextWrapping = TextWrapping.Wrap;
                tb.VerticalContentAlignment = VerticalAlignment.Top;
                tb.Height = f.Height;
                tb.VerticalScrollBarVisibility = ScrollBarVisibility.Auto;
                return tb;
            }
            case FieldKind.Amount:
            case FieldKind.Int:
                return WithUnit(MakeNumberBox(row, f.Key, AmountConverter.Instance), f.Unit);
            case FieldKind.Decimal:
                return WithUnit(MakeNumberBox(row, f.Key, DecimalConverter.Instance), f.Unit);
            case FieldKind.Date:
                return MakeDateBox(row, f.Key);
            case FieldKind.Combo:
                return MakeCombo(row, f.Key, f.Options);
            case FieldKind.EditableCombo:
            {
                var cb = new ComboBox { IsEditable = true, ItemsSource = f.Options, DisplayMemberPath = nameof(Opt.Label) };
                cb.SetBinding(ComboBox.TextProperty, new Binding($"[{f.Key}]") { Source = row, Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.LostFocus });
                return Id(cb, f.Key);
            }
            case FieldKind.Radio:
                return Id(RadioGroup.Bound(f.Options, row, f.Key), f.Key);
            case FieldKind.Check:
            {
                var cb = new CheckBox { Content = f.Placeholder ?? "" };
                cb.SetBinding(ToggleButtonIsChecked, new Binding($"[{f.Key}]")
                {
                    Source = row, Mode = BindingMode.TwoWay, Converter = YnConverter.Instance, ConverterParameter = f.FalseValue,
                });
                return Id(cb, f.Key);
            }
            case FieldKind.Bool:
            {
                var cb = new CheckBox { Content = f.Placeholder ?? "" };
                cb.SetBinding(ToggleButtonIsChecked, new Binding($"[{f.Key}]") { Source = row, Mode = BindingMode.TwoWay, Converter = BoolIntConverter.Instance });
                return Id(cb, f.Key);
            }
            case FieldKind.CsvChecks:
            {
                var list = new CsvCheckList(f.Options);
                list.SetBinding(CsvCheckList.ValueProperty, new Binding($"[{f.Key}]") { Source = row, Mode = BindingMode.TwoWay });
                return Id(list, f.Key);
            }
            case FieldKind.AmountRange:
                return Range(MakeNumberBox(row, f.Key, AmountConverter.Instance), MakeNumberBox(row, f.Key2!, AmountConverter.Instance), f.Unit);
            case FieldKind.DecimalRange:
                return Range(MakeNumberBox(row, f.Key, DecimalConverter.Instance), MakeNumberBox(row, f.Key2!, DecimalConverter.Instance), f.Unit);
            case FieldKind.DateRange:
                return Range(MakeDateBox(row, f.Key), MakeDateBox(row, f.Key2!), null);
            case FieldKind.ReadOnly:
            {
                var t = new TextBlock { VerticalAlignment = VerticalAlignment.Center, TextWrapping = TextWrapping.Wrap };
                t.SetBinding(TextBlock.TextProperty, new Binding($"[{f.Key}]") { Source = row, Mode = BindingMode.OneWay });
                return t;
            }
            case FieldKind.Custom:
                return f.Factory!(row);
            default:
                throw new NotSupportedException(f.Kind.ToString());
        }
    }

    /// <summary>입력칸에 DB 컬럼 키를 AutomationId로 단다(접근성 도구·디버그 화면 점검이 칸을 찾을 때)</summary>
    public static T Id<T>(T element, string key) where T : FrameworkElement
    {
        AutomationProperties.SetAutomationId(element, key);
        return element;
    }

    private static readonly DependencyProperty ToggleButtonIsChecked = System.Windows.Controls.Primitives.ToggleButton.IsCheckedProperty;

    public static TextBox MakeTextBox(Row row, string key, string? placeholder = null)
    {
        var tb = new TextBox { ToolTip = placeholder, Style = (Style)Application.Current.FindResource("FormTextBox") };
        tb.SetBinding(TextBox.TextProperty, new Binding($"[{key}]")
        {
            Source = row, Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged, TargetNullValue = "",
        });
        if (!string.IsNullOrEmpty(placeholder)) Placeholder.Set(tb, placeholder);
        return Id(tb, key);
    }

    public static TextBox MakeNumberBox(Row row, string key, IValueConverter converter)
    {
        var tb = new TextBox { TextAlignment = TextAlignment.Right, MinWidth = 70 };
        tb.SetBinding(TextBox.TextProperty, new Binding($"[{key}]")
        {
            Source = row, Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.LostFocus, Converter = converter,
        });
        return Id(tb, key);
    }

    public static DatePicker MakeDateBox(Row row, string key)
    {
        var dp = new DatePicker { MinWidth = 120, SelectedDateFormat = DatePickerFormat.Short };
        dp.SetBinding(DatePicker.SelectedDateProperty, new Binding($"[{key}]")
        {
            Source = row, Mode = BindingMode.TwoWay, Converter = DateStringConverter.Instance,
        });
        return Id(dp, key);
    }

    public static ComboBox MakeCombo(Row row, string key, IReadOnlyList<Opt> options) =>
        MakeDynamicCombo(row, key, _ => options, null);

    /// <summary>
    /// 선택 콤보. Row 값과 직접 동기화한다(바인딩 대신) — 목록에 없는 기존 값은 항목으로 덧붙여 보존하고,
    /// 화면에서 고를 때만 Row에 쓴다(숨겨진 콤보가 값을 지우는 일이 없도록).
    /// dependsOn 키가 바뀌면 options(row)로 목록을 다시 만든다(예: 물건유형별 세부유형).
    /// </summary>
    public static ComboBox MakeDynamicCombo(Row row, string key, Func<Row, IReadOnlyList<Opt>> options, string? dependsOn)
    {
        var cb = new ComboBox { DisplayMemberPath = nameof(Opt.Label), SelectedValuePath = nameof(Opt.Value), MinWidth = 90 };
        var syncing = false;

        void Rebuild()
        {
            syncing = true;
            var items = new List<Opt> { new("", "선택") };
            items.AddRange(options(row));
            var cur = row.Str(key);
            if (!string.IsNullOrEmpty(cur) && items.All(o => o.Value != cur)) items.Add(new Opt(cur, cur));
            cb.ItemsSource = items;
            cb.SelectedValue = cur ?? "";
            syncing = false;
        }

        void SyncValue()
        {
            var cur = row.Str(key) ?? "";
            if (Equals(cb.SelectedValue as string ?? "", cur)) return;
            if (cb.ItemsSource is List<Opt> items && items.All(o => o.Value != cur)) { Rebuild(); return; }
            syncing = true;
            cb.SelectedValue = cur;
            syncing = false;
        }

        cb.SelectionChanged += (_, _) =>
        {
            if (syncing || !cb.IsLoaded) return;
            var v = cb.SelectedValue as string;
            row[key] = string.IsNullOrEmpty(v) ? null : v;
        };
        System.ComponentModel.PropertyChangedEventHandler h = (_, e) =>
        {
            if (e.PropertyName == key) SyncValue();
            else if (dependsOn is not null && e.PropertyName == dependsOn) Rebuild();
        };
        cb.Loaded += (_, _) => { row.PropertyChanged -= h; row.PropertyChanged += h; Rebuild(); };
        cb.Unloaded += (_, _) => row.PropertyChanged -= h;
        Rebuild();
        return Id(cb, key);
    }

    private static FrameworkElement WithUnit(FrameworkElement box, string? unit)
    {
        if (string.IsNullOrEmpty(unit)) return box;
        var dp = new DockPanel();
        var u = new TextBlock { Text = unit, Margin = new Thickness(4, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center, Foreground = Brushes.SlateGray };
        DockPanel.SetDock(u, Dock.Right);
        dp.Children.Add(u);
        dp.Children.Add(box);
        return dp;
    }

    private static FrameworkElement Range(FrameworkElement a, FrameworkElement b, string? unit)
    {
        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        var tilde = new TextBlock { Text = " ~ ", VerticalAlignment = VerticalAlignment.Center };
        Grid.SetColumn(tilde, 1);
        Grid.SetColumn(b, 2);
        g.Children.Add(a);
        g.Children.Add(tilde);
        g.Children.Add(b);
        if (!string.IsNullOrEmpty(unit))
        {
            var u = new TextBlock { Text = unit, Margin = new Thickness(4, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center, Foreground = Brushes.SlateGray };
            Grid.SetColumn(u, 3);
            g.Children.Add(u);
        }
        return g;
    }
}

/// <summary>콤보박스 "선택"(빈 값) → null</summary>
public sealed class EmptyToNull : IValueConverter
{
    public static readonly EmptyToNull Instance = new();
    public object? Convert(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture) => value?.ToString() ?? "";
    public object? ConvertBack(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture) =>
        value is string s && s.Length == 0 ? null : value;
}

/// <summary>TextBox 안내 문구(빈 칸일 때 회색 글씨)</summary>
public static class Placeholder
{
    // 기존 Tailwind preflight 안내 문구 색(#9ca3af)
    private static readonly Brush HintColor = new SolidColorBrush(Color.FromRgb(0x9C, 0xA3, 0xAF));

    /// <param name="left">글자 시작 위치(칸 왼쪽 안쪽 여백 — 달력 아이콘이 있는 날짜 칸은 22)</param>
    public static void Set(TextBox tb, string text, double left = 5)
    {
        var hint = new VisualBrush
        {
            Stretch = Stretch.None,
            AlignmentX = AlignmentX.Left,
            // 여백까지 그림 범위에 넣으려고 투명 바탕 Border로 감싼다(VisualBrush는 그려진 부분만 잡는다)
            Visual = new Border { Background = Brushes.Transparent, Padding = new Thickness(left, 0, 0, 0), Child = new TextBlock { Text = text, Foreground = HintColor, FontSize = tb.FontSize } },
        };
        void Update() => tb.Background = string.IsNullOrEmpty(tb.Text) && !tb.IsKeyboardFocused ? hint : Brushes.White;
        tb.TextChanged += (_, _) => Update();
        tb.GotKeyboardFocus += (_, _) => Update();
        tb.LostKeyboardFocus += (_, _) => Update();
        tb.Loaded += (_, _) => Update();
    }
}

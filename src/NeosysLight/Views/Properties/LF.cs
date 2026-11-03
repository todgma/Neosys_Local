using System.ComponentModel;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 물건 등록 유형별 폼(기존 propertyForm/*.jsx) 화면 부품 — 기존 inline style 값을 그대로 옮긴 것.
///   Section: 보라 라벨 90px(14px·500, 아래 노란 12px 보조 글) + 내용(padding 6) + 아래 선
///   Flow: 한 줄(gap 8, 넘치면 줄바꿈) / Pair: 라벨(13px·500) + 칸 + 단위
///   칸: Txt·Amt(천단위 쉼표, 오른쪽 정렬)·Num·Sel(select)·Date(달력 아이콘 + YY.MM.DD)·Chk
/// 모든 칸은 AutomationId = DB 칸 이름(점검 도구가 찾는 이름).
/// </summary>
internal static class LF
{
    public static readonly Brush Line = Legacy.B("#CBD5E1"), Purple = Legacy.B("#8B7AD8"), PurpleLine = Legacy.B("#5B4AA8"), Sub = Legacy.B("#FEF08A"), Gray = Legacy.B("#64748B");

    // ================= 행 =================

    /// <summary>보라 라벨 + 내용 한 행. sub는 줄마다 노란 보조 글(예: "단위(만원)\n관리비(원)")</summary>
    /// <param name="subTop">보조 글 위 여백(유형별 폼 대부분 8px, 아파트 0)</param>
    public static Border Section(string label, string? sub, UIElement content, Action<UIElement>? labelExtra = null, Action? labelClick = null, double minHeight = 0, double subTop = 0)
    {
        var g = new Grid { MinHeight = minHeight };
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(90) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        var lab = new StackPanel { VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Center };
        var head = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center };
        head.Children.Add(new TextBlock { Text = label, FontSize = 14, FontWeight = FontWeights.Medium, Foreground = Brushes.White, VerticalAlignment = VerticalAlignment.Center });
        if (labelExtra is not null) labelExtra(head);
        lab.Children.Add(head);
        if (!string.IsNullOrEmpty(sub))
        {
            var first = true;
            foreach (var s in sub.Split('\n'))
            {
                lab.Children.Add(new TextBlock { Text = s, FontSize = 12, FontWeight = FontWeights.Medium, Foreground = Sub, HorizontalAlignment = HorizontalAlignment.Center, LineHeight = 16.8, Margin = new Thickness(0, first ? subTop : 0, 0, 0) });
                first = false;
            }
        }
        var labelBox = new Border { Background = Purple, BorderBrush = PurpleLine, BorderThickness = new Thickness(1), Padding = new Thickness(6), Child = lab };
        if (labelClick is not null)
        {
            labelBox.Cursor = Cursors.Hand;
            labelBox.MouseLeftButtonUp += (_, _) => labelClick();
        }
        g.Children.Add(labelBox);
        var body = new Border { Padding = new Thickness(6), Child = content, VerticalAlignment = VerticalAlignment.Center };
        Grid.SetColumn(body, 1);
        g.Children.Add(body);
        return new Border { BorderBrush = Line, BorderThickness = new Thickness(0, 0, 0, 1), Child = g };
    }

    /// <summary>세로 줄 묶음(gap 6)</summary>
    public static StackPanel Lines(params UIElement?[] lines)
    {
        var sp = new StackPanel();
        var first = true;
        foreach (var l in lines)
        {
            if (l is null) continue;
            if (l is FrameworkElement fe && !first) fe.Margin = new Thickness(fe.Margin.Left, 6, fe.Margin.Right, fe.Margin.Bottom);
            sp.Children.Add(l);
            first = false;
        }
        return sp;
    }

    /// <summary>한 줄(display:flex; gap; flex-wrap) — null은 건너뜀</summary>
    public static WrapPanel Flow(double gap, params UIElement?[] items)
    {
        // 마지막 칸 뒤 간격은 폭에 넣지 않는다(CSS gap) — 오른쪽을 gap만큼 당겨 둔다
        var wp = new WrapPanel { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, -gap, 0) };
        foreach (var it in items)
        {
            if (it is null) continue;
            if (it is FrameworkElement fe) fe.Margin = new Thickness(0, 0, gap, 0);
            wp.Children.Add(it);
        }
        return wp;
    }

    public static WrapPanel Flow(params UIElement?[] items) => Flow(8, items);

    /// <summary>앞은 고정, 마지막 칸이 남은 폭을 채우는 줄(flex:1 입력창)</summary>
    public static DockPanel Fill(double gap, UIElement last, params UIElement?[] fixedItems)
    {
        var dp = new DockPanel { LastChildFill = true };
        foreach (var it in fixedItems)
        {
            if (it is null) continue;
            if (it is FrameworkElement fe) fe.Margin = new Thickness(0, 0, gap, 0);
            DockPanel.SetDock(it, Dock.Left);
            dp.Children.Add(it);
        }
        dp.Children.Add(last);
        return dp;
    }

    public static TextBlock Label(string text, double size = 13, FontWeight? weight = null) =>
        new() { Text = text, FontSize = size, FontWeight = weight ?? FontWeights.Medium, VerticalAlignment = VerticalAlignment.Center };

    public static TextBlock Unit(string text, bool gray = false)
    {
        var t = new TextBlock { Text = text, FontSize = 13, FontWeight = gray ? FontWeights.Normal : FontWeights.Medium, VerticalAlignment = VerticalAlignment.Center };
        if (gray) t.Foreground = Gray;
        return t;
    }

    /// <summary>라벨 + 칸 (+ 단위) — gap 4</summary>
    public static StackPanel Pair(string label, FrameworkElement editor, string? unit = null, bool grayUnit = false)
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        if (label.Length > 0)
        {
            var l = Label(label);
            l.Margin = new Thickness(0, 0, 4, 0);
            sp.Children.Add(l);
        }
        sp.Children.Add(editor);
        if (unit is not null)
        {
            var u = Unit(unit, grayUnit);
            u.Margin = new Thickness(4, 0, 0, 0);
            sp.Children.Add(u);
        }
        return sp;
    }

    /// <summary>라벨 + 남은 폭을 채우는 칸(flex:1)</summary>
    public static DockPanel PairFill(string label, FrameworkElement editor)
    {
        var l = Label(label);
        return Fill(4, editor, l);
    }

    // ================= 칸 =================

    private static Style Input => (Style)Application.Current.FindResource("FormInput");
    private static Style Select => (Style)Application.Current.FindResource("FormSelect");

    /// <summary>Row 값 ↔ 글자 칸(입력 즉시 반영). width &lt; 0 이면 폭 자동(채우기)</summary>
    public static TextBox Txt(Row p, string key, double width, string placeholder = "", bool right = false, double height = 22)
    {
        var tb = new TextBox { Style = Input, Height = height, TextAlignment = right ? TextAlignment.Right : TextAlignment.Left };
        if (width >= 0) tb.Width = width;
        if (placeholder.Length > 0) Placeholder.Set(tb, placeholder);
        var syncing = false;
        void FromRow() { syncing = true; tb.Text = p.Str(key) ?? ""; syncing = false; }
        FromRow();
        tb.TextChanged += (_, _) => { if (!syncing) p[key] = tb.Text.Length > 0 ? tb.Text : null; };
        Watch(tb, p, key, () => { if (!tb.IsKeyboardFocusWithin) FromRow(); });
        return FormBuilder.Id(tb, key);
    }

    /// <summary>여러 줄 입력(textarea)</summary>
    public static TextBox Area(Row p, string key, string placeholder, double height)
    {
        var tb = Txt(p, key, -1, placeholder, height: height);
        tb.AcceptsReturn = true;
        tb.TextWrapping = TextWrapping.Wrap;
        tb.VerticalContentAlignment = VerticalAlignment.Top;
        tb.VerticalScrollBarVisibility = ScrollBarVisibility.Auto;
        return tb;
    }

    /// <summary>기존 AmountInput: 숫자만, 천단위 쉼표, 오른쪽 정렬(decimal이면 소수 허용·쉼표 없음)</summary>
    public static TextBox Amt(Row p, string key, double width, string placeholder = "", bool decimalValue = false, bool border = true)
    {
        var tb = new TextBox { Style = Input, TextAlignment = TextAlignment.Right };
        if (width >= 0) tb.Width = width;
        if (!border) { tb.BorderThickness = new Thickness(0); }
        if (placeholder.Length > 0) Placeholder.Set(tb, placeholder);
        var syncing = false;
        string Show(object? v)
        {
            var s = v?.ToString() ?? "";
            if (s.Length == 0) return "";
            if (decimalValue) return double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d.ToString("0.##", CultureInfo.InvariantCulture) : s;
            return long.TryParse(s.Replace(",", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out var l) ? l.ToString("#,0", CultureInfo.InvariantCulture)
                : double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d2) ? ((long)d2).ToString("#,0", CultureInfo.InvariantCulture) : s;
        }
        void FromRow() { syncing = true; tb.Text = Show(p[key]); syncing = false; }
        FromRow();
        tb.TextChanged += (_, _) =>
        {
            if (syncing) return;
            var raw = decimalValue ? new string(tb.Text.Where(c => char.IsDigit(c) || c == '.').ToArray()) : new string(tb.Text.Where(char.IsDigit).ToArray());
            if (raw.Length == 0) { p[key] = null; }
            else if (decimalValue) p[key] = double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : null;
            else p[key] = long.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var l) ? l : null;
            if (!decimalValue)
            {
                // 입력 중에도 쉼표(기존 group) — 커서는 끝 기준 위치 유지
                var fromEnd = tb.Text.Length - tb.CaretIndex;
                syncing = true;
                tb.Text = raw.Length == 0 ? "" : long.Parse(raw, CultureInfo.InvariantCulture).ToString("#,0", CultureInfo.InvariantCulture);
                tb.CaretIndex = Math.Max(0, tb.Text.Length - fromEnd);
                syncing = false;
            }
        };
        Watch(tb, p, key, () => { if (!tb.IsKeyboardFocusWithin) FromRow(); });
        return FormBuilder.Id(tb, key);
    }

    /// <summary>type=number 칸(오른쪽 정렬, 숫자·소수점만)</summary>
    public static TextBox Num(Row p, string key, double width, bool decimalValue = false)
    {
        var tb = Amt(p, key, width, "", decimalValue: true);
        if (!decimalValue)
        {
            // 정수 칸도 쉼표 없이(기존 input type=number)
            tb.PreviewTextInput += (_, e) => e.Handled = !e.Text.All(char.IsDigit);
        }
        return tb;
    }

    public static IReadOnlyList<Opt> Opts(params string[] values) => values.Select(v => new Opt(v, v)).ToList();

    /// <summary>select — items는 첫 항목(예: "선택" = 빈 값)까지 그대로. 목록에 없는 기존 값은 덧붙여 보존</summary>
    public static ComboBox Sel(Row p, string key, double width, IEnumerable<Opt> items, string? emptyLabel = "선택", double height = 28)
    {
        var cb = new ComboBox { Style = Select, Height = height, DisplayMemberPath = nameof(Opt.Label), SelectedValuePath = nameof(Opt.Value) };
        if (width >= 0) cb.Width = width;
        var list = new List<Opt>();
        if (emptyLabel is not null) list.Add(new Opt("", emptyLabel));
        list.AddRange(items);
        var syncing = false;
        void FromRow()
        {
            var cur = p.Str(key) ?? "";
            // 방금 이 칸에서 고른 값이면 그대로(자기 변경 중에 목록을 다시 넣으면 선택이 비어 보임)
            if (cb.ItemsSource is not null && cb.SelectedValue as string == cur) return;
            syncing = true;
            if (cur.Length > 0 && list.All(o => o.Value != cur)) list.Add(new Opt(cur, cur));
            cb.ItemsSource = null;
            cb.ItemsSource = list;
            cb.SelectedValue = list.Any(o => o.Value == cur) ? cur : list.FirstOrDefault()?.Value;
            syncing = false;
        }
        FromRow();
        cb.SelectionChanged += (_, _) =>
        {
            if (syncing || cb.SelectedValue is not string v) return;
            p[key] = v.Length > 0 ? v : null;
        };
        Watch(cb, p, key, FromRow);
        return FormBuilder.Id(cb, key);
    }

    public static ComboBox Sel(Row p, string key, double width, params string[] values) => Sel(p, key, width, Opts(values));

    /// <summary>체크박스 + 글자(13px) — 값 1 / null</summary>
    public static CheckBox Chk(Row p, string key, string label)
    {
        var cb = new CheckBox { Content = label, FontSize = 13, VerticalContentAlignment = VerticalAlignment.Center, Cursor = Cursors.Hand };
        var syncing = false;
        void FromRow() { syncing = true; cb.IsChecked = p[key] is { } v && v.ToString() is "1" or "true" or "True" or "Y"; syncing = false; }
        FromRow();
        cb.Checked += (_, _) => { if (!syncing) p[key] = 1L; };
        cb.Unchecked += (_, _) => { if (!syncing) p[key] = null; };
        Watch(cb, p, key, FromRow);
        return FormBuilder.Id(cb, key);
    }

    /// <summary>
    /// 기존 DateInput: 왼쪽 달력 아이콘(누르면 달력) + 글자 칸. 평소 "YY.MM.DD", 누르면 YYYY-MM-DD로 편집,
    /// 8자리(20261027)·6자리(261027) 입력도 해석. ymd8이면 "20261027" 형태로 저장(준공년도).
    /// </summary>
    public static FrameworkElement Date(Row p, string key, double width = 85, bool ymd8 = false, double height = 24, double? fontSize = null)
    {
        var tb = new TextBox { Style = Input, Width = width, TextAlignment = TextAlignment.Right, Padding = new Thickness(22, 0, 4, 0), Height = height };
        if (fontSize is { } fs) tb.FontSize = fs;
        Placeholder.Set(tb, "YYYY-MM-DD", 22);
        string Iso()
        {
            var v = p.Str(key) ?? "";
            if (ymd8) return v.Length == 8 ? $"{v[..4]}-{v[4..6]}-{v[6..8]}" : "";
            return v.Length >= 10 ? v[..10] : v;
        }
        string Display() { var i = Iso(); return i.Length >= 10 ? $"{i[2..4]}.{i[5..7]}.{i[8..10]}" : ""; }
        void Put(string iso) => p[key] = iso.Length == 0 ? null : ymd8 ? iso.Replace("-", "") : iso;
        tb.Text = Display();
        tb.GotKeyboardFocus += (_, _) => tb.Text = Iso();
        tb.LostKeyboardFocus += (_, _) =>
        {
            var parsed = ParseIso(tb.Text);
            if (parsed.Length > 0) Put(parsed);
            else if (tb.Text.Trim().Length == 0) Put("");
            tb.Text = Display();
        };
        tb.KeyDown += (_, e) => { if (e.Key == Key.Enter) Keyboard.ClearFocus(); };
        Watch(tb, p, key, () => { if (!tb.IsKeyboardFocusWithin) tb.Text = Display(); });

        var icon = new TextBlock
        {
            Text = "", FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), FontSize = 12, Foreground = PurpleLine,
            HorizontalAlignment = HorizontalAlignment.Left, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(5, 0, 0, 0), Cursor = Cursors.Hand, ToolTip = "달력에서 선택",
        };
        var cal = new System.Windows.Controls.Calendar();
        var pop = new Popup { PlacementTarget = tb, Placement = PlacementMode.Bottom, StaysOpen = false, Child = cal };
        icon.MouseLeftButtonUp += (_, _) =>
        {
            cal.SelectedDate = DateTime.TryParse(Iso(), out var d) ? d : null;
            cal.DisplayDate = cal.SelectedDate ?? DateTime.Today;
            pop.IsOpen = true;
        };
        cal.SelectedDatesChanged += (_, _) =>
        {
            if (cal.SelectedDate is not { } d || !pop.IsOpen) return;
            Put(LocalDate.Format(d));
            tb.Text = Display();
            pop.IsOpen = false;
        };
        var g = new Grid { Width = width, VerticalAlignment = VerticalAlignment.Center };
        g.Children.Add(tb);
        g.Children.Add(icon);
        g.Children.Add(pop);
        FormBuilder.Id(tb, key);
        return g;
    }

    /// <summary>기존 parseToIso: 숫자 8자리 / 6자리(70 이상은 1900년대)만 날짜로</summary>
    public static string ParseIso(string s)
    {
        var d = new string((s ?? "").Where(char.IsDigit).ToArray());
        string y, m, day;
        if (d.Length == 8) { y = d[..4]; m = d[4..6]; day = d[6..8]; }
        else if (d.Length == 6) { var yy = int.Parse(d[..2], CultureInfo.InvariantCulture); y = ((yy >= 70 ? 1900 : 2000) + yy).ToString(CultureInfo.InvariantCulture); m = d[2..4]; day = d[4..6]; }
        else return "";
        var mi = int.Parse(m, CultureInfo.InvariantCulture);
        var di = int.Parse(day, CultureInfo.InvariantCulture);
        return mi is < 1 or > 12 || di is < 1 or > 31 ? "" : $"{y}-{m}-{day}";
    }

    /// <summary>다른 곳에서 Row 값이 바뀌면 칸을 다시 채운다(화면에 붙어 있는 동안만 구독)</summary>
    public static void Watch(FrameworkElement el, Row p, string key, Action update)
    {
        PropertyChangedEventHandler h = (_, e) => { if (e.PropertyName == key) update(); };
        el.Loaded += (_, _) => { p.PropertyChanged -= h; p.PropertyChanged += h; };
        el.Unloaded += (_, _) => p.PropertyChanged -= h;
    }

    /// <summary>Row의 키가 바뀌면 다시 계산(보이기·숨기기 등)</summary>
    public static void OnChange(FrameworkElement el, Row p, Action update, params string[] keys)
    {
        PropertyChangedEventHandler h = (_, e) => { if (keys.Contains(e.PropertyName)) update(); };
        el.Loaded += (_, _) => { p.PropertyChanged -= h; p.PropertyChanged += h; update(); };
        el.Unloaded += (_, _) => p.PropertyChanged -= h;
        update();
    }
}

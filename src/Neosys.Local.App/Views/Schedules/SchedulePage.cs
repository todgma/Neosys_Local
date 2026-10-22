using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;
using static Neosys.Local.App.Ui.Legacy;

namespace Neosys.Local.App.Views.Schedules;

/// <summary>
/// 일정관리 — 기존 SchedulePage 모양:
///  1줄 [사무소 일정] | [나의 일정]
///  2줄 [달력보기|리스트보기] | 연도 · 1~12월 버튼 … [+ 일정 등록하기]
///  본문: 달력(날짜 왼쪽 위·오늘 표시·일정 칩 최대 4개 + '+N개') + 오른쪽 타임라인(선택한 날) / 리스트(날짜별 표)
///  날짜를 누르면 선택(파란 테두리), 한 번 더 누르면 그날 일정 등록. 일정을 누르면 수정.
///  일정 칩을 다른 날짜로 끌어다 놓으면 그 날짜로 바로 저장(시간·내용은 그대로).
/// </summary>
public sealed class SchedulePage : DockPanel
{
    private readonly ScheduleService _svc = AppServices.Create((sp, s) => new ScheduleService(sp, s));
    private readonly ContentControl _scopeHost = new(), _viewHost = new(), _monthHost = new(), _body = new();
    private readonly ComboBox _year = new() { Width = 90 };
    private readonly Button _add = new() { Style = (Style)Application.Current.FindResource("PrimaryButton"), FontSize = 14 };
    private readonly StackPanel _timeline = new();
    private readonly TextBlock _tlTitle = new() { FontSize = 14, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center };
    private string _scope = "OFFICE";
    private bool _listView;
    private int _yearValue = DateTime.Today.Year, _monthValue = DateTime.Today.Month;
    private DateTime? _selected;
    private DateTime _tlDate = DateTime.Today;
    private List<Row> _rows = new();
    private const string DragFormat = "neosys-schedule";
    private Point? _dragStart;   // 일정 칩을 누른 위치(조금 움직이면 끌기 시작)

    public SchedulePage()
    {
        Background = B("#F9FAFB");
        var head = new StackPanel { Background = Brushes.White };
        var headBorder = new Border { Child = head, Background = Brushes.White, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(12, 4, 12, 6) };
        head.Children.Add(_scopeHost);
        var row2 = new DockPanel { Margin = new Thickness(0, 6, 0, 0) };
        DockPanel.SetDock(_add, Dock.Right);
        row2.Children.Add(_add);
        var left = new StackPanel { Orientation = Orientation.Horizontal };
        left.Children.Add(_viewHost);
        left.Children.Add(new TextBlock { Text = "|", FontSize = 20, Foreground = B("#D1D5DB"), Margin = new Thickness(10, 0, 10, 0), VerticalAlignment = VerticalAlignment.Center });
        _year.ItemsSource = Enumerable.Range(DateTime.Today.Year - 5, 11).Select(y => $"{y}년").ToList();
        _year.SelectedItem = $"{_yearValue}년";
        _year.SelectionChanged += async (_, _) => { if (_year.SelectedItem is string y) { _yearValue = int.Parse(y[..^1]); await LoadAsync(); } };
        left.Children.Add(_year);
        left.Children.Add(_monthHost);
        row2.Children.Add(left);
        head.Children.Add(row2);
        SetDock(headBorder, Dock.Top);
        Children.Add(headBorder);
        Children.Add(_body);
        _add.Click += async (_, _) => await EditAsync(_svc.New(_selected ?? DateTime.Today));
        RenderHeader();
        Loaded += async (_, _) => await LoadAsync();
    }

    private void RenderHeader()
    {
        var scope = new StackPanel { Orientation = Orientation.Horizontal };
        Button ScopeBtn(string text, string value, string color)
        {
            var on = _scope == value;
            var b = new Button { Content = text, FontSize = 14, FontWeight = FontWeights.Medium, Padding = new Thickness(16, 7, 16, 7), BorderThickness = new Thickness(0), Background = on ? B(color) : B("#F3F4F6"), Foreground = on ? Brushes.White : B("#374151") };
            b.Click += async (_, _) => { _scope = value; RenderHeader(); await LoadAsync(); };
            return b;
        }
        scope.Children.Add(ScopeBtn("사무소 일정", "OFFICE", "#2563EB"));
        scope.Children.Add(new TextBlock { Text = "|", Foreground = B("#D1D5DB"), Margin = new Thickness(10, 0, 10, 0), VerticalAlignment = VerticalAlignment.Center });
        scope.Children.Add(ScopeBtn("나의 일정", "MY", "#16A34A"));
        _scopeHost.Content = scope;
        _viewHost.Content = Segmented(new[] { ("cal", "  달력보기"), ("list", "  리스트보기") }, v => (v == "list") == _listView, v => { _listView = v == "list"; RenderHeader(); Render(); });
        var months = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(10, 0, 0, 0) };
        for (int m = 1; m <= 12; m++)
        {
            var mm = m;
            var on = _monthValue == m;
            var b = new Button { Content = $"{m}월", FontSize = 14, Padding = new Thickness(9, 5, 9, 5), Margin = new Thickness(0, 0, 4, 0), BorderThickness = new Thickness(0), Background = on ? B("#4F46E5") : B("#F3F4F6"), Foreground = on ? Brushes.White : B("#374151"), FontWeight = on ? FontWeights.Medium : FontWeights.Medium };
            b.Click += async (_, _) => { _monthValue = mm; RenderHeader(); await LoadAsync(); };
            months.Children.Add(b);
        }
        _monthHost.Content = months;
        _add.Content = WithIcon("", "일정 등록하기" + (_selected is not null ? " (1)" : ""));
    }

    private static object WithIcon(string glyph, string text)
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal };
        sp.Children.Add(new TextBlock { Text = glyph, FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), Margin = new Thickness(0, 0, 8, 0), VerticalAlignment = VerticalAlignment.Center });
        sp.Children.Add(new TextBlock { Text = text });
        return sp;
    }

    private DateTime MonthStart => new(_yearValue, _monthValue, 1);

    private async Task LoadAsync()
    {
        var first = MonthStart.AddDays(-(int)MonthStart.DayOfWeek);
        var last = first.AddDays(41);
        await Dialogs.RunAsync(async () => _rows = await _svc.ListAsync(first, last, _scope), "일정을 불러오지 못했습니다.");
        Render();
    }

    private Dictionary<string, List<Row>> ByDay() =>
        _rows.GroupBy(r => LocalDate.Normalize(r.Str("start_at")) ?? "").ToDictionary(g => g.Key, g => g.ToList());

    private static string Color(Row r) => r.Str("scope_div") switch { "OFFICE" => "#3B82F6", "COMPANY" => "#8B5CF6", _ => "#10B981" };

    private void Render()
    {
        if (_listView) { _body.Content = ListView(); return; }
        // 다시 그릴 때 재사용하는 타임라인 제목·목록을 이전 부모에서 떼어 낸다(범위·보기 전환 시 "이미 다른 요소의 자식" 오류 방지)
        Legacy.Detached(_tlTitle);
        Legacy.Detached(_timeline);
        var byDay = ByDay();
        var card = new DockPanel { Background = Brushes.White };
        // 오른쪽 타임라인
        var tl = new DockPanel { Width = 288 };
        var tlHead = new DockPanel { Background = B("#F9FAFB") };
        var prev = new Button { Content = "‹", BorderThickness = new Thickness(0), Background = Brushes.Transparent, MinHeight = 0 };
        var next = new Button { Content = "›", BorderThickness = new Thickness(0), Background = Brushes.Transparent, MinHeight = 0 };
        prev.Click += (_, _) => { _tlDate = _tlDate.AddDays(-1); RenderTimeline(); };
        next.Click += (_, _) => { _tlDate = _tlDate.AddDays(1); RenderTimeline(); };
        DockPanel.SetDock(prev, Dock.Left);
        DockPanel.SetDock(next, Dock.Right);
        tlHead.Children.Add(prev);
        tlHead.Children.Add(next);
        _tlTitle.HorizontalAlignment = HorizontalAlignment.Center;
        tlHead.Children.Add(_tlTitle);
        var tlHeadBorder = new Border { Child = tlHead, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(6) };
        DockPanel.SetDock(tlHeadBorder, Dock.Top);
        tl.Children.Add(tlHeadBorder);
        tl.Children.Add(new ScrollViewer { Content = _timeline, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Padding = new Thickness(8) });
        var tlBorder = new Border { Child = tl, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1, 0, 0, 0) };
        DockPanel.SetDock(tlBorder, Dock.Right);
        card.Children.Add(tlBorder);

        // 달력
        var cal = new DockPanel();
        var week = new UniformGrid { Columns = 7 };
        foreach (var (d, i) in new[] { "일", "월", "화", "수", "목", "금", "토" }.Select((d, i) => (d, i)))
            week.Children.Add(new Border
            {
                BorderBrush = B("#DDDDDD"), BorderThickness = new Thickness(0, 0, 1, 1), Padding = new Thickness(4),
                Child = new TextBlock { Text = d, HorizontalAlignment = HorizontalAlignment.Center, FontWeight = FontWeights.Bold, Foreground = i == 0 ? B("#DC2626") : i == 6 ? B("#2563EB") : Brushes.Black },
            });
        DockPanel.SetDock(week, Dock.Top);
        cal.Children.Add(week);
        var days = new UniformGrid { Columns = 7, Rows = 6 };
        var first = MonthStart.AddDays(-(int)MonthStart.DayOfWeek);
        for (int i = 0; i < 42; i++)
        {
            var day = first.AddDays(i);
            days.Children.Add(DayCell(day, byDay.TryGetValue(LocalDate.Format(day), out var list) ? list : new List<Row>()));
        }
        cal.Children.Add(days);
        card.Children.Add(cal);
        _body.Content = new Border { Child = card, Margin = new Thickness(8, 4, 8, 8), BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Background = Brushes.White };
        RenderTimeline();
    }

    private FrameworkElement DayCell(DateTime day, List<Row> items)
    {
        var inMonth = day.Month == _monthValue;
        var isToday = day.Date == DateTime.Today;
        var stack = new StackPanel();
        var dateRow = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(2, 0, 0, 2) };
        dateRow.Children.Add(new TextBlock
        {
            Text = day.Day.ToString(), FontSize = 13, FontWeight = isToday ? FontWeights.Bold : FontWeights.Medium,
            Foreground = !inMonth ? B("#999999") : day.DayOfWeek == DayOfWeek.Sunday ? B("#DC2626") : day.DayOfWeek == DayOfWeek.Saturday ? B("#2563EB") : Brushes.Black,
        });
        if (isToday) dateRow.Children.Add(new Border { Background = B("#EF4444"), CornerRadius = new CornerRadius(3), Padding = new Thickness(4, 0, 4, 0), Margin = new Thickness(4, 0, 0, 0), Child = new TextBlock { Text = "오늘", FontSize = 11, Foreground = Brushes.White, FontWeight = FontWeights.Bold } });
        stack.Children.Add(dateRow);
        foreach (var r in items.Take(4))
        {
            var chip = new Border
            {
                Background = B(Color(r)), CornerRadius = new CornerRadius(4), Padding = new Thickness(4, 1, 4, 1), Margin = new Thickness(0, 0, 0, 2), Cursor = Cursors.Hand, Opacity = 0.95,
                Child = new TextBlock { Text = r.Str("title") ?? "(제목 없음)", FontSize = 13, FontWeight = FontWeights.Bold, Foreground = B("#111827"), TextTrimming = TextTrimming.CharacterEllipsis },
                ToolTip = $"{r.Str("title")}\n{r.Str("start_at")}\n{r.Str("location")}\n{r.Str("content")}".Trim(),
            };
            var row = r;
            chip.PreviewMouseLeftButtonDown += (_, e) => _dragStart = e.GetPosition(this);
            chip.MouseMove += (_, e) =>
            {
                if (e.LeftButton != MouseButtonState.Pressed || _dragStart is not { } p0) return;
                var d = e.GetPosition(this) - p0;
                if (Math.Abs(d.X) < SystemParameters.MinimumHorizontalDragDistance && Math.Abs(d.Y) < SystemParameters.MinimumVerticalDragDistance) return;
                _dragStart = null;
                chip.Opacity = 0.5;
                DragDrop.DoDragDrop(chip, new DataObject(DragFormat, row), DragDropEffects.Move);
                chip.Opacity = 0.95;
            };
            chip.MouseLeftButtonUp += async (_, e) =>
            {
                e.Handled = true;
                if (_dragStart is null) return;   // 끌기로 끝난 경우는 수정 창을 열지 않는다
                _dragStart = null;
                await OpenRowAsync(row);
            };
            stack.Children.Add(chip);
        }
        if (items.Count > 4) stack.Children.Add(new TextBlock { Text = $"+{items.Count - 4}개", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = B("#2563EB") });
        var selected = _selected?.Date == day.Date;
        var cell = new Border
        {
            BorderBrush = selected ? B("#3B82F6") : B("#DDDDDD"), BorderThickness = selected ? new Thickness(2) : new Thickness(0, 0, 1, 1), Padding = new Thickness(3),
            Background = selected ? B("#DBEAFE") : !inMonth ? B("#E6E6E6") : Brushes.White, Child = stack, Cursor = Cursors.Hand,
        };
        // 일정 칩을 놓을 수 있는 칸 — 끄는 동안 파란 테두리, 놓으면 그 날짜로 바로 저장
        cell.AllowDrop = true;
        var (brush, thick) = (cell.BorderBrush, cell.BorderThickness);
        cell.DragEnter += (_, e) => { if (e.Data.GetDataPresent(DragFormat)) { cell.BorderBrush = B("#2563EB"); cell.BorderThickness = new Thickness(2); } };
        cell.DragLeave += (_, _) => { cell.BorderBrush = brush; cell.BorderThickness = thick; };
        cell.DragOver += (_, e) => { e.Effects = e.Data.GetDataPresent(DragFormat) ? DragDropEffects.Move : DragDropEffects.None; e.Handled = true; };
        cell.Drop += async (_, e) =>
        {
            cell.BorderBrush = brush;
            cell.BorderThickness = thick;
            if (e.Data.GetData(DragFormat) is not Row r || r.Long("schedule_id") is not { } id) return;
            e.Handled = true;
            await MoveAsync(id, day);
        };
        cell.MouseLeftButtonUp += async (_, e) =>
        {
            if (e.Handled) return;
            if (_selected?.Date == day.Date) { await EditAsync(_svc.New(day)); return; }   // 다시 누르면 등록
            _selected = day;
            _tlDate = day;
            RenderHeader();
            Render();
        };
        return cell;
    }

    private void RenderTimeline()
    {
        _tlTitle.Text = $"{_tlDate:yyyy-MM-dd} ({"일월화수목금토"[(int)_tlDate.DayOfWeek]}){(_tlDate.Date == DateTime.Today ? "  오늘" : "")}";
        _timeline.Children.Clear();
        var items = ByDay().TryGetValue(LocalDate.Format(_tlDate), out var list) ? list : new List<Row>();
        if (items.Count == 0) { _timeline.Children.Add(new TextBlock { Text = "일정이 없습니다.", Foreground = B("#9CA3AF"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 20, 0, 0) }); return; }
        foreach (var r in items.OrderBy(r => r.Str("start_at")))
        {
            var time = r.Long("all_day") == 1 ? "종일" : r.Str("start_at") is { Length: >= 16 } s ? s.Substring(11, 5) : "";
            var sp = new StackPanel();
            sp.Children.Add(new TextBlock { Text = $"{time}  {r.Str("title")}", FontWeight = FontWeights.Bold, FontSize = 13 });
            if (r.Has("location")) sp.Children.Add(new TextBlock { Text = r.Str("location"), FontSize = 12, Foreground = B("#4B5563"), TextWrapping = TextWrapping.Wrap });
            if (r.Has("content")) sp.Children.Add(new TextBlock { Text = r.Str("content"), FontSize = 12, Foreground = B("#6B7280"), TextWrapping = TextWrapping.Wrap });
            var item = new Border { Child = sp, BorderBrush = B(Color(r)), BorderThickness = new Thickness(4, 0, 0, 0), Padding = new Thickness(8, 4, 4, 4), Margin = new Thickness(0, 0, 0, 6), Background = B("#F9FAFB"), Cursor = Cursors.Hand };
            var row = r;
            item.MouseLeftButtonUp += async (_, _) => await OpenRowAsync(row);
            _timeline.Children.Add(item);
        }
    }

    /// <summary>리스트 보기 — 날짜별(날짜·제목·장소·전화·구분·성함·내용), 일정 없는 날도 한 줄</summary>
    private FrameworkElement ListView()
    {
        var byDay = ByDay();
        var g = new Grid { Background = Brushes.White };
        var widths = new[] { 120.0, 160, 200, 120, 70, 80, 120, 70, 80, 0 };
        foreach (var w in widths) g.ColumnDefinitions.Add(new ColumnDefinition { Width = w > 0 ? new GridLength(w) : new GridLength(1, GridUnitType.Star) });
        int row = 0;
        void Cell(string? text, int col, int r, bool head = false, string? color = null, int span = 1, Row? data = null)
        {
            while (g.RowDefinitions.Count <= r) g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            var b = new Border
            {
                BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, head ? 2 : 0, 1, 1), Padding = new Thickness(6, head ? 5 : 3, 6, head ? 5 : 3),
                Background = head ? B("#F9FAFB") : Brushes.White,
                Child = new TextBlock { Text = text ?? "-", FontSize = head ? 14 : 13, FontWeight = head ? FontWeights.SemiBold : FontWeights.Medium, Foreground = color is null ? Brushes.Black : B(color), TextWrapping = col == 9 ? TextWrapping.Wrap : TextWrapping.NoWrap, TextTrimming = TextTrimming.CharacterEllipsis },
            };
            if (data is not null) { b.Cursor = Cursors.Hand; b.MouseLeftButtonUp += async (_, _) => await OpenRowAsync(data); }
            Grid.SetRow(b, r);
            Grid.SetColumn(b, col);
            Grid.SetColumnSpan(b, span);
            g.Children.Add(b);
        }
        var heads = new[] { "날짜", "제목", "물건소재지 | 장소", "전화번호1", "구분1", "성함1", "전화번호2", "구분2", "성함2", "내용" };
        for (int i = 0; i < heads.Length; i++) Cell(heads[i], i, 0, head: true);
        row = 1;
        var days = DateTime.DaysInMonth(_yearValue, _monthValue);
        for (int d = 1; d <= days; d++)
        {
            var day = new DateTime(_yearValue, _monthValue, d);
            var color = day.DayOfWeek == DayOfWeek.Sunday ? "#DC2626" : day.DayOfWeek == DayOfWeek.Saturday ? "#2563EB" : null;
            var label = $"{day:MM-dd} ({"일월화수목금토"[(int)day.DayOfWeek]}){(day.Date == DateTime.Today ? " 오늘" : "")}";
            var items = byDay.TryGetValue(LocalDate.Format(day), out var list) ? list : new List<Row>();
            if (items.Count == 0) { Cell(label, 0, row, color: color); Cell("-", 1, row, color: "#9CA3AF", span: 9); row++; continue; }
            foreach (var r in items)
            {
                Cell(label, 0, row, color: color);
                Cell(r.Str("title") ?? "(제목 없음)", 1, row, data: r);
                Cell(r.Str("location") ?? r.Str("pt_name"), 2, row, data: r);
                Cell(r.Str("phone"), 3, row, data: r);
                Cell(r.Str("contact_role"), 4, row, data: r);
                Cell(r.Str("contact_name"), 5, row, data: r);
                Cell(r.Str("phone2"), 6, row, data: r);
                Cell(r.Str("contact_role2"), 7, row, data: r);
                Cell(r.Str("contact_name2"), 8, row, data: r);
                Cell(r.Str("content"), 9, row, data: r);
                row++;
                label = "";
            }
        }
        return new Border { Margin = new Thickness(8, 4, 8, 8), BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1), Child = new ScrollViewer { Content = g, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Auto } };
    }

    /// <summary>끌어다 놓은 일정을 그 날짜로 저장하고 달력·타임라인을 그 날로 다시 그린다</summary>
    private async Task MoveAsync(long id, DateTime day)
    {
        var moved = false;
        if (!await Dialogs.RunAsync(async () => moved = await _svc.MoveAsync(id, day), "일정 날짜를 바꾸지 못했습니다.")) return;
        if (!moved) return;
        _selected = day;
        _tlDate = day;
        RenderHeader();
        await LoadAsync();
        Toast.Success($"{day:M월 d일}로 옮겼습니다.");
    }

    private async Task OpenRowAsync(Row row)
    {
        // 누른 일정의 날짜를 먼저 선택(파란 테두리 + 타임라인)한 뒤 수정 창을 연다
        if (LocalDate.Parse(row.Str("start_at")) is { } day && _selected?.Date != day.Date)
        {
            _selected = day.Date;
            _tlDate = day.Date;
            RenderHeader();
            Render();
        }
        var full = await _svc.GetAsync(row.Long("schedule_id")!.Value);
        if (full is null) return;
        ScheduleService.SplitStart(full);
        await EditAsync(full);
    }

    private async Task EditAsync(Row r)
    {
        if (Edit(_svc, r)) await LoadAsync();
    }

    /// <summary>일정 등록/수정 창(물건 등록창 등에서도 사용)</summary>
    public static bool Edit(ScheduleService svc, Row r)
    {
        var fields = new[]
        {
            F.Radio("scope_div", "범위", ScheduleService.Scopes).Span(2),
            F.Edit("title", "제목", ScheduleService.Categories.Select(c => c.Value).ToArray()).Required(),
            F.Amount("amount", "금액", "만원"),
            F.Date("start_date", "날짜").Required(),
            F.Text("start_time", "시간", "14:30"),
            F.Bool("all_day", "종일", "하루 종일"),
            F.Text("location", "장소/물건주소"),
            F.Text("contact_name", "성함"),
            F.Text("phone", "연락처"),
            F.Text("contact_name2", "성함2"),
            F.Text("phone2", "연락처2"),
            F.View("pt_name", "연동 물건"),
            F.Memo("content", "내용", 90).Span(2),
        };
        var w = new FormEditWindow("일정", r, "schedule_id", fields, svc.SaveAsync,
            x => svc.DeleteAsync(x.Long("schedule_id")!.Value), width: 820, height: 560);
        w.AddLeftButton("물건 연동", () =>
        {
            if (Pickers.Property() is not { } p) return;
            r["pt_no"] = p.Long("pt_no");
            r["pt_name"] = p.Str("pt_name");
            if (!r.Has("location")) r["location"] = Neosys.Local.Core.Services.PropertyService.AddressText(p);
        });
        w.AddLeftButton("연동 해제", () => { r["pt_no"] = null; r["pt_name"] = null; });
        return w.ShowAndReport();
    }
}

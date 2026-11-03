using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;
using static Neosys.Local.App.Ui.Legacy;

namespace Neosys.Local.App.Views.Worklog;

/// <summary>
/// 업무일지 — 기존 WorkJournalPage 모양:
///  왼쪽(288) 월 이동 · (대표) 공유 설정 · 일자별 작성현황(오늘 표시·작성 ✔)
///  오른쪽 문서: 사무소명/성명 칸 · '업 무 일 지' 제목 · [시스템 기록 불러오기] · 자동집계 카드 5개 ·
///  오늘 주요 업무 · 내일 할일(+일정등록) · 추가 페이지 · 작업이력 표 / 아래 [저장]
///  공유가 '대표+담당자공개'면 직원은 자기 일지만 본다. 다른 직원 일지는 읽기 전용.
/// </summary>
public sealed class WorklogPage : DockPanel
{
    private readonly WorklogService _svc = AppServices.Create((sp, s) => new WorklogService(sp, s));
    private DateTime _month = new(DateTime.Today.Year, DateTime.Today.Month, 1);
    private DateTime _day = DateTime.Today;
    private readonly TextBlock _monthText = new() { FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = B("#0F172A"), VerticalAlignment = VerticalAlignment.Center };
    private readonly StackPanel _days = new();
    private readonly ContentControl _shareHost = new();
    private readonly StackPanel _doc = new() { Margin = new Thickness(40, 24, 40, 24) };
    private readonly ComboBox _who = new() { Width = 130, DisplayMemberPath = "Label", SelectedValuePath = "Value" };
    private readonly Button _save = new() { Content = "저장", Style = (Style)Application.Current.FindResource("PrimaryButton"), MinWidth = 90, FontSize = 14 };
    private readonly TextBox _content = Area(110), _remark = Area(120);
    private readonly StackPanel _extra = new();
    private readonly List<TextBox> _extraBoxes = new();
    private bool _shareAll = true;
    private bool _loading;
    private Row _journal = new();
    private Row _sum = new();
    private HashSet<string> _writtenDays = new();

    private static TextBox Area(double h) => new()
    {
        AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MinHeight = h, FontSize = 14, VerticalContentAlignment = VerticalAlignment.Top,
        Padding = new Thickness(10, 8, 10, 8), VerticalScrollBarVisibility = ScrollBarVisibility.Auto, BorderBrush = B("#CBD5E1"),
    };

    public WorklogPage()
    {
        Background = Brushes.White;
        // 아래 저장 줄
        var foot = new DockPanel { Background = Brushes.White };
        DockPanel.SetDock(_save, Dock.Right);
        foot.Children.Add(_save);
        foot.Children.Add(new TextBlock { Text = "자동집계는 저장할 때 함께 남습니다.", Foreground = B("#64748B"), FontSize = 13, VerticalAlignment = VerticalAlignment.Center });
        var footBorder = new Border { Child = foot, BorderBrush = B("#E2E8F0"), BorderThickness = new Thickness(0, 1, 0, 0), Padding = new Thickness(20, 10, 20, 10) };
        SetDock(footBorder, Dock.Bottom);
        Children.Add(footBorder);
        _save.Click += async (_, _) =>
        {
            CollectJournal();
            if (await Dialogs.RunAsync(() => _svc.SaveAsync(_journal, _sum), "업무일지 저장에 실패했습니다."))
            {
                Toast.Success("업무일지가 저장되었습니다.");
                await LoadMonthAsync();
            }
        };

        // 왼쪽 패널
        var left = new DockPanel { Width = 288 };
        var nav = new DockPanel();
        var prev = NavBtn("‹", -1);
        var next = NavBtn("›", 1);
        DockPanel.SetDock(prev, Dock.Left);
        DockPanel.SetDock(next, Dock.Right);
        nav.Children.Add(prev);
        nav.Children.Add(next);
        _monthText.HorizontalAlignment = HorizontalAlignment.Center;
        nav.Children.Add(_monthText);
        var navBorder = new Border { Child = nav, Padding = new Thickness(14, 12, 14, 12), BorderBrush = B("#E2E8F0"), BorderThickness = new Thickness(0, 0, 0, 1) };
        var top = new StackPanel();
        top.Children.Add(navBorder);
        top.Children.Add(_shareHost);
        top.Children.Add(new Border
        {
            Child = new TextBlock { Text = "일자별 작성현황", FontSize = 13, FontWeight = FontWeights.Bold, Foreground = B("#475569") },
            Padding = new Thickness(14, 8, 14, 8), BorderBrush = B("#EEF2F7"), BorderThickness = new Thickness(0, 0, 0, 1),
        });
        DockPanel.SetDock(top, Dock.Top);
        left.Children.Add(top);
        left.Children.Add(new ScrollViewer { Content = _days, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
        var leftBorder = new Border { Child = left, BorderBrush = B("#E2E8F0"), BorderThickness = new Thickness(0, 0, 1, 0) };
        SetDock(leftBorder, Dock.Left);
        Children.Add(leftBorder);

        Children.Add(new ScrollViewer { Content = _doc, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled });
        _who.SelectionChanged += async (_, _) => { if (IsLoaded && !_loading) await LoadDayAsync(); };
        Loaded += async (_, _) => { await LoadShareAsync(); await LoadMonthAsync(); await LoadDayAsync(); await AddStaffAsync(); };
    }

    private Button NavBtn(string text, int delta)
    {
        var b = new Button { Content = text, FontSize = 16, Padding = new Thickness(8, 0, 8, 0), MinHeight = 28, BorderBrush = B("#E2E8F0") };
        b.Click += async (_, _) => { _month = _month.AddMonths(delta); _day = _month; await LoadMonthAsync(); await LoadDayAsync(); };
        return b;
    }

    // ---------------- 공유 설정·직원 ----------------

    private async Task LoadShareAsync()
    {
        try { _shareAll = await _svc.ShareAllAsync(); } catch { _shareAll = true; }
        RenderShare();
        var s = AppServices.Session;
        _loading = true;
        _who.ItemsSource = new List<Opt> { new("", "내 일지") };
        _who.SelectedIndex = 0;
        _loading = false;
        _who.IsEnabled = WorklogService.CanSeeOthers(s, _shareAll);
    }

    private void RenderShare()
    {
        if (!AppServices.Session.IsOwner) { _shareHost.Content = null; return; }
        var sp = new StackPanel();
        RadioButton Radio(string text, string? sub, bool value)
        {
            var content = new TextBlock { FontSize = 14, FontWeight = FontWeights.Bold, Foreground = B("#0F172A") };
            content.Inlines.Add(new System.Windows.Documents.Run(text));
            if (sub is not null) content.Inlines.Add(new System.Windows.Documents.Run(" " + sub) { FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = B("#475569") });
            var r = new RadioButton { Content = content, IsChecked = _shareAll == value, GroupName = "worklogShare", Margin = new Thickness(0, 0, 0, 6) };
            r.Checked += async (_, _) =>
            {
                if (_shareAll == value) return;
                if (await Dialogs.RunAsync(() => _svc.SetShareAllAsync(value), "공유설정 저장에 실패했습니다."))
                {
                    _shareAll = value;
                    Toast.Success("공유설정이 저장되었습니다.");
                }
            };
            return r;
        }
        sp.Children.Add(Radio("모두공개", "(모든직원 업무 서로공유)", true));
        sp.Children.Add(Radio("대표+담당자공개", null, false));
        _shareHost.Content = new Border { Child = sp, Padding = new Thickness(14, 10, 14, 4), BorderBrush = B("#EEF2F7"), BorderThickness = new Thickness(0, 0, 0, 1) };
    }

    /// <summary>직원별 일지 보기(직원 목록은 서버 — 화면을 먼저 띄우고 붙인다)</summary>
    private async Task AddStaffAsync()
    {
        var s = AppServices.Session;
        if (!WorklogService.CanSeeOthers(s, _shareAll) || s.OffNo is not { } off) return;
        try
        {
            var opts = new List<Opt> { new("", "내 일지") };
            foreach (var r in await AppServices.Server.GetRealtorsAsync(off))
                if ((r.Str("id") ?? r.Str("userId")) is { Length: > 0 } id && id != s.UserId)
                    opts.Add(new Opt(id, r.Str("rtNm") ?? id));
            _loading = true;
            var keep = _who.SelectedValue;
            _who.ItemsSource = opts;
            _who.SelectedValue = keep ?? "";
            _loading = false;
        }
        catch { /* 오프라인 */ }
    }

    private string? ViewUser => _who.SelectedValue as string is { Length: > 0 } v ? v : null;

    // ---------------- 왼쪽: 일자별 작성현황 ----------------

    private async Task LoadMonthAsync()
    {
        _monthText.Text = $"{_month:yyyy년 M월}";
        try
        {
            var rows = await _svc.StatusAsync(_month.Year, _month.Month);
            var me = ViewUser ?? AppServices.Session.UserId;
            _writtenDays = rows.Where(r => r.Str("user_id") == me).Select(r => r.Str("jrnl_date") ?? "").ToHashSet();
        }
        catch { _writtenDays = new(); }
        RenderDays();
    }

    private void RenderDays()
    {
        _days.Children.Clear();
        var count = DateTime.DaysInMonth(_month.Year, _month.Month);
        for (int d = 1; d <= count; d++)
        {
            var day = new DateTime(_month.Year, _month.Month, d);
            var active = day.Date == _day.Date;
            var color = day.DayOfWeek == DayOfWeek.Sunday ? "#DC2626" : day.DayOfWeek == DayOfWeek.Saturday ? "#2563EB" : "#0F172A";
            var row = new DockPanel();
            var written = _writtenDays.Contains(LocalDate.Format(day));
            var mark = new TextBlock { Text = written ? "작성 ✔" : day <= DateTime.Today ? "미작성" : "", FontSize = 13, FontWeight = FontWeights.Bold, Foreground = B(written ? "#16A34A" : "#94A3B8") };
            DockPanel.SetDock(mark, Dock.Right);
            row.Children.Add(mark);
            var lbl = new StackPanel { Orientation = Orientation.Horizontal };
            lbl.Children.Add(new TextBlock { Text = $"{day:MM.dd} ({"일월화수목금토"[(int)day.DayOfWeek]})", MinWidth = 72, FontSize = 13, FontWeight = active ? FontWeights.ExtraBold : FontWeights.Bold, Foreground = B(color) });
            if (day.Date == DateTime.Today)
                lbl.Children.Add(new Border { Background = B("#EF4444"), CornerRadius = new CornerRadius(8), Padding = new Thickness(7, 1, 7, 1), Margin = new Thickness(6, 0, 0, 0), Child = new TextBlock { Text = "오늘", FontSize = 13, FontWeight = FontWeights.ExtraBold, Foreground = Brushes.White } });
            row.Children.Add(lbl);
            var item = new Border { Child = row, Padding = new Thickness(14, 7, 14, 7), BorderBrush = B("#F1F5F9"), BorderThickness = new Thickness(0, 0, 0, 1), Background = active ? B("#EEF2FF") : Brushes.White, Cursor = Cursors.Hand };
            var target = day;
            item.MouseLeftButtonUp += async (_, _) => { _day = target; RenderDays(); await LoadDayAsync(); };
            _days.Children.Add(item);
        }
    }

    // ---------------- 오른쪽: 일지 문서 ----------------

    private async Task LoadDayAsync()
    {
        await Dialogs.RunAsync(async () =>
        {
            _journal = await _svc.GetAsync(_day, ViewUser);
            _sum = ViewUser is null ? await _svc.SummaryAsync(_day) : _journal;
            var activity = await _svc.ActivityAsync(_day, ViewUser ?? (WorklogService.CanSeeOthers(AppServices.Session, _shareAll) ? null : AppServices.Session.UserId));
            RenderDoc(activity);
        }, "업무일지를 불러오지 못했습니다.");
    }

    private void RenderDoc(List<Row> activity)
    {
        var canEdit = ViewUser is null;
        _save.IsEnabled = canEdit;
        _doc.Children.Clear();

        // 오른쪽 위 사무소명/성명 칸 + 제목
        var headGrid = new Grid();
        var info = new Grid { HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Top };
        info.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(70) });
        info.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });
        void InfoRow(int r, string k, string? v)
        {
            info.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            var a = new Border { BorderBrush = B("#0F172A"), BorderThickness = new Thickness(1, r == 0 ? 1 : 0, 1, 1), Background = B("#F8FAFC"), Padding = new Thickness(6, 3, 6, 3), Child = new TextBlock { Text = k, FontSize = 13, FontWeight = FontWeights.SemiBold, HorizontalAlignment = HorizontalAlignment.Center } };
            var b = new Border { BorderBrush = B("#0F172A"), BorderThickness = new Thickness(0, r == 0 ? 1 : 0, 1, 1), Padding = new Thickness(6, 3, 6, 3), Child = new TextBlock { Text = v ?? "", FontSize = 13, FontWeight = FontWeights.SemiBold } };
            Grid.SetRow(a, r); Grid.SetRow(b, r); Grid.SetColumn(b, 1);
            info.Children.Add(a); info.Children.Add(b);
        }
        InfoRow(0, "사무소명", AppServices.Session.OffNm);
        InfoRow(1, "성명", ViewUser is null ? AppServices.Session.RtNm ?? AppServices.Session.UserId : (_who.SelectedItem as Opt)?.Label);
        headGrid.Children.Add(info);
        headGrid.Children.Add(new TextBlock { Text = "업 무 일 지", FontSize = 30, FontWeight = FontWeights.ExtraBold, Foreground = B("#0F172A"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 18, 0, 0) });
        _doc.Children.Add(headGrid);

        // 시스템 기록 불러오기 · 날짜 · 보는 사람
        var bar = new DockPanel { Margin = new Thickness(0, 10, 0, 0) };
        var date = new TextBlock { Text = $"{_day:yyyy년 M월 d일} ({"일월화수목금토"[(int)_day.DayOfWeek]})", FontSize = 15, FontWeight = FontWeights.Bold, Foreground = B("#334155"), VerticalAlignment = VerticalAlignment.Center };
        DockPanel.SetDock(date, Dock.Right);
        bar.Children.Add(date);
        var barLeft = new StackPanel { Orientation = Orientation.Horizontal };
        var load = new Button { Content = "↻ 시스템 기록 불러오기", BorderBrush = B("#C7D2FE"), Foreground = B("#4F46E5"), IsEnabled = canEdit };
        load.Click += async (_, _) => { _sum = await _svc.SummaryAsync(_day); await LoadDayAsyncKeepText(); };
        barLeft.Children.Add(load);
        barLeft.Children.Add(Label("  보기", 13, "#475569"));
        barLeft.Children.Add(Legacy.Detached(_who));
        if (!canEdit) barLeft.Children.Add(Label("  · 다른 직원 일지(읽기전용)", 13, "#DC2626", FontWeights.Bold));
        bar.Children.Add(barLeft);
        _doc.Children.Add(bar);
        _doc.Children.Add(new Border { Height = 2, Background = B("#0F172A"), Margin = new Thickness(0, 14, 0, 18) });

        // 자동집계 카드 5개
        var cards = new System.Windows.Controls.Primitives.UniformGrid { Columns = 5, Margin = new Thickness(0, 0, 0, 20) };
        void Card(string title, params (string Label, string Key)[] items)
        {
            var sp = new StackPanel();
            sp.Children.Add(new Border { BorderBrush = B("#DC2626"), BorderThickness = new Thickness(0, 0, 0, 2), Padding = new Thickness(0, 0, 0, 4), Margin = new Thickness(0, 0, 0, 6), Child = new TextBlock { Text = title, FontSize = 13, FontWeight = FontWeights.ExtraBold, Foreground = B("#0F172A") } });
            var nums = new WrapPanel();
            foreach (var (label, key) in items)
            {
                var one = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 8, 4) };
                one.Children.Add(new TextBlock { Text = label, FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = B("#475569"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 3, 0) });
                one.Children.Add(new Border { BorderBrush = B("#E2E8F0"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(6), Background = B("#F8FAFC"), Padding = new Thickness(4, 1, 4, 1), MinWidth = 28, Child = new TextBlock { Text = (_sum.Long(key) ?? 0).ToString(), FontSize = 18, FontWeight = FontWeights.ExtraBold, HorizontalAlignment = HorizontalAlignment.Center } });
                one.Children.Add(new TextBlock { Text = "건", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = B("#475569"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(3, 0, 0, 0) });
                nums.Children.Add(one);
            }
            sp.Children.Add(nums);
            cards.Children.Add(new Border { Child = sp, BorderBrush = B("#E2E8F0"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Padding = new Thickness(10, 8, 10, 6), Margin = new Thickness(0, 0, 8, 0) });
        }
        Card("물건", ("등록", "prop_reg"), ("수정", "prop_upd"));
        Card("고객", ("등록", "cust_reg"), ("수정", "cust_upd"));
        Card("계약서", ("작성", "contract_write"), ("수정", "contract_upd"));
        Card("일정", ("등록", "sched_reg"), ("수정", "sched_upd"));
        Card("상담", ("등록", "consult_memo"));
        _doc.Children.Add(cards);

        // 오늘 주요 업무 / 내일 할일
        _doc.Children.Add(Section("오늘 주요 업무"));
        _content.Text = _journal.Str("content") ?? "";
        _content.IsReadOnly = !canEdit;
        _content.Background = canEdit ? Brushes.White : B("#F8FAFC");
        _doc.Children.Add(Legacy.Detached(_content));
        var tomorrow = new DockPanel { Margin = new Thickness(0, 16, 0, 0) };
        var sched = new Button { Content = "+ 일정등록", BorderBrush = B("#C7D2FE"), Foreground = B("#4F46E5"), IsEnabled = canEdit };
        sched.Click += (_, _) =>
        {
            var svc = AppServices.Create((sp, s) => new ScheduleService(sp, s));
            var r = svc.New(_day.AddDays(1));
            r["content"] = _remark.Text;
            Schedules.SchedulePage.Edit(svc, r);
        };
        DockPanel.SetDock(sched, Dock.Right);
        tomorrow.Children.Add(sched);
        tomorrow.Children.Add(Section("내일 할일", 0));
        _doc.Children.Add(tomorrow);
        _remark.Text = _journal.Str("remark") ?? "";
        _remark.IsReadOnly = !canEdit;
        _remark.Background = canEdit ? Brushes.White : B("#F8FAFC");
        _doc.Children.Add(Legacy.Detached(_remark));

        // 추가 페이지(extra_pages: [{id,text}])
        _extra.Children.Clear();
        _extraBoxes.Clear();
        try
        {
            if (JsonNode.Parse(_journal.Str("extra_pages") ?? "[]") is JsonArray pages)
                foreach (var p in pages.OfType<JsonObject>()) AddExtraPage((string?)p["text"] ?? "", canEdit);
        }
        catch { /* 손상된 값은 무시 */ }
        _doc.Children.Add(Legacy.Detached(_extra));
        if (canEdit)
        {
            var addPage = new Button { Content = "+ 페이지 추가", HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 16, 0, 0) };
            addPage.Click += (_, _) => AddExtraPage("", true);
            _doc.Children.Add(addPage);
        }

        // 작업이력 표
        var actHead = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 28, 0, 10) };
        actHead.Children.Add(new TextBlock { Text = "작업이력", FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = B("#0F172A") });
        actHead.Children.Add(new TextBlock { Text = $"  {activity.Count}건", FontSize = 13, FontWeight = FontWeights.Bold, Foreground = B("#64748B"), VerticalAlignment = VerticalAlignment.Bottom });
        _doc.Children.Add(new Border { Child = actHead, BorderBrush = B("#CBD5E1"), BorderThickness = new Thickness(0, 2, 0, 0), Padding = new Thickness(0, 18, 0, 0), Margin = new Thickness(0, 10, 0, 0) });
        _doc.Children.Add(ActivityTable(activity));
    }

    private static TextBlock Section(string text, double top = 0) => new() { Text = text, FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = B("#0F172A"), Margin = new Thickness(0, top, 0, 8), VerticalAlignment = VerticalAlignment.Center };

    private void AddExtraPage(string text, bool canEdit)
    {
        var box = Area(360);
        box.Text = text;
        box.IsReadOnly = !canEdit;
        box.Background = canEdit ? Brushes.White : B("#F8FAFC");
        var head = new DockPanel { Margin = new Thickness(0, 0, 0, 10) };
        var panel = new StackPanel();
        Border? frame = null;   // _extra에 들어가는 것은 panel을 감싼 테두리 — 삭제도 테두리째(페이지가 화면에 남던 문제)
        if (canEdit)
        {
            var del = new Button { Content = "페이지 삭제", Style = (Style)Application.Current.FindResource("DangerButton") };
            del.Click += (_, _) => { _extra.Children.Remove(frame); _extraBoxes.Remove(box); };
            DockPanel.SetDock(del, Dock.Right);
            head.Children.Add(del);
        }
        head.Children.Add(new TextBlock { Text = $"추가 페이지", FontSize = 15, FontWeight = FontWeights.ExtraBold, VerticalAlignment = VerticalAlignment.Center });
        panel.Children.Add(head);
        panel.Children.Add(box);
        _extra.Children.Add(frame = new Border { Child = panel, BorderBrush = B("#CBD5E1"), BorderThickness = new Thickness(0, 2, 0, 0), Padding = new Thickness(0, 18, 0, 0), Margin = new Thickness(0, 24, 0, 0) });
        _extraBoxes.Add(box);
    }

    private static FrameworkElement ActivityTable(List<Row> rows)
    {
        var g = new Grid();
        foreach (var w in new[] { 70.0, 100, 70, 110, 0 }) g.ColumnDefinitions.Add(new ColumnDefinition { Width = w > 0 ? new GridLength(w) : new GridLength(1, GridUnitType.Star) });
        void Cell(string? text, int r, int c, bool head = false, string? color = null)
        {
            while (g.RowDefinitions.Count <= r) g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            var b = new Border
            {
                BorderBrush = B("#E2E8F0"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(8, 6, 8, 6), Background = head ? B("#F8FAFC") : Brushes.White,
                Child = new TextBlock { Text = text ?? "", FontSize = 13, FontWeight = head || c == 0 || color is not null ? FontWeights.Bold : FontWeights.Medium, Foreground = color is null ? B("#0F172A") : B(color), TextTrimming = TextTrimming.CharacterEllipsis },
            };
            Grid.SetRow(b, r); Grid.SetColumn(b, c);
            g.Children.Add(b);
        }
        var heads = new[] { "시간", "직원", "구분", "항목", "대상" };
        for (int i = 0; i < 5; i++) Cell(heads[i], 0, i, head: true);
        if (rows.Count == 0)
        {
            var empty = new TextBlock { Text = "해당 날짜의 작업이력이 없습니다.", Foreground = B("#94A3B8"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(18) };
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            Grid.SetRow(empty, 1); Grid.SetColumnSpan(empty, 5);
            g.Children.Add(empty);
            return g;
        }
        int r = 1;
        foreach (var a in rows)
        {
            var type = a.Str("log_type");
            Cell(a.Str("logged_at") is { Length: >= 16 } s ? s.Substring(11, 5) : a.Str("logged_at"), r, 0);
            Cell(a.Str("changed_by"), r, 1);
            Cell(type switch { "I" => "등록", "U" => "수정", "D" => "삭제", _ => type }, r, 2, color: type == "D" ? "#DC2626" : type == "I" ? "#16A34A" : "#2563EB");
            Cell(a.Str("label"), r, 3);
            Cell(a.Str("target"), r, 4);
            r++;
        }
        return g;
    }

    /// <summary>시스템 기록 불러오기 — 쓰던 글은 유지하고 집계만 새로</summary>
    private async Task LoadDayAsyncKeepText()
    {
        CollectJournal();
        var keep = _journal;
        var activity = await _svc.ActivityAsync(_day, null);
        _journal = keep;
        RenderDoc(activity);
        Toast.Success("시스템 기록을 불러왔습니다.");
    }

    private void CollectJournal()
    {
        _journal["jrnl_date"] = LocalDate.Format(_day);
        _journal["content"] = _content.Text;
        _journal["remark"] = _remark.Text;
        var arr = new JsonArray();
        for (int i = 0; i < _extraBoxes.Count; i++) arr.Add(new JsonObject { ["id"] = i + 1, ["text"] = _extraBoxes[i].Text });
        _journal["extra_pages"] = arr.ToJsonString(new System.Text.Json.JsonSerializerOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
    }
}

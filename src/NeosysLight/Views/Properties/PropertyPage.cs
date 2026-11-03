using System.Globalization;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;
using System.Windows.Threading;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;
using static Neosys.Local.App.Ui.Legacy;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 물건관리 — 기존 PropertiesPage(2026-10-28) 모양:
///  - 위 검색 상자: 물건종류 버튼 줄(진입 시 아파트) … (오른쪽) 카톡문의·홈으로·상담모드
///    / [전체물건][진행중] │ 보고서 작성(N) │ 헤드라인 설정 │ 엑셀 업로드 │ 일괄변경수신 및 요청
///  - 왼쪽 '물건리스트'(처음엔 접힘): 유형 묶음 → 단지·건물 묶음(건수/세대, 배치도·시트). 목록이 있으면 첫 번째를 자동 선택
///  - 오른쪽 표: 도구줄 [거래구분 탭][면적][금액][층] N건 … 배율 · 줄수 · [색 채우기][+ 신규 등록][수정]
///    표는 유형별 헤드라인 칼럼(2단 머리: 제목 + 필터칸), 맨 앞 '선택│정보망│보고서│진행중' 칸
/// </summary>
public sealed class PropertyPage : ListPage
{
    private readonly PropertyService _svc = AppServices.Create((sp, s) => new PropertyService(sp, s));
    private readonly WrapPanel _typeRow = new() { Margin = new Thickness(0, 0, 0, 5) };
    private readonly StackPanel _leftList = new();
    private readonly TextBox _listSearch = new() { FontSize = 13 };
    private readonly Border _side;
    private readonly ContentControl _saleDivHost = new();
    private readonly RangeFilter _area = new("면적", "㎡"), _amount = new("금액", "만원");
    private readonly ComboBox _floor = new() { Width = 90, DisplayMemberPath = "Label", SelectedValuePath = "Value" };
    private readonly TextBlock _reportLabel = new() { FontSize = 14, FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) };
    private readonly ComboBox _reportSel = new() { Width = 96, DisplayMemberPath = "Label", SelectedValuePath = "Value" };
    private readonly TextBox _zoomBox = new() { Width = 52, Text = "100", FontSize = 14, TextAlignment = TextAlignment.Center, VerticalContentAlignment = VerticalAlignment.Center, Height = 28, Padding = new Thickness(2, 0, 2, 0) };
    private readonly ComboBox _rowCount = new() { Width = 80, DisplayMemberPath = "Label", SelectedValuePath = "Value" };
    private readonly StackPanel _pager = new() { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 4, 0, 6) };

    private string _type = Catalog.PropertyTypeFilters[0].Value;   // 물건종류(콤마 SYCA 코드) — 진입 시 첫 유형(아파트)
    private bool _progressOnly;              // 진행중 탭
    private readonly HashSet<string> _saleDivs = new();
    private string? _panelType;              // 모든유형일 때 왼쪽에서 고른 유형 묶음
    private Row? _summary;                   // 왼쪽에서 고른 단지/건물
    private List<Row> _summaries = new();
    private bool _sideOpen = true;
    private readonly List<long> _reportNos = new();                       // 보고서 작성으로 고른 물건(고른 순서)
    private readonly Dictionary<string, string> _colFilter = new();       // 칼럼 필터칸(부분일치)
    private readonly Dictionary<string, HashSet<string>> _colPick = new(); // 깔때기 목록 선택
    private readonly DispatcherTimer _filterTimer = new() { Interval = TimeSpan.FromMilliseconds(250) };
    private List<string>? _headline;         // 헤드라인 설정(사용자 선택 칼럼 키) — null이면 유형별 기본
    private int _page = 1;
    private double _zoom = 100;

    public PropertyPage() : base("물건관리", "물건명·주소·동호·소유자 검색")
    {
        _headline = LoadHeadline();

        // ── 위 검색 상자 ──
        FilterBar.Children.Clear();
        var box = new StackPanel();
        var row1 = new DockPanel();
        var actions = TopActions();
        var row1Right = new ContentControl { Content = actions, VerticalAlignment = VerticalAlignment.Top };
        var row2Right = new ContentControl { VerticalAlignment = VerticalAlignment.Center };
        DockPanel.SetDock(row1Right, Dock.Right);
        row1.Children.Add(row1Right);
        row1.Children.Add(_typeRow);
        box.Children.Add(row1);

        var row2Dock = new DockPanel();
        DockPanel.SetDock(row2Right, Dock.Right);
        row2Dock.Children.Add(row2Right);
        var row2 = new WrapPanel { VerticalAlignment = VerticalAlignment.Center };
        row2Dock.Children.Add(row2);
        // 물건유형 줄 오른쪽 여백이 모자라면 우상단 액션을 아래 줄(일괄변경 및 요청) 오른쪽 끝으로(기존 btnsWrapped)
        void PlaceActions()
        {
            var typesW = _typeRow.Children.OfType<FrameworkElement>().Sum(e => e.ActualWidth + e.Margin.Left + e.Margin.Right);
            var wrapped = typesW + 300 > box.ActualWidth;
            var host = wrapped ? row2Right : row1Right;
            if (host.Content == actions) return;
            row1Right.Content = row2Right.Content = null;
            host.Content = actions;
        }
        box.SizeChanged += (_, _) => PlaceActions();
        _typeRow.LayoutUpdated += (_, _) => { if (_typeRow.IsLoaded) PlaceActions(); };
        var tabHost = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        void RenderTabs()
        {
            tabHost.Children.Clear();
            foreach (var (v, l) in new[] { ("all", "전체물건"), ("progress", "진행중") })
            {
                var on = (v == "progress") == _progressOnly;
                var b = new Button
                {
                    Content = l, FontSize = 14, FontWeight = on ? FontWeights.Bold : FontWeights.Normal, Padding = new Thickness(16, 3, 16, 3), MinHeight = 0,
                    Margin = new Thickness(0, 0, 4, 0), BorderBrush = B("#D1D5DB"), Background = on ? B("#4F46E5") : Brushes.White, Foreground = on ? Brushes.White : Brushes.Black,
                };
                b.Click += async (_, _) => { _progressOnly = v == "progress"; _summary = null; RenderTabs(); await ReloadAllAsync(); };
                tabHost.Children.Add(b);
            }
        }
        RenderTabs();
        row2.Children.Add(tabHost);

        _reportSel.SelectionChanged += async (_, _) =>
        {
            var v = _reportSel.SelectedValue as string;
            if (string.IsNullOrEmpty(v)) return;
            _reportSel.SelectedIndex = 0;
            if (v == "create") await ReportAsync();
            else if (v == "reset") { _reportNos.Clear(); RenderReport(); Grid.Items.Refresh(); }
        };
        PlainSelect(_reportSel);
        RenderReport();
        row2.Children.Add(Group(_reportLabel, _reportSel));

        var headline = new Button { Content = "헤드라인 설정", FontSize = 14, FontWeight = FontWeights.Normal, Padding = new Thickness(12, 3, 12, 3), MinHeight = 0, BorderBrush = B("#E5E7EB"), Foreground = Brushes.Black };
        headline.Click += (_, _) => OpenHeadlineSettings();
        row2.Children.Add(Group(headline));
        var upload = new Button { Content = WithIcon("", "엑셀 업로드"), FontSize = 14, FontWeight = FontWeights.Normal, Padding = new Thickness(12, 3, 12, 3), MinHeight = 0, BorderBrush = B("#E5E7EB"), Foreground = Brushes.Black };
        upload.Click += async (_, _) => await UploadAsync();
        row2.Children.Add(Group(upload));
        var bulk = new ComboBox { Width = 90, DisplayMemberPath = "Label", SelectedValuePath = "Value", ItemsSource = Opt.Pairs(("", "선택"), ("주소", "주소"), ("물건유형", "물건유형"), ("단지명", "단지명"), ("동", "동"), ("호", "호")), SelectedIndex = 0 };
        PlainSelect(bulk);
        bulk.SelectionChanged += (_, _) =>
        {
            if (bulk.SelectedValue is not string v || v.Length == 0) return;
            bulk.SelectedIndex = 0;
            // 기존: 고객센터 일괄변경요청(서버 rt_bulk_request) 접수 창 — 서버 기능이라 로컬에서는 아직 연결하지 않음
            Dialogs.Info($"일괄변경요청({v})은 운영 서버(고객센터)로 접수하는 기능입니다.\n로컬 버전 연결 방법을 확인 중입니다.", "일괄변경수신 및 요청");
        };
        row2.Children.Add(Group(Label("일괄변경수신 및 요청", 14, "#000000", FontWeights.SemiBold), bulk));
        box.Children.Add(row2Dock);
        FilterBar.Children.Add(box);
        FilterBox.Background = B("#F9FAFB");
        FilterBox.BorderBrush = B("#D1D5DB");
        FilterBox.BorderThickness = new Thickness(1);
        FilterBox.Padding = new Thickness(8, 5, 8, 5);
        FilterBox.Margin = new Thickness(0, 0, 0, 5);
        box.Width = double.NaN;
        FilterBar.SizeChanged += (_, _) => box.Width = Math.Max(0, FilterBar.ActualWidth - 4);

        // ── 표 위 도구줄 왼쪽: 거래구분 · 면적/금액 · 층 ──
        LeftBar.Children.Add(_saleDivHost);
        _area.Changed += async () => await ResetPageAndRefreshAsync();
        _amount.Changed += async () => await ResetPageAndRefreshAsync();
        _floor.ItemsSource = Opt.Pairs(("", "전부"), ("first", "1층만"), ("top", "탑층만"), ("exceptFirst", "1층제외"));
        _floor.SelectedIndex = 0;
        PlainSelect(_floor);
        _floor.SelectionChanged += async (_, _) => { if (IsLoaded) await ResetPageAndRefreshAsync(); };
        LeftBar.Children.Add(Group(_area, _amount, Label("층"), _floor));
        RenderSaleDivs();

        // ── 도구줄 오른쪽 선두: 배율 · 줄수 (색 채우기 왼쪽) ──
        HideRefreshButton();
        ButtonBar.Children.Add(ZoomControl());
        ButtonBar.Children.Add(Label("줄수", 14, "#000000", FontWeights.SemiBold));
        _rowCount.ItemsSource = Opt.Pairs(("50", "50줄"), ("100", "100줄"), ("all", "전체"));
        _rowCount.SelectedValue = "100";
        PlainSelect(_rowCount);
        _rowCount.Margin = new Thickness(0, 0, 6, 0);
        _rowCount.SelectionChanged += (_, _) => { _page = 1; ApplyView(); };
        ButtonBar.Children.Add(_rowCount);

        // 기존: 툴바는 [색 채우기][신규 등록][수정], 수정·복사등록은 행 우클릭
        AddButton("신규 등록", () => OpenAsync(null), "PrimaryButton");
        AddRowMenu("수정", async () => { if (Selected is { } r) await OpenAsync(r); else Toast.Show("수정할 물건을 선택하세요."); });
        AddRowMenu("복사등록", CopyAsync);
        AddRowMenu("삭제", DeleteSelectedAsync);

        // ── 왼쪽 물건리스트 + 표 ──
        _side = BuildSide();
        var toolbar = Children[1];
        Children.Remove(toolbar);
        Children.Remove(Grid);
        var card = new DockPanel { Background = Brushes.White };
        DockPanel.SetDock(toolbar, Dock.Top);
        card.Children.Add(toolbar);
        DockPanel.SetDock(_pager, Dock.Bottom);
        card.Children.Add(_pager);
        card.Children.Add(Grid);
        var body = new DockPanel();
        DockPanel.SetDock(_side, Dock.Left);
        body.Children.Add(_side);
        body.Children.Add(new Border { Child = card, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1, 1, 1, 1), Background = Brushes.White });
        Children.Add(body);
        Margin = new Thickness(6);

        // 표 — 기존 .prop-table-card: 데이터 14px · 굵기 500 · 가운데, 머리(제목+필터) #fafafa · 위/아래 1px 검정
        Grid.FontSize = 14;
        Grid.RowHeight = 30;
        Grid.BorderThickness = new Thickness(0, 1, 0, 0);
        Grid.ColumnHeaderHeight = double.NaN;
        Grid.CanUserReorderColumns = false;
        Grid.CanUserSortColumns = false;
        Grid.HeadersVisibility = DataGridHeadersVisibility.Column;
        VirtualizingPanel.SetVirtualizationMode(Grid, VirtualizationMode.Standard);
        _filterTimer.Tick += (_, _) => { _filterTimer.Stop(); _page = 1; ApplyView(); };
        BuildColumns();
        RenderTypes();
        ToggleSide();   // 처음엔 물건리스트 접힘(기존 showSummaryList=false)
        Loaded += async (_, _) => await ReloadAllAsync();
    }

    protected override bool AutoCheckColumn => false;

    /// <summary>기존 select(padding 4px 8px · 14px · 테두리 #e5e7eb · 흰 바탕)</summary>
    internal static void PlainSelect(ComboBox cb)
    {
        cb.Style = (Style)Application.Current.FindResource("FormSelect");
        cb.FontSize = 14;
        cb.Height = 28;
        cb.Padding = new Thickness(8, 0, 18, 0);
        cb.BorderBrush = B("#E5E7EB");
        cb.VerticalAlignment = VerticalAlignment.Center;
    }

    // ---------------- 위: 물건종류 버튼 · 우상단 액션 ----------------

    private void RenderTypes()
    {
        _typeRow.Children.Clear();
        foreach (var f in Catalog.PropertyTypeFilters)
        {
            var value = f.Value;
            var on = _type == value;
            var b = new Button
            {
                Content = f.Label, FontSize = 14, Padding = new Thickness(8, 5, 8, 5), MinHeight = 0, Margin = new Thickness(0, 0, 4, 0), MinWidth = 48,
                BorderBrush = B("#E5E7EB"), Background = on ? B("#4F46E5") : Brushes.White, Foreground = on ? Brushes.White : Brushes.Black,
                FontWeight = on ? FontWeights.Bold : FontWeights.Normal,
            };
            b.Click += async (_, _) =>
            {
                if (_type == value) return;
                _type = value;
                _panelType = null;
                _summary = null;
                _page = 1;
                RenderTypes();
                BuildColumns();
                await ReloadAllAsync();
            };
            _typeRow.Children.Add(b);
        }
    }

    /// <summary>기존 MenuTopActions(consult) — 카톡문의 · 홈으로 · 상담모드 ON/OFF (높이 30 · 14px · 굵기 600)</summary>
    private static FrameworkElement TopActions()
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Top };
        Button Act(string glyph, string text, Action click)
        {
            var b = new Button
            {
                Content = WithIcon(glyph, text), Height = 30, MinHeight = 0, Padding = new Thickness(10, 0, 10, 0), Margin = new Thickness(8, 0, 0, 0), FontSize = 14,
                FontWeight = FontWeights.SemiBold, BorderBrush = B("#CBD5E1"), Background = Brushes.White, Foreground = B("#334155"),
            };
            b.Click += (_, _) => click();
            return b;
        }
        sp.Children.Add(Act("", "카톡문의", () =>
        {
            try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("http://pf.kakao.com/_wxjxcrX/chat") { UseShellExecute = true }); }
            catch { Toast.Error("카카오톡 채팅을 열 수 없습니다."); }
        }));
        sp.Children.Add(Act("", "홈으로", () =>
        {
            var main = Application.Current.MainWindow;
            if (main is null) return;
            if (main.WindowState == WindowState.Minimized) main.WindowState = WindowState.Normal;
            main.Activate();
        }));
        var consult = Act("", "", () =>
        {
            AppServices.Settings.ConsultMode = !AppServices.Settings.ConsultMode;
            try { AppServices.Settings.Save(); } catch { /* 설정 저장 실패는 무시 */ }
        });
        consult.ToolTip = "상담모드 토글";
        void Paint()
        {
            var on = AppServices.Settings.ConsultMode;
            consult.Content = WithIcon("", $"상담모드 {(on ? "ON" : "OFF")}");
            consult.Background = on ? B("#4F46E5") : Brushes.White;
            consult.BorderBrush = on ? B("#4F46E5") : B("#CBD5E1");
            consult.Foreground = on ? Brushes.White : B("#334155");
        }
        Paint();
        consult.Loaded += (_, _) => { AppServices.Settings.ConsultModeChanged += Paint; Paint(); };
        consult.Unloaded += (_, _) => AppServices.Settings.ConsultModeChanged -= Paint;
        sp.Children.Add(consult);
        return sp;
    }

    private void RenderReport()
    {
        var n = _reportNos.Count;
        _reportLabel.Text = n > 0 ? $"보고서 작성 ({n})" : "보고서 작성";
        _reportLabel.Foreground = n > 0 ? B("#4F46E5") : Brushes.Black;
        var sel = _reportSel.SelectedIndex;
        _reportSel.ItemsSource = Opt.Pairs(("", "선택"), ("create", n > 0 ? $"작성({n})" : "작성"), ("reset", "선택 초기화"));
        _reportSel.SelectedIndex = 0;
        _reportSel.BorderBrush = n > 0 ? B("#6366F1") : B("#E5E7EB");
        _reportSel.Background = n > 0 ? B("#EEF2FF") : Brushes.White;
        _reportSel.Foreground = n > 0 ? B("#4F46E5") : Brushes.Black;
        _reportSel.FontWeight = n > 0 ? FontWeights.Bold : FontWeights.Normal;
        _ = sel;
    }

    private void RenderSaleDivs() => _saleDivHost.Content = Segmented(
        new[] { ("", "전체"), ("SALEDIV01", "매매"), ("SALEDIV02", "전세"), ("SALEDIV03", "월세"), ("SALEDIV04", "기타임대") },
        v => v.Length == 0 ? _saleDivs.Count == 0 : _saleDivs.Contains(v),
        async v => await ToggleSaleDivAsync(v));

    private async Task ToggleSaleDivAsync(string v)
    {
        if (v.Length == 0) _saleDivs.Clear();
        else if (!_saleDivs.Remove(v)) _saleDivs.Add(v);
        RenderSaleDivs();
        BuildColumns();   // 거래유형 머리의 매/전/월/기 버튼도 같은 상태
        await ResetPageAndRefreshAsync();
    }

    /// <summary>배율(기존 zoom: −/+ 5%, 직접입력 30~400%) — 화면 전체 확대·축소</summary>
    private FrameworkElement ZoomControl()
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 8, 0) };
        sp.Children.Add(Label("배율", 14, "#000000", FontWeights.SemiBold));
        Button Step(string t, double d)
        {
            var b = new Button { Content = t, FontSize = 14, FontWeight = FontWeights.Normal, Padding = new Thickness(8, 0, 8, 0), Height = 28, MinHeight = 0, Margin = new Thickness(0), BorderBrush = B("#E5E7EB"), Foreground = Brushes.Black };
            b.Click += (_, _) => SetZoom(_zoom + d);
            return b;
        }
        sp.Children.Add(Step("−", -5));
        _zoomBox.BorderBrush = B("#E5E7EB");
        _zoomBox.LostFocus += (_, _) => SetZoom(double.TryParse(_zoomBox.Text, out var v) && v > 0 ? v : 100);
        _zoomBox.KeyDown += (_, e) => { if (e.Key == Key.Enter) SetZoom(double.TryParse(_zoomBox.Text, out var v) && v > 0 ? v : 100); };
        sp.Children.Add(_zoomBox);
        sp.Children.Add(new Border { BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 1), Height = 28, Padding = new Thickness(4, 0, 4, 0), Child = new TextBlock { Text = "%", FontSize = 14, VerticalAlignment = VerticalAlignment.Center } });
        sp.Children.Add(Step("+", 5));
        return sp;
    }

    private void SetZoom(double v)
    {
        _zoom = Math.Min(400, Math.Max(30, v));
        _zoomBox.Text = _zoom.ToString("0.##", CultureInfo.InvariantCulture);
        LayoutTransform = Math.Abs(_zoom - 100) < 0.01 ? Transform.Identity : new ScaleTransform(_zoom / 100, _zoom / 100);
    }

    private async Task ReloadAllAsync()
    {
        await LoadSummariesAsync();
        await RefreshAsync();
    }

    private async Task ResetPageAndRefreshAsync()
    {
        _page = 1;
        await RefreshAsync();
    }

    // ---------------- 왼쪽: 물건리스트 ----------------

    private Border BuildSide()
    {
        var root = new DockPanel();
        var head = new StackPanel { Margin = new Thickness(12, 12, 12, 10) };
        var title = new DockPanel();
        var fold = new Button { Content = "‹", Padding = new Thickness(6, 0, 6, 0), MinHeight = 0, BorderThickness = new Thickness(0), ToolTip = "접기" };
        fold.Click += (_, _) => ToggleSide();
        DockPanel.SetDock(fold, Dock.Right);
        title.Children.Add(fold);
        title.Children.Add(new TextBlock { Text = "물건리스트", FontSize = 14, FontWeight = FontWeights.Medium, Foreground = B("#111827"), VerticalAlignment = VerticalAlignment.Center });
        head.Children.Add(title);
        var search = new DockPanel { Margin = new Thickness(0, 8, 0, 0) };
        var sb = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton"), Margin = new Thickness(4, 0, 0, 0), Padding = new Thickness(12, 3, 12, 3), MinHeight = 0 };
        sb.Click += (_, _) => RenderSide();
        DockPanel.SetDock(sb, Dock.Right);
        search.Children.Add(sb);
        Placeholder.Set(_listSearch, "리스트검색");
        _listSearch.TextChanged += (_, _) => RenderSide();
        search.Children.Add(_listSearch);
        head.Children.Add(search);
        DockPanel.SetDock(head, Dock.Top);
        root.Children.Add(head);
        root.Children.Add(new Border { BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 0), Child = new ScrollViewer { Content = _leftList, Padding = new Thickness(8), VerticalScrollBarVisibility = ScrollBarVisibility.Auto } });
        return new Border { Width = 256, Background = Brushes.White, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1, 1, 0, 1), Child = root };
    }

    private void ToggleSide()
    {
        _sideOpen = !_sideOpen;
        if (_sideOpen) { _side.Width = 256; if (_sideContent is not null) _side.Child = _sideContent; return; }
        _sideContent = _side.Child;
        _side.Width = 48;
        var open = new Button { Content = "›", Padding = new Thickness(6, 0, 6, 0), MinHeight = 0, BorderThickness = new Thickness(0), ToolTip = "펼치기", Margin = new Thickness(0, 8, 0, 8) };
        open.Click += (_, _) => ToggleSide();
        var sp = new StackPanel { HorizontalAlignment = HorizontalAlignment.Center };
        sp.Children.Add(open);
        foreach (var ch in "물건리스트") sp.Children.Add(new TextBlock { Text = ch.ToString(), FontSize = 14, FontWeight = FontWeights.Medium, Foreground = B("#4B5563"), HorizontalAlignment = HorizontalAlignment.Center });
        _side.Child = sp;
    }

    private UIElement? _sideContent;

    private async Task LoadSummariesAsync()
    {
        await Dialogs.RunAsync(async () =>
        {
            var type = _type.Length > 0 ? _type : _panelType;
            // 내가 가진 건수가 많은 순(기존 filteredSummaries 정렬)
            _summaries = (await _svc.SummaryAsync(type, _progressOnly ? "PTSTS01" : null)).OrderByDescending(s => s.Long("property_count") ?? 0).ToList();
            if (_summary is not null && !_summaries.Any(s => s.Str("group_key") == _summary.Str("group_key"))) _summary = null;
            // 목록이 있고 아직 선택이 없으면 첫 번째를 자동 선택(기존 autoPick — 선택해야 표가 채워진다)
            if (_summary is null && (_type.Length > 0 || _panelType is not null)) _summary = _summaries.FirstOrDefault();
            RenderSide();
        }, "물건리스트를 불러오지 못했습니다.");
    }

    private void RenderSide()
    {
        _leftList.Children.Clear();
        // 모든유형: 유형별 묶음(단지 수·건수)부터
        if (_type.Length == 0 && _panelType is null)
        {
            var groups = Catalog.PropertyTypeFilters
                .Select(f => (f, rows: _summaries.Where(s => f.Value.Split(',').Contains(s.Str("pt_type"))).ToList()))
                .Where(x => x.rows.Count > 0).ToList();
            if (groups.Count == 0) { _leftList.Children.Add(Empty("등록된 물건이 없습니다")); return; }
            foreach (var (f, rows) in groups)
            {
                var item = new DockPanel();
                var cnt = Label($"{rows.Sum(r => r.Long("property_count") ?? 0)}건", 12, "#4B5563", FontWeights.Medium);
                DockPanel.SetDock(cnt, Dock.Right);
                item.Children.Add(cnt);
                item.Children.Add(Label($"{f.Label}({rows.Count(r => r.Has("danji_code"))})", 14, "#1F2937", FontWeights.Medium));
                var b = ListItem(item, false, "#F8FAFC");
                b.MouseLeftButtonUp += async (_, _) => { _panelType = f.Value; await LoadSummariesAsync(); await RefreshAsync(); };
                _leftList.Children.Add(b);
            }
            return;
        }
        if (_type.Length == 0 && _panelType is not null)
        {
            var back = new Button { Content = "← 유형 목록", HorizontalContentAlignment = HorizontalAlignment.Left, BorderThickness = new Thickness(0), Background = B("#F9FAFB"), Margin = new Thickness(0, 0, 0, 8), FontWeight = FontWeights.Medium };
            back.Click += async (_, _) => { _panelType = null; _summary = null; await LoadSummariesAsync(); await RefreshAsync(); };
            _leftList.Children.Add(back);
        }
        var kw = _listSearch.Text.Trim();
        var rowsToShow = _summaries.Where(s => kw.Length == 0 || (s.Str("display_name") ?? "").Contains(kw)).ToList();
        if (rowsToShow.Count == 0) { _leftList.Children.Add(Empty(_summaries.Count == 0 ? "등록된 물건이 없습니다" : "검색 결과가 없습니다")); return; }
        foreach (var s in rowsToShow)
        {
            var isDanji = s.Has("danji_code");
            var selected = _summary?.Str("group_key") == s.Str("group_key");
            var stack = new StackPanel();
            var l1 = new DockPanel();
            var l2 = new DockPanel { Margin = new Thickness(0, 2, 0, 0) };
            if (isDanji)
            {
                var layout = Mini("배치도", "#4F46E5", () => OpenLayout(s));
                DockPanel.SetDock(layout, Dock.Right);
                l1.Children.Add(layout);
                var sheet = Mini("시트", "#64748B", async () => await SelectSummaryAsync(s));
                DockPanel.SetDock(sheet, Dock.Right);
                l2.Children.Add(sheet);
            }
            l1.Children.Add(new TextBlock { Text = s.Str("display_name"), FontSize = 14, FontWeight = FontWeights.Medium, Foreground = B(selected ? "#4338CA" : "#1F2937"), TextTrimming = TextTrimming.CharacterEllipsis, VerticalAlignment = VerticalAlignment.Center });
            l2.Children.Add(Label($"{s.Long("property_count")}건{(s.Long("family_cnt") is { } fam ? $" / {fam:#,0}세대" : "")}", 12, "#4B5563", FontWeights.Medium));
            stack.Children.Add(l1);
            stack.Children.Add(l2);
            var item = ListItem(stack, selected, null);
            item.MouseLeftButtonUp += async (_, e) => { if (e.OriginalSource is not TextBlock { Parent: Button } && !(e.OriginalSource is FrameworkElement { TemplatedParent: Button })) await SelectSummaryAsync(s); };
            _leftList.Children.Add(item);
        }
    }

    private static TextBlock Empty(string text) => new() { Text = text, HorizontalAlignment = HorizontalAlignment.Center, Foreground = B("#64748B"), FontSize = 13, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 24, 0, 0) };

    private static Border ListItem(UIElement content, bool selected, string? back) => new()
    {
        Child = content, Padding = new Thickness(8, 4, 8, 4), Margin = new Thickness(0, 0, 0, 4), CornerRadius = new CornerRadius(4), Cursor = Cursors.Hand,
        BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1), Background = selected ? B("#E0E7FF") : back is null ? Brushes.White : B(back),
    };

    private static Button Mini(string text, string color, Action click)
    {
        var b = new Button { Content = text, Width = 46, FontSize = 11, MinHeight = 0, Padding = new Thickness(0, 1, 0, 1), Margin = new Thickness(6, 0, 0, 0), BorderBrush = B(color), Foreground = B(color) };
        b.Click += (_, e) => { e.Handled = true; click(); };
        return b;
    }

    private async Task SelectSummaryAsync(Row s)
    {
        _summary = s;
        _page = 1;
        RenderSide();
        await RefreshAsync();
    }

    private void OpenLayout(Row s)
    {
        if (!long.TryParse(s.Str("danji_code"), out var danji)) return;
        var sample = Rows.FirstOrDefault(r => r.Str("danji_code") == s.Str("danji_code"));
        new LayoutWindow(danji, s.Str("display_name") ?? "단지", sample).ShowDialog();
    }

    // ---------------- 표: 유형별 헤드라인 칼럼 ----------------

    private sealed record Col(string Key, string Label, double Width, string Kind = "text");

    // 기존 COL — 'text'는 제목 + 필터칸(부분일치 + 깔때기), 'sel'·'match'는 머리 2행 합침, 'trade_type'·'trade_amount'는 전용 필터행
    private static readonly Dictionary<string, Col> C = new Col[]
    {
        new("sel", "선택", 96, "sel"),
        new("name", "물건명", 180), new("dong", "동", 74), new("ho", "호", 74),
        new("c_type", "타입", 90), new("c_area", "면적", 110), new("c_area_exc", "전용면적", 100), new("c_area_sup", "공급면적", 100),
        new("c_area_gross", "연면적", 100), new("c_area_land", "대지면적", 100), new("c_area_land_only", "토지면적", 100), new("c_dir", "방향", 74),
        new("trade_type", "거래유형", 128, "trade_type"), new("trade_amount", "의뢰금액", 360, "trade_amount"),
        new("c_loan", "융자금", 100), new("c_updt", "수정일", 100), new("c_status", "현상태", 100), new("c_maturity", "만기일", 100),
        new("c_match", "자사/공동망매칭", 120, "match"), new("c_consult", "상담내용", 180),
        new("c_saleamt", "매매금액", 110), new("c_bunyang", "분양금액", 110), new("c_balcony", "발코니확장금액", 120), new("c_option", "옵션금액", 110),
        new("c_premium", "프리미엄", 100), new("c_rightamt", "권리가액", 110), new("c_moving", "이주비", 100), new("c_biz", "사업체명", 120),
        new("c_keymoney", "권리금", 100), new("c_rooms", "객실수", 80), new("c_deposit_sum", "보증금합계", 110), new("c_month_sum", "월세합계", 100),
        new("c_buildyear", "준공년도", 90), new("c_loan_total", "대출금액", 110), new("c_deposit_total", "보증금총액", 110),
        new("c_yincome", "년수입합계", 110), new("c_yexpense", "년지출합계", 110), new("c_landcategory", "지목", 90), new("c_landuse", "용도지역", 110),
        new("c_addr", "주소", 180), new("c_top", "탑층", 70), new("c_regdt", "등록일", 100), new("c_leasecond", "현임대조건", 140),
        new("c_movein", "입주여부", 90), new("c_balancedate", "잔금예정일", 110), new("c_houserental", "주택임대사업자", 130), new("c_renewal", "계약갱신요구권", 130),
        new("c_opt", "옵션", 150), new("c_roomcnt", "방개수", 80), new("c_bathcnt", "욕실수", 80), new("c_biztype", "업종", 110),
        new("c_builduse", "건축물용도", 130), new("c_expl", "물건특징", 160), new("c_owner", "소유자", 110), new("c_tenant", "임차인", 110),
    }.ToDictionary(c => c.Key);

    private static string[] Keys(string s) => s.Split(' ', StringSplitOptions.RemoveEmptyEntries);

    // 기존 COLSET / TYPE_COLUMNS
    private static readonly Dictionary<string, string[]> ColSet = new()
    {
        ["apt"] = Keys("sel name dong ho c_type c_dir trade_type trade_amount c_loan c_updt c_status c_maturity c_match c_consult"),
        ["bunyang"] = Keys("sel name dong ho c_type c_dir c_saleamt c_bunyang c_balcony c_option c_premium c_updt c_match c_consult"),
        ["redev"] = Keys("sel name dong ho c_type c_dir c_rightamt c_moving c_saleamt c_bunyang c_balcony c_option c_premium c_updt c_match c_consult"),
        ["oneroom"] = Keys("sel name dong ho c_area c_dir trade_type trade_amount c_loan c_updt c_status c_maturity c_match c_consult"),
        ["house"] = Keys("sel name ho c_dir c_area_land c_area_gross trade_type trade_amount c_loan c_deposit_sum c_month_sum c_status c_updt c_maturity c_match c_consult"),
        ["commercial"] = Keys("sel name dong ho c_area c_dir trade_type trade_amount c_loan c_updt c_status c_biz c_keymoney c_maturity c_match c_consult"),
        ["knowledge"] = Keys("sel name dong ho c_area c_dir trade_type trade_amount c_loan c_updt c_status c_biz c_maturity c_match c_consult"),
        ["building"] = Keys("sel name c_area_land c_area_gross c_buildyear c_saleamt c_loan_total c_deposit_total c_yincome c_yexpense c_landcategory c_landuse c_updt c_match c_consult"),
        ["lodging"] = Keys("sel name c_area_exc c_area_land c_area_gross c_rooms trade_type trade_amount c_loan c_updt c_status c_biz c_maturity c_match c_consult"),
        ["factory"] = Keys("sel name dong ho c_area_land c_area_gross trade_type trade_amount c_loan c_updt c_status c_landcategory c_landuse c_biz c_maturity c_match c_consult"),
        ["land"] = Keys("sel name c_area_land_only c_landcategory c_landuse trade_type trade_amount c_loan c_updt c_status c_biz c_maturity c_match c_consult"),
    };

    private static readonly Dictionary<string, string> TypeColumns = new()
    {
        ["SYCA101,SYCA103"] = "apt", ["SYCA102"] = "apt", ["SYCA105,SYCA107"] = "bunyang", ["SYCA106"] = "bunyang", ["SYCA104"] = "redev", ["SYCA120"] = "redev",
        ["SYCA117"] = "oneroom", ["SYCA118"] = "oneroom", ["SYCA119"] = "house", ["SYCA109,SYCA113,SYCA114"] = "commercial", ["SYCA116"] = "knowledge",
        ["SYCA108"] = "building", ["SYCA110"] = "lodging", ["SYCA111"] = "factory", ["SYCA115"] = "land",
    };

    // 헤드라인 설정 전체 목록(기존 HEADLINE_MASTER — '선택'은 항상 맨 앞이라 제외)
    private static readonly string[] HeadlineMaster = Keys(
        "c_addr name dong ho c_top c_dir c_type c_area trade_type trade_amount c_loan c_updt c_regdt c_status c_leasecond c_movein c_maturity c_balancedate " +
        "c_houserental c_renewal c_opt c_roomcnt c_bathcnt c_bunyang c_balcony c_option c_premium c_rightamt c_moving c_biztype c_builduse c_biz " +
        "c_landcategory c_landuse c_expl c_consult c_match c_owner c_tenant c_deposit_total c_yincome c_yexpense");

    private IEnumerable<string> TypeDefault() => ColSet[TypeColumns.GetValueOrDefault(_type) ?? "apt"];

    private IEnumerable<string> ActiveKeys() => _headline is { Count: > 0 } h ? new[] { "sel" }.Concat(h.Where(k => k != "sel" && C.ContainsKey(k))) : TypeDefault();

    private void BuildColumns()
    {
        Grid.Columns.Clear();
        foreach (var key in ActiveKeys())
        {
            var c = C[key];
            Grid.Columns.Add(new CellColumn(r => Cell(r, c))
            {
                Header = Header(c), Width = c.Width, CanUserResize = true, HeaderStyle = HeadStyle,
            });
        }
    }

    private static readonly Style HeadStyle = MakeHeadStyle();

    private static Style MakeHeadStyle()
    {
        var s = new Style(typeof(DataGridColumnHeader));
        s.Setters.Add(new Setter(Control.BackgroundProperty, B("#FAFAFA")));
        s.Setters.Add(new Setter(Control.PaddingProperty, new Thickness(0)));
        s.Setters.Add(new Setter(Control.HorizontalContentAlignmentProperty, HorizontalAlignment.Stretch));
        s.Setters.Add(new Setter(Control.VerticalContentAlignmentProperty, VerticalAlignment.Stretch));
        s.Setters.Add(new Setter(Control.BorderBrushProperty, Brushes.Black));
        s.Setters.Add(new Setter(Control.BorderThicknessProperty, new Thickness(0, 0, 0, 1)));
        s.Setters.Add(new Setter(Control.TemplateProperty, System.Windows.Markup.XamlReader.Parse(
            "<ControlTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='DataGridColumnHeader'>" +
            "<Border Background='{TemplateBinding Background}' BorderBrush='{TemplateBinding BorderBrush}' BorderThickness='{TemplateBinding BorderThickness}'>" +
            "<Border BorderBrush='#E5E7EB' BorderThickness='0,0,1,0'><ContentPresenter HorizontalAlignment='Stretch' VerticalAlignment='Stretch'/></Border></Border></ControlTemplate>")));
        return s;
    }

    /// <summary>머리 — 제목(25) + 필터행(25). 선택·자사/공동망매칭은 두 행을 합친 한 칸</summary>
    private FrameworkElement Header(Col c)
    {
        TextBlock Title(string t) => new() { Text = t, FontSize = 14, FontWeight = FontWeights.Medium, Foreground = Brushes.Black, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis };
        if (c.Kind == "sel") return SelHeader();
        if (c.Kind == "match") return new Border { Height = 50, Child = Title(c.Label) };
        var g = new Grid { Height = 50 };
        g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(25) });
        g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(25) });
        g.Children.Add(Title(c.Label));
        FrameworkElement filter = c.Kind switch
        {
            "trade_type" => TradeTypeFilter(),
            "trade_amount" => Segments(new[] { "매매가", "전세가", "월세가", "기타임대" }, t => new TextBlock { Text = t, FontSize = 13, FontWeight = FontWeights.Bold, Foreground = B("#334155"), HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center }, "#CBD5E1"),
            _ => ColFilterBox(c),
        };
        System.Windows.Controls.Grid.SetRow(filter, 1);
        g.Children.Add(filter);
        return g;
    }

    /// <summary>선택 │ 정보망 │ 보고서 │ 진행중 — 세로 글자 · 색 · 구분선</summary>
    private static FrameworkElement SelHeader()
    {
        var g = new Grid { Height = 50 };
        var items = new[] { ("선　택", "#111827"), ("정보망", "#1D4ED8"), ("보고서", "#4338CA"), ("진행중", "#C2410C") };
        for (int i = 0; i < items.Length; i++)
        {
            g.ColumnDefinitions.Add(new ColumnDefinition());
            var sp = new StackPanel { VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Center };
            foreach (var ch in items[i].Item1)
                sp.Children.Add(new TextBlock { Text = ch.ToString(), FontSize = 13, FontWeight = FontWeights.ExtraBold, Foreground = B(items[i].Item2), LineHeight = 14, LineStackingStrategy = LineStackingStrategy.BlockLineHeight, HorizontalAlignment = HorizontalAlignment.Center });
            var cell = new Border { Child = sp, BorderBrush = B("#CBD5E1"), BorderThickness = new Thickness(i > 0 ? 1 : 0, 0, 0, 0) };
            System.Windows.Controls.Grid.SetColumn(cell, i);
            g.Children.Add(cell);
        }
        return g;
    }

    /// <summary>거래유형 필터행 — 매/전/월/기 입체 버튼(복수 선택, 위 거래구분 탭과 같은 상태)</summary>
    private FrameworkElement TradeTypeFilter()
    {
        var g = new Grid { Margin = new Thickness(1) };
        var items = new[] { ("SALEDIV01", "매", "매매"), ("SALEDIV02", "전", "전세"), ("SALEDIV03", "월", "월세"), ("SALEDIV04", "기", "기타임대") };
        for (int i = 0; i < items.Length; i++)
        {
            var (code, ch, tip) = items[i];
            var on = _saleDivs.Contains(code);
            g.ColumnDefinitions.Add(new ColumnDefinition());
            var b = new Border
            {
                CornerRadius = new CornerRadius(4), BorderThickness = new Thickness(1), BorderBrush = B(on ? "#3730A3" : "#B6BFCA"), Margin = new Thickness(i > 0 ? 2 : 0, 0, 0, 0),
                Background = new LinearGradientBrush(on ? Color.FromRgb(0x5B, 0x52, 0xE6) : Colors.White, on ? Color.FromRgb(0x43, 0x38, 0xCA) : Color.FromRgb(0xE6, 0xEA, 0xEF), 90),
                Cursor = Cursors.Hand, ToolTip = tip,
                Child = new TextBlock { Text = ch, FontSize = 14, FontWeight = FontWeights.ExtraBold, Foreground = on ? Brushes.White : B("#111827"), HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center },
            };
            b.MouseLeftButtonUp += async (_, e) => { e.Handled = true; await ToggleSaleDivAsync(code); };
            System.Windows.Controls.Grid.SetColumn(b, i);
            g.Children.Add(b);
        }
        return g;
    }

    // 의뢰금액 4칸 비율(기존 flex [1, 1, 1.5, 1.2])
    private static readonly double[] AmtFlex = { 1, 1, 1.5, 1.2 };

    private static Grid Segments(IReadOnlyList<string> items, Func<string, FrameworkElement> make, string line, double[]? flex = null)
    {
        flex ??= items.Count == 4 && line == "#CBD5E1" ? AmtFlex : null;
        var g = new Grid();
        for (int i = 0; i < items.Count; i++)
        {
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(flex?[i] ?? 1, GridUnitType.Star) });
            var cell = new Border { Child = make(items[i]), BorderBrush = B(line), BorderThickness = new Thickness(i > 0 ? 1 : 0, 0, 0, 0) };
            System.Windows.Controls.Grid.SetColumn(cell, i);
            g.Children.Add(cell);
        }
        return g;
    }

    /// <summary>필터칸 — 부분일치 입력 + 깔때기(목록에서 고르기). 값이 있으면 인디고 테두리</summary>
    private FrameworkElement ColFilterBox(Col c)
    {
        var dp = new DockPanel { Margin = new Thickness(3, 2, 3, 2) };
        var picks = _colPick.GetValueOrDefault(c.Key);
        var funnelOn = picks is { Count: > 0 };
        var funnel = new Viewbox
        {
            Width = 13, Height = 13, Margin = new Thickness(3, 0, 0, 0), Cursor = Cursors.Hand, ToolTip = "목록에서 선택", VerticalAlignment = VerticalAlignment.Center,
            Child = new System.Windows.Shapes.Path
            {
                Data = Geometry.Parse("M22,3 L2,3 L10,12.46 L10,19 L14,21 L14,12.46 Z"), Stroke = B(funnelOn ? "#4F46E5" : "#9CA3AF"), StrokeThickness = 2.5,
                Fill = funnelOn ? B("#4F46E5") : Brushes.Transparent, StrokeLineJoin = PenLineJoin.Round, Width = 24, Height = 24, Stretch = Stretch.None,
            },
        };
        funnel.MouseLeftButtonUp += (_, e) => { e.Handled = true; OpenColMenu(c, funnel); };
        DockPanel.SetDock(funnel, Dock.Right);
        dp.Children.Add(funnel);
        var tb = new TextBox
        {
            Text = _colFilter.GetValueOrDefault(c.Key) ?? "", FontSize = 13, FontWeight = FontWeights.Normal, Padding = new Thickness(4, 0, 4, 0), Height = 21, MinHeight = 0,
            VerticalContentAlignment = VerticalAlignment.Center, BorderBrush = B(_colFilter.ContainsKey(c.Key) || funnelOn ? "#4F46E5" : "#CBD5E1"),
        };
        Placeholder.Set(tb, c.Label, 4);
        tb.TextChanged += (_, _) =>
        {
            if (tb.Text.Trim().Length == 0) _colFilter.Remove(c.Key); else _colFilter[c.Key] = tb.Text;
            tb.BorderBrush = B(_colFilter.ContainsKey(c.Key) || _colPick.GetValueOrDefault(c.Key) is { Count: > 0 } ? "#4F46E5" : "#CBD5E1");
            _filterTimer.Stop();
            _filterTimer.Start();
        };
        dp.Children.Add(tb);
        return dp;
    }

    /// <summary>깔때기 목록(기존 colMenu) — 물건명은 단지목록·소재지목록, 동·호는 현재 목록의 값. 체크 후 [적용]</summary>
    private void OpenColMenu(Col c, FrameworkElement target)
    {
        var draft = new HashSet<string>(_colPick.GetValueOrDefault(c.Key) ?? new());
        var list = new StackPanel();
        var real = Rows.Where(r => r.Long("is_ghost") != 1).ToList();
        IEnumerable<string> Distinct(Func<Row, string?> f) => Rows.Select(f).Where(s => !string.IsNullOrEmpty(s)).Distinct()!.OrderBy(s => s, NaturalComparer.Instance)!;
        void Section(string title) => list.Children.Add(new TextBlock { Text = title, FontSize = 11, FontWeight = FontWeights.Bold, Foreground = B("#94A3B8"), Margin = new Thickness(12, 4, 12, 4) });
        void Check(string v, string label)
        {
            var cb = new CheckBox { Content = new TextBlock { Text = label, FontSize = 13, TextTrimming = TextTrimming.CharacterEllipsis }, IsChecked = draft.Contains(v), Padding = new Thickness(6, 0, 0, 0), VerticalContentAlignment = VerticalAlignment.Center };
            var row = new Border { Child = cb, Padding = new Thickness(12, 5, 12, 5), Background = draft.Contains(v) ? B("#EEF2FF") : Brushes.White };
            cb.Click += (_, _) => { if (cb.IsChecked == true) draft.Add(v); else draft.Remove(v); row.Background = draft.Contains(v) ? B("#EEF2FF") : Brushes.White; };
            list.Children.Add(row);
        }
        var count = 0;
        if (c.Key == "name")
        {
            var danji = Distinct(DanjiOf).ToList();
            var soji = Distinct(RegionOf).ToList();
            if (danji.Count > 0) { Section("단지목록"); foreach (var v in danji) Check(v, v); }
            if (soji.Count > 0) { Section("소재지목록"); foreach (var v in soji) Check(v, v); }
            count = danji.Count + soji.Count;
        }
        else if (c.Key is "dong" or "ho")
        {
            var suffix = c.Key == "dong" ? "동" : "호";
            foreach (var v in Distinct(r => r.Str(c.Key))) { Check(v, v + suffix); count++; }
        }
        _ = real;
        if (count == 0) list.Children.Add(new TextBlock { Text = "목록이 없습니다.", FontSize = 13, Foreground = B("#94A3B8"), Margin = new Thickness(12, 10, 12, 10) });

        var popup = new Popup { PlacementTarget = target, Placement = PlacementMode.Bottom, StaysOpen = false, AllowsTransparency = true, VerticalOffset = 4 };
        var clear = new Button { Content = "전체해제", FontSize = 13, FontWeight = FontWeights.SemiBold, Padding = new Thickness(10, 3, 10, 3), MinHeight = 0, BorderBrush = B("#CBD5E1"), Foreground = B("#64748B") };
        var apply = new Button { Content = "적용", FontSize = 13, FontWeight = FontWeights.Bold, Padding = new Thickness(16, 3, 16, 3), MinHeight = 0, Style = (Style)Application.Current.FindResource("PrimaryButton") };
        clear.Click += (_, _) => { draft.Clear(); foreach (var b in list.Children.OfType<Border>()) if (b.Child is CheckBox x) { x.IsChecked = false; b.Background = Brushes.White; } };
        apply.Click += (_, _) =>
        {
            if (draft.Count == 0) _colPick.Remove(c.Key); else _colPick[c.Key] = draft;
            popup.IsOpen = false;
            _page = 1;
            BuildColumns();   // 깔때기 색 갱신
            ApplyView();
        };
        var foot = new DockPanel { Margin = new Thickness(8) };
        DockPanel.SetDock(apply, Dock.Right);
        foot.Children.Add(apply);
        foot.Children.Add(new StackPanel { Orientation = Orientation.Horizontal, Children = { clear } });
        var root = new DockPanel();
        var footBox = new Border { Child = foot, BorderBrush = B("#EEF1F5"), BorderThickness = new Thickness(0, 1, 0, 0) };
        DockPanel.SetDock(footBox, Dock.Bottom);
        root.Children.Add(footBox);
        root.Children.Add(new ScrollViewer { Content = list, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Padding = new Thickness(0, 4, 0, 4) });
        popup.Child = new Border
        {
            Child = root, Width = 250, MaxHeight = 360, Background = Brushes.White, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8),
            Margin = new Thickness(0, 0, 10, 10), Effect = new System.Windows.Media.Effects.DropShadowEffect { BlurRadius = 18, ShadowDepth = 4, Opacity = 0.18, Direction = 270 },
        };
        popup.IsOpen = true;
    }

    // ---------------- 셀 ----------------

    private static readonly string[] DanjiCodes = { "SYCA101", "SYCA102", "SYCA103", "SYCA104", "SYCA105", "SYCA106", "SYCA107", "SYCA120" };
    private static bool IsAptRow(Row r) => DanjiCodes.Contains(r.Str("pt_type") ?? "") || r.Has("danji_code");
    private static string DanjiOf(Row r) => (IsAptRow(r) ? r.Str("addr4") : r.Str("addr5")) ?? "";
    private static string RegionOf(Row r) => string.Join(" ", new[] { r.Str("addr1"), r.Str("addr2"), r.Str("addr3") }.Where(s => !string.IsNullOrEmpty(s)));

    private static string AbbrevSido(string? s) =>
        string.IsNullOrEmpty(s) ? "" : s.StartsWith("서울") ? "서울" : System.Text.RegularExpressions.Regex.Replace(s, "(특별자치도|특별자치시|특별시|광역시)$", "");

    /// <summary>물건명 표시 — 단지형은 단지명(addr4), 그 외는 건물명(addr5) → 물건명 → '시도 시군구 읍면동 지번'</summary>
    private static string NameOf(Row r)
    {
        var apt = IsAptRow(r);
        var jibun = r.Str("jibun") ?? (!apt ? r.Str("addr4") : null) ?? "";
        var danji = apt ? r.Str("addr4") : r.Str("addr5");
        var region = string.Join(" ", new[] { AbbrevSido(r.Str("addr1")), r.Str("addr2"), r.Str("addr3"), jibun }.Where(s => !string.IsNullOrEmpty(s)));
        return !string.IsNullOrEmpty(danji) ? danji : r.Str("pt_name") is { Length: > 0 } pn ? pn : region;
    }

    private static string Money(long? v) => v is null or 0 ? "-" : $"{v:#,0}만";
    private static string Yymmdd(string? v) => DateTime.TryParse(v, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d.ToString("yy.MM.dd", CultureInfo.InvariantCulture) : "-";
    private static long Sum(Row r, params string[] keys) => keys.Sum(k => r.Long(k) ?? 0);

    private static readonly Dictionary<string, string> MoneyField = new()
    {
        ["c_loan"] = "loan_amt", ["c_saleamt"] = "sale_amt", ["c_bunyang"] = "presale_amt", ["c_premium"] = "premium_amt", ["c_balcony"] = "expansion_amt",
        ["c_option"] = "option_amt", ["c_rightamt"] = "right_value_amt", ["c_keymoney"] = "lay_amt", ["c_moving"] = "moving_cost", ["c_deposit_total"] = "deposit_total",
        ["c_loan_total"] = "loan_total", ["c_deposit_sum"] = "deposit_sum", ["c_month_sum"] = "mon_sum",
    };
    private static readonly Dictionary<string, string> AreaField = new() { ["c_area_exc"] = "exc_area", ["c_area_sup"] = "sup_area", ["c_area_gross"] = "gross_area", ["c_area_land"] = "land_share", ["c_area_land_only"] = "land_share" };

    private static long YIncome(Row r) => Sum(r, "inc_rent_y", "inc_mgmt_y", "inc_etc_y");
    private static long YExpense(Row r) => Sum(r, "exp_labor_y", "exp_util_y", "exp_loan_y", "exp_etc_y");

    /// <summary>대표 면적 — 토지: (토지) 대지지분, 단지형: (전용) 없으면 (공급), 그 외: (대지)</summary>
    private static string AreaDisplay(Row r)
    {
        var code = r.Str("pt_type");
        decimal? v; string prefix;
        if (code == Catalog.LandCode) { prefix = "토지"; v = r.Dec("land_share") ?? r.Dec("gross_area") ?? r.Dec("exc_area") ?? r.Dec("sup_area"); }
        else if (DanjiCodes.Contains(code ?? "")) { v = r.Dec("exc_area"); prefix = "전용"; if (v is null or 0) { v = r.Dec("sup_area"); prefix = "공급"; } }
        else { prefix = "대지"; v = r.Dec("gross_area") ?? r.Dec("land_share") ?? r.Dec("exc_area") ?? r.Dec("sup_area"); }
        return v is null or 0 ? "" : $"({prefix}){v:0.##}㎡";
    }

    /// <summary>필터·표시 공용 칼럼 글자(기존 colText — 금액은 숫자 그대로)</summary>
    private static string ColText(Row r, string key)
    {
        if (MoneyField.TryGetValue(key, out var mf)) return r.Long(mf) is { } m and not 0 ? m.ToString(CultureInfo.InvariantCulture) : "";
        if (AreaField.TryGetValue(key, out var af)) return r.Dec(af) is { } a and not 0 ? a.ToString("0.##", CultureInfo.InvariantCulture) : "";
        return key switch
        {
            "name" => r.Str("pt_name") ?? r.Str("addr4") ?? "",
            "dong" => r.Str("dong") ?? "",
            "ho" => r.Str("ho") ?? "",
            "c_type" => r.Str("apt_typ") ?? "",
            "c_dir" => r.Str("dir_std") ?? "",
            "c_status" => r.Str("current_status") ?? "",
            "c_maturity" => Yymmdd(r.Str("mtry_date")),
            "c_updt" => Yymmdd(r.Str("upd_dt") ?? r.Str("reg_dt")),
            "c_landcategory" => r.Str("land_category") ?? "",
            "c_landuse" => r.Str("land_use") ?? "",
            "c_biz" => r.Str("business_name") ?? "",
            "c_consult" => r.Str("consult_content") ?? r.Str("pt_memo") ?? "",
            "c_buildyear" => (r.Str("comp_year") ?? "") is { Length: >= 4 } y ? y[..4] : r.Str("comp_year") ?? "",
            "c_rooms" => r.Str("guest_room_cnt") ?? "",
            "c_area" => AreaDisplay(r),
            "c_yincome" => YIncome(r) is var yi and not 0 ? yi.ToString(CultureInfo.InvariantCulture) : "",
            "c_yexpense" => YExpense(r) is var ye and not 0 ? ye.ToString(CultureInfo.InvariantCulture) : "",
            "c_addr" => RegionOf(r),
            "c_top" => r.Str("top") ?? "",
            "c_regdt" => Yymmdd(r.Str("reg_dt")),
            "c_movein" => r.Str("mvn_psb_yn") ?? "",
            "c_balancedate" => Yymmdd(r.Str("expt_date")),
            "c_houserental" => r.Str("house_rental") ?? "",
            "c_renewal" => r.Str("contract_renewal_right") ?? "",
            "c_opt" => r.Str("opt") ?? "",
            "c_roomcnt" => r.Str("room_cnt") ?? "",
            "c_bathcnt" => r.Str("bath_cnt") ?? "",
            "c_biztype" => r.Str("business_type") ?? "",
            "c_builduse" => r.Str("building_use") ?? r.Str("main_building_use") ?? "",
            "c_expl" => r.Str("pt_expl") ?? "",
            "c_owner" => r.Str("registry_owner") ?? "",
            "c_tenant" => r.Str("contract_tenant") ?? "",
            "c_leasecond" => r.Long("now_dep_amt") is > 0 || r.Long("now_mon_amt") is > 0 ? $"{Money(r.Long("now_dep_amt"))} / {Money(r.Long("now_mon_amt"))}" : "",
            _ => "",
        };
    }

    private static TextBlock T(string? text, bool trim = true) => new()
    {
        Text = string.IsNullOrEmpty(text) ? "-" : text, FontSize = 14, FontWeight = FontWeights.Medium, Foreground = Brushes.Black,
        HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center, Padding = new Thickness(4, 0, 4, 0),
        TextTrimming = trim ? TextTrimming.CharacterEllipsis : TextTrimming.None, ToolTip = string.IsNullOrEmpty(text) ? null : text,
    };

    private FrameworkElement Cell(Row r, Col c)
    {
        var ghost = r.Long("is_ghost") == 1;
        switch (c.Key)
        {
            case "sel": return SelCell(r, ghost);
            case "name":
            {
                var v = NameOf(r);
                var t = T(v.Length > 12 ? v[..12] + "…" : v);
                t.ToolTip = v.Length > 0 ? v : null;
                return t;
            }
            case "dong": return T(r.Has("dong") ? $"{r.Str("dong")}동" : null);
            case "ho": return T(r.Has("ho") ? $"{r.Str("ho")}호" : null);
            case "trade_type":
            {
                if (ghost) return T("(미등록 호)");
                return TradeTypeCell(r);
            }
            case "trade_amount":
            {
                if (ghost) return T("");
                return TradeAmountCell(r, Money);
            }
            case "c_match": return T(ghost ? "" : "- / -");
        }
        if (ghost) return T(c.Key is "c_type" ? r.Str("apt_typ") : "");
        if (MoneyField.ContainsKey(c.Key)) return T(Money(r.Long(MoneyField[c.Key])));
        if (c.Key == "c_yincome") return T(Money(YIncome(r)));
        if (c.Key == "c_yexpense") return T(Money(YExpense(r)));
        if (AreaField.TryGetValue(c.Key, out var af)) return T(r.Dec(af) is { } a and not 0 ? $"{a:0.##}㎡" : null);
        return T(ColText(r, c.Key));
    }

    /// <summary>거래유형 칸 — 매/전/월/기 4칸(상태별 생·예·보, 없음 '-'). 만기관리도 같이 쓴다</summary>
    internal static FrameworkElement TradeTypeCell(Row r)
    {
        var map = DivStatus(r.Str("sale_div"));
        var chars = new[] { ("SALEDIV01", "매"), ("SALEDIV02", "전"), ("SALEDIV03", "월"), ("SALEDIV04", "기") }.Select(x => map.TryGetValue(x.Item1, out var s) ? s switch { "" => x.Item2, "S" => "생", "Y" => "예", "B" => "보", _ => x.Item2 } : "-").ToList();
        return Segments(chars, ch => T(ch, false), "#EEF2F7", new double[] { 1, 1, 1, 1 });
    }

    /// <summary>거래금액 칸 — 매매가|전세가|월세가|기타임대 4칸, 해당 구분만 금액 표기. 만기관리도 같이 쓴다</summary>
    internal static FrameworkElement TradeAmountCell(Row r, Func<long?, string> money, double[]? flex = null)
    {
        var map = DivStatus(r.Str("sale_div"));
        string? Amt(string code) => !map.ContainsKey(code) ? null : code switch
        {
            "SALEDIV01" => r.Long("sale_amt") is > 0 ? money(r.Long("sale_amt")) : null,
            "SALEDIV02" => r.Long("les_amt") is > 0 ? money(r.Long("les_amt")) : null,
            "SALEDIV03" => r.Long("prot_amt") is > 0 || r.Long("mon_amt") is > 0 ? $"{money(r.Long("prot_amt"))}/{money(r.Long("mon_amt"))}" : null,
            _ => r.Long("etc_amt") is > 0 || r.Long("etc_amt2") is > 0 ? $"{money(r.Long("etc_amt"))}/{money(r.Long("etc_amt2"))}" : null,
        };
        var vals = new[] { "SALEDIV01", "SALEDIV02", "SALEDIV03", "SALEDIV04" }.Select(x => Amt(x) ?? "-").ToList();
        return Segments(vals, v => T(v), "#EEF2F7", flex ?? AmtFlex);
    }

    /// <summary>sale_div("SALEDIV01,SALEDIV03S") → {구분: 상태접미('' 활성, S 생각, Y 예정, B 보류)}</summary>
    private static Dictionary<string, string> DivStatus(string? saleDiv)
    {
        var map = new Dictionary<string, string>();
        foreach (var code in (saleDiv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            foreach (var b in new[] { "SALEDIV01", "SALEDIV02", "SALEDIV03", "SALEDIV04" })
                if (code.StartsWith(b, StringComparison.Ordinal)) map[b] = code[b.Length..];
        return map;
    }

    /// <summary>선택 칸 — 체크(한 건 선택) · 정보망 · 보고서 · 진행중 색 사각(완료=진함, 미완=연함)</summary>
    private FrameworkElement SelCell(Row r, bool ghost)
    {
        var g = new Grid();
        foreach (var w in new[] { 1.5, 1, 1, 1 }) g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(w, GridUnitType.Star) });
        var cb = new CheckBox { HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        cb.SetBinding(ToggleButton.IsCheckedProperty, new Binding(nameof(DataGridRow.IsSelected)) { RelativeSource = new RelativeSource(RelativeSourceMode.FindAncestor, typeof(DataGridRow), 1), Mode = BindingMode.OneWay });
        cb.Click += (_, e) => { e.Handled = true; Grid.SelectedItems.Clear(); if (cb.IsChecked == true) Grid.SelectedItem = r; };
        g.Children.Add(cb);
        if (ghost) return g;
        var ptNo = r.Long("pt_no") ?? 0;
        var transmitted = r.Has("transmit_dt");
        var report = _reportNos.Contains(ptNo);
        var active = (r.Str("pt_sts") ?? "").Contains("PTSTS01");
        Border Sq(int col, string bg, string brd, string tip, Action click)
        {
            var b = new Border { Width = 16, Height = 16, CornerRadius = new CornerRadius(3), BorderThickness = new Thickness(1), Background = B(bg), BorderBrush = B(brd), Cursor = Cursors.Hand, ToolTip = tip, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
            b.MouseLeftButtonDown += (_, e) => e.Handled = true;
            b.MouseLeftButtonUp += (_, e) => { e.Handled = true; click(); };
            System.Windows.Controls.Grid.SetColumn(b, col);
            g.Children.Add(b);
            return b;
        }
        Sq(1, transmitted ? "#1D4ED8" : "#DBEAFE", transmitted ? "#1E3A8A" : "#93C5FD", transmitted ? "정보망 전송됨" : "정보망 전송",
            () => Dialogs.Info("정보망(공동중개망) 전송은 운영 서버 기능입니다.\n로컬 버전 연결 방법을 확인 중입니다.", "정보망 전송"));
        Sq(2, report ? "#4338CA" : "#E0E7FF", report ? "#3730A3" : "#C7D2FE", report ? "보고서 작성 선택됨" : "보고서 작성 선택/해제", () =>
        {
            if (!_reportNos.Remove(ptNo)) _reportNos.Add(ptNo);
            RenderReport();
            Grid.Items.Refresh();
        });
        Sq(3, active ? "#C2410C" : "#FFEDD5", active ? "#9A3412" : "#FDBA74", active ? "진행중 해제" : "진행중으로 변경", async () =>
        {
            if (!Dialogs.Confirm(active ? "진행중을 해제하시겠습니까?" : "해당 물건을 진행중으로 변경하시겠습니까?")) return;
            await Dialogs.RunAsync(async () =>
            {
                await _svc.SetStatusAsync(ptNo, active ? null : "PTSTS01");
                await ReloadAllAsync();
            });
        });
        return g;
    }

    // ---------------- 표 데이터 ----------------

    protected override string? KeyName => "pt_no";

    protected override async Task<List<Row>> LoadAsync()
    {
        // 왼쪽에서 단지·건물이 선택돼야 표를 채운다(기존: 목록이 있으면 첫 번째 자동 선택)
        if (_summary is null)
        {
            CountText.ToolTip = "왼쪽 물건리스트에서 단지·건물을 선택하세요";
            return new List<Row>();
        }
        var danji = _summary.Str("danji_code");
        var rows = await _svc.ListAsync(new Row
        {
            ["q_pt_type"] = _type.Length > 0 ? _type : _panelType,
            ["q_sale_div"] = _saleDivs.Count == 0 ? null : string.Join(",", _saleDivs),
            ["q_pt_sts"] = _progressOnly ? "PTSTS01" : null,
            ["q_floor"] = ComboValue(_floor),
            ["q_area_min"] = _area.Min, ["q_area_max"] = _area.Max,
            ["q_amt_min"] = _amount.Min, ["q_amt_max"] = _amount.Max,
            ["q_danji_code"] = danji,
            ["q_pt_no"] = _summary.Long("pt_no"),
        });
        // 단지를 고르면 미등록 호(서버 호 목록)도 함께(진행중 탭·필터가 없을 때만 — 미등록 호는 상태·금액이 없다)
        if (danji is not null && !_progressOnly && _saleDivs.Count == 0 && _area.Min is null && _area.Max is null && _amount.Min is null && _amount.Max is null)
        {
            try
            {
                var hos = new List<(string, Row)>();
                foreach (var d in await AppServices.Server.GetDongListAsync(danji))
                {
                    var dongNo = (int)(d.Long("dongNo") ?? d.Long("dong_no") ?? 0);
                    var dongName = d.Str("dongName") ?? d.Str("dong_name") ?? dongNo.ToString();
                    foreach (var h in await AppServices.Server.GetHoListAsync(danji, dongNo)) hos.Add((dongName, h));
                }
                rows = LayoutService.MergeGhosts(rows, hos, danji);
            }
            catch { /* 서버 연결 안 되면 등록 물건만 */ }
        }
        CountText.ToolTip = null;
        return rows;
    }

    /// <summary>칼럼 필터(부분일치·깔때기) → 줄수(페이지) 적용</summary>
    protected override IList<Row> ViewRows(List<Row> rows)
    {
        IEnumerable<Row> arr = rows;
        string NameHay(Row r) => $"{DanjiOf(r)} {RegionOf(r)} {r.Str("pt_name")}".ToLowerInvariant();
        if (_colFilter.TryGetValue("name", out var nq) && nq.Trim().Length > 0) { var q = nq.Trim().ToLowerInvariant(); arr = arr.Where(r => NameHay(r).Contains(q)); }
        if (_colPick.TryGetValue("name", out var np) && np.Count > 0) arr = arr.Where(r => np.Any(s => NameHay(r).Contains(s.ToLowerInvariant())));
        foreach (var (key, text) in _colFilter.Where(k => k.Key != "name").ToList())
        {
            var q = text.Trim().ToLowerInvariant();
            if (q.Length > 0) arr = arr.Where(r => ColText(r, key).ToLowerInvariant().Contains(q));
        }
        foreach (var (key, picks) in _colPick.Where(k => k.Key != "name").ToList())
            if (picks.Count > 0) arr = arr.Where(r => picks.Any(s => ColText(r, key).Contains(s)));
        var list = arr.ToList();
        var size = _rowCount.SelectedValue as string == "all" ? int.MaxValue : int.TryParse(_rowCount.SelectedValue as string, out var n) ? n : 100;
        var pages = size == int.MaxValue ? 1 : Math.Max(1, (int)Math.Ceiling(list.Count / (double)size));
        if (_page > pages) _page = pages;
        RenderPager(pages);
        return size == int.MaxValue ? list : list.Skip((_page - 1) * size).Take(size).ToList();
    }

    /// <summary>다시 조회하지 않고 필터·페이지만 다시 적용</summary>
    private void ApplyView()
    {
        var view = ViewRows(Rows);
        Grid.ItemsSource = view;
        CountText.Text = $"{view.Count:#,0}건";
    }

    private void RenderPager(int pages)
    {
        _pager.Children.Clear();
        _pager.Visibility = pages > 1 ? Visibility.Visible : Visibility.Collapsed;
        if (pages <= 1) return;
        Button P(string t, int page, bool on = false, bool enabled = true)
        {
            var b = new Button
            {
                Content = t, FontSize = 13, MinWidth = 30, Height = 28, MinHeight = 0, Padding = new Thickness(6, 0, 6, 0), Margin = new Thickness(2, 0, 2, 0), IsEnabled = enabled,
                Background = on ? B("#4F46E5") : Brushes.White, Foreground = on ? Brushes.White : B("#374151"), BorderBrush = on ? B("#4F46E5") : B("#D1D5DB"),
            };
            b.Click += (_, _) => { _page = page; ApplyView(); };
            return b;
        }
        _pager.Children.Add(P("‹", _page - 1, enabled: _page > 1));
        var from = Math.Max(1, _page - 4);
        var to = Math.Min(pages, from + 9);
        for (int i = from; i <= to; i++) _pager.Children.Add(P(i.ToString(), i, i == _page));
        _pager.Children.Add(P("›", _page + 1, enabled: _page < pages));
    }

    protected override async Task OpenAsync(Row? row)
    {
        PropertyDetail? d;
        if (row is null)
        {
            var type = (_type.Length > 0 ? _type : _panelType)?.Split(',')[0];
            if (type == "SYCA109") type = "SYCA113";
            d = _svc.New(string.IsNullOrEmpty(type) ? null : type);
        }
        else if (row.Long("is_ghost") == 1)
        {
            // 단지 미등록 호 → 배치도 클릭처럼 소재지·단지·동·호·층·타입·면적을 채운 새 물건
            d = _svc.New(row.Str("pt_type"));
            foreach (var k in new[] { "addr1", "addr2", "addr3", "addr4", "jibun", "bjd_code", "danji_code", "dong", "ho", "floor1", "apt_typ", "sup_area", "exc_area" })
                if (row[k] is { } v) d.Pt[k] = v;
        }
        else d = await _svc.GetAsync(row.Long("pt_no")!.Value);
        if (d is null) { Dialogs.Warn("물건 정보를 찾을 수 없습니다."); return; }
        // 기존: 물건 창은 하나 — 열려 있으면 내용만 바꾸고 앞으로(일반 창)
        SingleWindow.Show("property", new PropertyEditWindow(_svc, d), () => _ = ReloadAllAsync());
    }

    /// <summary>엑셀 일괄 업로드(기존 DataUploadPage, target=property)</summary>
    private async Task UploadAsync()
    {
        // 일반 창(모덜리스) — 띄운 채 다른 메뉴도 쓸 수 있고, 등록되면 목록을 새로 읽는다
        Upload.BulkUploadWindow.ShowSingle("property", () => _ = ReloadAllAsync());
        await Task.CompletedTask;
    }

    /// <summary>보고서 작성 — 선택 칸의 '보고서' 사각으로 고른 물건(고른 순서)으로 매물 브리핑</summary>
    private async Task ReportAsync()
    {
        if (_reportNos.Count == 0) { Toast.Error("보고서작성 버튼으로 물건을 먼저 선택해주세요."); return; }
        new Reports.ReportBuilderWindow(_reportNos.ToList()).ShowDialog();
        await Task.CompletedTask;
    }

    /// <summary>복사등록 — 소재지·면적·금액 등 기본정보만 복사(소유자·메모·상담은 비움)</summary>
    private async Task CopyAsync()
    {
        if (Selected?.Long("pt_no") is not { } no) { Toast.Show("복사할 물건을 선택하세요."); return; }
        var src = await _svc.GetAsync(no);
        if (src is null) return;
        var p = src.Pt.Clone();
        foreach (var k in new[] { "pt_no", "reg_dt", "reg_id", "upd_dt", "upd_id", "history_count", "ho", "pt_name" }) p.Remove(k);
        var d = new PropertyDetail { Pt = p };
        d.Holders.Add(new Row { ["holder_type"] = "OWNER", ["holder_reg_date"] = LocalDate.Today });
        SingleWindow.Show("property", new PropertyEditWindow(_svc, d), () => _ = ReloadAllAsync());
    }

    private async Task DeleteSelectedAsync()
    {
        var rows = GridBuilder.SelectedRows(Grid).Where(r => r.Long("pt_no") is not null && r.Long("is_ghost") != 1).ToList();
        if (rows.Count == 0) { Toast.Show("삭제할 물건을 선택하세요."); return; }
        await PropertyDelete.ConfirmAndDeleteAsync(_svc, rows.Select(x => x.Long("pt_no")!.Value).ToList());
        await ReloadAllAsync();   // 여러 건 중 일부만 지워졌어도 목록을 맞춘다
    }

    // ---------------- 헤드라인 설정 ----------------

    private static string HeadlineFile => System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "properties_headline.json");

    private static List<string>? LoadHeadline()
    {
        try { return File.Exists(HeadlineFile) ? JsonSerializer.Deserialize<List<string>>(File.ReadAllText(HeadlineFile)) is { Count: > 0 } l ? l : null : null; }
        catch { return null; }
    }

    private static void SaveHeadline(List<string>? keys)
    {
        try
        {
            if (keys is null) { if (File.Exists(HeadlineFile)) File.Delete(HeadlineFile); return; }
            Directory.CreateDirectory(System.IO.Path.GetDirectoryName(HeadlineFile)!);
            File.WriteAllText(HeadlineFile, JsonSerializer.Serialize(keys));
        }
        catch { /* 저장 실패는 무시 */ }
    }

    /// <summary>헤드라인 설정(기존 TableSettings) — 표시할 칼럼 선택 · 설정 초기화 · 취소 · 저장(이 PC에 보관)</summary>
    private void OpenHeadlineSettings()
    {
        var current = (_headline is { Count: > 0 } ? _headline : TypeDefault().Where(k => k != "sel").ToList()).ToList();
        var order = current.Concat(HeadlineMaster.Where(k => !current.Contains(k))).ToList();
        var checks = order.ToDictionary(k => k, k => current.Contains(k));
        var w = new Window
        {
            Title = "헤드라인 설정", Width = 640, Height = 640, Owner = Window.GetWindow(this), WindowStartupLocation = WindowStartupLocation.CenterOwner, ResizeMode = ResizeMode.NoResize,
            Background = Brushes.White, FontSize = 14,
        };
        var list = new WrapPanel { Margin = new Thickness(0, 4, 0, 0) };
        void Fill()
        {
            list.Children.Clear();
            foreach (var k in order)
            {
                var cb = new CheckBox { Content = C[k].Label, IsChecked = checks[k], Width = 180, Margin = new Thickness(0, 4, 0, 4), FontSize = 14, FontWeight = FontWeights.Normal };
                cb.Click += (_, _) => checks[k] = cb.IsChecked == true;
                list.Children.Add(cb);
            }
        }
        Fill();
        var root = new DockPanel { Margin = new Thickness(24, 20, 24, 18) };
        var title = new TextBlock { Text = "헤드라인 설정", FontSize = 18, FontWeight = FontWeights.SemiBold, Foreground = B("#111827"), Margin = new Thickness(0, 0, 0, 14) };
        DockPanel.SetDock(title, Dock.Top);
        root.Children.Add(title);
        var foot = new DockPanel { Margin = new Thickness(0, 14, 0, 0) };
        var reset = new Button { Content = "설정 초기화", Foreground = B("#DC2626"), BorderBrush = B("#FCA5A5") };
        reset.Click += (_, _) =>
        {
            if (!Dialogs.Confirm("테이블 설정(컬럼 구성/순서/색상 등)을 모두 초기화하시겠습니까?")) return;
            _headline = null;
            SaveHeadline(null);
            BuildColumns();
            w.Close();
        };
        foot.Children.Add(reset);
        var right = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
        var cancel = new Button { Content = "취소", IsCancel = true };
        cancel.Click += (_, _) => w.Close();
        var save = new Button { Content = "저장", Style = (Style)Application.Current.FindResource("PrimaryButton") };
        save.Click += (_, _) =>
        {
            var keys = order.Where(k => checks[k]).ToList();
            if (keys.Count == 0) { Toast.Error("표시할 컬럼을 하나 이상 선택하세요."); return; }
            _headline = keys;
            SaveHeadline(keys);
            BuildColumns();
            Toast.Success("테이블 설정이 저장되었습니다.");
            w.Close();
        };
        right.Children.Add(cancel);
        right.Children.Add(save);
        foot.Children.Add(right);
        DockPanel.SetDock(foot, Dock.Bottom);
        root.Children.Add(foot);
        var hint = new TextBlock { Text = "• '저장' 버튼을 클릭하면 설정이 이 PC에 저장됩니다.", FontSize = 13, Foreground = B("#6B7280"), Margin = new Thickness(0, 10, 0, 0) };
        DockPanel.SetDock(hint, Dock.Bottom);
        root.Children.Add(hint);
        root.Children.Add(new StackPanel
        {
            Children =
            {
                new TextBlock { Text = "표시할 컬럼 선택", FontSize = 14, FontWeight = FontWeights.Medium, Foreground = B("#374151"), Margin = new Thickness(0, 0, 0, 6) },
                new Border { Child = new ScrollViewer { Content = list, MaxHeight = 420, VerticalScrollBarVisibility = ScrollBarVisibility.Auto }, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(6), Padding = new Thickness(12, 8, 12, 8) },
            },
        });
        w.Content = root;
        w.ShowDialog();
    }
}

/// <summary>행(Row)마다 코드로 칸을 만드는 표 칼럼(읽기 전용)</summary>
internal sealed class CellColumn : DataGridColumn
{
    private readonly Func<Row, FrameworkElement> _build;
    public CellColumn(Func<Row, FrameworkElement> build) { _build = build; IsReadOnly = true; }
    protected override FrameworkElement GenerateElement(DataGridCell cell, object dataItem) => dataItem is Row r ? _build(r) : new TextBlock();
    protected override FrameworkElement GenerateEditingElement(DataGridCell cell, object dataItem) => GenerateElement(cell, dataItem);
}

/// <summary>숫자를 숫자 크기로 비교하는 가나다 정렬(기존 localeCompare numeric)</summary>
internal sealed class NaturalComparer : IComparer<string>
{
    public static readonly NaturalComparer Instance = new();
    public int Compare(string? a, string? b)
    {
        if (long.TryParse(a, out var x) && long.TryParse(b, out var y)) return x.CompareTo(y);
        return string.Compare(a, b, CultureInfo.GetCultureInfo("ko-KR"), CompareOptions.None);
    }
}

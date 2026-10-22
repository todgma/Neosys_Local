using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;
using static Neosys.Local.App.Ui.Legacy;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 물건관리 — 기존 PropertiesPage 모양:
///  - 위 검색 상자: 물건종류 버튼 줄 / [전체물건·진행중] · 보고서 작성 · 엑셀 업로드 · (오른쪽) 상담모드
///  - 왼쪽 '물건리스트'(접기 가능): 유형 묶음 → 단지·건물 묶음(건수/세대, 배치도·시트 버튼)
///  - 오른쪽 표: 도구줄 [거래구분 탭][면적▾][금액▾][층] N건 … [상태변경][복사등록][색 채우기][+ 신규 등록][수정][삭제]
///  - 왼쪽에서 단지·건물을 고르기 전에는 표를 비워 둔다(기존과 같음). 단지를 고르면 미등록 호도 함께 보인다.
/// </summary>
public sealed class PropertyPage : ListPage
{
    private readonly PropertyService _svc = AppServices.Create((sp, s) => new PropertyService(sp, s));
    private readonly WrapPanel _typeRow = new() { Margin = new Thickness(0, 0, 0, 2) };
    private readonly StackPanel _leftList = new();
    private readonly TextBox _listSearch = new() { FontSize = 13 };
    private readonly Border _side;
    private readonly ContentControl _saleDivHost = new();
    private readonly RangeFilter _area = new("면적", "㎡"), _amount = new("금액", "만원");
    private readonly ComboBox _floor = new() { Width = 90, DisplayMemberPath = "Label", SelectedValuePath = "Value" };

    private string _type = "";              // 물건종류(콤마 SYCA 코드), "" = 모든유형
    private bool _progressOnly;              // 진행중 탭
    private readonly HashSet<string> _saleDivs = new();
    private string? _panelType;              // 모든유형일 때 왼쪽에서 고른 유형 묶음
    private Row? _summary;                   // 왼쪽에서 고른 단지/건물
    private List<Row> _summaries = new();
    private bool _sideOpen = true;

    public PropertyPage() : base("물건관리", "물건명·주소·동호·소유자 검색")
    {
        // ── 위 검색 상자 ──
        FilterBar.Children.Clear();
        var box = new StackPanel();
        box.Children.Add(_typeRow);
        var row2 = new DockPanel();
        var right = new StackPanel { Orientation = Orientation.Horizontal };
        right.Children.Add(ConsultToggle());
        DockPanel.SetDock(right, Dock.Right);
        row2.Children.Add(right);
        var tabs = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        var tabHost = new ContentControl();
        void RenderTabs() => tabHost.Content = Segmented(new[] { ("all", "전체물건"), ("progress", "진행중") }, v => (v == "progress") == _progressOnly,
            async v => { _progressOnly = v == "progress"; RenderTabs(); await ReloadAllAsync(); });
        RenderTabs();
        tabs.Children.Add(tabHost);
        var report = new ComboBox { Width = 90, ItemsSource = new[] { "선택", "작성", "보고서 관리" }, SelectedIndex = 0 };
        report.SelectionChanged += async (_, _) =>
        {
            var v = report.SelectedItem as string;
            report.SelectedIndex = 0;
            if (v == "작성") await ReportAsync();
            else if (v == "보고서 관리") WindowManager.OpenMenu("report");
        };
        tabs.Children.Add(Group(Label("보고서 작성"), report));
        var upload = new Button { Content = WithIcon("", "엑셀 업로드"), BorderBrush = B("#E5E7EB"), Foreground = Brushes.Black, FontWeight = FontWeights.Medium };
        upload.Click += async (_, _) => await UploadAsync();
        tabs.Children.Add(Group(upload));
        var kw = SearchBox;
        kw.Width = 200;
        var go = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton") };
        go.Click += async (_, _) => await RefreshAsync();
        tabs.Children.Add(Group(kw, go));
        row2.Children.Add(tabs);
        box.Children.Add(row2);
        FilterBar.Children.Add(box);
        FilterBox.Background = B("#F9FAFB");
        FilterBox.BorderBrush = B("#D1D5DB");
        FilterBox.BorderThickness = new Thickness(1);
        FilterBox.Margin = new Thickness(0, 0, 0, 5);
        box.Width = double.NaN;
        FilterBar.SizeChanged += (_, _) => box.Width = Math.Max(0, FilterBar.ActualWidth - 4);

        // ── 표 위 도구줄 왼쪽: 거래구분 · 면적/금액 · 층 ──
        LeftBar.Children.Add(_saleDivHost);
        _area.Changed += async () => await RefreshAsync();
        _amount.Changed += async () => await RefreshAsync();
        _floor.ItemsSource = Opt.Pairs(("", "전부"), ("first", "1층만"), ("top", "탑층만"), ("exceptFirst", "1층제외"));
        _floor.SelectedIndex = 0;
        _floor.SelectionChanged += async (_, _) => { if (IsLoaded) await RefreshAsync(); };
        LeftBar.Children.Add(Group(_area, _amount, Label("층"), _floor));
        RenderSaleDivs();

        // 기존: 툴바는 [색 채우기][신규 등록][수정], 복사등록·상태변경·삭제는 행 우클릭
        AddButton("신규 등록", () => OpenAsync(null), "PrimaryButton");
        AddRowMenu("수정", async () => { if (Selected is { } r) await OpenAsync(r); else Toast.Show("수정할 물건을 선택하세요."); });
        AddRowMenu("복사등록", CopyAsync);
        AddRowMenu("상태변경", ChangeStatusAsync);
        AddRowMenu("보고서 작성", ReportAsync);
        AddRowMenu("삭제", DeleteSelectedAsync);

        // ── 왼쪽 물건리스트 + 표 ──
        _side = BuildSide();
        var toolbar = Children[1];
        Children.Remove(toolbar);
        Children.Remove(Grid);
        var card = new DockPanel { Background = Brushes.White };
        DockPanel.SetDock(toolbar, Dock.Top);
        card.Children.Add(toolbar);
        card.Children.Add(Grid);
        var body = new DockPanel();
        DockPanel.SetDock(_side, Dock.Left);
        body.Children.Add(_side);
        body.Children.Add(new Border { Child = card, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1, 1, 1, 1), Background = Brushes.White });
        Children.Add(body);
        Margin = new Thickness(6);

        GridBuilder.SetColumns(Grid, new[]
        {
            ColDef.Text("pt_name", "물건명", 180),
            ColDef.Text("dong", "동", 74),
            ColDef.Text("ho", "호", 74),
            ColDef.Text("area_text", "타입", 110),
            ColDef.Text("dir_std", "방향", 74),
            ColDef.Text("sale_div_text", "거래유형", 128),
            ColDef.Text("amount_text", "의뢰금액", 200),
            ColDef.Amount("loan_amt", "융자금", 100),
            ColDef.Date("upd_text", "수정일", 100),
            ColDef.Text("current_status", "현상태", 100),
            ColDef.Date("mtry_date", "만기일", 100),
            ColDef.Text("match_text", "자사/공동망매칭", 120),
            ColDef.Text("consult_content", "상담내용", 0),
        });
        RenderTypes();
        Loaded += async (_, _) => await LoadSummariesAsync();
    }

    // ---------------- 위: 물건종류 버튼 ----------------

    private void RenderTypes()
    {
        _typeRow.Children.Clear();
        foreach (var f in Catalog.PropertyTypeFilters)
        {
            var value = f.Value;
            _typeRow.Children.Add(Pill(f.Label, _type == value, async () =>
            {
                _type = _type == value ? "" : value;   // 다시 누르면 모든유형
                _panelType = null;
                _summary = null;
                RenderTypes();
                await ReloadAllAsync();
            }));
        }
    }

    private void RenderSaleDivs() => _saleDivHost.Content = Segmented(
        new[] { ("", "전체"), ("SALEDIV01", "매매"), ("SALEDIV02", "전세"), ("SALEDIV03", "월세"), ("SALEDIV04", "기타임대") },
        v => v.Length == 0 ? _saleDivs.Count == 0 : _saleDivs.Contains(v),
        async v =>
        {
            if (v.Length == 0) _saleDivs.Clear();
            else if (!_saleDivs.Remove(v)) _saleDivs.Add(v);
            RenderSaleDivs();
            await RefreshAsync();
        });

    private async Task ReloadAllAsync()
    {
        await LoadSummariesAsync();
        await RefreshAsync();
    }

    // ---------------- 왼쪽: 물건리스트 ----------------

    private Border BuildSide()
    {
        var root = new DockPanel();
        var head = new StackPanel { Margin = new Thickness(10, 10, 10, 8) };
        var title = new DockPanel();
        var fold = new Button { Content = "‹", Padding = new Thickness(6, 0, 6, 0), MinHeight = 0, BorderThickness = new Thickness(0), ToolTip = "접기" };
        fold.Click += (_, _) => ToggleSide();
        DockPanel.SetDock(fold, Dock.Right);
        title.Children.Add(fold);
        title.Children.Add(new TextBlock { Text = "물건리스트", FontSize = 14, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center });
        head.Children.Add(title);
        var search = new DockPanel { Margin = new Thickness(0, 8, 0, 0) };
        var sb = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton"), Margin = new Thickness(4, 0, 0, 0) };
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
            _summaries = await _svc.SummaryAsync(type, _progressOnly ? "PTSTS01" : null);
            if (_summary is not null && !_summaries.Any(s => s.Str("group_key") == _summary.Str("group_key"))) _summary = null;
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
                b.MouseLeftButtonUp += async (_, _) => { _panelType = f.Value; await LoadSummariesAsync(); };
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
        RenderSide();
        await RefreshAsync();
    }

    private void OpenLayout(Row s)
    {
        if (!long.TryParse(s.Str("danji_code"), out var danji)) return;
        var sample = Rows.FirstOrDefault(r => r.Str("danji_code") == s.Str("danji_code"));
        new LayoutWindow(danji, s.Str("display_name") ?? "단지", sample).ShowDialog();
    }

    // ---------------- 표 ----------------

    protected override string? KeyName => "pt_no";

    protected override async Task<List<Row>> LoadAsync()
    {
        // 기존과 같이 왼쪽에서 단지·건물을 고르기 전에는 표를 비워 둔다(검색어가 있으면 전체에서 찾는다)
        if (_summary is null && Keyword is null)
        {
            CountText.ToolTip = "왼쪽 물건리스트에서 단지·건물을 선택하세요";
            return new List<Row>();
        }
        var danji = _summary?.Str("danji_code");
        var rows = await _svc.ListAsync(new Row
        {
            ["q_keyword"] = Keyword,
            ["q_pt_type"] = _type.Length > 0 ? _type : _panelType,
            ["q_sale_div"] = _saleDivs.Count == 0 ? null : string.Join(",", _saleDivs),
            ["q_pt_sts"] = _progressOnly ? "PTSTS01" : null,
            ["q_floor"] = ComboValue(_floor),
            ["q_area_min"] = _area.Min, ["q_area_max"] = _area.Max,
            ["q_amt_min"] = _amount.Min, ["q_amt_max"] = _amount.Max,
            ["q_danji_code"] = danji,
            ["q_pt_no"] = _summary?.Long("pt_no"),
        });
        // 단지를 고르면 미등록 호(서버 호 목록)도 함께(진행중 탭·필터가 없을 때만 — 미등록 호는 상태·금액이 없다)
        if (danji is not null && !_progressOnly && _saleDivs.Count == 0 && _area.Min is null && _area.Max is null && _amount.Min is null && _amount.Max is null && Keyword is null)
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
        foreach (var r in rows)
        {
            r["upd_text"] = r.Str("upd_dt") ?? r.Str("reg_dt");
            r["sale_div_text"] = Catalog.SaleDivLabel(r.Str("sale_div"));
            r["area_text"] = string.Join(" / ", new[] { r.Str("apt_typ"), r.Dec("exc_area") is { } e ? $"{e:0.##}㎡" : null }.Where(x => !string.IsNullOrEmpty(x)));
            r["amount_text"] = AmountText(r);
            r["match_text"] = "- / -";
            if (r.Long("is_ghost") == 1) { r["sale_div_text"] = "(미등록 호)"; r["amount_text"] = ""; r["match_text"] = ""; }
        }
        CountText.ToolTip = null;
        return rows;
    }

    private static string AmountText(Row r)
    {
        var parts = new List<string>();
        var div = r.Str("sale_div") ?? "";
        if (div.Contains("SALEDIV01") && r.Long("sale_amt") is { } s) parts.Add($"매 {s:#,0}");
        if (div.Contains("SALEDIV02") && r.Long("les_amt") is { } l) parts.Add($"전 {l:#,0}");
        if (div.Contains("SALEDIV03")) parts.Add($"월 {r.Long("prot_amt"):#,0}/{r.Long("mon_amt"):#,0}");
        if (div.Contains("SALEDIV04")) parts.Add($"기 {r.Long("etc_amt"):#,0}/{r.Long("etc_amt2"):#,0}");
        return string.Join("  ", parts);
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
        var w = new PropertyEditWindow(_svc, d);
        w.ShowDialog();
        if (w.Changed) await ReloadAllAsync();
    }

    /// <summary>엑셀 일괄 업로드(기존 DataUploadPage, target=property)</summary>
    private async Task UploadAsync()
    {
        var w = new Upload.BulkUploadWindow("property");
        w.ShowDialog();
        if (w.Uploaded) await ReloadAllAsync();
    }

    /// <summary>선택한 물건(여러 건 가능)으로 보고서(매물 브리핑) 작성 — 기존 '보고서 작성'</summary>
    private async Task ReportAsync()
    {
        var rows = GridBuilder.SelectedRows(Grid).Where(r => r.Long("pt_no") is not null).ToList();
        if (rows.Count == 0) { Toast.Show("보고서를 만들 물건을 선택하세요."); return; }
        new Reports.ReportBuilderWindow(rows.Select(r => r.Long("pt_no")).OfType<long>()).ShowDialog();
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
        var w = new PropertyEditWindow(_svc, d);
        w.ShowDialog();
        if (w.Changed) await ReloadAllAsync();
    }

    private async Task ChangeStatusAsync()
    {
        var rows = GridBuilder.SelectedRows(Grid).Where(r => r.Long("pt_no") is not null).ToList();
        if (rows.Count == 0) { Toast.Show("상태를 바꿀 물건을 선택하세요."); return; }
        var menu = new ContextMenu();
        foreach (var s in Catalog.PropertyProgress.Append(new Opt("", "상태 해제")))
        {
            var mi = new MenuItem { Header = s.Label };
            mi.Click += async (_, _) =>
            {
                foreach (var r in rows) await _svc.SetStatusAsync(r.Long("pt_no")!.Value, s.Value.Length == 0 ? null : s.Value);
                await ReloadAllAsync();
            };
            menu.Items.Add(mi);
        }
        menu.IsOpen = true;
        await Task.CompletedTask;
    }

    private async Task DeleteSelectedAsync()
    {
        var rows = GridBuilder.SelectedRows(Grid).Where(r => r.Long("pt_no") is not null).ToList();
        if (rows.Count == 0) { Toast.Show("삭제할 물건을 선택하세요."); return; }
        var r = Dialogs.Ask3(
            $"선택한 물건 {rows.Count}건을 삭제합니다.\n\n[예] 과거데이터(이력)로 저장한 뒤 삭제\n[아니오] 영구히 삭제\n[취소] 삭제하지 않음",
            "물건 삭제");
        if (r == MessageBoxResult.Cancel) return;
        foreach (var x in rows) await _svc.DeleteAsync(x.Long("pt_no")!.Value, r == MessageBoxResult.Yes);
        await ReloadAllAsync();
    }
}

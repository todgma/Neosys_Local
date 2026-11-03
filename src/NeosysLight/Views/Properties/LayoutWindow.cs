using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 배치도/입주현황 — 기존 LayoutView. 단지의 동·호(서버 공용 데이터)를 층별로 그리고,
/// 호마다 이 PC의 물건 거래구분(매매/전세/월세/기타임대)과 직접 입력한 점유현황(조합원분·이름·연락처·메모)을 표시한다.
///  - 호 클릭: 연결된 물건이 있으면 수정, 없으면 단지·동·호·층·타입·면적을 채운 새 물건 등록
///  - 오른쪽 클릭: 점유현황 입력
/// </summary>
public sealed class LayoutWindow : Window
{
    private readonly LayoutService _svc = AppServices.Create((sp, s) => new LayoutService(sp, s));
    private readonly PropertyService _pt = AppServices.Create((sp, s) => new PropertyService(sp, s));
    private readonly long _danjiCode;
    private readonly string _danjiName;
    private readonly Row? _sample;      // 같은 단지 물건(새 물건 등록 시 주소 복사용)

    private List<Row> _dongs = new();
    private readonly Dictionary<long, List<Row>> _hos = new();
    private Dictionary<string, List<string>> _auto = new();
    private Dictionary<string, Row> _propByUnit = new();
    private Dictionary<(long Dong, long Ho), Row> _occ = new();

    private readonly WrapPanel _dongChecks = new();
    private readonly WrapPanel _statusChecks = new();
    private readonly ComboBox _type = new() { Width = 140 };
    private readonly WrapPanel _board = new();
    private readonly TextBlock _info = new() { Foreground = Brushes.SlateGray, VerticalAlignment = VerticalAlignment.Center };
    private readonly HashSet<long> _shownDongs = new();
    private readonly HashSet<string> _statusFilter = new();

    public LayoutWindow(long danjiCode, string danjiName, Row? sample = null)
    {
        _danjiCode = danjiCode;
        _danjiName = danjiName;
        _sample = sample;
        Title = $"{danjiName} — 배치도/입주현황";
        Width = 1400;
        Height = 920;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Owner = Application.Current.MainWindow;
        FontSize = 12;

        var top = new StackPanel { Margin = new Thickness(12, 10, 12, 6) };
        var head = new DockPanel();
        var refresh = new Button { Content = "새로고침" };
        refresh.Click += async (_, _) => await LoadAsync();
        DockPanel.SetDock(refresh, Dock.Right);
        head.Children.Add(refresh);
        head.Children.Add(new TextBlock { Text = $"{danjiName} 배치도", FontSize = 18, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 0, 16, 0) });
        head.Children.Add(_info);
        top.Children.Add(head);

        var filters = new WrapPanel { Margin = new Thickness(0, 6, 0, 0) };
        filters.Children.Add(Caption("점유상태"));
        foreach (var st in LayoutService.Statuses)
        {
            var cb = new CheckBox { Content = Chip(st.Label, st.Color), Margin = new Thickness(0, 0, 8, 0), VerticalAlignment = VerticalAlignment.Center };
            cb.Click += (_, _) => { if (cb.IsChecked == true) _statusFilter.Add(st.Value); else _statusFilter.Remove(st.Value); Render(); };
            _statusChecks.Children.Add(cb);
        }
        filters.Children.Add(_statusChecks);
        filters.Children.Add(Caption("타입", 16));
        _type.SelectionChanged += (_, _) => Render();
        filters.Children.Add(_type);
        top.Children.Add(filters);

        var dongBar = new WrapPanel { Margin = new Thickness(0, 6, 0, 0) };
        dongBar.Children.Add(Caption("동"));
        var all = new Button { Content = "전체", Padding = new Thickness(6, 0, 6, 0) };
        all.Click += (_, _) => { foreach (var d in _dongs) _shownDongs.Add(DongNo(d)); BuildDongChecks(); Render(); };
        var none = new Button { Content = "해제", Padding = new Thickness(6, 0, 6, 0) };
        none.Click += (_, _) => { _shownDongs.Clear(); BuildDongChecks(); Render(); };
        dongBar.Children.Add(all);
        dongBar.Children.Add(none);
        dongBar.Children.Add(_dongChecks);
        top.Children.Add(dongBar);

        var root = new DockPanel();
        DockPanel.SetDock(top, Dock.Top);
        root.Children.Add(top);
        root.Children.Add(new ScrollViewer
        {
            Content = _board, Padding = new Thickness(10), Background = new SolidColorBrush(Color.FromRgb(0xF1, 0xF5, 0xF9)),
            HorizontalScrollBarVisibility = ScrollBarVisibility.Auto, VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
        });
        Content = root;
        Loaded += async (_, _) => await LoadAsync();
    }

    private static TextBlock Caption(string t, double left = 0) => new() { Text = t, FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(left, 0, 8, 0) };

    private static Border Chip(string text, string color) => new()
    {
        Background = (Brush)new BrushConverter().ConvertFromString(color)!, CornerRadius = new CornerRadius(3), Padding = new Thickness(4, 0, 4, 0), Margin = new Thickness(1),
        Child = new TextBlock { Text = text, Foreground = Brushes.White, FontSize = 10.5, FontWeight = FontWeights.SemiBold },
    };

    /// <summary>서버 행의 값(camelCase/snake_case 모두)</summary>
    private static string? V(Row r, string camel, string snake) => r.Str(camel) ?? r.Str(snake);
    private static long DongNo(Row d) => long.TryParse(V(d, "dongNo", "dong_no"), out var n) ? n : 0;
    private static long HoNo(Row h) => long.TryParse(V(h, "hoNumber", "ho_number"), out var n) ? n : 0;
    private static string DongName(Row d) => V(d, "dongName", "dong_name") ?? DongNo(d).ToString();
    private static string HoName(Row h) => V(h, "hoName", "ho_name") ?? HoNo(h).ToString();
    private static string TypeOf(Row h) => V(h, "ptpName", "ptp_name") ?? V(h, "aptTyp", "apt_typ") ?? "";

    private async Task LoadAsync()
    {
        _info.Text = "불러오는 중…";
        try
        {
            // 로컬: 이 단지 물건(자동 점유상태·연결 물건) + 점유현황
            var props = await _pt.ListAsync(new Row { ["q_danji_code"] = _danjiCode.ToString() });
            _auto = LayoutService.AutoStatuses(props);
            _propByUnit = props.Where(p => p.Has("dong") && p.Has("ho")).GroupBy(p => LayoutService.UnitKey(p["dong"], p["ho"])).ToDictionary(g => g.Key, g => g.First());
            _occ = (await _svc.OccupancyAsync(_danjiCode)).GroupBy(o => (o.Long("dong_no") ?? 0, o.Long("ho_number") ?? 0)).ToDictionary(g => g.Key, g => g.First());

            // 서버: 동·호 목록(공용 데이터)
            _dongs = await AppServices.Server.GetDongListAsync(_danjiCode.ToString());
            _hos.Clear();
            foreach (var d in _dongs) _hos[DongNo(d)] = await AppServices.Server.GetHoListAsync(_danjiCode.ToString(), (int)DongNo(d));
            if (_shownDongs.Count == 0) foreach (var d in _dongs) _shownDongs.Add(DongNo(d));

            var types = _hos.Values.SelectMany(x => x).Select(TypeOf).Where(t => t.Length > 0).Distinct().OrderBy(t => t).ToList();
            _type.ItemsSource = new[] { "(전체 타입)" }.Concat(types).ToList();
            if (_type.SelectedIndex < 0) _type.SelectedIndex = 0;
            BuildDongChecks();
            _info.Text = $"동 {_dongs.Count}개 · 호 {_hos.Values.Sum(x => x.Count)}개 · 이 단지 물건 {props.Count}건";
            Render();
        }
        catch (Exception ex)
        {
            _info.Text = "";
            _board.Children.Clear();
            _board.Children.Add(new TextBlock { Text = "배치도를 불러오지 못했습니다(동·호 목록은 서버에서 받습니다).\n" + ex.Message, Foreground = Brushes.Firebrick, Margin = new Thickness(10) });
        }
    }

    private void BuildDongChecks()
    {
        _dongChecks.Children.Clear();
        foreach (var d in _dongs)
        {
            var no = DongNo(d);
            var cb = new CheckBox { Content = $"{DongName(d)}동", IsChecked = _shownDongs.Contains(no), Margin = new Thickness(6, 0, 4, 0), VerticalAlignment = VerticalAlignment.Center };
            cb.Click += (_, _) => { if (cb.IsChecked == true) _shownDongs.Add(no); else _shownDongs.Remove(no); Render(); };
            _dongChecks.Children.Add(cb);
        }
    }

    private List<string> StatusesOf(Row dong, Row ho)
    {
        var list = new List<string>(_auto.GetValueOrDefault(LayoutService.UnitKey(DongName(dong), HoName(ho))) ?? new());
        if (_occ.TryGetValue((DongNo(dong), HoNo(ho)), out var occ)) list.AddRange(LayoutService.ManualOf(occ.Str("occupancy_status")));
        return list.Distinct().OrderBy(LayoutService.Order).ToList();
    }

    private void Render()
    {
        _board.Children.Clear();
        var typeFilter = _type.SelectedIndex > 0 ? _type.SelectedItem as string : null;
        foreach (var d in _dongs.Where(d => _shownDongs.Contains(DongNo(d))))
        {
            var hos = _hos.GetValueOrDefault(DongNo(d)) ?? new();
            var panel = new StackPanel();
            panel.Children.Add(new TextBlock { Text = $"{DongName(d)}동", FontSize = 15, FontWeight = FontWeights.Bold, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 0, 0, 6) });
            foreach (var floor in hos.GroupBy(LayoutService.FloorOf).OrderByDescending(g => g.Key))
            {
                var row = new StackPanel { Orientation = Orientation.Horizontal };
                row.Children.Add(new TextBlock { Text = $"{floor.Key}F", Width = 30, Foreground = Brushes.SlateGray, VerticalAlignment = VerticalAlignment.Center });
                foreach (var ho in floor.OrderBy(HoNo))
                {
                    var statuses = StatusesOf(d, ho);
                    var hidden = (_statusFilter.Count > 0 && !statuses.Any(_statusFilter.Contains)) || (typeFilter is not null && TypeOf(ho) != typeFilter);
                    row.Children.Add(hidden ? new Border { Width = 92, Height = 46, Margin = new Thickness(1) } : Cell(d, ho, statuses));
                }
                panel.Children.Add(row);
            }
            _board.Children.Add(new Border
            {
                Child = panel, Background = Brushes.White, BorderBrush = Brushes.LightGray, BorderThickness = new Thickness(1),
                Padding = new Thickness(8), Margin = new Thickness(0, 0, 12, 12), VerticalAlignment = VerticalAlignment.Top,
            });
        }
    }

    private FrameworkElement Cell(Row dong, Row ho, List<string> statuses)
    {
        var key = LayoutService.UnitKey(DongName(dong), HoName(ho));
        _occ.TryGetValue((DongNo(dong), HoNo(ho)), out var occ);
        var linked = _propByUnit.GetValueOrDefault(key);

        var content = new StackPanel();
        content.Children.Add(new TextBlock { Text = HoName(ho), FontWeight = FontWeights.Bold, HorizontalAlignment = HorizontalAlignment.Center });
        var chips = new WrapPanel { HorizontalAlignment = HorizontalAlignment.Center };
        foreach (var st in statuses)
            if (LayoutService.Statuses.FirstOrDefault(s => s.Value == st) is { } meta) chips.Children.Add(Chip(meta.Label, meta.Color));
        content.Children.Add(chips);
        if (occ?.Str("occupancy_name") is { Length: > 0 } nm) content.Children.Add(new TextBlock { Text = nm, FontSize = 10.5, HorizontalAlignment = HorizontalAlignment.Center, Foreground = Brushes.DimGray });

        var tip = new List<string> { $"{DongName(dong)}동 {HoName(ho)}호", $"타입 {TypeOf(ho)}  공급 {V(ho, "splySpc", "sply_spc")}㎡ / 전용 {V(ho, "exclsSpc", "excls_spc")}㎡" };
        if (linked is not null) tip.Add($"연결 물건: {linked.Str("pt_name")} ({Catalog.SaleDivLabel(linked.Str("sale_div"))})");
        if (occ is not null) tip.Add($"점유: {occ.Str("occupancy_name")} {occ.Str("occupancy_phone")}\n{occ.Str("memo")}".Trim());

        var b = new Button
        {
            Content = content, Width = 92, Height = 46, Margin = new Thickness(1), Padding = new Thickness(2), ToolTip = string.Join("\n", tip),
            Background = linked is not null ? new SolidColorBrush(Color.FromRgb(0xEE, 0xF2, 0xFF)) : Brushes.White,
        };
        b.Click += async (_, _) => await OpenPropertyAsync(dong, ho, linked);
        var menu = new ContextMenu();
        var mi = new MenuItem { Header = "점유현황 입력" };
        mi.Click += async (_, _) => await EditOccupancyAsync(dong, ho, occ);
        menu.Items.Add(mi);
        b.ContextMenu = menu;
        return b;
    }

    /// <summary>연결 물건 수정 / 없으면 단지·동·호·층·타입·면적을 채워 새 물건 등록(기존 openPropertyRegister)</summary>
    private async Task OpenPropertyAsync(Row dong, Row ho, Row? linked)
    {
        PropertyDetail? d;
        if (linked?.Long("pt_no") is { } ptNo) d = await _pt.GetAsync(ptNo);
        else
        {
            d = _pt.New("SYCA101");
            var p = d.Pt;
            foreach (var k in new[] { "addr1", "addr2", "addr3", "jibun", "addr4", "bjd_code", "addr_post" })
                if (_sample?.Str(k) is { } v) p[k] = v;
            p["addr4"] ??= _danjiName;
            p["danji_code"] = _danjiCode.ToString();
            p["dong"] = DongName(dong);
            p["ho"] = HoName(ho);
            p["floor1"] = (long)LayoutService.FloorOf(ho);
            if (long.TryParse(V(dong, "highestFloorCnt", "highest_floor_cnt"), out var top)) p["floor2"] = top;
            if (TypeOf(ho) is { Length: > 0 } t) p["apt_typ"] = t;
            if (double.TryParse(V(ho, "splySpc", "sply_spc"), out var sup)) p["sup_area"] = Math.Round(sup, 2);
            if (double.TryParse(V(ho, "exclsSpc", "excls_spc"), out var exc)) p["exc_area"] = Math.Round(exc, 2);
        }
        if (d is null) { Dialogs.Warn("물건 정보를 찾을 수 없습니다."); return; }
        var w = new PropertyEditWindow(_pt, d) { Owner = this };
        w.ShowDialog();
        if (w.Changed) await LoadAsync();
    }

    /// <summary>점유현황 입력 — 조합원분(수동 상태)·이름·연락처·메모</summary>
    private async Task EditOccupancyAsync(Row dong, Row ho, Row? occ)
    {
        var r = new Row
        {
            ["__key"] = 1L,
            ["union"] = LayoutService.ManualOf(occ?.Str("occupancy_status")).Contains("UNION") ? "Y" : null,
            ["occupancy_name"] = occ?.Str("occupancy_name"), ["occupancy_phone"] = occ?.Str("occupancy_phone"), ["memo"] = occ?.Str("memo"),
        };
        var fields = new[]
        {
            F.Check("union", "점유상태", "조합원분"),
            F.Text("occupancy_name", "이름"), F.Text("occupancy_phone", "연락처"),
            F.Memo("memo", "메모", 80).Span(2),
        };
        var w = new FormEditWindow($"{DongName(dong)}동 {HoName(ho)}호 점유현황", r, "__key", fields, async x =>
        {
            await _svc.SaveOccupancyAsync(_danjiCode, DongNo(dong), HoNo(ho), LayoutService.FloorOf(ho).ToString(),
                x.Str("union") == "Y" ? new[] { "UNION" } : Array.Empty<string>(), x.Str("occupancy_name"), x.Str("occupancy_phone"), x.Str("memo"));
            return 1;
        }, width: 560, height: 360) { Owner = this };
        if (w.ShowAndReport()) await LoadAsync();
    }
}

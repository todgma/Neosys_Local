using System.Collections.ObjectModel;
using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Reports;

/// <summary>
/// 보고서(매물 브리핑) 작성 — 기존 ReportBuilderModal. 매물 1건 = 상세 표, 여러 건 = 요약 표(7행/쪽).
/// 왼쪽에서 매물·고객·제목·코멘트를 고르고 오른쪽에서 미리 본다. 저장하면 content_html(본문)·snapshot(당시 물건)·배포 고객을 기록한다.
/// </summary>
public sealed class ReportBuilderWindow : EditWindow
{
    private readonly ReportService _svc = AppServices.Create((sp, s) => new ReportService(sp, s));
    private readonly PropertyService _pt = AppServices.Create((sp, s) => new PropertyService(sp, s));
    private long? _reportNo;

    private readonly ObservableCollection<Row> _props = new();      // pt_no, name, memo, json(JsonObject)
    private readonly ObservableCollection<Row> _custs = new();      // cust_no, name, tel
    private readonly TextBox _title = new();
    private readonly TextBox _comment = new() { AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, Height = 80, VerticalContentAlignment = VerticalAlignment.Top };
    private readonly TextBox _feature = new() { AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, Height = 90, VerticalContentAlignment = VerticalAlignment.Top };
    private readonly RadioButton _agent = new() { Content = "중개사용", IsChecked = true, Margin = new Thickness(0, 0, 12, 0) };
    private readonly RadioButton _customer = new() { Content = "고객용" };
    private readonly WebBrowser _preview = new();
    private readonly StackPanel _single = new();
    private string? _office, _officeTel;

    /// <param name="ptNos">처음 담을 매물(물건 목록에서 선택한 것)</param>
    /// <param name="customer">고객관리에서 열면 배포 고객으로 미리 넣는다</param>
    public ReportBuilderWindow(IEnumerable<long>? ptNos = null, Row? customer = null, long? reportNo = null) : base("보고서", 1400, 940)
    {
        _reportNo = reportNo;
        var left = new StackPanel { Width = 430, Margin = new Thickness(0, 0, 12, 0) };

        left.Children.Add(Caption("제목"));
        left.Children.Add(_title);
        var ver = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 6, 0, 0) };
        ver.Children.Add(new TextBlock { Text = "보고서 종류  ", VerticalAlignment = VerticalAlignment.Center, FontWeight = FontWeights.SemiBold });
        ver.Children.Add(_agent);
        ver.Children.Add(_customer);
        left.Children.Add(ver);

        left.Children.Add(Bar("매물", ("＋ 매물 추가", AddProperty), ("삭제", RemoveProperty)));
        var propGrid = Grid(_props, ("pt_no", "번호", 60, true), ("name", "물건명", 0, true), ("memo", "메모(여러 건 표)", 140, false));
        left.Children.Add(propGrid);
        _single.Children.Add(Caption("물건특징(보고서용 — 비우면 물건의 특징 메모)"));
        _single.Children.Add(_feature);
        left.Children.Add(_single);

        left.Children.Add(Bar("배포 고객", ("＋ 고객 추가", AddCustomer), ("삭제", RemoveCustomer)));
        left.Children.Add(Grid(_custs, ("cust_no", "번호", 60, true), ("name", "성함", 0, true), ("tel", "전화번호", 130, true)));

        left.Children.Add(Caption("코멘트"));
        left.Children.Add(_comment);

        var refresh = new Button { Content = "미리보기 갱신", Margin = new Thickness(0, 10, 0, 0), HorizontalAlignment = HorizontalAlignment.Left };
        refresh.Click += (_, _) => RenderPreview();
        left.Children.Add(refresh);

        var scroll = new ScrollViewer { Content = left, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        DockPanel.SetDock(scroll, Dock.Left);
        Body.Children.Add(scroll);
        Body.Children.Add(new Border { BorderBrush = Brushes.Gray, BorderThickness = new Thickness(1), Child = _preview });

        var print = new Button { Content = "인쇄" };
        print.Click += (_, _) => Print();
        LeftButtons.Children.Add(print);

        foreach (var tb in new[] { _title, _comment, _feature }) tb.LostFocus += (_, _) => RenderPreview();
        _agent.Checked += (_, _) => RenderPreview();
        _customer.Checked += (_, _) => RenderPreview();
        _props.CollectionChanged += (_, _) => { _single.Visibility = _props.Count == 1 ? Visibility.Visible : Visibility.Collapsed; };

        Loaded += async (_, _) => await LoadAsync(ptNos, customer);
    }

    private static TextBlock Caption(string t) => new() { Text = t, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 8, 0, 2) };

    private static DockPanel Bar(string title, params (string Text, Func<Task> Click)[] buttons)
    {
        var dp = new DockPanel { Margin = new Thickness(0, 12, 0, 2) };
        var right = new StackPanel { Orientation = Orientation.Horizontal };
        foreach (var (text, click) in buttons)
        {
            var b = new Button { Content = text, Padding = new Thickness(8, 1, 8, 1) };
            b.Click += async (_, _) => await click();
            right.Children.Add(b);
        }
        DockPanel.SetDock(right, Dock.Right);
        dp.Children.Add(right);
        dp.Children.Add(new TextBlock { Text = title, FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center, Foreground = (Brush)Application.Current.FindResource("PrimaryDark") });
        return dp;
    }

    private DataGrid Grid(ObservableCollection<Row> items, params (string Key, string Header, double Width, bool ReadOnly)[] cols)
    {
        var g = new DataGrid { ItemsSource = items, AutoGenerateColumns = false, CanUserAddRows = false, HeadersVisibility = DataGridHeadersVisibility.Column, MinHeight = 90, MaxHeight = 220, SelectionMode = DataGridSelectionMode.Single };
        foreach (var c in cols)
            g.Columns.Add(new DataGridTextColumn
            {
                Header = c.Header, IsReadOnly = c.ReadOnly,
                Width = c.Width > 0 ? new DataGridLength(c.Width) : new DataGridLength(1, DataGridLengthUnitType.Star),
                Binding = new Binding($"[{c.Key}]") { Mode = c.ReadOnly ? BindingMode.OneWay : BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.LostFocus },
            });
        g.CellEditEnding += (_, _) => Dispatcher.BeginInvoke(RenderPreview);
        return g;
    }

    private async Task LoadAsync(IEnumerable<long>? ptNos, Row? customer)
    {
        try
        {
            var office = await AppServices.Create((sp, s) => new ContractService(sp, s)).OfficeAsync();
            _office = office?.Str("OffNm") ?? AppServices.Session.OffNm;
            _officeTel = office?.Str("OffTel") ?? office?.Str("RpsPhone");

            if (_reportNo is { } no && await _svc.GetAsync(no) is { } r)
            {
                _title.Text = r.Str("title") ?? "";
                _comment.Text = r.Str("comment") ?? "";
                foreach (var p in ReportService.ParseSnapshot(r.Str("snapshot"))) AddSnapshot(p);
                if (_props.Count == 1) _feature.Text = ((JsonObject)_props[0]["json"]!)["rptMemo"]?.ToString() ?? "";
                foreach (var c in await _svc.SharesAsync(no)) _custs.Add(new Row { ["cust_no"] = c.Long("cust_no"), ["name"] = c.Str("name"), ["tel"] = c.Str("tel") });
            }
            else
            {
                foreach (var ptNo in ptNos ?? Array.Empty<long>()) await AddPtAsync(ptNo);
                if (customer is not null) _custs.Add(new Row { ["cust_no"] = customer.Long("cust_no"), ["name"] = customer.Str("name"), ["tel"] = customer.Str("tel") });
                _title.Text = ReportService.AutoTitle(Snapshots());
            }
            _single.Visibility = _props.Count == 1 ? Visibility.Visible : Visibility.Collapsed;
            UpdateMode();
            RenderPreview();
        }
        catch (Exception ex) { Dialogs.Error("보고서를 불러오지 못했습니다.\n" + ex.Message); }
    }

    /// <summary>물건 상세로 스냅샷을 만들어 담는다(물건특징 메모는 featureNote로)</summary>
    private async Task AddPtAsync(long ptNo)
    {
        if (_props.Any(p => p.Long("pt_no") == ptNo)) return;
        var d = await _pt.GetAsync(ptNo);
        if (d is null) return;
        var snap = ReportService.Snapshot(d.Pt);
        var notes = string.Join("\n", d.Memos.Select(m => m.Str("memo_content")).Where(s => !string.IsNullOrWhiteSpace(s)));
        if (notes.Length > 0) snap["featureNote"] = notes;
        AddSnapshot(snap);
    }

    private void AddSnapshot(JsonObject snap)
    {
        long.TryParse(snap["ptNo"]?.ToString(), out var no);
        var name = new[] { "ptName", "addr4", "addr5" }.Select(k => snap[k]?.ToString()).FirstOrDefault(s => !string.IsNullOrEmpty(s)) ?? ReportService.AddrOf(snap);
        _props.Add(new Row { ["pt_no"] = no, ["name"] = name, ["memo"] = snap["rptListMemo"]?.ToString(), ["json"] = snap });
    }

    private List<JsonObject> Snapshots() => _props.Select(p =>
    {
        var o = (JsonObject)((JsonObject)p["json"]!).DeepClone();
        if (_props.Count == 1)
        {
            if (string.IsNullOrWhiteSpace(_feature.Text)) o.Remove("rptMemo"); else o["rptMemo"] = _feature.Text;
        }
        if (!string.IsNullOrWhiteSpace(p.Str("memo"))) o["rptListMemo"] = p.Str("memo"); else o.Remove("rptListMemo");
        return o;
    }).ToList();

    private ReportOptions Options()
    {
        var o = new ReportOptions
        {
            Title = _title.Text, Comment = _comment.Text, Version = _customer.IsChecked == true ? "customer" : "agent",
            ChargeName = AppServices.Session.RtNm ?? AppServices.Session.UserId, OfficeName = _office, OfficeTel = _officeTel,
        };
        foreach (var p in _props) if (p.Long("pt_no") is { } no && p.Has("memo")) o.Memos[no] = p.Str("memo")!;
        return o;
    }

    private string Html() => ReportService.BuildHtml(Snapshots(), Options());

    private void RenderPreview()
    {
        try { _preview.NavigateToString(ReportService.Document(Html(), _title.Text, _props.Count > 1)); }
        catch { /* 미리보기 실패는 무시(저장에는 영향 없음) */ }
    }

    private void SyncTitle()
    {
        if (ReportService.IsAutoTitle(_title.Text)) _title.Text = ReportService.AutoTitle(Snapshots());
    }

    private async Task AddProperty()
    {
        if (Pickers.Property() is not { } p || p.Long("pt_no") is not { } no) return;
        await AddPtAsync(no);
        SyncTitle();
        RenderPreview();
    }

    private Task RemoveProperty()
    {
        if (Keyboard(_props) is { } r) { _props.Remove(r); SyncTitle(); RenderPreview(); }
        else Toast.Show("삭제할 매물이 없습니다.");
        return Task.CompletedTask;
    }

    private Task AddCustomer()
    {
        if (Pickers.Customer() is { } c && !_custs.Any(x => x.Long("cust_no") == c.Long("cust_no")))
            _custs.Add(new Row { ["cust_no"] = c.Long("cust_no"), ["name"] = c.Str("name"), ["tel"] = c.Str("tel") });
        return Task.CompletedTask;
    }

    private Task RemoveCustomer()
    {
        if (Keyboard(_custs) is { } r) _custs.Remove(r);
        else Toast.Show("삭제할 배포 고객이 없습니다.");
        return Task.CompletedTask;
    }

    /// <summary>해당 목록 표에서 선택한 행(없으면 마지막 행)</summary>
    private Row? Keyboard(ObservableCollection<Row> items)
    {
        var grid = FindGrid(this, items);
        return grid?.SelectedItem as Row ?? items.LastOrDefault();
    }

    private static DataGrid? FindGrid(DependencyObject root, object items)
    {
        for (int i = 0; i < VisualTreeHelper.GetChildrenCount(root); i++)
        {
            var c = VisualTreeHelper.GetChild(root, i);
            if (c is DataGrid g && ReferenceEquals(g.ItemsSource, items)) return g;
            if (FindGrid(c, items) is { } found) return found;
        }
        return null;
    }

    private void Print()
    {
        if (_props.Count == 0) { Dialogs.Info("매물을 선택하세요."); return; }
        RenderPreview();
        Dispatcher.BeginInvoke(() =>
        {
            try { ((dynamic)_preview.Document).execCommand("Print", true, null); }
            catch (Exception ex) { Dialogs.Error("인쇄하지 못했습니다.\n" + ex.Message); }
        }, System.Windows.Threading.DispatcherPriority.ApplicationIdle);
    }

    protected override bool IsNew => _reportNo is null;

    protected override async Task SaveAsync()
    {
        if (_props.Count == 0) throw new InvalidOperationException("매물을 선택하세요.");
        var snaps = Snapshots();
        _reportNo = await _svc.SaveAsync(_reportNo, _props[0].Long("pt_no"), _title.Text, _comment.Text,
            ReportService.SnapshotJson(snaps), Html(), _custs.Select(c => c.Long("cust_no")).OfType<long>());
    }

    protected override Task DeleteAsync() => _svc.DeleteAsync(_reportNo!.Value);
    protected override string DeleteConfirm => "보고서를 삭제하시겠습니까?";
}

using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Expiry;

/// <summary>
/// 만기관리 — 기존 ExpiryPage 모양: 위 물건유형 버튼 줄(전체 포함) / '만기일 검색' 기간 + '만기 전 1~6개월' 버튼 / 표(만기일자·출처·매물유형…).
/// 두 번 누르면 물건 등록창.
/// </summary>
public sealed class ExpiryPage : ListPage
{
    private readonly ExpiryService _svc = AppServices.Create((sp, s) => new ExpiryService(sp, s));
    private readonly PropertyService _pt = AppServices.Create((sp, s) => new PropertyService(sp, s));
    private readonly WrapPanel _types = new() { Margin = new Thickness(0, 0, 0, 8) };
    private readonly WrapPanel _months = new() { VerticalAlignment = VerticalAlignment.Center };
    // 만기일 기간 — 기존 DateInput(폭 120·14px, 평소 YY.MM.DD)
    private readonly Row _range = new() { ["from"] = LocalDate.Format(DateTime.Today), ["to"] = LocalDate.Format(DateTime.Today.AddMonths(3)) };
    private string _type = "";
    private int _activeMonth = 3;
    private readonly ComboBox _rowCount = new() { Width = 80, DisplayMemberPath = "Label", SelectedValuePath = "Value" };
    private readonly StackPanel _pager = new() { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 4, 0, 8) };
    private int _page = 1;

    public ExpiryPage() : base("만기관리", "검색어(주소·소유자·임차인)")
    {
        FilterBar.Children.Clear();
        var box = new StackPanel { Margin = new Thickness(4, 4, 4, 4) };
        box.Children.Add(_types);
        var row = new WrapPanel();
        row.Children.Add(Legacy.Label("만기일 검색", 15, "#334155", FontWeights.Bold));
        row.Children.Add(Properties.LF.Date(_range, "from", 120, height: 28, fontSize: 14));
        row.Children.Add(new TextBlock { Text = " ~ ", FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center });
        row.Children.Add(Properties.LF.Date(_range, "to", 120, height: 28, fontSize: 14));
        row.Children.Add(Legacy.Label("  만기 전", 15, "#334155", FontWeights.Bold));
        row.Children.Add(_months);
        SearchBox.Width = 220;
        var go = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton") };
        go.Click += async (_, _) => await RefreshAsync();
        SearchBox.TextChanged += (_, _) => _page = 1;
        row.Children.Add(Legacy.Group(SearchBox, go));
        box.Children.Add(row);
        FilterBar.Children.Add(box);
        _range.PropertyChanged += async (_, e) => { if (e.PropertyName is "from" or "to" && IsLoaded && !_settingMonth) { _activeMonth = 0; _page = 1; RenderMonths(); await RefreshAsync(); } };
        RenderTypes();
        RenderMonths();

        // 줄수(기존: 전부·30·50·100, 처음 50) — 색 채우기 왼쪽
        ButtonBar.Children.Add(Legacy.Label("줄수", 14, "#000000", FontWeights.SemiBold));
        _rowCount.ItemsSource = Opt.Pairs(("all", "전부"), ("30", "30줄"), ("50", "50줄"), ("100", "100줄"));
        _rowCount.SelectedValue = "50";
        Properties.PropertyPage.PlainSelect(_rowCount);
        _rowCount.Margin = new Thickness(0, 0, 6, 0);
        _rowCount.SelectionChanged += async (_, _) => { if (IsLoaded) { _page = 1; await RefreshAsync(); } };
        ButtonBar.Children.Add(_rowCount);

        // 페이지 이동은 표 아래(기존 CustomerTable: 이전 · n / m · 다음, 한 페이지면 숨김)
        SetDock(_pager, Dock.Bottom);
        Children.Insert(Children.IndexOf(Grid), _pager);

        GridBuilder.SetColumns(Grid, new[]
        {
            ColDef.Date("expiry_date", "만기일자", 104),
            ColDef.Text("source_text", "출처", 88),
            ColDef.Map("pt_type", "매물유형", Catalog.PropertyTypesAll, 100),
            ColDef.Text("sale_div", "거래유형", 112),
            ColDef.Text("sale_amt", "거래금액(만원)", 320),
            ColDef.Text("name_text", "물건명", 200),
            ColDef.Text("detail_addr", "상세주소", 220),
            ColDef.Text("area_text", "면적", 100),
            ColDef.Text("owner_name", "소유자", 84),
            ColDef.Text("owner_phone", "소유자 연락처", 128),
            ColDef.Text("tenant_name", "임차인", 84),
            ColDef.Text("tenant_phone", "임차인 연락처", 128),
        });
        // 기존 도구줄: 색 채우기 (n) · 보라색 일정등록 (n) — 수정·새로고침 버튼 없음(더블클릭으로 수정)
        HideEditButton();
        HideRefreshButton();
        ShowColorFillCount();
        var schedule = AddButton("일정등록", AddScheduleAsync, "PrimaryButton");
        schedule.Background = Legacy.B("#7C3AED");
        schedule.BorderBrush = Legacy.B("#7C3AED");
        schedule.Foreground = Brushes.White;
        schedule.Content = WithIcon("", "일정등록");
        Grid.SelectionChanged += (_, _) =>
        {
            var n = GridBuilder.SelectedRows(Grid).Count;
            schedule.Content = WithIcon("", n > 0 ? $"일정등록 ({n})" : "일정등록");
        };
        // 거래유형·거래금액은 물건관리와 같은 4칸 표기
        Grid.Columns[3] = new Properties.CellColumn(Properties.PropertyPage.TradeTypeCell) { Header = "거래유형", Width = 112 };
        Grid.Columns[4] = new Properties.CellColumn(r => Properties.PropertyPage.TradeAmountCell(r, Comma, AmountFlex)) { Header = "거래금액(만원)", Width = 340 };
    }

    // 단위 없는 금액 4칸 비율 — 매매가가 잘리지 않게 물건관리보다 고르게
    private static readonly double[] AmountFlex = { 1, 1, 1.3, 1 };

    /// <summary>금액(만원) 콤마 표기 — 단위 없이 숫자만, 없으면 '-'</summary>
    private static string Comma(long? v) => v is null or 0 ? "-" : $"{v:#,0}";

    private bool _settingMonth;

    private void RenderTypes()
    {
        _types.Children.Clear();
        foreach (var (value, label) in new[] { ("", "전체") }.Concat(Catalog.PropertyTypeFilters.Select(f => (f.Value, f.Label))))
        {
            var v = value;
            var b = Legacy.Pill(label, _type == v, async () => { _type = v; _page = 1; RenderTypes(); await RefreshAsync(); });
            b.FontWeight = FontWeights.Bold;
            b.BorderBrush = Legacy.B("#D1D5DB");
            b.Padding = new Thickness(12, 5, 12, 5);
            _types.Children.Add(b);
        }
    }

    private void RenderMonths()
    {
        _months.Children.Clear();
        for (int n = 1; n <= 6; n++)
        {
            var m = n;
            var b = Legacy.Pill($"{n}개월", _activeMonth == n, async () =>
            {
                _activeMonth = m;
                _page = 1;
                _settingMonth = true;
                _range["from"] = LocalDate.Format(DateTime.Today);
                _range["to"] = LocalDate.Format(DateTime.Today.AddMonths(m));
                _settingMonth = false;
                RenderMonths();
                await RefreshAsync();
            });
            b.Margin = new Thickness(0, 0, 4, 0);
            _months.Children.Add(b);
        }
    }

    protected override string? KeyName => "pt_no";

    protected override async Task<List<Row>> LoadAsync()
    {
        var rows = await _svc.ListAsync(LocalDate.Parse(_range.Str("from")), LocalDate.Parse(_range.Str("to")), _type.Length == 0 ? null : _type);
        var kw = Keyword;
        foreach (var r in rows)
        {
            r["source_text"] = "물건관리";
        }
        if (kw is null) return rows;
        return rows.Where(r => new[] { "addr", "owner_name", "owner_phone", "tenant_name", "tenant_phone", "pt_name" }
            .Any(k => (r.Str(k) ?? "").Contains(kw, StringComparison.OrdinalIgnoreCase))).ToList();
    }

    /// <summary>줄수·페이지 적용 — 건수 표시도 기존처럼 현재 페이지 기준</summary>
    protected override IList<Row> ViewRows(List<Row> rows)
    {
        var size = int.TryParse(_rowCount.SelectedValue as string, out var n) ? n : 0;   // 전부 = 0
        var pages = size == 0 ? 1 : Math.Max(1, (int)Math.Ceiling(rows.Count / (double)size));
        _page = Math.Min(_page, pages);
        RenderPager(pages);
        return size == 0 ? rows : rows.Skip((_page - 1) * size).Take(size).ToList();
    }

    private void RenderPager(int pages)
    {
        _pager.Children.Clear();
        _pager.Visibility = pages > 1 ? Visibility.Visible : Visibility.Collapsed;
        if (pages <= 1) return;
        Button Move(string text, int page, bool enabled)
        {
            var b = new Button { Content = text, IsEnabled = enabled, FontSize = 14, Padding = new Thickness(12, 4, 12, 4) };
            b.Click += async (_, _) => { _page = page; await RefreshAsync(); };
            return b;
        }
        _pager.Children.Add(Move("이전", _page - 1, _page > 1));
        _pager.Children.Add(new TextBlock { Text = $"{_page} / {pages}", FontSize = 14, Foreground = Legacy.B("#4B5563"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(8, 0, 8, 0) });
        _pager.Children.Add(Move("다음", _page + 1, _page < pages));
    }

    /// <summary>일정등록 — 마지막 선택 행의 만기일·주소를 채워 일정 창을 연다</summary>
    private Task AddScheduleAsync()
    {
        if (GridBuilder.SelectedRows(Grid).LastOrDefault() is not { } row) { Toast.Show("일정 등록할 행을 선택하세요."); return Task.CompletedTask; }
        var svc = AppServices.Create((sp, s) => new ScheduleService(sp, s));
        Schedules.SchedulePage.Edit(svc, ExpiryService.ScheduleDraft(svc, row));
        return Task.CompletedTask;
    }

    protected override async Task OpenAsync(Row? row)
    {
        if (row is null) return;
        var d = await _pt.GetAsync(row.Long("pt_no")!.Value);
        if (d is null) return;
        var w = new Properties.PropertyEditWindow(_pt, d);
        w.ShowDialog();
        if (w.Changed) await RefreshAsync();
    }
}

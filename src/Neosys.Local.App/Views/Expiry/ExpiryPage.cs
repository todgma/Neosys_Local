using System.Windows;
using System.Windows.Controls;
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
    private readonly DatePicker _from = new() { Width = 125, SelectedDate = DateTime.Today }, _to = new() { Width = 125, SelectedDate = DateTime.Today.AddMonths(3) };
    private string _type = "";
    private int _activeMonth = 3;

    public ExpiryPage() : base("만기관리", "검색어(주소·소유자·임차인)")
    {
        FilterBar.Children.Clear();
        var box = new StackPanel { Margin = new Thickness(4, 4, 4, 4) };
        box.Children.Add(_types);
        var row = new WrapPanel();
        row.Children.Add(Legacy.Label("만기일 검색", 15, "#334155", FontWeights.Bold));
        row.Children.Add(_from);
        row.Children.Add(new TextBlock { Text = " ~ ", FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center });
        row.Children.Add(_to);
        row.Children.Add(Legacy.Label("  만기 전", 15, "#334155", FontWeights.Bold));
        row.Children.Add(_months);
        SearchBox.Width = 220;
        var go = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton") };
        go.Click += async (_, _) => await RefreshAsync();
        row.Children.Add(Legacy.Group(SearchBox, go));
        box.Children.Add(row);
        FilterBar.Children.Add(box);
        _from.SelectedDateChanged += async (_, _) => { if (IsLoaded && !_settingMonth) { _activeMonth = 0; RenderMonths(); await RefreshAsync(); } };
        _to.SelectedDateChanged += async (_, _) => { if (IsLoaded && !_settingMonth) { _activeMonth = 0; RenderMonths(); await RefreshAsync(); } };
        RenderTypes();
        RenderMonths();

        GridBuilder.SetColumns(Grid, new[]
        {
            ColDef.Date("expiry_date", "만기일자", 104),
            ColDef.Text("source_text", "출처", 88),
            ColDef.Map("pt_type", "매물유형", Catalog.PropertyTypesAll, 100),
            ColDef.Text("trade_text", "거래유형", 90),
            ColDef.Text("amount_text", "거래금액", 150),
            ColDef.Text("pt_name", "물건명", 200),
            ColDef.Text("detail_addr", "상세주소", 220),
            ColDef.Text("area_text", "면적", 100),
            ColDef.Text("owner_name", "소유자", 84),
            ColDef.Text("owner_phone", "소유자 연락처", 128),
            ColDef.Text("tenant_name", "임차인", 84),
            ColDef.Text("tenant_phone", "임차인 연락처", 128),
            ColDef.Text("d_day", "남은일수", 0),
        });
    }

    private bool _settingMonth;

    private void RenderTypes()
    {
        _types.Children.Clear();
        foreach (var (value, label) in new[] { ("", "전체") }.Concat(Catalog.PropertyTypeFilters.Where(f => f.Value != "SYCA108").Select(f => (f.Value, f.Label))))
        {
            var v = value;
            var b = Legacy.Pill(label, _type == v, async () => { _type = v; RenderTypes(); await RefreshAsync(); });
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
                _settingMonth = true;
                _from.SelectedDate = DateTime.Today;
                _to.SelectedDate = DateTime.Today.AddMonths(m);
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
        var rows = await _svc.ListAsync(_from.SelectedDate, _to.SelectedDate, _type.Length == 0 ? null : _type);
        var kw = Keyword;
        foreach (var r in rows)
        {
            r["source_text"] = "물건관리";
            r["trade_text"] = Catalog.SaleDivLabel(r.Str("sale_div"));
            r["amount_text"] = r.Long("now_dep_amt") is { } dep ? $"{dep:#,0}{(r.Long("now_mon_amt") is { } mon && mon > 0 ? $" / {mon:#,0}" : "")}" : "";
            r["detail_addr"] = string.Join(" ", new[] { r.Str("addr"), r.Has("dong") ? $"{r.Str("dong")}동" : null, r.Has("ho") ? $"{r.Str("ho")}호" : null }.Where(x => !string.IsNullOrEmpty(x)));
            r["area_text"] = r.Dec("exc_area") is { } e ? $"{e:0.##}㎡" : "";
        }
        if (kw is null) return rows;
        return rows.Where(r => new[] { "addr", "owner_name", "owner_phone", "tenant_name", "tenant_phone", "pt_name" }
            .Any(k => (r.Str(k) ?? "").Contains(kw, StringComparison.OrdinalIgnoreCase))).ToList();
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

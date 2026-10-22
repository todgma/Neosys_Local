using System.Windows;
using System.Windows.Controls;
using Neosys.Local.App.Views;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Customers;

/// <summary>고객관리 목록 — 기존 CustomersPage(필터·표)와 같은 항목</summary>
public sealed class CustomerPage : ListPage
{
    private readonly CustomerService _svc = AppServices.Create((sp, s) => new CustomerService(sp, s));
    private readonly ComboBox _wantType = new() { Width = 110, DisplayMemberPath = "Label", SelectedValuePath = "Value" };
    private readonly ComboBox _trdPrg = new() { Width = 110, DisplayMemberPath = "Label", SelectedValuePath = "Value" };
    private readonly WrapPanel _trdTypes = new() { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6, 0, 0, 0) };
    private readonly HashSet<string> _selectedTrd = new();

    /// <summary>
    /// 기존 CustomersPage 모양: 위 검색 상자 없이 표 도구줄 2줄
    ///  1줄 [물건유형▾][고객상태▾][전체·매매·전세·월세·기타임대] N건 … 상담모드
    ///  2줄 [검색어][검색] … [보고서][엑셀 업로드][색 채우기][+ 신규 등록][수정][삭제]
    /// </summary>
    public CustomerPage() : base("고객관리", "이름/상호/연락처/주소 검색")
    {
        _wantType.ItemsSource = new[] { new Opt("", "모든유형") }.Concat(Catalog.WantCategories).ToList();
        _wantType.SelectedIndex = 0;
        _wantType.SelectionChanged += async (_, _) => { if (IsLoaded) await RefreshAsync(); };
        _trdPrg.ItemsSource = new[] { new Opt("", "전체고객"), new Opt("TRDPRG01", "진행고객"), new Opt("TRDPRG02", "계약"), new Opt("TRDPRG03", "타계"), new Opt("TRDPRG04", "보류") };
        _trdPrg.SelectedIndex = 0;
        _trdPrg.SelectionChanged += async (_, _) => { if (IsLoaded) await RefreshAsync(); };
        LeftBar.Children.Add(_wantType);
        LeftBar.Children.Add(_trdPrg);
        LeftBar.Children.Add(_trdTypes);
        RenderTrdTypes();

        AddButton("삭제", DeleteSelectedAsync, "DangerButton");
        AddButton("보고서", ReportAsync);
        AddButton("엑셀 업로드", UploadAsync);
        AddButton("신규 등록", () => OpenAsync(null), "PrimaryButton");
        AddRowMenu("수정", async () => { if (Selected is { } r) await OpenAsync(r); else Toast.Show("수정할 고객을 선택하세요."); });
        AddRowMenu("복사등록", CopyAsync);
        AddRowMenu("보고서 작성", ReportAsync);
        AddRowMenu("삭제", DeleteSelectedAsync);
        UseStackedToolbar(Legacy.ConsultToggle());

        GridBuilder.SetColumns(Grid, new[]
        {
            ColDef.Date("upd_text", "수정일", 90),
            ColDef.Map("want_type", "물건유형", Catalog.WantCategories, 90),
            ColDef.Text("want_sub_type", "세부유형", 120),
            ColDef.Text("wish_areas", "구입희망지역", 160),
            ColDef.Map("trd_type", "거래유형", Catalog.CustomerTradeTypes, 128),
            ColDef.Text("area_text", "면적", 120),
            ColDef.Text("land_category", "지목", 90),
            ColDef.Text("biz_type", "업종", 100),
            ColDef.Text("movein_yn", "입주여부", 100),
            ColDef.Text("move_text", "잔금예정일", 150),
            ColDef.Text("amount_text", "희망금액(만원)", 150),
            ColDef.Text("feature_note", "구입물건특징", 180),
            ColDef.Text("match_text", "매칭", 120),
            ColDef.Text("name", "성함", 80),
            ColDef.Text("tel", "전화번호", 120),
        });
    }

    private void RenderTrdTypes()
    {
        _trdTypes.Children.Clear();
        _trdTypes.Children.Add(Legacy.Pill("전체", _selectedTrd.Count == 0, async () => { _selectedTrd.Clear(); RenderTrdTypes(); await RefreshAsync(); }).With(b => b.Margin = new Thickness(0, 0, 4, 0)));
        foreach (var t in Catalog.CustomerTradeTypes)
        {
            var v = t.Value;
            _trdTypes.Children.Add(Legacy.Pill(t.Label, _selectedTrd.Contains(v), async () =>
            {
                if (!_selectedTrd.Remove(v)) _selectedTrd.Add(v);
                RenderTrdTypes();
                await RefreshAsync();
            }).With(b => b.Margin = new Thickness(0, 0, 4, 0)));
        }
    }

    protected override string? KeyName => "cust_no";

    protected override async Task<List<Row>> LoadAsync()
    {
        var rows = await _svc.ListAsync(new Row
        {
            ["q_keyword"] = Keyword,
            ["q_want_type"] = ComboValue(_wantType),
            ["q_trd_type"] = _selectedTrd.Count == 0 ? null : string.Join(",", _selectedTrd),
            ["q_trd_prg"] = ComboValue(_trdPrg),
        });
        foreach (var r in rows)
        {
            r["upd_text"] = r.Str("upd_dt") ?? r.Str("reg_dt");
            r["area_text"] = RangeText(r.Dec("exc_area_fr"), r.Dec("exc_area_to"), r.Str("area_unit") ?? "평");
            r["amount_text"] = AmountText(r);
            r["move_text"] = DateRange(r.Str("move_date_fr"), r.Str("move_date_to"));
            r["match_text"] = "자사 0 / 공동 0";
        }
        return rows;
    }

    private static string RangeText(decimal? fr, decimal? to, string unit) =>
        fr is null && to is null ? "" : $"{fr:0.##}~{to:0.##}{unit}";

    private static string DateRange(string? fr, string? to) =>
        fr is null && to is null ? "" : $"{fr?[..Math.Min(10, fr.Length)]}~{to?[..Math.Min(10, to.Length)]}";

    private static string AmountText(Row r)
    {
        var parts = new List<string>();
        void Add(string label, string fr, string to)
        {
            long? a = r.Long(fr), b = r.Long(to);
            if (a is null && b is null) return;
            parts.Add($"{label} {a:#,0}~{b:#,0}");
        }
        Add("매", "sale_amt_fr", "sale_amt_to");
        Add("전", "les_amt_fr", "les_amt_to");
        Add("보", "prot_amt_fr", "prot_amt_to");
        Add("월", "mon_amt_fr", "mon_amt_to");
        return string.Join(" / ", parts);
    }

    protected override async Task OpenAsync(Row? row)
    {
        CustomerDetail? detail = row is null ? _svc.New() : await _svc.GetAsync(row.Long("cust_no")!.Value);
        if (detail is null) { Dialogs.Warn("고객 정보를 찾을 수 없습니다."); return; }
        var w = new CustomerEditWindow(_svc, detail);
        w.ShowDialog();
        if (w.Changed) await RefreshAsync();
    }

    /// <summary>엑셀 일괄 업로드(기존 DataUploadPage, target=customer)</summary>
    private async Task UploadAsync()
    {
        var w = new Upload.BulkUploadWindow("customer");
        w.ShowDialog();
        if (w.Uploaded) await RefreshAsync();
    }

    /// <summary>선택한 고객에게 보낼 보고서(매물 브리핑) 작성 — 매물은 창에서 고른다</summary>
    private async Task ReportAsync()
    {
        if (Selected is not { } row) { Dialogs.Info("고객을 선택하세요."); return; }
        new Reports.ReportBuilderWindow(customer: row).ShowDialog();
        await Task.CompletedTask;
    }

    /// <summary>복사등록 — 희망지역·구입자·공동중개사는 복사, 메모·상담이력은 비움(기존과 동일)</summary>
    private async Task CopyAsync()
    {
        if (Selected is not { } row) { Dialogs.Info("복사할 고객을 선택하세요."); return; }
        var src = await _svc.GetAsync(row.Long("cust_no")!.Value);
        if (src is null) return;
        var c = src.Cust.Clone();
        foreach (var k in new[] { "cust_no", "reg_dt", "reg_id", "upd_dt", "upd_id" }) c.Remove(k);
        var copy = new CustomerDetail
        {
            Cust = c,
            Areas = src.Areas.Select(x => x.Clone()).ToList(),
            Buyers = src.Buyers.Select(x => x.Clone()).ToList(),
            Shares = src.Shares.Select(x => x.Clone()).ToList(),
        };
        var w = new CustomerEditWindow(_svc, copy);
        w.ShowDialog();
        if (w.Changed) await RefreshAsync();
    }

    private async Task DeleteSelectedAsync()
    {
        var rows = GridBuilder.SelectedRows(Grid);
        if (rows.Count == 0) { Dialogs.Info("삭제할 고객을 선택하세요."); return; }
        if (!Dialogs.Confirm($"선택한 고객 {rows.Count}명을 삭제하시겠습니까?")) return;
        foreach (var r in rows) await _svc.DeleteAsync(r.Long("cust_no")!.Value);
        await RefreshAsync();
    }
}

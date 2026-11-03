using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Vendors;

/// <summary>
/// 협력업체관리 — 기존 PartnersPage 모양: 위 분류 버튼 격자(12칸 × 2줄, 복수 선택, 준비중 버튼 빨강) + 표.
/// 표 도구줄 왼쪽 '상담이력 있는 업체보기', 오른쪽 [색 채우기][+ 신규 등록][수정][삭제]
/// </summary>
public sealed class VendorPage : ListPage
{
    /// <summary>분류 격자(기존 PARTNER_CATEGORY_GRID): (라벨, 준비중, 칸 수). null = 빈 칸</summary>
    private static readonly (string Label, bool Prep, int Span)?[] Grid12 =
    {
        ("중개사무소", false, 1), ("네이버광고", false, 1), ("이사 | 청소", false, 1), ("은행 | 대출상담", false, 1), ("법무 | 세무", false, 1), ("지도 | 평면도", false, 1),
        ("분양대행사", false, 1), ("시행 | 시공 | 설계", false, 1), ("인테리어 | 철거", false, 1), ("변호사 | 행정사", false, 1), ("기타", false, 1), ("교육/강좌", true, 1),
        ("고객관리프로그램 자료 업로드", true, 2), ("블로그 | 유튜브 | 인스타그램", false, 1), ("컴퓨터 | 프린터 / 인터넷 | 네트워크", false, 1),
        ("정수기 | 디퓨저 / cc카메라 | 소품", false, 1), ("차 | 음료 | 다과 / 문구 | 명함", false, 1), ("개업인사 / 떡케잌 | 꽃배달", false, 1), null, null, null, null, null,
    };

    private readonly VendorService _svc = AppServices.Create((sp, s) => new VendorService(sp, s));
    private readonly System.Windows.Controls.Grid _cats = new();
    private readonly HashSet<string> _selected = new();
    private readonly CheckBox _onlyConsult = new() { Content = "상담이력 있는 업체보기", FontSize = 14, FontWeight = FontWeights.SemiBold };

    public VendorPage() : base("협력업체관리", "상호·담당자·전화·상품 검색")
    {
        FilterBar.Children.Clear();
        var box = new StackPanel();
        box.Children.Add(_cats);
        var row = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 6, 0, 0) };
        SearchBox.Width = 240;
        row.Children.Add(SearchBox);
        var go = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton") };
        go.Click += async (_, _) => await RefreshAsync();
        row.Children.Add(go);
        box.Children.Add(row);
        FilterBar.Children.Add(box);
        FilterBar.SizeChanged += (_, _) => box.Width = Math.Max(0, FilterBar.ActualWidth - 4);
        RenderCats();

        _onlyConsult.Click += async (_, _) => await RefreshAsync();
        LeftBar.Children.Add(_onlyConsult);

        AddButton("삭제", DeleteSelectedAsync, "DangerButton");
        AddButton("신규 등록", () => OpenAsync(null), "PrimaryButton");

        GridBuilder.SetColumns(Grid, new[]
        {
            ColDef.Text("category1", "분류", 160),
            ColDef.Text("vendor_name", "상호", 160),
            ColDef.Text("ceo_name", "대표자", 80),
            ColDef.Text("manager_name", "담당자", 80),
            ColDef.Text("manager_phone", "담당휴대폰", 115),
            ColDef.Text("manager_tel", "전화번호", 115),
            ColDef.Text("business_region", "영업지역", 160),
            ColDef.Text("product_desc", "상품설명", 0),
            ColDef.Text("consult_cnt", "상담", 50),
        });
    }

    private void RenderCats()
    {
        _cats.Children.Clear();
        _cats.ColumnDefinitions.Clear();
        _cats.RowDefinitions.Clear();
        for (int i = 0; i < 12; i++) _cats.ColumnDefinitions.Add(new ColumnDefinition());
        int pos = 0;
        void Place(FrameworkElement e, int span)
        {
            if (pos % 12 == 0) _cats.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            System.Windows.Controls.Grid.SetRow(e, pos / 12);
            System.Windows.Controls.Grid.SetColumn(e, pos % 12);
            System.Windows.Controls.Grid.SetColumnSpan(e, span);
            _cats.Children.Add(e);
            pos += span;
        }
        foreach (var c in Grid12)
        {
            if (c is not { } cat)
            {
                Place(new Border { MinHeight = 28, Margin = new Thickness(2.5), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(4), Background = Legacy.B("#FAFAFA") }, 1);
                continue;
            }
            var on = !cat.Prep && _selected.Contains(cat.Label);
            var b = new Button
            {
                Content = new TextBlock { Text = cat.Label.Replace(" / ", "\n"), TextAlignment = TextAlignment.Center, TextWrapping = TextWrapping.Wrap, LineHeight = 17 },
                MinHeight = 28, Padding = new Thickness(3), Margin = new Thickness(2.5), FontSize = 13.5, FontWeight = on ? FontWeights.Bold : FontWeights.SemiBold,
                BorderBrush = Legacy.B(on ? "#4F46E5" : cat.Prep ? "#FCA5A5" : "#93A3F4"), Background = on ? Legacy.B("#4F46E5") : Brushes.White,
                Foreground = on ? Brushes.White : Legacy.B(cat.Prep ? "#DC2626" : "#1F2937"),
            };
            var label = cat.Label;
            var prep = cat.Prep;
            b.Click += async (_, _) =>
            {
                if (prep) { Toast.Show("준비 중입니다."); return; }
                if (!_selected.Remove(label)) _selected.Add(label);
                RenderCats();
                await RefreshAsync();
            };
            Place(b, cat.Span);
        }
    }

    protected override string? KeyName => "vendor_id";

    protected override async Task<List<Row>> LoadAsync()
    {
        var rows = await _svc.ListAsync(new Row { ["q_keyword"] = Keyword });
        return rows.Where(r => (_selected.Count == 0 || _selected.Any(c => (r.Str("category1") ?? "").Contains(c)))
                               && (_onlyConsult.IsChecked != true || (r.Long("consult_cnt") ?? 0) > 0)).ToList();
    }

    protected override async Task OpenAsync(Row? row)
    {
        var d = row is null ? _svc.New() : await _svc.GetAsync(row.Long("vendor_id")!.Value);
        if (d is null) return;
        var w = new VendorEditWindow(_svc, d);
        w.ShowDialog();
        if (w.Changed) await RefreshAsync();
    }

    private async Task DeleteSelectedAsync()
    {
        var rows = GridBuilder.SelectedRows(Grid);
        if (rows.Count == 0) { Dialogs.Info("삭제할 업체를 선택하세요."); return; }
        if (!Dialogs.Confirm($"선택한 업체 {rows.Count}곳을 삭제하시겠습니까?")) return;
        foreach (var r in rows) await _svc.DeleteAsync(r.Long("vendor_id")!.Value);
        await RefreshAsync();
    }
}

/// <summary>협력업체 등록/수정 — 기존 VendorModal(분류·상호·연락처·주소·영업지역·상품설명·상담이력)</summary>
public sealed class VendorEditWindow : EditWindow
{
    private readonly VendorService _svc;
    private readonly VendorDetail _d;
    private readonly ListBox _regions = new() { MinHeight = 60, MaxHeight = 110 };
    private readonly ChildListEditor _consults;

    public VendorEditWindow(VendorService svc, VendorDetail d) : base("협력업체", 1060, 760)
    {
        _svc = svc;
        _d = d;
        var v = d.Vendor;

        var fields = new[]
        {
            F.Combo("category1", "분류", Catalog.PartnerCategories),
            F.Text("vendor_name", "상호").Required(),
            F.Text("manager_tel", "전화번호"),
            F.Text("ceo_name", "대표자명"),
            F.Text("ceo_phone", "대표휴대폰"),
            F.Text("manager_fax", "팩스번호"),
            F.Text("manager_name", "담당자명"),
            F.Text("manager_phone", "담당휴대폰"),
            F.Text("homepage_url", "홈페이지"),
            F.Custom("사업장주소", row => AddressEditor(row)).Span(3),
            F.Memo("product_desc", "상품설명", 90).Span(3),
            F.Memo("consultation_note", "상담메모", 50).Span(3),
        };

        foreach (var r in d.Regions) _regions.Items.Add(new ListBoxItem { Content = r.Str("region_name"), Tag = r });
        var regionBar = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 8, 0, 3) };
        regionBar.Children.Add(new TextBlock { Text = "영업지역", FontWeight = FontWeights.Bold, Foreground = (System.Windows.Media.Brush)FindResource("PrimaryDark"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 10, 0) });
        var add = new Button { Content = "+ 지역추가", Padding = new Thickness(8, 1, 8, 1), MinHeight = 24 };
        add.Click += (_, _) =>
        {
            var p = RegionPicker.Pick(title: "영업지역 추가");
            if (p is null || !p.Has("bjd_code")) return;
            var name = string.Join(" ", new[] { p.Str("addr1"), p.Str("addr2"), p.Str("addr3") }.Where(s => !string.IsNullOrEmpty(s)));
            _regions.Items.Add(new ListBoxItem { Content = name, Tag = new Row { ["region_code"] = p.Str("bjd_code"), ["region_name"] = name } });
        };
        var del = new Button { Content = "선택삭제", Padding = new Thickness(8, 1, 8, 1), MinHeight = 24 };
        del.Click += (_, _) => { if (_regions.SelectedItem is not null) _regions.Items.Remove(_regions.SelectedItem); else Toast.Show("삭제할 영업지역을 선택하세요."); };
        regionBar.Children.Add(add);
        regionBar.Children.Add(del);

        _consults = new ChildListEditor("상담이력", new[]
        {
            new ChildCol("reg_dt", "일시", 125, ChildColKind.ReadOnly),
            new ChildCol("contact_name", "성함", 80),
            new ChildCol("contact_phone", "전화번호", 115),
            new ChildCol("itv_content", "내용"),
        }, () => new Row { ["reg_dt"] = LocalDate.Now }, 150);
        _consults.Load(d.Consults);

        var panel = new StackPanel();
        panel.Children.Add(FormBuilder.Build(v, fields, 3));
        panel.Children.Add(regionBar);
        panel.Children.Add(_regions);
        panel.Children.Add(_consults);
        Body.Children.Add(new ScrollViewer { Content = panel, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
    }

    /// <summary>주소: [지역 선택] 버튼 + 상세주소. 저장값 business_region_code·bjd_code(법정동), detail_address(전체 주소)</summary>
    private static FrameworkElement AddressEditor(Row row)
    {
        var dp = new DockPanel();
        var pick = new Button { Content = "지역 선택", Padding = new Thickness(8, 1, 8, 1), MinHeight = 24, Margin = new Thickness(0, 0, 6, 0) };
        var tb = FormBuilder.MakeTextBox(row, "detail_address", "시/도 시/군/구 읍/면/동 상세주소");
        pick.Click += (_, _) =>
        {
            var p = RegionPicker.Pick(title: "사업장 주소 지역");
            if (p is null) return;
            row["business_region_code"] = p.Str("bjd_code");
            row["bjd_code"] = p.Str("bjd_code");
            row["detail_address"] = string.Join(" ", new[] { p.Str("addr1"), p.Str("addr2"), p.Str("addr3") }.Where(s => !string.IsNullOrEmpty(s))) + " ";
        };
        DockPanel.SetDock(pick, Dock.Left);
        dp.Children.Add(pick);
        dp.Children.Add(tb);
        return dp;
    }

    protected override bool IsNew => _d.IsNew;

    protected override async Task SaveAsync()
    {
        _consults.Commit();
        _d.Regions.Clear();
        _d.Regions.AddRange(_regions.Items.OfType<ListBoxItem>().Select(i => (Row)i.Tag));
        _d.Consults.Clear();
        _d.Consults.AddRange(_consults.Items);
        await _svc.SaveAsync(_d);
    }

    protected override Task DeleteAsync() => _svc.DeleteAsync(_d.VendorId!.Value);
}

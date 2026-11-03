using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Customers;

/// <summary>
/// 고객 등록/수정 — 기존 CustomerFormPageV2 배치:
///   머리글(제목·담당자·등록일자·최근수정일)
///   노란 줄(구입물건유형 + 구입희망지역 태그 + [지역추가])
///   왼쪽 580px 행 폼(상세유형·고객상태·면적·거래 구분·금액·실입주 여부·잔금 예정일·구입물건정보·희망옵션)
///   오른쪽 카드(구입물건특징·상담내용·[공동중개사 사무소|구입자]) — 상담모드면 숨김
///   푸터(정보망전송·일정관리·보고서 생성 … 입력초기화·삭제·등록|저장·닫기)
/// 고객 성함·전화는 기존처럼 구입자 첫 행에서 가져온다(CustomerService).
/// </summary>
public sealed class CustomerEditWindow : EditWindow
{
    private static readonly Brush Line = Legacy.B("#CBD5E1"), YellowLine = Legacy.B("#FBBF24");

    private readonly CustomerService _svc;
    private readonly CustomerDetail _d;
    private readonly WrapPanel _areaTags = new() { VerticalAlignment = VerticalAlignment.Center };
    private readonly List<Row> _areas = new();
    private readonly ChildListEditor _memos, _consults, _buyers, _shares;
    private readonly TextBlock _title = new() { FontSize = 18, FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center };
    private readonly TextBlock _meta = new() { FontSize = 13, Foreground = Legacy.B("#64748B"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(16, 0, 0, 0) };
    private readonly TextBlock _upd = new() { FontSize = 13, Foreground = Legacy.B("#EF4444"), FontWeight = FontWeights.Medium, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 0, 0) };
    private readonly Button _resetBtn = new() { Content = "입력초기화" };
    private readonly Button _reportBtn = new() { Content = "보고서 생성", Background = Legacy.B("#4F46E5"), Foreground = Brushes.White, BorderThickness = new Thickness(0) };

    public CustomerEditWindow(CustomerService svc, CustomerDetail detail) : base("고객", 1250, 900)
    {
        // 기존 Electron 고객폼: 1250×900 고정(크기조절·최대화 불가)
        ResizeMode = ResizeMode.CanMinimize;
        MinWidth = 1250;
        _svc = svc;
        _d = detail;
        var c = detail.Cust;

        _memos = new ChildListEditor("구입물건특징", new[]
        {
            new ChildCol("memo_date", "날짜", 120, ChildColKind.ReadOnly), new ChildCol("memo_content", "내용"),
            new ChildCol("user_id", "작성자", 60, ChildColKind.ReadOnly),
        }, () => new Row { ["memo_date"] = LocalDate.Now, ["user_id"] = AppServices.Session.UserId }, 60);
        _memos.Load(detail.Memos);
        _memos.HideHeader();

        _consults = new ChildListEditor("상담내용", new[]
        {
            new ChildCol("reg_dt", "일시", 120, ChildColKind.ReadOnly), new ChildCol("contact_name", "성함", 70),
            new ChildCol("contact_phone", "전화번호", 105), new ChildCol("itv_content", "내용"),
        }, () => new Row { ["reg_dt"] = LocalDate.Now }, 60);
        _consults.Load(detail.Consults);
        _consults.HideHeader();

        _buyers = new ChildListEditor("구입자", new[]
        {
            new ChildCol("name", "성함", 90), new ChildCol("relation", "관계", 70),
            new ChildCol("tel", "전화번호", 115), new ChildCol("addr", "주소"),
        }, minHeight: 60);
        _buyers.Load(detail.Buyers);
        _buyers.HideHeader();

        _shares = new ChildListEditor("공동중개사 사무소", new[]
        {
            new ChildCol("share_date", "날짜", 100, ChildColKind.Date), new ChildCol("office_name", "상호", 110),
            new ChildCol("region_name", "지역명", 80), new ChildCol("office_phone", "전화번호", 105), new ChildCol("memo", "내용"),
        }, minHeight: 60);
        _shares.Load(detail.Shares);
        _shares.HideHeader();

        _areas.AddRange(detail.Areas);
        RenderAreas();

        // ---------- 본문 ----------
        var main = new DockPanel();
        var top = TopBar(c);
        top.Margin = new Thickness(0, 0, 0, 4);
        DockPanel.SetDock(top, Dock.Top);
        main.Children.Add(top);

        var body = new Grid();
        body.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(580) });
        body.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        body.Children.Add(new ScrollViewer { Content = RowFormBuilder.Build(c, Rows()), VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Padding = new Thickness(0, 0, 2, 0) });
        var right = RightCards(c);
        right.Margin = new Thickness(6, 0, 0, 0);
        Grid.SetColumn(right, 1);
        body.Children.Add(right);
        // 상담모드 ON → 구입물건특징·상담내용은 그대로 보이고, 공동중개사/구입자(연락처) 카드만 숨긴다.
        // 기존 useConsultMode는 우측 카드 전체를 숨겼으나 사용자 요청으로 바꿈(2026-10-28, 물건등록과 같게). 대시보드에서 바꾸면 열린 창에도 바로
        void ApplyConsult()
        {
            var on = AppServices.Settings.ConsultMode;
            _partyCard.Visibility = on ? Visibility.Collapsed : Visibility.Visible;
            _partyRow.Height = on ? new GridLength(0) : new GridLength(168);
        }
        ApplyConsult();
        body.Loaded += (_, _) => { AppServices.Settings.ConsultModeChanged += ApplyConsult; ApplyConsult(); };
        body.Unloaded += (_, _) => AppServices.Settings.ConsultModeChanged -= ApplyConsult;
        main.Children.Add(body);

        var head = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 8) };
        head.Children.Add(_title);
        head.Children.Add(_meta);
        head.Children.Add(_upd);
        var root = new DockPanel();
        DockPanel.SetDock(head, Dock.Top);
        root.Children.Add(head);
        root.Children.Add(main);
        Body.Children.Add(root);

        // ---------- 푸터 ----------
        var shareNet = new Button { Content = "정보망전송", Background = Legacy.B("#0EA5E9"), Foreground = Brushes.White, BorderThickness = new Thickness(0), Margin = new Thickness(0, 0, 6, 0) };
        shareNet.Click += (_, _) => Toast.Show(_d.IsNew ? "저장된 고객 정보만 정보망 전송이 가능합니다." : "공동중개망 전송은 네오시스 웹에서 이용하세요.");
        var schedule = new Button { Content = "일정관리", Background = Legacy.B("#A855F7"), Foreground = Brushes.White, BorderThickness = new Thickness(0), Margin = new Thickness(0, 0, 6, 0) };
        schedule.Click += (_, _) =>
        {
            var ss = AppServices.Create((sp, s) => new ScheduleService(sp, s));
            var r = ss.New();
            r["title"] = c.Str("name") is { } n ? $"{n} 고객" : null;
            Schedules.SchedulePage.Edit(ss, r);
        };
        _reportBtn.Click += (_, _) =>
        {
            if (_d.IsNew) return;
            new Reports.ReportBuilderWindow(customer: new Row { ["cust_no"] = _d.CustNo, ["name"] = c.Str("name") }) { Owner = DialogOwner }.ShowDialog();
        };
        LeftButtons.Children.Add(shareNet);
        LeftButtons.Children.Add(schedule);
        LeftButtons.Children.Add(_reportBtn);
        _resetBtn.Click += (_, _) => ResetInput();
        AddRightButton(_resetBtn);
    }

    protected override string SaveLabel => _d.IsNew ? "등록 | 저장" : "수정 | 저장";

    protected override void OnModeChanged()
    {
        var c = _d.Cust;
        _title.Text = _d.IsNew ? "고객정보 등록" : "고객정보 수정";
        var reg = !_d.IsNew && DateTime.TryParse(c.Str("reg_dt"), out var rd) ? rd : DateTime.Today;
        _meta.Text = $"담당자: {c.Str("rt_nm") ?? AppServices.Session.RtNm}    등록일자: {reg:yyyy-MM-dd}";
        _upd.Text = _d.IsNew ? "" : $"최근수정일: {(DateTime.TryParse(c.Str("upd_dt"), out var ud) ? ud.ToString("yyyy-MM-dd HH:mm") : "-")}";
        _resetBtn.Visibility = _d.IsNew ? Visibility.Visible : Visibility.Collapsed;
        _reportBtn.Visibility = _d.IsNew ? Visibility.Collapsed : Visibility.Visible;
    }

    // ================= 노란 줄 =================

    /// <summary>구입물건유형(수정 시 고정) + 구입희망지역 태그 + [지역추가]</summary>
    private FrameworkElement TopBar(Row c)
    {
        Border Chip(string text) => new()
        {
            Padding = new Thickness(10, 0, 8, 0),
            Child = new TextBlock { Text = text, FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#92400E"), VerticalAlignment = VerticalAlignment.Center },
        };
        var dp = new DockPanel { MinHeight = 40, LastChildFill = true };
        var left = new StackPanel { Orientation = Orientation.Horizontal };
        left.Children.Add(Chip("구입물건유형"));
        if (_d.IsNew)
        {
            var cb = FormBuilder.MakeCombo(c, "want_type", Catalog.WantCategories);
            cb.Width = 160;
            cb.VerticalAlignment = VerticalAlignment.Center;
            left.Children.Add(cb);
            c.PropertyChanged += (_, e) => { if (e.PropertyName == "want_type") c["want_sub_type"] = null; };
        }
        else
        {
            left.Children.Add(new Border
            {
                Width = 130, Background = Legacy.B("#F1F5F9"), BorderBrush = Line, BorderThickness = new Thickness(1), Padding = new Thickness(6, 3, 6, 3), VerticalAlignment = VerticalAlignment.Center,
                Child = new TextBlock { Text = Catalog.WantCategories.FirstOrDefault(o => o.Value == c.Str("want_type"))?.Label ?? "-", Foreground = Legacy.B("#475569") },
            });
        }
        var areaChip = Chip("구입희망지역");
        areaChip.Margin = new Thickness(8, 0, 0, 0);
        areaChip.BorderBrush = YellowLine;
        areaChip.BorderThickness = new Thickness(1, 0, 0, 0);
        left.Children.Add(areaChip);
        DockPanel.SetDock(left, Dock.Left);
        dp.Children.Add(left);

        var add = new Button { Content = "지역추가", Background = Legacy.B("#F59E0B"), BorderBrush = Legacy.B("#D97706"), Foreground = Brushes.White, Padding = new Thickness(12, 3, 12, 3), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6, 0, 8, 0) };
        add.Click += (_, _) => AddArea();
        var mid = new StackPanel { Orientation = Orientation.Horizontal };
        mid.Children.Add(_areaTags);
        mid.Children.Add(add);
        dp.Children.Add(mid);
        return new Border { Background = Legacy.B("#FEFCE8"), BorderBrush = YellowLine, BorderThickness = new Thickness(2), Child = dp };
    }

    private void RenderAreas()
    {
        _areaTags.Children.Clear();
        foreach (var a in _areas)
        {
            var sp = new StackPanel { Orientation = Orientation.Horizontal };
            sp.Children.Add(new TextBlock { Text = AreaText(a) is { Length: > 0 } t ? t : "(지역)", FontSize = 11.5, Foreground = Legacy.B("#3730A3"), VerticalAlignment = VerticalAlignment.Center });
            var x = new TextBlock { Text = "✕", Foreground = Legacy.B("#6366F1"), Margin = new Thickness(6, 0, 0, 0), Cursor = System.Windows.Input.Cursors.Hand, VerticalAlignment = VerticalAlignment.Center };
            var area = a;
            x.MouseLeftButtonUp += (_, _) => { _areas.Remove(area); RenderAreas(); };
            sp.Children.Add(x);
            _areaTags.Children.Add(new Border
            {
                Background = Legacy.B("#EEF2FF"), BorderBrush = Legacy.B("#C7D2FE"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(12),
                Padding = new Thickness(8, 2, 8, 2), Margin = new Thickness(0, 2, 6, 2), Child = sp,
            });
        }
    }

    private static string AreaText(Row a) =>
        string.Join(" ", new[] { a.Str("addr1"), a.Str("addr2"), a.Str("addr3"), a.Str("bld_nm"), a.Str("detail_loc") }.Where(s => !string.IsNullOrWhiteSpace(s)));

    private void AddArea()
    {
        var picked = RegionPicker.Pick(withDanji: _d.Cust.Str("want_type") != "토지", title: "구입희망지역 추가");
        if (picked is null) return;
        var bjd = picked.Str("bjd_code");
        if (bjd is not null && _areas.Any(a => a.Str("bjd_code") == bjd && !a.Has("danji_code") && !picked.Has("danji_code")))
            return; // 같은 법정동 중복 제외(기존과 동일)
        _areas.Add(new Row
        {
            ["addr1"] = picked["addr1"], ["addr2"] = picked["addr2"], ["addr3"] = picked["addr3"], ["bjd_code"] = bjd,
            ["danji_code"] = picked["danji_code"], ["bld_nm"] = picked["danji_name"],
        });
        RenderAreas();
    }

    // ================= 왼쪽 행 폼 =================

    private static readonly IReadOnlyList<Opt> HousingSub = Catalog.WantSubTypes("주거용");
    private static readonly IReadOnlyList<Opt> CommercialSub = Catalog.WantSubTypes("업무용");

    private static IEnumerable<FieldDef> Rows()
    {
        static bool Is(Row r, string want) => r.Str("want_type") == want;
        static bool Housing(Row r) => !Is(r, "업무용") && !Is(r, "토지");
        static bool TradeHas(Row r, string code) => (r.Str("trd_type") ?? "").Contains(code);
        static FieldDef AR(string fr, string to, string label) => new FieldDef { Key = fr, Key2 = to, Label = label, Kind = FieldKind.AmountRange };

        yield return F.Section("상세유형");
        yield return F.Checks("want_sub_type", "상세유형", HousingSub).Span(2).When(r => Is(r, "주거용"));
        yield return F.Checks("want_sub_type", "상세유형", CommercialSub).Span(2).When(r => Is(r, "업무용"));

        yield return F.Section("고객상태");
        yield return F.Radio("trd_prg", "고객상태", Catalog.CustomerProgress);
        yield return F.Date("contract_date", "계약일").When(r => r.Str("trd_prg") == "TRDPRG02");
        yield return F.Date("hold_date", "보류일").When(r => r.Str("trd_prg") == "TRDPRG04");

        yield return F.Section("면적");
        yield return F.Combo("area_unit", "단위", Catalog.AreaUnits).W(60);
        yield return F.Combo("area_kind", "기준", Catalog.AreaKinds).When(r => !Is(r, "토지")).W(70);
        yield return F.DecRange("exc_area_fr", "exc_area_to", "면적").When(r => !Is(r, "토지")).W(170);
        yield return F.DecRange("land_share_ratio_fr", "land_share_ratio_to", "대지지분").When(Housing).W(170);
        yield return F.DecRange("land_share_fr", "land_share_to", "대지면적").When(r => !Housing(r)).W(170);
        yield return F.DecRange("gross_area_fr", "gross_area_to", "연면적").When(r => Is(r, "업무용")).W(170);

        yield return F.Section("거래 구분");
        yield return F.Checks("trd_type", "거래 구분", Catalog.CustomerTradeTypes).Span(2);
        yield return F.Radio("etc_type", "기타임대", Catalog.EtcLeaseTypes).Span(2).When(r => TradeHas(r, "TRDTYP04"));

        yield return F.Section("금액|단위(만원)");
        yield return AR("sale_amt_fr", "sale_amt_to", "매매").Span(2);
        yield return AR("les_amt_fr", "les_amt_to", "전세").Span(2);
        yield return AR("prot_amt_fr", "prot_amt_to", "월세보증금");
        yield return AR("mon_amt_fr", "mon_amt_to", "차임");
        yield return AR("etc_prot_amt_fr", "etc_prot_amt_to", "기타 보증금").When(r => TradeHas(r, "TRDTYP04"));
        yield return AR("etc_mon_amt_fr", "etc_mon_amt_to", "차임").When(r => TradeHas(r, "TRDTYP04"));

        yield return F.Section("실입주 여부");
        yield return F.Check("movein_yn", "", "실입주");
        yield return F.Check("gap_invest_yn", "", "갭투자").When(r => !Is(r, "토지"));
        yield return F.Check("gap_invest_yn", "", "개발예정").When(r => Is(r, "토지"));
        yield return F.Check("invest_yn", "", "투자").When(r => Is(r, "토지"));
        yield return F.Check("irrelevant_yn", "", "무관");

        yield return F.Section("잔금 예정일");
        yield return F.DateRange("move_date_fr", "move_date_to", "잔금 예정일").W(270);

        yield return F.Section("구입물건정보");
        // 주거용
        yield return F.Combo("child_yn", "어린이", Catalog.ChildYn).When(Housing).W(80);
        yield return F.Combo("pet_allow", "반려동물", Catalog.YesNoCond).When(Housing).W(80);
        yield return F.Text("child_cond", "어린이 조건").When(r => Housing(r) && r.Str("child_yn") == "C");
        yield return F.Text("pet_cond", "반려동물 조건").When(r => Housing(r) && r.Str("pet_allow") == "조건부");
        yield return F.Int("room_cnt", "방").When(Housing).W(44);
        yield return F.Int("bath_cnt", "욕실").When(Housing).W(44);
        yield return F.Int("park_cnt", "주차").When(Housing).W(44);
        yield return F.Combo("balc_ext", "발코니", Catalog.Balcony).When(Housing).W(80);
        yield return F.Combo("entr_struct", "현관구조", Catalog.EntranceStructs).When(Housing).W(80);
        yield return F.Combo("building_form", "건물형태", Catalog.BuildingForms).When(Housing).W(80);
        yield return F.Text("community_fac", "커뮤니티").Span(2).When(Housing);
        // 업무용(상가/공장/숙박)
        yield return F.Int("stair_cnt", "계단수", "이상").When(r => Is(r, "업무용"));
        yield return F.Text("elec_capacity", "전기").When(r => Is(r, "업무용")).W(60);
        yield return F.Combo("city_gas_yn", "도시가스", Catalog.NeedOrNot).When(r => Is(r, "업무용")).W(80);
        yield return F.Int("park_cnt", "주차", "대 이상").When(r => Is(r, "업무용"));
        yield return F.Combo("building_use", "건축물용도", Catalog.BuildingUses).When(r => Is(r, "업무용"));
        // 토지
        yield return F.Text("biz_type", "업종 | 사용용도", "과수원(애플망고)").Span(2).When(r => Is(r, "토지"));
        yield return F.Combo("land_category", "지목", Catalog.LandCategories).When(r => Is(r, "토지")).W(90);
        yield return F.Combo("build_permit_pref", "건축허가", Catalog.PermitPref).When(r => Is(r, "토지")).W(80);
        yield return F.Combo("land_use", "용도지역", Catalog.LandUses).When(r => !Housing(r));
        yield return F.Dec("access_road", "도로", "m 이상").When(r => !Housing(r));

        yield return F.Section("희망옵션");
        yield return F.Memo("opt", "희망옵션", 46).Span(2);
        yield return F.Section("메모");
        yield return F.Text("feature_note", "특징 요약").Span(2);
        yield return F.Memo("memo", "메모", 46).Span(2);
    }

    // ================= 오른쪽 카드 =================

    private static Button LinkBtn(string text, Action click)
    {
        var b = new Button
        {
            // 기존 linkBtnStyle: 테두리 없음 · 투명 · 흰 글자 · 12px · 700 · padding 2px
            Content = text, FontSize = 12, FontWeight = FontWeights.Bold, Padding = new Thickness(2), MinHeight = 0, Margin = new Thickness(0),
            Background = Brushes.Transparent, Foreground = Brushes.White, BorderThickness = new Thickness(0),
            HorizontalAlignment = HorizontalAlignment.Center,
        };
        b.Click += (_, _) => click();
        return b;
    }

    private static Border Card(string title, UIElement content, params Button[] buttons)
    {
        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(RowFormBuilder.LabelWidth) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        var lab = new StackPanel { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6) };
        lab.Children.Add(new TextBlock { Text = title, Foreground = Brushes.White, FontWeight = FontWeights.SemiBold, FontSize = 14, TextAlignment = TextAlignment.Center, TextWrapping = TextWrapping.Wrap });
        // 기존 linkGroupBoxStyle: 흰 85% 테두리 · rounded 5 · padding 7px 8px · 위 16px
        var box = new StackPanel();
        foreach (var b in buttons) box.Children.Add(b);
        lab.Children.Add(new Border
        {
            Margin = new Thickness(0, 16, 0, 0), Padding = new Thickness(8, 7, 8, 7), CornerRadius = new CornerRadius(5),
            BorderThickness = new Thickness(1), BorderBrush = new SolidColorBrush(Color.FromArgb(0xD9, 0xFF, 0xFF, 0xFF)),
            HorizontalAlignment = HorizontalAlignment.Center, Child = box,
        });
        g.Children.Add(new Border { Background = Legacy.B("#8B7AD8"), BorderBrush = Legacy.B("#5B4AA8"), BorderThickness = new Thickness(0, 0, 1, 0), Child = lab });
        if (content is FrameworkElement fe) Grid.SetColumn(fe, 1);
        g.Children.Add(content);
        return new Border { BorderBrush = Line, BorderThickness = new Thickness(1), Child = g };
    }

    private FrameworkElement RightCards(Row c)
    {
        var g = new Grid();
        g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(0.6, GridUnitType.Star), MinHeight = 150 });
        g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star), MinHeight = 150 });
        g.RowDefinitions.Add(_partyRow);

        g.Children.Add(Card("구입물건특징", _memos, LinkBtn("날짜입력", () => _memos.AddRow()), LinkBtn("행삭제", _memos.DeleteSelected)));
        var consult = Card("상담내용", _consults, LinkBtn("상담추가", () => _consults.AddRow()), LinkBtn("행삭제", _consults.DeleteSelected));
        consult.Margin = new Thickness(0, -1, 0, 0);
        Grid.SetRow(consult, 1);
        g.Children.Add(consult);

        // 공동중개사 사무소 / 구입자 통합 카드(보라 테두리) — 구입자 탭에 계약당사자 입력
        FrameworkElement Tab(ChildListEditor list, FrameworkElement? extra)
        {
            var dp = new DockPanel();
            var bar = new DockPanel { Background = Legacy.B("#F1F5F9"), Margin = new Thickness(0) };
            var add = new Button { Content = "+ 행추가", Padding = new Thickness(6, 0, 6, 0), MinHeight = 22, Margin = new Thickness(4, 3, 4, 3) };
            add.Click += (_, _) => list.AddRow();
            var del = new Button { Content = "행삭제", Padding = new Thickness(6, 0, 6, 0), MinHeight = 22, Margin = new Thickness(0, 3, 6, 3) };
            del.Click += (_, _) => list.DeleteSelected();
            DockPanel.SetDock(del, Dock.Right);
            DockPanel.SetDock(add, Dock.Right);
            bar.Children.Add(del);
            bar.Children.Add(add);
            if (extra is not null) bar.Children.Add(extra);
            else bar.Children.Add(new Border());
            DockPanel.SetDock(bar, Dock.Top);
            dp.Children.Add(bar);
            dp.Children.Add(list);
            return dp;
        }
        var alias = FormBuilder.MakeTextBox(c, "alias", "계약당사자");
        Placeholder.Set(alias, "계약당사자");
        alias.Width = 240;
        alias.HorizontalAlignment = HorizontalAlignment.Left;
        alias.Margin = new Thickness(6, 3, 0, 3);
        var tabs = new TabControl { Padding = new Thickness(0), BorderThickness = new Thickness(0) };
        tabs.Items.Add(new TabItem { Header = "공동중개사 사무소", Content = Tab(_shares, null) });
        tabs.Items.Add(new TabItem { Header = "구입자", Content = Tab(_buyers, alias) });
        _partyCard = new Border { BorderBrush = Legacy.B("#8B7AD8"), BorderThickness = new Thickness(2), Margin = new Thickness(0, 4, 0, 0), Child = tabs };
        Grid.SetRow(_partyCard, 2);
        g.Children.Add(_partyCard);
        return g;
    }

    /// <summary>공동중개사 사무소/구입자 카드와 그 줄(높이 168) — 상담모드 ON이면 숨김·0</summary>
    private Border _partyCard = null!;
    private readonly RowDefinition _partyRow = new() { Height = new GridLength(168) };

    /// <summary>입력초기화 — 신규 폼에서 구입물건유형만 남기고 비운다</summary>
    private void ResetInput()
    {
        if (!Dialogs.Confirm("입력한 내용을 모두 지우고 처음 상태로 되돌립니다.\n(구입물건유형은 유지)")) return;
        var c = _d.Cust;
        var want = c.Str("want_type");
        var fresh = _svc.New();
        foreach (var k in c.Keys.ToList()) if (!fresh.Cust.ContainsKey(k)) c[k] = null;
        foreach (var kv in fresh.Cust) c[kv.Key] = kv.Value;
        c["want_type"] = want;
        _areas.Clear();
        RenderAreas();
        _buyers.Load(fresh.Buyers);
        _shares.Load(fresh.Shares);
        _memos.Load(Array.Empty<Row>());
        _consults.Load(Array.Empty<Row>());
    }

    protected override bool IsNew => _d.IsNew;

    protected override async Task SaveAsync()
    {
        foreach (var e in new[] { _memos, _consults, _buyers, _shares }) e.Commit();
        Replace(_d.Areas, _areas);
        Replace(_d.Memos, _memos.Items);
        Replace(_d.Consults, _consults.Items);
        Replace(_d.Buyers, _buyers.Items);
        Replace(_d.Shares, _shares.Items);
        await _svc.SaveAsync(_d);
    }

    private static void Replace(List<Row> target, IEnumerable<Row> src)
    {
        var copy = src.ToList();
        target.Clear();
        target.AddRange(copy);
    }

    protected override Task DeleteAsync() => _svc.DeleteAsync(_d.CustNo!.Value);
    protected override string DeleteConfirm => "고객을 삭제하시겠습니까?\n희망지역·구입자·메모도 함께 삭제됩니다(삭제 이력은 남습니다).";
}

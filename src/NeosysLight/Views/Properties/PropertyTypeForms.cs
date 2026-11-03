using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Data;
using static Neosys.Local.App.Views.Properties.LF;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 물건 등록창 왼쪽 메인 폼 — 기존 PropertyFormPageV2 왼쪽 열 그대로:
///   물건명 행(renderPtNameRow) + 유형별 폼(propertyForm/*.jsx) + 옵션 행.
///   유형별 폼은 기존 파일 하나당 메서드 하나(ApartmentForm → Apartment …), 고르는 순서도 기존과 같다.
/// </summary>
internal static class PropertyTypeForms
{
    /// <param name="OpenLease">임대차현황서(단독·다가구 세부유형, 건물)</param>
    /// <param name="OpenParcels">필지목록(토지 소재지 바)</param>
    public sealed record Ctx(Row P, bool IsNew, PropertyFormState State, Window? Owner, Action OpenLease, Action OpenParcels, Func<int> ParcelCount);

    // ---- 유형 판단(기존 *_FORM_CODES, isXxxForm) ----
    private static string T(Row p) => p.Str("pt_type") ?? "";
    public static bool IsSalesRight(Row p) => Catalog.SalesRightCodes.Contains(T(p));
    public static bool IsApartment(Row p) => Catalog.ApartmentFormCodes.Contains(T(p)) && !IsSalesRight(p);
    public static bool IsRedev(Row p) => Catalog.RedevCodes.Contains(T(p));
    public static bool IsRedevBunyang(Row p) => IsRedev(p) && p.Str("sub_type") == "분양권";
    public static bool IsRedevJipju(Row p) => IsRedev(p) && !IsRedevBunyang(p);
    public static bool IsCommercial(Row p) => Catalog.CommercialOfficeCodes.Contains(T(p));
    public static bool IsBuilding(Row p) => T(p) == "SYCA108";
    public static bool IsHouse(Row p) => T(p) == "SYCA119";
    public static bool IsLodging(Row p) => T(p) == "SYCA110";
    public static bool IsFactory(Row p) => T(p) == "SYCA111";
    public static bool IsKnowledge(Row p) => T(p) == Catalog.KnowledgeCode;
    public static bool IsBilla(Row p) => T(p) == "SYCA118";
    public static bool IsOneRoom(Row p) => T(p) == "SYCA117";
    public static bool IsLand(Row p) => T(p) == Catalog.LandCode;
    /// <summary>기존 isAptRelated — 물건명 바가 단지 선택(DanjiSelector)인 유형</summary>
    private static bool AptRelated(Row p) => IsRedevJipju(p) || IsSalesRight(p) || IsRedevBunyang(p) || IsApartment(p);
    private static bool ShowFloorPair(Row p) => !IsLand(p) && !IsBuilding(p) && !IsLodging(p) && !IsFactory(p);

    /// <summary>왼쪽 열 전체(물건명 행 + 유형별 폼 + 옵션). 옮길 폼이 없는 유형(기타)은 fallback(기존 일반 폼)</summary>
    public static FrameworkElement Build(Ctx c, Func<FrameworkElement> fallback)
    {
        var p = c.P;
        if (c.IsNew) p["child_yn"] ??= "N";   // 기존 초기값 childYn 'N'(불가능)
        FrameworkElement? form =
            IsRedevJipju(p) ? Redevelopment(c)
            : IsSalesRight(p) || IsRedevBunyang(p) ? SalesRight(c)
            : IsApartment(p) ? Apartment(c)
            : IsCommercial(p) ? Commercial(c)
            : IsBuilding(p) ? Building(c)
            : IsHouse(p) ? House(c)
            : IsLodging(p) ? Lodging(c)
            : IsFactory(p) ? Factory(c)
            : IsKnowledge(p) ? Knowledge(c)
            : IsBilla(p) ? Billa(c)
            : IsOneRoom(p) ? OneRoom(c)
            : IsLand(p) ? Land(c)
            : null;
        if (form is null) return fallback();
        var col = new StackPanel();
        col.Children.Add(PtNameRow(c));
        col.Children.Add(new Border { BorderBrush = Line, BorderThickness = new Thickness(1), Child = form });
        col.Children.Add(OptionRow(c));
        return col;
    }

    // ================= 소재지 바(노란 줄) =================

    /// <summary>기존 renderAddressBar('location') — 수정 화면은 글자(PropertyEditWindow가 처리)</summary>
    public static FrameworkElement LocationBar(Ctx c)
    {
        var p = c.P;
        var sp = new WrapPanel { VerticalAlignment = VerticalAlignment.Center };
        var addr = new AddressSelector(p, c.State);
        addr.Margin = new Thickness(0, 0, 4, 0);
        sp.Children.Add(addr);
        var jibun = BarInput(p, "jibun", "지번", 55);
        sp.Children.Add(jibun);
        if (IsLodging(p) || IsFactory(p))
        {
            // FacilityAddressBar: 상세주소(자유 입력 1칸, 최소 180)
            var d = BarInput(p, "addr_detail", "상세주소", 180);
            sp.Children.Add(d);
        }
        if (IsLand(p))
        {
            // LandAddressBar: 지번에서 Enter → 필지 추가, 오른쪽 [필지목록(n)]
            var btn = OutlineButton($"필지목록({c.ParcelCount()})", c.OpenParcels, new Thickness(10, 4, 10, 4));
            btn.Click += (_, _) => btn.Content = $"필지목록({c.ParcelCount()})";
            sp.Children.Add(btn);
        }
        return sp;
    }

    /// <summary>주소바 글자 칸(padding 4px 6px · 13px · 높이 26)</summary>
    private static TextBox BarInput(Row p, string key, string placeholder, double width)
    {
        var tb = Txt(p, key, width, placeholder, height: 26);
        tb.Padding = new Thickness(6, 0, 6, 0);
        tb.Margin = new Thickness(0, 0, 8, 0);
        return tb;
    }

    /// <summary>임대차현황서·필지목록 버튼(흰 바탕 · 인디고 글자/테두리 · 13px·600)</summary>
    private static Button OutlineButton(string text, Action click, Thickness padding)
    {
        var b = new Button
        {
            Content = text, FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#4F46E5"), BorderBrush = Legacy.B("#6366F1"),
            Background = System.Windows.Media.Brushes.White, Padding = padding, MinHeight = 0, VerticalAlignment = VerticalAlignment.Center,
        };
        b.Click += (_, _) => click();
        return b;
    }

    // ================= 공통 행 =================

    /// <summary>물건명 행 — 신규는 유형별 주소바 name 파트 + 해당층/총층, 수정은 글자(단지/건물명 동 호 층/총층)</summary>
    private static FrameworkElement PtNameRow(Ctx c)
    {
        var p = c.P;
        FrameworkElement content;
        if (!c.IsNew)
        {
            var parts = new List<string?>
            {
                string.Join(" ", new[] { p.Str("addr4"), p.Str("addr5") }.Where(s => !string.IsNullOrEmpty(s))),
                p.Has("dong") ? $"{p.Str("dong")}동" : null,
                p.Has("ho") ? $"{p.Str("ho")}호" : null,
                ShowFloorPair(p) && p.Has("floor1") ? $"{p.Str("floor1")}층" : null,
                ShowFloorPair(p) && p.Has("floor2") ? $"/ {p.Str("floor2")}층" : null,
            };
            var text = string.Join(" ", parts.Where(s => !string.IsNullOrEmpty(s)));
            content = Label(text.Length > 0 ? text : "-");
        }
        else
        {
            var flow = Flow(NameBar(c));
            if (ShowFloorPair(p))
            {
                foreach (var (key, label) in new[] { ("floor1", "해당층"), ("floor2", "총층") })
                {
                    var box = Num(p, key, 40);
                    Placeholder.Set(box, label);
                    var pair = Pair(label, box);
                    pair.Margin = new Thickness(0, 0, 8, 0);
                    flow.Children.Add(pair);
                }
            }
            content = flow;
        }
        var row = Section("물건명", null, content);
        row.BorderThickness = new Thickness(1, 1, 1, 0);   // 기존: 테두리 1px, 아래는 폼 테두리와 이어짐
        return row;
    }

    /// <summary>유형별 주소바의 name 파트(기존 renderAddressBar('name'))</summary>
    private static FrameworkElement NameBar(Ctx c)
    {
        var p = c.P;
        if (AptRelated(p)) return new DanjiSelector(p, c.State);
        if (IsLand(p))
        {
            var name = BarInput(p, "addr5", "물건명 (예: OO농장, 도로변 토지 등)", 280);
            return name;
        }
        if (IsLodging(p) || IsFactory(p)) return BarInput(p, "addr5", "건물명", 160);
        var wp = new WrapPanel { VerticalAlignment = VerticalAlignment.Center };
        wp.Children.Add(BarInput(p, "addr5", "건물명 (예: OO빌딩)", 160));
        if (IsBuilding(p))
        {
            // BuildingAddressBar: 지하 / 지상 층수
            foreach (var (key, label) in new[] { ("basement_floor", "지하"), ("ground_floor", "지상") })
            {
                var pair = Pair(label, Num(p, key, 52), "층");
                pair.Margin = new Thickness(0, 0, 8, 0);
                wp.Children.Add(pair);
            }
            return wp;
        }
        // DefaultAddressBar: 동 / 호(48)
        wp.Children.Add(BarInput(p, "dong", "동", 48));
        wp.Children.Add(BarInput(p, "ho", "호", 48));
        return wp;
    }

    /// <summary>옵션 행 — 라벨 클릭하면 옵션 선택창, 입력은 항상 직접입력 가능</summary>
    private static FrameworkElement OptionRow(Ctx c)
    {
        var p = c.P;
        var box = Area(p, "opt", "옵션 직접 입력 (또는 좌측 '옵션' 라벨 클릭하여 선택)", 40);
        var row = Section("옵션", "선택 ▾", box, labelClick: () =>
        {
            var r = OptionPicker.Pick(c.Owner, p.Str("opt"));
            if (r is not null) p["opt"] = r.Length > 0 ? r : null;
        }, minHeight: 56);
        row.BorderThickness = new Thickness(1, 0, 1, 1);
        return row;
    }

    // ================= 행 부품 =================

    private static readonly Opt[] AptTypes = new[] { "59A", "59B", "59C", "74A", "74B", "84A", "84B", "84C", "99A", "99B", "114A", "114B", "129A", "129B", "144A", "144B", "159A", "174A", "194A" }.Select(v => new Opt(v, v)).ToArray();
    private static readonly string[] HeatMethods = { "개별난방", "중앙난방", "지역난방" };
    private static readonly string[] HeatFuels = { "도시가스", "기름", "전기", "심야전기" };
    private static readonly string[] EntrStructs = { "계단식", "복도식", "복합식" };
    private static readonly string[] BuildingStructs = { "철근콘크리트", "철골", "벽돌", "목조", "기타" };
    private static readonly string[] BuildingForms = { "판상형", "타워형" };
    private static readonly Opt[] Balconies = { new("Y", "확장"), new("N", "미확장") };
    private static readonly string[] Directions = { "남향", "동향", "서향", "북향", "남동향", "남서향", "북동향", "북서향" };
    private static readonly string[] DirBases = { "거실기준", "안방기준", "주된출입구" };

    private static string AreaUnit(Row p) => p.Str("area_unit") ?? "㎡";

    /// <summary>면적 라벨의 ⇄㎡/평 버튼 — 단위를 바꾸며 면적 값도 환산(1평=3.305785㎡)</summary>
    private static void AreaToggle(UIElement head, Row p)
    {
        var t = new TextBlock { FontSize = 10, FontWeight = FontWeights.Bold, Foreground = PurpleLine, VerticalAlignment = VerticalAlignment.Center };
        var b = new Border
        {
            Child = t, Padding = new Thickness(4, 0, 4, 0), Margin = new Thickness(4, 0, 0, 0), CornerRadius = new CornerRadius(10),
            BorderBrush = Legacy.B("#A78BFA"), BorderThickness = new Thickness(1), Background = Legacy.B("#EDE9FE"), Cursor = Cursors.Hand, ToolTip = "평 / ㎡ 전환 (값도 함께 환산)", VerticalAlignment = VerticalAlignment.Center,
        };
        OnChange(b, p, () => t.Text = "⇄" + AreaUnit(p), "area_unit");
        b.MouseLeftButtonUp += (_, _) =>
        {
            var toPyeong = AreaUnit(p) == "㎡";
            var factor = toPyeong ? 0.302500 : 3.305785;
            foreach (var k in new[] { "sup_area", "exc_area", "land_share", "building_area", "gross_area" })
                if (double.TryParse(p.Str(k), NumberStyles.Float, CultureInfo.InvariantCulture, out var v)) p[k] = Math.Round(v * factor * 100) / 100;
            p["area_unit"] = toPyeong ? "평" : "㎡";
        };
        ((Panel)head).Children.Add(b);
    }

    /// <summary>면적 칸(공급/전용/대지 …) + 단위(㎡/평, 회색)</summary>
    private static FrameworkElement AreaPair(Row p, string label, string key)
    {
        var u = Unit(AreaUnit(p), gray: true);
        var sp = Pair(label, Amt(p, key, 52, decimalValue: true));
        u.Margin = new Thickness(4, 0, 0, 0);
        sp.Children.Add(u);
        OnChange(u, p, () => u.Text = AreaUnit(p), "area_unit");
        return sp;
    }

    private static FrameworkElement AreaRow(Row p, params UIElement?[] items) => Section("면적", null, Flow(items), labelExtra: h => AreaToggle(h, p));

    /// <summary>타입 — 단지 타입 목록이 있으면 그 목록(고르면 타입·공급·전용면적 채움), 없으면 고정 목록(재개발·재건축은 글자 칸)</summary>
    private static FrameworkElement TypeSelect(Ctx c, bool textWhenEmpty = false)
    {
        var p = c.P;
        var holder = new ContentControl { VerticalAlignment = VerticalAlignment.Center };
        void Render()
        {
            var areas = c.State.AreaList;
            if (areas.Count == 0)
            {
                holder.Content = textWhenEmpty ? Pair("타입", Txt(p, "apt_typ", 72, "타입")) : Pair("타입", Sel(p, "apt_typ", 72, AptTypes, "타입"));
                return;
            }
            var cb = new ComboBox { Style = (Style)Application.Current.FindResource("FormSelect"), Width = 72, DisplayMemberPath = nameof(Opt.Label), SelectedValuePath = nameof(Opt.Value) };
            var items = new List<Opt> { new("", "타입") };
            items.AddRange(areas.Select(a => new Opt(Convert.ToString(a["ptp_no"], CultureInfo.InvariantCulture) ?? "", $"{a.Str("plan_type_name")} ({a.Str("excls_spc")}㎡)")));
            cb.ItemsSource = items;
            var cur = areas.FirstOrDefault(a => a.Str("plan_type_name") == p.Str("apt_typ"));
            cb.SelectedValue = cur is null ? "" : Convert.ToString(cur["ptp_no"], CultureInfo.InvariantCulture);
            cb.SelectionChanged += (_, _) =>
            {
                var a = areas.FirstOrDefault(x => Convert.ToString(x["ptp_no"], CultureInfo.InvariantCulture) == cb.SelectedValue as string);
                p["apt_typ"] = a?.Str("plan_type_name");
                p["sup_area"] = a is not null && double.TryParse(a.Str("sply_spc"), NumberStyles.Float, CultureInfo.InvariantCulture, out var s) ? Math.Round(s, 2) : null;
                p["exc_area"] = a is not null && double.TryParse(a.Str("excls_spc"), NumberStyles.Float, CultureInfo.InvariantCulture, out var e) ? Math.Round(e, 2) : null;
                // 방/욕실도 타입(면적) 목록 기준 자동입력(기존 DanjiSelector, 2026-10-28)
                if (a?.Long("room_cnt") is { } room) p["room_cnt"] = room;
                if (a?.Long("bathroom_cnt") is { } bath) p["bath_cnt"] = bath;
            };
            holder.Content = Pair("타입", FormBuilder.Id(cb, "apt_typ"));
        }
        Render();
        c.State.AreaListChanged += Render;
        holder.Unloaded += (_, _) => c.State.AreaListChanged -= Render;
        holder.Loaded += (_, _) => { c.State.AreaListChanged -= Render; c.State.AreaListChanged += Render; };
        return holder;
    }

    /// <summary>거래구분 행(기존 TradeDivisionSelector) — 구분별 상태 + 기타임대 활성 시 기타임대유형(하나만)</summary>
    private static FrameworkElement TradeRow(Row p, string[]? onlyKeys = null)
    {
        var editor = new SaleDivEditor(p, onlyKeys: onlyKeys);
        var etc = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        etc.Children.Add(new TextBlock { Text = "기타임대유형", FontSize = 13, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#111827"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 10, 0) });
        foreach (var t in Catalog.EtcLeaseTypes)
        {
            var cb = new CheckBox { Content = t.Label, FontSize = 13, Margin = new Thickness(0, 0, 10, 0), VerticalContentAlignment = VerticalAlignment.Center };
            void Sync() => cb.IsChecked = (p.Str("etc_lease_type") ?? "").Split(',').Contains(t.Value);
            Sync();
            cb.Click += (_, _) => p["etc_lease_type"] = cb.IsChecked == true ? t.Value : null;   // 단일선택
            Watch(cb, p, "etc_lease_type", Sync);
            etc.Children.Add(cb);
        }
        var etcBox = new Border { Background = Legacy.B("#F5F3FF"), BorderBrush = Legacy.B("#DDD6FE"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(4), Padding = new Thickness(8, 2, 8, 2), Child = etc, VerticalAlignment = VerticalAlignment.Center };
        var flow = Flow(12, editor, etcBox);
        OnChange(etcBox, p, () =>
        {
            var on = SaleDivEditor.Has(p, "SALEDIV04");
            etcBox.Visibility = on ? Visibility.Visible : Visibility.Collapsed;
            if (!on && p.Has("etc_lease_type")) p["etc_lease_type"] = null;
        }, "sale_div");
        return Section("거래구분", null, flow);
    }

    /// <summary>금액 표(기존 456px: 매매·전세·월세(보증금/차임)·기타임대(보증금/차임))</summary>
    private static FrameworkElement AmountTable(Row p)
    {
        var th = Legacy.B("#C9D6EA");
        var g = new Grid { Width = 456, HorizontalAlignment = HorizontalAlignment.Left };
        for (var i = 0; i < 6; i++) g.ColumnDefinitions.Add(new ColumnDefinition());
        g.RowDefinitions.Add(new RowDefinition());
        g.RowDefinitions.Add(new RowDefinition());
        var etcHead = new TextBlock { FontWeight = FontWeights.Bold, FontSize = 13, Foreground = Legacy.B("#1E293B"), HorizontalAlignment = HorizontalAlignment.Center };
        OnChange(etcHead, p, () => etcHead.Text = "기타임대" + ((p.Str("etc_lease_type") ?? "").Split(',').FirstOrDefault(s => s.Length > 0) is { } t ? $"({t})" : ""), "etc_lease_type");
        void Head(int col, int span, UIElement content)
        {
            var b = new Border { Background = th, BorderBrush = Legacy.B("#94A3B8"), BorderThickness = new Thickness(0, 0, 1.5, 1), Padding = new Thickness(4, 7, 4, 7), Child = content };
            Grid.SetColumn(b, col);
            Grid.SetColumnSpan(b, span);
            g.Children.Add(b);
        }
        TextBlock H(string s) => new() { Text = s, FontWeight = FontWeights.Bold, FontSize = 13, Foreground = Legacy.B("#1E293B"), HorizontalAlignment = HorizontalAlignment.Center };
        Head(0, 1, H("매매금액"));
        Head(1, 1, H("전세금액"));
        Head(2, 2, H("월세금액"));
        Head(4, 2, etcHead);
        void Cell(int col, string key, string ph, bool light)
        {
            var b = new Border
            {
                Background = Legacy.B("#F8FAFC"), BorderBrush = Legacy.B(light ? "#E5E7EB" : "#B6C0CF"), BorderThickness = new Thickness(0, 0, light ? 1 : 1.5, 0), Padding = new Thickness(4),
                Child = Amt(p, key, -1, ph, border: false),
            };
            Grid.SetRow(b, 1);
            Grid.SetColumn(b, col);
            g.Children.Add(b);
        }
        Cell(0, "sale_amt", "", false);
        Cell(1, "les_amt", "", false);
        Cell(2, "prot_amt", "보증금", true);
        Cell(3, "mon_amt", "차임", false);
        Cell(4, "etc_amt", "보증금", true);
        Cell(5, "etc_amt2", "차임", false);
        return new Border { BorderBrush = Legacy.B("#94A3B8"), BorderThickness = new Thickness(2), HorizontalAlignment = HorizontalAlignment.Left, Child = g };
    }

    /// <summary>금액 행(주거): [앞 줄들] + 표 + 대출금액(만)·관리비(원)·관리비내역</summary>
    private static FrameworkElement AmountResidential(Row p, double subTop, params UIElement[] before) => Section("금액", "단위(만원)\n관리비(원)", Lines(
        before.Concat(new UIElement[]
        {
            AmountTable(p),
            Fill(8, PairFill("관리비내역", Txt(p, "maint_dtl", -1, "관리규약에 따라 부과")),
                Pair("대출금액", Amt(p, "loan_amt", 55), "만"),
                Pair("관리비", Amt(p, "maint_cost", 55), "원")),
        }).ToArray()), subTop: subTop);

    /// <summary>금액 행(상가류): 표 + 권리금·시설비·관리비(만)·관리비내역</summary>
    private static FrameworkElement AmountBiz(Row p) => Section("금액", "단위(만원)", Lines(
        AmountTable(p),
        Fill(8, PairFill("관리비내역", Txt(p, "maint_dtl", -1, "관리규약에 따라 부과")),
            Pair("권리금", Amt(p, "lay_amt", 55), "만"),
            Pair("시설비", Amt(p, "facility_cost", 55), "만"),
            Pair("관리비", Amt(p, "maint_cost", 55), "만"))), subTop: 8);

    private static FrameworkElement NowFirstLine(Row p) => Flow(
        Pair("현상태", Sel(p, "current_status", 84, "주인거주", "전세", "공실", "월세", "기타임대")),
        Pair("보증금", Amt(p, "now_dep_amt", 55), "만"),
        Pair("월차임", Amt(p, "now_mon_amt", 55), "만"));

    /// <summary>현상황(주거): 현상태·보증금·월차임 / 주택임대사업자·계약갱신청구권 (+ 아래 줄)</summary>
    private static FrameworkElement NowResidential(Row p, double subTop, UIElement? extra = null) => Section("현상황", "단위(만원)", Lines(
        NowFirstLine(p),
        Flow(Pair("주택임대사업자", Sel(p, "house_rental", 84, "등록", "미등록", "예정")),
            Pair("계약갱신청구권", Sel(p, "contract_renewal_right", 84, "사용", "미사용"))),
        extra), subTop: subTop);

    /// <summary>현상황(상가류): 현상태·보증금·월차임 / 사업체명·업종(150)</summary>
    private static FrameworkElement NowBiz(Row p, string namePh, string typePh) => Section("현상황", "단위(만원)", Lines(
        NowFirstLine(p),
        Flow(Pair("사업체명", Txt(p, "business_name", 150, namePh)), Pair("업종", Txt(p, "business_type", 150, typePh)))), subTop: 8);

    /// <summary>추천업종 — 바로 입력창(최대 400)</summary>
    private static FrameworkElement Recommend(Row p, string placeholder)
    {
        var tb = Txt(p, "recommended_business", 400, placeholder);   // width 100% · max 400 (왼쪽 열에서는 400)
        tb.HorizontalAlignment = HorizontalAlignment.Left;
        return Section("추천업종", null, tb);
    }

    private static FrameworkElement Restrictions(Row p) => Section("제한사항", null, Lines(
        Flow(14, Chk(p, "zone_adjust", "청약조정대상지역"), Chk(p, "zone_overheat", "투기과열지구"), Chk(p, "zone_spec", "투기지역"), Chk(p, "zone_land_permit", "토지거래허가구역")),
        Fill(12, Txt(p, "child_cond", -1, "조건부 내용"),
            Pair("어린이", Sel(p, "child_yn", 84, new[] { new Opt("Y", "가능"), new Opt("N", "불가능"), new Opt("C", "조건부") }, emptyLabel: null)),
            Pair("반려동물", Sel(p, "pet_allow", 84, "가능", "불가능", "조건부")))));

    private static FrameworkElement Schedule(Row p) => Section("일정", null, Flow(
        Pair("만기일", Date(p, "mtry_date")), Pair("이사예정일", Date(p, "expt_mov_date")), Pair("잔금예정일", Date(p, "expt_date"))));

    // ---- 상세정보 칸 ----
    private static FrameworkElement HouseCnt(Row p) => Pair("세대수", Num(p, "house_cnt", 45));
    private static FrameworkElement PkCnt(Row p) => Pair("총 주차대수", Num(p, "pk_cnt", 45, decimalValue: true));
    private static FrameworkElement CompYear(Row p) => Pair("준공년도", Date(p, "comp_year", ymd8: true));
    private static FrameworkElement EvCnt(Row p) => Pair("전기차충전대수", Num(p, "ev_charger_cnt", 48));
    private static FrameworkElement RoomCnt(Row p) => Pair("방 수", Num(p, "room_cnt", 30));
    private static FrameworkElement BathCnt(Row p) => Pair("욕실 수", Num(p, "bath_cnt", 30));
    private static FrameworkElement HeatMethod(Row p) => Pair("난방방식", Sel(p, "heat_method", 72, HeatMethods));
    private static FrameworkElement HeatFuel(Row p) => Pair("난방연료", Sel(p, "heat_fuel", 72, HeatFuels));
    private static FrameworkElement Entr(Row p) => Pair("현관구조", Sel(p, "entr_struct", 72, EntrStructs));
    private static FrameworkElement BuildingForm(Row p) => Pair("건물형태", Sel(p, "building_form", 72, BuildingForms));
    private static FrameworkElement Balcony(Row p) => Pair("발코니", Sel(p, "balc_ext", 75, Balconies));
    private static FrameworkElement Direction(Row p) => Pair("방향", Sel(p, "dir_std", 75, Directions));
    private static FrameworkElement DirBase(Row p) => Pair("방향기준", Sel(p, "dir_base", 84, DirBases));
    private static FrameworkElement Elevator(Row p) => Pair("승강기수", Num(p, "elevator_cnt", 30));
    private static FrameworkElement Stairs(Row p) => Pair("계단수", Num(p, "stairs_cnt", 30));
    private static FrameworkElement BuidStruct(Row p) => Pair("건물구조", Sel(p, "buid_struct", 84, BuildingStructs));

    private static FrameworkElement Community(Row p)
    {
        var tb = Txt(p, "community_facility", -1, "예: 헬스장, 골프연습장, 게스트하우스 등");
        tb.MinWidth = 260;
        tb.MaxWidth = 520;
        return Fill(4, tb, Label("커뮤니티시설"));
    }

    /// <summary>건축물용도·지목·용도지역 줄 — topLine이면 위 선 + 여백 8(아파트 계열·공장), 아니면 위 여백 8만</summary>
    private static FrameworkElement UseLine(Row p, bool topLine, double useWidth = 130, string useLabel = "건축물용도", string useKey = "building_use", IEnumerable<Opt>? useOptions = null)
    {
        var flow = Flow(Pair(useLabel, Sel(p, useKey, useWidth, useOptions ?? Catalog.BuildingUses)), Pair("지목", Sel(p, "land_category", 88, Catalog.LandCategories)),
            Pair("용도지역", Sel(p, "land_use", useWidth, Catalog.LandUses)));
        return topLine
            ? new Border { BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 0), Padding = new Thickness(0, 8, 0, 0), Margin = new Thickness(0, 2, 0, 0), Child = flow }
            : new Border { Margin = new Thickness(0, 2, 0, 0), Child = flow };
    }

    private static FrameworkElement Detail(params UIElement?[] lines) => Section("상세정보", null, Lines(lines));

    private static StackPanel Stack(params UIElement[] rows)
    {
        var sp = new StackPanel();
        foreach (var r in rows) sp.Children.Add(r);
        return sp;
    }

    // ================= 유형별 폼 =================

    /// <summary>단지형(아파트·오피스텔·주상복합 …) — 기존 ApartmentForm.jsx</summary>
    private static FrameworkElement Apartment(Ctx c)
    {
        var p = c.P;
        var t = T(p);
        var isDanjiType = new[] { "SYCA101", "SYCA102", "SYCA103", "SYCA105", "SYCA106", "SYCA107" }.Contains(t);
        var showBuildingUse = t != "SYCA115" && !new[] { "SYCA101", "SYCA102", "SYCA105", "SYCA106", "SYCA107", "SYCA104", "SYCA120" }.Contains(t);
        return Stack(
            AreaRow(p, isDanjiType ? TypeSelect(c) : null, AreaPair(p, "공급면적", "sup_area"), AreaPair(p, "전용면적", "exc_area"), !isDanjiType ? AreaPair(p, "대지면적", "land_share") : null),
            TradeRow(p),
            AmountResidential(p, 0),
            NowResidential(p, 0),
            Schedule(p),
            Restrictions(p),
            Detail(
                Flow(HouseCnt(p), PkCnt(p), CompYear(p), EvCnt(p)),
                Flow(HeatMethod(p), HeatFuel(p), Entr(p), BuildingForm(p)),
                Flow(Balcony(p), Direction(p), DirBase(p), RoomCnt(p), BathCnt(p)),
                Community(p),
                showBuildingUse ? UseLine(p, true) : null));
    }

    /// <summary>분양권(아파트/오피스텔 분양권 · 재개발·재건축 분양권) — 기존 SalesRightForm.jsx</summary>
    private static FrameworkElement SalesRight(Ctx c)
    {
        var p = c.P;
        var t = T(p);
        var isDanjiType = new[] { "SYCA101", "SYCA102", "SYCA103", "SYCA105", "SYCA106", "SYCA107" }.Contains(t);
        var showBuildingUse = t != "SYCA115" && !new[] { "SYCA101", "SYCA102", "SYCA105", "SYCA106", "SYCA107", "SYCA104", "SYCA120" }.Contains(t);
        var presale = Flow(12, Pair("분양금액", Amt(p, "presale_amt", 55), "만"), Pair("확장금액", Amt(p, "expansion_amt", 55), "만"),
            Pair("옵션금액", Amt(p, "option_amt", 55), "만"), Pair("프리미엄", Amt(p, "premium_amt", 55), "만"));
        presale.Margin = new Thickness(0, 0, 0, 2);
        return Stack(
            AreaRow(p, isDanjiType ? TypeSelect(c) : null, AreaPair(p, "공급면적", "sup_area"), AreaPair(p, "전용면적", "exc_area"), !isDanjiType ? AreaPair(p, "대지면적", "land_share") : null),
            TradeRow(p),
            AmountResidential(p, 8, presale),
            NowResidential(p, 8),
            Schedule(p),
            Restrictions(p),
            Detail(
                Flow(HouseCnt(p), PkCnt(p), EvCnt(p), CompYear(p)),
                Flow(HeatMethod(p), HeatFuel(p), Entr(p), BuildingForm(p)),
                Flow(Balcony(p), Direction(p), DirBase(p), RoomCnt(p), BathCnt(p)),
                Community(p),
                showBuildingUse ? UseLine(p, true) : null));
    }

    /// <summary>재개발·재건축 입주권 — 기존 RedevelopmentForm.jsx(종전면적은 위 회색 줄로 이동, 건축물용도 줄 없음)</summary>
    private static FrameworkElement Redevelopment(Ctx c)
    {
        var p = c.P;
        var pre1 = Flow(12, Pair("분양금액", Amt(p, "presale_amt", 55), "만"), Pair("확장금액", Amt(p, "expansion_amt", 55), "만"),
            Pair("옵션금액", Amt(p, "option_amt", 55), "만"), Pair("추가분담금", Amt(p, "add_contrib_amt", 55), "만"));
        var pre2 = Flow(12, Pair("프리미엄", Amt(p, "premium_amt", 55), "만"), Pair("권리가액", Amt(p, "right_value_amt", 55), "만"), Pair("이주비", Amt(p, "moving_cost", 55), "만"));
        var pre = Lines(pre1, pre2);
        pre.Margin = new Thickness(0, 0, 0, 2);
        return Stack(
            AreaRow(p, TypeSelect(c, textWhenEmpty: true), AreaPair(p, "공급면적", "sup_area"), AreaPair(p, "전용면적", "exc_area"), AreaPair(p, "대지지분", "land_share")),
            TradeRow(p),
            AmountResidential(p, 8, pre),
            NowResidential(p, 8),
            Schedule(p),
            Restrictions(p),
            Detail(
                Flow(HouseCnt(p), PkCnt(p), EvCnt(p), CompYear(p)),
                Flow(HeatMethod(p), HeatFuel(p), Entr(p), BuildingForm(p)),
                Flow(Balcony(p), Direction(p), DirBase(p), RoomCnt(p), BathCnt(p)),
                Community(p)));
    }

    /// <summary>빌라·연립 — 기존 BillaForm.jsx</summary>
    private static FrameworkElement Billa(Ctx c) => ResidentialSmall(c, AreaPair(c.P, "공급면적", "sup_area"), AreaPair(c.P, "전용면적", "exc_area"), AreaPair(c.P, "대지지분", "land_share"));

    /// <summary>원투룸 — 기존 OneRoomForm.jsx(빌라와 같고 대지지분 없음)</summary>
    private static FrameworkElement OneRoom(Ctx c) => ResidentialSmall(c, AreaPair(c.P, "공급면적", "sup_area"), AreaPair(c.P, "전용면적", "exc_area"));

    /// <summary>단독·다가구 — 기존 HouseForm.jsx(대지·건축·연면적, 다가구주택/상가주택이면 임대차현황서 버튼)</summary>
    private static FrameworkElement House(Ctx c)
    {
        var p = c.P;
        var lease = OutlineButton("임대차현황서", c.OpenLease, new Thickness(12, 5, 12, 5));
        lease.HorizontalAlignment = HorizontalAlignment.Left;
        var leaseLine = new Border { Margin = new Thickness(0, 2, 0, 0), Child = lease };
        OnChange(leaseLine, p, () => leaseLine.Visibility = p.Str("sub_type") is "다가구주택" or "상가주택" ? Visibility.Visible : Visibility.Collapsed, "sub_type");
        return ResidentialSmall(c, new[] { AreaPair(p, "대지면적", "land_share"), AreaPair(p, "건축면적", "building_area"), AreaPair(p, "연면적", "gross_area") }, leaseLine);
    }

    private static FrameworkElement ResidentialSmall(Ctx c, params FrameworkElement[] areas) => ResidentialSmall(c, areas, null);

    /// <summary>빌라·원투룸·단독 공통(BillaForm 복사본들)</summary>
    private static FrameworkElement ResidentialSmall(Ctx c, FrameworkElement[] areas, UIElement? nowExtra)
    {
        var p = c.P;
        return Stack(
            AreaRow(p, areas),
            TradeRow(p),
            AmountResidential(p, 8),
            NowResidential(p, 8, nowExtra),
            Schedule(p),
            Restrictions(p),
            Detail(
                Flow(HouseCnt(p), PkCnt(p), CompYear(p), RoomCnt(p), BathCnt(p)),
                Flow(HeatMethod(p), HeatFuel(p), Entr(p), BuildingForm(p)),
                Flow(Balcony(p), Direction(p), DirBase(p)),
                UseLine(p, false)));
    }

    /// <summary>상가·사무실 — 기존 CommercialForm.jsx(제한사항 없음, 추천업종 행)</summary>
    private static FrameworkElement Commercial(Ctx c)
    {
        var p = c.P;
        return Stack(
            AreaRow(p, AreaPair(p, "공급면적", "sup_area"), AreaPair(p, "전용면적", "exc_area"), AreaPair(p, "대지면적", "land_share"), AreaPair(p, "연면적", "gross_area")),
            TradeRow(p),
            AmountBiz(p),
            NowBiz(p, "예: 맛있는식당", "예: 음식점업"),
            Recommend(p, "예: 카페, 편의점, 학원 등 추천 업종"),
            Schedule(p),
            Detail(
                Flow(PkCnt(p), CompYear(p), HeatMethod(p), HeatFuel(p)),
                Flow(Direction(p), DirBase(p), EvCnt(p), Elevator(p), Stairs(p)),
                UseLine(p, false)));
    }

    /// <summary>지식산업센터 — 기존 KnowledgeCenterForm.jsx</summary>
    private static FrameworkElement Knowledge(Ctx c)
    {
        var p = c.P;
        return Stack(
            AreaRow(p, AreaPair(p, "공급면적", "sup_area"), AreaPair(p, "전용면적", "exc_area"), AreaPair(p, "대지면적", "land_share"), AreaPair(p, "연면적", "gross_area")),
            TradeRow(p),
            AmountBiz(p),
            NowBiz(p, "예: OO테크", "예: 제조업, IT"),
            Recommend(p, "예: 제조, 연구소, 사무 등 추천 업종"),
            Schedule(p),
            Detail(
                Flow(PkCnt(p), CompYear(p), HeatMethod(p), HeatFuel(p)),
                Flow(Direction(p), DirBase(p), Elevator(p), Stairs(p)),
                Flow(Pair("건축물용도", Sel(p, "building_use", 130, Catalog.BuildingUses)), Pair("지목", Sel(p, "land_category", 88, Catalog.LandCategories)),
                    Pair("용도지역", Sel(p, "land_use", 130, Catalog.LandUses)))));
    }

    /// <summary>숙박·펜션 — 기존 LodgingForm.jsx(면적 종류 선택: 전용/공급)</summary>
    private static FrameworkElement Lodging(Ctx c)
    {
        var p = c.P;
        // 면적 종류(프론트 전용 areaKind) — 고른 종류의 칸(전용→exc_area, 공급→sup_area) 하나만
        var kindHost = new ContentControl { VerticalAlignment = VerticalAlignment.Center };
        void Kind()
        {
            var kind = p.Str("area_kind") ?? "전용면적";
            var sel = Sel(p, "area_kind", 84, new[] { new Opt("전용면적", "전용면적"), new Opt("공급면적", "공급면적") }, emptyLabel: null);
            sel.SelectedValue = kind;
            var sp = new StackPanel { Orientation = Orientation.Horizontal };
            sel.Margin = new Thickness(0, 0, 4, 0);
            sp.Children.Add(sel);
            var areaKey = kind == "공급면적" ? "sup_area" : "exc_area";
            sp.Children.Add(Amt(p, areaKey, 52, decimalValue: true));
            var u = Unit(AreaUnit(p), gray: true);
            u.Margin = new Thickness(4, 0, 0, 0);
            sp.Children.Add(u);
            kindHost.Content = sp;
        }
        OnChange(kindHost, p, Kind, "area_kind", "area_unit");
        return Stack(
            AreaRow(p, kindHost, AreaPair(p, "대지면적", "land_share"), AreaPair(p, "건축면적", "building_area"), AreaPair(p, "연면적", "gross_area")),
            TradeRow(p),
            AmountBiz(p),
            NowBiz(p, "예: OO펜션", "예: 숙박업"),
            Schedule(p),
            Detail(
                Flow(PkCnt(p), CompYear(p), Pair("객실수", Num(p, "guest_room_cnt", 84)), EvCnt(p)),
                Flow(HeatMethod(p), HeatFuel(p), BuidStruct(p)),
                UseLine(p, false)));
    }

    /// <summary>공장·창고 — 기존 FactoryForm.jsx</summary>
    private static FrameworkElement Factory(Ctx c)
    {
        var p = c.P;
        return Stack(
            AreaRow(p, AreaPair(p, "대지면적", "land_share"), AreaPair(p, "건축면적", "building_area"), AreaPair(p, "연면적", "gross_area")),
            TradeRow(p),
            AmountBiz(p),
            NowBiz(p, "예: OO산업", "예: 제조업"),
            Schedule(p),
            Detail(
                Flow(PkCnt(p), CompYear(p)),
                Flow(HeatMethod(p), HeatFuel(p), BuidStruct(p)),
                Flow(Pair("진입도로", Num(p, "access_road", 64, decimalValue: true), "m"), Pair("사무실", Amt(p, "office_area", 52, decimalValue: true), "㎡"),
                    Pair("화장실", Sel(p, "toilet", 84, "양호", "열악", "이동식", "없음"))),
                UseLine(p, true, 120)));
    }

    /// <summary>건물·빌딩 — 기존 BuildingForm.jsx(매매만, 수입·지출 분석표, 현상황은 임대차현황서 버튼만)</summary>
    private static FrameworkElement Building(Ctx c)
    {
        var p = c.P;
        var lease = OutlineButton("임대차현황서", c.OpenLease, new Thickness(12, 5, 12, 5));
        lease.HorizontalAlignment = HorizontalAlignment.Left;
        return Stack(
            AreaRow(p, AreaPair(p, "대지면적", "land_share"), AreaPair(p, "건축면적", "building_area"), AreaPair(p, "연면적", "gross_area")),
            TradeRow(p, new[] { "SALEDIV01" }),
            Section("금액", "단위(만원)", Lines(BuildingTop(p), IncomeTable(p)), subTop: 8),
            Section("현상황", null, lease),
            Detail(
                Flow(PkCnt(p), EvCnt(p), CompYear(p), HeatMethod(p), HeatFuel(p), Elevator(p), Stairs(p), BuidStruct(p)),
                WithUseWidth(UseLine(p, false, 130, "건축물주용도", "main_building_use", LF.Opts("주용도1", "주용도2", "주용도3")))));
    }

    // 건축물주용도는 110px(나머지는 같은 줄 규칙)
    private static FrameworkElement WithUseWidth(FrameworkElement line)
    {
        if (line is Border { Child: WrapPanel wp } && wp.Children[0] is StackPanel sp && sp.Children[1] is ComboBox cb) cb.Width = 110;
        return line;
    }

    /// <summary>건물 금액 위 줄: 매매금액·보증금총액·대출금액·투자금액(56, gap 16)</summary>
    private static FrameworkElement BuildingTop(Row p)
    {
        FrameworkElement Item(string label, string key)
        {
            var box = Amt(p, key, 56);
            box.Height = 26;
            box.Padding = new Thickness(6, 0, 6, 0);
            var sp = Pair(label, box);
            ((FrameworkElement)sp.Children[0]).Margin = new Thickness(0, 0, 6, 0);
            return sp;
        }
        var f = Flow(16, Item("매매금액", "sale_amt"), Item("보증금총액", "deposit_total"), Item("대출금액", "loan_total"), Item("투자금액", "invest_amt"));
        f.Margin = new Thickness(0, 0, 0, 2);
        return f;
    }

    /// <summary>수입·지출 분석표(510px: 항목·월수입·년수입 | 항목·월지출·년지출, 합계 자동)</summary>
    private static FrameworkElement IncomeTable(Row p)
    {
        var g = new Grid { Width = 510, HorizontalAlignment = HorizontalAlignment.Left };
        foreach (var w in new[] { 56.0, 69, 69, 178, 69, 69 }) g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(w) });
        for (var i = 0; i < 6; i++) g.RowDefinitions.Add(new RowDefinition());
        void Put(int r, int col, UIElement child, string? bg = null, double pad = 2)
        {
            var b = new Border { BorderBrush = Line, BorderThickness = new Thickness(col == 0 ? 1 : 0, r == 0 ? 1 : 0, 1, 1), Padding = new Thickness(pad), Child = child };
            if (bg is not null) b.Background = Legacy.B(bg);
            Grid.SetRow(b, r);
            Grid.SetColumn(b, col);
            g.Children.Add(b);
        }
        TextBlock Txt2(string s, string color, bool right = false) => new() { Text = s, FontSize = 13, FontWeight = FontWeights.Bold, Foreground = Legacy.B(color), HorizontalAlignment = right ? HorizontalAlignment.Right : HorizontalAlignment.Center, TextWrapping = TextWrapping.NoWrap };
        string[] heads = { "항목", "월수입", "년수입", "항목", "월지출", "년지출" };
        for (var i = 0; i < 6; i++) Put(0, i, Txt2(heads[i], "#334155"), "#F1F5F9", 5);
        (string In, string InM, string InY, string Ex, string ExM, string ExY)[] rows =
        {
            ("차임", "inc_rent_m", "inc_rent_y", "인건비", "exp_labor_m", "exp_labor_y"),
            ("관리비", "inc_mgmt_m", "inc_mgmt_y", "공과금(전기,가스,수도)", "exp_util_m", "exp_util_y"),
            ("기타", "inc_etc_m", "inc_etc_y", "대출이자", "exp_loan_m", "exp_loan_y"),
            ("", "", "", "기타", "exp_etc_m", "exp_etc_y"),
        };
        FrameworkElement In(string key)
        {
            var tb = Amt(p, key, -1, border: false);
            tb.Height = 26;
            tb.Padding = new Thickness(6, 0, 6, 0);
            return tb;
        }
        for (var r = 0; r < rows.Length; r++)
        {
            var x = rows[r];
            Put(r + 1, 0, Txt2(x.In, "#1D4ED8"), "#FFFFFF", 5);
            Put(r + 1, 1, x.InM.Length > 0 ? In(x.InM) : new Border());
            Put(r + 1, 2, x.InY.Length > 0 ? In(x.InY) : new Border());
            Put(r + 1, 3, Txt2(x.Ex, "#C2410C"), "#FFFFFF", 5);
            Put(r + 1, 4, In(x.ExM));
            Put(r + 1, 5, In(x.ExY));
        }
        // 합계(자동)
        var sums = new TextBlock[4];
        for (var i = 0; i < 4; i++) sums[i] = Txt2("", "#1E293B", right: true);
        Put(5, 0, Txt2("합계", "#1D4ED8"), "#FFFFFF", 5);
        Put(5, 1, sums[0], "#F8FAFC", 4);
        Put(5, 2, sums[1], "#F8FAFC", 4);
        Put(5, 3, Txt2("합계", "#C2410C"), "#FFFFFF", 5);
        Put(5, 4, sums[2], "#F8FAFC", 4);
        Put(5, 5, sums[3], "#F8FAFC", 4);
        double N(string k) => double.TryParse(p.Str(k), NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : 0;
        string F(double v) => v == 0 ? "" : v.ToString("#,0.##", CultureInfo.InvariantCulture);
        var keys = rows.SelectMany(r => new[] { r.InM, r.InY, r.ExM, r.ExY }).Where(k => k.Length > 0).ToArray();
        OnChange(g, p, () =>
        {
            sums[0].Text = F(N("inc_rent_m") + N("inc_mgmt_m") + N("inc_etc_m"));
            sums[1].Text = F(N("inc_rent_y") + N("inc_mgmt_y") + N("inc_etc_y"));
            sums[2].Text = F(N("exp_labor_m") + N("exp_util_m") + N("exp_loan_m") + N("exp_etc_m"));
            sums[3].Text = F(N("exp_labor_y") + N("exp_util_y") + N("exp_loan_y") + N("exp_etc_y"));
        }, keys);
        return g;
    }

    /// <summary>토지 — 기존 LandForm.jsx(토지면적, 대출금액만, 추천업종, 토지 전용 상세정보)</summary>
    private static FrameworkElement Land(Ctx c)
    {
        var p = c.P;
        var permit = new StackPanel { Orientation = Orientation.Horizontal };
        var chk = Chk(p, "build_permit", "건축허가");
        chk.Margin = new Thickness(0, 0, 8, 0);
        permit.Children.Add(chk);
        permit.Children.Add(Pair("허가일", Date(p, "permit_date")));
        var road = Num(p, "road_info", 52, decimalValue: true);
        Placeholder.Set(road, "너비");
        var other = Txt(p, "other_restrictions", -1, "예: 주차장 제한 등");
        other.MinWidth = 280;
        var l1 = Flow(10, Pair("지목", Sel(p, "land_category", 88, Catalog.LandCategories)), Pair("용도지역", Sel(p, "land_use", 120, Catalog.LandUses)), permit, Pair("도로", road, "m"));
        var l2 = Flow(14, Chk(p, "zone_dev_restrict", "개발제한구역"), Chk(p, "zone_land_permit", "토지거래허가구역"), Chk(p, "right_surface", "지상권"), Chk(p, "right_grave", "분묘기지권"), Chk(p, "right_easement", "지역권"));
        l2.Margin = new Thickness(0, 2, 0, 0);
        var l3 = Fill(4, other, Label("기타제한사항"));
        l3.Margin = new Thickness(0, 2, 0, 0);
        return Stack(
            AreaRow(p, AreaPair(p, "토지면적", "land_share")),
            TradeRow(p),
            Section("금액", "단위(만원)", Lines(AmountTable(p), Flow(Pair("대출금액", Amt(p, "loan_amt", 55), "만"))), subTop: 8),
            NowBiz(p, "농장", "과수원(애플망고)"),
            Recommend(p, "예: 카페, 편의점, 학원 등 추천 업종"),
            Schedule(p),
            Detail(l1, l2, l3));
    }
}

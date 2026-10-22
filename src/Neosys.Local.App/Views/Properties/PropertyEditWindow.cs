using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 물건 등록/수정 — 기존 PropertyFormPageV2 배치:
///   머리글(제목·담당자·등록일자·최근수정일 + [기본정보|평면도/사진])
///   노란 줄(물건유형·세부유형·소재지·정비구역명 … 물건상태) / 회색 줄(재개발·재건축 입주권 종전 정보)
///   왼쪽 630px 행 폼(물건명·면적·거래구분·금액·현상황·일정·제한사항·상세정보·옵션)
///   오른쪽 카드(물건특징·상담내용·소유자/임차인/공인중개사) — 상담모드면 숨김
///   푸터(공동중개망전송·일정관리 … 입력초기화·소유자/임차인 변경·복사등록·등록|저장·닫기)
/// </summary>
public sealed class PropertyEditWindow : EditWindow
{
    private static readonly Brush Yellow = Legacy.B("#FEFCE8"), YellowLine = Legacy.B("#FBBF24"), YellowLabel = Legacy.B("#FEF3C7"), Brown = Legacy.B("#92400E");
    private static readonly Brush Slate = Legacy.B("#64748B"), Line = Legacy.B("#CBD5E1");

    private readonly PropertyService _svc;
    private readonly PropertyDetail _d;
    private readonly ChildListEditor _holders, _memos, _consults, _shares, _lease, _parcels;
    private readonly DataGrid _history = new();
    private readonly AttachmentPanel _floorPlans, _photos;
    private readonly TextBlock _title = new() { FontSize = 18, FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center };
    private readonly TextBlock _meta = new() { FontSize = 13, Foreground = Slate, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(16, 0, 0, 0) };
    private readonly TextBlock _upd = new() { FontSize = 13, Foreground = Legacy.B("#EF4444"), FontWeight = FontWeights.Medium, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 0, 0) };
    private readonly Button _historyBtn = new() { Padding = new Thickness(8, 1, 8, 1), MinHeight = 24 };
    private readonly Button _resetBtn = new() { Content = "입력초기화" };

    public PropertyEditWindow(PropertyService svc, PropertyDetail d) : base("물건", 1400, 900)
    {
        _svc = svc;
        _d = d;
        var p = d.Pt;

        // ---------- 하위 목록 ----------
        _holders = new ChildListEditor("소유자 / 임차인", new[]
        {
            ChildCol.Combo("holder_type", "구분", Catalog.HolderTypes, 64), new ChildCol("holder_name", "성함", 70),
            new ChildCol("holder_phone", "전화번호", 110), new ChildCol("holder_relation", "관계", 70),
            new ChildCol("holder_reg_date", "저장일", 100, ChildColKind.Date), new ChildCol("holder_memo", "메모"),
        }, () => new Row { ["holder_type"] = "OWNER", ["holder_reg_date"] = LocalDate.Today }, 60);
        _holders.Load(d.Holders);
        _holders.HideHeader();

        _memos = new ChildListEditor("물건특징", new[]
        {
            new ChildCol("memo_date", "날짜", 120, ChildColKind.ReadOnly), new ChildCol("memo_content", "내용"),
            new ChildCol("user_id", "작성자", 60, ChildColKind.ReadOnly),
        }, () => new Row { ["memo_date"] = LocalDate.Now, ["user_id"] = AppServices.Session.UserId }, 60);
        _memos.Load(d.Memos);
        _memos.HideHeader();

        _consults = new ChildListEditor("상담내용", new[]
        {
            new ChildCol("reg_dt", "일시", 120, ChildColKind.ReadOnly), new ChildCol("contact_name", "성함", 70),
            new ChildCol("contact_phone", "전화번호", 105), new ChildCol("itv_content", "내용"),
        }, () => new Row { ["reg_dt"] = LocalDate.Now }, 60);
        _consults.Load(d.Consults);
        _consults.HideHeader();

        _shares = new ChildListEditor("공인중개사", new[]
        {
            new ChildCol("share_date", "날짜", 100, ChildColKind.Date), new ChildCol("office_name", "상호", 110),
            new ChildCol("region_name", "지역명", 80), new ChildCol("office_phone", "전화번호", 105), new ChildCol("memo", "내용"),
        }, minHeight: 60);
        _shares.Load(d.Shares);
        _shares.HideHeader();

        _lease = new ChildListEditor("임대차현황서", new[]
        {
            new ChildCol("room_no", "호실", 60), new ChildCol("area", "면적(㎡)", 70, ChildColKind.Decimal),
            new ChildCol("cur_status", "현황", 70), new ChildCol("deposit", "보증금", 80, ChildColKind.Amount),
            new ChildCol("monthly_rent", "월세", 70, ChildColKind.Amount), new ChildCol("maint_cost", "관리비", 70, ChildColKind.Amount),
            new ChildCol("contract_start", "계약시작", 110, ChildColKind.Date), new ChildCol("contract_end", "계약종료", 110, ChildColKind.Date),
            new ChildCol("business_type", "업종", 80), new ChildCol("business_name", "상호"),
        }, minHeight: 300);
        _lease.Load(d.LeaseRows);

        _parcels = new ChildListEditor("필지목록", new[]
        {
            new ChildCol("soji", "소재지", 160), new ChildCol("jibun", "지번", 80), new ChildCol("land_area", "면적(㎡)", 80, ChildColKind.Decimal),
            new ChildCol("land_category", "지목", 70), new ChildCol("land_use", "용도지역", 110), new ChildCol("other_restrictions", "기타제한"),
        }, minHeight: 300);
        _parcels.Load(d.Parcels);

        GridBuilder.SetColumns(_history, new[]
        {
            ColDef.DateTime("archived_dt", "보관일시"), ColDef.Text("pt_name", "물건명", 150),
            ColDef.Text("current_status", "현상태", 70), ColDef.Amount("sale_amt", "매매"), ColDef.Amount("les_amt", "전세"),
            ColDef.Amount("prot_amt", "보증금"), ColDef.Amount("mon_amt", "월세"),
            ColDef.Text("registry_owner", "소유자", 80), ColDef.Text("contract_tenant", "임차인", 0),
        });

        // ---------- 평면도/사진 탭 ----------
        string? PtKey() => _d.PtNo?.ToString();
        _floorPlans = new AttachmentPanel(FileKind.FloorPlan, PtKey);
        _photos = new AttachmentPanel(FileKind.PropertyPhoto, PtKey);
        var files = new StackPanel();
        files.Children.Add(_floorPlans);
        files.Children.Add(_photos);
        var filesView = new ScrollViewer { Content = files, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Visibility = Visibility.Collapsed };

        // ---------- 기본정보 탭 ----------
        var main = new DockPanel();
        var top = new StackPanel { Margin = new Thickness(0, 0, 0, 4) };
        top.Children.Add(TopBar(p));
        top.Children.Add(FormerBar(p));
        DockPanel.SetDock(top, Dock.Top);
        main.Children.Add(top);

        var consult = AppServices.Settings.ConsultMode;
        var body = new Grid();
        body.ColumnDefinitions.Add(new ColumnDefinition { Width = consult ? new GridLength(1, GridUnitType.Star) : new GridLength(630) });
        body.ColumnDefinitions.Add(new ColumnDefinition { Width = consult ? new GridLength(0) : new GridLength(1, GridUnitType.Star) });
        var form = RowFormBuilder.Build(p, PropertyFields.Rows());
        var formStack = new StackPanel();
        formStack.Children.Add(form);
        formStack.Children.Add(ExtraRow(p));
        body.Children.Add(new ScrollViewer { Content = formStack, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Padding = new Thickness(0, 0, 2, 0) });
        if (!consult)
        {
            var right = RightCards(p);
            right.Margin = new Thickness(4, 0, 0, 0);
            Grid.SetColumn(right, 1);
            body.Children.Add(right);
        }
        main.Children.Add(body);

        // ---------- 머리글 ----------
        var head = new DockPanel { Margin = new Thickness(0, 0, 0, 8) };
        void ShowTab(string v)
        {
            main.Visibility = v == "property" ? Visibility.Visible : Visibility.Collapsed;
            filesView.Visibility = v == "files" ? Visibility.Visible : Visibility.Collapsed;
            head.Children.RemoveAt(0);
            head.Children.Insert(0, Toggle(v));
        }
        FrameworkElement Toggle(string cur)
        {
            var t = Legacy.Segmented(new[] { ("property", "기본정보"), ("files", "평면도/사진") }, x => x == cur, ShowTab);
            t.Margin = new Thickness(0, 0, 16, 0);
            DockPanel.SetDock(t, Dock.Right);
            return t;
        }
        head.Children.Add(Toggle("property"));
        var titleLine = new StackPanel { Orientation = Orientation.Horizontal };
        titleLine.Children.Add(_title);
        titleLine.Children.Add(_meta);
        titleLine.Children.Add(_upd);
        head.Children.Add(titleLine);

        var root = new DockPanel();
        DockPanel.SetDock(head, Dock.Top);
        root.Children.Add(head);
        var stack = new Grid();
        stack.Children.Add(main);
        stack.Children.Add(filesView);
        root.Children.Add(stack);
        Body.Children.Add(root);

        // ---------- 푸터 ----------
        var shareNet = new Button { Content = "공동중개망전송", Background = Legacy.B("#0EA5E9"), Foreground = Brushes.White, BorderThickness = new Thickness(0), Margin = new Thickness(0, 0, 6, 0) };
        shareNet.Click += (_, _) => Toast.Show(_d.IsNew ? "저장된 물건 정보만 정보망 전송이 가능합니다." : "공동중개망 전송은 네오시스 웹에서 이용하세요.");
        var schedule = new Button { Content = "일정관리", Background = Legacy.B("#A855F7"), Foreground = Brushes.White, BorderThickness = new Thickness(0) };
        schedule.Click += (_, _) => OpenSchedule();
        LeftButtons.Children.Add(shareNet);
        LeftButtons.Children.Add(schedule);

        _resetBtn.Click += (_, _) => ResetInput();
        var holderChange = new Button { Content = "소유자/임차인 변경", Background = Legacy.B("#D97706"), Foreground = Brushes.White, BorderThickness = new Thickness(0) };
        holderChange.Click += (_, _) => ChangeHolders();
        var copy = new Button { Content = "복사등록", Background = Legacy.B("#0D9488"), Foreground = Brushes.White, BorderThickness = new Thickness(0) };
        copy.Click += (_, _) => CopyRegister();
        AddRightButton(_resetBtn);
        AddRightButton(holderChange);
        AddRightButton(copy);
        void UpdateCopy() => copy.Visibility = Catalog.ApartmentFormCodes.Contains(p.Str("pt_type") ?? "") || PropertyFields.Redev(p) ? Visibility.Collapsed : Visibility.Visible;
        UpdateCopy();
        p.PropertyChanged += (_, e) => { if (e.PropertyName == "pt_type") UpdateCopy(); };

        Loaded += async (_, _) => await LoadHistory();
    }

    // 기존 등록창은 삭제 버튼을 숨긴다(목록의 행 메뉴에서 삭제)
    protected override bool CanDelete => false;
    protected override string SaveLabel => _d.IsNew ? "등록 | 저장" : "수정 | 저장";

    protected override void OnModeChanged()
    {
        var p = _d.Pt;
        _title.Text = _d.IsNew ? "물건정보 등록" : "물건정보 수정";
        var reg = !_d.IsNew && DateTime.TryParse(p.Str("reg_dt"), out var rd) ? rd : DateTime.Today;
        _meta.Text = $"담당자: {p.Str("rt_nm") ?? AppServices.Session.RtNm}    등록일자: {reg:yyyy-MM-dd}";
        _upd.Text = _d.IsNew ? "" : $"최근수정일: {(DateTime.TryParse(p.Str("upd_dt"), out var ud) ? ud.ToString("yyyy-MM-dd HH:mm") : "-")}";
        _resetBtn.Visibility = _d.IsNew ? Visibility.Visible : Visibility.Collapsed;
    }

    // ================= 노란 줄 / 회색 줄 =================

    private static Border YLabel(string text, Brush back, Brush border, Brush fore, double size = 14) => new()
    {
        Background = back, BorderBrush = border, BorderThickness = new Thickness(1), Width = 72, Margin = new Thickness(0, 0, 8, 0),
        Child = new TextBlock { Text = text, FontSize = size, FontWeight = FontWeights.SemiBold, Foreground = fore, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center },
    };

    private static StackPanel Pair(string label, FrameworkElement editor, double width)
    {
        editor.Width = width;
        var sp = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 8, 0), VerticalAlignment = VerticalAlignment.Center };
        if (label.Length > 0) sp.Children.Add(RowFormBuilder.SmallLabel(label));
        sp.Children.Add(editor);
        return sp;
    }

    /// <summary>최상단 노란 한 줄: 물건유형 + 세부유형 + 소재지(+정비구역명) … 물건상태(계약일/보류일)</summary>
    private FrameworkElement TopBar(Row p)
    {
        var bar = new DockPanel { MinHeight = 40 };

        // 물건상태 — 오른쪽 끝
        var sts = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        sts.Children.Add(RadioGroup.Bound(Catalog.PropertyProgress, p, "pt_sts"));
        var cDate = Pair("계약일", FormBuilder.MakeDateBox(p, "contract_date"), 120);
        var hDate = Pair("보류일", FormBuilder.MakeDateBox(p, "hold_date"), 120);
        sts.Children.Add(cDate);
        sts.Children.Add(hDate);
        var stsBox = new Border { BorderBrush = YellowLine, BorderThickness = new Thickness(1, 0, 0, 0), Padding = new Thickness(10, 0, 8, 0), Child = sts, VerticalAlignment = VerticalAlignment.Stretch };
        DockPanel.SetDock(stsBox, Dock.Right);
        bar.Children.Add(stsBox);

        var left = new StackPanel { Orientation = Orientation.Horizontal };
        left.Children.Add(YLabel("물건유형", YellowLabel, YellowLine, Brown));
        if (_d.IsNew)
        {
            var type = FormBuilder.MakeCombo(p, "pt_type", Catalog.PropertyTypes);
            type.Width = 132;
            type.VerticalAlignment = VerticalAlignment.Center;
            type.Margin = new Thickness(0, 0, 8, 0);
            left.Children.Add(type);
        }
        else
        {
            left.Children.Add(new TextBlock { Text = Catalog.PropertyTypeName(p.Str("pt_type")) ?? "-", FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 8, 0) });
        }
        var sub = FormBuilder.MakeDynamicCombo(p, "sub_type", x => Catalog.SubTypes(x.Str("pt_type") ?? ""), "pt_type");
        sub.Width = 90;
        sub.VerticalAlignment = VerticalAlignment.Center;
        sub.Margin = new Thickness(0, 0, 8, 0);
        left.Children.Add(sub);

        left.Children.Add(YLabel("소재지", YellowLabel, YellowLine, Brown));
        left.Children.Add(AddressPart(p));

        var zone = Pair("정비구역명", FormBuilder.MakeTextBox(p, "maint_zone_name", "정비구역명"), 140);
        zone.Margin = new Thickness(8, 0, 8, 0);
        ((TextBlock)zone.Children[0]).Foreground = Brown;
        left.Children.Add(zone);
        bar.Children.Add(left);

        void Update()
        {
            var s = p.Str("pt_sts");
            cDate.Visibility = s == "PTSTS02" ? Visibility.Visible : Visibility.Collapsed;
            hDate.Visibility = s == "PTSTS04" ? Visibility.Visible : Visibility.Collapsed;
            sub.Visibility = Catalog.SubTypes(p.Str("pt_type") ?? "").Count > 0 ? Visibility.Visible : Visibility.Collapsed;
            zone.Visibility = PropertyFields.Redev(p) ? Visibility.Visible : Visibility.Collapsed;
        }
        Update();
        p.PropertyChanged += (_, e) => { if (e.PropertyName is "pt_sts" or "pt_type") Update(); };

        return new Border { Background = Yellow, BorderBrush = YellowLine, BorderThickness = new Thickness(2), Child = bar };
    }

    /// <summary>소재지: 신규는 [지역·단지 선택] + 지번 입력, 수정은 글자(기존과 같이 소재지 고정)</summary>
    private FrameworkElement AddressPart(Row p)
    {
        var text = new TextBlock { VerticalAlignment = VerticalAlignment.Center, FontWeight = FontWeights.Medium, Margin = new Thickness(0, 0, 6, 0) };
        void Update() => text.Text = string.Join(" ", new[] { p.Str("addr1"), p.Str("addr2"), p.Str("addr3") }.Where(s => !string.IsNullOrEmpty(s)));
        Update();
        p.PropertyChanged += (_, e) => { if (e.PropertyName is "addr1" or "addr2" or "addr3") Update(); };
        var sp = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        if (!_d.IsNew)
        {
            sp.Children.Add(text);
            var j = new TextBlock { VerticalAlignment = VerticalAlignment.Center, FontWeight = FontWeights.Medium, Text = p.Str("jibun") ?? "" };
            sp.Children.Add(j);
            return sp;
        }
        var pick = PropertyFields.AddressEditor(p);           // [지역·단지 선택] + 선택 내용
        sp.Children.Add(pick);
        var jibun = FormBuilder.MakeTextBox(p, "jibun", "지번");
        jibun.Width = 60;
        jibun.Margin = new Thickness(6, 0, 0, 0);
        Placeholder.Set(jibun, "지번");
        sp.Children.Add(jibun);
        return sp;
    }

    /// <summary>종전유형 / 종전주소 / 종전면적 / 종전대지지분 — 재개발·재건축 입주권 전용(분양권 제외)</summary>
    private static FrameworkElement FormerBar(Row p)
    {
        var gray = Legacy.B("#E5E7EB");
        var sp = new WrapPanel { MinHeight = 30 };
        sp.Children.Add(YLabel("종전유형", gray, Line, Brushes.Black, 13));
        var types = Catalog.PropertyTypes.Where(o => !o.Label.Contains("분양권") && o.Value != "SYCA117").ToList();
        var ft = FormBuilder.MakeCombo(p, "former_pt_type", types);
        ft.Width = 104;
        ft.Margin = new Thickness(0, 3, 8, 3);
        sp.Children.Add(ft);
        sp.Children.Add(YLabel("종전주소", gray, Line, Brushes.Black, 13));

        var addr = new TextBlock { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) };
        void UpdateAddr() => addr.Text = p.Str("former_addr") ?? "";
        UpdateAddr();
        p.PropertyChanged += (_, e) => { if (e.PropertyName == "former_addr") UpdateAddr(); };
        var pick = new Button { Content = "지역 선택", Padding = new Thickness(8, 1, 8, 1), MinHeight = 24, Margin = new Thickness(0, 3, 6, 3) };
        pick.Click += (_, _) =>
        {
            var r = RegionPicker.Pick(false, "종전주소 선택");
            if (r is null) return;
            p["former_bjd_code"] = r["bjd_code"];
            p["former_addr"] = string.Join(" ", new[] { r.Str("addr1"), r.Str("addr2"), r.Str("addr3") }.Where(s => !string.IsNullOrEmpty(s)));
        };
        sp.Children.Add(pick);
        sp.Children.Add(addr);
        foreach (var (key, ph, w) in new[] { ("former_jibun", "지번", 55.0), ("former_dong", "동", 60.0), ("former_ho", "호", 60.0) })
        {
            var tb = FormBuilder.MakeTextBox(p, key, ph);
            tb.Width = w;
            tb.Margin = new Thickness(0, 3, 6, 3);
            Placeholder.Set(tb, ph);
            sp.Children.Add(tb);
        }
        foreach (var (key, label) in new[] { ("former_area", "종전면적"), ("former_land_share_ratio", "종전대지지분") })
        {
            var l = new Border { Background = gray, BorderBrush = Line, BorderThickness = new Thickness(1), Padding = new Thickness(10, 0, 10, 0), Margin = new Thickness(0, 0, 6, 0),
                Child = new TextBlock { Text = label, FontSize = 13, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center } };
            sp.Children.Add(l);
            var tb = FormBuilder.MakeNumberBox(p, key, DecimalConverter.Instance);
            tb.Width = 60;
            tb.Margin = new Thickness(0, 3, 8, 3);
            sp.Children.Add(tb);
        }
        var box = new Border { Background = Legacy.B("#F3F4F6"), BorderBrush = Line, BorderThickness = new Thickness(2, 0, 2, 2), Child = sp };
        void Update() => box.Visibility = PropertyFields.Redev(p) && p.Str("sub_type") != "분양권" ? Visibility.Visible : Visibility.Collapsed;
        Update();
        p.PropertyChanged += (_, e) => { if (e.PropertyName is "pt_type" or "sub_type") Update(); };
        return box;
    }

    /// <summary>왼쪽 폼 맨 아래: 과거데이터 건수 · 임대차현황서(건물·주택·상가류) · 필지목록(토지) — 기존은 행 안 버튼/모달</summary>
    private FrameworkElement ExtraRow(Row p)
    {
        var sp = new WrapPanel { Margin = new Thickness(6, 4, 6, 4) };
        sp.Children.Add(RowFormBuilder.SmallLabel("과거데이터"));
        _historyBtn.Click += (_, _) => ShowHistory();
        sp.Children.Add(_historyBtn);
        sp.Children.Add(new TextBlock { Text = "건", FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0, 16, 0) });
        var lease = new Button { Content = "임대차현황서", Padding = new Thickness(8, 1, 8, 1), MinHeight = 24, Margin = new Thickness(0, 0, 6, 0) };
        lease.Click += (_, _) => ShowChild("임대차현황서", _lease);
        var parcel = new Button { Content = "필지목록", Padding = new Thickness(8, 1, 8, 1), MinHeight = 24 };
        parcel.Click += (_, _) => ShowChild("필지목록", _parcels);
        sp.Children.Add(lease);
        sp.Children.Add(parcel);
        void Update()
        {
            lease.Visibility = PropertyFields.House(p) || PropertyFields.BigBuilding(p) || PropertyFields.BizUnit(p) ? Visibility.Visible : Visibility.Collapsed;
            parcel.Visibility = PropertyFields.Land(p) ? Visibility.Visible : Visibility.Collapsed;
        }
        Update();
        p.PropertyChanged += (_, e) => { if (e.PropertyName == "pt_type") Update(); };
        return RowFormBuilder.MakeRow("기타", sp);
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

    /// <summary>보라 라벨(제목 + 작은 버튼 묶음) + 내용 카드</summary>
    private static Border Card(string title, UIElement content, params Button[] buttons)
    {
        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(RowFormBuilder.LabelWidth) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        var lab = new StackPanel { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6) };
        lab.Children.Add(new TextBlock { Text = title, Foreground = Brushes.White, FontWeight = FontWeights.SemiBold, FontSize = 14, TextAlignment = TextAlignment.Center, TextWrapping = TextWrapping.Wrap });
        if (buttons.Length > 0)
        {
            // 기존 linkGroupBoxStyle: 흰 85% 테두리 · rounded 5 · padding 7px 8px · 위 16px
            var box = new StackPanel();
            foreach (var b in buttons) box.Children.Add(b);
            lab.Children.Add(new Border
            {
                Margin = new Thickness(0, 16, 0, 0), Padding = new Thickness(8, 7, 8, 7), CornerRadius = new CornerRadius(5),
                BorderThickness = new Thickness(1), BorderBrush = new SolidColorBrush(Color.FromArgb(0xD9, 0xFF, 0xFF, 0xFF)),
                HorizontalAlignment = HorizontalAlignment.Center, Child = box,
            });
        }
        g.Children.Add(new Border { Background = Legacy.B("#8B7AD8"), BorderBrush = Legacy.B("#5B4AA8"), BorderThickness = new Thickness(0, 0, 1, 0), Child = lab });
        if (content is FrameworkElement fe) Grid.SetColumn(fe, 1);
        g.Children.Add(content);
        return new Border { BorderBrush = Line, BorderThickness = new Thickness(1), Child = g };
    }

    private FrameworkElement RightCards(Row p)
    {
        var g = new Grid();
        g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(0.6, GridUnitType.Star), MinHeight = 160 });
        g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star), MinHeight = 160 });
        g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(176) });

        var memo = Card("물건특징", _memos, LinkBtn("날짜입력", () => _memos.AddRow()), LinkBtn("행삭제", _memos.DeleteSelected));
        g.Children.Add(memo);

        var consult = Card("상담내용", _consults, LinkBtn("상담추가", () => _consults.AddRow()), LinkBtn("행삭제", _consults.DeleteSelected));
        consult.Margin = new Thickness(0, -1, 0, 0);
        Grid.SetRow(consult, 1);
        g.Children.Add(consult);

        // 소유자/임차인/공인중개사 — 등기상 소유자·계약서상 임차인 입력 + 하단 표(기존 HolderCombinedCard)
        var tabs = new TabControl { Padding = new Thickness(0), BorderThickness = new Thickness(0) };
        var holderPanel = new DockPanel();
        var names = new WrapPanel { Margin = new Thickness(4, 3, 4, 3) };
        var owner = FormBuilder.MakeTextBox(p, "registry_owner");
        var tenant = FormBuilder.MakeTextBox(p, "contract_tenant");
        names.Children.Add(Pair("등기상 소유자", owner, 110));
        names.Children.Add(Pair("계약서상 임차인", tenant, 110));
        var hb = new StackPanel { Orientation = Orientation.Horizontal };
        var add = new Button { Content = "+ 행추가", Padding = new Thickness(6, 0, 6, 0), MinHeight = 22, Margin = new Thickness(0, 0, 4, 0) };
        add.Click += (_, _) => _holders.AddRow();
        var del = new Button { Content = "행삭제", Padding = new Thickness(6, 0, 6, 0), MinHeight = 22 };
        del.Click += (_, _) => _holders.DeleteSelected();
        hb.Children.Add(add);
        hb.Children.Add(del);
        names.Children.Add(hb);
        DockPanel.SetDock(names, Dock.Top);
        holderPanel.Children.Add(names);
        holderPanel.Children.Add(_holders);
        tabs.Items.Add(new TabItem { Header = "소유자 / 임차인", Content = holderPanel });

        var sharePanel = new DockPanel();
        var sb = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(4, 3, 4, 3) };
        var sadd = new Button { Content = "+ 행추가", Padding = new Thickness(6, 0, 6, 0), MinHeight = 22, Margin = new Thickness(0, 0, 4, 0) };
        sadd.Click += (_, _) => _shares.AddRow();
        var sdel = new Button { Content = "행삭제", Padding = new Thickness(6, 0, 6, 0), MinHeight = 22 };
        sdel.Click += (_, _) => _shares.DeleteSelected();
        sb.Children.Add(sadd);
        sb.Children.Add(sdel);
        DockPanel.SetDock(sb, Dock.Top);
        sharePanel.Children.Add(sb);
        sharePanel.Children.Add(_shares);
        tabs.Items.Add(new TabItem { Header = "공인중개사", Content = sharePanel });

        var holderCard = new Border { BorderBrush = Line, BorderThickness = new Thickness(1), Margin = new Thickness(0, 4, 0, 0), Child = tabs };
        Grid.SetRow(holderCard, 2);
        g.Children.Add(holderCard);
        return g;
    }

    // ================= 푸터 동작 =================

    /// <summary>입력초기화 — 신규 폼에서 물건유형만 남기고 비운다</summary>
    private void ResetInput()
    {
        if (!Dialogs.Confirm("입력한 내용을 모두 지우고 처음 상태로 되돌립니다.\n(물건유형은 유지)")) return;
        var p = _d.Pt;
        var fresh = _svc.New(p.Str("pt_type"));
        foreach (var k in p.Keys.ToList()) if (!fresh.Pt.ContainsKey(k)) p[k] = null;
        foreach (var kv in fresh.Pt) p[kv.Key] = kv.Value;
        _holders.Load(fresh.Holders);
        _memos.Load(Array.Empty<Row>());
        _consults.Load(Array.Empty<Row>());
        _shares.Load(Array.Empty<Row>());
        _lease.Load(Array.Empty<Row>());
        _parcels.Load(Array.Empty<Row>());
    }

    /// <summary>소유자/임차인 변경 — 등기상 소유자/계약서상 임차인을 하단표의 '전 소유자'/'전 임차인' 행으로 옮기고 비운다(기존 applyHolderChange)</summary>
    private void ChangeHolders()
    {
        var p = _d.Pt;
        var owner = p.Str("registry_owner")?.Trim();
        var tenant = p.Str("contract_tenant")?.Trim();
        if (string.IsNullOrEmpty(owner) && string.IsNullOrEmpty(tenant)) { Toast.Error("등기상 소유자 또는 계약서상 임차인을 먼저 입력하세요."); return; }

        var w = new Window { Title = "소유자/임차인 변경", Width = 380, SizeToContent = SizeToContent.Height, Owner = this, WindowStartupLocation = WindowStartupLocation.CenterOwner, ResizeMode = ResizeMode.NoResize };
        var sp = new StackPanel { Margin = new Thickness(16) };
        sp.Children.Add(new TextBlock { Text = "현재 소유자·임차인을 과거로 이관합니다.", Margin = new Thickness(0, 0, 0, 10) });
        var co = new CheckBox { Content = $"소유자 {owner}", IsEnabled = !string.IsNullOrEmpty(owner), Margin = new Thickness(0, 2, 0, 2) };
        var ct = new CheckBox { Content = $"임차인 {tenant}", IsEnabled = !string.IsNullOrEmpty(tenant), Margin = new Thickness(0, 2, 0, 2) };
        sp.Children.Add(co);
        sp.Children.Add(ct);
        var ok = new Button { Content = "변경", Style = (Style)FindResource("PrimaryButton"), HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 12, 0, 0), MinWidth = 80 };
        ok.Click += (_, _) => w.DialogResult = true;
        sp.Children.Add(ok);
        w.Content = sp;
        if (w.ShowDialog() != true) return;

        var today = LocalDate.Today;
        var moved = 0;
        if (co.IsChecked == true && !string.IsNullOrEmpty(owner))
        {
            _holders.Items.Add(new Row { ["holder_type"] = "OWNER", ["holder_name"] = owner, ["holder_relation"] = "전 소유자", ["holder_reg_date"] = today });
            p["registry_owner"] = null;
            moved++;
        }
        if (ct.IsChecked == true && !string.IsNullOrEmpty(tenant))
        {
            _holders.Items.Add(new Row { ["holder_type"] = "BUYER", ["holder_name"] = tenant, ["holder_relation"] = "전 임차인", ["holder_reg_date"] = today });
            p["contract_tenant"] = null;
            moved++;
        }
        if (moved == 0) { Toast.Error("변경할 대상을 선택하세요."); return; }
        Toast.Success("과거 소유자/임차인으로 이관되었습니다.");
    }

    /// <summary>복사등록 — 현재 내용 그대로 새 등록창(소유자·메모·상담은 비움)</summary>
    private void CopyRegister()
    {
        var p = _d.Pt.Clone();
        foreach (var k in new[] { "pt_no", "reg_dt", "reg_id", "upd_dt", "upd_id", "history_count" }) p.Remove(k);
        var d = new PropertyDetail { Pt = p };
        d.Holders.Add(new Row { ["holder_type"] = "OWNER", ["holder_reg_date"] = LocalDate.Today });
        new PropertyEditWindow(_svc, d) { Owner = this }.ShowDialog();
    }

    private void OpenSchedule()
    {
        if (_d.IsNew) { Toast.Show("물건을 먼저 저장하세요."); return; }
        var svc = AppServices.Create((sp, s) => new ScheduleService(sp, s));
        var r = svc.New(ptNo: _d.PtNo);
        Schedules.SchedulePage.Edit(svc, r);
    }

    private void ShowChild(string title, ChildListEditor editor)
    {
        if (editor.Parent is Panel old) old.Children.Remove(editor);
        var w = new Window { Title = title, Width = 980, Height = 480, Owner = this, WindowStartupLocation = WindowStartupLocation.CenterOwner, Content = new Border { Padding = new Thickness(12), Child = editor } };
        w.Closed += (_, _) => { editor.Commit(); ((Border)w.Content).Child = null; };
        w.ShowDialog();
    }

    private void ShowHistory()
    {
        if (_d.IsNew) return;
        if (_history.Parent is Panel old) old.Children.Remove(_history);
        var archive = new Button { Content = "현재 내용을 과거내역으로 보관", HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 0, 0, 6) };
        archive.Click += async (_, _) =>
        {
            if (!Dialogs.Confirm("현재 물건 내용을 과거내역으로 보관하시겠습니까?")) return;
            await Dialogs.RunAsync(async () => { await _svc.ArchiveAsync(_d.PtNo!.Value); await LoadHistory(); });
        };
        var dp = new DockPanel { Margin = new Thickness(12) };
        DockPanel.SetDock(archive, Dock.Top);
        dp.Children.Add(archive);
        dp.Children.Add(_history);
        var w = new Window { Title = "과거내역", Width = 900, Height = 420, Owner = this, WindowStartupLocation = WindowStartupLocation.CenterOwner, Content = dp };
        w.Closed += (_, _) => dp.Children.Remove(_history);
        w.ShowDialog();
    }

    private async Task LoadHistory()
    {
        var list = _d.IsNew ? new List<Row>() : await _svc.HistoryAsync(_d.PtNo!.Value);
        _history.ItemsSource = list;
        _historyBtn.Content = list.Count.ToString();
        _historyBtn.IsEnabled = !_d.IsNew;
        _historyBtn.Foreground = list.Count > 0 ? Legacy.B("#4F46E5") : Slate;
        _historyBtn.FontWeight = list.Count > 0 ? FontWeights.Bold : FontWeights.Medium;
    }

    protected override bool IsNew => _d.IsNew;

    protected override async Task SaveAsync()
    {
        foreach (var e in new[] { _holders, _memos, _consults, _shares, _lease, _parcels }) e.Commit();
        Replace(_d.Holders, _holders.Items);
        Replace(_d.Memos, _memos.Items);
        Replace(_d.Consults, _consults.Items);
        Replace(_d.Shares, _shares.Items);
        Replace(_d.LeaseRows, _lease.Items);
        Replace(_d.Parcels, _parcels.Items);
        var wasNew = _d.IsNew;
        await _svc.SaveAsync(_d);
        if (wasNew)
        {
            // 첫 저장으로 물건번호가 생겼으니 첨부·과거데이터 가능
            await _floorPlans.ReloadAsync();
            await _photos.ReloadAsync();
            await LoadHistory();
        }
    }

    private static void Replace(List<Row> target, IEnumerable<Row> src)
    {
        target.Clear();
        target.AddRange(src.ToList());
    }

    /// <summary>삭제 방식 선택 — 예: 과거데이터 저장 후 삭제 / 아니오: 영구 삭제 (기존 DeleteChoiceDialog)</summary>
    protected override async Task<bool> ConfirmAndDeleteAsync()
    {
        var r = Dialogs.Ask3(
            "물건을 삭제합니다.\n\n[예] 과거데이터(이력)로 저장한 뒤 삭제\n[아니오] 영구히 삭제\n[취소] 삭제하지 않음",
            "물건 삭제");
        if (r == MessageBoxResult.Cancel) return false;
        return await Dialogs.RunAsync(() => _svc.DeleteAsync(_d.PtNo!.Value, saveHistory: r == MessageBoxResult.Yes), "삭제에 실패했습니다.");
    }
}

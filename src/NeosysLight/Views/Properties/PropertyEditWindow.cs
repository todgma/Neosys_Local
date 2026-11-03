using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Input;
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
///   오른쪽 카드(물건특징·상담내용 MemoLineCard, 소유자/임차인/공인중개사 HolderCard) — 상담모드면 숨김(토글하면 바로 반영)
///   푸터(공동중개망전송·일정관리 … 입력초기화·소유자/임차인 변경·복사등록·등록|저장·닫기)
/// 창: 기존 Electron 물건폼과 같이 1250×900 고정(크기조절·최대화 불가) — 목록에서는 SingleWindow로 하나만 띄운다.
/// </summary>
public sealed class PropertyEditWindow : EditWindow
{
    private static readonly Brush Yellow = Legacy.B("#FEFCE8"), YellowLine = Legacy.B("#FBBF24"), YellowLabel = Legacy.B("#FEF3C7"), Brown = Legacy.B("#92400E");
    private static readonly Brush Slate = Legacy.B("#64748B"), Line = Legacy.B("#CBD5E1");

    private readonly PropertyService _svc;
    private readonly PropertyDetail _d;
    private readonly PropertyFormState _state = new();   // 소재지 선택 → 단지 목록 → 단지 타입(면적) 목록
    private readonly ChildListEditor _lease, _parcels;
    private readonly HolderCard _holderCard;
    private readonly MemoLineCard _memoCard, _consultCard;
    /// <summary>소유자/임차인/공인중개사 카드 줄(높이 176) — 상담모드 ON이면 0</summary>
    private readonly RowDefinition _holderRow = new() { Height = new GridLength(176) };
    private readonly DataGrid _history = new();
    private readonly AttachmentPanel _floorPlans, _photos;
    private readonly TextBlock _title = new() { FontSize = 18, FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center };
    private readonly TextBlock _meta = new() { FontSize = 13, Foreground = Slate, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 0, 0) };
    // 담당자(기존: 대표 공인중개사만 수정 가능한 입력칸 — 저장하지 않는 표시용)
    private readonly TextBox _manager = new() { Width = 96, FontSize = 13, Height = 24, Padding = new Thickness(4, 0, 4, 0), VerticalContentAlignment = VerticalAlignment.Center, BorderBrush = Legacy.B("#CBD5E1"), Foreground = Legacy.B("#374151") };
    private readonly Border _scheduleBadge = new() { MinWidth = 16, Height = 16, CornerRadius = new CornerRadius(8), Background = Legacy.B("#EF4444"), Padding = new Thickness(4, 0, 4, 0), HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Top, Margin = new Thickness(0, -6, -6, 0), Visibility = Visibility.Collapsed, IsHitTestVisible = false };
    private readonly TextBlock _upd = new() { FontSize = 13, Foreground = Legacy.B("#EF4444"), FontWeight = FontWeights.Medium, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 0, 0) };
    private readonly Button _historyBtn = new() { Padding = new Thickness(8, 1, 8, 1), MinHeight = 24 };
    private readonly Button _resetBtn = new() { Content = "입력초기화" };

    public PropertyEditWindow(PropertyService svc, PropertyDetail d) : base("물건", 1250, 800)
    {
        _svc = svc;
        _d = d;
        var p = d.Pt;
        ResizeMode = ResizeMode.CanMinimize;
        MinWidth = 1250;
        BodyPadding = new Thickness(4, 0, 4, 0);   // 기존 form-content padding 4px(머리글은 따로 여백)

        // ---------- 하위 목록 ----------
        _holderCard = new HolderCard(p);
        _holderCard.Load(d.Holders, d.Shares);
        _memoCard = new MemoLineCard(MemoLineCard.Kind.Memo, _holderCard.Phones);
        _memoCard.Load(d.Memos);
        _consultCard = new MemoLineCard(MemoLineCard.Kind.Consult, _holderCard.Phones);
        _consultCard.Load(d.Consults);

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

        var body = new Grid();
        var leftCol = new ColumnDefinition { Width = new GridLength(630) };
        var rightCol = new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) };
        body.ColumnDefinitions.Add(leftCol);
        body.ColumnDefinitions.Add(rightCol);
        // 왼쪽: 물건명 행 + 유형별 폼 + 옵션(PropertyTypeForms) — 물건유형·세부유형이 바뀌면 다시 그린다
        var formHost = new ContentControl();
        void BuildForm()
        {
            formHost.Content = PropertyTypeForms.Build(FormCtx(), () =>
            {
                // 아직 원본 배치로 옮기지 않은 유형: 기존 일반 폼
                var stack = new StackPanel();
                stack.Children.Add(RowFormBuilder.Build(p, PropertyFields.Rows()));
                stack.Children.Add(ExtraRow(p));
                return stack;
            });
        }
        BuildForm();
        p.PropertyChanged += (_, e) => { if (e.PropertyName is "pt_type" or "sub_type") BuildForm(); };
        _historyBtn.Click += (_, _) => ShowHistory();
        body.Children.Add(new ScrollViewer { Content = formHost, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Padding = new Thickness(0, 0, 2, 0) });
        var right = RightCards();
        right.Margin = new Thickness(4, 0, 0, 0);
        Grid.SetColumn(right, 1);
        body.Children.Add(right);
        // 상담모드 ON → 물건특징·상담내용은 그대로 보이고, 소유자/임차인/공인중개사(연락처) 카드만 숨긴다.
        // 기존 useConsultMode는 우측 카드 전체를 숨겼으나 사용자 요청으로 바꿈(2026-10-28). 대시보드에서 바꾸면 열린 창에도 바로
        void ApplyConsult()
        {
            var on = AppServices.Settings.ConsultMode;
            _holderCard.Visibility = on ? Visibility.Collapsed : Visibility.Visible;
            _holderRow.Height = on ? new GridLength(0) : new GridLength(176);
        }
        ApplyConsult();
        body.Loaded += (_, _) => { AppServices.Settings.ConsultModeChanged += ApplyConsult; ApplyConsult(); };
        body.Unloaded += (_, _) => AppServices.Settings.ConsultModeChanged -= ApplyConsult;
        main.Children.Add(body);

        // ---------- 머리글 ----------
        var head = new DockPanel { Margin = new Thickness(12, 8, 0, 8) };
        void ShowTab(string v)
        {
            main.Visibility = v == "property" ? Visibility.Visible : Visibility.Collapsed;
            filesView.Visibility = v == "files" ? Visibility.Visible : Visibility.Collapsed;
            head.Children.RemoveAt(0);
            head.Children.Insert(0, Toggle(v));
        }
        // 기존 탭 토글: 4px 12px · 13px · 선택 #3b82f6(흰 글자, 굵게) / 미선택 흰 바탕 #64748b
        FrameworkElement Toggle(string cur)
        {
            var t = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 16, 0), VerticalAlignment = VerticalAlignment.Center };
            foreach (var (v, label, corner) in new[] { ("property", "기본정보", new CornerRadius(4, 0, 0, 4)), ("files", "평면도/사진", new CornerRadius(0, 4, 4, 0)) })
            {
                var on = v == cur;
                var b = new Border
                {
                    CornerRadius = corner, BorderBrush = Legacy.B("#CBD5E1"), BorderThickness = new Thickness(1), Background = on ? Legacy.B("#3B82F6") : Brushes.White,
                    Padding = new Thickness(12, 4, 12, 4), Margin = new Thickness(v == "files" ? 4 : 0, 0, 0, 0), Cursor = Cursors.Hand,
                    Child = new TextBlock { Text = label, FontSize = 13, FontWeight = on ? FontWeights.SemiBold : FontWeights.Normal, Foreground = on ? Brushes.White : Legacy.B("#64748B") },
                };
                b.MouseLeftButtonUp += (_, _) => ShowTab(v);
                t.Children.Add(b);
            }
            DockPanel.SetDock(t, Dock.Right);
            return t;
        }
        head.Children.Add(Toggle("property"));
        var titleLine = new StackPanel { Orientation = Orientation.Horizontal };
        titleLine.Children.Add(_title);
        titleLine.Children.Add(new TextBlock { Text = "담당자:", FontSize = 13, Foreground = Slate, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(16, 0, 4, 0) });
        _manager.Text = p.Str("rt_nm") ?? AppServices.Session.RtNm ?? AppServices.Session.UserId ?? "";
        _manager.IsReadOnly = !AppServices.Session.IsOwner;
        _manager.Background = _manager.IsReadOnly ? Legacy.B("#F1F5F9") : Brushes.White;
        _manager.ToolTip = _manager.IsReadOnly ? "대표 공인중개사만 수정할 수 있습니다." : null;
        Ui.Placeholder.Set(_manager, "담당자명", 4);
        titleLine.Children.Add(_manager);
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
        _scheduleBadge.Child = new TextBlock { FontSize = 12, FontWeight = FontWeights.Bold, Foreground = Brushes.White, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        var schedule = new Button { Content = "일정관리", Background = Legacy.B("#A855F7"), Foreground = Brushes.White, BorderThickness = new Thickness(0) };
        schedule.Click += (_, _) => OpenSchedule();
        LeftButtons.Children.Add(shareNet);
        LeftButtons.Children.Add(new Grid { Children = { schedule, _scheduleBadge } });   // 예정 일정 수 배지(기존 scheduleCount)

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

        Loaded += async (_, _) => { await LoadHistory(); await LoadScheduleCount(); };
    }

    // 기존 등록창은 삭제 버튼을 숨긴다(목록의 행 메뉴에서 삭제)
    protected override bool CanDelete => false;
    protected override string SaveLabel => _d.IsNew ? "등록 | 저장" : "수정 | 저장";

    protected override void OnModeChanged()
    {
        var p = _d.Pt;
        _title.Text = _d.IsNew ? "물건정보 등록" : "물건정보 수정";
        // 기존 창 제목: "물건 등록" / "물건 수정 - 물건명"
        Title = _d.IsNew ? "물건 등록" : $"물건 수정 - {p.Str("pt_name") ?? "물건정보"}";
        var reg = !_d.IsNew && DateTime.TryParse(p.Str("reg_dt"), out var rd) ? rd : DateTime.Today;
        // 기존 toLocaleDateString / toLocaleString(ko-KR) 형식: "2026. 10. 29." / "2026. 10. 29. 오후 6:49:00"
        var ko = System.Globalization.CultureInfo.GetCultureInfo("ko-KR");
        _meta.Text = $"등록일자: {reg.ToString("yyyy. M. d.", ko)}";
        _upd.Text = _d.IsNew ? "" : $"최근수정일: {(DateTime.TryParse(p.Str("upd_dt"), out var ud) ? ud.ToString("yyyy. M. d. tt h:mm:ss", ko) : "-")}";
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
            var type = LF.Sel(p, "pt_type", 132, Catalog.PropertyTypes, emptyLabel: null);
            type.VerticalAlignment = VerticalAlignment.Center;
            type.Margin = new Thickness(0, 0, 8, 0);
            left.Children.Add(type);
        }
        else
        {
            left.Children.Add(new TextBlock { Text = Catalog.PropertyTypeName(p.Str("pt_type")) ?? "-", FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 8, 0) });
        }
        // 세부유형(70): 재건축·재개발은 전부/입주권(재건축|재개발)/분양권, 아파트분양권은 없음, 그 밖은 "세부유형" + 유형별 목록
        var sub = new ContentControl { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 8, 0) };
        void BuildSub()
        {
            var t = p.Str("pt_type") ?? "";
            if (Catalog.RedevCodes.Contains(t))
            {
                p["sub_type"] ??= "전부";
                sub.Content = LF.Sel(p, "sub_type", 70, new[] { new Opt("전부", "전부"), new Opt("입주권", t == "SYCA104" ? "입주권(재건축)" : "입주권(재개발)"), new Opt("분양권", "분양권") }, emptyLabel: null);
            }
            else if (t != "SYCA105" && Catalog.SubTypes(t).Count > 0) sub.Content = LF.Sel(p, "sub_type", 70, Catalog.SubTypes(t), "세부유형");
            else sub.Content = null;
        }
        BuildSub();
        p.PropertyChanged += (_, e) => { if (e.PropertyName == "pt_type") BuildSub(); };
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
            zone.Visibility = PropertyFields.Redev(p) ? Visibility.Visible : Visibility.Collapsed;
        }
        Update();
        p.PropertyChanged += (_, e) => { if (e.PropertyName is "pt_sts" or "pt_type") Update(); };

        return new Border { Background = Yellow, BorderBrush = YellowLine, BorderThickness = new Thickness(2), Child = bar };
    }

    /// <summary>유형별 폼에 넘기는 값·동작(임대차현황서·필지목록은 이 창의 하위 목록 창)</summary>
    private PropertyTypeForms.Ctx FormCtx() => new(_d.Pt, _d.IsNew, _state, this,
        () => ShowChild("임대차현황서", _lease),
        () => ShowChild("필지목록", _parcels),
        () => _parcels.Items.Count(r => new[] { "jibun", "land_area", "land_category", "land_use", "other_restrictions" }.Any(r.Has)));

    /// <summary>소재지: 신규는 시/도·시/군/구·읍/면/동 + 지번(유형별 주소바), 수정은 글자(기존과 같이 소재지 고정)</summary>
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
        // 기존 renderAddressBar('location') — 유형이 바뀌면 다시(숙박·공장 상세주소, 토지 필지목록)
        var host = new ContentControl { VerticalAlignment = VerticalAlignment.Center };
        void Build() => host.Content = PropertyTypeForms.LocationBar(FormCtx());
        Build();
        p.PropertyChanged += (_, e) => { if (e.PropertyName == "pt_type") Build(); };
        sp.Children.Add(host);
        return sp;
    }

    /// <summary>종전유형 / 종전주소 / 종전면적 / 종전대지지분 — 재개발·재건축 입주권 전용(분양권 제외)</summary>
    private FrameworkElement FormerBar(Row p)
    {
        // 기존: 회색 줄(#f3f4f6 · 테두리 2px #cbd5e1) — 라벨(#e5e7eb 72px) + 칸들(13px, gap 8)
        var gray = Legacy.B("#E5E7EB");
        Border L(string text, double width = 72) => new()
        {
            Background = gray, BorderBrush = Line, BorderThickness = new Thickness(1), Width = width, Padding = new Thickness(10, 0, 10, 0), Margin = new Thickness(0, 0, 8, 0),
            Child = new TextBlock { Text = text, FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#111827"), VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = width > 0 ? HorizontalAlignment.Center : HorizontalAlignment.Left },
        };
        FrameworkElement In(string key, string ph, double width, bool right = false)
        {
            var tb = LF.Txt(p, key, width, ph, right, height: 24);
            tb.Padding = new Thickness(6, 0, 6, 0);
            tb.Margin = new Thickness(0, 0, 8, 0);
            tb.VerticalAlignment = VerticalAlignment.Center;
            return tb;
        }
        var sp = new WrapPanel { MinHeight = 30 };
        sp.Children.Add(L("종전유형"));
        // 종전유형: 분양권 계열·원투룸 제외
        var types = Catalog.PropertyTypes.Where(o => !o.Label.Contains("분양권") && o.Value != "SYCA117").ToList();
        var ft = LF.Sel(p, "former_pt_type", 104, types, "선택");
        ft.Margin = new Thickness(0, 0, 8, 0);
        ft.VerticalAlignment = VerticalAlignment.Center;
        sp.Children.Add(ft);
        sp.Children.Add(L("종전주소"));
        // AddressSelectorSimple을 종전 칸(former_*)으로 — 시/도·시/군/구·읍/면/동(·리)
        var addr = new AddressSelector(p, null, new Dictionary<string, string>
        {
            ["addr1"] = "former_addr1", ["addr2"] = "former_addr2", ["addr3"] = "former_addr3", ["addr4"] = "former_addr4",
            ["bjd_code"] = "former_bjd_code", ["danji_code"] = "former_danji_code",
        }) { Margin = new Thickness(0, 0, 4, 0), VerticalAlignment = VerticalAlignment.Center };
        sp.Children.Add(addr);
        sp.Children.Add(In("former_jibun", "지번", 55));
        sp.Children.Add(In("former_dong", "동", 60));
        sp.Children.Add(In("former_ho", "호", 60));
        var area = L("종전면적", double.NaN);
        sp.Children.Add(area);
        sp.Children.Add(In("former_area", "종전면적", 52, right: true));
        sp.Children.Add(L("종전대지지분", double.NaN));
        sp.Children.Add(In("former_land_share_ratio", "대지지분", 52, right: true));
        var box = new Border { Background = Legacy.B("#F3F4F6"), BorderBrush = Line, BorderThickness = new Thickness(2), Padding = new Thickness(0, 0, 8, 0), Child = sp };
        void Update() => box.Visibility = PropertyTypeForms.IsRedevJipju(p) ? Visibility.Visible : Visibility.Collapsed;
        Update();
        p.PropertyChanged += (_, e) => { if (e.PropertyName is "pt_type" or "sub_type") Update(); };
        return box;
    }

    /// <summary>왼쪽 폼 맨 아래: 과거데이터 건수 · 임대차현황서(건물·주택·상가류) · 필지목록(토지) — 기존은 행 안 버튼/모달</summary>
    private FrameworkElement ExtraRow(Row p)
    {
        var sp = new WrapPanel { Margin = new Thickness(6, 4, 6, 4) };
        sp.Children.Add(RowFormBuilder.SmallLabel("과거데이터"));
        if (_historyBtn.Parent is Panel old) old.Children.Remove(_historyBtn);   // 폼을 다시 그릴 때
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

    /// <summary>우측: 물건특징(flex 0.6, 최소 160) · 상담내용(flex 1.6, 최소 90) · 소유자/임차인/공인중개사(높이 172 고정, 위 4px)</summary>
    private FrameworkElement RightCards()
    {
        var g = new Grid();
        g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(0.6, GridUnitType.Star), MinHeight = 160 });
        g.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1.6, GridUnitType.Star), MinHeight = 90 });
        g.RowDefinitions.Add(_holderRow);
        g.Children.Add(_memoCard);
        _consultCard.Margin = new Thickness(0, -1, 0, 0);
        Grid.SetRow(_consultCard, 1);
        g.Children.Add(_consultCard);
        _holderCard.Margin = new Thickness(0, 4, 0, 0);
        Grid.SetRow(_holderCard, 2);
        g.Children.Add(_holderCard);
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
        _holderCard.Load(fresh.Holders, Array.Empty<Row>());
        _memoCard.Load(Array.Empty<Row>());
        _consultCard.Load(Array.Empty<Row>());
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

        var w = new Window { Title = "소유자/임차인 변경", Width = 380, SizeToContent = SizeToContent.Height, Owner = DialogOwner, WindowStartupLocation = WindowStartupLocation.CenterOwner, ResizeMode = ResizeMode.NoResize };
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
            _holderCard.AddPast(new Row { ["holder_type"] = "OWNER", ["holder_name"] = owner, ["holder_relation"] = "전 소유자", ["holder_reg_date"] = today });
            p["registry_owner"] = null;
            moved++;
        }
        if (ct.IsChecked == true && !string.IsNullOrEmpty(tenant))
        {
            _holderCard.AddPast(new Row { ["holder_type"] = "BUYER", ["holder_name"] = tenant, ["holder_relation"] = "전 임차인", ["holder_reg_date"] = today });
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
        SingleWindow.Show("property", new PropertyEditWindow(_svc, d));   // 같은 물건 창에 복사본을 띄운다
    }

    private void OpenSchedule()
    {
        if (_d.IsNew) { Toast.Show("물건을 먼저 저장하세요."); return; }
        var svc = AppServices.Create((sp, s) => new ScheduleService(sp, s));
        var r = svc.New(ptNo: _d.PtNo);
        Schedules.SchedulePage.Edit(svc, r);
        _ = LoadScheduleCount();
    }

    /// <summary>이 물건에 연동된 일정 중 아직 지나지 않은 것 수 → 일정관리 배지(99+)</summary>
    private async Task LoadScheduleCount()
    {
        var n = 0;
        if (_d.PtNo is { } no and > 0)
        {
            try
            {
                var rows = await AppServices.Create((sp, s) => new ScheduleService(sp, s)).ByPropertyAsync(no);
                n = rows.Count(x => DateTime.TryParse(x.Str("start_at"), out var st) && st >= DateTime.Now);
            }
            catch { n = 0; }
        }
        ((TextBlock)_scheduleBadge.Child).Text = n > 99 ? "99+" : n.ToString();
        _scheduleBadge.Visibility = n > 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private void ShowChild(string title, ChildListEditor editor)
    {
        if (editor.Parent is Panel old) old.Children.Remove(editor);
        var w = new Window { Title = title, Width = 980, Height = 480, Owner = DialogOwner, WindowStartupLocation = WindowStartupLocation.CenterOwner, Content = new Border { Padding = new Thickness(12), Child = editor } };
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
        var w = new Window { Title = "과거내역", Width = 900, Height = 420, Owner = DialogOwner, WindowStartupLocation = WindowStartupLocation.CenterOwner, Content = dp };
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
        foreach (var e in new[] { _lease, _parcels }) e.Commit();
        Replace(_d.Holders, _holderCard.Holders);
        Replace(_d.Memos, _memoCard.Items);
        Replace(_d.Consults, _consultCard.Items);
        Replace(_d.Shares, _holderCard.Shares);
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

    /// <summary>삭제 방식 선택(기존 DeleteChoiceDialog) + 연결된 일정·첨부가 있으면 연동 정보 삭제 여부</summary>
    protected override Task<bool> ConfirmAndDeleteAsync() => PropertyDelete.ConfirmAndDeleteAsync(_svc, new[] { _d.PtNo!.Value });
}

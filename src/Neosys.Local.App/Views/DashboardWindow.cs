using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views;

/// <summary>
/// 대시보드(메인 창) — 기존 DashboardPage + Electron 메인 창(폭 420, 모니터 오른쪽 위 고정).
/// 회원정보·인사말·멤버십·추천인 코드·상담모드·공지/이벤트 롤링·메뉴 카드(3열)·사무소관리·고객센터.
/// 공지·이벤트·멤버십·인사말은 서버 데이터라 운영 서버 API를 그대로 부른다. 메뉴를 누르면 메뉴별 창이 열린다.
/// </summary>
public sealed class DashboardWindow : Window
{
    private const string DefaultGreeting = "즐거운 하루 되세요";
    private static readonly Dictionary<string, string> RtTypeLabel = new()
    {
        ["RTTYP01"] = "대표", ["RTTYP02"] = "소속공인중개사", ["RTTYP03"] = "중개보조원", ["RTTYP04"] = "기타",
    };

    private readonly StackPanel _root = new() { Margin = new Thickness(12, 12, 12, 12) };
    private readonly TextBlock _greeting = new() { FontSize = 15, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 2, 0, 0) };
    private readonly WrapPanel _benefits = new() { Margin = new Thickness(0, 4, 0, 0) };
    private readonly Grid _banner = new() { Height = 22, ClipToBounds = true };
    private List<RollingRules.Item> _rolling = new();
    private int _rollIndex;
    private Border _toggle = null!;

    public bool LogoutRequested { get; private set; }

    public DashboardWindow()
    {
        var area = SystemParameters.WorkArea;
        Title = "네오시스 - 대시보드";
        Width = 420;
        Height = Math.Min(920, area.Height);
        Left = area.Right - Width;
        Top = area.Top;
        ResizeMode = ResizeMode.CanMinimize;
        WindowStartupLocation = WindowStartupLocation.Manual;
        Background = (Brush)FindResource("PageBack");
        Content = new ScrollViewer { Content = _root, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        Build();
        Loaded += async (_, _) => await LoadServerDataAsync();
        var roll = new DispatcherTimer { Interval = RollingRules.Interval };   // 기존 5초
        roll.Tick += (_, _) => { if (_rolling.Count > 1) { _rollIndex++; RenderBanner(); } };
        roll.Start();
        Closed += (_, _) => roll.Stop();
    }

    private static Brush B(string hex) => (Brush)new BrushConverter().ConvertFromString(hex)!;

    private static TextBlock T(string text, double size = 13, FontWeight? weight = null, string color = "#111827") =>
        new() { Text = text, FontSize = size, FontWeight = weight ?? FontWeights.Medium, Foreground = B(color), VerticalAlignment = VerticalAlignment.Center };

    private static TextBlock Icon(string glyph, string color = "#4F46E5", double size = 15) => new()
    {
        Text = glyph, FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), FontSize = size, Foreground = B(color),
        VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 7, 0),
    };

    /// <summary>테두리 색이 있는 작은 버튼(기존 인사말 편집·미션문구 등)</summary>
    private static Button Chip(string text, string fg, string border, Action click, string? glyph = null, double size = 14)
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal };
        if (glyph is not null) sp.Children.Add(Icon(glyph, fg, 14));
        sp.Children.Add(new TextBlock { Text = text, FontSize = size, FontWeight = FontWeights.Bold, Foreground = B(fg) });
        var b = new Button { Content = sp, BorderBrush = B(border), Padding = new Thickness(8, 5, 8, 5), Margin = new Thickness(6, 0, 0, 0) };
        b.Click += (_, _) => click();
        return b;
    }

    /// <summary>비밀번호(CODEME) 확인 후 로컬 DB 테이블·데이터 보기 창</summary>
    private async Task OpenDbViewerAsync()
    {
        var ok = await PasswordCheck.AskAsync(this, "데이터 확인", pw => Task.FromResult(DbInspectService.CheckPassword(pw)), "비밀번호를 입력하세요.");
        if (ok) new Dev.DbViewerWindow { Owner = this }.Show();
    }

    private void Build()
    {
        var s = AppServices.Session;
        var grade = !string.IsNullOrWhiteSpace(s.Grade) && s.Grade.Trim().ToLowerInvariant() is not ("user" or "admin") ? s.Grade.Trim() : null;
        var jobTitle = grade ?? (s.RtType is { } t && RtTypeLabel.TryGetValue(t, out var l) ? l : "");

        // 1. 회원정보(이름+직급님 · 인사말 편집 · 로그아웃)
        var head = new DockPanel();
        var logout = new Button { Content = "로그아웃", FontSize = 13, Padding = new Thickness(10, 3, 10, 3), BorderBrush = B("#D1D5DB") };
        logout.Click += (_, _) => Logout();
        DockPanel.SetDock(logout, Dock.Right);
        head.Children.Add(logout);
        var nameLine = new WrapPanel();
        nameLine.Children.Add(new TextBlock { Text = $"{s.RtNm ?? s.UserId}{(jobTitle.Length > 0 ? " " + jobTitle : "")}님", FontSize = 20, FontWeight = FontWeights.ExtraBold, Foreground = B("#111827"), Margin = new Thickness(0, 0, 8, 0) });
        if (s.IsOwner) nameLine.Children.Add(Chip("인사말 편집", "#4F46E5", "#C7D2FE", EditGreeting, size: 13).With(x => x.Margin = new Thickness(0)));
        // 톱니바퀴: 로컬 DB 데이터 확인(임시 — 저장 여부 확인용, 비밀번호 확인 후)
        var gear = new Button
        {
            Content = new TextBlock { Text = "", FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), FontSize = 14, Foreground = B("#6B7280") },
            ToolTip = "데이터 확인", BorderBrush = B("#D1D5DB"), Padding = new Thickness(7, 5, 7, 5), Margin = new Thickness(6, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center,
        };
        gear.Click += async (_, _) => await OpenDbViewerAsync();
        nameLine.Children.Add(gear);
        head.Children.Add(nameLine);
        _root.Children.Add(head);

        _greeting.Text = string.IsNullOrWhiteSpace(s.Greeting) ? DefaultGreeting : s.Greeting;
        _greeting.Foreground = B("#4F46E5");
        _root.Children.Add(_greeting);
        RenderBenefits(null);
        _root.Children.Add(_benefits);

        // 내 추천인 코드(대표)
        if (s.IsOwner)
        {
            var refRow = new WrapPanel { Margin = new Thickness(0, 6, 0, 0) };
            refRow.Children.Add(T("내 추천인 코드", 13, FontWeights.Bold, "#475569"));
            refRow.Children.Add(new Border
            {
                Background = B("#F1F5F9"), BorderBrush = B("#E2E8F0"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(6),
                Padding = new Thickness(8, 2, 8, 2), Margin = new Thickness(8, 0, 6, 0),
                Child = new TextBlock { Text = s.ReferralCode ?? "-", FontSize = 13, FontWeight = FontWeights.ExtraBold, Foreground = B("#334155") },
            });
            var copy = new Button { Content = Icon("", "#64748B", 13), Padding = new Thickness(7, 2, 3, 2), Margin = new Thickness(0, 0, 6, 0), ToolTip = "추천인 코드 복사" };
            copy.Click += (_, _) => { if (s.ReferralCode is { Length: > 0 } c) { Clipboard.SetText(c); Toast.Success("추천인 코드가 복사되었습니다."); } else Toast.Show("추천인 코드가 없습니다."); };
            refRow.Children.Add(copy);
            refRow.Children.Add(Chip("추천목록", "#475569", "#CBD5E1", () => Community.CommunityPopups.ShowSingle(() => new Community.ReferralWindow()), "", 13));
            _root.Children.Add(refRow);
        }
        _root.Children.Add(new Border { Height = 1, Background = B("#E5E7EB"), Margin = new Thickness(0, 8, 0, 8) });

        // 상담모드(좌) / 미션문구·리뷰이벤트·매뉴얼(우)
        var modeRow = new DockPanel { Margin = new Thickness(0, 0, 0, 8) };
        var right = new StackPanel { Orientation = Orientation.Horizontal };
        right.Children.Add(Chip("미션문구", "#7C3AED", "#DDD6FE", () => Community.CommunityPopups.ShowSingle(() => new Community.EventEntryWindow(review: false), w => !w.Review), "", 13));
        right.Children.Add(Chip("리뷰이벤트", "#BE185D", "#FBCFE8", () => Community.CommunityPopups.ShowSingle(() => new Community.EventEntryWindow(review: true), w => w.Review), "", 13));
        right.Children.Add(Chip("매뉴얼", "#4F46E5", "#C7D2FE", () => Toast.Show("매뉴얼은 준비 중입니다."), "", 13));
        DockPanel.SetDock(right, Dock.Right);
        modeRow.Children.Add(right);
        modeRow.Children.Add(ConsultToggle());
        _root.Children.Add(modeRow);

        // 2. 공지사항/이벤트 롤링 배너
        var bannerRow = new DockPanel();
        bannerRow.Children.Add(Icon("", "#4F46E5", 14));
        var more = T("더보기 →", 12, null, "#9CA3AF");
        more.Margin = new Thickness(12, 0, 0, 0);   // 기존 gap-3
        DockPanel.SetDock(more, Dock.Right);
        bannerRow.Children.Add(more);
        bannerRow.Children.Add(_banner);
        var banner = new Border
        {
            Background = Brushes.White, BorderBrush = B("#C7D2FE"), BorderThickness = new Thickness(2), CornerRadius = new CornerRadius(8),
            Padding = new Thickness(14, 9, 14, 9), Margin = new Thickness(0, 0, 0, 8), Child = bannerRow, Cursor = Cursors.Hand,
        };
        // 누르면 지금 보이는 글의 탭(공지사항/이벤트)·그 글로 커뮤니티 창(기존 openCommunity)
        banner.MouseLeftButtonUp += (_, _) =>
        {
            var cur = _rolling.Count == 0 ? null : _rolling[_rollIndex % _rolling.Count];
            Community.CommunityWindow.Open(cur?.Kind ?? CommunityRules.Notice, cur?.Id);
        };
        _root.Children.Add(banner);
        RenderBanner();

        // 3. 메뉴 카드(3열) — 기존 MENU_LAYOUT + 하단 기능 메뉴 순서
        var grid = new UniformGrid3();
        foreach (var tile in Tiles()) grid.Add(MenuTile(tile));
        _root.Children.Add(grid.Panel);

        // 사무소관리(대표만) — 전체폭, 비밀번호 재확인 후 하위메뉴
        if (s.IsOwner)
        {
            var sp = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center };
            sp.Children.Add(Icon(""));
            sp.Children.Add(T("사무소관리 | 직원관리 | 가입비 및 상품결제", 14, FontWeights.SemiBold));
            sp.Children.Add(Icon("", "#9CA3AF", 12).With(x => x.Margin = new Thickness(7, 0, 0, 0)));
            var office = new Button { Style = (Style)FindResource("MenuTile"), Content = sp, HorizontalContentAlignment = HorizontalAlignment.Center, Padding = new Thickness(12, 12, 12, 12), Margin = new Thickness(0, 10, 0, 0) };
            office.Click += (_, _) => OpenOffice();
            _root.Children.Add(office);
        }

        // 고객센터 + 카톡문의
        var cs = new StackPanel { Margin = new Thickness(0, 14, 0, 6) };
        var csHead = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 4) };
        csHead.Children.Add(new TextBlock { Text = "고객센터", FontSize = 18, FontWeight = FontWeights.ExtraBold, Foreground = B("#111827"), VerticalAlignment = VerticalAlignment.Bottom, Margin = new Thickness(0, 0, 12, 3) });
        csHead.Children.Add(new TextBlock { Text = "02-381-2455", FontSize = 26, FontWeight = FontWeights.ExtraBold, Foreground = B("#4F46E5") });
        cs.Children.Add(csHead);
        foreach (var (k, v) in new[] { ("평일", "10:00~18:00"), ("점심시간", "12:00~13:30"), ("토요일", "10:00~14:00") })
        {
            var row = new StackPanel { Orientation = Orientation.Horizontal };
            row.Children.Add(new TextBlock { Text = k, Width = 68, FontSize = 15, FontWeight = FontWeights.Bold, Foreground = B("#334155") });
            row.Children.Add(new TextBlock { Text = "|", FontSize = 15, Foreground = B("#CBD5E1"), Margin = new Thickness(0, 0, 10, 0) });
            row.Children.Add(new TextBlock { Text = v, FontSize = 15, FontWeight = FontWeights.Bold, Foreground = B("#334155") });
            cs.Children.Add(row);
        }
        _root.Children.Add(cs);
        _root.Children.Add(new Border { Height = 1, Background = B("#E5E7EB"), Margin = new Thickness(0, 2, 0, 8) });
        try
        {
            var chat = new Image { Source = new BitmapImage(new Uri("pack://application:,,,/Assets/chat.png")), Cursor = Cursors.Hand, ToolTip = "카카오톡 채팅 상담", Stretch = Stretch.Uniform, MaxWidth = 380 };
            chat.MouseLeftButtonUp += (_, _) => OpenUrl("http://pf.kakao.com/_wxjxcrX/chat");
            _root.Children.Add(chat);
        }
        catch { /* 이미지 없음 */ }
    }

    private sealed record Tile(string Title, string Glyph, string? MenuKey, string? PermKey, Action? Custom = null, bool Highlight = false);

    private IEnumerable<Tile> Tiles()
    {
        Action Server(string name) => () => Toast.Show($"{name}은(는) 서버 기능이라 로컬 버전에서는 네오시스 웹에서 이용합니다.");
        return new[]
        {
            new Tile("네오봇", "", "neobot", "네오봇", Highlight: true),
            new Tile("물건관리", "", "property", "물건관리"),
            new Tile("고객관리", "", "customer", "고객관리"),
            new Tile("공동중개망", "", null, "공동중개망", Server("공동중개망")),
            new Tile("계약관리", "", "contract", "계약관리"),
            new Tile("협력업체관리", "", "vendor", "협력업체관리"),
            new Tile("일정관리", "", "schedule", null),
            new Tile("쪽지관리", "", null, null, Server("쪽지관리")),
            new Tile("대량문자관리", "", null, "문자관리", Server("대량문자관리")),
            new Tile("만기관리", "", "expiry", "만기안내"),
            new Tile("업무일지", "", "worklog", null),
            new Tile("커뮤니티", "", null, null, () => Community.CommunityWindow.Open()),
            new Tile("메모", "", "memo", null),
            new Tile("PC폰관리", "", null, null, () => Toast.Show("통신사 승인 대기중입니다.")),
            new Tile("원격지원", "", null, null, () => Dialogs.Info("원격지원이 필요하면 고객센터(02-381-2455)로 연락해 주세요.\n상담원이 원격지원 프로그램 접속 방법을 안내해 드립니다.", "원격지원")),
        };
    }

    private Button MenuTile(Tile t)
    {
        var allowed = AppServices.Session.AllowedMenus is not { } set || t.PermKey is null || set.Contains(t.PermKey);
        var sp = new StackPanel { Orientation = Orientation.Horizontal };
        if (!allowed)
        {
            sp.Children.Add(Icon("", "#94A3B8", 14));
            var txt = new StackPanel();
            txt.Children.Add(T(t.Title, 14, FontWeights.SemiBold, "#94A3B8"));
            txt.Children.Add(T("권한없음", 12, FontWeights.SemiBold, "#94A3B8"));
            sp.Children.Add(txt);
        }
        else
        {
            sp.Children.Add(Icon(t.Glyph, t.Highlight ? "#FFFFFF" : "#4F46E5", 15));
            sp.Children.Add(new TextBlock { Text = t.Title, FontSize = 13.5, FontWeight = FontWeights.SemiBold, Foreground = B(t.Highlight ? "#FFFFFF" : "#111827"), TextTrimming = TextTrimming.CharacterEllipsis, VerticalAlignment = VerticalAlignment.Center });
        }
        var b = new Button { Style = (Style)FindResource("MenuTile"), Content = sp, Height = 46, Padding = new Thickness(10, 8, 6, 8) };
        if (t.Highlight && allowed) { b.Background = B("#7C3AED"); b.BorderBrush = B("#7C3AED"); }
        if (!allowed) { b.Background = B("#F9FAFB"); b.Cursor = Cursors.No; }
        b.Click += (_, _) =>
        {
            if (!allowed) { Toast.Error("권한이 없습니다."); return; }
            if (t.Custom is not null) t.Custom();
            else if (t.MenuKey is not null) WindowManager.OpenMenu(t.MenuKey);
        };
        return b;
    }

    private UIElement ConsultToggle()
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal, Cursor = Cursors.Hand, Background = Brushes.Transparent, ToolTip = "상담모드: ON 시 물건/고객 폼의 우측 카드(특징·상담내용·소유자 등)가 숨겨집니다" };
        var label = T("상담모드", 13, FontWeights.ExtraBold);
        label.Margin = new Thickness(0, 0, 6, 0);
        var knob = new Border { Width = 16, Height = 16, CornerRadius = new CornerRadius(8), Background = Brushes.White, HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(2, 0, 2, 0) };
        _toggle = new Border { Width = 38, Height = 20, CornerRadius = new CornerRadius(10), Child = knob };
        void Paint()
        {
            var on = AppServices.Settings.ConsultMode;
            _toggle.Background = B(on ? "#4F46E5" : "#CBD5E1");
            knob.HorizontalAlignment = on ? HorizontalAlignment.Right : HorizontalAlignment.Left;
            label.Foreground = B(on ? "#4F46E5" : "#111827");
        }
        Paint();
        sp.MouseLeftButtonUp += (_, _) =>
        {
            AppServices.Settings.ConsultMode = !AppServices.Settings.ConsultMode;
            try { AppServices.Settings.Save(); } catch { /* 설정 저장 실패는 무시 */ }
            Paint();
        };
        sp.Children.Add(label);
        sp.Children.Add(_toggle);
        return sp;
    }

    private void RenderBenefits(Row? m)
    {
        _benefits.Children.Clear();
        string? V(string a, string b) => m?.Str(a) ?? m?.Str(b);
        void Add(string label, string value, string color = "#334155")
        {
            var tb = new TextBlock { FontSize = 13, Margin = new Thickness(0, 0, 12, 0) };
            tb.Inlines.Add(new System.Windows.Documents.Run(label + " ") { Foreground = B("#475569"), FontWeight = FontWeights.SemiBold });
            tb.Inlines.Add(new System.Windows.Documents.Run(value) { Foreground = B(color), FontWeight = FontWeights.ExtraBold });
            _benefits.Children.Add(tb);
        }
        Add("무료개월", $"{V("FreeMonths", "freeMonths") ?? "0"}개월");
        if (m is null) { _benefits.Children.Add(T("가입된 상품이 없습니다.", 13, FontWeights.Bold, "#DC2626")); return; }
        if (V("RegDt", "regDt") is { Length: >= 10 } reg) Add("가입일", reg[..10]);
        if (V("NextPaymentDate", "nextPaymentDate") is { Length: >= 10 } next) Add("다음결제", next[..10]);
    }

    /// <summary>공지/이벤트 롤링 한 줄(기존: 종류 · N · 제목 · 날짜, 위로 밀려 올라오는 0.5초 애니메이션)</summary>
    private void RenderBanner()
    {
        _banner.Children.Clear();
        if (_rolling.Count == 0)
        {
            _banner.Children.Add(T("등록된 공지사항/이벤트가 없습니다.", 13, null, "#6B7280"));
            return;
        }
        var it = _rolling[_rollIndex % _rolling.Count];
        var row = new DockPanel();
        var k = T(it.Kind, 12, FontWeights.SemiBold, it.Kind == CommunityRules.Notice ? "#4F46E5" : "#9333EA");
        k.Margin = new Thickness(0, 0, 8, 0);
        row.Children.Add(k);
        // N 배지는 공지사항에만(이벤트 제외)
        if (RollingRules.IsNew(it, DateTime.Now))
            row.Children.Add(new Border { Background = B("#EF4444"), CornerRadius = new CornerRadius(3), Padding = new Thickness(4, 0, 4, 0), Margin = new Thickness(0, 0, 6, 0), Child = T("N", 11, FontWeights.Bold, "#FFFFFF") });
        var dt = T(RollingRules.DateText(it.Date), 12, null, "#6B7280");
        DockPanel.SetDock(dt, Dock.Right);
        row.Children.Add(dt);
        row.Children.Add(new TextBlock { Text = it.Title, FontSize = 14, FontWeight = FontWeights.Medium, TextTrimming = TextTrimming.CharacterEllipsis, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 8, 0) });
        row.RenderTransform = new TranslateTransform(0, 22);
        row.Opacity = 0;
        _banner.Children.Add(row);
        var dur = TimeSpan.FromMilliseconds(500);
        row.RenderTransform.BeginAnimation(TranslateTransform.YProperty, new System.Windows.Media.Animation.DoubleAnimation(22, 0, dur) { EasingFunction = new System.Windows.Media.Animation.QuadraticEase() });
        row.BeginAnimation(OpacityProperty, new System.Windows.Media.Animation.DoubleAnimation(0, 1, dur));
    }

    /// <summary>공지·이벤트·멤버십(서버 조회) — 실패해도 대시보드는 그대로 쓴다</summary>
    private async Task LoadServerDataAsync()
    {
        var s = AppServices.Session;
        // 롤링: 공지(최근 5건, 대시보드 표기 'N' 제외) + 이벤트(공개·대시보드 표시) — 기존 loadDashboardData
        List<Row> notices = new(), events = new();
        try { notices = await AppServices.Server.GetNoticesAsync(5); } catch { /* 오프라인 */ }
        try { events = await AppServices.Server.GetDashboardEventsAsync(); } catch { /* 오프라인 */ }
        _rolling = RollingRules.Build(notices, events);
        _rollIndex = 0;
        RenderBanner();
        if (s.OffNo is { } off)
        {
            try { RenderBenefits(await AppServices.Server.GetMembershipAsync(off)); }
            catch { /* 오프라인 */ }
        }
        // 참여 이벤트 확정 알림(대표만, 띄우면 서버에 확인 처리 — 기존 eventWins)
        await Community.EventWinWindow.ShowPendingAsync(this);
        // 로그인 후 공지·이벤트 팝업(게시기간·오늘/다시 보지 않음 — 기존 NoticePopup)
        await Community.NoticePopupWindow.ShowPendingAsync(this);
    }

    private void EditGreeting()
    {
        var s = AppServices.Session;
        var r = new Row { ["greeting"] = _greeting.Text, ["__key"] = 1L };
        var w = new FormEditWindow("인사말", r, "__key", new[] { F.Text("greeting", "인사말", "예: 즐거운 하루 되세요").Span(2) }, async x =>
        {
            var v = string.IsNullOrWhiteSpace(x.Str("greeting")) ? DefaultGreeting : x.Str("greeting")!.Trim();
            if (s.OffNo is { } off) await AppServices.Server.UpdateGreetingAsync(off, v, s.UserId);
            s.Greeting = v;
            _greeting.Text = v;
            return 1;
        }, columns: 1, width: 460, height: 200) { Owner = this };
        w.ShowAndReport();
    }

    /// <summary>사무실관리 — 비밀번호 재확인(서버 로그인 API) 통과 즉시 허브 창(사무실정보·직원관리·가입비 결제·상품가입)을 연다(기존과 같이 하위메뉴 단계 없음)</summary>
    private async void OpenOffice()
    {
        if (await PasswordCheck.AskAsync(this, "사무실관리")) WindowManager.OpenMenu("office");
    }

    private void Logout()
    {
        if (!Dialogs.Confirm("로그아웃 하시겠습니까?")) return;
        LogoutRequested = true;
        WindowManager.CloseAll();
        AppServices.ClearSession();
        Close();
    }

    private static void OpenUrl(string url)
    {
        Dialogs.OpenExternal(url);
    }

    /// <summary>3열 균등 격자(rounded 카드 사이 간격 10)</summary>
    private sealed class UniformGrid3
    {
        public Grid Panel { get; } = new();
        private int _n;

        public UniformGrid3()
        {
            for (int i = 0; i < 3; i++) Panel.ColumnDefinitions.Add(new ColumnDefinition());
        }

        public void Add(FrameworkElement e)
        {
            if (_n % 3 == 0) Panel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            e.Margin = new Thickness(_n % 3 == 0 ? 0 : 5, _n < 3 ? 0 : 10, _n % 3 == 2 ? 0 : 5, 0);
            Grid.SetRow(e, _n / 3);
            Grid.SetColumn(e, _n % 3);
            Panel.Children.Add(e);
            _n++;
        }
    }
}

/// <summary>사무소관리 진입 전 비밀번호 재확인(기존 officePw 모달 — 서버 로그인 API로 확인)</summary>
public static class PasswordCheck
{
    /// <param name="verify">비밀번호 확인 방법(없으면 서버 계정 비밀번호 확인)</param>
    public static async Task<bool> AskAsync(Window owner, string title, Func<string, Task<bool>>? verify = null, string? message = null)
    {
        var pw = new PasswordBox { Margin = new Thickness(0, 6, 0, 0) };
        var err = new TextBlock { Foreground = Brushes.Firebrick, FontSize = 13, Margin = new Thickness(0, 6, 0, 0) };
        var ok = new Button { Content = "확인", Style = (Style)Application.Current.FindResource("PrimaryButton"), MinWidth = 70, IsDefault = true };
        var cancel = new Button { Content = "취소", MinWidth = 70, IsCancel = true };
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 14, 0, 0) };
        buttons.Children.Add(cancel);
        buttons.Children.Add(ok);
        var body = new StackPanel { Margin = new Thickness(16) };
        body.Children.Add(new TextBlock { Text = message ?? "보안을 위해 비밀번호를 다시 입력해주세요.", FontSize = 14, FontWeight = FontWeights.SemiBold });
        body.Children.Add(pw);
        body.Children.Add(err);
        body.Children.Add(buttons);
        var w = new Window
        {
            Title = title, Width = 380, SizeToContent = SizeToContent.Height, ResizeMode = ResizeMode.NoResize, Owner = owner,
            WindowStartupLocation = WindowStartupLocation.CenterOwner, Content = body,
        };
        var passed = false;
        ok.Click += async (_, _) =>
        {
            if (pw.Password.Length == 0) { err.Text = "비밀번호를 입력하세요."; return; }
            ok.IsEnabled = false;
            ok.Content = "확인 중...";
            passed = verify is not null ? await verify(pw.Password) : await AppServices.Server.VerifyPasswordAsync(AppServices.Session.UserId, pw.Password);
            ok.IsEnabled = true;
            ok.Content = "확인";
            if (passed) w.Close(); else err.Text = "비밀번호가 일치하지 않습니다.";
        };
        w.Loaded += (_, _) => pw.Focus();
        w.ShowDialog();
        await Task.CompletedTask;
        return passed;
    }
}

internal static class UiExt
{
    public static T With<T>(this T x, Action<T> a) { a(x); return x; }
}

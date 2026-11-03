#if DEBUG
using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.App.Views;

namespace Neosys.Local.App;

/// <summary>
/// 개발용(디버그 빌드 전용) 화면 캡처: 서버 로그인 없이 테스트 세션으로 메뉴/등록창을 띄워 PNG로 저장한다.
///   NeosysLight.exe --snapshot &lt;메뉴키&gt; &lt;출력.png&gt; [new|first]
/// DB는 환경변수 NEOSYS_DB로 지정한 파일을 쓴다(운영 데이터와 분리).
/// </summary>
internal static class DevSnapshot
{
    public static bool TryRun(App app, string[] args)
    {
        if (args.Length < 3 || args[0] != "--snapshot") return false;
        var key = args[1];
        var output = Path.GetFullPath(args[2]);
        var mode = args.Length > 3 ? args[3] : null;

        app.Dispatcher.InvokeAsync(async () =>
        {
            try
            {
                // 스냅샷은 운영 서버를 부르지 않는다(연결 안 되는 주소로 고정)
                // (NEOSYS_SNAPSHOT_API = 화면 확인용 가짜 서버 주소 — 견본 응답만. 지정하지 않으면 연결 안 되는 주소)
                Environment.SetEnvironmentVariable("NEOSYS_API", Environment.GetEnvironmentVariable("NEOSYS_SNAPSHOT_API") ?? "http://127.0.0.1:9");
                await AppServices.InitializeAsync();
                await AppServices.OpenAccountAsync("dev");   // NEOSYS_DB가 있으면 그 파일, 없으면 dev 계정 DB
                AppServices.SetSession(new AppSession { RtNo = 1, OffNo = 1, UserId = "dev", RtNm = "개발자", RtType = "RTTYP01", OffNm = "테스트 사무소" });
                // NEOSYS_CONSULT=0/1 — 상담모드를 이번 캡처에만 지정(설정 파일에는 저장하지 않음)
                var consult = Environment.GetEnvironmentVariable("NEOSYS_CONSULT");
                if (consult is "0" or "1") AppServices.Settings.ConsultMode = consult == "1";
                await DevSamples.EnsureAsync();
                if (key == "fonttest")
                {
                    // 글자 굵기 비교(원본 Electron 화면과 잉크 양 맞추기) — 줄마다 높이 50, 실제 화면 캡처(_screen.png)
                    var rows = new (string Text, double Size, FontWeight Weight, TextRenderingMode Render)[]
                    {
                        ("네오시스", 30, FontWeights.ExtraBold, TextRenderingMode.Auto), ("네오시스", 30, FontWeights.Bold, TextRenderingMode.Auto),
                        ("네오시스", 30, FontWeights.ExtraBold, TextRenderingMode.Grayscale), ("네오시스", 30, FontWeights.Bold, TextRenderingMode.Grayscale),
                        ("평일  10:00~18:00", 15, FontWeights.Bold, TextRenderingMode.Auto), ("평일  10:00~18:00", 15, FontWeights.SemiBold, TextRenderingMode.Auto),
                        ("평일  10:00~18:00", 15, FontWeights.Bold, TextRenderingMode.Grayscale), ("평일  10:00~18:00", 15, FontWeights.SemiBold, TextRenderingMode.Grayscale),
                        ("tester", 13, FontWeights.Medium, TextRenderingMode.Auto), ("tester", 13, FontWeights.Normal, TextRenderingMode.Auto),
                        ("tester", 13, FontWeights.Medium, TextRenderingMode.Grayscale), ("tester", 13, FontWeights.Normal, TextRenderingMode.Grayscale),
                    };
                    var panel = new System.Windows.Controls.StackPanel { Background = new SolidColorBrush(Color.FromRgb(0xF9, 0xFA, 0xFB)) };
                    foreach (var r in rows)
                    {
                        var tb = new System.Windows.Controls.TextBlock { Text = r.Text, FontSize = r.Size, FontWeight = r.Weight, Foreground = new SolidColorBrush(Color.FromRgb(0x11, 0x18, 0x27)), Height = 50, Margin = new Thickness(20, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center };
                        TextOptions.SetTextRenderingMode(tb, r.Render);
                        panel.Children.Add(tb);
                    }
                    var fw = new Window { Content = panel, Width = 360, SizeToContent = SizeToContent.Height, Topmost = true, ShowActivated = false, WindowStartupLocation = WindowStartupLocation.CenterScreen };
                    app.MainWindow = fw;
                    fw.Show();
                    await Delay(1000);
                    SaveScreen(fw, Path.ChangeExtension(output, null) + "_screen.png");
                    Environment.Exit(0);
                }
                if (key == "login")
                {
                    var login = new LoginWindow { ShowActivated = false };
                    // NEOSYS_TEXTMODE=Display/Ideal — 글자 렌더링 방식 비교용(이번 캡처에만)
                    if (Enum.TryParse<TextFormattingMode>(Environment.GetEnvironmentVariable("NEOSYS_TEXTMODE"), out var tm)) TextOptions.SetTextFormattingMode(login, tm);
                    app.MainWindow = login;
                    if (Environment.GetEnvironmentVariable("NEOSYS_SCREEN") == "1") login.Topmost = true;
                    login.Show();
                    await Delay(1000);
                    Save(login, output);
                    if (login.Topmost) SaveScreen(login, Path.ChangeExtension(output, null) + "_screen.png");
                    Environment.Exit(0);
                }
                if (key is "community" or "referral" or "freemonths" or "eventwin" or "update")
                {
                    // 커뮤니티(mode = 탭 이름, "탭:글번호"면 그 글 상세, "탭:new"면 글쓰기) · 추천 목록 · 이벤트 확정 알림(견본)
                    var parts = (mode ?? "").Split(':');
                    Window w = key switch
                    {
                        "community" => new Views.Community.CommunityWindow(parts[0].Length > 0 ? parts[0] : null, parts.Length > 1 && long.TryParse(parts[1], out var pid) ? pid : null,
                            compose: parts.Length > 1 && parts[1] == "new"),
                        "eventwin" => Views.Community.EventWinWindow.Preview(),
                        "update" => Views.UpdateWindow.Preview(),
                        "freemonths" => new Views.Community.FreeMonthsWindow(),
                        _ => new Views.Community.ReferralWindow(),
                    };
                    w.ShowActivated = false;
                    app.MainWindow = w;
                    w.Show();
                    await Delay(5000);   // 서버 조회 + WebView2 그리기
                    await CaptureWebViewsAsync(w);
                    Save(w, output);
                    Environment.Exit(0);
                }
                if (key == "signup")
                {
                    // 회원가입 창(서버 호출 없음) — mode = referral이면 추천인 '있음'을 고른 상태
                    var w = new SignupWindow { ShowActivated = false };
                    if (mode == "referral") w.DevSelectReferral();
                    app.MainWindow = w;
                    w.Show();
                    await Delay(800);
                    Save(w, output);
                    Environment.Exit(0);
                }
                if (key == "shareinfo")
                {
                    // 공유 정보 알림(공유를 실제로 켜지 않음, 상태 읽기만) — 표시 파일을 쓰는 폴더는 임시 폴더로, mode = 탭 번호(0·1). 설정 파일에는 저장하지 않음
                    AppServices.Settings.ShareFolder = Path.Combine(Path.GetTempPath(), "neosys_snapshot_share");
                    Directory.CreateDirectory(AppServices.ShareFolder);
                    var w = new Views.DbManage.ShareInfoWindow(new FirstRunResult(Environment.GetEnvironmentVariable("NEOSYS_SHARE_ERROR") is null, Environment.GetEnvironmentVariable("NEOSYS_SHARE_ERROR"))) { ShowActivated = false };
                    w.SelectTab(mode == "1" ? 1 : 0);
                    app.MainWindow = w;
                    w.Show();
                    await Delay(2500);
                    Save(w, output);
                    Environment.Exit(0);
                }
                if (key == "firstrun")
                {
                    // 최초 실행 공유 설정 진행 창(공유를 켜지 않음, 표시만) — mode = 단계(Folder·Check·Enable·Verify, 기본 Enable)
                    var w = new Views.DbManage.FirstRunWindow { ShowActivated = false };
                    w.SetStep(Enum.TryParse<FirstRunStep>(mode, out var step) ? step : FirstRunStep.Enable);
                    app.MainWindow = w;
                    w.Show();
                    await Delay(800);
                    Save(w, output);
                    Environment.Exit(0);
                }
                if (key == "upload")
                {
                    // 엑셀 일괄 업로드 창(mode = property|customer, 기본 property) — 견본 붙여넣기 상태(서버 호출 없음)
                    // mode = "property:유형,시도코드,시군구코드,읍면동코드[,open]" 이면 공통 폼을 사람이 고르듯 차례로 고른다(NEOSYS_SNAPSHOT_API로 서버 지정 시 조회만)
                    //  · 끝에 open을 붙이면 첫 열의 '항목 선택' 목록을 연 상태로 찍는다
                    var parts = (mode ?? "property").Split(':');
                    var w = Views.Upload.BulkUploadWindow.Preview(parts[0], parts.Length > 1);
                    w.ShowActivated = false;
                    app.MainWindow = w;
                    w.Show();
                    await Delay(1500);
                    if (parts.Length > 1) await w.DevPickAsync(parts[1].Split(','));
                    Save(w, output);
                    if (Environment.GetEnvironmentVariable("NEOSYS_SCREEN") == "1") SaveScreen(w, Path.ChangeExtension(output, null) + "_screen.png");
                    Environment.Exit(0);
                }
                if (key == "dbviewer")
                {
                    // 데이터 확인 창(톱니바퀴) — mode에 테이블 이름(기본 sys_code_sub)
                    var v = new Views.Dev.DbViewerWindow { ShowActivated = false };
                    app.MainWindow = v;
                    v.Show();
                    await Delay(800);
                    var list = (System.Windows.Controls.ListBox)typeof(Views.Dev.DbViewerWindow).GetField("_tables", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(v)!;
                    list.SelectedItem = mode ?? "sys_code_sub";
                    await Delay(1000);
                    Save(v, output);
                    Environment.Exit(0);
                }
                if (key == "staffview")
                {
                    // 대표의 직원 DB 보기 — mode = 직원 백업이 들어 있는 시험 공유폴더. DB 관리 창의 직원 목록 → 첫 직원 열기 → 대시보드·물건관리 창을 찍는다
                    var host = new DashboardWindow { ShowActivated = false };
                    app.MainWindow = host;
                    host.Show();
                    AppServices.Settings.BackupShares = new() { mode! };
                    AppServices.Settings.ShareFolder = mode + "_mypc";   // 이 PC Neosys 폴더도 시험 폴더로(실제 위치를 건드리지 않게)
                    Views.DbManage.DbManageWindow.ShowSingle(host);
                    var dbw = app.Windows.OfType<Views.DbManage.DbManageWindow>().Single();
                    dbw.SelectTab(2);   // 연결된 공유폴더 — 시험 공유폴더를 고르면 계정 폴더·백업 파일이 채워진다
                    await Delay(600);
                    dbw.SelectRoot(1);
                    await Delay(1500);
                    Save(dbw, output);
                    var st = StaffDbService.Find(AppServices.Settings.BackupShares, AppServices.ShareFolder, AppServices.Session.OffNo, AppServices.Session.UserId).First();
                    var copy = StaffDbService.Open(st.Candidates, StaffDbService.DefaultViewRoot);
                    WindowManager.CloseAll();
                    await AppServices.EnterStaffViewAsync(copy, new StaffView(st.UserId, st.Name, copy.Used.Manifest.BackedUpAt, copy.Used.Source));
                    await Delay(600);
                    Save(host, Path.ChangeExtension(output, null) + "_dashboard.png");
                    var propPage = WindowManager.OpenMenu("property");
                    await Delay(2500);
                    var pw = Window.GetWindow(propPage!);
                    Save(pw, Path.ChangeExtension(output, null) + "_property.png");
                    var title = pw.Title;
                    AppServices.ExitStaffView();
                    File.WriteAllText(Path.ChangeExtension(output, null) + "_title.txt", title);
                    Environment.Exit(0);
                }
                if (key == "dbmanage")
                {
                    // DB 관리 창 — mode에 시험용 공유폴더(임시 폴더) 경로를 주면 이번 실행에만 등록하고 한 번 백업한 상태로 찍는다(설정 파일에는 저장하지 않음)
                    var host = new DashboardWindow { ShowActivated = false };
                    app.MainWindow = host;
                    host.Show();
                    AppServices.Settings.BackupShares = mode is null ? new() : new() { mode, @"\\NO-SUCH-PC\Neosys" };
                    if (mode is not null) AppServices.Settings.ShareFolder = mode + "_mypc";   // 이 PC Neosys 폴더도 시험 폴더로
                    BackupScheduler.Start(AppServices.Session);
                    if (mode is not null) await BackupScheduler.RunNowAsync();
                    Views.DbManage.DbManageWindow.ShowSingle(host);
                    var dbw = app.Windows.OfType<Views.DbManage.DbManageWindow>().Single();
                    await dbw.LoadBackupsAsync();   // 복구 목록(시험 공유폴더·이 PC 폴더)
                    await Delay(1200);
                    Save(dbw, output);
                    Save(host, Path.ChangeExtension(output, null) + "_dashboard.png");
                    // 나머지 탭: 네트워크 공유(이 PC 상태 읽기만) · 공유폴더 설정 · 연결된 공유폴더(3분할)
                    var tabFiles = new[] { "_net", "_folder", "_connected" };
                    for (var i = 0; i < tabFiles.Length; i++)
                    {
                        dbw.SelectTab(i);
                        if (i == 0) await dbw.CheckNetAsync();
                        if (i == 2) dbw.SelectRoot(1);   // 시험 공유폴더(계정 폴더가 여럿일 수 있는 곳)
                        await Delay(1500);
                        Save(dbw, Path.ChangeExtension(output, null) + tabFiles[i] + ".png");
                    }
                    Environment.Exit(0);
                }
                // 대시보드(메인 창) + 메뉴 창 — key가 dashboard면 대시보드를 찍는다
                var main = new DashboardWindow { ShowActivated = false };
                app.MainWindow = main;
                main.Show();
                await Delay(800);
                var page = key == "dashboard" ? null : WindowManager.OpenMenu(key);
                var target = page is null ? (Window)main : Window.GetWindow(page)!;
                await Delay(mode == "first" ? 3000 : 1200);

                if (page is Views.Office.OfficeHubPage hub && mode is "office" or "staff" or "entryfee" or "subscribe")
                {
                    // 사무실관리 허브의 탭 지정(서버 미연결이라 상태는 '확인 실패'로 보인다)
                    await Delay(4000);   // 기본 탭 판단(서버 조회 실패)이 끝난 뒤
                    typeof(Views.Office.OfficeHubPage).GetMethod("Select", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.Invoke(hub, new object[] { mode });
                    await Delay(4000);
                }
                if (mode is "summary" && page is Views.Properties.PropertyPage pp)
                {
                    // 물건관리 왼쪽 물건리스트의 첫 단지를 눌러 목록을 채운 화면
                    var flags = System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic;
                    var sums = (List<Data.Row>?)typeof(Views.Properties.PropertyPage).GetField("_summaries", flags)!.GetValue(pp);
                    if (sums is { Count: > 0 })
                        await (Task)typeof(Views.Properties.PropertyPage).GetMethod("SelectSummaryAsync", flags)!.Invoke(pp, new object[] { sums[0] })!;
                    await Delay(1000);
                }
                // "new:SYCA118" — 등록창을 연 뒤 물건유형을 바꿔서(유형별 폼) 찍는다
                string? newType = null;
                if (mode?.StartsWith("new:") == true) { newType = mode[4..]; mode = "new"; }
                if (mode is "new" or "first" && page is Ui.ListPage lp)
                {
                    // 등록창은 모달(ShowDialog)이라 호출이 돌아오지 않는다 → 타이머로 캡처 후 종료
                    var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(1800) };
                    timer.Tick += (_, _) =>
                    {
                        timer.Stop();
                        var w = app.Windows.OfType<Window>().LastOrDefault(x => x != main && x != target && x.IsVisible && x.Content is FrameworkElement) ?? target;
                        try { Save(w, output); } catch (Exception ex) { File.WriteAllText(output + ".error.txt", ex.ToString()); }
                        Environment.Exit(0);
                    };
                    timer.Start();
                    var open = typeof(Ui.ListPage).GetMethod("OpenAsync", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
                    var row = mode == "first" ? GetFirst(lp) : null;
                    // 물건 목록은 왼쪽 요약을 눌러야 채워진다(기존과 같음) → 첫 물건을 직접 조회
                    if (mode == "first" && row is null && key == "property")
                        row = (await AppServices.Create((sp, s) => new Core.Services.PropertyService(sp, s)).ListAsync()).FirstOrDefault();
                    _ = (Task)open.Invoke(lp, new object?[] { row })!;
                    if (newType is not null)
                    {
                        var parts = newType.Split(':');   // "SYCA119:다가구주택" — 세부유형까지
                        var pick = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(500) };
                        pick.Tick += (_, _) =>
                        {
                            pick.Stop();
                            var w = app.Windows.OfType<Window>().LastOrDefault(x => x != main && x != target && x.IsVisible);
                            foreach (var cb in w is null ? Enumerable.Empty<System.Windows.Controls.ComboBox>() : Descend(w).OfType<System.Windows.Controls.ComboBox>())
                                if (System.Windows.Automation.AutomationProperties.GetAutomationId(cb) == "pt_type") { cb.SelectedValue = parts[0]; break; }
                            if (parts.Length > 1 && w is not null)
                                foreach (var cb in Descend(w).OfType<System.Windows.Controls.ComboBox>())
                                    if (System.Windows.Automation.AutomationProperties.GetAutomationId(cb) == "sub_type") { cb.SelectedValue = parts[1]; break; }
                        };
                        pick.Start();
                    }
                    return;
                }
                Save(target, output);
                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                File.WriteAllText(output + ".error.txt", ex.ToString());
                Environment.Exit(1);
            }
        });
        return true;
    }

    private static Data.Row? GetFirst(Ui.ListPage lp)
    {
        var grid = (System.Windows.Controls.DataGrid?)typeof(Ui.ListPage).GetField("Grid", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(lp);
        return grid?.Items.OfType<Data.Row>().FirstOrDefault();
    }

    private static async Task Delay(int ms)
    {
        await Task.Delay(ms);
        await Dispatcher.CurrentDispatcher.InvokeAsync(() => { }, DispatcherPriority.ApplicationIdle);
    }

    private static readonly List<(Rect Rect, BitmapSource Image)> Overlays = new();

    /// <summary>창 안 WebView2 화면을 찍어 둔다(Save가 덮어 그림)</summary>
    private static async Task CaptureWebViewsAsync(Window w)
    {
        Overlays.Clear();
        var root = (FrameworkElement)w.Content;
        var stack = new Stack<DependencyObject>();
        stack.Push(root);
        while (stack.Count > 0)
        {
            var d = stack.Pop();
            if (d is Microsoft.Web.WebView2.Wpf.WebView2 { CoreWebView2: not null, IsVisible: true } wv)
            {
                using var ms = new MemoryStream();
                await wv.CoreWebView2.CapturePreviewAsync(Microsoft.Web.WebView2.Core.CoreWebView2CapturePreviewImageFormat.Png, ms);
                ms.Position = 0;
                var img = new BitmapImage();
                img.BeginInit();
                img.CacheOption = BitmapCacheOption.OnLoad;
                img.StreamSource = ms;
                img.EndInit();
                var p = wv.TransformToAncestor(root).Transform(new Point(0, 0));
                Overlays.Add((new Rect(p, new Size(wv.ActualWidth, wv.ActualHeight)), img));
                continue;
            }
            for (int i = 0; i < VisualTreeHelper.GetChildrenCount(d); i++) stack.Push(VisualTreeHelper.GetChild(d, i));
        }
    }

    /// <summary>화면 글자가 실제로 어떤 글꼴 파일로 그려졌는지(글리프 런) — 지정 글꼴을 못 찾아 대체 글꼴로 그려지는 경우를 잡는다</summary>
    private static IEnumerable<string> DrawnFonts(Visual root)
    {
        var fonts = new SortedSet<string>();
        void Walk(Drawing? d)
        {
            switch (d)
            {
                case GlyphRunDrawing gr: fonts.Add(Path.GetFileName(gr.GlyphRun.GlyphTypeface.FontUri.LocalPath)); break;
                case DrawingGroup dg: foreach (var c in dg.Children) Walk(c); break;
            }
        }
        var stack = new Stack<DependencyObject>();
        stack.Push(root);
        while (stack.Count > 0)
        {
            var v = stack.Pop();
            if (v is Visual visual) Walk(VisualTreeHelper.GetDrawing(visual));            for (int i = 0; i < VisualTreeHelper.GetChildrenCount(v); i++) stack.Push(VisualTreeHelper.GetChild(v, i));
        }
        return fonts;
    }

    /// <summary>
    /// 실제 화면 캡처(창 내용 영역) — RenderTargetBitmap은 회색조로만 그려 화면의 ClearType 굵기와 다르므로,
    /// 원본(Electron) 화면과 글자 굵기를 비교할 때 쓴다(NEOSYS_SCREEN=1). 창을 맨 위로 올린 뒤 화면 픽셀을 그대로 복사한다.
    /// </summary>
    private static void SaveScreen(Window w, string path)
    {
        var el = (FrameworkElement)w.Content;
        var topLeft = el.PointToScreen(new Point(0, 0));
        var bottomRight = el.PointToScreen(new Point(el.ActualWidth, el.ActualHeight));
        int x = (int)topLeft.X, y = (int)topLeft.Y, width = (int)(bottomRight.X - topLeft.X), height = (int)(bottomRight.Y - topLeft.Y);
        var screen = GetDC(IntPtr.Zero);
        var mem = CreateCompatibleDC(screen);
        var bmp = CreateCompatibleBitmap(screen, width, height);
        var old = SelectObject(mem, bmp);
        BitBlt(mem, 0, 0, width, height, screen, x, y, 0x00CC0020);   // SRCCOPY
        SelectObject(mem, old);
        try
        {
            var src = System.Windows.Interop.Imaging.CreateBitmapSourceFromHBitmap(bmp, IntPtr.Zero, Int32Rect.Empty, BitmapSizeOptions.FromEmptyOptions());
            var enc = new PngBitmapEncoder();
            enc.Frames.Add(BitmapFrame.Create(src));
            using var fs = File.Create(path);
            enc.Save(fs);
        }
        finally
        {
            DeleteObject(bmp);
            DeleteDC(mem);
            ReleaseDC(IntPtr.Zero, screen);
        }
    }

    [System.Runtime.InteropServices.DllImport("user32.dll")] private static extern IntPtr GetDC(IntPtr hwnd);
    [System.Runtime.InteropServices.DllImport("user32.dll")] private static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] private static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] private static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int w, int h);
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] private static extern IntPtr SelectObject(IntPtr hdc, IntPtr obj);
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] private static extern bool BitBlt(IntPtr dst, int x, int y, int w, int h, IntPtr src, int sx, int sy, int rop);
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] private static extern bool DeleteObject(IntPtr obj);
    [System.Runtime.InteropServices.DllImport("gdi32.dll")] private static extern bool DeleteDC(IntPtr hdc);

    private static void Save(Window w, string path)
    {
        var el = (FrameworkElement)w.Content;
        // 글꼴 확인용: 실제 적용된 창 글꼴·크기·굵기와 Pretendard 로드 여부
        var tf = new Typeface(w.FontFamily, FontStyles.Normal, w.FontWeight, FontStretches.Normal);
        File.WriteAllText(path + ".font.txt", $"{w.GetType().Name} font={w.FontFamily.Source} size={w.FontSize} weight={w.FontWeight} mode={TextOptions.GetTextFormattingMode(w)} glyphs={(tf.TryGetGlyphTypeface(out var g) ? string.Join("|", g.FamilyNames.Values) + " / " + string.Join("|", g.FaceNames.Values) : "없음")}"
            + "\n실제 그린 글꼴: " + string.Join(", ", DrawnFonts(el)));
        var width = (int)Math.Max(el.ActualWidth, 10);
        var height = (int)Math.Max(el.ActualHeight, 10);
        var rtb = new RenderTargetBitmap(width, height, 96, 96, PixelFormats.Pbgra32);
        var dv = new DrawingVisual();
        using (var dc = dv.RenderOpen())
        {
            dc.DrawRectangle(Brushes.White, null, new Rect(0, 0, width, height));
            // 여백까지 그대로(내용 경계로 잘라 늘리지 않게 Viewbox를 창 크기로 고정)
            dc.DrawRectangle(new VisualBrush(el) { ViewboxUnits = BrushMappingMode.Absolute, Viewbox = new Rect(0, 0, width, height), Stretch = Stretch.None, AlignmentX = AlignmentX.Left, AlignmentY = AlignmentY.Top }, null, new Rect(0, 0, width, height));
            // WebView2(별도 창이라 위 그리기에 안 잡힘)는 미리 찍어 둔 화면을 덮어 그린다
            foreach (var (rect, img) in Overlays) dc.DrawImage(img, rect);
        }
        Overlays.Clear();
        rtb.Render(dv);
        var enc = new PngBitmapEncoder();
        enc.Frames.Add(BitmapFrame.Create(rtb));
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        using var fs = File.Create(path);
        enc.Save(fs);
    }

    private static IEnumerable<DependencyObject> Descend(DependencyObject root)
    {
        var stack = new Stack<DependencyObject>();
        stack.Push(root);
        while (stack.Count > 0)
        {
            var d = stack.Pop();
            yield return d;
            for (int i = 0; i < VisualTreeHelper.GetChildrenCount(d); i++) stack.Push(VisualTreeHelper.GetChild(d, i));
        }
    }
}
#endif

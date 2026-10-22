#if DEBUG
using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Neosys.Local.Core;
using Neosys.Local.App.Views;

namespace Neosys.Local.App;

/// <summary>
/// 개발용(디버그 빌드 전용) 화면 캡처: 서버 로그인 없이 테스트 세션으로 메뉴/등록창을 띄워 PNG로 저장한다.
///   Neosys.Local.App.exe --snapshot &lt;메뉴키&gt; &lt;출력.png&gt; [new|first]
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
                AppServices.SetSession(new AppSession { RtNo = 1, OffNo = 1, UserId = "dev", RtNm = "개발자", RtType = "RTTYP01", OffNm = "테스트 사무소" });
                await DevSamples.EnsureAsync();
                if (key == "login")
                {
                    var login = new LoginWindow { ShowActivated = false };
                    app.MainWindow = login;
                    login.Show();
                    await Delay(1000);
                    Save(login, output);
                    Environment.Exit(0);
                }
                if (key is "community" or "mission" or "review" or "referral" or "eventwin")
                {
                    // 커뮤니티(mode = 탭 이름, "탭:글번호"면 그 글 상세, "탭:new"면 글쓰기) · 미션문구 · 리뷰이벤트 · 추천 목록 · 이벤트 확정 알림(견본)
                    var parts = (mode ?? "").Split(':');
                    Window w = key switch
                    {
                        "community" => new Views.Community.CommunityWindow(parts[0].Length > 0 ? parts[0] : null, parts.Length > 1 && long.TryParse(parts[1], out var pid) ? pid : null,
                            compose: parts.Length > 1 && parts[1] == "new"),
                        "eventwin" => Views.Community.EventWinWindow.Preview(),
                        "mission" => new Views.Community.EventEntryWindow(review: false),
                        "review" => new Views.Community.EventEntryWindow(review: true),
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

    private static void Save(Window w, string path)
    {
        var el = (FrameworkElement)w.Content;
        // 글꼴 확인용: 실제 적용된 창 글꼴·크기·굵기와 Pretendard 로드 여부
        var tf = new Typeface(w.FontFamily, FontStyles.Normal, w.FontWeight, FontStretches.Normal);
        File.WriteAllText(path + ".font.txt", $"{w.GetType().Name} font={w.FontFamily.Source} size={w.FontSize} weight={w.FontWeight} glyphs={(tf.TryGetGlyphTypeface(out var g) ? string.Join("|", g.FamilyNames.Values) + " / " + string.Join("|", g.FaceNames.Values) : "없음")}");
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
}
#endif

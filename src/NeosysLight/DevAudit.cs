#if DEBUG
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
using Neosys.Local.App.Ui;
using Neosys.Local.App.Views;
using Neosys.Local.Core;

namespace Neosys.Local.App;

/// <summary>
/// 버튼 전체 점검(디버그 빌드 전용): 메뉴 창을 하나씩 열어 화면의 버튼·탭·손가락 커서 항목·행 우클릭 메뉴를 차례로 누르고
/// 결과(열린 창·메시지·토스트·팝업·화면 변화·오류)를 기록한다. 버튼으로 열린 창은 그 안의 버튼까지 한 단계 더 누른 뒤 닫는다.
///   NeosysLight.exe --audit &lt;결과.txt&gt; [메뉴키]
/// 메시지 상자·인쇄/파일 창·외부 열기는 띄우지 않는다(AuditHook) — 확인 질문은 '아니오/취소'로 답해 데이터를 지우지 않는다.
/// DB는 NEOSYS_DB(점검용 사본), 서버는 연결 안 되는 주소로 고정한다.
/// </summary>
internal static class DevAudit
{
    private sealed class Rec
    {
        public string Area = "", Label = "";
        public readonly List<string> Windows = new();
        public readonly List<string> Popups = new();
        public List<(string Kind, string Text)> Events = new();
        public bool Changed;
        public string? Exception;
        public double Seconds;
        public int Pending;          // 이 클릭으로 열려 점검 중인 창 수
    }

    private static readonly List<Rec> Results = new();
    private static readonly List<string> Debug = new();
    private static readonly System.Reflection.MethodInfo OnClick = typeof(ButtonBase).GetMethod("OnClick", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
    private static readonly Stack<Rec> Current = new();
    private static readonly HashSet<Window> Seen = new();
    private static int _nesting;
    private static bool _allowNested;
    private static App _app = null!;
    private static string _output = "";

    public static bool TryRun(App app, string[] args)
    {
        if (args.Length < 2 || args[0] != "--audit") return false;
        _app = app;
        var output = Path.GetFullPath(args[1]);
        _output = output;
        File.Delete(output + ".progress.txt");
        var only = args.Length > 2 ? args[2] : null;
        app.Dispatcher.InvokeAsync(async () =>
        {
            try
            {
                Environment.SetEnvironmentVariable("NEOSYS_API", "http://127.0.0.1:9");
                await AppServices.InitializeAsync();
                await AppServices.OpenAccountAsync("dev");   // NEOSYS_DB가 있으면 그 파일, 없으면 dev 계정 DB
                AppServices.SetSession(new AppSession { RtNo = 1, OffNo = 1, UserId = "dev", RtNm = "개발자", RtType = "RTTYP01", OffNm = "테스트 사무소" });
                await DevSamples.EnsureAsync();
                AuditHook.Active = true;
                app.DispatcherUnhandledException += (_, e) => { if (Current.Count > 0) Current.Peek().Exception = e.Exception.GetType().Name + ": " + e.Exception.Message; e.Handled = true; };
                TaskScheduler.UnobservedTaskException += (_, e) => { if (Current.Count > 0) Current.Peek().Exception = e.Exception.InnerException?.Message ?? e.Exception.Message; e.SetObserved(); };

                var main = new DashboardWindow { ShowActivated = false };
                app.MainWindow = main;
                main.Show();
                Seen.Add(main);
                await Delay(800);

                var watcher = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromMilliseconds(250) };
                watcher.Tick += (_, _) => WatchWindows();
                watcher.Start();

                foreach (var m in MenuRegistry.All.Where(m => only is null || m.Key == only))
                {
                    var page = WindowManager.OpenMenu(m.Key);
                    var win = page is null ? null : Window.GetWindow(page);
                    if (win is null) { Results.Add(new Rec { Area = m.Title, Label = "(메뉴 창)", Exception = "창이 열리지 않음" }); continue; }
                    Seen.Add(win);
                    await Delay(1500);
                    if (page is Views.Properties.PropertyPage pp) await SelectFirstSummary(pp);
                    _allowNested = true;
                    await AuditContainer(win, m.Title, 0);
                    win.Close();
                    await Delay(300);
                    Write(output);
                }
                if (only is null or "dashboard")
                {
                    _allowNested = false;          // 대시보드 메뉴 카드는 메뉴 창을 열기만 하므로 기록 후 닫는다
                    await AuditContainer(main, "대시보드", 0, skip: new[] { "로그아웃" });
                }
                watcher.Stop();
                Write(output);
                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                File.WriteAllText(output + ".error.txt", ex.ToString());
                Write(output);
                Environment.Exit(1);
            }
        });
        return true;
    }

    // ---------------- 창 감시: 새 창이 뜨면 (메뉴 단계면) 그 안 버튼까지 점검 후 닫는다 ----------------

    private static void WatchWindows()
    {
        foreach (var w in _app.Windows.OfType<Window>().ToList())
        {
            if (Seen.Contains(w) || !w.IsVisible) continue;
            Seen.Add(w);
            var rec = Current.Count > 0 ? Current.Peek() : null;
            var title = string.IsNullOrWhiteSpace(w.Title) ? w.GetType().Name : w.Title;
            rec?.Windows.Add(title);
            if (_allowNested && _nesting == 0 && rec is not null)
            {
                _nesting++;
                rec.Pending++;
                _ = AuditThenClose(w, rec.Area + " > " + title, rec);
            }
            else Close(w);
        }
    }

    private static async Task AuditThenClose(Window w, string area, Rec owner)
    {
        try
        {
            await Delay(900);
            if (w.IsVisible) await AuditContainer(w, area, 1);
        }
        finally
        {
            Close(w);
            _nesting--;
            owner.Pending--;
        }
    }

    private static void Close(Window w)
    {
        try { if (w.IsVisible) w.Close(); } catch { /* 이미 닫힘 */ }
    }

    // ---------------- 한 창의 클릭 대상 점검 ----------------

    private sealed record Target(string Key, string Label, Func<Task> Click);

    private static async Task AuditContainer(Window w, string area, int depth, string[]? skip = null)
    {
        var done = new HashSet<string>();
        var perLabel = new Dictionary<string, int>();
        for (int guard = 0; guard < 160 && w.IsVisible; guard++)
        {
            var targets = Targets(w)
                .Where(t => !done.Contains(t.Key) && !(skip?.Any(s => t.Label.Contains(s)) ?? false))
                .Where(t => perLabel.GetValueOrDefault(t.Label) < 2)
                .OrderBy(t => IsCloser(t.Label) ? 2 : t.Key.StartsWith("hand:") || t.Key.StartsWith("tab:") ? 1 : 0)   // 탭(화면 전환)은 현재 화면 버튼을 다 누른 뒤
                .ToList();
            Debug.Add($"{area} #{guard}: " + string.Join(", ", targets.Select(x => x.Key)));
            if (targets.Count == 0) break;
            var t = targets[0];
            done.Add(t.Key);
            perLabel[t.Label] = perLabel.GetValueOrDefault(t.Label) + 1;
            await ClickAndObserve(w, area, t);
        }
    }

    private static bool IsCloser(string label) => label.Contains("닫기") || label.Contains("취소") || label.Contains("로그아웃") || label is "✕" or "×" or "X";

    private static async Task ClickAndObserve(Window w, string area, Target t)
    {
        var rec = new Rec { Area = area, Label = t.Label };
        File.AppendAllText(_output + ".progress.txt", $"{DateTime.Now:HH:mm:ss} {area} | {t.Label}" + Environment.NewLine);
        Results.Add(rec);
        Current.Push(rec);
        AuditHook.Events.Clear();
        var before = Fingerprint(w);
        var sw = Stopwatch.StartNew();
        try { await t.Click(); }
        catch (Exception ex) { rec.Exception = ex.GetType().Name + ": " + ex.Message; }
        await Delay(700);
        for (int i = 0; i < 900 && rec.Pending > 0; i++) await Delay(200);   // 열린 창 점검이 끝날 때까지(최대 3분)
        await Delay(150);
        CloseOpenPopups(rec);
        rec.Events = AuditHook.Events.ToList();
        if (!w.IsVisible) rec.Popups.Add("창 닫힘");
        rec.Changed = w.IsVisible && Fingerprint(w) != before;
        rec.Seconds = sw.Elapsed.TotalSeconds;
        Current.Pop();
    }

    private static List<Target> Targets(Window w)
    {
        var list = new List<Target>();
        var counts = new Dictionary<string, int>();
        void Add(string kind, string label, Func<Task> click)
        {
            label = label.Trim();
            if (label.Length == 0) label = "(이름 없음)";
            var n = counts.GetValueOrDefault(kind + label);
            counts[kind + label] = n + 1;
            list.Add(new Target($"{kind}:{label}#{n}", label, click));
        }

        foreach (var el in Descendants(w))
        {
            if (el is not FrameworkElement fe || !fe.IsVisible || !fe.IsEnabled || fe.ActualWidth < 2) continue;
            if (HasAncestor<DataGridRow>(fe) || HasAncestor<ComboBox>(fe) || HasAncestor<DatePicker>(fe) || HasAncestor<ScrollBar>(fe) || HasAncestor<Calendar>(fe)) continue;
            switch (fe)
            {
                case RepeatButton or ToggleButton or DataGridColumnHeader:
                    continue;
                case ButtonBase sa when sa.Command == DataGrid.SelectAllCommand:
                    continue;   // 표 왼쪽 위 전체선택 칸
                case ButtonBase b:
                    // 실제 누름과 같게 OnClick 호출(IsCancel/IsDefault 닫기·명령 실행까지)
                    Add("btn", LabelOf(b), () => { OnClick.Invoke(b, null); return Task.CompletedTask; });
                    break;
                case TabItem ti when !ti.IsSelected:
                    Add("tab", "탭 " + LabelOf(ti), () => { ti.IsSelected = true; return Task.CompletedTask; });
                    break;
                case TextBlock or Border or StackPanel or Grid when fe.Cursor == Cursors.Hand && !HasAncestor<ButtonBase>(fe):
                    Add("hand", "항목 " + LabelOf(fe), () =>
                    {
                        fe.RaiseEvent(new MouseButtonEventArgs(Mouse.PrimaryDevice, Environment.TickCount, MouseButton.Left) { RoutedEvent = UIElement.MouseLeftButtonDownEvent, Source = fe });
                        fe.RaiseEvent(new MouseButtonEventArgs(Mouse.PrimaryDevice, Environment.TickCount, MouseButton.Left) { RoutedEvent = UIElement.MouseLeftButtonUpEvent, Source = fe });
                        return Task.CompletedTask;
                    });
                    break;
            }
        }

        // 목록 행 우클릭 메뉴(첫 행 선택 후)
        foreach (var grid in Descendants(w).OfType<DataGrid>().Where(g => g.IsVisible && g.ContextMenu is not null))
        {
            foreach (var mi in grid.ContextMenu!.Items.OfType<MenuItem>())
            {
                var item = mi;
                Add("ctx", "우클릭 " + (item.Header?.ToString() ?? ""), () =>
                {
                    if (grid.Items.Count > 0 && grid.SelectedItem is null) grid.SelectedIndex = 0;
                    item.RaiseEvent(new RoutedEventArgs(MenuItem.ClickEvent, item));
                    return Task.CompletedTask;
                });
            }
        }
        return list;
    }

    private static async Task SelectFirstSummary(Views.Properties.PropertyPage pp)
    {
        var flags = System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic;
        var sums = (List<Data.Row>?)typeof(Views.Properties.PropertyPage).GetField("_summaries", flags)!.GetValue(pp);
        if (sums is { Count: > 0 })
            await (Task)typeof(Views.Properties.PropertyPage).GetMethod("SelectSummaryAsync", flags)!.Invoke(pp, new object[] { sums[0] })!;
        await Delay(600);
    }

    // ---------------- 팝업(우클릭·색 채우기·범위 필터 등) ----------------

    private static void CloseOpenPopups(Rec rec)
    {
        foreach (var src in PresentationSource.CurrentSources.OfType<System.Windows.Interop.HwndSource>().ToList())
        {
            if (src.RootVisual is not FrameworkElement root || root.GetType().Name != "PopupRoot") continue;
            var inner = Descendants(root).OfType<FrameworkElement>().ToList();
            var cm = inner.OfType<ContextMenu>().FirstOrDefault();
            if (cm is not null)
            {
                rec.Popups.Add("메뉴[" + string.Join(", ", cm.Items.OfType<MenuItem>().Select(i => i.Header?.ToString())) + "]");
                cm.IsOpen = false;
                continue;
            }
            var popup = root.Parent as Popup ?? LogicalPopup(root);
            rec.Popups.Add("팝업[" + Trim(string.Join(" ", inner.OfType<TextBlock>().Select(x => x.Text).Where(x => !string.IsNullOrWhiteSpace(x))), 60) + "]");
            if (popup is not null) popup.IsOpen = false;
        }
    }

    private static Popup? LogicalPopup(FrameworkElement root)
    {
        DependencyObject? d = root;
        while (d is not null && d is not Popup) d = LogicalTreeHelper.GetParent(d) ?? (d as FrameworkElement)?.Parent;
        return d as Popup;
    }

    // ---------------- 도우미 ----------------

    internal static IEnumerable<DependencyObject> Descendants(DependencyObject root)
    {
        var stack = new Stack<DependencyObject>();
        stack.Push(root);
        while (stack.Count > 0)
        {
            var d = stack.Pop();
            yield return d;
            if (d is not Visual && d is not System.Windows.Media.Media3D.Visual3D) continue;
            int n;
            try { n = VisualTreeHelper.GetChildrenCount(d); } catch { continue; }
            for (int i = n - 1; i >= 0; i--) stack.Push(VisualTreeHelper.GetChild(d, i));
        }
    }

    private static bool HasAncestor<T>(DependencyObject d) where T : DependencyObject
    {
        for (var p = VisualTreeHelper.GetParent(d); p is not null; p = VisualTreeHelper.GetParent(p))
            if (p is T) return true;
        return false;
    }

    internal static string LabelOf(FrameworkElement fe)
    {
        var text = fe switch
        {
            HeaderedContentControl h when h.Header is string s => s,
            ContentControl { Content: string s } => s,
            TextBlock tb => tb.Text,
            _ => string.Join(" ", Descendants(fe).OfType<TextBlock>().Select(t => t.Text).Where(t => !string.IsNullOrWhiteSpace(t) && !IsIconGlyph(t))),
        };
        if (string.IsNullOrWhiteSpace(text) && fe.ToolTip is string tip) text = tip;
        if (string.IsNullOrWhiteSpace(text) && fe is ButtonBase b && Descendants(b).OfType<TextBlock>().FirstOrDefault() is { } icon) text = "아이콘 " + ((int)icon.Text.FirstOrDefault()).ToString("X4");
        return Trim(text ?? "", 40);
    }

    private static bool IsIconGlyph(string t) => t.Length == 1 && t[0] >= '' && t[0] <= '';

    private static string Trim(string s, int n) { s = s.Replace("\r", " ").Replace("\n", " ").Trim(); return s.Length > n ? s[..n] + "…" : s; }

    /// <summary>화면 내용 지문(글자·입력값·목록 건수) — 누른 뒤 화면이 바뀌었는지 판단</summary>
    private static int Fingerprint(Window w)
    {
        var sb = new StringBuilder();
        foreach (var d in Descendants(w))
        {
            switch (d)
            {
                case TextBlock tb when tb.IsVisible: sb.Append(tb.Text).Append('|'); break;
                case TextBox tx when tx.IsVisible: sb.Append(tx.Text).Append('|'); break;
                case ItemsControl ic when ic.IsVisible: sb.Append('#').Append(ic.Items.Count); break;
                case UIElement ue when ue is Panel p && p.IsVisible: sb.Append('p').Append(p.Children.Count); break;
                case Border b when b.IsVisible && b.Background is SolidColorBrush bg: sb.Append('b').Append(bg.Color.ToString()); break;
                case Control c when c.IsVisible && c.Background is SolidColorBrush cb: sb.Append('c').Append(cb.Color.ToString()); break;
            }
        }
        return sb.ToString().GetHashCode();
    }

    internal static async Task Delay(int ms)
    {
        await Task.Delay(ms);
        await Dispatcher.CurrentDispatcher.InvokeAsync(() => { }, DispatcherPriority.ApplicationIdle);
    }

    // ---------------- 결과 ----------------

    private static string Verdict(Rec r)
    {
        bool Server(string s) => s.Contains("서버") || s.Contains("네오시스 웹") || s.Contains("127.0.0.1") || s.Contains("No connection") || s.Contains("연결할 수 없");
        var errors = r.Events.Where(e => e.Kind is "오류상자" or "토스트오류").Select(e => e.Text).ToList();
        if (r.Exception is not null) return Server(r.Exception) ? "서버필요" : "오류";
        if (errors.Count > 0) return errors.All(Server) ? "서버필요" : "오류";
        if (r.Events.Any(e => Server(e.Text))) return "서버안내";
        if (r.Windows.Count > 0 || r.Popups.Count > 0 || r.Events.Count > 0 || r.Changed) return "동작";
        // 다시 조회해도 같은 데이터면 화면이 그대로인 버튼
        if (r.Label is "검색" or "새로고침" or "조회" or "미리보기 갱신" or "날짜입력" || r.Label.StartsWith("항목 전체") || r.Label == "전체" || r.Label == "계약목록") return "결과동일";
        return "반응없음";
    }

    private static void Write(string path)
    {
        var sb = new StringBuilder();
        var groups = Results.GroupBy(r => Verdict(r)).ToDictionary(g => g.Key, g => g.Count());
        sb.AppendLine($"# 버튼 점검 결과 ({DateTime.Now:yyyy-MM-dd HH:mm}) — 전체 {Results.Count}건: " + string.Join(", ", groups.Select(g => $"{g.Key} {g.Value}")));
        foreach (var area in Results.GroupBy(r => r.Area))
        {
            sb.AppendLine();
            sb.AppendLine($"## {area.Key}");
            foreach (var r in area)
            {
                var detail = new List<string>();
                if (r.Windows.Count > 0) detail.Add("창: " + string.Join(", ", r.Windows));
                detail.AddRange(r.Popups);
                detail.AddRange(r.Events.Select(e => $"{e.Kind}: {Trim(e.Text, 90)}"));
                if (r.Exception is not null) detail.Add("예외: " + Trim(r.Exception, 140));
                if (detail.Count == 0 && r.Changed) detail.Add("화면 변경");
                sb.AppendLine($"- [{Verdict(r)}] {r.Label} ({r.Seconds:0.0}s){(detail.Count > 0 ? " — " + string.Join(" / ", detail) : "")}");
            }
        }
        File.WriteAllText(path, sb.ToString(), new UTF8Encoding(true));
        File.WriteAllLines(path + ".debug.txt", Debug, new UTF8Encoding(true));
    }
}
#endif

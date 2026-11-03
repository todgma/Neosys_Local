using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using Neosys.Local.App.Ui;
using Neosys.Local.App.Views;

namespace Neosys.Local.App;

public partial class App : Application
{
    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        // 작업 스케줄러 백업(창 없음) — 다른 시작 처리(업데이트 확인·시작프로그램 등록·로그인)는 하지 않는다
        if (HeadlessBackup.IsRequested(e.Args))
        {
            int code;
            try { code = await HeadlessBackup.RunAsync(e.Args[1]); }
            catch { code = 1; }
            Shutdown(code);
            return;
        }
        ApplyLegacyTypography();
        DispatcherUnhandledException += OnUnhandled;
        // 대표의 직원 DB 보기 중에는 새로 여는 창 제목 앞에 [홍길동 DB · 기준 시각 · 읽기 전용]을 붙인다
        EventManager.RegisterClassHandler(typeof(Window), FrameworkElement.LoadedEvent, new RoutedEventHandler((s, _) =>
        {
            if (AppServices.Viewing is { } v && s is Window w && w != MainWindow && w is not Views.DbManage.DbManageWindow && !w.Title.StartsWith('['))
                w.Title = $"[{v.Label}] {w.Title}";
        }));
#if DEBUG
        if (DevSnapshot.TryRun(this, e.Args)) return;
        if (DevAudit.TryRun(this, e.Args)) return;
        if (DevCrud.TryRun(this, e.Args)) return;
#endif

        try
        {
            await AppServices.InitializeAsync();
        }
        catch (Exception ex)
        {
            Dialogs.Error("프로그램을 시작하지 못했습니다.\n" + ex.Message);
            Shutdown(1);
            return;
        }

#if !DEBUG
        // 시작프로그램 등록(배포 exe만 — 디버그 빌드는 bin 경로가 등록되지 않게 건너뜀)
        StartupRegistration.Apply(AppServices.Settings.RunAtStartup);
#endif

        // 자동 업데이트(로그인 전) — 새 버전을 받아 교체 스크립트를 띄웠으면 지금 프로그램은 끝낸다(스크립트가 바꿔 넣고 다시 실행)
        if (await UpdateWindow.CheckAndRunAsync())
        {
            Shutdown();
            return;
        }

        ShowLogin();
    }

    /// <summary>로그인 창 → 성공 시 대시보드 창. 대시보드에서 로그아웃하면 다시 호출된다.</summary>
    public void ShowLogin()
    {
        var login = new LoginWindow();
        if (login.ShowDialog() != true)
        {
            Shutdown();
            return;
        }
        // 기존 Electron 구조: 대시보드(오른쪽 위 고정 창) + 메뉴마다 별도 창. 대시보드를 닫으면 앱 종료
        var main = new DashboardWindow();
        MainWindow = main;
        BackupScheduler.Start(AppServices.Session);
        main.Closed += async (_, _) =>
        {
            AppServices.ExitStaffView();               // 직원 DB 보기 중이었으면 내 DB로
            await BackupScheduler.RunOnCloseAsync();   // 종료·로그아웃 때 백업(설정이 켜져 있으면)
            if (main.LogoutRequested) ShowLogin();
            else Shutdown();
        };
        // 이 PC에서 처음이면 진행 창으로 공유를 켠다 — 끝날 때까지 대시보드를 띄우지 않는다(메인 프로그램 사용 불가)
        var firstRun = Views.DbManage.FirstRunWindow.RunIfNeeded();
        main.Show();
        if (firstRun is not null) Views.DbManage.ShareInfoWindow.ShowResult(main, firstRun);   // 결과·백업 설정 알림
    }

    /// <summary>프로그램 다시 시작(DB 복구 후) — 새 프로세스를 띄우고 지금 것은 끝낸다. 환경변수(NEOSYS_DB 등)는 그대로 넘어간다.</summary>
    public static void Restart()
    {
        try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(Environment.ProcessPath!) { UseShellExecute = false }); }
        catch (Exception ex) { Dialogs.Warn("프로그램을 다시 시작하지 못했습니다. 직접 다시 실행하세요.\n" + ex.Message); }
        Current.Shutdown();
    }

    /// <summary>
    /// 기존 globals.css body 규칙(Pretendard · 13px · 굵기 500 · #111827, Theme.xaml 암시적 Window 스타일)을 모든 창에.
    /// 암시적 스타일은 형식이 정확히 같아야 적용되므로 파생 창(LoginWindow·EditWindow 등)마다 같은 스타일을 등록한다.
    /// (속성 기본값 OverrideMetadata는 자식에게 상속되지 않아 글자가 시스템 글꼴 맑은 고딕으로 나왔다 — 2026-10-27 확인)
    /// 글자 렌더링은 기본(Ideal) 유지: Chromium(Electron)과 폭·굵기가 같고, Display는 더 얇고 좁아진다.
    /// </summary>
    private void ApplyLegacyTypography()
    {
        var windowStyle = (Style)FindResource(typeof(Window));
        foreach (var t in typeof(App).Assembly.GetTypes())
            if (t.IsSubclassOf(typeof(Window)) && !t.IsAbstract && !Resources.Contains(t))
                Resources.Add(t, new Style(t, windowStyle));
    }

    private static void OnUnhandled(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        Dialogs.Error("처리 중 오류가 발생했습니다.\n" + Dialogs.Explain(e.Exception));
        e.Handled = true;
    }
}

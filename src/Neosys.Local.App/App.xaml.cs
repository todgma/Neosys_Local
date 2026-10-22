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
        ApplyLegacyTypography();
        DispatcherUnhandledException += OnUnhandled;
#if DEBUG
        if (DevSnapshot.TryRun(this, e.Args)) return;
        if (DevAudit.TryRun(this, e.Args)) return;
#endif

        try
        {
            await AppServices.InitializeAsync();
        }
        catch (Exception ex)
        {
            Dialogs.Error("로컬 DB를 준비하지 못했습니다.\n" + ex.Message);
            Shutdown(1);
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
        main.Closed += (_, _) =>
        {
            if (main.LogoutRequested) ShowLogin();
            else Shutdown();
        };
        main.Show();
    }

    /// <summary>
    /// 기존 globals.css body 규칙(Pretendard · 13px · 굵기 500 · #111827)을 모든 창의 기본값으로.
    /// 암시적 Window 스타일은 파생 창(EditWindow 등)에 안 먹으므로 Window 형식의 속성 기본값을 바꾼다(상속 속성이라 내용 전체에 적용).
    /// </summary>
    private void ApplyLegacyTypography()
    {
        var font = (FontFamily)FindResource("AppFont");
        var text = (Brush)FindResource("Text");
        const FrameworkPropertyMetadataOptions inherits = FrameworkPropertyMetadataOptions.Inherits | FrameworkPropertyMetadataOptions.AffectsMeasure | FrameworkPropertyMetadataOptions.AffectsRender;
        Control.FontFamilyProperty.OverrideMetadata(typeof(Window), new FrameworkPropertyMetadata(font, inherits));
        Control.FontSizeProperty.OverrideMetadata(typeof(Window), new FrameworkPropertyMetadata(13.0, inherits));
        Control.FontWeightProperty.OverrideMetadata(typeof(Window), new FrameworkPropertyMetadata(FontWeights.Medium, inherits));
        Control.ForegroundProperty.OverrideMetadata(typeof(Window), new FrameworkPropertyMetadata(text, inherits));
    }

    private static void OnUnhandled(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        Dialogs.Error("처리 중 오류가 발생했습니다.\n" + e.Exception.Message);
        e.Handled = true;
    }
}

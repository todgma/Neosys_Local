using System.Windows;
using System.Windows.Controls;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.DbManage;

/// <summary>
/// 최초 실행 공유 설정 진행 창 — 로그인 직후, 대시보드를 띄우기 전에 모달로 연다. 단계(폴더 준비 → 공유 확인 → 공유 켜기 → 결과 확인)를 보여 주고
/// 끝날 때까지 닫을 수 없다(메인 프로그램을 쓸 수 없음). 끝나면 스스로 닫히고, 결과는 공유 정보 창(ShareInfoWindow)이 보여 준다.
/// </summary>
public sealed class FirstRunWindow : Window
{
    private static readonly (FirstRunStep Step, string Text)[] Steps =
    {
        (FirstRunStep.Folder, "Neosys 폴더·백업 폴더 준비"),
        (FirstRunStep.Check, "네트워크 공유 상태 확인"),
        (FirstRunStep.Enable, "네트워크 공유 켜기"),
        (FirstRunStep.Verify, "공유 결과 확인"),
    };

    private readonly StackPanel _list = new() { Margin = new Thickness(0, 14, 0, 0) };
    private readonly TextBlock _hint = new() { FontSize = 12, Foreground = Legacy.B("#B45309"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 12, 0, 0), Visibility = Visibility.Collapsed };
    private FirstRunStep _step = FirstRunStep.Folder;
    private bool _done;

    public FirstRunResult? Result { get; private set; }

    /// <summary>
    /// 이 PC에서 처음이면 진행 창을 띄워 공유를 켜고 결과를 돌려준다(끝날 때까지 돌아오지 않음). 처음이 아니면 null.
    /// NEOSYS_DB(개발·점검용 임시 DB)로 실행할 때는 이 PC의 공유 설정을 건드리지 않는다.
    /// </summary>
    public static FirstRunResult? RunIfNeeded()
    {
        if (Environment.GetEnvironmentVariable("NEOSYS_DB") is not null || !FirstRunSetup.ShouldRun(AppServices.Settings)) return null;
        var w = new FirstRunWindow();
        w.Loaded += async (_, _) =>
        {
            try
            {
                w.Result = await FirstRunSetup.RunAsync(AppServices.Settings, AppServices.ShareFolder, AppServices.Session.UserId,
                    f => Task.Run(() => NetworkShare.Check(f).Ready),
                    // 관리자 권한 확인 창이 떠 있는 동안 Process.Start가 돌아오지 않으므로 화면 스레드 밖에서 부른다.
                    // 네트워크 종류는 자동으로 바꾸지 않는다(공용 와이파이를 '개인'으로 만들 수 있어서) — 공유 정보 창에서 [공유설정]으로
                    f => Task.Run(() => NetworkShare.EnableAsync(f, makePrivate: false)),
                    AppServices.Settings.Save,
                    s => w.Dispatcher.Invoke(() => w.SetStep(s)));
            }
            catch (Exception ex) { w.Result = new FirstRunResult(false, ex.Message); }
            finally { w.Finish(); }
        };
        w.ShowDialog();
        return w.Result ?? new FirstRunResult(false, "공유 설정을 마치지 못했습니다.");
    }

    internal FirstRunWindow()
    {
        Title = "네오시스 처음 설정";
        Width = 440;
        SizeToContent = SizeToContent.Height;
        ResizeMode = ResizeMode.NoResize;
        WindowStyle = WindowStyle.ToolWindow;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = Legacy.B("#FFFFFF");

        var sp = new StackPanel();
        sp.Children.Add(new TextBlock { Text = "처음 설정 중입니다", FontSize = 18, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827") });
        sp.Children.Add(new TextBlock
        {
            Text = "다른 PC가 이 PC로 백업할 수 있도록 네트워크 공유를 켜고 있습니다. 설정이 끝나면 프로그램을 사용할 수 있습니다.",
            FontSize = 13, Foreground = Legacy.B("#4B5563"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 6, 0, 0),
        });
        sp.Children.Add(new ProgressBar { IsIndeterminate = true, Height = 6, Margin = new Thickness(0, 14, 0, 0) });
        sp.Children.Add(_list);
        sp.Children.Add(_hint);
        Content = new Border { Padding = new Thickness(24, 20, 24, 22), Child = sp };

        Closing += (_, e) => e.Cancel = !_done;   // 끝나기 전에는 닫지 않는다(Alt+F4 포함)
        Render();
    }

    /// <summary>단계 표시(화면 캡처용으로도 부른다)</summary>
    internal void SetStep(FirstRunStep step)
    {
        _step = step;
        Render();
    }

    private void Finish()
    {
        _done = true;
        Close();
    }

    private void Render()
    {
        _list.Children.Clear();
        foreach (var (step, text) in Steps)
        {
            var (mark, color, weight) = step < _step ? ("✓", "#15803D", FontWeights.Normal)
                : step == _step ? ("●", "#4F46E5", FontWeights.Bold)
                : ("○", "#9CA3AF", FontWeights.Normal);
            var row = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 3, 0, 3) };
            row.Children.Add(new TextBlock { Text = mark, Width = 22, FontWeight = FontWeights.Bold, Foreground = Legacy.B(color) });
            row.Children.Add(new TextBlock { Text = text + (step == _step ? " 중…" : ""), FontWeight = weight, Foreground = Legacy.B(step > _step ? "#9CA3AF" : "#111827") });
            _list.Children.Add(row);
        }
        _hint.Text = "Windows 관리자 권한 확인 창이 뜨면 [예]를 누르세요. [아니요]를 누르면 공유 없이 시작하고, 나중에 DB 관리 → [네트워크 공유]에서 켤 수 있습니다.";
        _hint.Visibility = _step == FirstRunStep.Enable ? Visibility.Visible : Visibility.Collapsed;
    }
}

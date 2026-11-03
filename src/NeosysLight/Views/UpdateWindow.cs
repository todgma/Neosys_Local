using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views;

/// <summary>
/// 자동 업데이트 — 원본 Electron 스플래시("업데이트 확인 중…" → "더 나은 경험을 위해 업데이트 중입니다… n%" → 설치 후 다시 실행).
/// 로그인 전에 서버 app_version_light의 최신 버전을 보고, 더 새 버전이면 묻지 않고 받아서 교체한다(원본과 같음).
/// 서버에 못 붙거나 버전 정보가 없으면 조용히 그냥 시작한다. 받기·교체에 실패하면 알리고 지금 버전으로 시작한다.
/// </summary>
public sealed class UpdateWindow : Window
{
    private readonly TextBlock _status = new() { FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#334155"), HorizontalAlignment = HorizontalAlignment.Center, TextAlignment = TextAlignment.Center, TextWrapping = TextWrapping.Wrap };
    private readonly ProgressBar _bar = new() { Height = 8, Minimum = 0, Maximum = 1, Margin = new Thickness(0, 14, 0, 0), Foreground = Legacy.B("#4F46E5") };

    private UpdateWindow(UpdateRules.Info info, string current)
    {
        Title = "네오시스 업데이트";
        Width = 420;
        SizeToContent = SizeToContent.Height;
        ResizeMode = ResizeMode.NoResize;
        WindowStyle = WindowStyle.ToolWindow;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = Brushes.White;
        var sp = new StackPanel();
        sp.Children.Add(new TextBlock { Text = "네오시스 업데이트", FontSize = 18, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), HorizontalAlignment = HorizontalAlignment.Center });
        sp.Children.Add(new TextBlock { Text = $"현재 {current} → 새 버전 {info.Version}", FontSize = 13, Foreground = Legacy.B("#64748B"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 4, 0, 14) });
        sp.Children.Add(_status);
        sp.Children.Add(_bar);
        if (!string.IsNullOrWhiteSpace(info.ReleaseNote))
            sp.Children.Add(new TextBlock { Text = info.ReleaseNote, FontSize = 12, Foreground = Legacy.B("#475569"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 14, 0, 0), MaxHeight = 160 });
        Content = new Border { Padding = new Thickness(24, 20, 24, 22), Child = sp };
        _status.Text = "더 나은 경험을 위해 업데이트 중입니다…";
    }

#if DEBUG
    /// <summary>화면 확인용 견본(디버그 스냅샷)</summary>
    internal static UpdateWindow Preview()
    {
        var w = new UpdateWindow(new UpdateRules.Info("0.2.0", "https://files.test/NeosysLight-0.2.0.exe", false, "커뮤니티 글쓰기·삭제, 일정 끌어다 놓기로 날짜 변경"), CurrentVersion);
        w._bar.Value = 0.42;
        w._status.Text = "더 나은 경험을 위해 업데이트 중입니다… 42%";
        return w;
    }
#endif

    /// <summary>프로그램 버전(csproj &lt;Version&gt;)</summary>
    public static string CurrentVersion
    {
        get
        {
            var v = Assembly.GetEntryAssembly()?.GetName().Version ?? new Version(0, 0, 0);
            return $"{v.Major}.{v.Minor}.{Math.Max(v.Build, 0)}";
        }
    }

    /// <summary>
    /// 시작할 때 한 번. 새 버전을 받아 교체 스크립트를 띄웠으면 true(호출한 쪽은 프로그램을 끝낸다).
    /// 디버그 빌드·dotnet 실행에서는 확인하지 않는다(NEOSYS_FORCE_UPDATE=1이면 디버그에서도 확인 — 교체는 하지 않고 받기까지만).
    /// </summary>
    public static async Task<bool> CheckAndRunAsync()
    {
        CleanupOld();
        var force = Environment.GetEnvironmentVariable("NEOSYS_FORCE_UPDATE") == "1";
        var dryRun = false;
#if DEBUG
        if (!force) return false;
        dryRun = true;   // 개발 중에는 실제 exe를 바꾸지 않는다(원본 updateDryRun)
#endif
        var exe = Environment.ProcessPath;
        if (exe is null || Path.GetFileName(exe).Equals("dotnet.exe", StringComparison.OrdinalIgnoreCase)) return false;

        UpdateRules.Info? info;
        try
        {
            // 원본처럼 오래 기다리지 않는다(8초) — 오프라인이면 그냥 시작
            var check = AppServices.Server.GetLatestLightVersionAsync();
            if (await Task.WhenAny(check, Task.Delay(TimeSpan.FromSeconds(8))) != check) return false;
            info = UpdateRules.Decide(await check, CurrentVersion);
        }
        catch { return false; }
        if (info is null) return false;

        var w = new UpdateWindow(info, CurrentVersion);
        w.Show();
        try
        {
            Directory.CreateDirectory(UpdateRules.UpdateDir);
            var newExe = Path.Combine(UpdateRules.UpdateDir, $"NeosysLight-{info.Version}.exe");
            await AppServices.Server.DownloadFileAsync(info.DownloadUrl, newExe, new Progress<double>(p =>
            {
                w._bar.Value = p;
                w._status.Text = $"더 나은 경험을 위해 업데이트 중입니다… {p * 100:0}%";
            }));
            w._status.Text = "거의 다 됐어요. 잠시만 기다려 주세요…";
            if (!UpdateRules.IsValidExe(newExe)) throw new InvalidOperationException("받은 파일이 올바른 실행 파일이 아닙니다.");
            if (dryRun)
            {
                w.Close();
                Dialogs.Info($"업데이트 확인 완료(개발 모드 — 교체하지 않음)\n{newExe}");
                return false;
            }
            if (!CanWrite(Path.GetDirectoryName(exe)!))
            {
                // 쓰기 권한이 없는 폴더(예: Program Files)에 둔 경우 — 받은 파일 위치를 열어 직접 바꾸게 한다
                w.Close();
                Dialogs.Warn($"프로그램 폴더에 쓸 수 없어 자동으로 바꾸지 못했습니다.\n열린 폴더의 새 파일로 직접 바꿔 주세요.\n\n새 파일: {newExe}\n현재 파일: {exe}");
                Dialogs.OpenExternal(UpdateRules.UpdateDir);
                return false;
            }
            var script = Path.Combine(UpdateRules.UpdateDir, "swap.ps1");
            File.WriteAllText(script, UpdateRules.SwapScript(Environment.ProcessId, newExe, exe), new UTF8Encoding(true));
            Process.Start(new ProcessStartInfo("powershell.exe", $"-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"{script}\"")
            {
                UseShellExecute = false, CreateNoWindow = true,
            });
            return true;
        }
        catch (Exception ex)
        {
            w.Close();
            Dialogs.Warn((info.Mandatory ? "필수 업데이트를 받지 못했습니다." : "업데이트를 받지 못했습니다.") + " 지금 버전으로 시작합니다.\n" + ex.Message);
            return false;
        }
    }

    /// <summary>지난 교체에서 남은 이전 exe(.old) 정리</summary>
    private static void CleanupOld()
    {
        try
        {
            if (Environment.ProcessPath is { } exe && File.Exists(UpdateRules.OldPath(exe))) File.Delete(UpdateRules.OldPath(exe));
        }
        catch { /* 다음에 다시 */ }
    }

    private static bool CanWrite(string dir)
    {
        try
        {
            var probe = Path.Combine(dir, $".neosys_write_{Guid.NewGuid():N}");
            File.WriteAllText(probe, "");
            File.Delete(probe);
            return true;
        }
        catch { return false; }
    }
}

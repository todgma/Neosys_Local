using Microsoft.Win32;

namespace Neosys.Local.App.Ui;

/// <summary>
/// Windows 시작프로그램 등록 — 현재 사용자 Run 키(HKCU\...\Run)에 이 exe 경로를 넣는다(관리자 권한 불필요).
/// 작업 관리자 → 시작 앱에서 사용자가 끌 수 있다.
/// </summary>
public static class StartupRegistration
{
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string ValueName = "Neosys";

    /// <summary>설정값대로 등록/해제. exe 위치가 바뀌었으면 새 경로로 다시 쓴다.</summary>
    public static void Apply(bool enabled)
    {
        try
        {
            using var key = Registry.CurrentUser.CreateSubKey(RunKey, writable: true);
            if (key is null) return;
            if (!enabled)
            {
                if (key.GetValue(ValueName) is not null) key.DeleteValue(ValueName, throwOnMissingValue: false);
                return;
            }
            var exe = Environment.ProcessPath;
            if (string.IsNullOrEmpty(exe)) return;
            var command = $"\"{exe}\"";
            if (key.GetValue(ValueName) as string != command) key.SetValue(ValueName, command);
        }
        catch { /* 등록 실패는 실행에 영향 없음 */ }
    }
}

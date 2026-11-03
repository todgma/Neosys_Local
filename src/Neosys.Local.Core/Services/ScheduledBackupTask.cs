using System.Diagnostics;
using System.Security;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>
/// Windows 작업 스케줄러 백업(docs/DB_BACKUP.md 2장) — 계정마다 작업 하나("Neosys_Backup_&lt;계정&gt;")를 이 PC 사용자 권한으로 등록한다(관리자 권한 불필요).
/// 주기마다 "NeosysLight.exe --backup &lt;계정&gt;"을 창 없이 실행하고, 꺼져 있어서 놓친 실행은 켜지는 대로 한 번 한다.
/// Windows에 로그인해 있을 때만 돈다(로그인 안 한 상태에서는 공유폴더에 접속할 권한이 없다). PC가 꺼져 있으면 돌지 않는다.
/// </summary>
public static class ScheduledBackupTask
{
    public static string TaskName(string userId) => "Neosys_Backup_" + AccountStore.SafeName(userId);

    /// <summary>작업 스케줄러 XML(UTF-16로 저장해 schtasks /XML 로 등록)</summary>
    public static string BuildXml(string exePath, string userId, int intervalMinutes, DateTime start, string? windowsUser)
    {
        var interval = Math.Max(10, intervalMinutes);
        string X(string s) => SecurityElement.Escape(s);
        var principalUser = windowsUser is null ? "" : $"\n      <UserId>{X(windowsUser)}</UserId>";
        return $"""
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>{X($"네오시스 로컬 DB 자동 백업 ({userId}) — 프로그램 DB 관리 창에서 켜고 끕니다.")}</Description>
  </RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <StartBoundary>{start:yyyy-MM-ddTHH:mm:ss}</StartBoundary>
      <Repetition>
        <Interval>PT{interval}M</Interval>
        <StopAtDurationEnd>false</StopAtDurationEnd>
      </Repetition>
      <Enabled>true</Enabled>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">{principalUser}
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>true</Hidden>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{X(exePath)}</Command>
      <Arguments>{X($"--backup \"{userId}\"")}</Arguments>
    </Exec>
  </Actions>
</Task>
""";
    }

    /// <summary>등록(이미 있으면 바꿈) — 주기가 바뀌면 다시 부른다. 실패하면 오류 문구</summary>
    public static string? Register(string exePath, string userId, int intervalMinutes)
    {
        var xml = Path.Combine(Path.GetTempPath(), $"neosys_task_{Guid.NewGuid():N}.xml");
        try
        {
            var user = Environment.UserDomainName + "\\" + Environment.UserName;
            File.WriteAllText(xml, BuildXml(exePath, userId, intervalMinutes, DateTime.Now.AddMinutes(Math.Max(10, intervalMinutes)), user), System.Text.Encoding.Unicode);
            var (code, output) = Schtasks($"/Create /TN \"{TaskName(userId)}\" /XML \"{xml}\" /F");
            return code == 0 ? null : "작업 스케줄러에 등록하지 못했습니다.\n" + output;
        }
        catch (Exception ex)
        {
            return "작업 스케줄러에 등록하지 못했습니다.\n" + ex.Message;
        }
        finally
        {
            try { File.Delete(xml); } catch { /* 임시 파일 */ }
        }
    }

    /// <summary>등록 해제(없으면 그대로). 실패하면 오류 문구</summary>
    public static string? Delete(string userId)
    {
        if (!Exists(userId)) return null;
        var (code, output) = Schtasks($"/Delete /TN \"{TaskName(userId)}\" /F");
        return code == 0 ? null : "작업 스케줄러에서 지우지 못했습니다.\n" + output;
    }

    public static bool Exists(string userId) => Schtasks($"/Query /TN \"{TaskName(userId)}\"").Code == 0;

    /// <summary>등록된 작업이 실행하는 exe 경로(작업이 없으면 null)</summary>
    public static string? RegisteredCommand(string userId)
    {
        var (code, output) = Schtasks($"/Query /TN \"{TaskName(userId)}\" /XML");
        return code == 0 ? CommandFromXml(output) : null;
    }

    public static string? CommandFromXml(string xml)
    {
        try
        {
            return System.Xml.Linq.XDocument.Parse(xml).Descendants().FirstOrDefault(e => e.Name.LocalName == "Command")?.Value.Trim().Trim('"');
        }
        catch { return null; }
    }

    /// <summary>
    /// 로그인할 때 — 켜져 있는데 작업이 없거나 다른 exe를 가리키면(exe를 옮겼거나 이름이 바뀐 경우: Neosys.exe → NeosysLight.exe) 지금 exe로 다시 등록한다.
    /// 그대로 두면 재부팅 뒤 작업이 없는 파일을 실행하려다 조용히 실패해 백업이 멈춘다. 고쳤으면 true
    /// </summary>
    public static bool Repair(string exePath, string userId, int intervalMinutes, Func<string, string?> registeredCommand, Func<string, string, int, string?> register)
    {
        var current = registeredCommand(userId);
        if (current is not null && string.Equals(Path.GetFullPath(current), Path.GetFullPath(exePath), StringComparison.OrdinalIgnoreCase)) return false;
        return register(exePath, userId, intervalMinutes) is null;
    }

    private static (int Code, string Output) Schtasks(string args)
    {
        try
        {
            using var p = Process.Start(new ProcessStartInfo("schtasks.exe", args)
            {
                UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardOutput = true, RedirectStandardError = true,
            })!;
            var output = p.StandardOutput.ReadToEnd() + p.StandardError.ReadToEnd();
            p.WaitForExit(30000);
            return (p.ExitCode, output.Trim());
        }
        catch (Exception ex)
        {
            return (-1, ex.Message);
        }
    }
}

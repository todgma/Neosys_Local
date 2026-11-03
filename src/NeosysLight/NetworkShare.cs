using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;

namespace Neosys.Local.App;

/// <summary>Windows 네트워크 공유 상태 — DB 관리 → 네트워크 공유 탭 표시용</summary>
public sealed record ShareStatus(
    bool ServerRunning, bool FileSharingOpen, bool DiscoveryOpen, bool PublicNetwork, bool Shared, string? Error)
{
    /// <summary>다른 PC가 \\이PC\Neosys로 들어올 수 있는 상태</summary>
    public bool Ready => ServerRunning && FileSharingOpen && Shared;
}

/// <summary>
/// 이 PC의 Neosys 폴더를 네트워크에 'Neosys'로 공유한다(docs/DB_BACKUP.md 2장).
/// 확인(Check)은 일반 권한으로, 켜기(EnableAsync)는 관리자 권한 확인 창(UAC)을 한 번 띄워 PowerShell로 한다:
/// 파일 공유 서비스 시작·자동 실행, (원하면) 네트워크를 '개인'으로, 개인·도메인 네트워크의 '파일 및 프린터 공유'·'네트워크 검색' 방화벽 규칙 켜기,
/// 폴더 권한(Everyone 수정)과 공유 'Neosys'(Everyone 변경 = 읽기/쓰기) 만들기 — 이미 있는 공유에도 Everyone 변경 권한을 더한다.
/// 공용 네트워크 규칙은 건드리지 않는다.
/// </summary>
public static class NetworkShare
{
    public const string ShareName = "Neosys";
    private const string FilePrinterGroup = "@FirewallAPI.dll,-28502";
    private const string DiscoveryGroup = "@FirewallAPI.dll,-32752";
    private const string MarkerFile = ".neosys_share";
    private const int NetFwProfilePublic = 4;

    /// <summary>다른 PC에서 연결할 주소</summary>
    public static string UncPath => $@"\\{Environment.MachineName}\{ShareName}";

    /// <summary>
    /// 상태 확인. 공유 여부는 폴더에 표시 파일을 쓰고 \\localhost\Neosys에서 같은 파일이 보이는지로 판단한다
    /// (공유 목록의 경로를 읽으려면 관리자 권한이 필요해서). 공유가 다른 폴더를 가리키면 '공유 안 됨'으로 본다.
    /// </summary>
    public static ShareStatus Check(string folder)
    {
        var errors = new List<string>();
        bool server = false, fileSharing = false, discovery = false, isPublic = false, shared = false;
        try
        {
            using var sc = new ServiceController("LanmanServer");
            server = sc.Status == ServiceControllerStatus.Running;
        }
        catch (Exception ex) { errors.Add("파일 공유 서비스: " + ex.Message); }
        try
        {
            dynamic fw = Activator.CreateInstance(Type.GetTypeFromProgID("HNetCfg.FwPolicy2")!)!;
            int profiles = fw.CurrentProfileTypes;
            isPublic = (profiles & NetFwProfilePublic) != 0;
            fileSharing = fw.IsRuleGroupCurrentlyEnabled(FilePrinterGroup);
            discovery = fw.IsRuleGroupCurrentlyEnabled(DiscoveryGroup);
        }
        catch (Exception ex) { errors.Add("방화벽: " + ex.Message); }
        try
        {
            if (server && Directory.Exists(folder))
            {
                var marker = Path.Combine(folder, MarkerFile);
                if (!File.Exists(marker)) File.WriteAllText(marker, Guid.NewGuid().ToString("N"));
                var remote = Path.Combine($@"\\localhost\{ShareName}", MarkerFile);
                shared = File.Exists(remote) && File.ReadAllText(remote) == File.ReadAllText(marker);
            }
        }
        catch { /* 공유 없음 */ }
        return new ShareStatus(server, fileSharing, discovery, isPublic, shared, errors.Count == 0 ? null : string.Join("\n", errors));
    }

    /// <summary>
    /// 관리자 권한으로 공유를 켠다. makePrivate: 지금 네트워크가 '공용'이면 '개인'으로 바꾼다(사무실 네트워크일 때만).
    /// 돌려주는 값: null = 성공, 그 외 = 오류 문구(확인 창에서 '아니요'를 누른 경우 포함)
    /// </summary>
    public static async Task<string?> EnableAsync(string folder, bool makePrivate)
    {
        var dir = Path.Combine(Path.GetTempPath(), $"neosys_share_{Guid.NewGuid():N}");
        Directory.CreateDirectory(dir);
        var script = Path.Combine(dir, "share.ps1");
        var log = Path.Combine(dir, "result.txt");
        try
        {
            File.WriteAllText(script, Script, new System.Text.UTF8Encoding(true));   // Windows PowerShell 5.1은 BOM이 있어야 UTF-8로 읽는다
            using var p = Process.Start(new ProcessStartInfo("powershell.exe",
                $"-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"{script}\" -Folder \"{folder}\" -MakePrivate {(makePrivate ? 1 : 0)} -Log \"{log}\"")
            {
                UseShellExecute = true, Verb = "runas", WindowStyle = ProcessWindowStyle.Hidden,
            })!;
            await p.WaitForExitAsync();
            var result = File.Exists(log) ? File.ReadAllText(log).Trim() : "";
            return result == "OK" ? null : result.StartsWith("ERR ") ? result[4..] : "공유 설정 결과를 확인하지 못했습니다.";
        }
        catch (Win32Exception ex) when (ex.NativeErrorCode == 1223)
        {
            return "관리자 권한 확인 창에서 취소했습니다.";
        }
        catch (Exception ex)
        {
            return ex.Message;
        }
        finally
        {
            try { Directory.Delete(dir, recursive: true); } catch { /* 임시 폴더 */ }
        }
    }

    /// <summary>관리자 권한으로 실행하는 스크립트 — 결과는 -Log 파일에 OK 또는 'ERR 메시지'</summary>
    internal const string Script = """
param([string]$Folder, [int]$MakePrivate, [string]$Log)
$ErrorActionPreference = 'Stop'
try {
    Set-Service -Name LanmanServer -StartupType Automatic
    Start-Service -Name LanmanServer
    if ($MakePrivate -eq 1) {
        Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' } | Set-NetConnectionProfile -NetworkCategory Private
    }
    foreach ($g in @('@FirewallAPI.dll,-28502', '@FirewallAPI.dll,-32752')) {
        Get-NetFirewallRule -Group $g | Where-Object { $_.Profile.ToString() -match 'Private|Domain' } | Enable-NetFirewallRule
    }
    New-Item -ItemType Directory -Force -Path $Folder | Out-Null
    # Everyone(S-1-1-0) — 한글 Windows에서는 이름이 다르므로 SID로 찾는다
    $everyone = (New-Object System.Security.Principal.SecurityIdentifier 'S-1-1-0').Translate([System.Security.Principal.NTAccount]).Value
    & icacls.exe $Folder /grant '*S-1-1-0:(OI)(CI)M' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw '폴더 권한(Everyone 수정)을 설정하지 못했습니다.' }
    $old = Get-SmbShare -Name 'Neosys' -ErrorAction SilentlyContinue
    if ($old -and $old.Path.TrimEnd('\') -ne $Folder.TrimEnd('\')) { Remove-SmbShare -Name 'Neosys' -Force; $old = $null }
    if (-not $old) { New-SmbShare -Name 'Neosys' -Path $Folder -ChangeAccess $everyone -Description 'Neosys backup' | Out-Null }
    else { Grant-SmbShareAccess -Name 'Neosys' -AccountName $everyone -AccessRight Change -Force | Out-Null }
    'OK' | Out-File -FilePath $Log -Encoding utf8
} catch {
    ('ERR ' + $_.Exception.Message) | Out-File -FilePath $Log -Encoding utf8
}
""";
}

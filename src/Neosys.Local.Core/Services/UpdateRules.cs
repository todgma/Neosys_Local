using System.Globalization;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>
/// 로컬 프로그램 자동 업데이트 규칙 — 원본 Electron setupAutoUpdater(버전 비교 → 내려받기 → exe 확인 → 교체 후 다시 실행)를 단일 exe에 맞춘 것.
/// 버전 정보는 서버 app_version_light(GET /api/version/light/latest). 실행 중인 exe는 덮어쓸 수 없으므로
/// 새 exe를 따로 받아 두고, 프로그램이 끝나면 교체 스크립트(PowerShell)가 바꿔 넣고 다시 실행한다.
/// </summary>
public static class UpdateRules
{
    public sealed record Info(string Version, string DownloadUrl, bool Mandatory, string? ReleaseNote);

    /// <summary>버전 비교(원본 compareVersions) — "1.2.10" &gt; "1.2.9", 앞의 v·뒤의 -beta 등은 무시, 빈 자리는 0. a가 크면 양수</summary>
    public static int Compare(string? a, string? b)
    {
        static int[] Parts(string? v)
        {
            var s = (v ?? "").Trim().TrimStart('v', 'V');
            var cut = s.IndexOfAny(new[] { '-', '+', ' ' });
            if (cut >= 0) s = s[..cut];
            return s.Split('.').Select(p => int.TryParse(p, NumberStyles.None, CultureInfo.InvariantCulture, out var n) ? n : 0).ToArray();
        }
        var x = Parts(a);
        var y = Parts(b);
        for (int i = 0; i < Math.Max(x.Length, y.Length); i++)
        {
            var d = (i < x.Length ? x[i] : 0).CompareTo(i < y.Length ? y[i] : 0);
            if (d != 0) return d;
        }
        return 0;
    }

    /// <summary>서버 응답 → 받을 업데이트. 더 새 버전이 아니거나 주소가 http(s)가 아니면 null(원본: 최신이 아니거나 downloadUrl 없음 → 그냥 시작)</summary>
    public static Info? Decide(Row? latest, string currentVersion)
    {
        var ver = latest?.Str("version");
        var url = latest?.Str("downloadUrl");
        if (string.IsNullOrWhiteSpace(ver) || string.IsNullOrWhiteSpace(url)) return null;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var u) || (u.Scheme != Uri.UriSchemeHttps && u.Scheme != Uri.UriSchemeHttp)) return null;
        if (Compare(ver, currentVersion) <= 0) return null;
        var mandatory = latest!["mandatory"] is true || latest.Str("mandatory") is "Y" or "true";
        return new Info(ver.Trim(), url, mandatory, latest.Str("releaseNote"));
    }

    /// <summary>받은 파일이 진짜 Windows 실행 파일인지(원본 isValidExeFile: 100KB 이상 + 'MZ' 머리)</summary>
    public static bool IsValidExe(string path)
    {
        try
        {
            var fi = new FileInfo(path);
            if (!fi.Exists || fi.Length < 100 * 1024) return false;
            using var fs = fi.OpenRead();
            return fs.ReadByte() == 'M' && fs.ReadByte() == 'Z';
        }
        catch { return false; }
    }

    /// <summary>업데이트 파일 폴더(%LOCALAPPDATA%\Neosys\update)</summary>
    public static string UpdateDir => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "update");

    /// <summary>교체 때 남기는 이전 exe(다음 실행 때 지운다)</summary>
    public static string OldPath(string exePath) => exePath + ".old";

    /// <summary>
    /// 교체 스크립트(PowerShell) — 프로그램(pid)이 끝나기를 기다렸다가: 현재 exe → .old 로 이름 변경 → 새 exe 복사 → 다시 실행.
    /// 복사에 실패하면 .old를 되돌려 원래 프로그램을 실행한다. 경로의 작은따옴표는 PowerShell 규칙대로 두 번 쓴다.
    /// </summary>
    public static string SwapScript(int pid, string newExe, string targetExe)
    {
        static string Q(string s) => "'" + s.Replace("'", "''") + "'";
        var old = OldPath(targetExe);
        return string.Join("\r\n", new[]
        {
            "$ErrorActionPreference = 'Stop'",
            $"$new = {Q(newExe)}; $target = {Q(targetExe)}; $old = {Q(old)}",
            $"try {{ Wait-Process -Id {pid} -Timeout 60 -ErrorAction SilentlyContinue }} catch {{ }}",
            "$ok = $false",
            "for ($i = 0; $i -lt 40 -and -not $ok; $i++) {",
            "  try {",
            "    if (Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Force }",
            "    Move-Item -LiteralPath $target -Destination $old -Force",
            "    try { Copy-Item -LiteralPath $new -Destination $target -Force; $ok = $true }",
            "    catch { Move-Item -LiteralPath $old -Destination $target -Force; throw }",
            "  } catch { Start-Sleep -Milliseconds 500 }",
            "}",
            "if ($ok) { Remove-Item -LiteralPath $new -Force -ErrorAction SilentlyContinue }",
            "Start-Process -FilePath $target",
            "Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue",
        }) + "\r\n";
    }
}

using System.Diagnostics;
using System.Net;
using System.Text;
using Neosys.Local.Core.Server;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>자동 업데이트 — 버전 비교·판단·exe 확인·교체 스크립트, 서버 요청 모양(가짜 HTTP, 운영 서버 호출 없음)</summary>
public class UpdateTests
{
    private sealed class Fake(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public List<string> Urls { get; } = new();
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Urls.Add(request.RequestUri!.AbsoluteUri);
            return Task.FromResult(respond(request));
        }
    }

    private static HttpResponseMessage Json(string s) => new(HttpStatusCode.OK) { Content = new StringContent(s, Encoding.UTF8, "application/json") };

    [Fact]
    public void 버전_비교()
    {
        Assert.True(UpdateRules.Compare("1.2.10", "1.2.9") > 0);
        Assert.True(UpdateRules.Compare("0.2.0", "0.10.0") < 0);
        Assert.Equal(0, UpdateRules.Compare("v1.0", "1.0.0"));
        Assert.Equal(0, UpdateRules.Compare("1.0.0-beta", "1.0.0"));
        Assert.True(UpdateRules.Compare("1.0.0.1", "1.0.0") > 0);
        Assert.True(UpdateRules.Compare("", "0.0.1") < 0);
    }

    [Fact]
    public void 업데이트_판단()
    {
        var latest = new Row { ["version"] = "0.2.0", ["downloadUrl"] = "https://files.test/Neosys-0.2.0.exe", ["mandatory"] = true, ["releaseNote"] = "새 기능" };
        var info = UpdateRules.Decide(latest, "0.1.0");
        Assert.Equal(new UpdateRules.Info("0.2.0", "https://files.test/Neosys-0.2.0.exe", true, "새 기능"), info);
        Assert.Null(UpdateRules.Decide(latest, "0.2.0"));                                         // 같은 버전
        Assert.Null(UpdateRules.Decide(latest, "0.3.0"));                                         // 더 새 버전 사용 중
        Assert.Null(UpdateRules.Decide(null, "0.1.0"));                                           // 등록된 버전 없음
        Assert.Null(UpdateRules.Decide(new Row { ["version"] = "0.2.0", ["downloadUrl"] = "file:///c:/x.exe" }, "0.1.0"));   // http(s)만
        Assert.False(UpdateRules.Decide(new Row { ["version"] = "0.2.0", ["downloadUrl"] = "http://a/b.exe", ["mandatory"] = false }, "0.1.0")!.Mandatory);
    }

    [Fact]
    public async Task 버전_조회와_내려받기_요청()
    {
        var exe = new byte[200 * 1024];
        exe[0] = (byte)'M'; exe[1] = (byte)'Z';
        var fake = new Fake(r => r.RequestUri!.Host == "files.test"
            ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(exe) }
            : r.RequestUri.Query.Contains("mac")
                ? Json("{\"success\":true,\"data\":null,\"message\":\"등록된 버전 정보가 없습니다.\"}")
                : Json("{\"success\":true,\"data\":{\"version\":\"0.2.0\",\"downloadUrl\":\"https://files.test/n.exe\",\"mandatory\":false,\"releaseNote\":null,\"platform\":\"win\"}}"));
        var api = new ServerApi("http://test.local", fake);

        var latest = await api.GetLatestLightVersionAsync();
        Assert.Equal("http://test.local/api/version/light/latest?platform=win", fake.Urls[0]);
        Assert.Equal("0.2.0", UpdateRules.Decide(latest, "0.1.0")!.Version);
        Assert.Null(await api.GetLatestLightVersionAsync("mac"));

        var path = Path.Combine(Path.GetTempPath(), $"neosys_upd_{Guid.NewGuid():N}.exe");
        try
        {
            var last = 0.0;
            await api.DownloadFileAsync("https://files.test/n.exe", path, new SyncProgress(p => last = p));
            Assert.Equal(1.0, last);
            Assert.True(UpdateRules.IsValidExe(path));
            File.WriteAllBytes(path, new byte[200 * 1024]);          // MZ 머리 없음
            Assert.False(UpdateRules.IsValidExe(path));
            File.WriteAllBytes(path, new byte[] { (byte)'M', (byte)'Z' });   // 너무 작음
            Assert.False(UpdateRules.IsValidExe(path));
        }
        finally { File.Delete(path); }
    }

    private sealed class SyncProgress(Action<double> report) : IProgress<double>
    {
        public void Report(double value) => report(value);
    }

    [Fact]
    public void 교체_스크립트가_파일을_바꾼다()
    {
        // 실제 PowerShell로 실행해 본다(다시 실행하는 줄만 빼고). 경로에 한글·공백·작은따옴표
        var dir = Path.Combine(Path.GetTempPath(), $"neosys 업데이트 '{Guid.NewGuid():N}");
        Directory.CreateDirectory(dir);
        try
        {
            var target = Path.Combine(dir, "NeosysLight.exe");
            var newExe = Path.Combine(dir, "Neosys-0.2.0.exe");
            File.WriteAllText(target, "old");
            File.WriteAllText(newExe, "new");
            var script = UpdateRules.SwapScript(999999, newExe, target);
            Assert.Contains("''", script);   // 작은따옴표 이스케이프
            var ps1 = Path.Combine(dir, "swap.ps1");
            File.WriteAllText(ps1, script.Replace("Start-Process -FilePath $target", ""), new UTF8Encoding(true));
            using var p = Process.Start(new ProcessStartInfo("powershell.exe", $"-NoProfile -ExecutionPolicy Bypass -File \"{ps1}\"") { UseShellExecute = false, CreateNoWindow = true })!;
            Assert.True(p.WaitForExit(60_000));
            Assert.Equal("new", File.ReadAllText(target));
            Assert.Equal("old", File.ReadAllText(UpdateRules.OldPath(target)));
            Assert.False(File.Exists(newExe));
            Assert.False(File.Exists(ps1));   // 스크립트는 스스로 지운다
        }
        finally { Directory.Delete(dir, true); }
    }
}

using Microsoft.Data.Sqlite;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>백업 복구 — 임시 폴더를 공유폴더·이 PC Neosys 폴더·계정 폴더로 삼는다(docs/DB_BACKUP.md 4장)</summary>
public sealed class RestoreServiceTests : IDisposable
{
    private readonly string _work = Path.Combine(Path.GetTempPath(), $"neosys_rs_{Guid.NewGuid():N}");
    private readonly TestDb _t = new();
    private DateTime _now = new(2026, 10, 28, 14, 30, 0);

    private string Share(string name) => Path.Combine(_work, name);
    private string Files => Path.Combine(_work, "files");
    private string Local => Path.Combine(_work, "local");
    private string Target => Path.Combine(_work, "account", "tester.db");
    private string TargetFiles => Path.Combine(_work, "account", "files");
    private BackupService Svc() => new(_t.Db, Files, Local, () => _now);
    private List<BackupEntry> Find(params string[] shares) => RestoreService.Find(shares, Local, _t.Session.UserId);

    public void Dispose()
    {
        _t.Dispose();
        SqliteConnection.ClearAllPools();
        try { Directory.Delete(_work, true); } catch { /* 무시 */ }
    }

    [Fact]
    public async Task 공유폴더와_로컬에서_날짜별로_모으고_늦게_백업한_것_먼저()
    {
        await Svc().RunAsync(_t.Session, new[] { Share("A") }, 7);
        _now = _now.AddHours(2);
        await Svc().RunAsync(_t.Session, new[] { Share("B") }, 7);   // 같은 날 B에 더 늦게
        _now = _now.AddDays(-1);
        Directory.CreateDirectory(_work);
        var broken = Path.Combine(_work, "not_a_folder");
        File.WriteAllText(broken, "파일이라 폴더를 만들 수 없음");
        await Svc().RunAsync(_t.Session, new[] { broken }, 7);   // 공유폴더 실패 → 이 PC에만

        // 이 PC Neosys 폴더에는 매번 백업된다(10-28은 16:30 것으로 덮어씀)
        var all = Find(Share("A"), Share("B"), @"\\NO-SUCH-PC\Neosys");
        Assert.Equal(4, all.Count);
        var days = RestoreService.ByDate(all);
        Assert.Equal(new[] { "20261028", "20261027" }, days.Select(d => d[0].Manifest.Date));
        Assert.Equal(3, days[0].Count);
        Assert.Equal(16, days[0][0].Manifest.BackedUpAt.Hour);   // 늦게 백업한 것(B 또는 이 PC) 먼저
        Assert.Equal(Share("A"), days[0][2].Source);
        Assert.True(Assert.Single(days[1]).IsLocal);
        Assert.Equal("tester_20261027.db", Path.GetFileName(days[1][0].DbFile));

        // Neosys 폴더 자체를 골라도 찾는다
        Assert.Equal(2, Find(Path.Combine(Share("A"), "Neosys"), Share("B")).Count(e => !e.IsLocal));
    }

    [Fact]
    public async Task 복구하면_지금_DB를_보관하고_교체_첨부도_받아옴()
    {
        var photo = Path.Combine(Files, "SYFDV02", "202610", "a.jpg");
        var gone = Path.Combine(Files, "SYFDV02", "202610", "b.jpg");
        Directory.CreateDirectory(Path.GetDirectoryName(photo)!);
        File.WriteAllBytes(photo, new byte[] { 1 });
        File.WriteAllBytes(gone, new byte[] { 2 });
        await Svc().RunAsync(_t.Session, new[] { Share("A") }, 7);
        File.Delete(gone);   // 다음 날 지움 → 미러의 .deleted\10-29 로
        _now = _now.AddDays(1);
        await Svc().RunAsync(_t.Session, new[] { Share("A") }, 7);

        // 지금 DB(복구 대상 PC) — 다른 내용
        new LocalDatabase(Target).Initialize();
        var day28 = RestoreService.ByDate(Find(Share("A"))).Single(d => d[0].Manifest.Date == "20261028");
        var r = RestoreService.Restore(day28, Target, TargetFiles, 7, () => _now);

        Assert.True(r.Ok, r.Error);
        Assert.Equal(day28[0].Manifest.Sha256, BackupService.Sha256Of(Target));
        Assert.True(LocalDatabase.Inspect(Target).Ok);
        Assert.NotNull(r.BeforePath);
        Assert.True(File.Exists(r.BeforePath));
        Assert.Matches(@"tester\.before-restore-20261029-143000\.db$", r.BeforePath);
        Assert.Equal(2, r.FilesRestored);   // a.jpg(미러) + b.jpg(10-28 이후 지워진 파일)
        Assert.True(File.Exists(Path.Combine(TargetFiles, "SYFDV02", "202610", "b.jpg")));
        Assert.Empty(Directory.GetFiles(Path.GetDirectoryName(Target)!, "*.restore-tmp.db"));

        var before = RestoreService.FindBeforeRestore(Target, "tester");
        Assert.True(Assert.Single(before).IsBeforeRestore);
    }

    [Fact]
    public async Task 새_PC는_보관_없이_가져오기만()
    {
        await Svc().RunAsync(_t.Session, new[] { Share("A") }, 7);
        var r = RestoreService.Restore(RestoreService.ByDate(Find(Share("A")))[0], Target, TargetFiles, 7, () => _now);
        Assert.True(r.Ok, r.Error);
        Assert.Null(r.BeforePath);
        Assert.True(File.Exists(Target));
    }

    [Fact]
    public async Task 손상된_백업은_건너뛰고_다른_공유폴더_것을_쓴다()
    {
        await Svc().RunAsync(_t.Session, new[] { Share("A"), Share("B") }, 7);
        var day = RestoreService.ByDate(Find(Share("A"), Share("B")))[0];
        Assert.Equal(3, day.Count);   // 이 PC + A + B
        File.WriteAllBytes(day[0].DbFile, new byte[] { 0, 1, 2 });   // 먼저 시도할 쪽을 망가뜨림

        var r = RestoreService.Restore(day, Target, TargetFiles, 7, () => _now);
        Assert.True(r.Ok, r.Error);
        Assert.Equal(day[1].Source, r.Used!.Source);

        foreach (var e in day.Skip(1)) File.WriteAllBytes(e.DbFile, new byte[] { 3 });
        var r2 = RestoreService.Restore(day, Target, TargetFiles, 7, () => _now);
        Assert.False(r2.Ok);
        Assert.Contains("SHA-256", r2.Error);
    }

    [Fact]
    public async Task 더_새_버전_백업은_막는다()
    {
        await Svc().RunAsync(_t.Session, new[] { Share("A") }, 7);
        var entry = Find(Share("A"))[0];
        using (var c = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = entry.DbFile, Pooling = false }.ToString()))
        {
            c.Open();
            using var cmd = c.CreateCommand();
            cmd.CommandText = $"PRAGMA user_version = {LocalDatabase.SchemaVersion + 1}";
            cmd.ExecuteNonQuery();
        }
        var m = entry.Manifest;
        m.Sha256 = "";   // SHA는 통과시키고 버전만 본다
        var r = RestoreService.Restore(new[] { entry }, Target, TargetFiles, 7, () => _now);
        Assert.False(r.Ok);
        Assert.Contains("업데이트", r.Error);
        Assert.False(File.Exists(Target));
    }

    [Fact]
    public async Task 복구_전_DB는_보관_일수_뒤_정리()
    {
        await Svc().RunAsync(_t.Session, new[] { Share("A") }, 7);
        var day = RestoreService.ByDate(Find(Share("A")))[0];
        new LocalDatabase(Target).Initialize();
        RestoreService.Restore(day, Target, TargetFiles, 7, () => _now);
        RestoreService.Restore(day, Target, TargetFiles, 7, () => _now.AddDays(3));
        Assert.Equal(2, RestoreService.FindBeforeRestore(Target, "tester").Count);

        RestoreService.Restore(day, Target, TargetFiles, 7, () => _now.AddDays(8));
        var left = RestoreService.FindBeforeRestore(Target, "tester").Select(e => e.Manifest.Date).ToList();
        Assert.Equal(new[] { "20261105", "20261031" }, left);
    }

    [Fact]
    public async Task 백업이_돌고_있으면_끝난_뒤_복구()
    {
        await Svc().RunAsync(_t.Session, new[] { Share("A") }, 7);
        var day = RestoreService.ByDate(Find(Share("A")))[0];
        new LocalDatabase(Target).Initialize();
        SqliteConnection.ClearAllPools();
        var held = BackupLock.Acquire(BackupLock.PathFor(Target), TimeSpan.FromSeconds(5));
        var run = Task.Run(() => RestoreService.Restore(day, Target, TargetFiles, 7, () => _now));
        await Task.Delay(800);
        Assert.False(run.IsCompleted);
        held.Dispose();
        var r = await run;
        Assert.True(r.Ok, r.Error);
    }
}

using System.Text.Json;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>공유폴더 분산 백업 — 임시 폴더를 공유폴더·이 PC Neosys 폴더로 삼는다(docs/DB_BACKUP.md 2장)</summary>
public sealed class BackupServiceTests : IDisposable
{
    private readonly string _work = Path.Combine(Path.GetTempPath(), $"neosys_bk_{Guid.NewGuid():N}");
    private readonly TestDb _t = new();
    private DateTime _now = new(2026, 10, 28, 14, 30, 0);

    private string Share(string name) => Path.Combine(_work, name);
    private string Files => Path.Combine(_work, "files");
    private string Local => Path.Combine(_work, "local");
    private BackupService Svc() => new(_t.Db, Files, Local, () => _now);
    private string Folder(string share) => BackupService.BackupFolder(BackupService.ShareRoot(share), _t.Session.UserId);
    private string LocalFolder => BackupService.BackupFolder(Local, _t.Session.UserId);

    public void Dispose()
    {
        _t.Dispose();
        try { Directory.Delete(_work, true); } catch { /* 무시 */ }
    }

    [Fact]
    public async Task 등록된_공유폴더마다_날짜_파일과_정보()
    {
        await _t.Sp.ExecuteAsync("rt_realtor_info", "UPSERT", new Dictionary<string, object?> { ["rtNo"] = 7L, ["id"] = "tester", ["rtNm"] = "테스터", ["offNo"] = 3L });
        var r = await Svc().RunAsync(_t.Session, new[] { Share("A"), Share("B") }, 7);

        Assert.True(r.Ok, r.Error);
        Assert.Equal(3, r.Targets.Count(x => x.Ok));   // 이 PC Neosys 폴더 + 공유폴더 2곳
        Assert.True(r.Targets[0].IsLocal);
        foreach (var dir in new[] { Folder(Share("A")), Folder(Share("B")), LocalFolder })
        {
            var db = Path.Combine(dir, "tester_20261028.db");
            Assert.True(File.Exists(db));
            Assert.False(File.Exists(db + "-wal"));   // 사본은 파일 하나
            Assert.True(LocalDatabase.Inspect(db).Ok);

            var m = JsonSerializer.Deserialize<BackupManifest>(File.ReadAllText(Path.Combine(dir, "latest.json")))!;
            Assert.Equal("tester", m.UserId);
            Assert.Equal("20261028", m.Date);
            Assert.Equal(BackupService.Sha256Of(db), m.Sha256);
            Assert.True(m.DbVersion > 0);
            Assert.True(File.Exists(Path.Combine(dir, "tester_20261028.json")));
        }
        Assert.Equal(Path.Combine(Share("A"), "Neosys", "tester", "BackUp"), Folder(Share("A")));
        // \\PC\Neosys 처럼 Neosys 폴더 자체를 등록해도 같은 곳
        Assert.Equal(Folder(Share("A")), BackupService.BackupFolder(BackupService.ShareRoot(Path.Combine(Share("A"), "Neosys")), "tester"));
    }

    [Fact]
    public async Task 연결_안_되는_공유폴더는_건너뛰고_이_PC에는_항상()
    {
        Directory.CreateDirectory(_work);
        var broken = Path.Combine(_work, "not_a_folder");
        File.WriteAllText(broken, "파일이라 폴더를 만들 수 없음");

        var r1 = await Svc().RunAsync(_t.Session, new[] { broken, Share("A") }, 7);
        Assert.True(r1.Ok);
        Assert.False(r1.Targets.Single(x => x.Root == broken).Ok);
        Assert.NotNull(r1.Targets.Single(x => x.Root == broken).Error);

        var r2 = await Svc().RunAsync(_t.Session, new[] { broken }, 7);
        Assert.True(r2.Ok);
        Assert.True(r2.Targets.Single(x => x.IsLocal).Ok);
        Assert.True(File.Exists(Path.Combine(LocalFolder, "tester_20261028.db")));
    }

    [Fact]
    public async Task 하루_한_개_7일_보관()
    {
        var svc = Svc();
        for (var day = 0; day < 10; day++)
        {
            _now = new DateTime(2026, 10, 20, 9, 0, 0).AddDays(day);
            Assert.True((await svc.RunAsync(_t.Session, new[] { Share("A") }, 7)).Ok);
            _now = _now.AddHours(5);   // 같은 날 다시 → 덮어씀
            Assert.True((await svc.RunAsync(_t.Session, new[] { Share("A") }, 7)).Ok);
        }
        var dir = Folder(Share("A"));
        var dbs = Directory.GetFiles(dir, "*.db").Select(Path.GetFileName).Order().ToList();
        Assert.Equal(Enumerable.Range(23, 7).Select(d => $"tester_202610{d}.db"), dbs);
        Assert.Equal(7, Directory.GetFiles(dir, "tester_????????.json").Length);
        Assert.Empty(Directory.GetFiles(dir, "*.tmp"));
    }

    [Fact]
    public async Task 첨부는_바뀐_것만_복사하고_지운_파일은_보관_뒤_삭제()
    {
        var photo = Path.Combine(Files, "SYFDV02", "202610", "a.jpg");
        Directory.CreateDirectory(Path.GetDirectoryName(photo)!);
        File.WriteAllBytes(photo, new byte[] { 1, 2, 3 });
        var svc = Svc();
        await svc.RunAsync(_t.Session, new[] { Share("A") }, 7);

        var mirror = Path.Combine(Folder(Share("A")), "files");
        var copied = Path.Combine(mirror, "SYFDV02", "202610", "a.jpg");
        Assert.True(File.Exists(copied));
        var firstWrite = File.GetLastWriteTimeUtc(copied);

        // 바뀌지 않았으면 다시 복사하지 않는다(미러 파일을 건드려 확인)
        File.WriteAllBytes(copied, new byte[] { 9, 9, 9 });
        File.SetLastWriteTimeUtc(copied, firstWrite);
        await svc.RunAsync(_t.Session, new[] { Share("A") }, 7);
        Assert.Equal(new byte[] { 9, 9, 9 }, File.ReadAllBytes(copied));

        // 로컬에서 지우면 다음 날 .deleted\날짜 로 옮겨지고, 보관 일수가 지나면 사라진다
        File.Delete(photo);
        _now = _now.AddDays(1);
        await svc.RunAsync(_t.Session, new[] { Share("A") }, 7);
        Assert.False(File.Exists(copied));
        var kept = Path.Combine(mirror, BackupService.DeletedDir, "20261029", "SYFDV02", "202610", "a.jpg");
        Assert.True(File.Exists(kept));

        _now = _now.AddDays(7);
        await svc.RunAsync(_t.Session, new[] { Share("A") }, 7);
        Assert.False(File.Exists(kept));
    }

    [Fact]
    public async Task 다른_백업이_돌고_있으면_끝날_때까지_기다렸다가_한다()
    {
        var held = BackupLock.Acquire(BackupLock.PathFor(_t.Db.FilePath), TimeSpan.FromSeconds(5));   // 작업 스케줄러 백업이 도는 중이라고 가정
        var run = Svc().RunAsync(_t.Session, Array.Empty<string>(), 7);
        await Task.Delay(800);
        Assert.False(run.IsCompleted);
        held.Dispose();
        var r = await run;
        Assert.True(r.Ok, r.Error);
    }

    [Fact]
    public void 예전_구조_백업을_새_구조로_옮긴다()
    {
        // 예전: <공유>\Neosys\<사무소>\<계정>\yyyy-MM-dd.db, 로컬은 %LOCALAPPDATA%\Neosys\backup\Neosys\<사무소>\<계정>
        var oldShare = Path.Combine(Share("A"), "Neosys", "3", "tester");
        var oldLocalRoot = Path.Combine(_work, "old_backup");
        var oldLocal = Path.Combine(oldLocalRoot, "Neosys", "3", "tester");
        Directory.CreateDirectory(Path.Combine(oldShare, "files", "SYFDV02"));
        Directory.CreateDirectory(Path.Combine(oldShare, "files", BackupService.DeletedDir, "2026-10-27"));
        Directory.CreateDirectory(oldLocal);
        _t.Db.BackupTo(Path.Combine(oldShare, "2026-10-27.db"));
        File.WriteAllText(Path.Combine(oldShare, "2026-10-27.json"), JsonSerializer.Serialize(new BackupManifest { UserId = "tester", Date = "2026-10-27", Machine = "OLDPC" }));
        File.WriteAllText(Path.Combine(oldShare, "latest.json"), "{}");
        File.WriteAllBytes(Path.Combine(oldShare, "files", "SYFDV02", "a.jpg"), new byte[] { 1 });
        File.WriteAllBytes(Path.Combine(oldShare, "files", BackupService.DeletedDir, "2026-10-27", "b.jpg"), new byte[] { 2 });
        _t.Db.BackupTo(Path.Combine(oldLocal, "2026-10-26.db"));

        var moved = BackupService.MigrateOldLayout(new[] { Share("A") }, oldLocalRoot, Local, 3, "tester");

        Assert.Equal(2, moved);
        var dir = Folder(Share("A"));
        Assert.True(LocalDatabase.Inspect(Path.Combine(dir, "tester_20261027.db")).Ok);
        var m = JsonSerializer.Deserialize<BackupManifest>(File.ReadAllText(Path.Combine(dir, "tester_20261027.json")))!;
        Assert.Equal("20261027", m.Date);
        Assert.Equal("OLDPC", m.Machine);
        Assert.True(File.Exists(Path.Combine(dir, "files", "SYFDV02", "a.jpg")));
        Assert.True(File.Exists(Path.Combine(dir, "files", BackupService.DeletedDir, "20261027", "b.jpg")));
        Assert.True(File.Exists(Path.Combine(LocalFolder, "tester_20261026.db")));
        // 예전 폴더는 지워지고(빈 사무소번호 폴더 포함) 새 구조만 남는다
        Assert.False(Directory.Exists(Path.Combine(Share("A"), "Neosys", "3")));
        Assert.False(Directory.Exists(oldLocalRoot));
        Assert.Equal(0, BackupService.MigrateOldLayout(new[] { Share("A") }, oldLocalRoot, Local, 3, "tester"));
    }

    [Fact]
    public void 드라이브별_Neosys_폴더와_공유_경로()
    {
        var system = Path.GetPathRoot(Environment.GetFolderPath(Environment.SpecialFolder.Windows))!;
        Assert.Equal(BackupService.DefaultLocalRoot, BackupService.LocalRootFor(system));
        var other = system.StartsWith("Z", StringComparison.OrdinalIgnoreCase) ? "Y:" : "Z:";
        Assert.Equal(other + @"\Neosys", BackupService.LocalRootFor(other + @"\"));
        Assert.Equal(@"\\PC\Neosys", BackupService.ShareRoot(@"\\PC\Neosys\"));
        Assert.Equal(@"\\PC\D\Neosys", BackupService.ShareRoot(@"\\PC\D"));
        Assert.Equal(@"\\PC\Neosys\kim\BackUp", BackupService.BackupFolder(@"\\PC\Neosys", "kim"));
        Assert.Equal("kim_20261029", BackupService.FileBase("kim", "20261029"));
    }

    [Fact]
    public void 작업_스케줄러_등록_XML()
    {
        var xml = ScheduledBackupTask.BuildXml(@"C:\Program Files\Neosys\NeosysLight.exe", "kim", 120, new DateTime(2026, 10, 29, 9, 0, 0), @"PC\user");
        var doc = System.Xml.Linq.XDocument.Parse(xml);
        System.Xml.Linq.XNamespace ns = "http://schemas.microsoft.com/windows/2004/02/mit/task";
        Assert.Equal("PT120M", doc.Descendants(ns + "Interval").Single().Value);
        Assert.Equal("2026-10-29T09:00:00", doc.Descendants(ns + "StartBoundary").Single().Value);
        Assert.Equal("true", doc.Descendants(ns + "StartWhenAvailable").Single().Value);
        Assert.Equal("InteractiveToken", doc.Descendants(ns + "LogonType").Single().Value);
        Assert.Equal(@"C:\Program Files\Neosys\NeosysLight.exe", doc.Descendants(ns + "Command").Single().Value);
        Assert.Equal("--backup \"kim\"", doc.Descendants(ns + "Arguments").Single().Value);
        Assert.Equal("Neosys_Backup_kim", ScheduledBackupTask.TaskName("kim"));
        // 10분보다 짧은 주기는 10분으로
        Assert.Contains("PT10M", ScheduledBackupTask.BuildXml("x.exe", "kim", 1, DateTime.Now, null));
    }

    [Fact]
    public void 로그인_정보를_저장해_스케줄러_백업이_쓴다()
    {
        var path = Path.Combine(_work, "acct", "session.json");
        SavedSession.Save(path, _t.Session);
        var s = SavedSession.Load(path)!;
        Assert.Equal(("tester", 7L, 3L, "테스터"), (s.UserId, s.RtNo, s.OffNo!.Value, s.RtNm!));
        Assert.Null(SavedSession.Load(Path.Combine(_work, "없음.json")));
    }
}

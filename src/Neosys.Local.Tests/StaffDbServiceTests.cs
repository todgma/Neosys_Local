using Microsoft.Data.Sqlite;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>대표의 직원 DB 보기 — 공유폴더의 다른 계정 백업 찾기, 읽기 전용 사본(docs/DB_BACKUP.md 5장)</summary>
public sealed class StaffDbServiceTests : IDisposable
{
    private readonly string _work = Path.Combine(Path.GetTempPath(), $"neosys_staff_{Guid.NewGuid():N}");
    private string Share => Path.Combine(_work, "share");
    private string ViewRoot => Path.Combine(_work, "viewer");

    public void Dispose()
    {
        SqliteConnection.ClearAllPools();
        try { Directory.Delete(_work, true); } catch { /* 무시 */ }
    }

    private async Task BackupAsAsync(AppSession who, DateTime at, Func<TestDb, Task>? fill = null)
    {
        using var t = new TestDb();
        if (fill is not null) await fill(t);
        var r = await new BackupService(t.Db, Path.Combine(_work, "files_" + who.UserId), Path.Combine(_work, "local"), () => at)
            .RunAsync(who, new[] { Share }, 7);
        Assert.True(r.Ok, r.Error);
    }

    private static readonly AppSession Owner = new() { RtNo = 7, OffNo = 3, UserId = "tester", RtNm = "대표", RtType = "RTTYP01" };
    private static readonly AppSession Kim = new() { RtNo = 8, OffNo = 3, UserId = "kim", RtNm = "김직원", RtType = "RTTYP02" };
    private static readonly AppSession Other = new() { RtNo = 9, OffNo = 4, UserId = "lee", RtNm = "다른사무소" };

    [Fact]
    public async Task 같은_사무소의_다른_계정만_최신_백업으로()
    {
        await BackupAsAsync(Owner, new DateTime(2026, 10, 28, 10, 0, 0));
        await BackupAsAsync(Kim, new DateTime(2026, 10, 27, 18, 0, 0));
        await BackupAsAsync(Kim, new DateTime(2026, 10, 28, 9, 30, 0));
        await BackupAsAsync(Other, new DateTime(2026, 10, 28, 9, 0, 0));

        var list = StaffDbService.Find(new[] { Share, Path.Combine(_work, "없는공유") }, null, 3, "tester");

        var kim = Assert.Single(list);   // 나(대표)와 다른 사무소 계정은 빠진다
        Assert.Equal("kim", kim.UserId);
        Assert.Equal("김직원", kim.Name);
        Assert.Equal(new DateTime(2026, 10, 28, 9, 30, 0), kim.Latest.BackedUpAt);
        Assert.Equal(Path.Combine(Share, "Neosys", "kim", "BackUp", "kim_20261028.db"), kim.Candidates.Single(c => !c.IsLocal).DbFile);

        // 다른 PC가 이 PC Neosys 폴더에 백업해 둔 것도 찾는다(공유폴더를 등록하지 않아도)
        var local = Assert.Single(StaffDbService.Find(Array.Empty<string>(), Path.Combine(_work, "local"), 3, "tester"));
        Assert.Equal("kim", local.UserId);
        Assert.True(local.Candidates[0].IsLocal);
    }

    [Fact]
    public async Task 읽기_전용으로_열려_조회는_되고_쓰기는_막힌다()
    {
        await BackupAsAsync(Kim, new DateTime(2026, 10, 28, 9, 30, 0), t =>
            t.Sp.ExecuteAsync("rt_realtor_info", "UPSERT", new Dictionary<string, object?> { ["rtNo"] = 8L, ["id"] = "kim", ["rtNm"] = "김직원", ["offNo"] = 3L }));
        var kim = Assert.Single(StaffDbService.Find(new[] { Share }, null, 3, "tester"));

        var copy = StaffDbService.Open(kim.Candidates, ViewRoot);
        Assert.True(copy.Db.ReadOnly);
        Assert.StartsWith(ViewRoot, copy.Db.FilePath);
        var sp = new SpRunner(copy.Db);
        Assert.NotEmpty(await sp.QueryAsync<string>("sys_code_sub_list"));   // 조회 가능

        var ex = await Assert.ThrowsAnyAsync<Exception>(() =>
            sp.ExecuteAsync("rt_realtor_info", "UPSERT", new Dictionary<string, object?> { ["rtNo"] = 8L, ["id"] = "kim", ["rtNm"] = "바꿈", ["offNo"] = 3L }));
        Assert.Contains(Chain(ex), e => e is SqliteException { SqliteErrorCode: 8 });   // SQLITE_READONLY

        StaffDbService.Cleanup(ViewRoot);
        Assert.False(Directory.Exists(ViewRoot));
        // 원본 백업은 그대로
        Assert.True(LocalDatabase.Inspect(kim.Candidates[0].DbFile).Ok);
    }

    private static IEnumerable<Exception> Chain(Exception ex)
    {
        for (var e = ex; e is not null; e = e.InnerException) yield return e;
    }
}

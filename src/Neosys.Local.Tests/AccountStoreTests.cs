using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>계정별 DB 위치와 예전 단일 DB 이전(docs/DB_BACKUP.md 1장)</summary>
public class AccountStoreTests
{
    [Fact]
    public void 계정별_경로()
    {
        var store = new AccountStore(@"C:\base");
        Assert.Equal(@"C:\base\accounts\kim01\kim01.db", store.DbPath("kim01"));
        Assert.Equal(@"C:\base\accounts\kim01\files", store.FilesRoot("kim01"));
        Assert.Equal("a_b_c", AccountStore.SafeName("a/b:c"));   // 파일 이름에 못 쓰는 문자
        Assert.Equal("lee", AccountStore.SafeName(" lee "));
        Assert.Throws<ArgumentException>(() => AccountStore.SafeName("  "));
    }

    [Fact]
    public async Task 예전_DB와_첨부를_계정으로_옮김()
    {
        var baseDir = Path.Combine(Path.GetTempPath(), $"neosys_acc_{Guid.NewGuid():N}");
        var src = Path.Combine(Path.GetTempPath(), $"사진_{Guid.NewGuid():N}.jpg");
        await File.WriteAllBytesAsync(src, new byte[] { 1, 2, 3 });
        try
        {
            var store = new AccountStore(baseDir);
            // 예전 버전: neosis_local.db + files\ 에 첨부 1건
            var legacy = new LocalDatabase(store.LegacyDbPath);
            legacy.Initialize();
            using (var t = new TestDb())
            {
                var files = new FileService(new SpRunner(legacy), t.SessionAccessor, store.LegacyFilesRoot);
                await files.AttachAsync(FileKind.PropertyPhoto, "9", src);
            }
            Assert.True(store.CanAdoptLegacy("kim01"));

            store.AdoptLegacy("kim01");

            Assert.False(File.Exists(store.LegacyDbPath));
            Assert.False(Directory.Exists(store.LegacyFilesRoot));
            Assert.True(File.Exists(store.DbPath("kim01")));
            Assert.False(store.CanAdoptLegacy("lee02"));   // 이미 옮겨 갔으므로 다른 계정은 빈 DB

            // 옮긴 DB에서 첨부 기록과 실제 파일이 그대로 연결된다(루트 기준 상대 경로)
            var db = new LocalDatabase(store.DbPath("kim01"));
            db.Initialize();
            using var t2 = new TestDb();
            var moved = new FileService(new SpRunner(db), t2.SessionAccessor, store.FilesRoot("kim01"));
            var list = await moved.ListAsync(FileKind.PropertyPhoto, "9");
            Assert.Single(list);
            Assert.True(File.Exists(moved.PathOf(list[0])));
        }
        finally
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            try { Directory.Delete(baseDir, true); } catch { /* 무시 */ }
            File.Delete(src);
        }
    }

    [Fact]
    public void 계정_DB가_이미_있으면_옮기지_않음()
    {
        var baseDir = Path.Combine(Path.GetTempPath(), $"neosys_acc_{Guid.NewGuid():N}");
        try
        {
            var store = new AccountStore(baseDir);
            new LocalDatabase(store.LegacyDbPath).Initialize();
            new LocalDatabase(store.DbPath("kim01")).Initialize();
            Assert.False(store.CanAdoptLegacy("kim01"));
            store.AdoptLegacy("kim01");
            Assert.True(File.Exists(store.LegacyDbPath));   // 그대로 남는다
        }
        finally
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            try { Directory.Delete(baseDir, true); } catch { /* 무시 */ }
        }
    }
}

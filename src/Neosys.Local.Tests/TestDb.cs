using Neosys.Local.Core;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>테스트마다 임시 SQLite 파일을 만들고 끝나면 지운다.</summary>
public sealed class TestDb : IDisposable
{
    public LocalDatabase Db { get; }
    public SpRunner Sp { get; }
    public AppSession Session { get; } = new() { RtNo = 7, OffNo = 3, UserId = "tester", RtNm = "테스터", RtType = "RTTYP01" };

    private readonly string _path;

    public TestDb()
    {
        _path = Path.Combine(Path.GetTempPath(), $"neosys_test_{Guid.NewGuid():N}.db");
        Db = new LocalDatabase(_path);
        Db.Initialize();
        Sp = new SpRunner(Db);
    }

    public Func<AppSession> SessionAccessor => () => Session;

    public void Dispose()
    {
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        foreach (var p in new[] { _path, _path + "-wal", _path + "-shm" })
            try { File.Delete(p); } catch { /* 무시 */ }
    }
}

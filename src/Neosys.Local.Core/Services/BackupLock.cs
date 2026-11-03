namespace Neosys.Local.Core.Services;

/// <summary>
/// 백업·복구 잠금 — 계정 폴더의 backup.lock 파일을 독점으로 연다. 프로그램과 작업 스케줄러(--backup)가 같은 계정을
/// 동시에 백업·복구하지 않게 하고, 이미 돌고 있으면 끝날 때까지 기다린다(프로세스가 죽으면 Windows가 파일을 놓아 준다).
/// </summary>
public sealed class BackupLock : IDisposable
{
    private readonly FileStream _file;

    private BackupLock(FileStream file) => _file = file;

    /// <summary>DB 파일 옆(계정 폴더)의 잠금 파일</summary>
    public static string PathFor(string dbPath) => Path.Combine(Path.GetDirectoryName(Path.GetFullPath(dbPath))!, "backup.lock");

    /// <summary>잠금을 얻을 때까지 기다린다. timeout이 지나면 TimeoutException</summary>
    public static BackupLock Acquire(string path, TimeSpan timeout)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var until = DateTime.UtcNow + timeout;
        while (true)
        {
            try
            {
                return new BackupLock(new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None));
            }
            catch (IOException) when (DateTime.UtcNow < until)
            {
                Thread.Sleep(300);
            }
            catch (IOException ex)
            {
                throw new TimeoutException("다른 백업·복구 작업이 끝나지 않았습니다. 잠시 후 다시 시도하세요.", ex);
            }
        }
    }

    /// <summary>지금 다른 작업이 잠금을 잡고 있는지(표시용)</summary>
    public static bool IsHeld(string path)
    {
        try
        {
            using var f = new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
            return false;
        }
        catch (IOException)
        {
            return true;
        }
    }

    public void Dispose() => _file.Dispose();
}

/// <summary>
/// 마지막 로그인 정보 — 계정 폴더의 session.json. 작업 스케줄러 백업(--backup)은 로그인 없이 돌기 때문에
/// 백업 정보 파일(사무소·이름)에 쓸 값을 여기서 읽는다.
/// </summary>
public sealed class SavedSession
{
    public string UserId { get; set; } = "";
    public long RtNo { get; set; }
    public long? OffNo { get; set; }
    public string? RtNm { get; set; }
    public string? RtType { get; set; }

    public static string PathFor(string dbPath) => Path.Combine(Path.GetDirectoryName(Path.GetFullPath(dbPath))!, "session.json");

    public static void Save(string path, AppSession s)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(new SavedSession { UserId = s.UserId, RtNo = s.RtNo, OffNo = s.OffNo, RtNm = s.RtNm, RtType = s.RtType });
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, json);
    }

    public static AppSession? Load(string path)
    {
        try
        {
            if (!File.Exists(path)) return null;
            var s = System.Text.Json.JsonSerializer.Deserialize<SavedSession>(File.ReadAllText(path));
            return s is null || s.UserId == "" ? null : new AppSession { UserId = s.UserId, RtNo = s.RtNo, OffNo = s.OffNo, RtNm = s.RtNm, RtType = s.RtType };
        }
        catch
        {
            return null;
        }
    }
}

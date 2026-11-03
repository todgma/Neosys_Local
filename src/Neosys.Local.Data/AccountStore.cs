using Microsoft.Data.Sqlite;

namespace Neosys.Local.Data;

/// <summary>
/// 계정별 로컬 데이터 위치 — 로그인한 계정마다 DB와 첨부파일을 따로 둔다(docs/DB_BACKUP.md 1장).
///   &lt;기준 폴더&gt;\accounts\&lt;계정ID&gt;\&lt;계정ID&gt;.db   로컬 DB
///   &lt;기준 폴더&gt;\accounts\&lt;계정ID&gt;\files\          첨부파일(FileService 루트)
/// 기준 폴더는 %LOCALAPPDATA%\Neosys. 예전 버전의 단일 DB(neosis_local.db)와 files 폴더는 첫 로그인 때 그 계정으로 옮길 수 있다.
/// </summary>
public sealed class AccountStore
{
    public string BaseDir { get; }

    public static string DefaultBaseDir =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys");

    public AccountStore(string? baseDir = null) => BaseDir = baseDir ?? DefaultBaseDir;

    /// <summary>예전 버전(계정 구분 없음)의 DB 파일</summary>
    public string LegacyDbPath => Path.Combine(BaseDir, "neosis_local.db");
    /// <summary>예전 버전의 첨부파일 폴더</summary>
    public string LegacyFilesRoot => Path.Combine(BaseDir, "files");

    public string AccountDir(string userId) => Path.Combine(BaseDir, "accounts", SafeName(userId));
    public string DbPath(string userId) => Path.Combine(AccountDir(userId), SafeName(userId) + ".db");
    public string FilesRoot(string userId) => Path.Combine(AccountDir(userId), "files");

    /// <summary>계정 DB가 아직 없고 예전 DB가 남아 있으면 옮길지 물어야 한다</summary>
    public bool CanAdoptLegacy(string userId) => !File.Exists(DbPath(userId)) && File.Exists(LegacyDbPath);

    /// <summary>
    /// 예전 DB(+ -wal/-shm)와 첨부파일 폴더 내용을 이 계정 위치로 옮긴다. 같은 디스크 안 이동이라 빠르고, 옮긴 뒤 예전 위치에는 남지 않는다.
    /// 첨부 경로는 sys_file.object_key에 루트 기준 상대 경로로 저장되어 있어 루트만 바뀌면 그대로 맞는다.
    /// </summary>
    public void AdoptLegacy(string userId)
    {
        if (!CanAdoptLegacy(userId)) return;
        SqliteConnection.ClearAllPools();   // 열린 연결이 파일을 잡고 있지 않게
        var dest = DbPath(userId);
        Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
        foreach (var suffix in new[] { "-wal", "-shm" })
            if (File.Exists(LegacyDbPath + suffix)) File.Move(LegacyDbPath + suffix, dest + suffix);
        File.Move(LegacyDbPath, dest);

        if (!Directory.Exists(LegacyFilesRoot)) return;
        var filesDest = FilesRoot(userId);
        Directory.CreateDirectory(filesDest);
        foreach (var dir in Directory.GetDirectories(LegacyFilesRoot))
        {
            var target = Path.Combine(filesDest, Path.GetFileName(dir));
            if (!Directory.Exists(target)) Directory.Move(dir, target);
        }
        foreach (var file in Directory.GetFiles(LegacyFilesRoot))
        {
            var target = Path.Combine(filesDest, Path.GetFileName(file));
            if (!File.Exists(target)) File.Move(file, target);
        }
        if (!Directory.EnumerateFileSystemEntries(LegacyFilesRoot).Any()) Directory.Delete(LegacyFilesRoot);
    }

    /// <summary>계정 ID를 폴더·파일 이름으로 — 쓸 수 없는 문자는 '_'(대소문자는 그대로, Windows가 구분하지 않으므로 같은 폴더)</summary>
    public static string SafeName(string userId)
    {
        var id = userId.Trim();
        if (id.Length == 0) throw new ArgumentException("계정 ID가 비어 있습니다.", nameof(userId));
        var invalid = Path.GetInvalidFileNameChars();
        var name = new string(id.Select(c => invalid.Contains(c) ? '_' : c).ToArray()).TrimEnd('.', ' ');
        return name is "" or "." or ".." ? "_" : name;
    }
}

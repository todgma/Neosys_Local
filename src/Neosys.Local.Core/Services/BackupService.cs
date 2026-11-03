using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>백업 한 건의 정보 — 날짜 파일 옆에 &lt;계정&gt;_&lt;날짜&gt;.json으로, 가장 최근 것은 latest.json으로 남긴다(복구·대표 조회 목록용)</summary>
public sealed class BackupManifest
{
    public string UserId { get; set; } = "";
    public long RtNo { get; set; }
    public long? OffNo { get; set; }
    public string? RtNm { get; set; }
    public string Machine { get; set; } = "";
    public DateTime BackedUpAt { get; set; }
    /// <summary>날짜(yyyyMMdd) — 파일 이름은 &lt;계정&gt;_&lt;날짜&gt;.db</summary>
    public string Date { get; set; } = "";
    /// <summary>DB 스키마 버전(PRAGMA user_version) — 더 새 버전 백업은 복구하지 않는다</summary>
    public long DbVersion { get; set; }
    public long Size { get; set; }
    public string Sha256 { get; set; } = "";
    public string? AppVersion { get; set; }
}

/// <summary>백업 위치 한 곳의 결과. IsLocal: 이 PC의 Neosys 폴더</summary>
public sealed record BackupTargetResult(string Root, bool Ok, string? Error, bool IsLocal = false);

/// <summary>백업 한 번의 결과</summary>
public sealed record BackupResult(DateTime At, string? Error, IReadOnlyList<BackupTargetResult> Targets)
{
    /// <summary>한 곳이라도 저장했으면 성공</summary>
    public bool Ok => Error is null && Targets.Any(t => t.Ok);
}

/// <summary>마지막 백업 상태 — 계정 폴더의 backup_status.json(DB 관리 창·대시보드 표시용, 작업 스케줄러 백업도 같은 파일에 남긴다)</summary>
public sealed class BackupStatus
{
    public DateTime? LastRunAt { get; set; }
    public DateTime? LastSuccessAt { get; set; }
    public string? LastError { get; set; }
    /// <summary>마지막 백업을 한 곳 — "app"(프로그램) 또는 "scheduler"(작업 스케줄러)</summary>
    public string? LastBy { get; set; }
    public List<BackupTargetResult> Targets { get; set; } = new();

    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

    public static string PathFor(string dbPath) => Path.Combine(Path.GetDirectoryName(Path.GetFullPath(dbPath))!, "backup_status.json");

    public static BackupStatus Load(string path)
    {
        try
        {
            if (File.Exists(path)) return JsonSerializer.Deserialize<BackupStatus>(File.ReadAllText(path)) ?? new();
        }
        catch { /* 손상되면 새로 */ }
        return new();
    }

    public void Save(string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var tmp = path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(this, Json));
        File.Move(tmp, path, overwrite: true);
    }

    /// <summary>백업 결과 반영 — 대상별 결과는 이번 것으로 바꾸고, 성공 시각은 성공했을 때만 갱신</summary>
    public void Apply(BackupResult r, string by = "app")
    {
        LastRunAt = r.At;
        LastBy = by;
        if (r.Ok) LastSuccessAt = r.At;
        LastError = r.Ok ? null : r.Error ?? string.Join(" / ", r.Targets.Where(t => !t.Ok).Select(t => t.Error));
        if (r.Targets.Count > 0) Targets = r.Targets.ToList();
    }
}

/// <summary>공유폴더 연결 확인 결과 — 쓰기 가능 여부, 남은 공간, 이 계정 백업이 차지하는 크기</summary>
public sealed record BackupTargetCheck(bool Writable, string? Error, long? FreeBytes, long UsedBytes);

/// <summary>
/// 로컬 DB 분산 백업(docs/DB_BACKUP.md 2장). 백업 위치마다 같은 모양으로
///   &lt;Neosys 폴더&gt;\&lt;계정ID&gt;\BackUp\&lt;계정ID&gt;_yyyyMMdd.db (+ .json, latest.json, files\ 첨부 미러)
/// 를 쓴다. 이 PC의 Neosys 폴더(localRoot)에는 항상 쓰고, 등록된 공유폴더(\\PC\Neosys)마다 한 번씩 더 쓴다.
/// 하루 1개 파일(같은 날은 덮어씀), 보관 일수보다 오래된 날짜 파일은 지운다.
/// 백업·복구는 계정별 잠금(BackupLock)으로 한 번에 하나씩 — 다른 작업이 돌고 있으면 끝날 때까지 기다린다.
/// </summary>
public sealed class BackupService
{
    private static readonly Regex DateFile = new(@"^(.+)_(\d{8})\.(db|json)$", RegexOptions.IgnoreCase);
    private static readonly Regex DateDir = new(@"^\d{8}$");
    private static readonly Regex OldDateFile = new(@"^(\d{4})-(\d{2})-(\d{2})\.(db|json)$", RegexOptions.IgnoreCase);
    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

    /// <summary>계정 폴더 안의 백업 폴더 이름</summary>
    public const string BackupDirName = "BackUp";
    /// <summary>첨부 미러에서 지워진 파일을 잠시 두는 폴더(보관 일수 뒤 삭제) — 그 기간 안의 날짜로 복구해도 사진이 남는다</summary>
    public const string DeletedDir = ".deleted";
    /// <summary>다른 백업·복구가 잠금을 잡고 있을 때 기다리는 최대 시간</summary>
    public static readonly TimeSpan LockTimeout = TimeSpan.FromMinutes(10);

    private readonly LocalDatabase _db;
    private readonly string _filesRoot;
    private readonly string _localRoot;
    private readonly Func<DateTime> _now;

    /// <param name="db">백업할 로컬 DB</param>
    /// <param name="filesRoot">이 계정의 첨부 폴더</param>
    /// <param name="localRoot">이 PC의 Neosys 폴더(네트워크에 공유하는 폴더) — 항상 여기에도 백업한다</param>
    public BackupService(LocalDatabase db, string filesRoot, string localRoot, Func<DateTime>? now = null)
    {
        _db = db;
        _filesRoot = filesRoot;
        _localRoot = localRoot;
        _now = now ?? (() => DateTime.Now);
    }

    /// <summary>C: 드라이브를 고르거나 아직 정하지 않았을 때의 이 PC Neosys 폴더</summary>
    public static string DefaultLocalRoot => Path.Combine(AccountStore.DefaultBaseDir, "Shared");

    /// <summary>예전 버전(2026-10-28)의 로컬 백업 위치 — &lt;여기&gt;\Neosys\&lt;사무소번호&gt;\&lt;계정&gt;</summary>
    public static string OldLocalRoot => Path.Combine(AccountStore.DefaultBaseDir, "backup");

    /// <summary>드라이브를 고르면 쓰는 Neosys 폴더 — Windows 드라이브(C:)는 기본 위치, 다른 드라이브는 X:\Neosys</summary>
    public static string LocalRootFor(string drive)
    {
        var d = drive.Trim().TrimEnd('\\', '/').TrimEnd(':').ToUpperInvariant();
        var system = (Path.GetPathRoot(Environment.GetFolderPath(Environment.SpecialFolder.Windows)) ?? @"C:\").TrimEnd('\\').TrimEnd(':').ToUpperInvariant();
        return d == system ? DefaultLocalRoot : d + @":\Neosys";
    }

    /// <summary>등록한 공유폴더 경로 → 그 안의 Neosys 폴더. \\PC\Neosys 처럼 이름이 Neosys면 그대로, 아니면(\\PC\D 등) 그 아래 Neosys</summary>
    public static string ShareRoot(string registered)
    {
        var t = registered.Trim().TrimEnd('\\', '/');
        // Path.GetFileName은 UNC 공유 루트(\\PC\Neosys)에 빈 문자열을 돌려주므로 마지막 조각을 직접 본다
        var last = t[(t.LastIndexOfAny(new[] { '\\', '/' }) + 1)..];
        return string.Equals(last, "Neosys", StringComparison.OrdinalIgnoreCase) ? t : Path.Combine(t, "Neosys");
    }

    /// <summary>Neosys 폴더 안의 계정 백업 폴더 — &lt;Neosys 폴더&gt;\&lt;계정ID&gt;\BackUp</summary>
    public static string BackupFolder(string neosysRoot, string userId) =>
        Path.Combine(neosysRoot, AccountStore.SafeName(userId), BackupDirName);

    /// <summary>날짜 파일 이름(확장자 없이) — &lt;계정ID&gt;_yyyyMMdd</summary>
    public static string FileBase(string userId, string date) => $"{AccountStore.SafeName(userId)}_{date}";

    public static string DateName(DateTime d) => d.ToString("yyyyMMdd");

    /// <summary>
    /// 백업 실행. 잠금(다른 백업·복구가 돌면 끝날 때까지 기다림) → 스냅샷 → 무결성 검사 → 이 PC Neosys 폴더 → 공유폴더마다 복사·정리.
    /// 오래 걸릴 수 있으므로(연결 안 되는 공유폴더는 응답을 기다림) 백그라운드에서 돈다.
    /// </summary>
    public Task<BackupResult> RunAsync(AppSession session, IEnumerable<string> shares, int keepDays)
    {
        var list = shares.ToList();
        return Task.Run(() =>
        {
            try
            {
                using var _ = BackupLock.Acquire(BackupLock.PathFor(_db.FilePath), LockTimeout);
                return Run(session, list, Math.Max(1, keepDays), _now());   // 시각은 잠금을 얻은 뒤(기다린 만큼 늦게)
            }
            catch (TimeoutException ex)
            {
                return new BackupResult(_now(), ex.Message, Array.Empty<BackupTargetResult>());
            }
        });
    }

    private BackupResult Run(AppSession session, List<string> shares, int keepDays, DateTime at)
    {
        var snapshot = Path.Combine(Path.GetTempPath(), $"neosys_backup_{Guid.NewGuid():N}.db");
        try
        {
            _db.BackupTo(snapshot);
            var (ok, version, error) = LocalDatabase.Inspect(snapshot);
            // 깨진 DB가 정상 백업을 덮어쓰지 않게 — 검사에 실패하면 어디에도 쓰지 않는다
            if (!ok) return new BackupResult(at, "DB 검사에 실패해 백업하지 않았습니다: " + error, Array.Empty<BackupTargetResult>());

            var manifest = new BackupManifest
            {
                UserId = session.UserId, RtNo = session.RtNo, OffNo = session.OffNo, RtNm = session.RtNm,
                Machine = Environment.MachineName, BackedUpAt = at, Date = DateName(at), DbVersion = version,
                Size = new FileInfo(snapshot).Length, Sha256 = Sha256Of(snapshot),
                AppVersion = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Version?.ToString(),
            };

            var results = new List<BackupTargetResult> { WriteTo(_localRoot, _localRoot, snapshot, manifest, keepDays, isLocal: true) };
            foreach (var share in shares.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).Distinct(StringComparer.OrdinalIgnoreCase))
                results.Add(WriteTo(share, ShareRoot(share), snapshot, manifest, keepDays, isLocal: false));
            return new BackupResult(at, null, results);
        }
        catch (Exception ex)
        {
            return new BackupResult(at, "백업 사본을 만들지 못했습니다: " + ex.Message, Array.Empty<BackupTargetResult>());
        }
        finally
        {
            try { File.Delete(snapshot); } catch { /* 임시 파일 */ }
        }
    }

    /// <summary>한 곳에 쓰기: 날짜 DB·정보 파일(임시 이름으로 쓴 뒤 이름 바꿈) → latest.json → 첨부 미러 → 오래된 날짜 정리</summary>
    private BackupTargetResult WriteTo(string label, string neosysRoot, string snapshot, BackupManifest manifest, int keepDays, bool isLocal)
    {
        try
        {
            var dir = BackupFolder(neosysRoot, manifest.UserId);
            Directory.CreateDirectory(dir);
            var name = FileBase(manifest.UserId, manifest.Date);
            CopyAtomic(snapshot, Path.Combine(dir, name + ".db"));
            WriteAtomic(Path.Combine(dir, name + ".json"), JsonSerializer.Serialize(manifest, Json));
            WriteAtomic(Path.Combine(dir, "latest.json"), JsonSerializer.Serialize(manifest, Json));
            MirrorFiles(_filesRoot, Path.Combine(dir, "files"), manifest.Date);
            Prune(dir, keepDays, manifest.BackedUpAt);
            return new BackupTargetResult(label, true, null, isLocal);
        }
        catch (Exception ex)
        {
            return new BackupTargetResult(label, false, ex.Message, isLocal);
        }
    }

    /// <summary>
    /// 첨부 미러: 새로 생기거나 바뀐(크기·수정시각) 파일만 복사한다. 로컬에서 없어진 파일은 바로 지우지 않고
    /// .deleted\&lt;날짜&gt;\ 로 옮긴다(보관 일수 뒤 Prune에서 삭제).
    /// </summary>
    private static void MirrorFiles(string source, string mirror, string date)
    {
        if (!Directory.Exists(source)) return;
        Directory.CreateDirectory(mirror);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var file in Directory.EnumerateFiles(source, "*", SearchOption.AllDirectories))
        {
            var rel = Path.GetRelativePath(source, file);
            seen.Add(rel);
            var dest = Path.Combine(mirror, rel);
            var src = new FileInfo(file);
            var dst = new FileInfo(dest);
            if (dst.Exists && dst.Length == src.Length && dst.LastWriteTimeUtc >= src.LastWriteTimeUtc) continue;
            Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
            CopyAtomic(file, dest);
            File.SetLastWriteTimeUtc(dest, src.LastWriteTimeUtc);
        }

        var deletedRoot = Path.Combine(mirror, DeletedDir);
        foreach (var file in Directory.EnumerateFiles(mirror, "*", SearchOption.AllDirectories).ToList())
        {
            var rel = Path.GetRelativePath(mirror, file);
            if (rel.StartsWith(DeletedDir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || seen.Contains(rel)) continue;
            var dest = Path.Combine(deletedRoot, date, rel);
            Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
            File.Move(file, dest, overwrite: true);
        }
    }

    /// <summary>보관 일수 정리 — 오늘 포함 keepDays일보다 오래된 날짜 파일(&lt;계정&gt;_yyyyMMdd.db/json)과 .deleted\날짜 폴더만 지운다</summary>
    private static void Prune(string dir, int keepDays, DateTime now)
    {
        var oldest = DateName(now.Date.AddDays(-(keepDays - 1)));
        foreach (var file in Directory.GetFiles(dir))
        {
            var m = DateFile.Match(Path.GetFileName(file));
            if (m.Success && string.CompareOrdinal(m.Groups[2].Value, oldest) < 0) File.Delete(file);
        }
        var deleted = Path.Combine(dir, "files", DeletedDir);
        if (!Directory.Exists(deleted)) return;
        foreach (var d in Directory.GetDirectories(deleted))
        {
            var name = Path.GetFileName(d);
            if (DateDir.IsMatch(name) && string.CompareOrdinal(name, oldest) < 0) Directory.Delete(d, recursive: true);
        }
    }

    /// <summary>
    /// 예전 구조(2026-10-28) 백업을 새 구조로 옮긴다 — &lt;Neosys 폴더&gt;\&lt;사무소번호&gt;\&lt;계정&gt;\yyyy-MM-dd.db 를
    /// &lt;Neosys 폴더&gt;\&lt;계정&gt;\BackUp\&lt;계정&gt;_yyyyMMdd.db 로(첨부 미러·.deleted 포함). 새 구조에 같은 날짜가 있으면 새 것을 남긴다.
    /// 예전 로컬 백업(%LOCALAPPDATA%\Neosys\backup)은 이 PC Neosys 폴더로 옮긴다. 옮긴 DB 파일 수를 돌려준다.
    /// </summary>
    public static int MigrateOldLayout(IEnumerable<string> shares, string oldLocalRoot, string localRoot, long? offNo, string userId)
    {
        var moved = 0;
        var off = (offNo ?? 0).ToString();
        var id = AccountStore.SafeName(userId);
        var pairs = shares.Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => (Old: Path.Combine(ShareRoot(s), off, id), New: BackupFolder(ShareRoot(s), userId), Stop: ShareRoot(s)))
            .Append((Old: Path.Combine(oldLocalRoot, "Neosys", off, id), New: BackupFolder(localRoot, userId), Stop: Path.GetDirectoryName(oldLocalRoot)!));
        foreach (var (oldDir, newDir, stop) in pairs)
        {
            try
            {
                if (!Directory.Exists(oldDir)) continue;
                Directory.CreateDirectory(newDir);
                foreach (var file in Directory.GetFiles(oldDir))
                {
                    var m = OldDateFile.Match(Path.GetFileName(file));
                    if (!m.Success) continue;   // latest.json 등은 다음 백업이 새로 쓴다
                    var date = m.Groups[1].Value + m.Groups[2].Value + m.Groups[3].Value;
                    var ext = m.Groups[4].Value.ToLowerInvariant();
                    var dest = Path.Combine(newDir, FileBase(userId, date) + "." + ext);
                    if (File.Exists(dest)) continue;
                    if (ext == "json")
                    {
                        var manifest = JsonSerializer.Deserialize<BackupManifest>(File.ReadAllText(file));
                        if (manifest is null) continue;
                        manifest.Date = date;
                        WriteAtomic(dest, JsonSerializer.Serialize(manifest, Json));
                    }
                    else
                    {
                        CopyAtomic(file, dest);
                        File.SetLastWriteTimeUtc(dest, File.GetLastWriteTimeUtc(file));
                        moved++;
                    }
                }
                var oldFiles = Path.Combine(oldDir, "files");
                if (Directory.Exists(oldFiles))
                    foreach (var file in Directory.EnumerateFiles(oldFiles, "*", SearchOption.AllDirectories))
                    {
                        var parts = Path.GetRelativePath(oldFiles, file).Split(Path.DirectorySeparatorChar);
                        // .deleted\yyyy-MM-dd\… → .deleted\yyyyMMdd\…
                        if (parts.Length > 1 && parts[0] == DeletedDir) parts[1] = parts[1].Replace("-", "");
                        var dest = Path.Combine(new[] { newDir, "files" }.Concat(parts).ToArray());
                        if (File.Exists(dest)) continue;
                        Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
                        File.Copy(file, dest);
                        File.SetLastWriteTimeUtc(dest, File.GetLastWriteTimeUtc(file));
                    }
                Directory.Delete(oldDir, recursive: true);
                // 비게 된 상위 폴더(사무소번호, 예전 로컬 백업 폴더) 정리 — stop 폴더 앞에서 멈춘다
                for (var p = Path.GetDirectoryName(oldDir); p is not null && !string.Equals(p, stop, StringComparison.OrdinalIgnoreCase); p = Path.GetDirectoryName(p))
                {
                    if (!Directory.Exists(p) || Directory.EnumerateFileSystemEntries(p).Any()) break;
                    Directory.Delete(p);
                }
            }
            catch { /* 연결 안 되는 공유폴더 — 다음에 다시 */ }
        }
        return moved;
    }

    /// <summary>
    /// 연결 확인 — 계정 백업 폴더에 시험 파일을 썼다 지워 보고, 남은 공간(UNC 경로도 가능)과 이 계정 백업 크기를 잰다.
    /// neosysRoot는 Neosys 폴더(공유폴더는 ShareRoot로 바꿔서 넘긴다). 연결 안 되는 경로는 오래 걸릴 수 있어 백그라운드에서 부른다.
    /// </summary>
    public static BackupTargetCheck CheckTarget(string neosysRoot, string userId)
    {
        try
        {
            var dir = BackupFolder(neosysRoot, userId);
            Directory.CreateDirectory(dir);
            var probe = Path.Combine(dir, $".write_test_{Guid.NewGuid():N}");
            File.WriteAllText(probe, "ok");
            File.Delete(probe);
            long? free = GetDiskFreeSpaceEx(neosysRoot, out var avail, out _, out _) ? (long)avail : null;
            var used = Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories).Sum(f => new FileInfo(f).Length);
            return new BackupTargetCheck(true, null, free, used);
        }
        catch (Exception ex)
        {
            return new BackupTargetCheck(false, ex.Message, null, 0);
        }
    }

    [System.Runtime.InteropServices.DllImport("kernel32.dll", CharSet = System.Runtime.InteropServices.CharSet.Unicode, SetLastError = true)]
    [return: System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.Bool)]
    private static extern bool GetDiskFreeSpaceEx(string directory, out ulong freeBytesAvailable, out ulong totalBytes, out ulong totalFreeBytes);

    private static void CopyAtomic(string source, string dest)
    {
        var tmp = dest + ".tmp";
        File.Copy(source, tmp, overwrite: true);
        File.Move(tmp, dest, overwrite: true);
    }

    private static void WriteAtomic(string dest, string text)
    {
        var tmp = dest + ".tmp";
        File.WriteAllText(tmp, text);
        File.Move(tmp, dest, overwrite: true);
    }

    public static string Sha256Of(string path)
    {
        using var s = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(s));
    }
}

using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>
/// 복구에 쓸 수 있는 백업 한 건 — 공유폴더·로컬 백업의 날짜 파일, 또는 복구 때 남겨 둔 '복구 전 DB'.
/// FilesMirror: 첨부 미러 폴더(복구 전 DB는 없음 — 첨부는 로컬에 그대로 있으므로)
/// </summary>
public sealed record BackupEntry(string Source, string DbFile, string? FilesMirror, BackupManifest Manifest, bool IsLocal, bool IsBeforeRestore = false);

/// <summary>복구 결과. Used: 실제로 쓴 백업, BeforePath: 교체 전 DB를 남긴 파일(처음 가져오기면 null)</summary>
public sealed record RestoreResult(BackupEntry? Used, string? BeforePath, int FilesRestored, string? Error)
{
    public bool Ok => Error is null;
}

/// <summary>
/// 백업 복구(docs/DB_BACKUP.md 4장). 공유폴더마다 같은 날짜 파일이 있을 수 있어 날짜별로 가장 늦게 백업한 것부터 시도하고,
/// 내 PC로 복사 → SHA-256 → 무결성 → DB 버전 확인을 통과한 첫 파일로 교체한다. 교체 전 DB는
/// &lt;계정ID&gt;.before-restore-&lt;시각&gt;.db로 남기고 보관 일수가 지나면 지운다. 첨부는 미러에서 빠진 파일만 받아 온다.
/// DB 교체는 그 DB를 쓰는 화면이 없을 때 해야 한다(앱은 복구 뒤 다시 시작한다).
/// </summary>
public static class RestoreService
{
    private static readonly Regex DateDb = new(@"^(.+)_(\d{8})\.db$", RegexOptions.IgnoreCase);
    private static readonly Regex BeforeDb = new(@"\.before-restore-(\d{8}-\d{6})\.db$", RegexOptions.IgnoreCase);
    private static readonly Regex DateDir = new(@"^\d{8}$");
    private const string BeforeStamp = "yyyyMMdd-HHmmss";

    /// <summary>
    /// 이 PC Neosys 폴더(localRoot)와 등록된 공유폴더들에서 이 계정의 백업을 모두 찾는다(최근 것 먼저). 연결 안 되는 곳은 건너뛴다.
    /// localRoot가 null이면 공유폴더만 본다.
    /// </summary>
    public static List<BackupEntry> Find(IEnumerable<string> shares, string? localRoot, string userId)
    {
        var account = AccountStore.SafeName(userId);
        var list = new List<BackupEntry>();
        foreach (var (source, root, isLocal) in Roots(shares, localRoot))
            list.AddRange(ListAccount(root, source, account, isLocal));
        return list.OrderByDescending(e => e.Manifest.Date).ThenByDescending(e => e.Manifest.BackedUpAt).ToList();
    }

    /// <summary>백업 위치 목록 — (표시 이름, Neosys 폴더, 이 PC 여부). 이 PC가 먼저, 같은 Neosys 폴더는 한 번만</summary>
    public static List<(string Source, string Root, bool IsLocal)> Roots(IEnumerable<string> shares, string? localRoot)
    {
        var list = new List<(string Source, string Root, bool IsLocal)>();
        if (localRoot is not null) list.Add((localRoot, localRoot, true));
        foreach (var s in shares.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()))
            list.Add((s, BackupService.ShareRoot(s), false));
        return list.DistinctBy(r => r.Root.TrimEnd('\\'),StringComparer.OrdinalIgnoreCase).ToList();
    }

    /// <summary>Neosys 폴더 안의 계정 폴더 이름들(BackUp 폴더가 있는 것만, 이름순)</summary>
    public static List<string> Accounts(string neosysRoot)
    {
        try
        {
            if (!Directory.Exists(neosysRoot)) return new();
            return Directory.GetDirectories(neosysRoot)
                .Where(d => Directory.Exists(Path.Combine(d, BackupService.BackupDirName)))
                .Select(d => Path.GetFileName(d)).Order(StringComparer.OrdinalIgnoreCase).ToList();
        }
        catch
        {
            return new();
        }
    }

    /// <summary>한 계정 폴더의 날짜 백업들(&lt;계정&gt;\BackUp\&lt;계정&gt;_yyyyMMdd.db). 정보 파일이 없으면 파일 자체로(SHA 확인은 건너뜀)</summary>
    public static List<BackupEntry> ListAccount(string neosysRoot, string source, string accountFolder, bool isLocal)
    {
        var list = new List<BackupEntry>();
        try
        {
            var dir = Path.Combine(neosysRoot, accountFolder, BackupService.BackupDirName);
            if (!Directory.Exists(dir)) return list;
            foreach (var db in Directory.GetFiles(dir, "*.db"))
            {
                var m = DateDb.Match(Path.GetFileName(db));
                if (!m.Success || !string.Equals(m.Groups[1].Value, accountFolder, StringComparison.OrdinalIgnoreCase)) continue;
                var manifest = ReadManifest(Path.ChangeExtension(db, ".json")) ?? new BackupManifest
                {
                    UserId = accountFolder, Date = m.Groups[2].Value,
                    BackedUpAt = File.GetLastWriteTime(db), Size = new FileInfo(db).Length,
                };
                list.Add(new BackupEntry(source, db, Path.Combine(dir, "files"), manifest, isLocal));
            }
        }
        catch { /* 연결 안 되는 공유폴더 */ }
        return list.OrderByDescending(e => e.Manifest.Date).ThenByDescending(e => e.Manifest.BackedUpAt).ToList();
    }

    /// <summary>날짜마다 한 줄(가장 늦게 백업한 것 먼저) — 복구 목록 표시와 시도 순서</summary>
    public static List<IReadOnlyList<BackupEntry>> ByDate(IEnumerable<BackupEntry> entries) =>
        entries.GroupBy(e => e.Manifest.Date).OrderByDescending(g => g.Key)
            .Select(g => (IReadOnlyList<BackupEntry>)g.OrderByDescending(e => e.Manifest.BackedUpAt).ToList()).ToList();

    /// <summary>계정 폴더에 남겨 둔 '복구 전 DB' 목록(최근 것 먼저) — 잘못 복구했을 때 되돌리기용</summary>
    public static List<BackupEntry> FindBeforeRestore(string dbPath, string userId)
    {
        var dir = Path.GetDirectoryName(dbPath)!;
        if (!Directory.Exists(dir)) return new();
        return Directory.GetFiles(dir, Path.GetFileNameWithoutExtension(dbPath) + ".before-restore-*.db")
            .Select(f => (File: f, M: BeforeDb.Match(f)))
            .Where(x => x.M.Success && DateTime.TryParseExact(x.M.Groups[1].Value, BeforeStamp, CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            .Select(x =>
            {
                var at = DateTime.ParseExact(x.M.Groups[1].Value, BeforeStamp, CultureInfo.InvariantCulture);
                var m = new BackupManifest
                {
                    UserId = userId, Date = BackupService.DateName(at), BackedUpAt = at,
                    Machine = Environment.MachineName, Size = new FileInfo(x.File).Length,
                };
                return new BackupEntry(dir, x.File, null, m, IsLocal: true, IsBeforeRestore: true);
            })
            .OrderByDescending(e => e.Manifest.BackedUpAt).ToList();
    }

    /// <summary>
    /// 복구 실행. candidates는 같은 날짜의 백업들(먼저 시도할 것 먼저) — 검사에 실패하면 다음 것을 시도한다.
    /// dbPath에 DB가 없으면(새 PC 첫 로그인) 교체 전 보관 없이 가져오기만 한다.
    /// </summary>
    public static RestoreResult Restore(IReadOnlyList<BackupEntry> candidates, string dbPath, string filesRoot, int keepDays, Func<DateTime>? now = null)
    {
        var at = (now ?? (() => DateTime.Now))();
        var dir = Path.GetDirectoryName(dbPath)!;
        Directory.CreateDirectory(dir);
        var tmp = Path.Combine(dir, Path.GetFileNameWithoutExtension(dbPath) + ".restore-tmp.db");
        var errors = new List<string>();
        BackupEntry? used = null;
        BackupLock? held = null;
        try
        {
            // 백업이 돌고 있으면 끝날 때까지 기다린다(작업 스케줄러 백업 포함)
            held = BackupLock.Acquire(BackupLock.PathFor(dbPath), BackupService.LockTimeout);
            foreach (var c in candidates)
            {
                try
                {
                    File.Copy(c.DbFile, tmp, overwrite: true);
                    var error = Verify(tmp, c.Manifest);
                    if (error is null) { used = c; break; }
                    errors.Add($"{c.Source}: {error}");
                }
                catch (Exception ex)
                {
                    errors.Add($"{c.Source}: {ex.Message}");
                }
            }
            if (used is null)
                return new RestoreResult(null, null, 0, "쓸 수 있는 백업이 없습니다.\n" + string.Join("\n", errors));

            // 지금 DB 보관 → 교체(교체에 실패하면 보관본으로 되돌림)
            SqliteConnection.ClearAllPools();
            string? before = null;
            if (File.Exists(dbPath))
            {
                before = Path.Combine(dir, $"{Path.GetFileNameWithoutExtension(dbPath)}.before-restore-{at.ToString(BeforeStamp)}.db");
                try { new LocalDatabase(dbPath).BackupTo(before); }
                catch { File.Copy(dbPath, before, overwrite: true); }   // 열리지 않는(깨진) DB는 파일 그대로
                SqliteConnection.ClearAllPools();
            }
            try
            {
                foreach (var suffix in new[] { "-wal", "-shm" })
                    if (File.Exists(dbPath + suffix)) File.Delete(dbPath + suffix);
                File.Move(tmp, dbPath, overwrite: true);
            }
            catch
            {
                if (before is not null) File.Copy(before, dbPath, overwrite: true);
                throw;
            }

            var files = used.FilesMirror is null ? 0 : RestoreFiles(used.FilesMirror, filesRoot, used.Manifest.Date);
            PruneBeforeRestore(dbPath, keepDays, at);
            return new RestoreResult(used, before, files, null);
        }
        catch (Exception ex)
        {
            return new RestoreResult(used, null, 0, "복구하지 못했습니다: " + ex.Message);
        }
        finally
        {
            try { File.Delete(tmp); } catch { /* 임시 파일 */ }
            held?.Dispose();
        }
    }

    /// <summary>복사해 온 파일 검사 — SHA-256(정보 파일이 있을 때) · 무결성 · DB 버전. 문제가 없으면 null</summary>
    public static string? Verify(string path, BackupManifest manifest)
    {
        if (!string.IsNullOrEmpty(manifest.Sha256) && !string.Equals(BackupService.Sha256Of(path), manifest.Sha256, StringComparison.OrdinalIgnoreCase))
            return "파일이 손상되었습니다(SHA-256 불일치).";
        var (ok, version, error) = LocalDatabase.Inspect(path);
        if (!ok) return "DB 검사에 실패했습니다: " + error;
        if (version > LocalDatabase.SchemaVersion)
            return $"더 새 버전 프로그램에서 만든 백업입니다(DB 버전 {version}). 프로그램을 업데이트한 뒤 복구하세요.";
        return null;
    }

    /// <summary>
    /// 첨부 받아 오기 — 미러에 있고 로컬에 없는 파일만 복사한다. 복구 날짜 이후에 지워진 파일(.deleted\&lt;날짜&gt;)도
    /// 그 날짜 DB가 가리키므로 함께 받아 온다. 로컬에만 있는 파일은 지우지 않는다(쓰이지 않을 뿐).
    /// </summary>
    private static int RestoreFiles(string mirror, string filesRoot, string date)
    {
        if (!Directory.Exists(mirror)) return 0;
        var count = 0;
        void CopyMissing(string from)
        {
            foreach (var file in Directory.EnumerateFiles(from, "*", SearchOption.AllDirectories))
            {
                var rel = Path.GetRelativePath(from, file);
                if (rel.StartsWith(BackupService.DeletedDir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) continue;
                if (rel.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase)) continue;
                var dest = Path.Combine(filesRoot, rel);
                if (File.Exists(dest)) continue;
                Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
                File.Copy(file, dest);
                count++;
            }
        }
        CopyMissing(mirror);
        var deleted = Path.Combine(mirror, BackupService.DeletedDir);
        if (Directory.Exists(deleted))
            foreach (var d in Directory.GetDirectories(deleted).Where(d => DateDir.IsMatch(Path.GetFileName(d)) && string.CompareOrdinal(Path.GetFileName(d), date) >= 0))
                CopyMissing(d);
        return count;
    }

    /// <summary>보관 일수보다 오래된 '복구 전 DB' 삭제</summary>
    private static void PruneBeforeRestore(string dbPath, int keepDays, DateTime now)
    {
        var oldest = now.Date.AddDays(-(Math.Max(1, keepDays) - 1));
        foreach (var e in FindBeforeRestore(dbPath, ""))
            if (e.Manifest.BackedUpAt < oldest)
                try { File.Delete(e.DbFile); } catch { /* 다음에 */ }
    }

    private static BackupManifest? ReadManifest(string path)
    {
        try { return File.Exists(path) ? JsonSerializer.Deserialize<BackupManifest>(File.ReadAllText(path)) : null; }
        catch { return null; }
    }
}

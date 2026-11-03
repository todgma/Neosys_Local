using Microsoft.Data.Sqlite;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>공유폴더에서 찾은 직원 한 명의 백업 — Candidates: 가장 최근 날짜의 백업들(늦게 백업한 것 먼저, 여러 공유폴더)</summary>
public sealed record StaffBackup(string UserId, IReadOnlyList<BackupEntry> Candidates)
{
    public BackupManifest Latest => Candidates[0].Manifest;
    public string Name => string.IsNullOrWhiteSpace(Latest.RtNm) ? UserId : Latest.RtNm!;
}

/// <summary>읽기 전용으로 연 직원 DB 사본</summary>
public sealed record StaffDbCopy(LocalDatabase Db, string FilesRoot, BackupEntry Used);

/// <summary>
/// 대표의 직원 DB 보기(docs/DB_BACKUP.md 5장). Neosys 폴더(이 PC·공유폴더)의 다른 계정 폴더에서 최신 백업을 찾고,
/// 이 PC의 임시 폴더로 복사·검사해 읽기 전용으로 연다. 직원 DB를 고치지는 않는다(보기만, 2026-10-28 결정).
/// </summary>
public static class StaffDbService
{
    /// <summary>보기용 사본을 두는 폴더(열 때마다 비우고 새로 복사)</summary>
    public static string DefaultViewRoot => Path.Combine(AccountStore.DefaultBaseDir, "viewer");

    /// <summary>
    /// 이 PC Neosys 폴더(다른 PC가 여기에 백업해 둔 것)와 등록된 공유폴더에서 같은 사무소의 다른 계정 백업을 모은다(이름순).
    /// 사무소는 백업 정보 파일의 사무소번호로 거른다(정보 파일이 없으면 포함). 연결 안 되는 공유폴더는 건너뛴다.
    /// </summary>
    public static List<StaffBackup> Find(IEnumerable<string> shares, string? localRoot, long? offNo, string myUserId)
    {
        var me = AccountStore.SafeName(myUserId);
        var byAccount = new Dictionary<string, List<BackupEntry>>(StringComparer.OrdinalIgnoreCase);
        foreach (var (source, root, isLocal) in RestoreService.Roots(shares, localRoot))
            foreach (var account in RestoreService.Accounts(root).Where(a => !string.Equals(a, me, StringComparison.OrdinalIgnoreCase)))
            {
                if (!byAccount.TryGetValue(account, out var entries)) byAccount[account] = entries = new();
                entries.AddRange(RestoreService.ListAccount(root, source, account, isLocal));
            }

        var list = new List<StaffBackup>();
        foreach (var (account, entries) in byAccount)
        {
            var days = RestoreService.ByDate(entries.Where(e => e.Manifest.OffNo is null || offNo is null || e.Manifest.OffNo == offNo));
            if (days.Count == 0) continue;
            var userId = string.IsNullOrWhiteSpace(days[0][0].Manifest.UserId) ? account : days[0][0].Manifest.UserId;
            list.Add(new StaffBackup(userId, days[0]));
        }
        return list.OrderBy(s => s.Name, StringComparer.CurrentCulture).ToList();
    }

    /// <summary>
    /// 후보(같은 날짜, 먼저 시도할 것 먼저)를 viewRoot\&lt;계정&gt;\view.db로 복사해 검사하고, 마이그레이션을 맞춘 뒤 읽기 전용으로 연다.
    /// 첨부는 그 백업 옆의 미러 폴더(공유폴더)를 그대로 읽는다.
    /// </summary>
    public static StaffDbCopy Open(IReadOnlyList<BackupEntry> candidates, string viewRoot)
    {
        if (candidates.Count == 0) throw new InvalidOperationException("볼 수 있는 백업이 없습니다.");
        var dir = Path.Combine(viewRoot, AccountStore.SafeName(candidates[0].Manifest.UserId is { Length: > 0 } u ? u : "staff"));
        SqliteConnection.ClearAllPools();
        if (Directory.Exists(dir)) Directory.Delete(dir, recursive: true);
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, "view.db");
        var errors = new List<string>();
        foreach (var c in candidates)
        {
            try
            {
                File.Copy(c.DbFile, path, overwrite: true);
                var error = RestoreService.Verify(path, c.Manifest);
                if (error is not null) { errors.Add($"{c.Source}: {error}"); continue; }
                new LocalDatabase(path).Initialize();   // 옛 버전 백업도 지금 화면·SQL로 볼 수 있게(사본에만 적용)
                SqliteConnection.ClearAllPools();
                return new StaffDbCopy(new LocalDatabase(path, readOnly: true), c.FilesMirror ?? Path.Combine(dir, "files"), c);
            }
            catch (Exception ex)
            {
                errors.Add($"{c.Source}: {ex.Message}");
            }
        }
        throw new InvalidOperationException("직원 DB를 열지 못했습니다.\n" + string.Join("\n", errors));
    }

    /// <summary>보기용 사본 지우기(내 DB로 돌아갈 때)</summary>
    public static void Cleanup(string viewRoot)
    {
        try
        {
            SqliteConnection.ClearAllPools();
            if (Directory.Exists(viewRoot)) Directory.Delete(viewRoot, recursive: true);
        }
        catch { /* 다음에 열 때 다시 지운다 */ }
    }
}

using System.IO;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App;

/// <summary>
/// 작업 스케줄러가 부르는 창 없는 백업 — "NeosysLight.exe --backup &lt;계정&gt;"(docs/DB_BACKUP.md 2장).
/// 서버 로그인 없이 그 계정의 로컬 DB를 이 PC Neosys 폴더와 등록된 공유폴더에 백업하고, 결과를 backup_status.json에 남긴다.
/// 프로그램이 같은 계정을 백업·복구 중이면 잠금(BackupLock)으로 끝날 때까지 기다린다.
/// 종료 코드: 0 성공, 1 백업 실패, 2 계정 DB 없음, 3 로그인 기록 없음
/// </summary>
public static class HeadlessBackup
{
    public static bool IsRequested(string[] args) => args.Length >= 2 && args[0] == "--backup";

    public static async Task<int> RunAsync(string userId)
    {
        var settings = AppSettings.Load();
        var accounts = new AccountStore();
        // NEOSYS_DB를 주면(개발·점검용) DB·첨부·Neosys 폴더·공유폴더를 모두 환경변수로 — 실제 공유폴더에 쓰지 않게
        var dev = Environment.GetEnvironmentVariable("NEOSYS_DB");
        var dbPath = dev ?? accounts.DbPath(userId);
        if (!File.Exists(dbPath)) return 2;
        var session = SavedSession.Load(SavedSession.PathFor(dbPath));
        if (session is null) return 3;

        var files = dev is null ? accounts.FilesRoot(userId) : Environment.GetEnvironmentVariable("NEOSYS_FILES") ?? Path.Combine(Path.GetDirectoryName(dbPath)!, "files");
        var localRoot = dev is null
            ? string.IsNullOrWhiteSpace(settings.ShareFolder) ? BackupService.DefaultLocalRoot : settings.ShareFolder!
            : Environment.GetEnvironmentVariable("NEOSYS_SHARE") ?? Path.Combine(Path.GetDirectoryName(dbPath)!, "Neosys");
        var shares = dev is null
            ? settings.BackupShares
            : (Environment.GetEnvironmentVariable("NEOSYS_SHARES") ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries).ToList();
        var service = new BackupService(new LocalDatabase(dbPath), files, localRoot);
        var r = await service.RunAsync(session, shares, settings.BackupKeepDays);

        var statusPath = BackupStatus.PathFor(dbPath);
        var status = BackupStatus.Load(statusPath);
        status.Apply(r, "scheduler");
        try { status.Save(statusPath); } catch { /* 상태 저장 실패는 무시 */ }
        return r.Ok ? 0 : 1;
    }
}

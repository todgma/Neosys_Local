using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App;

/// <summary>
/// 자동 백업 — 로그인하면 시작해 설정 주기마다 BackupService를 돌리고, 대시보드를 닫을 때(종료·로그아웃) 한 번 더 백업한다.
/// 작업 스케줄러 백업을 켜 두면(Settings.ScheduledBackup) 주기 백업은 스케줄러에 맡기고, 여기서는 상태 파일만 1분마다 다시 읽는다
/// ([지금 백업]·종료 시 백업은 그대로). 결과는 계정 폴더의 backup_status.json에 남기고 StatusChanged로 DB 관리 창·대시보드 버튼에 알린다(docs/DB_BACKUP.md 2장).
/// </summary>
public static class BackupScheduler
{
    private static DispatcherTimer? _timer;
    private static AppSession? _session;
    private static BackupService? _service;
    private static string? _statusPath;
    private static DateTime _statusStamp;

    /// <summary>오늘 백업이 아직 없을 때 로그인 후 첫 백업까지 기다리는 시간</summary>
    private static readonly TimeSpan FirstDelay = TimeSpan.FromMinutes(1);
    /// <summary>작업 스케줄러 모드에서 상태 파일을 다시 읽는 간격</summary>
    private static readonly TimeSpan StatusPoll = TimeSpan.FromMinutes(1);

    public static BackupStatus Status { get; private set; } = new();
    public static bool Running { get; private set; }
    public static event Action? StatusChanged;

    /// <summary>
    /// 로그인 직후(또는 Neosys 폴더를 바꾼 뒤) — 이 계정 DB·첨부 폴더·Neosys 폴더로 백업 준비, 로그인 정보 저장(스케줄러 백업용),
    /// 예전 구조 백업 옮기기(백그라운드), 타이머 시작
    /// </summary>
    public static void Start(AppSession session)
    {
        Stop();
        _session = session;
        var db = AppServices.MyDb;
        var localRoot = AppServices.ShareFolder;
        _service = new BackupService(db, AppServices.MyFilesRoot, localRoot);
        _statusPath = BackupStatus.PathFor(db.FilePath);
        try { SavedSession.Save(SavedSession.PathFor(db.FilePath), session); } catch { /* 스케줄러 백업만 영향 */ }
        ReloadStatus(force: true);

        var shares = AppServices.Settings.BackupShares.ToList();
        var lockPath = BackupLock.PathFor(db.FilePath);
        _ = Task.Run(() =>
        {
            try
            {
                using var _ = BackupLock.Acquire(lockPath, BackupService.LockTimeout);
                BackupService.MigrateOldLayout(shares, BackupService.OldLocalRoot, localRoot, session.OffNo, session.UserId);
            }
            catch { /* 다음 로그인 때 다시 */ }
        });
#if !DEBUG
        // 작업 스케줄러 백업이 지금 exe를 가리키는지(디버그 빌드는 bin 경로가 등록되지 않게 건너뜀)
        if (AppServices.Settings.ScheduledBackup && Environment.ProcessPath is { } exe
            && !Path.GetFileName(exe).Equals("dotnet.exe", StringComparison.OrdinalIgnoreCase))
        {
            var minutes = AppServices.Settings.BackupIntervalMinutes;
            _ = Task.Run(() =>
            {
                try { ScheduledBackupTask.Repair(exe, session.UserId, minutes, ScheduledBackupTask.RegisteredCommand, ScheduledBackupTask.Register); }
                catch { /* DB 관리 창에 상태가 표시된다 */ }
            });
        }
#endif

        Arm(first: true);
        StatusChanged?.Invoke();
    }

    public static void Stop()
    {
        _timer?.Stop();
        _timer = null;
    }

    /// <summary>복구 직전 — 타이머를 멈추고 종료 시 백업도 하지 않는다(복구 뒤 다시 시작하면 Start로 새로 켜짐)</summary>
    public static void Suspend()
    {
        Stop();
        _service = null;
        _session = null;
    }

    /// <summary>설정(주기·작업 스케줄러)이 바뀌면 타이머를 다시 잡는다</summary>
    public static void Reschedule()
    {
        if (_service is null) return;
        Stop();
        Arm(first: false);
        StatusChanged?.Invoke();
    }

    /// <summary>Neosys 폴더를 바꾼 뒤 — 새 위치로 다시 시작</summary>
    public static void Restart()
    {
        if (_session is { } s) Start(s);
    }

    private static void Arm(bool first)
    {
        _timer = new DispatcherTimer();
        if (AppServices.Settings.ScheduledBackup)
        {
            // 주기 백업은 작업 스케줄러가 한다 — 그 결과(상태 파일)만 따라 읽는다
            _timer.Interval = StatusPoll;
            _timer.Tick += (_, _) => { if (ReloadStatus(force: false)) StatusChanged?.Invoke(); };
        }
        else
        {
            _timer.Tick += async (_, _) =>
            {
                _timer!.Interval = Interval;
                await RunNowAsync();
            };
            // 오늘 성공한 백업이 없으면 곧 한 번, 있으면 주기대로
            _timer.Interval = first && Status.LastSuccessAt?.Date != DateTime.Today ? FirstDelay : Interval;
        }
        _timer.Start();
    }

    private static TimeSpan Interval => TimeSpan.FromMinutes(Math.Max(10, AppServices.Settings.BackupIntervalMinutes));

    /// <summary>상태 파일이 바뀌었으면 다시 읽는다(작업 스케줄러가 쓴 결과). 바뀌었으면 true</summary>
    private static bool ReloadStatus(bool force)
    {
        if (_statusPath is null) return false;
        var stamp = File.Exists(_statusPath) ? File.GetLastWriteTimeUtc(_statusPath) : DateTime.MinValue;
        if (!force && stamp == _statusStamp) return false;
        _statusStamp = stamp;
        Status = BackupStatus.Load(_statusPath);
        return true;
    }

    /// <summary>지금 백업 — 다른 백업·복구(작업 스케줄러 포함)가 돌고 있으면 끝날 때까지 기다렸다가 한다</summary>
    public static async Task<BackupResult?> RunNowAsync()
    {
        if (_service is null || _session is null) return null;
        var s = AppServices.Settings;
        Running = true;
        StatusChanged?.Invoke();
        try
        {
            var r = await _service.RunAsync(_session, s.BackupShares, s.BackupKeepDays);
            ReloadStatus(force: true);   // 기다리는 동안 스케줄러가 쓴 결과 위에 반영
            Status.Apply(r);
            try
            {
                Status.Save(_statusPath!);
                _statusStamp = File.GetLastWriteTimeUtc(_statusPath!);
            }
            catch { /* 상태 저장 실패는 무시 */ }
            return r;
        }
        finally
        {
            Running = false;
            StatusChanged?.Invoke();
        }
    }

    /// <summary>대시보드를 닫을 때(종료·로그아웃) — 설정이 켜져 있으면 작은 안내 창을 띄우고 백업을 마친 뒤 멈춘다</summary>
    public static async Task RunOnCloseAsync()
    {
        Stop();
        if (_service is null || !AppServices.Settings.BackupOnExit) return;
        var w = new Window
        {
            Title = "백업", Width = 320, SizeToContent = SizeToContent.Height, ResizeMode = ResizeMode.NoResize,
            WindowStyle = WindowStyle.ToolWindow, WindowStartupLocation = WindowStartupLocation.CenterScreen, Topmost = true,
            Content = new Border
            {
                Padding = new Thickness(20, 18, 20, 18),
                Child = new StackPanel
                {
                    Children =
                    {
                        new TextBlock { Text = "데이터를 백업하는 중입니다…", FontSize = 14, FontWeight = FontWeights.Bold, HorizontalAlignment = HorizontalAlignment.Center },
                        new ProgressBar { IsIndeterminate = true, Height = 6, Margin = new Thickness(0, 12, 0, 0) },
                    },
                },
            },
        };
        w.Show();
        try { await RunNowAsync(); }
        finally
        {
            w.Close();
            _service = null;
            _session = null;
        }
    }
}

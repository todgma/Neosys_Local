using System.Text.Json;

namespace Neosys.Local.Core;

/// <summary>%LOCALAPPDATA%\Neosys\settings.json — 서버 주소, 마지막 로그인 ID 등 PC별 설정</summary>
public sealed class AppSettings
{
    public string ServerApiBase { get; set; } = "https://api.neosis.kr";
    public string? LastUserId { get; set; }
    public bool RememberId { get; set; } = true;
    /// <summary>DB 백업 공유폴더(UNC 경로, 예: \\PC이름\공유이름). 등록된 모든 곳에 백업한다(docs/DB_BACKUP.md)</summary>
    public List<string> BackupShares { get; set; } = new();
    /// <summary>자동 백업 주기(분). 기본 2시간</summary>
    public int BackupIntervalMinutes { get; set; } = 120;
    /// <summary>일자별 백업 보관 일수. 기본 7일 — 그보다 오래된 날짜 파일은 지운다</summary>
    public int BackupKeepDays { get; set; } = 7;
    /// <summary>프로그램 종료 시 백업. 기본 켬</summary>
    public bool BackupOnExit { get; set; } = true;
    /// <summary>
    /// 이 PC의 Neosys 폴더(네트워크에 'Neosys'로 공유하는 폴더) — 계정별 BackUp이 들어간다. null이면 C: 기본 위치
    /// (%LOCALAPPDATA%\Neosys\Shared). 다른 드라이브를 고르면 X:\Neosys(docs/DB_BACKUP.md 2장)
    /// </summary>
    public string? ShareFolder { get; set; }
    /// <summary>최초 실행 공유 설정을 이 PC에서 마쳤는지(FirstRunSetup) — 진행 창·공유 정보 알림은 이 값이 false일 때 한 번 뜬다</summary>
    public bool FirstRunSetupDone { get; set; }
    /// <summary>Windows 작업 스케줄러로 주기 백업(프로그램이 꺼져 있어도). 켜면 프로그램의 주기 백업은 하지 않는다</summary>
    public bool ScheduledBackup { get; set; }
    /// <summary>Windows 시작 시 자동 실행(시작프로그램 등록). 기본 켬</summary>
    public bool RunAtStartup { get; set; } = true;
    /// <summary>상담모드(기존 대시보드 토글, 기본 끔): 켜면 물건/고객 등록창의 오른쪽 카드(특징·상담내용·소유자 등)를 숨긴다</summary>
    public bool ConsultMode
    {
        get => _consultMode;
        set
        {
            if (_consultMode == value) return;
            _consultMode = value;
            ConsultModeChanged?.Invoke();
        }
    }
    private bool _consultMode;

    /// <summary>상담모드가 바뀌면 열린 창이 바로 반영(기존 consult-mode-change 이벤트 — 다른 창에도 즉시 적용)</summary>
    public event Action? ConsultModeChanged;

    public static string FilePath =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "settings.json");

    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

    /// <summary>저장 직전 설정 사본(settings.json.bak) — 본 파일이 깨졌을 때 읽는다</summary>
    public static string BackupPath(string path) => path + ".bak";

    public static AppSettings Load() => Load(FilePath);

    /// <summary>본 파일 → 사본 순서로 읽는다. 둘 다 없거나 깨졌으면 기본값</summary>
    public static AppSettings Load(string path)
    {
        foreach (var p in new[] { path, BackupPath(path) })
        {
            try
            {
                if (File.Exists(p) && JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(p)) is { } s) return s;
            }
            catch { /* 깨진 파일(저장 중 전원이 꺼진 경우 등) — 다음 후보로 */ }
        }
        return new();
    }

    public void Save() => Save(FilePath);

    /// <summary>
    /// 임시 파일에 쓰고 디스크에 내린 뒤 바꿔 넣는다. 저장 중에 전원이 꺼지거나 강제로 재부팅돼도 이전 설정이나 새 설정 중 하나는 남는다
    /// (예전에는 본 파일에 바로 써서 빈 파일이 남으면 다음 실행 때 설정 전체가 기본값으로 돌아갔다 — 공유 폴더 위치·백업 공유폴더·최초 설정 완료 포함).
    /// </summary>
    public void Save(string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var tmp = path + ".tmp";
        using (var f = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            JsonSerializer.Serialize(f, this, Json);
            f.Flush(flushToDisk: true);
        }
        if (File.Exists(path)) File.Replace(tmp, path, BackupPath(path), ignoreMetadataErrors: true);
        else File.Move(tmp, path);
    }
}

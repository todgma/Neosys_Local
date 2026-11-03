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
    /// <summary>최초 실행 공유 설정을 이 PC에서 마쳤는지(FirstRunSetup) — 공유 정보 알림은 이 값이 false일 때 한 번 뜬다</summary>
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

    public static AppSettings Load()
    {
        try
        {
            if (File.Exists(FilePath))
                return JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(FilePath)) ?? new();
        }
        catch { /* 손상된 설정은 기본값으로 */ }
        return new();
    }

    public void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
        File.WriteAllText(FilePath, JsonSerializer.Serialize(this, Json));
    }
}

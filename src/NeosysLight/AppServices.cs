using Neosys.Local.Core;
using Neosys.Local.Core.Server;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App;

/// <summary>
/// 앱 전역 서비스. 시작 시 Initialize(설정·서버), 로그인 성공 시 OpenAccountAsync(그 계정의 로컬 DB·공통코드), 그다음 Session을 채운다.
/// 로컬 DB는 계정별(%LOCALAPPDATA%\Neosys\accounts\&lt;계정ID&gt;\&lt;계정ID&gt;.db) — 로그인 전에는 열려 있지 않다.
/// </summary>
public static class AppServices
{
    public static AppSettings Settings { get; private set; } = new();
    public static AccountStore Accounts { get; } = new();
    public static LocalDatabase Db { get; private set; } = null!;
    public static SpRunner Sp { get; private set; } = null!;
    public static ServerApi Server { get; private set; } = null!;
    public static CodeService Codes { get; private set; } = null!;
    public static AuthService Auth { get; private set; } = null!;
    /// <summary>현재 계정의 첨부파일 폴더(FileService 루트)</summary>
    public static string FilesRoot { get; private set; } = FileService.DefaultRoot;
    /// <summary>현재 열린 로컬 DB의 계정 ID(null = 아직 안 열림)</summary>
    public static string? OpenedAccount { get; private set; }

    private static AppSession? _session;
    public static AppSession Session => _session ?? throw new InvalidOperationException("로그인 전입니다.");
    public static bool IsLoggedIn => _session is not null;

    /// <summary>앱 시작 시 — 설정·서버 연결만. 로컬 DB는 로그인 후 OpenAccountAsync에서 연다.</summary>
    public static Task InitializeAsync()
    {
        Settings = AppSettings.Load();
        // NEOSYS_API: 서버 주소를 바꿀 때(개발·테스트용). 없으면 설정값(기본 https://api.neosis.kr)
        Server = new ServerApi(Environment.GetEnvironmentVariable("NEOSYS_API") ?? Settings.ServerApiBase);
        Auth = new AuthService(Server, () => Sp ?? throw new InvalidOperationException("로컬 DB가 열려 있지 않습니다."));
        return Task.CompletedTask;
    }

    /// <summary>
    /// 계정의 로컬 DB를 연다(없으면 만들고 마이그레이션) + 공통코드 로드. 같은 계정이 이미 열려 있으면 그대로 둔다.
    /// NEOSYS_DB / NEOSYS_FILES: DB 파일·첨부 폴더를 바꿀 때(개발·테스트용) — 지정하면 계정과 무관하게 그 위치를 쓴다.
    /// </summary>
    public static async Task OpenAccountAsync(string userId)
    {
        if (OpenedAccount is not null && string.Equals(OpenedAccount, userId, StringComparison.OrdinalIgnoreCase)) return;
        var db = new LocalDatabase(Environment.GetEnvironmentVariable("NEOSYS_DB") ?? Accounts.DbPath(userId));
        await Task.Run(db.Initialize);
        var sp = new SpRunner(db);
        var codes = new CodeService(sp);
        await codes.LoadAsync();
        Db = db;
        Sp = sp;
        Codes = codes;
        FilesRoot = Environment.GetEnvironmentVariable("NEOSYS_FILES") ?? Accounts.FilesRoot(userId);
        OpenedAccount = userId;
    }

    // ---------------- 대표의 직원 DB 보기(읽기 전용, docs/DB_BACKUP.md 5장) ----------------

    /// <summary>보고 있는 직원 DB(null = 내 DB)</summary>
    public static StaffView? Viewing { get; private set; }
    /// <summary>직원 DB 보기로 들어가거나 내 DB로 돌아올 때</summary>
    public static event Action? ViewChanged;
    private static (LocalDatabase Db, SpRunner Sp, CodeService Codes, string FilesRoot)? _mine;
    /// <summary>내 계정 DB(직원 DB를 보는 중에도)</summary>
    public static LocalDatabase MyDb => _mine?.Db ?? Db;
    /// <summary>내 계정 첨부 폴더(직원 DB를 보는 중에도)</summary>
    public static string MyFilesRoot => _mine?.FilesRoot ?? FilesRoot;

    /// <summary>
    /// 직원 DB 사본(읽기 전용)으로 바꾼다. 세션은 대표 그대로 — 조회 SQL은 담당자로 거르지 않으므로 직원 데이터가 다 보이고,
    /// 쓰기는 읽기 전용 연결이 막는다. 메뉴 창은 호출하는 쪽에서 미리 닫는다. 자동 백업은 시작할 때 잡은 내 DB를 계속 백업한다.
    /// </summary>
    public static async Task EnterStaffViewAsync(StaffDbCopy copy, StaffView view)
    {
        var sp = new SpRunner(copy.Db);
        var codes = new CodeService(sp);
        await codes.LoadAsync();
        _mine ??= (Db, Sp, Codes, FilesRoot);
        Db = copy.Db;
        Sp = sp;
        Codes = codes;
        FilesRoot = copy.FilesRoot;
        Viewing = view;
        ViewChanged?.Invoke();
    }

    /// <summary>내 DB로 돌아온다(보기용 사본은 지운다). 보기 중이 아니면 아무것도 하지 않는다.</summary>
    public static void ExitStaffView()
    {
        if (_mine is not { } m) return;
        (Db, Sp, Codes, FilesRoot) = m;
        _mine = null;
        Viewing = null;
        StaffDbService.Cleanup(StaffDbService.DefaultViewRoot);
        ViewChanged?.Invoke();
    }

    /// <summary>이 PC의 Neosys 폴더(네트워크에 공유하는 폴더, 계정별 BackUp이 들어감) — 설정이 없으면 C: 기본 위치</summary>
    public static string ShareFolder => string.IsNullOrWhiteSpace(Settings.ShareFolder) ? BackupService.DefaultLocalRoot : Settings.ShareFolder!;

    public static void SetSession(AppSession session) => _session = session;

#if DEBUG
    /// <summary>디버그 점검용 — 가짜 서버(법정동·단지 견본)로 바꾼다(DevCrud)</summary>
    internal static void UseServer(ServerApi server) => Server = server;
#endif
    public static void ClearSession() => _session = null;

    /// <summary>메뉴 서비스 생성 도우미 — 세션은 호출 시점의 값을 쓴다</summary>
    public static T Create<T>(Func<SpRunner, Func<AppSession>, T> factory) => factory(Sp, () => Session);
}

/// <summary>보고 있는 직원 DB — 창 제목·대시보드 안내에 표시</summary>
public sealed record StaffView(string UserId, string Name, DateTime BackedUpAt, string Source)
{
    public string Label => $"{Name} DB · {BackedUpAt:MM-dd HH:mm} 기준 · 읽기 전용";
}

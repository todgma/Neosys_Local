using Neosys.Local.Core;
using Neosys.Local.Core.Server;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App;

/// <summary>앱 전역 서비스. 시작 시 Initialize, 로그인 후 Session을 채운다.</summary>
public static class AppServices
{
    public static AppSettings Settings { get; private set; } = new();
    public static LocalDatabase Db { get; private set; } = null!;
    public static SpRunner Sp { get; private set; } = null!;
    public static ServerApi Server { get; private set; } = null!;
    public static CodeService Codes { get; private set; } = null!;
    public static AuthService Auth { get; private set; } = null!;

    private static AppSession? _session;
    public static AppSession Session => _session ?? throw new InvalidOperationException("로그인 전입니다.");
    public static bool IsLoggedIn => _session is not null;

    public static async Task InitializeAsync()
    {
        Settings = AppSettings.Load();
        // NEOSYS_DB: DB 파일 경로를 바꿀 때(개발·테스트용). 없으면 %LOCALAPPDATA%\Neosys\neosis_local.db
        Db = new LocalDatabase(Environment.GetEnvironmentVariable("NEOSYS_DB"));
        await Task.Run(Db.Initialize);
        Sp = new SpRunner(Db);
        // NEOSYS_API: 서버 주소를 바꿀 때(개발·테스트용). 없으면 설정값(기본 https://api.neosis.kr)
        Server = new ServerApi(Environment.GetEnvironmentVariable("NEOSYS_API") ?? Settings.ServerApiBase);
        Codes = new CodeService(Sp);
        await Codes.LoadAsync();
        Auth = new AuthService(Server, Sp);
    }

    public static void SetSession(AppSession session) => _session = session;
    public static void ClearSession() => _session = null;

    /// <summary>메뉴 서비스 생성 도우미 — 세션은 호출 시점의 값을 쓴다</summary>
    public static T Create<T>(Func<SpRunner, Func<AppSession>, T> factory) => factory(Sp, () => Session);
}

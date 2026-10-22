using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>
/// 로컬 SQLite 데이터 확인(임시 개발 기능 — 대시보드 톱니바퀴, 비밀번호 확인 후). 읽기 전용: 테이블 목록·행 수·최근 행.
/// </summary>
public sealed class DbInspectService : ServiceBase
{
    /// <summary>톱니바퀴 팝업 비밀번호(임시 데이터 확인용)</summary>
    public const string Password = "CODEME";

    public DbInspectService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    public static bool CheckPassword(string? input) => string.Equals(input?.Trim(), Password, StringComparison.Ordinal);

    public Task<List<string>> TablesAsync() => Sp.QueryAsync<string>("db_inspect", "TABLES");

    public async Task<long> CountAsync(string table) =>
        (await Sp.QueryTableAsync("db_inspect", "COUNT", table)).FirstOrDefault()?.Long("cnt") ?? 0;

    /// <summary>최근 행부터 최대 limit건</summary>
    public Task<List<Row>> RowsAsync(string table, int limit = 500) =>
        Sp.QueryTableAsync("db_inspect", "ROWS", table, new { q_limit = limit });
}

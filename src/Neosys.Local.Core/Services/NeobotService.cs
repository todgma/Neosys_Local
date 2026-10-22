using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>네오봇(통합검색) — 기존 NeobotService: 물건·고객·계약서·가계약 + 상담이력을 검색어/전화번호로 한 번에</summary>
public sealed class NeobotService : ServiceBase
{
    public static readonly IReadOnlyList<Opt> Kinds = Opt.Pairs(("PT", "물건"), ("CUST", "고객"), ("CT", "계약서"), ("PRE", "가계약"));

    public NeobotService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    public async Task<List<Row>> SearchAsync(string? query, int limit = 30)
    {
        var q = (query ?? "").Trim();
        if (q.Length == 0) return new();
        return await Sp.QueryRowsAsync("neobot", "SEARCH", P(new { q, q_limit = Math.Clamp(limit, 1, 100) }));
    }

    public async Task<List<Row>> ConsultsAsync(string? query, int limit = 50)
    {
        var q = (query ?? "").Trim();
        if (q.Length == 0) return new();
        return await Sp.QueryRowsAsync("neobot", "CONSULTS", P(new { q, q_limit = Math.Clamp(limit, 1, 200) }));
    }
}

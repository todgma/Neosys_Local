using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>메모(포스트잇) — 기존 MemoServices(rt_sticky_memo). 로그인 사용자 본인 메모만.</summary>
public sealed class MemoService : ServiceBase
{
    /// <summary>메모 색(기존 StickyMemo COLORS)</summary>
    public static readonly IReadOnlyList<string> Colors = new[] { "#fef08a", "#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#e9d5ff", "#fecaca" };

    public MemoService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    public Task<List<Row>> ListAsync() => Sp.QueryRowsAsync("rt_sticky_memo", "SEL", P());

    public async Task<Row> AddAsync(int count)
    {
        var r = new Row { ["content"] = "", ["color"] = Colors[count % Colors.Count], ["sort_order"] = 0L };
        r["memo_id"] = await Sp.InsertAsync("rt_sticky_memo", "INS", P(r));
        return r;
    }

    public Task SaveContentAsync(long memoId, string? content) =>
        string.IsNullOrEmpty(content)
            ? Sp.ExecuteAsync("rt_sticky_memo", "CLEAR", new { memo_id = memoId })
            : Sp.ExecuteAsync("rt_sticky_memo", "UPD", P(new { memo_id = memoId, content }));

    public Task SetColorAsync(long memoId, string color) => Sp.ExecuteAsync("rt_sticky_memo", "UPD", P(new { memo_id = memoId, color }));

    public Task DeleteAsync(long memoId) => Sp.ExecuteAsync("rt_sticky_memo", "DEL", new { memo_id = memoId });

    public static string NextColor(string? current)
    {
        var i = current is null ? -1 : Colors.ToList().IndexOf(current);
        return Colors[(i + 1) % Colors.Count];
    }
}

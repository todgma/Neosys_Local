using System.Globalization;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>일정관리 — 기존 ScheduleServices(rt_schedule + rt_schedule_link)</summary>
public sealed class ScheduleService : ServiceBase
{
    /// <summary>구분(ScheduleModal categoryOptions)</summary>
    public static readonly IReadOnlyList<Opt> Categories = Opt.Of("계약일", "중도금일", "잔금일", "만기일", "거래신고기한", "전화드리기", "임장", "내방", "미팅");
    /// <summary>범위: 개인 / 사무실 / 공유(둘 다)</summary>
    public static readonly IReadOnlyList<Opt> Scopes = Opt.Pairs(("MY", "개인"), ("OFFICE", "사무실"), ("SHARE", "공유"));

    public ScheduleService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    /// <summary>scope: MY(나의 일정) / OFFICE(사무실 일정) / ALL</summary>
    public Task<List<Row>> ListAsync(DateTime from, DateTime to, string scope = "MY") =>
        Sp.QueryRowsAsync("rt_schedule", "LIST", P(new { q_from = LocalDate.Format(from), q_to = LocalDate.Format(to), q_scope = scope }));

    public Task<List<Row>> ByPropertyAsync(long ptNo) => Sp.QueryRowsAsync("rt_schedule", "BY_PT", new { pt_no = ptNo });

    public Task<Row?> GetAsync(long id) => Sp.QueryRowAsync("rt_schedule", "GET", new { schedule_id = id });

    public Row New(DateTime? date = null, long? ptNo = null) => new()
    {
        ["scope_div"] = "MY",
        ["start_date"] = LocalDate.Format(date ?? DateTime.Today),
        ["start_time"] = "10:00",
        ["pt_no"] = ptNo,
    };

    /// <summary>화면값(start_date + start_time) → start_at 'yyyy-MM-dd HH:mm'</summary>
    public static void SplitStart(Row r)
    {
        var s = r.Str("start_at");
        if (s is null) return;
        var d = LocalDate.Parse(s);
        if (d is null) return;
        r["start_date"] = LocalDate.Format(d.Value);
        r["start_time"] = s.Length >= 16 ? s.Substring(11, 5) : "";
    }

    public async Task<long> SaveAsync(Row r)
    {
        if (!r.Has("title")) throw new InvalidOperationException("제목을 입력해주세요.");
        if (!r.Has("start_date")) throw new InvalidOperationException("날짜를 입력해주세요.");
        var time = (r.Str("start_time") ?? "").Trim();
        if (r.Long("all_day") != 1)
        {
            if (time.Length == 0) throw new InvalidOperationException("시간을 입력해주세요.");
            // "930"·"0930"처럼 숫자만 입력해도 받는다
            if (time.All(char.IsDigit) && time.Length is 3 or 4) time = time.PadLeft(4, '0').Insert(2, ":");
            if (!TimeSpan.TryParseExact(time, new[] { @"h\:mm", @"hh\:mm" }, CultureInfo.InvariantCulture, out var ts) || ts.TotalHours >= 24)
                throw new InvalidOperationException("시간은 14:30 형식으로 입력해주세요.");
            time = $"{ts.Hours:00}:{ts.Minutes:00}";
        }
        else time = "00:00";
        r["start_at"] = $"{LocalDate.Normalize(r.Str("start_date"))} {time}";
        if (r.Str("category") is null && ScheduleService.Categories.Any(c => c.Value == r.Str("title"))) r["category"] = r.Str("title");

        var id = await Sp.InTransactionAsync(async tx =>
        {
            long no;
            if (r.Long("schedule_id") is > 0)
            {
                no = r.Long("schedule_id")!.Value;
                await tx.ExecuteAsync("rt_schedule", "UPD", P(r));
            }
            else no = await tx.InsertAsync("rt_schedule", "INS", P(r));

            await tx.ExecuteAsync("rt_schedule_link", "DEL", new { schedule_id = no });
            if (r.Long("pt_no") is > 0)
                await tx.ExecuteAsync("rt_schedule_link", "INS", P(new { schedule_id = no, link_type = "PT", link_key = r.Long("pt_no")!.Value.ToString() }));
            return no;
        });
        r["schedule_id"] = id;
        return id;
    }

    /// <summary>
    /// 일정 날짜만 옮기기(달력에서 끌어다 놓기) — 시간·종일·연동 물건 등 나머지는 그대로 두고 바로 저장한다.
    /// 반환: 옮겼으면 true(일정이 없거나 같은 날이면 false). 시간 없이 저장된 옛 일정은 00:00으로 둔다.
    /// </summary>
    public async Task<bool> MoveAsync(long id, DateTime date)
    {
        var r = await GetAsync(id);
        if (r is null) return false;
        SplitStart(r);
        if (r.Str("start_date") == LocalDate.Format(date)) return false;
        r["start_date"] = LocalDate.Format(date);
        if (r.Long("all_day") != 1 && !r.Has("start_time")) r["start_time"] = "00:00";
        await SaveAsync(r);
        return true;
    }

    /// <summary>일정 범위(scope_div)가 달력 보기(OFFICE 사무소 일정 / MY 나의 일정)에 보이는지 — rt_schedule.LIST와 같은 규칙(본인 일정 기준)</summary>
    public static bool VisibleIn(string? scopeDiv, string view) => view switch
    {
        "OFFICE" => scopeDiv is "OFFICE" or "SHARE",
        "MY" => scopeDiv is null or "MY" or "SHARE",
        _ => true,
    };

    public Task DeleteAsync(long id) => Sp.ExecuteAsync("rt_schedule", "DEL", P(new { schedule_id = id }));
}

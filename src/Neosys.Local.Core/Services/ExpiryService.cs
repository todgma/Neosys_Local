using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>만기관리 — 기존 ExpiryService. 만기일이 입력된 물건을 현상태와 무관하게 기간으로 조회</summary>
public sealed class ExpiryService : ServiceBase
{
    public ExpiryService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    /// <summary>ptTypes: SYCA 코드(콤마), 기간은 만기일 기준(포함)</summary>
    public async Task<List<Row>> ListAsync(DateTime? from, DateTime? to, string? ptTypes = null)
    {
        var rows = await Sp.QueryRowsAsync("pt_sale", "EXPIRY", P(new
        {
            q_fr = from is null ? null : LocalDate.Format(from.Value),
            q_to = to is null ? null : LocalDate.Format(to.Value),
            q_pt_type = ptTypes,
        }));
        foreach (var r in rows)
        {
            // 남은 일수(D-day)
            if (LocalDate.Parse(r.Str("expiry_date")) is { } d) r["d_day"] = (long)(d.Date - DateTime.Today).TotalDays;
            r["name_text"] = NameText(r);
            r["detail_addr"] = DetailText(r);
            r["area_text"] = AreaText(r);
        }
        return rows;
    }

    // 단지형 코드(기존 ExpiryPage APT_ROW_CODES) — 물건명을 단지명(addr4)으로 보인다
    private static readonly HashSet<string> AptRowCodes = new() { "SYCA101", "SYCA102", "SYCA103", "SYCA104", "SYCA105", "SYCA106", "SYCA107", "SYCA120" };

    /// <summary>물건명 — 단지형은 단지명(addr4), 그 외는 건물명(addr5), 없으면 pt_name</summary>
    public static string NameText(Row r)
    {
        var name = AptRowCodes.Contains(r.Str("pt_type") ?? "") || r.Has("danji_code") ? r.Str("addr4") : r.Str("addr5");
        return First(name, r.Str("pt_name"), "-")!;
    }

    private static string? DongHo(Row r) =>
        First(string.Join(" ", new[] { r.Has("dong") ? $"{r.Str("dong")}동" : null, r.Has("ho") ? $"{r.Str("ho")}호" : null }.Where(x => x is not null)));

    /// <summary>상세주소 — 토지는 지번, 그 외는 동·호(없으면 지번). 소재지는 넣지 않는다</summary>
    public static string DetailText(Row r) =>
        First(r.Str("pt_type") == "SYCA115" ? r.Str("jibun") : First(DongHo(r), r.Str("jibun")), "-")!;

    /// <summary>면적 — 타입이 있으면 타입, 없으면 공급/전용㎡</summary>
    public static string AreaText(Row r)
    {
        if (r.Has("apt_typ")) return r.Str("apt_typ")!;
        var (sup, exc) = (r.Dec("sup_area"), r.Dec("exc_area"));
        return sup is null && exc is null ? "-" : $"{(sup is { } s ? $"{s:0.##}" : "-")}/{(exc is { } e ? $"{e:0.##}" : "-")}㎡";
    }

    /// <summary>만기 행으로 채운 일정 등록값 — 제목 '만기일', 날짜 만기일, 물건 연동</summary>
    public static Row ScheduleDraft(ScheduleService schedules, Row r)
    {
        var draft = schedules.New(LocalDate.Parse(r.Str("expiry_date")), r.Long("pt_no"));
        var loc = string.Join(" ", new[] { First(r.Str("addr"), r.Str("pt_name")), First(DongHo(r), r.Str("jibun")) }.Where(x => x is not null));
        var type = Catalog.PropertyTypeName(r.Str("pt_type"));
        draft["title"] = "만기일";
        draft["location"] = loc;
        draft["pt_name"] = r.Str("pt_name");
        draft["content"] = $"[만기] {(string.IsNullOrEmpty(type) ? "" : type + " ")}{loc}".Trim();
        return draft;
    }

    private static string? First(params string?[] values) => values.FirstOrDefault(v => !string.IsNullOrEmpty(v));
}

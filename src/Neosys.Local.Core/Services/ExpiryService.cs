using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>만기관리 — 기존 ExpiryService. 현상태가 전세·월세·기타임대인 물건의 만기일을 기간으로 조회</summary>
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
        }
        return rows;
    }
}

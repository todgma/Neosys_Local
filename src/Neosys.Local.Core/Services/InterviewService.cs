using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>상담관리 — 기존 InterviewServices(ct_interview)</summary>
public sealed class InterviewService : ServiceBase
{
    public static readonly IReadOnlyList<Opt> Types = Opt.Pairs(
        ("ITVTYP01", "전화상담"), ("ITVTYP02", "방문상담"), ("ITVTYP03", "현장상담"), ("ITVTYP04", "온라인상담"));

    public InterviewService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    /// <summary>filter: q_fr_date, q_to_date, q_itv_type, q_keyword, q_vendor_id</summary>
    public Task<List<Row>> ListAsync(Row? filter = null) => Sp.QueryRowsAsync("ct_interview", "LIST", P(filter));

    public Task<Row?> GetAsync(long itvNo) => Sp.QueryRowAsync("ct_interview", "GET", new { itv_no = itvNo });

    public Row New() => new() { ["itv_type"] = "ITVTYP01", ["itv_date"] = LocalDate.Today };

    /// <summary>
    /// 저장. 신규면 새 상담번호를 채워 돌려준다.
    /// 신규 등록 시 연락처가 고객 구입자/물건 소유자 전화와 같으면 그 고객·물건 상담이력에도 함께 남긴다(기존과 동일).
    /// </summary>
    public async Task<long> SaveAsync(Row r)
    {
        if (!r.Has("itv_content")) throw new InvalidOperationException("상담 내용을 입력해주세요.");
        if (!r.Has("itv_date")) r["itv_date"] = LocalDate.Today;
        var key = r.Long("itv_no");
        if (key is > 0)
        {
            await Sp.ExecuteAsync("ct_interview", "UPD", P(r));
            return key.Value;
        }
        var no = await Sp.InTransactionAsync(async tx =>
        {
            var id = await tx.InsertAsync("ct_interview", "INS", P(r));
            await tx.ExecuteAsync("ct_interview", "INS_LINKED", P(r));
            return id;
        });
        r["itv_no"] = no;
        return no;
    }

    public Task DeleteAsync(long itvNo) => Sp.ExecuteAsync("ct_interview", "DEL", new { itv_no = itvNo });
}

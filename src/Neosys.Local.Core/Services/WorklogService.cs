using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>
/// 업무일지 — 기존 WorkJournalController. 일지(rt_work_journal) 작성 + 그날 변경 이력(*_hist) 자동집계·활동목록.
/// 이력은 로컬 DB 트리거가 기록한다(삭제도 기록 — 기존의 "삭제 이력 미기록" 문제 없음).
/// </summary>
public sealed class WorklogService : ServiceBase
{
    public static readonly IReadOnlyList<Opt> LogTypes = Opt.Pairs(("I", "등록"), ("U", "수정"), ("D", "삭제"));

    public WorklogService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    /// <summary>일지(없으면 새 Row). userId = 다른 직원 일지 보기(공유 설정이 허용할 때), null = 내 일지</summary>
    public async Task<Row> GetAsync(DateTime date, string? userId = null) =>
        await Sp.QueryRowAsync("rt_work_journal", "GET", P(new { q_date = LocalDate.Format(date), q_user = userId }))
        ?? new Row { ["jrnl_date"] = LocalDate.Format(date) };

    /// <summary>공유 설정 — true = 모두공개(직원끼리 서로 봄), false = 대표+담당자공개</summary>
    public async Task<bool> ShareAllAsync() =>
        (await Sp.ScalarAsync<string>("rt_work_journal_setting", "GET", P())) != "N";

    /// <summary>공유 설정 저장 — 대표만(기존과 같음)</summary>
    public Task SetShareAllAsync(bool all)
    {
        if (!Session.IsOwner) throw new InvalidOperationException("공유 설정은 대표만 바꿀 수 있습니다.");
        return Sp.ExecuteAsync("rt_work_journal_setting", "UPSERT", P(new { share_all = all ? "Y" : "N" }));
    }

    /// <summary>사무소 전체(다른 직원) 일지·이력을 볼 수 있는지 — 대표는 항상, 직원은 모두공개일 때</summary>
    public static bool CanSeeOthers(AppSession s, bool shareAll) => s.IsOwner || shareAll;

    /// <summary>그날 내가 등록/수정/삭제한 건수(물건·고객·계약·일정·상담·협력업체)</summary>
    public async Task<Row> SummaryAsync(DateTime date) =>
        await Sp.QueryRowAsync("rt_work_journal", "SUMMARY", P(new { q_date = LocalDate.Format(date) })) ?? new Row();

    /// <summary>그날 사무소 전체(또는 지정 사용자) 변경 이력, 시간순</summary>
    public Task<List<Row>> ActivityAsync(DateTime date, string? userId = null) =>
        Sp.QueryRowsAsync("rt_work_journal", "ACTIVITY", P(new { q_date = LocalDate.Format(date), q_user = userId }));

    /// <summary>그 달에 일지를 쓴 날짜(사무소)</summary>
    public Task<List<Row>> StatusAsync(int year, int month)
    {
        var from = new DateTime(year, month, 1);
        return Sp.QueryRowsAsync("rt_work_journal", "STATUS", P(new { q_from = LocalDate.Format(from), q_to = LocalDate.Format(from.AddMonths(1)) }));
    }

    /// <summary>저장 — 자동집계 값(물건·일정·상담 건수)을 함께 남긴다</summary>
    public async Task SaveAsync(Row journal, Row? summary = null)
    {
        if (!journal.Has("jrnl_date")) throw new InvalidOperationException("일자가 필요합니다.");
        if (summary is not null)
        {
            journal["prop_reg"] = summary.Long("prop_reg") ?? 0;
            journal["prop_upd"] = summary.Long("prop_upd") ?? 0;
            journal["sched_reg"] = summary.Long("sched_reg") ?? 0;
            journal["sched_upd"] = summary.Long("sched_upd") ?? 0;
            journal["consult_memo"] = summary.Long("consult_memo") ?? 0;
        }
        await Sp.ExecuteAsync("rt_work_journal", "UPSERT", P(journal));
    }
}

using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>
/// 무료개월 내역 — 기존 FreeMonthsModal(멤버십 이력). 무료 혜택(EVENT·REWARD)만 센다 — 서버의 무료개월(FreeMonths) 계산과 같은 기준.
/// 기존 화면은 상품 가입(JOIN, 연장 0일) 행도 수량으로 30일을 쳐서 합계가 대시보드 무료개월과 달랐다 — 재현하지 않는다.
/// </summary>
public static class FreeMonthsRules
{
    public sealed record Item(string Date, string Title, int Days, double Months);

    public static List<Item> Build(IEnumerable<Row> history) =>
        history.Where(h => h.Str("Kind") is "EVENT" or "REWARD").Select(h =>
        {
            var days = Days(h);
            return new Item((h.Str("RegDt") ?? "") is { Length: >= 10 } d ? d[..10] : "", Title(h), days, Months(days));
        }).ToList();

    /// <summary>연장 일수 — 없으면 수량·단위로 환산(월 30일, 주 7일)</summary>
    private static int Days(Row h)
    {
        if (h.Long("AddDays") is { } add && add > 0) return (int)add;
        var qty = (int)(h.Long("Qty") ?? 0);
        return h.Str("Unit") switch { "MONTH" => qty * 30, "WEEK" => qty * 7, _ => qty };
    }

    private static string Title(Row h) =>
        h.Str("Title") is { Length: > 0 } t ? t : h.Str("Kind") == "REWARD" ? "소개이벤트" : "이벤트";

    public static double Months(int days) => Math.Round(days / 30.0, 1);

    /// <summary>요약 표기 — "1개월 5일"</summary>
    public static string Summary(int days) => $"{days / 30}개월 {days % 30}일";
}

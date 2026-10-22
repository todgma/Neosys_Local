using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>멤버십 요금제(서버 상품) — 기존 MembershipSubscribeModal의 norm()</summary>
public sealed record MembershipPlan(long ProdId, string ProdName, int PcCnt, int MobCnt, long Price, string Descr)
{
    public int Devices => PcCnt + MobCnt;

    public static MembershipPlan From(Row r) => new(
        r.Long("prodId") ?? 0, r.Str("prodName") ?? "", (int)(r.Long("pcCnt") ?? 0), (int)(r.Long("mobCnt") ?? 0),
        r.Long("price") ?? (long)Math.Round(r.Dec("price") ?? 0), r.Str("descr") ?? "");
}

/// <summary>
/// 상품가입 금액 계산 — 기존 MembershipSubscribeModal과 같은 규칙:
///  · '추가요금' 상품은 1대당 단가로만 쓰고 목록에서 뺀다, '기본요금'은 목록에서 숨긴다(공백 무시)
///  · 기본 대수(PC+모바일) 초과분 × 추가요금, 부가세 10%(반올림)
///  · 초과 시 요금제 이름 뒤에 ' +@'
/// </summary>
public static class MembershipPricing
{
    public static long Vat(long n) => (long)Math.Round(n * 0.1, MidpointRounding.AwayFromZero);

    private static string Key(string name) => new(name.Where(c => !char.IsWhiteSpace(c)).ToArray());

    /// <summary>서버 상품 목록 → (보이는 요금제, 1대당 추가요금)</summary>
    public static (List<MembershipPlan> Plans, long AddFee) Split(IEnumerable<Row> products)
    {
        var all = products.Select(MembershipPlan.From).ToList();
        var add = all.FirstOrDefault(p => Key(p.ProdName) == "추가요금");
        var plans = all.Where(p => p != add && Key(p.ProdName) != "기본요금").ToList();
        return (plans, add?.Price ?? 0);
    }

    public sealed record Quote(int Total, int Extra, long ExtraFee, long Grand, long GrandWithVat, string PlanLabel);

    public static Quote Calc(MembershipPlan plan, int pc, int mob, long addFee)
    {
        var total = pc + mob;
        var extra = Math.Max(0, total - plan.Devices);
        var extraFee = extra * addFee;
        var grand = plan.Price + extraFee;
        return new Quote(total, extra, extraFee, grand, grand + Vat(grand), extra > 0 ? $"{plan.ProdName} +@" : plan.ProdName);
    }

    /// <summary>가입 기록 문구(서버 Memo) — 재방문 시 무엇을 얼마에 가입했는지 보이게(기존과 같은 형식)</summary>
    public static string Memo(Quote q, int pc, int mob) =>
        $"{q.PlanLabel} · 기기 {q.Total}대(PC{pc}/모바일{mob}){(q.Extra > 0 ? $" · 추가{q.Extra}대" : "")} · 합계 {q.GrandWithVat:#,0}원(부가세포함)";
}

/// <summary>
/// 가입비(사무소 단위 1회) — 기존 EntryFeePanel의 상수·규칙. 결제는 웹 결제창(토스)에서 진행하고,
/// 결제 페이지가 문서 제목에 NEOSIS_PAYMENT_DONE / NEOSIS_PAYMENT_FAIL을 넣으면 완료/실패로 본다(기존 Electron payment:open과 같음).
/// </summary>
public static class EntryFeeRules
{
    public const long Amount = 165000;
    public const long OrigAmount = 350000;
    public const string WebBase = "https://neosis.kr";
    public const string DoneSentinel = "NEOSIS_PAYMENT_DONE";
    public const string FailSentinel = "NEOSIS_PAYMENT_FAIL";

    /// <summary>
    /// 결제 오픈 시각(한국 시간). 기존 프런트는 2026-11-01 이후에만 결제 버튼을 열었지만(PAY_OPEN_DATE),
    /// 테스트 결제를 위해 제한을 풀었다(2026-10-21 사용자 요청) — 다시 막으려면 2026-11-01로 되돌린다.
    /// </summary>
    public static readonly DateTimeOffset PayOpenAt = DateTimeOffset.MinValue;

    public static bool IsPayOpen(DateTimeOffset now) => now >= PayOpenAt;

    /// <summary>결제 페이지 주소 — 토큰이 있으면 자동로그인, 프로그램 안 결제창은 auto=1(바로 결제 진행)</summary>
    public static string PaymentUrl(string? token, bool inApp) =>
        string.IsNullOrEmpty(token)
            ? $"{WebBase}/payment"
            : $"{WebBase}/payment?autologin={Uri.EscapeDataString(token)}" + (inApp ? "&auto=1" : "");

    /// <summary>결제창 문서 제목 → "success" / "fail" / null(진행 중)</summary>
    public static string? ResultFromTitle(string? title) =>
        title is null ? null : title.Contains(DoneSentinel) ? "success" : title.Contains(FailSentinel) ? "fail" : null;
}

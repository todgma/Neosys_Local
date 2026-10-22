using System.Globalization;
using System.Text;
using System.Text.Json.Nodes;

namespace Neosys.Local.Core.Services;

// 가계약 문자 — 기존 PreContractSmsModal.jsx. 입력값으로 합의문(previewText)을 만들고, 사용자가 고친 문구는 그대로 저장한다.
// 소재지는 로컬 버전에서 직접 입력(기존 addrMode 'manual')만 쓴다(법정동·단지 드롭다운은 서버 API라 제외).
public static partial class ContractDocs
{
    public static readonly IReadOnlyList<string> PrePtTypes = new[]
    {
        "아파트", "오피스텔", "단독주택", "상가주택", "다가구주택", "상가", "사무실", "공장", "창고", "지식산업센터", "건물", "토지",
        "아파트분양권", "오피스텔분양권", "입주권", "상가권리금", "권리양수도",
    };
    private static readonly string[] PreTradeTypes = { "매매", "전세", "월세" };
    private static readonly string[] PreContractKinds = { "부동산", "분양권", "입주권", "권리금" };
    private static readonly string[] PreInfoTypes = { "없음", "생년월일", "전화번호" };
    private static readonly string[] PreLandAreaTypes = { "토지" };
    private static readonly string[] PreBldAreaTypes = { "단독주택", "상가주택", "다가구주택", "공장", "창고", "건물" };
    private const string Note계약금 = "(가계약금 포함한 금액임)";
    private const string Note잔금 = "(상호협의로 잔금일 조정가능)";

    private static JsonObject PreBroker(string? name, string? rep) => DocJson.Obj(("상호", S(name)), ("대표", S(rep)));

    private static DocForm PreContract() => new()
    {
        Kind = PreContractKind, Title = "가계약 문자", Group = "가계약", TextKey = "previewText", ClauseKey = "특약추가",
        BuildText = d => PreContractMessage(d, DateTime.Today),
        Create = c =>
        {
            var kind = c.Category switch { "bunyang" => "분양권", "ipjugwon" => "입주권", "keymoney" => "권리금", _ => "부동산" };
            var o = DocJson.Obj(
                ("contractKind", S(kind)),
                ("ptType", S(PrePtTypes.Contains(c.PtType) ? c.PtType : "아파트")),
                ("tradeType", S(PreTradeTypes.Contains(c.TradeType) ? c.TradeType : "매매")),
                ("addrMode", S("manual")));
            foreach (var k in new[] { "시도코드", "시도", "시군구코드", "시군구", "읍면동코드", "읍면동", "주소", "지번", "건물명", "동", "호", "단지코드", "동번호" }) o[k] = "";
            foreach (var k in new[] { "단지직접", "동직접", "호직접" }) o[k] = false;
            foreach (var k in new[] { "전용면적", "면적", "대지면적", "연면적" }) o[k] = "";
            o["매도인"] = c.SellerName ?? ""; o["매도인생년"] = ""; o["매도인생년유형"] = "생년월일";
            o["매수인"] = c.BuyerName ?? ""; o["매수인생년"] = ""; o["매수인생년유형"] = "생년월일";
            o["매매금액"] = c.AmountWon?.ToString(CultureInfo.InvariantCulture) ?? "";
            foreach (var k in new[] { "가계약금", "가계약금날짜", "계약금", "계약금날짜", "중도금", "중도금날짜", "잔금", "잔금날짜" }) o[k] = "";
            o["은행"] = "우리은행"; o["채권최고액"] = ""; o["계좌번호"] = "";
            o["사무소"] = ""; o["대표"] = ""; o["특약추가"] = "";
            o["주소"] = c.Address ?? "";
            o["brokers"] = DocJson.Arr(PreBroker(c.OffNm, c.RpsNm));
            return o;
        },
        Sections = _ => new[]
        {
            new DocSection
            {
                Title = "계약 구분",
                Fields = new[]
                {
                    ChoiceL("contractKind", "계약종류", PreContractKinds.Select(k => (DocOpt)k).ToArray()),
                    Combo("ptType", "물건유형", PrePtTypes.ToArray()),
                    ChoiceL("tradeType", "거래유형", PreTradeTypes.Select(k => (DocOpt)k).ToArray()),
                },
            },
            new DocSection
            {
                Title = "소재지·면적",
                Fields = new[]
                {
                    Wide("주소", "소재지(동/리까지)"), T("지번", "지번"), T("건물명", "건물명"), T("동", "동"), T("호", "호"),
                    T("전용면적", "전용면적(㎡)"), T("면적", "면적(㎡, 토지)"), T("대지면적", "대지면적(㎡)"), T("연면적", "연면적(㎡)"),
                },
            },
            new DocSection
            {
                Title = "당사자",
                Fields = new[]
                {
                    T("매도인", "매도인"), ChoiceL("매도인생년유형", "매도인 부가정보", PreInfoTypes.Select(k => (DocOpt)k).ToArray()), Wide("매도인생년", "매도인 생년월일/전화"),
                    T("매수인", "매수인"), ChoiceL("매수인생년유형", "매수인 부가정보", PreInfoTypes.Select(k => (DocOpt)k).ToArray()), Wide("매수인생년", "매수인 생년월일/전화"),
                },
            },
            new DocSection
            {
                Title = "금액(원)",
                Fields = new[]
                {
                    Amt("매매금액", "매매금액"), T("채권최고액", "채권최고액"),
                    Amt("가계약금", "가계약금"), Date("가계약금날짜", "가계약금 날짜"),
                    Amt("계약금", "계약금"), Date("계약금날짜", "계약금 날짜"),
                    Amt("중도금", "중도금"), Date("중도금날짜", "중도금 날짜"),
                    Amt("잔금", "잔금"), Date("잔금날짜", "잔금 날짜"),
                    T("은행", "은행"), T("계좌번호", "가계약금 수령 계좌"),
                },
            },
            new DocSection
            {
                Title = "특약·개업공인중개사",
                Fields = new[] { Memo("특약추가", "특약사항", 70) },
                Tables = new[] { new DocTable("brokers", "개업공인중개사(공동중개사는 행추가)", new DocColumn[] { new("상호", "상호"), new("대표", "대표", 160) }, () => PreBroker("", "")) },
            },
            new DocSection { Title = "문자 내용(직접 고칠 수 있음)", Fields = new[] { Memo("previewText", "문자 내용", 420) } },
        },
        PrintTitle = (_, _) => "가계약 문자",
    };

    private static string MoneyText(string? v)
    {
        var d = DocJson.Digits(v);
        return d.Length > 0 && long.TryParse(d, out var n) ? $"{DocJson.Won(n)}원 ({ContractCatalog.Hangul(n)}원)" : "";
    }

    /// <summary>가계약 합의문 — 기존 PreContractSmsModal의 message와 같은 문장</summary>
    public static string PreContractMessage(JsonObject f, DateTime today)
    {
        string V(string k) => DocJson.Str(f, k).Trim();
        var sb = new StringBuilder();
        var trade = V("tradeType");
        sb.Append($"{V("ptType")}{(trade.Length > 0 ? " " + trade : "")} 가계약\n");
        var addr = string.Join(" ", new[] { V("주소"), V("지번"), V("건물명"), V("동").Length > 0 ? $"{V("동")}동" : "", V("호").Length > 0 ? $"{V("호")}호" : "" }.Where(s => s.Length > 0));
        sb.Append($"■ 소재지: {addr}\n");
        string Area(string k) => V(k) + (V(k).Length > 0 ? "㎡" : "");
        var pt = V("ptType");
        if (PreLandAreaTypes.Contains(pt)) sb.Append($"■ 면적: {Area("면적")}\n");
        else if (PreBldAreaTypes.Contains(pt)) { sb.Append($"■ 대지면적: {Area("대지면적")}\n"); sb.Append($"■ 연면적: {Area("연면적")}\n"); }
        else sb.Append($"■ 전용면적: {Area("전용면적")}\n");
        string Party(string who) => V(who) + (V($"{who}생년유형") != "없음" && V($"{who}생년").Length > 0 ? $" ({V($"{who}생년")})" : "");
        sb.Append($"■ 매도인: {Party("매도인")}\n");
        sb.Append($"■ 매수인: {Party("매수인")}\n");
        sb.Append($"\n매도인과 매수인은 부동산 {trade}계약을 아래의 내용으로 진행하기로 합의합니다.\n\n");
        string When(string k) => V(k).Length > 0 ? $" ({V(k)})" : "";
        sb.Append($"· 매매금액: {MoneyText(V("매매금액"))}\n");
        sb.Append($"· 가계약금: {MoneyText(V("가계약금"))}{When("가계약금날짜")}\n");
        sb.Append($"· 계약금: {MoneyText(V("계약금"))}{When("계약금날짜")}\n   {Note계약금}\n");
        if (V("중도금").Length > 0) sb.Append($"· 중도금: {MoneyText(V("중도금"))}{When("중도금날짜")}\n");
        sb.Append($"· 잔금: {MoneyText(V("잔금"))}{When("잔금날짜")}\n   {Note잔금}\n");
        sb.Append("\n[계약내용]\n");
        sb.Append("○ 가계약의 효력은 본계약 작성완료 까지이며, 계약서 작성일에 중개대상물 확인설명서를 작성한다.\n");
        sb.Append("○ 가계약 체결후 별도의 협의없이 어느 일방이 계약을 이행하지 않으면 본계약을 자동해지하고 가계약금을 해약금 및 위약금으로 본다.\n");
        sb.Append("  · 매도인 변심시 : 가계약금 배액배상\n  · 매수인 변심시 : 가계약금 포기\n");
        if (V("특약추가").Length > 0) sb.Append($"\n[특약사항]\n{V("특약추가")}\n");
        sb.Append("\n[계약성립]\n");
        sb.Append("○ 위 내용에 양당사자가 동의하고 매수인이 가계약금을 입금하면 동시에 이 계약은 성립한다\n\n");
        sb.Append("위 내용에 동의하시면\n");
        sb.Append($"매도인은 \"매도인 동의합니다\"{(V("계좌번호").Length > 0 ? $" (가계약금 수령 계좌: {V("계좌번호")})" : " '가계약금 수령할 본인명의의 계좌번호'")}\n");
        sb.Append("매수인은 \"매수인 동의합니다\"\n");
        sb.Append($"작성하여 회신하여 주시기 바랍니다.\n\n{today.Year}년 {today.Month:00}월 {today.Day:00}일\n");
        foreach (var b in DocJson.Array(f, "brokers").OfType<JsonObject>())
        {
            var name = DocJson.Str(b, "상호").Trim();
            var rep = DocJson.Str(b, "대표").Trim();
            if (name.Length > 0 || rep.Length > 0) sb.Append($"{name}공인중개사사무소   대표자: {rep}\n");
        }
        return sb.ToString();
    }
}

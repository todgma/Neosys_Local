using System.Globalization;
using System.Text.Json.Nodes;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

// ============================================================================
// 계약 부속문서(contract_document.doc_kind별 JSON) 서식 정의.
// 기존 legacy/front/src/components/contracts/*Form.jsx · PreContractSmsModal · SettlementPrepModal 의
// 저장 데이터(JSON 키·구조)를 그대로 쓰고, 화면/인쇄는 이 정의로 만든다(App/Views/Contracts/ContractDocWindow).
// ============================================================================

public enum DocFieldKind
{
    /// <summary>한 줄 문자</summary>
    Text,
    /// <summary>여러 줄 문자</summary>
    Memo,
    /// <summary>날짜(yyyy-MM-dd 문자)</summary>
    Date,
    /// <summary>금액(숫자만 문자로 저장, 화면은 콤마)</summary>
    Amount,
    /// <summary>하나만 고르기(문자 값, 다시 누르면 해제 — 기존 setR 토글)</summary>
    Choice,
    /// <summary>목록에서 고르거나 직접 입력(문자 값)</summary>
    Combo,
    /// <summary>여러 참거짓 키를 한 줄 체크박스로(예: 신탁_확인/신탁_설명/신탁_해당없음)</summary>
    Flags,
    /// <summary>객체 {이름: 참거짓} 체크 목록(예: 근거.등기권리증)</summary>
    Obj,
}

/// <summary>선택지(값/표시)</summary>
public sealed record DocOpt(string Value, string Label)
{
    public static implicit operator DocOpt(string v) => new(v, v);
    public override string ToString() => Label;
}

/// <summary>입력칸 1개. Key = JSON 경로('.'로 하위 객체). Flags는 Keys[i] ↔ Options[i].Label</summary>
public sealed class DocField
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public DocFieldKind Kind { get; init; }
    public IReadOnlyList<DocOpt> Options { get; init; } = Array.Empty<DocOpt>();
    public IReadOnlyList<string> Keys { get; init; } = Array.Empty<string>();
    /// <summary>한 줄 전체 사용</summary>
    public bool Wide { get; init; }
    public double Height { get; init; } = 70;
}

public enum DocColKind { Text, Amount, Choice, Lines }

/// <summary>표 열. Lines = 문자열 배열(화면은 줄바꿈으로 편집 — 기존 준비사항 items)</summary>
public sealed record DocColumn(string Key, string Header, double Width = 0, DocColKind Kind = DocColKind.Text, IReadOnlyList<string>? Options = null);

/// <summary>행 목록(JSON 배열). Path = 배열 경로, NewRow = 행추가 시 기본 행</summary>
public sealed record DocTable(string Path, string Title, IReadOnlyList<DocColumn> Columns, Func<JsonObject>? NewRow = null);

/// <summary>계산값 표시(합계·한글 금액 등) — 입력하지 않고 data로 계산</summary>
public sealed record DocLine(string Label, Func<JsonObject, string> Value);

public sealed class DocSection
{
    public string Title { get; init; } = "";
    public IReadOnlyList<DocField> Fields { get; init; } = Array.Empty<DocField>();
    public IReadOnlyList<DocTable> Tables { get; init; } = Array.Empty<DocTable>();
    public IReadOnlyList<DocLine> Lines { get; init; } = Array.Empty<DocLine>();
    /// <summary>탭 이름(같은 이름끼리 한 탭). null = 탭 없이 항상 보임</summary>
    public string? Page { get; init; }
    /// <summary>false면 인쇄에서 뺀다(인쇄는 PrintBody 문장으로 대신할 때)</summary>
    public bool Print { get; init; } = true;
}

/// <summary>부속문서 1종</summary>
public sealed class DocForm
{
    /// <summary>contract_document.doc_kind (기존과 동일)</summary>
    public required string Kind { get; init; }
    public required string Title { get; init; }
    /// <summary>메뉴 묶음(영수증 등 / 준비서면 / 계약서류)</summary>
    public required string Group { get; init; }
    /// <summary>새 문서 기본값(기존 base/BLANK + 계약·사무소 정보)</summary>
    public required Func<DocContext, JsonObject> Create { get; init; }
    public required Func<JsonObject, IReadOnlyList<DocSection>> Sections { get; init; }
    /// <summary>이 키 값이 바뀌면 섹션을 다시 그린다(확인설명서 _ceType)</summary>
    public string? VariantKey { get; init; }
    /// <summary>현재 탭 이름을 저장하는 키(잔금정산서 tab)</summary>
    public string? PageKey { get; init; }
    /// <summary>인쇄 부수별 표시(예: 매수인용/매도인용). 비면 1부</summary>
    public Func<JsonObject, IReadOnlyList<string>> Copies { get; init; } = _ => Array.Empty<string>();
    /// <summary>인쇄 제목(data, 현재 탭)</summary>
    public Func<JsonObject, string?, string>? PrintTitle { get; init; }
    /// <summary>입력칸 앞 안내문(화면·인쇄 공통)</summary>
    public Func<JsonObject, IEnumerable<string>>? Intro { get; init; }
    /// <summary>입력칸 뒤 인쇄 문장(영수 문구·서명란 등)</summary>
    public Func<JsonObject, string?, IEnumerable<string>>? PrintBody { get; init; }
    /// <summary>문자 본문 키(가계약 previewText) — 있으면 인쇄는 본문만, '문구 복사/다시 만들기' 제공</summary>
    public string? TextKey { get; init; }
    public Func<JsonObject, string>? BuildText { get; init; }
    /// <summary>특약관리 '적용' 대상 키(가계약 특약추가)</summary>
    public string? ClauseKey { get; init; }
}

/// <summary>부속문서 기본값 재료 — 계약서(doc)·사무소·세션</summary>
public sealed class DocContext
{
    public string Today { get; init; } = LocalDate.Today;
    public string? Category { get; init; }
    public string? PtType { get; init; }
    /// <summary>매매/전세/월세(분류에서)</summary>
    public string? TradeType { get; init; }
    public string? Address { get; init; }
    public string? SellerName { get; init; }
    public string? SellerAddr { get; init; }
    public string? SellerTel { get; init; }
    public string? BuyerName { get; init; }
    public string? BuyerAddr { get; init; }
    public string? BuyerTel { get; init; }
    /// <summary>거래금액(원)</summary>
    public long? AmountWon { get; init; }
    public string? OffNm { get; init; }
    public string? RpsNm { get; init; }
    public string? OffAddr { get; init; }
    public string? RegNo { get; init; }
    public string? OffTel { get; init; }
    public string? BizNo { get; init; }
    public string? RtNm { get; init; }

    /// <summary>계약 마스터(+doc JSON)·사무소 Row·세션으로 만든다. 모두 없어도 된다.</summary>
    public static DocContext From(Row? master, Row? office, AppSession? session)
    {
        var doc = ContractService.ParseDoc(master?.Str("doc"));
        var category = (string?)doc["category"] ?? master?.Str("contract_kind");
        var sign = ContractCatalog.Sign(category);
        string? D(string k) => doc[k] is JsonValue v ? v.ToString() : null;
        string? P(int i, string field) => sign.Parties.Count > i ? D($"{sign.Parties[i].Role}_{field}") : null;

        var man = (D("_금액단위") ?? "만원") != "원";
        long? amount = new[] { "매매대금", "보증금", "권리금", "양도대금", "거래금액" }.Select(D)
            .Select(s => decimal.TryParse(new string((s ?? "").Where(c => char.IsDigit(c) || c == '.').ToArray()), NumberStyles.Float, CultureInfo.InvariantCulture, out var n) ? n : (decimal?)null)
            .FirstOrDefault(n => n is > 0) is { } amt ? (long)(doc["_simple"] is not null || !man ? amt : amt * 10000) : master?.Long("amount") is { } ma ? ma * 10000 : null;

        return new DocContext
        {
            Category = category,
            PtType = (string?)doc["ptType"] ?? master?.Str("doc_type"),
            TradeType = category switch { "jeonse" => "전세", "wolse" => "월세", _ => (string?)doc["거래유형"] ?? (category is null or "sale" ? "매매" : master?.Str("trade_type")) },
            Address = D("소재지") is { } a && a != "(임시)" ? a : master?.Str("addr") is { } ma2 && ma2 != "(임시)" ? ma2 : null,
            SellerName = P(0, "성명") ?? D("이전의뢰인") ?? master?.Str("seller"),
            SellerAddr = P(0, "주소"),
            SellerTel = P(0, "전화"),
            BuyerName = P(1, "성명") ?? D("취득의뢰인") ?? master?.Str("buyer"),
            BuyerAddr = P(1, "주소"),
            BuyerTel = P(1, "전화"),
            AmountWon = amount,
            OffNm = office?.Str("OffNm") ?? session?.OffNm,
            RpsNm = office?.Str("RpsNm"),
            OffAddr = office?.Str("Addr"),
            RegNo = office?.Str("RegNo"),
            OffTel = office?.Str("OffTel"),
            BizNo = office?.Str("BizNo"),
            RtNm = session?.RtNm,
        };
    }
}

/// <summary>JSON 경로('.' 구분) 읽기/쓰기와 금액 도우미</summary>
public static class DocJson
{
    public static JsonNode? Get(JsonObject root, string path)
    {
        JsonNode? cur = root;
        foreach (var seg in path.Split('.'))
        {
            if (cur is not JsonObject o || !o.TryGetPropertyValue(seg, out var next)) return null;
            cur = next;
        }
        return cur;
    }

    public static void Set(JsonObject root, string path, JsonNode? value)
    {
        var segs = path.Split('.');
        var cur = root;
        for (int i = 0; i < segs.Length - 1; i++)
        {
            if (cur[segs[i]] is not JsonObject next) { next = new JsonObject(); cur[segs[i]] = next; }
            cur = next;
        }
        cur[segs[^1]] = value;
    }

    public static string Str(JsonObject root, string path) =>
        Get(root, path) is JsonValue v ? (v.TryGetValue<string>(out var s) ? s : v.ToJsonString()) : "";

    public static bool Bool(JsonObject root, string path) =>
        Get(root, path) is JsonValue v && (v.TryGetValue<bool>(out var b) ? b : v.TryGetValue<string>(out var s) && s is "true" or "Y");

    public static JsonArray Array(JsonObject root, string path) => Get(root, path) as JsonArray ?? new JsonArray();

    /// <summary>문자에서 숫자만(부호·소수점 포함) 읽는다. 실패하면 0</summary>
    public static decimal Num(string? s)
    {
        var t = new string((s ?? "").Where(c => char.IsDigit(c) || c is '.' or '-').ToArray());
        return decimal.TryParse(t, NumberStyles.Float, CultureInfo.InvariantCulture, out var n) ? n : 0;
    }

    public static string Won(decimal n) => n.ToString("#,0", CultureInfo.InvariantCulture);

    /// <summary>숫자 문자 → '1,000' (빈 값은 빈 문자)</summary>
    public static string Comma(string? s) { var d = Digits(s); return d.Length == 0 ? "" : Won(decimal.Parse(d, CultureInfo.InvariantCulture)); }

    public static string Digits(string? s) => new((s ?? "").Where(char.IsDigit).ToArray());

    /// <summary>기본값 위에 저장값을 최상위 키 단위로 덮는다(기존 {...base, ...initial})</summary>
    public static JsonObject Merge(JsonObject baseObj, JsonObject? saved)
    {
        var r = (JsonObject)baseObj.DeepClone();
        if (saved is null) return r;
        foreach (var (k, v) in saved) r[k] = v?.DeepClone();
        return r;
    }

    internal static JsonObject Obj(params (string Key, JsonNode? Value)[] items)
    {
        var o = new JsonObject();
        foreach (var (k, v) in items) o[k] = v;
        return o;
    }

    internal static JsonArray Arr(params JsonNode?[] items) => new(items);
}

/// <summary>계약 부속문서 목록과 서식 — doc_kind·JSON 키는 기존 프런트와 같다</summary>
public static partial class ContractDocs
{
    // ---------------- 정의 도우미 ----------------

    private static string LabelOf(string key) => key.Replace('_', ' ');
    private static DocField T(string key, string? label = null) => new() { Key = key, Label = label ?? LabelOf(key) };
    private static DocField Wide(string key, string? label = null) => new() { Key = key, Label = label ?? LabelOf(key), Wide = true };
    private static DocField Memo(string key, string? label = null, double height = 70) => new() { Key = key, Label = label ?? LabelOf(key), Kind = DocFieldKind.Memo, Wide = true, Height = height };
    private static DocField Date(string key, string label) => new() { Key = key, Label = label, Kind = DocFieldKind.Date };
    private static DocField Amt(string key, string label) => new() { Key = key, Label = label, Kind = DocFieldKind.Amount };
    private static DocField Choice(string key, params DocOpt[] options) => ChoiceL(key, LabelOf(key), options);
    private static DocField ChoiceL(string key, string label, params DocOpt[] options) => new() { Key = key, Label = label, Kind = DocFieldKind.Choice, Options = options };
    private static DocField Combo(string key, string label, params string[] options) => new() { Key = key, Label = label, Kind = DocFieldKind.Combo, Options = options.Select(o => (DocOpt)o).ToList() };
    private static DocField Obj(string key, string label, params string[] names) => new() { Key = key, Label = label, Kind = DocFieldKind.Obj, Options = names.Select(o => (DocOpt)o).ToList(), Wide = true };

    /// <summary>참거짓 키 묶음. 라벨 = 접두어(그룹명), 각 항목 = 키에서 접두어를 뺀 부분</summary>
    private static DocField Flags(string prefix, params string[] keys) => new()
    {
        Key = keys[0], Label = FlagGroupLabels.TryGetValue(prefix, out var l) ? l : prefix, Kind = DocFieldKind.Flags, Keys = keys,
        Options = keys.Select(k => (DocOpt)(k.StartsWith(prefix + "_") ? k[(prefix.Length + 1)..] : k)).ToList(),
    };

    private static readonly Dictionary<string, string> FlagGroupLabels = new()
    {
        ["신탁"] = "신탁등기", ["공동담보"] = "공동담보", ["갱신"] = "계약갱신요구권", ["허가"] = "허가·신고구역", ["투기"] = "투기지역 여부",
        ["확정"] = "확정일자 부여현황", ["체납"] = "국세·지방세 체납", ["전입"] = "전입세대 확인", ["민간"] = "민간임대 등록",
        ["도로"] = "도로 포장", ["접근"] = "접근성", ["버스"] = "버스 이동", ["지하철"] = "지하철 이동", ["주차"] = "주차장",
        ["초등"] = "초등학교 이동", ["중등"] = "중학교 이동", ["고등"] = "고등학교 이동", ["경비"] = "경비실", ["관리주체"] = "관리주체",
        ["부과"] = "관리비 부과방식", ["비선호"] = "비선호시설(1km이내)", ["난방"] = "난방 확인",
    };

    private static DocSection Sec(string title, params DocField[] fields) => new() { Title = title, Fields = fields };

    private static JsonValue S(string? v) => JsonValue.Create(v ?? "")!;
    private static readonly IReadOnlyList<string> NoCopies = System.Array.Empty<string>();

    /// <summary>오늘 날짜 '2026년 10월 19일'</summary>
    private static (string Y, string M, string D) Ymd(string date)
    {
        var d = LocalDate.Parse(date) ?? DateTime.Today;
        return (d.Year.ToString(), d.Month.ToString(), d.Day.ToString());
    }

    // ---------------- 목록 ----------------

    public const string PreContractKind = "가계약문자";
    public const string ConfirmKind = "확인설명서";
    public const string PrivacyKind = "개인정보동의서";
    public const string CeTypeKey = "_ceType";
    public static readonly IReadOnlyList<string> CeTypes = new[] { "주거용", "비주거용", "토지용", "입목용" };

    private static List<DocForm>? _all;

    /// <summary>메뉴 순서대로 전체 부속문서</summary>
    public static IReadOnlyList<DocForm> All => _all ??= new List<DocForm>
    {
        PreContract(),
        ReturnReceipt("영수증:영수증", "영수증"),
        ReturnReceipt("영수증:반환금", "반환금 영수증"),
        BrokerFeeReceipt(),
        Receipt1("영수증:위임장", "위임장"),
        Receipt1("영수증:영수증1", "영수증1"),
        Receipt1("영수증:영수증2", "영수증2"),
        BalanceSettlement(),
        UtilitySettlement(),
        Prep("준비서면:계약시", "계약시 준비사항", empty: true),
        Prep("준비서면:잔금시", "잔금시 준비사항", empty: false),
        ConfirmExplain(),
        Privacy(),
    }.Concat(TradeForms()).ToList();

    public static DocForm? Find(string? kind) => All.FirstOrDefault(f => f.Kind == kind);

    /// <summary>doc_kind → 표시 이름(목록 '부속문서' 컬럼용). 모르는 종류는 ':' 뒤 이름</summary>
    public static string TitleOf(string kind) => Find(kind)?.Title ?? kind.Split(':')[^1];

    /// <summary>저장값(없으면 null)을 기본값과 합쳐 편집용 데이터로 — 기존 {...base, ...initial}</summary>
    public static JsonObject Load(DocForm form, DocContext ctx, JsonObject? saved)
    {
        var data = DocJson.Merge(form.Create(ctx), saved);
        // 가계약 문자: 저장된 편집본이 없으면 입력값으로 문구를 만든다
        if (form.TextKey is { } tk && form.BuildText is { } build && string.IsNullOrEmpty(DocJson.Str(data, tk)))
            data[tk] = build(data);
        return data;
    }

    // ---------------- 영수증 / 반환금 영수증 (ReturnReceiptForm) ----------------

    private static readonly string[] AmountItems = { "총 금액", "계약금", "중도금", "잔금" };

    /// <summary>영수금액 문구: 금 일천만원 정 (10,000,000 원)</summary>
    public static string ReceiptAmountText(JsonObject d)
    {
        var digits = DocJson.Digits(DocJson.Str(d, "amount"));
        if (digits.Length == 0 || !long.TryParse(digits, out var n) || n == 0) return "";
        return $"금 {ContractCatalog.Hangul(n)}원 정 ({DocJson.Won(n)} 원)";
    }

    private static DocForm ReturnReceipt(string kind, string title) => new()
    {
        Kind = kind, Title = title, Group = "영수증 등",
        Create = c => DocJson.Obj(("amountItem", S("총 금액")), ("amount", S("")), ("propertyDisplay", S(c.Address)), ("issueDate", S(c.Today)), ("serialNo", S(""))),
        Sections = _ => new[]
        {
            new DocSection
            {
                Title = title,
                Fields = new[]
                {
                    T("serialNo", "영수증 번호(NO.)"), Date("issueDate", "발행일"),
                    ChoiceL("amountItem", "금액 항목", AmountItems.Select(a => (DocOpt)a).ToArray()), Amt("amount", "금액(원)"),
                    Memo("propertyDisplay", "부동산의 표시", 60),
                },
                Lines = new[] { new DocLine("영수금액", ReceiptAmountText) },
            },
        },
        Copies = _ => new[] { "매수인용", "매도인용" },
        PrintTitle = (_, _) => string.Join(title.Contains(' ') ? "" : " ", title.ToCharArray()),
        PrintBody = (d, _) =>
        {
            var digits = DocJson.Digits(DocJson.Str(d, "amount"));
            var kor = long.TryParse(digits, out var n) && n > 0 ? ContractCatalog.Hangul(n) + "원" : "";
            return new[]
            {
                "귀하",
                "매수인 은(는) 위 표시 부동산에 대한",
                $"매매 대금 원 중 {DocJson.Str(d, "amountItem")} {kor}을",
                "매도인 (으)로부터 영수하고 본 영수증을 발행 합니다.",
                $"발행일: {DocJson.Str(d, "issueDate")}",
                "매도인 ____________________ (인)",
                "매수인 ____________________ (인)",
            };
        },
    };

    // ---------------- 중개보수 영수증 (BrokerFeeReceiptForm) ----------------

    public static decimal BrokerFeeSum(JsonObject d) => DocJson.Num(DocJson.Str(d, "fee")) + DocJson.Num(DocJson.Str(d, "vat"));

    private static DocForm BrokerFeeReceipt() => new()
    {
        Kind = "영수증:중개보수", Title = "중개보수 영수증", Group = "영수증 등",
        Create = c => DocJson.Obj(
            ("issueTarget", S("매도인")), ("serialNo", S("")),
            ("bizNo", S(c.BizNo)), ("officeName", S(c.OffNm)), ("repName", S(c.RpsNm)), ("officeAddr", S(c.OffAddr)), ("regNo", S(c.RegNo)),
            ("writeDate", S(c.Today)), ("note", S("")),
            ("target", S(c.Address)), ("tradeAmt", S(c.AmountWon?.ToString(CultureInfo.InvariantCulture))), ("fee", S("")), ("vat", S(""))),
        Sections = _ => new[]
        {
            new DocSection
            {
                Title = "발행",
                Fields = new[] { ChoiceL("issueTarget", "발행대상", "매도인", "매수인"), T("serialNo", "일련번호"), Date("writeDate", "작성일자"), T("note", "비고") },
            },
            new DocSection
            {
                Title = "사무소 정보",
                Fields = new[] { T("officeName", "사무소명칭"), T("bizNo", "사업자등록번호"), Wide("officeAddr", "소재지"), T("regNo", "등록번호"), T("repName", "대표자 성명") },
            },
            new DocSection
            {
                Title = "거래·보수",
                Fields = new[] { Wide("target", "중개대상물"), Amt("tradeAmt", "거래금액(원)"), Amt("fee", "중개보수(원)"), Amt("vat", "부가세(원)") },
                Lines = new[] { new DocLine("계", d => DocJson.Won(BrokerFeeSum(d)) + " 원") },
            },
        },
        Copies = d => new[] { $"{DocJson.Str(d, "issueTarget")}용", "보관용" },
        PrintTitle = (_, _) => "영 수 증",
        PrintBody = (_, _) => new[] { "상기금액을 본 중개대상물에 대한 중개보수로 영수합니다." },
    };

    // ---------------- 영수증1·2 / 위임장 (ReceiptForm — 부동산중개업법시행규칙 별지27호) ----------------

    private static JsonObject Receipt1Row() => DocJson.Obj(("date", S("")), ("target", S("")), ("tradeAmt", S("")), ("feeTotal", S("")), ("sellerFee", S("")), ("buyerFee", S("")));

    private static DocForm Receipt1(string kind, string title) => new()
    {
        Kind = kind, Title = title, Group = "영수증 등",
        Create = c => DocJson.Obj(
            ("serialNo", S("")), ("use", S("")), ("taxNo", S("")), ("officeName", S(c.OffNm)), ("repName", S(c.RpsNm)), ("officeAddr", S(c.OffAddr)), ("regNo", S(c.RegNo)),
            ("writeDate", S(c.Today)), ("amount", S("")), ("note", S("")), ("rows", DocJson.Arr(Receipt1Row()))),
        Sections = _ => new[]
        {
            new DocSection
            {
                Title = $"{title} (부동산중개업법시행규칙 별지27호)",
                Fields = new[] { T("serialNo", "일련번호"), ChoiceL("use", "용도", new("보관", "사무소 보관용"), new("매도", "매도(임대)자용"), new("매수", "매수(임차)자용")) },
            },
            new DocSection
            {
                Title = "중개업자",
                Fields = new[] { T("taxNo", "납세번호"), T("officeName", "사무소명칭"), T("repName", "성명(대표자)"), T("regNo", "등록번호"), Wide("officeAddr", "사무소소재지") },
            },
            new DocSection
            {
                Title = "금액",
                Fields = new[] { Date("writeDate", "작성년월일"), Amt("amount", "금액"), Wide("note", "비고") },
                Tables = new[]
                {
                    new DocTable("rows", "중개(확인) 대상물", new DocColumn[]
                    {
                        new("date", "년월일", 100), new("target", "중개(확인) 대상물"), new("tradeAmt", "거래액", 110, DocColKind.Amount),
                        new("feeTotal", "수수료 계", 100, DocColKind.Amount), new("sellerFee", "매도(임대)자 부담", 110, DocColKind.Amount), new("buyerFee", "매수(임차)자 부담", 110, DocColKind.Amount),
                    }, Receipt1Row),
                },
            },
        },
        PrintTitle = (_, _) => title.StartsWith("영수증") ? "영 수 증" : string.Join(" ", title.ToCharArray()),
        PrintBody = (_, _) => new[] { "위 금액을 영 수 함" },
    };

    // ---------------- 잔금 정산서 (BalanceSettlementForm) ----------------

        private static readonly (string Item, string Sign, string Note)[] SaleRows =
    {
        ("대금 총액", "", ""), ("계약금", "-", "가계약금 포함"), ("중도금 총액", "-", ""), ("대출금 총액", "-", ""),
        ("임대보증금 상계액", "-", ""), ("대출금 상환액", "+", ""), ("선수관리비", "+", ""), ("대출이자 미납액", "-", ""), ("", "", ""), ("", "", ""),
    };

    private static (string Item, string Sign, string Note)[] LeaseRows => SaleRows.Select(r => r.Item == "임대보증금 상계액" ? ("임대보증금 승계", r.Sign, r.Note) : r).ToArray();

    private static readonly (string Key, string Title, string P1, string P2)[] BalanceTabs =
    {
        ("매매계약", "매매계약 잔금 정산서", "매도인", "매수인"),
        ("임대차계약", "임대차계약 잔금 정산서", "임대인", "임차인"),
        ("전세계약", "전세 계약 대금(잔금) 정산서", "임대인", "임차인"),
    };

    private static JsonObject BalanceRow(string item, string sign, string note) => DocJson.Obj(("item", S(item)), ("sign", S(sign)), ("amount", S("")), ("note", S(note)));

    /// <summary>탭의 기본 적요 행</summary>
    public static JsonArray BalanceDefaultRows(string tab) =>
        new((tab == "매매계약" ? SaleRows : LeaseRows).Select(r => (JsonNode?)BalanceRow(r.Item, r.Sign, r.Note)).ToArray());

    /// <summary>잔금 정산액 = Σ(가감 '-'면 -금액, 그 외 +금액) — 기존 calcBalanceTotal</summary>
    public static decimal BalanceTotal(JsonArray rows) =>
        rows.OfType<JsonObject>().Sum(r => (DocJson.Str(r, "sign") == "-" ? -1 : 1) * DocJson.Num(DocJson.Str(r, "amount")));

    private static DocForm BalanceSettlement() => new()
    {
        Kind = "정산서:잔금", Title = "잔금 정산서", Group = "영수증 등", PageKey = "tab",
        Create = c =>
        {
            var tabs = new JsonObject();
            foreach (var t in BalanceTabs)
                tabs[t.Key] = DocJson.Obj(("rows", BalanceDefaultRows(t.Key)), ("etcText", S("")), ("p1Name", S(c.SellerName)), ("p2Name", S(c.BuyerName)));
            return DocJson.Obj(
                ("tab", S(c.TradeType == "전세" ? "전세계약" : c.TradeType == "월세" ? "임대차계약" : "매매계약")),
                ("shared", DocJson.Obj(("address", S(c.Address)), ("officeName", S(c.OffNm)), ("officePhone", S(c.OffTel)), ("issueY", S("")), ("issueM", S("")), ("issueD", S("")))),
                ("tabs", tabs));
        },
        Sections = _ =>
        {
            var list = new List<DocSection>
            {
                new()
                {
                    Title = "공통",
                    Fields = new[]
                    {
                        Wide("shared.address", "물건 소재지"), T("shared.officeName", "중개사무소"), T("shared.officePhone", "연락처"),
                        T("shared.issueY", "발행 년"), T("shared.issueM", "발행 월"), T("shared.issueD", "발행 일"),
                    },
                },
            };
            foreach (var t in BalanceTabs)
            {
                var p = $"tabs.{t.Key}";
                list.Add(new DocSection
                {
                    Title = t.Title, Page = t.Key,
                    Fields = new[] { T($"{p}.p1Name", $"{t.P1} 성명"), T($"{p}.p2Name", $"{t.P2} 성명") },
                    Tables = new[]
                    {
                        new DocTable($"{p}.rows", "정산 내역", new DocColumn[]
                        {
                            new("item", "적요", 200), new("sign", "가감", 70, DocColKind.Choice, new[] { "", "+", "-" }),
                            new("amount", "금액(원)", 150, DocColKind.Amount), new("note", "비고"),
                        }, () => BalanceRow("", "-", "")),
                    },
                    Lines = new[] { new DocLine("잔금 정산액", d => DocJson.Won(BalanceTotal(DocJson.Array(d, $"{p}.rows"))) + " 원") },
                });
                list.Add(new DocSection { Title = "기타 사항", Page = t.Key, Fields = new[] { Memo($"{p}.etcText", "기타 사항", 80) } });
            }
            return list;
        },
        PrintTitle = (_, page) => BalanceTabs.FirstOrDefault(t => t.Key == page).Title ?? "잔금 정산서",
        PrintBody = (d, page) =>
        {
            var t = BalanceTabs.FirstOrDefault(x => x.Key == page);
            if (t.Key is null) return System.Array.Empty<string>();
            string Y(string k, string blank) => DocJson.Str(d, $"shared.{k}") is { Length: > 0 } v ? v : blank;
            return new[]
            {
                $"발행일 : {Y("issueY", "_____")}년 {Y("issueM", "__")}월 {Y("issueD", "__")}일",
                "상기 내역을 확인하고 정산 수령 합니다.",
                $"{t.P1} : {DocJson.Str(d, $"tabs.{t.Key}.p1Name")} (인)        {t.P2} : {DocJson.Str(d, $"tabs.{t.Key}.p2Name")} (인)",
                $"{DocJson.Str(d, "shared.officeName")}   연락처 : {DocJson.Str(d, "shared.officePhone")}",
            };
        },
    };

    // ---------------- 공과금 등 정산서 (UtilitySettlementForm) ----------------

    private static JsonObject MeterRow() => DocJson.Obj(("meter", S("")), ("usage", S("")), ("period", S("")), ("amount", S("")));
    private static JsonObject LongRepairRow() => DocJson.Obj(("period", S("")), ("months", S("")), ("monthly", S("")), ("amount", S("")));
    private static JsonObject EtcRow() => DocJson.Obj(("content", S("")), ("amount", S("")));

    /// <summary>정산총액 = 관리비 + 가스/전기/수도/장기수선충당금/기타 정산금액 합 — 기존 calcUtilityTotal</summary>
    public static decimal UtilityTotal(JsonObject d)
    {
        var t = DocJson.Num(DocJson.Str(d, "mgmtFee"));
        foreach (var k in new[] { "gas", "elec", "water", "longRepair", "etc" })
            t += DocJson.Array(d, k).OfType<JsonObject>().Sum(r => DocJson.Num(DocJson.Str(r, "amount")));
        return t;
    }

    private static DocForm UtilitySettlement()
    {
        DocColumn[] meter = { new("meter", "검침 수치", 140), new("usage", "정산 사용량", 140), new("period", "정산 기간"), new("amount", "정산 금액", 150, DocColKind.Amount) };
        return new()
        {
            Kind = "정산서:공과금", Title = "공과금 등 정산서", Group = "영수증 등",
            Create = c => DocJson.Obj(
                ("address", S(c.Address)), ("mgmtMemo", S("")), ("mgmtFee", S("")),
                ("gas", DocJson.Arr(MeterRow())), ("elec", DocJson.Arr(MeterRow())), ("water", DocJson.Arr(MeterRow())),
                ("longRepair", DocJson.Arr(LongRepairRow())), ("etc", DocJson.Arr(EtcRow())),
                ("totalNote", S("")), ("etcText", S("")),
                ("officeName", S(c.OffNm)), ("repName", S(c.RpsNm)), ("officePhone", S(c.OffTel)), ("issueDate", S(c.Today))),
            Sections = _ => new[]
            {
                new DocSection { Title = "물건 소재지", Fields = new[] { Wide("address", "소재지") } },
                new DocSection { Title = "1. 관리비", Fields = new[] { T("mgmtMemo", "내용(기간 등)"), Amt("mgmtFee", "정산 금액") } },
                new DocSection { Title = "2. 가스", Tables = new[] { new DocTable("gas", "가스", meter, MeterRow) } },
                new DocSection { Title = "3. 전기", Tables = new[] { new DocTable("elec", "전기", meter, MeterRow) } },
                new DocSection { Title = "4. 수도", Tables = new[] { new DocTable("water", "수도", meter, MeterRow) } },
                new DocSection
                {
                    Title = "5. 장기수선충당금",
                    Tables = new[] { new DocTable("longRepair", "장기수선충당금", new DocColumn[] { new("period", "기간"), new("months", "개월 수", 100), new("monthly", "월 금액", 130, DocColKind.Amount), new("amount", "정산 금액", 150, DocColKind.Amount) }, LongRepairRow) },
                },
                new DocSection { Title = "6. 기타", Tables = new[] { new DocTable("etc", "기타", new DocColumn[] { new("content", "내용"), new("amount", "정산 금액", 150, DocColKind.Amount) }, EtcRow) } },
                new DocSection
                {
                    Title = "정산총액",
                    Fields = new[] { Wide("totalNote", "비고"), Memo("etcText", "기타 사항", 70) },
                    Lines = new[] { new DocLine("정산총액", d => "₩" + DocJson.Won(UtilityTotal(d))) },
                },
                new DocSection { Title = "작성", Fields = new[] { T("officeName", "중개사무소"), T("repName", "대표"), T("officePhone", "연락처"), Date("issueDate", "작성일") } },
            },
            PrintBody = (d, _) => new[]
            {
                "상기 내역을 확인하고 정산 수령 합니다.",
                $"작성일 : {DocJson.Str(d, "issueDate")}",
                $"{DocJson.Str(d, "officeName")}   대표 : {DocJson.Str(d, "repName")}   연락처 : {DocJson.Str(d, "officePhone")}",
            },
        };
    }

    // ---------------- 계약시/잔금시 준비사항 (SettlementPrepModal) ----------------

    public static readonly IReadOnlyList<string> PrepTabs = new[] { "매도인(개인)", "매도인(법인)", "매수인(개인)", "매수인(법인)", "임대인(개인)", "임대인(법인)", "임차인(개인)", "임차인(법인)" };

    private static readonly Dictionary<string, (string Label, string[] Items)[]> PrepDefaults = new()
    {
        ["매도인(개인)"] = new[]
        {
            ("준비서류", new[] { "등기권리증", "인감도장", "매도용 인감증명서(매수인 인적사항 기재)", "주민등록초본(주소변동내역포함)", "관리비/공과금 정산내역", "선수관리비 영수증", "매도인 계좌" }),
            ("임차인이 있는 경우", new[] { "임대차계약서" }),
            ("본인 참석시", new[] { "신분증", "도장" }),
            ("대리인 참석시", new[] { "위임장(매도인 인감날인)", "가족관계증명서(가족 대리시)", "매도인 신분증", "매도인 인감도장(필수아님)", "대리인 신분증", "대리인 도장" }),
        },
        ["매도인(법인)"] = new[]
        {
            ("준비서류", new[] { "등기권리증", "법인인감도장(or 사용인감+사용인감계)", "매도용 법인인감증명서", "법인등기사항전부증명서", "사업자등록증", "관리비/공과금 정산내역", "선수관리비 영수증", "법인명의 계좌" }),
            ("임차인이 있는 경우", new[] { "임대차계약서" }),
            ("대표자 참석시", new[] { "대표자 신분증", "대표자 도장" }),
            ("대리인 참석시", new[] { "위임장(법인인감날인)", "대리인 재직증명서", "대리인 신분증", "대리인 도장" }),
        },
        ["매수인(개인)"] = new[]
        {
            ("잔금 준비서류", new[] { "계좌이체 한도조정", "주민등록등본" }),
            ("본인 참석시", new[] { "신분증", "도장" }),
            ("대리인 참석시", new[] { "위임장(매수인 인감날인)", "인감증명서(매수인 본인발급)", "가족관계증명서(가족 대리시)", "매수인 신분증", "매수인 인감도장(필수아님)", "대리인 신분증", "대리인 도장" }),
        },
        ["매수인(법인)"] = new[]
        {
            ("잔금 준비서류", new[] { "계좌이체 한도조정", "법인인감도장(or 사용인감+사용인감계)", "법인인감증명서", "법인등기사항전부증명서", "사업자등록증" }),
            ("대표자 참석시", new[] { "신분증", "도장" }),
            ("대리인 참석시", new[] { "위임장(법인인감날인)", "대리인 재직증명서", "대리인 신분증", "대리인 도장" }),
        },
        ["임대인(개인)"] = new[]
        {
            ("서류", new[] { "관리비/공과금 정산내역", "임대인명의 계좌", "열쇠/비밀번호" }),
            ("본인 참석시", new[] { "신분증", "도장(서명가능)" }),
            ("대리인 참석시", new[] { "위임장(인감날인)", "인감증명서(임대인 본인발급)", "가족관계증명서(가족대리시)", "임대인 신분증", "임대인 인감도장(필수아님)", "대리인 신분증", "대리인 도장(서명가능)" }),
        },
        ["임대인(법인)"] = new[]
        {
            ("서류", new[] { "관리비/공과금 정산내역", "법인명의 계좌", "열쇠/비밀번호" }),
            ("대표자 참석시", new[] { "신분증", "도장" }),
            ("대리인 참석시", new[] { "위임장(법인인감날인)", "법인인감증명서", "대리인 재직증명서", "대리인 신분증", "대리인 도장" }),
        },
        ["임차인(개인)"] = new[]
        {
            ("잔금", new[] { "계좌이체 한도조정" }),
            ("본인 참석시", new[] { "신분증", "도장(서명가능)" }),
            ("대리인 참석시", new[] { "위임장(인감날인)", "인감증명서(임차인 본인발급)", "가족관계증명서(가족대리시)", "임차인 신분증", "임차인 인감도장(필수아님)", "대리인 신분증", "대리인 도장(서명가능)" }),
        },
        ["임차인(법인)"] = new[]
        {
            ("잔금", new[] { "계좌이체 한도조정" }),
            ("대표자 참석시", new[] { "신분증", "도장" }),
            ("대리인 참석시", new[] { "위임장(법인인감날인)", "법인인감증명서", "대리인 재직증명서", "대리인 신분증", "대리인 도장" }),
        },
    };

    private static JsonObject PrepRow(string label, IEnumerable<string> items) =>
        DocJson.Obj(("label", S(label)), ("items", new JsonArray(items.Select(i => (JsonNode?)S(i)).ToArray())));

    /// <summary>준비사항 기본 데이터(잔금시 = 기본 서류, 계약시 = 빈 목록) — 기존 DEFAULT_DATA / EMPTY_PREP_DATA</summary>
    public static JsonObject PrepDefault(bool empty)
    {
        var o = new JsonObject();
        foreach (var tab in PrepTabs)
            o[tab] = empty ? new JsonArray() : new JsonArray(PrepDefaults[tab].Select(r => (JsonNode?)PrepRow(r.Label, r.Items)).ToArray());
        return o;
    }

    private static DocForm Prep(string kind, string title, bool empty) => new()
    {
        Kind = kind, Title = title, Group = "준비서면",
        Create = _ => PrepDefault(empty),
        Sections = _ => PrepTabs.Select(t => new DocSection
        {
            Title = t, Page = t,
            Tables = new[]
            {
                new DocTable(t, $"{t} 준비서류", new DocColumn[] { new("label", "구분", 180), new("items", "준비서류(줄마다 1개)", 0, DocColKind.Lines) },
                    () => PrepRow("", new[] { "" })),
            },
        }).ToList(),
        PrintTitle = (_, page) => page is null ? title : $"{title} — {page}",
    };

    // ---------------- 개인정보 수집 및 이용 동의서 (PrivacyConsentForm) ----------------

    private const string Org = "네오시스";

    private static DocForm Privacy() => new()
    {
        Kind = PrivacyKind, Title = "개인정보 수집 및 이용 동의서", Group = "계약서류",
        Create = c =>
        {
            var (y, m, d) = Ymd(c.Today);
            return DocJson.Obj(
                ("보존기간", S("5년")),
                ("providers", DocJson.Arr(DocJson.Obj(("성명", S(c.SellerName)), ("동의", S("동의"))), DocJson.Obj(("성명", S(c.BuyerName)), ("동의", S("동의"))))),
                ("수집_년", S(y)), ("수집_월", S(m)), ("수집_일", S(d)), ("수집자", S(c.RtNm)));
        },
        Intro = d => new[]
        {
            "[ 개인정보 수집 및 이용 동의 ]",
            "1. 개인정보의 수집 및 이용목적",
            "- 부동산 거래를 위한 매물 관리 및 계약서 작성\n- 지속가능한 서비스 제공을 위한 고객관리",
            "단, 고유식별번호(주민등록번호)는 공인중개사법 제26조(거래계약서의 작성 등) 및 부동산거래신고에 관한 법률 제3조(부동산거래의 신고)의 목적 이외에는 사용되지 않습니다.",
            "2. 수집하는 개인정보의 항목",
            "수집항목 : 이름, 주소, 휴대폰번호, 전화번호, 생년월일, 성별, 계약정보",
            "3. 개인정보 수집방법",
            "네오시스 시스템 사용이 허가된 개업공인중개사의 직접 입력을 통한 시스템 등록",
            "4. 개인정보의 보유 및 이용기간",
            $"저장된 개인정보는 이용목적이 달성되면 지체 없이 파기합니다. 단, 공인중개사법 및 공인중개사법 시행령에 따라 계약서는 {(DocJson.Str(d, "보존기간") is { Length: > 0 } p ? p : "____")} 간 보존합니다.",
            "5. 개인정보의 제3자 제공",
            $"{Org}는(은) 다음과 같이 위에서 수집한 개인정보를 제3자에게 제공하고 있습니다.\n- 제공받는자 : {Org}\n- 이용목적 및 업무내용 :\n  가. 네오시스 서비스 제공\n   - 매물등록, 고객등록, 계약서 작성 등에 필요한 개인정보 저장시스템의 관리업무\n  나. 개인정보보호법 제28조의 2(가명정보의 처리 등)에 의거하여 각종 부동산 통계작성을 위해 가명정보를 활용합니다.\n- 보유 및 이용기간 : 공인중개사의 네오시스 계약서 데이터 삭제 처리 시 까지",
            "정보 제공시 개인정보보호의 안전을 기하기 위하여 개인정보보호 관련 법규의 준수 및 사고시의 책임부담 등을 명확히 규정하고 당해 계약 내용을 서면으로 보관하고 있습니다.",
            "※ 동의를 거부할 수 있으며, 동의 거부 시 제공되는 중개서비스가 제한될 수 있으나 그에 대한 불이익은 없습니다.",
        },
        Sections = _ => new[]
        {
            new DocSection
            {
                Title = "동의 내용", Print = false,
                Fields = new[] { T("보존기간", "계약서 보존기간") },
                Tables = new[] { new DocTable("providers", "개인정보 제공자", new DocColumn[] { new("성명", "성명"), new("동의", "동의", 120, DocColKind.Choice, new[] { "동의", "동의거부" }) }, () => DocJson.Obj(("성명", S("")), ("동의", S("동의")))) },
            },
            new DocSection { Title = "수집", Print = false, Fields = new[] { T("수집_년", "수집 년"), T("수집_월", "수집 월"), T("수집_일", "수집 일"), T("수집자", "개인정보 수집자") } },
        },
        PrintBody = (d, _) =>
        {
            var lines = DocJson.Array(d, "providers").OfType<JsonObject>().Select((p, i) =>
                $"{"①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮"[Math.Min(i, 14)]}개인정보 제공자 :  성 명  {DocJson.Str(p, "성명")}  (서 명)    {(DocJson.Str(p, "동의") == "동의거부" ? "☐ 동의  ☑ 동의거부" : "☑ 동의  ☐ 동의거부")}").ToList();
            lines.Add($"수집일시 : {DocJson.Str(d, "수집_년")}년 {DocJson.Str(d, "수집_월")}월 {DocJson.Str(d, "수집_일")}일");
            lines.Add($"개인정보 수집자 :  성 명  {DocJson.Str(d, "수집자")}  (서 명)");
            lines.Add("※ 공동중개망에 고객의 정보를 등록할 경우 개인정보 수집 및 이용 동의를 받아야 합니다.");
            return lines;
        },
    };
}

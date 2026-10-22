using System.Text.Json;
using System.Text.Json.Nodes;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>서식 당사자(역할 = 저장 키 접두, 표시 라벨)</summary>
public sealed record ContractParty(string Role, string Label);

/// <summary>서명란 구성(기존 SIGN_CONFIG): 당사자, 중개사 표기 방식(gaeup/std/exclusive/none), 기본 중개사 수</summary>
public sealed record ContractSign(IReadOnlyList<ContractParty> Parties, string Broker, int BrokerCount);

/// <summary>계약서 종류 1건(기존 CONTRACT_DOCS): 문서명, 서식 분류(category), 물건유형 표기</summary>
public sealed record ContractDocDef(string Label, string Category, string PtTypeLabel);

/// <summary>계약서 서식·목록 — 기존 legacy/front/src/constants/contractTemplates.js</summary>
public static class ContractCatalog
{
    public static readonly IReadOnlyList<ContractDocDef> Docs = BuildDocs();

    private static List<ContractDocDef> BuildDocs()
    {
        var list = new List<ContractDocDef>();
        foreach (var pt in new[] { "부동산", "아파트", "오피스텔", "주상복합", "연립주택", "주택", "상가", "공장", "토지" })
            foreach (var (cat, name) in new[] { ("sale", "매매"), ("jeonse", "전세"), ("wolse", "월세") })
                list.Add(new($"{pt}{name}계약서(단독)", cat, pt));
        list.Insert(3, new("부동산교환계약서(단독)", "exchange", "부동산"));
        list.Insert(4, new("부동산권리양도계약서(단독)", "assign", "부동산"));
        list.Insert(8, new("아파트분양권매매계약서(단독)", "bunyang", "아파트분양권"));
        list.Add(new("입주권매매계약서(단독)", "ipjugwon", "입주권"));
        list.Add(new("부동산매매약정서", "landAgree", "부동산"));
        list.Add(new("주택임대차표준계약서", "standardLease", "주택"));
        list.Add(new("권리금계약서", "keymoney", "상가"));
        list.Add(new("전대차계약서(단독)", "sublease", "부동산"));
        list.Add(new("전속중개계약서", "exclusive", "부동산"));
        return list;
    }

    private static ContractParty Pt(string role, string label) => new(role, label);

    /// <summary>분류별 서명란(기존 SIGN_CONFIG). 전세·월세도 저장 키는 매도인/매수인(라벨만 임대인/임차인)</summary>
    public static ContractSign Sign(string? category) => category switch
    {
        "jeonse" or "wolse" => new(new[] { Pt("매도인", "임 대 인"), Pt("매수인", "임 차 인") }, "gaeup", 1),
        "exchange" => new(new[] { Pt("갑", "“甲”"), Pt("을", "“乙”") }, "std", 1),
        "assign" => new(new[] { Pt("양도인", "양 도 인"), Pt("양수인", "양 수 인") }, "std", 1),
        "sublease" => new(new[] { Pt("전대인", "전 대 인"), Pt("전차인", "전 차 인") }, "std", 2),
        "exclusive" => new(new[] { Pt("중개의뢰인", "중개의뢰인(甲)") }, "exclusive", 1),
        "standardLease" => new(new[] { Pt("임대인", "임 대 인"), Pt("임차인", "임 차 인") }, "gaeup", 1),
        "keymoney" => new(new[] { Pt("임차인", "임 차 인"), Pt("신규임차인", "신규임차인") }, "gaeup", 1),
        "landAgree" => new(new[] { Pt("매도인", "부동산 소유자"), Pt("매수인", "매수 약정인") }, "gaeup", 1),
        _ => new(new[] { Pt("매도인", "매 도 인"), Pt("매수인", "매 수 인") }, "gaeup", 1),
    };

    /// <summary>중개사 행 키(기존 브로커 키 규칙). index 0 = '중개', 1 = '중개2' …</summary>
    public static (string Addr, string Name, string Rep, string Reg, string Tel, string? Sosok) BrokerKeys(string broker, int index)
    {
        var pf = index == 0 ? "중개" : $"중개{index + 1}";
        return broker switch
        {
            "exclusive" => ("중개사무소소재지", "중개상호", "중개대표", "중개등록번호", "중개전화", null),
            "std" => ($"{pf}사무소소재지", $"{pf}사무소명칭", $"{pf}대표", $"{pf}등록번호", $"{pf}전화", null),
            _ => ($"{pf}사무소소재지", $"{pf}상호", $"{pf}대표", $"{pf}등록번호", $"{pf}전화", $"{pf}소속"),
        };
    }

    public static readonly IReadOnlyList<string> IdTypes = new[]
    {
        "주민등록번호", "법인등록번호", "외국인등록번호", "기타단체등록번호", "재외국민주민번호", "사업자번호", "종중등록번호", "종교단체등록번호", "여권번호", "고유등록번호",
    };

    public static readonly IReadOnlyList<string> BuildingUses = new[]
    {
        "아파트", "업무시설", "공동주택", "연립주택", "다세대주택", "단독주택", "다가구주택", "다중주택", "근린생활시설 및 주택", "근린생활시설", "공장", "창고시설", "없음",
    };

    /// <summary>추가 당사자 라벨 유형(기존 DAERI_TYPES)</summary>
    public static readonly IReadOnlyList<string> DaeriTypes = new[] { "없음", "대리인", "공동명의인", "출력후수기입력", "대표자", "법정대리인", "매수인" };

    /// <summary>융자금/현임대보증금 승계 문구(기존 LOAN_TERMS)</summary>
    public static readonly IReadOnlyList<string> LoanTerms = new[]
    {
        "현 상태에서 매수인이 승계함.", "매도인이 잔금지급일까지 말소한다.", "특약사항에 별도 명시한다.", "매수인이 인수한다.", "매수인이 인수하지 아니한다.",
    };

    /// <summary>
    /// 융자금 목록(doc._loans: [{amt, 승계, 라벨}]) — 기존 getLoans. 구버전 단일값(융자금한글·융자금승계·융자금라벨)은 1건으로,
    /// 서식에 융자금 행이 있고 숨기지 않았으면(_융자금표시 != false) 빈 1건을 기본으로 보여 준다.
    /// </summary>
    public static List<JsonObject> Loans(JsonObject doc, bool templateHasLoanRow)
    {
        if (doc["_loans"] is JsonArray arr) return arr.OfType<JsonObject>().Select(o => (JsonObject)o.DeepClone()).ToList();
        string? D(string k) => doc[k] is JsonValue v ? v.ToString() : null;
        JsonObject Loan(string? amt, string? term, string? label) => new() { ["amt"] = amt ?? "", ["승계"] = term ?? LoanTerms[0], ["라벨"] = label ?? "융자금" };
        if (!string.IsNullOrEmpty(D("융자금한글"))) return new() { Loan(D("융자금한글"), D("융자금승계"), D("융자금라벨")) };
        var hidden = doc["_융자금표시"] is JsonValue h && h.TryGetValue<bool>(out var b) && !b;
        return templateHasLoanRow && !hidden ? new() { Loan("", null, null) } : new();
    }

    /// <summary>추가 당사자(doc._addParties: [{label, id}]) 1명 추가 — 저장 키 접두는 '{label}#{id}', 라벨 유형 기본 '대리인'</summary>
    public static string AddParty(JsonObject doc, string label, long id)
    {
        if (doc["_addParties"] is not JsonArray arr) { arr = new JsonArray(); doc["_addParties"] = arr; }
        arr.Add(new JsonObject { ["label"] = label, ["id"] = id });
        var role = $"{label}#{id}";
        doc[$"_addlabel_{role}"] = "대리인";
        return role;
    }

    /// <summary>추가 당사자 목록(label, 키 접두)</summary>
    public static IEnumerable<(string Label, string Role, long Id)> AddedParties(JsonObject doc) =>
        (doc["_addParties"] as JsonArray ?? new JsonArray()).OfType<JsonObject>()
            .Select(o => ((string?)o["label"] ?? "", o["id"] is JsonValue v && v.TryGetValue<long>(out var id) ? id : 0))
            .Select(x => (x.Item1, $"{x.Item1}#{x.Item2}", x.Item2));

    private static readonly string[] HanD = { "", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구" };
    private static readonly string[] HanS = { "", "십", "백", "천" };
    private static readonly string[] HanB = { "", "만", "억", "조", "경" };

    /// <summary>숫자 → 한글 금액(예: 350000000 → 삼억오천만). 기존 hangulAmount와 같다.</summary>
    public static string Hangul(long n)
    {
        if (n <= 0) return "";
        var digits = n.ToString().Reverse().ToArray();
        var result = "";
        for (int g = (digits.Length - 1) / 4; g >= 0; g--)
        {
            var s = "";
            for (int i = Math.Min(3, digits.Length - g * 4 - 1); i >= 0; i--)
            {
                var d = digits[g * 4 + i] - '0';
                if (d != 0) s += HanD[d] + HanS[i];
            }
            if (s.Length > 0) result += s + HanB[g];
        }
        return result;
    }
}

/// <summary>
/// 계약관리 — 기존 ContractMasterService(contract_master + contract_document) / ContractTemplateService.
/// 계약서 본문 입력값은 contract_master.doc(JSON, 키 = 서식 입력칸 이름)에 저장한다.
/// </summary>
public sealed class ContractService : ServiceBase
{
    public ContractService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    private List<Row>? _templates;

    public async Task<List<Row>> TemplatesAsync() => _templates ??= await Sp.QueryRowsAsync("cn_contract_template", "SEL");

    /// <summary>분류(category)에 맞는 서식 본문(JSON). 없으면 null</summary>
    public async Task<JsonObject?> TemplateBodyAsync(string category)
    {
        var t = (await TemplatesAsync()).FirstOrDefault(r => r.Str("category") == category);
        return t?.Str("body_json") is { } json ? JsonNode.Parse(json) as JsonObject : null;
    }

    /// <summary>filter: q_fr, q_to(계약일), q_keyword</summary>
    public Task<List<Row>> ListAsync(Row? filter = null) => Sp.QueryRowsAsync("contract_master", "LIST", P(filter));

    public Task<Row?> GetAsync(string masterId) => Sp.QueryRowAsync("contract_master", "GET", new { master_id = masterId });

    public static JsonObject ParseDoc(string? json)
    {
        try { return JsonNode.Parse(string.IsNullOrWhiteSpace(json) ? "{}" : json) as JsonObject ?? new JsonObject(); }
        catch (JsonException) { return new JsonObject(); }
    }

    /// <summary>doc(JSON)의 단순 값(문자·숫자·참거짓)을 Row로 — 화면 바인딩용. 배열·객체 값은 JSON에 그대로 둔다.</summary>
    public static Row DocToRow(JsonObject doc)
    {
        var r = new Row();
        foreach (var (k, v) in doc)
            if (v is JsonValue jv)
                r[k] = jv.TryGetValue<string>(out var s) ? s : jv.TryGetValue<long>(out var l) ? l : jv.TryGetValue<double>(out var d) ? d : jv.TryGetValue<bool>(out var b) ? b : jv.ToJsonString();
        return r;
    }

    /// <summary>화면 Row 값을 doc(JSON)에 다시 반영(빈 값은 키 삭제)</summary>
    public static void RowToDoc(Row r, JsonObject doc)
    {
        foreach (var (k, v) in r)
        {
            if (v is null || (v is string s && s.Length == 0)) { doc.Remove(k); continue; }
            doc[k] = v switch
            {
                long l => JsonValue.Create(l),
                int i => JsonValue.Create(i),
                double d => JsonValue.Create(d),
                bool b => JsonValue.Create(b),
                _ => JsonValue.Create(v.ToString()),
            };
        }
    }

    /// <summary>
    /// 계약 저장(신규/수정). master_id가 없으면 새로 만든다. 목록용 요약 컬럼(소재지·당사자·금액·계약일)은 doc에서 채운다.
    /// 반환: master_id
    /// </summary>
    public async Task<string> SaveAsync(Row master, JsonObject doc)
    {
        var id = master.Str("master_id");
        if (string.IsNullOrWhiteSpace(id)) id = Guid.NewGuid().ToString();

        var category = (string?)doc["category"] ?? master.Str("contract_kind") ?? "sale";
        var sign = ContractCatalog.Sign(category);
        string? D(string k) => doc[k] is JsonValue v ? v.ToString() : null;
        long? Amount() => new[] { "매매대금", "보증금", "권리금", "양도대금", "교환차액", "거래금액" }
            .Select(D).Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => long.TryParse(new string(s!.Where(char.IsDigit).ToArray()), out var n) ? n : (long?)null)
            .FirstOrDefault(n => n is not null);

        var docType = (string?)doc["docType"] ?? master.Str("title") ?? "계약서";
        var p = new Row
        {
            ["master_id"] = id,
            ["contract_kind"] = category,
            ["doc_type"] = (string?)doc["ptType"] ?? master.Str("doc_type"),
            ["trade_type"] = (string?)doc["docHint"] ?? master.Str("trade_type"),
            ["title"] = docType,
            ["addr"] = D("소재지") ?? master.Str("addr"),
            ["seller"] = D($"{sign.Parties[0].Role}_성명") ?? master.Str("seller"),
            ["buyer"] = sign.Parties.Count > 1 ? D($"{sign.Parties[1].Role}_성명") ?? master.Str("buyer") : master.Str("buyer"),
            ["amount"] = Amount() ?? master.Long("amount"),
            ["contract_date"] = LocalDate.Normalize(D("계약일자")) ?? master.Str("contract_date"),
            ["status"] = master.Str("status") ?? "작성",
            ["doc"] = doc.ToJsonString(new JsonSerializerOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping }),
        };
        await Sp.ExecuteAsync("contract_master", "UPSERT", P(p));
        foreach (var kv in p) master[kv.Key] = kv.Value;
        return id;
    }

    /// <summary>계약서만 복사(부속문서 제외) → 새 master_id</summary>
    public async Task<string> CopyAsync(string masterId)
    {
        var newId = Guid.NewGuid().ToString();
        var n = await Sp.ExecuteAsync("contract_master", "COPY", P(new { master_id = masterId, new_id = newId }));
        return n > 0 ? newId : throw new InvalidOperationException("복사할 계약서를 찾을 수 없습니다.");
    }

    public Task DeleteAsync(string masterId) => Sp.ExecuteAsync("contract_master", "DEL", P(new { master_id = masterId }));

    /// <summary>거래신고 완료일(null = 완료 취소)</summary>
    public Task SetReportDateAsync(string masterId, string? date) =>
        Sp.ExecuteAsync("contract_master", "REPORT_DATE", P(new { master_id = masterId, report_done_date = LocalDate.Normalize(date) }));

    // ---------------- 부속문서 ----------------

    public Task<List<string>> DocumentKindsAsync(string masterId) => Sp.QueryAsync<string>("contract_document", "KINDS", new { master_id = masterId });

    public async Task<JsonObject?> GetDocumentAsync(string masterId, string kind)
    {
        var r = await Sp.QueryRowAsync("contract_document", "GET", new { master_id = masterId, doc_kind = kind });
        return r is null ? null : ParseDoc(r.Str("data"));
    }

    /// <summary>
    /// 부속문서 저장 — 계약 마스터가 없으면 '(임시)'로 먼저 만든다(기존 SaveDocument).
    /// category/docType/tradeType = 기존 meta(계약종류·물건유형·거래유형). 마스터에 빈 값일 때만 채운다.
    /// </summary>
    public Task SaveDocumentAsync(string masterId, string kind, JsonObject data, string? category = null, string? docType = null, string? tradeType = null) =>
        Sp.InTransactionAsync(async tx =>
        {
            await tx.ExecuteAsync("contract_master", "ENSURE", P(new { master_id = masterId, contract_kind = category, doc_type = docType, trade_type = tradeType }));
            return await tx.ExecuteAsync("contract_document", "UPSERT", P(new { master_id = masterId, doc_kind = kind, data = data.ToJsonString(DocJsonOptions) }));
        });

    private static readonly JsonSerializerOptions DocJsonOptions = new() { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    /// <summary>부속문서 기본값 재료(계약서 doc·사무소·세션). 마스터가 아직 없으면 master는 null</summary>
    public async Task<DocContext> DocumentContextAsync(Row? master) => DocContext.From(master, await OfficeAsync(), Session);

    /// <summary>부속문서 편집용 데이터 — 저장분이 있으면 기본값 위에 덮어서(기존 {...base, ...initial}), 없으면 기본값</summary>
    public async Task<JsonObject> OpenDocumentAsync(DocForm form, string masterId, Row? master = null)
    {
        var saved = await GetDocumentAsync(masterId, form.Kind);
        return ContractDocs.Load(form, await DocumentContextAsync(master ?? await GetAsync(masterId)), saved);
    }

    public Task DeleteDocumentAsync(string masterId, string kind) =>
        Sp.ExecuteAsync("contract_document", "DEL", P(new { master_id = masterId, doc_kind = kind }));

    /// <summary>개업공인중개사 기본값 — 로컬 사무소 정보(로그인 시 서버에서 받아 둔 값)</summary>
    public Task<Row?> OfficeAsync() => Sp.QueryRowAsync("ofc_realter_office", "GET", P());
}

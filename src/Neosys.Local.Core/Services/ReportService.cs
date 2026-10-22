using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>보고서 작성 옵션 — 기존 ReportBuilderModal 상태(제목·코멘트·중개사용/고객용·매물별 메모·표 머리)</summary>
public sealed class ReportOptions
{
    public string Title { get; set; } = "매물 브리핑";
    public string? Comment { get; set; }
    /// <summary>agent(중개사용) | customer(고객용 — 매물별 메모 칸을 비움)</summary>
    public string Version { get; set; } = "agent";
    /// <summary>pt_no → 메모(여러 매물 표 마지막 칸)</summary>
    public Dictionary<long, string> Memos { get; } = new();
    public string? ChargeName { get; set; }
    public string? OfficeName { get; set; }
    public string? OfficeTel { get; set; }
    public DateTime Date { get; set; } = DateTime.Today;

    public static readonly IReadOnlyList<(string Key, string Header)> MultiHeaders = new[]
    {
        ("type", "물건종류"), ("name", "물건명"), ("aptTyp", "타입"), ("sale", "거래구분"),
        ("amt", "금액(만원)"), ("lease", "현임대조건"), ("balance", "잔금예정일"), ("memo", "메모"),
    };
}

/// <summary>
/// 보고서(매물 브리핑) — 기존 ReportService(report / report_cust) + ReportBuilderModal의 본문 HTML 생성.
/// 본문은 content_html(HTML), 당시 물건은 snapshot(JSON, 기존과 같은 camelCase 키)으로 저장한다.
/// </summary>
public sealed class ReportService : ServiceBase
{
    public ReportService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    /// <summary>filter: q_user_id(작성자), q_pt_no, q_cust_no, q_keyword</summary>
    public Task<List<Row>> ListAsync(Row? filter = null) =>
        Sp.QueryRowsAsync("report", "LIST", P(new Row { ["q_user_id"] = null, ["q_pt_no"] = null, ["q_cust_no"] = null, ["q_keyword"] = null }, filter));

    /// <summary>내가 만든 보고서(기존 ReportManageModal)</summary>
    public Task<List<Row>> MineAsync(string? keyword = null) => ListAsync(new Row { ["q_user_id"] = Session.UserId, ["q_keyword"] = keyword });

    public Task<Row?> GetAsync(long reportNo) => Sp.QueryRowAsync("report", "GET", new { report_no = reportNo });

    public Task<List<Row>> SharesAsync(long reportNo) => Sp.QueryRowsAsync("report_cust", "SEL", new { report_no = reportNo });

    /// <summary>등록/수정 + 고객 배포 재구성(기존 CreateReport). 반환: report_no</summary>
    public Task<long> SaveAsync(long? reportNo, long? ptNo, string? title, string? comment, string? snapshot, string? html, IEnumerable<long> custNos) =>
        Sp.InTransactionAsync(async tx =>
        {
            var p = P(new { report_no = reportNo, pt_no = ptNo, title, comment, snapshot, content_html = html });
            long no;
            if (reportNo is > 0)
            {
                await tx.ExecuteAsync("report", "UPD", p);
                await tx.ExecuteAsync("report_cust", "DEL", P(new { report_no = reportNo }));
                no = reportNo.Value;
            }
            else no = await tx.InsertAsync("report", "INS", p);
            foreach (var c in custNos.Distinct())
                await tx.ExecuteAsync("report_cust", "INS", P(new { report_no = no, cust_no = c }));
            return no;
        });

    /// <summary>기존 보고서에 고객 추가 배포(기존 AttachCustomers)</summary>
    public async Task AttachAsync(long reportNo, IEnumerable<long> custNos)
    {
        foreach (var c in custNos.Distinct())
            await Sp.ExecuteAsync("report_cust", "INS", P(new { report_no = reportNo, cust_no = c }));
    }

    public Task DeleteAsync(long reportNo) => Sp.ExecuteAsync("report", "DEL", new { report_no = reportNo });

    // ---------------- 스냅샷 ----------------

    /// <summary>물건 Row(snake_case) → 스냅샷 JSON(camelCase — 기존 API 응답 키와 같다)</summary>
    public static JsonObject Snapshot(Row pt)
    {
        var o = new JsonObject();
        foreach (var (k, v) in pt)
        {
            if (v is null) continue;
            o[Camel(k)] = v switch
            {
                long l => JsonValue.Create(l),
                int i => JsonValue.Create(i),
                double d => JsonValue.Create(d),
                decimal m => JsonValue.Create(m),
                bool b => JsonValue.Create(b),
                _ => JsonValue.Create(Convert.ToString(v, CultureInfo.InvariantCulture)),
            };
        }
        return o;
    }

    public static string Camel(string snake)
    {
        var parts = snake.Split('_', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return snake;
        return parts[0] + string.Concat(parts.Skip(1).Select(p => char.ToUpperInvariant(p[0]) + p[1..]));
    }

    /// <summary>스냅샷 JSON 문자열 — 1건이면 객체, 여러 건이면 배열(기존과 같음)</summary>
    public static string SnapshotJson(IReadOnlyList<JsonObject> props) =>
        (props.Count == 1 ? (JsonNode)props[0].DeepClone() : new JsonArray(props.Select(p => (JsonNode?)p.DeepClone()).ToArray()))
            .ToJsonString(new JsonSerializerOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });

    /// <summary>저장된 스냅샷 → 물건 목록(객체 1건 또는 배열)</summary>
    public static List<JsonObject> ParseSnapshot(string? json)
    {
        try
        {
            return JsonNode.Parse(json ?? "") switch
            {
                JsonArray a => a.OfType<JsonObject>().ToList(),
                JsonObject o => new List<JsonObject> { o },
                _ => new List<JsonObject>(),
            };
        }
        catch (JsonException) { return new List<JsonObject>(); }
    }

    /// <summary>자동 제목: 공동주택이면 단지명, 아니면 건물명 + ' 매물 브리핑', 여러 건이면 '매물 브리핑 (n건)'</summary>
    public static string AutoTitle(IReadOnlyList<JsonObject> props)
    {
        if (props.Count > 1) return $"매물 브리핑 ({props.Count}건)";
        if (props.Count == 0) return "매물 브리핑";
        var p = props[0];
        var isApt = Catalog.ApartmentFormCodes.Contains(S(p, "ptType"));
        var nm = isApt ? First(p, "addr4", "danjiName", "ptName") : First(p, "addr5", "buildingName", "ptName");
        return $"{nm.Trim()} 매물 브리핑".Trim();
    }

    public static bool IsAutoTitle(string? t) =>
        string.IsNullOrWhiteSpace(t) || System.Text.RegularExpressions.Regex.IsMatch(t, @"^매물 브리핑( \(\d+건\))?$") || t.EndsWith("매물 브리핑");

    // ---------------- 본문 HTML(기존 buildFullHtml) ----------------

    private static string S(JsonObject p, string k) => p[k] is JsonValue v ? (v.TryGetValue<string>(out var s) ? s : v.ToJsonString()) : "";
    private static string First(JsonObject p, params string[] keys) => keys.Select(k => S(p, k)).FirstOrDefault(s => s.Length > 0) ?? "";
    private static string Esc(string? s) => WebUtility.HtmlEncode(s ?? "");
    private static string Won(string v) => decimal.TryParse(v, NumberStyles.Float, CultureInfo.InvariantCulture, out var n) ? n.ToString("#,0.##", CultureInfo.InvariantCulture) : v;
    private static bool Has(JsonObject p, string k) => S(p, k).Length > 0;

    public static string TypeLabel(JsonObject p) => Catalog.PropertyTypeName(S(p, "ptType")) ?? "-";
    public static string AddrOf(JsonObject p) => string.Join(" ", new[] { "addr1", "addr2", "addr3", "addr4", "addr5" }.Select(k => S(p, k)).Where(s => s.Length > 0)) is { Length: > 0 } a ? a : "-";

    /// <summary>거래구분+금액 행(등록된 유형만) — 기존 tradeRows</summary>
    public static List<(string Label, string Amt)> TradeRows(JsonObject p)
    {
        var set = S(p, "saleDiv").Split(',').Select(x => x.Trim()).ToHashSet();
        string Pair(string a, string b) => Has(p, a) || Has(p, b) ? $"{Won(Has(p, a) ? S(p, a) : "0")}/{Won(Has(p, b) ? S(p, b) : "0")}" : "-";
        var rows = new List<(string, string, Func<string>)>
        {
            ("SALEDIV01", "매매", () => Has(p, "saleAmt") ? Won(S(p, "saleAmt")) : "-"),
            ("SALEDIV02", "전세", () => Has(p, "lesAmt") ? Won(S(p, "lesAmt")) : "-"),
            ("SALEDIV03", "월세", () => Pair("protAmt", "monAmt")),
            ("SALEDIV04", "기타임대", () => Pair("etcAmt", "etcAmt2")),
        }.Where(r => set.Contains(r.Item1)).Select(r => (r.Item2, r.Item3())).ToList();
        return rows.Count > 0 ? rows : new List<(string, string)> { ("-", "-") };
    }

    private const string Th = "width:30%;padding:10px 14px;background:#f8fafc;font-size:13px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;text-align:left;";
    private const string Td = "padding:10px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;";
    private const string Th2 = "width:15%;padding:9px 12px;background:#f8fafc;font-size:13px;font-weight:600;color:#475569;border:1px solid #e2e8f0;text-align:left;white-space:nowrap;";
    private const string Td2 = "padding:9px 12px;font-size:13px;color:#1e293b;border:1px solid #e2e8f0;";

    private static string Section(string t) => $"<div style=\"font-size:15px;font-weight:700;color:#fff;background:#1e293b;padding:8px 12px;border-left:4px solid #4f46e5;\">{Esc(t)}</div>";
    private static string Row(string l, string v) => $"<tr><td style=\"{Th}\">{Esc(l)}</td><td style=\"{Td}\">{v}</td></tr>";
    private static string Row2(string l1, string v1, string l2, string v2) => $"<tr><td style=\"{Th2}\">{Esc(l1)}</td><td style=\"{Td2}\">{v1}</td><td style=\"{Th2}\">{Esc(l2)}</td><td style=\"{Td2}\">{v2}</td></tr>";
    private static string RowFull(string l, string v) => $"<tr><td style=\"{Th2}\">{Esc(l)}</td><td style=\"{Td2}\" colspan=\"3\">{v}</td></tr>";
    private static string Box(string rows) => $"<table style=\"width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:18px;\">{rows}</table>";

    /// <summary>단일 매물 상세(기존 buildSingleHtml). rpt* 키가 있으면 그 값을 우선(보고서용 수정값)</summary>
    public static string SingleHtml(JsonObject p)
    {
        string V(string k, string? fb = null) => Esc(Has(p, k) ? S(p, k) : (string.IsNullOrEmpty(fb) ? "-" : fb));
        string Amt(string k) => Has(p, k) ? $"{Won(S(p, k))} 만원" : "-";
        string Or(string k, string fb) => Has(p, k) ? S(p, k) : fb;
        var floor = $"{Or("floor1", "-")} / {Or("floor2", "-")}";
        var dir = Or("dirStd", "-") + (Has(p, "dirBase") ? " / " + S(p, "dirBase") : "");
        var room = $"{Or("roomCnt", "-")} / {Or("bathCnt", "-")}";
        var heat = Or("heatMethod", "-") + (Has(p, "heatFuel") ? " / " + S(p, "heatFuel") : "");
        var rmd = Has(p, "rptRmdDate") ? S(p, "rptRmdDate") : Has(p, "rmdDate") ? S(p, "rmdDate").Split('T')[0] : Has(p, "balDate") ? S(p, "balDate") : "-";
        var area = Has(p, "rptArea") ? S(p, "rptArea") : $"{Or("supArea", "-")} / {Or("excArea", "-")}";
        var memo = Has(p, "rptMemo") ? S(p, "rptMemo") : First(p, "featureNote", "ptExpl");
        return string.Concat(
            Section("면적 / 금액"),
            Box(Row("공급/전용면적", $"{Esc(area)} ㎡")
                + Row("매매가", Has(p, "rptSaleAmt") ? $"{Esc(S(p, "rptSaleAmt"))} 만원" : Amt("saleAmt"))
                + Row("전세가", Has(p, "rptLesAmt") ? $"{Esc(S(p, "rptLesAmt"))} 만원" : Amt("lesAmt"))
                + Row("월세(보증/월)", Has(p, "rptMonAmt") ? Esc(S(p, "rptMonAmt")) : $"{Amt("protAmt")} / {Amt("monAmt")}")),
            Section("매물정보"),
            Box(Row2("물건유형", V("rptType", TypeLabel(p)), "현상태", V("rptStatus", S(p, "currentStatus")))
                + RowFull("주소", V("rptAddr", AddrOf(p)))
                + Row2("세대수", V("rptHouseCnt", S(p, "houseCnt")), "주차대수", V("rptParkCnt", S(p, "pkCnt")))
                + Row2("잔금예정일", Esc(rmd), "해당층/총층", V("rptFloor", floor))
                + Row2("준공일자", V("rptCompYear", S(p, "compYear")), "방향/기준", V("rptDir", dir))
                + Row2("방수/욕실수", V("rptRoom", room), "난방방식/연료", V("rptHeat", heat))
                + Row2("출입구조", V("rptEntr", S(p, "entrStruct")), "건물형태", V("rptBuildingForm", S(p, "buildingForm")))),
            Section("코멘트 | 물건특징"),
            $"<div style=\"border:1px solid #e2e8f0;padding:12px 14px;min-height:120px;font-size:13px;color:#1e293b;white-space:pre-wrap;line-height:1.6;margin-bottom:18px;\">{Esc(memo)}</div>");
    }

    /// <summary>여러 매물 표(기존 multiTableHtml)</summary>
    public static string MultiTableHtml(IEnumerable<JsonObject> rows, ReportOptions o)
    {
        const string th = "padding:8px 10px;border:1px solid #334155;font-size:12px;font-weight:600;color:#fff;";
        const string td = "padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;color:#1e293b;text-align:center;vertical-align:middle;";
        var sb = new StringBuilder("<table style=\"width:100%;border-collapse:collapse;margin-bottom:18px;table-layout:fixed;\">");
        sb.Append("<colgroup><col style=\"width:11%\"/><col style=\"width:17%\"/><col style=\"width:7%\"/><col style=\"width:8%\"/><col style=\"width:13%\"/><col style=\"width:12%\"/><col style=\"width:10%\"/><col style=\"width:22%\"/></colgroup>");
        sb.Append("<thead><tr style=\"background:#1e293b;\">");
        foreach (var (_, h) in ReportOptions.MultiHeaders) sb.Append($"<th style=\"{th}\">{Esc(h)}</th>");
        sb.Append("</tr></thead><tbody>");
        foreach (var p in rows)
        {
            var tr = TradeRows(p);
            var name = Has(p, "rptName") ? S(p, "rptName") : First(p, "ptName", "addr4", "addr5") is { Length: > 0 } n ? n : "-";
            var lease = Has(p, "rptLease") ? S(p, "rptLease") : Has(p, "nowDepAmt") || Has(p, "nowMonAmt") ? $"{S(p, "nowDepAmt")}/{S(p, "nowMonAmt")}" : "-";
            var balance = Has(p, "rptBalance") ? S(p, "rptBalance") : Has(p, "exptDate") ? S(p, "exptDate")[..Math.Min(10, S(p, "exptDate").Length)].Replace('-', '.') : "-";
            var ptNo = long.TryParse(S(p, "ptNo"), out var pn) ? pn : 0;
            var memo = o.Version == "customer" ? "" : o.Memos.GetValueOrDefault(ptNo, "");
            sb.Append("<tr>")
              .Append($"<td style=\"{td}\">{Esc(Has(p, "rptType") ? S(p, "rptType") : TypeLabel(p))}</td>")
              .Append($"<td style=\"{td}\">{Esc(name)}</td>")
              .Append($"<td style=\"{td}\">{Esc(Has(p, "rptAptTyp") ? S(p, "rptAptTyp") : Has(p, "aptTyp") ? S(p, "aptTyp") : "-")}</td>")
              .Append($"<td style=\"{td}\">{string.Join("<br/>", tr.Select(r => Esc(r.Label)))}</td>")
              .Append($"<td style=\"{td}text-align:right;white-space:nowrap;\">{string.Join("<br/>", tr.Select(r => Esc(r.Amt)))}</td>")
              .Append($"<td style=\"{td}\">{Esc(lease)}</td>")
              .Append($"<td style=\"{td}\">{Esc(balance)}</td>")
              .Append($"<td style=\"{td}text-align:left;\">{Esc(memo)}</td>")
              .Append("</tr>");
        }
        return sb.Append("</tbody></table>").ToString();
    }

    /// <summary>저장/인쇄용 전체 HTML(기존 buildFullHtml) — 단일 = 1쪽, 여러 건 = 7행씩 쪽 나눔 + 쪽번호</summary>
    public static string BuildHtml(IReadOnlyList<JsonObject> props, ReportOptions o)
    {
        var header = "<div style=\"border-bottom:3px solid #4f46e5;padding-bottom:10px;margin-bottom:14px;\">"
            + $"<div style=\"font-size:13px;color:#64748b;\">{Esc(o.Date.ToString("yyyy. M. d.", CultureInfo.InvariantCulture))}</div>"
            + "<div style=\"margin-top:6px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;\">"
            + $"<div style=\"font-size:24px;font-weight:800;color:#1e293b;\">{Esc(string.IsNullOrWhiteSpace(o.Title) ? "매물 브리핑" : o.Title)}</div>"
            + $"<div style=\"font-size:13px;font-weight:700;color:#475569;white-space:nowrap;\">담당자: {Esc(o.ChargeName)}</div></div></div>";
        var comment = string.IsNullOrWhiteSpace(o.Comment) ? ""
            : Section("코멘트") + $"<div style=\"border:1px solid #e2e8f0;border-top:none;padding:12px 14px;font-size:13px;color:#1e293b;white-space:pre-wrap;line-height:1.6;\">{Esc(o.Comment)}</div>";
        var office = string.IsNullOrEmpty(o.OfficeName) && string.IsNullOrEmpty(o.OfficeTel) ? ""
            : $"<div style=\"margin-top:auto;padding-top:16px;text-align:right;\"><span style=\"font-size:14px;font-weight:800;color:#1e293b;\">{Esc(o.OfficeName)}</span>&nbsp;&nbsp;<span style=\"font-weight:600;color:#475569;\">{Esc(o.OfficeTel)}</span></div>";
        var multi = props.Count > 1;
        var minH = multi ? "194mm" : "281mm";
        string Page(string inner, int n, int total) =>
            $"<div style=\"position:relative;box-sizing:border-box;min-height:{minH};padding-bottom:8mm;{(n < total ? "page-break-after:always;" : "")}\">{inner}<div style=\"text-align:center;font-size:12px;color:#64748b;margin-top:8px;\">- {n} / {total} -</div></div>";
        string Root(string inner) => $"<div style=\"font-family:'Malgun Gothic',sans-serif;color:#1e293b;\">{inner}</div>";

        if (props.Count == 0) return Root(Page("<div style=\"color:#94a3b8;padding:20px;text-align:center;\">매물을 선택하세요.</div>", 1, 1));
        if (!multi) return Root(Page(header + SingleHtml(props[0]) + comment + office, 1, 1));

        const int rowsPerPage = 7;
        var chunks = props.Chunk(rowsPerPage).ToList();
        var pages = chunks.Select((rows, i) =>
        {
            var first = i == 0 ? header + Section($"매물 목록 ({props.Count}건)") : "";
            var last = i == chunks.Count - 1 ? comment + office : "";
            return Page(first + MultiTableHtml(rows, o) + last, i + 1, chunks.Count);
        });
        return Root(string.Concat(pages));
    }

    /// <summary>인쇄·미리보기용 완전한 HTML 문서(A4, 여러 건이면 가로)</summary>
    public static string Document(string body, string title, bool landscape) =>
        "<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">"
        + $"<title>{Esc(title)}</title><style>@page{{size:A4 {(landscape ? "landscape" : "portrait")};margin:8mm;}} html,body{{margin:0;}} body{{font-family:'Malgun Gothic',sans-serif;padding:12px;}}</style>"
        + $"</head><body>{body}</body></html>";
}

using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Neosys.Local.Core.Services;

/// <summary>
/// 특약관리 저장소 — 기존 SpecialClauseManager.jsx(localStorage 'specialClauseMgr_v2')와 같은 구조를 PC별 JSON 파일로 둔다.
///   { "주거용 매매": { "favorites": [{name, text}], "basics": [{id, text, def}] }, … }
/// 기존에도 계약별이 아니라 브라우저(PC)별 보관이었으므로 계약 DB가 아닌 %LOCALAPPDATA%\Neosys\special_clauses.json에 저장한다.
/// </summary>
public sealed class SpecialClauseStore
{
    public static readonly IReadOnlyList<string> Categories = new[] { "주거용 매매", "주거용 임대차", "비주거용 매매", "비주거용 임대차", "토지매매" };

    public static readonly IReadOnlyList<string> BasicSeed = new[]
    {
        "현 시설 상태의 매매계약이며 등기부등본 분석결과 하자 없는 상태를 확인 후 계약함.",
        "매매 대금 중 현 임대보증금은 잔금에서 공제하며, 현 임대차계약은 매수인이 승계한다.",
        "잔금과 동시에 매도인이 2년 전세로 본 매매 물건을 임대차하기로 한다(전세보증금은        원으로 한다).",
        "중개대상물 확인설명서를 거래당사자에게 각각 교부한다.",
        "",
        "건물의 노후로 인한 누수 등의 발생 시 잔금 일을 기준으로 그 이전은 매도인이, 잔금일 이후는 매수인이 책임지기로 한다.",
        "매매대금에는 다른 특약이 없는 한 본건 부동산에 존재하는 승물 등 일체의 시설물을 포함한다.",
        "본 계약에 명시되지 않은 사항은 관계법령 및 부동산 거래 관행에 따른다.",
    };

    public static string DefaultPath =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "special_clauses.json");

    public string FilePath { get; }

    public SpecialClauseStore(string? filePath = null) => FilePath = filePath ?? DefaultPath;

    /// <summary>분류 1개의 기본값: 특약1~7 빈 슬롯 + 기본 특약사항</summary>
    public static JsonObject MakeDefaults() => new()
    {
        ["favorites"] = new JsonArray(Enumerable.Range(1, 7).Select(i => (JsonNode?)new JsonObject { ["name"] = $"특약{i}", ["text"] = "" }).ToArray()),
        ["basics"] = new JsonArray(BasicSeed.Select((t, i) => (JsonNode?)new JsonObject { ["id"] = $"b{i}", ["text"] = t, ["def"] = t }).ToArray()),
    };

    /// <summary>파일을 읽는다. 없거나 손상되면 기본값, 빠진 분류는 기본값으로 채운다.</summary>
    public JsonObject Load()
    {
        JsonObject? s = null;
        try
        {
            if (File.Exists(FilePath)) s = JsonNode.Parse(File.ReadAllText(FilePath)) as JsonObject;
        }
        catch (JsonException) { /* 손상된 파일은 기본값으로 */ }
        s ??= new JsonObject();
        foreach (var c in Categories)
            if (s[c] is not JsonObject) s[c] = MakeDefaults();
        return s;
    }

    public void Save(JsonObject store)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
        File.WriteAllText(FilePath, store.ToJsonString(new JsonSerializerOptions { WriteIndented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping }));
    }

    /// <summary>체크한 기본 특약을 한 덩어리로(빈 줄 제외, 줄바꿈 연결) — 기존 checkedTexts().join('\n')</summary>
    public static string Join(IEnumerable<string?> texts) =>
        string.Join("\n", texts.Select(t => t?.Trim() ?? "").Where(t => t.Length > 0));

    /// <summary>계약서/문자 특약칸에 덧붙인다(기존 appendSpecial: 끝 공백 정리 후 줄바꿈)</summary>
    public static string Append(string? current, string? text)
    {
        var t = text?.Trim() ?? "";
        if (t.Length == 0) return current ?? "";
        return string.IsNullOrEmpty(current) ? t : current.TrimEnd() + "\n" + t;
    }
}

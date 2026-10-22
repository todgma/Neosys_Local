using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>점유상태 1종(값·라벨·색) — 기존 LayoutView STATUS_META</summary>
public sealed record OccupancyStatus(string Value, string Label, string Color);

/// <summary>
/// 배치도/입주현황 — 기존 LayoutView + LayoutService. 단지의 동·호 목록은 서버 공용 데이터(ServerApi),
/// 점유현황(danji_occupancy)은 로컬 DB(사무소 기준), 매매/전세/월세 표시는 이 PC의 물건(pt_sale) 거래구분으로 자동 계산한다.
/// </summary>
public sealed class LayoutService : ServiceBase
{
    public LayoutService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    public static readonly IReadOnlyList<OccupancyStatus> Statuses = new[]
    {
        new OccupancyStatus("SALE", "매매", "#EF4444"),
        new OccupancyStatus("JEONSE", "전세", "#3B82F6"),
        new OccupancyStatus("MONTHLY", "월세", "#F59E0B"),
        new OccupancyStatus("ETCLEASE", "기타임대", "#10B981"),
        new OccupancyStatus("UNION", "조합원분", "#8B5CF6"),
    };

    /// <summary>배치도에서 직접 입력하는 상태(나머지는 물건 거래구분으로 자동)</summary>
    public static readonly IReadOnlySet<string> ManualStatuses = new HashSet<string> { "UNION" };

    private static readonly Dictionary<string, string> SaleDivToStatus = new()
    {
        ["SALEDIV01"] = "SALE", ["SALEDIV02"] = "JEONSE", ["SALEDIV03"] = "MONTHLY", ["SALEDIV04"] = "ETCLEASE",
    };

    /// <summary>단지 점유현황(사무소 + 공용)</summary>
    public Task<List<Row>> OccupancyAsync(long danjiCode) =>
        Sp.QueryRowsAsync("danji_occupancy", "SEL", P(new { naver_danji_code = danjiCode }));

    /// <summary>점유현황 저장. statuses는 수동 상태만 저장한다(자동 상태는 물건에서 다시 계산)</summary>
    public Task SaveOccupancyAsync(long danjiCode, long dongNo, long hoNumber, string? floor, IEnumerable<string> statuses, string? name, string? phone, string? memo) =>
        Sp.ExecuteAsync("danji_occupancy", "UPSERT", P(new
        {
            naver_danji_code = danjiCode, dong_no = dongNo, ho_number = hoNumber, floor,
            occupancy_status = string.Join(",", statuses.Where(ManualStatuses.Contains).Distinct()),
            occupancy_name = name, occupancy_phone = phone, memo,
        }));

    /// <summary>동·호 키('동|호', 공백 제거)</summary>
    public static string UnitKey(object? dong, object? ho) => $"{Convert.ToString(dong)?.Trim()}|{Convert.ToString(ho)?.Trim()}";

    /// <summary>
    /// 물건 목록 → 동·호별 자동 점유상태(거래구분 코드 SALEDIVxx, 생각/예정/보류 접미 S/Y/B가 붙어도 같은 구분) — 기존 loadPropertyStatuses
    /// </summary>
    public static Dictionary<string, List<string>> AutoStatuses(IEnumerable<Row> properties)
    {
        var map = new Dictionary<string, List<string>>();
        foreach (var p in properties)
        {
            if (!p.Has("dong") || !p.Has("ho")) continue;
            var key = UnitKey(p["dong"], p["ho"]);
            foreach (var code in (p.Str("sale_div") ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var baseCode = code.Length >= 9 ? code[..9] : code;
                if (!SaleDivToStatus.TryGetValue(baseCode, out var st)) continue;
                if (!map.TryGetValue(key, out var list)) map[key] = list = new List<string>();
                if (!list.Contains(st)) list.Add(st);
            }
        }
        foreach (var list in map.Values) list.Sort((a, b) => Order(a).CompareTo(Order(b)));
        return map;
    }

    /// <summary>점유상태 정렬 순서(매매·전세·월세·기타임대·조합원분)</summary>
    public static int Order(string status) => Statuses.ToList().FindIndex(s => s.Value == status) is var i and >= 0 ? i : 99;

    /// <summary>저장된 상태 문자열('UNION,…')에서 수동 상태만</summary>
    public static List<string> ManualOf(string? stored) =>
        (stored ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Where(ManualStatuses.Contains).ToList();

    /// <summary>
    /// 단지 미등록 호(ghost) 합치기 — 기존 PropertyServices 단지 조회의 'danji_ho_new UNION'.
    /// 등록 물건(registered) + 서버 호 목록 중 등록되지 않은 동·호를 is_ghost=1 행(동·호·층·타입·면적, 주소는 대표 물건)으로 만들어 동·호 순으로 정렬한다.
    /// hos: (동 이름, 서버 호 Row)
    /// </summary>
    public static List<Row> MergeGhosts(List<Row> registered, IEnumerable<(string DongName, Row Ho)> hos, string danjiCode)
    {
        if (registered.Count == 0) return registered;
        var rep = registered[0];
        var keys = registered.Select(r => UnitKey(r["dong"], r["ho"])).ToHashSet();
        var ghosts = new List<Row>();
        foreach (var (dongName, ho) in hos)
        {
            var hoName = (ho.Str("hoName") ?? ho.Str("ho_name") ?? ho.Str("hoNumber") ?? "").Trim();
            var dong = dongName.Trim();
            if (dong.Length == 0 && hoName.Length == 0) continue;
            if (!keys.Add(UnitKey(dong, hoName))) continue;
            var g = new Row
            {
                ["is_ghost"] = 1L, ["pt_no"] = null, ["pt_sts"] = "", ["pt_type"] = rep.Str("pt_type"), ["danji_code"] = danjiCode,
                ["pt_name"] = rep.Str("addr4") ?? rep.Str("pt_name"), ["dong"] = dong, ["ho"] = hoName,
                ["floor1"] = (long)FloorOf(ho), ["apt_typ"] = ho.Str("ptpName") ?? ho.Str("ptp_name"),
                ["sup_area"] = ho.Dec("splySpc") ?? ho.Dec("sply_spc"), ["exc_area"] = ho.Dec("exclsSpc") ?? ho.Dec("excls_spc"),
            };
            foreach (var k in new[] { "addr1", "addr2", "addr3", "addr4", "jibun", "bjd_code" }) g[k] = rep[k];
            ghosts.Add(g);
        }
        static int Num(string? s) => int.TryParse(new string((s ?? "").Where(char.IsDigit).ToArray()), out var n) ? n : 0;
        return registered.Concat(ghosts).OrderBy(r => Num(r.Str("dong"))).ThenBy(r => Num(r.Str("ho"))).ToList();
    }

    /// <summary>호의 층 — 서버 floor 값이 없으면 호수에서(1203 → 12)</summary>
    public static int FloorOf(Row ho)
    {
        if (int.TryParse(ho.Str("floor") ?? ho.Str("Floor"), out var f)) return f;
        var digits = new string((ho.Str("hoName") ?? ho.Str("ho_name") ?? "").Where(char.IsDigit).ToArray());
        return digits.Length > 2 && int.TryParse(digits[..^2], out var g) ? g : 0;
    }
}

using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>공통코드 한 건(sys_code_sub)</summary>
public sealed record Code(string CatCd, string MidCd, string SubCd, string SubNm, int Sort);

/// <summary>
/// 공통코드(sys_code_sub). 앱 시작 시 한 번 읽어 캐시한다. 그룹 = cat_cd + mid_cd (예: "pt.pttyp" 물건종류).
/// </summary>
public sealed class CodeService
{
    private readonly SpRunner _sp;
    private Dictionary<string, List<Code>> _groups = new(StringComparer.OrdinalIgnoreCase);
    private Dictionary<string, string> _names = new(StringComparer.OrdinalIgnoreCase);

    public CodeService(SpRunner sp) => _sp = sp;

    public async Task LoadAsync()
    {
        var rows = await _sp.QueryRowsAsync("sys_code_sub_list");
        var list = rows.Select(r => new Code(r.Str("cat_cd")!, r.Str("mid_cd")!, r.Str("sub_cd")!, r.Str("sub_nm") ?? "", (int)(r.Long("sort") ?? 0))).ToList();
        _groups = list.GroupBy(c => $"{c.CatCd}.{c.MidCd}", StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderBy(c => c.Sort).ThenBy(c => c.SubCd, StringComparer.Ordinal).ToList(), StringComparer.OrdinalIgnoreCase);
        _names = list.GroupBy(c => c.SubCd, StringComparer.OrdinalIgnoreCase).ToDictionary(g => g.Key, g => g.First().SubNm, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>예: Group("pt.pttyp") — 없으면 빈 목록</summary>
    public IReadOnlyList<Code> Group(string group) => _groups.TryGetValue(group, out var g) ? g : Array.Empty<Code>();

    /// <summary>코드값(SubCd) → 이름. 코드가 아니면 그대로 반환</summary>
    public string? Name(string? subCd) => subCd is null ? null : _names.TryGetValue(subCd, out var n) ? n : subCd;

    /// <summary>그룹 안에서 코드 접두어로 필터(예: sy.syyon 그룹의 SYPRG* = 진행상태)</summary>
    public IReadOnlyList<Code> Group(string group, string prefix) =>
        Group(group).Where(c => c.SubCd.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)).ToList();
}

/// <summary>자주 쓰는 공통코드 그룹 이름</summary>
public static class CodeGroups
{
    public const string PropertyType = "pt.pttyp";     // 물건종류 PTTYP01~20
    public const string TradeType = "pt.pttrd";        // 거래유형 매매/전세/월세/기타임대
    public const string PropertyStatus = "pt.ptsta";   // 현상태
    public const string Direction = "pt.ptdir";        // 방향
    public const string DirectionStd = "pt.ptdst";     // 방향기준
    public const string HeatMethod = "pt.pthet";       // 난방방식
    public const string HeatFuel = "pt.ptfue";         // 난방연료
    public const string EntranceStruct = "pt.ptdrs";   // 현관구조
    public const string BuildingStruct = "pt.ptbds";   // 건물구조
    public const string BalconyExt = "pt.ptext";       // 확장여부
    public const string MoveIn = "pt.ptidd";           // 입주가능
    public const string RebuildStep = "pt.prrbp";      // 재건축 진행
    public const string RealtorType = "rt.rttyp";      // 중개사 구분
    public const string ScheduleType = "sy.sysch";     // 일정구분
    public const string ContractKind = "sy.sysnd";     // 계약서 종류(SYAGR*)
    public const string Progress = "sy.syyon";         // SYPRG* 진행상태, SYYON* 가능/불가능, PTRTY* 단독/공동
    public const string Attachments = "sy.syatc";      // 첨부서류
    public const string PrepDocs = "sy.syagd";         // 준비서류
    public const string Report = "sy.syrpt";           // 신고 완료/미완료
    public const string YesNo = "sy.synon";            // 유/무
}

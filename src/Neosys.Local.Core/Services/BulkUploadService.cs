using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>업로드 컬럼 항목(키 = 기존 저장 payload 필드명 camelCase, 저장 시 DB 컬럼 snake_case로)</summary>
public sealed record UploadField(string Key, string Label, string Group);

/// <summary>물건 업로드 공통값(상단 공통 폼): 물건유형·소재지(법정동)·단지·물건명 — 모든 행에 적용(행 값이 우선)</summary>
public sealed class UploadCommon
{
    public string? PtType { get; set; }
    public string? SidoCode { get; set; }      // 화면 복원용(시/도·시/군/구 선택값)
    public string? SigunguCode { get; set; }
    public string? BjdCode { get; set; }
    public string? Addr1 { get; set; }
    public string? Addr2 { get; set; }
    public string? Addr3 { get; set; }
    public string? DanjiCode { get; set; }
    public string? PtName { get; set; }
}

public sealed record UploadError(int RowNo, string Message);

/// <summary>
/// 단지 동·호·타입 목록(서버 /api/system/dong-list·ho-list·area-list) — 결과 키는 서버 그대로(dong_no, dong_name / ho_name, ptp_no, floor, sply_spc, excls_spc / ptp_no, plan_type_name, room_cnt, bathroom_cnt)
/// </summary>
public interface IDanjiSource
{
    Task<List<Row>> GetDongListAsync(string danjiCode);
    Task<List<Row>> GetHoListAsync(string danjiCode, int dongNo);
    Task<List<Row>> GetAreaListAsync(string danjiCode);
}

/// <summary>운영 서버 API로 단지 정보를 조회</summary>
public sealed class ServerDanjiSource(Server.ServerApi api) : IDanjiSource
{
    public Task<List<Row>> GetDongListAsync(string danjiCode) => api.GetDongListAsync(danjiCode);
    public Task<List<Row>> GetHoListAsync(string danjiCode, int dongNo) => api.GetHoListAsync(danjiCode, dongNo);
    public Task<List<Row>> GetAreaListAsync(string danjiCode) => api.GetAreaListAsync(danjiCode);
}

public sealed class UploadResult
{
    public int Success { get; set; }
    public List<UploadError> Errors { get; } = new();
    public int Failed => Errors.Count;
}

/// <summary>
/// 엑셀 일괄 업로드 — 기존 DataUploadPage(그리드에 엑셀 붙여넣기 → 컬럼 항목 지정 → 저장) + 임시저장(rt_upload_staging).
/// 행마다 물건/고객 등록 로직(PropertyService/CustomerService.SaveAsync)을 그대로 타므로 검증·이력이 등록창과 같다.
/// </summary>
public sealed class BulkUploadService : ServiceBase
{
    private readonly PropertyService _pt;
    private readonly CustomerService _cust;
    private readonly IDanjiSource? _danji;

    /// <param name="danji">단지 동·호·타입 조회(운영 서버 공용 데이터). null이면 동/호 정규화·타입 자동 채움을 하지 않는다(서버 없는 테스트용)</param>
    public BulkUploadService(SpRunner sp, Func<AppSession> session, IDanjiSource? danji = null) : base(sp, session)
    {
        _pt = new PropertyService(sp, session);
        _cust = new CustomerService(sp, session);
        _danji = danji;
    }

    // ---------------- 컬럼 항목(기존 uploadFields.js) ----------------

    private static IEnumerable<UploadField> G(string group, string pairs) =>
        pairs.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(p => p.Split('=')).Select(a => new UploadField(a[0].Trim(), a[1].Trim(), group));

    // 물건 항목 — 원본 uploadFields.js(2026-10-28 개편: 기본사항에 소재지·면적 통합, 프리미엄/권리금·욕실수(화장실수) 병합, 등록일/수정일 추가)
    public static readonly IReadOnlyList<UploadField> PropertyFields = new[]
    {
        G("기본사항", "ptSts=진행상태; addr1=시도; addr2=시군구; addr3=읍면동; addr4=단지/건물명; addr5=상세주소; jibun=지번; dong=동; ho=호; floor1=해당층; floor2=총층; aptTyp=타입(평형); supArea=공급면적; excArea=전용면적; landShare=대지지분; buildingArea=대지면적; grossArea=연면적; roomCnt=방 수; bathCnt=욕실수(화장실수)"),
        G("금액", "saleDiv=거래구분; saleAmt=매매금액; lesAmt=전세금액; protAmt=보증금(월세); monAmt=월세(차임); etcAmt=기타임대 보증금; etcAmt2=기타임대 차임; loanAmt=대출금액; maintCost=관리비; maintDtl=관리비내역; presaleAmt=분양금액; premiumLayAmt=프리미엄/권리금; rightValueAmt=권리가액; addContribAmt=추가분담금; expansionAmt=확장비; optionAmt=옵션비; facilityCost=시설비; movingCost=이주비; investAmt=투자금; depositTotal=보증금합계; loanTotal=대출합계; currentStatus=현상태; nowDepAmt=현재보증금; nowMonAmt=현재월차임"),
        G("일정", "mtryDate=만기일; exptMovDate=이사예정일; exptDate=잔금예정일; contractDate=계약일자; holdDate=보유(취득)일; permitDate=허가일; regDt=등록일; updDt=수정일"),
        G("거래당사자/상담", "owner1Name=소유자1; owner1Phone=소유자1 연락처; owner2Name=소유자2; owner2Phone=소유자2 연락처; tenant1Name=임차인1; tenant1Phone=임차인1 연락처; tenant2Name=임차인2; tenant2Phone=임차인2 연락처; agent1Name=공인중개사1; agent1Phone=공인중개사1 연락처; agent2Name=공인중개사2; agent2Phone=공인중개사2 연락처; registryOwner=등기명의; contractTenant=계약임차인; ptExpl=물건특징; consultContent=상담내용"),
        G("상세정보", "houseRental=주택임대사업자; contractRenewalRight=계약갱신청구권; businessName=상호명; businessType=업종; recommendedBusiness=추천업종; subType=세부유형; dirStd=방향; dirBase=방향기준; heatMethod=난방방식; heatFuel=난방연료; entrStruct=현관구조; buildingForm=건물형태; buidStruct=건물구조; balcExt=발코니; houseCnt=세대수; pkCnt=총주차대수; evChargerCnt=전기차충전대수; compYear=준공년도; buildingUse=건축물용도; mainBuildingUse=주용도; landCategory=지목; landUse=용도지역; top=탑층여부; opt=옵션; basementFloor=지하층수; groundFloor=지상층수; elevatorCnt=엘리베이터수; stairsCnt=계단수; guestRoomCnt=객실수; cityGas=도시가스; elecCapacity=전기용량; accessRoad=진입도로; communityFacility=커뮤니티시설; officeArea=사무면적; maintZoneName=관리지역명"),
        G("제한사항", "zoneAdjust=청약조정대상지역; zoneOverheat=투기과열지구; zoneSpec=투기지역; zoneLandPermit=토지거래허가구역; childYn=어린이; childCond=어린이 조건; petAllow=반려동물; petCond=반려동물 조건; otherRestrictions=기타제한"),
        G("수익/지출(월·연)", "incRentM=임대수입(월); incRentY=임대수입(년); incMgmtM=관리수입(월); incMgmtY=관리수입(년); incEtcM=기타수입(월); incEtcY=기타수입(년); expLaborM=인건비(월); expLaborY=인건비(년); expUtilM=공과금(월); expUtilY=공과금(년); expLoanM=대출이자(월); expLoanY=대출이자(년); expEtcM=기타지출(월); expEtcY=기타지출(년)"),
        G("종전(재개발/재건축)", "formerPtType=종전 물건유형; formerAptTyp=종전 타입; formerArea=종전 면적; formerDong=종전 동; formerHo=종전 호; formerJibun=종전 지번; formerLandShareRatio=종전 대지지분율"),
    }.SelectMany(x => x).ToList();

    // 거래당사자 칸(소유자/임차인/공인중개사) — 물건 컬럼이 아니라 holders/shares로 간다(기존 PARTY_KEYS)
    private static readonly HashSet<string> PartyKeys = new()
    {
        "owner1Name", "owner1Phone", "owner2Name", "owner2Phone", "tenant1Name", "tenant1Phone", "tenant2Name", "tenant2Phone",
        "agent1Name", "agent1Phone", "agent2Name", "agent2Phone",
    };
    // 거래구분 자동세팅(TRADE_DIVISIONS) — 금액이 들어간 구분을 활성 코드로
    private static readonly (string Code, string[] Amt)[] TradeDivisions =
    {
        ("SALEDIV01", new[] { "sale_amt" }), ("SALEDIV02", new[] { "les_amt" }), ("SALEDIV03", new[] { "prot_amt", "mon_amt" }), ("SALEDIV04", new[] { "etc_amt", "etc_amt2" }),
    };

    public static readonly IReadOnlyList<UploadField> CustomerFields = new[]
    {
        G("기본", "custType=고객구분; alias1=별칭1; alias2=별칭2; buyer1Name=구입자1; buyer2Name=구입자2; buyer1Phone=연락처1; buyer2Phone=연락처2; region1=지역1; region2=지역2; region3=지역3; memo=메모; rentBsnYn=임대사업자여부; trdPrg=진행상태"),
        G("희망 물건", "wantType=희망 물건유형(카테고리); wantSubType=희망 세부유형; wantNm=희망 물건명; trdType=거래유형"),
        G("면적", "excAreaFr=전용면적(최소); excAreaTo=전용면적(최대); landShareFr=대지(최소); landShareTo=대지(최대); landShareRatioFr=대지지분율(최소); landShareRatioTo=대지지분율(최대); grossAreaFr=연면적(최소); grossAreaTo=연면적(최대); areaKind=면적종류; areaUnit=면적단위"),
        G("희망 조건", "moveinYn=입주가능여부; moveDateFr=이사일(시작); moveDateTo=이사일(종료); cashAblt=현금동원력; roomCnt=방 수; bathCnt=욕실 수; parkCnt=주차; communityFac=커뮤니티시설; featureNote=특징; investYn=투자목적; gapInvestYn=갭투자; irrelevantYn=조건무관"),
        G("희망 금액", "saleAmtFr=매매가(최소); saleAmtTo=매매가(최대); lesAmtFr=전세가(최소); lesAmtTo=전세가(최대); protAmtFr=보증금(최소); protAmtTo=보증금(최대); monAmtFr=월세(최소); monAmtTo=월세(최대); etcProtAmtFr=기타임대 보증금(최소); etcProtAmtTo=기타임대 보증금(최대); etcMonAmtFr=기타임대 차임(최소); etcMonAmtTo=기타임대 차임(최대); etcType=기타임대 유형"),
        G("기타", "buildingUse=건축물용도; landUse=용도지역; landCategory=지목; childYn=어린이; childCond=어린이 조건; petAllow=반려동물; petCond=반려동물 조건; bizType=업종; balcExt=발코니; entrStruct=현관구조; buildingForm=건물형태; elevatorCnt=엘리베이터수; stairCnt=계단수; cityGasYn=도시가스; electricYn=전기(단독); elecCapacity=전기용량; accessRoad=진입도로; contractDate=계약일자; holdDate=보유(취득)일; buildPermitPref=건축허가; opt=옵션; rmk=비고; consultContent=상담내용"),
    }.SelectMany(x => x).ToList();

    private static readonly HashSet<string> IntKeys = new()
    {
        "floor1", "floor2", "houseCnt", "roomCnt", "bathCnt", "saleAmt", "lesAmt", "protAmt", "monAmt", "etcAmt", "etcAmt2", "loanAmt", "maintCost", "nowDepAmt", "nowMonAmt",
        "presaleAmt", "premiumAmt", "layAmt", "rightValueAmt", "addContribAmt", "expansionAmt", "optionAmt", "facilityCost", "movingCost", "investAmt", "depositTotal", "loanTotal",
        "incRentM", "incRentY", "incMgmtM", "incMgmtY", "incEtcM", "incEtcY", "expLaborM", "expLaborY", "expUtilM", "expUtilY", "expLoanM", "expLoanY", "expEtcM", "expEtcY",
        "elevatorCnt", "stairsCnt", "evChargerCnt", "guestRoomCnt", "basementFloor", "groundFloor", "toilet",
    };
    private static readonly HashSet<string> DecKeys = new() { "supArea", "excArea", "landShare", "buildingArea", "grossArea", "pkCnt", "officeArea", "formerArea", "formerLandShareRatio" };
    private static readonly HashSet<string> BoolKeys = new() { "zoneAdjust", "zoneOverheat", "zoneSpec", "zoneLandPermit" };
    private static readonly HashSet<string> CustIntKeys = new()
    {
        "custType", "roomCnt", "bathCnt", "parkCnt", "saleAmtFr", "saleAmtTo", "lesAmtFr", "lesAmtTo", "protAmtFr", "protAmtTo", "monAmtFr", "monAmtTo",
        "etcProtAmtFr", "etcProtAmtTo", "etcMonAmtFr", "etcMonAmtTo", "elevatorCnt", "stairCnt",
    };
    private static readonly HashSet<string> CustDecKeys = new() { "excAreaFr", "excAreaTo", "landShareFr", "landShareTo", "grossAreaFr", "grossAreaTo", "landShareRatioFr", "landShareRatioTo" };

    // ---------------- 붙여넣기·변환 ----------------

    /// <summary>엑셀 클립보드(TSV) — 큰따옴표로 감싼 셀 안 줄바꿈/탭을 한 셀로 유지(기존 parseClipboard)</summary>
    public static List<List<string>> ParseClipboard(string raw)
    {
        var s = raw.Replace("\r\n", "\n").Replace('\r', '\n');
        var rows = new List<List<string>>();
        var row = new List<string>();
        var field = new StringBuilder();
        var inQ = false;
        for (int i = 0; i < s.Length; i++)
        {
            var ch = s[i];
            if (inQ)
            {
                if (ch == '"') { if (i + 1 < s.Length && s[i + 1] == '"') { field.Append('"'); i++; } else inQ = false; }
                else field.Append(ch);
            }
            else if (ch == '"' && field.Length == 0) inQ = true;
            else if (ch == '\t') { row.Add(field.ToString()); field.Clear(); }
            else if (ch == '\n') { row.Add(field.ToString()); rows.Add(row); row = new(); field.Clear(); }
            else field.Append(ch);
        }
        row.Add(field.ToString());
        rows.Add(row);
        if (rows.Count > 1 && rows[^1] is [""]) rows.RemoveAt(rows.Count - 1);
        return rows;
    }

    /// <summary>그리드 → 행별 {항목키: 값}. 첫 행(헤더행)과 빈 행은 뺀다. 반환: (그리드 행 번호, 값)</summary>
    public static List<(int RowNo, Dictionary<string, string> Values)> Rows(IReadOnlyList<string?> columns, IReadOnlyList<IReadOnlyList<string?>> grid, bool hasHeaderRow = true)
    {
        var list = new List<(int, Dictionary<string, string>)>();
        for (int r = hasHeaderRow ? 1 : 0; r < grid.Count; r++)
        {
            var raw = new Dictionary<string, string>();
            for (int c = 0; c < columns.Count; c++)
            {
                if (string.IsNullOrEmpty(columns[c])) continue;
                var v = (c < grid[r].Count ? grid[r][c] : null)?.Trim();
                if (!string.IsNullOrEmpty(v)) raw[columns[c]!] = v;
            }
            if (raw.Count > 0) list.Add((r, raw));
        }
        return list;
    }

    /// <summary>전화번호를 010-0000-0000 형식으로(숫자 11/10/8자리), 아니면 원본</summary>
    public static string FormatPhone(string? v)
    {
        var d = new string((v ?? "").Where(char.IsDigit).ToArray());
        return d.Length switch
        {
            0 => "",
            11 => $"{d[..3]}-{d[3..7]}-{d[7..]}",
            10 => $"{d[..3]}-{d[3..6]}-{d[6..]}",
            8 => $"{d[..4]}-{d[4..]}",
            _ => (v ?? "").Trim(),
        };
    }

    public static string Snake(string camel)
    {
        var sb = new StringBuilder();
        foreach (var ch in camel)
        {
            if (char.IsUpper(ch)) sb.Append('_').Append(char.ToLowerInvariant(ch));
            else if (char.IsDigit(ch) && sb.Length > 0 && !char.IsDigit(sb[^1])) sb.Append(ch);
            else sb.Append(ch);
        }
        return sb.ToString();
    }

    private static long? ToInt(string v) => long.TryParse(new string(v.Where(c => char.IsDigit(c) || c == '-').ToArray()), out var n) ? n : null;
    private static double? ToDec(string v) => double.TryParse(new string(v.Where(c => char.IsDigit(c) || c is '.' or '-').ToArray()), NumberStyles.Float, CultureInfo.InvariantCulture, out var n) ? n : null;
    /// <summary>등록일/수정일(과거 데이터 이관용) → 'yyyy-MM-dd HH:mm:ss'. 날짜로 읽을 수 없으면 그 행은 실패(원본은 서버 timestamp 변환 오류)</summary>
    private static string ToDateTime(string v, string label)
    {
        var s = v.Trim().Replace('.', '-').Replace('/', '-');
        var formats = new[] { "yyyy-M-d", "yyyy-M-d H:m", "yyyy-M-d H:m:s", "yyyyMMdd", "yyyy-M-dTH:m:s" };
        if (DateTime.TryParseExact(s, formats, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var dt)
            || DateTime.TryParse(s, CultureInfo.GetCultureInfo("ko-KR"), DateTimeStyles.AllowWhiteSpaces, out dt))
            return dt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
        throw new FormatException($"{label} '{v}' 을(를) 날짜로 읽을 수 없습니다.");
    }

    private static long? ToBool(string v) => v.Trim().ToLowerInvariant() switch
    {
        "y" or "yes" or "true" or "1" or "o" or "예" or "해당" or "가능" => 1,
        "n" or "no" or "false" or "0" or "x" or "아니오" or "불가" or "불가능" => 0,
        _ => null,
    };

    /// <summary>라벨 또는 코드 → 코드(예: '진행중' → PTSTS01). 콤마로 여러 개면 각각</summary>
    public static string Code(string v, IReadOnlyList<Opt> opts) =>
        string.Join(",", v.Split(new[] { ',', '/', '·' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => opts.FirstOrDefault(o => o.Value == x || o.Label == x)?.Value ?? x));

    // ---------------- 행 → 물건/고객 ----------------

    /// <summary>한 행 → 물건(등록창과 같은 PropertyDetail) — 기존 buildPropertyItems</summary>
    public PropertyDetail BuildProperty(Dictionary<string, string> raw, UploadCommon common)
    {
        var d = _pt.New(raw.GetValueOrDefault("ptType") ?? common.PtType);
        d.Holders.Clear();
        var p = d.Pt;
        foreach (var (key, val) in raw)
        {
            if (key is "areaUnit" or "consultContent" or "premiumLayAmt" || PartyKeys.Contains(key)) continue;
            object? v = IntKeys.Contains(key) ? ToInt(val) : DecKeys.Contains(key) ? ToDec(val) : BoolKeys.Contains(key) ? ToBool(val)
                : key == "ptSts" ? Code(val, Catalog.PropertyProgress)
                : key == "saleDiv" ? Code(val, Catalog.SaleDivisions)
                : key is "regDt" or "updDt" ? ToDateTime(val, key == "regDt" ? "등록일" : "수정일")
                : val;
            if (v is not null) p[Snake(key)] = v;
        }
        if (raw.TryGetValue("areaUnit", out var unit)) p["area_unit"] = unit;

        // 프리미엄/권리금(병합 칸) — 분양권·재개발/재건축은 프리미엄(premium_amt), 그 외(상가 등)는 권리금(lay_amt)
        var ptType = raw.GetValueOrDefault("ptType") ?? common.PtType ?? "";
        if (raw.TryGetValue("premiumLayAmt", out var pl) && ToInt(pl) is { } plAmt)
            p[Catalog.SalesRightCodes.Contains(ptType) || Catalog.RedevCodes.Contains(ptType) ? "premium_amt" : "lay_amt"] = plAmt;

        // 욕실수(화장실수) 한 칸 → bath_cnt + toilet 두 컬럼에 같은 값
        if (p.Long("bath_cnt") is { } bath) p["toilet"] = bath.ToString(CultureInfo.InvariantCulture);

        // 거래구분 자동세팅 — 금액이 들어간 구분(매매/전세/월세/기타임대)을 활성 코드로(거래구분 칸보다 우선, 원본과 같음)
        var divs = TradeDivisions.Where(t => t.Amt.Any(a => p.Long(a) is > 0)).Select(t => t.Code).ToList();
        if (divs.Count > 0) p["sale_div"] = string.Join(",", divs);

        var today = LocalDate.Today;
        void Holder(string type, string n, string ph)
        {
            var name = raw.GetValueOrDefault(n)?.Trim() ?? "";
            var phone = FormatPhone(raw.GetValueOrDefault(ph));
            if (name.Length > 0 || phone.Length > 0)
                d.Holders.Add(new Row { ["holder_type"] = type, ["holder_name"] = name, ["holder_phone"] = phone, ["holder_reg_date"] = today });
        }
        Holder("OWNER", "owner1Name", "owner1Phone");
        Holder("OWNER", "owner2Name", "owner2Phone");
        Holder("BUYER", "tenant1Name", "tenant1Phone");
        Holder("BUYER", "tenant2Name", "tenant2Phone");
        foreach (var i in new[] { 1, 2 })
        {
            var name = raw.GetValueOrDefault($"agent{i}Name")?.Trim() ?? "";
            var phone = FormatPhone(raw.GetValueOrDefault($"agent{i}Phone"));
            if (name.Length > 0 || phone.Length > 0) d.Shares.Add(new Row { ["office_name"] = name.Length > 0 ? name : null, ["office_phone"] = phone.Length > 0 ? phone : null });
        }
        AddConsult(d.Consults, d.Memos, raw.GetValueOrDefault("consultContent"), d.Holders.Select(h => h.Str("holder_phone")).FirstOrDefault(s => !string.IsNullOrEmpty(s)));

        // 상단 공통 폼(행 값이 있으면 우선)
        if (!p.Has("pt_type") && common.PtType is not null) p["pt_type"] = common.PtType;
        if (!p.Has("bjd_code") && common.BjdCode is not null) p["bjd_code"] = common.BjdCode;
        if (!p.Has("addr1") && common.Addr1 is not null) p["addr1"] = common.Addr1;
        if (!p.Has("addr2") && common.Addr2 is not null) p["addr2"] = common.Addr2;
        if (!p.Has("addr3") && common.Addr3 is not null) p["addr3"] = common.Addr3;
        if (!p.Has("danji_code") && !string.IsNullOrEmpty(common.DanjiCode) && Catalog.ApartmentRelatedCodes.Contains(p.Str("pt_type") ?? "")) p["danji_code"] = common.DanjiCode;
        if (common.PtName?.Trim() is { Length: > 0 } pn)
        {
            if (!p.Has("pt_name")) p["pt_name"] = pn;
            if (!p.Has("addr4")) p["addr4"] = pn;
        }
        if (!p.Has("pt_sts")) p["pt_sts"] = "PTSTS01";
        return d;
    }

    /// <summary>한 행 → 고객 — 기존 buildCustomerItems(별칭 결합, 구입자, 지역 공백 분해, 상담)</summary>
    public CustomerDetail BuildCustomer(Dictionary<string, string> raw)
    {
        var d = _cust.New();
        d.Buyers.Clear();
        d.Shares.Clear();
        var c = d.Cust;
        var special = new HashSet<string> { "alias1", "alias2", "buyer1Name", "buyer1Phone", "buyer2Name", "buyer2Phone", "region1", "region2", "region3", "consultContent" };
        foreach (var (key, val) in raw)
        {
            if (special.Contains(key)) continue;
            object? v = CustIntKeys.Contains(key) && key != "custType" ? ToInt(val) : CustDecKeys.Contains(key) ? ToDec(val)
                : key == "custType" ? (long.TryParse(Code(val, Catalog.CustomerTypes), out var ct) ? ct : null)
                : key == "trdType" ? Code(val, Catalog.CustomerTradeTypes)
                : key == "trdPrg" ? Code(val, Catalog.CustomerProgress)
                : key == "wantType" ? Code(val, Catalog.WantCategories)
                : val;
            if (v is not null) c[Snake(key)] = v;
        }
        var alias = string.Join(" / ", new[] { raw.GetValueOrDefault("alias1"), raw.GetValueOrDefault("alias2") }.Select(x => x?.Trim()).Where(x => !string.IsNullOrEmpty(x)));
        if (alias.Length > 0) c["alias"] = alias;
        foreach (var i in new[] { 1, 2 })
        {
            var name = raw.GetValueOrDefault($"buyer{i}Name")?.Trim() ?? "";
            var phone = FormatPhone(raw.GetValueOrDefault($"buyer{i}Phone"));
            if (name.Length > 0 || phone.Length > 0) d.Buyers.Add(new Row { ["name"] = name.Length > 0 ? name : null, ["tel"] = phone.Length > 0 ? phone : null });
        }
        var first = (raw.GetValueOrDefault("buyer1Name") ?? raw.GetValueOrDefault("buyer2Name") ?? raw.GetValueOrDefault("alias1") ?? "").Trim();
        if (first.Length > 0) c["name"] = first;
        if (raw.TryGetValue("buyer1Phone", out var tel)) c["tel"] = FormatPhone(tel);
        foreach (var rg in new[] { "region1", "region2", "region3" })
        {
            var toks = (raw.GetValueOrDefault(rg) ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (toks.Length == 0) continue;
            d.Areas.Add(new Row { ["addr1"] = toks.Length > 1 ? string.Join(" ", toks[..^1]) : null, ["addr3"] = toks[^1] });
        }
        AddConsult(d.Consults, d.Memos, raw.GetValueOrDefault("consultContent"), d.Buyers.Select(b => b.Str("tel")).FirstOrDefault(s => !string.IsNullOrEmpty(s)));
        return d;
    }

    /// <summary>상담내용(상담일 = 업로드일). 상담은 연락처가 있어야 저장되므로 연락처가 없으면 특징 메모로 남긴다</summary>
    private static void AddConsult(List<Row> consults, List<Row> memos, string? content, string? phone)
    {
        if (string.IsNullOrWhiteSpace(content)) return;
        if (!string.IsNullOrEmpty(phone)) consults.Add(new Row { ["itv_date"] = LocalDate.Today, ["itv_content"] = content.Trim(), ["contact_phone"] = phone });
        else memos.Add(new Row { ["memo_date"] = LocalDate.Today, ["memo_content"] = "[상담] " + content.Trim() });
    }

    // ---------------- 저장 ----------------

    public async Task<UploadResult> UploadPropertiesAsync(IEnumerable<(int RowNo, Dictionary<string, string> Values)> rows, UploadCommon common)
    {
        var res = new UploadResult();
        var cache = new DanjiCache();
        foreach (var (no, raw) in rows)
        {
            try
            {
                var d = BuildProperty(raw, common);
                await ResolveDanjiAsync(d.Pt, cache);
                await _pt.SaveAsync(d);
                res.Success++;
            }
            catch (Exception ex) { res.Errors.Add(new UploadError(no, ex.Message)); }
        }
        return res;
    }

    // ---------------- 단지형: 동/호 정규화 + 타입 자동 채움 ----------------

    /// <summary>한 번 업로드하는 동안 단지별 동·호·타입 목록을 한 번만 조회</summary>
    public sealed class DanjiCache
    {
        internal readonly Dictionary<string, List<Row>> Dongs = new();
        internal readonly Dictionary<string, List<Row>> Hos = new();
        internal readonly Dictionary<string, List<Row>> Areas = new();
    }

    /// <summary>라벨 정규화(공백 제거 + 끝의 동/호 접미사 제거) — '101동'/'101 '/'101'을 같은 것으로 본다</summary>
    public static string CanonLabel(string? s, char suffix)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var t = new string(s.Where(ch => !char.IsWhiteSpace(ch)).ToArray());
        return t.Length > 0 && t[^1] == suffix ? t[..^1] : t;
    }

    /// <summary>
    /// 단지가 있는 물건만: 동·호 명칭을 단지 데이터로 정규화(못 찾으면 그 행 실패)하고, 호가 확인되면
    /// 타입(평형)·공급/전용면적·방 수·욕실수(화장실수)·해당층을 입력이 없는 칸만 채운다.
    /// 원본 서버 BulkInsertProperties(2026-10-28) — danji_ho_new ⟕ danji_area_new(ptp_no)와 같은 결합을 서버 목록 API로 한다.
    /// </summary>
    public async Task ResolveDanjiAsync(Row p, DanjiCache cache)
    {
        if (_danji is null || !int.TryParse(p.Str("danji_code")?.Trim(), out var code)) return;
        var danji = code.ToString(CultureInfo.InvariantCulture);

        long? dongNo = null;
        if (p.Has("dong"))
        {
            if (!cache.Dongs.TryGetValue(danji, out var dongs)) cache.Dongs[danji] = dongs = await _danji.GetDongListAsync(danji);
            var want = CanonLabel(p.Str("dong"), '동');
            var m = dongs.FirstOrDefault(x => want.Length > 0 && CanonLabel(x.Str("dong_name"), '동') == want)
                ?? throw new InvalidOperationException($"동 '{p.Str("dong")}' 을(를) 단지에서 찾을 수 없습니다.");
            p["dong"] = m.Str("dong_name");
            dongNo = m.Long("dong_no");
        }

        if (!p.Has("ho")) return;
        if (dongNo is null) throw new InvalidOperationException("호를 조회하려면 동이 먼저 지정/확인되어야 합니다.");
        var hoKey = $"{danji}|{dongNo}";
        if (!cache.Hos.TryGetValue(hoKey, out var hos)) cache.Hos[hoKey] = hos = await _danji.GetHoListAsync(danji, (int)dongNo.Value);
        var wantHo = CanonLabel(p.Str("ho"), '호');
        var ho = hos.FirstOrDefault(x => wantHo.Length > 0 && CanonLabel(x.Str("ho_name"), '호') == wantHo)
            ?? throw new InvalidOperationException($"호 '{p.Str("ho")}' 을(를) 해당 동에서 찾을 수 없습니다.");
        p["ho"] = ho.Str("ho_name");

        // 타입명·방·화장실은 면적(타입) 목록에서 ptp_no로 찾는다. 호 목록에 방/화장실이 같이 오면 그것을 먼저 쓴다.
        if (!cache.Areas.TryGetValue(danji, out var areas)) cache.Areas[danji] = areas = await _danji.GetAreaListAsync(danji);
        var area = ho.Long("ptp_no") is { } ptp ? areas.FirstOrDefault(a => a.Long("ptp_no") == ptp) : null;
        var room = ho.Long("room_cnt") ?? area?.Long("room_cnt");
        var bath = ho.Long("bathroom_cnt") ?? area?.Long("bathroom_cnt");

        if (!p.Has("apt_typ") && area?.Str("plan_type_name") is { Length: > 0 } typ) p["apt_typ"] = typ;
        if (!p.Has("sup_area") && ho.Dec("sply_spc") is { } sup) p["sup_area"] = Math.Round((double)sup, 2);
        if (!p.Has("exc_area") && ho.Dec("excls_spc") is { } exc) p["exc_area"] = Math.Round((double)exc, 2);
        if (!p.Has("room_cnt") && room is not null) p["room_cnt"] = room;
        if (!p.Has("bath_cnt") && bath is not null) p["bath_cnt"] = bath;
        if (!p.Has("toilet") && bath is not null) p["toilet"] = bath.Value.ToString(CultureInfo.InvariantCulture);
        if (!p.Has("floor1") && int.TryParse(ho.Str("floor")?.Trim(), out var floor)) p["floor1"] = (long)floor;
    }

    public async Task<UploadResult> UploadCustomersAsync(IEnumerable<(int RowNo, Dictionary<string, string> Values)> rows)
    {
        var res = new UploadResult();
        foreach (var (no, raw) in rows)
        {
            try { await _cust.SaveAsync(BuildCustomer(raw)); res.Success++; }
            catch (Exception ex) { res.Errors.Add(new UploadError(no, ex.Message)); }
        }
        return res;
    }

    // ---------------- 임시저장(rt_upload_staging) ----------------

    private static readonly JsonSerializerOptions Json = new() { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    /// <summary>
    /// 지금 그리드 내용을 등록하지 않고 1건으로 임시저장(원본 2026-10-28: 배치 전체 = 임시저장 1건, 상단 공통 폼 함께 보관).
    /// payload = {rows: [{항목키: 값}...], common}. 돌려주는 값: 보관한 행 수
    /// </summary>
    public async Task<int> StageAsync(string target, IEnumerable<Dictionary<string, string>> rows, UploadCommon? common)
    {
        var list = rows.ToList();
        if (list.Count == 0) return 0;
        var payload = JsonSerializer.Serialize(new { rows = list, common }, Json);
        var label = $"{(target == "customer" ? "고객" : "물건")} {list.Count}건";
        await Sp.ExecuteAsync("rt_upload_staging", "INS", P(new { target, payload, label }));
        return list.Count;
    }

    /// <summary>임시저장 목록(최근 순). 각 행에 건수(count)를 붙인다</summary>
    public async Task<List<Row>> StagingAsync(string target)
    {
        var rows = await Sp.QueryRowsAsync("rt_upload_staging", "SEL", P(new { target }));
        foreach (var r in rows) r["count"] = (long)ParsePayload(r.Str("payload")).Rows.Count;
        return rows;
    }

    public Task DeleteStagingAsync(long stagingId) => Sp.ExecuteAsync("rt_upload_staging", "DEL", P(new { staging_id = stagingId }));

    /// <summary>
    /// 선택한 임시저장의 모든 행을 그리드로 불러올 내용으로(원본 loadSelectedIntoGrid). 컬럼 = 등장한 항목만, 항목 정의 순서.
    /// 상단 공통 폼이 복원되면 소재지(시도/시군구/읍면동/단지·건물명) 칸은 빼서 중복을 막는다. 임시저장은 지우지 않는다(원본과 같음).
    /// </summary>
    public (List<string> Columns, List<Dictionary<string, string>> Rows, UploadCommon? Common) LoadStaging(string target, IEnumerable<Row> staged)
    {
        var rows = new List<Dictionary<string, string>>();
        UploadCommon? common = null;
        foreach (var s in staged)
        {
            var (r, c) = ParsePayload(s.Str("payload"));
            rows.AddRange(r);
            if (common is null && c is not null && (c.PtType ?? c.BjdCode ?? c.DanjiCode) is not null) common = c;
        }
        var fields = target == "customer" ? CustomerFields : PropertyFields;
        var valid = fields.Select(f => f.Key).ToHashSet();
        var strip = common is not null ? new HashSet<string> { "addr1", "addr2", "addr3", "addr4" } : new HashSet<string>();
        var flats = rows.Select(r => r.Where(kv => valid.Contains(kv.Key) && !strip.Contains(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value))
                                       .ToDictionary(kv => kv.Key, kv => kv.Value)).ToList();
        var present = flats.SelectMany(f => f.Keys).ToHashSet();
        var cols = fields.Select(f => f.Key).Where(present.Contains).ToList();
        return (cols, flats, common);
    }

    /// <summary>payload → (행들, 공통 폼). 예전 형식(행 1건 = {values, common})도 읽는다</summary>
    public static (List<Dictionary<string, string>> Rows, UploadCommon? Common) ParsePayload(string? payload)
    {
        var rows = new List<Dictionary<string, string>>();
        UploadCommon? common = null;
        if (string.IsNullOrEmpty(payload)) return (rows, common);
        var node = JsonNode.Parse(payload) as JsonObject;
        static Dictionary<string, string> Flat(JsonObject o) =>
            o.Where(kv => kv.Value is JsonValue).ToDictionary(kv => kv.Key, kv => kv.Value!.ToString());
        if (node?["rows"] is JsonArray arr) rows.AddRange(arr.OfType<JsonObject>().Select(Flat));
        else if (node?["values"] is JsonObject v) rows.Add(Flat(v));
        if (node?["common"] is JsonObject c) common = c.Deserialize<UploadCommon>();
        return (rows, common);
    }
}

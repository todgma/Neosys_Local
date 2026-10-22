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
    public string? BjdCode { get; set; }
    public string? Addr1 { get; set; }
    public string? Addr2 { get; set; }
    public string? Addr3 { get; set; }
    public string? DanjiCode { get; set; }
    public string? PtName { get; set; }
}

public sealed record UploadError(int RowNo, string Message);

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

    public BulkUploadService(SpRunner sp, Func<AppSession> session) : base(sp, session)
    {
        _pt = new PropertyService(sp, session);
        _cust = new CustomerService(sp, session);
    }

    // ---------------- 컬럼 항목(기존 uploadFields.js) ----------------

    private static IEnumerable<UploadField> G(string group, string pairs) =>
        pairs.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(p => p.Split('=')).Select(a => new UploadField(a[0].Trim(), a[1].Trim(), group));

    public static readonly IReadOnlyList<UploadField> PropertyFields = new[]
    {
        G("기본", "ptSts=진행상태; saleDiv=거래구분"),
        G("소재지", "addr1=시도; addr2=시군구; addr3=읍면동; addr4=단지/건물명; addr5=상세주소; jibun=지번; dong=동; ho=호; floor1=해당층; floor2=총층"),
        G("면적/타입", "aptTyp=타입(평형); supArea=공급면적; excArea=전용면적; landShare=대지지분; buildingArea=대지면적; grossArea=연면적; houseCnt=세대수; roomCnt=방 수; bathCnt=욕실 수; areaUnit=면적단위"),
        G("상세정보", "subType=세부유형; dirStd=방향; dirBase=방향기준; heatMethod=난방방식; heatFuel=난방연료; entrStruct=현관구조; buildingForm=건물형태; buidStruct=건물구조; balcExt=발코니; pkCnt=총주차대수; evChargerCnt=전기차충전대수; compYear=준공년도; buildingUse=건축물용도; mainBuildingUse=주용도; landCategory=지목; landUse=용도지역; top=탑층여부; opt=옵션; basementFloor=지하층수; groundFloor=지상층수; elevatorCnt=엘리베이터수; stairsCnt=계단수; guestRoomCnt=객실수; toilet=화장실수; cityGas=도시가스; powerReceiving=수전설비; elecCapacity=전기용량; accessRoad=진입도로; roadInfo=도로정보; communityFacility=커뮤니티시설; addrDetail=상세주소; officeArea=사무면적; maintZoneName=관리지역명"),
        G("금액", "saleAmt=매매금액; lesAmt=전세금액; protAmt=보증금(월세); monAmt=월세(차임); etcAmt=기타임대 보증금; etcAmt2=기타임대 차임; loanAmt=대출금액; maintCost=관리비; maintDtl=관리비내역; presaleAmt=분양금액; premiumAmt=프리미엄; layAmt=권리금; rightValueAmt=권리가액; addContribAmt=추가분담금; expansionAmt=확장비; optionAmt=옵션비; facilityCost=시설비; movingCost=이주비; investAmt=투자금; depositTotal=보증금합계; loanTotal=대출합계"),
        G("현상황", "currentStatus=현상태; nowDepAmt=현재보증금; nowMonAmt=현재월차임; houseRental=주택임대사업자; contractRenewalRight=계약갱신청구권"),
        G("일정", "mtryDate=만기일; exptMovDate=이사예정일; exptDate=잔금예정일; contractDate=계약일자; holdDate=보유(취득)일; permitDate=허가일"),
        G("제한사항", "zoneAdjust=청약조정대상지역; zoneOverheat=투기과열지구; zoneSpec=투기지역; zoneLandPermit=토지거래허가구역; childYn=어린이; childCond=어린이 조건; petAllow=반려동물; petCond=반려동물 조건; otherRestrictions=기타제한; buildPermit=건축허가"),
        G("수익/지출(월·연)", "incRentM=임대수입(월); incRentY=임대수입(년); incMgmtM=관리수입(월); incMgmtY=관리수입(년); incEtcM=기타수입(월); incEtcY=기타수입(년); expLaborM=인건비(월); expLaborY=인건비(년); expUtilM=공과금(월); expUtilY=공과금(년); expLoanM=대출이자(월); expLoanY=대출이자(년); expEtcM=기타지출(월); expEtcY=기타지출(년)"),
        G("사업/상가", "businessName=상호명; businessType=업종; registryOwner=등기명의; contractTenant=계약임차인; recommendedBusiness=추천업종"),
        G("종전(재개발/재건축)", "formerPtType=종전 물건유형; formerAptTyp=종전 타입; formerArea=종전 면적; formerDong=종전 동; formerHo=종전 호; formerJibun=종전 지번; formerLandShareRatio=종전 대지지분율"),
        G("특징/상담", "ptExpl=물건특징; consultContent=상담내용"),
        G("거래당사자", "owner1Name=소유자1; owner1Phone=소유자1 연락처; owner2Name=소유자2; owner2Phone=소유자2 연락처; tenant1Name=임차인1; tenant1Phone=임차인1 연락처; tenant2Name=임차인2; tenant2Phone=임차인2 연락처; agent1Name=공인중개사1; agent1Phone=공인중개사1 연락처; agent2Name=공인중개사2; agent2Phone=공인중개사2 연락처"),
    }.SelectMany(x => x).ToList();

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
        var party = new HashSet<string>(PropertyFields.Where(f => f.Group == "거래당사자").Select(f => f.Key));
        foreach (var (key, val) in raw)
        {
            if (key is "areaUnit" or "consultContent" || party.Contains(key)) continue;
            object? v = IntKeys.Contains(key) ? ToInt(val) : DecKeys.Contains(key) ? ToDec(val) : BoolKeys.Contains(key) ? ToBool(val)
                : key == "ptSts" ? Code(val, Catalog.PropertyProgress)
                : key == "saleDiv" ? Code(val, Catalog.SaleDivisions)
                : val;
            if (v is not null) p[Snake(key)] = v;
        }
        if (raw.TryGetValue("areaUnit", out var unit)) p["area_unit"] = unit;

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
        if (!p.Has("danji_code") && !string.IsNullOrEmpty(common.DanjiCode) && Catalog.ApartmentFormCodes.Contains(p.Str("pt_type") ?? "")) p["danji_code"] = common.DanjiCode;
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
        foreach (var (no, raw) in rows)
        {
            try { await _pt.SaveAsync(BuildProperty(raw, common)); res.Success++; }
            catch (Exception ex) { res.Errors.Add(new UploadError(no, ex.Message)); }
        }
        return res;
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

    /// <summary>행을 바로 등록하지 않고 임시저장. payload = {values, common}</summary>
    public async Task<int> StageAsync(string target, IEnumerable<Dictionary<string, string>> rows, UploadCommon? common)
    {
        var n = 0;
        foreach (var raw in rows)
        {
            var payload = JsonSerializer.Serialize(new { values = raw, common }, Json);
            var label = raw.GetValueOrDefault("ptName") ?? common?.PtName ?? raw.GetValueOrDefault("buyer1Name") ?? raw.GetValueOrDefault("addr4") ?? raw.GetValueOrDefault("alias1") ?? "(제목 없음)";
            if (target == "property" && (raw.GetValueOrDefault("dong") ?? raw.GetValueOrDefault("ho")) is not null) label += $" {raw.GetValueOrDefault("dong")} {raw.GetValueOrDefault("ho")}".TrimEnd();
            await Sp.ExecuteAsync("rt_upload_staging", "INS", P(new { target, payload, label }));
            n++;
        }
        return n;
    }

    public Task<List<Row>> StagingAsync(string target) => Sp.QueryRowsAsync("rt_upload_staging", "SEL", P(new { target }));

    public Task DeleteStagingAsync(long stagingId) => Sp.ExecuteAsync("rt_upload_staging", "DEL", P(new { staging_id = stagingId }));

    /// <summary>임시저장 → 확정 등록. 확정을 시도한 행은 성공 여부와 관계없이 임시저장에서 지운다(중복 확정 방지 — 기존과 같음)</summary>
    public async Task<UploadResult> CommitStagingAsync(IEnumerable<Row> staged)
    {
        var total = new UploadResult();
        foreach (var s in staged)
        {
            var id = s.Long("staging_id") ?? 0;
            var (values, common) = ParsePayload(s.Str("payload"));
            var one = s.Str("target") == "customer"
                ? await UploadCustomersAsync(new[] { ((int)id, values) })
                : await UploadPropertiesAsync(new[] { ((int)id, values) }, common);
            total.Success += one.Success;
            total.Errors.AddRange(one.Errors);
            await DeleteStagingAsync(id);
        }
        return total;
    }

    public static (Dictionary<string, string> Values, UploadCommon Common) ParsePayload(string? payload)
    {
        var values = new Dictionary<string, string>();
        var common = new UploadCommon();
        if (string.IsNullOrEmpty(payload)) return (values, common);
        var node = JsonNode.Parse(payload) as JsonObject;
        if (node?["values"] is JsonObject v)
            foreach (var (k, x) in v) if (x is JsonValue jv) values[k] = jv.ToString();
        if (node?["common"] is JsonObject c) common = c.Deserialize<UploadCommon>() ?? common;
        return (values, common);
    }
}

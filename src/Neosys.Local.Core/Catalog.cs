namespace Neosys.Local.Core;

/// <summary>선택 항목(저장값, 표시명)</summary>
public sealed record Opt(string Value, string Label)
{
    public override string ToString() => Label;

    public static IReadOnlyList<Opt> Of(params string[] values) => values.Select(v => new Opt(v, v)).ToList();
    public static IReadOnlyList<Opt> Pairs(params (string Value, string Label)[] pairs) => pairs.Select(p => new Opt(p.Value, p.Label)).ToList();
}

/// <summary>
/// 화면 공통 선택 목록 — 기존 프런트 legacy/front/src/constants/*.js 와 각 화면 상수를 옮긴 것.
/// 저장값은 기존과 같게 유지한다(기존 데이터·서버와 호환).
/// </summary>
public static class Catalog
{
    // ---------------- 물건유형 (constants/propertyTypes.js) ----------------

    /// <summary>물건유형 SYCA 코드 → 이름(목록 표시용, 상가/사무실 통합 라벨 포함)</summary>
    public static readonly IReadOnlyList<Opt> PropertyTypesAll = Opt.Pairs(
        ("SYCA101", "아파트"), ("SYCA102", "오피스텔"), ("SYCA103", "주상복합"), ("SYCA104", "재건축"),
        ("SYCA105", "아파트분양권"), ("SYCA106", "오피스텔분양권"), ("SYCA107", "주상복합 분양권"), ("SYCA108", "건물 | 빌딩"),
        ("SYCA109", "상가 | 사무실"), ("SYCA110", "숙박 | 펜션"), ("SYCA111", "공장 | 창고"), ("SYCA112", "기타"),
        ("SYCA113", "상가 | 사무실"), ("SYCA114", "상가 | 사무실"), ("SYCA115", "토지"), ("SYCA116", "지식산업센터"),
        ("SYCA117", "원투룸"), ("SYCA118", "빌라 | 연립"), ("SYCA119", "단독 | 다가구"), ("SYCA120", "재개발"));

    /// <summary>등록 드롭다운 순서(PROPERTY_TYPE_OPTION_ORDER) — 상가/사무실은 대표코드 SYCA113만</summary>
    public static readonly IReadOnlyList<Opt> PropertyTypes = new[]
    {
        "SYCA101", "SYCA102", "SYCA105", "SYCA104", "SYCA120", "SYCA106", "SYCA117", "SYCA118",
        "SYCA119", "SYCA113", "SYCA116", "SYCA108", "SYCA110", "SYCA111", "SYCA115",
    }.Select(c => PropertyTypesAll.First(o => o.Value == c)).ToList();

    /// <summary>물건 목록 유형 필터 버튼(PROPERTY_TYPE_FILTER_BUTTONS) — 값은 SYCA 코드(복수는 콤마)</summary>
    public static readonly IReadOnlyList<Opt> PropertyTypeFilters = Opt.Pairs(
        ("SYCA101,SYCA103", "아파트"), ("SYCA102", "오피스텔"), ("SYCA105,SYCA107", "아파트분양권"), ("SYCA104", "재건축"),
        ("SYCA120", "재개발"), ("SYCA106", "오피스텔분양권"), ("SYCA117", "원투룸"), ("SYCA118", "빌라 | 연립"),
        ("SYCA119", "단독 | 다가구"), ("SYCA109,SYCA113,SYCA114", "상가 | 사무실"), ("SYCA116", "지식산업센터"),
        ("SYCA108", "건물 | 빌딩"), ("SYCA110", "숙박 | 펜션"), ("SYCA111", "공장 | 창고"), ("SYCA115", "토지"));

    public static readonly IReadOnlySet<string> CommercialOfficeCodes = new HashSet<string> { "SYCA109", "SYCA113", "SYCA114" };
    /// <summary>단지형(아파트 폼) — 단지 선택·동/호·평형 사용</summary>
    public static readonly IReadOnlySet<string> ApartmentFormCodes = new HashSet<string> { "SYCA101", "SYCA102", "SYCA103", "SYCA105", "SYCA106", "SYCA107" };
    public static readonly IReadOnlySet<string> SalesRightCodes = new HashSet<string> { "SYCA105", "SYCA106" };
    public static readonly IReadOnlySet<string> RedevCodes = new HashSet<string> { "SYCA104", "SYCA120" };
    public static readonly IReadOnlySet<string> BuildingCodes = new HashSet<string> { "SYCA108", "SYCA110", "SYCA111" };
    public static readonly IReadOnlySet<string> HousingCodes = new HashSet<string> { "SYCA117", "SYCA118", "SYCA119" };
    public const string LandCode = "SYCA115";
    public const string KnowledgeCode = "SYCA116";

    public static string? PropertyTypeName(string? code) => code is null ? null : PropertyTypesAll.FirstOrDefault(o => o.Value == code)?.Label ?? code;

    /// <summary>물건유형별 세부유형(SUBTYPE_OPTIONS_BY_TYPE)</summary>
    public static IReadOnlyList<Opt> SubTypes(string? ptType) => ptType switch
    {
        "SYCA109" or "SYCA113" or "SYCA114" => Opt.Of("사무실", "오피스텔", "상가건물", "단지내상가", "일반상가", "복합상가"),
        "SYCA102" or "SYCA106" => Opt.Of("업무용", "주거용", "무관"),
        "SYCA108" => Opt.Of("상가 | 사무실", "사옥", "단독 | 다가구", "숙박 | 펜션"),
        "SYCA110" => Opt.Of("호텔", "모텔", "여관 | 여인숙", "생활형숙박시설", "레지던스", "펜션"),
        "SYCA117" => Opt.Of("오피스텔", "단독 | 다가구", "빌라 | 연립", "도시형생활주택", "생활형숙박시설", "기숙사"),
        "SYCA119" => Opt.Of("단독주택", "상가주택", "다가구주택"),
        "SYCA105" => Opt.Of("입주권", "분양권"),
        "SYCA104" or "SYCA120" => Opt.Of("전부", "입주권", "분양권"),
        _ => Array.Empty<Opt>(),
    };

    // ---------------- 거래구분 (constants/tradeDivisions.js) ----------------

    /// <summary>물건 거래구분 sale_div 기본 코드. 상태 접미: ''=활성, S=생각, Y=예정, B=보류</summary>
    public static readonly IReadOnlyList<Opt> SaleDivisions = Opt.Pairs(("SALEDIV01", "매매"), ("SALEDIV02", "전세"), ("SALEDIV03", "월세"), ("SALEDIV04", "기타임대"));
    public static readonly IReadOnlyList<Opt> SaleDivStatus = Opt.Pairs(("", "활성"), ("S", "생각"), ("Y", "예정"), ("B", "보류"));

    /// <summary>sale_div("SALEDIV01,SALEDIV03S") → "매매, 월세(생각)"</summary>
    public static string SaleDivLabel(string? saleDiv)
    {
        var parts = (saleDiv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(code =>
        {
            var div = SaleDivisions.FirstOrDefault(d => code.StartsWith(d.Value, StringComparison.Ordinal));
            if (div is null) return code;
            var suffix = code[div.Value.Length..];
            var st = SaleDivStatus.FirstOrDefault(s => s.Value == suffix);
            return string.IsNullOrEmpty(suffix) || st is null ? div.Label : $"{div.Label}({st.Label})";
        }).ToList();
        return parts.Count == 0 ? "" : string.Join(", ", parts);
    }

    /// <summary>기타임대 세부유형</summary>
    public static readonly IReadOnlyList<Opt> EtcLeaseTypes = Opt.Of("단기임대", "깔세", "년세");

    // ---------------- 물건 상태 ----------------

    /// <summary>물건 진행상태 pt_sts(PropertiesPage 상태 탭) — 진행중/계약/타계/보류</summary>
    public static readonly IReadOnlyList<Opt> PropertyProgress = Opt.Pairs(("PTSTS01", "진행중"), ("PTSTS02", "계약"), ("PTSTS03", "타계"), ("PTSTS04", "보류"));

    /// <summary>현상태(current_status, PropertyFormPageV2)</summary>
    public static readonly IReadOnlyList<Opt> CurrentStatus = Opt.Of("주인거주", "전세", "공실", "월세", "기타임대");

    // ---------------- 고객 (CustomerFormPageV2) ----------------

    public static readonly IReadOnlyList<Opt> CustomerTypes = Opt.Pairs(("1", "소유주"), ("2", "구매자"), ("3", "임차인"));
    public static readonly IReadOnlyList<Opt> CustomerProgress = Opt.Pairs(("TRDPRG01", "진행중"), ("TRDPRG02", "계약"), ("TRDPRG03", "타계"), ("TRDPRG04", "보류"));
    public static readonly IReadOnlyList<Opt> CustomerTradeTypes = Opt.Pairs(("TRDTYP01", "매매"), ("TRDTYP02", "전세"), ("TRDTYP03", "월세"), ("TRDTYP04", "기타임대"));
    /// <summary>구입물건유형 카테고리(want_type). '업무용'은 화면에 '상업용(상가/공장/숙박)'</summary>
    public static readonly IReadOnlyList<Opt> WantCategories = Opt.Pairs(("주거용", "주거용"), ("업무용", "상업용(상가/공장/숙박)"), ("토지", "토지"));

    public static IReadOnlyList<Opt> WantSubTypes(string? cat) => cat switch
    {
        "주거용" => Opt.Of("아파트", "분양권", "입주권", "단독 | 다가구", "빌라 | 연립", "오피스텔", "도시형생활주택", "원투룸"),
        "업무용" => Opt.Of("상가 | 사무실", "건물 | 빌딩", "공장 | 창고", "숙박 | 펜션", "지식산업센터", "오피스텔"),
        _ => Array.Empty<Opt>(),
    };

    // ---------------- 물건 공통 옵션 (constants/propertyOptions.js) ----------------

    public static readonly IReadOnlyList<Opt> HeatMethods = Opt.Of("개별난방", "중앙난방", "지역난방");
    public static readonly IReadOnlyList<Opt> HeatFuels = Opt.Of("도시가스", "기름", "전기", "심야전기");
    public static readonly IReadOnlyList<Opt> EntranceStructs = Opt.Of("계단식", "복도식", "복합식");
    public static readonly IReadOnlyList<Opt> BuildingStructs = Opt.Of("철근콘크리트", "철골", "벽돌", "목조", "기타");
    public static readonly IReadOnlyList<Opt> BuildingForms = Opt.Of("판상형", "타워형");
    public static readonly IReadOnlyList<Opt> Balcony = Opt.Pairs(("Y", "확장"), ("N", "미확장"));
    public static readonly IReadOnlyList<Opt> Directions = Opt.Of("남향", "동향", "서향", "북향", "남동향", "남서향", "북동향", "북서향");
    public static readonly IReadOnlyList<Opt> DirectionBases = Opt.Of("거실기준", "안방기준", "주된출입구");
    public static readonly IReadOnlyList<Opt> RentBusiness = Opt.Pairs(("등록", "등록"), ("미등록", "미등록"), ("예정", "예정"));
    public static readonly IReadOnlyList<Opt> YesNoCond = Opt.Of("있음", "없음", "조건부");
    public static readonly IReadOnlyList<Opt> ChildYn = Opt.Pairs(("Y", "있음"), ("N", "없음"), ("C", "조건부"));
    public static readonly IReadOnlyList<Opt> NeedOrNot = Opt.Of("필요", "무관");
    public static readonly IReadOnlyList<Opt> PermitPref = Opt.Of("필수", "선호", "무관");
    public static readonly IReadOnlyList<Opt> AreaKinds = Opt.Of("공급", "전용");
    public static readonly IReadOnlyList<Opt> AreaUnits = Opt.Of("평", "㎡");
    public static readonly IReadOnlyList<Opt> HolderTypes = Opt.Pairs(("OWNER", "소유자"), ("BUYER", "임차인"));

    /// <summary>건축물용도(constants/buildingUses.js)</summary>
    public static readonly IReadOnlyList<Opt> BuildingUses = Opt.Pairs(
        ("USG01", "단독주택"), ("USG02", "공동주택"), ("USG03", "제1종 근린생활시설"), ("USG04", "제2종 근린생활시설"),
        ("USG05", "문화 및 집회시설"), ("USG06", "종교시설"), ("USG07", "판매시설"), ("USG08", "운수시설"),
        ("USG09", "의료시설"), ("USG10", "교육연구시설"), ("USG11", "노유자시설"), ("USG12", "수련시설"),
        ("USG13", "운동시설"), ("USG14", "업무시설"), ("USG15", "숙박시설"), ("USG16", "위락시설"),
        ("USG17", "공장"), ("USG18", "창고시설"), ("USG19", "위험물 저장 및 처리 시설"), ("USG20", "자동차 관련 시설"),
        ("USG21", "동물 및 식물 관련 시설"), ("USG22", "자원순환 관련 시설"), ("USG23", "교정 및 군사 시설"), ("USG24", "방송통신시설"),
        ("USG25", "발전시설"), ("USG26", "묘지 관련 시설"), ("USG27", "관광 휴게시설"), ("USG28", "장례시설"),
        ("USG29", "야영장 시설"), ("USG30", "미등기건물"), ("USG31", "그 밖에 토지의 정착물"));

    /// <summary>용도지역(constants/landUses.js)</summary>
    public static readonly IReadOnlyList<Opt> LandUses = Opt.Of(
        "제1종전용주거지역", "제2종전용주거지역", "제1종일반주거지역", "제2종일반주거지역", "제3종일반주거지역", "준주거지역",
        "중심상업지역", "일반상업지역", "근린상업지역", "유통상업지역", "전용공업지역", "일반공업지역", "준공업지역",
        "보전녹지지역", "생산녹지지역", "자연녹지지역", "보전관리지역", "생산관리지역", "계획관리지역", "농림지역", "자연환경보전지역");

    /// <summary>지목(constants/landCategories.js)</summary>
    public static readonly IReadOnlyList<Opt> LandCategories = Opt.Of(
        "전", "답", "과수원", "목장용지", "임야", "광천지", "염전", "대", "공장용지", "학교용지", "주차장", "주유소용지", "창고용지",
        "도로", "철도용지", "제방", "하천", "구거", "유지", "양어장", "수도용지", "공원", "체육용지", "유원지", "종교용지", "사적지", "묘지", "잡종지", "기타");

    // ---------------- 협력업체 (constants/partnerCategories.js) ----------------

    public static readonly IReadOnlyList<Opt> PartnerCategories = Opt.Of(
        "중개사무소", "네이버광고", "이사 | 청소", "은행 | 대출상담", "법무 | 세무", "지도 | 평면도", "분양대행사", "시행 | 시공 | 설계",
        "인테리어 | 철거", "변호사 | 행정사", "기타", "블로그 | 유튜브 | 인스타그램", "컴퓨터 | 프린터 / 인터넷 | 네트워크",
        "정수기 | 디퓨저 / cc카메라 | 소품", "차 | 음료 | 다과 / 문구 | 명함", "개업인사 / 떡케잌 | 꽃배달");

    // ---------------- 거래관련서식 (constants/tradeForms.js) ----------------

    public static readonly IReadOnlyList<string> TradeForms = new[]
    {
        "계약갱신요구권행사여부확인서", "주택자금조달계획서", "토지자금조달계획서", "주민등록전입세대열람신청서",
        "(주거용)임대차정보제공요청서", "(상가건물용)임대차정보제공요청서", "미납국세 등 열람신청서", "미납지방세 등 열람신청서",
        "임대보증금 일부보증에 대한 임차인동의서", "임대보증금 미가입에 대한 임차인동의서",
    };

    /// <summary>㎡ → 평</summary>
    public static decimal? ToPyeong(decimal? m2) => m2 is null ? null : Math.Round(m2.Value / 3.3058m, 1);
    public static decimal? ToM2(decimal? py) => py is null ? null : Math.Round(py.Value * 3.3058m, 2);
}

using System.Globalization;
using System.Text.Json.Nodes;

namespace Neosys.Local.Core.Services;

// 거래관련서식 11종 — 기존 TaxArrearsViewForm / TaxNationalArrearsViewForm / RentDeposit*ConsentForm / *RentInfoRequestForm /
// ResidentTransferConfirmForm / ContractRenewalConfirmForm / HousingLeaseReportForm / LandFundPlanForm / HousingFundPlanForm.
// doc_kind = '거래관련서식:<서식명>', JSON 키 = 각 서식의 BLANK/_base 키 그대로.
public static partial class ContractDocs
{
    public const string TradeFormPrefix = "거래관련서식:";

    /// <summary>참거짓 키 하나(체크박스 1개)</summary>
    private static DocField Chk(string key, string label) => new() { Key = key, Label = label, Kind = DocFieldKind.Flags, Keys = new[] { key }, Options = new DocOpt[] { "해당" } };

    /// <summary>년/월/일 세 칸</summary>
    private static DocField[] Ymd3(string prefix, string label) => new[] { T($"{prefix}_년", $"{label} 년"), T($"{prefix}_월", $"{label} 월"), T($"{prefix}_일", $"{label} 일") };

    /// <summary>BLANK 키 목록으로 빈 데이터(문자 '', 참거짓 false) — 정의의 모든 입력칸 키를 모은다</summary>
    private static JsonObject BlankOf(IEnumerable<DocSection> sections)
    {
        var o = new JsonObject();
        foreach (var f in sections.SelectMany(s => s.Fields))
            if (f.Kind == DocFieldKind.Flags) foreach (var k in f.Keys) o[k] = false;
            else if (f.Kind == DocFieldKind.Obj) o[f.Key] = new JsonObject();
            else o[f.Key] = "";
        return o;
    }

    private static void Put(JsonObject o, string key, string? value) { if (!string.IsNullOrEmpty(value)) o[key] = value; }

    private static void PutYmd(JsonObject o, string prefix, string today)
    {
        var (y, m, d) = Ymd(today);
        o[$"{prefix}_년"] = y; o[$"{prefix}_월"] = m; o[$"{prefix}_일"] = d;
    }

    /// <summary>서식 정의 + 기본값 보정으로 거래관련서식 1종을 만든다</summary>
    private static DocForm Trade(string name, DocSection[] sections, Action<JsonObject, DocContext>? defaults = null, Func<JsonObject, string?, IEnumerable<string>>? body = null) => new()
    {
        Kind = TradeFormPrefix + name, Title = name, Group = "거래관련서식",
        Create = c =>
        {
            var o = BlankOf(sections);
            defaults?.Invoke(o, c);
            return o;
        },
        Sections = _ => sections,
        PrintBody = body,
    };

    private static IEnumerable<DocForm> TradeForms()
    {
        // ── 미납지방세 등 열람신청서 ──
        yield return Trade("미납지방세 등 열람신청서", new[]
        {
            Sec("임차 구분", ChoiceL("임차구분", "임차 구분", "주택", "상가"), Wide("건물소재지", "건물 소재지")),
            Sec("신청인(임차인)", T("임차인_성명", "성명"), T("임차인_등록번호", "주민(법인)등록번호"), Wide("임차인_주소", "주소"), T("임차인_전화", "전화번호"), T("임차인_휴대", "휴대전화"), T("임차인_이메일", "전자우편")),
            Sec("임대인", T("임대인_성명", "성명"), T("임대인_등록번호", "주민(법인)등록번호"), Wide("임대인_주소", "주소"), T("임대인_전화", "전화번호"), T("임대인_휴대", "휴대전화"), T("임대인_이메일", "전자우편")),
            Sec("신청", Ymd3("신청", "신청").Append(T("신청인", "신청인(서명)")).ToArray()),
            Sec("임대인 동의", Ymd3("동의", "동의").Append(T("동의_임대인", "임대인(서명)")).ToArray()),
        }, (o, c) => TenantLessor(o, c, "신청", "신청인"), (_, _) => new[] { "「지방세징수법」 제6조제1항 및 같은 법 시행령 제7조제1항에 따라 위와 같이 미납지방세 등의 열람을 신청합니다." });

        // ── 미납국세 등 열람신청서 ──
        yield return Trade("미납국세 등 열람신청서", new[]
        {
            Sec("구분", ChoiceL("임차구분", "임차 구분", "주택", "상가"), ChoiceL("동의구분", "임대인 동의", "필요", "불필요"), Wide("건물소재지", "건물 소재지")),
            Sec("신청인(임차인)", T("임차인_성명", "성명"), T("임차인_등록번호", "주민(법인)등록번호"), Wide("임차인_주소", "주소"), T("임차인_전화", "전화번호")),
            Sec("임대인", T("임대인_성명", "성명"), T("임대인_등록번호", "주민(법인)등록번호"), Wide("임대인_주소", "주소"), T("임대인_전화", "전화번호")),
            Sec("임대인 동의", Ymd3("동의", "동의").Append(T("동의_임대인", "임대인(서명)")).ToArray()),
            Sec("신청", Ymd3("신청", "신청").Append(T("신청인", "신청인(서명)")).ToArray()),
        }, (o, c) => { o["동의구분"] = "필요"; TenantLessor(o, c, "신청", "신청인"); }, (_, _) => new[] { "「국세징수법」 제109조제1항 및 같은 법 시행령 제97조제1항에 따라 위와 같이 미납국세 등의 열람을 신청합니다." });

        // ── 임대보증금 일부보증에 대한 임차인동의서 ──
        yield return new DocForm
        {
            Kind = TradeFormPrefix + "임대보증금 일부보증에 대한 임차인동의서", Title = "임대보증금 일부보증에 대한 임차인동의서", Group = "거래관련서식",
            Create = c =>
            {
                var o = BlankOf(RentPartialSections);
                o["사업자구분"] = "개인";
                Put(o, "개인_성명", c.SellerName); Put(o, "주택소재지", c.Address); Put(o, "동의자_성명", c.BuyerName); Put(o, "동의인", c.BuyerName);
                PutYmd(o, "동의", c.Today);
                return o;
            },
            Sections = _ => RentPartialSections,
            PrintBody = (_, _) => new[] { "본인은 위 임대사업자의 임대보증금 일부보증에 대하여 설명을 듣고 이에 동의합니다." },
        };

        // ── 임대보증금 미가입에 대한 임차인동의서 ──
        yield return Trade("임대보증금 미가입에 대한 임차인동의서", new[]
        {
            Sec("임대사업자", T("사업자_성명", "성명(법인명)"), T("사업자_등록번호", "임대사업자 등록번호"), T("사업자_생년월일", "생년월일"), T("사업자_전화", "전화번호")),
            Sec("임대주택", Wide("주택소재지", "주택 소재지"), Wide("계약기간", "계약기간")),
            Sec("최우선변제금", T("지역구분", "지역구분"), T("적용시점", "적용시점(담보물권 설정 시점)"), T("적용금액", "적용금액")),
            Sec("동의 임차인 1", T("동의1_보증금액", "임대보증금"), T("동의1_성명", "성명"), T("동의1_생년월일", "생년월일"), T("동의1_연락처", "연락처")),
            Sec("동의 임차인 2", T("동의2_보증금액", "임대보증금"), T("동의2_성명", "성명"), T("동의2_생년월일", "생년월일"), T("동의2_연락처", "연락처")),
            Sec("동의", Ymd3("동의", "동의").Append(T("동의인", "동의인(서명)")).ToArray()),
        }, (o, c) =>
        {
            Put(o, "사업자_성명", c.SellerName); Put(o, "주택소재지", c.Address); Put(o, "동의1_성명", c.BuyerName); Put(o, "동의인", c.BuyerName);
            PutYmd(o, "동의", c.Today);
        }, (_, _) => new[] { "본인은 위 임대주택의 임대보증금에 대한 보증에 가입하지 않는 것에 동의합니다." });

        // ── (주거용)임대차정보제공요청서 ──
        yield return Trade("(주거용)임대차정보제공요청서", new[]
        {
            Sec("요청인 구분", ChoiceL("요청인구분", "요청인", new DocOpt("이해", "이해관계인"), new DocOpt("계약", "임대차계약을 체결하려는 자")), Wide("이해사유", "이해관계 사유")),
            Sec("요청인", T("요청인_성명", "성명"), T("요청인_등록번호", "주민(법인)등록번호"), Wide("요청인_주소", "주소"), T("요청인_휴대", "휴대전화"), T("요청인_주소지전화", "주소지 전화")),
            Sec("요청 내용", Wide("목적물", "임대차 목적물"), T("요청기간", "요청 기간"),
                Chk("정보_일반", "일반 정보(확정일자 부여일·차임·보증금·기간)"), Chk("정보_특정", "특정 임차인 정보"), T("특정_임차인", "특정 임차인"),
                Chk("정보_임대임차", "임대인·임차인 정보"), T("임대임차_임차인", "임차인"), Chk("정보_갱신거절", "갱신 거절 통지 정보"),
                Chk("열람", "열람"), T("출력물", "출력물(부수)")),
            Sec("신청", Ymd3("신청", "신청").Concat(new[] { T("신청인_성명", "신청인 성명"), T("신청인_주민번호", "신청인 주민번호") }).ToArray()),
            Sec("위임(대리 신청 시)", Ymd3("위임", "위임").Concat(new[] { T("위임자", "위임자"), T("수임_성명", "수임자 성명"), T("수임_주민번호", "수임자 주민번호"), T("수임_관계", "관계"), T("수임_전화", "전화") }).ToArray()),
        }, (o, c) =>
        {
            o["요청인구분"] = "이해"; o["정보_일반"] = true; o["열람"] = true;
            Put(o, "요청인_성명", c.BuyerName); Put(o, "요청인_주소", c.BuyerAddr); Put(o, "요청인_휴대", c.BuyerTel); Put(o, "목적물", c.Address); Put(o, "신청인_성명", c.BuyerName);
            PutYmd(o, "신청", c.Today);
        }, (_, _) => new[] { "「주택임대차보호법」 제3조의6 및 같은 법 시행령 제5조에 따라 위와 같이 임대차 정보의 제공을 요청합니다." });

        // ── (상가건물용)임대차정보제공요청서 ──
        yield return Trade("(상가건물용)임대차정보제공요청서", new[]
        {
            Sec("요청인 구분", ChoiceL("요청인구분", "요청인", new DocOpt("이해", "이해관계인"), new DocOpt("계약", "임대차계약을 체결하려는 자")), Wide("이해사유", "이해관계 사유")),
            Sec("요청인", T("요청인_성명", "성명"), T("요청인_등록번호", "주민(법인)등록번호"), T("요청인_사업자번호", "사업자등록번호"), Wide("요청인_주소", "주소"),
                T("요청인_휴대", "휴대전화"), T("요청인_주소지전화", "주소지 전화"), T("요청인_사업장전화", "사업장 전화")),
            Sec("요청 내용", Wide("목적물", "임대차 목적물"), T("특정표지", "특정 표지(층·호 등)"), T("요청기간", "요청 기간"),
                Chk("정보_일반", "일반 정보"), Chk("정보_특정", "특정 임차인 정보"), T("특정_임차인", "특정 임차인"),
                Chk("정보_임대임차", "임대인·임차인 정보"), T("임대임차_임차인", "임차인"), Chk("열람", "열람"), T("출력물", "출력물(부수)")),
            Sec("제출", T("세무서명", "세무서장"), T("요청인성명하단", "요청인(서명)")),
            Sec("위임(대리 신청 시)", Ymd3("위임", "위임").Concat(new[] { T("위임자", "위임자"), T("수임_성명", "수임자 성명"), T("수임_주민번호", "수임자 주민번호"), T("수임_관계", "관계"), T("수임_전화", "전화") }).ToArray()),
            Sec("임대인 동의(계약 체결 예정자 요청 시)", Ymd3("동의", "동의").Concat(new[]
            {
                T("임대인동의서명", "임대인(서명)"), T("임대인_성명", "임대인 성명"), T("임대인_등록번호", "임대인 등록번호"), T("임대인_전화", "임대인 전화"),
                T("계약자_성명", "계약 체결 예정자 성명"), T("계약자_등록번호", "계약 체결 예정자 등록번호"), T("계약자_전화", "계약 체결 예정자 전화"),
            }).ToArray()),
        }, (o, c) =>
        {
            o["요청인구분"] = "이해"; o["정보_일반"] = true; o["열람"] = true;
            Put(o, "요청인_성명", c.BuyerName); Put(o, "요청인_주소", c.BuyerAddr); Put(o, "요청인_휴대", c.BuyerTel); Put(o, "목적물", c.Address);
            Put(o, "요청인성명하단", c.BuyerName); Put(o, "임대인_성명", c.SellerName);
        }, (_, _) => new[] { "「상가건물 임대차보호법」 제4조 및 같은 법 시행령 제3조의2에 따라 위와 같이 임대차 정보의 제공을 요청합니다." });

        // ── 주민등록전입세대열람신청서 ──
        yield return Trade("주민등록전입세대열람신청서", new[]
        {
            Sec("신청 구분", Chk("신청_열람", "열람"), Chk("신청_교부", "교부")),
            Sec("신청인(개인)", T("개인_성명", "성명"), T("개인_주민번호", "주민등록번호"), Wide("개인_주소", "주소"), T("개인_연락처", "연락처")),
            Sec("신청인(법인)", T("법인_명칭", "명칭"), T("법인_사업자번호", "사업자등록번호"), T("법인_대표자", "대표자"), T("법인_연락처", "연락처"), Wide("법인_소재지", "소재지")),
            Sec("방문자", T("방문자_성명", "성명"), T("방문자_주민번호", "주민등록번호"), T("방문자_연락처", "연락처")),
            Sec("열람 대상", Wide("대상소재지", "열람 대상 물건 소재지"), ChoiceL("말소표시", "말소자 표시", "표시됨", "표시안됨"), Wide("용도목적", "용도 및 목적")),
            Sec("신청", Ymd3("신청", "신청").Append(T("동의신청인", "신청인(서명)")).ToArray()),
            Sec("위임(위임자)", Ymd3("위임", "위임").Concat(new[]
            {
                T("위임개인_성명", "개인 성명"), T("위임개인_주민번호", "개인 주민번호"), Wide("위임개인_주소", "개인 주소"), T("위임개인_연락처", "개인 연락처"),
                T("위임법인_명칭", "법인 명칭"), T("위임법인_사업자번호", "법인 사업자번호"), T("위임법인_대표자", "법인 대표자"), T("위임법인_연락처", "법인 연락처"), Wide("위임법인_소재지", "법인 소재지"),
            }).ToArray()),
        }, (o, c) =>
        {
            o["신청_열람"] = true; o["말소표시"] = "표시안됨";
            Put(o, "개인_성명", c.BuyerName); Put(o, "개인_주소", c.BuyerAddr); Put(o, "개인_연락처", c.BuyerTel); Put(o, "대상소재지", c.Address); Put(o, "동의신청인", c.BuyerName);
            PutYmd(o, "신청", c.Today);
        }, (_, _) => new[] { "「주민등록법 시행령」 제47조에 따라 위와 같이 전입세대 열람(교부)을 신청합니다." });

        // ── 계약갱신요구권행사여부확인서 ──
        yield return Trade("계약갱신요구권행사여부확인서", new[]
        {
            Sec("임차인", T("성명", "성명"), T("주민번호", "주민등록번호"), Wide("주소", "주소")),
            Sec("임대차", Wide("목적물", "임대차 목적물"), Date("임대차_시작", "임대차 시작"), Date("임대차_종료", "임대차 종료")),
            Sec("계약갱신요구권 행사 여부",
                ChoiceL("행사여부", "행사 여부", new DocOpt("기행사", "이미 행사함"), new DocOpt("행사", "행사함"), new DocOpt("불행사", "행사하지 않음"), new DocOpt("미결정", "결정하지 않음"), new DocOpt("해당없음", "해당 없음")),
                Date("기행사_시작", "기행사 갱신 시작"), Date("기행사_종료", "기행사 갱신 종료"),
                Date("갱신_시작", "갱신 시작"), Date("갱신_종료", "갱신 종료"), T("불행사_확인자", "불행사 확인자"), T("첨부부수", "첨부 부수")),
            Sec("확인", Ymd3("확인", "확인").Append(T("확인자", "확인자(서명)")).ToArray()),
        }, (o, c) =>
        {
            o["행사여부"] = "기행사";
            Put(o, "성명", c.BuyerName); Put(o, "주소", c.BuyerAddr); Put(o, "목적물", c.Address); Put(o, "확인자", c.BuyerName);
            PutYmd(o, "확인", c.Today);
        }, (_, _) => new[] { "본인은 위 임대차 목적물에 관한 계약갱신요구권 행사 여부를 위와 같이 확인합니다." });

        // ── 주택임대차계약신고서 ──
        yield return Trade("주택임대차계약신고서", new[]
        {
            Sec("① 임대인", T("lessorNm", "성명(법인명)"), T("lessorRrn", "주민(법인)등록번호"), Wide("lessorAddr", "주소"), T("lessorTel", "전화번호"), T("lessorMobile", "휴대전화")),
            Sec("② 임차인", T("lesseeNm", "성명(법인명)"), T("lesseeRrn", "주민(법인)등록번호"), Wide("lesseeAddr", "주소"), T("lesseeTel", "전화번호"), T("lesseeMobile", "휴대전화")),
            Sec("③ 임대 목적물",
                ChoiceL("objKind", "주택 유형", "아파트", "연립", "다세대", "단독", "다가구", "오피스텔", "고시원", "그 밖의 주거용"),
                Wide("objAddr", "소재지"), T("objBldg", "건물명"), T("objDong", "동"), T("objFloor", "층"), T("objHo", "호"), T("objArea", "임대 면적(㎡)"), T("objRooms", "방의 수")),
            Sec("임대 계약내용", ChoiceL("kind", "계약 구분", new DocOpt("new", "신규계약"), new DocOpt("renew", "갱신계약"))),
            Sec("⑥ 신규계약", Amt("newDeposit", "보증금(원)"), Amt("newRent", "월차임(원)"), Date("newStart", "계약 시작"), Date("newEnd", "계약 종료"), Date("newSigned", "체결일")),
            Sec("⑦ 갱신계약", Amt("prevDeposit", "종전 보증금(원)"), Amt("prevRent", "종전 월차임(원)"), Amt("renewDeposit", "갱신 보증금(원)"), Amt("renewRent", "갱신 월차임(원)"),
                Date("renewStart", "계약 시작"), Date("renewEnd", "계약 종료"), Date("renewSigned", "체결일")),
            Sec("⑧ 계약갱신요구권", ChoiceL("renewalRight", "행사 여부", "행사", "미행사")),
            Sec("개업공인중개사", T("agA_nm", "사무소 명칭"), T("agA_rep", "대표자"), Wide("agA_addr", "소재지"), T("agA_reg", "등록번호"), T("agA_tel", "전화번호"), T("agA_assoc", "소속공인중개사"),
                T("agB_nm", "(공동) 사무소 명칭"), T("agB_rep", "(공동) 대표자"), Wide("agB_addr", "(공동) 소재지"), T("agB_reg", "(공동) 등록번호"), T("agB_tel", "(공동) 전화번호"), T("agB_assoc", "(공동) 소속공인중개사")),
            Sec("신고", T("reportY", "신고 년"), T("reportM", "신고 월"), T("reportD", "신고 일"), T("signLessor", "임대인(서명)"), T("signLessee", "임차인(서명)"), T("signSubmit", "제출인(서명)")),
        }, (o, c) =>
        {
            Put(o, "lessorNm", c.SellerName); Put(o, "lessorAddr", c.SellerAddr); Put(o, "lessorMobile", c.SellerTel);
            Put(o, "lesseeNm", c.BuyerName); Put(o, "lesseeAddr", c.BuyerAddr); Put(o, "lesseeMobile", c.BuyerTel);
            Put(o, "objAddr", c.Address);
            Put(o, "agA_nm", c.OffNm); Put(o, "agA_rep", c.RpsNm); Put(o, "agA_addr", c.OffAddr); Put(o, "agA_reg", c.RegNo); Put(o, "agA_tel", c.OffTel); Put(o, "agA_assoc", c.RtNm);
            var (y, m, d) = Ymd(c.Today);
            o["reportY"] = y; o["reportM"] = m; o["reportD"] = d;
        }, (_, _) => new[] { "「부동산 거래신고 등에 관한 법률」 제6조의2 및 같은 법 시행규칙 제6조의2에 따라 위와 같이 주택 임대차 계약 내용을 신고합니다." });

        yield return LandFundPlan();
        yield return HousingFundPlan();
    }

    /// <summary>임차인 = 매수인(취득) 칸, 임대인 = 매도인 칸으로 채운다(세금 열람신청서)</summary>
    private static void TenantLessor(JsonObject o, DocContext c, string ymd, string applicantKey)
    {
        o["임차구분"] = c.PtType is "상가" or "사무실" or "공장" ? "상가" : "주택";
        Put(o, "임차인_성명", c.BuyerName); Put(o, "임차인_주소", c.BuyerAddr); Put(o, "임차인_전화", c.BuyerTel);
        Put(o, "임대인_성명", c.SellerName); Put(o, "임대인_주소", c.SellerAddr); Put(o, "임대인_전화", c.SellerTel);
        Put(o, "건물소재지", c.Address); Put(o, applicantKey, c.BuyerName);
        PutYmd(o, ymd, c.Today);
    }

    /// <summary>보증대상 금액 = 담보권(a) + 임대보증(b) − 주택가격 60%(c)</summary>
    public static decimal RentPartialTarget(JsonObject d) =>
        DocJson.Num(DocJson.Str(d, "담보권a")) + DocJson.Num(DocJson.Str(d, "임대보증b")) - DocJson.Num(DocJson.Str(d, "주택60c"));

    private static readonly DocSection[] RentPartialSections =
    {
        Sec("임대사업자", ChoiceL("사업자구분", "구분", new DocOpt("개인", "개인사업자"), new DocOpt("법인", "법인사업자")),
            T("개인_성명", "성명"), T("개인_생년월일", "생년월일"), T("법인_법인명", "법인명"), T("법인_법인등록번호", "법인등록번호"),
            Wide("사업자_주소", "주소"), T("사업자_전화", "전화번호"), T("사업자_휴대", "휴대전화")),
        new DocSection
        {
            Title = "임대주택·보증대상",
            Fields = new[]
            {
                Wide("주택소재지", "주택 소재지"), Date("계약시작", "계약 시작"), Date("계약종료", "계약 종료"), T("임대보증금", "임대보증금"),
                T("담보권a", "담보권 설정금액(a)"), T("임대보증b", "임대보증금(b)"), T("주택60c", "주택가격의 60%(c)"),
            },
            Lines = new[] { new DocLine("보증대상 금액(a+b−c)", d => DocJson.Won(RentPartialTarget(d))) },
        },
        Sec("동의 임차인", T("동의자_성명", "성명"), T("동의자_생년월일", "생년월일"), T("동의자_연락처", "연락처"),
            ChoiceL("확인1", "확인 1", "예", "아니오"), ChoiceL("확인2", "확인 2", "예", "아니오", "미가입"), ChoiceL("확인3", "확인 3", "예", "아니오", "미가입")),
        Sec("동의", T("동의_년", "동의 년"), T("동의_월", "동의 월"), T("동의_일", "동의 일"), T("동의인", "동의인(서명)")),
    };

    // ---------------- 자금조달계획서(토지/주택) ----------------

    private static decimal N(JsonObject d, params string[] keys) => keys.Sum(k => DocJson.Num(DocJson.Str(d, k)));

    /// <summary>토지: ⑧ 자기자금 소계, ⑫ 차입금 합계, ⑬ 합계 — 기존 LandFundPlanForm sums</summary>
    public static (decimal V8, decimal V12, decimal V13) LandFundSums(JsonObject d)
    {
        var v8 = N(d, "depositAmt", "stockBondAmt", "cryptoAmt", "giftAmt", "inheritAmt", "cashEtcAmt", "houseLandAmt", "etcRealtyAmt", "landCompAmt");
        var v12 = N(d, "landMortgageAmt", "creditAmt", "overseasLoanAmt", "otherLoanAmt", "otherBorrowAmt");
        return (v8, v12, v8 + v12);
    }

    /// <summary>주택: ⑦ 자기자금 소계, ⑫ 차입금 합계, ⑬ 합계 — 기존 HousingFundPlanForm sums</summary>
    public static (decimal V7, decimal V12, decimal V13) HousingFundSums(JsonObject d)
    {
        var v7 = N(d, "depositAmt", "stockBondAmt", "cryptoAmt", "giftAmt", "inheritAmt", "cashEtcAmt", "houseLandAmt", "rentDepAmt", "etc6Amt");
        var v12 = N(d, "mortgageAmt", "creditAmt", "bizAmt", "overseasLoanAmt", "otherLoanAmt", "acqRentDeposit", "companyAmt", "privateBondAmt", "otherBorrowAmt");
        return (v7, v12, v7 + v12);
    }

    private static DocSection[] FundCommon() => new[]
    {
        Sec("제출인(매수인)", T("buyerName", "성명(법인명)"), T("buyerRegNo", "주민(법인)등록번호"), Wide("buyerAddr", "주소(법인소재지)"), T("buyerPhone", "전화번호")),
        Sec("자기자금 — 금융기관 예금·주식·증여", Amt("depositAmt", "② 금융기관 예금액"), T("overseasBankName", "해외 금융기관명"), Amt("overseasAmt", "해외 송금액"),
            Chk("chkStock", "주식·채권"), Amt("stockBondAmt", "주식·채권 매각대금"), Chk("chkCrypto", "가상화폐"), Amt("cryptoAmt", "가상화폐 매각대금"),
            Chk("chkGift", "증여"), Amt("giftAmt", "증여액"), T("giftTax", "증여세 신고액"), Chk("chkInherit", "상속"), Amt("inheritAmt", "상속액"), T("inheritTax", "상속세 신고액"),
            Chk("rel4Spouse", "제공자: 부부"), Chk("rel4Lineal", "제공자: 직계존비속"), T("rel4LinealText", "직계존비속 관계"), Chk("rel4Other", "제공자: 그 밖의 관계"), T("rel4OtherText", "그 밖의 관계")),
        Sec("자기자금 — 현금 등", Amt("cashEtcAmt", "⑤ 현금 등 그 밖의 자금"), Chk("chkForeign", "외국환 반입"), Amt("foreignAmt", "외국환 금액"), T("foreignReport", "외국환 신고"),
            Chk("chkCashHold", "보유 현금"), Chk("chkOtherAsset", "그 밖의 자산"), T("otherAssetType", "자산 종류")),
    };

    private static DocSection[] FundTail(string relNo) => new[]
    {
        Sec($"{relNo} 그 밖의 차입금", Amt("otherBorrowAmt", "그 밖의 차입금"), Chk("rel11Spouse", "제공자: 부부"), Chk("rel11Lineal", "제공자: 직계존비속"), T("rel11LinealText", "직계존비속 관계"),
            Chk("rel11Other", "제공자: 그 밖의 관계"), T("rel11OtherText", "그 밖의 관계")),
        Sec("제출", T("submitY", "제출 년"), T("submitM", "제출 월"), T("submitD", "제출 일"), T("submitterName", "제출인(서명)")),
    };

    private static JsonObject FundDefaults(IEnumerable<DocSection> sections, DocContext c)
    {
        var o = BlankOf(sections);
        Put(o, "buyerName", c.BuyerName); Put(o, "buyerAddr", c.BuyerAddr); Put(o, "submitterName", c.BuyerName);
        var (y, m, d) = Ymd(c.Today);
        o["submitY"] = y; o["submitM"] = m; o["submitD"] = d;
        return o;
    }

    private static DocForm LandFundPlan()
    {
        var sections = FundCommon().Concat(new[]
        {
            Sec("⑥ 부동산 처분대금 · ⑦ 토지보상금", Chk("chkHouseLand", "주택·토지"), Amt("houseLandAmt", "주택·토지 처분대금"), Chk("chkEtcRealty", "그 밖의 부동산"), T("etcRealtyType", "부동산 종류"), Amt("etcRealtyAmt", "그 밖의 부동산 처분대금"),
                Amt("landCompAmt", "⑦ 토지보상금")),
            Sec("⑩ 금융기관 대출액", T("landMortgageBank", "토지담보대출 기관"), Amt("landMortgageAmt", "토지담보대출"), T("creditBank", "신용대출 기관"), Amt("creditAmt", "신용대출"),
                T("overseasLoanBank", "해외 금융기관"), Amt("overseasLoanAmt", "해외 대출"), T("otherLoanType", "그 밖의 대출 종류"), Amt("otherLoanAmt", "그 밖의 대출")),
        }).Concat(FundTail("⑪")).ToArray();
        sections[^1] = new DocSection
        {
            Title = sections[^1].Title, Fields = sections[^1].Fields,
            Lines = new[]
            {
                new DocLine("⑧ 자기자금 소계", d => DocJson.Won(LandFundSums(d).V8) + " 원"),
                new DocLine("⑫ 차입금 등 합계", d => DocJson.Won(LandFundSums(d).V12) + " 원"),
                new DocLine("⑬ 합계", d => DocJson.Won(LandFundSums(d).V13) + " 원"),
            },
        };
        return new DocForm
        {
            Kind = TradeFormPrefix + "토지자금조달계획서", Title = "토지취득자금 조달계획서", Group = "거래관련서식",
            Create = c => FundDefaults(sections, c), Sections = _ => sections,
            PrintBody = (_, _) => new[] { "「부동산 거래신고 등에 관한 법률 시행령」 별표 1 제1호마목에 따라 위와 같이 토지취득자금 조달계획서를 제출합니다." },
        };
    }

    private static DocForm HousingFundPlan()
    {
        var sections = FundCommon().Concat(new[]
        {
            Sec("⑥ 부동산 처분대금 등", Chk("chkHouseLand", "주택·토지"), Amt("houseLandAmt", "주택·토지 처분대금"), Chk("chkRentDep", "기존 임대보증금 회수"), Amt("rentDepAmt", "임대보증금 회수액"),
                Chk("chkEtc6", "그 밖의 처분"), T("etc6Type", "종류"), Amt("etc6Amt", "그 밖의 처분대금")),
            Sec("⑧ 금융기관 대출액", T("mortgageBank", "주택담보대출 기관"), Amt("mortgageAmt", "주택담보대출"), T("creditBank", "신용대출 기관"), Amt("creditAmt", "신용대출"),
                T("bizBank", "사업자대출 기관"), Amt("bizAmt", "사업자대출"), T("overseasLoanBank", "해외 금융기관"), Amt("overseasLoanAmt", "해외 대출"),
                T("otherLoanType", "그 밖의 대출 종류"), Amt("otherLoanAmt", "그 밖의 대출"), ChoiceL("existHousing", "기존 주택 보유", "미보유", "보유"), T("existHousingCount", "보유 주택 수")),
            Sec("⑨ 임대보증금 · ⑩ 회사지원금·사채", Amt("acqRentDeposit", "⑨ 임대보증금"), Chk("chkCompany", "회사지원금"), Amt("companyAmt", "회사지원금"), Chk("chkPrivateBond", "사채"), Amt("privateBondAmt", "사채")),
            Sec("⑭ 조달자금 지급방식", Amt("totalDeal", "총 거래금액"), Amt("transferAmt", "⑮ 계좌이체 금액"), Amt("assumeAmt", "⑯ 보증금·대출 승계 금액"), Amt("cashPayAmt", "⑰ 현금 및 그 밖의 지급"), Wide("payReason", "현금 등 지급 사유")),
            Sec("⑱ 입주 계획", Chk("chkSelfMove", "본인입주"), Chk("chkFamilyMove", "본인 외 가족입주"), T("moveInY", "입주 예정 년"), T("moveInM", "입주 예정 월"), Chk("chkRent", "임대(전·월세)"), Chk("chkOther", "그 밖의 경우")),
        }).Concat(FundTail("⑪")).ToArray();
        sections[^1] = new DocSection
        {
            Title = sections[^1].Title, Fields = sections[^1].Fields,
            Lines = new[]
            {
                new DocLine("⑦ 자기자금 소계", d => DocJson.Won(HousingFundSums(d).V7) + " 원"),
                new DocLine("⑫ 차입금 등 합계", d => DocJson.Won(HousingFundSums(d).V12) + " 원"),
                new DocLine("⑬ 합계", d => DocJson.Won(HousingFundSums(d).V13) + " 원"),
            },
        };
        return new DocForm
        {
            Kind = TradeFormPrefix + "주택자금조달계획서", Title = "주택취득자금 조달 및 입주계획서", Group = "거래관련서식",
            Create = c =>
            {
                var o = FundDefaults(sections, c);
                if (c.AmountWon is { } a) o["totalDeal"] = a.ToString(CultureInfo.InvariantCulture);
                return o;
            },
            Sections = _ => sections,
            PrintBody = (_, _) => new[] { "「부동산 거래신고 등에 관한 법률 시행령」 별표 1 제2호나목에 따라 위와 같이 주택취득자금 조달 및 입주계획서를 제출합니다." },
        };
    }
}

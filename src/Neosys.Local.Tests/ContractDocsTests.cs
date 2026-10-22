using System.Text.Json.Nodes;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>계약 부속문서(contract_document) — doc_kind·JSON 키가 기존 프런트와 같은지, 저장/불러오기·계산값</summary>
public class ContractDocsTests
{
    private static DocContext Ctx() => new()
    {
        Today = "2026-10-19", Category = "sale", PtType = "아파트", TradeType = "매매", Address = "서울 강남구 개포동 1-1",
        SellerName = "박소유", BuyerName = "김구매", AmountWon = 1_850_000_000, OffNm = "네오공인중개사", RpsNm = "홍대표",
        OffAddr = "서울 강남구 역삼동 2", RegNo = "11680-2026-00001", OffTel = "02-555-0000", BizNo = "123-45-67890", RtNm = "이직원",
    };

    [Fact]
    public void 부속문서_종류는_기존_doc_kind와_같다()
    {
        Assert.Equal(new[]
        {
            "가계약문자", "영수증:영수증", "영수증:반환금", "영수증:중개보수", "영수증:위임장", "영수증:영수증1", "영수증:영수증2",
            "정산서:잔금", "정산서:공과금", "준비서면:계약시", "준비서면:잔금시", "확인설명서", "개인정보동의서",
            "거래관련서식:미납지방세 등 열람신청서", "거래관련서식:미납국세 등 열람신청서", "거래관련서식:임대보증금 일부보증에 대한 임차인동의서",
            "거래관련서식:임대보증금 미가입에 대한 임차인동의서", "거래관련서식:(주거용)임대차정보제공요청서", "거래관련서식:(상가건물용)임대차정보제공요청서",
            "거래관련서식:주민등록전입세대열람신청서", "거래관련서식:계약갱신요구권행사여부확인서", "거래관련서식:주택임대차계약신고서",
            "거래관련서식:토지자금조달계획서", "거래관련서식:주택자금조달계획서",
        }, ContractDocs.All.Select(f => f.Kind));
        Assert.Equal("중개보수 영수증", ContractDocs.TitleOf("영수증:중개보수"));
        Assert.Equal("주택임대차계약신고서", ContractDocs.TitleOf("거래관련서식:주택임대차계약신고서"));
    }

    [Theory]
    [InlineData("영수증:영수증", "amountItem,amount,propertyDisplay,issueDate,serialNo")]
    [InlineData("영수증:중개보수", "issueTarget,serialNo,bizNo,officeName,repName,officeAddr,regNo,writeDate,note,target,tradeAmt,fee,vat")]
    [InlineData("영수증:위임장", "serialNo,use,taxNo,officeName,repName,officeAddr,regNo,writeDate,amount,note,rows")]
    [InlineData("정산서:잔금", "tab,shared,tabs")]
    [InlineData("정산서:공과금", "address,mgmtMemo,mgmtFee,gas,elec,water,longRepair,etc,totalNote,etcText,officeName,repName,officePhone,issueDate")]
    [InlineData("개인정보동의서", "보존기간,providers,수집_년,수집_월,수집_일,수집자")]
    [InlineData("거래관련서식:미납지방세 등 열람신청서", "임차구분,임차인_성명,임차인_등록번호,임차인_주소,임차인_전화,임차인_휴대,임차인_이메일,임대인_성명,임대인_등록번호,임대인_주소,임대인_전화,임대인_휴대,임대인_이메일,건물소재지,신청_년,신청_월,신청_일,신청인,동의_년,동의_월,동의_일,동의_임대인")]
    [InlineData("거래관련서식:계약갱신요구권행사여부확인서", "성명,주민번호,주소,목적물,임대차_시작,임대차_종료,행사여부,기행사_시작,기행사_종료,갱신_시작,갱신_종료,불행사_확인자,첨부부수,확인_년,확인_월,확인_일,확인자")]
    [InlineData("거래관련서식:주민등록전입세대열람신청서", "신청_열람,신청_교부,개인_성명,개인_주민번호,개인_주소,개인_연락처,법인_명칭,법인_사업자번호,법인_대표자,법인_연락처,법인_소재지,방문자_성명,방문자_주민번호,방문자_연락처,대상소재지,말소표시,용도목적,신청_년,신청_월,신청_일,동의신청인,위임_년,위임_월,위임_일,위임개인_성명,위임개인_주민번호,위임개인_주소,위임개인_연락처,위임법인_명칭,위임법인_사업자번호,위임법인_대표자,위임법인_연락처,위임법인_소재지")]
    [InlineData("거래관련서식:토지자금조달계획서", "buyerName,buyerRegNo,buyerAddr,buyerPhone,depositAmt,overseasBankName,overseasAmt,chkStock,stockBondAmt,chkCrypto,cryptoAmt,chkGift,giftAmt,giftTax,chkInherit,inheritAmt,inheritTax,rel4Spouse,rel4Lineal,rel4LinealText,rel4Other,rel4OtherText,cashEtcAmt,chkForeign,foreignAmt,foreignReport,chkCashHold,chkOtherAsset,otherAssetType,chkHouseLand,houseLandAmt,chkEtcRealty,etcRealtyType,etcRealtyAmt,landCompAmt,landMortgageBank,landMortgageAmt,creditBank,creditAmt,overseasLoanBank,overseasLoanAmt,otherLoanType,otherLoanAmt,otherBorrowAmt,rel11Spouse,rel11Lineal,rel11LinealText,rel11Other,rel11OtherText,submitY,submitM,submitD,submitterName")]
    [InlineData("준비서면:잔금시", "매도인(개인),매도인(법인),매수인(개인),매수인(법인),임대인(개인),임대인(법인),임차인(개인),임차인(법인)")]
    public void 새_문서의_최상위_키는_기존_base와_같다(string kind, string keys)
    {
        var data = ContractDocs.Find(kind)!.Create(Ctx());
        Assert.Equal(keys.Split(',').OrderBy(k => k), data.Select(kv => kv.Key).OrderBy(k => k));
    }

    [Fact]
    public void 서식의_모든_입력칸과_표는_데이터에_있는_키를_가리킨다()
    {
        foreach (var form in ContractDocs.All)
        {
            var data = ContractDocs.Load(form, Ctx(), null);
            var variants = form.VariantKey is null ? new[] { (string?)null } : ContractDocs.CeTypes.Select(t => (string?)t).ToArray();
            foreach (var v in variants)
            {
                if (v is not null) data[form.VariantKey!] = v;
                foreach (var s in form.Sections(data))
                {
                    foreach (var f in s.Fields)
                    {
                        if (f.Kind == DocFieldKind.Flags)
                            foreach (var k in f.Keys) Assert.True(DocJson.Get(data, k) is JsonValue, $"{form.Kind}/{v}: {k}");
                        else if (f.Kind == DocFieldKind.Obj)
                            Assert.True(DocJson.Get(data, f.Key) is JsonObject, $"{form.Kind}/{v}: {f.Key}");
                        else
                            Assert.True(DocJson.Get(data, f.Key) is JsonValue, $"{form.Kind}/{v}: {f.Key}");
                    }
                    foreach (var t in s.Tables) Assert.True(DocJson.Get(data, t.Path) is JsonArray, $"{form.Kind}: {t.Path}");
                    foreach (var l in s.Lines) l.Value(data);
                }
            }
        }
    }

    [Fact]
    public void 확인설명서_기본값과_종류()
    {
        var form = ContractDocs.Find(ContractDocs.ConfirmKind)!;
        var d = form.Create(Ctx());
        Assert.Equal("주거용", (string?)d[ContractDocs.CeTypeKey]);
        Assert.False((bool)d["신탁_확인"]!);
        Assert.IsType<JsonObject>(d["근거"]);
        Assert.IsType<JsonObject>(d["포함"]);
        Assert.Equal("", (string?)d["소방_소화전"]);     // 비주거용 키도 포함(기존 BLANK 합집합)
        Assert.Equal("", (string?)d["재단목록"]);        // 입목용
        Assert.Equal("서울 강남구 개포동 1-1", (string?)d["토지_소재지"]);
        Assert.Equal("매매교환", (string?)d["거래형태"]);
        Assert.Equal("네오공인중개사", (string?)d["중개사1_명칭"]);
        Assert.Equal("2026", (string?)d["작성_년"]);
        Assert.Equal("1,850,000,000", (string?)d["거래예정금액"]);
        Assert.Equal("토지용", ContractDocs.CeTypeFor("토지", "sale"));
        Assert.Equal("비주거용", ContractDocs.CeTypeFor("상가", "wolse"));
        Assert.Contains(ContractDocs.CeSections("입목용").SelectMany(s => s.Fields), f => f.Key == "입목_종별");
        Assert.Equal("중개대상물 확인ㆍ설명서[Ⅲ] (토지)", form.PrintTitle!(new JsonObject { [ContractDocs.CeTypeKey] = "토지용" }, null));
    }

    [Fact]
    public void 계산값_합계와_한글금액()
    {
        var rows = ContractDocs.BalanceDefaultRows("매매계약");
        ((JsonObject)rows[0]!)["amount"] = "500,000,000";
        ((JsonObject)rows[1]!)["amount"] = "50000000";
        ((JsonObject)rows[5]!)["amount"] = "1000000";      // 대출금 상환액(+)
        Assert.Equal(451_000_000m, ContractDocs.BalanceTotal(rows));
        Assert.Equal("임대보증금 승계", (string?)ContractDocs.BalanceDefaultRows("전세계약")[4]!["item"]);

        var u = ContractDocs.Find("정산서:공과금")!.Create(Ctx());
        u["mgmtFee"] = "120000";
        ((JsonObject)((JsonArray)u["gas"]!)[0]!)["amount"] = "30,000";
        ((JsonArray)u["etc"]!).Add(new JsonObject { ["content"] = "청소비", ["amount"] = "5000" });
        Assert.Equal(155_000m, ContractDocs.UtilityTotal(u));

        Assert.Equal(1_100_000m, ContractDocs.BrokerFeeSum(new JsonObject { ["fee"] = "1000000", ["vat"] = "100000" }));
        Assert.Equal("금 일천만원 정 (10,000,000 원)", ContractDocs.ReceiptAmountText(new JsonObject { ["amount"] = "10000000" }));
        Assert.Equal("", ContractDocs.ReceiptAmountText(new JsonObject { ["amount"] = "" }));
    }

    [Fact]
    public void 거래관련서식_계산값과_기본값()
    {
        var land = ContractDocs.Find("거래관련서식:토지자금조달계획서")!.Create(Ctx());
        Assert.Equal("김구매", (string?)land["buyerName"]);
        Assert.False((bool)land["chkStock"]!);
        land["depositAmt"] = "100,000,000"; land["giftAmt"] = "50000000"; land["landMortgageAmt"] = "200000000"; land["otherBorrowAmt"] = "10000000";
        Assert.Equal((150_000_000m, 210_000_000m, 360_000_000m), ContractDocs.LandFundSums(land));

        var house = ContractDocs.Find("거래관련서식:주택자금조달계획서")!.Create(Ctx());
        Assert.Equal("1850000000", (string?)house["totalDeal"]);
        house["rentDepAmt"] = "30000000"; house["acqRentDeposit"] = "40000000"; house["companyAmt"] = "5000000";
        Assert.Equal((30_000_000m, 45_000_000m, 75_000_000m), ContractDocs.HousingFundSums(house));

        Assert.Equal(70m, ContractDocs.RentPartialTarget(new JsonObject { ["담보권a"] = "50", ["임대보증b"] = "100", ["주택60c"] = "80" }));
        var tax = ContractDocs.Find("거래관련서식:미납국세 등 열람신청서")!.Create(Ctx());
        Assert.Equal("필요", (string?)tax["동의구분"]);
        Assert.Equal("김구매", (string?)tax["임차인_성명"]);
        var report = ContractDocs.Find("거래관련서식:주택임대차계약신고서")!.Create(Ctx());
        Assert.Equal("네오공인중개사", (string?)report["agA_nm"]);
        Assert.Equal("", (string?)report["kind"]);
    }

    [Fact]
    public void 가계약_문자_문구()
    {
        var form = ContractDocs.Find(ContractDocs.PreContractKind)!;
        var d = form.Create(Ctx());
        d["지번"] = "12-3"; d["건물명"] = "개포자이"; d["동"] = "101"; d["호"] = "1203"; d["전용면적"] = "84.9";
        d["가계약금"] = "10000000"; d["가계약금날짜"] = "2026-10-19"; d["잔금"] = "1640000000";
        d["특약추가"] = "현 시설 상태의 계약임."; d["계좌번호"] = "우리 1002-000";
        var text = ContractDocs.PreContractMessage(d, new DateTime(2026, 10, 19));
        Assert.StartsWith("아파트 매매 가계약\n■ 소재지: 서울 강남구 개포동 1-1 12-3 개포자이 101동 1203호\n■ 전용면적: 84.9㎡\n■ 매도인: 박소유\n■ 매수인: 김구매\n", text);
        Assert.Contains("· 매매금액: 1,850,000,000원 (일십팔억오천만원)\n", text);
        Assert.Contains("· 가계약금: 10,000,000원 (일천만원) (2026-10-19)\n", text);
        Assert.DoesNotContain("· 중도금", text);                        // 중도금은 값이 있을 때만
        Assert.Contains("[특약사항]\n현 시설 상태의 계약임.\n", text);
        Assert.Contains("(가계약금 수령 계좌: 우리 1002-000)", text);
        Assert.Contains("2026년 10월 19일\n네오공인중개사공인중개사사무소   대표자: 홍대표\n", text);

        // 저장된 편집본이 없으면 만들고, 있으면 그대로 둔다
        Assert.False(string.IsNullOrEmpty((string?)ContractDocs.Load(form, Ctx(), null)["previewText"]));
        Assert.Equal("직접 고친 문구", (string?)ContractDocs.Load(form, Ctx(), new JsonObject { ["previewText"] = "직접 고친 문구" })["previewText"]);
    }

    [Fact]
    public void 계약서에서_기본값_재료를_만든다()
    {
        var master = new Row
        {
            ["master_id"] = "m1", ["contract_kind"] = "jeonse", ["addr"] = "(임시)",
            ["doc"] = new JsonObject { ["category"] = "jeonse", ["ptType"] = "아파트", ["소재지"] = "서울 송파구 잠실동 1", ["보증금"] = "65000", ["매도인_성명"] = "임대인", ["매수인_성명"] = "임차인", ["매수인_전화"] = "010-1111-2222" }.ToJsonString(),
        };
        var office = new Row { ["OffNm"] = "네오공인중개사", ["RpsNm"] = "홍대표", ["BizNo"] = "123-45-67890" };
        var c = DocContext.From(master, office, new AppSession { RtNm = "이직원" });
        Assert.Equal("전세", c.TradeType);
        Assert.Equal("서울 송파구 잠실동 1", c.Address);
        Assert.Equal(650_000_000, c.AmountWon);           // 입력금액단위 만원 → 원
        Assert.Equal("임대인", c.SellerName);
        Assert.Equal("010-1111-2222", c.BuyerTel);
        Assert.Equal("123-45-67890", c.BizNo);

        var balance = ContractDocs.Find("정산서:잔금")!.Create(c);
        Assert.Equal("전세계약", (string?)balance["tab"]);
        Assert.Equal("임차인", DocJson.Str(balance, "tabs.전세계약.p2Name"));

        var empty = DocContext.From(null, null, null);   // 마스터가 아직 없어도 된다
        Assert.Null(empty.Address);
    }

    [Fact]
    public async Task 부속문서_저장_불러오기_삭제()
    {
        using var t = new TestDb();
        var svc = new ContractService(t.Sp, t.SessionAccessor);
        var id = Guid.NewGuid().ToString();
        var form = ContractDocs.Find("정산서:잔금")!;

        // 마스터 없이 열기 → 기본값, 저장하면 '(임시)' 계약이 생기고 meta(물건유형·거래유형)가 기록된다
        var data = await svc.OpenDocumentAsync(form, id);
        Assert.Equal("매매계약", (string?)data["tab"]);
        DocJson.Set(data, "tabs.매매계약.p1Name", "박소유");
        ((JsonObject)DocJson.Array(data, "tabs.매매계약.rows")[0]!)["amount"] = "300000000";
        data["_legacyExtra"] = "보존";
        await svc.SaveDocumentAsync(id, form.Kind, data, "sale", "아파트", "매매");

        var m = await svc.GetAsync(id);
        Assert.Equal("(임시)", m!.Str("addr"));
        Assert.Equal("아파트", m.Str("doc_type"));
        Assert.Equal("매매", m.Str("trade_type"));

        var raw = await t.Sp.QueryRowAsync("contract_document", "GET", new { master_id = id, doc_kind = form.Kind });
        Assert.Contains("박소유", raw!.Str("data"));     // 한글을 \uXXXX로 바꾸지 않고 저장

        var again = await svc.OpenDocumentAsync(form, id);
        Assert.Equal("박소유", DocJson.Str(again, "tabs.매매계약.p1Name"));
        Assert.Equal("300000000", DocJson.Str((JsonObject)DocJson.Array(again, "tabs.매매계약.rows")[0]!, "amount"));
        Assert.Equal("보존", (string?)again["_legacyExtra"]);   // 정의에 없는 키도 그대로

        await svc.SaveDocumentAsync(id, ContractDocs.PrivacyKind, await svc.OpenDocumentAsync(ContractDocs.Find(ContractDocs.PrivacyKind)!, id));
        Assert.Equal(new[] { ContractDocs.PrivacyKind, form.Kind }.OrderBy(k => k, StringComparer.Ordinal), (await svc.DocumentKindsAsync(id)).OrderBy(k => k, StringComparer.Ordinal));

        await svc.DeleteDocumentAsync(id, form.Kind);
        Assert.Null(await svc.GetDocumentAsync(id, form.Kind));
        Assert.Equal(new[] { ContractDocs.PrivacyKind }, await svc.DocumentKindsAsync(id));
    }

    [Fact]
    public void 특약관리_저장소()
    {
        var path = Path.Combine(Path.GetTempPath(), $"neosys_clause_{Guid.NewGuid():N}.json");
        try
        {
            var store = new SpecialClauseStore(path);
            var s = store.Load();
            Assert.Equal(SpecialClauseStore.Categories, s.Select(kv => kv.Key));
            Assert.Equal(7, ((JsonArray)s["주거용 매매"]!["favorites"]!).Count);
            Assert.Equal("b0", (string?)s["토지매매"]!["basics"]![0]!["id"]);

            s["주거용 매매"]!["favorites"]![0]!["text"] = "자주 쓰는 특약";
            store.Save(s);
            Assert.Equal("자주 쓰는 특약", (string?)new SpecialClauseStore(path).Load()["주거용 매매"]!["favorites"]![0]!["text"]);

            File.WriteAllText(path, "{ 깨진 파일");
            Assert.Equal(5, new SpecialClauseStore(path).Load().Count);   // 손상되면 기본값
        }
        finally { File.Delete(path); }

        Assert.Equal("가\n나", SpecialClauseStore.Join(new[] { " 가 ", "", null, "나" }));
        Assert.Equal("기존\n추가", SpecialClauseStore.Append("기존  \n", "추가"));
        Assert.Equal("추가", SpecialClauseStore.Append(null, " 추가 "));
    }

    [Fact]
    public void JSON_경로()
    {
        var o = new JsonObject();
        DocJson.Set(o, "shared.address", "서울");
        DocJson.Set(o, "근거.TV 수신료", true);
        Assert.Equal("서울", DocJson.Str(o, "shared.address"));
        Assert.True(DocJson.Bool(o, "근거.TV 수신료"));
        Assert.Equal("", DocJson.Str(o, "없는.키"));
        Assert.Equal("1,234,000", DocJson.Comma("1234000원"));
        var merged = DocJson.Merge(new JsonObject { ["a"] = "기본", ["b"] = "기본" }, new JsonObject { ["b"] = "저장" });
        Assert.Equal("기본", (string?)merged["a"]);
        Assert.Equal("저장", (string?)merged["b"]);
    }
}

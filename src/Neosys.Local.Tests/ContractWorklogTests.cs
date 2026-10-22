using System.Text.Json.Nodes;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

public class ContractWorklogTests
{
    [Theory]
    [InlineData(350000000, "삼억오천만")]
    [InlineData(10000, "일만")]
    [InlineData(1234, "일천이백삼십사")]
    [InlineData(100000001, "일억일")]
    [InlineData(0, "")]
    public void 한글금액(long n, string expected) => Assert.Equal(expected, ContractCatalog.Hangul(n));

    [Fact]
    public async Task 계약_서식_저장_복사_삭제()
    {
        using var t = new TestDb();
        var svc = new ContractService(t.Sp, t.SessionAccessor);
        Assert.Equal(12, (await svc.TemplatesAsync()).Count);
        Assert.NotNull(await svc.TemplateBodyAsync("sale"));

        var master = new Row();
        var doc = new JsonObject
        {
            ["docType"] = "아파트매매계약서(단독)", ["category"] = "sale", ["ptType"] = "아파트", ["docHint"] = "매매",
            ["소재지"] = "서울 강남구 개포동 개포자이 101동 1203호", ["매매대금"] = "185000", ["매도인_성명"] = "박소유",
            ["매수인_성명"] = "김구매", ["계약일자"] = "2026-10-19", ["_addParties"] = new JsonArray(new JsonObject { ["label"] = "매도인", ["id"] = 1 }),
        };
        var id = await svc.SaveAsync(master, doc);
        Assert.Equal(id, await svc.SaveAsync(master, doc));   // 같은 id로 수정

        var list = await svc.ListAsync();
        Assert.Single(list);
        var row = list[0];
        Assert.Equal("서울 강남구 개포동 개포자이 101동 1203호", row.Str("addr"));
        Assert.Equal("박소유", row.Str("seller"));
        Assert.Equal("김구매", row.Str("buyer"));
        Assert.Equal(185000, row.Long("amount"));
        Assert.Equal("2026-10-19", row.Str("contract_date"));

        // 배열 값(_addParties)은 그대로 보존
        var loaded = ContractService.ParseDoc((await svc.GetAsync(id))!.Str("doc"));
        Assert.IsType<JsonArray>(loaded["_addParties"]);
        var r = ContractService.DocToRow(loaded);
        r["매수인_성명"] = "최구매";
        ContractService.RowToDoc(r, loaded);
        Assert.Equal("최구매", (string?)loaded["매수인_성명"]);
        Assert.IsType<JsonArray>(loaded["_addParties"]);

        await svc.SaveDocumentAsync(id, "영수증", new JsonObject { ["금액"] = "1000" });
        Assert.Equal(new[] { "영수증" }, await svc.DocumentKindsAsync(id));

        var copy = await svc.CopyAsync(id);
        var c = await svc.GetAsync(copy);
        Assert.StartsWith("(복사) ", c!.Str("addr"));
        Assert.Empty(await svc.DocumentKindsAsync(copy));

        await svc.SetReportDateAsync(id, "20261020");
        Assert.Equal("2026-10-20", (await svc.GetAsync(id))!.Str("report_done_date"));

        await svc.DeleteAsync(copy);
        Assert.Single(await svc.ListAsync());
    }

    [Fact]
    public async Task 부속문서만_저장해도_계약이_생긴다()
    {
        using var t = new TestDb();
        var svc = new ContractService(t.Sp, t.SessionAccessor);
        var id = Guid.NewGuid().ToString();
        await svc.SaveDocumentAsync(id, "가계약문자", new JsonObject { ["본문"] = "가계약" }, "sale");
        var list = await svc.ListAsync();
        Assert.Single(list);
        Assert.Equal("(임시)", list[0].Str("addr"));
        Assert.Equal(1, list[0].Long("has_pre_sms"));
    }

    [Fact]
    public async Task 만기관리()
    {
        using var t = new TestDb();
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        async Task Add(string status, string mtry, string type = "SYCA101")
        {
            var d = pt.New(type);
            d.Pt["bjd_code"] = "1168010300"; d.Pt["current_status"] = status; d.Pt["mtry_date"] = mtry;
            await pt.SaveAsync(d);
        }
        await Add("전세", "2026-11-30");
        await Add("월세", "2027-05-01");
        await Add("주인거주", "2026-11-01");          // 제외(현상태)
        await Add("전세", "2026-11-15", "SYCA108");   // 제외(건물)
        var svc = new ExpiryService(t.Sp, t.SessionAccessor);
        var list = await svc.ListAsync(new DateTime(2026, 10, 1), new DateTime(2026, 12, 31));
        Assert.Single(list);
        Assert.Equal("2026-11-30", list[0].Str("expiry_date"));
        Assert.Equal(2, (await svc.ListAsync(null, null)).Count);
    }

    [Fact]
    public async Task 업무일지_자동집계와_이력()
    {
        using var t = new TestDb();
        // 이력의 사무소 = 작성자 사무소(rt_realtor_info)
        await t.Sp.ExecuteAsync("rt_realtor_info", "UPSERT", new Row { ["rtNo"] = 7L, ["offNo"] = 3L, ["id"] = "tester", ["rtNm"] = "테스터" });
        var cust = new CustomerService(t.Sp, t.SessionAccessor);
        var cd = cust.New(); cd.Cust["name"] = "가"; var no = await cust.SaveAsync(cd);
        cd.Cust["memo"] = "x"; await cust.SaveAsync(cd);
        await cust.DeleteAsync(no);
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var pd = pt.New("SYCA101"); pd.Pt["bjd_code"] = "1"; pd.Holders[0]["holder_name"] = "갑";
        await pt.SaveAsync(pd);

        var svc = new WorklogService(t.Sp, t.SessionAccessor);
        var sum = await svc.SummaryAsync(DateTime.Today);
        Assert.Equal(1, sum.Long("cust_reg"));
        Assert.Equal(1, sum.Long("cust_upd"));
        Assert.Equal(1, sum.Long("cust_del"));   // 삭제도 집계(기존 누락 문제)
        Assert.Equal(1, sum.Long("prop_reg"));

        var act = await svc.ActivityAsync(DateTime.Today);
        Assert.Contains(act, r => r.Str("src") == "pt_sale_holder");   // 사무소 컬럼 없는 테이블도 포함
        Assert.Contains(act, r => r.Str("src") == "ct_cust" && r.Str("log_type") == "D");

        var j = await svc.GetAsync(DateTime.Today);
        j["content"] = "고객 상담";
        await svc.SaveAsync(j, sum);
        await svc.SaveAsync(j, sum);  // 같은 날 다시 저장 = 수정
        var again = await svc.GetAsync(DateTime.Today);
        Assert.Equal("고객 상담", again.Str("content"));
        Assert.Equal(1, again.Long("prop_reg"));
        Assert.Single(await svc.StatusAsync(DateTime.Today.Year, DateTime.Today.Month));
    }
}

public class NeobotTests
{
    [Fact]
    public async Task 통합검색_이름과_전화번호()
    {
        using var t = new TestDb();
        var cust = new CustomerService(t.Sp, t.SessionAccessor);
        var cd = cust.New(); cd.Buyers[0]["name"] = "홍길동"; cd.Buyers[0]["tel"] = "010-5555-6666";
        await cust.SaveAsync(cd);
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var pd = pt.New("SYCA101"); pd.Pt["bjd_code"] = "1"; pd.Pt["addr4"] = "래미안"; pd.Pt["dong"] = "101";
        pd.Holders[0]["holder_name"] = "홍판서"; pd.Holders[0]["holder_phone"] = "010-5555-7777";
        await pt.SaveAsync(pd);
        var ct = new ContractService(t.Sp, t.SessionAccessor);
        await ct.SaveAsync(new Row(), new System.Text.Json.Nodes.JsonObject { ["category"] = "sale", ["소재지"] = "래미안 101동", ["매수인_성명"] = "홍길동" });
        var itv = new InterviewService(t.Sp, t.SessionAccessor);
        var r = itv.New(); r["itv_content"] = "문의"; r["contact_phone"] = "01055556666";
        await itv.SaveAsync(r);

        var svc = new NeobotService(t.Sp, t.SessionAccessor);
        var byName = await svc.SearchAsync("홍");
        Assert.Contains(byName, x => x.Str("kind") == "CUST");
        Assert.Contains(byName, x => x.Str("kind") == "PT");
        Assert.Contains(byName, x => x.Str("kind") == "CT");
        var byPhone = await svc.SearchAsync("5555-6666");
        Assert.Single(byPhone);
        Assert.Equal("CUST", byPhone[0].Str("kind"));
        Assert.Equal("래미안 101동", (await svc.SearchAsync("래미안")).First(x => x.Str("kind") == "PT").Str("addr"));
        // 같은 상담이 고객 쪽에도 복제 저장되지만 검색 결과는 1건
        Assert.Single(await svc.ConsultsAsync("01055556666"));
        Assert.Empty(await svc.SearchAsync("  "));
    }
}

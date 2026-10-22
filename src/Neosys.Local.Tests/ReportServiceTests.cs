using System.Text.Json.Nodes;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>보고서(매물 브리핑) — report / report_cust, 스냅샷·본문 HTML</summary>
public class ReportServiceTests
{
    private static JsonObject Pt(long no, string name, string saleDiv = "SALEDIV01") => new()
    {
        ["ptNo"] = no, ["ptType"] = "SYCA101", ["ptName"] = name, ["addr1"] = "서울특별시", ["addr2"] = "강남구", ["addr3"] = "개포동", ["addr4"] = "개포자이",
        ["saleDiv"] = saleDiv, ["saleAmt"] = 250000, ["protAmt"] = 10000, ["monAmt"] = 300, ["supArea"] = 112.4, ["excArea"] = 84.97,
    };

    [Fact]
    public void 스냅샷_제목_거래구분()
    {
        var snap = ReportService.Snapshot(new Row { ["pt_no"] = 5L, ["sale_amt"] = 250000L, ["exc_area"] = 84.97, ["addr4"] = "개포자이", ["memo"] = null });
        Assert.Equal(5, (long)snap["ptNo"]!);
        Assert.Equal("개포자이", (string?)snap["addr4"]);
        Assert.False(snap.ContainsKey("memo"));
        Assert.Equal("excArea", ReportService.Camel("exc_area"));

        Assert.Equal("개포자이 매물 브리핑", ReportService.AutoTitle(new[] { Pt(1, "a") }));
        Assert.Equal("매물 브리핑 (2건)", ReportService.AutoTitle(new[] { Pt(1, "a"), Pt(2, "b") }));
        Assert.True(ReportService.IsAutoTitle("개포자이 매물 브리핑"));
        Assert.False(ReportService.IsAutoTitle("강남 추천 매물"));

        Assert.Equal(new[] { ("매매", "250,000"), ("월세", "10,000/300") }, ReportService.TradeRows(Pt(1, "a", "SALEDIV01,SALEDIV03")));
        Assert.Equal(new[] { ("-", "-") }, ReportService.TradeRows(Pt(1, "a", "")));

        var json = ReportService.SnapshotJson(new[] { Pt(1, "a"), Pt(2, "b") });
        Assert.Equal(2, ReportService.ParseSnapshot(json).Count);
        Assert.Single(ReportService.ParseSnapshot(ReportService.SnapshotJson(new[] { Pt(1, "a") })));
        Assert.Empty(ReportService.ParseSnapshot("깨진"));
    }

    [Fact]
    public void 본문_HTML()
    {
        var o = new ReportOptions { Title = "개포자이 매물 브리핑", Comment = "추천 <매물>", ChargeName = "이직원", OfficeName = "네오공인중개사", OfficeTel = "02-555-0000", Date = new DateTime(2026, 10, 20) };
        var single = ReportService.BuildHtml(new[] { Pt(1, "a") }, o);
        Assert.Contains("면적 / 금액", single);
        Assert.Contains("250,000 만원", single);
        Assert.Contains("112.4 / 84.97 ㎡", single);
        Assert.Contains("추천 &lt;매물&gt;", single);        // HTML 이스케이프
        Assert.Contains("담당자: 이직원", single);
        Assert.Contains("- 1 / 1 -", single);

        o.Memos[2] = "급매";
        var many = Enumerable.Range(1, 9).Select(i => Pt(i, $"물건{i}")).ToList();
        var multi = ReportService.BuildHtml(many, o);
        Assert.Contains("매물 목록 (9건)", multi);
        Assert.Contains("- 2 / 2 -", multi);                  // 7행씩 쪽 나눔
        Assert.Contains("급매", multi);
        o.Version = "customer";
        Assert.DoesNotContain("급매", ReportService.BuildHtml(many, o));   // 고객용은 메모 칸 비움
    }

    [Fact]
    public async Task 저장_수정_공유_삭제()
    {
        using var t = new TestDb();
        var cust = new CustomerService(t.Sp, t.SessionAccessor);
        var c = cust.New(); c.Cust["name"] = "김고객"; c.Cust["tel"] = "010-1111-2222"; c.Cust["want_type"] = "주거용";
        var custNo = await cust.SaveAsync(c);

        var svc = new ReportService(t.Sp, t.SessionAccessor);
        var no = await svc.SaveAsync(null, 1, "제목", "코멘트", ReportService.SnapshotJson(new[] { Pt(1, "a") }), "<div>본문</div>", new[] { custNo, custNo });
        Assert.True(no > 0);
        var mine = await svc.MineAsync();
        Assert.Single(mine);
        Assert.Equal(1, mine[0].Long("cust_count"));
        Assert.Equal("김고객", mine[0].Str("cust_names"));
        Assert.Single(await svc.ListAsync(new Row { ["q_cust_no"] = custNo }));
        Assert.Single(await svc.ListAsync(new Row { ["q_pt_no"] = 1L }));
        Assert.Empty(await svc.ListAsync(new Row { ["q_pt_no"] = 99L }));

        Assert.Equal(no, await svc.SaveAsync(no, 1, "수정 제목", null, null, "<div>새 본문</div>", Array.Empty<long>()));
        var r = await svc.GetAsync(no);
        Assert.Equal("수정 제목", r!.Str("title"));
        Assert.Equal("<div>새 본문</div>", r.Str("content_html"));
        Assert.Empty(await svc.SharesAsync(no));                  // 수정 시 배포 고객 재구성

        await svc.AttachAsync(no, new[] { custNo });
        var shares = await svc.SharesAsync(no);
        Assert.Equal("010-1111-2222", shares.Single().Str("tel"));

        await svc.DeleteAsync(no);
        Assert.Null(await svc.GetAsync(no));
        Assert.Empty(await svc.SharesAsync(no));
        Assert.Empty(await svc.MineAsync());
    }
}

using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>엑셀 일괄 업로드 — 붙여넣기 파싱, 행 변환, 등록·임시저장 확정</summary>
public class BulkUploadServiceTests
{
    [Fact]
    public void 클립보드_파싱과_행_추출()
    {
        var m = BulkUploadService.ParseClipboard("동\t호\t메모\r\n101\t1203\t\"줄1\n줄2\"\r\n102\t501\t\r\n");
        Assert.Equal(3, m.Count);
        Assert.Equal("줄1\n줄2", m[1][2]);
        var rows = BulkUploadService.Rows(new[] { "dong", "ho", null }, m.Select(r => (IReadOnlyList<string?>)r).ToList());
        Assert.Equal(2, rows.Count);                       // 헤더행 제외
        Assert.Equal(1, rows[0].RowNo);
        Assert.Equal("1203", rows[0].Values["ho"]);
        Assert.False(rows[0].Values.ContainsKey("memo"));  // 항목 미지정 열은 무시

        Assert.Equal("010-1234-5678", BulkUploadService.FormatPhone("01012345678"));
        Assert.Equal("1588-0000", BulkUploadService.FormatPhone("15880000"));
        Assert.Equal("etc_amt2", BulkUploadService.Snake("etcAmt2"));
        Assert.Equal("inc_rent_m", BulkUploadService.Snake("incRentM"));
        Assert.Equal("SALEDIV01,SALEDIV03", BulkUploadService.Code("매매,월세", Neosys.Local.Core.Catalog.SaleDivisions));
    }

    [Fact]
    public async Task 물건_업로드()
    {
        using var t = new TestDb();
        var svc = new BulkUploadService(t.Sp, t.SessionAccessor);
        var common = new UploadCommon { PtType = "SYCA101", BjdCode = "1168010300", Addr1 = "서울특별시", Addr2 = "강남구", Addr3 = "개포동", DanjiCode = "12345", PtName = "개포자이" };
        var rows = new List<(int, Dictionary<string, string>)>
        {
            (1, new() { ["dong"] = "101", ["ho"] = "1203", ["saleDiv"] = "매매", ["saleAmt"] = "250,000", ["excArea"] = "84.97㎡", ["ptSts"] = "진행중",
                        ["owner1Name"] = "박소유", ["owner1Phone"] = "01099990000", ["consultContent"] = "급매 희망", ["zoneAdjust"] = "Y" }),
            (2, new() { ["dong"] = "102", ["ho"] = "501", ["consultContent"] = "연락처 없는 상담" }),
        };
        var res = await svc.UploadPropertiesAsync(rows, common);
        Assert.Equal(2, res.Success);

        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var list = await pt.ListAsync(new Row { ["q_danji_code"] = "12345" });
        Assert.Equal(2, list.Count);
        var d = await pt.GetAsync(list.Single(r => r.Str("ho") == "1203").Long("pt_no")!.Value);
        Assert.Equal("SALEDIV01", d!.Pt.Str("sale_div"));
        Assert.Equal(250000, d.Pt.Long("sale_amt"));
        Assert.Equal("개포자이", d.Pt.Str("addr4"));
        Assert.Equal("010-9999-0000", d.Holders.Single().Str("holder_phone"));
        Assert.Single(d.Consults);
        var d2 = await pt.GetAsync(list.Single(r => r.Str("ho") == "501").Long("pt_no")!.Value);
        Assert.Contains(d2!.Memos, m => m.Str("memo_content") == "[상담] 연락처 없는 상담");   // 연락처 없으면 특징 메모로

        // 소재지(법정동)가 없으면 행 단위로 실패를 돌려준다
        var bad = await svc.UploadPropertiesAsync(new[] { (5, new Dictionary<string, string> { ["dong"] = "1" }) }, new UploadCommon { PtType = "SYCA101" });
        Assert.Equal(5, bad.Errors.Single().RowNo);
    }

    [Fact]
    public async Task 고객_임시저장_확정()
    {
        using var t = new TestDb();
        var svc = new BulkUploadService(t.Sp, t.SessionAccessor);
        var rows = new[]
        {
            new Dictionary<string, string> { ["buyer1Name"] = "김구매", ["buyer1Phone"] = "01011112222", ["trdType"] = "매매", ["wantType"] = "주거용", ["region1"] = "서울특별시 강남구 개포동", ["saleAmtTo"] = "200000" },
            new Dictionary<string, string> { ["alias1"] = "별칭만" },
        };
        Assert.Equal(2, await svc.StageAsync("customer", rows, null));
        var staged = await svc.StagingAsync("customer");
        Assert.Equal(2, staged.Count);
        Assert.Empty(await svc.StagingAsync("property"));

        var res = await svc.CommitStagingAsync(staged);
        Assert.Equal(2, res.Success);
        Assert.Empty(await svc.StagingAsync("customer"));      // 확정한 행은 임시저장에서 삭제

        var cust = new CustomerService(t.Sp, t.SessionAccessor);
        var list = await cust.ListAsync();
        var c = await cust.GetAsync(list.Single(r => r.Str("name") == "김구매").Long("cust_no")!.Value);
        Assert.Equal("TRDTYP01", c!.Cust.Str("trd_type"));
        Assert.Equal(200000, c.Cust.Long("sale_amt_to"));
        Assert.Equal("개포동", c.Areas.Single().Str("addr3"));
        Assert.Equal("010-1111-2222", c.Buyers.Single().Str("tel"));
        Assert.Contains(list, r => r.Str("name") == "별칭만");
    }
}

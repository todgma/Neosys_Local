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

    /// <summary>서버 대신 쓰는 단지 동·호·타입 목록(호출 횟수를 센다)</summary>
    private sealed class FakeDanji : IDanjiSource
    {
        public int Calls;
        public Task<List<Row>> GetDongListAsync(string danjiCode)
        {
            Calls++;
            return Task.FromResult(new List<Row> { new() { ["dong_no"] = 1L, ["dong_name"] = "101" }, new() { ["dong_no"] = 2L, ["dong_name"] = "102" } });
        }
        public Task<List<Row>> GetHoListAsync(string danjiCode, int dongNo)
        {
            Calls++;
            return Task.FromResult(dongNo != 1 ? new List<Row>() : new List<Row>
            {
                new() { ["ho_name"] = "1203", ["ptp_no"] = 2L, ["floor"] = "12", ["sply_spc"] = 112.394, ["excls_spc"] = 84.97 },
                new() { ["ho_name"] = "201", ["ptp_no"] = 9L, ["floor"] = "2", ["sply_spc"] = 59.5, ["excls_spc"] = 45.1 },   // 타입 목록에 없는 ptp
            });
        }
        public Task<List<Row>> GetAreaListAsync(string danjiCode)
        {
            Calls++;
            return Task.FromResult(new List<Row> { new() { ["ptp_no"] = 2L, ["plan_type_name"] = "112A", ["room_cnt"] = 3L, ["bathroom_cnt"] = 2L } });
        }
    }

    [Fact]
    public async Task 단지형_동호_정규화와_타입_자동채움()
    {
        using var t = new TestDb();
        var danji = new FakeDanji();
        var svc = new BulkUploadService(t.Sp, t.SessionAccessor, danji);
        var common = new UploadCommon { PtType = "SYCA101", BjdCode = "1168010300", Addr1 = "서울특별시", Addr2 = "강남구", Addr3 = "개포동", DanjiCode = "12345", PtName = "개포자이" };
        var rows = new List<(int, Dictionary<string, string>)>
        {
            (1, new() { ["dong"] = "101동", ["ho"] = "1203 호", ["saleAmt"] = "250000" }),
            (2, new() { ["dong"] = "101", ["ho"] = "201", ["roomCnt"] = "4", ["floor1"] = "3" }),   // 입력한 칸은 그대로
            (3, new() { ["dong"] = "101", ["ho"] = "999" }),
            (4, new() { ["ho"] = "1203" }),
            (5, new() { ["dong"] = "103" }),
        };
        var res = await svc.UploadPropertiesAsync(rows, common);
        Assert.Equal(2, res.Success);
        Assert.Equal("호 '999' 을(를) 해당 동에서 찾을 수 없습니다.", res.Errors.Single(e => e.RowNo == 3).Message);
        Assert.Equal("호를 조회하려면 동이 먼저 지정/확인되어야 합니다.", res.Errors.Single(e => e.RowNo == 4).Message);
        Assert.Equal("동 '103' 을(를) 단지에서 찾을 수 없습니다.", res.Errors.Single(e => e.RowNo == 5).Message);
        Assert.Equal(3, danji.Calls);   // 동 목록·101동 호 목록·타입 목록을 한 번씩만 조회

        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var list = await pt.ListAsync(new Row { ["q_danji_code"] = "12345" });
        var a = (await pt.GetAsync(list.Single(r => r.Str("ho") == "1203").Long("pt_no")!.Value))!.Pt;
        Assert.Equal("101", a.Str("dong"));               // 정규화된 동·호명으로 저장
        Assert.Equal("112A", a.Str("apt_typ"));
        Assert.Equal(112.39m, a.Dec("sup_area"));
        Assert.Equal(84.97m, a.Dec("exc_area"));
        Assert.Equal(3, a.Long("room_cnt"));
        Assert.Equal(2, a.Long("bath_cnt"));
        Assert.Equal("2", a.Str("toilet"));
        Assert.Equal(12, a.Long("floor1"));

        var b = (await pt.GetAsync(list.Single(r => r.Str("ho") == "201").Long("pt_no")!.Value))!.Pt;
        Assert.Equal(4, b.Long("room_cnt"));
        Assert.Equal(3, b.Long("floor1"));
        Assert.Equal(45.1m, b.Dec("exc_area"));
        Assert.False(b.Has("apt_typ"));                    // 타입 목록에 없으면 타입·욕실은 비워 둔다
        Assert.False(b.Has("bath_cnt"));
    }

    [Fact]
    public async Task 병합칸_거래구분_등록일()
    {
        using var t = new TestDb();
        var svc = new BulkUploadService(t.Sp, t.SessionAccessor);
        var region = new UploadCommon { BjdCode = "1168010300", Addr3 = "개포동" };

        // 분양권은 프리미엄, 상가는 권리금
        var right = svc.BuildProperty(new() { ["premiumLayAmt"] = "3,000" }, new UploadCommon { PtType = "SYCA105" }).Pt;
        Assert.Equal(3000, right.Long("premium_amt"));
        Assert.False(right.Has("lay_amt"));
        var shop = svc.BuildProperty(new() { ["premiumLayAmt"] = "5000", ["bathCnt"] = "2" }, new UploadCommon { PtType = "SYCA113" }).Pt;
        Assert.Equal(5000, shop.Long("lay_amt"));
        Assert.Equal("2", shop.Str("toilet"));             // 욕실수(화장실수) → bath_cnt + toilet

        // 금액이 있으면 거래구분은 금액 기준(거래구분 칸보다 우선)
        var monthly = svc.BuildProperty(new() { ["saleDiv"] = "매매", ["protAmt"] = "1000", ["monAmt"] = "50", ["etcAmt"] = "0" }, new UploadCommon { PtType = "SYCA117" }).Pt;
        Assert.Equal("SALEDIV03", monthly.Str("sale_div"));
        var onlyDiv = svc.BuildProperty(new() { ["saleDiv"] = "전세" }, new UploadCommon { PtType = "SYCA117" }).Pt;
        Assert.Equal("SALEDIV02", onlyDiv.Str("sale_div"));

        // 등록일/수정일(과거 데이터 이관) — 없으면 지금
        region.PtType = "SYCA117";
        var res = await svc.UploadPropertiesAsync(new List<(int, Dictionary<string, string>)>
        {
            (1, new() { ["addr5"] = "과거", ["regDt"] = "2023.05.01", ["updDt"] = "2024-01-02 13:05" }),
            (2, new() { ["addr5"] = "오늘" }),
            (3, new() { ["addr5"] = "오류", ["regDt"] = "어제" }),
        }, region);
        Assert.Equal(2, res.Success);
        Assert.Equal(3, res.Errors.Single().RowNo);
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var list = await pt.ListAsync();
        var old = (await pt.GetAsync(list.Single(r => r.Str("addr5") == "과거").Long("pt_no")!.Value))!.Pt;
        Assert.Equal("2023-05-01 00:00:00", old.Str("reg_dt"));
        Assert.Equal("2024-01-02 13:05:00", old.Str("upd_dt"));
        var now = (await pt.GetAsync(list.Single(r => r.Str("addr5") == "오늘").Long("pt_no")!.Value))!.Pt;
        Assert.StartsWith(DateTime.Today.ToString("yyyy-MM-dd"), now.Str("reg_dt"));
    }

    [Fact]
    public async Task 임시저장_불러오기()
    {
        using var t = new TestDb();
        var svc = new BulkUploadService(t.Sp, t.SessionAccessor);

        // 물건: 그리드 전체가 1건, 공통 폼을 함께 보관 → 불러오면 소재지 칸은 빠지고 항목 정의 순서로 열을 만든다
        var common = new UploadCommon { PtType = "SYCA101", BjdCode = "1168010300", Addr3 = "개포동", DanjiCode = "12345", PtName = "개포자이" };
        var rows = new[]
        {
            new Dictionary<string, string> { ["saleAmt"] = "1", ["dong"] = "101", ["addr4"] = "무시" },
            new Dictionary<string, string> { ["ho"] = "1203", ["dong"] = "102", ["owner1Name"] = "박소유" },
        };
        Assert.Equal(2, await svc.StageAsync("property", rows, common));
        var staged = await svc.StagingAsync("property");
        Assert.Equal("물건 2건", staged.Single().Str("label"));
        Assert.Equal(2, staged.Single().Long("count"));
        Assert.Empty(await svc.StagingAsync("customer"));

        var (cols, loaded, c) = svc.LoadStaging("property", staged);
        Assert.Equal(new[] { "dong", "ho", "saleAmt", "owner1Name" }, cols);
        Assert.Equal(2, loaded.Count);
        Assert.False(loaded[0].ContainsKey("addr4"));
        Assert.Equal("12345", c!.DanjiCode);
        Assert.Single(await svc.StagingAsync("property"));   // 불러와도 임시저장은 남는다(원본과 같음)

        // 예전 형식(행 1건 = {values, common})도 읽는다
        var (oldRows, oldCommon) = BulkUploadService.ParsePayload("{\"values\":{\"dong\":\"101\"},\"common\":{\"PtType\":\"SYCA101\"}}");
        Assert.Equal("101", oldRows.Single()["dong"]);
        Assert.Equal("SYCA101", oldCommon!.PtType);

        // 고객: 불러온 행을 그대로 등록
        var custRows = new[]
        {
            new Dictionary<string, string> { ["buyer1Name"] = "김구매", ["buyer1Phone"] = "01011112222", ["trdType"] = "매매", ["wantType"] = "주거용", ["region1"] = "서울특별시 강남구 개포동", ["saleAmtTo"] = "200000" },
            new Dictionary<string, string> { ["alias1"] = "별칭만" },
        };
        await svc.StageAsync("customer", custRows, null);
        var (_, custLoaded, custCommon) = svc.LoadStaging("customer", await svc.StagingAsync("customer"));
        Assert.Null(custCommon);
        var res = await svc.UploadCustomersAsync(custLoaded.Select((r, i) => (i + 1, r)));
        Assert.Equal(2, res.Success);

        var cust = new CustomerService(t.Sp, t.SessionAccessor);
        var list = await cust.ListAsync();
        var cu = await cust.GetAsync(list.Single(r => r.Str("name") == "김구매").Long("cust_no")!.Value);
        Assert.Equal("TRDTYP01", cu!.Cust.Str("trd_type"));
        Assert.Equal(200000, cu.Cust.Long("sale_amt_to"));
        Assert.Equal("개포동", cu.Areas.Single().Str("addr3"));
        Assert.Equal("010-1111-2222", cu.Buyers.Single().Str("tel"));
        Assert.Contains(list, r => r.Str("name") == "별칭만");
    }
}

using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

public class OtherServiceTests
{
    [Fact]
    public async Task 일정_말일도_조회되고_물건연동()
    {
        using var t = new TestDb();
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var pd = pt.New("SYCA101"); pd.Pt["bjd_code"] = "1168010300"; pd.Pt["addr3"] = "개포동";
        var ptNo = await pt.SaveAsync(pd);

        var svc = new ScheduleService(t.Sp, t.SessionAccessor);
        var r = svc.New(new DateTime(2026, 10, 31), ptNo);
        r["title"] = "잔금일"; r["start_time"] = "18:30";
        var id = await svc.SaveAsync(r);
        Assert.Equal(id, await svc.SaveAsync(r));  // 재저장 = 수정

        var list = await svc.ListAsync(new DateTime(2026, 10, 1), new DateTime(2026, 10, 31));
        Assert.Single(list);
        Assert.Equal("2026-10-31 18:30", list[0].Str("start_at"));
        Assert.Equal(ptNo.ToString(), list[0].Str("pt_no"));
        Assert.Equal("잔금일", list[0].Str("category"));
        Assert.Single(await svc.ByPropertyAsync(ptNo));
        Assert.Empty(await svc.ListAsync(new DateTime(2026, 10, 1), new DateTime(2026, 10, 31), "OFFICE"));

        await svc.DeleteAsync(id);
        Assert.Empty(await svc.ListAsync(new DateTime(2026, 10, 1), new DateTime(2026, 10, 31)));
    }

    [Fact]
    public async Task 일정_시간형식_검사()
    {
        using var t = new TestDb();
        var svc = new ScheduleService(t.Sp, t.SessionAccessor);
        var r = svc.New(); r["title"] = "미팅"; r["start_time"] = "오후";
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.SaveAsync(r));
        r["start_time"] = "930";
        await svc.SaveAsync(r);
        Assert.EndsWith(" 09:30", r.Str("start_at"));
    }

    [Fact]
    public async Task 상담_연락처로_고객과_물건에_연결저장()
    {
        using var t = new TestDb();
        var cust = new CustomerService(t.Sp, t.SessionAccessor);
        var cd = cust.New(); cd.Buyers[0]["name"] = "김고객"; cd.Buyers[0]["tel"] = "010-1111-2222";
        var custNo = await cust.SaveAsync(cd);
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var pd = pt.New("SYCA101"); pd.Pt["bjd_code"] = "1168010300";
        pd.Holders[0]["holder_name"] = "박소유"; pd.Holders[0]["holder_phone"] = "010-1111-2222";
        var ptNo = await pt.SaveAsync(pd);

        var svc = new InterviewService(t.Sp, t.SessionAccessor);
        var r = svc.New(); r["itv_content"] = "통화"; r["contact_phone"] = "01011112222";
        var id = await svc.SaveAsync(r);
        Assert.True(id > 0);

        Assert.Equal(3, (await svc.ListAsync()).Count);           // 본건 + 고객 + 물건
        Assert.Single((await cust.GetAsync(custNo))!.Consults);
        Assert.Single((await pt.GetAsync(ptNo))!.Consults);
        var today = Neosys.Local.Core.LocalDate.Today;
        var filtered = await svc.ListAsync(new Row { ["q_keyword"] = "1111", ["q_itv_type"] = "ITVTYP01", ["q_fr_date"] = today, ["q_to_date"] = today });
        Assert.Equal(3, filtered.Count);
    }

    [Fact]
    public async Task 협력업체_영업지역과_삭제()
    {
        using var t = new TestDb();
        var svc = new VendorService(t.Sp, t.SessionAccessor);
        var d = svc.New();
        d.Vendor["vendor_name"] = "깔끔이사"; d.Vendor["category1"] = "이사 | 청소";
        d.Regions.Add(new Row { ["region_code"] = "1168010300", ["region_name"] = "서울 강남구 개포동" });
        d.Regions.Add(new Row { ["region_code"] = "1168010300", ["region_name"] = "중복" });
        var id = await svc.SaveAsync(d);
        var list = await svc.ListAsync(new Row { ["q_category"] = "이사 | 청소" });
        Assert.Single(list);
        Assert.Equal("서울 강남구 개포동", list[0].Str("business_region"));
        await svc.DeleteAsync(id);
        Assert.Empty(await svc.ListAsync());
    }

    [Fact]
    public async Task 메모_추가_수정_색_삭제()
    {
        using var t = new TestDb();
        var svc = new MemoService(t.Sp, t.SessionAccessor);
        var m = await svc.AddAsync(0);
        var id = m.Long("memo_id")!.Value;
        await svc.SaveContentAsync(id, "전화하기");
        await svc.SetColorAsync(id, MemoService.NextColor(m.Str("color")));
        var list = await svc.ListAsync();
        Assert.Single(list);
        Assert.Equal("전화하기", list[0].Str("content"));
        Assert.Equal(MemoService.Colors[1], list[0].Str("color"));
        await svc.SaveContentAsync(id, "");
        Assert.Equal("", (await svc.ListAsync())[0].Str("content"));
        await svc.DeleteAsync(id);
        Assert.Empty(await svc.ListAsync());
    }
}

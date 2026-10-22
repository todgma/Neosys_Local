using Dapper;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

public class PropertyServiceTests
{
    private static PropertyDetail Sample(PropertyService svc)
    {
        var d = svc.New("SYCA101");
        var p = d.Pt;
        p["addr1"] = "서울특별시"; p["addr2"] = "강남구"; p["addr3"] = "개포동"; p["bjd_code"] = "1168010300";
        p["addr4"] = "개포자이"; p["dong"] = "101"; p["ho"] = "1203"; p["floor1"] = 12L; p["floor2"] = 25L;
        p["sale_div"] = "SALEDIV01,SALEDIV03S"; p["sale_amt"] = 250000L; p["prot_amt"] = 10000L; p["mon_amt"] = 300L;
        p["exc_area"] = 84.97; p["sup_area"] = 112.4;
        d.Holders[0]["holder_name"] = "박소유"; d.Holders[0]["holder_phone"] = "010-9999-0000";
        d.Memos.Add(new Row { ["memo_content"] = "남향, 올수리" });
        d.LeaseRows.Add(new Row { ["room_no"] = "101", ["deposit"] = 1000L, ["monthly_rent"] = 50L });
        return d;
    }

    [Fact]
    public async Task 등록_재저장_조회()
    {
        using var t = new TestDb();
        var svc = new PropertyService(t.Sp, t.SessionAccessor);
        var d = Sample(svc);
        var no = await svc.SaveAsync(d);
        Assert.True(no > 0);
        Assert.Equal("개포자이 101동 1203호", d.Pt.Str("pt_name"));

        d.Pt["sale_amt"] = 260000L;
        Assert.Equal(no, await svc.SaveAsync(d));   // 재저장 = 수정
        var list = await svc.ListAsync();
        Assert.Single(list);
        Assert.Equal(260000, list[0].Long("sale_amt"));
        Assert.Equal("박소유", list[0].Str("owner_name"));

        var loaded = (await svc.GetAsync(no))!;
        Assert.Single(loaded.Holders);
        Assert.Equal(1, loaded.Holders[0].Long("holder_idx"));
        Assert.Single(loaded.Memos);
        Assert.Single(loaded.LeaseRows);
        Assert.Equal("7", loaded.Pt.Str("rt_no"));
    }

    [Fact]
    public async Task 소유자_추가와_삭제()
    {
        using var t = new TestDb();
        var svc = new PropertyService(t.Sp, t.SessionAccessor);
        var no = await svc.SaveAsync(Sample(svc));
        var d = (await svc.GetAsync(no))!;
        d.Holders.Add(new Row { ["holder_type"] = "BUYER", ["holder_name"] = "최임차" });
        await svc.SaveAsync(d);
        d = (await svc.GetAsync(no))!;
        Assert.Equal(2, d.Holders.Count);
        Assert.Equal(2, d.Holders[1].Long("holder_idx"));

        d.Holders.RemoveAt(0);
        await svc.SaveAsync(d);
        d = (await svc.GetAsync(no))!;
        Assert.Single(d.Holders);
        Assert.Equal("최임차", d.Holders[0].Str("holder_name"));
    }

    [Fact]
    public async Task 필터()
    {
        using var t = new TestDb();
        var svc = new PropertyService(t.Sp, t.SessionAccessor);
        await svc.SaveAsync(Sample(svc));
        var land = svc.New("SYCA115");
        land.Pt["bjd_code"] = "4113510900"; land.Pt["addr3"] = "대장동"; land.Pt["land_share"] = 500.0; land.Pt["sale_div"] = "SALEDIV01";
        await svc.SaveAsync(land);

        Assert.Single(await svc.ListAsync(new Row { ["q_pt_type"] = "SYCA101,SYCA103" }));
        Assert.Single(await svc.ListAsync(new Row { ["q_sale_div"] = "SALEDIV03" }));
        Assert.Equal(2, (await svc.ListAsync(new Row { ["q_sale_div"] = "SALEDIV01" })).Count);
        Assert.Single(await svc.ListAsync(new Row { ["q_bjd_codes"] = "1168" }));
        Assert.Single(await svc.ListAsync(new Row { ["q_area_min"] = 400 }));
        Assert.Single(await svc.ListAsync(new Row { ["q_keyword"] = "박소유" }));
        Assert.Single(await svc.ListAsync(new Row { ["q_keyword"] = "9999" }));
        Assert.Single(await svc.ListAsync(new Row { ["q_amt_min"] = 200000 }));
        Assert.Single(await svc.ListAsync(new Row { ["q_floor"] = "exceptFirst", ["q_pt_type"] = "SYCA101" }));
        var counts = await svc.TypeCountsAsync();
        Assert.Equal(1, counts["SYCA115"]);
    }

    [Fact]
    public async Task 이력저장_후_삭제()
    {
        using var t = new TestDb();
        var svc = new PropertyService(t.Sp, t.SessionAccessor);
        var no = await svc.SaveAsync(Sample(svc));
        await svc.DeleteAsync(no, saveHistory: true);
        Assert.Empty(await svc.ListAsync());
        var hist = await svc.HistoryAsync(no);
        Assert.Single(hist);
        Assert.Equal(250000, hist[0].Long("sale_amt"));
        using var c = t.Db.Open();
        Assert.Equal(0, c.ExecuteScalar<long>("SELECT COUNT(*) FROM pt_sale_holder"));
    }

    [Fact]
    public async Task 상담_연락처가_고객_구입자와_같으면_고객에도_남는다()
    {
        using var t = new TestDb();
        var cust = new CustomerService(t.Sp, t.SessionAccessor);
        var cd = cust.New();
        cd.Buyers[0]["name"] = "김고객"; cd.Buyers[0]["tel"] = "010-1111-2222";
        var custNo = await cust.SaveAsync(cd);

        var svc = new PropertyService(t.Sp, t.SessionAccessor);
        var d = Sample(svc);
        d.Consults.Add(new Row { ["itv_content"] = "매수 문의", ["contact_phone"] = "01011112222" });
        await svc.SaveAsync(d);

        var c = (await cust.GetAsync(custNo))!;
        Assert.Single(c.Consults);
        Assert.Equal("매수 문의", c.Consults[0].Str("itv_content"));
    }
}

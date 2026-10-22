using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

public class CustomerServiceTests
{
    [Fact]
    public async Task 등록하면_새번호를_받고_다시_저장하면_수정된다()
    {
        using var t = new TestDb();
        var svc = new CustomerService(t.Sp, t.SessionAccessor);
        var d = svc.New();
        d.Cust["want_type"] = "주거용";
        d.Cust["trd_type"] = "TRDTYP01,TRDTYP03";
        d.Cust["sale_amt_fr"] = 50000L;
        d.Buyers[0]["name"] = "김구매";
        d.Buyers[0]["tel"] = "010-1234-5678";
        d.Areas.Add(new Row { ["addr1"] = "서울특별시", ["addr2"] = "강남구", ["addr3"] = "개포동", ["bjd_code"] = "1168010300" });
        d.Memos.Add(new Row { ["memo_content"] = "남향 선호" });
        d.Consults.Add(new Row { ["itv_content"] = "첫 상담", ["contact_phone"] = "010-1234-5678" });

        var no = await svc.SaveAsync(d);
        Assert.True(no > 0);
        Assert.Equal(no, d.CustNo);

        // 같은 객체로 다시 저장 → 수정(중복 등록 없음)
        d.Cust["memo"] = "수정";
        Assert.Equal(no, await svc.SaveAsync(d));
        var list = await svc.ListAsync();
        Assert.Single(list);
        Assert.Equal("김구매", list[0].Str("name"));
        Assert.Equal("개포동", list[0].Str("wish_areas"));

        var loaded = await svc.GetAsync(no);
        Assert.NotNull(loaded);
        Assert.Equal("수정", loaded!.Cust.Str("memo"));
        Assert.Single(loaded.Buyers);
        Assert.Single(loaded.Areas);
        Assert.Single(loaded.Memos);
        Assert.Single(loaded.Consults);
        Assert.Equal(7, loaded.Cust.Long("rt_no"));
        Assert.Equal(3, loaded.Cust.Long("off_no"));
    }

    [Fact]
    public async Task 메모를_목록에서_빼면_삭제된다()
    {
        using var t = new TestDb();
        var svc = new CustomerService(t.Sp, t.SessionAccessor);
        var d = svc.New();
        d.Cust["name"] = "이고객";
        d.Memos.Add(new Row { ["memo_content"] = "A" });
        d.Memos.Add(new Row { ["memo_content"] = "B" });
        var no = await svc.SaveAsync(d);

        var loaded = (await svc.GetAsync(no))!;
        Assert.Equal(2, loaded.Memos.Count);
        loaded.Memos.RemoveAt(0);
        await svc.SaveAsync(loaded);
        Assert.Single((await svc.GetAsync(no))!.Memos);
    }

    [Fact]
    public async Task 성함이_없으면_저장하지_않는다()
    {
        using var t = new TestDb();
        var svc = new CustomerService(t.Sp, t.SessionAccessor);
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.SaveAsync(svc.New()));
    }

    [Fact]
    public async Task 필터와_삭제()
    {
        using var t = new TestDb();
        var svc = new CustomerService(t.Sp, t.SessionAccessor);
        var a = svc.New(); a.Cust["name"] = "가"; a.Cust["want_type"] = "주거용"; a.Cust["trd_prg"] = "TRDPRG01";
        var b = svc.New(); b.Cust["name"] = "나"; b.Cust["want_type"] = "토지"; b.Cust["trd_type"] = "TRDTYP02";
        await svc.SaveAsync(a);
        var bNo = await svc.SaveAsync(b);

        Assert.Single(await svc.ListAsync(new Row { ["q_want_type"] = "토지" }));
        Assert.Equal(2, (await svc.ListAsync(new Row { ["q_want_type"] = "토지,주거용" })).Count);
        Assert.Single(await svc.ListAsync(new Row { ["q_trd_type"] = "TRDTYP02" }));
        Assert.Single(await svc.ListAsync(new Row { ["q_keyword"] = "나" }));
        Assert.Empty(await svc.ListAsync(new Row { ["q_keyword"] = "없는이름" }));

        await svc.DeleteAsync(bNo);
        Assert.Single(await svc.ListAsync());
    }
}

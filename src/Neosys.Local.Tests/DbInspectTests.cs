using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>DB 데이터 확인(대시보드 톱니바퀴) — 테이블 목록·최근 행·없는 테이블 거부·비밀번호</summary>
public class DbInspectTests
{
    [Fact]
    public async Task 테이블_목록과_데이터()
    {
        using var t = new TestDb();
        var svc = new DbInspectService(t.Sp, t.SessionAccessor);
        var tables = await svc.TablesAsync();
        Assert.Contains("pt_sale", tables);
        Assert.Contains("sys_code_sub", tables);

        var codes = await svc.RowsAsync("sys_code_sub", 5);
        Assert.InRange(codes.Count, 1, 5);
        Assert.True(await svc.CountAsync("sys_code_sub") >= codes.Count);
        Assert.Empty(await svc.RowsAsync("pt_sale"));   // 빈 테이블 = 빈 목록
    }

    [Fact]
    public async Task 목록에_없는_테이블은_거부()
    {
        using var t = new TestDb();
        var svc = new DbInspectService(t.Sp, t.SessionAccessor);
        await Assert.ThrowsAsync<ArgumentException>(() => svc.RowsAsync("pt_sale\"; DROP TABLE pt_sale; --"));
        Assert.Contains("pt_sale", await svc.TablesAsync());
    }

    [Fact]
    public void 비밀번호()
    {
        Assert.True(DbInspectService.CheckPassword("CODEME"));
        Assert.False(DbInspectService.CheckPassword("codeme"));
        Assert.False(DbInspectService.CheckPassword(null));
    }
}

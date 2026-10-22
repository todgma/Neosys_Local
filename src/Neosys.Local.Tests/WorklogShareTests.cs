using Neosys.Local.Core;
using Neosys.Local.Core.Services;

namespace Neosys.Local.Tests;

/// <summary>업무일지 공유 설정(rt_work_journal_setting) — 기본 모두공개, 대표만 변경</summary>
public class WorklogShareTests
{
    [Fact]
    public async Task 공유_설정()
    {
        using var t = new TestDb();      // 세션 = 대표(RTTYP01)
        var svc = new WorklogService(t.Sp, t.SessionAccessor);
        Assert.True(await svc.ShareAllAsync());
        await svc.SetShareAllAsync(false);
        Assert.False(await svc.ShareAllAsync());
        await svc.SetShareAllAsync(true);
        Assert.True(await svc.ShareAllAsync());

        var staff = new AppSession { RtNo = 8, OffNo = 3, UserId = "staff", RtType = "RTTYP02" };
        var staffSvc = new WorklogService(t.Sp, () => staff);
        await Assert.ThrowsAsync<InvalidOperationException>(() => staffSvc.SetShareAllAsync(false));
        Assert.True(WorklogService.CanSeeOthers(staff, shareAll: true));
        Assert.False(WorklogService.CanSeeOthers(staff, shareAll: false));
        Assert.True(WorklogService.CanSeeOthers(t.Session, shareAll: false));
    }
}

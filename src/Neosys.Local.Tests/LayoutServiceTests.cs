using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>배치도/입주현황 — 자동 점유상태(물건 거래구분)와 점유현황 저장(danji_occupancy)</summary>
public class LayoutServiceTests
{
    [Fact]
    public void 물건_거래구분으로_자동_점유상태()
    {
        var map = LayoutService.AutoStatuses(new[]
        {
            new Row { ["dong"] = 101L, ["ho"] = "1203", ["sale_div"] = "SALEDIV03S,SALEDIV01" },   // 접미(생각) 있어도 월세
            new Row { ["dong"] = "101", ["ho"] = "1203 ", ["sale_div"] = "SALEDIV02" },
            new Row { ["dong"] = "102", ["ho"] = "", ["sale_div"] = "SALEDIV01" },               // 호 없으면 제외
        });
        Assert.Equal(new[] { "SALE", "JEONSE", "MONTHLY" }, map["101|1203"]);
        Assert.Single(map);
        Assert.Equal(new[] { "UNION" }, LayoutService.ManualOf("SALE,UNION"));
        Assert.Equal(12, LayoutService.FloorOf(new Row { ["hoName"] = "1203" }));
        Assert.Equal(3, LayoutService.FloorOf(new Row { ["floor"] = "3", ["hoName"] = "1203" }));
    }

    [Fact]
    public void 단지_미등록_호_합치기()
    {
        var reg = new List<Row> { new() { ["pt_no"] = 1L, ["pt_type"] = "SYCA101", ["addr4"] = "개포자이", ["addr3"] = "개포동", ["bjd_code"] = "1168010300", ["dong"] = "101", ["ho"] = "1203" } };
        var hos = new[]
        {
            ("101", new Row { ["hoName"] = "1203", ["floor"] = "12" }),
            ("101", new Row { ["hoName"] = "1201", ["floor"] = "12", ["ptpName"] = "84A", ["exclsSpc"] = 84.97 }),
            ("102", new Row { ["hoName"] = "301" }),
        };
        var merged = LayoutService.MergeGhosts(reg, hos, "123");
        Assert.Equal(3, merged.Count);
        Assert.Equal(new[] { "1201", "1203", "301" }, merged.Select(r => r.Str("ho")));
        var g = merged[0];
        Assert.Equal(1, g.Long("is_ghost"));
        Assert.Null(g.Long("pt_no"));
        Assert.Equal("개포자이", g.Str("pt_name"));
        Assert.Equal("1168010300", g.Str("bjd_code"));
        Assert.Equal("84A", g.Str("apt_typ"));
        Assert.Equal(3, merged[2].Long("floor1"));
        Assert.Empty(LayoutService.MergeGhosts(new List<Row>(), hos, "123"));   // 등록 물건이 없으면 합치지 않음(기존과 같음)
    }

    [Fact]
    public async Task 점유현황_저장_수정()
    {
        using var t = new TestDb();
        var svc = new LayoutService(t.Sp, t.SessionAccessor);
        await svc.SaveOccupancyAsync(123, 1, 1203, "12", new[] { "UNION", "SALE" }, "홍길동", "010-1234-5678", "조합원");
        await svc.SaveOccupancyAsync(123, 1, 1203, "12", Array.Empty<string>(), "홍길동", "010-0000-0000", null);
        await svc.SaveOccupancyAsync(123, 2, 501, "5", new[] { "UNION" }, null, null, null);
        var rows = await svc.OccupancyAsync(123);
        Assert.Equal(2, rows.Count);
        var a = rows.Single(r => r.Long("ho_number") == 1203);
        Assert.Equal("", a.Str("occupancy_status") ?? "");          // 수동 상태만 저장 → 해제됨
        Assert.Equal("010-0000-0000", a.Str("occupancy_phone"));
        Assert.Equal("UNION", rows.Single(r => r.Long("ho_number") == 501).Str("occupancy_status"));
        Assert.Empty(await svc.OccupancyAsync(999));
    }
}

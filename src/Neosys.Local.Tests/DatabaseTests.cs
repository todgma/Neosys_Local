using Dapper;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

public class DatabaseTests
{
    [Fact]
    public void 초기화하면_스키마와_시드가_생긴다()
    {
        using var t = new TestDb();
        using var c = t.Db.Open();
        Assert.Equal(104, c.ExecuteScalar<long>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"));
        Assert.Equal(144, c.ExecuteScalar<long>("SELECT COUNT(*) FROM sys_code_sub"));
        Assert.Equal(11, c.ExecuteScalar<long>("SELECT COUNT(*) FROM sys_menu"));
    }

    [Fact]
    public void 두번_초기화해도_오류없다()
    {
        using var t = new TestDb();
        t.Db.Initialize();
    }

    [Fact]
    public void 이력트리거가_변경을_기록한다()
    {
        using var t = new TestDb();
        using var c = t.Db.Open();
        c.Execute("INSERT INTO ct_cust (name, off_no, reg_id) VALUES ('홍길동', 3, 'u1')");
        c.Execute("UPDATE ct_cust SET name = '홍길순', upd_id = 'u2'");
        c.Execute("DELETE FROM ct_cust");
        var logs = c.Query<(string, string, string, long)>(
            "SELECT log_type, name, changed_by, changed_off FROM ct_cust_hist ORDER BY rowid").ToList();
        Assert.Equal(3, logs.Count);
        Assert.Equal(("I", "홍길동", "u1", 3L), logs[0]);
        Assert.Equal(("U", "홍길순", "u2", 3L), logs[1]);
        Assert.Equal("D", logs[2].Item1);
    }

    [Fact]
    public async Task 공통코드를_그룹으로_읽는다()
    {
        using var t = new TestDb();
        var codes = new CodeService(t.Sp);
        await codes.LoadAsync();
        Assert.Equal(4, codes.Group(CodeGroups.TradeType).Count);
        Assert.Equal("매매", codes.Name("PTTRD01"));
    }

    [Fact]
    public void 파라미터는_없으면_NULL_빈문자열도_NULL()
    {
        var p = SpRunner.BuildParams("SELECT @a, @b, @c -- @주석무시\n WHERE x = '@문자열무시'", new Row { ["a"] = 1L, ["b"] = "" });
        Assert.Equal(new[] { "a", "b", "c" }, p.ParameterNames.OrderBy(n => n).ToArray());
        Assert.Equal(1L, p.Get<object>("a"));
        Assert.Null(p.Get<object>("b"));
        Assert.Null(p.Get<object>("c"));
    }
}

public class HistTriggerTests
{
    /// <summary>이력(_hist) 테이블이 있는 모든 원본 테이블에 행을 넣고 고치고 지워도 트리거 오류가 없어야 한다.</summary>
    [Fact]
    public void 모든_이력트리거가_실행된다()
    {
        using var t = new TestDb();
        using var c = t.Db.Open();
        var tables = c.Query<string>("SELECT name FROM sqlite_master WHERE type='table' AND substr(name, -5) = '_hist'")
            .Select(h => h[..^5]).ToList();
        var all = c.Query<string>("SELECT name FROM sqlite_master WHERE type='table'").ToHashSet();
        tables = tables.Where(all.Contains).ToList(); // rt_sms_send_hist 처럼 원본 없는 이름은 감사 테이블이 아님
        Assert.NotEmpty(tables);
        // 트리거만 확인한다 — 임의 값이 CHECK·FK에 걸리지 않게 끈다
        c.Execute("PRAGMA ignore_check_constraints = ON; PRAGMA foreign_keys = OFF;");
        foreach (var tbl in tables)
        {
            var cols = c.Query<(long cid, string name, string type, long notnull, string? dflt, long pk)>($"PRAGMA table_info(\"{tbl}\")").ToList();
            // NOT NULL 컬럼만 채워 1행 넣기
            var need = cols.Where(x => x.notnull == 1 && x.dflt is null && !(x.pk == 1 && x.type == "INTEGER" && cols.Count(y => y.pk > 0) == 1)).ToList();
            if (need.Count == 0) need = cols.Where(x => x.pk == 0).Take(1).ToList();
            var names = string.Join(", ", need.Select(x => $"\"{x.name}\""));
            var values = string.Join(", ", need.Select(x => x.type is "INTEGER" or "NUMERIC" or "REAL" ? "1" : "'x'"));
            var ins = $"INSERT INTO \"{tbl}\" ({names}) VALUES ({values})";
            try { c.Execute(ins); } catch (Exception e) { throw new Exception(ins, e); }
            c.Execute($"UPDATE \"{tbl}\" SET {need.Select(x => $"\"{x.name}\" = \"{x.name}\"").First()}");
            c.Execute($"DELETE FROM \"{tbl}\"");
            Assert.Equal(3, c.ExecuteScalar<long>($"SELECT COUNT(*) FROM \"{tbl}_hist\""));
        }
    }
}

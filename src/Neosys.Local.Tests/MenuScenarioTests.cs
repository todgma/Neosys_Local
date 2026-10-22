using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>
/// 물건관리·고객관리 시나리오 — 단지 2개(개포자이 3건·래미안대치팰리스 2건) 물건 5건, 고객 5건을 화면과 같은 서비스로
/// 등록하고 목록·필터·좌측 단지 요약·수정(중복 없음)·상태변경·삭제·상담 연동을 확인한다.
/// 환경변수 NEOSYS_DEMO_DB에 경로를 주면 같은 데이터로 화면 확인용 DB 파일을 만든다(MakeDemoDb).
/// </summary>
public class MenuScenarioTests
{
    public const string DanjiA = "10001", DanjiB = "10002";

    /// <summary>고객 5건 → 물건 5건 순서로 등록(물건 상담 전화가 고객 구입자 전화와 같으면 고객 상담에도 남는지 보기 위해)</summary>
    public static async Task<(List<long> Pts, List<long> Custs)> SeedAsync(PropertyService pt, CustomerService cs)
    {
        var custs = new List<long>();
        foreach (var (name, tel, want, sub, trd, prg, area, setAmt) in new (string, string, string, string?, string, string, Row, Action<Row>)[]
        {
            ("김매수", "010-1111-2222", "주거용", "아파트", "TRDTYP01", "TRDPRG01", Area("서울특별시", "강남구", "개포동", "1168010300", DanjiA, "개포자이"),
                c => { c["sale_amt_fr"] = 150000; c["sale_amt_to"] = 200000; c["exc_area_fr"] = 25; c["exc_area_to"] = 35; }),
            ("이전세", "010-3333-4444", "주거용", "아파트", "TRDTYP02", "TRDPRG01", Area("서울특별시", "강남구", "대치동", "1168010600", DanjiB, "래미안대치팰리스"),
                c => { c["les_amt_fr"] = 90000; c["les_amt_to"] = 100000; }),
            ("박월세", "010-5555-6666", "주거용", "아파트,오피스텔", "TRDTYP03", "TRDPRG01", Area("서울특별시", "강남구", "개포동", "1168010300", null, null),
                c => { c["prot_amt_fr"] = 5000; c["prot_amt_to"] = 10000; c["mon_amt_fr"] = 150; c["mon_amt_to"] = 250; }),
            ("최상가", "010-7777-8888", "업무용", "상가 | 사무실", "TRDTYP01", "TRDPRG01", Area("서울특별시", "강남구", "대치동", "1168010600", null, null),
                c => { c["sale_amt_fr"] = 50000; c["sale_amt_to"] = 80000; }),
            ("정토지", "010-9999-0000", "토지", null, "TRDTYP01", "TRDPRG04", Area("경기도", "양평군", "양평읍", "4183025000", null, null),
                c => { c["sale_amt_fr"] = 30000; c["hold_date"] = LocalDate.Today; }),
        })
        {
            var d = cs.New();
            var c = d.Cust;
            c["want_type"] = want;
            c["want_sub_type"] = sub;
            c["trd_type"] = trd;
            c["trd_prg"] = prg;
            setAmt(c);
            d.Buyers[0]["name"] = name;               // 기존처럼 성함·전화는 구입자 첫 행
            d.Buyers[0]["tel"] = tel;
            d.Buyers[0]["relation"] = "본인";
            d.Areas.Add(area);
            d.Memos.Add(new Row { ["memo_date"] = LocalDate.Now, ["memo_content"] = $"{name} 고객 테스트 메모", ["user_id"] = "tester" });
            custs.Add(await cs.SaveAsync(d));
        }

        var pts = new List<long>();
        foreach (var (danji, dong, ho, floor, div, sts, owner, setAmt, consultPhone) in new (string, string, string, int, string, string, string, Action<Row>, string?)[]
        {
            (DanjiA, "101", "1203", 12, "SALEDIV01,SALEDIV03S", "PTSTS01", "박소유", r => { r["sale_amt"] = 185000; r["prot_amt"] = 10000; r["mon_amt"] = 250; }, "010-1111-2222"),
            (DanjiA, "102", "803", 8, "SALEDIV02", "PTSTS01", "한집주", r => r["les_amt"] = 95000, null),
            (DanjiA, "103", "1502", 15, "SALEDIV03", "PTSTS01", "오임대", r => { r["prot_amt"] = 10000; r["mon_amt"] = 230; }, null),
            (DanjiB, "105", "2001", 20, "SALEDIV01,SALEDIV02Y", "PTSTS01", "윤대치", r => { r["sale_amt"] = 320000; r["les_amt"] = 150000; }, null),
            (DanjiB, "107", "301", 3, "SALEDIV01", "PTSTS02", "강계약", r => { r["sale_amt"] = 280000; r["contract_date"] = LocalDate.Today; }, null),
        })
        {
            var d = pt.New("SYCA101");
            var p = d.Pt;
            var a = danji == DanjiA;
            p["addr1"] = "서울특별시"; p["addr2"] = "강남구"; p["addr3"] = a ? "개포동" : "대치동";
            p["bjd_code"] = a ? "1168010300" : "1168010600";
            p["danji_code"] = danji;
            p["addr4"] = a ? "개포자이" : "래미안대치팰리스";
            p["jibun"] = a ? "1234" : "316";
            p["dong"] = dong; p["ho"] = ho; p["floor1"] = floor; p["floor2"] = a ? 25 : 35;
            p["apt_typ"] = a ? "84A" : "114B";
            p["sup_area"] = a ? 112.4 : 145.2; p["exc_area"] = a ? 84.97 : 114.8;
            p["sale_div"] = div;
            p["pt_sts"] = sts;
            p["current_status"] = "주인거주";
            setAmt(p);
            d.Holders[0]["holder_name"] = owner;
            d.Holders[0]["holder_phone"] = "010-2000-" + ho.PadLeft(4, '0');
            d.Memos.Add(new Row { ["memo_date"] = LocalDate.Now, ["memo_content"] = $"{p["addr4"]} {dong}동 {ho}호 특징 메모", ["user_id"] = "tester" });
            if (consultPhone is not null)
                d.Consults.Add(new Row { ["reg_dt"] = LocalDate.Now, ["contact_name"] = "김매수", ["contact_phone"] = consultPhone, ["itv_content"] = "101동 1203호 매매 문의" });
            pts.Add(await pt.SaveAsync(d));
        }
        return (pts, custs);
    }

    private static Row Area(string a1, string a2, string a3, string bjd, string? danji, string? bld) => new()
    {
        ["addr1"] = a1, ["addr2"] = a2, ["addr3"] = a3, ["bjd_code"] = bjd, ["danji_code"] = danji, ["bld_nm"] = bld,
    };

    [Fact]
    public async Task 물건관리_단지2개_5건()
    {
        using var t = new TestDb();
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var cs = new CustomerService(t.Sp, t.SessionAccessor);
        var (pts, _) = await SeedAsync(pt, cs);

        // 등록: 새 키 5개(중복 없음), 목록 5건
        Assert.Equal(5, pts.Distinct().Count());
        Assert.Equal(5, (await pt.ListAsync()).Count);
        Assert.Equal(5, (await pt.TypeCountsAsync())["SYCA101"]);

        // 좌측 물건리스트: 단지별 묶음 2개(3건·2건)
        var summary = await pt.SummaryAsync("SYCA101");
        Assert.Equal(2, summary.Count);
        Assert.Equal(3, summary.Single(r => r.Str("danji_code") == DanjiA).Long("property_count"));
        Assert.Equal(2, summary.Single(r => r.Str("danji_code") == DanjiB).Long("property_count"));

        // 필터: 단지 · 거래구분(상태 접미 포함) · 진행상태 · 동 · 검색어(소유자) · 금액
        Assert.Equal(3, (await pt.ListAsync(new Row { ["q_danji_code"] = DanjiA })).Count);
        Assert.Equal(new[] { pts[1], pts[3] }.OrderBy(x => x), (await pt.ListAsync(new Row { ["q_sale_div"] = "SALEDIV02" })).Select(r => r.Long("pt_no")!.Value).OrderBy(x => x));
        Assert.Equal(2, (await pt.ListAsync(new Row { ["q_sale_div"] = "SALEDIV03" })).Count);   // 101동(생각) + 103동
        Assert.Single(await pt.ListAsync(new Row { ["q_pt_sts"] = "PTSTS02" }));
        Assert.Single(await pt.ListAsync(new Row { ["q_danji_code"] = DanjiB, ["q_dong"] = "107" }));
        Assert.Single(await pt.ListAsync(new Row { ["q_keyword"] = "윤대치" }));
        Assert.Equal(2, (await pt.ListAsync(new Row { ["q_amt_min"] = 200000 })).Count);        // 32억·28억

        // 상세: 물건명 자동 · 소유자 · 메모
        var d = (await pt.GetAsync(pts[0]))!;
        Assert.Equal("개포자이 101동 1203호", d.Pt.Str("pt_name"));
        Assert.Equal("박소유", d.Holders.Single().Str("holder_name"));
        Assert.Single(d.Memos);
        Assert.Single(d.Consults);

        // 수정: 같은 키로 저장 → 건수 그대로, 값 반영, 소유자 추가(임차인)
        d.Pt["sale_amt"] = 180000;
        d.Holders.Add(new Row { ["holder_type"] = "BUYER", ["holder_name"] = "임차인", ["holder_phone"] = "010-4000-0001" });
        Assert.Equal(pts[0], await pt.SaveAsync(d));
        Assert.Equal(5, (await pt.ListAsync()).Count);
        var d2 = (await pt.GetAsync(pts[0]))!;
        Assert.Equal(180000, d2.Pt.Long("sale_amt"));
        Assert.Equal(2, d2.Holders.Count);

        // 상태 일괄변경 · 이력 저장 후 삭제
        await pt.SetStatusAsync(pts[2], "PTSTS04");
        Assert.Equal(2, (await pt.ListAsync(new Row { ["q_pt_sts"] = "PTSTS02" })).Count + (await pt.ListAsync(new Row { ["q_pt_sts"] = "PTSTS04" })).Count);
        await pt.DeleteAsync(pts[4], saveHistory: true);
        Assert.Equal(4, (await pt.ListAsync()).Count);
        Assert.Single(await pt.HistoryAsync(pts[4]));
        Assert.Single((await pt.SummaryAsync("SYCA101")).Where(r => r.Str("danji_code") == DanjiB));
    }

    [Fact]
    public async Task 고객관리_5건()
    {
        using var t = new TestDb();
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var cs = new CustomerService(t.Sp, t.SessionAccessor);
        var (_, custs) = await SeedAsync(pt, cs);

        Assert.Equal(5, custs.Distinct().Count());
        var all = await cs.ListAsync();
        Assert.Equal(5, all.Count);

        // 성함·전화는 구입자 첫 행에서
        var kim = (await cs.GetAsync(custs[0]))!;
        Assert.Equal("김매수", kim.Cust.Str("name"));
        Assert.Equal("010-1111-2222", kim.Cust.Str("tel"));
        Assert.Equal("개포자이", kim.Areas.Single().Str("bld_nm"));
        Assert.Single(kim.Memos);
        // 물건 상담(전화 010-1111-2222)이 같은 전화의 고객 상담이력에도 남는다
        Assert.Contains(kim.Consults, c => c.Str("itv_content") == "101동 1203호 매매 문의");

        // 필터: 구입물건유형 · 거래유형 · 고객상태 · 검색어(이름/전화/희망지역)
        Assert.Equal(3, (await cs.ListAsync(new Row { ["q_want_type"] = "주거용" })).Count);
        Assert.Equal(3, (await cs.ListAsync(new Row { ["q_trd_type"] = "TRDTYP01" })).Count);
        Assert.Single(await cs.ListAsync(new Row { ["q_trd_prg"] = "TRDPRG04" }));
        Assert.Single(await cs.ListAsync(new Row { ["q_keyword"] = "이전세" }));
        Assert.Single(await cs.ListAsync(new Row { ["q_keyword"] = "01055556666" }));
        Assert.Equal(2, (await cs.ListAsync(new Row { ["q_keyword"] = "대치동" })).Count);

        // 수정: 같은 키, 건수 그대로, 상태 계약 + 구입자 추가
        kim.Cust["trd_prg"] = "TRDPRG02";
        kim.Cust["contract_date"] = LocalDate.Today;
        kim.Buyers.Add(new Row { ["name"] = "김배우", ["relation"] = "배우자", ["tel"] = "010-1111-3333" });
        Assert.Equal(custs[0], await cs.SaveAsync(kim));
        Assert.Equal(5, (await cs.ListAsync()).Count);
        var kim2 = (await cs.GetAsync(custs[0]))!;
        Assert.Equal("TRDPRG02", kim2.Cust.Str("trd_prg"));
        Assert.Equal(2, kim2.Buyers.Count(b => b.Has("name")));

        // 삭제
        await cs.DeleteAsync(custs[4]);
        Assert.Equal(4, (await cs.ListAsync()).Count);
        Assert.Null(await cs.GetAsync(custs[4]));
    }

    /// <summary>
    /// 기존 로컬 DB에 같은 테스트 데이터 넣기(지우지 않고 추가) — NEOSYS_SEED_DB(파일 경로)가 없으면 아무것도 하지 않는다.
    /// 화면에 보이도록 로그인 계정의 NEOSYS_SEED_OFF_NO·NEOSYS_SEED_RT_NO·NEOSYS_SEED_USER로 저장한다.
    /// </summary>
    [Fact]
    public async Task SeedExistingDb()
    {
        var path = Environment.GetEnvironmentVariable("NEOSYS_SEED_DB");
        if (string.IsNullOrEmpty(path)) return;
        if (!File.Exists(path)) throw new FileNotFoundException("로컬 DB가 없습니다.", path);
        var db = new LocalDatabase(path);
        db.Initialize();
        var sp = new SpRunner(db);
        var session = new AppSession
        {
            OffNo = long.Parse(Environment.GetEnvironmentVariable("NEOSYS_SEED_OFF_NO")!),
            RtNo = long.Parse(Environment.GetEnvironmentVariable("NEOSYS_SEED_RT_NO")!),
            UserId = Environment.GetEnvironmentVariable("NEOSYS_SEED_USER") ?? "tester",
            RtType = "RTTYP01",
        };
        await SeedAsync(new PropertyService(sp, () => session), new CustomerService(sp, () => session));
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
    }

    /// <summary>화면 확인용 DB 만들기 — NEOSYS_DEMO_DB가 없으면 아무것도 하지 않는다</summary>
    [Fact]
    public async Task MakeDemoDb()
    {
        var path = Environment.GetEnvironmentVariable("NEOSYS_DEMO_DB");
        if (string.IsNullOrEmpty(path)) return;
        foreach (var f in new[] { path, path + "-wal", path + "-shm" }) if (File.Exists(f)) File.Delete(f);
        var db = new LocalDatabase(path);
        db.Initialize();
        var sp = new SpRunner(db);
        var session = new AppSession { RtNo = 1, OffNo = 1, UserId = "dev", RtNm = "개발자", RtType = "RTTYP01" };
        var (pts, custs) = await SeedAsync(new PropertyService(sp, () => session), new CustomerService(sp, () => session));
        await OtherMenuScenarioTests.SeedOthersAsync(sp, () => session, pts, custs);   // 나머지 메뉴도 5건씩
        await PropertyTypesSeedTests.SeedAllTypesAsync(new PropertyService(sp, () => session));   // 아파트 이외 유형 5건씩
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
    }
}

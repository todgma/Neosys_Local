using System.Text.Json.Nodes;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>
/// 나머지 로컬 메뉴 시나리오 — 계약·일정·메모·상담·협력업체·만기·업무일지·보고서·통합검색(네오봇)을 메뉴마다 5건씩 등록하고
/// 목록·필터·수정(같은 키)·삭제를 확인한다. 물건·고객은 MenuScenarioTests.SeedAsync 데이터를 먼저 넣는다.
/// 환경변수 NEOSYS_SEED_DB(+ NEOSYS_SEED_OFF_NO·RT_NO·USER)를 주면 SeedExistingDb가 같은 데이터를 기존 로컬 DB에 넣는다.
/// </summary>
public class OtherMenuScenarioTests
{
    public sealed record Seeded(List<long> Pts, List<long> Custs, List<string> Contracts, List<long> Schedules, List<long> Memos,
        List<long> Consults, List<long> Vendors, List<DateTime> JournalDays, List<long> Reports);

    /// <summary>나머지 메뉴 5건씩(물건·고객이 이미 있어야 함). 만기용으로 물건 5건에 현상태·만기일·임차인을 채운다.</summary>
    public static async Task<Seeded> SeedOthersAsync(SpRunner sp, Func<AppSession> session, List<long> pts, List<long> custs)
    {
        var today = DateTime.Today;
        var pt = new PropertyService(sp, session);

        // ---- 만기관리: 물건 5건을 전세·월세로 바꾸고 만기일을 1~5개월 뒤로 ----
        var expiry = new (string Status, int Months, string Tenant)[] { ("전세", 1, "임차일"), ("월세", 2, "임차이"), ("전세", 3, "임차삼"), ("월세", 4, "임차사"), ("기타임대", 5, "임차오") };
        for (int i = 0; i < pts.Count && i < expiry.Length; i++)
        {
            var d = (await pt.GetAsync(pts[i]))!;
            d.Pt["current_status"] = expiry[i].Status;
            d.Pt["mtry_date"] = LocalDate.Format(today.AddMonths(expiry[i].Months));
            d.Pt["now_dep_amt"] = 50000 + i * 10000;
            if (expiry[i].Status != "전세") d.Pt["now_mon_amt"] = 100 + i * 10;
            d.Holders.Add(new Row { ["holder_type"] = "BUYER", ["holder_name"] = expiry[i].Tenant, ["holder_phone"] = $"010-6000-000{i + 1}" });
            await pt.SaveAsync(d);
        }

        // ---- 계약관리 5건(매매 3·전세 1·월세 1) ----
        var cs = new ContractService(sp, session);
        var contracts = new List<string>();
        foreach (var (cat, docType, hint, addr, amtKey, amt, seller, buyer, days) in new[]
        {
            ("sale", "아파트매매계약서(단독)", "매매", "서울 강남구 개포동 개포자이 101동 1203호", "매매대금", "185000", "박소유", "김매수", 0),
            ("sale", "아파트매매계약서(단독)", "매매", "서울 강남구 대치동 래미안대치팰리스 107동 301호", "매매대금", "280000", "강계약", "최매수", -3),
            ("jeonse", "아파트전세계약서", "전세", "서울 강남구 개포동 개포자이 102동 803호", "보증금", "95000", "한집주", "이전세", -7),
            ("wolse", "아파트월세계약서", "월세", "서울 강남구 개포동 개포자이 103동 1502호", "보증금", "10000", "오임대", "박월세", -10),
            ("sale", "토지매매계약서", "매매", "경기도 양평군 양평읍 123-4", "매매대금", "30000", "정지주", "정토지", -20),
        })
        {
            var doc = new JsonObject
            {
                ["docType"] = docType, ["category"] = cat, ["ptType"] = cat == "sale" && docType.StartsWith("토지") ? "토지" : "아파트", ["docHint"] = hint,
                ["소재지"] = addr, [amtKey] = amt, ["매도인_성명"] = seller, ["매수인_성명"] = buyer,
                ["계약일자"] = LocalDate.Format(today.AddDays(days)),
            };
            contracts.Add(await cs.SaveAsync(new Row(), doc));
        }
        await cs.SaveDocumentAsync(contracts[0], "영수증", new JsonObject { ["금액"] = "18500" });

        // ---- 일정관리 5건(개인 3·사무실 2, 물건 연결 1) ----
        var ss = new ScheduleService(sp, session);
        var schedules = new List<long>();
        foreach (var (title, days, time, scope, ptNo) in new (string, int, string, string, long?)[]
        {
            ("계약일", 0, "10:00", "MY", pts[0]), ("잔금일", 7, "14:30", "OFFICE", null), ("임장", 1, "11:00", "MY", null),
            ("내방", 2, "16:00", "OFFICE", null), ("전화드리기", 3, "930", "MY", null),
        })
        {
            var r = ss.New(today.AddDays(days), ptNo);
            r["title"] = title; r["start_time"] = time; r["scope_div"] = scope; r["content"] = $"{title} 테스트 일정";
            schedules.Add(await ss.SaveAsync(r));
        }

        // ---- 메모(스티커) 5건 ----
        var ms = new MemoService(sp, session);
        var memos = new List<long>();
        for (int i = 0; i < 5; i++)
        {
            var m = await ms.AddAsync(i);
            await ms.SaveContentAsync(m.Long("memo_id")!.Value, $"테스트 메모 {i + 1} — 오늘 할 일");
            memos.Add(m.Long("memo_id")!.Value);
        }

        // ---- 협력업체 5건(영업지역 + 상담 1건) ----
        var vs = new VendorService(sp, session);
        var vendors = new List<long>();
        foreach (var (name, cat, mgr, phone) in new[]
        {
            ("깨끗한이사", "이사 | 청소", "김이사", "010-7100-0001"), ("국민은행 대치점", "은행 | 대출상담", "이대출", "010-7100-0002"),
            ("한빛법무사", "법무 | 세무", "박법무", "010-7100-0003"), ("새집인테리어", "인테리어 | 철거", "최인테", "010-7100-0004"),
            ("강남공인중개사", "중개사무소", "정중개", "010-7100-0005"),
        })
        {
            var v = vs.New();
            v.Vendor["vendor_name"] = name; v.Vendor["category1"] = cat; v.Vendor["manager_name"] = mgr; v.Vendor["manager_phone"] = phone;
            v.Vendor["product_desc"] = $"{name} 테스트 업체";
            v.Regions.Add(new Row { ["region_code"] = "1168010600", ["region_name"] = "서울특별시 강남구 대치동" });
            v.Consults.Add(new Row { ["reg_dt"] = LocalDate.Now, ["contact_name"] = mgr, ["contact_phone"] = phone, ["itv_content"] = $"{name} 견적 문의" });
            vendors.Add(await vs.SaveAsync(v));
        }

        // ---- 상담관리 5건(유형별) ----
        var isv = new InterviewService(sp, session);
        var consults = new List<long>();
        foreach (var (type, name, phone, content) in new[]
        {
            ("ITVTYP01", "김매수", "010-1111-2222", "개포자이 매매 가격 협의 전화"), ("ITVTYP02", "이전세", "010-3333-4444", "래미안 전세 방문 상담"),
            ("ITVTYP03", "박월세", "010-5555-6666", "103동 현장 안내"), ("ITVTYP04", "최상가", "010-7777-8888", "상가 매물 온라인 문의"),
            ("ITVTYP01", "신규고객", "010-8888-9999", "신규 아파트 매수 문의"),
        })
        {
            var r = isv.New();
            r["itv_type"] = type; r["contact_name"] = name; r["contact_phone"] = phone; r["cust_name"] = name; r["itv_content"] = content;
            consults.Add(await isv.SaveAsync(r));
        }

        // ---- 업무일지 5일(오늘~4일 전) ----
        var ws = new WorklogService(sp, session);
        var days5 = new List<DateTime>();
        for (int i = 0; i < 5; i++)
        {
            var day = today.AddDays(-i);
            var j = await ws.GetAsync(day);
            j["content"] = $"{day:MM/dd} 업무: 매물 정리, 고객 상담";
            j["remark"] = "임장 및 계약 준비";
            await ws.SaveAsync(j, i == 0 ? await ws.SummaryAsync(day) : null);
            days5.Add(day);
        }

        // ---- 보고서 5건(물건 1건씩, 고객 공유) ----
        var rs = new ReportService(sp, session);
        var reports = new List<long>();
        for (int i = 0; i < 5; i++)
        {
            var d = (await pt.GetAsync(pts[i]))!;
            var snap = ReportService.SnapshotJson(new[] { ReportService.Snapshot(d.Pt) });
            var props = ReportService.ParseSnapshot(snap);
            var html = ReportService.BuildHtml(props, new ReportOptions());
            reports.Add(await rs.SaveAsync(null, pts[i], ReportService.AutoTitle(props), $"테스트 코멘트 {i + 1}", snap, html, new[] { custs[i % custs.Count] }));
        }

        return new Seeded(pts, custs, contracts, schedules, memos, consults, vendors, days5, reports);
    }

    private static async Task<(TestDb T, Seeded S)> SeedAllAsync()
    {
        var t = new TestDb();
        var (pts, custs) = await MenuScenarioTests.SeedAsync(new PropertyService(t.Sp, t.SessionAccessor), new CustomerService(t.Sp, t.SessionAccessor));
        return (t, await SeedOthersAsync(t.Sp, t.SessionAccessor, pts, custs));
    }

    [Fact]
    public async Task 계약관리_5건()
    {
        var (t, s) = await SeedAllAsync();
        using var _ = t;
        var svc = new ContractService(t.Sp, t.SessionAccessor);
        Assert.Equal(5, s.Contracts.Distinct().Count());
        var list = await svc.ListAsync();
        Assert.Equal(5, list.Count);
        Assert.Contains(list, r => r.Str("seller") == "강계약" && r.Long("amount") == 280000);
        Assert.Equal(2, (await svc.ListAsync(new Row { ["q_keyword"] = "래미안" })).Count + (await svc.ListAsync(new Row { ["q_keyword"] = "양평" })).Count);
        Assert.Equal(2, (await svc.ListAsync(new Row { ["q_fr"] = LocalDate.Format(DateTime.Today.AddDays(-5)) })).Count);   // 오늘·3일 전
        Assert.Equal(new[] { "영수증" }, await svc.DocumentKindsAsync(s.Contracts[0]));

        // 수정(같은 id) · 복사 · 거래신고 완료일 · 삭제
        var m = (await svc.GetAsync(s.Contracts[1]))!;
        var doc = ContractService.ParseDoc(m.Str("doc"));
        doc["매수인_성명"] = "최변경";
        Assert.Equal(s.Contracts[1], await svc.SaveAsync(m, doc));
        Assert.Equal("최변경", (await svc.GetAsync(s.Contracts[1]))!.Str("buyer"));
        var copy = await svc.CopyAsync(s.Contracts[1]);
        Assert.Equal(6, (await svc.ListAsync()).Count);
        await svc.SetReportDateAsync(s.Contracts[1], LocalDate.Format(DateTime.Today));
        Assert.Equal(LocalDate.Format(DateTime.Today), (await svc.GetAsync(s.Contracts[1]))!.Str("report_done_date"));
        await svc.DeleteAsync(copy);
        Assert.Equal(5, (await svc.ListAsync()).Count);
    }

    [Fact]
    public async Task 일정관리_5건()
    {
        var (t, s) = await SeedAllAsync();
        using var _ = t;
        var svc = new ScheduleService(t.Sp, t.SessionAccessor);
        var from = DateTime.Today; var to = DateTime.Today.AddDays(10);
        Assert.Equal(5, (await svc.ListAsync(from, to, "ALL")).Count);
        Assert.Equal(3, (await svc.ListAsync(from, to, "MY")).Count);
        Assert.Equal(2, (await svc.ListAsync(from, to, "OFFICE")).Count);
        Assert.Single(await svc.ByPropertyAsync(s.Pts[0]));
        var r = (await svc.GetAsync(s.Schedules[4]))!;
        Assert.EndsWith("09:30", r.Str("start_at"));          // "930" 입력 → 09:30
        ScheduleService.SplitStart(r);
        r["title"] = "전화드리기(변경)";
        Assert.Equal(s.Schedules[4], await svc.SaveAsync(r));
        Assert.Equal("전화드리기(변경)", (await svc.GetAsync(s.Schedules[4]))!.Str("title"));

        // 달력 끌어다 놓기: 날짜만 바뀌고 시간·제목·연동 물건은 그대로
        var pt = (await svc.GetAsync(s.Schedules[0]))!;
        var target = DateTime.Today.AddDays(5);
        Assert.True(await svc.MoveAsync(s.Schedules[4], target));
        var moved = (await svc.GetAsync(s.Schedules[4]))!;
        Assert.Equal($"{LocalDate.Format(target)} 09:30", moved.Str("start_at"));
        Assert.Equal("전화드리기(변경)", moved.Str("title"));
        Assert.False(await svc.MoveAsync(s.Schedules[4], target));          // 같은 날 = 저장 안 함
        Assert.True(await svc.MoveAsync(s.Schedules[0], target));
        Assert.Equal(pt.Str("pt_no"), (await svc.GetAsync(s.Schedules[0]))!.Str("pt_no"));
        Assert.False(await svc.MoveAsync(999999, target));

        await svc.DeleteAsync(s.Schedules[2]);
        Assert.Equal(4, (await svc.ListAsync(from, to, "ALL")).Count);
    }

    [Fact]
    public async Task 메모_5건()
    {
        var (t, s) = await SeedAllAsync();
        using var _ = t;
        var svc = new MemoService(t.Sp, t.SessionAccessor);
        var list = await svc.ListAsync();
        Assert.Equal(5, list.Count);
        Assert.All(list, m => Assert.StartsWith("테스트 메모", m.Str("content")));
        await svc.SetColorAsync(s.Memos[0], MemoService.NextColor(list.First(m => m.Long("memo_id") == s.Memos[0]).Str("color")));
        await svc.SaveContentAsync(s.Memos[1], "내용 변경");
        Assert.Equal("내용 변경", (await svc.ListAsync()).First(m => m.Long("memo_id") == s.Memos[1]).Str("content"));
        await svc.DeleteAsync(s.Memos[2]);
        Assert.Equal(4, (await svc.ListAsync()).Count);
    }

    [Fact]
    public async Task 상담관리_5건()
    {
        var (t, s) = await SeedAllAsync();
        using var _ = t;
        var svc = new InterviewService(t.Sp, t.SessionAccessor);
        // 직접 등록 5 + 협력업체 상담 5 + 물건 상담 1(+고객 연동 1) — 목록은 사무소 전체 상담
        var direct = await svc.ListAsync(new Row { ["q_keyword"] = "상담" });
        Assert.True(direct.Count >= 1);
        // 방문상담 1건 + 같은 전화(이전세 고객 구입자)라 고객 상담이력에 연결 저장된 1건(기존 InsertInterview와 같음)
        Assert.Equal(2, (await svc.ListAsync(new Row { ["q_itv_type"] = "ITVTYP02" })).Count);
        Assert.Single(await svc.ListAsync(new Row { ["q_keyword"] = "01088889999" }));
        // 연락처가 고객 구입자 전화와 같으면 그 고객 상담이력에도(INS_LINKED)
        var kim = (await new CustomerService(t.Sp, t.SessionAccessor).GetAsync(s.Custs[0]))!;
        Assert.Contains(kim.Consults, c => c.Str("itv_content") == "개포자이 매매 가격 협의 전화");
        var r = (await svc.GetAsync(s.Consults[4]))!;
        r["itv_content"] = "신규 아파트 매수 문의(수정)";
        Assert.Equal(s.Consults[4], await svc.SaveAsync(r));
        Assert.Equal("신규 아파트 매수 문의(수정)", (await svc.GetAsync(s.Consults[4]))!.Str("itv_content"));
        await svc.DeleteAsync(s.Consults[4]);
        Assert.Null(await svc.GetAsync(s.Consults[4]));
    }

    [Fact]
    public async Task 협력업체_5건()
    {
        var (t, s) = await SeedAllAsync();
        using var _ = t;
        var svc = new VendorService(t.Sp, t.SessionAccessor);
        Assert.Equal(5, (await svc.ListAsync()).Count);
        Assert.Single(await svc.ListAsync(new Row { ["q_category"] = "법무 | 세무" }));
        Assert.Single(await svc.ListAsync(new Row { ["q_keyword"] = "01071000004" }));
        var d = (await svc.GetAsync(s.Vendors[0]))!;
        Assert.Single(d.Regions);
        Assert.Single(d.Consults);
        d.Vendor["manager_name"] = "김변경";
        d.Regions.Add(new Row { ["region_code"] = "1168010300", ["region_name"] = "서울특별시 강남구 개포동" });
        Assert.Equal(s.Vendors[0], await svc.SaveAsync(d));
        var d2 = (await svc.GetAsync(s.Vendors[0]))!;
        Assert.Equal("김변경", d2.Vendor.Str("manager_name"));
        Assert.Equal(2, d2.Regions.Count);
        Assert.Single(await new InterviewService(t.Sp, t.SessionAccessor).ListAsync(new Row { ["q_vendor_id"] = s.Vendors[0] }));
        await svc.DeleteAsync(s.Vendors[4]);
        Assert.Equal(4, (await svc.ListAsync()).Count);
    }

    [Fact]
    public async Task 만기관리_5건()
    {
        var (t, _) = await SeedAllAsync();
        using var __ = t;
        var svc = new ExpiryService(t.Sp, t.SessionAccessor);
        var all = await svc.ListAsync(DateTime.Today, DateTime.Today.AddMonths(6));
        Assert.Equal(5, all.Count);
        Assert.Equal(all.Select(r => r.Str("expiry_date")).OrderBy(x => x), all.Select(r => r.Str("expiry_date")));   // 만기일 순
        Assert.All(all, r => Assert.True(r.Long("d_day") > 0));
        Assert.Equal("임차일", all[0].Str("tenant_name"));
        Assert.Equal(2, (await svc.ListAsync(DateTime.Today, DateTime.Today.AddMonths(2))).Count);   // 1·2개월
        Assert.Empty(await svc.ListAsync(DateTime.Today, DateTime.Today.AddMonths(6), "SYCA115"));   // 토지 없음
    }

    [Fact]
    public async Task 업무일지_5일()
    {
        var (t, s) = await SeedAllAsync();
        using var _ = t;
        var svc = new WorklogService(t.Sp, t.SessionAccessor);
        foreach (var d in s.JournalDays) Assert.Contains("업무", (await svc.GetAsync(d)).Str("content"));
        var sum = await svc.SummaryAsync(DateTime.Today);   // 오늘 등록한 건수 자동집계
        Assert.Equal(5, sum.Long("prop_reg"));
        Assert.Equal(5, sum.Long("cust_reg"));
        Assert.Equal(5, sum.Long("contract_write"));
        Assert.Equal(5, sum.Long("sched_reg"));
        Assert.Equal(5, sum.Long("vendor_reg"));
        Assert.True((await svc.ActivityAsync(DateTime.Today)).Count >= 25);
        Assert.True((await svc.StatusAsync(DateTime.Today.Year, DateTime.Today.Month)).Count >= 1);
        var j = await svc.GetAsync(DateTime.Today);
        j["content"] = "수정한 업무";
        await svc.SaveAsync(j);
        Assert.Equal("수정한 업무", (await svc.GetAsync(DateTime.Today)).Str("content"));
    }

    [Fact]
    public async Task 보고서_5건()
    {
        var (t, s) = await SeedAllAsync();
        using var _ = t;
        var svc = new ReportService(t.Sp, t.SessionAccessor);
        Assert.Equal(5, (await svc.MineAsync()).Count);
        Assert.Single(await svc.ListAsync(new Row { ["q_pt_no"] = s.Pts[0] }));
        Assert.Single(await svc.SharesAsync(s.Reports[0]));
        var r = (await svc.GetAsync(s.Reports[0]))!;
        Assert.Contains("개포자이", r.Str("content_html"));
        await svc.AttachAsync(s.Reports[0], new[] { s.Custs[1] });
        Assert.Equal(2, (await svc.SharesAsync(s.Reports[0])).Count);
        await svc.SaveAsync(s.Reports[0], s.Pts[0], "제목 변경", r.Str("comment"), r.Str("snapshot"), r.Str("content_html"), new[] { s.Custs[0] });
        Assert.Equal("제목 변경", (await svc.GetAsync(s.Reports[0]))!.Str("title"));
        Assert.Single(await svc.SharesAsync(s.Reports[0]));
        await svc.DeleteAsync(s.Reports[4]);
        Assert.Equal(4, (await svc.MineAsync()).Count);
    }

    [Fact]
    public async Task 통합검색_네오봇()
    {
        var (t, _) = await SeedAllAsync();
        using var __ = t;
        var svc = new NeobotService(t.Sp, t.SessionAccessor);
        var r = await svc.SearchAsync("개포자이");
        Assert.Contains(r, x => x.Str("kind") == "PT");
        Assert.Contains(r, x => x.Str("kind") == "CT");
        Assert.Contains(await svc.SearchAsync("김매수"), x => x.Str("kind") == "CUST");
        Assert.Contains(await svc.SearchAsync("01011112222"), x => x.Str("kind") == "CUST");
        Assert.NotEmpty(await svc.ConsultsAsync("김매수"));
        Assert.Empty(await svc.SearchAsync("  "));
    }

    /// <summary>기존 로컬 DB에 나머지 메뉴 데이터 넣기 — NEOSYS_SEED_DB가 없으면 아무것도 안 함(물건·고객이 이미 있어야 함)</summary>
    [Fact]
    public async Task SeedOthersExistingDb()
    {
        var path = Environment.GetEnvironmentVariable("NEOSYS_SEED_DB");
        if (string.IsNullOrEmpty(path)) return;
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
        var pts = (await new PropertyService(sp, () => session).ListAsync()).Select(r => r.Long("pt_no")!.Value).OrderBy(x => x).Take(5).ToList();
        var custs = (await new CustomerService(sp, () => session).ListAsync()).Select(r => r.Long("cust_no")!.Value).OrderBy(x => x).Take(5).ToList();
        if (pts.Count < 5 || custs.Count < 5) throw new InvalidOperationException("물건·고객 5건이 먼저 있어야 합니다.");
        await SeedOthersAsync(sp, () => session, pts, custs);
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
    }
}

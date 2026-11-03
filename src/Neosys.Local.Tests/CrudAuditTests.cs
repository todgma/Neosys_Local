using System.Text.Json.Nodes;
using Dapper;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>
/// 메뉴별 등록·수정·삭제 점검 — 메뉴마다 3건 등록 → 목록·상세 확인 → 1건 수정 → 1건 삭제 → 목록 2건,
/// 딸린 행(소유자·메모·지역·연동·첨부)과 _hist 이력·업무일지 자동집계가 올바른지 본다(2026-10-26 점검 결과는 docs/CRUD_AUDIT.md).
/// </summary>
public class CrudAuditTests
{
    private static long Count(TestDb t, string sql, object? p = null)
    {
        using var c = t.Db.Open();
        return c.ExecuteScalar<long>(sql, p);
    }

    /// <summary>X_hist에서 log_type별 건수(key 컬럼 = 값으로 좁힘)</summary>
    private static long Hist(TestDb t, string table, string logType, string keyCol, object key) =>
        Count(t, $"SELECT COUNT(*) FROM \"{table}_hist\" WHERE log_type = @logType AND CAST(\"{keyCol}\" AS TEXT) = CAST(@key AS TEXT)", new { logType, key });

    private static long HistBy(TestDb t, string table, string logType, string keyCol, object key) =>
        Count(t, $"SELECT COUNT(*) FROM \"{table}_hist\" WHERE log_type = @logType AND changed_by = 'tester' AND changed_off = 3 AND CAST(\"{keyCol}\" AS TEXT) = CAST(@key AS TEXT)", new { logType, key });

    private static PropertyDetail NewApt(PropertyService svc, string dong, string ho, string owner, long saleAmt)
    {
        var d = svc.New("SYCA101");
        var p = d.Pt;
        p["addr1"] = "서울특별시"; p["addr2"] = "강남구"; p["addr3"] = "개포동"; p["bjd_code"] = "1168010300";
        p["danji_code"] = "10001"; p["addr4"] = "점검자이"; p["jibun"] = "1234";
        p["dong"] = dong; p["ho"] = ho; p["floor1"] = 5; p["floor2"] = 20;
        p["sale_div"] = "SALEDIV01"; p["sale_amt"] = saleAmt;
        d.Holders[0]["holder_name"] = owner;
        d.Holders[0]["holder_phone"] = $"010-3100-{ho.PadLeft(4, '0')}";
        d.Memos.Add(new Row { ["memo_date"] = LocalDate.Now, ["memo_content"] = $"{dong}동 {ho}호 메모", ["user_id"] = "tester" });
        d.Consults.Add(new Row { ["reg_dt"] = LocalDate.Now, ["contact_name"] = owner, ["contact_phone"] = $"010-3100-{ho.PadLeft(4, '0')}", ["itv_content"] = $"{ho}호 매도 상담" });
        d.Shares.Add(new Row { ["office_name"] = "공동중개사무소", ["office_phone"] = "02-555-0000" });
        return d;
    }

    [Fact]
    public async Task 물건_3건_수정_삭제()
    {
        using var t = new TestDb();
        var svc = new PropertyService(t.Sp, t.SessionAccessor);
        var root = Path.Combine(Path.GetTempPath(), $"neosys_files_{Guid.NewGuid():N}");
        var photo = Path.Combine(Path.GetTempPath(), $"사진_{Guid.NewGuid():N}.png");
        await File.WriteAllBytesAsync(photo, new byte[] { 0x89, 0x50, 0x4E, 0x47, 1 });
        try
        {
            var pts = new List<long>();
            foreach (var (dong, ho, owner, amt) in new[] { ("101", "101", "점검일", 100000L), ("102", "202", "점검이", 110000L), ("103", "303", "점검삼", 120000L) })
                pts.Add(await svc.SaveAsync(NewApt(svc, dong, ho, owner, amt)));

            // 등록: 새 키 3개, 목록 3건, 상세에 딸린 행
            Assert.Equal(3, pts.Distinct().Count());
            Assert.Equal(3, (await svc.ListAsync()).Count);
            foreach (var no in pts)
            {
                var d = (await svc.GetAsync(no))!;
                Assert.Single(d.Holders);
                Assert.Single(d.Memos);
                Assert.Single(d.Consults);
                Assert.Single(d.Shares);
            }

            // 연동: 물건 3에 일정 1건 + 사진 1장
            var sch = new ScheduleService(t.Sp, t.SessionAccessor);
            var s = sch.New(DateTime.Today, pts[2]); s["title"] = "임장";
            var schId = await sch.SaveAsync(s);
            var files = new FileService(t.Sp, t.SessionAccessor, root);
            await files.AttachAsync(FileKind.PropertyPhoto, pts[2].ToString(), photo);
            Assert.Single(await sch.ByPropertyAsync(pts[2]));

            // 수정: 같은 키, 금액 변경 + 임차인 추가 + 메모 삭제
            var e = (await svc.GetAsync(pts[0]))!;
            e.Pt["sale_amt"] = 95000;
            e.Holders.Add(new Row { ["holder_type"] = "BUYER", ["holder_name"] = "임차인", ["holder_phone"] = "010-3200-0001" });
            e.Memos.Clear();
            Assert.Equal(pts[0], await svc.SaveAsync(e));
            Assert.Equal(3, (await svc.ListAsync()).Count);
            var e2 = (await svc.GetAsync(pts[0]))!;
            Assert.Equal(95000, e2.Pt.Long("sale_amt"));
            Assert.Equal(2, e2.Holders.Count);
            Assert.Empty(e2.Memos);

            // 삭제 전 연동 건수(화면이 "연동 정보도 삭제할까요?"로 묻는 근거)
            Assert.Equal((1, 1), await svc.LinkCountsAsync(pts[2]));
            Assert.Equal((0, 0), await svc.LinkCountsAsync(pts[1]));

            // 삭제(이력 저장 후 + 연동 함께): 목록 2건, 상세 없음, 딸린 행 없음, 과거내역 1건
            await svc.DeleteAsync(pts[2], saveHistory: true, deleteLinks: true);
            Assert.Equal(2, (await svc.ListAsync()).Count);
            Assert.Null(await svc.GetAsync(pts[2]));
            Assert.Single(await svc.HistoryAsync(pts[2]));
            foreach (var tbl in new[] { "pt_sale_holder", "pt_memo", "pt_share", "pt_lease_status", "pt_land_additional" })
                Assert.Equal(0, Count(t, $"SELECT COUNT(*) FROM {tbl} WHERE pt_no = @p", new { p = pts[2] }));
            // 상담이력은 상담관리 기록이라 남는다(고객 삭제와 같은 규칙)
            Assert.Equal(1, Count(t, "SELECT COUNT(*) FROM ct_interview WHERE pt_no = @p", new { p = pts[2] }));
            // 일정은 남고 물건 연동만 끊긴다, 사진은 사용안함
            Assert.Empty(await sch.ByPropertyAsync(pts[2]));
            Assert.Null((await sch.GetAsync(schId))!.Str("pt_no"));
            Assert.Empty(await files.ListAllAsync(pts[2].ToString()));
            // 통합검색에 안 나온다
            Assert.DoesNotContain(await new NeobotService(t.Sp, t.SessionAccessor).SearchAsync("점검자이"), r => r.Str("kind") == "PT" && r.Long("pt_no") == pts[2]);

            // 이력: 등록 3 · 수정(물건 1) · 삭제 1 — 작성자·사무소 기록
            Assert.Equal(3, Count(t, "SELECT COUNT(*) FROM pt_sale_hist WHERE log_type = 'I'"));
            Assert.True(HistBy(t, "pt_sale", "U", "pt_no", pts[0]) >= 1);
            Assert.Equal(1, HistBy(t, "pt_sale", "D", "pt_no", pts[2]));
            Assert.Equal(1, Hist(t, "pt_sale_holder", "D", "pt_no", pts[2]));
            Assert.Equal(1, Hist(t, "pt_sale_holder", "I", "pt_no", pts[0]) - 1);   // 소유자 1 + 임차인 1
            Assert.Equal(1, Hist(t, "pt_memo", "D", "pt_no", pts[0]));
            Assert.Equal(1, Hist(t, "pt_memo", "D", "pt_no", pts[2]));

            var sum = await new WorklogService(t.Sp, t.SessionAccessor).SummaryAsync(DateTime.Today);
            Assert.Equal(3, sum.Long("prop_reg"));
            Assert.Equal(1, sum.Long("prop_del"));
        }
        finally
        {
            File.Delete(photo);
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task 물건_삭제_연동은_남기기()
    {
        using var t = new TestDb();
        var svc = new PropertyService(t.Sp, t.SessionAccessor);
        var root = Path.Combine(Path.GetTempPath(), $"neosys_files_{Guid.NewGuid():N}");
        var photo = Path.Combine(Path.GetTempPath(), $"사진_{Guid.NewGuid():N}.png");
        await File.WriteAllBytesAsync(photo, new byte[] { 0x89, 0x50, 0x4E, 0x47, 1 });
        try
        {
            var ptNo = await svc.SaveAsync(NewApt(svc, "101", "101", "점검일", 100000));
            var sch = new ScheduleService(t.Sp, t.SessionAccessor);
            var s = sch.New(DateTime.Today, ptNo); s["title"] = "임장";
            var schId = await sch.SaveAsync(s);
            var s2 = sch.New(DateTime.Today, ptNo); s2["title"] = "잔금일";
            await sch.DeleteAsync(await sch.SaveAsync(s2));               // 삭제한 일정은 세지 않는다
            var files = new FileService(t.Sp, t.SessionAccessor, root);
            await files.AttachAsync(FileKind.PropertyPhoto, ptNo.ToString(), photo);
            await files.AttachAsync(FileKind.FloorPlan, ptNo.ToString(), photo);
            Assert.Equal((1, 2), await svc.LinkCountsAsync(ptNo));

            // [아니오] 연동은 남기고 물건만 삭제
            await svc.DeleteAsync(ptNo);
            Assert.Null(await svc.GetAsync(ptNo));
            Assert.Equal(ptNo.ToString(), (await sch.GetAsync(schId))!.Str("pt_no"));
            Assert.Equal(2, (await files.ListAllAsync(ptNo.ToString())).Count);
        }
        finally
        {
            File.Delete(photo);
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task 고객_3건_수정_삭제()
    {
        using var t = new TestDb();
        var svc = new CustomerService(t.Sp, t.SessionAccessor);
        var custs = new List<long>();
        foreach (var (name, tel) in new[] { ("고객일", "010-4100-0001"), ("고객이", "010-4100-0002"), ("고객삼", "010-4100-0003") })
        {
            var d = svc.New();
            d.Cust["want_type"] = "주거용"; d.Cust["trd_type"] = "TRDTYP01"; d.Cust["trd_prg"] = "TRDPRG01";
            d.Buyers[0]["name"] = name; d.Buyers[0]["tel"] = tel;
            d.Areas.Add(new Row { ["addr1"] = "서울특별시", ["addr2"] = "강남구", ["addr3"] = "대치동", ["bjd_code"] = "1168010600" });
            d.Memos.Add(new Row { ["memo_date"] = LocalDate.Now, ["memo_content"] = $"{name} 메모", ["user_id"] = "tester" });
            d.Consults.Add(new Row { ["reg_dt"] = LocalDate.Now, ["contact_name"] = name, ["contact_phone"] = tel, ["itv_content"] = $"{name} 상담" });
            d.Shares[0]["office_name"] = "공동중개";
            custs.Add(await svc.SaveAsync(d));
        }

        Assert.Equal(3, custs.Distinct().Count());
        Assert.Equal(3, (await svc.ListAsync()).Count);
        foreach (var no in custs)
        {
            var d = (await svc.GetAsync(no))!;
            Assert.Single(d.Buyers);
            Assert.Single(d.Areas);
            Assert.Single(d.Memos);
            Assert.Single(d.Consults);
            Assert.Single(d.Shares);
        }

        // 수정: 같은 키, 희망지역 삭제 + 구입자 추가 + 상담 내용 수정
        var k = (await svc.GetAsync(custs[0]))!;
        k.Areas.Clear();
        k.Buyers.Add(new Row { ["name"] = "고객일배우자", ["tel"] = "010-4100-1001", ["relation"] = "배우자" });
        k.Consults[0]["itv_content"] = "고객일 상담(수정)";
        Assert.Equal(custs[0], await svc.SaveAsync(k));
        Assert.Equal(3, (await svc.ListAsync()).Count);
        var k2 = (await svc.GetAsync(custs[0]))!;
        Assert.Empty(k2.Areas);
        Assert.Equal(2, k2.Buyers.Count);
        Assert.Equal("고객일 상담(수정)", k2.Consults.Single().Str("itv_content"));

        // 삭제: 목록 2건, 딸린 행 없음(상담이력은 남김)
        await svc.DeleteAsync(custs[2]);
        Assert.Equal(2, (await svc.ListAsync()).Count);
        Assert.Null(await svc.GetAsync(custs[2]));
        foreach (var tbl in new[] { "ct_trd_area", "ct_cust_buyer", "pt_share", "pt_memo", "report_cust" })
            Assert.Equal(0, Count(t, $"SELECT COUNT(*) FROM {tbl} WHERE cust_no = @c", new { c = custs[2] }));
        Assert.Equal(1, Count(t, "SELECT COUNT(*) FROM ct_interview WHERE cust_no = @c", new { c = custs[2] }));
        Assert.DoesNotContain(await new NeobotService(t.Sp, t.SessionAccessor).SearchAsync("고객삼"), r => r.Str("kind") == "CUST");

        Assert.Equal(3, Count(t, "SELECT COUNT(*) FROM ct_cust_hist WHERE log_type = 'I'"));
        Assert.True(HistBy(t, "ct_cust", "U", "cust_no", custs[0]) >= 1);
        Assert.Equal(1, HistBy(t, "ct_cust", "D", "cust_no", custs[2]));
        Assert.Equal(1, Hist(t, "ct_cust_buyer", "D", "cust_no", custs[2]));
        Assert.Equal(1, Hist(t, "ct_trd_area", "D", "cust_no", custs[2]));
        Assert.Equal(1, Hist(t, "ct_interview", "U", "itv_no", k2.Consults[0].Long("itv_no")!));

        var sum = await new WorklogService(t.Sp, t.SessionAccessor).SummaryAsync(DateTime.Today);
        Assert.Equal(3, sum.Long("cust_reg"));
        Assert.Equal(1, sum.Long("cust_del"));
    }

    [Fact]
    public async Task 계약_3건_수정_삭제()
    {
        using var t = new TestDb();
        var svc = new ContractService(t.Sp, t.SessionAccessor);
        var ids = new List<string>();
        foreach (var (addr, seller, buyer, amt) in new[]
        {
            ("서울 강남구 개포동 점검자이 101동 101호", "매도일", "매수일", "100000"),
            ("서울 강남구 개포동 점검자이 102동 202호", "매도이", "매수이", "110000"),
            ("서울 강남구 개포동 점검빌라 3층", "매도삼", "매수삼", "120000"),
        })
        {
            var doc = new JsonObject
            {
                ["docType"] = "아파트매매계약서(단독)", ["category"] = "sale", ["ptType"] = "아파트", ["docHint"] = "매매",
                ["소재지"] = addr, ["매매대금"] = amt, ["매도인_성명"] = seller, ["매수인_성명"] = buyer, ["계약일자"] = LocalDate.Today,
            };
            ids.Add(await svc.SaveAsync(new Row(), doc));
        }
        Assert.Equal(3, ids.Distinct().Count());
        Assert.Equal(3, (await svc.ListAsync()).Count);
        Assert.Equal("매도이", (await svc.GetAsync(ids[1]))!.Str("seller"));

        // 수정(같은 id)
        var m = (await svc.GetAsync(ids[0]))!;
        var d = ContractService.ParseDoc(m.Str("doc"));
        d["매수인_성명"] = "매수변경";
        Assert.Equal(ids[0], await svc.SaveAsync(m, d));
        Assert.Equal(3, (await svc.ListAsync()).Count);
        Assert.Equal("매수변경", (await svc.GetAsync(ids[0]))!.Str("buyer"));

        // 삭제(사용안함): 목록 2건, 상세 없음, 통합검색 안 나옴, 이력은 '삭제'(D)로
        await svc.DeleteAsync(ids[2]);
        Assert.Equal(2, (await svc.ListAsync()).Count);
        Assert.Null(await svc.GetAsync(ids[2]));
        Assert.DoesNotContain(await new NeobotService(t.Sp, t.SessionAccessor).SearchAsync("점검빌라"), r => r.Str("kind") == "CT");
        Assert.Equal(3, Count(t, "SELECT COUNT(*) FROM contract_master_hist WHERE log_type = 'I'"));
        Assert.True(HistBy(t, "contract_master", "U", "master_id", ids[0]) >= 1);
        Assert.Equal(1, HistBy(t, "contract_master", "D", "master_id", ids[2]));

        var sum = await new WorklogService(t.Sp, t.SessionAccessor).SummaryAsync(DateTime.Today);
        Assert.Equal(3, sum.Long("contract_write"));
        Assert.Equal(1, sum.Long("contract_del"));
    }

    [Fact]
    public async Task 일정_3건_수정_삭제()
    {
        using var t = new TestDb();
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var ptNo = await pt.SaveAsync(NewApt(pt, "101", "101", "점검일", 100000));
        var svc = new ScheduleService(t.Sp, t.SessionAccessor);
        var ids = new List<long>();
        foreach (var (title, days, link) in new[] { ("계약일", 0, true), ("잔금일", 3, false), ("임장", 5, false) })
        {
            var r = svc.New(DateTime.Today.AddDays(days), link ? ptNo : null);
            r["title"] = title; r["start_time"] = "14:00"; r["content"] = $"{title} 점검";
            ids.Add(await svc.SaveAsync(r));
        }
        var from = DateTime.Today; var to = DateTime.Today.AddDays(7);
        Assert.Equal(3, (await svc.ListAsync(from, to)).Count);
        Assert.Single(await svc.ByPropertyAsync(ptNo));
        Assert.Equal(ptNo.ToString(), (await svc.GetAsync(ids[0]))!.Str("pt_no"));

        // 수정: 제목·시간, 연동 물건 해제
        var e = (await svc.GetAsync(ids[0]))!;
        ScheduleService.SplitStart(e);
        e["title"] = "계약일(변경)"; e["start_time"] = "15:30"; e["pt_no"] = null;
        Assert.Equal(ids[0], await svc.SaveAsync(e));
        var e2 = (await svc.GetAsync(ids[0]))!;
        Assert.Equal("계약일(변경)", e2.Str("title"));
        Assert.EndsWith("15:30", e2.Str("start_at"));
        Assert.Empty(await svc.ByPropertyAsync(ptNo));

        // 삭제(사용안함): 목록 2건, 상세 없음, 이력 D
        await svc.DeleteAsync(ids[2]);
        Assert.Equal(2, (await svc.ListAsync(from, to)).Count);
        Assert.Null(await svc.GetAsync(ids[2]));
        Assert.Equal(3, Count(t, "SELECT COUNT(*) FROM rt_schedule_hist WHERE log_type = 'I'"));
        Assert.Equal(1, HistBy(t, "rt_schedule", "D", "schedule_id", ids[2]));
        Assert.True(HistBy(t, "rt_schedule", "U", "schedule_id", ids[0]) >= 1);

        var sum = await new WorklogService(t.Sp, t.SessionAccessor).SummaryAsync(DateTime.Today);
        Assert.Equal(3, sum.Long("sched_reg"));
        Assert.Equal(1, sum.Long("sched_del"));
        Assert.Equal(1, sum.Long("sched_upd"));
    }

    /// <summary>화면 점검에서 찾음: 기본 보기 '사무소 일정'에서 기본 범위 '개인'으로 등록하면 달력에 안 보인다 → 저장 후 안내. 안내 판단(VisibleIn)이 목록 SQL과 같은지</summary>
    [Fact]
    public async Task 일정_범위별_보기()
    {
        using var t = new TestDb();
        var svc = new ScheduleService(t.Sp, t.SessionAccessor);
        foreach (var scope in new[] { "MY", "OFFICE", "SHARE" })
        {
            var r = svc.New(DateTime.Today); r["title"] = scope; r["scope_div"] = scope;
            await svc.SaveAsync(r);
        }
        foreach (var view in new[] { "MY", "OFFICE" })
        {
            var shown = (await svc.ListAsync(DateTime.Today, DateTime.Today, view)).Select(r => r.Str("scope_div")).OrderBy(x => x);
            Assert.Equal(new[] { "MY", "OFFICE", "SHARE" }.Where(s => ScheduleService.VisibleIn(s, view)).OrderBy(x => x), shown);
        }
        Assert.False(ScheduleService.VisibleIn(svc.New()["scope_div"] as string, "OFFICE"));   // 새 일정 기본값은 사무소 일정 보기에 안 나옴
    }

    [Fact]
    public async Task 메모_3건_수정_삭제()
    {
        using var t = new TestDb();
        var svc = new MemoService(t.Sp, t.SessionAccessor);
        var ids = new List<long>();
        for (int i = 0; i < 3; i++)
        {
            var m = await svc.AddAsync(i);
            await svc.SaveContentAsync(m.Long("memo_id")!.Value, $"점검 메모 {i + 1}");
            ids.Add(m.Long("memo_id")!.Value);
        }
        Assert.Equal(3, (await svc.ListAsync()).Count);
        await svc.SaveContentAsync(ids[0], "점검 메모 1(수정)");
        await svc.SetColorAsync(ids[0], MemoService.Colors[3]);
        var m0 = (await svc.ListAsync()).Single(m => m.Long("memo_id") == ids[0]);
        Assert.Equal("점검 메모 1(수정)", m0.Str("content"));
        Assert.Equal(MemoService.Colors[3], m0.Str("color"));
        await svc.DeleteAsync(ids[2]);
        var list = await svc.ListAsync();
        Assert.Equal(2, list.Count);
        Assert.DoesNotContain(list, m => m.Long("memo_id") == ids[2]);
        // 다른 사용자에게는 안 보인다
        var other = new MemoService(t.Sp, () => new AppSession { RtNo = 8, OffNo = 3, UserId = "other" });
        Assert.Empty(await other.ListAsync());
    }

    [Fact]
    public async Task 상담_3건_수정_삭제()
    {
        using var t = new TestDb();
        var svc = new InterviewService(t.Sp, t.SessionAccessor);
        var ids = new List<long>();
        foreach (var (type, name, phone) in new[] { ("ITVTYP01", "상담일", "010-5100-0001"), ("ITVTYP02", "상담이", "010-5100-0002"), ("ITVTYP03", "상담삼", "010-5100-0003") })
        {
            var r = svc.New();
            r["itv_type"] = type; r["contact_name"] = name; r["cust_name"] = name; r["contact_phone"] = phone; r["itv_content"] = $"{name} 점검 상담";
            ids.Add(await svc.SaveAsync(r));
        }
        Assert.Equal(3, (await svc.ListAsync()).Count);
        Assert.Single(await svc.ListAsync(new Row { ["q_itv_type"] = "ITVTYP02" }));

        var e = (await svc.GetAsync(ids[0]))!;
        e["itv_content"] = "상담일 점검 상담(수정)"; e["itv_type"] = "ITVTYP04";
        Assert.Equal(ids[0], await svc.SaveAsync(e));
        Assert.Equal(3, (await svc.ListAsync()).Count);
        var e2 = (await svc.GetAsync(ids[0]))!;
        Assert.Equal("상담일 점검 상담(수정)", e2.Str("itv_content"));
        Assert.Equal("ITVTYP04", e2.Str("itv_type"));

        await svc.DeleteAsync(ids[2]);
        Assert.Equal(2, (await svc.ListAsync()).Count);
        Assert.Null(await svc.GetAsync(ids[2]));
        Assert.Equal(3, Count(t, "SELECT COUNT(*) FROM ct_interview_hist WHERE log_type = 'I'"));
        Assert.Equal(1, HistBy(t, "ct_interview", "U", "itv_no", ids[0]));
        Assert.Equal(1, HistBy(t, "ct_interview", "D", "itv_no", ids[2]));
        Assert.Equal(3, (await new WorklogService(t.Sp, t.SessionAccessor).SummaryAsync(DateTime.Today)).Long("consult_memo"));
    }

    [Fact]
    public async Task 협력업체_3건_수정_삭제()
    {
        using var t = new TestDb();
        var svc = new VendorService(t.Sp, t.SessionAccessor);
        var ids = new List<long>();
        foreach (var (name, phone) in new[] { ("점검이사", "010-6100-0001"), ("점검은행", "010-6100-0002"), ("점검법무", "010-6100-0003") })
        {
            var v = svc.New();
            v.Vendor["vendor_name"] = name; v.Vendor["category1"] = "이사 | 청소"; v.Vendor["manager_name"] = "담당"; v.Vendor["manager_phone"] = phone;
            v.Regions.Add(new Row { ["region_code"] = "1168010600", ["region_name"] = "서울특별시 강남구 대치동" });
            v.Consults.Add(new Row { ["reg_dt"] = LocalDate.Now, ["contact_name"] = "담당", ["contact_phone"] = phone, ["itv_content"] = $"{name} 견적" });
            ids.Add(await svc.SaveAsync(v));
        }
        Assert.Equal(3, (await svc.ListAsync()).Count);
        foreach (var id in ids)
        {
            var d = (await svc.GetAsync(id))!;
            Assert.Single(d.Regions);
            Assert.Single(d.Consults);
        }

        var e = (await svc.GetAsync(ids[0]))!;
        e.Vendor["manager_name"] = "담당변경";
        e.Regions.Add(new Row { ["region_code"] = "1168010300", ["region_name"] = "서울특별시 강남구 개포동" });
        e.Consults.Clear();
        Assert.Equal(ids[0], await svc.SaveAsync(e));
        var e2 = (await svc.GetAsync(ids[0]))!;
        Assert.Equal("담당변경", e2.Vendor.Str("manager_name"));
        Assert.Equal(2, e2.Regions.Count);
        Assert.Empty(e2.Consults);
        Assert.Equal(3, (await svc.ListAsync()).Count);

        await svc.DeleteAsync(ids[2]);
        Assert.Equal(2, (await svc.ListAsync()).Count);
        Assert.Null(await svc.GetAsync(ids[2]));
        Assert.Equal(3, Count(t, "SELECT COUNT(*) FROM vd_vendor_info_hist WHERE log_type = 'I'"));
        Assert.True(HistBy(t, "vd_vendor_info", "U", "vendor_id", ids[0]) >= 1);
        Assert.Equal(1, HistBy(t, "vd_vendor_info", "D", "vendor_id", ids[2]));

        var sum = await new WorklogService(t.Sp, t.SessionAccessor).SummaryAsync(DateTime.Today);
        Assert.Equal(3, sum.Long("vendor_reg"));
        Assert.Equal(1, sum.Long("vendor_del"));
    }

    [Fact]
    public async Task 만기_3건_수정_삭제()
    {
        using var t = new TestDb();
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var svc = new ExpiryService(t.Sp, t.SessionAccessor);
        var pts = new List<long>();
        foreach (var (ho, status, months, tenant) in new[] { ("101", "전세", 1, "세입일"), ("202", "월세", 2, "세입이"), ("303", "기타임대", 3, "세입삼") })
        {
            var d = NewApt(pt, "101", ho, "집주인", 100000);
            d.Pt["current_status"] = status;
            d.Pt["mtry_date"] = LocalDate.Format(DateTime.Today.AddMonths(months));
            d.Pt["now_dep_amt"] = 30000;
            d.Holders.Add(new Row { ["holder_type"] = "BUYER", ["holder_name"] = tenant, ["holder_phone"] = "010-7100-" + ho.PadLeft(4, '0') });
            pts.Add(await pt.SaveAsync(d));
        }
        var from = DateTime.Today; var to = DateTime.Today.AddMonths(6);
        var list = await svc.ListAsync(from, to);
        Assert.Equal(3, list.Count);
        Assert.Equal(new[] { "세입일", "세입이", "세입삼" }, list.Select(r => r.Str("tenant_name")));

        // 수정: 만기일을 5개월 뒤로 → 순서가 바뀐다
        var e = (await pt.GetAsync(pts[0]))!;
        e.Pt["mtry_date"] = LocalDate.Format(DateTime.Today.AddMonths(5));
        await pt.SaveAsync(e);
        list = await svc.ListAsync(from, to);
        Assert.Equal(3, list.Count);
        Assert.Equal("세입일", list[^1].Str("tenant_name"));
        Assert.Equal(2, (await svc.ListAsync(from, DateTime.Today.AddMonths(3))).Count);

        // 삭제(물건 삭제) → 2건
        await pt.DeleteAsync(pts[1]);
        list = await svc.ListAsync(from, to);
        Assert.Equal(2, list.Count);
        Assert.DoesNotContain(list, r => r.Str("tenant_name") == "세입이");
    }

    [Fact]
    public async Task 업무일지_3일_수정()
    {
        using var t = new TestDb();
        var svc = new WorklogService(t.Sp, t.SessionAccessor);
        var days = new[] { DateTime.Today, DateTime.Today.AddDays(-1), DateTime.Today.AddDays(-2) };
        foreach (var d in days)
        {
            var j = await svc.GetAsync(d);
            j["content"] = $"{d:MM/dd} 점검 업무";
            await svc.SaveAsync(j, await svc.SummaryAsync(d));
        }
        foreach (var d in days) Assert.Equal($"{d:MM/dd} 점검 업무", (await svc.GetAsync(d)).Str("content"));
        Assert.Equal(3, (await svc.StatusAsync(DateTime.Today.Year, DateTime.Today.Month)).Count
                        + (await svc.StatusAsync(DateTime.Today.AddMonths(-1).Year, DateTime.Today.AddMonths(-1).Month)).Count);

        // 수정: 같은 날 다시 저장해도 1건(UPSERT)
        var j0 = await svc.GetAsync(days[0]);
        j0["content"] = "수정한 업무";
        await svc.SaveAsync(j0);
        Assert.Equal("수정한 업무", (await svc.GetAsync(days[0])).Str("content"));
        Assert.Equal(3, Count(t, "SELECT COUNT(*) FROM rt_work_journal"));

        // 다른 직원 일지는 섞이지 않는다
        var other = new WorklogService(t.Sp, () => new AppSession { RtNo = 8, OffNo = 3, UserId = "other" });
        Assert.Null((await other.GetAsync(days[0])).Str("content"));
    }

    [Fact]
    public async Task 통합검색_등록_삭제_반영()
    {
        using var t = new TestDb();
        var pt = new PropertyService(t.Sp, t.SessionAccessor);
        var cs = new CustomerService(t.Sp, t.SessionAccessor);
        var ptNos = new List<long>();
        foreach (var ho in new[] { "101", "202", "303" }) ptNos.Add(await pt.SaveAsync(NewApt(pt, "105", ho, "검색주인" + ho, 100000)));
        var custNos = new List<long>();
        foreach (var name in new[] { "검색고객가", "검색고객나", "검색고객다" })
        {
            var d = cs.New();
            d.Buyers[0]["name"] = name; d.Buyers[0]["tel"] = "010-8100-000" + custNos.Count;
            custNos.Add(await cs.SaveAsync(d));
        }
        var bot = new NeobotService(t.Sp, t.SessionAccessor);
        Assert.Equal(3, (await bot.SearchAsync("점검자이")).Count(r => r.Str("kind") == "PT"));
        Assert.Equal(3, (await bot.SearchAsync("검색고객")).Count(r => r.Str("kind") == "CUST"));
        Assert.Single((await bot.SearchAsync("01081000001")).Where(r => r.Str("kind") == "CUST"));

        await pt.DeleteAsync(ptNos[0]);
        await cs.DeleteAsync(custNos[0]);
        Assert.Equal(2, (await bot.SearchAsync("점검자이")).Count(r => r.Str("kind") == "PT"));
        Assert.Equal(2, (await bot.SearchAsync("검색고객")).Count(r => r.Str("kind") == "CUST"));
        Assert.Empty((await bot.SearchAsync("01081000000")).Where(r => r.Str("kind") == "CUST"));
    }
}

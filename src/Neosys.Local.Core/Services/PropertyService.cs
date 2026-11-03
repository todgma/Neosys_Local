using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>물건 등록창 한 번에 저장하는 묶음(기존 PropertyCreateDto/UpdateDto와 같은 범위)</summary>
public sealed class PropertyDetail
{
    public Row Pt { get; init; } = new();
    public List<Row> Holders { get; init; } = new();    // 소유자/임차인 pt_sale_holder
    public List<Row> Shares { get; init; } = new();     // 공동중개사 사무소 pt_share(pt_no)
    public List<Row> Memos { get; init; } = new();      // 물건특징 pt_memo(pt_no)
    public List<Row> Consults { get; init; } = new();   // 상담내용 ct_interview(pt_no)
    public List<Row> LeaseRows { get; init; } = new();  // 임대차현황서 pt_lease_status
    public List<Row> Parcels { get; init; } = new();    // 토지 필지목록 pt_land_additional

    public long? PtNo => Pt.Long("pt_no");
    public bool IsNew => PtNo is null or 0;
}

/// <summary>
/// 물건관리 — 기존 PropertyServices(목록·상세·등록·수정·삭제·상태변경·과거내역)를 로컬 SQLite로 옮긴 것.
/// 등록은 새 물건번호를 돌려주고 Pt["pt_no"]에 채운다(다시 저장하면 수정 — 기존의 중복 등록 버그 방지).
/// </summary>
public sealed class PropertyService : ServiceBase
{
    public PropertyService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    /// <summary>
    /// filter 키: q_keyword, q_pt_type(콤마), q_sale_div(콤마), q_pt_sts, q_rt_no, q_danji_code, q_bjd_codes(콤마),
    /// q_dong, q_ho, q_floor(top/first/exceptFirst), q_area_min/max(㎡), q_amt_min/max·q_mon_min/max(만원), q_order(reg/upd)
    /// </summary>
    public Task<List<Row>> ListAsync(Row? filter = null) => Sp.QueryRowsAsync("pt_sale", "LIST", P(filter));

    /// <summary>물건유형별 건수(SYCA 코드 → 건수)</summary>
    public async Task<Dictionary<string, long>> TypeCountsAsync(long? rtNo = null) =>
        (await Sp.QueryRowsAsync("pt_sale", "TYPE_COUNT", P(new { q_rt_no = rtNo })))
        .ToDictionary(r => r.Str("pt_type")!, r => r.Long("cnt") ?? 0);

    /// <summary>
    /// 좌측 '물건리스트'(기존 summaries) — 단지별 묶음 + 단지 없는 물건 1건씩. display_name이 없으면 '읍면동 유형명'.
    /// 결과: group_key(단지코드 또는 PT_번호), danji_code, pt_no, display_name, property_count, family_cnt
    /// </summary>
    public async Task<List<Row>> SummaryAsync(string? ptType = null, string? ptSts = null)
    {
        var rows = await Sp.QueryRowsAsync("pt_sale", "SUMMARY", P(new { q_pt_type = ptType, q_pt_sts = ptSts }));
        foreach (var r in rows)
            if (!r.Has("display_name")) r["display_name"] = $"{r.Str("addr3")} {Catalog.PropertyTypeName(r.Str("pt_type")) ?? "기타"}".Trim();
        return rows;
    }

    public PropertyDetail New(string? ptType = null)
    {
        var p = new Row
        {
            ["pt_type"] = ptType ?? "SYCA101",
            ["pt_sts"] = "PTSTS01",
            ["area_unit"] = "㎡",
            ["rt_no"] = Session.RtNo.ToString(),
            ["off_no"] = Session.OffNo,
        };
        var d = new PropertyDetail { Pt = p };
        d.Holders.Add(new Row { ["holder_type"] = "OWNER", ["holder_reg_date"] = LocalDate.Today });
        return d;
    }

    public async Task<PropertyDetail?> GetAsync(long ptNo)
    {
        var key = new { pt_no = ptNo };
        var pt = await Sp.QueryRowAsync("pt_sale", "GET", key);
        if (pt is null) return null;
        var owner = new { pt_no = ptNo, cust_no = (long?)null };
        return new PropertyDetail
        {
            Pt = pt,
            Holders = await Sp.QueryRowsAsync("fn_pt_sale_holder", "SEL", key),
            Shares = await Sp.QueryRowsAsync("pt_share", "SEL", owner),
            Memos = await Sp.QueryRowsAsync("pt_memo", "SEL", owner),
            Consults = await Sp.QueryRowsAsync("ct_interview", "SEL_OWNER", key),
            LeaseRows = await Sp.QueryRowsAsync("pt_lease_status", "SEL", key),
            Parcels = await Sp.QueryRowsAsync("pt_land_additional", "SEL", key),
        };
    }

    /// <summary>저장(등록/수정). 물건번호를 돌려준다.</summary>
    public async Task<long> SaveAsync(PropertyDetail d)
    {
        var p = d.Pt;
        // 소재지(법정동코드) 필수 — 기존 handleSubmit과 동일
        if (!p.Has("bjd_code")) throw new InvalidOperationException("소재지를 입력해주세요.");
        if (!p.Has("pt_type")) throw new InvalidOperationException("물건유형을 선택해주세요.");
        if (d.Consults.Any(x => x.Long("itv_no") is null or 0 && x.Has("itv_content") && !x.Has("contact_phone")))
            throw new InvalidOperationException("상담이력은 전화번호를 입력해야 저장할 수 있습니다.");
        // 기타임대유형: 기타임대(SALEDIV04*) 선택 시에만 저장
        if (!(p.Str("sale_div") ?? "").Contains("SALEDIV04")) p["etc_lease_type"] = null;
        if (!p.Has("pt_name")) p["pt_name"] = DefaultName(p);

        var ptNo = await Sp.InTransactionAsync(async tx =>
        {
            long no;
            if (d.IsNew) no = await tx.InsertAsync("pt_sale", "INS", P(p));
            else
            {
                no = d.PtNo!.Value;
                await tx.ExecuteAsync("pt_sale", "UPD", P(p));
            }

            await SyncHoldersAsync(tx, no, d.Holders);

            var shareOwner = new Row { ["pt_no"] = no, ["cust_no"] = null };
            await ChildSync.ReplaceAllAsync(tx, "pt_share", shareOwner, d.Shares, "share_idx",
                new[] { "office_name", "office_phone", "region_name", "memo" }, r => P(r, shareOwner));

            var existingMemos = (await tx.QueryRowsAsync("pt_memo", "SEL", shareOwner)).Select(r => r.Long("memo_no")!.Value);
            await ChildSync.MergeAsync(tx, "pt_memo", "memo_no", existingMemos, d.Memos, "memo_content", r => P(r, shareOwner));

            var key = new Row { ["pt_no"] = no };
            var existingItv = (await tx.QueryRowsAsync("ct_interview", "SEL_OWNER", key)).Select(r => r.Long("itv_no")!.Value);
            var rtNo = long.TryParse(p.Str("rt_no"), out var rt) ? rt : (long?)null;
            await ChildSync.MergeAsync(tx, "ct_interview", "itv_no", existingItv, d.Consults, "itv_content",
                r => P(r, new { pt_no = no, cust_no = (long?)null, cust_name = p.Str("pt_name"), rt_no = rtNo, off_no = p.Long("off_no") }),
                updMode: "UPD_CONTENT",
                // 연락처가 고객 구입자 전화와 같으면 그 고객 상담이력에도 함께(기존 SyncPropertyConsults)
                afterInsert: r => tx.ExecuteAsync("ct_interview", "INS_BY_PHONE", P(r, new { cust_name = p.Str("pt_name") })));

            await ChildSync.ReplaceAllAsync(tx, "pt_lease_status", key, d.LeaseRows, "seq",
                new[] { "room_no", "area", "cur_status", "deposit", "monthly_rent", "maint_cost", "contract_start", "contract_end", "business_type", "business_name" },
                r => P(r, key));
            await ChildSync.ReplaceAllAsync(tx, "pt_land_additional", key, d.Parcels, "seq",
                new[] { "jibun", "land_area", "land_category", "land_use", "other_restrictions" }, r => P(r, key));
            return no;
        });

        p["pt_no"] = ptNo;
        foreach (var h in d.Holders) h["pt_no"] = ptNo;
        return ptNo;
    }

    /// <summary>소유자/임차인: 빠진 행 삭제, 기존 행 수정, 새 행은 holder_idx를 이어서 채번(fn_pt_sale_holder와 동일)</summary>
    private async Task SyncHoldersAsync(SpTransaction tx, long ptNo, List<Row> holders)
    {
        var key = new Row { ["pt_no"] = ptNo };
        var existing = (await tx.QueryRowsAsync("fn_pt_sale_holder", "SEL", key)).Select(r => (int)r.Long("holder_idx")!.Value).ToList();
        var rows = holders.Where(h => h.Has("holder_name") || h.Has("holder_phone")).ToList();
        var keep = rows.Select(h => h.Long("holder_idx")).Where(i => i is > 0).Select(i => (int)i!.Value).ToHashSet();

        foreach (var idx in existing.Where(i => !keep.Contains(i)))
            await tx.ExecuteAsync("fn_pt_sale_holder", "DEL", new { pt_no = ptNo, holder_idx = idx });

        foreach (var h in rows)
        {
            if (h.Long("holder_idx") is > 0)
            {
                await tx.ExecuteAsync("fn_pt_sale_holder", "UPD", P(h, key));
            }
            else
            {
                var next = existing.Count > 0 ? existing.Max() + 1 : 1;
                h["holder_idx"] = (long)next;
                if (!h.Has("holder_reg_date")) h["holder_reg_date"] = LocalDate.Today;
                await tx.InsertAsync("fn_pt_sale_holder", "INS", P(h, key));
                existing.Add(next);
            }
        }
    }

    /// <summary>진행상태만 변경(목록에서). null = 상태 해제</summary>
    public Task SetStatusAsync(long ptNo, string? ptSts) => Sp.ExecuteAsync("pt_sale", "STATUS", P(new { pt_no = ptNo, pt_sts = ptSts }));

    /// <summary>삭제 전 확인용 연동 정보 건수 — 연결된 일정(사용중)·사진·평면도</summary>
    public async Task<(int Schedules, int Files)> LinkCountsAsync(long ptNo)
    {
        var r = await Sp.QueryRowAsync("pt_sale", "LINKS", new { pt_no = ptNo });
        return ((int)(r?.Long("schedule_cnt") ?? 0), (int)(r?.Long("file_cnt") ?? 0));
    }

    /// <summary>
    /// 삭제. saveHistory=true면 과거내역(pt_sale_old)에 보관한 뒤 삭제(기존 "이력 저장 후 삭제").
    /// deleteLinks=true면 연동 정보도 함께 — 일정의 물건 연동을 끊고(일정은 남김) 사진·평면도를 사용안함. false면 연동은 그대로 둔다.
    /// </summary>
    public Task DeleteAsync(long ptNo, bool saveHistory = false, bool deleteLinks = false) => Sp.InTransactionAsync(async tx =>
    {
        if (saveHistory) await tx.ExecuteAsync("pt_sale", "ARCHIVE", new { pt_no = ptNo });
        if (deleteLinks) await tx.ExecuteAsync("pt_sale", "DEL_LINKS", P(new { pt_no = ptNo }));
        return await tx.ExecuteAsync("pt_sale", "DEL", new { pt_no = ptNo });
    });

    /// <summary>현재 상태를 과거내역으로 보관</summary>
    public Task ArchiveAsync(long ptNo) => Sp.ExecuteAsync("pt_sale", "ARCHIVE", new { pt_no = ptNo });

    public Task<List<Row>> HistoryAsync(long ptNo) => Sp.QueryRowsAsync("pt_sale_old", "SEL", new { pt_no = ptNo });

    /// <summary>물건명 기본값: 단지명/건물명 + 동·호, 없으면 읍면동 + 유형명</summary>
    public static string DefaultName(Row p)
    {
        var name = string.Join(" ", new[] { p.Str("addr4"), p.Str("addr5") }.Where(s => !string.IsNullOrWhiteSpace(s)));
        if (name.Length > 0)
        {
            if (p.Has("dong")) name += $" {p.Str("dong")}동";
            if (p.Has("ho")) name += $" {p.Str("ho")}호";
            return name;
        }
        return $"{p.Str("addr3")} {Catalog.PropertyTypeName(p.Str("pt_type"))}".Trim();
    }

    /// <summary>목록 표시용 주소(시도 시군구 읍면동 번지)</summary>
    public static string AddressText(Row p) =>
        string.Join(" ", new[] { p.Str("addr1"), p.Str("addr2"), p.Str("addr3"), p.Str("jibun") }.Where(s => !string.IsNullOrWhiteSpace(s)));
}

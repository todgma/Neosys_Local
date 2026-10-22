using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>고객 등록창 한 번에 저장하는 묶음(기존 CustomersCreateDto/UpdateDto와 같은 범위)</summary>
public sealed class CustomerDetail
{
    public Row Cust { get; init; } = new();
    public List<Row> Areas { get; init; } = new();     // 구입희망지역 ct_trd_area
    public List<Row> Buyers { get; init; } = new();    // 구입자 ct_cust_buyer
    public List<Row> Shares { get; init; } = new();    // 공동중개사 사무소 pt_share(cust_no)
    public List<Row> Memos { get; init; } = new();     // 구입물건특징 pt_memo(cust_no)
    public List<Row> Consults { get; init; } = new();  // 상담이력 ct_interview(cust_no)

    public long? CustNo => Cust.Long("cust_no");
    public bool IsNew => CustNo is null or 0;
}

/// <summary>
/// 고객관리 — 기존 CustomersServices(목록·상세·등록·수정·삭제)를 로컬 SQLite로 옮긴 것.
/// 등록은 새 고객번호를 돌려주고 Cust["cust_no"]에 채운다(다시 저장하면 수정 — 중복 등록 방지).
/// </summary>
public sealed class CustomerService : ServiceBase
{
    public CustomerService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    /// <summary>filter 키: q_keyword, q_want_type, q_trd_type, q_trd_prg(콤마 다중값), q_rt_no</summary>
    public Task<List<Row>> ListAsync(Row? filter = null) => Sp.QueryRowsAsync("ct_cust", "LIST", P(filter));

    public CustomerDetail New()
    {
        var c = new Row
        {
            ["rent_bsn_yn"] = "N", ["area_kind"] = "공급", ["area_unit"] = "평", ["child_yn"] = "N",
            ["rt_no"] = Session.RtNo, ["off_no"] = Session.OffNo,
        };
        var d = new CustomerDetail { Cust = c };
        for (int i = 0; i < 3; i++) d.Buyers.Add(new Row());
        d.Shares.Add(new Row());
        return d;
    }

    public async Task<CustomerDetail?> GetAsync(long custNo)
    {
        var key = new { cust_no = custNo };
        var cust = await Sp.QueryRowAsync("ct_cust", "GET", key);
        if (cust is null) return null;
        var owner = new { cust_no = custNo, pt_no = (long?)null };
        return new CustomerDetail
        {
            Cust = cust,
            Areas = await Sp.QueryRowsAsync("ct_trd_area", "SEL", key),
            Buyers = await Sp.QueryRowsAsync("ct_cust_buyer", "SEL", key),
            Shares = await Sp.QueryRowsAsync("pt_share", "SEL", owner),
            Memos = await Sp.QueryRowsAsync("pt_memo", "SEL", owner),
            Consults = await Sp.QueryRowsAsync("ct_interview", "SEL_OWNER", owner),
        };
    }

    /// <summary>저장(등록/수정). 고객번호를 돌려준다.</summary>
    public async Task<long> SaveAsync(CustomerDetail d)
    {
        var c = d.Cust;
        // 성함: 입력값 → 첫 구입자 성함 → 계약당사자(기존 handleSubmit과 같은 순서)
        var primary = d.Buyers.FirstOrDefault(b => b.Has("name"));
        if (!c.Has("name")) c["name"] = primary?.Str("name") ?? c.Str("alias");
        if (!c.Has("tel") && primary is not null) c["tel"] = primary.Str("tel");
        if (!c.Has("name"))
            throw new InvalidOperationException("구입자 성함(또는 실구입할 사람)을 입력해주세요.");
        if (d.Consults.Any(x => x.Long("itv_no") is null or 0 && x.Has("itv_content") && !x.Has("contact_phone")))
            throw new InvalidOperationException("상담이력은 전화번호를 입력해야 저장할 수 있습니다.");

        var custNo = await Sp.InTransactionAsync(async tx =>
        {
            long no;
            if (d.IsNew)
            {
                no = await tx.InsertAsync("ct_cust", "INS", P(c));
            }
            else
            {
                no = d.CustNo!.Value;
                await tx.ExecuteAsync("ct_cust", "UPD", P(c));
            }

            var owner = new Row { ["cust_no"] = no };
            await ChildSync.ReplaceAllAsync(tx, "ct_trd_area", owner, d.Areas, "seq",
                new[] { "addr1", "addr3", "bjd_code", "bld_nm", "detail_loc" }, r => P(r, owner));
            await ChildSync.ReplaceAllAsync(tx, "ct_cust_buyer", owner, d.Buyers, "seq",
                new[] { "name", "tel", "relation", "addr" }, r => P(r, owner));

            var shareOwner = new Row { ["cust_no"] = no, ["pt_no"] = null };
            await ChildSync.ReplaceAllAsync(tx, "pt_share", shareOwner, d.Shares, "share_idx",
                new[] { "office_name", "office_phone", "region_name", "memo" }, r => P(r, shareOwner));

            var existingMemos = (await tx.QueryRowsAsync("pt_memo", "SEL", shareOwner)).Select(r => r.Long("memo_no")!.Value);
            await ChildSync.MergeAsync(tx, "pt_memo", "memo_no", existingMemos, d.Memos, "memo_content", r => P(r, shareOwner));

            var existingItv = (await tx.QueryRowsAsync("ct_interview", "SEL_OWNER", shareOwner)).Select(r => r.Long("itv_no")!.Value);
            await ChildSync.MergeAsync(tx, "ct_interview", "itv_no", existingItv, d.Consults, "itv_content",
                r => P(r, new { cust_no = no, cust_name = c.Str("name"), rt_no = c.Long("rt_no"), off_no = c.Long("off_no") }),
                updMode: "UPD_CONTENT");
            return no;
        });

        c["cust_no"] = custNo;
        return custNo;
    }

    public Task DeleteAsync(long custNo) => Sp.ExecuteAsync("ct_cust", "DEL", new { cust_no = custNo });
}

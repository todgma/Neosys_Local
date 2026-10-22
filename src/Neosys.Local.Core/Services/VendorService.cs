using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>협력업체 등록창 묶음 — 업체 + 영업지역 + 상담이력</summary>
public sealed class VendorDetail
{
    public Row Vendor { get; init; } = new();
    public List<Row> Regions { get; init; } = new();   // vd_vendor_region: region_code(법정동), region_name
    public List<Row> Consults { get; init; } = new();  // ct_interview(vendor_id)
    public long? VendorId => Vendor.Long("vendor_id");
    public bool IsNew => VendorId is null or 0;
}

/// <summary>협력업체관리 — 기존 VendorService(vd_vendor_info / vd_vendor_region)</summary>
public sealed class VendorService : ServiceBase
{
    public VendorService(SpRunner sp, Func<AppSession> session) : base(sp, session) { }

    /// <summary>filter: q_keyword, q_category</summary>
    public Task<List<Row>> ListAsync(Row? filter = null) => Sp.QueryRowsAsync("vd_vendor_info", "LIST", P(filter));

    public VendorDetail New() => new() { Vendor = new Row { ["sort_order"] = 0L } };

    public async Task<VendorDetail?> GetAsync(long vendorId)
    {
        var v = await Sp.QueryRowAsync("vd_vendor_info", "GET", new { vendor_id = vendorId });
        if (v is null) return null;
        return new VendorDetail
        {
            Vendor = v,
            Regions = await Sp.QueryRowsAsync("vd_vendor_region", "SEL", new { vendor_id = vendorId }),
            Consults = await Sp.QueryRowsAsync("ct_interview", "SEL_OWNER", new { vendor_id = vendorId }),
        };
    }

    public async Task<long> SaveAsync(VendorDetail d)
    {
        var v = d.Vendor;
        if (!v.Has("vendor_name")) throw new InvalidOperationException("상호를 입력해주세요.");

        var id = await Sp.InTransactionAsync(async tx =>
        {
            long no;
            if (d.IsNew) no = await tx.InsertAsync("vd_vendor_info", "INS", P(v));
            else
            {
                no = d.VendorId!.Value;
                await tx.ExecuteAsync("vd_vendor_info", "UPD", P(v));
            }

            await tx.ExecuteAsync("vd_vendor_region", "DEL", new { vendor_id = no });
            int seq = 1;
            foreach (var r in d.Regions.Where(r => r.Has("region_code")).GroupBy(r => r.Str("region_code")).Select(g => g.First()))
                await tx.ExecuteAsync("vd_vendor_region", "INS", P(r, new { vendor_id = no, sort_order = seq++ }));

            var owner = new Row { ["vendor_id"] = no };
            var existing = (await tx.QueryRowsAsync("ct_interview", "SEL_OWNER", owner)).Select(r => r.Long("itv_no")!.Value);
            await ChildSync.MergeAsync(tx, "ct_interview", "itv_no", existing, d.Consults, "itv_content",
                r => P(r, new { vendor_id = no, cust_name = v.Str("vendor_name") }), updMode: "UPD_CONTENT");
            return no;
        });
        v["vendor_id"] = id;
        return id;
    }

    public Task DeleteAsync(long vendorId) => Sp.ExecuteAsync("vd_vendor_info", "DEL", new { vendor_id = vendorId });
}

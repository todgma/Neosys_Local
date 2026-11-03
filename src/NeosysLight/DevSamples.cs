#if DEBUG
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App;

/// <summary>개발용 견본 데이터(디버그 빌드 스냅샷 전용) — DB가 비어 있을 때만 넣는다.</summary>
internal static class DevSamples
{
    public static async Task EnsureAsync()
    {
        var cust = AppServices.Create((sp, s) => new CustomerService(sp, s));
        if ((await cust.ListAsync()).Count > 0) return;

        var c = cust.New();
        c.Cust["want_type"] = "주거용"; c.Cust["want_sub_type"] = "아파트"; c.Cust["trd_prg"] = "TRDPRG01";
        c.Cust["trd_type"] = "TRDTYP01"; c.Cust["sale_amt_fr"] = 150000L; c.Cust["sale_amt_to"] = 200000L;
        c.Cust["exc_area_fr"] = 59.0; c.Cust["exc_area_to"] = 85.0; c.Cust["feature_note"] = "학군 우선, 남향";
        c.Buyers[0]["name"] = "김구매"; c.Buyers[0]["tel"] = "010-1234-5678"; c.Buyers[0]["relation"] = "본인";
        c.Areas.Add(new Row { ["addr1"] = "서울특별시", ["addr2"] = "강남구", ["addr3"] = "개포동", ["bjd_code"] = "1168010300" });
        c.Memos.Add(new Row { ["memo_content"] = "주말 방문 희망" });
        await cust.SaveAsync(c);

        var pt = AppServices.Create((sp, s) => new PropertyService(sp, s));
        var p = pt.New("SYCA101");
        p.Pt["addr1"] = "서울특별시"; p.Pt["addr2"] = "강남구"; p.Pt["addr3"] = "개포동"; p.Pt["bjd_code"] = "1168010300";
        p.Pt["addr4"] = "개포자이"; p.Pt["dong"] = "101"; p.Pt["ho"] = "1203"; p.Pt["floor1"] = 12L; p.Pt["floor2"] = 25L;
        p.Pt["sale_div"] = "SALEDIV01,SALEDIV03S"; p.Pt["sale_amt"] = 185000L; p.Pt["prot_amt"] = 10000L; p.Pt["mon_amt"] = 250L;
        p.Pt["apt_typ"] = "84A"; p.Pt["exc_area"] = 84.97; p.Pt["sup_area"] = 112.4; p.Pt["current_status"] = "주인거주";
        p.Holders[0]["holder_name"] = "박소유"; p.Holders[0]["holder_phone"] = "010-9999-0000";
        await pt.SaveAsync(p);

        var vd = AppServices.Create((sp, s) => new VendorService(sp, s));
        var v = vd.New();
        v.Vendor["vendor_name"] = "깔끔이사"; v.Vendor["category1"] = "이사 | 청소"; v.Vendor["manager_name"] = "정담당"; v.Vendor["manager_phone"] = "010-2222-3333";
        await vd.SaveAsync(v);
    }
}
#endif

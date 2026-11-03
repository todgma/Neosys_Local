using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views;

/// <summary>다른 메뉴의 데이터 고르기(상담·일정·계약 등에서 고객/물건/협력업체 연결)</summary>
public static class Pickers
{
    public static Row? Customer()
    {
        var svc = AppServices.Create((sp, s) => new CustomerService(sp, s));
        return PickerDialog.Pick("고객 선택", new[]
        {
            ColDef.Text("cust_no", "번호", 60), ColDef.Text("name", "성함", 90), ColDef.Text("tel", "전화번호", 120),
            ColDef.Map("want_type", "물건유형", Catalog.WantCategories, 90), ColDef.Text("wish_areas", "구입희망지역", 0),
        }, kw => svc.ListAsync(new Row { ["q_keyword"] = kw }));
    }

    public static Row? Property()
    {
        var svc = AppServices.Create((sp, s) => new PropertyService(sp, s));
        return PickerDialog.Pick("물건 선택", new[]
        {
            ColDef.Text("pt_no", "번호", 60), ColDef.Map("pt_type", "유형", Catalog.PropertyTypesAll, 90),
            ColDef.Text("pt_name", "물건명", 160), ColDef.Text("addr_text", "주소", 0), ColDef.Text("dong", "동", 50), ColDef.Text("ho", "호", 50),
        }, async kw =>
        {
            var rows = await svc.ListAsync(new Row { ["q_keyword"] = kw });
            foreach (var r in rows) r["addr_text"] = PropertyService.AddressText(r);
            return rows;
        });
    }

    public static Row? Vendor()
    {
        var svc = AppServices.Create((sp, s) => new VendorService(sp, s));
        return PickerDialog.Pick("협력업체 선택", new[]
        {
            ColDef.Text("vendor_id", "번호", 60), ColDef.Text("vendor_name", "업체명", 160), ColDef.Text("category1", "분류", 140),
            ColDef.Text("manager_name", "담당자", 80), ColDef.Text("manager_phone", "휴대폰", 0),
        }, kw => svc.ListAsync(new Row { ["q_keyword"] = kw }));
    }
}

using System.Windows.Controls;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Interviews;

/// <summary>상담관리 — 기존 InterviewPage(기간·유형·검색어, 상담번호/유형/일자/고객/연락처/내용/메모)</summary>
public sealed class InterviewPage : ListPage
{
    private readonly InterviewService _svc = AppServices.Create((sp, s) => new InterviewService(sp, s));
    private readonly ComboBox _type;
    private readonly DatePicker _from = new() { Width = 125 }, _to = new() { Width = 125 };

    public InterviewPage() : base("상담관리", "고객명·연락처·내용·메모 검색")
    {
        _type = AddFilterCombo("상담유형", InterviewService.Types, 100);
        _from.SelectedDate = DateTime.Today.AddMonths(-3);
        _to.SelectedDate = DateTime.Today;
        AddFilter("기간", _from);
        AddFilter("~", _to);

        AddButton("삭제", DeleteSelectedAsync, "DangerButton");
        AddButton("상담등록", () => OpenAsync(null), "PrimaryButton");

        GridBuilder.SetColumns(Grid, new[]
        {
            ColDef.Text("itv_no", "번호", 60),
            ColDef.Map("itv_type", "상담유형", InterviewService.Types, 85),
            ColDef.Date("itv_date", "상담일자"),
            ColDef.Text("cust_name", "고객명", 90),
            ColDef.Text("phone_text", "연락처", 115),
            ColDef.Text("pt_name", "물건", 150),
            ColDef.Text("vendor_name", "협력업체", 110),
            ColDef.Text("itv_content", "상담내용", 0),
            ColDef.Text("itv_memo", "메모", 160),
            ColDef.DateTime("reg_dt", "등록일시"),
        });
    }

    protected override string? KeyName => "itv_no";

    protected override async Task<List<Row>> LoadAsync()
    {
        var rows = await _svc.ListAsync(new Row
        {
            ["q_keyword"] = Keyword,
            ["q_itv_type"] = ComboValue(_type),
            ["q_fr_date"] = _from.SelectedDate is { } f ? LocalDate.Format(f) : null,
            ["q_to_date"] = _to.SelectedDate is { } t ? LocalDate.Format(t) : null,
        });
        foreach (var r in rows) r["phone_text"] = r.Str("contact_phone") ?? r.Str("cust_phone");
        return rows;
    }

    protected override async Task OpenAsync(Row? row)
    {
        var r = row is null ? _svc.New() : await _svc.GetAsync(row.Long("itv_no")!.Value);
        if (r is null) return;
        if (Edit(_svc, r)) await RefreshAsync();
    }

    /// <summary>상담 등록/수정 창(네오봇 등 다른 화면에서도 사용)</summary>
    public static bool Edit(InterviewService svc, Row r)
    {
        var fields = new[]
        {
            F.Radio("itv_type", "상담유형", InterviewService.Types).Span(2),
            F.Date("itv_date", "상담일자"),
            F.Text("cust_name", "고객명"),
            F.Text("contact_name", "상대 성함"),
            F.Text("contact_phone", "연락처"),
            F.View("pt_name", "연결 물건"),
            F.View("vendor_name", "연결 협력업체"),
            F.Memo("itv_content", "상담내용", 140).Span(2).Required(),
            F.Memo("itv_memo", "메모", 60).Span(2),
        };
        var w = new FormEditWindow("상담", r, "itv_no", fields, svc.SaveAsync,
            x => svc.DeleteAsync(x.Long("itv_no")!.Value), width: 860, height: 620);
        w.AddLeftButton("고객 선택", () =>
        {
            if (Pickers.Customer() is not { } c) return;
            r["cust_no"] = c.Long("cust_no");
            r["cust_name"] = c.Str("name");
            r["cust_phone"] = c.Str("tel");
            if (!r.Has("contact_phone")) r["contact_phone"] = c.Str("tel");
            if (!r.Has("contact_name")) r["contact_name"] = c.Str("name");
        });
        w.AddLeftButton("물건 선택", () =>
        {
            if (Pickers.Property() is not { } p) return;
            r["pt_no"] = p.Long("pt_no");
            r["pt_name"] = p.Str("pt_name");
        });
        w.AddLeftButton("협력업체 선택", () =>
        {
            if (Pickers.Vendor() is not { } v) return;
            r["vendor_id"] = v.Long("vendor_id");
            r["vendor_name"] = v.Str("vendor_name");
        });
        w.AddLeftButton("연결 해제", () =>
        {
            r["cust_no"] = null; r["pt_no"] = null; r["pt_name"] = null; r["vendor_id"] = null; r["vendor_name"] = null;
        });
        return w.ShowAndReport();
    }

    private async Task DeleteSelectedAsync()
    {
        var rows = GridBuilder.SelectedRows(Grid);
        if (rows.Count == 0) { Dialogs.Info("삭제할 상담을 선택하세요."); return; }
        if (!Dialogs.Confirm($"선택한 상담 {rows.Count}건을 삭제하시겠습니까?")) return;
        foreach (var r in rows) await _svc.DeleteAsync(r.Long("itv_no")!.Value);
        await RefreshAsync();
    }
}

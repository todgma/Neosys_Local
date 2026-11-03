using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Reports;

/// <summary>보고서 관리 — 기존 ReportManageModal(내가 만든 보고서: 수정·고객공유·삭제) + 새 보고서</summary>
public sealed class ReportPage : ListPage
{
    private readonly ReportService _svc = AppServices.Create((sp, s) => new ReportService(sp, s));

    public ReportPage() : base("보고서", "제목·코멘트 검색")
    {
        AddButton("삭제", DeleteSelectedAsync, "DangerButton");
        AddButton("고객공유", ShareAsync);
        AddButton("새 보고서", () => OpenAsync(null), "PrimaryButton");

        GridBuilder.SetColumns(Grid, new[]
        {
            ColDef.Text("report_no", "번호", 60),
            ColDef.Text("title", "제목", 280),
            ColDef.Text("comment", "코멘트", 0),
            ColDef.Text("cust_count", "공유", 50),
            ColDef.Text("cust_names", "공유 고객", 200),
            ColDef.Text("reg_dt", "작성일", 140),
        });
    }

    protected override string? KeyName => "report_no";

    protected override Task<List<Row>> LoadAsync() => _svc.MineAsync(Keyword);

    protected override async Task OpenAsync(Row? row)
    {
        new ReportBuilderWindow(reportNo: row?.Long("report_no")).ShowDialog();
        await RefreshAsync();
    }

    /// <summary>선택한 보고서를 고객에게 공유(배포 고객 추가)</summary>
    private async Task ShareAsync()
    {
        if (Selected?.Long("report_no") is not { } no) { Dialogs.Info("보고서를 선택하세요."); return; }
        if (Pickers.Customer()?.Long("cust_no") is not { } cust) return;
        await _svc.AttachAsync(no, new[] { cust });
        await RefreshAsync();
        Dialogs.Info("고객에게 공유했습니다.");
    }

    private async Task DeleteSelectedAsync()
    {
        var rows = GridBuilder.SelectedRows(Grid);
        if (rows.Count == 0) { Dialogs.Info("삭제할 보고서를 선택하세요."); return; }
        if (!Dialogs.Confirm($"선택한 보고서 {rows.Count}건을 삭제하시겠습니까?")) return;
        foreach (var r in rows) await _svc.DeleteAsync(r.Long("report_no")!.Value);
        await RefreshAsync();
    }
}

using System.Windows;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 물건 삭제 확인(등록창·목록 공통) — 1) 삭제 방식(과거데이터 저장 후 / 영구) 2) 연결된 일정·첨부가 있으면 연동 정보도 지울지.
/// 취소하면 아무것도 지우지 않는다.
/// </summary>
internal static class PropertyDelete
{
    /// <summary>확인 후 삭제. 지웠으면 true</summary>
    public static async Task<bool> ConfirmAndDeleteAsync(PropertyService svc, IReadOnlyList<long> ptNos)
    {
        if (ptNos.Count == 0) return false;
        var what = ptNos.Count == 1 ? "물건을" : $"선택한 물건 {ptNos.Count}건을";
        var mode = Dialogs.Ask3(
            $"{what} 삭제합니다.\n\n[예] 과거데이터(이력)로 저장한 뒤 삭제\n[아니오] 영구히 삭제\n[취소] 삭제하지 않음",
            "물건 삭제");
        if (mode == MessageBoxResult.Cancel) return false;

        int schedules = 0, files = 0;
        foreach (var no in ptNos)
        {
            var (s, f) = await svc.LinkCountsAsync(no);
            schedules += s;
            files += f;
        }
        var deleteLinks = false;
        if (schedules + files > 0)
        {
            var parts = new List<string>();
            if (schedules > 0) parts.Add($"일정 {schedules}건");
            if (files > 0) parts.Add($"사진·평면도 {files}건");
            var links = Dialogs.Ask3(
                $"연결된 {string.Join("·", parts)}이 있습니다. 연동 정보도 삭제할까요?\n\n" +
                "[예] 함께 삭제(일정은 남기고 물건 연결만 끊음, 사진·평면도는 삭제)\n[아니오] 연동은 남기고 물건만 삭제\n[취소] 삭제하지 않음",
                "연동 정보 삭제");
            if (links == MessageBoxResult.Cancel) return false;
            deleteLinks = links == MessageBoxResult.Yes;
        }

        return await Dialogs.RunAsync(async () =>
        {
            foreach (var no in ptNos) await svc.DeleteAsync(no, saveHistory: mode == MessageBoxResult.Yes, deleteLinks: deleteLinks);
        }, "삭제에 실패했습니다.");
    }
}

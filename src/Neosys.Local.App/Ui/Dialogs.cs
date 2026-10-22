using Neosys.Local.Core;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;

namespace Neosys.Local.App.Ui;

/// <summary>메시지 상자 — 문구는 기존 시스템처럼 한국어</summary>
public static class Dialogs
{
    private static Window? Owner => Application.Current?.Windows.OfType<Window>().FirstOrDefault(w => w.IsActive)
                                    ?? Application.Current?.MainWindow;

    public static void Info(string message, string title = "알림") => Show(message, title, MessageBoxButton.OK, MessageBoxImage.Information);

    public static void Warn(string message, string title = "확인") => Show(message, title, MessageBoxButton.OK, MessageBoxImage.Warning);

    public static void Error(string message, string title = "오류") => Show(message, title, MessageBoxButton.OK, MessageBoxImage.Error);

    public static bool Confirm(string message, string title = "확인") =>
        Show(message, title, MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes;

    /// <summary>예/아니오/취소 선택(물건 삭제 방식 등)</summary>
    public static MessageBoxResult Ask3(string message, string title) =>
        Show(message, title, MessageBoxButton.YesNoCancel, MessageBoxImage.Question);

    /// <summary>프린터 선택 창. 버튼 점검(AuditHook) 중에는 띄우지 않고 취소로 본다.</summary>
    public static bool ShowPrint(PrintDialog dlg)
    {
        if (AuditHook.Active) { AuditHook.Log("인쇄창", dlg.GetType().Name); return false; }
        return dlg.ShowDialog() == true;
    }

    /// <summary>파일 열기/저장 창. 버튼 점검 중에는 취소로 본다.</summary>
    public static bool ShowFile(Microsoft.Win32.FileDialog dlg)
    {
        if (AuditHook.Active) { AuditHook.Log("파일창", dlg.Title ?? dlg.GetType().Name); return false; }
        return dlg.ShowDialog() == true;
    }

    /// <summary>파일·주소를 기본 프로그램(브라우저 등)으로 연다. 버튼 점검 중에는 기록만 한다.</summary>
    public static void OpenExternal(string target)
    {
        if (AuditHook.Active) { AuditHook.Log("외부열기", target); return; }
        try { Process.Start(new ProcessStartInfo(target) { UseShellExecute = true }); }
        catch (Exception ex) { Error("파일(주소)을 열 수 없습니다.\n" + ex.Message); }
    }

    private static MessageBoxResult Show(string message, string title, MessageBoxButton buttons, MessageBoxImage image)
    {
        // 버튼 점검 중: 상자를 띄우지 않고 기록 — 확인류는 '아니오/취소'(데이터를 바꾸지 않는 쪽)
        if (AuditHook.Active)
        {
            AuditHook.Log(image == MessageBoxImage.Error ? "오류상자" : buttons == MessageBoxButton.OK ? "알림상자" : "확인상자", $"[{title}] {message}");
            return buttons switch { MessageBoxButton.YesNo => MessageBoxResult.No, MessageBoxButton.YesNoCancel or MessageBoxButton.OKCancel => MessageBoxResult.Cancel, _ => MessageBoxResult.OK };
        }
        var owner = Owner;
        return owner is { IsLoaded: true }
            ? MessageBox.Show(owner, message, title, buttons, image)
            : MessageBox.Show(message, title, buttons, image);
    }

    /// <summary>비동기 작업을 실행하고 오류는 메시지로 보여 준다. 성공하면 true.</summary>
    public static async Task<bool> RunAsync(Func<Task> work, string failMessage = "처리 중 오류가 발생했습니다.")
    {
        try
        {
            await work();
            return true;
        }
        catch (Exception ex)
        {
            Error(failMessage + "\n" + ex.Message);
            return false;
        }
    }
}

using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Contracts;

/// <summary>
/// 계약 첨부파일 — 계약서·확인설명서 등 첨부(최대 10개·5MB, 기존 ContractRegisterForm)와 공제증서(기존 GongjeCertModal).
/// 파일은 이 PC 첨부 폴더에, 메타는 sys_file(ref_key = master_id)에 저장한다.
/// </summary>
public sealed class ContractAttachWindow : Window
{
    public ContractAttachWindow(string masterId, string? title = null)
    {
        Title = $"첨부파일 — {title ?? "계약"}";
        Width = 760;
        Height = 640;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Owner = Application.Current.Windows.OfType<Window>().FirstOrDefault(w => w.IsActive) ?? Application.Current.MainWindow;
        FontSize = 13;

        var panel = new StackPanel { Margin = new Thickness(14) };
        panel.Children.Add(new AttachmentPanel(FileKind.ContractFile, () => masterId, maxCount: 10));
        panel.Children.Add(new AttachmentPanel(FileKind.GongjeCert, () => masterId));
        var close = new Button { Content = "닫기", MinWidth = 80, IsCancel = true, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(14, 0, 14, 10) };
        close.Click += (_, _) => Close();
        var root = new DockPanel();
        DockPanel.SetDock(close, Dock.Bottom);
        root.Children.Add(close);
        root.Children.Add(new ScrollViewer { Content = panel, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
        Content = root;
    }
}

using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Community;

/// <summary>
/// 로그인 후 공지·이벤트 팝업 — 기존 NoticePopup. 인디고 머리줄(제목 ×) + 내용 HTML + [오늘 보지 않음] [다시 보지 않음] [닫기].
/// 띄울 대상·크기·숨김 기록 규칙은 NoticePopupRules(Core).
/// </summary>
public sealed class NoticePopupWindow : Window
{
    /// <summary>"today" | "forever" | null(그냥 닫기)</summary>
    public string? Choice { get; private set; }

    private NoticePopupWindow(NoticePopupRules.Item it)
    {
        Title = it.Title;
        Width = it.Width;
        Height = it.Height;
        MaxWidth = SystemParameters.WorkArea.Width * 0.96;
        MaxHeight = SystemParameters.WorkArea.Height * 0.92;
        WindowStyle = WindowStyle.ToolWindow;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        ShowInTaskbar = false;

        var close = new Button { Content = "×", FontSize = 20, Foreground = Brushes.White, Background = Brushes.Transparent, BorderThickness = new Thickness(0), Padding = new Thickness(4, 0, 4, 0), MinHeight = 0 };
        close.Click += (_, _) => Close();
        var head = new DockPanel();
        DockPanel.SetDock(close, Dock.Right);
        head.Children.Add(close);
        head.Children.Add(new TextBlock { Text = it.Title, FontSize = 16, FontWeight = FontWeights.ExtraBold, Foreground = Brushes.White, VerticalAlignment = VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis });
        var headBorder = new Border { Child = head, Background = Legacy.B("#4F46E5"), Padding = new Thickness(16, 10, 12, 10) };

        TextBlock Opt(string text, string mode)
        {
            var t = new TextBlock { FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#475569"), Cursor = System.Windows.Input.Cursors.Hand, Margin = new Thickness(0, 0, 12, 0), VerticalAlignment = VerticalAlignment.Center };
            t.Inlines.Add(new System.Windows.Documents.Run("☐ ") { FontSize = 14 });
            t.Inlines.Add(text);
            t.MouseLeftButtonUp += (_, _) => { Choice = mode; Close(); };
            return t;
        }
        var opts = new StackPanel { Orientation = Orientation.Horizontal };
        opts.Children.Add(Opt("오늘 보지 않음", "today"));
        opts.Children.Add(Opt("다시 보지 않음", "forever"));
        var ok = new Button { Content = "닫기", FontSize = 13, FontWeight = FontWeights.Bold, Padding = new Thickness(16, 4, 16, 4), MinHeight = 0 };
        ok.Click += (_, _) => Close();
        var foot = new DockPanel();
        DockPanel.SetDock(ok, Dock.Right);
        foot.Children.Add(ok);
        foot.Children.Add(opts);
        var footBorder = new Border { Child = foot, Background = Legacy.B("#F8FAFC"), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 0), Padding = new Thickness(14, 8, 14, 8) };

        var root = new DockPanel();
        DockPanel.SetDock(headBorder, Dock.Top);
        DockPanel.SetDock(footBorder, Dock.Bottom);
        root.Children.Add(headBorder);
        root.Children.Add(footBorder);
        root.Children.Add(new Border { Padding = new Thickness(14, 12, 14, 12), Child = new HtmlView { Html = it.Html } });
        Content = root;
    }

    /// <summary>
    /// 서버에서 팝업 대상(공지 isPopup + 이벤트 isPopup)을 받아 차례로 띄운다. 숨김 기록은 %LOCALAPPDATA%\Neosys\notice_popup.json.
    /// 서버에 못 붙으면 아무것도 하지 않는다.
    /// </summary>
    public static async Task ShowPendingAsync(Window owner)
    {
        var today = LocalDate.Today;
        var store = NoticePopupRules.Load();
        if (NoticePopupRules.Clean(store, today)) NoticePopupRules.Save(store);
        List<NoticePopupRules.Item> items;
        try
        {
            var notices = await AppServices.Server.GetNoticeListAsync(200);
            List<Data.Row> events;
            try { events = await AppServices.Server.GetEventListAsync(isPublic: true, isPopup: true, rows: 50); } catch { events = new(); }
            items = NoticePopupRules.Select(notices, events, today, store);
        }
        catch { return; }
        foreach (var it in items)
        {
            if (!owner.IsVisible) return;
            if (AuditHook.Active) { AuditHook.Log("공지팝업", it.Title); continue; }
            var w = new NoticePopupWindow(it) { Owner = owner };
            w.ShowDialog();
            if (w.Choice is { } mode)
            {
                NoticePopupRules.Remember(store, it, mode, today);
                NoticePopupRules.Save(store);
            }
        }
    }
}

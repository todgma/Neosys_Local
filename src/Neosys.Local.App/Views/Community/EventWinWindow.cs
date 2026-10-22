using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Community;

/// <summary>
/// 참여 이벤트 확정 알림 — 기존 DashboardPage eventWins 팝업(대표 로그인 후 1회).
/// 🎁 + "축하합니다! 🎉" + 확인 완료된 이벤트 목록 + [확인]. 띄우는 즉시 서버에 확인 처리(mark-seen)해 다시 뜨지 않는다.
/// </summary>
public sealed class EventWinWindow : Window
{
    private EventWinWindow(IReadOnlyList<EventWinRules.Item> items)
    {
        Title = "이벤트 확인 완료";
        Width = 440;
        SizeToContent = SizeToContent.Height;
        MaxHeight = SystemParameters.WorkArea.Height * 0.9;
        ResizeMode = ResizeMode.NoResize;
        WindowStyle = WindowStyle.ToolWindow;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        ShowInTaskbar = false;
        Background = Brushes.White;

        var root = new StackPanel();
        root.Children.Add(new Border
        {
            Width = 56, Height = 56, CornerRadius = new CornerRadius(28), Background = Legacy.B("#F3F0FF"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 0, 0, 12),
            Child = new TextBlock { Text = "🎁", FontSize = 26, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center },
        });
        root.Children.Add(new TextBlock { Text = "축하합니다! 🎉", FontSize = 20, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), HorizontalAlignment = HorizontalAlignment.Center });
        root.Children.Add(new TextBlock { Text = "참여하신 이벤트가 확인 완료되었습니다.", FontSize = 15, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#334155"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 6, 0, 14) });

        var list = new StackPanel();
        foreach (var it in items)
        {
            var row = new DockPanel();
            row.Children.Add(new TextBlock { Text = "🎁", FontSize = 14, Margin = new Thickness(0, 0, 8, 0), VerticalAlignment = VerticalAlignment.Center });
            var done = new TextBlock { Text = "확인 완료", FontSize = 13, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#0F766E"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(8, 0, 0, 0) };
            DockPanel.SetDock(done, Dock.Right);
            row.Children.Add(done);
            row.Children.Add(new TextBlock { Text = it.Title, FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), TextTrimming = TextTrimming.CharacterEllipsis, VerticalAlignment = VerticalAlignment.Center });
            list.Children.Add(new Border { Child = row, BorderBrush = Legacy.B("#EDE9FE"), BorderThickness = new Thickness(1), Background = Legacy.B("#FAF5FF"), CornerRadius = new CornerRadius(10), Padding = new Thickness(12, 10, 12, 10), Margin = new Thickness(0, 0, 0, 8) });
        }
        root.Children.Add(new ScrollViewer { Content = list, MaxHeight = SystemParameters.WorkArea.Height * 0.4, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });

        var ok = new Button
        {
            Content = "확인", FontSize = 14, FontWeight = FontWeights.ExtraBold, Foreground = Brushes.White, Background = Legacy.B("#7C3AED"), BorderThickness = new Thickness(0),
            Padding = new Thickness(32, 10, 32, 10), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 10, 0, 0), IsDefault = true, IsCancel = true,
        };
        ok.Click += (_, _) => Close();
        root.Children.Add(ok);
        Content = new Border { Padding = new Thickness(24, 22, 24, 20), Child = root };
    }

#if DEBUG
    /// <summary>화면 확인용 견본(디버그 스냅샷)</summary>
    internal static EventWinWindow Preview() =>
        new(new[] { new EventWinRules.Item(1, "가을 리뷰 이벤트"), new EventWinRules.Item(2, "미션문구 인증 이벤트") });
#endif

    /// <summary>대표 로그인이면 확인완료·미확인 참여 건을 받아 알림을 띄운다. 받자마자 확인 처리(기존과 같음). 서버에 못 붙으면 아무것도 하지 않는다.</summary>
    public static async Task ShowPendingAsync(Window owner)
    {
        var s = AppServices.Session;
        if (!EventWinRules.ShouldCheck(s)) return;
        List<EventWinRules.Item> items;
        try { items = EventWinRules.Build(await AppServices.Server.GetConfirmedUnseenEntriesAsync(s.UserId, s.OffNo)); }
        catch { return; }
        if (items.Count == 0) return;
        try { await AppServices.Server.MarkEntriesSeenAsync(EventWinRules.EntryIds(items)); } catch { /* 다음 로그인 때 다시 뜰 뿐 */ }
        if (!owner.IsVisible) return;
        if (AuditHook.Active) { AuditHook.Log("이벤트확정알림", string.Join(", ", items.Select(i => i.Title))); return; }
        new EventWinWindow(items) { Owner = owner }.ShowDialog();
    }
}

using System.Windows;
using System.Windows.Media;

namespace Neosys.Local.App.Views;

/// <summary>
/// 메뉴별 창 — 기존 Electron 구조(대시보드 창 + 메뉴를 누르면 메뉴마다 별도 창 'window:openTab').
///  - 같은 메뉴는 한 창만(이미 열려 있으면 앞으로), 네오봇은 여러 개(520×825 고정폭), 메모 500×800, 그 외 1400×700(최소)
///  - 창은 대시보드가 있는 모니터 작업영역 가운데(대시보드와 겹치지 않게 왼쪽)로 연다
/// </summary>
public static class WindowManager
{
    private static readonly Dictionary<string, Window> Open = new();

    /// <summary>메뉴 창 열기(이미 있으면 앞으로). 반환: 창 안의 화면</summary>
    public static FrameworkElement? OpenMenu(string key)
    {
        var menu = MenuRegistry.All.FirstOrDefault(m => m.Key == key);
        if (menu is null) return null;
        var multi = key == "neobot";
        if (!multi && Open.TryGetValue(key, out var existing))
        {
            if (existing.WindowState == WindowState.Minimized) existing.WindowState = WindowState.Normal;
            existing.Show();
            existing.Activate();
            return existing.Content as FrameworkElement;
        }

        var (w, h, minW, minH, fixedWidth) = key switch
        {
            "neobot" => (520.0, 825.0, 520.0, 825.0, true),
            "memo" => (500.0, 800.0, 500.0, 400.0, true),
            _ => (1400.0, 700.0, 1400.0, 700.0, false),
        };
        var area = SystemParameters.WorkArea;
        var content = menu.Create();
        var win = new Window
        {
            Title = $"네오시스 - {menu.Title}",
            Width = Math.Min(w, area.Width), Height = Math.Min(h, area.Height),
            MinWidth = Math.Min(minW, area.Width), MinHeight = Math.Min(minH, area.Height),
            Content = content, Background = (Brush)Application.Current.FindResource("PageBack"),
            WindowStartupLocation = WindowStartupLocation.Manual,
        };
        if (fixedWidth) win.MaxWidth = w;
        // 대시보드(오른쪽 위 고정)와 겹치지 않게 그 왼쪽 영역 가운데
        var dash = Application.Current.MainWindow;
        var right = dash is { IsLoaded: true } && dash != win ? dash.Left : area.Right;
        var avail = Math.Max(right - area.Left, win.Width);
        win.Left = Math.Max(area.Left, area.Left + (avail - win.Width) / 2);
        win.Top = area.Top + Math.Max(0, (area.Height - win.Height) / 2);
        if (!multi)
        {
            Open[key] = win;
            win.Closed += (_, _) => Open.Remove(key);
        }
        win.Show();
        return content;
    }

    /// <summary>대시보드를 뺀 모든 창 닫기(로그아웃)</summary>
    public static void CloseAll()
    {
        foreach (var w in Application.Current.Windows.OfType<Window>().Where(w => w != Application.Current.MainWindow).ToList()) w.Close();
        Open.Clear();
    }
}

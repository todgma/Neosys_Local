using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;

namespace Neosys.Local.App.Views.Office;

/// <summary>
/// 사무실관리 허브 — 기존 OfficeHubPage. 대시보드 [사무소관리 | 직원관리 | 가입비 및 상품결제]에서 비밀번호 확인 후 한 창으로 연다.
///  탭: [사무실정보 수정] [직원관리] + (대표) [가입비 결제] [상품가입]
///  기본 탭(대표): 가입비 미결제면 '가입비 결제', 가입비 완료·상품 미가입이면 '상품가입', 그 외 '사무실정보 수정'.
///  모두 서버 데이터(운영 서버 API) — 결제는 웹 결제창(토스, 현재 테스트 결제로 연결)에서 진행한다.
/// </summary>
public sealed class OfficeHubPage : DockPanel
{
    private static readonly Dictionary<string, string> Labels = new()
    {
        ["office"] = "사무실정보 수정", ["staff"] = "직원관리", ["entryfee"] = "가입비 결제", ["subscribe"] = "상품가입",
    };

    private readonly StackPanel _tabBar = new() { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Bottom };
    private readonly ContentControl _host = new();
    private readonly Dictionary<string, FrameworkElement> _panels = new();
    private readonly List<string> _tabs = new() { "office", "staff" };
    private string _tab = "office";

    public OfficeHubPage()
    {
        Background = Legacy.B("#F9FAFB");
        if (AppServices.Session.IsOwner) _tabs.AddRange(new[] { "entryfee", "subscribe" });
        var bar = new Border
        {
            Child = _tabBar, Background = Legacy.B("#F8FAFC"), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1),
            Padding = new Thickness(16, 10, 16, 0),
        };
        SetDock(bar, Dock.Top);
        Children.Add(bar);
        Children.Add(_host);
        RenderTabs();
        Loaded += async (_, _) => await SelectDefaultAsync();
    }

    /// <summary>대표: 가입비·상품가입 상태를 서버에서 확인해 첫 탭을 정한다(기존 defaultTab)</summary>
    private async Task SelectDefaultAsync()
    {
        var s = AppServices.Session;
        var tab = "office";
        if (s.IsOwner && s.OffNo is { } off)
        {
            try
            {
                var fee = await AppServices.Server.GetEntryFeeAsync(off);
                var paid = fee["paid"] is true;
                var member = await AppServices.Server.GetMembershipAsync(off) is not null;
                tab = !paid ? "entryfee" : !member ? "subscribe" : "office";
            }
            catch { /* 서버에 못 붙으면 사무실정보 */ }
        }
        Select(tab);
    }

    private void Select(string tab)
    {
        if (!_tabs.Contains(tab)) tab = "office";
        _tab = tab;
        if (!_panels.TryGetValue(tab, out var panel))
        {
            panel = tab switch
            {
                "staff" => new OfficePage(),
                "entryfee" => new EntryFeePanel(),
                "subscribe" => new SubscribePanel(),
                _ => new OfficeInfoPanel(),
            };
            _panels[tab] = panel;
        }
        _host.Content = panel;
        RenderTabs();
    }

    private void RenderTabs()
    {
        _tabBar.Children.Clear();
        foreach (var t in _tabs)
        {
            var on = t == _tab;
            var key = t;
            // 기존 tabBtn: 위쪽 둥근 탭, 선택 = 흰 바탕·인디고 글자·아래 2px 인디고
            var b = new Border
            {
                Background = on ? Brushes.White : Brushes.Transparent, BorderBrush = Legacy.B("#E5E7EB"), CornerRadius = new CornerRadius(8, 8, 0, 0),
                BorderThickness = new Thickness(1, 1, 1, 0), Margin = new Thickness(0, 0, 4, -1), Cursor = System.Windows.Input.Cursors.Hand,
                Child = new Border
                {
                    BorderBrush = on ? Legacy.B("#4F46E5") : Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, on ? 2 : 1), Padding = new Thickness(18, 9, 18, 9),
                    Child = new TextBlock { Text = Labels[t], FontSize = 14, FontWeight = on ? FontWeights.ExtraBold : FontWeights.SemiBold, Foreground = Legacy.B(on ? "#4F46E5" : "#334155") },
                },
            };
            b.MouseLeftButtonUp += (_, _) => Select(key);
            _tabBar.Children.Add(b);
        }
    }
}

using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Community;

/// <summary>내 추천인 목록 — 기존 ReferralListModal(620 폭). 상호 · 대표님 · 가입일 · 결제일, 열 때 서버에서 최신 조회</summary>
public sealed class ReferralWindow : Window
{
    private readonly TextBlock _count = new() { FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#4F46E5"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(8, 0, 0, 0) };
    private readonly DataGrid _grid = new() { HeadersVisibility = DataGridHeadersVisibility.Column, GridLinesVisibility = DataGridGridLinesVisibility.Horizontal, RowHeight = 38, FontSize = 14 };
    private readonly TextBlock _empty = new() { Text = "불러오는 중…", FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 32, 0, 0) };

    public ReferralWindow()
    {
        Title = "내 추천인 목록";
        Width = 620;
        Height = 560;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = Brushes.White;
        var head = new StackPanel { Orientation = Orientation.Horizontal };
        head.Children.Add(new TextBlock { Text = "내 추천인 목록", FontSize = 18, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827") });
        head.Children.Add(_count);
        var headBorder = new Border { Child = head, Background = Legacy.B("#F8FAFC"), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(16, 12, 16, 12) };
        foreach (var (h, k) in new[] { ("상호", "offNm"), ("대표님", "rtNm"), ("가입일", "reg"), ("결제일", "pay") })
            _grid.Columns.Add(new DataGridTextColumn { Header = new TextBlock { Text = h }, Binding = new Binding($"[{k}]"), Width = k == "offNm" ? new DataGridLength(1, DataGridLengthUnitType.Star) : new DataGridLength(110) });
        var g = new Grid { Margin = new Thickness(16, 12, 16, 12) };
        g.Children.Add(_grid);
        g.Children.Add(_empty);
        var root = new DockPanel();
        DockPanel.SetDock(headBorder, Dock.Top);
        root.Children.Add(headBorder);
        root.Children.Add(g);
        Content = root;
        Loaded += async (_, _) => await LoadAsync();
    }

    private static string Dt(string? v) => DateTime.TryParse(v, out var d) ? d.ToString("yyyy.MM.dd") : "-";

    private async Task LoadAsync()
    {
        List<Row> list;
        try { list = await AppServices.Server.GetReferralsAsync(AppServices.Session.RtNo); }
        catch (Exception ex) { _empty.Text = "추천 목록을 불러오지 못했습니다. " + ex.Message; return; }
        _count.Text = $"{list.Count}명";
        _grid.ItemsSource = list.Select(u => new Row
        {
            ["offNm"] = u.Str("offNm") ?? "-", ["rtNm"] = u.Str("rtNm") ?? "-", ["reg"] = Dt(u.Str("regDt")),
            ["pay"] = Dt(u.Str("paymentDate") ?? u.Str("payDt") ?? u.Str("firstPaymentDate") ?? u.Str("paymentDt")),
        }).ToList();
        _empty.Text = "아직 추천한 사용자가 없습니다. 내 추천인 코드를 공유해 보세요.";
        _empty.Visibility = list.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }
}

using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Community;

/// <summary>무료개월 내역 — 기존 FreeMonthsModal(680 폭). 대시보드 '무료개월'을 누르면 열리고, 열 때 서버에서 최신 조회. 추천·이벤트로 받은 기간이 여기에 나온다</summary>
public sealed class FreeMonthsWindow : Window
{
    private readonly TextBlock _summary = new() { FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#059669"), VerticalAlignment = VerticalAlignment.Center };
    private readonly DataGrid _grid = new() { HeadersVisibility = DataGridHeadersVisibility.Column, GridLinesVisibility = DataGridGridLinesVisibility.Horizontal, RowHeight = 38, FontSize = 14 };
    private readonly TextBlock _empty = new() { Text = "불러오는 중…", FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B"), HorizontalAlignment = HorizontalAlignment.Center, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 56, 0, 0) };

    public FreeMonthsWindow()
    {
        Title = "무료개월 내역";
        Width = 680;
        Height = 560;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = Brushes.White;
        var head = new DockPanel();
        DockPanel.SetDock(_summary, Dock.Right);
        head.Children.Add(_summary);
        head.Children.Add(new TextBlock { Text = "무료개월 내역", FontSize = 18, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827") });
        var headBorder = new Border { Child = head, Background = Legacy.B("#F8FAFC"), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(16, 12, 16, 12) };
        foreach (var (h, k) in new[] { ("일자", "date"), ("내용", "title"), ("무료개월수", "months"), ("무료일수", "days") })
            _grid.Columns.Add(new DataGridTextColumn { Header = new TextBlock { Text = h }, Binding = new Binding($"[{k}]"), Width = k == "title" ? new DataGridLength(1, DataGridLengthUnitType.Star) : new DataGridLength(110) });
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

    private async Task LoadAsync()
    {
        List<FreeMonthsRules.Item> items;
        try
        {
            items = AppServices.Session.OffNo is { } off
                ? FreeMonthsRules.Build(await AppServices.Server.GetMembershipHistoryAsync(off))
                : new();
        }
        catch (Exception ex) { _empty.Text = "무료개월 내역을 불러오지 못했습니다. " + ex.Message; return; }
        var total = items.Sum(i => i.Days);
        var rows = items.Select(i => new Row { ["date"] = i.Date, ["title"] = i.Title, ["months"] = $"{i.Months:0.#}개월", ["days"] = $"{i.Days}일" }).ToList();
        if (items.Count > 0)
        {
            rows.Add(new Row { ["title"] = "합계", ["months"] = $"{FreeMonthsRules.Months(total):0.#}개월", ["days"] = $"{total}일" });
            _summary.Text = $"지금까지 받은 무료혜택 {FreeMonthsRules.Summary(total)}";
        }
        _grid.ItemsSource = rows;
        _empty.Text = "무료개월 내역이 없습니다.";
        _empty.Visibility = items.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }
}

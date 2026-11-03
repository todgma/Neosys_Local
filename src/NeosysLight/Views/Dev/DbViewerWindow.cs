using System.Data;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Dev;

/// <summary>
/// 로컬 DB 데이터 확인(임시 — 저장 여부 확인용). 왼쪽 테이블 목록(검색), 오른쪽 선택 테이블 데이터(최근 행부터 최대 500건).
/// 읽기 전용이다. 대시보드 인사말 편집 옆 톱니바퀴 → 비밀번호 확인 후 연다.
/// </summary>
public sealed class DbViewerWindow : Window
{
    private const int Limit = 500;
    private readonly DbInspectService _svc = AppServices.Create((sp, s) => new DbInspectService(sp, s));
    private readonly ListBox _tables = new() { BorderThickness = new Thickness(0) };
    private readonly TextBox _filter = new() { Margin = new Thickness(0, 0, 0, 6) };
    private readonly DataGrid _grid = new()
    {
        IsReadOnly = true, AutoGenerateColumns = true, CanUserAddRows = false, HeadersVisibility = DataGridHeadersVisibility.Column,
        EnableRowVirtualization = true, EnableColumnVirtualization = true,
    };
    private readonly TextBlock _info = new() { FontSize = 14, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center };
    private List<string> _all = new();

    public DbViewerWindow()
    {
        Title = "데이터 확인 (로컬 DB)";
        Width = 1300;
        Height = 800;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        FontSize = 13;

        Placeholder.Set(_filter, "테이블 검색");
        _filter.TextChanged += (_, _) => ApplyFilter();
        _tables.SelectionChanged += async (_, _) => await LoadTableAsync();
        // 날짜 등 긴 값도 한 줄로, 헤더의 '_'가 단축키로 먹히지 않게
        _grid.AutoGeneratingColumn += (_, e) => e.Column.Header = new TextBlock { Text = e.PropertyName };

        var left = new DockPanel { Margin = new Thickness(0, 0, 8, 0) };
        var leftHead = new TextBlock { Text = "테이블", FontSize = 14, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 0, 0, 6) };
        DockPanel.SetDock(leftHead, Dock.Top);
        DockPanel.SetDock(_filter, Dock.Top);
        left.Children.Add(leftHead);
        left.Children.Add(_filter);
        left.Children.Add(new Border { BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(1), Child = _tables });

        var refresh = new Button { Content = "새로고침", Padding = new Thickness(10, 3, 10, 3) };
        refresh.Click += async (_, _) => { await LoadTablesAsync(); await LoadTableAsync(); };
        var head = new DockPanel { Margin = new Thickness(0, 0, 0, 6) };
        DockPanel.SetDock(refresh, Dock.Right);
        head.Children.Add(refresh);
        head.Children.Add(_info);
        var right = new DockPanel();
        DockPanel.SetDock(head, Dock.Top);
        right.Children.Add(head);
        right.Children.Add(_grid);

        var g = new Grid { Margin = new Thickness(12) };
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(260) });
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(4) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        g.Children.Add(left);
        var split = new GridSplitter { Width = 4, HorizontalAlignment = HorizontalAlignment.Stretch, Background = Brushes.Transparent };
        Grid.SetColumn(split, 1);
        g.Children.Add(split);
        Grid.SetColumn(right, 2);
        g.Children.Add(right);
        Content = g;

        _info.Text = "왼쪽에서 테이블을 선택하세요.";
        Loaded += async (_, _) => await LoadTablesAsync();
    }

    private async Task LoadTablesAsync()
    {
        var cur = _tables.SelectedItem as string;
        _all = await _svc.TablesAsync();
        ApplyFilter();
        if (cur is not null && _tables.Items.Contains(cur)) _tables.SelectedItem = cur;
    }

    private void ApplyFilter()
    {
        var q = _filter.Text.Trim();
        var cur = _tables.SelectedItem as string;
        _tables.ItemsSource = q.Length == 0 ? _all : _all.Where(t => t.Contains(q, StringComparison.OrdinalIgnoreCase)).ToList();
        if (cur is not null) _tables.SelectedItem = cur;
    }

    private async Task LoadTableAsync()
    {
        if (_tables.SelectedItem is not string table) return;
        try
        {
            var count = await _svc.CountAsync(table);
            var rows = await _svc.RowsAsync(table, Limit);
            // Row(사전) → DataTable: 자동 열 생성. 행이 없어도 열 이름은 알 수 없으니 빈 표
            var dt = new DataTable(table);
            foreach (var key in rows.SelectMany(r => r.Keys).Distinct())
                dt.Columns.Add(key, typeof(string));
            foreach (var r in rows)
            {
                var dr = dt.NewRow();
                foreach (var kv in r) dr[kv.Key] = kv.Value is null ? DBNull.Value : Convert.ToString(kv.Value, System.Globalization.CultureInfo.InvariantCulture);
                dt.Rows.Add(dr);
            }
            _grid.ItemsSource = dt.DefaultView;
            _info.Text = count == 0 ? $"{table} — 데이터 없음"
                : $"{table} — 전체 {count:#,0}건{(count > Limit ? $" (최근 {Limit}건 표시)" : "")}";
        }
        catch (Exception ex)
        {
            _grid.ItemsSource = null;
            _info.Text = $"{table} — 조회 실패: {ex.Message}";
        }
    }
}

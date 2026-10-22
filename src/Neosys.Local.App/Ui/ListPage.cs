using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Media;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

/// <summary>
/// 메뉴 목록 화면 공통 틀 — 기존 PropertyListTable/CustomerTable 모양:
///  - 위: 흰 검색 상자(필터·검색어)
///  - 표 위 도구줄: 왼쪽 [페이지별 내용][N건] · 오른쪽 [페이지별 버튼][색 채우기][+ 신규 등록][수정][삭제]
///  - 표: 선택 체크 열, 흰 머리 + 검은 윗선, 가운데 정렬
/// 하위 클래스는 LoadAsync(목록 조회)와 OpenAsync(등록/수정 창)만 구현한다.
/// AddButton(style "PrimaryButton") = 신규 등록 자리, "DangerButton" = 삭제 자리, 그 외 = 색 채우기 왼쪽.
/// </summary>
public abstract class ListPage : DockPanel
{
    protected readonly WrapPanel FilterBar = new();
    /// <summary>도구줄 왼쪽(건수 앞)에 페이지별 내용을 넣는다(예: 거래유형 탭)</summary>
    protected readonly WrapPanel LeftBar = new() { VerticalAlignment = VerticalAlignment.Center };
    protected readonly StackPanel ButtonBar = new() { Orientation = Orientation.Horizontal };
    private readonly StackPanel _primaryBar = new() { Orientation = Orientation.Horizontal };
    private readonly StackPanel _dangerBar = new() { Orientation = Orientation.Horizontal };
    protected readonly TextBox SearchBox = new() { Width = 220 };
    protected readonly DataGrid Grid = new();
    protected readonly TextBlock CountText = new() { FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = new SolidColorBrush(Color.FromRgb(0x37, 0x41, 0x51)), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0, 8, 0) };
    protected readonly Border FilterBox;
    protected List<Row> Rows { get; private set; } = new();
    private readonly string _menu;

    protected ListPage(string title, string searchHint = "검색어")
    {
        _menu = title;
        LastChildFill = true;
        Background = (Brush)Application.Current.FindResource("PageBack");

        // 위: 흰 검색 상자
        Placeholder.Set(SearchBox, searchHint);
        SearchBox.KeyDown += async (_, e) => { if (e.Key == Key.Enter) await RefreshAsync(); };
        FilterBar.Children.Add(SearchBox);
        var searchBtn = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton") };
        searchBtn.Click += async (_, _) => await RefreshAsync();
        FilterBar.Children.Add(searchBtn);
        FilterBox = new Border
        {
            Background = Brushes.White, BorderBrush = new SolidColorBrush(Color.FromRgb(0xE5, 0xE7, 0xEB)), BorderThickness = new Thickness(0, 0, 0, 1),
            Padding = new Thickness(8, 6, 8, 6), Child = FilterBar,
        };
        SetDock(FilterBox, Dock.Top);
        Children.Add(FilterBox);

        // 표 위 도구줄
        var toolbar = new DockPanel { Margin = new Thickness(8, 6, 8, 4) };
        _toolbar = toolbar;
        var right = new StackPanel { Orientation = Orientation.Horizontal };
        _rightGroup = right;
        right.Children.Add(ButtonBar);
        right.Children.Add(ColorFillButton());
        right.Children.Add(_primaryBar);
        var edit = new Button { Content = WithIcon("", "수정"), Background = Brush("#F59E0B"), BorderBrush = Brush("#F59E0B"), Foreground = Brushes.White };
        edit.Click += async (_, _) =>
        {
            if (Selected is not { } r) { Toast.Show("수정할 항목을 선택하세요."); return; }
            await Dialogs.RunAsync(() => OpenAsync(r));
        };
        ToolbarStyle(edit);
        right.Children.Add(edit);
        right.Children.Add(_dangerBar);
        DockPanel.SetDock(right, Dock.Right);
        toolbar.Children.Add(right);
        var left = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        left.Children.Add(LeftBar);
        left.Children.Add(CountText);
        toolbar.Children.Add(left);
        _leftGroup = left;
        SetDock(toolbar, Dock.Top);
        Children.Add(toolbar);

        // 표(흰 머리 + 검은 윗선) — 기존 .prop-list-grid td: 11px · 굵기 500 · 검정, 행 구분선 #94a3b8, 세로선 gray-200
        Grid.FontSize = 11;
        Grid.FontWeight = FontWeights.Medium;
        Grid.Foreground = Brushes.Black;
        Grid.RowHeight = 28;
        Grid.GridLinesVisibility = DataGridGridLinesVisibility.All;
        Grid.HorizontalGridLinesBrush = Brush("#94A3B8");
        Grid.VerticalGridLinesBrush = Brush("#E5E7EB");
        Grid.Margin = new Thickness(8, 0, 8, 8);
        Grid.BorderBrush = Brushes.Black;
        Grid.BorderThickness = new Thickness(0, 2, 0, 0);
        Grid.ColumnHeaderStyle = HeaderStyle();
        Grid.LoadingRow += (_, e) => PaintRow(e.Row);
        Children.Add(Grid);

        Grid.MouseDoubleClick += async (_, e) =>
        {
            if (e.OriginalSource is FrameworkElement fe && fe.DataContext is Row r && fe.TemplatedParent is not CheckBox) await OpenAsync(r);
        };
        Grid.KeyDown += async (_, e) =>
        {
            if (e.Key == Key.Enter && GridBuilder.Selected(Grid) is { } r) { e.Handled = true; await OpenAsync(r); }
        };

        var refresh = new Button { Content = new TextBlock { Text = "", FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), FontSize = 13 }, ToolTip = "새로고침", Padding = new Thickness(9, 5, 9, 5) };
        refresh.Click += async (_, _) => await RefreshAsync();
        ButtonBar.Children.Add(refresh);
        Loaded += async (_, _) => { if (!_loadedOnce) { _loadedOnce = true; await RefreshAsync(); } };
    }

    private readonly DockPanel _toolbar;
    private readonly StackPanel _rightGroup;
    private readonly StackPanel _leftGroup;

    /// <summary>
    /// 도구줄 두 줄(기존 stackToolbar — 고객관리): 1줄 = [왼쪽 내용][N건] … [row1Right], 2줄 = [검색어][검색] … [버튼들].
    /// 위 검색 상자는 숨긴다.
    /// </summary>
    protected void UseStackedToolbar(UIElement? row1Right = null)
    {
        FilterBox.Visibility = Visibility.Collapsed;
        FilterBar.Children.Clear();
        _toolbar.Children.Clear();
        var stack = new StackPanel();
        var row1 = new DockPanel { Margin = new Thickness(0, 0, 0, 6) };
        if (row1Right is not null) { DockPanel.SetDock(row1Right, Dock.Right); row1.Children.Add(row1Right); }
        row1.Children.Add(_leftGroup);
        var row2 = new DockPanel();
        DockPanel.SetDock(_rightGroup, Dock.Right);
        row2.Children.Add(_rightGroup);
        var search = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        SearchBox.Width = 240;
        search.Children.Add(SearchBox);
        var go = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton") };
        go.Click += async (_, _) => await RefreshAsync();
        search.Children.Add(go);
        row2.Children.Add(search);
        stack.Children.Add(row1);
        stack.Children.Add(row2);
        _toolbar.Children.Add(stack);
    }

    private static Brush Brush(string hex) => (Brush)new BrushConverter().ConvertFromString(hex)!;

    /// <summary>아이콘 + 글자 버튼 내용</summary>
    protected static object WithIcon(string glyph, string text)
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal };
        sp.Children.Add(new TextBlock { Text = glyph, FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), FontSize = 13, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 5, 0) });
        sp.Children.Add(new TextBlock { Text = text, VerticalAlignment = VerticalAlignment.Center });
        return sp;
    }

    /// <summary>기존 .prop-list-grid thead th: 14px · 굵기 500 · 검정 · 흰 바탕 · 위아래 3px · 아래 1px 검정선(세로선 gray-200)</summary>
    private static Style HeaderStyle()
    {
        var s = new Style(typeof(System.Windows.Controls.Primitives.DataGridColumnHeader), (Style)Application.Current.FindResource(typeof(System.Windows.Controls.Primitives.DataGridColumnHeader)));
        s.Setters.Add(new Setter(Control.BackgroundProperty, Brushes.White));
        s.Setters.Add(new Setter(Control.ForegroundProperty, Brushes.Black));
        s.Setters.Add(new Setter(Control.FontWeightProperty, FontWeights.Medium));
        s.Setters.Add(new Setter(Control.FontSizeProperty, 14.0));
        s.Setters.Add(new Setter(Control.PaddingProperty, new Thickness(3, 5, 3, 5)));
        s.Setters.Add(new Setter(Control.BorderBrushProperty, Brushes.Black));
        s.Setters.Add(new Setter(Control.BorderThicknessProperty, new Thickness(0, 0, 0, 1)));
        return s;
    }

    /// <summary>기존 목록 도구줄 버튼(색 채우기 등): padding 6px 14px · 14px · 굵기 500(.flat-topbar) · rounded 6px</summary>
    protected static void ToolbarStyle(Button b)
    {
        b.FontSize = 14;
        b.FontWeight = FontWeights.Medium;
        b.Padding = new Thickness(14, 5, 14, 5);
    }

    private bool _loadedOnce;

    protected string? Keyword => string.IsNullOrWhiteSpace(SearchBox.Text) ? null : SearchBox.Text.Trim();

    protected Button AddButton(string text, Func<Task> onClick, string? style = null)
    {
        var b = new Button { Content = text };
        switch (style)
        {
            case "PrimaryButton":
                b.Style = (Style)Application.Current.FindResource("PrimaryButton");
                b.Content = WithIcon("", text);
                _primaryBar.Children.Insert(0, b);
                break;
            case "DangerButton":
                b.Background = Brush("#DC2626");
                b.BorderBrush = Brush("#DC2626");
                b.Foreground = Brushes.White;
                b.Content = WithIcon("", text);
                _dangerBar.Children.Insert(0, b);
                break;
            default:
                if (style is not null) b.Style = (Style)Application.Current.FindResource(style);
                ButtonBar.Children.Insert(0, b);
                break;
        }
        ToolbarStyle(b);
        b.Click += async (_, _) => await Dialogs.RunAsync(onClick);
        return b;
    }

    /// <summary>행 우클릭 메뉴 항목(기존 목록의 우클릭 '수정·복사등록' 등) — 누른 행을 먼저 선택한다</summary>
    protected MenuItem AddRowMenu(string header, Func<Task> onClick)
    {
        if (Grid.ContextMenu is null)
        {
            Grid.ContextMenu = new ContextMenu();
            Grid.PreviewMouseRightButtonDown += (_, e) =>
            {
                if (e.OriginalSource is FrameworkElement fe && fe.DataContext is Row r && !Grid.SelectedItems.Contains(r)) Grid.SelectedItem = r;
            };
        }
        var mi = new MenuItem { Header = header, FontSize = 13 };
        mi.Click += async (_, _) => await Dialogs.RunAsync(onClick);
        Grid.ContextMenu.Items.Add(mi);
        return mi;
    }

    /// <summary>필터 영역에 라벨+컨트롤 추가</summary>
    protected T AddFilter<T>(string label, T control) where T : FrameworkElement
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(12, 0, 0, 0) };
        sp.Children.Add(new TextBlock { Text = label, FontSize = 14, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) });
        sp.Children.Add(control);
        FilterBar.Children.Add(sp);
        return control;
    }

    /// <summary>선택 콤보(전체 포함) — 바꾸면 바로 다시 조회</summary>
    protected ComboBox AddFilterCombo(string label, IEnumerable<Neosys.Local.Core.Opt> options, double width = 110)
    {
        var items = new List<Neosys.Local.Core.Opt> { new("", "전체") };
        items.AddRange(options);
        var cb = new ComboBox { ItemsSource = items, DisplayMemberPath = "Label", SelectedValuePath = "Value", SelectedIndex = 0, Width = width };
        cb.SelectionChanged += async (_, _) => { if (_loadedOnce) await RefreshAsync(); };
        return AddFilter(label, cb);
    }

    protected static string? ComboValue(ComboBox cb) => cb.SelectedValue is string s && s.Length > 0 ? s : null;

    public async Task RefreshAsync()
    {
        EnsureCheckColumn();
        var keepKey = KeyName is null ? null : GridBuilder.Selected(Grid)?[KeyName];
        await Dialogs.RunAsync(async () =>
        {
            Rows = await LoadAsync();
            Grid.ItemsSource = Rows;
            CountText.Text = $"{Rows.Count:#,0}건";
            if (keepKey is not null)
                Grid.SelectedItem = Rows.FirstOrDefault(r => Equals(r[KeyName!], keepKey));
        }, "목록을 불러오지 못했습니다.");
    }

    /// <summary>맨 앞 '선택' 체크 열(행 선택과 연결) — 기존 목록의 선택 칸</summary>
    private void EnsureCheckColumn()
    {
        if (Grid.Columns.FirstOrDefault()?.Header as string == "선택") return;
        var tpl = new DataTemplate();
        var cb = new FrameworkElementFactory(typeof(CheckBox));
        cb.SetValue(FrameworkElement.HorizontalAlignmentProperty, HorizontalAlignment.Center);
        cb.SetValue(FrameworkElement.MarginProperty, new Thickness(0));
        cb.SetBinding(System.Windows.Controls.Primitives.ToggleButton.IsCheckedProperty,
            new Binding(nameof(DataGridRow.IsSelected)) { RelativeSource = new RelativeSource(RelativeSourceMode.FindAncestor, typeof(DataGridRow), 1), Mode = BindingMode.TwoWay });
        tpl.VisualTree = cb;
        var head = new Style(typeof(System.Windows.Controls.Primitives.DataGridColumnHeader), Grid.ColumnHeaderStyle);
        head.Setters.Add(new Setter(Control.PaddingProperty, new Thickness(2, 6, 2, 6)));
        Grid.Columns.Insert(0, new DataGridTemplateColumn { Header = "선택", Width = 52, CellTemplate = tpl, CanUserResize = false, HeaderStyle = head });
    }

    // ---------------- 색 채우기(선택 행 배경색 — PC별 보관) ----------------

    private static readonly string[] FillColors = { "#FEE2E2", "#FEF9C3", "#DCFCE7", "#DBEAFE", "#F3E8FF", "#FED7AA" };
    private static Dictionary<string, Dictionary<string, string>>? _colors;
    private static string ColorFile => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "row_colors.json");

    private static Dictionary<string, Dictionary<string, string>> Colors
    {
        get
        {
            if (_colors is not null) return _colors;
            try { _colors = File.Exists(ColorFile) ? JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(File.ReadAllText(ColorFile)) : null; }
            catch { _colors = null; }
            return _colors ??= new();
        }
    }

    private Button ColorFillButton()
    {
        var b = new Button { Content = WithIcon("", "색 채우기"), BorderBrush = Brush("#6366F1"), Foreground = Brush("#4F46E5") };
        ToolbarStyle(b);
        b.Click += (_, _) =>
        {
            var menu = new ContextMenu { PlacementTarget = b, Placement = System.Windows.Controls.Primitives.PlacementMode.Bottom };
            var row = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(4) };
            foreach (var c in FillColors.Append(null))
            {
                var sw = new Button { Width = 24, Height = 24, MinHeight = 0, Padding = new Thickness(0), Margin = new Thickness(2), Background = c is null ? Brushes.White : Brush(c), Content = c is null ? "✕" : null, Foreground = Brushes.Red };
                sw.Click += (_, _) => { menu.IsOpen = false; ApplyColor(c); };
                row.Children.Add(sw);
            }
            menu.Items.Add(new MenuItem { Header = row, StaysOpenOnClick = true });
            menu.IsOpen = true;
        };
        return b;
    }

    private void ApplyColor(string? color)
    {
        if (KeyName is null) return;
        var rows = GridBuilder.SelectedRows(Grid);
        if (rows.Count == 0) { Toast.Show("색을 칠할 행을 선택하세요."); return; }
        if (!Colors.TryGetValue(_menu, out var map)) Colors[_menu] = map = new();
        foreach (var r in rows)
        {
            var id = Convert.ToString(r[KeyName]);
            if (string.IsNullOrEmpty(id)) continue;
            if (color is null) map.Remove(id); else map[id] = color;
        }
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(ColorFile)!);
            File.WriteAllText(ColorFile, JsonSerializer.Serialize(Colors));
        }
        catch { /* 저장 실패는 무시 */ }
        Grid.Items.Refresh();
    }

    private void PaintRow(DataGridRow row)
    {
        row.Background = Brushes.White;
        if (KeyName is null || row.Item is not Row r) return;
        if (Colors.TryGetValue(_menu, out var map) && map.TryGetValue(Convert.ToString(r[KeyName]) ?? "", out var c)) row.Background = Brush(c);
    }

    /// <summary>행의 키 컬럼 이름(새로고침 후 선택 유지·색 채우기용)</summary>
    protected virtual string? KeyName => null;

    protected abstract Task<List<Row>> LoadAsync();

    /// <summary>row == null 이면 신규 등록</summary>
    protected abstract Task OpenAsync(Row? row);

    protected Row? Selected => GridBuilder.Selected(Grid);
}

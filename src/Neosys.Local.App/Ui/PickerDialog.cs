using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

/// <summary>목록에서 하나 고르기(고객·물건·협력업체 선택 등). 검색어로 다시 조회한다.</summary>
public sealed class PickerDialog : Window
{
    private readonly Func<string?, Task<List<Row>>> _load;
    private readonly TextBox _search = new() { Width = 260 };
    private readonly DataGrid _grid = new() { SelectionMode = DataGridSelectionMode.Single };

    public Row? Result { get; private set; }

    private PickerDialog(string title, IEnumerable<ColDef> cols, Func<string?, Task<List<Row>>> load)
    {
        _load = load;
        Title = title;
        Width = 820;
        Height = 560;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Owner = Application.Current.Windows.OfType<Window>().FirstOrDefault(w => w.IsActive) ?? Application.Current.MainWindow;

        GridBuilder.SetColumns(_grid, cols);
        var top = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 8) };
        Placeholder.Set(_search, "검색어");
        top.Children.Add(_search);
        var go = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton") };
        go.Click += async (_, _) => await Reload();
        top.Children.Add(go);
        _search.KeyDown += async (_, e) => { if (e.Key == Key.Enter) await Reload(); };

        var ok = new Button { Content = "선택", Style = (Style)Application.Current.FindResource("PrimaryButton"), MinWidth = 80 };
        ok.Click += (_, _) => Accept(notify: true);
        var cancel = new Button { Content = "취소", MinWidth = 80, IsCancel = true };
        var bottom = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 8, 0, 0) };
        bottom.Children.Add(ok);
        bottom.Children.Add(cancel);

        var root = new DockPanel { Margin = new Thickness(14) };
        DockPanel.SetDock(top, Dock.Top);
        DockPanel.SetDock(bottom, Dock.Bottom);
        root.Children.Add(top);
        root.Children.Add(bottom);
        root.Children.Add(_grid);
        Content = root;

        _grid.MouseDoubleClick += (_, _) => Accept();
        Loaded += async (_, _) => { await Reload(); _search.Focus(); };
    }

    private async Task Reload() =>
        await Dialogs.RunAsync(async () => _grid.ItemsSource = await _load(string.IsNullOrWhiteSpace(_search.Text) ? null : _search.Text.Trim()));

    private void Accept(bool notify = false)
    {
        if (_grid.SelectedItem is not Row r) { if (notify) Toast.Show("목록에서 항목을 선택하세요."); return; }
        Result = r;
        DialogResult = true;
    }

    public static Row? Pick(string title, IEnumerable<ColDef> cols, Func<string?, Task<List<Row>>> load)
    {
        var w = new PickerDialog(title, cols, load);
        return w.ShowDialog() == true ? w.Result : null;
    }
}

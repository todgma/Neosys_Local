using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

public enum ChildColKind { Text, Amount, Decimal, Date, ReadOnly, Combo }

public sealed record ChildCol(string Key, string Header, double Width = 0, ChildColKind Kind = ChildColKind.Text, IReadOnlyList<Neosys.Local.Core.Opt>? Options = null)
{
    public static ChildCol Combo(string key, string header, IReadOnlyList<Neosys.Local.Core.Opt> options, double width = 80) =>
        new(key, header, width, ChildColKind.Combo, options);
}

/// <summary>
/// 하위 목록 편집기(구입자·공동중개사·메모·상담이력·임대차현황 등): 제목 + [행추가][행삭제] + 편집 가능한 표.
/// Items는 저장 시 서비스에 그대로 넘긴다.
/// </summary>
public sealed class ChildListEditor : DockPanel
{
    public ObservableCollection<Row> Items { get; } = new();
    public DataGrid Grid { get; }
    private readonly Func<Row> _newRow;

    public ChildListEditor(string title, IEnumerable<ChildCol> cols, Func<Row>? newRow = null, double minHeight = 110, bool canAdd = true)
    {
        _newRow = newRow ?? (() => new Row());
        Margin = new Thickness(0, 6, 0, 0);

        var head = new DockPanel { Margin = new Thickness(0, 0, 0, 3) };
        var buttons = new StackPanel { Orientation = Orientation.Horizontal };
        if (canAdd)
        {
            var add = new Button { Content = "+ 행추가", Padding = new Thickness(8, 1, 8, 1), MinHeight = 24 };
            add.Click += (_, _) => AddRow();
            buttons.Children.Add(add);
        }
        var del = new Button { Content = "행삭제", Padding = new Thickness(8, 1, 8, 1), MinHeight = 24 };
        del.Click += (_, _) => DeleteSelected();
        buttons.Children.Add(del);
        DockPanel.SetDock(buttons, Dock.Right);
        head.Children.Add(buttons);
        head.Children.Add(new TextBlock { Text = title, FontWeight = FontWeights.Bold, Foreground = (Brush)Application.Current.FindResource("PrimaryDark"), VerticalAlignment = VerticalAlignment.Center });
        SetDock(head, Dock.Top);
        Children.Add(head);

        Grid = new DataGrid
        {
            IsReadOnly = false, CanUserAddRows = false, CanUserSortColumns = false,
            SelectionMode = DataGridSelectionMode.Single, SelectionUnit = DataGridSelectionUnit.FullRow,
            HeadersVisibility = DataGridHeadersVisibility.All, RowHeaderWidth = 14, MinHeight = minHeight,
            ItemsSource = Items, RowHeight = double.NaN,
        };
        foreach (var c in cols) Grid.Columns.Add(MakeColumn(c));
        Children.Add(Grid);
    }

    public Row AddRow()
    {
        var r = _newRow();
        Items.Add(r);
        Grid.SelectedItem = r;
        Grid.ScrollIntoView(r);
        return r;
    }

    public void DeleteSelected()
    {
        if (Grid.SelectedItem is Row r && Dialogs.Confirm("이 행을 삭제하시겠습니까?")) Items.Remove(r);
    }

    /// <summary>제목·버튼 줄 숨김(기존 카드형: 버튼은 왼쪽 보라 라벨 칸에 둔다)</summary>
    public void HideHeader()
    {
        Children[0].Visibility = Visibility.Collapsed;
        Margin = new Thickness(0);
    }

    public void Load(IEnumerable<Row> rows)
    {
        Items.Clear();
        foreach (var r in rows) Items.Add(r);
    }

    /// <summary>편집 중인 셀을 확정한다(저장 전 호출)</summary>
    public void Commit()
    {
        Grid.CommitEdit(DataGridEditingUnit.Cell, true);
        Grid.CommitEdit(DataGridEditingUnit.Row, true);
    }

    private static DataGridColumn MakeColumn(ChildCol c)
    {
        var width = c.Width > 0 ? new DataGridLength(c.Width) : new DataGridLength(1, DataGridLengthUnitType.Star);
        var b = new Binding($"[{c.Key}]") { Mode = c.Kind == ChildColKind.ReadOnly ? BindingMode.OneWay : BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged };
        var right = false;
        switch (c.Kind)
        {
            case ChildColKind.Amount: b.Converter = AmountConverter.Instance; b.UpdateSourceTrigger = UpdateSourceTrigger.LostFocus; right = true; break;
            case ChildColKind.Decimal: b.Converter = DecimalConverter.Instance; b.UpdateSourceTrigger = UpdateSourceTrigger.LostFocus; right = true; break;
            case ChildColKind.ReadOnly: b.Converter = new DateCutConverter(16); break;
        }

        if (c.Kind == ChildColKind.Combo)
        {
            return new DataGridComboBoxColumn
            {
                Header = c.Header, Width = width, ItemsSource = c.Options, DisplayMemberPath = "Label", SelectedValuePath = "Value",
                SelectedValueBinding = new Binding($"[{c.Key}]") { Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged },
            };
        }

        if (c.Kind == ChildColKind.Date)
        {
            var tpl = new DataTemplate();
            var f = new FrameworkElementFactory(typeof(DatePicker));
            f.SetBinding(DatePicker.SelectedDateProperty, new Binding($"[{c.Key}]") { Mode = BindingMode.TwoWay, Converter = DateStringConverter.Instance, UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged });
            f.SetValue(Control.BorderThicknessProperty, new Thickness(0));
            tpl.VisualTree = f;
            return new DataGridTemplateColumn { Header = c.Header, Width = width, CellTemplate = tpl };
        }

        var es = new Style(typeof(TextBlock));
        es.Setters.Add(new Setter(TextBlock.TextWrappingProperty, TextWrapping.Wrap));
        es.Setters.Add(new Setter(VerticalAlignmentProperty, VerticalAlignment.Center));
        if (right) es.Setters.Add(new Setter(TextBlock.TextAlignmentProperty, TextAlignment.Right));
        var eds = new Style(typeof(TextBox));
        eds.Setters.Add(new Setter(TextBox.AcceptsReturnProperty, true));
        eds.Setters.Add(new Setter(TextBox.TextWrappingProperty, TextWrapping.Wrap));
        return new DataGridTextColumn
        {
            Header = c.Header, Width = width, Binding = b, IsReadOnly = c.Kind == ChildColKind.ReadOnly,
            ElementStyle = es, EditingElementStyle = eds,
        };
    }
}

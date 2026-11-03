using System.Windows.Media;
using Neosys.Local.Core;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

public enum ColKind { Text, Amount, Decimal, Date, DateTime, Code, Lookup }

/// <summary>목록 컬럼 정의. Key = Row 키.</summary>
public sealed record ColDef(string Key, string Header, double Width = 100, ColKind Kind = ColKind.Text, Func<string, string?>? Lookup = null)
{
    public static ColDef Text(string key, string header, double width = 100) => new(key, header, width);
    public static ColDef Amount(string key, string header, double width = 90) => new(key, header, width, ColKind.Amount);
    public static ColDef Dec(string key, string header, double width = 70) => new(key, header, width, ColKind.Decimal);
    public static ColDef Date(string key, string header, double width = 95) => new(key, header, width, ColKind.Date);
    public static ColDef DateTime(string key, string header, double width = 135) => new(key, header, width, ColKind.DateTime);
    /// <summary>공통코드 이름으로 표시</summary>
    public static ColDef Code(string key, string header, double width = 90) => new(key, header, width, ColKind.Code);
    /// <summary>지정 사전으로 표시(콤마 여러 값 지원)</summary>
    public static ColDef Map(string key, string header, IReadOnlyList<Opt> options, double width = 90)
    {
        var d = options.GroupBy(o => o.Value).ToDictionary(g => g.Key, g => g.First().Label);
        return new(key, header, width, ColKind.Lookup, v => d.TryGetValue(v, out var l) ? l : v);
    }
}

public static class GridBuilder
{
    private static readonly DateCutConverter DateCut = new(10);
    private static readonly DateCutConverter DateTimeCut = new(16);

    public static void SetColumns(DataGrid grid, IEnumerable<ColDef> cols)
    {
        grid.Columns.Clear();
        foreach (var c in cols)
        {
            var b = new Binding($"[{c.Key}]") { Mode = BindingMode.OneWay };
            var right = false;
            switch (c.Kind)
            {
                case ColKind.Amount: b.Converter = AmountConverter.Instance; right = true; break;
                case ColKind.Decimal: b.Converter = DecimalConverter.Instance; right = true; break;
                case ColKind.Date: b.Converter = DateCut; break;
                case ColKind.DateTime: b.Converter = DateTimeCut; break;
                case ColKind.Code: b.Converter = new LookupConverter(AppServices.Codes.Name); break;
                case ColKind.Lookup: b.Converter = new LookupConverter(c.Lookup!); break;
            }
            var style = new Style(typeof(TextBlock));
            style.Setters.Add(new Setter(TextBlock.TextTrimmingProperty, TextTrimming.CharacterEllipsis));
            style.Setters.Add(new Setter(FrameworkElement.VerticalAlignmentProperty, VerticalAlignment.Center));
            // 기존 목록처럼 가운데 정렬(금액·숫자는 오른쪽)
            style.Setters.Add(new Setter(TextBlock.TextAlignmentProperty, right ? TextAlignment.Right : TextAlignment.Center));
            style.Setters.Add(new Setter(TextBlock.ForegroundProperty, Brushes.Black));
            grid.Columns.Add(new DataGridTextColumn
            {
                Header = c.Header,
                Binding = b,
                Width = c.Width > 0 ? new DataGridLength(c.Width) : new DataGridLength(1, DataGridLengthUnitType.Star),
                ElementStyle = style,
                SortMemberPath = $"[{c.Key}]",
            });
        }
    }

    /// <summary>행 편집 가능한 하위 목록(구입자·공동중개사 등)용 그리드</summary>
    public static DataGrid EditableGrid(IEnumerable<(string Key, string Header, double Width)> cols)
    {
        var grid = new DataGrid
        {
            IsReadOnly = false,
            CanUserAddRows = false,
            SelectionMode = DataGridSelectionMode.Single,
            SelectionUnit = DataGridSelectionUnit.CellOrRowHeader,
            HeadersVisibility = DataGridHeadersVisibility.All,
            RowHeaderWidth = 18,
            MinHeight = 90,
        };
        foreach (var (key, header, width) in cols)
            grid.Columns.Add(new DataGridTextColumn
            {
                Header = header,
                Binding = new Binding($"[{key}]") { Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged },
                Width = width > 0 ? new DataGridLength(width) : new DataGridLength(1, DataGridLengthUnitType.Star),
            });
        return grid;
    }

    public static Row? Selected(DataGrid grid) => grid.SelectedItem as Row;
    public static List<Row> SelectedRows(DataGrid grid) => grid.SelectedItems.OfType<Row>().ToList();
}

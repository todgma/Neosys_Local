using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Contracts;

/// <summary>
/// 부속문서 인쇄본(FlowDocument) — 서식 정의로 제목·안내문·항목표·행 목록·계산값·영수 문구를 A4에 흐르게 배치한다.
/// 입력칸 없이 값만 찍는다(기존 '미리보기 및 인쇄' 모드). 부수(매수인용/매도인용)는 절취선으로 이어 붙인다.
/// </summary>
public static class DocPrint
{
    private static readonly Brush Line = Brushes.Black;
    private static readonly Brush HeadBack = new SolidColorBrush(Color.FromRgb(0xF4, 0xF6, 0xF9));

    public static FlowDocument Build(DocForm form, JsonObject data, string? page)
    {
        var doc = new FlowDocument
        {
            FontFamily = (FontFamily)Application.Current.FindResource("AppFont"), FontSize = 12, PagePadding = new Thickness(56, 60, 56, 50),
            PageWidth = 794, PageHeight = 1123, ColumnWidth = 2000, TextAlignment = TextAlignment.Left,
        };
        page ??= form.PageKey is { } pk ? DocJson.Str(data, pk) : null;
        var title = form.PrintTitle?.Invoke(data, page) ?? form.Title;
        var copies = form.Copies(data);
        var labels = copies.Count == 0 ? new string?[] { null } : copies.Select(c => (string?)c).ToArray();

        for (int i = 0; i < labels.Length; i++)
        {
            if (i > 0) doc.Blocks.Add(new Paragraph(new Run("- - - - - - - - - - - - - - - - - - - - 절 취 선 - - - - - - - - - - - - - - - - - - - -"))
                { TextAlignment = TextAlignment.Center, Foreground = Brushes.Gray, Margin = new Thickness(0, 18, 0, 18) });
            AddCopy(doc, form, data, page, title, labels[i]);
        }
        return doc;
    }

    private static void AddCopy(FlowDocument doc, DocForm form, JsonObject data, string? page, string title, string? copyLabel)
    {
        if (copyLabel is not null || DocJson.Str(data, "serialNo") is { Length: > 0 })
        {
            var head = new Paragraph { Margin = new Thickness(0, 0, 0, 4) };
            if (copyLabel is not null) head.Inlines.Add(new Bold(new Run($"[{copyLabel}]")));
            if (DocJson.Str(data, "serialNo") is { Length: > 0 } no) head.Inlines.Add(new Run($"      NO. {no}"));
            doc.Blocks.Add(head);
        }
        doc.Blocks.Add(new Paragraph(new Run(title)) { FontSize = 22, FontWeight = FontWeights.Bold, TextAlignment = TextAlignment.Center, Margin = new Thickness(0, 4, 0, 14) });

        // 문자형(가계약): 본문만
        if (form.TextKey is { } tk)
        {
            doc.Blocks.Add(new Paragraph(new Run(DocJson.Str(data, tk))) { FontSize = 13, LineHeight = 22 });
            return;
        }

        if (form.Intro?.Invoke(data) is { } intro)
            foreach (var p in intro)
                doc.Blocks.Add(new Paragraph(new Run(p)) { Margin = new Thickness(0, 2, 0, 2), FontWeight = p.Length < 30 && !p.StartsWith("-") ? FontWeights.Bold : FontWeights.Medium });

        foreach (var s in form.Sections(data).Where(s => s.Print && (s.Page is null || s.Page == page)))
        {
            // 종류 선택 등 값이 하나뿐인 머리 섹션은 제목을 생략
            if (s.Fields.Count == 1 && s.Fields[0].Key.StartsWith('_')) continue;
            doc.Blocks.Add(new Paragraph(new Run(s.Title)) { FontWeight = FontWeights.Bold, FontSize = 13, Margin = new Thickness(0, 10, 0, 3) });
            if (s.Fields.Count > 0) doc.Blocks.Add(FieldTable(s.Fields, data));
            foreach (var t in s.Tables) doc.Blocks.Add(RowsTable(t, data));
            foreach (var l in s.Lines)
                doc.Blocks.Add(new Paragraph(new Bold(new Run($"{l.Label} : {l.Value(data)}"))) { TextAlignment = TextAlignment.Right, Margin = new Thickness(0, 4, 0, 2), FontSize = 13 });
        }

        if (form.PrintBody?.Invoke(data, page) is { } body)
        {
            var first = true;
            foreach (var line in body)
            {
                doc.Blocks.Add(new Paragraph(new Run(line)) { TextAlignment = TextAlignment.Center, Margin = new Thickness(0, first ? 14 : 3, 0, 3), FontSize = 13 });
                first = false;
            }
        }
    }

    private static TableCell Cell(string text, bool head = false, int span = 1) => new(new Paragraph(new Run(text)) { Margin = new Thickness(0) })
    {
        BorderBrush = Line, BorderThickness = new Thickness(0.5), Padding = new Thickness(5, 3, 5, 3), ColumnSpan = span,
        Background = head ? HeadBack : Brushes.White, FontWeight = head ? FontWeights.SemiBold : FontWeights.Medium,
        TextAlignment = head ? TextAlignment.Center : TextAlignment.Left,
    };

    /// <summary>항목표: [라벨|값|라벨|값], 넓은 칸은 한 줄 전체</summary>
    private static Table FieldTable(IReadOnlyList<DocField> fields, JsonObject data)
    {
        var t = new Table { CellSpacing = 0, Margin = new Thickness(0, 0, 0, 4) };
        foreach (var w in new[] { 120.0, 230, 120, 230 }) t.Columns.Add(new TableColumn { Width = new GridLength(w) });
        var group = new TableRowGroup();
        t.RowGroups.Add(group);
        TableRow? row = null;
        int used = 0;
        foreach (var f in fields)
        {
            var wide = f.Wide || f.Kind is DocFieldKind.Memo or DocFieldKind.Obj;
            if (row is null || used + (wide ? 4 : 2) > 4)
            {
                if (row is not null && used < 4) row.Cells.Add(Cell("", span: 4 - used));
                row = new TableRow();
                group.Rows.Add(row);
                used = 0;
            }
            row.Cells.Add(Cell(f.Label, head: true));
            row.Cells.Add(Cell(ValueText(f, data), span: wide ? 3 : 1));
            used += wide ? 4 : 2;
        }
        if (row is not null && used < 4) row.Cells.Add(Cell("", span: 4 - used));
        return t;
    }

    private static string Box(bool on) => on ? "☑" : "☐";

    public static string ValueText(DocField f, JsonObject data) => f.Kind switch
    {
        DocFieldKind.Choice => string.Join("  ", f.Options.Select(o => $"{Box(DocJson.Str(data, f.Key) == o.Value)} {o.Label}")),
        DocFieldKind.Flags => string.Join("  ", f.Keys.Zip(f.Options, (k, o) => $"{Box(DocJson.Bool(data, k))} {o.Label}")),
        DocFieldKind.Obj => string.Join("  ", f.Options.Select(o => $"{Box(DocJson.Bool(data, $"{f.Key}.{o.Value}"))} {o.Label}")),
        DocFieldKind.Amount => DocJson.Comma(DocJson.Str(data, f.Key)),
        _ => DocJson.Str(data, f.Key),
    };

    private static Table RowsTable(DocTable def, JsonObject data)
    {
        var t = new Table { CellSpacing = 0, Margin = new Thickness(0, 2, 0, 4) };
        foreach (var c in def.Columns) t.Columns.Add(new TableColumn { Width = c.Width > 0 ? new GridLength(c.Width) : new GridLength(1, GridUnitType.Star) });
        var group = new TableRowGroup();
        t.RowGroups.Add(group);
        var head = new TableRow();
        foreach (var c in def.Columns) head.Cells.Add(Cell(c.Header, head: true));
        group.Rows.Add(head);
        foreach (var o in DocJson.Array(data, def.Path).OfType<JsonObject>())
        {
            var r = new TableRow();
            foreach (var c in def.Columns)
            {
                var text = c.Kind switch
                {
                    DocColKind.Lines => string.Join("\n", DocJson.Array(o, c.Key).Select(x => "· " + (x?.GetValue<string>() ?? ""))),
                    DocColKind.Amount => DocJson.Comma(DocJson.Str(o, c.Key)),
                    _ => DocJson.Str(o, c.Key),
                };
                var cell = Cell(text);
                if (c.Kind == DocColKind.Amount) cell.TextAlignment = TextAlignment.Right;
                r.Cells.Add(cell);
            }
            group.Rows.Add(r);
        }
        return t;
    }

    /// <summary>A4 인쇄 — 프린터 선택 후 페이지 나눔 인쇄</summary>
    public static void Print(FlowDocument doc, string title)
    {
        var dlg = new PrintDialog();
        if (!Ui.Dialogs.ShowPrint(dlg)) return;
        doc.PageWidth = dlg.PrintableAreaWidth;
        doc.PageHeight = dlg.PrintableAreaHeight;
        doc.ColumnWidth = dlg.PrintableAreaWidth;
        dlg.PrintDocument(((IDocumentPaginatorSource)doc).DocumentPaginator, title);
    }
}

/// <summary>인쇄 미리보기(쪽 단위) + 인쇄</summary>
public sealed class DocPreviewWindow : Window
{
    public DocPreviewWindow(FlowDocument doc, string title)
    {
        Title = $"{title} — 미리보기";
        Width = 900;
        Height = 960;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;

        var bar = new DockPanel { Margin = new Thickness(10, 8, 10, 8) };
        var right = new StackPanel { Orientation = Orientation.Horizontal };
        var print = new Button { Content = "인쇄", MinWidth = 90, Style = (Style)Application.Current.FindResource("PrimaryButton") };
        print.Click += (_, _) => DocPrint.Print(doc, title);
        var close = new Button { Content = "닫기", MinWidth = 80, IsCancel = true };
        close.Click += (_, _) => Close();
        right.Children.Add(print);
        right.Children.Add(close);
        DockPanel.SetDock(right, Dock.Right);
        bar.Children.Add(right);
        bar.Children.Add(new TextBlock { Text = title, FontWeight = FontWeights.Bold, FontSize = 15, VerticalAlignment = VerticalAlignment.Center });

        var root = new DockPanel();
        DockPanel.SetDock(bar, Dock.Top);
        root.Children.Add(bar);
        root.Children.Add(new FlowDocumentPageViewer { Document = doc, Background = new SolidColorBrush(Color.FromRgb(0xE5, 0xE7, 0xEB)), Zoom = 90 });
        Content = root;
    }
}

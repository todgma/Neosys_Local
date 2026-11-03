using System.Collections.ObjectModel;
using System.Globalization;
using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Contracts;

/// <summary>
/// 계약 부속문서 편집 — 서식 정의(ContractDocs)로 입력칸·표·계산값을 그리고, contract_document(doc_kind)에 JSON으로 저장한다.
/// 기존 ContractDocModal + 각 *Form.jsx. 저장하지 않은 키는 불러온 JSON 그대로 보존한다.
/// </summary>
public sealed class ContractDocWindow : EditWindow
{
    private const string SrcKey = "\u0001src";   // 표 행에 원래 JSON 객체를 숨겨 둔다(정의에 없는 키 보존)

    private readonly ContractService _svc;
    private readonly DocForm _form;
    private readonly string _masterId;
    private readonly Row? _master;
    private JsonObject _data = new();
    private bool _exists;

    private readonly Row _r = new();
    private readonly List<(DocTable Table, ChildListEditor Editor)> _tables = new();
    private readonly List<(DocLine Line, TextBlock Text)> _lines = new();
    private readonly StackPanel _content = new();
    private TabControl? _tabs;
    private IReadOnlyList<DocSection> _sections = Array.Empty<DocSection>();

    /// <param name="master">계약 마스터(기본값 재료). 계약서 작성 중이면 현재 입력값을 담은 Row</param>
    public ContractDocWindow(ContractService svc, DocForm form, string masterId, Row? master) : base(form.Title, 1000, 900)
    {
        _svc = svc;
        _form = form;
        _masterId = masterId;
        _master = master;

        var bar = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
        bar.Children.Add(new TextBlock { Text = form.Title, FontSize = 16, FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 16, 0) });
        if (form.TextKey is not null)
        {
            bar.Children.Add(Btn("문구 다시 만들기", RegenerateText));
            bar.Children.Add(Btn("문구 복사", CopyText));
        }
        if (form.ClauseKey is not null) bar.Children.Add(Btn("특약관리", OpenClauses));
        if (form.Kind == "정산서:잔금") bar.Children.Add(Btn("적요 기본값", ResetBalanceRows));
        if (form.Kind.StartsWith("준비서면:")) bar.Children.Add(Btn("현재 탭 기본값", ResetPrepTab));
        var print = Btn("미리보기 및 인쇄", Preview);
        print.Style = (Style)Application.Current.FindResource("PrimaryButton");
        print.Margin = new Thickness(16, 2, 2, 2);
        bar.Children.Add(print);
        DockPanel.SetDock(bar, Dock.Top);
        Body.Children.Add(bar);
        Body.Children.Add(new ScrollViewer { Content = _content, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });

        // 종류(확인설명서 _ceType)가 바뀌면 그 종류의 칸으로 다시 그린다
        if (form.VariantKey is { } vk)
            _r.PropertyChanged += (_, e) =>
            {
                if (e.PropertyName != vk || _r.Str(vk) == DocJson.Str(_data, vk)) return;
                Collect();
                Dispatcher.BeginInvoke(Build);
            };
        // 계산값(합계 등)은 입력칸을 벗어날 때마다 다시 계산
        PreviewLostKeyboardFocus += (_, _) => Dispatcher.BeginInvoke(RefreshLines);
        Loaded += async (_, _) => await LoadAsync();
    }

    private static Button Btn(string text, Action onClick)
    {
        var b = new Button { Content = text };
        b.Click += (_, _) => onClick();
        return b;
    }

    private async Task LoadAsync()
    {
        try
        {
            var saved = await _svc.GetDocumentAsync(_masterId, _form.Kind);
            _exists = saved is not null;
            _data = ContractDocs.Load(_form, await _svc.DocumentContextAsync(_master), saved);
            Build();
            UpdateMode();
        }
        catch (Exception ex)
        {
            Dialogs.Error("부속문서를 불러오지 못했습니다.\n" + ex.Message);
        }
    }

    // ---------------- 화면 그리기 ----------------

    /// <summary>현재 _data로 화면 전체를 다시 그린다(종류 변경·기본값 되돌리기 후)</summary>
    private void Build()
    {
        var selectedPage = _tabs?.SelectedItem is TabItem ti ? ti.Header as string : _form.PageKey is { } pk ? DocJson.Str(_data, pk) : null;
        _content.Children.Clear();
        _tables.Clear();
        _lines.Clear();
        _r.Clear();
        _tabs = null;
        _sections = _form.Sections(_data);

        if (_form.Intro?.Invoke(_data) is { } intro)
        {
            var box = new StackPanel { Margin = new Thickness(0, 0, 0, 8) };
            foreach (var p in intro)
                box.Children.Add(new TextBlock { Text = p, TextWrapping = TextWrapping.Wrap, Foreground = (Brush)Application.Current.FindResource("Muted"), Margin = new Thickness(0, 1, 0, 1) });
            _content.Children.Add(new Border { Child = box, Background = (Brush)Application.Current.FindResource("PanelBack"), Padding = new Thickness(10, 6, 10, 6), Margin = new Thickness(0, 0, 0, 8) });
        }

        foreach (var s in _sections.Where(s => s.Page is null)) _content.Children.Add(BuildSection(s));

        var pages = _sections.Where(s => s.Page is not null).GroupBy(s => s.Page!).ToList();
        if (pages.Count > 0)
        {
            _tabs = new TabControl { Margin = new Thickness(0, 10, 0, 0) };
            foreach (var g in pages)
            {
                var panel = new StackPanel { Margin = new Thickness(6) };
                foreach (var s in g) panel.Children.Add(BuildSection(s));
                _tabs.Items.Add(new TabItem { Header = g.Key, Content = panel });
            }
            _tabs.SelectedItem = _tabs.Items.OfType<TabItem>().FirstOrDefault(t => (string)t.Header == selectedPage) ?? _tabs.Items[0];
            _content.Children.Add(_tabs);
        }

        RefreshLines();
    }

    private FrameworkElement BuildSection(DocSection s)
    {
        var panel = new StackPanel { Margin = new Thickness(0, 0, 0, 6) };
        panel.Children.Add(new TextBlock { Text = s.Title, Style = (Style)Application.Current.FindResource("SectionHeader") });
        if (s.Fields.Count > 0) panel.Children.Add(FormBuilder.Build(_r, s.Fields.Select(ToFieldDef).ToList(), 2));
        foreach (var t in s.Tables)
        {
            var editor = new ChildListEditor(t.Title, t.Columns.Select(ToChildCol), () => NewTableRow(t), minHeight: 90);
            editor.Load(DocJson.Array(_data, t.Path).OfType<JsonObject>().Select(o => TableRowOf(t, o)));
            editor.Grid.CellEditEnding += (_, _) => Dispatcher.BeginInvoke(RefreshLines);
            editor.Items.CollectionChanged += (_, _) => Dispatcher.BeginInvoke(RefreshLines);
            _tables.Add((t, editor));
            panel.Children.Add(editor);
        }
        foreach (var l in s.Lines)
        {
            var sp = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 6, 4, 0) };
            sp.Children.Add(new TextBlock { Text = l.Label + " : ", FontWeight = FontWeights.Bold, FontSize = 14 });
            var tb = new TextBlock { FontWeight = FontWeights.Bold, FontSize = 14, Foreground = (Brush)Application.Current.FindResource("PrimaryDark") };
            sp.Children.Add(tb);
            _lines.Add((l, tb));
            panel.Children.Add(sp);
        }
        return panel;
    }

    private FieldDef ToFieldDef(DocField f)
    {
        switch (f.Kind)
        {
            case DocFieldKind.Flags:
                foreach (var k in f.Keys) _r[k] = DocJson.Bool(_data, k);
                return F.Custom(f.Label, row => Checks(row, f.Keys.Zip(f.Options, (k, o) => (k, o.Label)))).Span(f.Wide ? 2 : 1);
            case DocFieldKind.Obj:
                foreach (var o in f.Options) _r[$"{f.Key}.{o.Value}"] = DocJson.Bool(_data, $"{f.Key}.{o.Value}");
                return F.Custom(f.Label, row => Checks(row, f.Options.Select(o => ($"{f.Key}.{o.Value}", o.Label)))).Span(2);
        }
        _r[f.Key] = DocJson.Str(_data, f.Key);
        var def = f.Kind switch
        {
            DocFieldKind.Memo => F.Memo(f.Key, f.Label, f.Height),
            DocFieldKind.Date => F.Date(f.Key, f.Label),
            DocFieldKind.Amount => F.Amount(f.Key, f.Label, null),
            DocFieldKind.Choice => F.Custom(f.Label, row => new ToggleChoice(row, f.Key, f.Options)),
            DocFieldKind.Combo => F.Edit(f.Key, f.Label, f.Options.Select(o => o.Value).ToArray()),
            _ => F.Text(f.Key, f.Label),
        };
        return f.Wide || f.Kind == DocFieldKind.Memo ? def.Span(2) : def;
    }

    /// <summary>참거짓 체크박스 묶음(각 키 = Row의 bool)</summary>
    private static FrameworkElement Checks(Row row, IEnumerable<(string Key, string Label)> items)
    {
        var wrap = new WrapPanel();
        foreach (var (key, label) in items)
        {
            var cb = new CheckBox { Content = label, Margin = new Thickness(0, 2, 14, 2) };
            cb.SetBinding(System.Windows.Controls.Primitives.ToggleButton.IsCheckedProperty,
                new Binding($"[{key}]") { Source = row, Mode = BindingMode.TwoWay, Converter = TrueConverter.Instance });
            wrap.Children.Add(cb);
        }
        return wrap;
    }

    private static ChildCol ToChildCol(DocColumn c) => c.Kind switch
    {
        DocColKind.Amount => new ChildCol(c.Key, c.Header, c.Width, ChildColKind.Amount),
        DocColKind.Choice => ChildCol.Combo(c.Key, c.Header, (c.Options ?? Array.Empty<string>()).Select(o => new Opt(o, o.Length == 0 ? "(없음)" : o)).ToList(), c.Width > 0 ? c.Width : 80),
        _ => new ChildCol(c.Key, c.Header, c.Width),
    };

    private static Row TableRowOf(DocTable t, JsonObject o)
    {
        var r = new Row { [SrcKey] = o };
        foreach (var c in t.Columns)
            r[c.Key] = c.Kind == DocColKind.Lines
                ? string.Join("\n", DocJson.Array(o, c.Key).Select(x => x?.GetValue<string>() ?? ""))
                : DocJson.Str(o, c.Key);
        return r;
    }

    private static Row NewTableRow(DocTable t) => TableRowOf(t, t.NewRow?.Invoke() ?? new JsonObject());

    // ---------------- 화면 → JSON ----------------

    /// <summary>화면 값을 _data에 반영한다. 정의에 없는 키는 그대로 둔다.</summary>
    private JsonObject Collect(bool commit = true)
    {
        if (commit) foreach (var (_, editor) in _tables) editor.Commit();
        foreach (var f in _sections.SelectMany(s => s.Fields))
        {
            switch (f.Kind)
            {
                case DocFieldKind.Flags:
                    foreach (var k in f.Keys) DocJson.Set(_data, k, _r[k] is true);
                    break;
                case DocFieldKind.Obj:
                    foreach (var o in f.Options) DocJson.Set(_data, $"{f.Key}.{o.Value}", _r[$"{f.Key}.{o.Value}"] is true);
                    break;
                default:
                    DocJson.Set(_data, f.Key, Convert.ToString(_r[f.Key], CultureInfo.InvariantCulture) ?? "");
                    break;
            }
        }
        foreach (var (t, editor) in _tables)
        {
            var arr = new JsonArray();
            foreach (var row in editor.Items)
            {
                var o = row[SrcKey] is JsonObject src ? (JsonObject)src.DeepClone() : new JsonObject();
                foreach (var c in t.Columns)
                {
                    var v = Convert.ToString(row[c.Key], CultureInfo.InvariantCulture) ?? "";
                    o[c.Key] = c.Kind == DocColKind.Lines
                        ? new JsonArray(v.Replace("\r", "").Split('\n').Select(x => (JsonNode?)JsonValue.Create(x)).ToArray())
                        : JsonValue.Create(v);
                }
                arr.Add(o);
            }
            DocJson.Set(_data, t.Path, arr);
        }
        if (_form.PageKey is { } pk && _tabs?.SelectedItem is TabItem ti) _data[pk] = (string)ti.Header;
        return _data;
    }

    private string? CurrentPage => _tabs?.SelectedItem is TabItem ti ? ti.Header as string : null;

    private void RefreshLines()
    {
        if (_lines.Count == 0) return;
        var d = (JsonObject)Collect(commit: false).DeepClone();   // 편집 중인 셀은 건드리지 않는다
        foreach (var (line, text) in _lines) text.Text = line.Value(d);
    }

    // ---------------- 버튼 ----------------

    private void RegenerateText()
    {
        if (_form.TextKey is not { } tk || _form.BuildText is not { } build) return;
        if (!string.IsNullOrWhiteSpace(_r.Str(tk)) && !Dialogs.Confirm("입력값으로 문자 내용을 다시 만듭니다. 직접 고친 내용은 사라집니다. 계속하시겠습니까?")) return;
        _r[tk] = build(Collect());
    }

    private void CopyText()
    {
        if (_form.TextKey is not { } tk) return;
        Clipboard.SetText(_r.Str(tk) ?? "");
        Dialogs.Info("문자 내용을 복사했습니다.");
    }

    private void OpenClauses()
    {
        if (_form.ClauseKey is not { } ck) return;
        new SpecialClauseWindow(text => _r[ck] = SpecialClauseStore.Append(_r.Str(ck), text)) { Owner = this }.ShowDialog();
    }

    private void ResetBalanceRows()
    {
        if (CurrentPage is not { } tab || !Dialogs.Confirm($"[{tab}] 적요를 기본값으로 되돌릴까요?")) return;
        Collect();
        DocJson.Set(_data, $"tabs.{tab}.rows", ContractDocs.BalanceDefaultRows(tab));
        Build();
    }

    private void ResetPrepTab()
    {
        if (CurrentPage is not { } tab || !Dialogs.Confirm($"[{tab}] 내용을 기본값으로 되돌릴까요?")) return;
        Collect();
        _data[tab] = ContractDocs.PrepDefault(_form.Kind == "준비서면:계약시")[tab]!.DeepClone();
        Build();
    }

    private void Preview()
    {
        var data = (JsonObject)Collect().DeepClone();
        new DocPreviewWindow(DocPrint.Build(_form, data, CurrentPage), _form.Title) { Owner = this }.ShowDialog();
    }

    // ---------------- 저장/삭제 ----------------

    protected override bool IsNew => !_exists;

    protected override async Task SaveAsync()
    {
        var data = Collect();
        var meta = ContractService.ParseDoc(_master?.Str("doc"));
        await _svc.SaveDocumentAsync(_masterId, _form.Kind, data,
            (string?)meta["category"] ?? _master?.Str("contract_kind"), (string?)meta["ptType"] ?? _master?.Str("doc_type"), (string?)meta["docHint"] ?? _master?.Str("trade_type"));
        _exists = true;
    }

    protected override Task DeleteAsync() => _svc.DeleteDocumentAsync(_masterId, _form.Kind);
    protected override string DeleteConfirm => $"{_form.Title}을(를) 삭제하시겠습니까?";

    // ---------------- 메뉴 ----------------

    /// <summary>
    /// 부속문서 선택 메뉴(묶음별 하위 메뉴). 고르면 open(서식)을 부른다 — 계약서 작성창·계약 목록 공용.
    /// </summary>
    public static ContextMenu Menu(Func<DocForm, Task> open, IReadOnlyCollection<string>? savedKinds = null)
    {
        var menu = new ContextMenu();
        foreach (var g in ContractDocs.All.GroupBy(f => f.Group))
        {
            var items = g.Select(f =>
            {
                var mi = new MenuItem { Header = f.Title + (savedKinds?.Contains(f.Kind) == true ? "  ✔" : "") };
                mi.Click += async (_, _) => await open(f);
                return mi;
            }).ToList();
            if (items.Count == 1) { menu.Items.Add(items[0]); continue; }
            var parent = new MenuItem { Header = g.Key };
            foreach (var i in items) parent.Items.Add(i);
            menu.Items.Add(parent);
        }
        return menu;
    }
}

/// <summary>하나만 고르는 체크박스 묶음 — 다시 누르면 해제(기존 setR 토글). 값 = 선택지 Value 문자</summary>
public sealed class ToggleChoice : WrapPanel
{
    public ToggleChoice(Row row, string key, IReadOnlyList<DocOpt> options)
    {
        var boxes = new List<(CheckBox Box, DocOpt Opt)>();
        void Sync()
        {
            var v = row.Str(key) ?? "";
            foreach (var (b, o) in boxes) b.IsChecked = o.Value == v;
        }
        foreach (var o in options)
        {
            var cb = new CheckBox { Content = o.Label, Margin = new Thickness(0, 2, 14, 2) };
            cb.Click += (_, _) => { row[key] = cb.IsChecked == true ? o.Value : ""; Sync(); };
            boxes.Add((cb, o));
            Children.Add(cb);
        }
        Sync();
        void OnChanged(object? s, System.ComponentModel.PropertyChangedEventArgs e) => Sync();
        row.PropertyChanged += OnChanged;
        Unloaded += (_, _) => row.PropertyChanged -= OnChanged;
        Loaded += (_, _) => { row.PropertyChanged -= OnChanged; row.PropertyChanged += OnChanged; Sync(); };
    }
}

/// <summary>Row의 bool 값 ↔ CheckBox (null/문자는 false)</summary>
public sealed class TrueConverter : IValueConverter
{
    public static readonly TrueConverter Instance = new();
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) => value is true;
    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => value is true;
}

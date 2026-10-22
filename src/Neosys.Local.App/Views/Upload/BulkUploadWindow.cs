using System.Data;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Upload;

/// <summary>
/// 엑셀 일괄 업로드(물건/고객) — 기존 DataUploadPage. 엑셀에서 복사한 표를 그리드에 붙여넣고(Ctrl+V),
/// 열마다 항목을 고른 뒤 업로드하거나 임시저장한다. 그리드 첫 행은 '헤더행'(엑셀 머리글 자리)이라 업로드에서 뺀다.
/// 물건은 상단 공통 폼(물건유형·소재지·단지·물건명)을 모든 행에 적용한다(행 값이 우선).
/// </summary>
public sealed class BulkUploadWindow : Window
{
    private const int DefaultCols = 12;
    private const int DefaultRows = 100;

    private readonly BulkUploadService _svc = AppServices.Create((sp, s) => new BulkUploadService(sp, s));
    private readonly string _target;      // property | customer
    private readonly IReadOnlyList<UploadField> _fields;
    private readonly List<string?> _keys = new();
    private readonly DataTable _table = new();
    private readonly DataGrid _grid = new()
    {
        AutoGenerateColumns = false, CanUserAddRows = false, CanUserSortColumns = false, SelectionUnit = DataGridSelectionUnit.CellOrRowHeader,
        HeadersVisibility = DataGridHeadersVisibility.All, RowHeaderWidth = 36, EnableColumnVirtualization = true, EnableRowVirtualization = true,
    };
    private readonly UploadCommon _common = new();
    private readonly ComboBox _ptType = new() { Width = 150, DisplayMemberPath = nameof(Opt.Label), SelectedValuePath = nameof(Opt.Value) };
    private readonly TextBlock _addr = new() { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6, 0, 12, 0), Foreground = Brushes.SlateGray, Text = "(소재지 미선택)" };
    private readonly TextBox _ptName = new() { Width = 200 };
    private readonly DataGrid _staging = new() { AutoGenerateColumns = false, IsReadOnly = true, SelectionMode = DataGridSelectionMode.Extended };
    private readonly TextBlock _status = new() { VerticalAlignment = VerticalAlignment.Center, Foreground = Brushes.SlateGray, Margin = new Thickness(10, 0, 0, 0) };

    public bool Uploaded { get; private set; }

    public BulkUploadWindow(string target)
    {
        _target = target;
        _fields = target == "property" ? BulkUploadService.PropertyFields : BulkUploadService.CustomerFields;
        Title = target == "property" ? "물건 엑셀 일괄 업로드" : "고객 엑셀 일괄 업로드";
        Width = 1400;
        Height = 900;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Owner = Application.Current.MainWindow;
        FontSize = 12.5;

        var tabs = new TabControl { Margin = new Thickness(10) };
        tabs.Items.Add(new TabItem { Header = "업로드", Content = UploadTab() });
        tabs.Items.Add(new TabItem { Header = "임시저장", Content = StagingTab() });
        tabs.SelectionChanged += async (_, e) => { if (e.Source == tabs && tabs.SelectedIndex == 1) await LoadStagingAsync(); };
        Content = tabs;

        for (int c = 0; c < DefaultCols; c++) AddColumn();
        AddRows(DefaultRows + 1);
    }

    // ---------------- 업로드 탭 ----------------

    private FrameworkElement UploadTab()
    {
        var root = new DockPanel { Margin = new Thickness(4) };
        var top = new StackPanel();

        if (_target == "property")
        {
            var common = new WrapPanel { Margin = new Thickness(0, 0, 0, 6) };
            common.Children.Add(Label("물건유형"));
            _ptType.ItemsSource = Catalog.PropertyTypes;
            _ptType.SelectionChanged += (_, _) => _common.PtType = _ptType.SelectedValue as string;
            common.Children.Add(_ptType);
            var addr = new Button { Content = "소재지(·단지) 선택", Margin = new Thickness(12, 2, 2, 2) };
            addr.Click += (_, _) => PickRegion();
            common.Children.Add(addr);
            common.Children.Add(_addr);
            common.Children.Add(Label("물건명"));
            _ptName.TextChanged += (_, _) => _common.PtName = _ptName.Text;
            common.Children.Add(_ptName);
            top.Children.Add(new Border { Child = common, Background = (Brush)Application.Current.FindResource("PanelBack"), Padding = new Thickness(8, 4, 8, 4), Margin = new Thickness(0, 0, 0, 6) });
        }

        var bar = new WrapPanel { Margin = new Thickness(0, 0, 0, 6) };
        bar.Children.Add(Btn("열 추가", () => AddColumn()));
        bar.Children.Add(Btn("선택 열 삭제", RemoveColumn));
        bar.Children.Add(Btn($"행 {DefaultRows}개 추가", () => AddRows(DefaultRows)));
        bar.Children.Add(Btn("붙여넣기(Ctrl+V)", Paste));
        bar.Children.Add(Btn("모두 지우기", () => { if (Dialogs.Confirm("그리드 내용을 모두 지울까요?")) ClearAll(); }));
        bar.Children.Add(new TextBlock
        {
            Text = "열 머리의 목록에서 항목을 고르고, 엑셀에서 복사한 내용을 붙여넣으세요. 첫 행(헤더행)은 업로드하지 않습니다.",
            Foreground = Brushes.SlateGray, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 0, 0),
        });
        top.Children.Add(bar);
        DockPanel.SetDock(top, Dock.Top);
        root.Children.Add(top);

        var bottom = new DockPanel { Margin = new Thickness(0, 8, 0, 0) };
        var right = new StackPanel { Orientation = Orientation.Horizontal };
        right.Children.Add(Btn("임시저장", async () => await StageAsync()));
        var upload = Btn("업로드", async () => await UploadAsync());
        upload.Style = (Style)Application.Current.FindResource("PrimaryButton");
        right.Children.Add(upload);
        var close = Btn("닫기", Close);
        close.IsCancel = true;
        right.Children.Add(close);
        DockPanel.SetDock(right, Dock.Right);
        bottom.Children.Add(right);
        bottom.Children.Add(_status);
        DockPanel.SetDock(bottom, Dock.Bottom);
        root.Children.Add(bottom);

        _grid.ItemsSource = _table.DefaultView;
        _grid.LoadingRow += (_, e) =>
        {
            var i = e.Row.GetIndex();
            e.Row.Header = i == 0 ? "헤더" : i.ToString();
            e.Row.Background = i == 0 ? new SolidColorBrush(Color.FromRgb(0xF1, 0xF5, 0xF9)) : Brushes.White;
        };
        _grid.PreviewKeyDown += (_, e) =>
        {
            if (e.Key == Key.V && Keyboard.Modifiers == ModifierKeys.Control && !(_grid.CurrentCell.Column?.GetCellContent(_grid.CurrentItem) is TextBox)) { Paste(); e.Handled = true; }
            else if (e.Key == Key.Delete && Keyboard.Modifiers == ModifierKeys.None) { ClearSelectedCells(); e.Handled = true; }
        };
        root.Children.Add(_grid);
        return root;
    }

    private static TextBlock Label(string t) => new() { Text = t, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 6, 0) };

    private static Button Btn(string text, Action click)
    {
        var b = new Button { Content = text };
        b.Click += (_, _) => click();
        return b;
    }

    private void PickRegion()
    {
        Row? r;
        try { r = RegionPicker.Pick(withDanji: true, title: "소재지 선택"); }
        catch (Exception ex) { Dialogs.Error("지역 목록을 불러오지 못했습니다(서버 조회).\n" + ex.Message); return; }
        if (r is null) return;
        _common.Addr1 = r.Str("addr1");
        _common.Addr2 = r.Str("addr2");
        _common.Addr3 = r.Str("addr3");
        _common.BjdCode = r.Str("bjd_code");
        _common.DanjiCode = r.Str("danji_code");
        if (r.Str("danji_name") is { Length: > 0 } dn) { _ptName.Text = dn; _common.PtName = dn; }
        _addr.Text = string.Join(" ", new[] { _common.Addr1, _common.Addr2, _common.Addr3, r.Str("danji_name") }.Where(s => !string.IsNullOrEmpty(s)));
    }

    // ---------------- 그리드 ----------------

    private void AddColumn()
    {
        var idx = _keys.Count;
        _keys.Add(null);
        _table.Columns.Add($"c{idx}", typeof(string));
        var header = new ComboBox { Width = 150, ItemsSource = HeaderItems(), DisplayMemberPath = "Item2", SelectedValuePath = "Item1", SelectedIndex = 0, FontSize = 12 };
        header.SelectionChanged += (_, _) => _keys[idx] = header.SelectedValue as string is { Length: > 0 } k ? k : null;
        _grid.Columns.Add(new DataGridTextColumn
        {
            Header = header, Width = 160,
            Binding = new Binding($"[c{idx}]") { Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.LostFocus },
        });
    }

    private List<Tuple<string, string>> HeaderItems() =>
        new[] { Tuple.Create("", "(항목 선택)") }.Concat(_fields.Select(f => Tuple.Create(f.Key, $"{f.Group} · {f.Label}"))).ToList();

    private void RemoveColumn()
    {
        var col = _grid.CurrentCell.Column ?? _grid.SelectedCells.FirstOrDefault().Column;
        if (col is null || _grid.Columns.Count <= 1) { Dialogs.Info("삭제할 열의 칸을 먼저 선택하세요."); return; }
        var i = _grid.Columns.IndexOf(col);
        // 데이터 열 이름(cN)은 그대로 두고 화면 열과 항목 키만 뺀다(바인딩 유지)
        _grid.Columns.RemoveAt(i);
        _keys[KeyIndexOf(col)] = null;
        _removed.Add(KeyIndexOf(col));
    }

    private readonly HashSet<int> _removed = new();

    private static int KeyIndexOf(DataGridColumn col) =>
        col is DataGridTextColumn t && t.Binding is Binding b && int.TryParse(b.Path.Path.Trim('[', ']', 'c'), out var n) ? n : -1;

    private void AddRows(int n)
    {
        for (int i = 0; i < n; i++) _table.Rows.Add(_table.NewRow());
    }

    private void ClearAll()
    {
        _table.Rows.Clear();
        AddRows(DefaultRows + 1);
    }

    private void ClearSelectedCells()
    {
        foreach (var cell in _grid.SelectedCells)
            if (cell.Item is DataRowView rv && KeyIndexOf(cell.Column) is >= 0 and var k) rv.Row[$"c{k}"] = DBNull.Value;
    }

    /// <summary>현재 칸부터 클립보드 표를 채운다(행·열이 모자라면 늘린다)</summary>
    private void Paste()
    {
        if (!Clipboard.ContainsText()) { Toast.Show("복사한 내용이 없습니다. 엑셀에서 범위를 복사한 뒤 붙여넣으세요."); return; }
        var matrix = BulkUploadService.ParseClipboard(Clipboard.GetText());
        if (matrix.Count == 0) return;
        var visible = _grid.Columns.Select(KeyIndexOf).ToList();
        var startR = _grid.CurrentItem is DataRowView cur ? _table.Rows.IndexOf(cur.Row) : 0;
        var startC = _grid.CurrentCell.Column is { } cc ? _grid.Columns.IndexOf(cc) : 0;
        if (startR < 0) startR = 0;
        if (startC < 0) startC = 0;
        var needCols = startC + matrix.Max(r => r.Count);
        while (visible.Count < needCols) { AddColumn(); visible.Add(_keys.Count - 1); }
        var needRows = startR + matrix.Count;
        if (_table.Rows.Count < needRows) AddRows(needRows - _table.Rows.Count);
        for (int r = 0; r < matrix.Count; r++)
            for (int c = 0; c < matrix[r].Count; c++)
                _table.Rows[startR + r][$"c{visible[startC + c]}"] = matrix[r][c];
        _status.Text = $"{matrix.Count}행 × {matrix.Max(r => r.Count)}열을 붙여넣었습니다.";
    }

    private List<(int RowNo, Dictionary<string, string> Values)> CollectRows()
    {
        _grid.CommitEdit(DataGridEditingUnit.Row, true);
        var cols = Enumerable.Range(0, _keys.Count).Select(i => _removed.Contains(i) ? null : _keys[i]).ToList();
        var grid = _table.Rows.Cast<DataRow>().Select(r => (IReadOnlyList<string?>)cols.Select((_, i) => r[$"c{i}"] as string).ToList()).ToList();
        return BulkUploadService.Rows(cols, grid);
    }

    private bool CheckReady(List<(int RowNo, Dictionary<string, string> Values)> rows)
    {
        if (rows.Count == 0) { Dialogs.Info("업로드할 데이터가 없습니다. (첫 행 헤더는 제외됩니다)"); return false; }
        if (_target != "property") return true;
        if (_common.PtType is null && rows.Any(r => !r.Values.ContainsKey("ptType"))) { Dialogs.Info("상단에서 물건유형을 선택하세요."); return false; }
        if (_common.BjdCode is null) { Dialogs.Info("상단에서 소재지를 선택하세요(법정동이 있어야 물건이 저장됩니다)."); return false; }
        if (Catalog.ApartmentFormCodes.Contains(_common.PtType ?? "") && string.IsNullOrEmpty(_common.DanjiCode)) { Dialogs.Info("단지형 물건은 소재지 선택에서 단지를 골라야 합니다."); return false; }
        return true;
    }

    private async Task UploadAsync()
    {
        var rows = CollectRows();
        if (!CheckReady(rows) || !Dialogs.Confirm($"{rows.Count}건을 등록하시겠습니까?")) return;
        _status.Text = "등록 중…";
        var res = _target == "property" ? await _svc.UploadPropertiesAsync(rows, _common) : await _svc.UploadCustomersAsync(rows);
        Report(res);
        if (res.Success > 0) { Uploaded = true; ClearAll(); }
    }

    private async Task StageAsync()
    {
        var rows = CollectRows();
        if (!CheckReady(rows)) return;
        var n = await _svc.StageAsync(_target, rows.Select(r => r.Values), _target == "property" ? _common : null);
        _status.Text = $"{n}건 임시저장되었습니다. [임시저장] 탭에서 확정할 수 있습니다.";
        ClearAll();
    }

    private void Report(UploadResult res)
    {
        _status.Text = $"성공 {res.Success}건 · 실패 {res.Failed}건";
        if (res.Failed == 0) { Dialogs.Info($"{res.Success}건 등록되었습니다."); return; }
        var lines = res.Errors.Take(20).Select(e => $"{e.RowNo}행: {e.Message}");
        Dialogs.Warn($"성공 {res.Success}건 · 실패 {res.Failed}건\n\n" + string.Join("\n", lines) + (res.Failed > 20 ? "\n…" : ""));
    }

    // ---------------- 임시저장 탭 ----------------

    private FrameworkElement StagingTab()
    {
        var root = new DockPanel { Margin = new Thickness(4) };
        var bar = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 6) };
        bar.Children.Add(Btn("새로고침", async () => await LoadStagingAsync()));
        bar.Children.Add(Btn("선택 삭제", async () => await DeleteStagingAsync()));
        var commit = Btn("선택 확정(등록)", async () => await CommitAsync());
        commit.Style = (Style)Application.Current.FindResource("PrimaryButton");
        bar.Children.Add(commit);
        DockPanel.SetDock(bar, Dock.Top);
        root.Children.Add(bar);
        _staging.Columns.Add(new DataGridTextColumn { Header = "번호", Binding = new Binding("[staging_id]"), Width = 70 });
        _staging.Columns.Add(new DataGridTextColumn { Header = "내용", Binding = new Binding("[label]"), Width = new DataGridLength(1, DataGridLengthUnitType.Star) });
        _staging.Columns.Add(new DataGridTextColumn { Header = "임시저장일", Binding = new Binding("[reg_dt]"), Width = 160 });
        root.Children.Add(_staging);
        return root;
    }

    private async Task LoadStagingAsync() => _staging.ItemsSource = await _svc.StagingAsync(_target);

    private List<Row> SelectedStaging() => _staging.SelectedItems.OfType<Row>().ToList();

    private async Task DeleteStagingAsync()
    {
        var rows = SelectedStaging();
        if (rows.Count == 0) { Toast.Show("삭제할 임시저장 건을 선택하세요."); return; }
        if (!Dialogs.Confirm($"임시저장 {rows.Count}건을 삭제할까요?")) return;
        foreach (var r in rows) await _svc.DeleteStagingAsync(r.Long("staging_id")!.Value);
        await LoadStagingAsync();
    }

    private async Task CommitAsync()
    {
        var rows = SelectedStaging();
        if (rows.Count == 0) { Dialogs.Info("확정할 항목을 선택하세요."); return; }
        if (!Dialogs.Confirm($"{rows.Count}건을 등록하시겠습니까?")) return;
        var res = await _svc.CommitStagingAsync(rows);
        Report(res);
        if (res.Success > 0) Uploaded = true;
        await LoadStagingAsync();
    }
}

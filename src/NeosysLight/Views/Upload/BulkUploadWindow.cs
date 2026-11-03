using System.Data;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Markup;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;
using static Neosys.Local.App.Ui.Legacy;

namespace Neosys.Local.App.Views.Upload;

/// <summary>
/// 엑셀 일괄 업로드(물건/고객) — 기존 DataUploadPage(2026-10-28)와 같은 화면·크기(1200×760).
///  · 머리줄: '물건 엑셀 붙여넣기 업로드' + 임시저장 불러오기 · 임시저장 · 바로 등록 · 닫기
///  · 상단 공통 폼(물건): 물건유형 · 소재지(시/도·시/군/구·읍/면/동) · 물건명(단지형이면 단지 선택) — 모든 행에 적용(행 값이 우선)
///  · 안내 → 그리드 도구(＋ 열 추가 · ＋ 100/500/1000행 · 데이터 지우기 · 선택 항목 수) → 붙여넣기 그리드(첫 행 = 헤더, 업로드 안 됨)
/// 단지형 물건은 동/호를 단지 데이터로 맞추고 타입·면적·방·욕실수·해당층을 자동으로 채운다(BulkUploadService.ResolveDanjiAsync).
/// 임시저장은 그리드 전체가 1건 — [임시저장 불러오기]로 그리드에 다시 펼친 뒤 등록한다.
/// </summary>
public sealed class BulkUploadWindow : Window
{
    private const int DefaultCols = 12;
    private const int DefaultRows = 100;
    private const double ColW = 120;
    private const string HeaderFlag = "__h";   // 헤더행 표시용 숨은 열

    private static readonly Brush GridLine = B("#94A3B8");

    private readonly BulkUploadService _svc = AppServices.Create((sp, s) => new BulkUploadService(sp, s, new ServerDanjiSource(AppServices.Server)));
    private readonly string _target;      // property | customer
    private readonly IReadOnlyList<UploadField> _fields;
    private readonly List<string?> _keys = new();     // 데이터 열(cN)별 항목 키
    private readonly HashSet<int> _removed = new();
    private readonly DataTable _table = new();
    private readonly DataGrid _grid = new()
    {
        AutoGenerateColumns = false, CanUserAddRows = false, CanUserDeleteRows = false, CanUserSortColumns = false, CanUserReorderColumns = false,
        SelectionUnit = DataGridSelectionUnit.CellOrRowHeader, HeadersVisibility = DataGridHeadersVisibility.All, RowHeaderWidth = 48,
        EnableColumnVirtualization = true, EnableRowVirtualization = true, GridLinesVisibility = DataGridGridLinesVisibility.All,
        HorizontalGridLinesBrush = GridLine, VerticalGridLinesBrush = GridLine, BorderThickness = new Thickness(0), Background = Brushes.White,
        RowHeight = 29, FontSize = 14, FontWeight = FontWeights.Normal, Foreground = B("#111827"),
    };
    private readonly UploadCommon _common = new();
    private readonly ComboBox _ptType = Select(150), _sido = Select(120), _sigungu = Select(120), _eup = Select(120), _danji = Select(220);
    private readonly TextBox _ptName = new() { Width = 220, Height = 32, FontSize = 14, VerticalContentAlignment = VerticalAlignment.Center, Padding = new Thickness(6, 0, 6, 0) };
    private readonly ContentControl _nameHost = new() { VerticalAlignment = VerticalAlignment.Center };
    private readonly TextBlock _count = new() { FontSize = 14, FontWeight = FontWeights.Medium, Foreground = B("#64748B"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(2, 0, 0, 0) };
    private bool _restoring;

    public bool Uploaded { get; private set; }

    public BulkUploadWindow(string target) : this(target, owner: true) { }

    /// <summary>등록이 한 건이라도 성공하면(목록 새로고침용)</summary>
    public event Action? Succeeded;

    private static readonly Dictionary<string, BulkUploadWindow> OpenWindows = new();

    /// <summary>대상별 업로드 창을 하나만 연다(열려 있으면 앞으로). onSuccess = 등록 성공 시 목록 새로고침</summary>
    public static void ShowSingle(string target, Action onSuccess)
    {
        if (OpenWindows.TryGetValue(target, out var cur))
        {
            if (cur.WindowState == WindowState.Minimized) cur.WindowState = WindowState.Normal;
            cur.Activate();
            return;
        }
        var w = new BulkUploadWindow(target);
        w.Succeeded += onSuccess;
        w.Closed += (_, _) => OpenWindows.Remove(target);
        OpenWindows[target] = w;
        w.Show();
    }

    private BulkUploadWindow(string target, bool owner)
    {
        _target = target;
        _fields = target == "property" ? BulkUploadService.PropertyFields : BulkUploadService.CustomerFields;
        Title = target == "property" ? "물건 엑셀 업로드" : "고객 엑셀 업로드";
        Width = 1200;
        Height = 760;
        // 일반 창(모덜리스) — 업로드 창을 띄운 채 다른 메뉴 창도 쓸 수 있다(기존 Electron 별도 창과 같음)
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        _ = owner;
        Background = B("#F9FAFB");
        FontSize = 14;

        _table.Columns.Add(HeaderFlag, typeof(string));
        for (int c = 0; c < DefaultCols; c++) AddColumn();
        AddRows(DefaultRows + 1);

        var root = new DockPanel();
        var head = HeaderBar();
        DockPanel.SetDock(head, Dock.Top);
        root.Children.Add(head);
        root.Children.Add(Body());
        Content = root;
        if (target == "property") Loaded += async (_, _) => await LoadSidoAsync();
        UpdateCount();
    }

    // ---------------- 화면 ----------------

    private static ComboBox Select(double minWidth) => new()
    {
        Style = (Style)Application.Current.FindResource("FormSelect"), MinWidth = minWidth, Height = 32, FontSize = 14, FontWeight = FontWeights.Medium,
        DisplayMemberPath = nameof(Opt.Label), SelectedValuePath = nameof(Opt.Value), MaxDropDownHeight = 420, Margin = new Thickness(0, 0, 10, 0),
    };

    private static Button Btn(string text, Action click, string? fg = null, string? bg = null, string? border = null, double padX = 16, FontWeight? weight = null)
    {
        var b = new Button
        {
            Content = text, FontSize = 14, FontWeight = weight ?? FontWeights.SemiBold, Padding = new Thickness(padX, 7, padX, 7), Margin = new Thickness(8, 0, 0, 0),
            Foreground = B(fg ?? "#4F46E5"), Background = B(bg ?? "#FFFFFF"), BorderBrush = B(border ?? bg ?? "#4F46E5"),
        };
        b.Click += (_, _) => click();
        return b;
    }

    private static Button ToolBtn(string text, Action click)
    {
        var b = new Button
        {
            Content = text, FontSize = 14, FontWeight = FontWeights.Medium, Padding = new Thickness(12, 5, 12, 5), Margin = new Thickness(0, 0, 8, 0),
            Foreground = B("#374151"), Background = Brushes.White, BorderBrush = B("#CBD5E1"),
        };
        b.Click += (_, _) => click();
        return b;
    }

    private static TextBlock CommonLabel(string t) => new()
    {
        Text = t, FontSize = 14, FontWeight = FontWeights.Bold, Foreground = B("#3730A3"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 10, 0),
    };

    private FrameworkElement HeaderBar()
    {
        var bar = new DockPanel();
        var right = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        right.Children.Add(Btn("임시저장 불러오기", async () => await LoadStagingAsync()));
        right.Children.Add(Btn("임시저장", async () => await StageAsync()));
        right.Children.Add(Btn("바로 등록", async () => await UploadAsync(), fg: "#FFFFFF", bg: "#4F46E5", padX: 18, weight: FontWeights.Bold));
        var close = Btn("닫기", Close, fg: "#374151", border: "#CBD5E1", padX: 14, weight: FontWeights.Medium);
        close.IsCancel = true;
        right.Children.Add(close);
        DockPanel.SetDock(right, Dock.Right);
        bar.Children.Add(right);
        bar.Children.Add(new TextBlock
        {
            Text = $"{(_target == "property" ? "물건" : "고객")} 엑셀 붙여넣기 업로드", FontSize = 18, FontWeight = FontWeights.Bold, Foreground = B("#111827"), VerticalAlignment = VerticalAlignment.Center,
        });
        return new Border { Child = bar, Background = Brushes.White, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(18, 12, 18, 12) };
    }

    private FrameworkElement Body()
    {
        var body = new DockPanel { Margin = new Thickness(18, 16, 18, 16) };
        var top = new StackPanel();
        if (_target == "property") top.Children.Add(CommonForm());

        var guide = new TextBlock { FontSize = 14, FontWeight = FontWeights.Medium, Foreground = B("#334155"), Margin = new Thickness(0, 0, 0, 8), TextWrapping = TextWrapping.Wrap };
        guide.Inlines.Add(new System.Windows.Documents.Run((_target == "property" ? "① 상단 공통 폼 지정 → " : "") + "② 컬럼 헤더에서 항목 선택 → ③ 엑셀에서 복사 후 셀 클릭·붙여넣기(Ctrl+V) → ④ 저장하기"));
        guide.Inlines.Add(new System.Windows.Documents.Run("   ※ 0행(헤더)은 업로드되지 않습니다.") { Foreground = B("#DC2626"), FontWeight = FontWeights.SemiBold });
        top.Children.Add(guide);

        var tools = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
        tools.Children.Add(ToolBtn("＋ 열 추가", () => { AddColumn(); UpdateCount(); }));
        tools.Children.Add(ToolBtn("＋ 100행", () => { AddRows(100); UpdateCount(); }));
        tools.Children.Add(ToolBtn("＋ 500행", () => { AddRows(500); UpdateCount(); }));
        tools.Children.Add(ToolBtn("＋ 1000행", () => { AddRows(1000); UpdateCount(); }));
        tools.Children.Add(ToolBtn("데이터 지우기", ClearAll));
        tools.Children.Add(_count);
        top.Children.Add(tools);
        DockPanel.SetDock(top, Dock.Top);
        body.Children.Add(top);

        StyleGrid();
        body.Children.Add(new Border { Child = _grid, BorderBrush = B("#CBD5E1"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(6), Background = Brushes.White, Padding = new Thickness(1) });
        return body;
    }

    /// <summary>상단 공통 폼(인디고 연한 바탕) — 물건유형 · 소재지 3단 · 물건명/단지</summary>
    private FrameworkElement CommonForm()
    {
        var row = new WrapPanel { VerticalAlignment = VerticalAlignment.Center };
        row.Children.Add(CommonLabel("물건유형"));
        _ptType.ItemsSource = new[] { new Opt("", "물건유형 선택") }.Concat(Catalog.PropertyTypes).ToList();
        _ptType.SelectedIndex = 0;
        _ptType.FontWeight = FontWeights.SemiBold;   // 원본 물건유형 select 700(나머지 지역 select 600)
        _ptType.SelectionChanged += async (_, _) =>
        {
            _common.PtType = _ptType.SelectedValue as string is { Length: > 0 } v ? v : null;
            if (!_restoring) { _common.DanjiCode = null; await RefreshNameAsync(); }
        };
        row.Children.Add(_ptType);
        row.Children.Add(CommonLabel("소재지"));
        row.Children.Add(_sido);
        row.Children.Add(_sigungu);
        row.Children.Add(_eup);
        _sido.ItemsSource = Opts("시/도", Array.Empty<Row>(), _ => "");
        _sigungu.ItemsSource = Opts("시/군/구", Array.Empty<Row>(), _ => "");
        _eup.ItemsSource = Opts("읍/면/동", Array.Empty<Row>(), _ => "");
        _sido.SelectedIndex = _sigungu.SelectedIndex = _eup.SelectedIndex = 0;
        _sigungu.IsEnabled = _eup.IsEnabled = false;
        _sido.SelectionChanged += async (_, _) => { if (!_restoring) await OnSidoAsync(); };
        _sigungu.SelectionChanged += async (_, _) => { if (!_restoring) await OnSigunguAsync(); };
        _eup.SelectionChanged += async (_, _) => { if (!_restoring) await OnEupAsync(); };
        row.Children.Add(CommonLabel("물건명"));
        Placeholder.Set(_ptName, "물건명 직접 입력", 6);
        _ptName.TextChanged += (_, _) => { if (_nameHost.Content == _ptName) _common.PtName = _ptName.Text; };
        _danji.SelectionChanged += (_, _) =>
        {
            if (_restoring) return;
            var d = (_danji.SelectedItem as Opt)?.Value;
            _common.DanjiCode = string.IsNullOrEmpty(d) ? null : d;
            _common.PtName = _danjiRows.FirstOrDefault(x => x.Str("naverDanjiCode") == d)?.Str("buildingName");
        };
        row.Children.Add(_nameHost);
        _nameHost.Content = _ptName;
        return new Border
        {
            Child = row, Background = B("#EEF2FF"), BorderBrush = B("#C7D2FE"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8),
            Padding = new Thickness(14, 10, 14, 10), Margin = new Thickness(0, 0, 0, 12),
        };
    }

    private void StyleGrid()
    {
        _grid.ItemsSource = _table.DefaultView;
        _grid.ColumnHeaderStyle = new Style(typeof(DataGridColumnHeader))
        {
            Setters =
            {
                new Setter(BackgroundProperty, B("#EEF2F7")), new Setter(PaddingProperty, new Thickness(4, 5, 4, 5)),
                new Setter(BorderBrushProperty, GridLine), new Setter(BorderThicknessProperty, new Thickness(0, 0, 1, 1)),
                new Setter(HorizontalContentAlignmentProperty, HorizontalAlignment.Stretch),
            },
        };
        _grid.RowHeaderStyle = NormalRowHeader;
        _grid.CellStyle = new Style(typeof(DataGridCell))
        {
            Setters = { new Setter(BorderThicknessProperty, new Thickness(0)), new Setter(PaddingProperty, new Thickness(6, 0, 6, 0)) },
            Triggers =
            {
                new Trigger { Property = DataGridCell.IsSelectedProperty, Value = true, Setters = { new Setter(BackgroundProperty, B("#DBEAFE")), new Setter(ForegroundProperty, B("#111827")) } },
            },
        };
        _grid.LoadingRow += (_, e) =>
        {
            var i = e.Row.GetIndex();
            e.Row.Header = i == 0 ? "헤더" : i.ToString();
            e.Row.Background = i == 0 ? B("#FFFBEB") : Brushes.White;
            e.Row.HeaderStyle = i == 0 ? HeaderRowHeader : NormalRowHeader;
        };
        _grid.PreviewKeyDown += (_, e) =>
        {
            if (e.Key == Key.V && Keyboard.Modifiers == ModifierKeys.Control && Keyboard.FocusedElement is not TextBox) { Paste(); e.Handled = true; }
            else if (e.Key == Key.Delete && Keyboard.Modifiers == ModifierKeys.None && Keyboard.FocusedElement is not TextBox) { ClearSelectedCells(); e.Handled = true; }
        };
        _grid.CellEditEnding += (_, _) => Dispatcher.BeginInvoke(UpdateCount);
        _grid.Loaded += (_, _) =>
        {
            // 왼쪽 위 모서리(전체선택 버튼) → 기존 cornerTh '#'
            if (FindChild<Button>(_grid) is { } corner)
                corner.Template = (ControlTemplate)XamlReader.Parse(
                    "<ControlTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='Button'>" +
                    "<Border Background='#E2E8F0' BorderBrush='#94A3B8' BorderThickness='0,0,1,1'><TextBlock Text='#' FontSize='13' FontWeight='SemiBold' Foreground='#475569' HorizontalAlignment='Center' VerticalAlignment='Center'/></Border></ControlTemplate>");
        };
    }

    private static T? FindChild<T>(DependencyObject d) where T : DependencyObject
    {
        for (int i = 0; i < VisualTreeHelper.GetChildrenCount(d); i++)
        {
            var c = VisualTreeHelper.GetChild(d, i);
            if (c is T t) return t;
            if (FindChild<T>(c) is { } found) return found;
        }
        return null;
    }

    // 행 번호 칸(기존 idxTd 48px · 가운데) — 기본 틀(선택 표시·크기조절 손잡이) 대신 단색 칸
    private static Style RowHeader(string bg, string fg, FontWeight weight) => (Style)XamlReader.Parse(
        "<Style xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='DataGridRowHeader'>" +
        $"<Setter Property='Template'><Setter.Value><ControlTemplate TargetType='DataGridRowHeader'>" +
        $"<Border Width='48' Background='{bg}' BorderBrush='#94A3B8' BorderThickness='0,0,1,1'>" +
        $"<ContentPresenter HorizontalAlignment='Center' VerticalAlignment='Center' TextElement.FontSize='13' TextElement.FontWeight='{weight}' TextElement.Foreground='{fg}'/>" +
        "</Border></ControlTemplate></Setter.Value></Setter></Style>");

    private static readonly Style HeaderRowHeader = RowHeader("#FEF3C7", "#92400E", FontWeights.Bold);
    private static readonly Style NormalRowHeader = RowHeader("#F1F5F9", "#64748B", FontWeights.Medium);

    // 헤더행 칸: 비어 있으면 '헤더(업로드 안 됨)' 안내, 값은 진한 갈색 굵게(기존 headerCellTd)
    private static Style CellStyleFor(string col) => (Style)XamlReader.Parse(
        "<Style xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='DataGridCell'>" +
        "<Setter Property='BorderThickness' Value='0'/>" +
        "<Setter Property='Template'><Setter.Value><ControlTemplate TargetType='DataGridCell'>" +
        "<Border Background='{TemplateBinding Background}' Padding='6,0,6,0'><Grid>" +
        "<TextBlock x:Name='ph' xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml' Text='헤더(업로드 안 됨)' Foreground='#A8A29E' FontSize='14' VerticalAlignment='Center' Visibility='Collapsed'/>" +
        "<ContentPresenter VerticalAlignment='Center'/></Grid></Border>" +
        "<ControlTemplate.Triggers>" +
        $"<MultiDataTrigger><MultiDataTrigger.Conditions><Condition Binding='{{Binding [{HeaderFlag}]}}' Value='1'/><Condition Binding='{{Binding [{col}]}}' Value=''/></MultiDataTrigger.Conditions>" +
        "<Setter TargetName='ph' Property='Visibility' Value='Visible'/></MultiDataTrigger>" +
        "<Trigger Property='IsSelected' Value='True'><Setter Property='Background' Value='#DBEAFE'/></Trigger>" +
        "</ControlTemplate.Triggers></ControlTemplate></Setter.Value></Setter></Style>");

    private static readonly Style CellText = (Style)XamlReader.Parse(
        "<Style xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='TextBlock'>" +
        "<Setter Property='TextTrimming' Value='CharacterEllipsis'/>" +
        $"<Style.Triggers><DataTrigger Binding='{{Binding [{HeaderFlag}]}}' Value='1'><Setter Property='FontWeight' Value='SemiBold'/><Setter Property='Foreground' Value='#92400E'/></DataTrigger></Style.Triggers></Style>");

    // ---------------- 소재지·단지(서버 공용 데이터) ----------------

    private List<Row> _sidoRows = new(), _sigunguRows = new(), _eupRows = new(), _danjiRows = new();

    private static List<Opt> Opts(string empty, IEnumerable<Row> rows, Func<Row, string> label, string key = "bjdCode") =>
        new[] { new Opt("", empty) }.Concat(rows.Select(r => new Opt(r.Str(key) ?? "", label(r)))).ToList();

    private async Task LoadSidoAsync()
    {
        try { _sidoRows = await AppServices.Server.GetBjdListAsync(1); }
        catch { _sidoRows = new(); Toast.Error("시/도 목록을 불러오지 못했습니다(서버 조회)."); }
        _restoring = true;
        _sido.ItemsSource = Opts("시/도", _sidoRows, r => r.Str("bjdName") ?? "");
        _sido.SelectedValue = _common.SidoCode ?? "";
        _sigungu.ItemsSource = Opts("시/군/구", Array.Empty<Row>(), _ => "");
        _sigungu.SelectedIndex = 0;
        _eup.ItemsSource = Opts("읍/면/동", Array.Empty<Row>(), _ => "");
        _eup.SelectedIndex = 0;
        _restoring = false;
        await RefreshNameAsync();
    }

    private static string? Code(ComboBox cb) => cb.SelectedValue as string is { Length: > 0 } v ? v : null;

    private async Task OnSidoAsync()
    {
        _common.SidoCode = Code(_sido);
        _common.Addr1 = _sidoRows.FirstOrDefault(r => r.Str("bjdCode") == _common.SidoCode)?.Str("bjdName");
        _common.SigunguCode = _common.BjdCode = _common.Addr2 = _common.Addr3 = _common.DanjiCode = null;
        _sigunguRows = _common.SidoCode is null ? new() : await Load(() => AppServices.Server.GetBjdListAsync(2, _common.SidoCode));
        _restoring = true;
        _sigungu.ItemsSource = Opts("시/군/구", _sigunguRows, SigunguName);
        _sigungu.SelectedIndex = 0;
        _sigungu.IsEnabled = _common.SidoCode is not null;
        _eup.ItemsSource = Opts("읍/면/동", Array.Empty<Row>(), _ => "");
        _eup.SelectedIndex = 0;
        _eup.IsEnabled = false;
        _restoring = false;
        await RefreshNameAsync();
    }

    private async Task OnSigunguAsync()
    {
        _common.SigunguCode = Code(_sigungu);
        _common.Addr2 = _sigunguRows.FirstOrDefault(r => r.Str("bjdCode") == _common.SigunguCode) is { } sg ? SigunguName(sg) : null;
        _common.BjdCode = _common.Addr3 = _common.DanjiCode = null;
        _eupRows = _common.SigunguCode is null ? new() : await Load(() => AppServices.Server.GetBjdListAsync(4, _common.SigunguCode));
        _restoring = true;
        _eup.ItemsSource = Opts("읍/면/동", _eupRows, r => r.Str("bjdName") ?? "");
        _eup.SelectedIndex = 0;
        _eup.IsEnabled = _common.SigunguCode is not null;
        _restoring = false;
        await RefreshNameAsync();
    }

    private async Task OnEupAsync()
    {
        _common.BjdCode = Code(_eup);
        _common.Addr3 = _eupRows.FirstOrDefault(r => r.Str("bjdCode") == _common.BjdCode)?.Str("bjdName");
        _common.DanjiCode = null;
        await RefreshNameAsync();
    }

    private static string SigunguName(Row r) => r.Str("sigunguName") is { Length: > 0 } s ? s : r.Str("bjdName") ?? "";

    private static async Task<List<Row>> Load(Func<Task<List<Row>>> load)
    {
        try { return await load(); }
        catch { Toast.Error("지역 목록을 불러오지 못했습니다(서버 조회)."); return new(); }
    }

    /// <summary>물건명 칸 — 단지형이면 읍/면/동의 단지 목록(선택 시 단지명이 물건명), 아니면 직접 입력</summary>
    private async Task RefreshNameAsync()
    {
        var danjiType = Catalog.ApartmentRelatedCodes.Contains(_common.PtType ?? "");
        if (!danjiType)
        {
            _nameHost.Content = _ptName;
            _common.DanjiCode = null;
            _common.PtName = _ptName.Text;
            return;
        }
        _nameHost.Content = _danji;
        _danjiRows = _common.BjdCode is null ? new() : await Load(() => AppServices.Server.GetDanjiListAsync(_common.BjdCode));
        _restoring = true;
        _danji.ItemsSource = Opts(_common.BjdCode is null ? "읍/면/동 먼저 선택" : "단지 선택", _danjiRows,
            r => r.Str("buildingName") + (r.Str("addressBunji") is { Length: > 0 } b ? $" ({b})" : ""), "naverDanjiCode");
        // 원본 화면: 유형·읍면동이 바뀌어 단지 목록을 다시 불러오면 첫 번째 단지가 채워진 채로 보인다 → 고른 단지가 목록에 없으면 첫 단지
        if (_common.DanjiCode is null || !_danjiRows.Any(x => x.Str("naverDanjiCode") == _common.DanjiCode))
            _common.DanjiCode = _danjiRows.FirstOrDefault()?.Str("naverDanjiCode");
        _danji.SelectedValue = _common.DanjiCode ?? "";
        if (_danji.SelectedIndex < 0) { _danji.SelectedIndex = 0; _common.DanjiCode = null; }
        _danji.IsEnabled = _common.BjdCode is not null;
        _restoring = false;
        _common.PtName = _danjiRows.FirstOrDefault(x => x.Str("naverDanjiCode") == _common.DanjiCode)?.Str("buildingName") ?? (_common.DanjiCode is null ? null : _common.PtName);
    }

    // ---------------- 그리드 ----------------

    private void AddColumn(string? key = null)
    {
        var idx = _keys.Count;
        _keys.Add(key);
        var name = $"c{idx}";
        _table.Columns.Add(new DataColumn(name, typeof(string)) { DefaultValue = "" });
        foreach (DataRow r in _table.Rows) r[name] = "";
        var select = new FieldSelect(_fields, key);
        var col = new DataGridTextColumn
        {
            Width = ColW, CellStyle = CellStyleFor(name), ElementStyle = CellText,
            Binding = new Binding($"[{name}]") { Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.LostFocus },
        };
        var remove = new Button
        {
            Content = "✕", Foreground = B("#DC2626"), Background = Brushes.Transparent, BorderThickness = new Thickness(0), FontWeight = FontWeights.SemiBold,
            Padding = new Thickness(2, 0, 2, 0), Margin = new Thickness(4, 0, 0, 0), MinHeight = 0, ToolTip = "열 삭제", VerticalAlignment = VerticalAlignment.Center,
        };
        remove.Click += (_, _) => RemoveColumn(col);
        var head = new DockPanel();
        DockPanel.SetDock(remove, Dock.Right);
        head.Children.Add(remove);
        head.Children.Add(select);
        select.Changed += k => { _keys[idx] = k; UpdateCount(); };
        col.Header = head;
        _grid.Columns.Add(col);
    }

    private void RemoveColumn(DataGridColumn col)
    {
        if (_grid.Columns.Count <= 1) return;
        var k = KeyIndexOf(col);
        // 데이터 열 이름(cN)은 그대로 두고 화면 열과 항목 키만 뺀다(바인딩 유지)
        _grid.Columns.Remove(col);
        if (k >= 0) { _keys[k] = null; _removed.Add(k); }
        UpdateCount();
    }

    private static int KeyIndexOf(DataGridColumn col) =>
        col is DataGridTextColumn t && t.Binding is Binding b && int.TryParse(b.Path.Path.Trim('[', ']', 'c'), out var n) ? n : -1;

    private void AddRows(int n)
    {
        for (int i = 0; i < n; i++)
        {
            var r = _table.NewRow();
            r[HeaderFlag] = _table.Rows.Count == 0 ? "1" : "";
            _table.Rows.Add(r);
        }
    }

    private void ClearAll()
    {
        _table.Rows.Clear();
        AddRows(DefaultRows + 1);
        UpdateCount();
    }

    private void UpdateCount()
    {
        var visible = _grid.Columns.Select(KeyIndexOf).Where(i => i >= 0).ToList();
        var assigned = visible.Count(i => !string.IsNullOrEmpty(_keys[i]));
        _count.Text = $"선택된 항목 {assigned}개 · {visible.Count}열 · 데이터 {_table.Rows.Count - 1}행";
    }

    /// <summary>그리드를 주어진 항목 열과 행으로 다시 만든다(임시저장 불러오기)</summary>
    private void ResetGrid(IReadOnlyList<string> columns, IReadOnlyList<Dictionary<string, string>> rows)
    {
        _grid.ItemsSource = null;
        _grid.Columns.Clear();
        _table.Rows.Clear();
        _table.Columns.Clear();
        _table.Columns.Add(HeaderFlag, typeof(string));
        _keys.Clear();
        _removed.Clear();
        if (columns.Count == 0) for (int c = 0; c < DefaultCols; c++) AddColumn();
        else foreach (var k in columns) AddColumn(k);
        AddRows(Math.Max(rows.Count, DefaultRows) + 1);
        for (int r = 0; r < rows.Count; r++)
            for (int c = 0; c < columns.Count; c++)
                if (rows[r].TryGetValue(columns[c], out var v)) _table.Rows[r + 1][$"c{c}"] = v;   // 0행 = 헤더행
        _grid.ItemsSource = _table.DefaultView;
        UpdateCount();
    }

    private void ClearSelectedCells()
    {
        foreach (var cell in _grid.SelectedCells)
            if (cell.Item is DataRowView rv && KeyIndexOf(cell.Column) is >= 0 and var k) rv.Row[$"c{k}"] = "";
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
        UpdateCount();
    }

    private List<(int RowNo, Dictionary<string, string> Values)> CollectRows()
    {
        _grid.CommitEdit(DataGridEditingUnit.Row, true);
        var cols = Enumerable.Range(0, _keys.Count).Select(i => _removed.Contains(i) ? null : _keys[i]).ToList();
        var grid = _table.Rows.Cast<DataRow>().Select(r => (IReadOnlyList<string?>)cols.Select((_, i) => r[$"c{i}"] as string).ToList()).ToList();
        return BulkUploadService.Rows(cols, grid);
    }

    private bool CheckReady(List<(int RowNo, Dictionary<string, string> Values)> rows, string emptyMessage)
    {
        if (rows.Count == 0) { Toast.Error(emptyMessage); return false; }
        if (_target != "property") return true;
        if (_common.PtType is null && rows.Any(r => !r.Values.ContainsKey("ptType"))) { Toast.Error("상단에서 물건유형을 선택하세요."); return false; }
        if (_common.BjdCode is null) { Toast.Error("상단에서 소재지(읍/면/동)를 선택하세요."); return false; }
        if (Catalog.ApartmentRelatedCodes.Contains(_common.PtType ?? "") && string.IsNullOrEmpty(_common.DanjiCode)) { Toast.Error("단지형 물건은 상단에서 단지를 선택해야 동/호를 조회할 수 있습니다."); return false; }
        return true;
    }

    private async Task UploadAsync()
    {
        var rows = CollectRows();
        if (!CheckReady(rows, "업로드할 데이터가 없습니다. (0행 헤더는 제외됩니다)")) return;
        Cursor = Cursors.Wait;
        UploadResult res;
        try { res = _target == "property" ? await _svc.UploadPropertiesAsync(rows, _common) : await _svc.UploadCustomersAsync(rows); }
        finally { Cursor = null; }
        if (res.Success > 0) { Uploaded = true; Succeeded?.Invoke(); }
        if (res.Failed == 0) Toast.Success($"업로드 완료 — {res.Success}건 등록되었습니다.");
        else
        {
            var lines = res.Errors.Take(5).Select(e => $"{e.RowNo}행: {e.Message}");
            Dialogs.Warn($"성공 {res.Success}건 · 실패 {res.Failed}건\n" + string.Join("\n", lines) + (res.Failed > 5 ? "\n…" : ""));
        }
        // 등록된 행은 그리드에서 비운다(다시 눌러 중복 등록되지 않게) — 실패한 행은 고쳐서 다시 올릴 수 있게 남긴다
        var failed = res.Errors.Select(e => e.RowNo).ToHashSet();
        foreach (var (no, _) in rows)
            if (!failed.Contains(no))
                foreach (var k in Enumerable.Range(0, _keys.Count)) _table.Rows[no][$"c{k}"] = "";
        UpdateCount();
    }

    private async Task StageAsync()
    {
        var rows = CollectRows();
        if (!CheckReady(rows, "임시저장할 데이터가 없습니다. (0행 헤더는 제외됩니다)")) return;
        var n = await _svc.StageAsync(_target, rows.Select(r => r.Values), _target == "property" ? _common : null);
        Toast.Success($"{n}건을 1건으로 임시저장했습니다. [임시저장 불러오기]에서 불러올 수 있습니다.");
        ClearAll();
    }

    // ---------------- 임시저장 불러오기 ----------------

    /// <summary>임시저장 불러오기(기존 모달 720폭) — 체크한 임시저장의 모든 행을 그리드로 불러온다. 불러온 뒤 확인하고 [바로 등록]</summary>
    private async Task LoadStagingAsync()
    {
        var list = await _svc.StagingAsync(_target);
        var checks = new HashSet<long>();
        var w = new Window
        {
            Title = "임시저장 불러오기", Width = 720, Height = 560, Owner = this, WindowStartupLocation = WindowStartupLocation.CenterOwner,
            FontSize = 14, Background = Brushes.White, ResizeMode = ResizeMode.NoResize,
        };
        var title = new TextBlock { FontSize = 16, FontWeight = FontWeights.Bold, Foreground = B("#111827"), VerticalAlignment = VerticalAlignment.Center };
        var loadBtn = Btn("", () => { }, fg: "#FFFFFF", bg: "#4F46E5", padX: 24, weight: FontWeights.Bold);
        var table = new StackPanel();
        void Paint()
        {
            title.Inlines.Clear();
            title.Inlines.Add(new System.Windows.Documents.Run("임시저장 불러오기 "));
            title.Inlines.Add(new System.Windows.Documents.Run($"({(_target == "property" ? "물건" : "고객")}) · 선택 {checks.Count}건") { FontSize = 13, FontWeight = FontWeights.Medium, Foreground = B("#64748B") });
            loadBtn.Content = $"선택 {checks.Count}건 불러오기";
            loadBtn.IsEnabled = checks.Count > 0;
            table.Children.Clear();
            if (list.Count == 0)
            {
                table.Children.Add(new TextBlock { Text = "임시저장된 항목이 없습니다. [임시저장] 버튼으로 현재 내용을 보관할 수 있습니다.", Foreground = B("#94A3B8"), FontWeight = FontWeights.Medium, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(40), TextWrapping = TextWrapping.Wrap });
                return;
            }
            var all = new CheckBox { IsChecked = checks.Count == list.Count, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
            all.Click += (_, _) => { checks.Clear(); if (all.IsChecked == true) foreach (var s in list) checks.Add(s.Long("staging_id")!.Value); Paint(); };
            table.Children.Add(StagingRow(true, all, "구분", "제목", "건수", "임시저장일", null, false));
            foreach (var s in list)
            {
                var id = s.Long("staging_id")!.Value;
                var on = checks.Contains(id);
                var cb = new CheckBox { IsChecked = on, IsHitTestVisible = false, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
                var del = new Button { Content = "삭제", Foreground = B("#DC2626"), BorderBrush = B("#FCA5A5"), Background = Brushes.White, FontWeight = FontWeights.SemiBold, Padding = new Thickness(10, 3, 10, 3), MinHeight = 0 };
                del.Click += async (_, e) =>
                {
                    e.Handled = true;
                    await _svc.DeleteStagingAsync(id);
                    checks.Remove(id);
                    list = await _svc.StagingAsync(_target);
                    Toast.Success("삭제되었습니다.");
                    Paint();
                };
                var row = StagingRow(false, cb, s.Str("target") == "customer" ? "고객" : "물건", s.Str("label") ?? "(제목 없음)", $"{s.Long("count") ?? 0}건",
                    (s.Str("reg_dt") ?? "").Replace('T', ' ') is { Length: > 16 } d ? d[..16] : s.Str("reg_dt") ?? "", del, on);
                row.MouseLeftButtonUp += (_, _) => { if (!checks.Remove(id)) checks.Add(id); Paint(); };
                table.Children.Add(row);
            }
        }
        async Task Reload() { list = await _svc.StagingAsync(_target); Paint(); }

        var head = new DockPanel();
        var refresh = ToolBtn("새로고침", async () => await Reload());
        refresh.Margin = new Thickness(0);
        DockPanel.SetDock(refresh, Dock.Right);
        head.Children.Add(refresh);
        head.Children.Add(title);
        var foot = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
        var close = Btn("닫기", w.Close, fg: "#334155", border: "#CBD5E1", padX: 18, weight: FontWeights.Medium);
        close.IsCancel = true;
        foot.Children.Add(close);
        loadBtn.Click += (_, _) =>
        {
            var sel = list.Where(s => checks.Contains(s.Long("staging_id")!.Value)).ToList();
            if (sel.Count == 0) { Toast.Error("불러올 항목을 선택하세요."); return; }
            var (cols, rows, common) = _svc.LoadStaging(_target, sel);
            if (rows.Count == 0) { Toast.Error("불러올 데이터가 없습니다."); return; }
            ResetGrid(cols, rows);
            if (common is not null && _target == "property") _ = RestoreCommonAsync(common);
            w.Close();
            Toast.Success($"{rows.Count}건을 그리드에 불러왔습니다. 확인 후 [바로 등록]하세요.");
        };
        foot.Children.Add(loadBtn);

        var root = new DockPanel();
        var headBox = new Border { Child = head, Padding = new Thickness(18, 14, 18, 14), BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1) };
        DockPanel.SetDock(headBox, Dock.Top);
        root.Children.Add(headBox);
        var footBox = new Border { Child = foot, Padding = new Thickness(18, 12, 18, 12), BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 0), Background = B("#F8FAFC") };
        DockPanel.SetDock(footBox, Dock.Bottom);
        root.Children.Add(footBox);
        root.Children.Add(new ScrollViewer
        {
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Padding = new Thickness(18, 12, 18, 12),
            Content = new Border { Child = table, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1), VerticalAlignment = VerticalAlignment.Top },
        });
        w.Content = root;
        Paint();
        w.ShowDialog();
    }

    /// <summary>임시저장 목록 한 줄(기존 stTh/stTd: 14px, 머리 #f8fafc 굵게 · 선택 줄 #eef2ff)</summary>
    private static Grid StagingRow(bool header, UIElement check, string target, string label, string count, string date, UIElement? del, bool on)
    {
        var g = new Grid { Background = header ? B("#F8FAFC") : on ? B("#EEF2FF") : Brushes.White, Cursor = header ? null : Cursors.Hand, MinHeight = 38 };
        foreach (var w in new[] { 40.0, 60, -1, 70, 140, 70 })
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = w < 0 ? new GridLength(1, GridUnitType.Star) : new GridLength(w) });
        var line = new Border { BorderBrush = B(header ? "#CBD5E1" : "#EEF2F7"), BorderThickness = new Thickness(0, 0, 0, 1) };
        Grid.SetColumnSpan(line, 6);
        g.Children.Add(line);
        void Cell(int c, UIElement e) { Grid.SetColumn(e, c); g.Children.Add(e); }
        TextBlock T(string t, bool left = false, string color = "#111827") => new()
        {
            Text = t, FontSize = 14, FontWeight = header ? FontWeights.Bold : FontWeights.Medium, Foreground = B(color),
            HorizontalAlignment = left ? HorizontalAlignment.Left : HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(10, 0, 10, 0),
            TextTrimming = TextTrimming.CharacterEllipsis,
        };
        Cell(0, check);
        Cell(1, T(target));
        Cell(2, T(label, left: true));
        Cell(3, header ? T(count) : T(count, color: "#4F46E5"));
        Cell(4, T(date));
        Cell(5, del ?? T("삭제"));
        return g;
    }

#if DEBUG
    /// <summary>화면 확인용 — 유형·시도·시군구·읍면동을 사람이 고르듯 하나씩 고른다(각 선택 뒤 서버 조회를 기다림). 마지막이 "open"이면 첫 열 항목 목록을 연다</summary>
    internal async Task DevPickAsync(string[] v)
    {
        var picks = v.Where(x => x is not ("open" or "danji")).ToArray();
        // "type-last" 가 있으면 소재지를 먼저 고르고 유형을 마지막에 바꾼다
        var combos = v.Contains("type-last") ? new[] { _sido, _sigungu, _eup, _ptType, _danji } : new[] { _ptType, _sido, _sigungu, _eup, _danji };
        picks = picks.Where(x => x != "type-last").ToArray();
        for (int i = 0; i < picks.Length && i < combos.Length; i++)
        {
            combos[i].SelectedValue = picks[i];
            await Task.Delay(2500);
        }
        if (v.Contains("danji")) { _danji.IsDropDownOpen = true; await Task.Delay(800); }
        if (v.Contains("open") && _grid.Columns.FirstOrDefault()?.Header is DockPanel dp && dp.Children.OfType<FieldSelect>().FirstOrDefault() is { } fs)
        {
            fs.RaiseEvent(new MouseButtonEventArgs(Mouse.PrimaryDevice, 0, MouseButton.Left) { RoutedEvent = PreviewMouseLeftButtonDownEvent });
            await Task.Delay(800);
        }
    }
#endif

    /// <summary>상단 공통 폼(유형·소재지·단지·물건명) 복원 — 목록을 다시 불러와 선택값을 맞춘다</summary>
    private async Task RestoreCommonAsync(UploadCommon c)
    {
        _restoring = true;
        _common.PtType = c.PtType;
        _ptType.SelectedValue = c.PtType ?? "";
        _common.SidoCode = c.SidoCode;
        _common.SigunguCode = c.SigunguCode;
        _common.BjdCode = c.BjdCode;
        _common.Addr1 = c.Addr1;
        _common.Addr2 = c.Addr2;
        _common.Addr3 = c.Addr3;
        _common.DanjiCode = c.DanjiCode;
        _common.PtName = c.PtName;
        _ptName.Text = Catalog.ApartmentRelatedCodes.Contains(c.PtType ?? "") ? "" : c.PtName ?? "";
        _sido.SelectedValue = c.SidoCode ?? "";
        _restoring = false;
        _sigunguRows = c.SidoCode is null ? new() : await Load(() => AppServices.Server.GetBjdListAsync(2, c.SidoCode));
        _eupRows = c.SigunguCode is null ? new() : await Load(() => AppServices.Server.GetBjdListAsync(4, c.SigunguCode));
        _restoring = true;
        _sigungu.ItemsSource = Opts("시/군/구", _sigunguRows, SigunguName);
        _sigungu.SelectedValue = c.SigunguCode ?? "";
        _sigungu.IsEnabled = c.SidoCode is not null;
        _eup.ItemsSource = Opts("읍/면/동", _eupRows, r => r.Str("bjdName") ?? "");
        _eup.SelectedValue = c.BjdCode ?? "";
        _eup.IsEnabled = c.SigunguCode is not null;
        _restoring = false;
        await RefreshNameAsync();
    }

#if DEBUG
    /// <summary>화면 캡처용(--snapshot upload) — 견본 열·행을 채운 창(서버 호출 없이 공통 폼은 비움). Owner 없이 띄운다</summary>
    internal static BulkUploadWindow Preview(string target, bool empty = false)
    {
        var w = new BulkUploadWindow(target, owner: false);
        if (target == "property" && !empty)
        {
            var cols = new[] { "dong", "ho", "saleAmt", "protAmt", "monAmt", "premiumLayAmt", "bathCnt", "owner1Name", "owner1Phone", "consultContent", "regDt" };
            var rows = new List<Dictionary<string, string>>
            {
                new() { ["dong"] = "101동", ["ho"] = "1203호", ["saleAmt"] = "250,000", ["owner1Name"] = "박소유", ["owner1Phone"] = "01099990000", ["consultContent"] = "급매 희망" },
                new() { ["dong"] = "102", ["ho"] = "501", ["protAmt"] = "5,000", ["monAmt"] = "120", ["regDt"] = "2023.05.01" },
                new() { ["dong"] = "103", ["ho"] = "804", ["saleAmt"] = "180,000", ["bathCnt"] = "2" },
            };
            w.ResetGrid(cols, rows);
            w._ptType.SelectedValue = "SYCA101";
        }
        return w;
    }
#endif
}

/// <summary>
/// 항목 선택(기존 FieldSelect) — 누르면 검색창이 달린 그룹별 목록이 열린다. 글자 14px·검정, 지정되면 연한 인디고 바탕.
/// </summary>
public sealed class FieldSelect : Border
{
    private readonly IReadOnlyList<UploadField> _fields;
    private readonly TextBlock _label = new() { FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = B("#111827"), TextTrimming = TextTrimming.CharacterEllipsis, VerticalAlignment = VerticalAlignment.Center };
    private readonly TextBlock _arrow = new() { Text = "▾", FontSize = 11, Foreground = B("#64748B"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0, 0, 0) };
    private readonly Popup _popup = new() { Placement = PlacementMode.Bottom, StaysOpen = false, AllowsTransparency = true, VerticalOffset = 2 };
    public string? Value { get; private set; }
    public event Action<string?>? Changed;

    public FieldSelect(IReadOnlyList<UploadField> fields, string? value)
    {
        _fields = fields;
        Value = value;
        BorderBrush = B("#C7D2FE");
        BorderThickness = new Thickness(1);
        CornerRadius = new CornerRadius(4);
        Padding = new Thickness(7, 4, 7, 4);
        Cursor = Cursors.Hand;
        var dp = new DockPanel();
        DockPanel.SetDock(_arrow, Dock.Right);
        dp.Children.Add(_arrow);
        dp.Children.Add(_label);
        Child = dp;
        _popup.PlacementTarget = this;
        // 표 머리글(DataGridColumnHeader)이 마우스 누름을 잡아(정렬·크기조절) 클릭이 오지 않으므로 Preview 단계에서 처리
        PreviewMouseLeftButtonDown += (_, e) =>
        {
            e.Handled = true;
            if (_popup.IsOpen) { _popup.IsOpen = false; return; }
            Dispatcher.BeginInvoke(Open, System.Windows.Threading.DispatcherPriority.Input);
        };
        Paint();
    }

    private string LabelOf(string? key) => _fields.FirstOrDefault(f => f.Key == key)?.Label ?? "";

    private void Paint()
    {
        var label = LabelOf(Value);
        _label.Text = label.Length > 0 ? label : "항목 선택";
        ToolTip = label.Length > 0 ? label : "항목 선택";
        Background = string.IsNullOrEmpty(Value) ? Brushes.White : B("#EEF2FF");
    }

    private void Open()
    {
        var search = new TextBox { FontSize = 14, FontWeight = FontWeights.Medium, Height = 36, Padding = new Thickness(6, 0, 6, 0), VerticalContentAlignment = VerticalAlignment.Center };
        Placeholder.Set(search, "항목 검색…", 8);
        var list = new StackPanel();
        void Fill()
        {
            list.Children.Clear();
            var kw = search.Text.Trim().ToLowerInvariant();
            list.Children.Add(Option("", "— 미지정 —"));
            var groups = _fields.Where(f => kw.Length == 0 || f.Label.ToLowerInvariant().Contains(kw) || f.Key.ToLowerInvariant().Contains(kw)).GroupBy(f => f.Group).ToList();
            if (groups.Count == 0)
                list.Children.Add(new TextBlock { Text = "검색 결과 없음", FontSize = 14, FontWeight = FontWeights.Medium, Foreground = B("#334155"), Margin = new Thickness(12) });
            foreach (var g in groups)
            {
                list.Children.Add(new Border
                {
                    Background = B("#EEF2FF"), BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 1), Padding = new Thickness(12, 6, 12, 6),
                    Child = new TextBlock { Text = g.Key, FontSize = 13, FontWeight = FontWeights.Bold, Foreground = B("#4F46E5"), HorizontalAlignment = HorizontalAlignment.Center },
                });
                foreach (var f in g) list.Children.Add(Option(f.Key, f.Label));
            }
        }
        search.TextChanged += (_, _) => Fill();
        Fill();
        var dp = new DockPanel();
        var top = new Border { Child = search, Padding = new Thickness(8), BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1) };
        DockPanel.SetDock(top, Dock.Top);
        dp.Children.Add(top);
        dp.Children.Add(new ScrollViewer { Content = list, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
        _popup.Child = new Border
        {
            Child = dp, Width = Math.Max(ActualWidth, 240), MaxHeight = 340, Background = Brushes.White, BorderBrush = B("#CBD5E1"), BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(8), Margin = new Thickness(0, 0, 10, 10),
            Effect = new System.Windows.Media.Effects.DropShadowEffect { BlurRadius = 18, ShadowDepth = 4, Opacity = 0.22, Direction = 270 },
        };
        _popup.IsOpen = true;
        search.Focus();
    }

    private Border Option(string key, string label)
    {
        var active = (Value ?? "") == key;
        var b = new Border
        {
            Padding = new Thickness(12, 8, 12, 8), Background = active ? B("#EEF2FF") : Brushes.White, Cursor = Cursors.Hand,
            Child = new TextBlock { Text = label, FontSize = 14, FontWeight = active ? FontWeights.Bold : FontWeights.Medium, Foreground = B("#111827") },
        };
        b.MouseEnter += (_, _) => { if (!active) b.Background = B("#F8FAFC"); };
        b.MouseLeave += (_, _) => { if (!active) b.Background = Brushes.White; };
        b.MouseLeftButtonUp += (_, _) =>
        {
            Value = key.Length == 0 ? null : key;
            _popup.IsOpen = false;
            Paint();
            Changed?.Invoke(Value);
        };
        return b;
    }
}

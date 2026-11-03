using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 소유자/임차인/공인중개사 카드 — 기존 HolderCombinedCard 그대로:
///   탭(공인중개사|소유자|임차인) + 등기상 소유자/계약서상 임차인 입력 + [+ 행추가], 아래 표.
///   현재(과거 아닌) 빈 행은 항상 3개 유지, 과거(전 소유자·전 임차인) 행은 아래로(저장일 최신순)·경계선 진하게.
///   행마다 지우개(내용 지우기), 4번째 행부터·과거 행은 휴지통(행 삭제).
///   통신사는 기존과 같이 화면에만 있다(서버·DB에 칸이 없어 저장되지 않음).
/// </summary>
public sealed class HolderCard : Border
{
    private static readonly Brush Line = Legacy.B("#CBD5E1"), Head = Legacy.B("#F1F5F9"), Indigo = Legacy.B("#4F46E5"), PastLine = Legacy.B("#64748B");
    private static readonly string[] HolderKeys = { "holder_name", "holder_relation", "holder_phone", "holder_telecom", "holder_address" };
    private static readonly string[] ShareKeys = { "office_name", "region_name", "office_phone", "memo" };

    private readonly Row _pt;
    private readonly List<Row> _holders = new();
    private readonly List<Row> _shares = new();
    private string _type = "OWNER";
    private readonly Grid _tabs = new();
    private readonly DockPanel _tools = new() { LastChildFill = true };
    private readonly Grid _header = new();
    private readonly StackPanel _rowsPanel = new() { Background = Brushes.White };
    private readonly ScrollViewer _scroll;

    public HolderCard(Row pt)
    {
        _pt = pt;
        BorderBrush = Legacy.B("#8B7AD8");
        BorderThickness = new Thickness(2);

        var top = new DockPanel();
        DockPanel.SetDock(_tabs, Dock.Left);
        top.Children.Add(_tabs);
        top.Children.Add(new Border { Background = Head, Padding = new Thickness(8, 0, 8, 0), Child = _tools });
        var topBox = new Border { BorderBrush = Line, BorderThickness = new Thickness(0, 0, 0, 1), Child = top };

        _scroll = new ScrollViewer { Content = _rowsPanel, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Background = Brushes.White };
        var table = new DockPanel();
        DockPanel.SetDock(_header, Dock.Top);
        table.Children.Add(_header);
        // 남은 높이를 채우는 빈 칸(기존 height:100% 빈 행) — 바깥 테두리
        table.Children.Add(new Border { BorderBrush = Line, BorderThickness = new Thickness(1, 0, 1, 1), Child = _scroll });

        var root = new DockPanel();
        DockPanel.SetDock(topBox, Dock.Top);
        root.Children.Add(topBox);
        root.Children.Add(table);
        Child = root;
    }

    public IReadOnlyList<Row> Holders => _holders;
    public IReadOnlyList<Row> Shares => _shares;

    public void Load(IEnumerable<Row> holders, IEnumerable<Row> shares)
    {
        _holders.Clear();
        _holders.AddRange(holders);
        _shares.Clear();
        _shares.AddRange(shares);
        Render(focus: false);
    }

    /// <summary>소유자/임차인 변경 — 과거 행으로 추가</summary>
    public void AddPast(Row r)
    {
        _holders.Add(r);
        Render(focus: false);
    }

    /// <summary>전화번호입력 목록(기존 gatherPhones): 소유자·임차인 → 공인중개사</summary>
    public IReadOnlyList<PhoneItem> Phones()
    {
        var list = new List<PhoneItem>();
        foreach (var h in _holders.Where(h => h.Has("holder_phone")))
        {
            var role = h.Str("holder_type") == "BUYER" ? "임차인" : "소유자";
            var name = h.Str("holder_name");
            list.Add(new PhoneItem(role + (string.IsNullOrEmpty(name) ? "" : " " + name), name ?? role, h.Str("holder_phone")!.Trim()));
        }
        foreach (var s in _shares.Where(s => s.Has("office_phone")))
        {
            var name = s.Str("office_name");
            list.Add(new PhoneItem("공인중개사" + (string.IsNullOrEmpty(name) ? "" : " " + name), name ?? "공인중개사", s.Str("office_phone")!.Trim()));
        }
        return list;
    }

    private static bool HasData(Row r, string[] keys) => keys.Any(r.Has);
    private static bool IsPast(Row h) => h.Str("holder_relation") is "전 소유자" or "전 임차인";
    private bool IsShare => _type == "SHARE";
    private bool IsOwner => _type == "OWNER";

    private Row BlankHolder() => new() { ["holder_type"] = _type };

    /// <summary>현재 빈 행 3개 유지(부족분만 보충) — 공인중개사는 비어 있을 때 3행</summary>
    private void EnsureBlanks()
    {
        if (IsShare)
        {
            if (_shares.Count == 0) for (var i = 0; i < 3; i++) _shares.Add(new Row());
            return;
        }
        var empty = _holders.Count(h => h.Str("holder_type") == _type && !IsPast(h) && !HasData(h, HolderKeys));
        for (var i = empty; i < 3; i++) _holders.Add(BlankHolder());
    }

    private void Render(bool focus)
    {
        EnsureBlanks();
        RenderTop();
        var cols = IsShare
            ? new[] { 84.0, 76, 104, -1, 44 }
            : IsOwner ? new[] { 46.0, 80, 80, 128, 66, -1, 44 } : new[] { 46.0, 80, 80, 128, -1, 44 };
        var heads = IsShare
            ? new[] { "상호", "지역명", "전화번호", "내용", "" }
            : IsOwner ? new[] { "구분", "성함", "관계", "전화번호", "통신사", "주 소", "" } : new[] { "구분", "성함", "관계", "전화번호", "주 소", "" };
        SetColumns(_header, cols);
        _header.Children.Clear();
        for (var i = 0; i < heads.Length; i++)
        {
            var c = new Border
            {
                Background = Head, BorderBrush = Line, BorderThickness = new Thickness(i == 0 ? 1 : 0, 1, 1, 1), Padding = new Thickness(2, 4, 2, 4),
                Child = new TextBlock { Text = heads[i], FontSize = 14, FontWeight = FontWeights.Medium, HorizontalAlignment = HorizontalAlignment.Center },
            };
            Grid.SetColumn(c, i);
            _header.Children.Add(c);
        }

        _rowsPanel.Children.Clear();
        TextBox? firstEmpty = null;
        if (IsShare)
        {
            for (var i = 0; i < _shares.Count; i++)
            {
                var (row, first) = ShareRow(_shares[i], i, cols);
                _rowsPanel.Children.Add(row);
                if (firstEmpty is null && !HasData(_shares[i], ShareKeys)) firstEmpty = first;
            }
        }
        else
        {
            var cur = _holders.Where(h => h.Str("holder_type") == _type && !IsPast(h)).ToList();
            var past = _holders.Where(h => h.Str("holder_type") == _type && IsPast(h)).OrderByDescending(h => h.Str("holder_reg_date") ?? "", StringComparer.Ordinal).ToList();
            var display = cur.Concat(past).ToList();
            for (var m = 0; m < display.Count; m++)
            {
                var h = display[m];
                var (row, first) = HolderRow(h, m, cols, boundary: past.Count > 0 && h == past[0]);
                _rowsPanel.Children.Add(row);
                if (firstEmpty is null && !HasData(h, HolderKeys)) firstEmpty = first;
            }
        }
        if (focus && firstEmpty is not null) Dispatcher.BeginInvoke(() => firstEmpty.Focus(), System.Windows.Threading.DispatcherPriority.Input);
    }

    private static void SetColumns(Grid g, double[] widths)
    {
        g.ColumnDefinitions.Clear();
        foreach (var w in widths) g.ColumnDefinitions.Add(new ColumnDefinition { Width = w < 0 ? new GridLength(1, GridUnitType.Star) : new GridLength(w) });
    }

    private void RenderTop()
    {
        _tabs.ColumnDefinitions.Clear();
        _tabs.Children.Clear();
        var i = 0;
        foreach (var (type, label) in new[] { ("SHARE", "공인중개사"), ("OWNER", "소유자"), ("BUYER", "임차인") })
        {
            _tabs.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(90) });
            var on = _type == type;
            // 기존 tabStyle: 폭 90 · padding 6 · 14px · 활성 인디고 바탕/흰 글자/700 + 아래 3px · 오른쪽 구분선
            var tab = new Border
            {
                BorderBrush = Line, BorderThickness = new Thickness(0, 0, 1, 0), Cursor = Cursors.Hand,
                Child = new Border
                {
                    Background = on ? Indigo : Legacy.B("#F8FAFC"), BorderBrush = on ? Indigo : Brushes.Transparent, BorderThickness = new Thickness(0, 0, 0, 3), Padding = new Thickness(6),
                    Child = new TextBlock { Text = label, FontSize = 14, FontWeight = on ? FontWeights.Bold : FontWeights.Medium, Foreground = on ? Brushes.White : Brushes.Black, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center },
                },
            };
            tab.MouseLeftButtonUp += (_, _) => { _type = type; Render(focus: true); };
            Grid.SetColumn(tab, i++);
            _tabs.Children.Add(tab);
        }

        _tools.Children.Clear();
        var add = new Button
        {
            Content = "+ 행추가", FontSize = 14, Foreground = Indigo, Background = Brushes.White, Padding = new Thickness(10, 3, 10, 3), MinHeight = 0,
            VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(8, 0, 0, 0),
        };
        add.Click += (_, _) =>
        {
            if (IsShare) _shares.Add(new Row());
            else _holders.Add(BlankHolder());
            Render(focus: true);
        };
        DockPanel.SetDock(add, Dock.Right);
        _tools.Children.Add(add);
        if (!IsShare)
        {
            var key = IsOwner ? "registry_owner" : "contract_tenant";
            var tb = new TextBox { Text = _pt.Str(key) ?? "", FontSize = 13, Padding = new Thickness(6, 4, 6, 4), MinHeight = 0, VerticalAlignment = VerticalAlignment.Center, Foreground = Legacy.B("#1E293B") };
            Placeholder.Set(tb, IsOwner ? "등기사항전부증명서상 소유자" : "계약서상 임차인");
            tb.TextChanged += (_, _) => _pt[key] = tb.Text.Length > 0 ? tb.Text : null;
            _tools.Children.Add(tb);
        }
        else _tools.Children.Add(new Border());
    }

    private static TextBox Cell(Row r, string key, string placeholder, Action? changed)
    {
        // 기존 cellInput: 테두리 없음 · 투명 · 13px · padding 4px 6px
        var tb = new TextBox { Text = r.Str(key) ?? "", FontSize = 13, Padding = new Thickness(6, 4, 6, 4), BorderThickness = new Thickness(0), Background = Brushes.Transparent, MinHeight = 28, VerticalContentAlignment = VerticalAlignment.Center, Tag = key };
        Placeholder.Set(tb, placeholder);
        tb.TextChanged += (_, _) => { r[key] = tb.Text.Length > 0 ? tb.Text : null; changed?.Invoke(); };
        return tb;
    }

    /// <summary>표 칸(기존 border-collapse 흉내: 왼쪽 첫 칸만 왼쪽 선) — 과거 시작 행은 위 2px 진한 선</summary>
    private static UIElement Td(UIElement child, Brush line, bool first, bool boundary)
    {
        var inner = new Border { BorderBrush = line, BorderThickness = new Thickness(first ? 1 : 0, 0, 1, 1), Child = child };
        return boundary ? new Border { BorderBrush = Legacy.B("#334155"), BorderThickness = new Thickness(0, 2, 0, 0), Child = inner } : inner;
    }

    private static TextBlock Icon(string glyph, string color) => new()
    {
        Text = glyph, FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), FontSize = 13, Foreground = Legacy.B(color),
    };

    private static Button IconButton(string glyph, string color, string tip, Action click)
    {
        var b = new Button { Content = Icon(glyph, color), ToolTip = tip, Padding = new Thickness(2), MinHeight = 0, MinWidth = 0, Background = Brushes.Transparent, BorderThickness = new Thickness(0), Cursor = Cursors.Hand, Focusable = false };
        b.Click += (_, _) => click();
        return b;
    }

    private (Grid Row, TextBox First) HolderRow(Row h, int index, double[] cols, bool boundary)
    {
        var past = IsPast(h);
        var line = past ? PastLine : Line;
        var g = new Grid();
        SetColumns(g, cols);
        var wasEmpty = !HasData(h, HolderKeys);
        void Changed()
        {
            // 빈 행에 입력하기 시작하면 현재 행 끝(과거 행 앞)에 빈 행 하나 보충(기존: 현재 빈 행 3개 유지) — 입력 중인 칸은 그대로
            if (!wasEmpty || !HasData(h, HolderKeys)) return;
            wasEmpty = false;
            var curCount = _holders.Count(x => x.Str("holder_type") == _type && !IsPast(x));
            var blank = BlankHolder();
            _holders.Add(blank);
            var (row, _) = HolderRow(blank, curCount, cols, false);
            _rowsPanel.Children.Insert(Math.Min(curCount, _rowsPanel.Children.Count), row);
        }
        var kind = new TextBlock
        {
            Text = past ? "과거" : "", FontWeight = FontWeights.Bold, FontSize = 12, Foreground = Legacy.B(past ? "#DC2626" : "#CBD5E1"),
            HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center,
        };
        var name = Cell(h, "holder_name", "성함", Changed);
        var cells = new List<UIElement> { new Border { Background = past ? Head : Brushes.Transparent, Child = kind }, name };
        cells.Add(Cell(h, "holder_relation", "관계", Changed));
        cells.Add(Cell(h, "holder_phone", "전화번호", Changed));
        if (IsOwner) cells.Add(Cell(h, "holder_telecom", "통신사", Changed));
        cells.Add(Cell(h, "holder_address", "주소", Changed));

        var actions = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        actions.Children.Add(IconButton("", "#64748B", "내용 지우기", () =>
        {
            if (!Dialogs.Confirm("이 행의 내용을 지우시겠습니까?")) return;
            foreach (var k in HolderKeys) h[k] = null;
            Render(focus: false);
        }));
        if (index >= 3 || past)
            actions.Children.Add(IconButton("", "#DC2626", "행 삭제", () =>
            {
                if (!Dialogs.Confirm("이 행을 삭제하시겠습니까?")) return;
                _holders.Remove(h);
                Render(focus: false);
            }));
        cells.Add(actions);

        for (var i = 0; i < cells.Count; i++)
        {
            var td = Td(cells[i], line, i == 0, boundary);
            Grid.SetColumn(td, i);
            g.Children.Add(td);
        }
        return (g, name);
    }

    private (Grid Row, TextBox First) ShareRow(Row s, int index, double[] cols)
    {
        var g = new Grid();
        SetColumns(g, cols);
        var office = Cell(s, "office_name", "상호", null);
        var cells = new List<UIElement>
        {
            office, Cell(s, "region_name", "지역명", null), Cell(s, "office_phone", "전화번호", null), Cell(s, "memo", "내용", null),
        };
        var actions = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        actions.Children.Add(IconButton("", "#64748B", "내용 지우기", () =>
        {
            if (!Dialogs.Confirm("이 행의 내용을 지우시겠습니까?")) return;
            foreach (var k in ShareKeys) s[k] = null;
            Render(focus: false);
        }));
        if (index >= 3)
            actions.Children.Add(IconButton("", "#DC2626", "행 삭제", () =>
            {
                if (!Dialogs.Confirm("이 행을 삭제하시겠습니까?")) return;
                _shares.Remove(s);
                Render(focus: false);
            }));
        cells.Add(actions);
        for (var i = 0; i < cells.Count; i++)
        {
            var td = Td(cells[i], Line, i == 0, false);
            Grid.SetColumn(td, i);
            g.Children.Add(td);
        }
        return (g, office);
    }
}

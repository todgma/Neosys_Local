using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Properties;

/// <summary>전화번호입력에서 고르는 연락처(소유자·임차인·공인중개사 카드에 적힌 전화번호)</summary>
public sealed record PhoneItem(string Label, string Name, string Phone);

/// <summary>
/// 물건특징·상담내용 카드 — 기존 PropertyFormPageV2 우측 카드(RichLine 목록) 그대로:
///   왼쪽 보라 라벨 90px(제목 + 날짜입력·전화번호입력·특수문자·글자색 묶음), 오른쪽 한 줄 리치텍스트 목록.
///   한 줄 = "[yy.MM.dd.HH:mm] [작성자] 연락처 : 내용" — 연락처를 누르면 전화번호 선택, 글자색은 선택한 글자에 span.
///   목록이 비면 빈 행 하나를 둔다(내용 없으면 저장 제외). 내용이 빈 줄에서 Backspace/Delete → 행 삭제 확인.
///   상담내용은 위에 검색 줄(성함/전화번호/내용)이 붙고 날짜 최신순.
/// </summary>
public sealed partial class MemoLineCard : Border
{
    public enum Kind { Memo, Consult }

    // 기존 목록 글꼴 monospace(크롬 한국어 고정폭 기본 = 굴림체) · 12px · 줄높이 1.5
    private static readonly FontFamily Mono = new("GulimChe, Consolas");
    private const double LineH = 18;
    private static readonly Brush Line = Legacy.B("#CBD5E1"), Faint = Legacy.B("#94A3B8");

    private readonly Kind _kind;
    private readonly Func<IReadOnlyList<PhoneItem>> _phones;
    private readonly List<Row> _rows = new();
    private readonly StackPanel _list = new();
    private readonly ComboBox _field = new();
    private readonly TextBox _filter = new();
    private Row? _active;
    private RichTextBox? _activeBox;

    public MemoLineCard(Kind kind, Func<IReadOnlyList<PhoneItem>> phones)
    {
        _kind = kind;
        _phones = phones;
        BorderBrush = Line;
        BorderThickness = new Thickness(1);
        ClipToBounds = true;

        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(90) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        g.Children.Add(LabelColumn());

        var right = new DockPanel { Background = Legacy.B("#FEF3C7") };
        if (kind == Kind.Consult)
        {
            var head = SearchBar();
            DockPanel.SetDock(head, Dock.Top);
            right.Children.Add(head);
        }
        right.Children.Add(new ScrollViewer { Content = _list, Background = Brushes.White, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled, MinHeight = 100 });
        Grid.SetColumn(right, 1);
        g.Children.Add(right);
        Child = g;
    }

    private string DateKey => _kind == Kind.Memo ? "memo_date" : "reg_dt";
    private string ContentKey => _kind == Kind.Memo ? "memo_content" : "itv_content";
    private string UserKey => _kind == Kind.Memo ? "user_id" : "reg_id";
    private string Noun => _kind == Kind.Memo ? "메모" : "상담";

    /// <summary>현재 행(빈 행 포함 — 내용 없는 새 행은 서비스가 저장에서 뺀다)</summary>
    public IReadOnlyList<Row> Items => _rows;

    public void Load(IEnumerable<Row> rows)
    {
        _rows.Clear();
        _rows.AddRange(rows);
        _active = null;
        _activeBox = null;
        Render();
    }

    private Row Blank() => _kind == Kind.Memo
        ? new Row { ["memo_date"] = LocalDate.Now, ["user_id"] = AppServices.Session.UserId }
        : new Row { ["reg_dt"] = LocalDate.Now, ["reg_id"] = AppServices.Session.UserId };

    // ================= 왼쪽 라벨 =================

    private FrameworkElement LabelColumn()
    {
        var sp = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
        sp.Children.Add(new TextBlock { Text = _kind == Kind.Memo ? "물건특징" : "상담내용", FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Brushes.White, TextAlignment = TextAlignment.Center });
        var group = new StackPanel();
        group.Children.Add(Link("날짜입력", AddRow, "메모 추가"));
        group.Children.Add(Link("전화번호입력", PickPhoneForActive, "전화번호 삽입"));
        group.Children.Add(Pick("특수문자", new[] { "★", "●", "■", "▶", "✓", "※", "→" }.Select(c => (c, c)), InsertChar));
        group.Children.Add(Pick("글자색", new[] { ("빨강", "red"), ("파랑", "blue"), ("초록", "green"), ("주황", "orange"), ("보라", "purple") }, ApplyColor));
        // 기존 linkGroupBoxStyle: 흰 85% 테두리 · rounded 5 · padding 7px 8px · 위 16px
        sp.Children.Add(new Border
        {
            // 기존은 위 16px · 안쪽 7px 8px — WPF 90px 칸에서는 '전화번호입력'이 두 줄로 접혀 묶음이 카드(최소 160)보다 커지고
            // 가운데 정렬이라 위 제목이 잘렸다. 간격을 줄여 한 줄씩 들어가게 한다(2026-10-28)
            Margin = new Thickness(0, 8, 0, 0), Padding = new Thickness(3, 4, 3, 4), CornerRadius = new CornerRadius(5),
            BorderThickness = new Thickness(1), BorderBrush = new SolidColorBrush(Color.FromArgb(0xD9, 0xFF, 0xFF, 0xFF)), Child = group,
        });
        return new Border { Background = Legacy.B("#8B7AD8"), BorderBrush = Legacy.B("#5B4AA8"), BorderThickness = new Thickness(0, 0, 1, 0), Padding = new Thickness(4, 6, 4, 6), Child = sp };
    }

    // 기존 linkBtnStyle: 테두리 없음 · 투명 · 흰 글자 · 12px · 700 · padding 2px
    private static TextBlock LinkText(string text) => new()
    {
        Text = text, FontSize = 12, FontWeight = FontWeights.Bold, Foreground = Brushes.White, Padding = new Thickness(0, 3, 0, 3), LineHeight = 17,
        TextWrapping = TextWrapping.NoWrap, TextAlignment = TextAlignment.Center, Cursor = Cursors.Hand, Background = Brushes.Transparent,
    };

    private static TextBlock Link(string text, Action click, string tip)
    {
        var t = LinkText(text);
        t.ToolTip = tip;
        t.MouseLeftButtonUp += (_, _) => click();
        return t;
    }

    /// <summary>기존 &lt;select&gt;(특수문자·글자색) — 누르면 목록, 고르면 적용</summary>
    private static TextBlock Pick(string text, IEnumerable<(string Label, string Value)> items, Action<string> apply)
    {
        var t = LinkText(text + " ");
        t.Padding = new Thickness(2, 5, 2, 5);   // 기존 select는 버튼보다 조금 높다
        t.Inlines.Add(new Run("") { FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), FontSize = 9 });
        var menu = new ContextMenu { PlacementTarget = t, Placement = PlacementMode.Bottom };
        foreach (var (label, value) in items)
        {
            var mi = new MenuItem { Header = label };
            mi.Click += (_, _) => apply(value);
            menu.Items.Add(mi);
        }
        t.MouseLeftButtonUp += (_, _) => menu.IsOpen = true;
        return t;
    }

    // ================= 상담내용 검색 줄 =================

    private FrameworkElement SearchBar()
    {
        foreach (var f in new[] { "성함", "전화번호", "내용" }) _field.Items.Add(f);
        _field.SelectedItem = "내용";
        _field.Style = (Style)Application.Current.FindResource("FormSelect");
        _field.Height = 26;
        _field.FontSize = 13;
        _field.FontWeight = FontWeights.SemiBold;
        _field.Width = 80;
        _field.Margin = new Thickness(0, 0, 6, 0);
        _filter.FontSize = 13;
        _filter.Background = Brushes.White;
        _field.Background = Brushes.White;
        _filter.Padding = new Thickness(6, 3, 24, 3);
        _filter.MinHeight = 0;
        var clear = new Button
        {
            Content = "×", Width = 18, Height = 18, Padding = new Thickness(0), MinHeight = 0, MinWidth = 0, FontSize = 12, Foreground = Legacy.B("#6B7280"),
            HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 2, 0),
            ToolTip = "검색 초기화", Visibility = Visibility.Collapsed, Cursor = Cursors.Hand,
            Template = CircleTemplate(),
        };
        clear.Click += (_, _) => _filter.Text = "";
        void Placeholder() => Ui.Placeholder.Set(_filter, $"{_field.SelectedItem} 검색");
        Placeholder();
        _field.SelectionChanged += (_, _) => { Placeholder(); Render(); };
        _filter.TextChanged += (_, _) => { clear.Visibility = _filter.Text.Length > 0 ? Visibility.Visible : Visibility.Collapsed; Render(); };
        var box = new Grid();
        box.Children.Add(_filter);
        box.Children.Add(clear);
        var dp = new DockPanel();
        DockPanel.SetDock(_field, Dock.Left);
        dp.Children.Add(_field);
        dp.Children.Add(box);
        return new Border { Background = Legacy.B("#F1F5F9"), BorderBrush = Line, BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(6, 3, 6, 3), Child = dp };
    }

    private static ControlTemplate CircleTemplate()
    {
        var t = new ControlTemplate(typeof(Button));
        var bd = new FrameworkElementFactory(typeof(Border));
        bd.SetValue(Border.CornerRadiusProperty, new CornerRadius(9));
        bd.SetValue(Border.BackgroundProperty, Legacy.B("#E2E8F0"));
        var cp = new FrameworkElementFactory(typeof(ContentPresenter));
        cp.SetValue(HorizontalAlignmentProperty, HorizontalAlignment.Center);
        cp.SetValue(VerticalAlignmentProperty, VerticalAlignment.Center);
        bd.AppendChild(cp);
        t.VisualTree = bd;
        return t;
    }

    // ================= 목록 =================

    private void Render()
    {
        if (_rows.Count == 0) _rows.Add(Blank());   // 기존: 비어 있으면 항상 기본 한 행
        _list.Children.Clear();
        IEnumerable<Row> show = _rows;
        if (_kind == Kind.Consult)
        {
            var q = _filter.Text.Trim().ToLowerInvariant();
            if (q.Length > 0)
            {
                var field = _field.SelectedItem as string;
                show = show.Where(r =>
                {
                    var content = RichHtml.ToPlain(r.Str(ContentKey)).ToLowerInvariant();
                    if (field == "성함") return (r.Str(UserKey) ?? "").ToLowerInvariant().Contains(q);   // 기존도 작성자(userId)로 찾음
                    if (field == "전화번호")
                    {
                        var d = Digits(q);
                        return d.Length > 0 ? Digits(content).Contains(d) : content.Contains(q);
                    }
                    return content.Contains(q);
                });
            }
            show = show.OrderByDescending(r => DateOf(r) ?? "", StringComparer.Ordinal);
        }
        var any = false;
        foreach (var r in show)
        {
            _list.Children.Add(LineView(r));
            any = true;
        }
        if (!any) _list.Children.Add(new TextBlock { Text = "검색 결과 없음", Foreground = Faint, FontFamily = Mono, FontSize = 12, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(20) });
    }

    private string? DateOf(Row r) => _kind == Kind.Memo ? r.Str("memo_date") : r.Str("reg_dt") ?? r.Str("itv_date");

    private static string Digits(string s) => new(s.Where(char.IsDigit).ToArray());

    [GeneratedRegex(@"(\d{4})\D*(\d{1,2})\D*(\d{1,2})\D*(\d{1,2})\D*(\d{2})")]
    private static partial Regex DateTimeRx();

    [GeneratedRegex(@"(\d{4})\D*(\d{1,2})\D*(\d{1,2})")]
    private static partial Regex DateRx();

    /// <summary>기존 formatDotDate: 년2자리.월.일.시:분</summary>
    public static string DotDate(string? raw)
    {
        if (string.IsNullOrEmpty(raw)) return "";
        var m = DateTimeRx().Match(raw);
        if (m.Success) return $"{m.Groups[1].Value[2..]}.{m.Groups[2].Value.PadLeft(2, '0')}.{m.Groups[3].Value.PadLeft(2, '0')}.{m.Groups[4].Value.PadLeft(2, '0')}:{m.Groups[5].Value}";
        var d = DateRx().Match(raw);
        return d.Success ? $"{d.Groups[1].Value[2..]}.{d.Groups[2].Value.PadLeft(2, '0')}.{d.Groups[3].Value.PadLeft(2, '0')}" : raw;
    }

    /// <summary>한 줄: 접두(겹쳐 그림) + 리치텍스트(첫 줄만 접두 폭만큼 들여씀)</summary>
    private FrameworkElement LineView(Row r)
    {
        var prefix = new TextBlock { FontFamily = Mono, FontSize = 12, LineHeight = LineH, HorizontalAlignment = HorizontalAlignment.Left, VerticalAlignment = VerticalAlignment.Top, Cursor = Cursors.IBeam };
        prefix.Inlines.Add(new Run($"[{DotDate(DateOf(r))}]") { Foreground = Legacy.B("#64748B") });
        prefix.Inlines.Add(new Run(" "));
        prefix.Inlines.Add(new Run($"[{r.Str(UserKey)}]") { Foreground = Legacy.B("#3B82F6"), FontWeight = FontWeights.SemiBold });
        prefix.Inlines.Add(new Run(" "));
        var has = r.Has("contact_name") || r.Has("contact_phone");
        var contact = new Run(has ? $"{r.Str("contact_name")} {r.Str("contact_phone")}".Trim() : "전화번호입력")
        {
            FontWeight = FontWeights.Bold, Foreground = Legacy.B(has ? "#0F766E" : "#F59E0B"), TextDecorations = TextDecorations.Underline, Cursor = Cursors.Hand, ToolTip = "연락처 선택",
        };
        contact.MouseLeftButtonDown += (_, e) => { e.Handled = true; OpenPicker(r); };
        prefix.Inlines.Add(contact);
        prefix.Inlines.Add(new Run(" : "));
        prefix.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
        var indent = prefix.DesiredSize.Width + 4;   // 기존: textIndent = 접두 폭 + 4px

        var box = new RichTextBox
        {
            BorderThickness = new Thickness(0), Background = Brushes.Transparent, Padding = new Thickness(0), Margin = new Thickness(0),
            FontFamily = Mono, FontSize = 12, AcceptsReturn = true, MinHeight = 17,
            VerticalScrollBarVisibility = ScrollBarVisibility.Disabled, HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
        };
        box.Document.PagePadding = new Thickness(0);
        box.Document.LineHeight = LineH;
        box.Document.FontFamily = Mono;
        var loading = true;
        RichHtml.Load(box.Document, r.Str(ContentKey));
        void Indent()
        {
            foreach (var b in box.Document.Blocks)
            {
                b.Margin = new Thickness(0);
                if (b is Paragraph p) p.TextIndent = b == box.Document.Blocks.FirstBlock ? indent : 0;
            }
        }
        Indent();
        var ph = new TextBlock { Text = "내용 입력...", Foreground = Faint, FontFamily = Mono, FontSize = 12, LineHeight = LineH, IsHitTestVisible = false, Margin = new Thickness(indent, 0, 0, 0), VerticalAlignment = VerticalAlignment.Top };
        void UpdatePh() => ph.Visibility = r.Has(ContentKey) ? Visibility.Collapsed : Visibility.Visible;
        UpdatePh();
        loading = false;

        box.TextChanged += (_, _) =>
        {
            if (loading) return;
            loading = true;
            Indent();   // 첫 줄이 지워져 다음 줄이 올라와도 들여쓰기 유지
            loading = false;
            var html = RichHtml.ToHtml(box.Document, box.Foreground);
            r[ContentKey] = html.Length > 0 ? html : null;
            UpdatePh();
        };
        box.GotKeyboardFocus += (_, _) => { _active = r; _activeBox = box; };
        box.PreviewKeyDown += (_, e) =>
        {
            if (e.Key is not (Key.Back or Key.Delete)) return;
            if (new TextRange(box.Document.ContentStart, box.Document.ContentEnd).Text.Trim().Length > 0) return;
            e.Handled = true;
            if (Dialogs.Confirm("행을 삭제할까요?")) DeleteRow(r);
        };
        // 붙여넣기는 글자만(다른 프로그램 서식이 섞이지 않게)
        DataObject.AddPastingHandler(box, (_, e) =>
        {
            if (!e.DataObject.GetDataPresent(DataFormats.UnicodeText)) { e.CancelCommand(); return; }
            var text = (string)e.DataObject.GetData(DataFormats.UnicodeText);
            var plain = new DataObject();
            plain.SetData(DataFormats.UnicodeText, text);
            e.DataObject = plain;
        });
        prefix.MouseLeftButtonDown += (_, e) =>
        {
            e.Handled = true;
            box.Focus();
            box.CaretPosition = box.Document.ContentStart.GetInsertionPosition(LogicalDirection.Forward);
        };

        var g = new Grid { Margin = new Thickness(2) };   // 기존 padding 2px
        g.Children.Add(box);
        g.Children.Add(ph);
        g.Children.Add(prefix);
        return g;
    }

    // ================= 동작 =================

    private void AddRow()
    {
        _rows.Add(Blank());
        Render();
    }

    private void DeleteRow(Row r)
    {
        _rows.Remove(r);
        if (_active == r) { _active = null; _activeBox = null; }
        Render();
    }

    private void PickPhoneForActive()
    {
        if (_active is null || !_rows.Contains(_active)) { Toast.Error($"{Noun} 행을 먼저 클릭하세요."); return; }
        OpenPicker(_active);
    }

    /// <summary>전화번호 선택 — 고른 연락처는 내용이 아니라 그 행의 접두(이름·연락처)에 들어간다</summary>
    private void OpenPicker(Row target)
    {
        var list = _phones();
        if (list.Count == 0) { Toast.Error("등록된 전화번호가 없습니다."); return; }
        var w = new Window
        {
            Title = "전화번호 선택", Width = 360, SizeToContent = SizeToContent.Height, MaxHeight = SystemParameters.WorkArea.Height * 0.7,
            ResizeMode = ResizeMode.NoResize, WindowStartupLocation = WindowStartupLocation.CenterOwner, Owner = Window.GetWindow(this), ShowInTaskbar = false,
        };
        var sp = new StackPanel { Margin = new Thickness(14) };
        foreach (var it in list)
        {
            var content = new StackPanel();
            content.Children.Add(new TextBlock { Text = it.Label, FontSize = 12, Foreground = Legacy.B("#64748B") });
            content.Children.Add(new TextBlock { Text = it.Phone, FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#1E293B") });
            var b = new Button { Content = content, HorizontalContentAlignment = HorizontalAlignment.Left, Padding = new Thickness(10, 8, 10, 8), Margin = new Thickness(0, 0, 0, 6), Background = Brushes.White };
            b.Click += (_, _) =>
            {
                target["contact_name"] = string.IsNullOrEmpty(it.Name) ? null : it.Name;
                target["contact_phone"] = it.Phone;
                w.Close();
                Render();
            };
            sp.Children.Add(b);
        }
        w.Content = new ScrollViewer { Content = sp, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        w.ShowDialog();
    }

    private bool RequireActive(string what)
    {
        if (_activeBox is not null && _active is not null && _rows.Contains(_active)) return true;
        Toast.Error($"{what} 입력칸을 먼저 클릭하세요.");
        return false;
    }

    private string InputName => _kind == Kind.Memo ? "메모" : "상담 내용";

    private void InsertChar(string ch)
    {
        if (!RequireActive(InputName)) return;
        var box = _activeBox!;
        box.Selection.Text = ch;
        box.CaretPosition = box.Selection.End;
        box.Focus();
    }

    private void ApplyColor(string css)
    {
        if (!RequireActive(InputName)) return;
        var box = _activeBox!;
        if (box.Selection.IsEmpty) { Toast.Error("색상을 적용할 텍스트를 선택하세요."); return; }
        box.Selection.ApplyPropertyValue(TextElement.ForegroundProperty, RichHtml.BrushOf(css));
    }
}

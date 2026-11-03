using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Community;

/// <summary>
/// 커뮤니티 — 기존 CommunityBoard(새 창 900×700). 탭: 공지사항 · 이벤트 · 구직 게시판 · 구인 게시판 · 사무소 양도.
///  목록(번호 + 탭별 칸, 검색) → 행을 누르면 상세(제목·작성자·작성일·조회 + 내용 HTML 또는 정형 항목 표) → [목록].
///  모두 서버 데이터(운영 서버 API) 조회. 대시보드 롤링 배너를 누르면 그 탭·그 글이 바로 열린다.
///  글쓰기(목록 [＋ 글쓰기]): 구인·구직 = 정형 입력(필수 *·성별 체크·구직 비밀번호), 사무소 양도 = 매물 정형 입력 + 게시자 정보 자동 기입,
///  그 밖의 게시판 = 리치 에디터(HTML). 삭제(목록 ✕·상세 [삭제])는 내가 쓴 글만. 공지·이벤트는 조회 전용.
/// </summary>
public sealed class CommunityWindow : Window
{
    private string _tab;
    private readonly StackPanel _tabBar = new() { Orientation = Orientation.Horizontal };
    private readonly ContentControl _body = new();
    private readonly TextBox _search = new() { Width = 260 };
    private readonly DataGrid _grid = new() { HeadersVisibility = DataGridHeadersVisibility.Column, GridLinesVisibility = DataGridGridLinesVisibility.All, RowHeight = 36, FontSize = 14 };
    private readonly TextBlock _jobNote = new() { Text = "* 게시일로부터 3개월 경과한 게시글은 자동 삭제됩니다", Foreground = Legacy.B("#DC2626"), FontWeight = FontWeights.Bold, FontSize = 13, Margin = new Thickness(0, 0, 0, 8) };
    private readonly TextBlock _empty = new() { FontSize = 14, Foreground = Legacy.B("#64748B"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 40, 0, 0) };
    private readonly Button _write = new() { Content = "＋ 글쓰기" };
    private readonly FrameworkElement _listView;
    private List<Row> _rows = new();
    private Row? _office;   // 게시자 정보 자동 기입용(처음 글쓰기 때 한 번 조회)

    /// <param name="compose">true면 열자마자 그 탭의 글쓰기 화면(화면 확인용)</param>
    public CommunityWindow(string? initialTab = null, long? initialPostId = null, bool compose = false)
    {
        _tab = CommunityRules.Tabs.Contains(initialTab ?? "") ? initialTab! : CommunityRules.Notice;
        Title = "커뮤니티";
        Width = 900;
        Height = 700;
        MinWidth = 720;
        MinHeight = 560;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = Brushes.White;

        var tabs = new Border { Child = _tabBar, BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(16, 12, 16, 0) };
        DockPanel.SetDock(tabs, Dock.Top);
        _listView = BuildList();
        var root = new DockPanel();
        root.Children.Add(tabs);
        root.Children.Add(_body);
        Content = root;

        RenderTabs();
        _body.Content = _listView;
        Loaded += async (_, _) =>
        {
            await LoadAsync();
            if (initialPostId is { } id) await OpenDetailAsync(new Row { ["postId"] = id });
            else if (compose) await StartComposeAsync();
        };
    }

    /// <summary>
    /// 커뮤니티 창 열기 — 이미 열려 있으면 새로 띄우지 않고 그 창을 앞으로(최소화면 복원).
    /// tab·postId를 주면(대시보드 롤링 배너) 그 탭·그 글로 옮긴다. 단, 글쓰기 중이면 쓰던 내용을 지키려고 앞으로만 가져온다.
    /// </summary>
    public static void Open(string? tab = null, long? postId = null)
    {
        var existing = Application.Current.Windows.OfType<CommunityWindow>().FirstOrDefault();
        if (existing is null) { new CommunityWindow(tab, postId).Show(); return; }
        CommunityPopups.Activate(existing);
        if (tab is not null && !existing.IsComposing) _ = existing.NavigateAsync(tab, postId);
    }

    private bool IsComposing => _body.Content is FrameworkElement { Tag: "compose" };

    private async Task NavigateAsync(string tab, long? postId)
    {
        if (!CommunityRules.Tabs.Contains(tab)) return;
        if (tab != _tab || _body.Content != _listView)
        {
            _tab = tab;
            _search.Text = "";
            RenderTabs();
            _body.Content = _listView;
            await LoadAsync();
        }
        if (postId is { } id && tab == _tab) await OpenDetailAsync(new Row { ["postId"] = id });
    }

    // ---------------- 탭 ----------------

    private void RenderTabs()
    {
        _tabBar.Children.Clear();
        foreach (var t in CommunityRules.Tabs)
        {
            var on = t == _tab;
            var key = t;
            var b = new Border
            {
                Background = Legacy.B(on ? "#EEF2FF" : "#FFFFFF"), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(1, 1, 1, 0),
                CornerRadius = new CornerRadius(6, 6, 0, 0), Margin = new Thickness(0, 0, 4, -1), Cursor = System.Windows.Input.Cursors.Hand,
                Child = new Border
                {
                    BorderBrush = Legacy.B(on ? "#4F46E5" : "#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, on ? 2 : 1), Padding = new Thickness(16, 8, 16, 8),
                    Child = new TextBlock { Text = CommunityRules.TabLabel(t), FontSize = 15, FontWeight = on ? FontWeights.ExtraBold : FontWeights.SemiBold, Foreground = Legacy.B(on ? "#4F46E5" : "#334155") },
                },
            };
            b.MouseLeftButtonUp += async (_, _) =>
            {
                if (_tab == key && _body.Content == _listView) return;
                _tab = key;
                _search.Text = "";
                RenderTabs();
                _body.Content = _listView;
                await LoadAsync();
            };
            _tabBar.Children.Add(b);
        }
    }

    // ---------------- 목록 ----------------

    private FrameworkElement BuildList()
    {
        var dp = new DockPanel { Margin = new Thickness(20, 14, 20, 14) };
        DockPanel.SetDock(_jobNote, Dock.Top);
        dp.Children.Add(_jobNote);

        var bar = new DockPanel { Margin = new Thickness(0, 0, 0, 10) };
        Placeholder.Set(_search, "제목·작성자 검색");
        _search.KeyDown += async (_, e) => { if (e.Key == System.Windows.Input.Key.Enter) await LoadAsync(); };
        var go = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton"), Margin = new Thickness(6, 0, 0, 0) };
        go.Click += async (_, _) => await LoadAsync();
        _write.Style = (Style)Application.Current.FindResource("PrimaryButton");
        _write.Click += async (_, _) => await StartComposeAsync();
        DockPanel.SetDock(_write, Dock.Right);
        bar.Children.Add(_write);
        var find = new StackPanel { Orientation = Orientation.Horizontal };
        find.Children.Add(_search);
        find.Children.Add(go);
        bar.Children.Add(find);
        DockPanel.SetDock(bar, Dock.Top);
        dp.Children.Add(bar);

        _grid.SelectionMode = DataGridSelectionMode.Single;
        _grid.HorizontalGridLinesBrush = Legacy.B("#E2E8F0");
        _grid.VerticalGridLinesBrush = Legacy.B("#E2E8F0");
        _grid.SelectionChanged += async (_, _) =>
        {
            // 기존처럼 한 번 클릭으로 상세(마우스로 고른 경우)
            if (_grid.IsMouseOver && _grid.SelectedItem is Row r) await OpenDetailAsync((Row)r["__post"]!);
        };
        var g = new Grid();
        g.Children.Add(_grid);
        g.Children.Add(_empty);
        dp.Children.Add(g);
        return dp;
    }

    private async Task LoadAsync()
    {
        var tab = _tab;
        _jobNote.Visibility = CommunityRules.JobKind(tab) is not null ? Visibility.Visible : Visibility.Collapsed;
        _write.Visibility = CommunityRules.ComposeKind(tab) is not null ? Visibility.Visible : Visibility.Collapsed;
        _empty.Text = "불러오는 중…";
        _empty.Visibility = Visibility.Visible;
        _grid.ItemsSource = null;
        List<Row> rows;
        try
        {
            var q = _search.Text;
            rows = tab switch
            {
                CommunityRules.Notice => CommunityRules.Filter(tab, (await AppServices.Server.GetNoticeListAsync(200)).Select(n => CommunityRules.Normalize(tab, n)), q),
                CommunityRules.Event => CommunityRules.Filter(tab, (await AppServices.Server.GetEventListAsync(isPublic: true, rows: 200)).Select(e => CommunityRules.Normalize(tab, e)), q),
                _ when CommunityRules.JobKind(tab) is { } kind => await AppServices.Server.GetJobListAsync(kind, q),
                _ => await AppServices.Server.GetCommunityListAsync(tab, q),
            };
        }
        catch (Exception ex)
        {
            if (tab != _tab) return;
            _empty.Text = "목록을 불러오지 못했습니다. " + ex.Message;
            return;
        }
        if (tab != _tab) return;   // 그사이 탭을 바꿨으면 버린다
        _rows = rows;

        // 번호(최신이 큰 번호) + 탭별 칸
        var cols = CommunityRules.Columns(tab);
        _grid.Columns.Clear();
        _grid.Columns.Add(Column("번호", "no", 56, true));
        for (int i = 0; i < cols.Count; i++) _grid.Columns.Add(Column(cols[i].Header, $"c{i}", cols[i].Width, cols[i].Center));
        var me = AppServices.Session.UserId;
        if (CommunityRules.ComposeKind(tab) is not null) _grid.Columns.Add(DeleteColumn());
        var items = rows.Select((p, i) =>
        {
            var r = new Row
            {
                ["no"] = (rows.Count - i).ToString(), ["__post"] = p,
                ["__del"] = CommunityRules.CanDelete(tab, p, me) ? Visibility.Visible : Visibility.Hidden,
            };
            for (int c = 0; c < cols.Count; c++) r[$"c{c}"] = cols[c].Value(p);
            return r;
        }).ToList();
        _grid.ItemsSource = items;
        _empty.Text = "게시글이 없습니다.";
        _empty.Visibility = items.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private static DataGridTextColumn Column(string header, string key, double width, bool center)
    {
        var style = new Style(typeof(TextBlock));
        style.Setters.Add(new Setter(TextBlock.TextAlignmentProperty, center ? TextAlignment.Center : TextAlignment.Left));
        style.Setters.Add(new Setter(TextBlock.TextTrimmingProperty, TextTrimming.CharacterEllipsis));
        style.Setters.Add(new Setter(FrameworkElement.VerticalAlignmentProperty, VerticalAlignment.Center));
        style.Setters.Add(new Setter(FrameworkElement.MarginProperty, new Thickness(8, 0, 8, 0)));
        return new DataGridTextColumn
        {
            Header = new TextBlock { Text = header }, Binding = new Binding($"[{key}]"), ElementStyle = style, IsReadOnly = true,
            Width = width > 0 ? new DataGridLength(width) : new DataGridLength(1, DataGridLengthUnitType.Star),
        };
    }

    /// <summary>목록 끝 ✕(내 글만 보임) — 누르면 상세로 가지 않고 바로 삭제 확인(기존 stopPropagation)</summary>
    private DataGridTemplateColumn DeleteColumn()
    {
        var f = new FrameworkElementFactory(typeof(Button));
        f.SetValue(ContentProperty, "✕");
        f.SetValue(ForegroundProperty, Legacy.B("#DC2626"));
        f.SetValue(BackgroundProperty, Brushes.Transparent);
        f.SetValue(BorderThicknessProperty, new Thickness(0));
        f.SetValue(FontSizeProperty, 15.0);
        f.SetValue(MinHeightProperty, 0.0);
        f.SetValue(MinWidthProperty, 0.0);
        f.SetValue(PaddingProperty, new Thickness(6, 0, 6, 0));
        f.SetValue(ToolTipProperty, "삭제");
        f.SetBinding(VisibilityProperty, new Binding("[__del]"));
        f.AddHandler(System.Windows.Controls.Primitives.ButtonBase.ClickEvent, new RoutedEventHandler(async (s, e) =>
        {
            e.Handled = true;
            if (((FrameworkElement)s).DataContext is Row r && r["__post"] is Row post) await DeleteAsync(post);
        }));
        return new DataGridTemplateColumn { Header = "", Width = new DataGridLength(44), CellTemplate = new DataTemplate { VisualTree = f }, IsReadOnly = true };
    }

    // ---------------- 상세 ----------------

    private async Task OpenDetailAsync(Row post)
    {
        var tab = _tab;
        var viewer = AppServices.Session.UserId;
        Row d = post;
        try
        {
            if (post.Long("postId") is { } id)
            {
                var full = tab switch
                {
                    CommunityRules.Notice => await AppServices.Server.GetNoticeDetailAsync(id, viewer),
                    CommunityRules.Event => await AppServices.Server.GetEventDetailAsync(id, viewer),
                    _ when CommunityRules.JobKind(tab) is not null => await AppServices.Server.GetJobDetailAsync(id, viewer),
                    _ => await AppServices.Server.GetCommunityDetailAsync(id, viewer),
                };
                if (full is not null) d = CommunityRules.Normalize(tab, full);
            }
        }
        catch (Exception ex) { Toast.Error("게시글을 불러오지 못했습니다. " + ex.Message); if (post.Count <= 1) return; }
        if (tab != _tab) return;
        _body.Content = Detail(tab, d);
        _grid.SelectedItem = null;
    }

    private FrameworkElement Detail(string tab, Row d)
    {
        var dp = new DockPanel { Margin = new Thickness(20, 16, 20, 16) };
        var head = new StackPanel { Margin = new Thickness(0, 0, 0, 10) };
        head.Children.Add(new TextBlock { Text = d.Str("title") ?? "", FontSize = 18, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), TextWrapping = TextWrapping.Wrap });
        head.Children.Add(new TextBlock
        {
            Text = $"{d.Str("author") ?? "익명"} · {CommunityRules.Date(d.Str("regDt"))} · 조회 {d.Long("viewCnt") ?? 0}",
            FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B"), Margin = new Thickness(0, 4, 0, 0),
        });
        DockPanel.SetDock(head, Dock.Top);
        dp.Children.Add(head);

        var back = new Button { Content = "목록", HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 10, 0, 0), Padding = new Thickness(16, 6, 16, 6) };
        back.Click += (_, _) => _body.Content = _listView;
        var foot = new DockPanel();
        DockPanel.SetDock(back, Dock.Right);
        foot.Children.Add(back);
        if (tab == CommunityRules.Event && d.Str("linkUrl") is { Length: > 0 } link)
        {
            var open = new Button { Content = "이벤트 페이지 열기", HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 10, 0, 0), Foreground = Legacy.B("#4F46E5"), BorderBrush = Legacy.B("#C7D2FE") };
            open.Click += (_, _) => Dialogs.OpenExternal(link);
            foot.Children.Add(open);
        }
        else if (CommunityRules.CanDelete(tab, d, AppServices.Session.UserId))
        {
            var del = new Button { Content = "삭제", HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 10, 0, 0), Padding = new Thickness(16, 6, 16, 6), Foreground = Legacy.B("#DC2626"), BorderBrush = Legacy.B("#FCA5A5") };
            del.Click += async (_, _) => await DeleteAsync(d);
            foot.Children.Add(del);
        }
        else foot.Children.Add(new Border());
        DockPanel.SetDock(foot, Dock.Bottom);
        dp.Children.Add(foot);

        if (CommunityRules.DetailSchema(tab) is { } schema)
            dp.Children.Add(new ScrollViewer { Content = SchemaTable(schema, CommunityRules.Fields(d), tab), VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
        else
            dp.Children.Add(new Border
            {
                BorderBrush = Legacy.B("#E2E8F0"), BorderThickness = new Thickness(0, 1, 0, 0), Padding = new Thickness(0, 12, 0, 0),
                Child = new HtmlView { Html = d.Str("content") ?? "" },
            });
        return dp;
    }

    /// <summary>정형 항목 표(라벨 120px 회색 + 값) — 구인·구직·사무소 양도</summary>
    private static FrameworkElement SchemaTable(CommunityRules.Schema s, Dictionary<string, string> f, string tab)
    {
        var sp = new StackPanel();
        void Section(string text) => sp.Children.Add(new TextBlock { Text = text, FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), Margin = new Thickness(0, 6, 0, 6) });
        Grid Table(IEnumerable<string[]> rows, IEnumerable<string> areas)
        {
            var g = new Grid();
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
            g.ColumnDefinitions.Add(new ColumnDefinition());
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
            g.ColumnDefinitions.Add(new ColumnDefinition());
            int r = 0;
            void Cell(string text, int row, int col, int span, bool label, bool multi = false)
            {
                var b = new Border
                {
                    BorderBrush = Legacy.B("#E2E8F0"), BorderThickness = new Thickness(1), Padding = new Thickness(10, 8, 10, 8), Margin = new Thickness(-1, -1, 0, 0),
                    Background = label ? Legacy.B("#F1F5F9") : Brushes.White,
                    Child = new TextBlock { Text = text, FontSize = 14, FontWeight = label ? FontWeights.Bold : FontWeights.Medium, Foreground = Legacy.B(label ? "#334155" : "#111827"), TextWrapping = TextWrapping.Wrap, LineHeight = multi ? 24 : double.NaN },
                };
                Grid.SetRow(b, row); Grid.SetColumn(b, col); Grid.SetColumnSpan(b, span);
                g.Children.Add(b);
            }
            string V(string key) => f.TryGetValue(key, out var v) ? v : "";
            foreach (var row in rows)
            {
                g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                (string Label, string Key) Lk(string x) => x.Contains(':') ? (x.Split(':')[0], x.Split(':')[1]) : (x, x);
                if (row.Length == 1) { var (l, k) = Lk(row[0]); Cell(l, r, 0, 1, true); Cell(V(k), r, 1, 3, false); }
                else { var (l1, k1) = Lk(row[0]); var (l2, k2) = Lk(row[1]); Cell(l1, r, 0, 1, true); Cell(V(k1), r, 1, 1, false); Cell(l2, r, 2, 1, true); Cell(V(k2), r, 3, 1, false); }
                r++;
            }
            foreach (var a in areas)
            {
                g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                Cell(a, r, 0, 1, true);
                Cell(V(a), r, 1, 3, false, multi: true);
                r++;
            }
            return g;
        }
        if (tab == CommunityRules.Office) Section("매물 정보");
        sp.Children.Add(Table(s.Rows, s.Areas));
        if (s.Poster.Count > 0)
        {
            Section("게시자 정보");
            sp.Children.Add(Table(s.Poster, Array.Empty<string>()));
        }
        return sp;
    }

    // ---------------- 삭제 ----------------

    private async Task DeleteAsync(Row post)
    {
        if (post.Long("postId") is not { } id) return;
        if (!Dialogs.Confirm("이 글을 삭제할까요?")) return;
        var tab = _tab;
        try
        {
            if (CommunityRules.JobKind(tab) is not null) await AppServices.Server.DeleteJobPostAsync(id);
            else await AppServices.Server.DeleteCommunityPostAsync(id);
        }
        catch (Exception ex) { Toast.Error("삭제에 실패했습니다. " + ex.Message); return; }
        Toast.Success("삭제되었습니다.");
        if (tab != _tab) return;
        _body.Content = _listView;
        await LoadAsync();
    }

    // ---------------- 글쓰기 ----------------

    private async Task StartComposeAsync()
    {
        var tab = _tab;
        var kind = CommunityRules.ComposeKind(tab);
        if (kind is null) return;
        var s = AppServices.Session;
        var f = new Dictionary<string, string>();
        if (kind == "office")
        {
            // 게시자 정보(성명·상호명·연락처) 자동 기입 — 사무소 정보는 서버에서(못 받으면 로그인 정보만)
            if (_office is null && s.UserId.Length > 0)
                try { _office = await AppServices.Server.GetUserOfficeAsync(s.UserId); } catch { /* 오프라인 */ }
            f = CommunityRules.OfficeDefaults(s, _office);
        }
        else if (kind == "html") f["author"] = s.RtNm ?? "";
        if (tab != _tab) return;
        _body.Content = Compose(tab, kind, f);
    }

    private FrameworkElement Compose(string tab, string kind, Dictionary<string, string> f)
    {
        var dp = new DockPanel { Margin = new Thickness(20, 16, 20, 16), Tag = "compose" };
        RichEditor? editor = null;

        var cancel = new Button { Content = "취소", Padding = new Thickness(16, 6, 16, 6), Margin = new Thickness(0, 10, 8, 0) };
        cancel.Click += (_, _) => _body.Content = _listView;
        var save = new Button { Content = "등록", Style = (Style)Application.Current.FindResource("PrimaryButton"), Margin = new Thickness(0, 10, 0, 0) };
        save.Click += async (_, _) =>
        {
            if (CommunityRules.Validate(tab, f) is { } msg) { Toast.Error(msg); return; }
            save.IsEnabled = false;
            try
            {
                var post = CommunityRules.BuildPost(tab, f, AppServices.Session, editor is null ? null : await editor.GetHtmlAsync());
                if (kind == "job") await AppServices.Server.CreateJobPostAsync(post);
                else await AppServices.Server.CreateCommunityPostAsync(post);
            }
            catch (Exception ex) { Toast.Error("등록에 실패했습니다. " + ex.Message); save.IsEnabled = true; return; }
            Toast.Success("등록되었습니다.");
            if (tab != _tab) return;
            _search.Text = "";
            _body.Content = _listView;
            await LoadAsync();
        };
        var foot = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
        foot.Children.Add(cancel);
        foot.Children.Add(save);
        DockPanel.SetDock(foot, Dock.Bottom);
        dp.Children.Add(foot);

        if (kind != "office")
        {
            var head = new TextBlock { Text = $"[{CommunityRules.TabLabel(tab)}] 글쓰기", FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), Margin = new Thickness(0, 0, 0, 10) };
            DockPanel.SetDock(head, Dock.Top);
            dp.Children.Add(head);
        }

        if (kind == "html")
        {
            // 리치 에디터: 제목 · 작성자(선택) · 도구 모음 + 편집 칸
            var top = new StackPanel();
            var title = Input(f, "제목", "제목");
            var author = Input(f, "author", "작성자(선택)");
            author.Width = 240;
            author.HorizontalAlignment = HorizontalAlignment.Left;
            author.Margin = new Thickness(0, 6, 0, 8);
            top.Children.Add(title);
            top.Children.Add(author);
            DockPanel.SetDock(top, Dock.Top);
            dp.Children.Add(top);
            dp.Children.Add(editor = new RichEditor());
            return dp;
        }

        var schema = CommunityRules.ComposeSchema(tab)!;
        var required = CommunityRules.Required(tab);
        var sp = new StackPanel();
        sp.Children.Add(EditTable(schema.Rows, schema.Areas, f, required, readOnly: false, tallLast: kind == "job" ? 1 : schema.Areas.Count));
        if (CommunityRules.JobKind(tab) == "구직")
            sp.Children.Add(new TextBlock { Text = "* 수정·삭제 시 등록한 비밀번호를 입력해 주세요.", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B"), Margin = new Thickness(0, 8, 0, 0) });
        if (schema.Poster.Count > 0)
        {
            var t = new TextBlock { FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), Margin = new Thickness(0, 12, 0, 6) };
            t.Inlines.Add("게시자 정보 ");
            t.Inlines.Add(new System.Windows.Documents.Run("(로그인 사용자 자동 기입)") { FontSize = 12, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B") });
            sp.Children.Add(t);
            sp.Children.Add(EditTable(schema.Poster, Array.Empty<string>(), f, required, readOnly: true, tallLast: 0));
        }
        dp.Children.Add(new ScrollViewer { Content = sp, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
        return dp;
    }

    /// <summary>정형 입력 표(라벨 120px 회색, 필수는 빨간 *) — Rows는 한 줄 1~2칸, Areas는 여러 줄 전폭(마지막 tallLast개는 8줄, 나머지 3줄)</summary>
    private Grid EditTable(IEnumerable<string[]> rows, IReadOnlyList<string> areas, Dictionary<string, string> f, IReadOnlyList<string> required, bool readOnly, int tallLast)
    {
        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        int r = 0;
        void Put(FrameworkElement child, int col, int span, bool label)
        {
            var b = new Border
            {
                BorderBrush = Legacy.B("#E2E8F0"), BorderThickness = new Thickness(1), Margin = new Thickness(-1, -1, 0, 0),
                Padding = label ? new Thickness(10, 8, 10, 8) : new Thickness(6, 5, 6, 5), Background = label ? Legacy.B("#F1F5F9") : Brushes.White, Child = child,
            };
            Grid.SetRow(b, r); Grid.SetColumn(b, col); Grid.SetColumnSpan(b, span);
            g.Children.Add(b);
        }
        TextBlock Label(string text, string key)
        {
            var t = new TextBlock { FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#334155"), VerticalAlignment = VerticalAlignment.Center, TextWrapping = TextWrapping.Wrap };
            t.Inlines.Add(text);
            if (!readOnly && required.Contains(key)) t.Inlines.Add(new System.Windows.Documents.Run("*") { Foreground = Legacy.B("#EF4444"), FontWeight = FontWeights.ExtraBold });
            return t;
        }
        static (string Label, string Key) Lk(string x) => x.Contains(':') ? (x.Split(':')[0], x.Split(':')[1]) : (x, x);
        foreach (var row in rows)
        {
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            var (l1, k1) = Lk(row[0]);
            Put(Label(l1, k1), 0, 1, true);
            Put(FieldInput(k1, f, readOnly), 1, row.Length == 1 ? 3 : 1, false);
            if (row.Length > 1)
            {
                var (l2, k2) = Lk(row[1]);
                Put(Label(l2, k2), 2, 1, true);
                Put(FieldInput(k2, f, readOnly), 3, 1, false);
            }
            r++;
        }
        for (int i = 0; i < areas.Count; i++)
        {
            var a = areas[i];
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            var lb = Label(a, a);
            lb.VerticalAlignment = VerticalAlignment.Top;
            Put(lb, 0, 1, true);
            var tb = Input(f, a, a);
            tb.AcceptsReturn = true;
            tb.TextWrapping = TextWrapping.Wrap;
            tb.VerticalContentAlignment = VerticalAlignment.Top;
            tb.VerticalScrollBarVisibility = ScrollBarVisibility.Auto;
            tb.Height = i >= areas.Count - tallLast ? 190 : 80;
            Put(tb, 1, 3, false);
            r++;
        }
        return g;
    }

    /// <summary>항목 입력 칸 — 성별 체크박스 · 희망근무지 지역 선택 · 날짜 달력 · 비밀번호 · 주소 검색 · 일반 글자(기존 fieldInput)</summary>
    private static FrameworkElement FieldInput(string key, Dictionary<string, string> f, bool readOnly)
    {
        var v = f.GetValueOrDefault(key) ?? "";
        if (key == CommunityRules.GenderKey)
        {
            var sp = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
            foreach (var g in CommunityRules.Genders)
            {
                var cb = new CheckBox { Content = g, FontSize = 14, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 0, 16, 0), VerticalContentAlignment = VerticalAlignment.Center, IsEnabled = !readOnly };
                cb.IsChecked = v.Split(',').Select(x => x.Trim()).Contains(g);
                RoutedEventHandler toggle = (_, _) => f[key] = CommunityRules.ToggleGender(f.GetValueOrDefault(key), g);
                cb.Checked += toggle;
                cb.Unchecked += toggle;
                sp.Children.Add(cb);
            }
            return sp;
        }
        if (readOnly)
        {
            var ro = Input(f, key, key);
            ro.IsReadOnly = true;
            ro.Background = Legacy.B("#F8FAFC");
            return ro;
        }
        if (CommunityRules.DateKeys.Contains(key))
        {
            var dp = new DatePicker { SelectedDateFormat = DatePickerFormat.Short, HorizontalAlignment = HorizontalAlignment.Left, MinWidth = 160 };
            if (DateTime.TryParse(v, out var d)) dp.SelectedDate = d;
            dp.SelectedDateChanged += (_, _) => f[key] = dp.SelectedDate is { } x ? LocalDate.Format(x) : "";
            return dp;
        }
        if (key == CommunityRules.PasswordKey)
        {
            var pb = new PasswordBox { FontSize = 14, Padding = new Thickness(6, 4, 6, 4) };
            pb.PasswordChanged += (_, _) => f[key] = pb.Password;
            return pb;
        }
        var tb = Input(f, key, key);
        // 주소(소재지·사무소주소)는 [주소 검색], 희망근무지는 [지역 선택] — 시/도·시/군/구·읍/면/동을 골라 넣고 나머지는 직접 입력
        var isAddr = CommunityRules.AddressKeys.Contains(key);
        if (!isAddr && key != CommunityRules.RegionKey) return tb;
        var pick = new Button { Content = isAddr ? "주소 검색" : "지역 선택", Style = (Style)Application.Current.FindResource("PrimaryButton"), Margin = new Thickness(6, 0, 0, 0), MinHeight = 0 };
        pick.Click += (_, _) =>
        {
            var p = RegionPicker.Pick(false, isAddr ? "주소 검색" : "희망근무지 선택");
            if (p is null) return;
            var text = string.Join(" ", new[] { p.Str("addr1"), p.Str("addr2"), p.Str("addr3") }.Where(x => !string.IsNullOrWhiteSpace(x)));
            tb.Text = isAddr && text.Length > 0 ? text + " " : text;
            tb.Focus();
            tb.CaretIndex = tb.Text.Length;
        };
        var row = new DockPanel();
        DockPanel.SetDock(pick, Dock.Right);
        row.Children.Add(pick);
        row.Children.Add(tb);
        return row;
    }

    private static TextBox Input(Dictionary<string, string> f, string key, string placeholder)
    {
        var tb = new TextBox { Text = f.GetValueOrDefault(key) ?? "", FontSize = 14, Padding = new Thickness(6, 4, 6, 4), VerticalContentAlignment = VerticalAlignment.Center };
        Placeholder.Set(tb, placeholder);
        tb.TextChanged += (_, _) => f[key] = tb.Text;
        return tb;
    }
}

/// <summary>커뮤니티 쪽 팝업 창(커뮤니티·추천목록)을 한 개씩만 — 이미 떠 있으면 그 창을 앞으로</summary>
public static class CommunityPopups
{
    public static void Activate(Window w)
    {
        if (w.WindowState == WindowState.Minimized) w.WindowState = WindowState.Normal;
        w.Show();
        w.Activate();
    }

    /// <summary>match에 맞는 T 창이 열려 있으면 앞으로, 없으면 create로 새로 띄운다</summary>
    public static void ShowSingle<T>(Func<T> create, Func<T, bool>? match = null) where T : Window
    {
        var existing = Application.Current.Windows.OfType<T>().FirstOrDefault(w => match?.Invoke(w) ?? true);
        if (existing is not null) Activate(existing);
        else create().Show();
    }
}

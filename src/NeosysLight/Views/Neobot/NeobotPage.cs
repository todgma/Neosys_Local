using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;
using static Neosys.Local.App.Ui.Legacy;

namespace Neosys.Local.App.Views.Neobot;

/// <summary>
/// 네오봇(통합검색) — 기존 NeobotPage(520×825 창):
///  위 검색창(입력하면 0.3초 뒤 자동 검색) / 상담내용 상자(검색어와 맞는 상담이력 + 새 상담 입력·저장) / 결과 목록(배지 + 3줄: 제목·거래/지역·관련인)
///  결과를 누르면 물건·고객 수정창, 계약은 계약서 창.
/// </summary>
public sealed class NeobotPage : DockPanel
{
    private readonly NeobotService _svc = AppServices.Create((sp, s) => new NeobotService(sp, s));
    private readonly InterviewService _itv = AppServices.Create((sp, s) => new InterviewService(sp, s));
    private readonly TextBox _query = new() { Height = 38, FontSize = 14, FontWeight = FontWeights.SemiBold, Padding = new Thickness(30, 0, 10, 0) };
    private readonly StackPanel _results = new();
    private readonly StackPanel _consults = new();
    private readonly TextBlock _consultCount = new() { FontSize = 13, FontWeight = FontWeights.Bold, Foreground = B("#2563EB"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6, 0, 0, 0) };
    private readonly TextBlock _draftDate = new() { FontFamily = new FontFamily(new Uri("pack://application:,,,/"), "Consolas, ./Assets/Fonts/#Pretendard, Malgun Gothic"), FontSize = 13, Foreground = B("#64748B"), VerticalAlignment = VerticalAlignment.Top, Margin = new Thickness(0, 3, 4, 0) };
    private readonly TextBox _draftPhone = new() { Width = 120, FontSize = 13, MinHeight = 24, Padding = new Thickness(4, 1, 4, 1) };
    private readonly TextBox _draftText = new() { AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, FontSize = 13, MinHeight = 24, BorderThickness = new Thickness(0), Background = Brushes.Transparent, Padding = new Thickness(2) };
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromMilliseconds(300) };
    private DateTime _draftAt = DateTime.Now;

    public NeobotPage()
    {
        Background = Brushes.White;
        // 검색창
        var search = new Grid();
        Placeholder.Set(_query, "고객·물건·계약 통합 검색 (이름/소재지/의뢰인)");
        _query.BorderBrush = B("#CBD5E1");
        search.Children.Add(_query);
        search.Children.Add(new TextBlock { Text = "", FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), Foreground = B("#94A3B8"), FontSize = 14, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(10, 0, 0, 0), IsHitTestVisible = false });
        _query.TextChanged += (_, _) => { _timer.Stop(); _timer.Start(); };
        _timer.Tick += async (_, _) => { _timer.Stop(); await SearchAsync(); };
        var searchBorder = new Border { Child = search, Padding = new Thickness(12, 10, 12, 10), BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1) };
        SetDock(searchBorder, Dock.Top);
        Children.Add(searchBorder);

        // 상담내용 상자
        var head = new DockPanel { Background = B("#F1F5F9") };
        var buttons = new StackPanel { Orientation = Orientation.Horizontal };
        var now = SmallButton("날짜입력", "#F3F0FF", () => { _draftAt = DateTime.Now; PaintDraftDate(); });
        var save = new Button { Content = "저장", FontSize = 14, FontWeight = FontWeights.ExtraBold, Foreground = Brushes.White, Background = B("#2563EB"), BorderBrush = B("#2563EB"), Padding = new Thickness(18, 3, 18, 3), MinHeight = 0, Margin = new Thickness(6, 0, 0, 0) };
        save.Click += async (_, _) => await SaveConsultAsync();
        buttons.Children.Add(now);
        buttons.Children.Add(save);
        DockPanel.SetDock(buttons, Dock.Right);
        head.Children.Add(buttons);
        var title = new StackPanel { Orientation = Orientation.Horizontal };
        title.Children.Add(new TextBlock { Text = "상담내용", FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = B("#1E293B"), VerticalAlignment = VerticalAlignment.Center });
        title.Children.Add(_consultCount);
        head.Children.Add(title);
        var headBorder = new Border { Child = head, Padding = new Thickness(10, 7, 10, 7), BorderBrush = B("#D1D5DB"), BorderThickness = new Thickness(0, 0, 0, 1), Background = B("#F1F5F9") };
        var draft = new DockPanel();
        var left = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Top };
        left.Children.Add(_draftDate);
        left.Children.Add(new TextBlock { Text = $"[{AppServices.Session.UserId}]", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = B("#3B82F6"), Margin = new Thickness(0, 3, 4, 0) });
        Placeholder.Set(_draftPhone, "연락처");
        left.Children.Add(_draftPhone);
        left.Children.Add(new TextBlock { Text = " : ", Margin = new Thickness(0, 3, 0, 0) });
        DockPanel.SetDock(left, Dock.Left);
        draft.Children.Add(left);
        Placeholder.Set(_draftText, "내용 입력...");
        draft.Children.Add(_draftText);
        var draftBorder = new Border { Child = draft, Padding = new Thickness(4, 3, 4, 3), Background = B("#FFFDF5"), BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1) };
        var consultBody = new DockPanel();
        DockPanel.SetDock(headBorder, Dock.Top);
        DockPanel.SetDock(draftBorder, Dock.Top);
        consultBody.Children.Add(headBorder);
        consultBody.Children.Add(draftBorder);
        consultBody.Children.Add(new ScrollViewer { Content = _consults, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Padding = new Thickness(4) });
        var consultBox = new Border { Child = consultBody, Height = 300, BorderBrush = B("#D1D5DB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8), Margin = new Thickness(6, 6, 6, 0), ClipToBounds = true };
        SetDock(consultBox, Dock.Top);
        Children.Add(consultBox);

        Children.Add(new ScrollViewer { Content = _results, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
        PaintDraftDate();
        RenderEmpty("검색어를 입력하세요", "고객·물건·계약을 한 번에 검색합니다");
        Loaded += async (_, _) => { _query.Focus(); await LoadConsultsAsync(); };
    }

    private static Button SmallButton(string text, string back, Action click)
    {
        // 기존 NeobotConsultationEditor hBtn: 12px · 700 · 높이 28 · 테두리 #ddd6fe · 글자 #6d28d9 · rounded 5
        var b = new Button { Content = text, FontSize = 12, FontWeight = FontWeights.Bold, Foreground = B("#6D28D9"), Background = B(back), BorderBrush = B("#DDD6FE"), Padding = new Thickness(10, 0, 10, 0), Height = 28, MinHeight = 0 };
        b.Click += (_, _) => click();
        return b;
    }

    private void PaintDraftDate() => _draftDate.Text = $"[{_draftAt:yyyy.MM.dd HH:mm}]";

    private void RenderEmpty(string line1, string? line2 = null)
    {
        _results.Children.Clear();
        var sp = new StackPanel { HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 40, 0, 0) };
        sp.Children.Add(new TextBlock { Text = "", FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), FontSize = 40, Foreground = B("#CBD5E1"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 0, 0, 8) });
        sp.Children.Add(new TextBlock { Text = line1, FontSize = 14, FontWeight = FontWeights.Bold, Foreground = B("#94A3B8"), HorizontalAlignment = HorizontalAlignment.Center });
        if (line2 is not null) sp.Children.Add(new TextBlock { Text = line2, FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = B("#94A3B8"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 4, 0, 0) });
        _results.Children.Add(sp);
    }

    private string? Q => string.IsNullOrWhiteSpace(_query.Text) ? null : _query.Text.Trim();

    private async Task SearchAsync()
    {
        await LoadConsultsAsync();
        if (Q is null) { RenderEmpty("검색어를 입력하세요", "고객·물건·계약을 한 번에 검색합니다"); return; }
        List<Row> rows = new();
        if (!await Dialogs.RunAsync(async () => rows = await _svc.SearchAsync(Q), "검색에 실패했습니다.")) return;
        if (Q.Count(char.IsDigit) >= 9 && string.IsNullOrEmpty(_draftPhone.Text)) _draftPhone.Text = Q;
        if (rows.Count == 0) { RenderEmpty("검색 결과가 없습니다"); return; }
        _results.Children.Clear();
        foreach (var r in rows) _results.Children.Add(ResultRow(r));
    }

    private FrameworkElement ResultRow(Row r)
    {
        var kind = r.Str("kind");
        var label = kind switch { "PT" => "물건", "CUST" => "고객", "PRE" => "가계약", _ => "계약" };
        var (bg, fg) = label switch { "물건" => ("#DBEAFE", "#1D4ED8"), "고객" => ("#DCFCE7", "#15803D"), "계약" => ("#FEF3C7", "#B45309"), _ => ("#FFE4E6", "#BE123C") };
        var type = kind == "PT" ? Catalog.PropertyTypeName(r.Str("type_code"))
            : kind == "CUST" ? Catalog.WantCategories.FirstOrDefault(o => o.Value == r.Str("type_code"))?.Label ?? r.Str("type_code")
            : r.Str("type_code");
        var sub = kind == "PT" ? Catalog.SaleDivLabel(r.Str("sub_info")) : r.Str("sub_info");
        var lines = new StackPanel();
        lines.Children.Add(new TextBlock { Text = string.Join(" · ", new[] { type, r.Str("addr") }.Where(x => !string.IsNullOrEmpty(x))), FontSize = 15, FontWeight = FontWeights.Bold, Foreground = B("#1F2937"), TextTrimming = TextTrimming.CharacterEllipsis });
        if (!string.IsNullOrEmpty(sub)) lines.Children.Add(new TextBlock { Text = sub + (r.Long("amount") is { } a && a > 0 ? $"  {a:#,0}만" : ""), FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = B("#475569"), TextTrimming = TextTrimming.CharacterEllipsis });
        var persons = r.Str("persons") ?? string.Join(" ", new[] { r.Str("name"), r.Str("phone") }.Where(x => !string.IsNullOrEmpty(x)));
        if (!string.IsNullOrEmpty(persons)) lines.Children.Add(new TextBlock { Text = persons, FontSize = 13, FontWeight = FontWeights.Bold, Foreground = B("#0F766E"), TextTrimming = TextTrimming.CharacterEllipsis });
        var row = new DockPanel();
        var badge = new Border { Background = B(bg), CornerRadius = new CornerRadius(6), Padding = new Thickness(8, 2, 8, 2), Margin = new Thickness(0, 1, 8, 0), VerticalAlignment = VerticalAlignment.Top, Child = new TextBlock { Text = label, FontSize = 13, FontWeight = FontWeights.ExtraBold, Foreground = B(fg) } };
        DockPanel.SetDock(badge, Dock.Left);
        row.Children.Add(badge);
        row.Children.Add(lines);
        var item = new Border { Child = row, Padding = new Thickness(12, 10, 12, 10), BorderBrush = B("#F1F5F9"), BorderThickness = new Thickness(0, 0, 0, 1), Background = Brushes.White, Cursor = Cursors.Hand };
        item.MouseEnter += (_, _) => item.Background = B("#F8FAFC");
        item.MouseLeave += (_, _) => item.Background = Brushes.White;
        item.MouseLeftButtonUp += async (_, _) => await OpenAsync(r);
        return item;
    }

    private async Task LoadConsultsAsync()
    {
        List<Row> rows = new();
        try { rows = await _svc.ConsultsAsync(Q); } catch { /* 표시만 */ }
        _consultCount.Text = $"{rows.Count}건";
        _consults.Children.Clear();
        foreach (var c in rows)
        {
            var tb = new TextBlock { TextWrapping = TextWrapping.Wrap, FontSize = 13, Margin = new Thickness(0, 1, 0, 1), Cursor = Cursors.Hand };
            tb.Inlines.Add(new System.Windows.Documents.Run($"[{(c.Str("itv_date") ?? "").Replace('-', '.')}] ") { Foreground = B("#64748B") });
            tb.Inlines.Add(new System.Windows.Documents.Run($"[{c.Str("reg_id")}] ") { Foreground = B("#3B82F6"), FontWeight = FontWeights.SemiBold });
            tb.Inlines.Add(new System.Windows.Documents.Run($"{c.Str("contact_name")} {c.Str("contact_phone")}".Trim() + " : ") { Foreground = B("#0F766E"), FontWeight = FontWeights.Bold });
            tb.Inlines.Add(new System.Windows.Documents.Run(c.Str("itv_content") ?? ""));
            var row = c;
            tb.MouseLeftButtonUp += async (_, e) =>
            {
                if (e.ClickCount < 1) return;
                var full = await _itv.GetAsync(row.Long("itv_no")!.Value);
                if (full is not null && Interviews.InterviewPage.Edit(_itv, full)) await LoadConsultsAsync();
            };
            _consults.Children.Add(tb);
        }
    }

    /// <summary>새 상담 저장 — 연락처가 고객 구입자·물건 소유자/임차인과 같으면 그 상담이력에도 연결(기존 네오봇과 같음)</summary>
    private async Task SaveConsultAsync()
    {
        if (string.IsNullOrWhiteSpace(_draftText.Text)) { Toast.Show("상담 내용을 입력하세요."); return; }
        if (string.IsNullOrWhiteSpace(_draftPhone.Text)) { Toast.Show("연락처를 입력하세요."); return; }
        var r = _itv.New();
        r["itv_date"] = LocalDate.Format(_draftAt);
        r["contact_phone"] = _draftPhone.Text.Trim();
        r["itv_content"] = _draftText.Text.Trim();
        if (await Dialogs.RunAsync(() => _itv.SaveAsync(r), "상담 저장에 실패했습니다."))
        {
            _draftText.Text = "";
            Toast.Success("저장되었습니다.");
            await LoadConsultsAsync();
        }
    }

    private async Task OpenAsync(Row row)
    {
        var id = row.Str("ref_id")!;
        switch (row.Str("kind"))
        {
            case "PT":
            {
                var svc = AppServices.Create((sp, s) => new PropertyService(sp, s));
                if (await svc.GetAsync(long.Parse(id)) is { } d) new Properties.PropertyEditWindow(svc, d).ShowDialog();
                break;
            }
            case "CUST":
            {
                var svc = AppServices.Create((sp, s) => new CustomerService(sp, s));
                if (await svc.GetAsync(long.Parse(id)) is { } d) new Customers.CustomerEditWindow(svc, d).ShowDialog();
                break;
            }
            default:
            {
                var svc = AppServices.Create((sp, s) => new ContractService(sp, s));
                if (await svc.GetAsync(id) is { } m) new Contracts.ContractEditorWindow(svc, m).ShowDialog();
                break;
            }
        }
        await SearchAsync();
    }
}

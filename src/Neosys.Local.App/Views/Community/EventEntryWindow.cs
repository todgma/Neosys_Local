using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Community;

/// <summary>
/// 미션문구 / 리뷰이벤트 — 기존 EventParticipationModal(새 창 720×82%).
///  참여형 이벤트(isParticipatory=Y) 중 제목에 '부동산의 성공 비결'이 있으면 리뷰이벤트, 없으면 미션문구.
///  열면 가장 최근 이벤트가 바로 열린다(여러 개면 ‹ 목록). 상세: 제목 + 내용(HTML) + 제출(리뷰 = 링크 글, 미션 = 파일 최대 5개·각 5MB).
///  제출은 서버(POST /api/events/entries)에 바로 저장되며 다시 제출하면 교체된다.
/// </summary>
public sealed class EventEntryWindow : Window
{
    private const string ReviewKey = "부동산의 성공 비결";
    private const string FileDiv = "SYFDV08";
    private const int MaxFiles = 5;
    private const long MaxBytes = 5 * 1024 * 1024;

    private readonly bool _review;

    /// <summary>리뷰이벤트 창이면 true, 미션문구 창이면 false</summary>
    public bool Review => _review;
    private readonly string _name;
    private List<Row>? _events;
    private Row? _sel;
    private readonly List<string> _files = new();
    private readonly TextBlock _title = new() { FontSize = 18, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), VerticalAlignment = VerticalAlignment.Center };
    private readonly Button _back = new() { Content = "‹", FontSize = 18, Padding = new Thickness(6, 0, 6, 0), BorderThickness = new Thickness(0), Background = Brushes.Transparent, ToolTip = "목록", Visibility = Visibility.Collapsed };
    private readonly ContentControl _body = new();

    public EventEntryWindow(bool review)
    {
        _review = review;
        _name = review ? "리뷰이벤트" : "미션문구";
        Title = _name;
        Width = 720;
        Height = Math.Min(820, SystemParameters.WorkArea.Height * 0.9);
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = Brushes.White;
        _title.Text = _name;

        _back.Click += (_, _) => ShowList();
        var hl = new StackPanel { Orientation = Orientation.Horizontal };
        hl.Children.Add(_back);
        hl.Children.Add(_title);
        var head = new Border { Child = hl, Background = Legacy.B("#F8FAFC"), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(16, 12, 16, 12) };
        var root = new DockPanel();
        DockPanel.SetDock(head, Dock.Top);
        root.Children.Add(head);
        root.Children.Add(_body);
        Content = root;
        _body.Content = Muted("불러오는 중…");
        Loaded += async (_, _) => await LoadAsync(keepSel: false);
    }

    private static TextBlock Muted(string text) => new() { Text = text, FontSize = 15, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#334155"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 40, 0, 0) };

    private async Task LoadAsync(bool keepSel)
    {
        try
        {
            var all = await AppServices.Server.GetEventListAsync(isPublic: true, isParticipatory: true, rows: 100);
            _events = all.Where(e => (e.Str("title") ?? "").Contains(ReviewKey) == _review).ToList();
        }
        catch (Exception ex) { _events = new(); Toast.Error("이벤트를 불러오지 못했습니다. " + ex.Message); }
        if (keepSel && _sel is not null) { ShowDetail(_events.FirstOrDefault(e => e.Long("eventId") == _sel.Long("eventId")) ?? _sel); return; }
        if (_events.Count > 0) ShowDetail(_events[0]);   // 가장 최근 자동 열기
        else ShowList();
    }

    private void ShowList()
    {
        _sel = null;
        _back.Visibility = Visibility.Collapsed;
        if (_events is null || _events.Count == 0) { _body.Content = Muted($"참여 가능한 {_name}가 없습니다."); return; }
        var sp = new StackPanel { Margin = new Thickness(18, 16, 18, 16) };
        foreach (var e in _events)
        {
            var ev = e;
            var dp = new DockPanel();
            var more = new TextBlock { Text = (_review ? "내용 보기" : "미션 보기") + " ›", FontSize = 13, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#4F46E5"), VerticalAlignment = VerticalAlignment.Center };
            DockPanel.SetDock(more, Dock.Right);
            dp.Children.Add(more);
            dp.Children.Add(new TextBlock { Text = ev.Str("title") ?? "", FontSize = 16, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), TextTrimming = TextTrimming.CharacterEllipsis });
            var b = new Border { Child = dp, Padding = new Thickness(16, 14, 16, 14), Margin = new Thickness(0, 0, 0, 10), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(10), Cursor = System.Windows.Input.Cursors.Hand, Background = Brushes.White };
            b.MouseLeftButtonUp += (_, _) => ShowDetail(ev);
            sp.Children.Add(b);
        }
        _body.Content = new ScrollViewer { Content = sp, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
    }

    private void ShowDetail(Row e)
    {
        _sel = e;
        _files.Clear();
        _back.Visibility = (_events?.Count ?? 0) > 1 ? Visibility.Visible : Visibility.Collapsed;
        var dp = new DockPanel { Margin = new Thickness(18, 16, 18, 16) };
        var title = new TextBlock { Text = e.Str("title") ?? "", FontSize = 20, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 10) };
        DockPanel.SetDock(title, Dock.Top);
        dp.Children.Add(title);

        // 제출 상자(아래)
        var box = new StackPanel();
        TextBox? review = null;
        var fileList = new StackPanel();
        if (_review)
        {
            box.Children.Add(new TextBlock { Text = "링크를 적어주세요", FontSize = 15, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 0, 0, 8) });
            review = new TextBox { AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, Height = 140, VerticalContentAlignment = VerticalAlignment.Top, FontSize = 14, FontWeight = FontWeights.SemiBold, Tag = "8" };
            Placeholder.Set(review, "링크를 입력하세요");
            box.Children.Add(review);
            box.Children.Add(new TextBlock { Text = "제출 후에도 다시 작성해 교체할 수 있습니다.", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B"), Margin = new Thickness(0, 8, 0, 0) });
        }
        else
        {
            var add = new Button { Content = "게시한 내용을 업로드해 주세요(최대 5개)", HorizontalAlignment = HorizontalAlignment.Left };
            add.Click += (_, _) => AddFiles(fileList);
            box.Children.Add(add);
            box.Children.Add(fileList);
            box.Children.Add(new TextBlock { Text = "제출 후에도 파일을 다시 첨부해 교체할 수 있습니다. (파일당 5MB 이하)", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B"), Margin = new Thickness(0, 8, 0, 0) });
        }
        var submit = new Button { Content = "제출하기", Style = (Style)Application.Current.FindResource("PrimaryButton"), FontSize = 16, FontWeight = FontWeights.ExtraBold, Padding = new Thickness(26, 8, 26, 8), HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 12, 0, 0) };
        submit.Click += async (_, _) => await SubmitAsync(submit, review);
        box.Children.Add(submit);
        var boxBorder = new Border { Child = box, BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(10), Padding = new Thickness(16, 14, 16, 14), Margin = new Thickness(0, 18, 0, 0) };
        DockPanel.SetDock(boxBorder, Dock.Bottom);
        dp.Children.Add(boxBorder);

        dp.Children.Add(new Border
        {
            BorderBrush = Legacy.B("#EEF1F5"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(10), Background = Legacy.B("#FAFAFA"), Padding = new Thickness(6),
            Child = new HtmlView { Html = e.Str("content") is { Length: > 0 } c ? c : $"<span style=\"color:#64748b\">{(_review ? "내용" : "미션 내용")}이 없습니다.</span>" },
        });
        _body.Content = dp;
    }

    private void AddFiles(StackPanel list)
    {
        var dlg = new Microsoft.Win32.OpenFileDialog { Multiselect = true, Title = "제출 파일 첨부", Filter = "이미지·PDF(*.jpg;*.jpeg;*.png;*.gif;*.pdf)|*.jpg;*.jpeg;*.png;*.gif;*.pdf|모든 파일|*.*" };
        if (!Dialogs.ShowFile(dlg)) return;
        foreach (var f in dlg.FileNames)
        {
            if (_files.Count >= MaxFiles) { Toast.Show($"최대 {MaxFiles}개까지 첨부할 수 있습니다."); break; }
            if (new FileInfo(f).Length > MaxBytes) { Toast.Error($"{Path.GetFileName(f)}: 파일 용량은 5MB를 초과할 수 없습니다."); continue; }
            if (!_files.Contains(f)) _files.Add(f);
        }
        RenderFiles(list);
    }

    private void RenderFiles(StackPanel list)
    {
        list.Children.Clear();
        foreach (var f in _files)
        {
            var path = f;
            var dp = new DockPanel { Margin = new Thickness(0, 6, 0, 0) };
            var del = new Button { Content = "삭제", Foreground = Legacy.B("#DC2626"), BorderBrush = Legacy.B("#FECACA"), Padding = new Thickness(10, 2, 10, 2) };
            del.Click += (_, _) => { _files.Remove(path); RenderFiles(list); };
            DockPanel.SetDock(del, Dock.Right);
            dp.Children.Add(del);
            dp.Children.Add(new TextBlock { Text = Path.GetFileName(path), FontSize = 14, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis });
            list.Children.Add(dp);
        }
    }

    private async Task SubmitAsync(Button submit, TextBox? review)
    {
        if (_sel?.Long("eventId") is not { } id) return;
        var s = AppServices.Session;
        if (_review && string.IsNullOrWhiteSpace(review?.Text)) { Toast.Error("링크를 입력하세요."); return; }
        if (!_review && _files.Count == 0) { Toast.Error("제출 파일을 등록하세요."); return; }
        submit.IsEnabled = false;
        submit.Content = "제출 중…";
        try
        {
            var metas = new List<Row>();
            foreach (var f in _files)
            {
                var ext = Path.GetExtension(f).ToLowerInvariant();
                var type = ext switch { ".png" => "image/png", ".jpg" or ".jpeg" => "image/jpeg", ".gif" => "image/gif", ".pdf" => "application/pdf", _ => null };
                metas.Add(await AppServices.Server.UploadToStorageAsync(FileDiv, Path.GetFileName(f), await File.ReadAllBytesAsync(f), type, MaxBytes));
            }
            await AppServices.Server.SubmitEventEntryAsync(id, s.OffNo, s.RtNo, s.UserId, s.RtNm, _review ? review!.Text.Trim() : null, metas);
            Toast.Success(_review ? "리뷰가 제출되었습니다." : "미션이 제출되었습니다.");
            await LoadAsync(keepSel: true);
        }
        catch (Exception ex) { Toast.Error(ex.Message is { Length: > 0 } m ? m : "제출에 실패했습니다."); }
        finally { submit.IsEnabled = true; submit.Content = "제출하기"; }
    }
}

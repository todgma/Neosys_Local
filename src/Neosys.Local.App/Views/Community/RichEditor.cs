using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Web.WebView2.Wpf;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Community;

/// <summary>
/// 게시글 리치 에디터 — 기존 CommunityBoard의 contentEditable + document.execCommand(굵게·밑줄·기울임·색·크기·날짜·특수문자).
/// WebView2 안의 편집 가능한 문서를 그대로 쓰므로 저장되는 HTML이 기존 웹 편집기와 같다.
/// WebView2를 못 쓰면(또는 버튼 점검 중이면) 글자 입력 칸으로 바꾸고 저장할 때 HTML로 바꾼다.
/// </summary>
public sealed class RichEditor : DockPanel
{
    private readonly WebView2 _web = new() { Visibility = Visibility.Collapsed };
    private readonly TextBox _fallback = new()
    {
        AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
        VerticalContentAlignment = VerticalAlignment.Top, FontSize = 14, Padding = new Thickness(8), Visibility = Visibility.Collapsed,
    };
    private bool _ready, _failed;

    private const string Page =
        "<!doctype html><html><head><meta charset=\"utf-8\"><style>" +
        "html,body{margin:0;height:100%;background:#fff}" +
        "body{box-sizing:border-box;padding:10px 12px;font-family:Pretendard,'Malgun Gothic','맑은 고딕',sans-serif;font-size:14px;line-height:1.7;color:#111827;outline:none;word-break:break-all}" +
        "body:empty:before{content:attr(data-ph);color:#94a3b8}" +
        "</style></head><body contenteditable=\"true\" data-ph=\"내용을 입력하세요.\"></body></html>";

    public RichEditor()
    {
        var toolbar = new WrapPanel { Margin = new Thickness(0, 0, 0, 6) };
        Button Tool(string text, Action click, Action<TextBlock>? style = null)
        {
            var t = new TextBlock { Text = text, FontSize = 13, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#374151") };
            style?.Invoke(t);
            var b = new Button { Content = t, Padding = new Thickness(8, 3, 8, 3), MinHeight = 0, MinWidth = 0, Margin = new Thickness(0, 0, 4, 0), Background = System.Windows.Media.Brushes.White, BorderBrush = Legacy.B("#CBD5E1") };
            b.Click += (_, _) => click();
            toolbar.Children.Add(b);
            return b;
        }
        void Sep() => toolbar.Children.Add(new Border { Width = 1, Height = 18, Background = Legacy.B("#E5E7EB"), Margin = new Thickness(2, 0, 6, 0) });

        Tool("B", () => Exec("bold"), t => t.FontWeight = FontWeights.ExtraBold).ToolTip = "굵게";
        Tool("U", () => Exec("underline"), t => t.TextDecorations = TextDecorations.Underline).ToolTip = "밑줄";
        Tool("I", () => Exec("italic"), t => t.FontStyle = FontStyles.Italic).ToolTip = "기울임";
        Sep();
        foreach (var (name, hex) in CommunityRules.Colors)
            Tool("가", () => Exec("foreColor", hex), t => t.Foreground = Legacy.B(hex)).ToolTip = name;
        Sep();
        Tool("크게", () => Exec("fontSize", "5"));
        Tool("보통", () => Exec("fontSize", "3"));
        Tool("작게", () => Exec("fontSize", "1"));
        Sep();
        Tool("날짜", () => Insert(CommunityRules.DateStamp(DateTime.Today)));
        var special = new ComboBox { MinWidth = 90, FontSize = 13 };
        special.Items.Add("특수문자");
        foreach (var c in CommunityRules.SpecialChars) special.Items.Add(c);
        special.SelectedIndex = 0;
        special.SelectionChanged += (_, _) =>
        {
            if (special.SelectedIndex <= 0) return;
            Insert((string)special.SelectedItem);
            special.SelectedIndex = 0;
        };
        toolbar.Children.Add(special);

        var bar = new Border { Child = toolbar, BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(5), Background = Legacy.B("#FAFAFA"), Padding = new Thickness(6, 6, 6, 0), Margin = new Thickness(0, 0, 0, 6) };
        SetDock(bar, Dock.Top);
        Children.Add(bar);
        var g = new Grid { MinHeight = 260 };
        g.Children.Add(_web);
        g.Children.Add(_fallback);
        Children.Add(new Border { Child = g, BorderBrush = Legacy.B("#CBD5E1"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(5) });
        Loaded += async (_, _) => await InitAsync();
    }

    private async Task InitAsync()
    {
        if (_ready || _failed) return;
        if (AuditHook.Active) { UseFallback(); return; }
        try
        {
            await _web.EnsureCoreWebView2Async(await WebViewEnv.GetAsync());
            _web.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
            // 편집 문서 밖으로 나가지 않게(붙여 넣은 링크를 눌러도 이동하지 않음)
            _web.CoreWebView2.NavigationStarting += (_, e) => { if (!e.Uri.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && e.Uri != "about:blank") e.Cancel = true; };
            _web.CoreWebView2.NewWindowRequested += (_, e) => e.Handled = true;
            _web.NavigateToString(Page);
            _ready = true;
            _web.Visibility = Visibility.Visible;
        }
        catch { UseFallback(); }
    }

    private void UseFallback()
    {
        _failed = true;
        _web.Visibility = Visibility.Collapsed;
        _fallback.Visibility = Visibility.Visible;
    }

    private void Exec(string cmd, string? val = null)
    {
        if (!_ready) return;   // 글자 입력 칸에서는 서식 없음
        _ = _web.ExecuteScriptAsync($"document.body.focus();document.execCommand({JsonSerializer.Serialize(cmd)},false,{(val is null ? "null" : JsonSerializer.Serialize(val))});");
        _web.Focus();
    }

    private void Insert(string text)
    {
        if (_ready)
        {
            _ = _web.ExecuteScriptAsync($"document.body.focus();document.execCommand('insertText',false,{JsonSerializer.Serialize(text)});");
            _web.Focus();
            return;
        }
        var at = _fallback.CaretIndex;
        _fallback.Text = _fallback.Text.Insert(at, text);
        _fallback.CaretIndex = at + text.Length;
        _fallback.Focus();
    }

    /// <summary>저장할 내용 HTML(기존 editorRef.innerHTML)</summary>
    public async Task<string> GetHtmlAsync()
    {
        if (!_ready) return CommunityRules.TextToHtml(_fallback.Text);
        var json = await _web.ExecuteScriptAsync("document.body.innerHTML");
        return JsonSerializer.Deserialize<string>(json) ?? "";
    }
}

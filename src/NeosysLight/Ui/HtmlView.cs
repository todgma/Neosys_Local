using System.IO;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace Neosys.Local.App.Ui;

/// <summary>WebView2 공통 환경 — 사용자 데이터는 %LOCALAPPDATA%\Neosys\WebView2(단일 exe 폴더를 더럽히지 않게). 앱 전체에서 하나만 만든다.</summary>
public static class WebViewEnv
{
    private static Task<CoreWebView2Environment>? _env;

    public static Task<CoreWebView2Environment> GetAsync() =>
        _env ??= CoreWebView2Environment.CreateAsync(null,
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "WebView2"));
}

/// <summary>
/// 편집기 HTML(색·이미지 포함 — 공지·이벤트·게시글 내용)을 그대로 보여 주는 칸. 기존 dangerouslySetInnerHTML 대신 WebView2.
/// 링크를 누르면 프로그램 안이 아니라 기본 브라우저로 연다. WebView2를 못 쓰면 글자만 보여 준다.
/// </summary>
public sealed class HtmlView : Grid
{
    private readonly WebView2 _web = new() { Visibility = Visibility.Collapsed };
    private readonly TextBox _fallback = new()
    {
        IsReadOnly = true, TextWrapping = TextWrapping.Wrap, BorderThickness = new Thickness(0), Background = System.Windows.Media.Brushes.Transparent,
        VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Visibility = Visibility.Collapsed, FontSize = 14,
    };
    private string _html = "";
    private bool _ready, _failed;

    public HtmlView()
    {
        Children.Add(_web);
        Children.Add(_fallback);
        Loaded += async (_, _) => await InitAsync();
    }

    private async Task InitAsync()
    {
        if (_ready || _failed) return;
        if (AuditHook.Active) { _failed = true; ShowFallback(); return; }   // 버튼 점검 중에는 브라우저를 띄우지 않는다
        try
        {
            await _web.EnsureCoreWebView2Async(await WebViewEnv.GetAsync());
            _web.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
            // 링크·새 창은 기본 브라우저로
            _web.CoreWebView2.NavigationStarting += (_, e) =>
            {
                if (e.Uri.StartsWith("http", StringComparison.OrdinalIgnoreCase)) { e.Cancel = true; Dialogs.OpenExternal(e.Uri); }
            };
            _web.CoreWebView2.NewWindowRequested += (_, e) => { e.Handled = true; Dialogs.OpenExternal(e.Uri); };
            _ready = true;
            _web.Visibility = Visibility.Visible;
            Render();
        }
        catch
        {
            _failed = true;
            ShowFallback();
        }
    }

    /// <summary>내용 HTML 설정(비면 '(내용 없음)')</summary>
    public string Html
    {
        get => _html;
        set { _html = value ?? ""; if (_ready) Render(); else if (_failed) ShowFallback(); }
    }

    private void Render()
    {
        var body = string.IsNullOrWhiteSpace(_html) ? "<span style=\"color:#94a3b8\">(내용 없음)</span>" : _html;
        _web.NavigateToString(
            "<!doctype html><html><head><meta charset=\"utf-8\"><style>" +
            "html,body{margin:0;padding:0;background:#fff}" +
            "body{font-family:Pretendard,'Malgun Gothic','맑은 고딕',sans-serif;font-size:14px;font-weight:500;line-height:1.8;color:#111827;padding:2px 4px;word-break:break-all}" +
            "img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%}a{color:#4f46e5}" +
            "</style></head><body>" + body + "</body></html>");
    }

    private void ShowFallback()
    {
        _web.Visibility = Visibility.Collapsed;
        _fallback.Visibility = Visibility.Visible;
        _fallback.Text = string.IsNullOrWhiteSpace(_html) ? "(내용 없음)" : HtmlToText(_html);
    }

    /// <summary>HTML → 글자(줄바꿈 태그는 줄바꿈으로)</summary>
    public static string HtmlToText(string html)
    {
        var s = System.Text.RegularExpressions.Regex.Replace(html, @"<(br|/p|/div|/li|/tr|/h\d)[^>]*>", "\n", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        s = System.Text.RegularExpressions.Regex.Replace(s, "<[^>]+>", "");
        return WebUtility.HtmlDecode(s).Trim();
    }
}

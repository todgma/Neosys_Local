using System.IO;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Office;

/// <summary>
/// 가입비 결제창 — 웹 결제 페이지(토스)를 프로그램 안 창(WebView2, 1040×800 — 기존 520의 두 배, 2026-10-21 요청)으로 연다(기존 Electron payment:open).
/// 결제 페이지가 문서 제목에 NEOSIS_PAYMENT_DONE/FAIL을 넣으면 창을 닫고 결과를 돌려준다. 그냥 닫으면 "closed".
/// WebView2를 쓸 수 없는 PC는 기본 브라우저로 열고 "external"을 돌려준다(결제 후 [결제 확인]으로 재확인 — 기존 폴백과 같음).
/// </summary>
public sealed class PaymentWindow : Window
{
    private readonly WebView2 _web = new();
    private readonly string _url;
    public string Result { get; private set; } = "closed";

    private PaymentWindow(string url)
    {
        _url = url;
        Title = "가입비 결제";
        Width = 1040;
        Height = 800;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Content = new Grid { Children = { _web } };
        Loaded += async (_, _) => await StartAsync();
    }

    private async Task StartAsync()
    {
        try
        {
            // 사용자 데이터(쿠키 등)는 %LOCALAPPDATA%\Neosys\WebView2 — 앱 공통 환경(Ui.WebViewEnv)
            await _web.EnsureCoreWebView2Async(await WebViewEnv.GetAsync());
            _web.CoreWebView2.DocumentTitleChanged += (_, _) =>
            {
                if (EntryFeeRules.ResultFromTitle(_web.CoreWebView2.DocumentTitle) is { } r)
                {
                    Result = r;
                    Close();
                }
            };
            _web.CoreWebView2.Navigate(_url);
        }
        catch (Exception ex)
        {
            // WebView2 런타임이 없거나 실패 → 기본 브라우저로
            Result = "external";
            Dialogs.OpenExternal(_url);
            Toast.Show("브라우저에서 결제를 진행한 뒤 \"결제 확인\"을 눌러주세요.");
            System.Diagnostics.Debug.WriteLine(ex);
            Close();
        }
    }

    /// <summary>결제창을 띄우고 결과("success" | "fail" | "closed" | "external")를 돌려준다</summary>
    public static string Show(Window? owner, string url)
    {
        if (AuditHook.Active) { AuditHook.Log("결제창", url); return "closed"; }
        var w = new PaymentWindow(url) { Owner = owner };
        w.ShowDialog();
        return w.Result;
    }
}

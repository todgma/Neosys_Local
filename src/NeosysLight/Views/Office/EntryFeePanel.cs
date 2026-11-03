using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Office;

/// <summary>
/// 사무실관리 허브의 [가입비 결제] 탭(대표만) — 기존 EntryFeePanel.
///  상태(결제 완료/미결제) · 금액(정가 350,000 → 할인가 165,000, 부가세 포함) · [결제 확인] [가입비 결제하기].
///  결제는 서버가 발급한 자동로그인 토큰으로 웹 결제 페이지(토스)를 프로그램 안 결제창에서 진행하고, 완료되면 상태를 다시 조회한다.
///  결제 오픈일(EntryFeeRules.PayOpenAt) 전에는 결제 버튼을 막는다 — 지금은 테스트 결제를 위해 제한 해제. 창으로 돌아오면 자동 재확인.
/// </summary>
public sealed class EntryFeePanel : ScrollViewer
{
    public event Action? Paid;

    private readonly Border _status = new() { CornerRadius = new CornerRadius(10), BorderThickness = new Thickness(1), Padding = new Thickness(14, 12, 14, 12), Margin = new Thickness(0, 0, 0, 16) };
    private readonly TextBlock _statusText = new() { FontSize = 15, FontWeight = FontWeights.ExtraBold };
    private readonly TextBlock _paidDt = new() { FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#334155"), Margin = new Thickness(10, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center };
    private readonly TextBlock _openNote = new() { Text = "11/01 이후 가입비 결제가 가능합니다.(선택)", FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#4F46E5"), HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 0, 0, 10) };
    private readonly Button _check = new() { Content = "결제 확인", FontWeight = FontWeights.Bold, Foreground = Legacy.B("#4F46E5"), BorderBrush = Legacy.B("#C7D2FE"), Padding = new Thickness(20, 9, 20, 9) };
    private readonly Button _pay = new() { Content = "가입비 결제하기", Style = (Style)Application.Current.FindResource("PrimaryButton"), FontWeight = FontWeights.ExtraBold, Padding = new Thickness(28, 9, 28, 9) };
    private bool _paid, _loading;

    public EntryFeePanel()
    {
        VerticalScrollBarVisibility = ScrollBarVisibility.Auto;
        Background = Legacy.B("#F9FAFB");
        var card = new StackPanel();
        card.Children.Add(new TextBlock { Text = "네오시스 가입비", FontSize = 20, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), Margin = new Thickness(0, 0, 0, 6) });
        card.Children.Add(new TextBlock { Text = "중개사무소 단위로 1회 결제하는 가입비입니다. 가입비 결제 후 상품가입 및 전체 메뉴 이용이 가능합니다.", FontSize = 15, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#334155"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 16) });

        var st = new StackPanel { Orientation = Orientation.Horizontal };
        st.Children.Add(_statusText);
        st.Children.Add(_paidDt);
        _status.Child = st;
        card.Children.Add(_status);

        // 금액: 가입비 350,000원 → 165,000원 [할인가] (부가세 포함)
        var amt = new WrapPanel { Margin = new Thickness(0, 0, 0, 6) };
        TextBlock T(string text, double size, string color, FontWeight w, bool strike = false) => new()
        {
            Text = text, FontSize = size, FontWeight = w, Foreground = Legacy.B(color), VerticalAlignment = VerticalAlignment.Bottom, Margin = new Thickness(0, 0, 10, 0),
            TextDecorations = strike ? TextDecorations.Strikethrough : null,
        };
        amt.Children.Add(T("가입비", 15, "#334155", FontWeights.Bold));
        amt.Children.Add(T($"{EntryFeeRules.OrigAmount:#,0}원", 18, "#94A3B8", FontWeights.Bold, strike: true));
        amt.Children.Add(T("→", 20, "#94A3B8", FontWeights.ExtraBold));
        amt.Children.Add(T($"{EntryFeeRules.Amount:#,0}원", 26, "#4F46E5", FontWeights.ExtraBold));
        amt.Children.Add(new Border
        {
            Background = Legacy.B("#FEF2F2"), BorderBrush = Legacy.B("#FECACA"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(6), Padding = new Thickness(8, 2, 8, 2),
            Margin = new Thickness(0, 0, 10, 4), VerticalAlignment = VerticalAlignment.Bottom,
            Child = new TextBlock { Text = "할인가", FontSize = 13, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#DC2626") },
        });
        amt.Children.Add(T("(부가세 포함)", 14, "#334155", FontWeights.SemiBold));
        card.Children.Add(amt);
        card.Children.Add(new TextBlock
        {
            Text = "· 결제 즉시 멤버십 활성화 및 프로그램 다운로드 가능\n· 결제는 브라우저(웹 결제창)에서 안전하게 진행됩니다 (자동 로그인)",
            FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#334155"), LineHeight = 24, Margin = new Thickness(0, 0, 0, 18),
        });
        card.Children.Add(_openNote);

        var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
        _check.Click += async (_, _) => await LoadAsync();
        _pay.Click += async (_, _) => await PayAsync();
        buttons.Children.Add(_check);
        buttons.Children.Add(_pay);
        card.Children.Add(buttons);

        Content = new Border
        {
            Margin = new Thickness(24), MaxWidth = 720, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Top,
            Background = Brushes.White, BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(14), Padding = new Thickness(26, 24, 26, 24),
            Child = card,
        };

        Loaded += async (_, _) =>
        {
            await LoadAsync();
            // 웹 결제 후 프로그램 창으로 돌아오면 자동 재확인(기존 window focus)
            if (Window.GetWindow(this) is { } w) w.Activated += OnActivated;
        };
        Unloaded += (_, _) => { if (Window.GetWindow(this) is { } w) w.Activated -= OnActivated; };
    }

    private async void OnActivated(object? sender, EventArgs e) { if (IsVisible && !_loading) await LoadAsync(); }

    private async Task LoadAsync()
    {
        var s = AppServices.Session;
        _loading = true;
        Render("상태 확인 중…");
        try
        {
            if (s.OffNo is { } off)
            {
                var r = await AppServices.Server.GetEntryFeeAsync(off);
                var was = _paid;
                _paid = r["paid"] is true || r.Str("paid") is "true" or "True";
                _paidDt.Text = _paid && r.Str("paidDt") is { Length: >= 10 } dt ? $"({dt[..10]})" : "";
                if (_paid && !was) Paid?.Invoke();
            }
            else _paid = false;
        }
        catch (Exception ex) { _paid = false; Toast.Error("가입비 상태를 확인하지 못했습니다. " + ex.Message); }
        finally { _loading = false; Render(null); }
    }

    private void Render(string? loadingText)
    {
        _statusText.Text = loadingText ?? (_paid ? "가입비 결제 완료" : "가입비 미결제");
        _statusText.Foreground = Legacy.B(_paid ? "#0F766E" : "#DC2626");
        _status.Background = Legacy.B(_paid ? "#ECFDF5" : "#FEF2F2");
        _status.BorderBrush = Legacy.B(_paid ? "#A7F3D0" : "#FECACA");
        var open = EntryFeeRules.IsPayOpen(DateTimeOffset.Now);
        _openNote.Visibility = !_paid && !open ? Visibility.Visible : Visibility.Collapsed;
        _pay.Visibility = _paid ? Visibility.Collapsed : Visibility.Visible;
        _pay.IsEnabled = open && loadingText is null;
        _pay.ToolTip = open ? null : "11/01 이후 가입비 결제가 가능합니다.";
        _check.IsEnabled = loadingText is null;
    }

    private async Task PayAsync()
    {
        if (!EntryFeeRules.IsPayOpen(DateTimeOffset.Now)) { Toast.Show("11/01 이후 가입비 결제가 가능합니다."); return; }
        _pay.IsEnabled = false;
        _pay.Content = "결제창 여는 중…";
        try
        {
            var token = await AppServices.Server.IssuePaymentTokenAsync(AppServices.Session.RtNo);
            var result = PaymentWindow.Show(Window.GetWindow(this), EntryFeeRules.PaymentUrl(token, inApp: true));
            if (result == "success") Toast.Success("가입비 결제가 완료되었습니다.");
            else if (result == "fail") Toast.Error("결제가 취소되었거나 실패했습니다.");
            await LoadAsync();
        }
        catch (Exception ex) { Toast.Error("결제창을 여는 데 실패했습니다. " + ex.Message); }
        finally { _pay.Content = "가입비 결제하기"; Render(null); }
    }
}

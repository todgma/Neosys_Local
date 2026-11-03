using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Office;

/// <summary>
/// 사무실관리 허브의 [상품가입] 탭(대표만) — 기존 MembershipSubscribeModal(page).
///  요금제 목록(요금제명 · 기기 n대 · 월요금+VAT · 총금액) → 누르면 기기 대수 설정 창(PC/모바일) → 아래 기기 분배 상자에서 재조정,
///  기본 대수 초과분은 1대당 '추가요금', 하단 상품금액 합계(부가세 포함) + [가입하기](결제 없음 — 서버 멤버십 적용).
///  이미 가입한 사무소는 현재 상품을 선택해 보여 주고 가입 버튼은 "이미 가입되어있습니다".
/// </summary>
public sealed class SubscribePanel : DockPanel
{
    public event Action? Subscribed;

    private List<MembershipPlan> _plans = new();
    private long _addFee;
    private MembershipPlan? _sel;
    private int _pc, _mob;
    private Row? _current;
    private bool _member;

    private readonly StackPanel _list = new();
    private readonly StackPanel _alloc = new();
    private readonly TextBlock _note = new() { FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#64748B"), Margin = new Thickness(0, 0, 0, 10) };
    private readonly TextBlock _grand = new() { FontSize = 24, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#4F46E5"), VerticalAlignment = VerticalAlignment.Bottom };
    private readonly Button _subscribe = new() { Content = "가입하기", Style = (Style)Application.Current.FindResource("PrimaryButton"), FontWeight = FontWeights.ExtraBold, Padding = new Thickness(24, 7, 24, 7) };

    public SubscribePanel()
    {
        Background = Brushes.White;
        // 하단: 상품금액 합계 + [닫기][가입하기]
        var foot = new DockPanel();
        var buttons = new StackPanel { Orientation = Orientation.Horizontal };
        var close = new Button { Content = "닫기", Padding = new Thickness(18, 7, 18, 7) };
        close.Click += (_, _) => Window.GetWindow(this)?.Close();
        _subscribe.Click += async (_, _) => await SubscribeAsync();
        buttons.Children.Add(close);
        buttons.Children.Add(_subscribe);
        SetDock(buttons, Dock.Right);
        foot.Children.Add(buttons);
        var sum = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        sum.Children.Add(new TextBlock { Text = "상품금액 합계", FontSize = 15, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#334155"), VerticalAlignment = VerticalAlignment.Bottom, Margin = new Thickness(0, 0, 10, 3) });
        sum.Children.Add(_grand);
        foot.Children.Add(sum);
        var footBorder = new Border { Child = foot, Background = Legacy.B("#F8FAFC"), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 0), Padding = new Thickness(20, 14, 20, 14) };
        SetDock(footBorder, Dock.Bottom);
        Children.Add(footBorder);

        var body = new StackPanel { Margin = new Thickness(20, 18, 20, 18) };
        body.Children.Add(_note);
        body.Children.Add(_list);
        body.Children.Add(_alloc);
        Children.Add(new ScrollViewer { Content = body, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });

        Loaded += async (_, _) => await LoadAsync();
    }

    private async Task LoadAsync()
    {
        var s = AppServices.Session;
        _note.Text = "상품을 불러오는 중...";
        try
        {
            (_plans, _addFee) = MembershipPricing.Split(await AppServices.Server.GetMembershipProductsAsync());
            _current = s.OffNo is { } off ? await AppServices.Server.GetMembershipAsync(off) : null;
        }
        catch (Exception ex) { _plans = new(); Toast.Error("상품 조회 실패: " + ex.Message); }
        _member = _current is not null;
        // 현재 가입 상품을 선택 상태로(기존과 같음)
        if (_current?.Long("prodId") is { } pid && _plans.FirstOrDefault(p => p.ProdId == pid) is { } cur)
        {
            _sel = cur;
            _pc = (int)(_current.Long("pcCnt") ?? cur.PcCnt);
            _mob = (int)(_current.Long("mobCnt") ?? cur.MobCnt);
        }
        Render();
    }

    private static string Won(long n) => n.ToString("#,0");

    private void Render()
    {
        _note.Text = _plans.Count == 0 ? "가입 가능한 상품이 없습니다."
            : _member ? "현재 가입 상품이 선택되어 표시됩니다. (변경은 관리자에게 문의)" : "요금제를 선택하면 PC·모바일 대수 설정 창이 열립니다.";
        _list.Children.Clear();
        var q = _sel is null ? null : MembershipPricing.Calc(_sel, _pc, _mob, _addFee);
        var over = q is { Extra: > 0 };
        foreach (var p in _plans)
        {
            var on = _sel?.ProdId == p.ProdId && !over;
            var isCurrent = _current?.Long("prodId") == p.ProdId;
            var remain = isCurrent ? _current!.Long("remainDays") : null;
            _list.Children.Add(PlanRow(p.ProdName, p.Devices, p.Price, on, isCurrent, remain, () => Pick(p)));
        }
        // 기본 대수 초과 시 '요금제 +@' 합성 행(항상 선택 상태 — 누르면 대수 재설정)
        if (over && _sel is { } sel) _list.Children.Add(PlanRow(q!.PlanLabel, q.Total, q.Grand, true, false, null, () => Pick(sel)));

        _alloc.Children.Clear();
        if (_sel is { } s2 && q is not null)
        {
            var box = new StackPanel();
            var head = new DockPanel { Margin = new Thickness(0, 0, 0, 12) };
            var total = new TextBlock { FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#334155"), VerticalAlignment = VerticalAlignment.Center };
            total.Inlines.Add("선택 합계 ");
            total.Inlines.Add(new System.Windows.Documents.Run($"{q.Total}대") { Foreground = Legacy.B("#4F46E5"), FontWeight = FontWeights.ExtraBold });
            total.Inlines.Add(new System.Windows.Documents.Run($" / 기본 {s2.Devices}대") { Foreground = Legacy.B("#64748B"), FontWeight = FontWeights.SemiBold });
            SetDock(total, Dock.Right);
            head.Children.Add(total);
            head.Children.Add(new TextBlock { Text = $"기기 분배 — {s2.ProdName}", FontSize = 16, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#4F46E5") });
            box.Children.Add(head);
            var steppers = new WrapPanel();
            steppers.Children.Add(Stepper("PC", _pc, v => { _pc = v; Render(); }, _member));
            steppers.Children.Add(Stepper("모바일", _mob, v => { _mob = v; Render(); }, _member));
            box.Children.Add(steppers);
            var fee = new TextBlock { FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B"), Margin = new Thickness(0, 10, 0, 0) };
            fee.Inlines.Add($"기본 {s2.Devices}대 초과 시 1대당 ");
            fee.Inlines.Add(new System.Windows.Documents.Run($"{Won(_addFee)}원") { Foreground = Legacy.B("#DC2626"), FontWeight = FontWeights.Bold });
            fee.Inlines.Add("(추가요금)");
            box.Children.Add(fee);
            if (q.Extra > 0)
                box.Children.Add(new TextBlock { Text = $"추가요금 {q.Extra}대 × {Won(_addFee)}원 = {Won(q.ExtraFee)}원", FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#DC2626"), Margin = new Thickness(0, 6, 0, 0) });
            _alloc.Children.Add(new Border
            {
                Margin = new Thickness(0, 16, 0, 0), Padding = new Thickness(18, 16, 18, 16), CornerRadius = new CornerRadius(12),
                BorderBrush = Legacy.B("#4F46E5"), BorderThickness = new Thickness(2), Background = Legacy.B("#EEF2FF"), Child = box,
            });
        }

        var grand = q?.Grand ?? 0;
        _grand.Inlines.Clear();
        _grand.Inlines.Add($"{Won(grand + MembershipPricing.Vat(grand))}원");
        _grand.Inlines.Add(new System.Windows.Documents.Run(" (부가세포함)") { FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B") });
        _subscribe.Content = _member ? "이미 가입되어있습니다" : "가입하기";
        _subscribe.Background = Legacy.B(_member ? "#059669" : "#4F46E5");
        _subscribe.IsEnabled = !_member && _sel is not null;
    }

    /// <summary>요금제 한 줄(요금제명 · [현재 가입중] · 기기 n대 · 월요금+VAT / 총금액 · ✓)</summary>
    private static Border PlanRow(string name, int devices, long price, bool on, bool isCurrent, long? remainDays, Action click)
    {
        var dp = new DockPanel();
        var right = new StackPanel { HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(14, 0, 0, 0) };
        right.Children.Add(new TextBlock { Text = $"{Won(price)}원/월 + VAT({Won(MembershipPricing.Vat(price))}원)", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B"), HorizontalAlignment = HorizontalAlignment.Right });
        var tot = new TextBlock { FontSize = 17, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#4F46E5"), HorizontalAlignment = HorizontalAlignment.Right };
        tot.Inlines.Add($"총금액 {Won(price + MembershipPricing.Vat(price))}원");
        tot.Inlines.Add(new System.Windows.Documents.Run(" (부가세포함)") { FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#64748B") });
        right.Children.Add(tot);
        if (on)
        {
            var check = new TextBlock { Text = "✓", FontSize = 18, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#4F46E5"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 0, 0) };
            SetDock(check, Dock.Right);
            dp.Children.Add(check);
        }
        SetDock(right, Dock.Right);
        dp.Children.Add(right);
        var left = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        left.Children.Add(new TextBlock { Text = name, MinWidth = 96, FontSize = 16, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), Margin = new Thickness(0, 0, 14, 0) });
        if (isCurrent)
            left.Children.Add(new Border
            {
                Background = Legacy.B("#D1FAE5"), BorderBrush = Legacy.B("#6EE7B7"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(999), Padding = new Thickness(8, 2, 8, 2), Margin = new Thickness(0, 0, 14, 0),
                Child = new TextBlock { Text = "현재 가입중" + (remainDays is { } d ? $" · {d}일 남음" : ""), FontSize = 13, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#047857") },
            });
        left.Children.Add(new TextBlock { Text = $"기기 {devices}대 (PC + 모바일)", FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#475569") });
        dp.Children.Add(left);
        var b = new Border
        {
            Child = dp, Padding = new Thickness(16, 12, 16, 12), Margin = new Thickness(0, 0, 0, 8), CornerRadius = new CornerRadius(10), Cursor = System.Windows.Input.Cursors.Hand,
            BorderThickness = new Thickness(on || isCurrent ? 2 : 1),
            BorderBrush = Legacy.B(on ? "#4F46E5" : isCurrent ? "#6EE7B7" : "#E5E7EB"),
            Background = Legacy.B(on ? "#EEF2FF" : isCurrent ? "#F0FDF4" : "#FFFFFF"),
        };
        b.MouseLeftButtonUp += (_, _) => click();
        return b;
    }

    private static FrameworkElement Stepper(string label, int value, Action<int> set, bool disabled = false)
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 28, 0) };
        sp.Children.Add(new TextBlock { Text = label, Width = 56, FontSize = 15, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#334155"), VerticalAlignment = VerticalAlignment.Center });
        Button B(string t, Action a) { var b = new Button { Content = t, Width = 30, Height = 30, MinHeight = 0, Padding = new Thickness(0), IsEnabled = !disabled, ToolTip = t == "－" ? "감소" : "증가" }; b.Click += (_, _) => a(); return b; }
        sp.Children.Add(B("－", () => set(Math.Max(0, value - 1))));
        sp.Children.Add(new TextBlock { Text = value.ToString(), MinWidth = 34, TextAlignment = TextAlignment.Center, FontSize = 16, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#0F172A"), VerticalAlignment = VerticalAlignment.Center });
        sp.Children.Add(B("＋", () => set(value + 1)));
        sp.Children.Add(new TextBlock { Text = "대", FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#334155"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6, 0, 0, 0) });
        return sp;
    }

    /// <summary>요금제 선택 → 기기 대수 설정 창(기본값 = 상품 기본 PC/모바일). [확인]해야 선택 확정</summary>
    private void Pick(MembershipPlan p)
    {
        if (_member) { Toast.Show("현재 가입 상품 변경은 관리자에게 문의하세요."); return; }
        int pc = p.PcCnt, mob = p.MobCnt;
        var body = new StackPanel { Margin = new Thickness(20, 18, 20, 18) };
        var info = new TextBlock { FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#334155"), Margin = new Thickness(0, 0, 0, 14), TextWrapping = TextWrapping.Wrap, Text = $"PC와 모바일 대수를 각각 설정하세요. (기본 PC,모바일 합계 {p.Devices}대)" };
        var steppers = new StackPanel();
        var sum = new TextBlock { FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#334155"), Margin = new Thickness(0, 14, 0, 0) };
        var ok = new Button { Content = "확인", Style = (Style)Application.Current.FindResource("PrimaryButton"), FontWeight = FontWeights.ExtraBold, MinWidth = 80, IsDefault = true };
        void Redraw()
        {
            steppers.Children.Clear();
            steppers.Children.Add(Stepper("PC", pc, v => { pc = v; Redraw(); }));
            steppers.Children.Add(new Border { Height = 14 });
            steppers.Children.Add(Stepper("모바일", mob, v => { mob = v; Redraw(); }));
            var over = Math.Max(0, pc + mob - p.Devices);
            sum.Inlines.Clear();
            sum.Inlines.Add($"선택 합계 {pc + mob}대");
            if (over > 0) sum.Inlines.Add(new System.Windows.Documents.Run($"  · 기본 {p.Devices}대 초과 {over}대(추가요금)") { Foreground = Legacy.B("#DC2626") });
            ok.IsEnabled = pc + mob > 0;
        }
        Redraw();
        body.Children.Add(info);
        body.Children.Add(steppers);
        body.Children.Add(sum);
        var cancel = new Button { Content = "취소", MinWidth = 80, IsCancel = true };
        var bar = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
        bar.Children.Add(cancel);
        bar.Children.Add(ok);
        var root = new DockPanel();
        var foot = new Border { Child = bar, Background = Legacy.B("#F8FAFC"), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 0), Padding = new Thickness(20, 12, 20, 12) };
        SetDock(foot, Dock.Bottom);
        root.Children.Add(foot);
        root.Children.Add(body);
        var w = new Window
        {
            Title = $"기기 대수 설정 — {p.ProdName}", Width = 440, SizeToContent = SizeToContent.Height, ResizeMode = ResizeMode.NoResize,
            Owner = Window.GetWindow(this), WindowStartupLocation = WindowStartupLocation.CenterOwner, Content = root,
        };
        ok.Click += (_, _) => w.DialogResult = true;
        if (w.ShowDialog() != true) return;
        _sel = p;
        _pc = pc;
        _mob = mob;
        Render();
    }

    private async Task SubscribeAsync()
    {
        var s = AppServices.Session;
        if (_member) { Toast.Error("이미 가입되어있습니다."); return; }
        if (_sel is not { } sel) { Toast.Error("상품을 선택하세요."); return; }
        if (s.OffNo is not { } off) { Toast.Error("사무소 정보가 없어 가입할 수 없습니다."); return; }
        if (_pc + _mob <= 0) { Toast.Error("기기 수를 1대 이상 설정하세요."); return; }
        var q = MembershipPricing.Calc(sel, _pc, _mob, _addFee);
        if (!Dialogs.Confirm($"{q.PlanLabel} · 기기 {q.Total}대\n합계 {Won(q.GrandWithVat)}원(부가세포함)으로 가입합니다. 계속하시겠습니까?")) return;
        _subscribe.IsEnabled = false;
        _subscribe.Content = "가입 중...";
        try
        {
            await AppServices.Server.SubscribeMembershipAsync(off, sel.ProdId, MembershipPricing.Memo(q, _pc, _mob), s.UserId);
            Toast.Success("상품에 가입되었습니다.");
            Subscribed?.Invoke();
            await LoadAsync();
        }
        catch (Exception ex) { Toast.Error("가입에 실패했습니다. " + ex.Message); Render(); }
    }
}

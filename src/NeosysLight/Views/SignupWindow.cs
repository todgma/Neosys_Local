using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views;

/// <summary>
/// 회원가입 — 기존 SignupPage(대표자만 가입). 서버 API로 바로 가입한다(POST /api/realestaters, 로컬 DB 없음).
/// 추천인 코드는 [확인]으로 추천인을 확인해야 보낼 수 있고, 서버가 가입 처리 중 referral_benefits에 추천인 행을 넣는다.
/// 기존의 '중개사 조회' 자동입력은 옮기지 않았다(직접 입력).
/// </summary>
public sealed class SignupWindow : Window
{
    private static readonly string[] Domains = { "naver.com", "gmail.com", "daum.net", "hanmail.net", "nate.com", "kakao.com", "outlook.com" };

    private readonly SignupForm _form = new();
    private readonly TextBox _rtNm = Input("이름"), _rtTel = Input("010-1234-5678"), _id = Input("아이디 (최소 4자)"), _emailLocal = Input("이메일");
    private readonly ComboBox _emailDomain = new() { IsEditable = true, Height = 30, VerticalContentAlignment = VerticalAlignment.Center };
    private readonly PasswordBox _pw = new() { Height = 30, VerticalContentAlignment = VerticalAlignment.Center }, _pwConfirm = new() { Height = 30, VerticalContentAlignment = VerticalAlignment.Center };
    private readonly RadioButton _refNone = new() { Content = "없음", IsChecked = true, GroupName = "ref", VerticalAlignment = VerticalAlignment.Center };
    private readonly RadioButton _refYes = new() { Content = "있음", GroupName = "ref", VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(16, 0, 0, 0) };
    private readonly TextBox _refCode = Input("추천인 코드");
    private readonly Button _refCheck = Btn("확인"), _idCheck = Btn("중복확인");
    private readonly Grid _refRow = new() { Margin = new Thickness(0, 4, 0, 0), Visibility = Visibility.Collapsed };
    private readonly TextBlock _refHint = new() { FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#DC2626"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(16, 0, 0, 0), Text = "(추천인 코드는 회원가입 후 수정 불가합니다)" };
    private readonly TextBlock _refState = new() { FontSize = 13, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 4, 0, 0), Visibility = Visibility.Collapsed };
    private readonly TextBox _offNm = Input("사무소명"), _offTel = Input("사무소 전화"), _offAddr = Input("주소 검색을 누르거나 직접 입력하세요"), _offRegNo = Input("개설등록번호"), _bizNo = Input("사업자등록번호");
    private readonly TextBlock _error = new() { Foreground = Legacy.B("#DC2626"), FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center, TextWrapping = TextWrapping.Wrap };
    private readonly Button _submit;
    private string? _openPath, _bizPath;

    /// <summary>가입에 성공한 아이디(취소하면 null)</summary>
    public string? CreatedId { get; private set; }

    public SignupWindow()
    {
        Title = "회원가입";
        Width = 780;
        Height = Math.Min(720, SystemParameters.WorkArea.Height - 40);
        MinWidth = 640;
        MinHeight = 520;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = Brushes.White;

        var head = new StackPanel();
        head.Children.Add(new TextBlock { Text = "회원가입", FontSize = 18, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827") });
        head.Children.Add(new TextBlock { Text = "중개사무소 대표자만 가입 가능합니다. 직원은 로그인 후 등록 가능합니다.", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#334155"), Margin = new Thickness(0, 2, 0, 0) });
        var headBorder = new Border { Child = head, BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(32, 12, 32, 12) };
        DockPanel.SetDock(headBorder, Dock.Top);

        var cancel = new Button { Content = "취소", Padding = new Thickness(22, 6, 22, 6), Margin = new Thickness(10, 0, 0, 0) };
        cancel.Click += (_, _) => Close();
        _submit = new Button { Content = "회원가입", Style = (Style)FindResource("PrimaryButton"), Padding = new Thickness(28, 6, 28, 6), Margin = new Thickness(10, 0, 0, 0) };
        _submit.Click += async (_, _) => await SubmitAsync();
        var foot = new DockPanel();
        DockPanel.SetDock(_submit, Dock.Right);
        DockPanel.SetDock(cancel, Dock.Right);
        foot.Children.Add(_submit);
        foot.Children.Add(cancel);
        foot.Children.Add(_error);
        var footBorder = new Border { Child = foot, Background = Legacy.B("#F8FAFC"), BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 0), Padding = new Thickness(32, 10, 32, 10) };
        DockPanel.SetDock(footBorder, Dock.Bottom);

        var root = new DockPanel();
        root.Children.Add(headBorder);
        root.Children.Add(footBorder);
        root.Children.Add(new ScrollViewer { VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Content = Body() });
        Content = root;

        _id.TextChanged += (_, _) => PaintId();
        _refCode.TextChanged += (_, _) => PaintReferral();
        _refNone.Checked += (_, _) => PaintReferral();
        _refYes.Checked += (_, _) => PaintReferral();
        _idCheck.Click += async (_, _) => await CheckIdAsync();
        _refCheck.Click += async (_, _) => await CheckReferralAsync();
        Loaded += (_, _) => _rtNm.Focus();
    }

    /// <summary>추천인 '있음'을 고른 상태(화면 캡처용)</summary>
    internal void DevSelectReferral() => _refYes.IsChecked = true;

    private FrameworkElement Body()
    {
        foreach (var d in Domains) _emailDomain.Items.Add(d);
        _emailDomain.Text = Domains[0];

        var sp = new StackPanel { Margin = new Thickness(32, 12, 32, 16) };
        sp.Children.Add(Section("대표 정보"));
        sp.Children.Add(Pair(("이름 *", _rtNm), ("휴대폰번호 *", _rtTel)));
        sp.Children.Add(Row("아이디 *", WithButton(_id, _idCheck)));

        var email = new Grid();
        email.ColumnDefinitions.Add(new ColumnDefinition());
        email.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        email.ColumnDefinitions.Add(new ColumnDefinition());
        var at = new TextBlock { Text = "@", FontWeight = FontWeights.Bold, Foreground = Legacy.B("#64748B"), Margin = new Thickness(6, 0, 6, 0), VerticalAlignment = VerticalAlignment.Center };
        Grid.SetColumn(at, 1);
        Grid.SetColumn(_emailDomain, 2);
        email.Children.Add(_emailLocal);
        email.Children.Add(at);
        email.Children.Add(_emailDomain);
        sp.Children.Add(Row("이메일 *", email));
        sp.Children.Add(Pair(("비밀번호 *", _pw), ("비밀번호 확인 *", _pwConfirm)));

        var opt = new StackPanel { Orientation = Orientation.Horizontal, MinHeight = 30 };
        opt.Children.Add(_refNone);
        opt.Children.Add(_refYes);
        opt.Children.Add(_refHint);
        var refPanel = new StackPanel();
        refPanel.Children.Add(opt);
        var refInput = WithButton(_refCode, _refCheck);
        _refRow.Children.Add(refInput);
        refPanel.Children.Add(_refRow);
        refPanel.Children.Add(_refState);
        sp.Children.Add(Row("추천인 코드", refPanel));

        sp.Children.Add(Section("사무소 정보"));
        sp.Children.Add(Pair(("사무소명 *", _offNm), ("사무소 전화 *", _offTel)));
        var addrBtn = Btn("주소 검색");
        addrBtn.Click += (_, _) =>
        {
            if (RegionPicker.Pick(false, "주소 검색") is not { } p) return;
            _offAddr.Text = string.Join(" ", new[] { p.Str("addr1"), p.Str("addr2"), p.Str("addr3") }.Where(x => !string.IsNullOrWhiteSpace(x))) + " ";
            _offAddr.Focus();
            _offAddr.CaretIndex = _offAddr.Text.Length;
        };
        sp.Children.Add(Row("사무소 소재지 *", WithButton(_offAddr, addrBtn)));
        sp.Children.Add(Pair(("개설등록번호 *", _offRegNo), ("사업자등록번호 *", _bizNo)));
        sp.Children.Add(Row("개설등록증", FilePicker(p => _openPath = p)));
        sp.Children.Add(Row("사업자등록증", FilePicker(p => _bizPath = p)));
        return sp;
    }

    // ---------------- 확인 ----------------

    private void PaintId()
    {
        var ok = _form.CheckedId is not null && _form.CheckedId == _id.Text.Trim();
        _idCheck.Content = ok ? "확인완료" : "중복확인";
        _idCheck.Foreground = ok ? Legacy.B("#16A34A") : Legacy.B("#111827");
    }

    private void PaintReferral()
    {
        var yes = _refYes.IsChecked == true;
        _refRow.Visibility = _refState.Visibility = yes ? Visibility.Visible : Visibility.Collapsed;
        _refHint.Visibility = yes ? Visibility.Collapsed : Visibility.Visible;
        var ok = _form.CheckedReferralCode is not null && _form.CheckedReferralCode == _refCode.Text.Trim();
        _refCheck.Content = ok ? "확인완료" : "확인";
        _refCheck.Foreground = ok ? Legacy.B("#16A34A") : Legacy.B("#111827");
        _refState.Foreground = ok ? Legacy.B("#16A34A") : Legacy.B("#334155");
        _refState.Text = ok ? "추천인 확인 완료" : "추천인 코드 입력 후 [확인]을 눌러 검증해야 가입할 수 있습니다.";
    }

    private async Task CheckIdAsync()
    {
        var id = _id.Text.Trim();
        if (id.Length < 4) { Dialogs.Warn(id.Length == 0 ? "아이디를 입력해주세요." : "아이디는 최소 4자 이상이어야 합니다.", "회원가입"); return; }
        _idCheck.IsEnabled = false;
        try
        {
            if (await AppServices.Server.IsIdAvailableAsync(id))
            {
                _form.CheckedId = id;
                Toast.Success("사용 가능한 아이디입니다.");
            }
            else
            {
                _form.CheckedId = null;
                Dialogs.Warn("이미 사용중인 아이디입니다.", "회원가입");
            }
        }
        catch (Exception ex)
        {
            _form.CheckedId = null;
            Dialogs.Error("중복확인 중 오류가 발생했습니다.\n" + ex.Message);
        }
        finally
        {
            _idCheck.IsEnabled = true;
            PaintId();
        }
    }

    private async Task CheckReferralAsync()
    {
        var code = _refCode.Text.Trim();
        if (code.Length == 0) { Dialogs.Warn("추천인 코드를 입력해주세요.", "회원가입"); return; }
        _refCheck.IsEnabled = false;
        try
        {
            _form.CheckedReferralCode = null;
            var info = await AppServices.Server.GetReferralInfoAsync(code);
            if (info is null) Dialogs.Warn("확인되지 않는 추천인코드입니다.", "회원가입");
            else if (Dialogs.Confirm($"아래 추천인이 맞습니까?\n\n중개사무소명: {info.Str("offNm") ?? "-"}\n대표자명: {info.Str("rtNm") ?? "-"}", "추천인 확인"))
                _form.CheckedReferralCode = code;
        }
        catch (Exception ex) { Dialogs.Error("추천인 코드를 확인하지 못했습니다.\n" + ex.Message); }
        finally
        {
            _refCheck.IsEnabled = true;
            PaintReferral();
        }
    }

    // ---------------- 가입 ----------------

    private async Task SubmitAsync()
    {
        var f = _form;
        f.RtNm = _rtNm.Text; f.RtTel = _rtTel.Text; f.Id = _id.Text; f.Pw = _pw.Password; f.PwConfirm = _pwConfirm.Password;
        f.Email = _emailLocal.Text.Trim().Length == 0 ? "" : $"{_emailLocal.Text.Trim()}@{_emailDomain.Text.Trim()}";
        f.HasReferral = _refYes.IsChecked == true; f.ReferralCode = _refCode.Text;
        f.OffNm = _offNm.Text; f.OffTel = _offTel.Text; f.OffAddr = _offAddr.Text; f.OffRegNo = _offRegNo.Text; f.BizNo = _bizNo.Text;
        _error.Text = SignupRules.Validate(f) ?? "";
        if (_error.Text.Length > 0) return;

        _submit.IsEnabled = false;
        _submit.Content = "가입 중…";
        try
        {
            f.OpenFile = await UploadAsync(SignupRules.OpenFileDiv, _openPath);
            f.BizFile = await UploadAsync(SignupRules.BizFileDiv, _bizPath);
            await AppServices.Server.SignUpAsync(SignupRules.BuildRequest(f));
            CreatedId = f.Id.Trim();
            Dialogs.Info("회원가입이 완료되었습니다.\n로그인 후 이용해 주세요.", "회원가입");
            Close();
        }
        catch (Exception ex)
        {
            _error.Text = ex.Message;
        }
        finally
        {
            _submit.IsEnabled = true;
            _submit.Content = "회원가입";
        }
    }

    private static async Task<Neosys.Local.Data.Row?> UploadAsync(string fileDiv, string? path)
    {
        if (path is null) return null;
        var name = Path.GetFileName(path);
        return await AppServices.Server.UploadToStorageAsync(fileDiv, name, await File.ReadAllBytesAsync(path), SignupRules.ContentType(name));
    }

    // ---------------- 도우미 ----------------

    private static TextBox Input(string placeholder)
    {
        var tb = new TextBox { Height = 30, VerticalContentAlignment = VerticalAlignment.Center };
        Placeholder.Set(tb, placeholder);
        return tb;
    }

    private static Button Btn(string text) => new() { Content = text, Padding = new Thickness(12, 3, 12, 3), Margin = new Thickness(6, 0, 0, 0), MinWidth = 76 };

    private static TextBlock Section(string text) => new() { Text = text, FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827"), Margin = new Thickness(0, 10, 0, 6) };

    private static FrameworkElement Row(string label, FrameworkElement input)
    {
        var dock = new DockPanel { Margin = new Thickness(0, 5, 0, 5) };
        dock.Children.Add(Caption(label));
        dock.Children.Add(input);
        return dock;
    }

    private static TextBlock Caption(string label)
    {
        var tb = new TextBlock { Width = 112, FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#111827"), Margin = new Thickness(0, 6, 0, 0) };
        tb.Inlines.Add(label.TrimEnd('*', ' '));
        if (label.EndsWith('*')) tb.Inlines.Add(new System.Windows.Documents.Run(" *") { Foreground = Legacy.B("#DC2626") });
        DockPanel.SetDock(tb, Dock.Left);
        return tb;
    }

    private static FrameworkElement Pair((string Label, FrameworkElement Input) a, (string Label, FrameworkElement Input) b)
    {
        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition());
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(16) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        var left = Row(a.Label, a.Input);
        var right = Row(b.Label, b.Input);
        Grid.SetColumn(right, 2);
        g.Children.Add(left);
        g.Children.Add(right);
        return g;
    }

    private static FrameworkElement WithButton(FrameworkElement input, Button button)
    {
        var dock = new DockPanel();
        DockPanel.SetDock(button, Dock.Right);
        dock.Children.Add(button);
        dock.Children.Add(input);
        return dock;
    }

    /// <summary>첨부(선택) — 고르기만 하고, 올리기는 가입할 때 한다</summary>
    private static FrameworkElement FilePicker(Action<string?> picked)
    {
        var name = new TextBlock { Text = "선택 안 함 (선택 사항)", Foreground = Legacy.B("#64748B"), VerticalAlignment = VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis };
        var pick = Btn("파일 선택");
        pick.Click += (_, _) =>
        {
            var dlg = new Microsoft.Win32.OpenFileDialog { Title = "첨부 파일 선택", Filter = "PDF·이미지|*.pdf;*.jpg;*.jpeg;*.png" };
            if (!Dialogs.ShowFile(dlg)) return;
            picked(dlg.FileName);
            name.Text = Path.GetFileName(dlg.FileName);
        };
        return WithButton(name, pick);
    }
}

using System.Windows;
using System.Windows.Input;

namespace Neosys.Local.App.Views;

public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();
        Ui.Placeholder.Set(IdBox, "아이디");
        var s = AppServices.Settings;
        RememberBox.IsChecked = s.RememberId;
        if (s.RememberId && !string.IsNullOrEmpty(s.LastUserId))
        {
            IdBox.Text = s.LastUserId;
            Loaded += (_, _) => PwBox.Focus();
        }
        else Loaded += (_, _) => IdBox.Focus();
    }

    /// <summary>회원가입은 서버(네오시스 웹) 기능 — 안내만</summary>
    private void Signup_Click(object sender, RoutedEventArgs e) =>
        Ui.Dialogs.Info("회원가입은 네오시스 웹(서버)에서 진행합니다.\n가입 후 같은 아이디로 로그인하세요.\n문의: 고객센터 02-381-2455", "회원가입");

    private void Chat_Click(object sender, MouseButtonEventArgs e)
    {
        Ui.Dialogs.OpenExternal("http://pf.kakao.com/_wxjxcrX/chat");
    }

    private void PwBox_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter) Login_Click(sender, e);
    }

    private async void Login_Click(object sender, RoutedEventArgs e)
    {
        MessageText.Visibility = Visibility.Collapsed;
        LoginButton.IsEnabled = false;
        LoginButton.Content = "로그인 중...";
        try
        {
            var session = await AppServices.Auth.LoginAsync(IdBox.Text, PwBox.Password);
            AppServices.SetSession(session);

            var s = AppServices.Settings;
            s.RememberId = RememberBox.IsChecked == true;
            s.LastUserId = s.RememberId ? session.UserId : null;
            s.Save();

            DialogResult = true;
        }
        catch (Exception ex)
        {
            MessageText.Text = ex.Message;
            MessageText.Visibility = Visibility.Visible;
        }
        finally
        {
            LoginButton.IsEnabled = true;
            LoginButton.Content = "로그인";
        }
    }
}

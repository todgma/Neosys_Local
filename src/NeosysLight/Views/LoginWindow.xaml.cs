using System.IO;
using System.Windows;
using System.Windows.Input;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views;

public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();
        DashboardWindow.PlaceAsMain(this);
        var s = AppServices.Settings;
        RememberBox.IsChecked = s.RememberId;
        if (s.RememberId && !string.IsNullOrEmpty(s.LastUserId))
        {
            IdBox.Text = s.LastUserId;
            Loaded += (_, _) => PwBox.Focus();
        }
        else Loaded += (_, _) => IdBox.Focus();
    }

    /// <summary>회원가입 창(서버 API) — 가입하면 그 아이디를 로그인 칸에 넣는다(기존 prefillLoginId)</summary>
    private void Signup_Click(object sender, RoutedEventArgs e)
    {
        var w = new SignupWindow { Owner = this };
        w.ShowDialog();
        if (w.CreatedId is not { } id) return;
        IdBox.Text = id;
        PwBox.Clear();
        PwBox.Focus();
    }

    private void Chat_Click(object sender, MouseButtonEventArgs e)
    {
        Ui.Dialogs.OpenExternal("http://pf.kakao.com/_wxjxcrX/chat");
    }

    /// <summary>안내 문구는 글자가 있으면 숨긴다(원본 placeholder처럼 포커스와 무관)</summary>
    private void Box_Changed(object sender, RoutedEventArgs e)
    {
        if (IdHint is null || PwHint is null) return;   // InitializeComponent 중
        IdHint.Visibility = IdBox.Text.Length == 0 ? Visibility.Visible : Visibility.Collapsed;
        PwHint.Visibility = PwBox.Password.Length == 0 ? Visibility.Visible : Visibility.Collapsed;
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
            var session = await AppServices.Auth.LoginAsync(IdBox.Text, PwBox.Password, OpenLocalAsync);
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

    /// <summary>
    /// 서버 로그인 성공 후 그 계정의 로컬 DB를 연다. 계정 DB가 처음이고 예전 버전 DB(neosis_local.db)가 남아 있으면
    /// 이 계정으로 옮길지 묻는다 — '아니요'면 빈 DB로 시작하고, 예전 DB는 다른 계정이 가져갈 수 있게 그대로 둔다.
    /// 그래도 계정 DB가 없으면(새 PC·PC 교체) 공유폴더의 백업을 가져올지 묻는다(docs/DB_BACKUP.md 4장).
    /// </summary>
    private static async Task OpenLocalAsync(AppSession session)
    {
        var userId = session.UserId;
        var accounts = AppServices.Accounts;
        if (Environment.GetEnvironmentVariable("NEOSYS_DB") is null && accounts.CanAdoptLegacy(userId)
            && Ui.Dialogs.Confirm($"이 PC에 이전 버전의 데이터(물건·고객 등)가 있습니다.\n'{userId}' 계정의 데이터로 가져올까요?\n\n" +
                                  "[예] 가져와서 이 계정으로 사용합니다(첨부 사진 포함).\n[아니요] 이 계정은 빈 데이터로 시작합니다.", "이전 데이터 가져오기"))
        {
            try { await Task.Run(() => accounts.AdoptLegacy(userId)); }
            catch (Exception ex) { throw new InvalidOperationException("이전 데이터를 옮기지 못했습니다.\n" + ex.Message, ex); }
        }
        if (Environment.GetEnvironmentVariable("NEOSYS_DB") is null && !File.Exists(accounts.DbPath(userId)))
            await OfferImportAsync(session);
        try { await AppServices.OpenAccountAsync(userId); }
        catch (Exception ex) when (ex is not InvalidOperationException) { throw new InvalidOperationException("로컬 DB를 준비하지 못했습니다.\n" + ex.Message, ex); }
    }

    /// <summary>
    /// 새 PC 첫 로그인 — 등록된 공유폴더(와 이 PC 로컬 백업)에서 이 계정의 백업을 찾아 가장 최근 것을 가져올지 묻는다.
    /// 등록된 공유폴더가 없는 새 PC면 백업이 있는 공유폴더를 고르게 하고, 가져오면 그 폴더를 백업 공유폴더로 등록한다.
    /// 가져오기에 실패하면 로그인을 멈춘다(빈 DB로 시작해 자동 백업이 오늘 백업을 덮어쓰지 않게).
    /// </summary>
    private static async Task OfferImportAsync(AppSession s)
    {
        var settings = AppServices.Settings;
        var days = await Task.Run(() => RestoreService.ByDate(RestoreService.Find(settings.BackupShares.ToList(), AppServices.ShareFolder, s.UserId)));
        string? picked = null;
        if (days.Count == 0)
        {
            if (!Ui.Dialogs.Confirm($"이 PC에서 '{s.UserId}' 계정을 처음 사용합니다.\n다른 PC에서 쓰던 계정이면 공유폴더의 백업을 가져올 수 있습니다.\n\n" +
                                    "[예] 백업이 있는 공유폴더를 고릅니다.\n[아니요] 빈 데이터로 시작합니다.", "백업 가져오기")) return;
            var dlg = new Microsoft.Win32.OpenFolderDialog { Title = @"백업이 있는 공유폴더 선택(예: \\사무실PC\Neosys)" };
            if (!Ui.Dialogs.ShowFile(dlg)) return;
            var root = dlg.FolderName.TrimEnd('\\', '/');
            picked = root;
            days = await Task.Run(() => RestoreService.ByDate(RestoreService.Find(new[] { root }, null, s.UserId)));
            if (days.Count == 0)
            {
                Ui.Dialogs.Warn($"그 폴더에서 '{s.UserId}' 계정의 백업을 찾지 못했습니다.\n빈 데이터로 시작합니다.", "백업 가져오기");
                return;
            }
        }

        var e = days[0][0];
        if (!Ui.Dialogs.Confirm($"'{s.UserId}' 계정의 백업이 있습니다.\n\n{e.Manifest.BackedUpAt:yyyy-MM-dd HH:mm} 백업 · PC {e.Manifest.Machine} · {(e.IsLocal ? "이 PC Neosys 폴더" : e.Source)}\n\n" +
                                "[예] 이 백업을 가져와 이어서 씁니다(첨부 사진 포함).\n[아니요] 빈 데이터로 시작합니다(자동 백업이 오늘 날짜 백업을 빈 데이터로 덮어씁니다).", "백업 가져오기")) return;

        var r = await Task.Run(() => RestoreService.Restore(days[0], AppServices.Accounts.DbPath(s.UserId), AppServices.Accounts.FilesRoot(s.UserId), settings.BackupKeepDays));
        if (!r.Ok) throw new InvalidOperationException("백업을 가져오지 못했습니다.\n" + r.Error);
        if (picked is not null && !settings.BackupShares.Contains(picked, StringComparer.OrdinalIgnoreCase))
        {
            settings.BackupShares.Add(picked);
            try { settings.Save(); } catch { /* 공유폴더는 DB 관리 창에서 다시 등록할 수 있음 */ }
        }
    }
}

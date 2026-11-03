using System.Windows;
using System.Windows.Controls;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.DbManage;

/// <summary>
/// 공유 정보 알림 — 이 PC에서 처음 로그인할 때 공유를 자동으로 켠 뒤(FirstRunSetup) 한 번 띄운다. 탭 2개:
///   공유정보: 설정 결과, 다른 PC에 등록할 주소, 공유 상태, 다시 설정
///   데이터베이스 백업: 백업 위치·상태, 백업 설정(DB 관리 창과 같은 패널)
/// 설정 페이지(DB 관리 창)는 그대로 두고, 여기서 바꾼 값도 settings.json에 바로 저장한다.
/// </summary>
public sealed class ShareInfoWindow : Window
{
    private readonly TabControl _tabs = new() { Margin = new Thickness(12, 8, 12, 0) };
    private readonly StackPanel _result = new();
    private readonly StackPanel _net = new();
    private readonly Button _netCheck = new() { Content = "다시 확인", Padding = new Thickness(10, 3, 10, 3) };
    private readonly Button _netEnable = new() { Content = "공유설정", Padding = new Thickness(14, 3, 14, 3), Margin = new Thickness(6, 0, 0, 0) };
    private readonly StackPanel _status = new();
    private readonly Button _backupNow;
    private readonly BackupSettingsPanel _backupSettings;
    private ShareStatus? _netStatus;
    private FirstRunResult _setup;

    /// <summary>최초 실행이면 공유를 켜고(관리자 권한 확인 창 한 번) 결과를 띄운다. 실패해도 프로그램은 그대로 쓴다.</summary>
    public static async Task ShowIfFirstRunAsync(Window owner)
    {
        // NEOSYS_DB(개발·점검용 임시 DB)로 실행할 때는 이 PC의 공유 설정을 건드리지 않는다
        if (Environment.GetEnvironmentVariable("NEOSYS_DB") is not null || !FirstRunSetup.ShouldRun(AppServices.Settings)) return;
        try
        {
            var result = await FirstRunSetup.RunAsync(AppServices.Settings, AppServices.ShareFolder, AppServices.Session.UserId,
                f => Task.Run(() => NetworkShare.Check(f).Ready),
                f => NetworkShare.EnableAsync(f, makePrivate: false),   // 네트워크 종류는 자동으로 바꾸지 않는다(공용 와이파이를 '개인'으로 만들 수 있어서) — 창에서 [공유설정]으로
                AppServices.Settings.Save);
            if (owner.IsLoaded) new ShareInfoWindow(result) { Owner = owner }.Show();
        }
        catch (Exception ex) { Dialogs.Warn("공유 정보를 표시하지 못했습니다.\n" + ex.Message, "공유 정보"); }
    }

    internal ShareInfoWindow(FirstRunResult setup)
    {
        _setup = setup;
        Title = "공유 정보";
        Width = 660;
        Height = Math.Min(640, SystemParameters.WorkArea.Height - 40);
        MinWidth = 560;
        MinHeight = 460;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Background = Legacy.B("#F3F4F6");

        _backupNow = new Button { Content = "지금 백업", Style = (Style)FindResource("PrimaryButton"), Padding = new Thickness(14, 5, 14, 5), VerticalAlignment = VerticalAlignment.Top };
        _backupNow.Click += async (_, _) => await DbManageWindow.RunBackupNowAsync();
        _backupSettings = new BackupSettingsPanel(RenderStatus);

        _tabs.Items.Add(DbManageWindow.Tab("공유정보", Page(ShareTab())));
        _tabs.Items.Add(DbManageWindow.Tab("데이터베이스 백업", Page(BackupTab())));

        var open = new Button { Content = "DB 관리 열기", Padding = new Thickness(12, 4, 12, 4) };
        open.Click += (_, _) => { if (Owner is { } o) DbManageWindow.ShowSingle(o); };
        var close = new Button { Content = "닫기", Style = (Style)FindResource("PrimaryButton"), Padding = new Thickness(20, 4, 20, 4), Margin = new Thickness(6, 0, 0, 0) };
        close.Click += (_, _) => Close();
        var foot = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(12, 10, 12, 12) };
        foot.Children.Add(open);
        foot.Children.Add(close);
        var root = new DockPanel();
        DockPanel.SetDock(foot, Dock.Bottom);
        root.Children.Add(foot);
        root.Children.Add(_tabs);
        Content = root;

        BackupScheduler.StatusChanged += RenderStatus;
        Closed += (_, _) => BackupScheduler.StatusChanged -= RenderStatus;
        RenderResult();
        RenderStatus();
        Loaded += async (_, _) =>
        {
            await CheckNetAsync();
            await _backupSettings.RefreshTaskStateAsync();
        };
    }

    /// <summary>탭 선택(화면 캡처용)</summary>
    internal void SelectTab(int index) => _tabs.SelectedIndex = index;

    // ---------------- 공유정보 ----------------

    private FrameworkElement ShareTab()
    {
        var sp = new StackPanel();
        sp.Children.Add(_result);

        sp.Children.Add(Title2("다른 PC에 등록할 주소", 14));
        var address = new TextBox { Text = NetworkShare.UncPath, IsReadOnly = true, FontWeight = FontWeights.Bold, Height = 30, VerticalContentAlignment = VerticalAlignment.Center };
        var copy = new Button { Content = "복사", Padding = new Thickness(12, 3, 12, 3), Margin = new Thickness(6, 0, 0, 0) };
        copy.Click += (_, _) => { Clipboard.SetText(NetworkShare.UncPath); Toast.Success("주소가 복사되었습니다."); };
        var row = new DockPanel();
        DockPanel.SetDock(copy, Dock.Right);
        row.Children.Add(copy);
        row.Children.Add(address);
        sp.Children.Add(row);
        sp.Children.Add(DbManageWindow.Wrap("다른 PC의 네오시스에서 DB 관리 → [연결된 공유폴더]에 이 주소를 등록하면 그 PC의 백업이 이 PC로 들어옵니다. 연결할 때 이 PC의 Windows 계정과 암호를 묻습니다(암호가 없는 계정으로는 연결할 수 없습니다).", "#6B7280"));

        sp.Children.Add(Title2("공유 폴더", 14));
        sp.Children.Add(DbManageWindow.Line("Neosys 폴더", AppServices.ShareFolder));
        sp.Children.Add(DbManageWindow.Wrap("사무실 PC의 로그인 사용자가 이 폴더에 읽고 쓸 수 있습니다. 지금 쓰는 DB 원본은 공유되지 않습니다.", "#6B7280"));

        sp.Children.Add(Title2("공유 상태", 14));
        sp.Children.Add(_net);
        _netEnable.Style = (Style)FindResource("PrimaryButton");
        _netCheck.Click += async (_, _) => await CheckNetAsync();
        _netEnable.Click += async (_, _) => await EnableAsync();
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 10, 0, 0) };
        buttons.Children.Add(_netCheck);
        buttons.Children.Add(_netEnable);
        sp.Children.Add(buttons);
        return sp;
    }

    private void RenderResult()
    {
        _result.Children.Clear();
        var ok = _setup.Ready && _netStatus?.PublicNetwork != true;
        var text = new TextBlock
        {
            Text = ok ? "공유 설정을 자동으로 마쳤습니다."
                : _setup.Ready ? "공유는 켰지만 네트워크가 '공용'이라 다른 PC에서 들어올 수 없습니다. 사무실 네트워크라면 아래 [공유설정]에서 '개인'으로 바꾸세요."
                : "공유를 켜지 못했습니다. 아래 [공유설정]을 누르거나 나중에 DB 관리 → [네트워크 공유]에서 켤 수 있습니다." + (_setup.Error is { Length: > 0 } e ? "\n" + e : ""),
            TextWrapping = TextWrapping.Wrap, FontWeight = FontWeights.Bold, Foreground = Legacy.B(ok ? "#15803D" : "#B45309"),
        };
        _result.Children.Add(new Border
        {
            Background = Legacy.B(ok ? "#F0FDF4" : "#FFF7ED"), BorderBrush = Legacy.B(ok ? "#BBF7D0" : "#FDBA74"), BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(6), Padding = new Thickness(12, 8, 12, 8), Child = text,
        });
    }

    private async Task CheckNetAsync()
    {
        _netCheck.IsEnabled = false;
        var folder = AppServices.ShareFolder;
        _netStatus = await Task.Run(() => NetworkShare.Check(folder));
        DbManageWindow.FillNetStatus(_net, _netStatus);
        _netEnable.IsEnabled = !_netStatus.Ready || _netStatus.PublicNetwork;
        _netCheck.IsEnabled = true;
        // 맨 위 결과 문구도 지금 상태에 맞춘다
        if (_netStatus.Ready) _setup = new FirstRunResult(true, null);
        else if (_setup.Ready) _setup = new FirstRunResult(false, "공유가 확인되지 않았습니다.");
        RenderResult();
    }

    private async Task EnableAsync()
    {
        var proceeded = await DbManageWindow.AskAndEnableAsync(_netStatus, () => _netEnable.IsEnabled = false);
        if (!proceeded) return;
        await CheckNetAsync();
    }

    // ---------------- 데이터베이스 백업 ----------------

    private FrameworkElement BackupTab()
    {
        var sp = new StackPanel();
        sp.Children.Add(Title2("백업 위치", 0));
        sp.Children.Add(DbManageWindow.Line("내 백업", BackupService.BackupFolder(AppServices.ShareFolder, AppServices.Session.UserId)));
        sp.Children.Add(Title2("백업 상태", 14));
        var dock = new DockPanel();
        DockPanel.SetDock(_backupNow, Dock.Right);
        dock.Children.Add(_backupNow);
        dock.Children.Add(_status);
        sp.Children.Add(dock);
        sp.Children.Add(Title2("백업 설정", 14));
        sp.Children.Add(_backupSettings);
        return sp;
    }

    private void RenderStatus()
    {
        if (!Dispatcher.CheckAccess()) { Dispatcher.Invoke(RenderStatus); return; }
        _status.Children.Clear();
        _backupNow.IsEnabled = !BackupScheduler.Running;
        _backupNow.Content = BackupScheduler.Running ? "백업 중…" : "지금 백업";
        var st = BackupScheduler.Status;
        _status.Children.Add(DbManageWindow.Line("마지막 성공", st.LastSuccessAt is { } ok ? ok.ToString("yyyy-MM-dd HH:mm") : "없음"));
        var s = AppServices.Settings;
        _status.Children.Add(DbManageWindow.Wrap($"자동 백업: {(s.ScheduledBackup ? "작업 스케줄러가 " : "")}{BackupSettingsPanel.Every(s.BackupIntervalMinutes)} · 일자별 {s.BackupKeepDays}일 보관{(s.BackupOnExit ? " · 종료 시 백업" : "")}", "#6B7280"));
    }

    // ---------------- 도우미 ----------------

    private static TextBlock Title2(string text, double top) =>
        new() { Text = text, FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#111827"), Margin = new Thickness(0, top, 0, 6) };

    private FrameworkElement Page(FrameworkElement body) => new ScrollViewer
    {
        VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
        Content = new Border { Style = (Style)FindResource("Card"), Padding = new Thickness(16, 12, 16, 14), Margin = new Thickness(12, 10, 12, 12), Child = body },
    };
}

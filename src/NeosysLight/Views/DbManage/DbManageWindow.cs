using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.DbManage;

/// <summary>
/// DB 관리(대시보드 톱니 옆 DB 아이콘, docs/DB_BACKUP.md 6장) — 탭 4개:
///   네트워크 공유: Windows 공유 상태 표시, [공유설정](관리자 권한으로 공유 켜기 + Neosys 폴더 공유)
///   공유폴더 설정: 드라이브만 고르면 Neosys 폴더를 만든다(C:는 기본 위치, 다른 드라이브는 X:\Neosys)
///   연결된 공유폴더: 등록·연결 확인, 3분할(위치 / 계정 폴더 / 백업 파일) — 대표는 모든 계정 폴더, 직원은 자기 폴더만
///   DB 관리: 내 DB, 백업 상태·지금 백업, 백업 설정(작업 스케줄러 포함), 복구
/// 설정은 이 PC의 settings.json에 바로 저장한다. 한 번에 하나만 열린다.
/// </summary>
public sealed class DbManageWindow : Window
{
    private static DbManageWindow? _open;

    private readonly TabControl _tabs = new() { Margin = new Thickness(12, 8, 12, 12) };

    // 네트워크 공유
    private readonly StackPanel _net = new();
    private readonly Button _netCheck = new() { Content = "다시 확인", Padding = new Thickness(10, 3, 10, 3) };
    private readonly Button _netEnable = new() { Content = "공유설정", Padding = new Thickness(14, 3, 14, 3), Margin = new Thickness(6, 0, 0, 0) };
    private ShareStatus? _netStatus;

    // 공유폴더 설정
    private readonly StackPanel _folderInfo = new();
    private readonly ComboBox _drives = new() { Width = 260, HorizontalAlignment = HorizontalAlignment.Left };
    private readonly TextBlock _folderPreview = new() { Foreground = Legacy.B("#6B7280"), Margin = new Thickness(0, 6, 0, 0), TextWrapping = TextWrapping.Wrap };

    // 연결된 공유폴더(3분할)
    private readonly TextBox _newShare = new() { Style = (Style)Application.Current.FindResource("FormInput"), Height = 28, VerticalContentAlignment = VerticalAlignment.Center };
    private readonly ListBox _roots = Pane();
    private readonly ListBox _accounts = Pane();
    private readonly ListBox _files = Pane();
    private readonly Button _restoreFile = new() { Content = "이 백업으로 복구", Padding = new Thickness(10, 3, 10, 3), IsEnabled = false };
    private readonly Button _viewFile = new() { Content = "읽기 전용으로 보기", Padding = new Thickness(10, 3, 10, 3), Margin = new Thickness(6, 0, 0, 0), IsEnabled = false };
    private readonly TextBlock _paneNote = new() { Foreground = Legacy.B("#6B7280"), FontSize = 12, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 6, 0, 0) };
    private readonly Dictionary<string, string> _checks = new(StringComparer.OrdinalIgnoreCase);
    private int _accountsVersion, _filesVersion;   // 늦게 끝난 이전 조회 결과는 버린다(목록마다 따로)

    // DB 관리
    private readonly StackPanel _status = new();
    private readonly Button _backupNow;
    private readonly ListBox _backups = new() { Height = 170, BorderBrush = Legacy.B("#D1D5DB"), Margin = new Thickness(0, 6, 0, 0), HorizontalContentAlignment = HorizontalAlignment.Stretch };
    private readonly Button _loadBackups = new() { Content = "백업 목록 불러오기", Padding = new Thickness(10, 3, 10, 3) };
    private readonly Button _restore = new() { Content = "선택한 백업으로 복구", Padding = new Thickness(10, 3, 10, 3), Margin = new Thickness(6, 0, 0, 0), IsEnabled = false };
    private readonly BackupSettingsPanel _backupSettings;

    /// <summary>위치 목록 한 줄 — Source: 표시·등록 이름, Root: 그 안의 Neosys 폴더</summary>
    private sealed record RootItem(string Source, string Root, bool IsLocal);

    /// <summary>열려 있으면 앞으로, 없으면 새로</summary>
    public static void ShowSingle(Window owner)
    {
        if (_open is not null)
        {
            if (_open.WindowState == WindowState.Minimized) _open.WindowState = WindowState.Normal;
            _open.Activate();
            return;
        }
        _open = new DbManageWindow { Owner = owner };
        _open.Closed += (_, _) => _open = null;
        _open.Show();
    }

    private DbManageWindow()
    {
        Title = "DB 관리";
        Width = 940;
        Height = Math.Min(720, SystemParameters.WorkArea.Height - 40);
        MinWidth = 820;
        MinHeight = 520;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Background = Legacy.B("#F3F4F6");

        _backupNow = new Button { Content = "지금 백업", Style = (Style)FindResource("PrimaryButton"), Padding = new Thickness(14, 5, 14, 5) };
        _backupNow.Click += async (_, _) => await RunBackupNowAsync();
        _backupSettings = new BackupSettingsPanel(RenderStatus);

        _tabs.Items.Add(Tab("네트워크 공유", Page(Card("네트워크 공유 설정", NetPanel()))));
        _tabs.Items.Add(Tab("공유폴더 설정", Page(Card("공유폴더(Neosys 폴더) 설정", FolderPanel()))));
        _tabs.Items.Add(Tab("연결된 공유폴더", ConnectedPanel()));
        _tabs.Items.Add(Tab("DB 관리", Page(Card("내 DB", MyDbPanel()), Card("백업 상태", StatusPanel()), Card("백업 설정", _backupSettings), Card("복구", RestorePanel()))));
        _tabs.SelectedIndex = 3;
        Content = _tabs;

        BackupScheduler.StatusChanged += RenderStatus;
        Closed += (_, _) => BackupScheduler.StatusChanged -= RenderStatus;
        RenderStatus();
        RenderFolder();
        RenderRoots();
        Loaded += async (_, _) =>
        {
            await CheckNetAsync();
            await _backupSettings.RefreshTaskStateAsync();
        };
    }

    /// <summary>대시보드 버튼용 DB(원통) 아이콘</summary>
    public static FrameworkElement DbIcon(string color = "#6B7280", double size = 15) => new System.Windows.Shapes.Path
    {
        Data = Geometry.Parse("M1,3 C1,0.6 13,0.6 13,3 L13,13 C13,15.4 1,15.4 1,13 Z M1,3 C1,5.4 13,5.4 13,3 M1,6.4 C1,8.8 13,8.8 13,6.4 M1,9.8 C1,12.2 13,12.2 13,9.8"),
        Stroke = Legacy.B(color), StrokeThickness = 1.4, Stretch = Stretch.Uniform, Width = size * 0.9, Height = size,
        VerticalAlignment = VerticalAlignment.Center,
    };

    /// <summary>탭 선택(화면 캡처용)</summary>
    internal void SelectTab(int index) => _tabs.SelectedIndex = index;

    /// <summary>연결된 공유폴더의 위치 선택(화면 캡처용) — 0 = 이 PC</summary>
    internal void SelectRoot(int index) => _roots.SelectedIndex = Math.Min(index, _roots.Items.Count - 1);

    // ---------------- 1. 네트워크 공유 ----------------

    private FrameworkElement NetPanel()
    {
        var sp = new StackPanel();
        sp.Children.Add(Wrap("다른 PC가 이 PC의 Neosys 폴더에 백업하려면 Windows 네트워크 공유가 켜져 있어야 합니다. [공유설정]을 누르면 관리자 권한 확인 창이 한 번 뜨고, " +
                             "파일 공유·네트워크 검색을 켜고 Neosys 폴더를 'Neosys'로 공유합니다(공용 네트워크 설정은 바꾸지 않습니다).", "#6B7280"));
        _net.Margin = new Thickness(0, 8, 0, 0);
        sp.Children.Add(_net);
        _netEnable.Style = (Style)FindResource("PrimaryButton");
        _netCheck.Click += async (_, _) => await CheckNetAsync();
        _netEnable.Click += async (_, _) => await EnableNetAsync();
        var row = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 10, 0, 0) };
        row.Children.Add(_netCheck);
        row.Children.Add(_netEnable);
        sp.Children.Add(row);
        sp.Children.Add(Wrap("다른 PC에서 이 PC에 연결할 때 이 PC의 Windows 계정과 암호를 묻습니다(암호가 없는 계정으로는 연결할 수 없습니다).", "#6B7280"));
        return sp;
    }

    internal async Task CheckNetAsync()
    {
        _netCheck.IsEnabled = false;
        _net.Children.Clear();
        _net.Children.Add(Wrap("확인 중…", "#6B7280"));
        var folder = AppServices.ShareFolder;
        _netStatus = await Task.Run(() => NetworkShare.Check(folder));
        RenderNet();
        _netCheck.IsEnabled = true;
    }

    private void RenderNet()
    {
        if (_netStatus is not { } st) { _net.Children.Clear(); return; }
        FillNetStatus(_net, st);
        _netEnable.IsEnabled = !st.Ready || st.PublicNetwork;
    }

    /// <summary>공유 상태 줄(공유 정보 알림과 함께 쓴다)</summary>
    internal static void FillNetStatus(StackPanel panel, ShareStatus st)
    {
        panel.Children.Clear();
        panel.Children.Add(State("파일 공유 서비스", st.ServerRunning, "실행 중", "꺼짐"));
        panel.Children.Add(State("파일 및 프린터 공유", st.FileSharingOpen, "허용(방화벽)", "막힘(방화벽)"));
        panel.Children.Add(State("네트워크 검색", st.DiscoveryOpen, "켜짐", "꺼짐 — 주소를 직접 입력하면 연결됩니다", warnOnly: true));
        panel.Children.Add(State("네트워크 종류", !st.PublicNetwork, "개인(사무실)", "공용 — 공유가 막힙니다. [공유설정]에서 '개인'으로 바꿀 수 있습니다"));
        panel.Children.Add(State("Neosys 공유", st.Shared, $"{NetworkShare.UncPath} → {AppServices.ShareFolder}", "없음(또는 다른 폴더를 공유 중)"));
        if (st.Error is not null) panel.Children.Add(Wrap(st.Error, "#B45309"));
        panel.Children.Add(st.Ready
            ? Wrap($"다른 PC의 [연결된 공유폴더]에 {NetworkShare.UncPath} 를 등록하면 이 PC로 백업됩니다.", "#15803D")
            : Wrap("아직 다른 PC에서 이 PC로 백업할 수 없습니다. [공유설정]을 누르세요.", "#B45309"));
    }

    private async Task EnableNetAsync()
    {
        var proceeded = await AskAndEnableAsync(_netStatus, () =>
        {
            _netEnable.IsEnabled = false;
            _netEnable.Content = "설정 중…";
        });
        if (!proceeded) return;
        _netEnable.Content = "공유설정";
        await CheckNetAsync();
        if (_netStatus?.Ready == true) Dialogs.Info($"공유했습니다.\n다른 PC의 DB 관리 → [연결된 공유폴더]에 {NetworkShare.UncPath} 를 등록하세요.", "네트워크 공유");
    }

    /// <summary>확인을 받고 공유를 켠다(공유 정보 알림과 함께 쓴다). 사용자가 그만두면 false</summary>
    internal static async Task<bool> AskAndEnableAsync(ShareStatus? status, Action started)
    {
        var makePrivate = false;
        if (status?.PublicNetwork == true)
            makePrivate = Dialogs.Confirm("지금 네트워크가 '공용'으로 되어 있습니다.\n사무실 네트워크라면 '개인'으로 바꿔야 다른 PC에서 들어올 수 있습니다.\n\n" +
                                          "[예] '개인'으로 바꾸고 공유를 켭니다.\n[아니요] 네트워크 종류는 그대로 두고 공유만 켭니다.", "네트워크 공유");
        if (!Dialogs.Confirm($"관리자 권한 확인 창이 뜹니다. [예]를 누르면 다음을 설정합니다.\n\n· 파일 공유 서비스 시작(자동 실행)\n· 개인·도메인 네트워크의 '파일 및 프린터 공유'·'네트워크 검색' 허용\n" +
                             $"· {AppServices.ShareFolder} 폴더를 '{NetworkShare.ShareName}'로 공유(사무실 PC의 로그인 사용자가 쓰기 가능)\n\n계속할까요?", "네트워크 공유")) return false;
        started();
        Directory.CreateDirectory(AppServices.ShareFolder);
        var error = await NetworkShare.EnableAsync(AppServices.ShareFolder, makePrivate);
        if (error is not null) Dialogs.Warn("공유를 켜지 못했습니다.\n" + error, "네트워크 공유");
        return true;
    }

    // ---------------- 2. 공유폴더 설정 ----------------

    private FrameworkElement FolderPanel()
    {
        var sp = new StackPanel();
        sp.Children.Add(Wrap("드라이브만 고르면 Neosys 폴더와 내 계정 폴더(BackUp 포함)를 만듭니다. C: 드라이브는 프로그램 기본 위치에, 다른 드라이브는 그 드라이브 맨 위에 Neosys 폴더를 만듭니다. " +
                             "다른 PC의 백업도 이 폴더 안 각 계정 폴더의 BackUp에 들어옵니다. 지금 쓰는 DB 원본은 이 폴더 밖(공유되지 않는 곳)에 그대로 둡니다.", "#6B7280"));
        _folderInfo.Margin = new Thickness(0, 8, 0, 0);
        sp.Children.Add(_folderInfo);

        foreach (var d in DriveInfo.GetDrives().Where(d => d.DriveType == DriveType.Fixed && d.IsReady))
            _drives.Items.Add(new ComboBoxItem { Content = $"{d.Name.TrimEnd('\\')}  {d.VolumeLabel}  (남은 공간 {Size(d.AvailableFreeSpace)})", Tag = d.Name });
        var current = Path.GetPathRoot(AppServices.ShareFolder);
        _drives.SelectedItem = _drives.Items.Cast<ComboBoxItem>().FirstOrDefault(i => string.Equals((string)i.Tag, current, StringComparison.OrdinalIgnoreCase))
                               ?? _drives.Items.Cast<ComboBoxItem>().FirstOrDefault();
        _drives.SelectionChanged += (_, _) => RenderFolderPreview();

        var row = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 12, 0, 0) };
        row.Children.Add(new TextBlock { Text = "드라이브", Width = 90, VerticalAlignment = VerticalAlignment.Center, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#374151") });
        row.Children.Add(_drives);
        var make = new Button { Content = "폴더 만들기", Style = (Style)FindResource("PrimaryButton"), Padding = new Thickness(14, 3, 14, 3), Margin = new Thickness(6, 0, 0, 0) };
        make.Click += (_, _) => MakeFolder();
        row.Children.Add(make);
        var open = new Button { Content = "폴더 열기", Padding = new Thickness(10, 3, 10, 3), Margin = new Thickness(6, 0, 0, 0) };
        open.Click += (_, _) =>
        {
            Directory.CreateDirectory(AppServices.ShareFolder);
            Dialogs.OpenExternal(AppServices.ShareFolder);
        };
        row.Children.Add(open);
        sp.Children.Add(row);
        sp.Children.Add(_folderPreview);
        RenderFolderPreview();
        return sp;
    }

    private void RenderFolder()
    {
        _folderInfo.Children.Clear();
        var root = AppServices.ShareFolder;
        var me = AppServices.Session.UserId;
        _folderInfo.Children.Add(Line("Neosys 폴더", root));
        _folderInfo.Children.Add(Line("내 백업", BackupService.BackupFolder(root, me)));
        _folderInfo.Children.Add(Line("내 DB 원본", AppServices.MyDb.FilePath + "  (공유 안 됨)", "#6B7280"));
        if (!Directory.Exists(root)) _folderInfo.Children.Add(Wrap("아직 만들지 않았습니다. 첫 백업 때 만들어지며, [폴더 만들기]로 지금 만들 수 있습니다.", "#B45309"));
    }

    private void RenderFolderPreview()
    {
        if (_drives.SelectedItem is not ComboBoxItem { Tag: string drive }) return;
        var target = BackupService.LocalRootFor(drive);
        _folderPreview.Text = $"만들 폴더: {BackupService.BackupFolder(target, AppServices.Session.UserId)}";
    }

    private void MakeFolder()
    {
        if (_drives.SelectedItem is not ComboBoxItem { Tag: string drive }) return;
        var target = BackupService.LocalRootFor(drive);
        var current = AppServices.ShareFolder;
        var me = AppServices.Session.UserId;
        var moving = !string.Equals(Path.GetFullPath(target).TrimEnd('\\'), Path.GetFullPath(current).TrimEnd('\\'), StringComparison.OrdinalIgnoreCase);
        try
        {
            if (moving)
            {
                if (!Dialogs.Confirm($"Neosys 폴더를 바꿉니다.\n\n지금: {current}\n바꿀 곳: {target}\n\n지금 폴더의 백업(다른 PC 백업 포함)을 새 폴더로 옮깁니다. 계속할까요?", "공유폴더 설정")) return;
                if (Directory.Exists(current)) MoveContents(current, target);
                AppServices.Settings.ShareFolder = string.Equals(target, BackupService.DefaultLocalRoot, StringComparison.OrdinalIgnoreCase) ? null : target;
                Save();
            }
            Directory.CreateDirectory(BackupService.BackupFolder(target, me));
            BackupScheduler.Restart();
            RenderFolder();
            RenderRoots();
            Dialogs.Info(moving
                ? $"Neosys 폴더를 만들었습니다.\n{BackupService.BackupFolder(target, me)}\n\n다른 PC가 이 폴더에 백업하려면 [네트워크 공유] 탭에서 [공유설정]을 다시 누르세요."
                : $"폴더가 준비되었습니다.\n{BackupService.BackupFolder(target, me)}", "공유폴더 설정");
            _ = CheckNetAsync();
        }
        catch (Exception ex)
        {
            Dialogs.Error("폴더를 만들지 못했습니다.\n" + ex.Message);
        }
    }

    /// <summary>폴더 내용 옮기기(드라이브가 달라도) — 새 위치에 이미 있는 파일은 두고, 옮긴 뒤 예전 폴더는 지운다(공유 표시 파일 제외)</summary>
    private static void MoveContents(string from, string to)
    {
        Directory.CreateDirectory(to);
        foreach (var file in Directory.EnumerateFiles(from, "*", SearchOption.AllDirectories))
        {
            var rel = Path.GetRelativePath(from, file);
            if (rel == ".neosys_share") continue;
            var dest = Path.Combine(to, rel);
            if (File.Exists(dest)) continue;
            Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
            File.Copy(file, dest);
            File.SetLastWriteTimeUtc(dest, File.GetLastWriteTimeUtc(file));
        }
        try { Directory.Delete(from, recursive: true); } catch { /* 공유 중이면 남을 수 있다 */ }
    }

    // ---------------- 3. 연결된 공유폴더(3분할) ----------------

    private FrameworkElement ConnectedPanel()
    {
        var sp = new DockPanel { Margin = new Thickness(16, 10, 16, 14) };
        var top = new StackPanel();
        top.Children.Add(Wrap(@"다른 PC의 Neosys 공유(예: \\사무실PC\Neosys)를 등록하면 등록된 모든 곳에 내 백업을 복사합니다. 이 PC의 Neosys 폴더에는 항상 백업합니다.", "#6B7280"));
        var add = new DockPanel { Margin = new Thickness(0, 8, 0, 8) };
        var browse = new Button { Content = "찾아보기", Padding = new Thickness(10, 3, 10, 3), Margin = new Thickness(6, 0, 0, 0) };
        browse.Click += (_, _) => Browse();
        var addBtn = new Button { Content = "추가", Style = (Style)FindResource("PrimaryButton"), Padding = new Thickness(14, 3, 14, 3), Margin = new Thickness(6, 0, 0, 0) };
        addBtn.Click += async (_, _) => await AddShareAsync();
        DockPanel.SetDock(addBtn, Dock.Right);
        DockPanel.SetDock(browse, Dock.Right);
        add.Children.Add(addBtn);
        add.Children.Add(browse);
        add.Children.Add(_newShare);
        Placeholder.Set(_newShare, @"\\PC이름\Neosys");
        top.Children.Add(add);
        DockPanel.SetDock(top, Dock.Top);
        sp.Children.Add(top);

        DockPanel.SetDock(_paneNote, Dock.Bottom);
        sp.Children.Add(_paneNote);

        var grid = new Grid();
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(10) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(10) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1.3, GridUnitType.Star) });

        var check = new Button { Content = "연결 확인", Padding = new Thickness(10, 3, 10, 3) };
        check.Click += async (_, _) => await CheckAllAsync();
        var remove = new Button { Content = "삭제", Style = (Style)FindResource("DangerButton"), Padding = new Thickness(10, 3, 10, 3), Margin = new Thickness(6, 0, 0, 0) };
        remove.Click += (_, _) => RemoveShare();
        Put(grid, Column("연결 드라이브",_roots, check, remove), 0, 0);

        var openFolder = new Button { Content = "폴더 열기", Padding = new Thickness(10, 3, 10, 3) };
        openFolder.Click += (_, _) =>
        {
            if (_roots.SelectedItem is ListBoxItem { Tag: RootItem r } && _accounts.SelectedItem is ListBoxItem { Tag: string account })
                Dialogs.OpenExternal(Path.Combine(r.Root, account, BackupService.BackupDirName));
        };
        Put(grid, Column(AppServices.Session.IsOwner ? "계정 폴더 (대표: 전체)" : "계정 폴더 (내 폴더)", _accounts, openFolder), 0, 2);

        _restoreFile.Style = (Style)FindResource("DangerButton");
        _viewFile.Style = (Style)FindResource("PrimaryButton");
        _restoreFile.Click += async (_, _) => { if (_files.SelectedItem is ListBoxItem { Tag: BackupEntry e }) await RestoreEntriesAsync(new[] { e }); };
        _viewFile.Click += async (_, _) => await ViewFileAsync();
        Put(grid, Column("백업 파일", _files, _restoreFile, _viewFile), 0, 4);
        sp.Children.Add(grid);

        _roots.SelectionChanged += async (_, _) => await LoadAccountsAsync();
        _accounts.SelectionChanged += async (_, _) => await LoadFilesAsync();
        _files.SelectionChanged += (_, _) => UpdateFileButtons();
        return sp;
    }

    private void RenderRoots()
    {
        var selected = (_roots.SelectedItem as ListBoxItem)?.Tag as RootItem;
        _roots.Items.Clear();
        var local = new RootItem(AppServices.ShareFolder, AppServices.ShareFolder, true);
        _roots.Items.Add(RootLine(local, "이 PC (Neosys 폴더)", AppServices.ShareFolder));
        foreach (var share in AppServices.Settings.BackupShares)
            _roots.Items.Add(RootLine(new RootItem(share, BackupService.ShareRoot(share), false), share, null));
        _roots.SelectedItem = _roots.Items.Cast<ListBoxItem>().FirstOrDefault(i => selected is not null && Equals(i.Tag, selected)) ?? _roots.Items[0];

        ListBoxItem RootLine(RootItem item, string title, string? detail)
        {
            var line = new StackPanel { ToolTip = item.Root };
            line.Children.Add(new TextBlock { Text = title, FontWeight = FontWeights.SemiBold, TextTrimming = TextTrimming.CharacterEllipsis });
            if (detail is not null) line.Children.Add(new TextBlock { Text = detail, FontSize = 11.5, Foreground = Legacy.B("#6B7280"), TextTrimming = TextTrimming.CharacterEllipsis });
            if (_checks.TryGetValue(item.Source, out var c))
                line.Children.Add(new TextBlock { Text = c, FontSize = 11.5, TextWrapping = TextWrapping.Wrap, Foreground = Legacy.B(c.StartsWith("✔") ? "#15803D" : c.StartsWith("✖") ? "#DC2626" : "#6B7280") });
            return new ListBoxItem { Content = line, Tag = item, Padding = new Thickness(6, 4, 6, 4) };
        }
    }

    /// <summary>가운데: 고른 위치의 계정 폴더 — 대표는 전체, 직원은 자기 폴더만(앱 안에서만의 제한)</summary>
    internal async Task LoadAccountsAsync()
    {
        var version = ++_accountsVersion;
        _accounts.Items.Clear();
        _files.Items.Clear();
        UpdateFileButtons();
        if (_roots.SelectedItem is not ListBoxItem { Tag: RootItem r }) return;
        var s = AppServices.Session;
        var me = Neosys.Local.Data.AccountStore.SafeName(s.UserId);
        _accounts.Items.Add(Hint("찾는 중…"));
        var found = await Task.Run(() => RestoreService.Accounts(r.Root)
            .Where(a => s.IsOwner || string.Equals(a, me, StringComparison.OrdinalIgnoreCase))
            .Select(a => (Account: a, Latest: RestoreService.ListAccount(r.Root, r.Source, a, r.IsLocal).FirstOrDefault()))
            .ToList());
        if (version != _accountsVersion) return;
        _accounts.Items.Clear();
        foreach (var (account, latest) in found.OrderByDescending(f => string.Equals(f.Account, me, StringComparison.OrdinalIgnoreCase)).ThenBy(f => f.Account, StringComparer.OrdinalIgnoreCase))
        {
            var mine = string.Equals(account, me, StringComparison.OrdinalIgnoreCase);
            var line = new StackPanel();
            var name = latest?.Manifest.RtNm is { Length: > 0 } nm ? $"{nm} ({account})" : account;
            line.Children.Add(new TextBlock { Text = name + (mine ? "  · 나" : ""), FontWeight = FontWeights.SemiBold, TextTrimming = TextTrimming.CharacterEllipsis });
            var stale = latest is null || latest.Manifest.BackedUpAt < DateTime.Now.AddDays(-1);
            line.Children.Add(new TextBlock
            {
                Text = latest is null ? "백업 없음" : $"마지막 {latest.Manifest.BackedUpAt:MM-dd HH:mm} · PC {Pc(latest.Manifest.Machine)}",
                FontSize = 11.5, Foreground = Legacy.B(stale ? "#B45309" : "#6B7280"), TextTrimming = TextTrimming.CharacterEllipsis,
            });
            _accounts.Items.Add(new ListBoxItem { Content = line, Tag = account, Padding = new Thickness(6, 4, 6, 4) });
        }
        if (_accounts.Items.Count == 0)
            _accounts.Items.Add(Hint(Directory.Exists(r.Root) || !r.IsLocal ? "계정 폴더가 없습니다(연결이 안 되거나 아직 백업 전)." : "Neosys 폴더가 아직 없습니다."));
        else _accounts.SelectedIndex = 0;
        _paneNote.Text = s.IsOwner ? "대표는 이 위치의 모든 계정 폴더를 볼 수 있습니다. 다른 계정의 백업은 [읽기 전용으로 보기]로 열 수 있습니다(저장·삭제 불가)." : "내 계정 폴더만 보입니다.";
    }

    /// <summary>오른쪽: 고른 계정의 BackUp 안 날짜 파일</summary>
    internal async Task LoadFilesAsync()
    {
        var version = ++_filesVersion;
        _files.Items.Clear();
        UpdateFileButtons();
        if (_roots.SelectedItem is not ListBoxItem { Tag: RootItem r } || _accounts.SelectedItem is not ListBoxItem { Tag: string account }) return;
        var entries = await Task.Run(() => RestoreService.ListAccount(r.Root, r.Source, account, r.IsLocal));
        if (version != _filesVersion) return;
        foreach (var e in entries)
        {
            var line = new StackPanel { ToolTip = e.DbFile };
            line.Children.Add(new TextBlock { Text = Path.GetFileName(e.DbFile), FontWeight = FontWeights.SemiBold, TextTrimming = TextTrimming.CharacterEllipsis });
            line.Children.Add(new TextBlock
            {
                Text = $"{e.Manifest.BackedUpAt:yyyy-MM-dd (ddd) HH:mm} · {Size(e.Manifest.Size)} · PC {Pc(e.Manifest.Machine)}",
                FontSize = 11.5, Foreground = Legacy.B("#6B7280"), TextTrimming = TextTrimming.CharacterEllipsis,
            });
            _files.Items.Add(new ListBoxItem { Content = line, Tag = e, Padding = new Thickness(6, 4, 6, 4) });
        }
        if (_files.Items.Count == 0) _files.Items.Add(Hint("백업 파일이 없습니다."));
        else _files.SelectedIndex = 0;
    }

    private void UpdateFileButtons()
    {
        var s = AppServices.Session;
        var me = Neosys.Local.Data.AccountStore.SafeName(s.UserId);
        var isEntry = _files.SelectedItem is ListBoxItem { Tag: BackupEntry };
        var mine = _accounts.SelectedItem is ListBoxItem { Tag: string a } && string.Equals(a, me, StringComparison.OrdinalIgnoreCase);
        _restoreFile.IsEnabled = isEntry && mine;
        _viewFile.Visibility = s.IsOwner ? Visibility.Visible : Visibility.Collapsed;
        _viewFile.IsEnabled = isEntry && !mine && s.IsOwner;
    }

    private async Task ViewFileAsync()
    {
        if (_files.SelectedItem is not ListBoxItem { Tag: BackupEntry e } || _accounts.SelectedItem is not ListBoxItem { Tag: string account }) return;
        var name = e.Manifest.RtNm is { Length: > 0 } nm ? nm : account;
        await ViewStaffAsync(new[] { e }, e.Manifest.UserId is { Length: > 0 } u ? u : account, name);
    }

    private void Browse()
    {
        var dlg = new Microsoft.Win32.OpenFolderDialog { Title = @"백업할 공유폴더 선택(예: \\사무실PC\Neosys)" };
        if (Dialogs.ShowFile(dlg)) _newShare.Text = dlg.FolderName;
    }

    private async Task AddShareAsync()
    {
        var path = _newShare.Text.Trim().TrimEnd('\\', '/');
        if (path.Length == 0) { Dialogs.Warn("공유폴더 경로를 입력하세요."); return; }
        var s = AppServices.Settings;
        if (s.BackupShares.Contains(path, StringComparer.OrdinalIgnoreCase)) { Dialogs.Info("이미 등록된 공유폴더입니다."); return; }
        if (string.Equals(BackupService.ShareRoot(path), AppServices.ShareFolder.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase)
            || string.Equals(path, NetworkShare.UncPath, StringComparison.OrdinalIgnoreCase))
        {
            Dialogs.Info("이 PC의 Neosys 폴더입니다. 이 PC에는 항상 백업하므로 따로 등록하지 않아도 됩니다.");
            return;
        }
        if (!path.StartsWith(@"\\") && !Dialogs.Confirm("네트워크 공유폴더(\\\\PC이름\\Neosys)가 아닙니다.\n이 PC가 고장 나면 같이 잃을 수 있습니다. 그래도 등록할까요?")) return;

        var c = await CheckAsync(new RootItem(path, BackupService.ShareRoot(path), false));
        if (!c.Writable && !Dialogs.Confirm($"지금은 이 폴더에 쓸 수 없습니다.\n{c.Error}\n\n그래도 등록할까요? (연결되면 그때부터 백업합니다)")) return;
        s.BackupShares.Add(path);
        Save();
        _newShare.Clear();
        RenderRoots();
        RenderStatus();
    }

    private void RemoveShare()
    {
        if (_roots.SelectedItem is not ListBoxItem { Tag: RootItem { IsLocal: false } r }) { Dialogs.Warn("삭제할 공유폴더를 선택하세요(이 PC 폴더는 뺄 수 없습니다)."); return; }
        if (!Dialogs.Confirm($"'{r.Source}'를 목록에서 뺄까요?\n이미 저장된 백업 파일은 지우지 않습니다.")) return;
        AppServices.Settings.BackupShares.RemoveAll(x => string.Equals(x, r.Source, StringComparison.OrdinalIgnoreCase));
        _checks.Remove(r.Source);
        Save();
        RenderRoots();
        RenderStatus();
    }

    private async Task CheckAllAsync()
    {
        var items = _roots.Items.Cast<ListBoxItem>().Select(i => i.Tag).OfType<RootItem>().ToList();
        foreach (var item in items) _checks[item.Source] = "확인 중…";
        RenderRoots();
        foreach (var item in items)
        {
            await CheckAsync(item);
            RenderRoots();
        }
    }

    private async Task<BackupTargetCheck> CheckAsync(RootItem item)
    {
        var me = AppServices.Session.UserId;
        var c = await Task.Run(() => BackupService.CheckTarget(item.Root, me));
        _checks[item.Source] = c.Writable
            ? $"✔ 연결됨 · 남은 공간 {(c.FreeBytes is { } f ? Size(f) : "알 수 없음")} · 내 백업 {Size(c.UsedBytes)}"
            : "✖ " + c.Error;
        return c;
    }

    // ---------------- 4. DB 관리 ----------------

    private FrameworkElement MyDbPanel()
    {
        var s = AppServices.Session;
        var db = AppServices.MyDb.FilePath;
        // WAL 모드라 최근 변경은 -wal 파일에 있다 — 합쳐서 보여 준다
        var size = new[] { db, db + "-wal" }.Where(File.Exists).Sum(f => new FileInfo(f).Length);
        var sp = new StackPanel();
        sp.Children.Add(Line("계정", $"{s.RtNm ?? s.UserId} ({s.UserId}){(s.IsOwner ? " · 대표" : "")}"));
        sp.Children.Add(Line("파일", db));
        sp.Children.Add(Line("크기", Size(size)));
        var open = new Button { Content = "폴더 열기", Padding = new Thickness(10, 3, 10, 3), HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 6, 0, 0) };
        open.Click += (_, _) => Dialogs.OpenExternal(Path.GetDirectoryName(db)!);
        sp.Children.Add(open);
        return sp;
    }

    private FrameworkElement StatusPanel()
    {
        var dock = new DockPanel();
        DockPanel.SetDock(_backupNow, Dock.Right);
        _backupNow.VerticalAlignment = VerticalAlignment.Top;
        dock.Children.Add(_backupNow);
        dock.Children.Add(_status);
        return dock;
    }

    private void RenderStatus()
    {
        if (!Dispatcher.CheckAccess()) { Dispatcher.Invoke(RenderStatus); return; }
        var st = BackupScheduler.Status;
        _status.Children.Clear();
        _backupNow.IsEnabled = !BackupScheduler.Running;
        _backupNow.Content = BackupScheduler.Running ? "백업 중…" : "지금 백업";

        var stale = st.LastSuccessAt is null || st.LastSuccessAt.Value < DateTime.Now.AddDays(-1);
        _status.Children.Add(Line("마지막 성공", st.LastSuccessAt is { } ok ? ok.ToString("yyyy-MM-dd HH:mm") + (st.LastBy == "scheduler" ? " (작업 스케줄러)" : "") : "없음", stale ? "#DC2626" : "#111827"));
        if (st.LastRunAt is { } run && run != st.LastSuccessAt)
            _status.Children.Add(Line("마지막 시도", run.ToString("yyyy-MM-dd HH:mm"), "#B45309"));
        if (!string.IsNullOrEmpty(st.LastError))
            _status.Children.Add(Wrap("오류: " + st.LastError, "#DC2626"));
        foreach (var t in st.Targets)
            _status.Children.Add(Wrap($"{(t.Ok ? "✔" : "✖")} {(t.IsLocal ? $"이 PC Neosys 폴더 ({t.Root})" : t.Root)}{(t.Ok ? "" : " — " + t.Error)}", t.Ok ? "#15803D" : "#DC2626"));
        var s = AppServices.Settings;
        _status.Children.Add(Wrap($"자동 백업: {(s.ScheduledBackup ? "작업 스케줄러가 " : "")}{BackupSettingsPanel.Every(s.BackupIntervalMinutes)} · 일자별 {s.BackupKeepDays}일 보관{(s.BackupOnExit ? " · 종료 시 백업" : "")}", "#6B7280"));
        if (s.BackupShares.Count == 0)
            _status.Children.Add(Wrap("등록된 공유폴더가 없어 이 PC에만 백업됩니다. PC가 고장 나면 복구할 수 없으니 [연결된 공유폴더]에서 다른 PC의 공유를 등록하세요.", "#B45309"));
    }

    /// <summary>[지금 백업] — 공유 정보 알림과 함께 쓴다</summary>
    internal static async Task RunBackupNowAsync()
    {
        var r = await BackupScheduler.RunNowAsync();
        if (r is null) return;
        if (r.Ok) Dialogs.Info(r.Targets.Any(t => !t.Ok) ? "백업했습니다. 일부 공유폴더는 실패했습니다(백업 상태 참고)." : "백업했습니다.");
        else Dialogs.Warn("백업하지 못했습니다.\n" + (r.Error ?? string.Join("\n", r.Targets.Select(t => t.Error))));
    }

    private FrameworkElement RestorePanel()
    {
        var sp = new StackPanel();
        sp.Children.Add(Wrap("이 PC의 Neosys 폴더와 등록된 공유폴더에서 내 계정의 백업을 찾아 날짜별로 보여 줍니다. 복구하면 그 날짜 이후 입력한 데이터는 사라집니다(지금 DB는 '복구 전 DB'로 남겨 되돌릴 수 있습니다). " +
                             "백업이 돌고 있으면 끝난 뒤 복구합니다.", "#6B7280"));
        _restore.Style = (Style)FindResource("DangerButton");
        _loadBackups.Click += async (_, _) => await LoadBackupsAsync();
        _restore.Click += async (_, _) => { if (_backups.SelectedItem is ListBoxItem { Tag: IReadOnlyList<BackupEntry> entries }) await RestoreEntriesAsync(entries); };
        _backups.SelectionChanged += (_, _) => _restore.IsEnabled = _backups.SelectedItem is ListBoxItem { Tag: IReadOnlyList<BackupEntry> };
        ScrollViewer.SetHorizontalScrollBarVisibility(_backups, ScrollBarVisibility.Disabled);
        _backups.Items.Add(Hint("[백업 목록 불러오기]를 누르세요."));
        sp.Children.Add(_backups);
        var row = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 6, 0, 0) };
        row.Children.Add(_loadBackups);
        row.Children.Add(_restore);
        sp.Children.Add(row);
        return sp;
    }

    /// <summary>이 PC Neosys 폴더·공유폴더에서 날짜별 백업과 '복구 전 DB'를 모은다(연결 안 되는 공유폴더는 오래 걸릴 수 있어 백그라운드)</summary>
    internal async Task LoadBackupsAsync()
    {
        var s = AppServices.Session;
        var shares = AppServices.Settings.BackupShares.ToList();
        var local = AppServices.ShareFolder;
        var dbPath = AppServices.MyDb.FilePath;
        _loadBackups.IsEnabled = false;
        _loadBackups.Content = "찾는 중…";
        try
        {
            var (days, before) = await Task.Run(() => (
                RestoreService.ByDate(RestoreService.Find(shares, local, s.UserId)),
                RestoreService.FindBeforeRestore(dbPath, s.UserId)));
            _backups.Items.Clear();
            foreach (var day in days)
            {
                var e = day[0];
                var from = e.IsLocal ? "이 PC Neosys 폴더" : e.Source;
                var other = day.Count > 1 ? $" 외 {day.Count - 1}곳" : "";
                var foreign = !string.Equals(e.Manifest.Machine, Environment.MachineName, StringComparison.OrdinalIgnoreCase) && e.Manifest.Machine != "";
                _backups.Items.Add(Item(day, $"{e.Manifest.BackedUpAt:yyyy-MM-dd (ddd) HH:mm}",
                    $"PC {Pc(e.Manifest.Machine)}{(foreign ? "(다른 PC)" : "")} · {Size(e.Manifest.Size)} · {from}{other}", foreign ? "#B45309" : "#6B7280"));
            }
            foreach (var e in before)
                _backups.Items.Add(Item(new[] { e }, $"{e.Manifest.BackedUpAt:yyyy-MM-dd (ddd) HH:mm} 복구 전 DB", $"복구하기 직전의 내 DB · {Size(e.Manifest.Size)} · 이 PC", "#7C3AED"));
            if (_backups.Items.Count == 0) _backups.Items.Add(Hint("찾은 백업이 없습니다."));
        }
        finally
        {
            _loadBackups.IsEnabled = true;
            _loadBackups.Content = "백업 목록 불러오기";
        }

        static ListBoxItem Item(IReadOnlyList<BackupEntry> entries, string title, string detail, string color)
        {
            var line = new StackPanel();
            line.Children.Add(new TextBlock { Text = title, FontWeight = FontWeights.SemiBold });
            line.Children.Add(new TextBlock { Text = detail, FontSize = 12, Foreground = Legacy.B(color), TextTrimming = TextTrimming.CharacterEllipsis });
            return new ListBoxItem { Content = line, Tag = entries, ToolTip = entries[0].DbFile, Padding = new Thickness(6, 4, 6, 4) };
        }
    }

    /// <summary>
    /// 복구 — 다른 메뉴 창을 닫고 자동 백업을 멈춘 뒤 DB를 바꾸고 프로그램을 다시 시작한다. 백업(작업 스케줄러 포함)이 돌고 있으면 끝날 때까지 기다린다.
    /// 실패하면 지금 DB는 그대로이고 자동 백업을 다시 켠다.
    /// </summary>
    private async Task RestoreEntriesAsync(IReadOnlyList<BackupEntry> entries)
    {
        if (AppServices.Viewing is not null) { Dialogs.Warn("직원 DB를 보는 중입니다. 대시보드에서 [내 DB로 돌아가기]를 누른 뒤 복구하세요."); return; }
        var e = entries[0];
        var what = e.IsBeforeRestore ? $"{e.Manifest.BackedUpAt:yyyy-MM-dd HH:mm} 복구 전 DB" : $"{e.Manifest.BackedUpAt:yyyy-MM-dd HH:mm} 백업";
        if (!Dialogs.Confirm($"{what}으로 되돌립니다.\n그 이후 입력한 데이터는 사라집니다(지금 DB는 '복구 전 DB'로 남깁니다).\n\n열려 있는 메뉴 창을 닫고, 복구 후 프로그램을 다시 시작합니다. 계속할까요?", "복구")) return;

        // DB를 쓰는 화면이 없어야 교체할 수 있다 — 저장하지 않은 창은 닫을 때 묻는다
        foreach (var w in Application.Current.Windows.Cast<Window>().Where(w => w != this && w != Owner).ToList()) w.Close();
        if (Application.Current.Windows.Cast<Window>().Any(w => w != this && w != Owner && w.IsVisible))
        {
            Dialogs.Warn("닫히지 않은 창이 있습니다. 창을 닫은 뒤 다시 시도하세요.");
            return;
        }

        BackupScheduler.Suspend();
        _restore.IsEnabled = _loadBackups.IsEnabled = _restoreFile.IsEnabled = false;
        _restore.Content = "복구 중…";
        var dbPath = AppServices.Db.FilePath;
        var files = AppServices.FilesRoot;
        var keep = AppServices.Settings.BackupKeepDays;
        var r = await Task.Run(() => RestoreService.Restore(entries, dbPath, files, keep));
        if (!r.Ok)
        {
            BackupScheduler.Start(AppServices.Session);
            _restore.Content = "선택한 백업으로 복구";
            _restore.IsEnabled = _loadBackups.IsEnabled = true;
            UpdateFileButtons();
            Dialogs.Error(r.Error!);
            return;
        }
        Dialogs.Info($"복구했습니다({r.Used!.Manifest.BackedUpAt:yyyy-MM-dd HH:mm} · {(r.Used.IsLocal ? "이 PC" : r.Used.Source)})." +
                     (r.FilesRestored > 0 ? $"\n첨부파일 {r.FilesRestored}개를 받아 왔습니다." : "") +
                     "\n\n프로그램을 다시 시작합니다. 다시 로그인하세요.", "복구");
        App.Restart();
    }

    /// <summary>(대표) 다른 계정 백업을 복사·검사해 읽기 전용으로 열고, 앱 전체를 그 DB로 바꾼다(메뉴 창은 닫는다)</summary>
    private async Task ViewStaffAsync(IReadOnlyList<BackupEntry> candidates, string userId, string name)
    {
        var at = candidates[0].Manifest.BackedUpAt;
        if (!Dialogs.Confirm($"{name} 님의 DB({at:yyyy-MM-dd HH:mm} 백업)를 읽기 전용으로 엽니다.\n열려 있는 메뉴 창은 닫습니다. 계속할까요?", "직원 DB 보기")) return;
        _viewFile.IsEnabled = false;
        _viewFile.Content = "여는 중…";
        try
        {
            AppServices.ExitStaffView();   // 다른 직원을 보던 중이면 먼저 정리
            var copy = await Task.Run(() => StaffDbService.Open(candidates, StaffDbService.DefaultViewRoot));
            WindowManager.CloseAll();      // 이 창도 닫힌다 — 대시보드 안내줄에서 돌아갈 수 있다
            await AppServices.EnterStaffViewAsync(copy, new StaffView(userId, name, copy.Used.Manifest.BackedUpAt, copy.Used.Source));
        }
        catch (Exception ex)
        {
            Dialogs.Error(Dialogs.Explain(ex));
            if (IsLoaded)
            {
                _viewFile.Content = "읽기 전용으로 보기";
                UpdateFileButtons();
            }
        }
    }

    // ---------------- 도우미 ----------------

    internal static void Save()
    {
        try { AppServices.Settings.Save(); }
        catch (Exception ex) { Dialogs.Error("설정을 저장하지 못했습니다.\n" + ex.Message); }
    }

    private static ListBox Pane()
    {
        var lb = new ListBox { BorderBrush = Legacy.B("#D1D5DB"), HorizontalContentAlignment = HorizontalAlignment.Stretch, Margin = new Thickness(0, 4, 0, 0) };
        ScrollViewer.SetHorizontalScrollBarVisibility(lb, ScrollBarVisibility.Disabled);
        return lb;
    }

    /// <summary>3분할 한 칸 — 제목 / 목록 / 아래 버튼</summary>
    private static FrameworkElement Column(string title, ListBox list, params Button[] buttons)
    {
        var dock = new DockPanel();
        var header = new TextBlock { Text = title, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#374151") };
        DockPanel.SetDock(header, Dock.Top);
        dock.Children.Add(header);
        var row = new WrapPanel { Margin = new Thickness(0, 6, 0, 0) };
        foreach (var b in buttons)
        {
            b.Margin = new Thickness(row.Children.Count == 0 ? 0 : 6, 0, 0, 0);
            row.Children.Add(b);
        }
        DockPanel.SetDock(row, Dock.Bottom);
        dock.Children.Add(row);
        dock.Children.Add(list);
        return dock;
    }

    private static ListBoxItem Hint(string text) =>
        new() { Content = new TextBlock { Text = text, Foreground = Legacy.B("#9CA3AF"), TextWrapping = TextWrapping.Wrap }, IsEnabled = false };

    private static string Pc(string machine) => machine == "" ? "알 수 없음" : machine;

    private static string Size(long bytes) => bytes switch
    {
        >= 1L << 30 => $"{bytes / (double)(1L << 30):0.0}GB",
        >= 1L << 20 => $"{bytes / (double)(1L << 20):0.0}MB",
        _ => $"{Math.Max(1, bytes / 1024)}KB",
    };

    internal static void Put(Grid g, UIElement e, int row, int col)
    {
        Grid.SetRow(e, row);
        Grid.SetColumn(e, col);
        g.Children.Add(e);
    }

    internal static TextBlock Label(string text) => new() { Text = text, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#374151"), VerticalAlignment = VerticalAlignment.Center };

    internal static FrameworkElement Line(string label, string value, string color = "#111827", double labelWidth = 90)
    {
        var dock = new DockPanel { Margin = new Thickness(0, 2, 0, 2) };
        var l = new TextBlock { Text = label, Width = labelWidth, Foreground = Legacy.B("#6B7280") };
        DockPanel.SetDock(l, Dock.Left);
        dock.Children.Add(l);
        dock.Children.Add(new TextBlock { Text = value, Foreground = Legacy.B(color), FontWeight = FontWeights.SemiBold, TextWrapping = TextWrapping.Wrap });
        return dock;
    }

    /// <summary>상태 한 줄 — ✔ 좋음 / ✖ 문제(warnOnly면 주황 ! — 꼭 필요하지는 않은 항목)</summary>
    private static FrameworkElement State(string label, bool good, string goodText, string badText, bool warnOnly = false) =>
        Line(label, good ? "✔ " + goodText : (warnOnly ? "! " : "✖ ") + badText, good ? "#15803D" : warnOnly ? "#B45309" : "#DC2626", labelWidth: 140);

    internal static TextBlock Wrap(string text, string color) =>
        new() { Text = text, Foreground = Legacy.B(color), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 3, 0, 0), FontSize = 12.5 };

    internal static TabItem Tab(string header, FrameworkElement content) =>
        new() { Header = new TextBlock { Text = header, Padding = new Thickness(10, 3, 10, 3), FontWeight = FontWeights.SemiBold }, Content = content };

    private static ScrollViewer Page(params FrameworkElement[] cards)
    {
        var sp = new StackPanel { Margin = new Thickness(12, 0, 12, 12) };
        foreach (var c in cards) sp.Children.Add(c);
        return new ScrollViewer { VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Content = sp };
    }

    private Border Card(string title, FrameworkElement body)
    {
        var sp = new StackPanel();
        sp.Children.Add(new TextBlock { Text = title, Style = (Style)FindResource("SectionHeader"), Margin = new Thickness(0, 0, 0, 8) });
        sp.Children.Add(body);
        return new Border { Style = (Style)FindResource("Card"), Padding = new Thickness(16, 12, 16, 14), Margin = new Thickness(0, 10, 0, 0), Child = sp };
    }
}

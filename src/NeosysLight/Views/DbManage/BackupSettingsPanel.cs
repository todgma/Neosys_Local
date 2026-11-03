using System.Windows;
using System.Windows.Controls;

using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.DbManage;

/// <summary>백업 설정(주기·보관 기간·종료 시·작업 스케줄러) — DB 관리 창과 공유 정보 알림이 함께 쓴다. 바꾸면 settings.json에 바로 저장한다</summary>
public sealed class BackupSettingsPanel : StackPanel
{
    private readonly TextBlock _taskState = new() { FontSize = 12, Margin = new Thickness(22, 0, 0, 0), TextWrapping = TextWrapping.Wrap };

    /// <param name="changed">설정을 바꾼 뒤 호출(상태 표시 갱신)</param>
    public BackupSettingsPanel(Action changed)
    {
        var s = AppServices.Settings;
        var grid = new Grid();
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(110) });
        grid.ColumnDefinitions.Add(new ColumnDefinition());
        for (var i = 0; i < 4; i++) grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto, MinHeight = 34 });

        var every = Combo(new[] { 30, 60, 120, 240 }, s.BackupIntervalMinutes, Every);
        every.SelectionChanged += async (_, _) =>
        {
            if (every.SelectedItem is not ComboBoxItem { Tag: int v }) return;
            s.BackupIntervalMinutes = v;
            DbManageWindow.Save();
            if (s.ScheduledBackup) await RegisterTaskAsync();   // 스케줄러 주기도 바꾼다
            BackupScheduler.Reschedule();
            changed();
        };
        var keep = Combo(new[] { 3, 7, 14, 30 }, s.BackupKeepDays, d => $"{d}일");
        keep.SelectionChanged += (_, _) =>
        {
            if (keep.SelectedItem is not ComboBoxItem { Tag: int v }) return;
            s.BackupKeepDays = v;
            DbManageWindow.Save();
            changed();
        };
        var onExit = new CheckBox { Content = "프로그램을 끝내거나 로그아웃할 때 백업", IsChecked = s.BackupOnExit, VerticalAlignment = VerticalAlignment.Center };
        onExit.Click += (_, _) => { s.BackupOnExit = onExit.IsChecked == true; DbManageWindow.Save(); changed(); };

        var task = new CheckBox { Content = "Windows 작업 스케줄러로 자동 백업 (프로그램이 꺼져 있어도)", IsChecked = s.ScheduledBackup, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 8, 0, 0) };
        task.Click += async (_, _) =>
        {
            task.IsEnabled = false;
            try
            {
                if (task.IsChecked == true)
                {
                    if (!await RegisterTaskAsync()) { task.IsChecked = false; return; }
                    s.ScheduledBackup = true;
                }
                else
                {
                    var me = AppServices.Session.UserId;
                    var error = await Task.Run(() => ScheduledBackupTask.Delete(me));
                    if (error is not null) { Dialogs.Warn(error); task.IsChecked = true; return; }
                    s.ScheduledBackup = false;
                }
                DbManageWindow.Save();
                BackupScheduler.Reschedule();
                changed();
            }
            finally
            {
                task.IsEnabled = true;
                await RefreshTaskStateAsync();
            }
        };
        var taskPanel = new StackPanel();
        taskPanel.Children.Add(task);
        taskPanel.Children.Add(_taskState);

        DbManageWindow.Put(grid, DbManageWindow.Label("자동 백업 주기"), 0, 0); DbManageWindow.Put(grid, every, 0, 1);
        DbManageWindow.Put(grid, DbManageWindow.Label("보관 기간"), 1, 0); DbManageWindow.Put(grid, keep, 1, 1);
        DbManageWindow.Put(grid, DbManageWindow.Label("종료 시"), 2, 0); DbManageWindow.Put(grid, onExit, 2, 1);
        DbManageWindow.Put(grid, DbManageWindow.Label("작업 스케줄러"), 3, 0); DbManageWindow.Put(grid, taskPanel, 3, 1);
        Children.Add(grid);
        Children.Add(DbManageWindow.Wrap("하루에 백업 파일 1개(계정_yyyyMMdd.db, 그날 마지막 백업)를 남기고, 보관 기간이 지난 날짜 파일은 자동으로 지웁니다. " +
                                         "작업 스케줄러를 켜면 주기 백업은 스케줄러가 하고 프로그램은 하지 않습니다([지금 백업]·종료 시 백업은 그대로). " +
                                         "스케줄러는 Windows에 로그인해 있을 때만 돌고, PC가 꺼져 있던 동안 놓친 백업은 켜진 뒤 한 번 합니다.", "#6B7280"));
    }

    /// <summary>작업 스케줄러에 등록(이미 있으면 주기만 바꿈). 성공하면 true</summary>
    private static async Task<bool> RegisterTaskAsync()
    {
        var exe = Environment.ProcessPath;
        if (exe is null) { Dialogs.Warn("프로그램 위치를 알 수 없어 작업 스케줄러에 등록하지 못했습니다."); return false; }
        var me = AppServices.Session.UserId;
        var minutes = AppServices.Settings.BackupIntervalMinutes;
        var error = await Task.Run(() => ScheduledBackupTask.Register(exe, me, minutes));
        if (error is null) return true;
        Dialogs.Warn(error);
        return false;
    }

    public async Task RefreshTaskStateAsync()
    {
        var me = AppServices.Session.UserId;
        var exists = await Task.Run(() => ScheduledBackupTask.Exists(me));
        var on = AppServices.Settings.ScheduledBackup;
        (_taskState.Text, _taskState.Foreground) = (on, exists) switch
        {
            (true, true) => ($"등록됨 — 작업 이름 {ScheduledBackupTask.TaskName(me)}", Legacy.B("#15803D")),
            (true, false) => ("켜져 있지만 작업 스케줄러에 작업이 없습니다. 껐다가 다시 켜세요(그동안은 백업되지 않습니다).", Legacy.B("#DC2626")),
            (false, true) => ("꺼져 있지만 작업 스케줄러에 작업이 남아 있습니다. 켰다가 다시 끄면 지워집니다.", Legacy.B("#B45309")),
            _ => ("꺼짐 — 프로그램이 켜져 있는 동안 프로그램이 백업합니다.", Legacy.B("#6B7280")),
        };
    }

    private static ComboBox Combo(int[] values, int current, Func<int, string> label)
    {
        var cb = new ComboBox { Width = 140, HorizontalAlignment = HorizontalAlignment.Left, VerticalAlignment = VerticalAlignment.Center };
        if (!values.Contains(current)) values = values.Append(current).Order().ToArray();
        foreach (var v in values) cb.Items.Add(new ComboBoxItem { Content = label(v), Tag = v });
        cb.SelectedIndex = Array.IndexOf(values, current);
        return cb;
    }

    internal static string Every(int minutes) => minutes % 60 == 0 ? $"{minutes / 60}시간마다" : $"{minutes}분마다";
}

using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Win32;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

/// <summary>
/// 첨부파일 칸(기존 FileAttachSection / FileUploadForm) — 사진은 미리보기, 그 외는 파일 이름.
/// [파일 추가]·끌어다 놓기로 첨부, 두 번 누르면 열기. 대상 키(refKey)가 없으면(저장 전) 첨부할 수 없다.
/// </summary>
public sealed class AttachmentPanel : DockPanel
{
    private readonly FileService _svc;
    private readonly FileKind _kind;
    private readonly Func<string?> _refKey;
    private readonly int _maxCount;
    private readonly ListBox _list = new() { MinHeight = 150, AllowDrop = true };
    private readonly TextBlock _hint = new() { Foreground = Brushes.SlateGray, Margin = new Thickness(0, 4, 0, 0), TextWrapping = TextWrapping.Wrap };
    private readonly TextBlock _title = new() { FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center };

    public AttachmentPanel(FileKind kind, Func<string?> refKey, int maxCount = 0)
    {
        _svc = AppServices.Create((sp, s) => new FileService(sp, s, AppServices.FilesRoot));
        _kind = kind;
        _refKey = refKey;
        _maxCount = maxCount;
        Margin = new Thickness(0, 4, 0, 8);

        var head = new DockPanel { Margin = new Thickness(0, 0, 0, 4) };
        var buttons = new StackPanel { Orientation = Orientation.Horizontal };
        Button Btn(string text, Func<Task> act)
        {
            var b = new Button { Content = text, Padding = new Thickness(8, 1, 8, 1), MinHeight = 24 };
            b.Click += async (_, _) => await Dialogs.RunAsync(act);
            buttons.Children.Add(b);
            return b;
        }
        var add = Btn("파일 추가", AddAsync);
        Btn("열기", () => { Open(Selected); return Task.CompletedTask; });
        Btn("다른 이름으로 저장", () => { SaveAs(Selected); return Task.CompletedTask; });
        var del = Btn("삭제", DeleteAsync);
        if (AppServices.Viewing is not null) add.Visibility = del.Visibility = Visibility.Collapsed;   // 직원 DB 보기(읽기 전용)
        DockPanel.SetDock(buttons, Dock.Right);
        head.Children.Add(buttons);
        _title.Foreground = (Brush)Application.Current.FindResource("PrimaryDark");
        head.Children.Add(_title);
        SetDock(head, Dock.Top);
        Children.Add(head);
        SetDock(_hint, Dock.Bottom);
        Children.Add(_hint);

        _list.ItemsPanel = new ItemsPanelTemplate(new FrameworkElementFactory(typeof(WrapPanel)));
        ScrollViewer.SetHorizontalScrollBarVisibility(_list, ScrollBarVisibility.Disabled);
        _list.MouseDoubleClick += (_, _) => Open(Selected);
        _list.Drop += async (_, e) =>
        {
            if (e.Data.GetData(DataFormats.FileDrop) is string[] files) await Dialogs.RunAsync(() => AttachFilesAsync(files));
        };
        Children.Add(_list);

        Loaded += async (_, _) => await ReloadAsync();
    }

    private Row? Selected => (_list.SelectedItem as FrameworkElement)?.Tag as Row;

    public async Task ReloadAsync()
    {
        var key = _refKey();
        _list.Items.Clear();
        if (string.IsNullOrEmpty(key))
        {
            _title.Text = _kind.Title;
            _hint.Text = "먼저 저장한 뒤 첨부할 수 있습니다.";
            return;
        }
        var rows = await _svc.ListAsync(_kind, key);
        foreach (var r in rows) _list.Items.Add(Tile(r));
        _title.Text = $"{_kind.Title} ({rows.Count}{(_maxCount > 0 ? $"/{_maxCount}" : "")})";
        _hint.Text = $"파일당 최대 {_kind.MaxBytes / 1024 / 1024}MB · 끌어다 놓아도 첨부됩니다 · 저장 위치: 이 PC({_svc.Root})";
    }

    private FrameworkElement Tile(Row r)
    {
        var sp = new StackPanel { Width = 130, Margin = new Thickness(4) };
        var path = _svc.PathOf(r);
        if (path is not null && FileService.IsImage(r))
        {
            try
            {
                var bmp = new BitmapImage();
                bmp.BeginInit();
                bmp.CacheOption = BitmapCacheOption.OnLoad;   // 파일을 잠그지 않도록
                bmp.DecodePixelWidth = 240;
                bmp.UriSource = new Uri(path);
                bmp.EndInit();
                sp.Children.Add(new Image { Source = bmp, Height = 90, Stretch = Stretch.Uniform });
            }
            catch { sp.Children.Add(Icon(r)); }
        }
        else sp.Children.Add(Icon(r));
        sp.Children.Add(new TextBlock { Text = r.Str("orig_name"), TextTrimming = TextTrimming.CharacterEllipsis, ToolTip = r.Str("orig_name"), Margin = new Thickness(0, 3, 0, 0) });
        if (path is null) sp.Children.Add(new TextBlock { Text = "(파일 없음)", Foreground = Brushes.Crimson });
        return new Border { Child = sp, Tag = r, ToolTip = $"{r.Str("orig_name")}\n{(r.Long("file_size") ?? 0) / 1024:#,0}KB · {r.Str("reg_dt")}" };
    }

    private static FrameworkElement Icon(Row r) => new Border
    {
        Height = 90, Background = new SolidColorBrush(Color.FromRgb(0xEE, 0xF2, 0xFF)),
        Child = new TextBlock { Text = (r.Str("ext") ?? "파일").ToUpperInvariant(), FontSize = 20, FontWeight = FontWeights.Bold, Foreground = Brushes.SlateBlue, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center },
    };

    private async Task AddAsync()
    {
        if (string.IsNullOrEmpty(_refKey())) { Dialogs.Info("먼저 저장한 뒤 첨부할 수 있습니다."); return; }
        var dlg = new OpenFileDialog { Multiselect = true, Title = $"{_kind.Title} 첨부", Filter = _kind.Filter ?? "모든 파일|*.*" };
        if (!Dialogs.ShowFile(dlg)) return;
        await AttachFilesAsync(dlg.FileNames);
    }

    private async Task AttachFilesAsync(IEnumerable<string> files)
    {
        var key = _refKey();
        if (string.IsNullOrEmpty(key)) { Dialogs.Info("먼저 저장한 뒤 첨부할 수 있습니다."); return; }
        var list = files.Where(File.Exists).ToList();
        if (_maxCount > 0 && _list.Items.Count + list.Count > _maxCount)
        {
            Dialogs.Warn($"최대 {_maxCount}개까지 첨부할 수 있습니다.");
            return;
        }
        var errors = new List<string>();
        foreach (var f in list)
        {
            try { await _svc.AttachAsync(_kind, key, f); }
            catch (InvalidOperationException ex) { errors.Add(ex.Message); }
        }
        await ReloadAsync();
        if (errors.Count > 0) Dialogs.Warn(string.Join("\n", errors));
    }

    private void Open(Row? r)
    {
        if (r is null) { Dialogs.Info("파일을 선택하세요."); return; }
        var path = _svc.PathOf(r);
        if (path is null) { Dialogs.Warn("파일을 찾을 수 없습니다."); return; }
        Dialogs.OpenExternal(path);
    }

    private void SaveAs(Row? r)
    {
        if (r is null) { Dialogs.Info("파일을 선택하세요."); return; }
        var path = _svc.PathOf(r);
        if (path is null) { Dialogs.Warn("파일을 찾을 수 없습니다."); return; }
        var dlg = new SaveFileDialog { FileName = r.Str("orig_name") ?? Path.GetFileName(path) };
        if (Dialogs.ShowFile(dlg)) File.Copy(path, dlg.FileName, overwrite: true);
    }

    private async Task DeleteAsync()
    {
        if (Selected is not { } r) { Dialogs.Info("삭제할 파일을 선택하세요."); return; }
        if (!Dialogs.Confirm($"'{r.Str("orig_name")}'을(를) 삭제하시겠습니까?")) return;
        await _svc.DeleteAsync(r.Long("file_id")!.Value);
        await ReloadAsync();
    }
}

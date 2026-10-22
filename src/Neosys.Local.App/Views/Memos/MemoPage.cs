using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Threading;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;
using static Neosys.Local.App.Ui.Legacy;

namespace Neosys.Local.App.Views.Memos;

/// <summary>
/// 메모 — 기존 StickyMemo(별도 창 500×800): 흰 머리줄 '메모 (n)' + [메모 추가][닫기], 2열 포스트잇(색 동그라미=색 바꾸기, 휴지통=삭제).
/// 내용은 입력을 멈추고 0.6초 뒤 자동 저장(기존 디바운스와 같음).
/// </summary>
public sealed class MemoPage : DockPanel
{
    private readonly MemoService _svc = AppServices.Create((sp, s) => new MemoService(sp, s));
    private readonly Grid _board = new() { Margin = new Thickness(16) };
    private int _noteCount;
    private readonly TextBlock _count = new() { FontSize = 18, FontWeight = FontWeights.Medium, Foreground = B("#94A3B8") };

    public MemoPage()
    {
        Background = B("#F8FAFC");
        var head = new DockPanel { Background = Brushes.White };
        var buttons = new StackPanel { Orientation = Orientation.Horizontal };
        var add = new Button { Content = "+ 메모 추가", Style = (Style)Application.Current.FindResource("PrimaryButton"), FontSize = 13 };
        add.Click += async (_, _) => await Dialogs.RunAsync(async () => { await _svc.AddAsync(_noteCount); await LoadAsync(); });
        var close = new Button { Content = "✕ 닫기", Background = B("#64748B"), BorderBrush = B("#64748B"), Foreground = Brushes.White, FontSize = 13 };
        close.Click += (_, _) => Window.GetWindow(this)?.Close();
        buttons.Children.Add(add);
        buttons.Children.Add(close);
        DockPanel.SetDock(buttons, Dock.Right);
        head.Children.Add(buttons);
        var title = new TextBlock { FontSize = 18, FontWeight = FontWeights.Bold, Foreground = B("#1E293B"), VerticalAlignment = VerticalAlignment.Center };
        title.Inlines.Add(new System.Windows.Documents.Run("메모 "));
        title.Inlines.Add(new System.Windows.Documents.InlineUIContainer(_count) { BaselineAlignment = BaselineAlignment.Center });
        head.Children.Add(title);
        var headBorder = new Border { Child = head, Background = Brushes.White, BorderBrush = B("#E2E8F0"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(16, 10, 12, 10) };
        SetDock(headBorder, Dock.Top);
        Children.Add(headBorder);
        _board.ColumnDefinitions.Add(new ColumnDefinition());
        _board.ColumnDefinitions.Add(new ColumnDefinition());
        Children.Add(new ScrollViewer { Content = _board, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
        Loaded += async (_, _) => await LoadAsync();
    }

    private async Task LoadAsync()
    {
        await Dialogs.RunAsync(async () =>
        {
            var rows = await _svc.ListAsync();
            _noteCount = rows.Count;
            _count.Text = $"({rows.Count})";
            _board.Children.Clear();
            _board.RowDefinitions.Clear();
            if (rows.Count == 0)
            {
                var empty = new TextBlock { Text = "메모가 없습니다. “메모 추가”를 눌러 급한 내용을 붙여두세요.", Foreground = B("#94A3B8"), FontSize = 13, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 40, 0, 0) };
                Grid.SetColumnSpan(empty, 2);
                _board.Children.Add(empty);
                return;
            }
            for (int i = 0; i < rows.Count; i++)
            {
                if (i % 2 == 0) _board.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                var note = Note(rows[i]);
                note.Margin = new Thickness(i % 2 == 0 ? 0 : 6, 0, i % 2 == 0 ? 6 : 0, 12);
                Grid.SetRow(note, i / 2);
                Grid.SetColumn(note, i % 2);
                _board.Children.Add(note);
            }
        }, "메모를 불러오지 못했습니다.");
    }

    private FrameworkElement Note(Row r)
    {
        var id = r.Long("memo_id")!.Value;
        var box = new TextBox
        {
            Text = r.Str("content") ?? "", AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, FontSize = 13, Foreground = B("#1E293B"),
            BorderThickness = new Thickness(0), Background = Brushes.Transparent, MinHeight = 150, Padding = new Thickness(0),
            VerticalContentAlignment = VerticalAlignment.Top, VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
        };
        Placeholder.Set(box, "메모 입력…");
        var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(600) };
        timer.Tick += async (_, _) =>
        {
            timer.Stop();
            await Dialogs.RunAsync(() => _svc.SaveContentAsync(id, box.Text), "메모 저장에 실패했습니다.");
        };
        box.TextChanged += (_, _) => { timer.Stop(); timer.Start(); };
        box.LostFocus += async (_, _) => { if (timer.IsEnabled) { timer.Stop(); await Dialogs.RunAsync(() => _svc.SaveContentAsync(id, box.Text)); } };

        var card = new Border
        {
            MinHeight = 180, Padding = new Thickness(8), CornerRadius = new CornerRadius(4), Background = B(r.Str("color") ?? MemoService.Colors[0]),
            Effect = new DropShadowEffect { BlurRadius = 8, ShadowDepth = 3, Opacity = 0.12, Direction = 270 },
        };
        var dot = new Button { Width = 16, Height = 16, MinHeight = 0, Padding = new Thickness(0), Margin = new Thickness(0, 0, 4, 0), ToolTip = "색 변경", Background = new SolidColorBrush(Color.FromArgb(150, 255, 255, 255)), BorderBrush = new SolidColorBrush(Color.FromArgb(40, 0, 0, 0)) };
        dot.Template = CircleTemplate();
        dot.Click += async (_, _) =>
        {
            var next = MemoService.NextColor(r.Str("color"));
            r["color"] = next;
            card.Background = B(next);
            await Dialogs.RunAsync(() => _svc.SetColorAsync(id, next));
        };
        var del = new Button { Content = new TextBlock { Text = "", FontFamily = (FontFamily)Application.Current.FindResource("IconFont"), FontSize = 13, Foreground = B("#7C2D12") }, Background = Brushes.Transparent, BorderThickness = new Thickness(0), MinHeight = 0, Padding = new Thickness(2), ToolTip = "삭제" };
        del.Click += async (_, _) =>
        {
            timer.Stop();
            await Dialogs.RunAsync(() => _svc.DeleteAsync(id));
            await LoadAsync();
        };
        var bar = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 0, 0, 2) };
        bar.Children.Add(dot);
        bar.Children.Add(del);
        var dp = new DockPanel();
        DockPanel.SetDock(bar, Dock.Top);
        dp.Children.Add(bar);
        dp.Children.Add(box);
        card.Child = dp;
        return card;
    }

    private static ControlTemplate CircleTemplate()
    {
        var t = new ControlTemplate(typeof(Button));
        var e = new FrameworkElementFactory(typeof(System.Windows.Shapes.Ellipse));
        e.SetBinding(System.Windows.Shapes.Shape.FillProperty, new System.Windows.Data.Binding("Background") { RelativeSource = System.Windows.Data.RelativeSource.TemplatedParent });
        e.SetBinding(System.Windows.Shapes.Shape.StrokeProperty, new System.Windows.Data.Binding("BorderBrush") { RelativeSource = System.Windows.Data.RelativeSource.TemplatedParent });
        t.VisualTree = e;
        return t;
    }
}

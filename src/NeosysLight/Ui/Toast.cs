using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Threading;

namespace Neosys.Local.App.Ui;

/// <summary>화면 위쪽 가운데 잠깐 떴다 사라지는 알림(기존 react-hot-toast)</summary>
public static class Toast
{
    public static void Show(string message) => Pop(message, "#111827", "ⓘ");
    public static void Success(string message) => Pop(message, "#059669", "✔");
    public static void Error(string message) => Pop(message, "#DC2626", "✖");

    private static void Pop(string message, string color, string mark)
    {
        if (AuditHook.Active) { AuditHook.Log(mark == "✖" ? "토스트오류" : "토스트", message); return; }
        var owner = Application.Current?.Windows.OfType<Window>().FirstOrDefault(w => w.IsActive) ?? Application.Current?.MainWindow;
        var content = new Border
        {
            Background = Brushes.White, CornerRadius = new CornerRadius(8), Padding = new Thickness(14, 10, 16, 10),
            BorderBrush = new SolidColorBrush(Color.FromRgb(0xE5, 0xE7, 0xEB)), BorderThickness = new Thickness(1),
            Effect = new System.Windows.Media.Effects.DropShadowEffect { BlurRadius = 16, ShadowDepth = 2, Opacity = 0.2, Direction = 270 },
            Margin = new Thickness(12),
        };
        var sp = new StackPanel { Orientation = Orientation.Horizontal };
        sp.Children.Add(new TextBlock { Text = mark, Foreground = (Brush)new BrushConverter().ConvertFromString(color)!, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 0, 8, 0), VerticalAlignment = VerticalAlignment.Center });
        sp.Children.Add(new TextBlock { Text = message, FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Brushes.Black, TextWrapping = TextWrapping.Wrap, MaxWidth = 420 });
        content.Child = sp;

        var w = new Window
        {
            WindowStyle = WindowStyle.None, AllowsTransparency = true, Background = Brushes.Transparent, ShowInTaskbar = false,
            Topmost = true, SizeToContent = SizeToContent.WidthAndHeight, Content = content, ShowActivated = false, ResizeMode = ResizeMode.NoResize,
            FontFamily = (FontFamily)Application.Current!.FindResource("AppFont"),
        };
        w.Loaded += (_, _) =>
        {
            var area = owner is { IsLoaded: true }
                ? new Rect(owner.Left, owner.Top, owner.ActualWidth, owner.ActualHeight)
                : SystemParameters.WorkArea;
            w.Left = area.Left + (area.Width - w.ActualWidth) / 2;
            w.Top = area.Top + 40;
        };
        w.Show();
        var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2.4) };
        timer.Tick += (_, _) =>
        {
            timer.Stop();
            var fade = new DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(250));
            fade.Completed += (_, _) => w.Close();
            w.BeginAnimation(UIElement.OpacityProperty, fade);
        };
        timer.Start();
    }
}

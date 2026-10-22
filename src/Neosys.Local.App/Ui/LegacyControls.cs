using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;

namespace Neosys.Local.App.Ui;

/// <summary>기존 프런트 화면의 작은 부품(유형 버튼·구분 탭·필터 팝업·상담모드 토글)</summary>
public static class Legacy
{
    public static Brush B(string hex) => (Brush)new BrushConverter().ConvertFromString(hex)!;

    /// <summary>다시 그릴 때 재사용하는 요소를 이전 부모에서 떼어 내고 돌려준다("이미 다른 요소의 논리 자식" 오류 방지)</summary>
    public static T Detached<T>(T e) where T : FrameworkElement
    {
        switch (e.Parent)
        {
            case Panel p: p.Children.Remove(e); break;
            case Decorator d: d.Child = null; break;
            case ContentControl c: c.Content = null; break;
        }
        return e;
    }

    /// <summary>유형 버튼(선택 시 인디고 바탕·흰 글자) — 기존 물건종류 필터</summary>
    public static Button Pill(string text, bool selected, Action click, double size = 14)
    {
        var b = new Button
        {
            Content = text, FontSize = size, Padding = new Thickness(8, 5, 8, 5), MinHeight = 0, Margin = new Thickness(0, 0, 4, 4), MinWidth = 48,
            BorderBrush = B("#E5E7EB"), Background = selected ? B("#4F46E5") : Brushes.White, Foreground = selected ? Brushes.White : Brushes.Black,
            FontWeight = selected ? FontWeights.Bold : FontWeights.Medium,
        };
        b.Click += (_, _) => click();
        return b;
    }

    /// <summary>붙어 있는 구분 탭(전체/매매/전세…) — 테두리 하나에 칸만 나뉜 모양</summary>
    public static Border Segmented(IEnumerable<(string Value, string Label)> items, Func<string, bool> isSelected, Action<string> click)
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal };
        var list = items.ToList();
        for (int i = 0; i < list.Count; i++)
        {
            var (v, l) = list[i];
            var on = isSelected(v);
            var cell = new Border
            {
                Background = on ? B("#4F46E5") : Brushes.White, Padding = new Thickness(12, 6, 12, 6), Cursor = Cursors.Hand,
                BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(0, 0, i < list.Count - 1 ? 1 : 0, 0),
                Child = new TextBlock { Text = l, FontSize = 14, FontWeight = on ? FontWeights.SemiBold : FontWeights.Medium, Foreground = on ? Brushes.White : Brushes.Black },
            };
            cell.MouseLeftButtonUp += (_, _) => click(v);
            sp.Children.Add(cell);
        }
        return new Border { Child = sp, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(6), Background = Brushes.White, ClipToBounds = true };
    }

    /// <summary>왼쪽 2px 회색 세로선으로 묶음을 나누는 칸(기존 borderLeft: 2px solid #d1d5db)</summary>
    public static Border Group(params UIElement[] children)
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        foreach (var c in children) sp.Children.Add(c);
        return new Border { Child = sp, BorderBrush = B("#D1D5DB"), BorderThickness = new Thickness(2, 0, 0, 0), Padding = new Thickness(10, 0, 0, 0), Margin = new Thickness(10, 0, 0, 0) };
    }

    public static TextBlock Label(string text, double size = 14, string color = "#000000", FontWeight? weight = null) =>
        new() { Text = text, FontSize = size, FontWeight = weight ?? FontWeights.SemiBold, Foreground = B(color), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) };

    /// <summary>범위 필터 버튼(면적·금액) — 누르면 최소~최대 입력 팝업, 값이 있으면 인디고 강조와 범위 표시</summary>
    public sealed class RangeFilter : Button
    {
        private readonly string _title;
        private readonly string _unit;
        public decimal? Min { get; private set; }
        public decimal? Max { get; private set; }
        public event Action? Changed;

        public RangeFilter(string title, string unit)
        {
            _title = title;
            _unit = unit;
            Padding = new Thickness(12, 5, 12, 5);
            Margin = new Thickness(0, 0, 6, 0);
            Paint();
            Click += (_, _) => OpenPopup();
        }

        private void Paint()
        {
            var active = Min is not null || Max is not null;
            BorderBrush = B(active ? "#4F46E5" : "#E5E7EB");
            Background = active ? B("#EEF2FF") : Brushes.White;
            Foreground = active ? B("#4F46E5") : Brushes.Black;
            Content = active ? $"{_title} ▾  {Min?.ToString("0.##", CultureInfo.InvariantCulture) ?? "0"}~{Max?.ToString("0.##", CultureInfo.InvariantCulture)}{_unit}" : $"{_title} ▾";
        }

        private void OpenPopup()
        {
            var min = new TextBox { Width = 80, Text = Min?.ToString(CultureInfo.InvariantCulture) ?? "" };
            var max = new TextBox { Width = 80, Text = Max?.ToString(CultureInfo.InvariantCulture) ?? "" };
            var row = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(10) };
            row.Children.Add(min);
            row.Children.Add(new TextBlock { Text = " ~ ", VerticalAlignment = VerticalAlignment.Center });
            row.Children.Add(max);
            row.Children.Add(new TextBlock { Text = " " + _unit, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 8, 0) });
            var popup = new Popup { PlacementTarget = this, Placement = PlacementMode.Bottom, StaysOpen = false, AllowsTransparency = true };
            var apply = new Button { Content = "적용", Style = (Style)Application.Current.FindResource("PrimaryButton") };
            var reset = new Button { Content = "초기화" };
            apply.Click += (_, _) =>
            {
                Min = decimal.TryParse(min.Text.Replace(",", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var a) ? a : null;
                Max = decimal.TryParse(max.Text.Replace(",", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var b) ? b : null;
                popup.IsOpen = false;
                Paint();
                Changed?.Invoke();
            };
            reset.Click += (_, _) => { Min = Max = null; popup.IsOpen = false; Paint(); Changed?.Invoke(); };
            row.Children.Add(reset);
            row.Children.Add(apply);
            popup.Child = new Border
            {
                Child = row, Background = Brushes.White, BorderBrush = B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(6),
                Effect = new System.Windows.Media.Effects.DropShadowEffect { BlurRadius = 12, ShadowDepth = 2, Opacity = 0.15, Direction = 270 }, Margin = new Thickness(0, 4, 8, 8),
            };
            popup.IsOpen = true;
            min.Focus();
        }
    }

    /// <summary>상담모드 토글(대시보드·물건·고객 상단 공통) — 켜면 등록창 오른쪽 카드 숨김</summary>
    public static FrameworkElement ConsultToggle()
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal, Cursor = Cursors.Hand, Background = Brushes.Transparent, VerticalAlignment = VerticalAlignment.Center, ToolTip = "상담모드: ON 시 물건/고객 폼의 우측 카드(특징·상담내용·소유자 등)가 숨겨집니다" };
        var label = new TextBlock { Text = "상담모드", FontSize = 13, FontWeight = FontWeights.ExtraBold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) };
        var knob = new Border { Width = 16, Height = 16, CornerRadius = new CornerRadius(8), Background = Brushes.White, Margin = new Thickness(2, 0, 2, 0) };
        var track = new Border { Width = 38, Height = 20, CornerRadius = new CornerRadius(10), Child = knob };
        void Paint()
        {
            var on = AppServices.Settings.ConsultMode;
            track.Background = B(on ? "#4F46E5" : "#CBD5E1");
            knob.HorizontalAlignment = on ? HorizontalAlignment.Right : HorizontalAlignment.Left;
            label.Foreground = B(on ? "#4F46E5" : "#111827");
        }
        Paint();
        sp.MouseLeftButtonUp += (_, _) =>
        {
            AppServices.Settings.ConsultMode = !AppServices.Settings.ConsultMode;
            try { AppServices.Settings.Save(); } catch { /* 설정 저장 실패는 무시 */ }
            Paint();
        };
        sp.IsVisibleChanged += (_, _) => Paint();
        sp.Children.Add(label);
        sp.Children.Add(track);
        return sp;
    }
}

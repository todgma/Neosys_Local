using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 옵션 선택(기존 OptionModal): 분류별 '전체 선택' + 항목 체크, 냉방시설은 선택 시 개수(대) 입력.
/// 결과는 "벽걸이에어컨 2대, 침대, 냉장고" 형태 글자.
/// </summary>
public sealed partial class OptionPicker : Window
{
    private static readonly (string Category, string[] Items)[] Options =
    {
        ("냉방시설", new[] { "벽걸이에어컨", "스탠드에어컨", "천장에어컨" }),
        ("생활시설", new[] { "침대", "책상", "옷장", "붙박이장", "식탁", "소파", "신발장", "냉장고", "세탁기", "건조기", "샤워부스", "욕조", "비데", "싱크대", "식기세척기", "가스레인지", "인덕션레인지", "전자레인지", "가스오븐" }),
        ("보안시설", new[] { "경비원", "비디오폰", "인터폰", "카드키", "CCTV", "사설경비", "현관보안", "방범창" }),
        ("기타시설", new[] { "엘리베이터", "화재경보기", "베란다", "테라스", "마당", "무인택배함" }),
    };

    private readonly List<string> _selected = new();
    private readonly Dictionary<string, int> _counts = new();
    private readonly StackPanel _body = new();
    public string? Result { get; private set; }

    [GeneratedRegex(@"^(.+?)\s+(\d+)대$")]
    private static partial Regex CountRx();

    private static bool Cooling(string o) => Options[0].Items.Contains(o);

    private OptionPicker(string? initial)
    {
        Title = "옵션 선택";
        Width = 640;
        SizeToContent = SizeToContent.Height;
        MaxHeight = SystemParameters.WorkArea.Height * 0.94;
        ResizeMode = ResizeMode.NoResize;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        foreach (var part in (initial ?? "").Split(',').Select(s => s.Trim()).Where(s => s.Length > 0))
        {
            var m = CountRx().Match(part);
            if (m.Success) { _selected.Add(m.Groups[1].Value); _counts[m.Groups[1].Value] = int.Parse(m.Groups[2].Value); }
            else _selected.Add(part);
        }
        var cancel = new Button { Content = "취소", Padding = new Thickness(16, 8, 16, 8), FontSize = 14, Margin = new Thickness(0, 0, 8, 0) };
        cancel.Click += (_, _) => Close();
        var ok = new Button { Content = "확인", Style = (Style)Application.Current.FindResource("PrimaryButton"), Padding = new Thickness(16, 8, 16, 8), FontSize = 14 };
        ok.Click += (_, _) =>
        {
            Result = string.Join(", ", _selected.Select(o => Cooling(o) ? $"{o} {(_counts.TryGetValue(o, out var c) ? c : 1)}대" : o));
            DialogResult = true;
        };
        var foot = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
        foot.Children.Add(cancel);
        foot.Children.Add(ok);
        var root = new StackPanel { Margin = new Thickness(20) };
        root.Children.Add(_body);
        root.Children.Add(new Border { BorderBrush = Legacy.B("#E2E8F0"), BorderThickness = new Thickness(0, 1, 0, 0), Margin = new Thickness(0, 20, 0, 0), Padding = new Thickness(0, 20, 0, 0), Child = foot });
        Content = new ScrollViewer { Content = root, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        Render();
    }

    /// <summary>창을 띄우고 고른 결과(취소면 null)</summary>
    public static string? Pick(Window? owner, string? initial)
    {
        var w = new OptionPicker(initial) { Owner = owner };
        return w.ShowDialog() == true ? w.Result : null;
    }

    private void Render()
    {
        _body.Children.Clear();
        foreach (var (cat, items) in Options)
        {
            var all = items.All(_selected.Contains);
            var head = new StackPanel { Orientation = Orientation.Horizontal };
            var allBox = new CheckBox { IsChecked = all, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 8, 0) };
            allBox.Click += (_, _) =>
            {
                if (all) _selected.RemoveAll(items.Contains);
                else foreach (var o in items) { if (!_selected.Contains(o)) _selected.Add(o); if (Cooling(o)) _counts.TryAdd(o, 1); }
                Render();
            };
            head.Children.Add(allBox);
            head.Children.Add(new TextBlock { Text = cat, FontWeight = FontWeights.SemiBold, FontSize = 14, Margin = new Thickness(0, 0, 8, 0) });
            head.Children.Add(new TextBlock { Text = "전체 선택", FontSize = 14, Foreground = Legacy.B("#64748B") });
            if (cat == "냉방시설") head.Children.Add(new TextBlock { Text = "· 선택 시 개수 입력", FontSize = 11, Foreground = Legacy.B("#94A3B8"), Margin = new Thickness(8, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center });
            _body.Children.Add(new Border { Background = Legacy.B("#F1F5F9"), Padding = new Thickness(13, 8, 13, 8), CornerRadius = new CornerRadius(4), Margin = new Thickness(0, 0, 0, 8), Child = head });

            Panel grid = cat == "냉방시설" ? new WrapPanel() : new UniformGrid4();
            grid.Margin = new Thickness(13, 0, 0, 12);
            foreach (var o in items)
            {
                var sel = _selected.Contains(o);
                var sp = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, cat == "냉방시설" ? 20 : 8, 8) };
                var cb = new CheckBox { Content = o, IsChecked = sel, FontSize = 14, VerticalContentAlignment = VerticalAlignment.Center };
                cb.Click += (_, _) =>
                {
                    if (sel) _selected.Remove(o);
                    else { _selected.Add(o); if (Cooling(o)) _counts.TryAdd(o, 1); }
                    Render();
                };
                sp.Children.Add(cb);
                if (Cooling(o) && sel)
                {
                    var n = new TextBox { Text = (_counts.TryGetValue(o, out var c) ? c : 1).ToString(), Width = 42, FontSize = 14, TextAlignment = TextAlignment.Right, MinHeight = 0, Padding = new Thickness(4, 2, 4, 2), Margin = new Thickness(6, 0, 2, 0) };
                    n.TextChanged += (_, _) => _counts[o] = Math.Max(1, int.TryParse(n.Text, out var v) ? v : 1);
                    sp.Children.Add(n);
                    sp.Children.Add(new TextBlock { Text = "대", FontSize = 14, Foreground = Legacy.B("#64748B"), VerticalAlignment = VerticalAlignment.Center });
                }
                grid.Children.Add(sp);
            }
            _body.Children.Add(grid);
        }
    }

    /// <summary>4열 격자(기존 grid repeat(4, 1fr))</summary>
    private sealed class UniformGrid4 : System.Windows.Controls.Primitives.UniformGrid
    {
        public UniformGrid4() { Columns = 4; }
    }
}

using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

/// <summary>
/// 지역(시도 → 시군구 → 읍면동) 선택. 법정동 목록은 서버 API(/api/system/bjd-list)로 조회한다.
/// withDanji=true면 선택한 법정동의 단지 목록(/api/system/danji-list)도 고를 수 있다.
/// 결과 Row: addr1(시도) addr2(시군구) addr3(읍면동) bjd_code, 단지 선택 시 danji_code·danji_name·danji(서버 단지 정보 Row)
/// </summary>
public sealed class RegionPicker : Window
{
    private readonly ComboBox _sido = Combo(), _sigungu = Combo(), _dong = Combo(), _danji = Combo();
    private readonly TextBlock _status = new() { Foreground = Brushes.SlateGray, Margin = new Thickness(0, 8, 0, 0), TextWrapping = TextWrapping.Wrap };
    private readonly bool _withDanji;

    public Row? Result { get; private set; }

    private RegionPicker(bool withDanji, string title)
    {
        _withDanji = withDanji;
        Title = title;
        Width = 460;
        SizeToContent = SizeToContent.Height;
        ResizeMode = ResizeMode.NoResize;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Owner = Application.Current.Windows.OfType<Window>().FirstOrDefault(w => w.IsActive) ?? Application.Current.MainWindow;

        var g = new Grid { Margin = new Thickness(18) };
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(80) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        void Add(string label, FrameworkElement c)
        {
            var r = g.RowDefinitions.Count;
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            var t = new TextBlock { Text = label, VerticalAlignment = VerticalAlignment.Center };
            Grid.SetRow(t, r);
            Grid.SetRow(c, r);
            Grid.SetColumn(c, 1);
            c.Margin = new Thickness(0, 3, 0, 3);
            g.Children.Add(t);
            g.Children.Add(c);
        }
        Add("시/도", _sido);
        Add("시/군/구", _sigungu);
        Add("읍/면/동", _dong);
        if (withDanji) Add("단지", _danji);

        var ok = new Button { Content = "선택", Style = (Style)Application.Current.FindResource("PrimaryButton"), MinWidth = 80, IsDefault = true };
        var cancel = new Button { Content = "취소", MinWidth = 80, IsCancel = true };
        ok.Click += (_, _) => Accept();
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 12, 0, 0) };
        buttons.Children.Add(ok);
        buttons.Children.Add(cancel);

        var root = new StackPanel { Margin = new Thickness(0, 0, 0, 8) };
        root.Children.Add(g);
        var foot = new StackPanel { Margin = new Thickness(18, 0, 18, 6) };
        foot.Children.Add(_status);
        foot.Children.Add(buttons);
        root.Children.Add(foot);
        Content = root;

        _sido.SelectionChanged += async (_, _) => await LoadChildren(_sido, _sigungu, 2);
        _sigungu.SelectionChanged += async (_, _) => await LoadChildren(_sigungu, _dong, 4);
        _dong.SelectionChanged += async (_, _) => { if (_withDanji) await LoadDanji(); };
        Loaded += async (_, _) => await Fill(_sido, () => AppServices.Server.GetBjdListAsync(1));
    }

    /// <summary>지역 선택 창을 띄우고 결과를 돌려준다(취소 시 null)</summary>
    public static Row? Pick(bool withDanji = false, string title = "지역 선택")
    {
        var w = new RegionPicker(withDanji, title);
        return w.ShowDialog() == true ? w.Result : null;
    }

    private static ComboBox Combo() => new() { DisplayMemberPath = "Label", MinWidth = 200 };

    private sealed record Item(string Label, Row Data);

    private async Task Fill(ComboBox target, Func<Task<List<Row>>> load, Func<Row, string>? label = null)
    {
        target.ItemsSource = null;
        _status.Text = "서버에서 불러오는 중...";
        try
        {
            var rows = await load();
            target.ItemsSource = rows.Select(r => new Item(label?.Invoke(r) ?? r.Str("bjdName") ?? "", r)).ToList();
            _status.Text = rows.Count == 0 ? "목록이 없습니다." : "";
        }
        catch (Exception ex)
        {
            _status.Text = "서버 조회 실패: " + ex.Message;
        }
    }

    private async Task LoadChildren(ComboBox parent, ComboBox child, int type)
    {
        if (parent == _sido) { _dong.ItemsSource = null; _danji.ItemsSource = null; }
        if (parent == _sigungu) _danji.ItemsSource = null;
        if (parent.SelectedItem is not Item it) { child.ItemsSource = null; return; }
        var code = it.Data.Str("bjdCode");
        await Fill(child, () => AppServices.Server.GetBjdListAsync(type, code),
            r => type == 2 ? (r.Str("sigunguName") is { Length: > 0 } s ? s : r.Str("bjdName") ?? "") : r.Str("bjdName") ?? "");
    }

    private async Task LoadDanji()
    {
        if (_dong.SelectedItem is not Item it) { _danji.ItemsSource = null; return; }
        var code = it.Data.Str("bjdCode")!;
        await Fill(_danji, () => AppServices.Server.GetDanjiListAsync(code),
            r => $"{r.Str("buildingName")} ({r.Str("addressBunji")}, {r.Long("familyCnt")}세대)");
    }

    private void Accept()
    {
        var sido = (_sido.SelectedItem as Item)?.Data;
        if (sido is null) { _status.Text = "시/도를 선택하세요."; return; }
        var sgg = (_sigungu.SelectedItem as Item)?.Data;
        var dong = (_dong.SelectedItem as Item)?.Data;
        var danji = (_danji.SelectedItem as Item)?.Data;

        var r = new Row
        {
            ["addr1"] = sido.Str("sidoName") ?? sido.Str("bjdName"),
            ["addr2"] = sgg is null ? null : (sgg.Str("sigunguName") is { Length: > 0 } s ? s : sgg.Str("bjdName")),
            ["addr3"] = dong?.Str("bjdName"),
            ["bjd_code"] = (dong ?? sgg ?? sido).Str("bjdCode"),
        };
        if (danji is not null)
        {
            r["danji_code"] = danji.Str("naverDanjiCode");
            r["danji_name"] = danji.Str("buildingName");
            r["danji_bunji"] = danji.Str("addressBunji");
            r["danji"] = danji;
        }
        Result = r;
        DialogResult = true;
    }
}

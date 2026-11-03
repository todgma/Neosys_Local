using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core.Services;

namespace Neosys.Local.App.Views.Contracts;

/// <summary>
/// 특약관리 — 기존 SpecialClauseManager.jsx. 대분류별 '자주쓰는 특약(특약1~N)'과 '기본 특약사항'을 관리하고
/// '작성중인 계약서에 적용'으로 호출한 창(계약서 특약사항 / 가계약 문자 특약)에 덧붙인다. 저장소는 SpecialClauseStore(PC별 파일).
/// </summary>
public sealed class SpecialClauseWindow : Window
{
    private readonly SpecialClauseStore _store = new();
    private readonly JsonObject _data;
    private readonly Action<string> _apply;
    private readonly ComboBox _category = new() { Width = 180, ItemsSource = SpecialClauseStore.Categories };
    private readonly ListBox _slots = new() { Width = 150, MinHeight = 160 };
    private readonly TextBox _slotName = new() { Width = 150 };
    private readonly TextBox _slotText = new() { AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MinHeight = 160, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, VerticalContentAlignment = VerticalAlignment.Top };
    private readonly StackPanel _basics = new();
    private readonly List<(CheckBox Check, TextBox Text, JsonObject Item)> _basicRows = new();
    private bool _loading;

    public SpecialClauseWindow(Action<string> apply)
    {
        _apply = apply;
        _data = _store.Load();
        Title = "특약관리";
        Width = 940;
        Height = 720;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        FontSize = 13;

        var root = new DockPanel { Margin = new Thickness(14) };

        var head = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 10) };
        head.Children.Add(new TextBlock { Text = "특약관리", FontSize = 17, FontWeight = FontWeights.Bold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 16, 0) });
        head.Children.Add(new TextBlock { Text = "대분류", VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) });
        head.Children.Add(_category);
        DockPanel.SetDock(head, Dock.Top);
        root.Children.Add(head);

        var bottom = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 10, 0, 0) };
        var close = new Button { Content = "닫기", MinWidth = 80, IsCancel = true };
        close.Click += (_, _) => Close();
        bottom.Children.Add(close);
        DockPanel.SetDock(bottom, Dock.Bottom);
        root.Children.Add(bottom);

        var body = new StackPanel();
        // ── 자주쓰는 특약사항 ──
        body.Children.Add(SectionBar("자주쓰는 특약사항", Button("작성중인 계약서에 적용", () => ApplyText(_slotText.Text), primary: true)));
        var fav = new DockPanel { Margin = new Thickness(0, 4, 0, 12) };
        var left = new StackPanel { Margin = new Thickness(0, 0, 8, 0) };
        left.Children.Add(_slots);
        left.Children.Add(new TextBlock { Text = "특약 이름", Margin = new Thickness(0, 6, 0, 2), Foreground = Brushes.SlateGray });
        left.Children.Add(_slotName);
        left.Children.Add(Button("＋ 특약 추가", AddSlot));
        DockPanel.SetDock(left, Dock.Left);
        fav.Children.Add(left);
        fav.Children.Add(_slotText);
        body.Children.Add(fav);

        // ── 기본 특약사항 ──
        var basicsButtons = new StackPanel { Orientation = Orientation.Horizontal };
        basicsButtons.Children.Add(Button("＋ 항목 추가", AddBasic));
        basicsButtons.Children.Add(Button("선택 항목을 자주쓰는 특약에 담기", BasicsToSlot));
        basicsButtons.Children.Add(Button("선택 항목을 계약서에 적용", () => ApplyText(SpecialClauseStore.Join(_basicRows.Where(b => b.Check.IsChecked == true).Select(b => b.Text.Text))), primary: true));
        body.Children.Add(SectionBar("기본 특약사항", basicsButtons));
        body.Children.Add(_basics);

        root.Children.Add(new ScrollViewer { Content = body, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
        Content = root;

        _category.SelectionChanged += (_, _) => LoadCategory();
        _slots.SelectionChanged += (_, _) => LoadSlot();
        _slotName.TextChanged += (_, _) => { if (!_loading && CurrentSlot is { } s) { s["name"] = _slotName.Text; RefreshSlotNames(); } };
        _slotText.TextChanged += (_, _) => { if (!_loading && CurrentSlot is { } s) s["text"] = _slotText.Text; };
        Closed += (_, _) => Save();
        _category.SelectedIndex = 0;
    }

    private static Button Button(string text, Action onClick, bool primary = false)
    {
        var b = new Button { Content = text };
        if (primary) b.Style = (Style)Application.Current.FindResource("PrimaryButton");
        b.Click += (_, _) => onClick();
        return b;
    }

    private static Border SectionBar(string title, UIElement right)
    {
        var dp = new DockPanel();
        DockPanel.SetDock(right, Dock.Right);
        dp.Children.Add(right);
        dp.Children.Add(new TextBlock { Text = title, FontWeight = FontWeights.Bold, FontSize = 14, Foreground = (Brush)Application.Current.FindResource("PrimaryDark"), VerticalAlignment = VerticalAlignment.Center });
        return new Border { Child = dp, Background = (Brush)Application.Current.FindResource("HeaderBack"), BorderBrush = (Brush)Application.Current.FindResource("Border"), BorderThickness = new Thickness(1), Padding = new Thickness(8, 4, 8, 4) };
    }

    private JsonObject Cat => (JsonObject)_data[(string)_category.SelectedItem]!;
    private JsonArray Favorites => (JsonArray)Cat["favorites"]!;
    private JsonArray Basics => (JsonArray)Cat["basics"]!;
    private JsonObject? CurrentSlot => _slots.SelectedIndex >= 0 && _slots.SelectedIndex < Favorites.Count ? Favorites[_slots.SelectedIndex] as JsonObject : null;

    private void LoadCategory()
    {
        RefreshSlotNames();
        _slots.SelectedIndex = Favorites.Count > 0 ? 0 : -1;
        LoadBasics();
    }

    private void RefreshSlotNames()
    {
        var idx = _slots.SelectedIndex;
        _loading = true;
        _slots.ItemsSource = Favorites.OfType<JsonObject>().Select(s => (string?)s["name"] ?? "").ToList();
        _slots.SelectedIndex = Math.Min(Math.Max(idx, 0), Favorites.Count - 1);
        _loading = false;
    }

    private void LoadSlot()
    {
        if (_loading) return;
        _loading = true;
        _slotName.Text = (string?)CurrentSlot?["name"] ?? "";
        _slotText.Text = (string?)CurrentSlot?["text"] ?? "";
        _loading = false;
    }

    private void AddSlot()
    {
        Favorites.Add(new JsonObject { ["name"] = $"특약{Favorites.Count + 1}", ["text"] = "" });
        RefreshSlotNames();
        _slots.SelectedIndex = Favorites.Count - 1;
        LoadSlot();
    }

    private void LoadBasics()
    {
        _basics.Children.Clear();
        _basicRows.Clear();
        foreach (var item in Basics.OfType<JsonObject>().ToList())
        {
            var row = new DockPanel { Margin = new Thickness(0, 2, 0, 2) };
            var check = new CheckBox { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(2, 0, 6, 0) };
            var text = new TextBox { Text = (string?)item["text"] ?? "", TextWrapping = TextWrapping.Wrap };
            text.TextChanged += (_, _) => item["text"] = text.Text;
            var reset = new Button { Content = "초기값", Padding = new Thickness(6, 1, 6, 1) };
            reset.Click += (_, _) => text.Text = (string?)item["def"] ?? "";
            var del = new Button { Content = "삭제", Padding = new Thickness(6, 1, 6, 1) };
            del.Click += (_, _) => { Basics.Remove(item); LoadBasics(); };
            var buttons = new StackPanel { Orientation = Orientation.Horizontal };
            buttons.Children.Add(reset);
            buttons.Children.Add(del);
            DockPanel.SetDock(check, Dock.Left);
            DockPanel.SetDock(buttons, Dock.Right);
            row.Children.Add(check);
            row.Children.Add(buttons);
            row.Children.Add(text);
            _basics.Children.Add(row);
            _basicRows.Add((check, text, item));
        }
    }

    private void AddBasic()
    {
        Basics.Add(new JsonObject { ["id"] = $"{DateTimeOffset.Now.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}", ["text"] = "", ["def"] = "" });
        LoadBasics();
    }

    /// <summary>체크한 기본 특약을 현재 선택한 자주쓰는 특약 슬롯 끝에 담는다</summary>
    private void BasicsToSlot()
    {
        var lines = SpecialClauseStore.Join(_basicRows.Where(b => b.Check.IsChecked == true).Select(b => b.Text.Text));
        if (lines.Length == 0) { Dialogs.Info("선택된 기본 특약사항이 없습니다."); return; }
        if (CurrentSlot is not { } slot) return;
        _slotText.Text = SpecialClauseStore.Join(new[] { (string?)slot["text"], lines });
        Dialogs.Info($"{slot["name"]}에 담았습니다.");
    }

    private void ApplyText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) { Dialogs.Info("적용할 특약 내용이 없습니다."); return; }
        _apply(text.Trim());
        Save();
        Dialogs.Info("작성 중인 계약서에 적용했습니다.");
    }

    private void Save()
    {
        try { _store.Save(_data); }
        catch (Exception ex) { Dialogs.Error("특약관리 저장에 실패했습니다.\n" + ex.Message); }
    }
}

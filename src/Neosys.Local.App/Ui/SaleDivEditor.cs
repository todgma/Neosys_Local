using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using Neosys.Local.Core;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

/// <summary>
/// 거래구분(매매/전세/월세/기타임대)마다 상태(없음·활성·생각·예정·보류)를 고르는 편집기 — 기존 TradeDivisionSelector.
/// 저장값 sale_div = 활성 코드 + 상태 접미(예: "SALEDIV01,SALEDIV03S"). 없음은 저장하지 않는다.
/// </summary>
public sealed class SaleDivEditor : WrapPanel
{
    private static readonly IReadOnlyList<Opt> States = Opt.Pairs(("none", "없음"), ("", "활성"), ("S", "생각"), ("Y", "예정"), ("B", "보류"));
    private readonly Row _row;
    private readonly string _key;
    private readonly List<(Opt Div, ComboBox Box)> _items = new();
    private bool _syncing;

    public SaleDivEditor(Row row, string key = "sale_div")
    {
        _row = row;
        _key = key;
        foreach (var div in Catalog.SaleDivisions)
        {
            var sp = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 2, 14, 2) };
            sp.Children.Add(new TextBlock { Text = div.Label, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 4, 0), FontWeight = FontWeights.SemiBold });
            var cb = new ComboBox { ItemsSource = States, DisplayMemberPath = "Label", SelectedValuePath = "Value", Width = 70 };
            cb.SelectionChanged += (_, _) => Collect();
            sp.Children.Add(cb);
            _items.Add((div, cb));
            Children.Add(sp);
        }
        Sync();
        PropertyChangedEventHandler h = (_, e) => { if (e.PropertyName == _key) Sync(); };
        _row.PropertyChanged += h;
        Unloaded += (_, _) => _row.PropertyChanged -= h;
        Loaded += (_, _) => { _row.PropertyChanged -= h; _row.PropertyChanged += h; Sync(); };
    }

    private void Sync()
    {
        _syncing = true;
        var codes = (_row.Str(_key) ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var (div, box) in _items)
        {
            var code = codes.FirstOrDefault(c => c.StartsWith(div.Value, StringComparison.Ordinal));
            var suffix = code is null ? "none" : code[div.Value.Length..];
            box.SelectedValue = States.Any(s => s.Value == suffix) ? suffix : "";
        }
        _syncing = false;
    }

    private void Collect()
    {
        if (_syncing) return;
        var parts = _items.Where(i => i.Box.SelectedValue is string s && s != "none")
            .Select(i => i.Div.Value + (string)i.Box.SelectedValue).ToList();
        _row[_key] = parts.Count == 0 ? null : string.Join(",", parts);
    }

    /// <summary>해당 거래구분(SALEDIV0n)이 '없음'이 아닌지</summary>
    public static bool Has(Row r, string baseCode) => (r.Str("sale_div") ?? "").Contains(baseCode);
}

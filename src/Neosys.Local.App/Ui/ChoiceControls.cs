using Neosys.Local.Core;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;

namespace Neosys.Local.App.Ui;

/// <summary>여러 개 선택 → 콤마로 이은 문자열(예: "TRDTYP01,TRDTYP03"). 기존 trd_type·want_sub_type 저장 방식과 같다.</summary>
public sealed class CsvCheckList : WrapPanel
{
    public static readonly DependencyProperty ValueProperty = DependencyProperty.Register(
        nameof(Value), typeof(string), typeof(CsvCheckList),
        new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault, (d, _) => ((CsvCheckList)d).Sync()));

    public string? Value
    {
        get => (string?)GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    private readonly List<(Opt Opt, CheckBox Box)> _items = new();
    private bool _syncing;

    public CsvCheckList(IEnumerable<Opt> options)
    {
        VerticalAlignment = VerticalAlignment.Center;
        foreach (var o in options)
        {
            var cb = new CheckBox { Content = o.Label, Margin = new Thickness(0, 2, 12, 2) };
            cb.Checked += (_, _) => Collect();
            cb.Unchecked += (_, _) => Collect();
            _items.Add((o, cb));
            Children.Add(cb);
        }
    }

    private void Sync()
    {
        _syncing = true;
        var set = (Value ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToHashSet();
        foreach (var (o, b) in _items) b.IsChecked = set.Contains(o.Value);
        _syncing = false;
    }

    private void Collect()
    {
        if (_syncing) return;
        var v = string.Join(",", _items.Where(i => i.Box.IsChecked == true).Select(i => i.Opt.Value));
        Value = v.Length == 0 ? null : v;
    }
}

/// <summary>하나만 선택(라디오). 다시 누르면 선택 해제는 하지 않는다.</summary>
public sealed class RadioGroup : WrapPanel
{
    public static readonly DependencyProperty ValueProperty = DependencyProperty.Register(
        nameof(Value), typeof(object), typeof(RadioGroup),
        new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault, (d, _) => ((RadioGroup)d).Sync()));

    public object? Value
    {
        get => GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    private readonly List<(Opt Opt, RadioButton Btn)> _items = new();
    private bool _syncing;
    private static int _groupSeq;

    public RadioGroup(IEnumerable<Opt> options)
    {
        VerticalAlignment = VerticalAlignment.Center;
        var group = "rg" + Interlocked.Increment(ref _groupSeq);
        foreach (var o in options)
        {
            var rb = new RadioButton { Content = o.Label, GroupName = group, Margin = new Thickness(0, 2, 12, 2) };
            rb.Checked += (_, _) => { if (!_syncing) Value = o.Value; };
            _items.Add((o, rb));
            Children.Add(rb);
        }
    }

    private void Sync()
    {
        _syncing = true;
        var v = Value?.ToString();
        foreach (var (o, b) in _items) b.IsChecked = o.Value == v;
        _syncing = false;
    }

    public static RadioGroup Bound(IEnumerable<Opt> options, object source, string key)
    {
        var g = new RadioGroup(options);
        g.SetBinding(ValueProperty, new Binding($"[{key}]") { Source = source, Mode = BindingMode.TwoWay });
        return g;
    }
}

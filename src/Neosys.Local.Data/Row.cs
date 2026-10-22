using System.Collections;
using System.ComponentModel;
using System.Globalization;

namespace Neosys.Local.Data;

/// <summary>
/// 테이블 한 행. 키 = DB 컬럼 이름(snake_case, 대소문자 무시). WPF에서 {Binding [cust_no]} 로 바인딩한다.
/// SP 파라미터로 넘기면 SQL의 @이름과 같은 키 값이 들어가고, 없는 키는 NULL로 들어간다(SpRunner).
/// </summary>
public sealed class Row : IDictionary<string, object?>, INotifyPropertyChanged
{
    private readonly Dictionary<string, object?> _d = new(StringComparer.OrdinalIgnoreCase);

    public event PropertyChangedEventHandler? PropertyChanged;

    public Row() { }
    public Row(IEnumerable<KeyValuePair<string, object?>> src) { foreach (var kv in src) _d[kv.Key] = kv.Value; }

    public object? this[string key]
    {
        get => _d.TryGetValue(key, out var v) ? v : null;
        set
        {
            if (_d.TryGetValue(key, out var old) && Equals(old, value)) return;
            _d[key] = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(Binding_IndexerName));
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(key));
        }
    }

    private const string Binding_IndexerName = "Item[]";

    public Row Clone() => new(_d);

    // ---- 형 변환 도우미 ----
    public string? Str(string key)
    {
        var v = this[key];
        return v switch { null => null, string s => s, IFormattable f => f.ToString(null, CultureInfo.InvariantCulture), _ => v.ToString() };
    }

    public long? Long(string key)
    {
        var v = this[key];
        return v switch
        {
            null => null,
            long l => l,
            int i => i,
            double d => (long)d,
            decimal m => (long)m,
            string s when long.TryParse(s.Replace(",", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out var r) => r,
            _ => null,
        };
    }

    public decimal? Dec(string key)
    {
        var v = this[key];
        return v switch
        {
            null => null,
            long l => l,
            int i => i,
            double d => (decimal)d,
            decimal m => m,
            string s when decimal.TryParse(s.Replace(",", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out var r) => r,
            _ => null,
        };
    }

    public bool Has(string key) => !string.IsNullOrWhiteSpace(Str(key));

    // ---- IDictionary ----
    public ICollection<string> Keys => _d.Keys;
    public ICollection<object?> Values => _d.Values;
    public int Count => _d.Count;
    public bool IsReadOnly => false;
    public void Add(string key, object? value) => this[key] = value;
    public void Add(KeyValuePair<string, object?> item) => this[item.Key] = item.Value;
    public void Clear() => _d.Clear();
    public bool Contains(KeyValuePair<string, object?> item) => _d.Contains(item);
    public bool ContainsKey(string key) => _d.ContainsKey(key);
    public void CopyTo(KeyValuePair<string, object?>[] array, int arrayIndex) => ((ICollection<KeyValuePair<string, object?>>)_d).CopyTo(array, arrayIndex);
    public IEnumerator<KeyValuePair<string, object?>> GetEnumerator() => _d.GetEnumerator();
    public bool Remove(string key) => _d.Remove(key);
    public bool Remove(KeyValuePair<string, object?> item) => _d.Remove(item.Key);
    public bool TryGetValue(string key, out object? value) => _d.TryGetValue(key, out value);
    IEnumerator IEnumerable.GetEnumerator() => _d.GetEnumerator();
}

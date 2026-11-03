using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Properties;

/// <summary>물건 등록창 안에서 소재지 선택 ↔ 단지 선택 ↔ 면적 타입이 함께 쓰는 서버 목록(기존 부모 state: danjiList·danjiAreaList)</summary>
public sealed class PropertyFormState
{
    public List<Row> DanjiList { get; private set; } = new();
    public List<Row> AreaList { get; private set; } = new();
    public event Action? DanjiListChanged;
    public event Action? AreaListChanged;

    public void SetDanjiList(List<Row> list) { DanjiList = list; DanjiListChanged?.Invoke(); }
    public void SetAreaList(List<Row> list) { AreaList = list; AreaListChanged?.Invoke(); }
}

/// <summary>
/// 기존 AddressSelectorSimple: 시/도(120) · 시/군/구(120) · 읍/면/동(80) · 리(120, 목록이 있을 때만) 드롭다운.
/// 읍/면/동을 고르면 bjd_code·addr3를 넣고 단지코드·단지명을 비운 뒤 그 동의 단지 목록을 불러온다.
/// 이미 bjd_code가 있으면(복사등록 등) 그 시/도·시/군/구·읍/면/동을 미리 고른다.
/// </summary>
public sealed class AddressSelector : WrapPanel
{
    private readonly Row _p;
    private readonly PropertyFormState? _state;
    private readonly Dictionary<string, string> _keys;
    private readonly ComboBox _sido, _sgg, _emd, _ri;
    private bool _loading;

    private sealed record Item(string Code, string Name)
    {
        public override string ToString() => Name;
    }

    /// <param name="keys">저장 칸 이름 바꾸기(종전주소: addr1→former_addr1 …). 없으면 그대로</param>
    public AddressSelector(Row p, PropertyFormState? state, Dictionary<string, string>? keys = null)
    {
        _p = p;
        _state = state;
        _keys = keys ?? new();
        _sido = Combo(120, "시/도");
        _sgg = Combo(120, "시/군/구");
        _emd = Combo(80, "읍/면/동");
        _ri = Combo(120, "리");
        _ri.Visibility = Visibility.Collapsed;
        foreach (var c in new[] { _sido, _sgg, _emd, _ri }) { c.Margin = new Thickness(0, 0, 4, 0); Children.Add(c); }
        VerticalAlignment = VerticalAlignment.Center;
        _sido.SelectionChanged += async (_, _) => { if (!_loading) await SidoChangedAsync(); };
        _sgg.SelectionChanged += async (_, _) => { if (!_loading) await SggChangedAsync(); };
        _emd.SelectionChanged += async (_, _) => { if (!_loading) await EmdChangedAsync(); };
        _ri.SelectionChanged += (_, _) => { if (!_loading) RiChanged(); };
        Loaded += async (_, _) => { if (_sido.Items.Count <= 1) await InitAsync(); };
    }

    private string K(string k) => _keys.TryGetValue(k, out var v) ? v : k;

    private static ComboBox Combo(double width, string placeholder)
    {
        var cb = new ComboBox { Style = (Style)Application.Current.FindResource("FormSelect"), Width = width };
        cb.Items.Add(new Item("", placeholder));
        cb.SelectedIndex = 0;
        return cb;
    }

    private static void Fill(ComboBox cb, IEnumerable<Item> items, string placeholder)
    {
        cb.Items.Clear();
        cb.Items.Add(new Item("", placeholder));
        foreach (var i in items) cb.Items.Add(i);
        cb.SelectedIndex = 0;
    }

    private static Item? Sel(ComboBox cb) => cb.SelectedItem is Item { Code.Length: > 0 } i ? i : null;

    private static async Task<List<Item>> LoadAsync(int type, string? code)
    {
        try
        {
            var rows = await AppServices.Server.GetBjdListAsync(type, code);
            return rows.Select(r => new Item(r.Str("bjdCode") ?? "",
                type == 2 && r.Str("sigunguName") is { Length: > 0 } s ? s : type == 1 && r.Str("sidoName") is { Length: > 0 } sd ? sd : r.Str("bjdName") ?? "")).ToList();
        }
        catch (Exception ex)
        {
            Toast.Error(type == 1 ? "시도 목록을 불러오지 못했습니다." : "지역 목록을 불러오지 못했습니다.");
            System.Diagnostics.Debug.WriteLine(ex);
            return new();
        }
    }

    private async Task InitAsync()
    {
        _loading = true;
        try
        {
            Fill(_sido, await LoadAsync(1, null), "시/도");
            // 기존 값(bjd_code 10자리)이 있으면 단계별로 미리 선택
            var code = _p.Str(K("bjd_code"));
            if (code is { Length: 10 })
            {
                if (Pick(_sido, code[..2] + "00000000"))
                {
                    Fill(_sgg, await LoadAsync(2, code[..2] + "00000000"), "시/군/구");
                    if (Pick(_sgg, code[..5] + "00000"))
                    {
                        Fill(_emd, await LoadAsync(4, code[..5] + "00000"), "읍/면/동");
                        if (Pick(_emd, code[..8] + "00") && _state is not null) await LoadDanjiAsync(code[..8] + "00");
                    }
                }
            }
        }
        finally { _loading = false; }
    }

    private static bool Pick(ComboBox cb, string code)
    {
        foreach (var o in cb.Items) if (o is Item i && i.Code == code) { cb.SelectedItem = o; return true; }
        return false;
    }

    private async Task SidoChangedAsync()
    {
        var s = Sel(_sido);
        _p[K("addr1")] = s?.Name;
        Fill(_sgg, Array.Empty<Item>(), "시/군/구");
        Fill(_emd, Array.Empty<Item>(), "읍/면/동");
        HideRi();
        _state?.SetDanjiList(new());
        if (s is null) return;
        _loading = true;
        try { Fill(_sgg, await LoadAsync(2, s.Code), "시/군/구"); }
        finally { _loading = false; }
    }

    private async Task SggChangedAsync()
    {
        var s = Sel(_sgg);
        _p[K("addr2")] = s?.Name;
        Fill(_emd, Array.Empty<Item>(), "읍/면/동");
        HideRi();
        _state?.SetDanjiList(new());
        if (s is null) return;
        _loading = true;
        try { Fill(_emd, await LoadAsync(4, s.Code), "읍/면/동"); }
        finally { _loading = false; }
    }

    private async Task EmdChangedAsync()
    {
        var s = Sel(_emd);
        _p[K("bjd_code")] = s?.Code;
        _p[K("addr3")] = s?.Name;
        _p[K("danji_code")] = null;
        _p[K("addr4")] = null;
        HideRi();
        _state?.SetDanjiList(new());
        if (s is null) return;
        // 리 목록(있을 때만 표시) → 단지 목록
        var ri = await LoadAsync(7, s.Code);
        if (ri.Count > 0)
        {
            _loading = true;
            Fill(_ri, ri, "리");
            _ri.Visibility = Visibility.Visible;
            _loading = false;
        }
        await LoadDanjiAsync(s.Code);
    }

    private async Task LoadDanjiAsync(string bjdCode)
    {
        if (_state is null) return;
        try { _state.SetDanjiList(await AppServices.Server.GetDanjiListAsync(bjdCode)); }
        catch { Toast.Error("단지 목록을 불러오지 못했습니다."); }
    }

    private void RiChanged()
    {
        var emd = Sel(_emd)?.Name ?? "";
        _p[K("addr3")] = Sel(_ri) is { } r ? $"{emd} {r.Name}" : emd;
    }

    private void HideRi()
    {
        _ri.Visibility = Visibility.Collapsed;
        Fill(_ri, Array.Empty<Item>(), "리");
    }
}

/// <summary>
/// 기존 DanjiSelector(물건명 행): 단지(150: --단지 · 직접입력 · 단지 선택 · 목록) [+ 단지명 직접입력 120] · 동 · 호.
/// 단지를 고르면 단지코드·단지명·지번을 넣고 동/호/타입/면적을 비운 뒤 동 목록·타입(면적) 목록을 불러온다.
/// 동을 고르면 호 목록. 동·호는 목록이 있으면 드롭다운(+직접입력), 없으면 글자 칸.
/// </summary>
public sealed class DanjiSelector : WrapPanel
{
    private readonly Row _p;
    private readonly PropertyFormState _state;
    private List<Row> _dongs = new();
    private List<Row> _hos = new();
    private bool _manual, _dummy, _showHo;
    private string _dongNo = "";

    public DanjiSelector(Row p, PropertyFormState state)
    {
        _p = p;
        _state = state;
        VerticalAlignment = VerticalAlignment.Center;
        _state.DanjiListChanged += Render;
        Unloaded += (_, _) => _state.DanjiListChanged -= Render;
        Loaded += (_, _) => { _state.DanjiListChanged -= Render; _state.DanjiListChanged += Render; };
        Render();
    }

    private static ComboBox Select(double width)
    {
        var cb = new ComboBox { Style = (Style)Application.Current.FindResource("FormSelect"), Width = width, Margin = new Thickness(0, 0, 8, 0) };
        return cb;
    }

    private TextBox Input(string key, string placeholder, double width)
    {
        var tb = LF.Txt(_p, key, width, placeholder, height: 24);
        tb.Margin = new Thickness(0, 0, 8, 0);
        return tb;
    }

    private void Render()
    {
        Children.Clear();
        // 단지
        var danji = Select(150);
        danji.Items.Add(new Opt("__dummy__", "--단지"));
        danji.Items.Add(new Opt("__manual__", "직접입력"));
        danji.Items.Add(new Opt("", "단지 선택"));
        foreach (var d in _state.DanjiList) danji.Items.Add(new Opt(d.Str("naverDanjiCode") ?? "", d.Str("buildingName") ?? ""));
        danji.DisplayMemberPath = nameof(Opt.Label);
        var cur = _dummy ? "__dummy__" : _manual ? "__manual__" : _p.Str("danji_code") ?? "";
        danji.SelectedItem = danji.Items.Cast<Opt>().FirstOrDefault(o => o.Value == cur) ?? danji.Items[2];
        danji.SelectionChanged += async (_, _) =>
        {
            if (danji.SelectedItem is not Opt o) return;
            await DanjiChangedAsync(o.Value);
        };
        FormBuilder.Id(danji, "danji_code");
        Children.Add(danji);
        if (_manual) Children.Add(Input("addr4", "단지명 직접입력", 120));

        // 동
        var dongName = _p.Str("dong");
        if (_dongs.Count > 0)
        {
            var dong = Select(60);
            dong.DisplayMemberPath = nameof(Opt.Label);
            dong.Items.Add(new Opt("__manual__", "직접입력"));
            foreach (var d in _dongs) dong.Items.Add(new Opt(Str(d, "dong_no"), d.Str("dong_name") ?? ""));
            var match = _dongs.FirstOrDefault(d => d.Str("dong_name") == dongName);
            dong.SelectedItem = dong.Items.Cast<Opt>().FirstOrDefault(o => match is not null && o.Value == Str(match, "dong_no")) ?? dong.Items[0];
            dong.SelectionChanged += async (_, _) =>
            {
                if (dong.SelectedItem is not Opt o) return;
                if (o.Value == "__manual__")
                {
                    _p["dong"] = null; _p["ho"] = null; _dongNo = ""; _hos = new(); _showHo = false;
                    Render();
                    return;
                }
                await DongChangedAsync(o.Value, o.Label);
            };
            Children.Add(dong);
            if (string.IsNullOrEmpty(dongName) || match is null) Children.Add(Input("dong", "동 입력", 60));
        }
        else Children.Add(Input("dong", "동", 60));

        // 호
        var hoName = _p.Str("ho");
        if (_showHo)
        {
            var ho = Select(60);
            ho.DisplayMemberPath = nameof(Opt.Label);
            ho.Items.Add(new Opt("__manual__", "직접입력"));
            foreach (var h in _hos) ho.Items.Add(new Opt(h.Str("ho_name") ?? "", h.Str("ho_name") ?? ""));
            var inList = !string.IsNullOrEmpty(hoName) && _hos.Any(h => h.Str("ho_name") == hoName);
            ho.SelectedItem = ho.Items.Cast<Opt>().FirstOrDefault(o => inList && o.Value == hoName) ?? ho.Items[0];
            ho.SelectionChanged += (_, _) =>
            {
                if (ho.SelectedItem is not Opt o) return;
                _p["ho"] = o.Value == "__manual__" ? null : o.Value;
                if (_hos.FirstOrDefault(h => h.Str("ho_name") == o.Value) is { } sel) FillFromHo(sel);
                Render();
            };
            Children.Add(ho);
            if (!inList) Children.Add(Input("ho", "호 입력", 60));
        }
        else Children.Add(Input("ho", "호", 60));
    }

    private static string Str(Row r, string key) => r[key] is { } v ? Convert.ToString(v, CultureInfo.InvariantCulture) ?? "" : "";

    /// <summary>호 선택 → 해당층·타입·공급/전용면적·방·욕실 자동입력(기존 DanjiSelector handleHoSelect, 2026-10-28). 방/욕실은 호 목록 값, 없으면 타입 목록(ptp_no)</summary>
    private void FillFromHo(Row ho)
    {
        if (int.TryParse(ho.Str("floor")?.Trim(), out var floor)) _p["floor1"] = (long)floor;
        var area = ho.Long("ptp_no") is { } ptp ? _state.AreaList.FirstOrDefault(a => a.Long("ptp_no") == ptp) : null;
        if (area?.Str("plan_type_name") is { Length: > 0 } typ) _p["apt_typ"] = typ;
        if (ho.Dec("sply_spc") is { } sup) _p["sup_area"] = Math.Round((double)sup, 2);
        if (ho.Dec("excls_spc") is { } exc) _p["exc_area"] = Math.Round((double)exc, 2);
        if ((ho.Long("room_cnt") ?? area?.Long("room_cnt")) is { } room) _p["room_cnt"] = room;
        if ((ho.Long("bathroom_cnt") ?? area?.Long("bathroom_cnt")) is { } bath) _p["bath_cnt"] = bath;
        if (area is not null) _state.SetAreaList(_state.AreaList);   // 타입 콤보를 새 타입으로 다시 그린다
    }

    private async Task DanjiChangedAsync(string val)
    {
        _dummy = val == "__dummy__";
        _manual = val == "__manual__";
        void ClearDetail()
        {
            foreach (var k in new[] { "dong", "ho", "apt_typ", "sup_area", "exc_area" }) _p[k] = null;
            _dongs = new(); _hos = new(); _dongNo = ""; _showHo = false;
            _state.SetAreaList(new());
        }
        if (_dummy) { _p["danji_code"] = null; _p["addr4"] = null; ClearDetail(); Render(); return; }
        if (_manual) { _p["danji_code"] = null; ClearDetail(); Render(); return; }
        if (val.Length == 0) { _p["danji_code"] = null; _p["addr4"] = null; Render(); return; }

        var sel = _state.DanjiList.FirstOrDefault(d => d.Str("naverDanjiCode") == val);
        if (sel is null) return;
        _p["danji_code"] = val;
        _p["addr4"] = sel.Str("buildingName");
        _p["jibun"] = sel.Str("addressBunji");   // 단지 선택 시 지번 자동입력
        ClearDetail();
        Render();
        try
        {
            var dongs = AppServices.Server.GetDongListAsync(val);
            var areas = AppServices.Server.GetAreaListAsync(val);
            _dongs = await dongs;
            _state.SetAreaList(await areas);
        }
        catch { Toast.Error("동/타입 목록을 불러오지 못했습니다."); }
        Render();
    }

    private async Task DongChangedAsync(string dongNo, string dongName)
    {
        _dongNo = dongNo;
        _p["dong"] = dongName;
        _p["ho"] = null;
        _hos = new();
        _showHo = false;
        Render();
        if (_p.Str("danji_code") is not { } danji || !int.TryParse(dongNo, out var no)) return;
        try
        {
            _hos = await AppServices.Server.GetHoListAsync(danji, no);
            _showHo = _hos.Count > 0;
        }
        catch { _hos = new(); }
        Render();
    }
}

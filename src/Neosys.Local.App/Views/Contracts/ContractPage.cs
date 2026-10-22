using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Contracts;

/// <summary>
/// 계약관리 — 기존 ContractsPage 모양:
///  [계약목록][계약서작성] / 노란 칸(물건유형·지역) / 필터 줄(거래유형·날짜·완료여부·검색) / 표(가계약문자·거래신고여부·…·국토부 회신 내용)
///  표 도구줄 오른쪽 [색 채우기][등록(약식)][수정][삭제], 부속문서·첨부파일·복사·거래신고 완료일은 행 우클릭
/// </summary>
public sealed class ContractPage : ListPage
{
    private static readonly string[] PtTypes = { "아파트", "오피스텔", "단독주택", "다가구주택", "다세대주택", "상가", "사무실", "공장", "창고", "지식산업센터", "건물", "토지", "아파트분양권", "오피스텔분양권", "상가분양권", "입주권" };

    private readonly ContractService _svc = AppServices.Create((sp, s) => new ContractService(sp, s));
    private readonly ComboBox _ptType = new() { Width = 130 };
    private readonly ComboBox _trade = new() { Width = 100, DisplayMemberPath = "Label", SelectedValuePath = "Value" };
    private readonly ComboBox _dateType = new() { Width = 110, ItemsSource = new[] { "계약일", "중도금1차", "중도금2차", "잔금일" }, SelectedIndex = 0 };
    private readonly DatePicker _from = new() { Width = 125 }, _to = new() { Width = 125 };
    private readonly ComboBox _status = new() { Width = 80, ItemsSource = new[] { "전부", "진행", "완료", "해지" }, SelectedIndex = 0 };
    private readonly Button _region = new() { Content = "지역 선택" };
    private Row? _regionRow;

    public ContractPage() : base("계약관리", "주소/의뢰인")
    {
        FilterBar.Children.Clear();
        var box = new StackPanel();
        // 1줄: 모드 전환 — [계약서작성]은 같은 창 안에서 작성 화면으로 바뀐다(기존 ContractsPage 모드 전환)
        box.Children.Add(Modes(compose: false));

        // 2줄: 노란 칸 — 물건유형 + 지역
        _ptType.ItemsSource = new[] { "모든유형" }.Concat(PtTypes).ToList();
        _ptType.SelectedIndex = 0;
        _ptType.SelectionChanged += async (_, _) => { if (IsLoaded) await RefreshAsync(); };
        _region.Click += async (_, _) => await PickRegionAsync();
        var yellow = new WrapPanel();
        yellow.Children.Add(new TextBlock { Text = "물건유형", FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#92400E"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) });
        yellow.Children.Add(_ptType);
        yellow.Children.Add(new TextBlock { Text = "지역", FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#92400E"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(16, 0, 6, 0) });
        yellow.Children.Add(_region);
        box.Children.Add(new Border { Child = yellow, Background = Legacy.B("#FEF3C7"), BorderBrush = Legacy.B("#FBBF24"), BorderThickness = new Thickness(2), CornerRadius = new CornerRadius(4), Padding = new Thickness(12, 6, 12, 6), Margin = new Thickness(0, 0, 0, 8) });

        // 3줄: 거래유형 · 날짜 · 완료여부 · 검색
        _trade.ItemsSource = Opt.Pairs(("", "전체"), ("매매", "매매"), ("전세", "전세"), ("월세", "월세"), ("연세", "연세"));
        _trade.SelectedIndex = 0;
        foreach (var c in new[] { _trade, _dateType, _status }) c.SelectionChanged += async (_, _) => { if (IsLoaded) await RefreshAsync(); };
        _from.SelectedDateChanged += async (_, _) => { if (IsLoaded) await RefreshAsync(); };
        _to.SelectedDateChanged += async (_, _) => { if (IsLoaded) await RefreshAsync(); };
        var filters = new WrapPanel();
        void F(string label, params UIElement[] els)
        {
            var sp = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 12, 0) };
            sp.Children.Add(Legacy.Label(label));
            foreach (var e in els) sp.Children.Add(e);
            filters.Children.Add(sp);
        }
        F("거래유형", _trade);
        F("날짜", _dateType, _from, new TextBlock { Text = " ~ ", Foreground = Legacy.B("#94A3B8"), VerticalAlignment = VerticalAlignment.Center }, _to);
        F("완료여부", _status);
        SearchBox.Width = 200;
        var go = new Button { Content = "검색", Style = (Style)Application.Current.FindResource("PrimaryButton") };
        go.Click += async (_, _) => await RefreshAsync();
        F("검색", SearchBox, go);
        box.Children.Add(filters);
        FilterBar.Children.Add(box);

        AddButton("삭제", DeleteSelectedAsync, "DangerButton");
        AddButton("등록", () => SimpleAsync(null), "PrimaryButton");
        AddRowMenu("계약서 열기", async () => { if (Selected is { } r) await OpenAsync(r); });
        AddRowMenu("부속문서", DocumentsAsync);
        AddRowMenu("첨부파일", AttachAsync);
        AddRowMenu("복사등록", CopyAsync);
        AddRowMenu("거래신고 완료일", ReportDateAsync);
        AddRowMenu("삭제", DeleteSelectedAsync);

        GridBuilder.SetColumns(Grid, new[]
        {
            ColDef.Text("pre_sms_text", "가계약문자", 88),
            ColDef.Text("report_text", "거래신고여부", 100),
            ColDef.Date("report_done_date", "신고완료일", 96),
            ColDef.Text("doc_type", "물건유형", 84),
            ColDef.Text("addr", "소재지", 280),
            ColDef.Text("trade_type", "거래유형", 78),
            ColDef.Amount("amount", "거래금액", 100),
            ColDef.Text("buyer", "취득의뢰인", 110),
            ColDef.Text("seller", "이전의뢰인", 110),
            ColDef.Text("contract_text", "계약일", 88),
            ColDef.Text("mid_text", "중도금일", 88),
            ColDef.Text("balance_text", "잔금일", 88),
            ColDef.Text("co_broker", "(전송|수신)공동중개사", 210),
            ColDef.Text("e_contract", "전자계약", 88),
            ColDef.Text("molit_reply", "국토부 회신 내용", 150),
            ColDef.Text("doc_kinds", "부속문서", 0),
        });
    }

    private async Task PickRegionAsync()
    {
        if (_regionRow is not null) { _regionRow = null; _region.Content = "지역 선택"; await RefreshAsync(); return; }
        try { _regionRow = RegionPicker.Pick(title: "지역 선택"); }
        catch (Exception ex) { Dialogs.Error("지역 목록을 불러오지 못했습니다(서버 조회).\n" + ex.Message); return; }
        if (_regionRow is null) return;
        _region.Content = string.Join(" ", new[] { _regionRow.Str("addr1"), _regionRow.Str("addr2"), _regionRow.Str("addr3") }.Where(x => !string.IsNullOrEmpty(x))) + "  ✕";
        await RefreshAsync();
    }

    protected override string? KeyName => "master_id";

    /// <summary>YYYY-MM-DD → YY.MM.DD(기존 표 표기)</summary>
    private static string? Short(string? d) => d is { Length: >= 10 } ? $"{d[2..4]}.{d[5..7]}.{d[8..10]}" : d;

    protected override async Task<List<Row>> LoadAsync()
    {
        var rows = await _svc.ListAsync(new Row { ["q_keyword"] = Keyword });
        var list = new List<Row>();
        foreach (var r in rows)
        {
            var doc = ContractService.ParseDoc(r.Str("doc"));
            string? D(string k) => doc[k] is System.Text.Json.Nodes.JsonValue v ? v.ToString() : null;
            r["pre_sms_text"] = r.Long("has_pre_sms") == 1 ? "보기" : "";
            r["report_text"] = r.Has("report_done_date") ? "신고완료" : "미신고";
            r["trade_type"] = D("거래유형") ?? r.Str("trade_type");
            var contract = r.Str("contract_date");
            var mid1 = LocalDate.Normalize(D("중도금일") ?? D("중도금1차일자") ?? D("중도금일자"));
            var mid2 = LocalDate.Normalize(D("중도금2차일자"));
            var balance = LocalDate.Normalize(D("잔금일") ?? D("잔금일자"));
            r["contract_text"] = Short(contract);
            r["mid_text"] = Short(mid1);
            r["balance_text"] = Short(balance);
            r["co_broker"] = D("공동중개사");
            r["e_contract"] = D("전자계약");
            r["molit_reply"] = D("국토부회신");
            if (r.Str("doc_kinds") is { } kinds) r["doc_kinds"] = string.Join(", ", kinds.Split(", ").Select(ContractDocs.TitleOf));

            // 필터(기존 화면과 같은 조건 — 목록에서 거른다)
            if (_ptType.SelectedIndex > 0 && r.Str("doc_type") != (string)_ptType.SelectedItem) continue;
            if (ComboValue(_trade) is { } t && !(r.Str("trade_type") ?? "").Contains(t)) continue;
            if (_regionRow is not null)
            {
                var addr = r.Str("addr") ?? "";
                var parts = new[] { _regionRow.Str("addr2"), _regionRow.Str("addr3") }.Where(x => !string.IsNullOrEmpty(x));
                if (!parts.All(x => addr.Contains(x!))) continue;
            }
            var status = (string)_status.SelectedItem;
            if (status != "전부" && !(r.Str("status") ?? "").Contains(status)) continue;
            var date = (string)_dateType.SelectedItem switch { "중도금1차" => mid1, "중도금2차" => mid2, "잔금일" => balance, _ => contract };
            if (_from.SelectedDate is { } f && string.CompareOrdinal(date ?? "", LocalDate.Format(f)) < 0) continue;
            if (_to.SelectedDate is { } to && (date is null || string.CompareOrdinal(date, LocalDate.Format(to)) > 0)) continue;
            list.Add(r);
        }
        return list;
    }

    protected override async Task OpenAsync(Row? row)
    {
        Row master;
        if (row is null) master = new Row { ["doc"] = "{}" };
        else
        {
            var m = await _svc.GetAsync(row.Str("master_id")!);
            if (m is null) { Dialogs.Warn("계약서를 찾을 수 없습니다."); return; }
            // 약식 등록한 건은 약식 창으로
            if (ContractService.ParseDoc(m.Str("doc"))["_simple"] is not null) { await SimpleAsync(m); return; }
            master = m;
        }
        ShowCompose(new ContractEditorWindow(_svc, master));
    }

    // ---------- 모드 전환: 계약목록 ↔ 계약서작성 ----------
    private List<UIElement>? _listChildren;
    private ContractEditorWindow? _editor;

    private FrameworkElement Modes(bool compose)
    {
        Button M(string text, bool on, Func<Task> click)
        {
            var b = new Button
            {
                Content = text, FontWeight = FontWeights.Medium, FontSize = 14, BorderBrush = Legacy.B("#CBD5E1"),
                Background = on ? Legacy.B("#4F46E5") : Brushes.White, Foreground = on ? Brushes.White : Brushes.Black,
            };
            b.Click += async (_, _) => await click();
            return b;
        }
        var modes = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 6) };
        modes.Children.Add(M("계약목록", !compose, async () => { if (compose) await ShowListAsync(); else await RefreshAsync(); }));
        modes.Children.Add(M("계약서작성", compose, () => compose ? Task.CompletedTask : OpenAsync(null)));
        return modes;
    }

    /// <summary>목록 화면을 내리고 계약서 작성 화면(ContractEditorWindow 내용)을 이 창 안에 넣는다</summary>
    private void ShowCompose(ContractEditorWindow editor)
    {
        _listChildren ??= Children.Cast<UIElement>().ToList();
        _editor = editor;
        editor.CloseRequested += async () => await ShowListAsync();
        var host = new DockPanel { Margin = new Thickness(12, 10, 12, 0) };
        var modes = Modes(compose: true);
        DockPanel.SetDock(modes, Dock.Top);
        host.Children.Add(modes);
        host.Children.Add(editor.Embed());
        Children.Clear();
        Children.Add(host);
    }

    private async Task ShowListAsync()
    {
        if (_listChildren is null) return;
        _editor?.Close();
        _editor = null;
        Children.Clear();
        foreach (var c in _listChildren) Children.Add(c);
        _listChildren = null;
        await RefreshAsync();   // 부속문서만 저장해도 목록(부속문서 컬럼·임시 계약)이 바뀐다
    }

    /// <summary>약식 등록/수정 — 계약 요약 항목만 입력(기존 약식 등록, doc._simple=true)</summary>
    private async Task SimpleAsync(Row? master)
    {
        master ??= new Row { ["doc"] = "{}" };
        var doc = ContractService.ParseDoc(master.Str("doc"));
        var r = ContractService.DocToRow(doc);
        var fields = new[]
        {
            F.Combo("ptType", "물건유형", "아파트", "오피스텔", "주상복합", "분양권", "입주권", "연립주택", "주택", "상가", "사무실", "공장", "토지", "부동산"),
            F.Combo("거래유형", "거래유형", "매매", "전세", "월세", "연세", "교환", "권리양도"),
            F.Text("소재지", "소재지").Span(2),
            F.Amount("거래금액", "거래금액"),
            F.Date("계약일", "계약일"),
            F.Text("이전의뢰인", "이전의뢰인(매도·임대)"),
            F.Text("취득의뢰인", "취득의뢰인(매수·임차)"),
            F.Date("중도금일", "중도금일"),
            F.Date("잔금일", "잔금일"),
            F.Text("공동중개사", "(전송|수신) 공동중개사").Span(2),
            F.Combo("전자계약", "전자계약", "해당", "해당없음"),
            F.Text("국토부회신", "국토부 회신 내용"),
            F.Memo("메모", "메모", 60).Span(2),
        };
        var w = new FormEditWindow("계약(약식)", r, "__key", fields, async row =>
        {
            row["_simple"] = true;
            ContractService.RowToDoc(row, doc);
            master["trade_type"] = row.Str("거래유형");
            master["doc_type"] = row.Str("ptType");
            master["title"] = $"{row.Str("ptType")} {row.Str("거래유형")} (약식)".Trim();
            master["addr"] = row.Str("소재지");
            master["seller"] = row.Str("이전의뢰인");
            master["buyer"] = row.Str("취득의뢰인");
            master["amount"] = row.Long("거래금액");
            master["contract_date"] = row.Str("계약일");
            await _svc.SaveAsync(master, doc);
            return 1;
        }, master.Has("master_id") ? _ => _svc.DeleteAsync(master.Str("master_id")!) : null, width: 820, height: 560);
        if (master.Has("master_id")) r["__key"] = 1L;
        if (w.ShowAndReport()) await RefreshAsync();
    }

    /// <summary>선택한 계약의 부속문서 열기(기존 목록의 가계약 문자 보기 등) — 저장된 문서는 ✔ 표시</summary>
    private async Task DocumentsAsync()
    {
        if (Selected is not { } row) { Dialogs.Info("계약서를 선택하세요."); return; }
        var id = row.Str("master_id")!;
        var saved = await _svc.DocumentKindsAsync(id);
        var menu = ContractDocWindow.Menu(async form =>
        {
            var master = await _svc.GetAsync(id);
            new ContractDocWindow(_svc, form, id, master).ShowDialog();
            await RefreshAsync();
        }, saved);
        menu.IsOpen = true;
    }

    /// <summary>선택한 계약의 첨부파일(계약 첨부·공제증서)</summary>
    private Task AttachAsync()
    {
        if (Selected is not { } row) { Dialogs.Info("계약서를 선택하세요."); return Task.CompletedTask; }
        new ContractAttachWindow(row.Str("master_id")!, row.Str("title")).ShowDialog();
        return Task.CompletedTask;
    }

    private async Task CopyAsync()
    {
        if (Selected is not { } row) { Dialogs.Info("복사할 계약서를 선택하세요."); return; }
        await _svc.CopyAsync(row.Str("master_id")!);
        await RefreshAsync();
        Dialogs.Info("계약서를 복사했습니다(부속문서는 복사하지 않습니다).");
    }

    private async Task ReportDateAsync()
    {
        if (Selected is not { } row) { Dialogs.Info("계약서를 선택하세요."); return; }
        var r = new Row { ["report_done_date"] = row.Str("report_done_date") ?? LocalDate.Today, ["__key"] = 1L };
        var w = new FormEditWindow("거래신고 완료일", r, "__key", new[] { F.Date("report_done_date", "신고완료일") },
            async x => { await _svc.SetReportDateAsync(row.Str("master_id")!, x.Str("report_done_date")); return 1; },
            async _ => await _svc.SetReportDateAsync(row.Str("master_id")!, null), columns: 1, width: 420, height: 220);
        if (w.ShowAndReport()) await RefreshAsync();
    }

    private async Task DeleteSelectedAsync()
    {
        var rows = GridBuilder.SelectedRows(Grid);
        if (rows.Count == 0) { Dialogs.Info("삭제할 계약서를 선택하세요."); return; }
        if (!Dialogs.Confirm($"선택한 계약서 {rows.Count}건을 삭제하시겠습니까?")) return;
        foreach (var r in rows) await _svc.DeleteAsync(r.Str("master_id")!);
        await RefreshAsync();
    }
}

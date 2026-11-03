using System.Globalization;
using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Contracts;

/// <summary>
/// 계약서 작성/수정 — 기존 ContractDocumentEditor. 서식(cn_contract_template.body_json)의
/// 머리말·부동산의 표시·금액표·조항·특약·계약일자·거래당사자·개업공인중개사를 그리고, 입력칸 값은 doc(JSON)에 저장한다.
///  - 키가 '…한글'인 금액칸: 입력 중엔 숫자, 벗어나면 한글 금액(입력금액단위 만원/원 반영)
///  - 키가 '…일자'/'…종료'인 칸: 날짜 선택
/// </summary>
public sealed class ContractEditorWindow : EditWindow
{
    private readonly ContractService _svc;
    private readonly Row _master;
    private readonly JsonObject _doc;
    private readonly Row _r;              // doc의 단순 값(화면 바인딩)
    private JsonObject? _tpl;
    private ContractSign _sign;
    private readonly StackPanel _page = new() { Background = Brushes.White, Margin = new Thickness(0), Width = 860 };
    private readonly ComboBox _docType = new() { Width = 260, DisplayMemberPath = nameof(ContractDocDef.Label) };
    private readonly ComboBox _unit = new() { Width = 80, ItemsSource = new[] { "만원", "원" } };

    private const double PageWidth = 800;
    private List<Row>? _loans;            // 융자금 여러 건(doc._loans) — 서식을 처음 읽을 때 만든다

    public ContractEditorWindow(ContractService svc, Row master) : base("계약서", 1060, 940)
    {
        _svc = svc;
        _master = master;
        _doc = ContractService.ParseDoc(master.Str("doc"));
        _r = ContractService.DocToRow(_doc);
        _sign = ContractCatalog.Sign(_r.Str("category"));

        // 상단: 계약서 종류 / 입력금액단위 / 물건 불러오기 / 인쇄
        var bar = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
        bar.Children.Add(Label("계약서 종류"));
        _docType.ItemsSource = ContractCatalog.Docs;
        _docType.SelectedItem = ContractCatalog.Docs.FirstOrDefault(d => d.Label == _r.Str("docType")) ?? ContractCatalog.Docs[0];
        _docType.SelectionChanged += async (_, _) => await ChangeTypeAsync();
        bar.Children.Add(_docType);
        bar.Children.Add(Label("입력금액단위", 16));
        _unit.SelectedItem = _r.Str("_금액단위") ?? "만원";
        _unit.SelectionChanged += (_, _) => { _r["_금액단위"] = _unit.SelectedItem as string; Rebuild(); };
        bar.Children.Add(_unit);
        var loadPt = new Button { Content = "물건 불러오기", Margin = new Thickness(16, 2, 2, 2) };
        loadPt.Click += (_, _) => LoadProperty();
        bar.Children.Add(loadPt);
        var addBroker = new Button { Content = "＋ 공동중개사" };
        addBroker.Click += (_, _) => { _r["_공동중개사수"] = (_r.Long("_공동중개사수") ?? 0) + 1; Rebuild(); };
        var delBroker = new Button { Content = "－ 공동중개사" };
        delBroker.Click += (_, _) => { _r["_공동중개사수"] = Math.Max(0, (_r.Long("_공동중개사수") ?? 0) - 1); Rebuild(); };
        bar.Children.Add(addBroker);
        bar.Children.Add(delBroker);
        var print = new Button { Content = "인쇄", Margin = new Thickness(16, 2, 2, 2) };
        print.Click += (_, _) => Print();
        bar.Children.Add(print);
        var attach = new Button { Content = "첨부파일" };
        attach.Click += (_, _) =>
        {
            if (IsNew) { Dialogs.Info("계약서를 먼저 저장하세요."); return; }
            new ContractAttachWindow(_master.Str("master_id")!, _r.Str("docType")) { Owner = DialogOwner }.ShowDialog();
        };
        bar.Children.Add(attach);
        DockPanel.SetDock(bar, Dock.Top);
        Body.Children.Add(bar);

        // 부속문서(기존 계약서 작성 화면 서브 툴바): 가계약 문자 / 영수증 등 / 준비서면 / 확인설명서 / 개인정보동의서 / 특약관리
        var docs = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
        docs.Children.Add(Label("부속문서"));
        foreach (var g in ContractDocs.All.GroupBy(f => f.Group))
        {
            if (g.Count() == 1 || g.Key == "계약서류")
                foreach (var f in g)
                {
                    var b = new Button { Content = f.Title };
                    b.Click += async (_, _) => await OpenDocAsync(f);
                    docs.Children.Add(b);
                }
            else
            {
                var b = new Button { Content = g.Key + " ▾" };
                var forms = g.ToList();
                b.Click += (_, _) =>
                {
                    var menu = new ContextMenu { PlacementTarget = b, Placement = System.Windows.Controls.Primitives.PlacementMode.Bottom };
                    foreach (var f in forms)
                    {
                        var mi = new MenuItem { Header = f.Title };
                        mi.Click += async (_, _) => await OpenDocAsync(f);
                        menu.Items.Add(mi);
                    }
                    menu.IsOpen = true;
                };
                docs.Children.Add(b);
            }
        }
        var clauses = new Button { Content = "특약관리", Margin = new Thickness(16, 2, 2, 2) };
        clauses.Click += (_, _) => new SpecialClauseWindow(text => _r["특약사항"] = SpecialClauseStore.Append(_r.Str("특약사항"), text)) { Owner = DialogOwner }.ShowDialog();
        docs.Children.Add(clauses);
        DockPanel.SetDock(docs, Dock.Top);
        Body.Children.Add(docs);

        var paper = new Border
        {
            Background = Brushes.White, BorderBrush = Brushes.Gray, BorderThickness = new Thickness(1), Padding = new Thickness(30, 24, 30, 30),
            HorizontalAlignment = HorizontalAlignment.Center, Child = _page,
        };
        Body.Children.Add(new ScrollViewer
        {
            Content = paper, Background = new SolidColorBrush(Color.FromRgb(0xE5, 0xE7, 0xEB)), Padding = new Thickness(12),
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
        });

        Loaded += async (_, _) => await ChangeTypeAsync(initial: true);
    }

    private static TextBlock Label(string text, double left = 0) =>
        new() { Text = text, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(left, 0, 6, 0), FontWeight = FontWeights.SemiBold };

    private async Task ChangeTypeAsync(bool initial = false)
    {
        var def = (ContractDocDef)_docType.SelectedItem;
        _r["docType"] = def.Label;
        _r["category"] = def.Category;
        _r["ptType"] = def.PtTypeLabel;
        _sign = ContractCatalog.Sign(def.Category);
        _tpl = await _svc.TemplateBodyAsync(def.Category);
        _r["docHint"] = (string?)_tpl?["docHint"];
        _loans ??= ContractCatalog.Loans(_doc, HasLoanRow(_tpl)).Select(o => ContractService.DocToRow(o)).ToList();
        if (initial && IsNew) await FillBrokerDefaultsAsync();
        Rebuild();
    }

    /// <summary>개업공인중개사 칸을 로그인 사무소 정보로 채운다(빈 칸만) — 기존 자동 세팅과 동일</summary>
    private async Task FillBrokerDefaultsAsync()
    {
        if (_sign.Broker == "none") return;
        var office = await _svc.OfficeAsync();
        var s = AppServices.Session;
        for (int i = 0; i < _sign.BrokerCount; i++)
        {
            var k = ContractCatalog.BrokerKeys(_sign.Broker, i);
            void Fill(string key, string? v) { if (!_r.Has(key) && !string.IsNullOrEmpty(v)) _r[key] = v; }
            Fill(k.Name, office?.Str("OffNm") ?? s.OffNm);
            Fill(k.Addr, office?.Str("Addr"));
            Fill(k.Reg, office?.Str("RegNo"));
            Fill(k.Rep, office?.Str("RpsNm"));
            Fill(k.Tel, office?.Str("OffTel"));
            if (k.Sosok is not null) Fill(k.Sosok, s.RtNm);
        }
    }

    // ---------------- 문서 그리기 ----------------

    private void Rebuild()
    {
        _page.Children.Clear();
        var tpl = _tpl ?? new JsonObject();
        var title = (_r.Str("docType") ?? "계약서").Replace("(단독)", "");
        _page.Children.Add(new TextBlock { Text = title, FontSize = 24, FontWeight = FontWeights.Bold, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 0, 0, 14) });

        var intro = (string?)tpl["intro"] ?? $"{string.Join("과(와) ", _sign.Parties.Select(p => p.Label.Replace(" ", "")))} 쌍방은 아래 표시 부동산에 관하여 다음 내용과 같이 계약을 체결한다.";
        _page.Children.Add(Para(intro));

        // 1. 부동산의 표시
        _page.Children.Add(Heading($"1. {(string?)tpl["propertyTitle"] ?? "부동산의 표시"}"));
        _page.Children.Add(PropertyTable(IsSale(tpl)));

        // 2. 계약내용
        _page.Children.Add(Heading("2. 계약내용"));
        if ((string?)tpl["objective"] is { } obj) _page.Children.Add(Para(obj));
        if (tpl["amountRows"] is JsonArray rows) _page.Children.Add(AmountTable(rows));

        int n = 2;
        if (tpl["clauses"] is JsonArray clauses)
            foreach (var c in clauses)
                _page.Children.Add(Clause(n++, c));

        _page.Children.Add(Heading("특약사항"));
        var special = FormBuilder.MakeTextBox(_r, "특약사항");
        special.AcceptsReturn = true;
        special.TextWrapping = TextWrapping.Wrap;
        special.MinHeight = 110;
        special.VerticalContentAlignment = VerticalAlignment.Top;
        _page.Children.Add(special);

        var date = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 14, 0, 8) };
        date.Children.Add(new TextBlock { Text = "본 계약을 증명하기 위하여 계약 당사자가 이의 없음을 확인하고 각자 서명·날인한다.   계약일자 ", VerticalAlignment = VerticalAlignment.Center });
        date.Children.Add(FormBuilder.MakeDateBox(_r, "계약일자"));
        _page.Children.Add(date);

        _page.Children.Add(Heading("3. 거래당사자 및 개업공인중개사"));
        var addBar = new WrapPanel();
        foreach (var p in _sign.Parties.Take(2))
        {
            var b = new Button { Content = $"＋ {p.Label.Replace(" ", "")} 추가" };
            var label = p.Label;
            b.Click += (_, _) =>
            {
                var role = ContractCatalog.AddParty(_doc, label, DateTimeOffset.Now.ToUnixTimeMilliseconds());
                _r[$"_addlabel_{role}"] = "대리인";
                Rebuild();
            };
            addBar.Children.Add(b);
        }
        _page.Children.Add(addBar);
        _page.Children.Add(PartyTable());
        if (_sign.Broker != "none") _page.Children.Add(BrokerTable());
    }

    private static bool IsSale(JsonObject tpl) =>
        tpl["amountRows"] is JsonArray a && a.Any(x => (string?)x?["label"] == "매매대금" || (string?)x?["label"] == "매매예정금액");

    private static TextBlock Heading(string text) => new() { Text = text, FontWeight = FontWeights.Bold, FontSize = 14, Margin = new Thickness(0, 12, 0, 4) };

    private static TextBlock Para(string text) => new() { Text = text, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 2, 0, 4), LineHeight = 20 };

    private Grid Table(int cols)
    {
        var g = new Grid();
        for (int i = 0; i < cols; i++) g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        return g;
    }

    private static Border Cell(UIElement child, bool header = false, Brush? back = null) => new()
    {
        BorderBrush = new SolidColorBrush(Color.FromRgb(0x33, 0x41, 0x55)), BorderThickness = new Thickness(0.5),
        Background = back ?? (header ? new SolidColorBrush(Color.FromRgb(0xF1, 0xF5, 0xF9)) : Brushes.White),
        Padding = new Thickness(5, 3, 5, 3), Child = child,
    };

    private static TextBlock Th(string text) => new() { Text = text, FontWeight = FontWeights.Bold, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center, TextAlignment = TextAlignment.Center };

    private static void Put(Grid g, UIElement e, int row, int col, int colSpan = 1, int rowSpan = 1)
    {
        while (g.RowDefinitions.Count <= row + rowSpan - 1) g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        Grid.SetRow(e, row);
        Grid.SetColumn(e, col);
        Grid.SetColumnSpan(e, colSpan);
        Grid.SetRowSpan(e, rowSpan);
        g.Children.Add(e);
    }

    private Grid GridWithStars(params double[] widths)
    {
        var g = new Grid();
        foreach (var w in widths) g.ColumnDefinitions.Add(new ColumnDefinition { Width = w > 0 ? new GridLength(w) : new GridLength(1, GridUnitType.Star) });
        return g;
    }

    private TextBox Box(string key, string? ph = null)
    {
        var tb = FormBuilder.MakeTextBox(_r, key, ph);
        tb.BorderThickness = new Thickness(0, 0, 0, 1);
        tb.MinHeight = 22;
        return tb;
    }

    /// <summary>1. 부동산의 표시 — 소재지 / 토지 / 대지권 / 건물 / (임대차) 임대할 부분</summary>
    private Grid PropertyTable(bool isSale)
    {
        var g = GridWithStars(70, 70, 0, 70, 0, 60, 120);
        int r = 0;
        Put(g, Cell(Th("소재지"), true), r, 0, 2);
        Put(g, Cell(Box("소재지")), r++, 2, 5);

        Put(g, Cell(Th("토지"), true), r, 0);
        Put(g, Cell(Th("지목"), true), r, 1);
        Put(g, Cell(FormBuilder.MakeCombo(_r, "토지지목", Catalog.LandCategories)), r, 2);
        Put(g, Cell(Th("면적"), true), r, 3);
        Put(g, Cell(WithUnit(Box("토지면적"), "㎡")), r++, 4, 3);

        Put(g, Cell(Th("대지권"), true), r, 0);
        Put(g, Cell(Th("종류"), true), r, 1);
        Put(g, Cell(Box("대지권종류")), r, 2);
        Put(g, Cell(Th("비율"), true), r, 3);
        var ratio = new StackPanel { Orientation = Orientation.Horizontal };
        var a = Box("대지권분모"); a.Width = 90;
        var b = Box("대지권분자"); b.Width = 90;
        ratio.Children.Add(a);
        ratio.Children.Add(new TextBlock { Text = " 분의 ", VerticalAlignment = VerticalAlignment.Center });
        ratio.Children.Add(b);
        Put(g, Cell(ratio), r++, 4, 3);

        Put(g, Cell(Th("건물"), true), r, 0);
        Put(g, Cell(Th("구조"), true), r, 1);
        Put(g, Cell(Box("건물구조")), r, 2);
        Put(g, Cell(Th("용도"), true), r, 3);
        var use = new ComboBox { IsEditable = true, ItemsSource = ContractCatalog.BuildingUses };
        use.SetBinding(ComboBox.TextProperty, new Binding("[건물용도]") { Source = _r, Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.LostFocus });
        Put(g, Cell(use), r, 4);
        Put(g, Cell(Th("면적"), true), r, 5);
        Put(g, Cell(WithUnit(Box("건물면적"), "㎡")), r++, 6);

        if (!isSale)
        {
            Put(g, Cell(Th("임대할부분"), true), r, 0, 2);
            Put(g, Cell(Box("임대할부분")), r, 2, 3);
            Put(g, Cell(Th("면적"), true), r, 5);
            Put(g, Cell(WithUnit(Box("임대부분면적"), "㎡")), r++, 6);
        }
        return g;
    }

    private static FrameworkElement WithUnit(FrameworkElement e, string unit)
    {
        var dp = new DockPanel();
        var u = new TextBlock { Text = unit, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(3, 0, 0, 0) };
        DockPanel.SetDock(u, Dock.Right);
        dp.Children.Add(u);
        dp.Children.Add(e);
        return dp;
    }

    /// <summary>금액표 — 라벨 | 문장(입력칸 포함)</summary>
    private FrameworkElement AmountTable(JsonArray rows)
    {
        var g = GridWithStars(90, 0);
        int r = 0;
        var loansShown = false;
        void LoanRows()
        {
            if (loansShown) return;
            loansShown = true;
            foreach (var ln in _loans ?? new())
            {
                var label = new ComboBox { ItemsSource = new[] { "융자금", "현임대보증금" }, FontWeight = FontWeights.Bold };
                label.SetBinding(ComboBox.SelectedItemProperty, new Binding("[라벨]") { Source = ln, Mode = BindingMode.TwoWay });
                Put(g, Cell(label), r, 0);
                var line = new WrapPanel();
                line.Children.Add(new TextBlock { Text = "金 ", VerticalAlignment = VerticalAlignment.Center });
                line.Children.Add(AmountBox("amt", ln));
                line.Children.Add(new TextBlock { Text = " 원정은 ", VerticalAlignment = VerticalAlignment.Center });
                var term = new ComboBox { IsEditable = true, ItemsSource = ContractCatalog.LoanTerms, Width = 260 };
                term.SetBinding(ComboBox.TextProperty, new Binding("[승계]") { Source = ln, Mode = BindingMode.TwoWay, UpdateSourceTrigger = UpdateSourceTrigger.LostFocus });
                line.Children.Add(term);
                var del = new Button { Content = "삭제", Padding = new Thickness(6, 0, 6, 0), Margin = new Thickness(8, 0, 0, 0) };
                var target = ln;
                del.Click += (_, _) => { _loans!.Remove(target); if (_loans.Count == 0) _r["_융자금표시"] = false; Rebuild(); };
                line.Children.Add(del);
                Put(g, Cell(line), r++, 1);
            }
        }
        foreach (var row in rows)
        {
            if (row is not JsonObject o) continue;
            var label = (string?)o["label"] ?? "";
            if (label == "융자금") { LoanRows(); continue; }        // 서식의 융자금 행은 여러 건 목록으로 대신
            Put(g, Cell(Th(label)), r, 0);
            Put(g, Cell(Segments(o["text"] as JsonArray)), r++, 1);
            if (label is "매매대금" or "보증금") LoanRows();     // 융자금은 매매대금/보증금 바로 아래(기존과 같음)
        }
        LoanRows();
        if (!rows.OfType<JsonObject>().Any(o => (string?)o["label"] is "매매대금" or "보증금" or "융자금")) return g;

        var panel = new StackPanel();
        panel.Children.Add(g);
        var add = new Button { Content = "＋ 융자금 추가", HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 4, 0, 0) };
        add.Click += (_, _) =>
        {
            _loans!.Add(new Row { ["amt"] = "", ["승계"] = ContractCatalog.LoanTerms[0], ["라벨"] = "융자금" });
            _r["_융자금표시"] = true;
            Rebuild();
        };
        panel.Children.Add(add);
        return panel;
    }

    private static bool HasLoanRow(JsonObject? tpl) => tpl?["amountRows"] is JsonArray a && a.Any(x => (string?)x?["label"] == "융자금");

    /// <summary>조항 1개 — 문자열 또는 [문자열/입력칸] 배열. 앞에 '제n조'</summary>
    private FrameworkElement Clause(int n, JsonNode? c)
    {
        var tb = c is JsonArray arr ? Segments(arr) : new TextBlock { Text = c?.ToString() ?? "", TextWrapping = TextWrapping.Wrap };
        tb.Inlines.InsertBefore(tb.Inlines.FirstInline, new Run($"제{n}조 ") { FontWeight = FontWeights.SemiBold });
        tb.Margin = new Thickness(0, 3, 0, 3);
        return tb;
    }

    private static double FieldWidth(string? w)
    {
        if (string.IsNullOrEmpty(w)) return 140;
        if (w.EndsWith("%") && double.TryParse(w.TrimEnd('%'), NumberStyles.Float, CultureInfo.InvariantCulture, out var pct)) return PageWidth * pct / 100 * 0.9;
        if (w.EndsWith("px") && double.TryParse(w[..^2], NumberStyles.Float, CultureInfo.InvariantCulture, out var px)) return px;
        return 140;
    }

    /// <summary>문장 세그먼트(문자열 + {k,w,ph} 입력칸)를 한 문단(TextBlock + 인라인 입력칸)으로</summary>
    private TextBlock Segments(JsonArray? parts)
    {
        var tb = new TextBlock { TextWrapping = TextWrapping.Wrap, LineHeight = 26 };
        if (parts is null) return tb;
        foreach (var p in parts)
        {
            if (p is JsonValue v) { tb.Inlines.Add(new Run(v.ToString())); continue; }
            if (p is not JsonObject o || (string?)o["k"] is not { } key) continue;
            FrameworkElement input;
            if (key.EndsWith("일자") || key.EndsWith("종료"))
                input = FormBuilder.MakeDateBox(_r, key);
            else if (key.EndsWith("한글"))
                input = AmountBox(key);
            else
            {
                var box = Box(key, (string?)o["ph"]);
                box.Width = FieldWidth((string?)o["w"]);
                if (o["center"] is not null) box.TextAlignment = TextAlignment.Center;
                input = box;
            }
            input.Margin = new Thickness(2, 0, 2, -6);
            tb.Inlines.Add(new InlineUIContainer(input) { BaselineAlignment = BaselineAlignment.Center });
        }
        return tb;
    }

    /// <summary>금액칸: 입력 중엔 숫자(콤마), 벗어나면 한글 금액. 저장값은 숫자(입력금액단위 기준)</summary>
    private FrameworkElement AmountBox(string key, Row? row = null)
    {
        var src = row ?? _r;
        var man = (_r.Str("_금액단위") ?? "만원") != "원";
        var tb = new TextBox { Width = 230, BorderThickness = new Thickness(0, 0, 0, 1), MinHeight = 22 };
        string Raw() => new((src.Str(key) ?? "").Where(c => char.IsDigit(c) || c == '.').ToArray());
        string Han()
        {
            if (!decimal.TryParse(Raw(), NumberStyles.Float, CultureInfo.InvariantCulture, out var n) || n <= 0) return "";
            return ContractCatalog.Hangul((long)(man ? n * 10000 : n));
        }
        void ShowHan() => tb.Text = Han();
        tb.GotKeyboardFocus += (_, _) =>
        {
            tb.Text = decimal.TryParse(Raw(), NumberStyles.Float, CultureInfo.InvariantCulture, out var n) ? n.ToString("#,0.##", CultureInfo.InvariantCulture) : "";
            tb.SelectAll();
        };
        tb.LostKeyboardFocus += (_, _) =>
        {
            var raw = new string(tb.Text.Where(c => char.IsDigit(c) || c == '.').ToArray());
            src[key] = raw.Length == 0 ? null : raw;
            ShowHan();
        };
        ShowHan();
        var sp = new StackPanel { Orientation = Orientation.Horizontal };
        sp.Children.Add(tb);
        sp.Children.Add(new TextBlock { Text = man ? "(만원)" : "(원)", Foreground = Brushes.Gray, VerticalAlignment = VerticalAlignment.Bottom, Margin = new Thickness(2, 0, 0, 2) });
        return sp;
    }

    /// <summary>거래당사자 — 역할마다 주소 / 신분증 번호 / 연락처 / 이름</summary>
    private Grid PartyTable()
    {
        var g = GridWithStars(80, 110, 0, 56, 0, 48, 0, 40);
        int r = 0;
        var green = new SolidColorBrush(Color.FromRgb(0xDC, 0xFC, 0xE7));
        void PartyRows(UIElement labelCell, string role)
        {
            Put(g, Cell(labelCell, true, green), r, 0, 1, 2);
            Put(g, Cell(Th("주소"), true), r, 1);
            Put(g, Cell(Box($"{role}_주소")), r, 2, 5);
            Put(g, Cell(Th("(인)")), r, 7, 1, 2);
            r++;
            var idType = FormBuilder.MakeCombo(_r, $"{role}_주민번호유형", Opt.Of(ContractCatalog.IdTypes.ToArray()));
            if (!_r.Has($"{role}_주민번호유형")) _r[$"{role}_주민번호유형"] = "주민등록번호";
            Put(g, Cell(idType, true), r, 1);
            Put(g, Cell(Box($"{role}_주민번호")), r, 2);
            Put(g, Cell(Th("연락처"), true), r, 3);
            Put(g, Cell(Box($"{role}_전화")), r, 4);
            Put(g, Cell(Th("이름"), true), r, 5);
            Put(g, Cell(Box($"{role}_성명")), r, 6);
            r++;
        }
        var added = ContractCatalog.AddedParties(_doc).ToList();
        foreach (var p in _sign.Parties)
        {
            PartyRows(Th(p.Label), p.Role);
            // 추가 당사자(대리인 등) — 기존 _addParties, 키 접두 '{라벨}#{id}', 라벨 유형 _addlabel_{접두}
            foreach (var a in added.Where(a => a.Label == p.Label))
            {
                var cell = new StackPanel();
                cell.Children.Add(FormBuilder.MakeCombo(_r, $"_addlabel_{a.Role}", Opt.Of(ContractCatalog.DaeriTypes.ToArray())));
                var del = new Button { Content = "삭제", Padding = new Thickness(4, 0, 4, 0), Margin = new Thickness(0, 3, 0, 0) };
                var id = a.Id;
                del.Click += (_, _) => { RemoveParty(id); Rebuild(); };
                cell.Children.Add(del);
                PartyRows(cell, a.Role);
            }
        }
        g.Margin = new Thickness(0, 6, 0, 0);
        return g;
    }

    /// <summary>개업공인중개사(기본 + 공동중개사)</summary>
    private Grid BrokerTable()
    {
        var g = GridWithStars(80, 110, 0, 64, 0, 92, 0);
        var count = _sign.BrokerCount + (int)(_r.Long("_공동중개사수") ?? 0);
        int r = 0;
        for (int i = 0; i < count; i++)
        {
            var k = ContractCatalog.BrokerKeys(_sign.Broker, i);
            var label = _sign.Broker == "exclusive" ? "중개업자(乙)" : "개업\n공인중개사";
            Put(g, Cell(Th(label), true, new SolidColorBrush(Color.FromRgb(0xDC, 0xFC, 0xE7))), r, 0, 1, 3);
            Put(g, Cell(Th("사무소 소재지"), true), r, 1);
            Put(g, Cell(Box(k.Addr)), r++, 2, 5);
            Put(g, Cell(Th("사무소 명칭"), true), r, 1);
            Put(g, Cell(Box(k.Name)), r, 2, 3);
            Put(g, Cell(Th("대표"), true), r, 5);
            Put(g, Cell(Box(k.Rep)), r++, 6);
            Put(g, Cell(Th("등록번호"), true), r, 1);
            Put(g, Cell(Box(k.Reg)), r, 2);
            Put(g, Cell(Th("전화번호"), true), r, 3);
            Put(g, Cell(Box(k.Tel)), r, 4);
            Put(g, Cell(Th(k.Sosok is null ? "" : "소속 중개사"), true), r, 5);
            Put(g, Cell(k.Sosok is null ? new TextBlock() : Box(k.Sosok)), r++, 6);
        }
        g.Margin = new Thickness(0, 6, 0, 0);
        return g;
    }

    // ---------------- 물건 불러오기 / 인쇄 ----------------

    /// <summary>물건관리에서 고른 물건으로 소재지·면적·구조·용도 등을 채운다(기존 '물건정보 불러오기')</summary>
    private void LoadProperty()
    {
        if (Pickers.Property() is not { } p) return;
        _r["소재지"] = string.Join(" ", new[] { PropertyService.AddressText(p), p.Str("addr4") ?? p.Str("addr5"),
            p.Has("dong") ? $"{p.Str("dong")}동" : null, p.Has("ho") ? $"{p.Str("ho")}호" : null }.Where(s => !string.IsNullOrWhiteSpace(s)));
        if (p.Dec("land_share") is { } land) _r["토지면적"] = land.ToString("0.##", CultureInfo.InvariantCulture);
        if (p.Dec("exc_area") is { } exc) _r["건물면적"] = exc.ToString("0.##", CultureInfo.InvariantCulture);
        if (p.Str("land_category") is { } lc) _r["토지지목"] = lc;
        if (p.Str("buid_struct") is { } bs) _r["건물구조"] = bs;
        if (Catalog.ApartmentFormCodes.Contains(p.Str("pt_type") ?? "") && !_r.Has("건물용도")) _r["건물용도"] = "아파트";
        var man = (_r.Str("_금액단위") ?? "만원") != "원";
        long? Amt(string k) => p.Long(k) is { } v ? (man ? v : v * 10000) : null;
        if (IsSale(_tpl ?? new JsonObject()) && Amt("sale_amt") is { } s) { _r["매매대금"] = s.ToString(); _r["매매대금한글"] = s.ToString(); }
        else if ((Amt("les_amt") ?? Amt("prot_amt")) is { } dep) { _r["보증금"] = dep.ToString(); _r["보증금한글"] = dep.ToString(); }
        _r["_pt_no"] = p.Long("pt_no");
        Rebuild();
    }

    private void Print()
    {
        var dlg = new PrintDialog();
        if (!Dialogs.ShowPrint(dlg)) return;
        var scale = Math.Min(dlg.PrintableAreaWidth / (_page.ActualWidth + 40), 1.0);
        var old = _page.LayoutTransform;
        _page.LayoutTransform = new ScaleTransform(scale, scale);
        _page.UpdateLayout();
        dlg.PrintVisual(_page, _r.Str("docType") ?? "계약서");
        _page.LayoutTransform = old;
    }

    // ---------------- 부속문서 ----------------

    /// <summary>
    /// 부속문서 열기 — 계약서를 아직 저장하지 않았으면 키를 미리 정해 둔다(기존 작성 화면의 masterId).
    /// 부속문서를 먼저 저장하면 계약은 '(임시)'로 생기고, 이후 계약서 저장은 같은 키로 수정된다.
    /// </summary>
    private async Task OpenDocAsync(DocForm form)
    {
        FlushDoc();
        if (IsNew)
        {
            _master["master_id"] = Guid.NewGuid().ToString();
            UpdateMode();
        }
        var m = _master.Clone();
        m["doc"] = _doc.ToJsonString();
        m["contract_kind"] = _r.Str("category");
        m["doc_type"] = _r.Str("ptType");
        m["trade_type"] = _r.Str("docHint");
        await Task.Yield();
        new ContractDocWindow(_svc, form, _master.Str("master_id")!, m) { Owner = DialogOwner }.ShowDialog();
    }

    private void RemoveParty(long id)
    {
        if (_doc["_addParties"] is not JsonArray arr) return;
        foreach (var o in arr.OfType<JsonObject>().Where(o => o["id"] is JsonValue v && v.TryGetValue<long>(out var x) && x == id).ToList()) arr.Remove(o);
    }

    /// <summary>화면 값(단순 값 + 융자금 목록)을 doc JSON에 반영</summary>
    private void FlushDoc()
    {
        ContractService.RowToDoc(_r, _doc);
        if (_loans is null) return;
        var arr = new JsonArray();
        foreach (var ln in _loans)
        {
            var o = new JsonObject();
            ContractService.RowToDoc(ln, o);
            foreach (var k in new[] { "amt", "승계", "라벨" }) o[k] ??= "";
            arr.Add(o);
        }
        _doc["_loans"] = arr;
    }

    // ---------------- 저장 ----------------

    protected override bool IsNew => string.IsNullOrEmpty(_master.Str("master_id"));

    protected override async Task SaveAsync()
    {
        FlushDoc();
        await _svc.SaveAsync(_master, _doc);
    }

    protected override Task DeleteAsync() => _svc.DeleteAsync(_master.Str("master_id")!);
    protected override string DeleteConfirm => "계약서를 삭제하시겠습니까?";
}

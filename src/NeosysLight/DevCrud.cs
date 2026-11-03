#if DEBUG
using System.IO;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Input;
using Neosys.Local.App.Ui;
using Neosys.Local.App.Views;
using Neosys.Local.Core;
using Neosys.Local.Core.Server;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;
using static Neosys.Local.App.DevAudit;

namespace Neosys.Local.App;

/// <summary>
/// 화면 등록·삭제 점검(디버그 빌드 전용): 메뉴 창을 열고 [등록] → 입력칸에 값 입력 → [저장]을 눌러 3건 등록, 목록에서 1건을 골라 [삭제]하고
/// 확인 질문에 '예'로 답한다. 단계마다 결과(저장 안내·오류 상자·예외·목록 건수)를 기록한다.
///   NEOSYS_DB=&lt;점검용.db&gt; NeosysLight.exe --crud &lt;결과.txt&gt; [메뉴키]
/// 버튼은 실제 누름과 같은 OnClick, 입력은 컨트롤 값(Text·SelectedItem·IsChecked·표 셀 편집)으로 넣는다 — 마우스·키보드 이벤트를 흉내 내지는 않는다.
/// 법정동·단지 목록은 가짜 서버(견본)로 답하고, 운영 서버는 부르지 않는다. 사용자 실제 DB(기본 경로)에서는 실행하지 않는다.
/// </summary>
internal static class DevCrud
{
    private sealed record Step(string Menu, string Action, bool Ok, string Detail);

    private static readonly List<Step> Steps = new();
    private static readonly MethodInfo OnClick = typeof(ButtonBase).GetMethod("OnClick", BindingFlags.Instance | BindingFlags.NonPublic)!;
    private static readonly List<string> Unhandled = new();
    private static App _app = null!;
    private static string _output = "";
    private static string _menu = "";

    public static bool TryRun(App app, string[] args)
    {
        if (args.Length < 2 || args[0] != "--crud") return false;
        _app = app;
        _output = Path.GetFullPath(args[1]);
        var only = args.Length > 2 ? args[2] : null;
        app.Dispatcher.InvokeAsync(async () =>
        {
            try
            {
                var db = Environment.GetEnvironmentVariable("NEOSYS_DB");
                if (string.IsNullOrEmpty(db) || Path.GetFullPath(db).StartsWith(Path.GetFullPath(AppServices.Accounts.BaseDir) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                {
                    File.WriteAllText(_output, "NEOSYS_DB에 점검용 DB 경로를 지정하세요(실제 사용자 DB에서는 실행하지 않습니다).");
                    Environment.Exit(2);
                }
                Environment.SetEnvironmentVariable("NEOSYS_API", "http://127.0.0.1:9");
                await AppServices.InitializeAsync();
                await AppServices.OpenAccountAsync("dev");   // NEOSYS_DB가 있으면 그 파일, 없으면 dev 계정 DB
                AppServices.UseServer(new ServerApi("http://fake.local/", new FakeServer()));
                AppServices.Settings.ConsultMode = false;   // 소유자·메모·상담 카드가 보이는 기본 화면으로(설정 파일에는 저장하지 않음)
                AppServices.SetSession(new AppSession { RtNo = 1, OffNo = 1, UserId = "dev", RtNm = "점검자", RtType = "RTTYP01", OffNm = "점검 사무소" });
                AuditHook.Active = true;
                AuditHook.ConfirmAnswer = MessageBoxResult.Yes;
                app.DispatcherUnhandledException += (_, e) => { Unhandled.Add($"{_menu}: {e.Exception.GetType().Name}: {e.Exception.Message}"); e.Handled = true; };
                TaskScheduler.UnobservedTaskException += (_, e) => { Unhandled.Add($"{_menu}: {e.Exception.InnerException?.Message ?? e.Exception.Message}"); e.SetObserved(); };

                var main = new DashboardWindow { ShowActivated = false };
                app.MainWindow = main;
                main.Show();
                await Delay(800);

                var scripts = new (string Key, Func<Window, Task> Run)[]
                {
                    ("property", PropertyAsync), ("customer", CustomerAsync), ("contract", ContractAsync), ("schedule", ScheduleAsync),
                    ("interview", InterviewAsync), ("vendor", VendorAsync), ("memo", MemoAsync), ("worklog", WorklogAsync),
                    ("expiry", ExpiryAsync), ("neobot", NeobotAsync),
                };
                foreach (var (key, run) in scripts.Where(s => only is null || s.Key == only))
                {
                    _menu = MenuRegistry.All.First(m => m.Key == key).Title;
                    var page = WindowManager.OpenMenu(key);
                    var win = page is null ? null : Window.GetWindow(page);
                    if (win is null) { Fail("메뉴 창", "창이 열리지 않음"); continue; }
                    await Delay(1500);
                    try { await run(win); }
                    catch (Exception ex) { Fail("중단", ex.Message); }
                    foreach (var w in _app.Windows.OfType<Window>().Where(w => w != main && w.IsVisible).ToList()) w.Close();
                    await Delay(300);
                    Write();
                }
                Write();
                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                File.WriteAllText(_output + ".error.txt", ex.ToString());
                Write();
                Environment.Exit(1);
            }
        });
        return true;
    }

    // ================= 메뉴별 시나리오 =================

    private static readonly string[] Owners = { "김소유", "이소유", "박소유" };

    private static async Task PropertyAsync(Window win)
    {
        var svc = AppServices.Create((sp, s) => new PropertyService(sp, s));
        var before = (await svc.ListAsync()).Count;
        var statuses = new[] { "전세", "월세", "전세" };
        for (int i = 0; i < 3; i++)
        {
            var ho = $"{12 + i}03";
            await RegisterAsync(win, "신규 등록", "등록 | 저장", $"점검자이 101동 {ho}호", async w =>
            {
                // 소재지: 시/도·시/군/구·읍/면/동 드롭다운 → 물건명 행의 단지 선택(기존 AddressSelectorSimple·DanjiSelector)
                await SelectAddressAsync(w, "서울특별시", "강남구", "개포동");
                await SelectDanjiAsync(w, "점검자이");
                await Input(w, "dong", "101");
                await Input(w, "ho", ho);
                await Input(w, "floor1", (12 + i).ToString());
                await Input(w, "exc_area", "84.97");
                await Input(w, "sale_div:SALEDIV01", "활성");
                await Input(w, "sale_amt", (180000 + i * 5000).ToString());
                await Input(w, "current_status", statuses[i]);
                await Input(w, "mtry_date", LocalDate.Format(DateTime.Today.AddMonths(i + 1)));
                await Input(w, "now_dep_amt", "50000");
                // 소유자 표 첫 빈 행 → 물건특징·상담내용 첫 줄 → 상담 연락처는 [전화번호입력]에서 방금 넣은 소유자 선택
                var holder = Descendants(w).OfType<Views.Properties.HolderCard>().First();
                await HolderInput(holder, "holder_name", Owners[i]);
                await HolderInput(holder, "holder_phone", $"010-2000-{ho.PadLeft(4, '0')}");
                var cards = Descendants(w).OfType<Views.Properties.MemoLineCard>().ToList();
                await LineInput(cards[0], $"101동 {ho}호 남향, 올수리");
                await LineInput(cards[1], $"{ho}호 매도 의뢰 상담");
                await PickLineContactAsync(cards[1], Owners[i]);
            });
        }
        Begin();
        var list = await svc.ListAsync();
        Check("목록(DB)", list.Count == before + 3, $"{before} → {list.Count}건");
        Check("소유자·메모·상담 저장", list.Where(r => r.Str("pt_name")?.StartsWith("점검자이") == true).All(r =>
        {
            var d = svc.GetAsync(r.Long("pt_no")!.Value).Result!;
            return d.Holders.Count == 1 && d.Memos.Count == 1 && d.Consults.Count == 1;
        }), "3건 모두 소유자 1·메모 1·상담 1");

        // 화면 목록: 왼쪽 물건리스트에서 단지 선택 → 표 3건
        var page = (Views.Properties.PropertyPage)Descendants(win).OfType<Views.Properties.PropertyPage>().First();
        await SelectSummaryAsync(page, "점검자이");
        var grid = PageGrid(win);
        var rows = await Until(() => GridRows(grid).Count(r => r.Long("pt_no") is not null) >= 3 ? GridRows(grid) : null, "표 3건");
        Check("화면 목록 3건", rows.Count(r => r.Long("pt_no") is not null) == 3, $"{rows.Count(r => r.Long("pt_no") is not null)}건");
        Check("금액·만기 저장", list.Any(r => r.Long("sale_amt") == 185000), "매매가 18억5천 확인");
        End("목록 확인");

        // 삭제할 물건에 일정을 연결(연동 정보 확인 질문을 보기 위해 — 일정 등록은 서비스로)
        var target = rows.First(r => r.Long("pt_no") is not null && r.Str("ho") == "1403");
        var ptNo = target.Long("pt_no")!.Value;
        var sch = AppServices.Create((sp, s) => new ScheduleService(sp, s));
        var sr = sch.New(DateTime.Today.AddDays(2), ptNo); sr["title"] = "잔금일";
        var schId = await sch.SaveAsync(sr);

        Begin();
        grid.SelectedItems.Clear();
        grid.SelectedItem = target;
        await ContextMenuAsync(grid, "삭제");
        await Delay(1200);
        var asked = Events().Where(e => e.Kind == "확인상자").Select(e => e.Text).ToList();
        Check("삭제 확인 질문", asked.Any(t => t.Contains("물건 삭제")) && asked.Any(t => t.Contains("연결된 일정 1건")), string.Join(" / ", asked.Select(t => Trim(t, 70))));
        var after = await svc.ListAsync();
        Check("삭제 후 목록(DB)", after.Count == before + 2 && after.All(r => r.Long("pt_no") != ptNo), $"{after.Count}건");
        Check("삭제 후 화면 목록", GridRows(PageGrid(win)).Count(r => r.Long("pt_no") is not null) == 2, $"{GridRows(PageGrid(win)).Count(r => r.Long("pt_no") is not null)}건");
        Check("연동 삭제('예')", (await sch.GetAsync(schId))?.Str("pt_no") is null && (await svc.HistoryAsync(ptNo)).Count == 1, "일정 연결 끊김 · 과거내역 1건");
        End("삭제");
    }

    private static async Task CustomerAsync(Window win)
    {
        var svc = AppServices.Create((sp, s) => new CustomerService(sp, s));
        var before = (await svc.ListAsync()).Count;
        var people = new[] { ("최매수", "010-3100-0001", "매매", "150000", "200000"), ("정전세", "010-3100-0002", "전세", "80000", "95000"), ("한월세", "010-3100-0003", "월세", "5000", "10000") };
        foreach (var (name, tel, trade, fr, to) in people)
        {
            await RegisterAsync(win, "신규 등록", "등록 | 저장", name, async w =>
            {
                await Input(w, "want_type", "주거용");
                await Press(w, "지역추가");
                await PickRegionAsync("서울특별시", "강남구", "대치동");
                await Input(w, "trd_type", trade);
                var amt = trade switch { "매매" => "sale_amt", "전세" => "les_amt", _ => "prot_amt" };
                await Input(w, amt + "_fr", fr);
                await Input(w, amt + "_to", to);
                await SelectTab(w, "구입자");
                var buyers = EditorOf(w, "relation");
                var b = buyers.Items.FirstOrDefault(r => !r.Has("name")) ?? await AddChildRow(buyers, "+ 행추가");
                await Cell(buyers, b, "name", name);
                await Cell(buyers, b, "relation", "본인");
                await Cell(buyers, b, "tel", tel);
                var memos = EditorOf(w, "memo_content");
                await Cell(memos, await AddChildRow(memos, "날짜입력"), "memo_content", $"{name} 고객 — 학군 중요");
            }, saveLabelFallback: "저장");
        }
        Begin();
        var list = await svc.ListAsync();
        Check("목록(DB)", list.Count == before + 3, $"{before} → {list.Count}건");
        var saved = list.FirstOrDefault(r => r.Str("name") == "최매수");
        if (saved is not null)
        {
            var d = (await svc.GetAsync(saved.Long("cust_no")!.Value))!;
            Check("구입자·희망지역·메모 저장", d.Buyers.Count == 1 && d.Areas.Count == 1 && d.Memos.Count == 1 && d.Cust.Str("tel") == "010-3100-0001",
                $"구입자 {d.Buyers.Count}·지역 {d.Areas.Count}·메모 {d.Memos.Count}, 전화 {d.Cust.Str("tel")}");
        }
        End("목록 확인");
        await ListDeleteAsync(win, r => r.Str("name") == "한월세", async () => (await svc.ListAsync()).Count, before + 2);
    }

    private static async Task ContractAsync(Window win)
    {
        var svc = AppServices.Create((sp, s) => new ContractService(sp, s));
        var before = (await svc.ListAsync()).Count;
        var items = new[] { ("매매", "서울 강남구 개포동 점검자이 101동 1203호", "김소유", "최매수", "185000"), ("전세", "서울 강남구 개포동 점검자이 101동 1303호", "이소유", "정전세", "95000"), ("월세", "서울 강남구 대치동 점검빌라 201호", "박소유", "한월세", "10000") };
        foreach (var (trade, addr, seller, buyer, amt) in items)
        {
            await RegisterAsync(win, "등록", "저장", addr, async w =>
            {
                await Input(w, "ptType", trade == "월세" ? "연립주택" : "아파트");
                await Input(w, "거래유형", trade);
                await Input(w, "소재지", addr);
                await Input(w, "거래금액", amt);
                await Input(w, "계약일", LocalDate.Today);
                await Input(w, "이전의뢰인", seller);
                await Input(w, "취득의뢰인", buyer);
                await Input(w, "잔금일", LocalDate.Format(DateTime.Today.AddMonths(2)));
            });
        }
        Begin();
        var list = await svc.ListAsync();
        Check("목록(DB)", list.Count == before + 3, $"{before} → {list.Count}건");
        Check("당사자·금액 저장", list.Any(r => r.Str("seller") == "김소유" && r.Str("buyer") == "최매수" && r.Long("amount") == 185000), "매매 1건 확인");
        End("목록 확인");
        await ListDeleteAsync(win, r => r.Str("addr")?.Contains("점검빌라") == true, async () => (await svc.ListAsync()).Count, before + 2);
    }

    private static async Task ScheduleAsync(Window win)
    {
        var svc = AppServices.Create((sp, s) => new ScheduleService(sp, s));
        int Count() => svc.ListAsync(DateTime.Today.AddDays(-1), DateTime.Today.AddDays(40), "ALL").Result.Count;
        var before = Count();
        foreach (var (title, days, time) in new[] { ("계약일", 1, "10:00"), ("임장", 3, "1430"), ("내방", 5, "16:30") })
        {
            await RegisterAsync(win, "일정 등록하기", "저장", title, async w =>
            {
                await Input(w, "title", title);
                await Input(w, "start_date", LocalDate.Format(DateTime.Today.AddDays(days)));
                await Input(w, "start_time", time);
                await Input(w, "location", "점검자이 101동");
                await Input(w, "contact_name", "최매수");
                await Input(w, "phone", "010-3100-0001");
                await Input(w, "content", $"{title} 점검 일정");
            });
        }
        Begin();
        Check("목록(DB)", Count() == before + 3, $"{before} → {Count()}건");
        var saved = svc.ListAsync(DateTime.Today, DateTime.Today.AddDays(40), "ALL").Result.FirstOrDefault(r => r.Str("title") == "임장");
        Check("시간 입력(1430 → 14:30)", saved?.Str("start_at")?.EndsWith("14:30") == true, saved?.Str("start_at") ?? "(없음)");
        End("목록 확인");

        // 삭제: 리스트보기에서 일정을 눌러 수정 창 → [삭제]
        Begin();
        await Press(win, "나의 일정", exact: true);
        await Delay(800);
        await PressItem(win, "리스트보기");
        await Delay(800);
        FrameworkElement cell;
        try { cell = await Until(() => Descendants(win).OfType<FrameworkElement>().FirstOrDefault(fe => fe.IsVisible && fe.Cursor == Cursors.Hand && LabelOf(fe).EndsWith("내방")), "일정 '내방' 항목"); }
        catch (TimeoutException ex)
        {
            var hands = Descendants(win).OfType<FrameworkElement>().Where(fe => fe.IsVisible && fe.Cursor == Cursors.Hand).Select(LabelOf).Take(40);
            throw new TimeoutException(ex.Message + " — 보이는 항목: " + string.Join(", ", hands));
        }
        RaiseClick(cell);
        var ew = await WaitWindow<FormEditWindow>("일정");
        await Delay(400);
        await Press(ew, "삭제", exact: true);
        await Until(() => ew.IsVisible ? null : ew, "수정 창 닫힘");
        await Delay(800);
        var asked = Events().Where(e => e.Kind == "확인상자").Select(e => e.Text).ToList();
        Check("삭제 확인 질문", asked.Count > 0, string.Join(" / ", asked.Select(t => Trim(t, 60))));
        Check("삭제 후 목록(DB)", Count() == before + 2, $"{Count()}건");
        End("삭제");
    }

    private static async Task InterviewAsync(Window win)
    {
        var svc = AppServices.Create((sp, s) => new InterviewService(sp, s));
        var before = (await svc.ListAsync()).Count;
        foreach (var (type, name, phone, content) in new[] { ("전화상담", "신규가", "010-5100-0001", "개포 아파트 매수 문의"), ("방문상담", "신규나", "010-5100-0002", "대치 전세 방문 상담"), ("현장상담", "신규다", "010-5100-0003", "빌라 현장 안내") })
        {
            await RegisterAsync(win, "상담등록", "저장", name, async w =>
            {
                await Input(w, "itv_type", type);
                await Input(w, "cust_name", name);
                await Input(w, "contact_name", name);
                await Input(w, "contact_phone", phone);
                await Input(w, "itv_content", content);
            });
        }
        Begin();
        var list = await svc.ListAsync();
        Check("목록(DB)", list.Count == before + 3, $"{before} → {list.Count}건");
        Check("상담유형 저장", list.Any(r => r.Str("cust_name") == "신규나" && r.Str("itv_type") == "ITVTYP02"), "방문상담 = ITVTYP02");
        End("목록 확인");
        await ListDeleteAsync(win, r => r.Str("cust_name") == "신규다", async () => (await svc.ListAsync()).Count, before + 2);
    }

    private static async Task VendorAsync(Window win)
    {
        var svc = AppServices.Create((sp, s) => new VendorService(sp, s));
        var before = (await svc.ListAsync()).Count;
        foreach (var (name, mgr, phone) in new[] { ("점검이사", "김이사", "010-7100-0001"), ("점검법무사", "박법무", "010-7100-0002"), ("점검인테리어", "최인테", "010-7100-0003") })
        {
            await RegisterAsync(win, "신규 등록", "저장", name, async w =>
            {
                await Input(w, "category1", Catalog.PartnerCategories[0].Value);
                await Input(w, "vendor_name", name);
                await Input(w, "manager_name", mgr);
                await Input(w, "manager_phone", phone);
                await Input(w, "product_desc", $"{name} 협력업체(점검)");
                await Press(w, "+ 지역추가");
                await PickRegionAsync("서울특별시", "강남구", "대치동");
                var consults = EditorOf(w, "itv_content");
                var c = await AddChildRow(consults, "+ 행추가");
                await Cell(consults, c, "contact_name", mgr);
                await Cell(consults, c, "contact_phone", phone);
                await Cell(consults, c, "itv_content", $"{name} 견적 문의");
            });
        }
        Begin();
        var list = await svc.ListAsync();
        Check("목록(DB)", list.Count == before + 3, $"{before} → {list.Count}건");
        var one = list.FirstOrDefault(r => r.Str("vendor_name") == "점검이사");
        if (one is not null)
        {
            var d = (await svc.GetAsync(one.Long("vendor_id")!.Value))!;
            Check("영업지역·상담 저장", d.Regions.Count == 1 && d.Consults.Count == 1, $"지역 {d.Regions.Count}·상담 {d.Consults.Count}");
        }
        End("목록 확인");
        await ListDeleteAsync(win, r => r.Str("vendor_name") == "점검인테리어", async () => (await svc.ListAsync()).Count, before + 2);
    }

    private static async Task MemoAsync(Window win)
    {
        var svc = AppServices.Create((sp, s) => new MemoService(sp, s));
        var before = (await svc.ListAsync()).Count;
        for (int i = 0; i < 3; i++)
        {
            Begin();
            await Press(win, "+ 메모 추가");
            var box = await Until(() => Descendants(win).OfType<TextBox>().FirstOrDefault(t => t.IsVisible && t.Text.Length == 0 && t.MinHeight >= 150), "빈 메모 칸");
            box.Focus();
            box.Text = $"점검 메모 {i + 1} — 오늘 할 일";
            await Delay(1200);   // 입력 후 0.6초 뒤 자동 저장
            End($"등록 {i + 1}");
        }
        Begin();
        var list = await svc.ListAsync();
        Check("목록(DB)", list.Count == before + 3 && list.Count(m => m.Str("content")?.StartsWith("점검 메모") == true) == 3, $"{before} → {list.Count}건");
        End("목록 확인");

        Begin();
        var del = Descendants(win).OfType<ButtonBase>().Where(b => b.IsVisible && b.ToolTip as string == "삭제").ToList();
        Click(del.Last());
        await Delay(1000);
        var asked = Events().Any(e => e.Kind == "확인상자");
        var after = await svc.ListAsync();
        Check("삭제 후 목록(DB)", after.Count == before + 2, $"{after.Count}건");
        Check("삭제 확인 질문", true, asked ? "있음" : "없음 — 누르면 바로 삭제(기존 StickyMemo와 같음)");
        End("삭제");
    }

    private static async Task WorklogAsync(Window win)
    {
        var svc = AppServices.Create((sp, s) => new WorklogService(sp, s));
        var page = Descendants(win).OfType<Views.Worklog.WorklogPage>().First();
        var content = (TextBox)typeof(Views.Worklog.WorklogPage).GetField("_content", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(page)!;
        for (int i = 0; i < 3; i++)
        {
            Begin();
            var day = DateTime.Today.AddDays(-i);
            if (day.Month != DateTime.Today.Month) { await Press(win, "‹", exact: true); await Delay(900); }
            await PressItem(win, $"{day:MM.dd}");
            await Delay(900);
            content.Focus();
            content.Text = $"{DateTime.Today.AddDays(-i):MM/dd} 점검 업무: 물건 3건 등록, 고객 상담";
            await Press(win, "저장", exact: true);
            await Delay(900);
            var saved = (await svc.GetAsync(day)).Str("content");
            Check($"{day:MM/dd} 저장", saved == content.Text, saved ?? "(없음)");
            End($"등록 {i + 1}");
        }
        Steps.Add(new Step(_menu, "삭제", true, "업무일지에는 삭제 기능이 없음(같은 날은 덮어쓰기) — 점검 제외"));
    }

    private static async Task ExpiryAsync(Window win)
    {
        var svc = AppServices.Create((sp, s) => new ExpiryService(sp, s));
        Begin();
        await Press(win, "검색", exact: true);
        await Delay(900);
        var expected = (await svc.ListAsync(DateTime.Today, DateTime.Today.AddMonths(3))).Count(r => r.Str("pt_name")?.StartsWith("점검자이") == true);
        var shown = GridRows(PageGrid(win)).Count(r => r.Str("pt_name")?.StartsWith("점검자이") == true);
        Check("만기 목록(물건 등록 3 − 삭제 1)", expected == 2 && shown == 2, $"DB {expected}건 · 화면 {shown}건");
        End("조회");
    }

    private static async Task NeobotAsync(Window win)
    {
        var page = Descendants(win).OfType<Views.Neobot.NeobotPage>().First();
        var query = (TextBox)typeof(Views.Neobot.NeobotPage).GetField("_query", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(page)!;
        foreach (var (q, must, mustNot) in new[] { ("점검자이", "101동 1203호", "101동 1403호"), ("최매수", "최매수", null), ("한월세", null, "한월세") })
        {
            Begin();
            query.Focus();
            query.Text = q;
            await Delay(1500);
            var texts = Descendants(win).OfType<TextBlock>().Where(t => t.IsVisible).Select(t => t.Text).ToList();
            var ok = (must is null || texts.Any(t => t.Contains(must))) && (mustNot is null || !texts.Any(t => t.Contains(mustNot) && t != q));
            Check($"검색 '{q}'", ok, $"{(must is null ? "" : $"'{must}' 보임")}{(mustNot is null ? "" : $" '{mustNot}'(삭제됨) 안 보임")}");
            End($"검색 {q}");
        }
    }

    // ================= 공통 동작 =================

    /// <summary>[등록] → 입력 → [저장] → 저장 안내 확인 → [닫기]</summary>
    private static async Task RegisterAsync(Window win, string addLabel, string saveLabel, string name, Func<Window, Task> fill, string? saveLabelFallback = null)
    {
        Begin();
        var known = _app.Windows.OfType<Window>().Where(w => w.IsVisible).ToHashSet();
        await Press(win, addLabel);
        var w = await Until(() => _app.Windows.OfType<Window>().FirstOrDefault(x => x.IsVisible && !known.Contains(x)), "등록 창");
        await Delay(700);
        await fill(w);
        var save = FindButton(w, saveLabel, exact: true) ?? (saveLabelFallback is null ? null : FindButton(w, saveLabelFallback));
        if (save is null) throw new InvalidOperationException($"[{saveLabel}] 버튼 없음");
        Click(save);
        await Until(() => Events().Any(e => e.Kind is "알림상자" or "오류상자") ? w : null, "저장 결과 안내");
        var saved = Events().Any(e => e.Text.Contains("저장되었습니다"));
        Check("저장", saved, saved ? $"{w.Title}" : string.Join(" / ", Events().Select(e => e.Text)));
        if (FindButton(w, "닫기", exact: true) is { } close) Click(close);
        await Until(() => w.IsVisible ? null : w, "등록 창 닫힘");
        await Delay(700);
        foreach (var t in Events().Where(e => e.Kind == "토스트")) StepNotes.Add("안내: " + t.Text);
        End($"등록 {name}");
    }

    /// <summary>목록에서 행 선택 → 도구줄 [삭제] → 확인 '예' → 건수 확인</summary>
    private static async Task ListDeleteAsync(Window win, Func<Row, bool> pick, Func<Task<int>> count, int expected)
    {
        Begin();
        var grid = PageGrid(win);
        var shown = GridRows(grid).Count;
        var row = GridRows(grid).FirstOrDefault(pick) ?? throw new InvalidOperationException("삭제할 행이 화면 목록에 없음");
        grid.SelectedItems.Clear();
        grid.SelectedItem = row;
        await Press(win, "삭제", exact: true);
        await Delay(1200);
        var asked = Events().Where(e => e.Kind == "확인상자").Select(e => e.Text).ToList();
        Check("삭제 확인 질문", asked.Count > 0, string.Join(" / ", asked.Select(t => Trim(t, 60))));
        var n = await count();
        Check("삭제 후 목록(DB)", n == expected, $"{n}건");
        var now = GridRows(PageGrid(win)).Count;
        Check("삭제 후 화면 목록", now == shown - 1 && !GridRows(PageGrid(win)).Any(pick), $"{shown} → {now}행");
        End("삭제");
    }

    private static async Task PickRegionAsync(params string[] picks)
    {
        var w = await Until(() => _app.Windows.OfType<RegionPicker>().FirstOrDefault(x => x.IsVisible), "지역 선택 창");
        await Delay(300);
        var combos = Descendants(w).OfType<ComboBox>().ToList();
        for (int i = 0; i < picks.Length && i < combos.Count; i++)
        {
            var cb = combos[i];
            var want = picks[i];
            var item = await Until(() => cb.Items.Cast<object>().FirstOrDefault(o => (o.GetType().GetProperty("Label")?.GetValue(o) as string)?.Contains(want) == true), $"지역 항목 '{want}'");
            cb.SelectedItem = item;
            await Delay(300);
        }
        Click(FindButton(w, "선택", exact: true)!);
        await Until(() => w.IsVisible ? null : w, "지역 선택 창 닫힘");
        await Delay(200);
    }

    /// <summary>물건 등록창 소재지 드롭다운(시/도·시/군/구·읍/면/동)을 차례로 고른다</summary>
    private static async Task SelectAddressAsync(Window w, params string[] picks)
    {
        var sel = await Until(() => Descendants(w).OfType<Views.Properties.AddressSelector>().FirstOrDefault(x => x.IsVisible), "소재지 선택");
        var combos = Descendants(sel).OfType<ComboBox>().ToList();
        for (int i = 0; i < picks.Length && i < combos.Count; i++)
        {
            var cb = combos[i];
            var want = picks[i];
            var item = await Until(() => cb.Items.Cast<object>().FirstOrDefault(o => o.ToString()?.Contains(want) == true), $"지역 항목 '{want}'");
            cb.SelectedItem = item;
            await Delay(300);
        }
    }

    /// <summary>물건명 행 단지 드롭다운에서 단지 고르기</summary>
    private static async Task SelectDanjiAsync(Window w, string name)
    {
        var cb = await Until(() => Descendants(w).OfType<ComboBox>().FirstOrDefault(x => x.IsVisible && AutomationProperties.GetAutomationId(x) == "danji_code"
            && x.Items.Cast<object>().Any(o => o is Opt op && op.Label == name)), $"단지 '{name}'");
        cb.SelectedItem = cb.Items.Cast<object>().First(o => o is Opt op && op.Label == name);
        await Delay(400);
    }

    /// <summary>입력칸(AutomationId = DB 컬럼 키)에 값 넣기 — 글자칸·날짜·선택·라디오·체크 목록</summary>
    private static async Task Input(Window w, string key, string value)
    {
        var el = await Until(() => Descendants(w).OfType<FrameworkElement>().FirstOrDefault(e => e.IsVisible && AutomationProperties.GetAutomationId(e) == key), $"입력칸 '{key}'");
        switch (el)
        {
            case TextBox tb:
                tb.Focus();
                tb.Text = value;
                tb.GetBindingExpression(TextBox.TextProperty)?.UpdateSource();
                break;
            case DatePicker dp:
                dp.SelectedDate = DateTime.Parse(value);
                break;
            case ComboBox { IsEditable: true } ecb:
                ecb.Text = value;
                ecb.GetBindingExpression(ComboBox.TextProperty)?.UpdateSource();
                break;
            case ComboBox cb:
                var item = cb.Items.OfType<Opt>().FirstOrDefault(o => o.Value == value || o.Label == value)
                           ?? throw new InvalidOperationException($"'{key}' 선택 항목에 '{value}' 없음");
                cb.SelectedItem = item;
                break;
            case RadioGroup or CsvCheckList:
                var t = Descendants(el).OfType<ToggleButton>().FirstOrDefault(b => LabelOf(b) == value)
                        ?? throw new InvalidOperationException($"'{key}'에 '{value}' 항목 없음");
                t.IsChecked = true;
                break;
            case CheckBox chk:
                chk.IsChecked = value is "Y" or "1" or "true";
                break;
            default:
                throw new InvalidOperationException($"'{key}' 입력칸 종류를 모름: {el.GetType().Name}");
        }
        await Delay(120);
    }

    /// <summary>소유자 카드 표의 첫 빈 칸(key)에 입력</summary>
    private static async Task HolderInput(Views.Properties.HolderCard card, string key, string value)
    {
        var tb = Descendants(card).OfType<TextBox>().FirstOrDefault(t => Equals(t.Tag, key) && t.Text.Length == 0)
            ?? throw new InvalidOperationException($"소유자 표 '{key}' 빈 칸 없음");
        tb.Focus();
        tb.Text = value;
        await Delay(120);
    }

    /// <summary>물건특징·상담내용 카드의 첫 줄에 글자 입력</summary>
    private static async Task LineInput(Views.Properties.MemoLineCard card, string value)
    {
        var box = Descendants(card).OfType<RichTextBox>().FirstOrDefault() ?? throw new InvalidOperationException("입력 줄 없음");
        box.Focus();
        box.Selection.Text = value;
        await Delay(120);
    }

    /// <summary>[전화번호입력] → 전화번호 선택 창에서 name이 들어간 항목</summary>
    private static async Task PickLineContactAsync(Views.Properties.MemoLineCard card, string name)
    {
        var link = Descendants(card).OfType<TextBlock>().First(t => t.Text == "전화번호입력" && t.Cursor == System.Windows.Input.Cursors.Hand);
        _ = link.Dispatcher.BeginInvoke(() => link.RaiseEvent(new System.Windows.Input.MouseButtonEventArgs(System.Windows.Input.Mouse.PrimaryDevice, 0, System.Windows.Input.MouseButton.Left) { RoutedEvent = UIElement.MouseLeftButtonUpEvent }));
        var picker = await Until(() => _app.Windows.OfType<Window>().LastOrDefault(x => x.IsVisible && x.Title == "전화번호 선택"), "전화번호 선택 창");
        var item = Descendants(picker).OfType<Button>().FirstOrDefault(b => Descendants(b).OfType<TextBlock>().Any(t => t.Text.Contains(name)))
            ?? throw new InvalidOperationException($"전화번호 목록에 '{name}' 없음");
        Click(item);
        await Until(() => picker.IsVisible ? null : picker, "전화번호 선택 창 닫힘");
    }

    /// <summary>하위 표(ChildListEditor) 중 이 컬럼이 있는 것</summary>
    private static ChildListEditor EditorOf(Window w, string key) =>
        Descendants(w).OfType<ChildListEditor>().FirstOrDefault(e => e.Grid.Columns.Any(c => ColKey(c) == key))
        ?? throw new InvalidOperationException($"'{key}' 칸이 있는 표 없음");

    private static string? ColKey(DataGridColumn c) =>
        (c switch { DataGridBoundColumn b => b.Binding as Binding, DataGridComboBoxColumn cc => cc.SelectedValueBinding as Binding, _ => null })?.Path.Path.Trim('[', ']');

    /// <summary>표 옆(가장 가까운 상위 요소)의 추가 버튼을 눌러 새 행을 만든다</summary>
    private static async Task<Row> AddChildRow(ChildListEditor editor, string addLabel)
    {
        var count = editor.Items.Count;
        ButtonBase? btn = null;
        for (DependencyObject? p = editor; p is not null && btn is null; p = System.Windows.Media.VisualTreeHelper.GetParent(p))
            btn = Descendants(p).OfType<ButtonBase>().FirstOrDefault(b => LabelOf(b) == addLabel && (b.IsVisible || IsInEditorTab(b, editor)));
        if (btn is null) throw new InvalidOperationException($"[{addLabel}] 버튼 없음");
        Click(btn);
        await Until(() => editor.Items.Count > count ? editor : null, $"[{addLabel}] 새 행");
        return editor.Items.Last();
    }

    private static bool IsInEditorTab(ButtonBase b, ChildListEditor editor) => editor.IsVisible;

    /// <summary>표 셀 편집: 셀로 이동 → 편집 시작 → 글자 입력 → 확정</summary>
    private static async Task Cell(ChildListEditor editor, Row item, string key, string value)
    {
        var grid = editor.Grid;
        var col = grid.Columns.First(c => ColKey(c) == key);
        grid.ScrollIntoView(item, col);
        await Delay(80);
        grid.SelectedItem = item;
        grid.CurrentCell = new DataGridCellInfo(item, col);
        grid.BeginEdit();
        await Delay(120);
        if (col.GetCellContent(item) is TextBox tb) tb.Text = value;
        else throw new InvalidOperationException($"'{key}' 셀 편집칸 없음");
        grid.CommitEdit(DataGridEditingUnit.Cell, true);
        grid.CommitEdit(DataGridEditingUnit.Row, true);
        await Delay(80);
        if (item.Str(key) != value) throw new InvalidOperationException($"'{key}' 셀 값이 반영되지 않음({item.Str(key)})");
    }

    private static DataGrid PageGrid(Window win) =>
        Descendants(win).OfType<DataGrid>().First(g => g.IsVisible && !Descendants(win).OfType<ChildListEditor>().Any(e => e.Grid == g));

    private static List<Row> GridRows(DataGrid g) => g.Items.OfType<Row>().ToList();

    private static async Task SelectSummaryAsync(Views.Properties.PropertyPage page, string name)
    {
        var flags = BindingFlags.Instance | BindingFlags.NonPublic;
        await (Task)typeof(Views.Properties.PropertyPage).GetMethod("ReloadAllAsync", flags)!.Invoke(page, null)!;
        var sums = (List<Row>)typeof(Views.Properties.PropertyPage).GetField("_summaries", flags)!.GetValue(page)!;
        var s = sums.FirstOrDefault(r => r.Str("display_name")?.Contains(name) == true) ?? throw new InvalidOperationException($"물건리스트에 '{name}' 없음");
        await (Task)typeof(Views.Properties.PropertyPage).GetMethod("SelectSummaryAsync", flags)!.Invoke(page, new object[] { s })!;
        await Delay(700);
    }

    private static async Task ContextMenuAsync(DataGrid grid, string header)
    {
        var mi = grid.ContextMenu?.Items.OfType<MenuItem>().FirstOrDefault(m => m.Header?.ToString() == header)
                 ?? throw new InvalidOperationException($"행 메뉴 '{header}' 없음");
        await grid.Dispatcher.BeginInvoke(() => mi.RaiseEvent(new RoutedEventArgs(MenuItem.ClickEvent, mi)));
    }

    private static void RaiseClick(FrameworkElement fe) => fe.Dispatcher.BeginInvoke(() =>
    {
        fe.RaiseEvent(new MouseButtonEventArgs(Mouse.PrimaryDevice, Environment.TickCount, MouseButton.Left) { RoutedEvent = UIElement.MouseLeftButtonDownEvent, Source = fe });
        fe.RaiseEvent(new MouseButtonEventArgs(Mouse.PrimaryDevice, Environment.TickCount, MouseButton.Left) { RoutedEvent = UIElement.MouseLeftButtonUpEvent, Source = fe });
    });

    private static Task<T> WaitWindow<T>(string titlePart) where T : Window =>
        Until(() => _app.Windows.OfType<T>().LastOrDefault(w => w.IsVisible && w.Title.Contains(titlePart)), $"'{titlePart}' 창");

    /// <summary>손가락 커서 항목(세그먼트·날짜 목록 등) 누르기</summary>
    private static async Task PressItem(DependencyObject root, string label)
    {
        var fe = await Until(() => Descendants(root).OfType<FrameworkElement>().FirstOrDefault(e => e.IsVisible && e.Cursor == Cursors.Hand && LabelOf(e).Contains(label)), $"'{label}' 항목");
        RaiseClick(fe);
        await Delay(400);
    }

    private static async Task SelectTab(DependencyObject root, string header)
    {
        var tab = await Until(() => Descendants(root).OfType<TabItem>().FirstOrDefault(t => t.IsVisible && LabelOf(t).Contains(header)), $"'{header}' 탭");
        tab.IsSelected = true;
        await Delay(300);
    }

    private static ButtonBase? FindButton(DependencyObject root, string label, bool exact = false) =>
        Descendants(root).OfType<ButtonBase>().FirstOrDefault(b => b.IsVisible && b.IsEnabled && (exact ? LabelOf(b) == label : LabelOf(b).Contains(label)));

    private static async Task Press(DependencyObject root, string label, bool exact = false)
    {
        var b = await Until(() => FindButton(root, label, exact), $"[{label}] 버튼");
        Click(b);
        await Delay(400);
    }

    /// <summary>실제 누름과 같은 OnClick — 대화상자(ShowDialog)가 떠도 점검이 이어지게 디스패처에 넘긴다</summary>
    private static void Click(ButtonBase b) => b.Dispatcher.BeginInvoke(() => OnClick.Invoke(b, null));

    private static async Task<T> Until<T>(Func<T?> probe, string what, int timeoutMs = 10000) where T : class
    {
        for (int waited = 0; ; waited += 150)
        {
            if (probe() is { } v) return v;
            if (waited >= timeoutMs) throw new TimeoutException($"{what}을(를) 찾지 못함");
            await Delay(150);
        }
    }

    // ================= 기록 =================

    private static int _eventMark;
    private static readonly List<string> StepNotes = new();

    private static void Begin()
    {
        AuditHook.Events.Clear();
        _eventMark = Unhandled.Count;
        StepNotes.Clear();
    }

    private static List<(string Kind, string Text)> Events() => AuditHook.Events.ToList();

    private static void Check(string what, bool ok, string detail)
    {
        StepNotes.Add($"{(ok ? "✔" : "✖")} {what}: {detail}");
        if (!ok) StepNotes.Add("!");
    }

    private static void End(string action)
    {
        var errors = Events().Where(e => e.Kind is "오류상자" or "토스트오류").Select(e => e.Kind + ": " + e.Text)
            .Concat(Unhandled.Skip(_eventMark).Select(u => "예외: " + u)).ToList();
        var ok = !StepNotes.Contains("!") && errors.Count == 0;
        var detail = string.Join(" / ", StepNotes.Where(n => n != "!").Concat(errors));
        Steps.Add(new Step(_menu, action, ok, detail));
        StepNotes.Clear();
    }

    private static void Fail(string action, string detail)
    {
        var notes = string.Join(" / ", StepNotes.Where(n => n != "!"));
        Steps.Add(new Step(_menu, action, false, (notes.Length > 0 ? notes + " / " : "") + detail
            + string.Concat(Events().Where(e => e.Kind is "오류상자" or "토스트오류" or "알림상자").Select(e => $" / {e.Kind}: {Trim(e.Text, 90)}"))));
        StepNotes.Clear();
    }

    private static string Trim(string s, int n) { s = s.Replace("\r", " ").Replace("\n", " ").Trim(); return s.Length > n ? s[..n] + "…" : s; }

    private static void Write()
    {
        var sb = new StringBuilder();
        sb.AppendLine($"# 화면 등록·삭제 점검 ({DateTime.Now:yyyy-MM-dd HH:mm}) — 단계 {Steps.Count}건: 정상 {Steps.Count(s => s.Ok)}, 문제 {Steps.Count(s => !s.Ok)}");
        foreach (var g in Steps.GroupBy(s => s.Menu))
        {
            sb.AppendLine();
            sb.AppendLine($"## {g.Key}");
            foreach (var s in g) sb.AppendLine($"- [{(s.Ok ? "정상" : "문제")}] {s.Action} — {s.Detail}");
        }
        File.WriteAllText(_output, sb.ToString(), new UTF8Encoding(true));
    }

    // ================= 가짜 서버(법정동·단지 견본) =================

    private sealed class FakeServer : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var url = request.RequestUri!.PathAndQuery;
            string data = "[]";
            if (url.Contains("bjd-list?addressType=1"))
                data = """[{"bjdCode":"1100000000","bjdName":"서울특별시","sidoName":"서울특별시"}]""";
            else if (url.Contains("bjd-list?addressType=2"))
                data = """[{"bjdCode":"1168000000","bjdName":"강남구","sigunguName":"강남구"}]""";
            else if (url.Contains("bjd-list?addressType=4"))
                data = """[{"bjdCode":"1168010300","bjdName":"개포동"},{"bjdCode":"1168010600","bjdName":"대치동"}]""";
            else if (url.Contains("danji-list"))
                data = """[{"naverDanjiCode":"90001","buildingName":"점검자이","addressBunji":"1234","familyCnt":500,"approveDate":"20190301"}]""";
            var res = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"success\":true,\"data\":" + data + "}", Encoding.UTF8, "application/json"),
            };
            return Task.FromResult(res);
        }
    }
}
#endif

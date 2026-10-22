using System.Text.Json;
using System.Text.RegularExpressions;
using Neosys.Local.Core.Server;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>
/// 커뮤니티(서버 게시판) 화면 규칙 — 기존 CommunityBoard.jsx.
///  탭: 공지사항 · 이벤트 · 구직 게시판 · 구인 게시판 · 사무소 매수/매도(화면 표기 '사무소 양도').
///  공지 = /api/system/notices, 이벤트 = /api/admin/events(공개분), 구인·구직 = /api/community/job, 사무소 = /api/community.
/// </summary>
public static class CommunityRules
{
    public const string Notice = "공지사항", Event = "이벤트", JobSeek = "구직 게시판", JobOffer = "구인 게시판", Office = "사무소 매수/매도";
    public static readonly IReadOnlyList<string> Tabs = new[] { Notice, Event, JobSeek, JobOffer, Office };

    /// <summary>저장값은 유지하고 화면 표기만 바꾼다(기존 게시글 호환)</summary>
    public static string TabLabel(string tab) => tab == Office ? "사무소 양도" : tab;

    public static string? JobKind(string tab) => tab switch { JobOffer => "구인", JobSeek => "구직", _ => null };

    /// <summary>게시판 정형 항목(fields — JSON 문자열 또는 객체) → 키/값</summary>
    public static Dictionary<string, string> Fields(Row post)
    {
        var d = new Dictionary<string, string>();
        var raw = post["fields"];
        if (raw is Row r) { foreach (var kv in r) d[kv.Key] = kv.Value?.ToString() ?? ""; return d; }
        if (raw is not string s || string.IsNullOrWhiteSpace(s)) return d;
        try
        {
            using var doc = JsonDocument.Parse(s);
            if (doc.RootElement.ValueKind == JsonValueKind.Object)
                foreach (var p in doc.RootElement.EnumerateObject())
                    d[p.Name] = p.Value.ValueKind == JsonValueKind.String ? p.Value.GetString() ?? "" : p.Value.ToString();
        }
        catch (JsonException) { /* 형식 오류는 빈 값 */ }
        return d;
    }

    /// <summary>게시판 공통 모양: postId · title · author · regDt · viewCnt · content (공지·이벤트는 다른 키를 맞춘다 — 기존 mapNotice/mapEvent)</summary>
    public static Row Normalize(string tab, Row src)
    {
        if (tab == Notice)
            return new Row
            {
                ["postId"] = src.Long("noticeId"), ["title"] = src.Str("title"), ["author"] = src.Str("regId") ?? "관리자",
                ["regDt"] = src.Str("regDt"), ["viewCnt"] = src.Long("viewCount") ?? src.Long("viewCnt") ?? 0, ["content"] = src.Str("content"), ["isTop"] = src.Str("isTop"),
            };
        if (tab == Event)
            return new Row
            {
                ["postId"] = src.Long("eventId"), ["title"] = src.Str("title"), ["author"] = "관리자",
                ["regDt"] = src.Str("regDt"), ["viewCnt"] = src.Long("viewCount") ?? 0, ["content"] = src.Str("content"), ["linkUrl"] = src.Str("linkUrl"),
            };
        return src;
    }

    /// <summary>목록 검색(공지·이벤트는 서버에 검색어가 없어 화면에서 거른다 — 기존과 같음)</summary>
    public static List<Row> Filter(string tab, IEnumerable<Row> rows, string? q)
    {
        var k = (q ?? "").Trim();
        if (k.Length == 0) return rows.ToList();
        return rows.Where(r => (tab == Notice ? $"{r.Str("title")} {r.Str("author")}" : r.Str("title") ?? "").Contains(k, StringComparison.OrdinalIgnoreCase)).ToList();
    }

    public static string Date(string? v) => v is { Length: >= 10 } ? v[..10].Replace('-', '.') : "-";

    public sealed record Col(string Header, double Width, bool Center, Func<Row, string> Value);

    /// <summary>탭별 목록 칸(기존 listCols) — 번호 칸은 화면에서 붙인다. Width 0 = 나머지 폭</summary>
    public static IReadOnlyList<Col> Columns(string tab)
    {
        string F(Row p, string k) => Fields(p).TryGetValue(k, out var v) && v.Length > 0 ? v : "-";
        return JobKind(tab) switch
        {
            "구인" => new Col[]
            {
                new("사무소", 0, false, p => F(p, "사무소명칭")), new("모집구분", 120, true, p => F(p, "모집대상")),
                new("모집인원", 90, true, p => F(p, "모집인원")), new("성별", 90, true, p => F(p, "성별")),
                new("마감일", 110, true, p => Date(Fields(p).GetValueOrDefault("마감일") is { Length: > 0 } m ? m : p.Str("regDt"))),
            },
            "구직" => new Col[]
            {
                new("성명", 110, true, p => p.Str("author") ?? "-"), new("제목", 0, false, p => p.Str("title") ?? ""),
                new("성별", 90, true, p => F(p, "성별")), new("경력", 120, true, p => F(p, "경력사항")), new("학력", 120, true, p => F(p, "최종학력")),
            },
            _ when tab == Office => new Col[]
            {
                new("지역", 150, false, p => F(p, "소재지")), new("제목", 0, false, p => p.Str("title") ?? ""),
                new("글쓴이", 110, true, p => p.Str("author") ?? "익명"),
                new("등록일", 110, true, p => Date(Fields(p).GetValueOrDefault("등록일") is { Length: > 0 } d ? d : p.Str("regDt"))),
                new("조회", 64, true, p => (p.Long("viewCnt") ?? 0).ToString()),
            },
            _ => new Col[]
            {
                new("제목", 0, false, p => p.Str("title") ?? ""), new("작성자", 110, true, p => p.Str("author") ?? "익명"),
                new("작성일", 110, true, p => Date(p.Str("regDt"))), new("조회", 64, true, p => (p.Long("viewCnt") ?? 0).ToString()),
            },
        };
    }

    /// <summary>상세 정형 항목 배치(기존 JOB_SCHEMA·OFFICE_SCHEMA): Rows = 한 줄(1~2칸), Areas = 여러 줄 전폭</summary>
    public sealed record Schema(IReadOnlyList<string[]> Rows, IReadOnlyList<string> Areas, IReadOnlyList<string[]> Poster);

    public static Schema? DetailSchema(string tab) => JobKind(tab) switch
    {
        "구인" => new Schema(new[]
        {
            new[] { "제목" }, new[] { "대표자명", "사무소명칭" }, new[] { "급여수준", "사무소주소" }, new[] { "마감일", "근무지" },
            new[] { "모집대상", "모집인원" }, new[] { "성별", "학력" }, new[] { "전화번호", "팩스번호" }, new[] { "전자우편", "회사URL" },
        }, new[] { "제출서류", "사무소소개 및 업무내용" }, Array.Empty<string[]>()),
        // 구직은 비밀번호를 보여 주지 않는다
        "구직" => new Schema(new[]
        {
            new[] { "제목" }, new[] { "성명" }, new[] { "희망근무지", "성별" }, new[] { "경력사항", "희망부서" },
            new[] { "최종학력", "희망급여" }, new[] { "전화번호", "핸드폰" }, new[] { "전자우편", "개인URL" },
        }, new[] { "이력서", "자기소개" }, Array.Empty<string[]>()),
        _ when tab == Office => new Schema(new[]
        {
            new[] { "제목" }, new[] { "등록일" }, new[] { "소재지" }, new[] { "나머지주소" }, new[] { "전용면적(㎡)", "계약면적(㎡)" },
            new[] { "중개대상물 종류" }, new[] { "해당층", "총층" }, new[] { "거래 구분", "가격(만원)" }, new[] { "준공인가일" },
            new[] { "방향", "방향기준" }, new[] { "주차대수" },
        }, new[] { "세부사항" }, new[] { new[] { "성 명:성명", "연락처" }, new[] { "상호명" } }),
        _ => null,
    };

    // ---------------- 글쓰기·삭제(기존 composeJob·composeOffice·submit*·remove) ----------------

    /// <summary>글쓰기 형태: "job"(구인·구직 정형) · "office"(사무소 양도 정형) · "html"(리치 에디터) · null(공지·이벤트 — 쓰기 없음)</summary>
    public static string? ComposeKind(string tab) =>
        tab is Notice or Event ? null : JobKind(tab) is not null ? "job" : tab == Office ? "office" : "html";

    /// <summary>입력 배치(기존 JOB_SCHEMA·OFFICE_SCHEMA) — 상세와 같고 구직만 [성명, 비밀번호] 줄이 있다. 게시자 정보는 읽기 전용(자동 기입)</summary>
    public static Schema? ComposeSchema(string tab)
    {
        var s = DetailSchema(tab);
        if (s is null || JobKind(tab) != "구직") return s;
        return s with { Rows = s.Rows.Select(r => r is ["성명"] ? new[] { "성명", "비밀번호" } : r).ToList() };
    }

    /// <summary>필수 항목(라벨에 빨간 * + 저장 전 검사 — 기존 JOB_REQUIRED·OFFICE_REQUIRED)</summary>
    public static IReadOnlyList<string> Required(string tab) => JobKind(tab) switch
    {
        "구인" => new[] { "제목", "대표자명", "전화번호" },
        "구직" => new[] { "제목", "성명", "전화번호" },
        _ when tab == Office => new[] { "제목", "소재지", "거래 구분", "가격(만원)" },
        _ => new[] { "제목" },
    };

    /// <summary>달력 입력 항목(기존 DATE_KEYS) · 주소 검색 버튼 항목(기존 ADDR_FIELD_KEYS) · 성별 선택지(기존 GENDER_OPTS)</summary>
    public static readonly IReadOnlyList<string> DateKeys = new[] { "등록일", "준공인가일", "마감일" };
    public static readonly IReadOnlyList<string> AddressKeys = new[] { "소재지", "사무소주소" };
    public static readonly IReadOnlyList<string> Genders = new[] { "남자", "여자" };
    public const string RegionKey = "희망근무지", GenderKey = "성별", PasswordKey = "비밀번호";

    /// <summary>비어 있는 첫 필수 항목 안내 문구(기존 checkRequired). 모두 있으면 null</summary>
    public static string? Validate(string tab, IReadOnlyDictionary<string, string> f)
    {
        foreach (var k in Required(tab))
            if (string.IsNullOrWhiteSpace(f.GetValueOrDefault(k))) return $"{k} 항목을 입력해주세요.";
        return null;
    }

    /// <summary>성별 체크(복수 선택) — "남자,여자" 문자열에서 g를 넣거나 뺀다. 순서는 선택 순(기존 toggle)</summary>
    public static string ToggleGender(string? value, string g)
    {
        var sel = (value ?? "").Split(',').Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
        if (!sel.Remove(g)) sel.Add(g);
        return string.Join(",", sel);
    }

    /// <summary>사무소 양도 새 글 기본값 — 등록일 = 오늘(로컬), 게시자 정보(성명·상호명·연락처)는 로그인 사용자·사무소에서 자동 기입(기존 composeStart)</summary>
    public static Dictionary<string, string> OfficeDefaults(AppSession s, Row? office)
    {
        static string First(params string?[] v) => v.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x))?.Trim() ?? "";
        return new()
        {
            ["등록일"] = LocalDate.Today,
            ["성명"] = First(s.RtNm),
            ["상호명"] = First(office?.Str("offNm"), office?.Str("officeName"), s.OffNm),
            ["연락처"] = First(office?.Str("offTel"), office?.Str("rpsPhone"), office?.Str("offPhone")),
        };
    }

    private static readonly JsonSerializerOptions FieldsJson = new() { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    /// <summary>
    /// 등록 요청 만들기(기존 submitJob·submitOffice·submitGeneric). 빈 항목은 뺀다.
    ///  구인·구직: kind + 제목 + 작성자(대표자명|성명, 없으면 로그인 이름) + fields 전체 + 비밀번호(구직)
    ///  사무소 양도: 내용 = 세부사항(글자 그대로), fields 전체
    ///  리치 에디터: title·author 칸 + 내용 HTML
    /// </summary>
    public static CommunityPost BuildPost(string tab, IReadOnlyDictionary<string, string> f, AppSession s, string? html = null)
    {
        string V(string k) => (f.GetValueOrDefault(k) ?? "").Trim();
        string Author(string k) => V(k) is { Length: > 0 } a ? a : s.RtNm is { Length: > 0 } n ? n : s.UserId is { Length: > 0 } u ? u : "익명";
        var fields = f.Where(kv => !string.IsNullOrWhiteSpace(kv.Value)).ToDictionary(kv => kv.Key, kv => kv.Value);
        long? rt = s.RtNo == 0 ? null : s.RtNo;
        string? regId = s.UserId is { Length: > 0 } id ? id : null;
        return ComposeKind(tab) switch
        {
            "job" => new CommunityPost(JobKind(tab)!, V("제목"), Author(JobKind(tab) == "구인" ? "대표자명" : "성명"), null,
                JsonSerializer.Serialize(fields, FieldsJson), V(PasswordKey) is { Length: > 0 } pw ? pw : null, s.OffNo, rt, regId),
            "office" => new CommunityPost(tab, V("제목"), Author("성명"), V("세부사항"), JsonSerializer.Serialize(fields, FieldsJson), null, s.OffNo, rt, regId),
            _ => new CommunityPost(tab, V("제목"), Author("author"), html ?? "", null, null, s.OffNo, rt, regId),
        };
    }

    /// <summary>
    /// 삭제 가능 여부 — 공지·이벤트는 없음. 게시판 글은 내가 쓴 글(regId = 로그인 ID)만.
    /// (기존 화면은 누구나 모든 글에 ✕가 보였다 — 서버 게시판이라 남의 글을 지울 수 없게 막는다)
    /// </summary>
    public static bool CanDelete(string tab, Row post, string? userId) =>
        ComposeKind(tab) is not null && !string.IsNullOrEmpty(userId)
        && string.Equals(post.Str("regId"), userId, StringComparison.OrdinalIgnoreCase);

    // ---------------- 리치 에디터 도구(기존 SPECIAL_CHARS·COLORS·todayText) ----------------

    public static readonly IReadOnlyList<string> SpecialChars = new[] { "★", "●", "■", "▶", "✓", "※", "→" };
    public static readonly IReadOnlyList<(string Name, string Hex)> Colors = new[] { ("빨강", "#dc2626"), ("파랑", "#2563eb"), ("초록", "#16a34a"), ("주황", "#ea580c"), ("검정", "#111827") };

    /// <summary>[날짜] 버튼 글자 — "26.10.21 "(로컬 날짜)</summary>
    public static string DateStamp(DateTime d) => d.ToString("yy.MM.dd ", System.Globalization.CultureInfo.InvariantCulture);

    /// <summary>편집기를 못 띄웠을 때(글자 입력) 내용 → HTML(특수문자 이스케이프 + 줄바꿈 &lt;br&gt;)</summary>
    public static string TextToHtml(string text) =>
        System.Net.WebUtility.HtmlEncode(text.Replace("\r\n", "\n")).Replace("\n", "<br>");
}

/// <summary>대시보드 이벤트 확정 알림 — 기존 DashboardPage eventWins(대표만, 로그인 후 1회, 띄우면 바로 확인 처리)</summary>
public static class EventWinRules
{
    public sealed record Item(long? EntryId, string Title);

    public static bool ShouldCheck(AppSession s) => s.IsOwner && (s.UserId.Length > 0 || s.OffNo is not null);

    public static List<Item> Build(IEnumerable<Row> rows) =>
        rows.Select(r => new Item(r.Long("entryId"), r.Str("eventTitle") is { Length: > 0 } t ? t : "이벤트")).ToList();

    /// <summary>확인 처리할 참여 번호(번호 없는 건 뺀다)</summary>
    public static List<long> EntryIds(IEnumerable<Item> items) => items.Where(i => i.EntryId is > 0).Select(i => i.EntryId!.Value).ToList();
}

/// <summary>대시보드 공지/이벤트 롤링 배너 — 기존 rollingItems(공지 먼저, 이벤트 다음, 5초마다 다음)</summary>
public static class RollingRules
{
    public sealed record Item(string Kind, string Title, string? Date, long? Id);

    public static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);

    /// <summary>공지(대시보드 표기 'N' 제외) + 이벤트(대시보드 표시분)</summary>
    public static List<Item> Build(IEnumerable<Row> notices, IEnumerable<Row> events) =>
        notices.Where(n => (n.Str("showOnDashboard") ?? "Y") != "N")
            .Select(n => new Item(CommunityRules.Notice, n.Str("title") ?? "", n.Str("regDt"), n.Long("noticeId")))
            .Concat(events.Select(e => new Item(CommunityRules.Event, e.Str("title") ?? "", e.Str("regDt"), e.Long("eventId"))))
            .ToList();

    /// <summary>'N' 배지 — 공지사항이고 일주일 이내(기존 isNewNotice: 올림한 일수 ≤ 7)</summary>
    public static bool IsNew(Item it, DateTime now) =>
        it.Kind == CommunityRules.Notice && DateTime.TryParse(it.Date, out var d) && Math.Ceiling((now - d).TotalDays) <= 7;

    /// <summary>날짜 표기(기존 toLocaleDateString ko-KR month long, day numeric → "10월 21일")</summary>
    public static string DateText(string? v) => DateTime.TryParse(v, out var d) ? $"{d.Month}월 {d.Day}일" : "-";
}

/// <summary>
/// 로그인 후 공지·이벤트 팝업 — 기존 NoticePopup.jsx. isPopup='Y' + 게시기간(startDate~endDate) 안 + 숨김 기록 없음.
/// 숨김 기록: [오늘 보지 않음] = 오늘 날짜, [다시 보지 않음] = forever. 게시가 끝났거나 '오늘'이 지난 기록은 자동 정리.
/// 크기: DB popupW/H → 내용 앞 &lt;!--popup:가로x세로--&gt; 표시 → 기본(공지 460×620, 이벤트 480×600).
/// </summary>
public static class NoticePopupRules
{
    public sealed record Dismiss(string Until, string? EndDate);
    public sealed record Item(string Id, string Title, string Html, string? EndDate, int Width, int Height);

    private static readonly Regex SizeMark = new(@"<!--\s*popup:\s*(\d+)\s*[x×]\s*(\d+)\s*-->", RegexOptions.IgnoreCase);
    private static readonly Regex AnyMark = new(@"<!--\s*popup:.*?-->", RegexOptions.IgnoreCase);

    private static string? DateOnly(string? v) => v is { Length: >= 10 } ? v[..10] : null;
    private static bool Truthy(object? v) => v is true || v is "Y" or "y" or "true" or "1" || v is 1L;

    /// <summary>끝난 기록 정리. 바뀌었으면 true</summary>
    public static bool Clean(Dictionary<string, Dismiss> store, string today)
    {
        var expired = store.Where(kv => (kv.Value.EndDate is { } e && string.CompareOrdinal(DateOnly(e), today) < 0)
                                        || (kv.Value.Until != "forever" && string.CompareOrdinal(kv.Value.Until, today) < 0)).Select(kv => kv.Key).ToList();
        foreach (var k in expired) store.Remove(k);
        return expired.Count > 0;
    }

    private static bool Hidden(Dictionary<string, Dismiss> store, string id, string today) =>
        store.TryGetValue(id, out var d) && (d.Until == "forever" || string.CompareOrdinal(d.Until, today) >= 0);

    private static bool InPeriod(Row r, string today)
    {
        var s = DateOnly(r.Str("startDate"));
        var e = DateOnly(r.Str("endDate"));
        return !(s is not null && string.CompareOrdinal(s, today) > 0) && !(e is not null && string.CompareOrdinal(e, today) < 0);
    }

    /// <summary>띄울 팝업 — 공지 먼저, 이벤트 다음(이벤트 id는 'ev_' 접두)</summary>
    public static List<Item> Select(IEnumerable<Row> notices, IEnumerable<Row> events, string today, Dictionary<string, Dismiss> store)
    {
        var list = new List<Item>();
        foreach (var n in notices)
        {
            if (!Truthy(n["isPopup"]) || !InPeriod(n, today)) continue;
            var id = (n.Long("noticeId") ?? 0).ToString();
            if (Hidden(store, id, today)) continue;
            var raw = n.Str("content") ?? "";
            var m = SizeMark.Match(raw);
            list.Add(new Item(id, n.Str("title") ?? "공지사항", AnyMark.Replace(raw, "", 1), DateOnly(n.Str("endDate")),
                (int)(n.Long("popupW") ?? (m.Success ? long.Parse(m.Groups[1].Value) : 460)),
                (int)(n.Long("popupH") ?? (m.Success ? long.Parse(m.Groups[2].Value) : 620))));
        }
        foreach (var e in events)
        {
            if (!InPeriod(e, today)) continue;
            var id = $"ev_{e.Long("eventId")}";
            if (Hidden(store, id, today)) continue;
            list.Add(new Item(id, e.Str("title") ?? "이벤트", e.Str("content") ?? "", DateOnly(e.Str("endDate")),
                (int)(e.Long("popupW") ?? 480), (int)(e.Long("popupH") ?? 600)));
        }
        return list;
    }

    // ---------------- 숨김 기록 저장(%LOCALAPPDATA%\Neosys\notice_popup.json — 기존 localStorage noticePopupDismiss_v1) ----------------

    public static string StorePath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "notice_popup.json");

    public static Dictionary<string, Dismiss> Load(string? path = null)
    {
        try
        {
            var p = path ?? StorePath;
            return File.Exists(p) ? JsonSerializer.Deserialize<Dictionary<string, Dismiss>>(File.ReadAllText(p)) ?? new() : new();
        }
        catch { return new(); }
    }

    public static void Save(Dictionary<string, Dismiss> store, string? path = null)
    {
        try
        {
            var p = path ?? StorePath;
            Directory.CreateDirectory(Path.GetDirectoryName(p)!);
            File.WriteAllText(p, JsonSerializer.Serialize(store));
        }
        catch { /* 기록 실패는 무시(다음에 다시 뜰 뿐) */ }
    }

    /// <summary>숨김 기록 추가 — mode: "today" | "forever"</summary>
    public static void Remember(Dictionary<string, Dismiss> store, Item it, string mode, string today) =>
        store[it.Id] = new Dismiss(mode == "forever" ? "forever" : today, it.EndDate);
}

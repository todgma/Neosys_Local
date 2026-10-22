using System.Net;
using System.Text;
using System.Text.Json;
using Neosys.Local.Core.Server;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>공지·이벤트·커뮤니티·롤링·로그인 팝업 — 화면 규칙과 서버 요청 모양(가짜 HTTP, 운영 서버 호출 없음)</summary>
public class CommunityTests
{
    private sealed class Fake(Func<HttpRequestMessage, string> respond) : HttpMessageHandler
    {
        public List<(HttpMethod Method, string Url, string? Body)> Calls { get; } = new();
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            string? body = null;
            if (request.Content is ByteArrayContent && request.Content is not StringContent && request.Content.Headers.ContentType?.MediaType?.StartsWith("image/") == true)
                body = $"bytes:{(await request.Content.ReadAsByteArrayAsync(ct)).Length}";
            else if (request.Content is not null) body = await request.Content.ReadAsStringAsync(ct);
            Calls.Add((request.Method, request.RequestUri!.AbsoluteUri, body));
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(respond(request), Encoding.UTF8, "application/json") };
        }
    }

    [Fact]
    public async Task 공지_이벤트_게시판_조회_요청()
    {
        var fake = new Fake(r =>
        {
            var u = Uri.UnescapeDataString(r.RequestUri!.ToString());
            if (u.Contains("/api/system/notices?")) return "{\"success\":true,\"data\":{\"notices\":[{\"noticeId\":3,\"title\":\"점검 안내\",\"regDt\":\"2026-10-20T09:00:00\",\"viewCount\":12,\"regId\":\"admin\"}]}}";
            if (u.Contains("/api/system/notices/3")) return "{\"success\":true,\"data\":{\"noticeId\":3,\"title\":\"점검 안내\",\"content\":\"<p>내용</p>\",\"viewCount\":13}}";
            if (u.Contains("/api/admin/events?")) return "{\"success\":true,\"data\":{\"events\":[{\"eventId\":7,\"title\":\"가을 이벤트\",\"regDt\":\"2026-10-01\"}]}}";
            if (u.Contains("/api/community/job/list")) return "{\"success\":true,\"data\":{\"items\":[{\"postId\":11,\"kind\":\"구인\",\"title\":\"직원 구함\",\"fields\":\"{\\\"사무소명칭\\\":\\\"강남부동산\\\",\\\"모집인원\\\":\\\"2명\\\"}\"}]}}";
            if (u.Contains("/api/community/list")) return "{\"success\":true,\"data\":{\"items\":[]}}";
            return "{\"success\":true,\"data\":null}";
        });
        var api = new ServerApi("http://test.local", fake);

        var notices = await api.GetNoticeListAsync(200);
        Assert.Equal("점검 안내", notices.Single().Str("title"));
        Assert.EndsWith("/api/system/notices?pageNumber=1&rowsPerPage=200", fake.Calls[0].Url);
        var detail = await api.GetNoticeDetailAsync(3, "tester");
        Assert.Equal("<p>내용</p>", detail!.Str("content"));
        Assert.EndsWith("/api/system/notices/3?viewerId=tester", fake.Calls[1].Url);

        await api.GetEventListAsync(isPublic: true, isPopup: true, rows: 50);
        Assert.EndsWith("/api/admin/events?rowsPerPage=50&isPublic=Y&isPopup=Y", fake.Calls[2].Url);
        await api.GetEventListAsync(isPublic: true, isParticipatory: true, rows: 100);
        Assert.EndsWith("&isPublic=Y&isParticipatory=Y", fake.Calls[3].Url);

        var jobs = await api.GetJobListAsync("구인", " 강남 ");
        Assert.Equal("강남부동산", CommunityRules.Fields(jobs.Single())["사무소명칭"]);
        Assert.Contains("kind=%EA%B5%AC%EC%9D%B8&q=%EA%B0%95%EB%82%A8", fake.Calls[4].Url);   // 구인 · 강남(공백 제거)

        Assert.Empty(await api.GetCommunityListAsync(CommunityRules.Office, null));            // 0건 = 빈 목록
        Assert.Contains("tab=%EC%82%AC%EB%AC%B4%EC%86%8C%20%EB%A7%A4%EC%88%98%2F%EB%A7%A4%EB%8F%84", fake.Calls[5].Url);
    }

    [Fact]
    public async Task 이벤트_참여_제출_요청()
    {
        var fake = new Fake(r => r.RequestUri!.AbsolutePath.EndsWith("/presign")
            ? "{\"success\":true,\"data\":{\"objectKey\":\"ev/1.png\",\"uploadUrl\":\"https://storage.test/put\"}}"
            : r.RequestUri.Host == "storage.test" ? "" : "{\"success\":true,\"data\":{\"entryId\":1}}");
        var api = new ServerApi("http://test.local", fake);
        var meta = await api.UploadToStorageAsync("SYFDV08", "후기.PNG", new byte[300], "image/png", 5 * 1024 * 1024);
        Assert.Equal("ev/1.png", meta.Str("objectKey"));
        Assert.Equal("png", meta.Str("ext"));
        Assert.Equal("https://storage.test/put", fake.Calls[1].Url);
        await Assert.ThrowsAsync<ServerApiException>(() => api.UploadToStorageAsync("SYFDV08", "big.png", new byte[5 * 1024 * 1024 + 1], "image/png", 5 * 1024 * 1024));

        await api.SubmitEventEntryAsync(7, 100000010, 300000016, "tester", "테스터", null, new[] { meta });
        var (m, url, body) = fake.Calls.Last();
        Assert.Equal(HttpMethod.Post, m);
        Assert.EndsWith("/api/events/entries", url);
        var j = JsonDocument.Parse(body!).RootElement;
        // 본문은 camelCase(서버 모델 바인딩은 대소문자 무시)
        static JsonElement P(JsonElement o, string n) => o.EnumerateObject().First(p => string.Equals(p.Name, n, StringComparison.OrdinalIgnoreCase)).Value;
        Assert.Equal(7, P(j, "EventId").GetInt64());
        Assert.Equal("ev/1.png", P(P(j, "Files")[0], "ObjectKey").GetString());
        Assert.Equal(JsonValueKind.Null, P(j, "Content").ValueKind);
    }

    private static JsonElement P(JsonElement o, string n) => o.EnumerateObject().First(p => string.Equals(p.Name, n, StringComparison.OrdinalIgnoreCase)).Value;

    [Fact]
    public async Task 글쓰기_삭제_요청()
    {
        var fake = new Fake(r => r.Method == HttpMethod.Delete
            ? "{\"success\":true,\"data\":{\"deleted\":true}}"
            : r.RequestUri!.AbsolutePath.EndsWith("/api/community") && r.Content!.ReadAsStringAsync().Result.Contains("\"title\":\"\"")
                ? "{\"success\":true,\"data\":null,\"message\":\"필수값(탭/제목) 누락\"}"
                : "{\"success\":true,\"data\":{\"postId\":51}}");
        var api = new ServerApi("http://test.local", fake);
        var s = new Core.AppSession { RtNo = 300000016, OffNo = 100000010, UserId = "tester", RtNm = "홍길동", RtType = "RTTYP01", OffNm = "강남부동산" };

        // 구직: kind·작성자(성명)·비밀번호·fields(JSON 문자열, 빈 항목 제외, 한글 그대로)
        var f = new Dictionary<string, string> { ["제목"] = " 경력 3년 ", ["성명"] = "", ["비밀번호"] = "1234", ["성별"] = "여자", ["전화번호"] = "010", ["자기소개"] = "" };
        var post = CommunityRules.BuildPost(CommunityRules.JobSeek, f, s);
        Assert.Equal(("구직", "경력 3년", "홍길동", "1234"), (post.Tab, post.Title, post.Author, post.Pwd));   // 성명이 비면 로그인 이름
        Assert.Equal(51, await api.CreateJobPostAsync(post));
        var (m, url, body) = fake.Calls[0];
        Assert.Equal(HttpMethod.Post, m);
        Assert.EndsWith("/api/community/job", url);
        var j = JsonDocument.Parse(body!).RootElement;
        Assert.Equal("구직", P(j, "Kind").GetString());
        Assert.Equal("300000016", P(j, "RtNo").GetString());           // 서버 DTO가 문자열
        Assert.Equal(100000010, P(j, "OffNo").GetInt64());
        var fields = P(j, "Fields").GetString()!;
        Assert.Contains("\"성별\":\"여자\"", fields);
        Assert.DoesNotContain("자기소개", fields);

        // 사무소 양도: /api/community, 내용 = 세부사항
        var of = CommunityRules.OfficeDefaults(s, new Row { ["OffNm"] = "서초부동산", ["OffTel"] = "", ["RpsPhone"] = "010-1111-2222" });
        Assert.Equal((Core.LocalDate.Today, "홍길동", "서초부동산", "010-1111-2222"), (of["등록일"], of["성명"], of["상호명"], of["연락처"]));  // 빈 값은 다음 후보
        of["제목"] = "역세권 사무소 양도";
        of["세부사항"] = "권리금 협의";
        var op = CommunityRules.BuildPost(CommunityRules.Office, of, s);
        await api.CreateCommunityPostAsync(op);
        j = JsonDocument.Parse(fake.Calls[1].Body!).RootElement;
        Assert.EndsWith("/api/community", fake.Calls[1].Url);
        Assert.Equal(("사무소 매수/매도", "권리금 협의", "홍길동"), (P(j, "Tab").GetString(), P(j, "Content").GetString(), P(j, "Author").GetString()));
        Assert.Contains("\"상호명\":\"서초부동산\"", P(j, "Fields").GetString());

        // 서버가 postId 없이 답하면(필수값 누락) 실패로 본다
        var bad = await Assert.ThrowsAsync<ServerApiException>(() => api.CreateCommunityPostAsync(op with { Title = "" }));
        Assert.Contains("누락", bad.Message);

        Assert.True(await api.DeleteJobPostAsync(11));
        Assert.True(await api.DeleteCommunityPostAsync(12));
        Assert.Equal((HttpMethod.Delete, "http://test.local/api/community/job/11"), (fake.Calls[^2].Method, fake.Calls[^2].Url));
        Assert.Equal("http://test.local/api/community/12", fake.Calls[^1].Url);
    }

    [Fact]
    public void 글쓰기_규칙()
    {
        Assert.Null(CommunityRules.ComposeKind(CommunityRules.Notice));
        Assert.Null(CommunityRules.ComposeKind(CommunityRules.Event));
        Assert.Equal("job", CommunityRules.ComposeKind(CommunityRules.JobOffer));
        Assert.Equal("office", CommunityRules.ComposeKind(CommunityRules.Office));
        Assert.Equal("html", CommunityRules.ComposeKind("자유게시판"));

        // 구직 입력에는 비밀번호 칸이 있고(상세에는 없음), 구인에는 없다
        Assert.Contains(CommunityRules.ComposeSchema(CommunityRules.JobSeek)!.Rows, r => r.SequenceEqual(new[] { "성명", "비밀번호" }));
        Assert.DoesNotContain(CommunityRules.ComposeSchema(CommunityRules.JobOffer)!.Rows.SelectMany(r => r), k => k == "비밀번호");

        var f = new Dictionary<string, string> { ["제목"] = "직원 구함", ["대표자명"] = "  " };
        Assert.Equal("대표자명 항목을 입력해주세요.", CommunityRules.Validate(CommunityRules.JobOffer, f));
        f["대표자명"] = "김대표";
        Assert.Equal("전화번호 항목을 입력해주세요.", CommunityRules.Validate(CommunityRules.JobOffer, f));
        f["전화번호"] = "02-000";
        Assert.Null(CommunityRules.Validate(CommunityRules.JobOffer, f));
        Assert.Equal("소재지 항목을 입력해주세요.", CommunityRules.Validate(CommunityRules.Office, new Dictionary<string, string> { ["제목"] = "양도" }));

        Assert.Equal("남자", CommunityRules.ToggleGender("", "남자"));
        Assert.Equal("남자,여자", CommunityRules.ToggleGender("남자", "여자"));
        Assert.Equal("여자", CommunityRules.ToggleGender("남자, 여자", "남자"));

        // 삭제: 게시판 글 중 내 글만
        var mine = new Row { ["postId"] = 1L, ["regId"] = "Tester" };
        Assert.True(CommunityRules.CanDelete(CommunityRules.Office, mine, "tester"));
        Assert.False(CommunityRules.CanDelete(CommunityRules.Office, new Row { ["regId"] = "other" }, "tester"));
        Assert.False(CommunityRules.CanDelete(CommunityRules.Office, new Row(), "tester"));
        Assert.False(CommunityRules.CanDelete(CommunityRules.Notice, mine, "tester"));

        // 리치 에디터: 글자 입력 대체 시 HTML, 날짜 도장, 작성자 없으면 로그인 이름
        Assert.Equal("a &lt;b&gt;<br>c", CommunityRules.TextToHtml("a <b>\r\nc"));
        Assert.Equal("26.10.21 ", CommunityRules.DateStamp(new DateTime(2026, 10, 21)));
        var html = CommunityRules.BuildPost("자유게시판", new Dictionary<string, string> { ["제목"] = "안녕", ["author"] = "" }, new Core.AppSession { UserId = "u1" }, "<b>x</b>");
        Assert.Equal(("u1", "<b>x</b>", null, null), (html.Author, html.Content, html.Fields, html.RtNo));
    }

    [Fact]
    public async Task 이벤트_확정_알림()
    {
        var fake = new Fake(r => r.RequestUri!.AbsolutePath.EndsWith("/confirmed-unseen")
            ? "{\"success\":true,\"data\":{\"items\":[{\"EntryId\":5,\"EventTitle\":\"리뷰 이벤트\"},{\"EntryId\":6,\"EventTitle\":null}]}}"
            : "{\"success\":true,\"data\":{\"marked\":2}}");
        var api = new ServerApi("http://test.local", fake);
        var items = EventWinRules.Build(await api.GetConfirmedUnseenEntriesAsync("tester", 100000010));
        Assert.EndsWith("/api/events/entries/confirmed-unseen?userId=tester&offNo=100000010", fake.Calls[0].Url);
        Assert.Equal(new[] { "리뷰 이벤트", "이벤트" }, items.Select(i => i.Title));
        await api.MarkEntriesSeenAsync(EventWinRules.EntryIds(items));
        Assert.EndsWith("/api/events/entries/mark-seen", fake.Calls[1].Url);
        Assert.Equal(new[] { 5L, 6L }, P(JsonDocument.Parse(fake.Calls[1].Body!).RootElement, "EntryIds").EnumerateArray().Select(e => e.GetInt64()));

        Assert.True(EventWinRules.ShouldCheck(new Core.AppSession { RtType = "RTTYP01", UserId = "a" }));
        Assert.False(EventWinRules.ShouldCheck(new Core.AppSession { RtType = "RTTYP02", UserId = "a" }));   // 대표만
    }

    [Fact]
    public void 게시판_칸과_정규화()
    {
        var notice = CommunityRules.Normalize(CommunityRules.Notice, new Row { ["noticeId"] = 3L, ["title"] = "점검", ["viewCount"] = 12L, ["regDt"] = "2026-10-20T09:00:00" });
        Assert.Equal(3L, notice.Long("postId"));
        Assert.Equal("관리자", notice.Str("author"));
        var cols = CommunityRules.Columns(CommunityRules.Notice);
        Assert.Equal(new[] { "제목", "작성자", "작성일", "조회" }, cols.Select(c => c.Header));
        Assert.Equal("2026.10.20", cols[2].Value(notice));
        Assert.Equal("12", cols[3].Value(notice));

        var job = new Row { ["title"] = "직원 구함", ["fields"] = "{\"사무소명칭\":\"강남부동산\",\"마감일\":\"2026-11-30\",\"성별\":\"남자,여자\"}" };
        var jc = CommunityRules.Columns(CommunityRules.JobOffer);
        Assert.Equal(new[] { "사무소", "모집구분", "모집인원", "성별", "마감일" }, jc.Select(c => c.Header));
        Assert.Equal("강남부동산", jc[0].Value(job));
        Assert.Equal("-", jc[1].Value(job));
        Assert.Equal("2026.11.30", jc[4].Value(job));
        Assert.Equal("사무소 양도", CommunityRules.TabLabel(CommunityRules.Office));
        Assert.Null(CommunityRules.DetailSchema(CommunityRules.Notice));
        Assert.DoesNotContain(CommunityRules.DetailSchema(CommunityRules.JobSeek)!.Rows.SelectMany(r => r), k => k == "비밀번호");   // 구직 비밀번호는 안 보임
        Assert.Empty(CommunityRules.Fields(new Row { ["fields"] = "{깨진" }));

        var list = new[] { new Row { ["title"] = "점검 안내", ["author"] = "admin" }, new Row { ["title"] = "이벤트", ["author"] = "kim" } };
        Assert.Single(CommunityRules.Filter(CommunityRules.Notice, list, "ADMIN"));      // 공지는 제목+작성자, 대소문자 무시
        Assert.Empty(CommunityRules.Filter(CommunityRules.Event, list, "admin"));        // 이벤트는 제목만
    }

    [Fact]
    public void 롤링_배너()
    {
        var notices = new[]
        {
            new Row { ["noticeId"] = 1L, ["title"] = "새 공지", ["regDt"] = "2026-10-18" },
            new Row { ["noticeId"] = 2L, ["title"] = "숨김", ["regDt"] = "2026-10-18", ["showOnDashboard"] = "N" },
            new Row { ["noticeId"] = 3L, ["title"] = "지난 공지", ["regDt"] = "2026-09-01" },
        };
        var events = new[] { new Row { ["eventId"] = 9L, ["title"] = "이벤트", ["regDt"] = "2026-10-19" } };
        var items = RollingRules.Build(notices, events);
        Assert.Equal(new[] { "새 공지", "지난 공지", "이벤트" }, items.Select(i => i.Title));   // 공지 먼저, 'N' 제외
        Assert.Equal((CommunityRules.Event, 9L), (items[2].Kind, items[2].Id));
        var now = new DateTime(2026, 10, 21, 10, 0, 0);
        Assert.True(RollingRules.IsNew(items[0], now));
        Assert.False(RollingRules.IsNew(items[1], now));
        Assert.False(RollingRules.IsNew(items[2], now));    // 이벤트는 N 없음
        Assert.Equal("10월 18일", RollingRules.DateText("2026-10-18T09:00:00"));
        Assert.Equal("-", RollingRules.DateText(null));
        Assert.Equal(TimeSpan.FromSeconds(5), RollingRules.Interval);
    }

    [Fact]
    public void 로그인_팝업_대상과_숨김기록()
    {
        var notices = new[]
        {
            new Row { ["noticeId"] = 1L, ["title"] = "팝업", ["isPopup"] = "Y", ["startDate"] = "2026-10-01", ["endDate"] = "2026-10-31", ["content"] = "<!--popup:500x700--><p>안내</p>" },
            new Row { ["noticeId"] = 2L, ["title"] = "팝업 아님", ["isPopup"] = "N" },
            new Row { ["noticeId"] = 3L, ["title"] = "기간 지남", ["isPopup"] = "Y", ["endDate"] = "2026-10-20" },
            new Row { ["noticeId"] = 4L, ["title"] = "아직", ["isPopup"] = true, ["startDate"] = "2026-10-22" },
            new Row { ["noticeId"] = 5L, ["title"] = "DB 크기", ["isPopup"] = "Y", ["popupW"] = 300L, ["popupH"] = 400L },
        };
        var events = new[] { new Row { ["eventId"] = 9L, ["title"] = "이벤트 팝업", ["content"] = "<b>e</b>" } };
        var today = "2026-10-21";
        var store = new Dictionary<string, NoticePopupRules.Dismiss>();
        var items = NoticePopupRules.Select(notices, events, today, store);
        Assert.Equal(new[] { "1", "5", "ev_9" }, items.Select(i => i.Id));
        Assert.Equal((500, 700), (items[0].Width, items[0].Height));   // 내용 표시
        Assert.Equal("<p>안내</p>", items[0].Html);                     // 표시는 지운다
        Assert.Equal((300, 400), (items[1].Width, items[1].Height));   // DB 컬럼 우선
        Assert.Equal((480, 600), (items[2].Width, items[2].Height));   // 이벤트 기본

        NoticePopupRules.Remember(store, items[0], "today", today);
        NoticePopupRules.Remember(store, items[2], "forever", today);
        Assert.Equal(new[] { "5" }, NoticePopupRules.Select(notices, events, today, store).Select(i => i.Id));
        // 다음날: '오늘 보지 않음'은 만료돼 다시 뜨고, '다시 보지 않음'은 계속 숨김(4번은 게시 시작일이 되어 새로 뜬다)
        Assert.True(NoticePopupRules.Clean(store, "2026-10-22"));
        Assert.Equal(new[] { "1", "4", "5" }, NoticePopupRules.Select(notices, events, "2026-10-22", store).Select(i => i.Id));
        // 게시가 끝난 공지의 기록은 정리된다
        store["1"] = new NoticePopupRules.Dismiss("forever", "2026-10-31");
        Assert.True(NoticePopupRules.Clean(store, "2026-11-01"));
        Assert.False(store.ContainsKey("1"));

        var path = Path.Combine(Path.GetTempPath(), $"neosys_popup_{Guid.NewGuid():N}.json");
        try
        {
            NoticePopupRules.Save(store, path);
            Assert.Equal(store.Keys, NoticePopupRules.Load(path).Keys);
            Assert.Empty(NoticePopupRules.Load(path + ".none"));
        }
        finally { File.Delete(path); }
    }
}

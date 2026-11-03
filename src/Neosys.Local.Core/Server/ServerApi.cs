using System.Net.Http.Json;
using System.Text.Json;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Server;

/// <summary>서버 호출 실패(네트워크 오류 또는 서버가 success=false 응답)</summary>
public sealed class ServerApiException(string message, string? code = null) : Exception(message)
{
    public string? Code { get; } = code;
}

/// <summary>
/// 운영 서버 API(https://api.neosis.kr) 클라이언트. 로컬 버전은 로그인·서버 공용 데이터(법정동·단지)·사무실관리(사무소·직원·가입비·상품가입) 같은 서버 데이터에만 쓴다.
/// 응답 형식: { success, data, message } 또는 { success:false, error:{ code, message } }, 일부 조회는 배열을 그대로 반환.
/// JSON 객체는 Row(키 = camelCase 속성명, 대소문자 무시)로 바꿔 돌려준다.
/// </summary>
public sealed class ServerApi
{
    private readonly HttpClient _http;
    private readonly HttpClient _storage;   // 파일 스토리지(presigned 주소 — 다른 호스트)

    public ServerApi(string baseUrl, HttpMessageHandler? handler = null)
    {
        _http = handler is null ? new HttpClient() : new HttpClient(handler);
        _storage = handler is null ? new HttpClient { Timeout = TimeSpan.FromMinutes(2) } : new HttpClient(handler);
        _http.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        _http.Timeout = TimeSpan.FromSeconds(20);
    }

    // ---------------- 인증 ----------------

    /// <summary>서버 계정 로그인. 성공 시 중개사 정보(rtNo, rtType, rtNm, offNo, id, grade ...)</summary>
    public async Task<Row> LoginAsync(string id, string pw)
    {
        var body = await SendAsync(HttpMethod.Post, "api/realestaters/login", new { Id = id, Pw = pw });
        var data = Unwrap(body, "로그인에 실패했습니다.");
        // 서버는 data에 중개사 객체를 JSON 문자열로 담아 보낸다
        if (data.ValueKind == JsonValueKind.String)
        {
            using var inner = JsonDocument.Parse(data.GetString()!);
            return ToRow(inner.RootElement);
        }
        return ToRow(data);
    }

    /// <summary>
    /// 아이디 사용 가능 여부(GET /api/realestaters/CheckRealestaterId) — 서버는 중복이어도 success=true이고 data=true(사용 중)로 알린다.
    /// data를 봐야 한다(기존 프런트는 success만 봐서 항상 '사용 가능'으로 나왔다).
    /// </summary>
    public async Task<bool> IsIdAvailableAsync(string id)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/realestaters/CheckRealestaterId?id={Uri.EscapeDataString(id)}");
        return Unwrap(body, "아이디 중복확인에 실패했습니다.").ValueKind != JsonValueKind.True;
    }

    /// <summary>추천인 코드 확인(GET /api/realestaters/referral-info) — 결과: rtNm(대표자)·offNm(사무소). 유효하지 않으면 null</summary>
    public async Task<Row?> GetReferralInfoAsync(string code)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/realestaters/referral-info?code={Uri.EscapeDataString(code)}");
        try
        {
            var data = Unwrap(body, "추천인 코드 확인에 실패했습니다.");
            return data.ValueKind == JsonValueKind.Object && Prop(data, "valid") is { ValueKind: JsonValueKind.True } ? ToRow(data) : null;
        }
        catch (ServerApiException e) when (e.Code == "INVALID_REFERRAL") { return null; }
    }

    /// <summary>
    /// 회원가입(POST /api/realestaters) — 본문은 SignupRules.BuildRequest. 추천인 코드(ReferralCode)가 있으면 서버가 referral_benefits에 추천인 행을 넣는다
    /// (서버에서 처리, 실패해도 가입은 성공으로 응답한다).
    /// </summary>
    public async Task SignUpAsync(IReadOnlyDictionary<string, object?> request)
    {
        var body = await SendAsync(HttpMethod.Post, "api/realestaters", request);
        Unwrap(body, "회원가입에 실패했습니다.");
    }

    /// <summary>로그인 ID로 소속 사무소 조회. 없으면 null</summary>
    public async Task<Row?> GetUserOfficeAsync(string userId)
    {
        try
        {
            var body = await SendAsync(HttpMethod.Get, $"api/office/GetUserOffice?userId={Uri.EscapeDataString(userId)}");
            var data = Unwrap(body, "사무실 정보 조회 실패");
            return data.ValueKind == JsonValueKind.Object ? ToRow(data) : null;
        }
        catch (ServerApiException) { return null; }
    }

    /// <summary>사무소 소속 중개사(직원) 목록</summary>
    public async Task<List<Row>> GetRealtorsAsync(long offNo)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/realestaters?offNo={offNo}");
        var data = Unwrap(body, "직원 목록 조회 실패", allowEmpty: true);
        // { relators: [...] } 또는 배열
        if (data.ValueKind == JsonValueKind.Object)
            foreach (var p in data.EnumerateObject())
                if (p.Value.ValueKind == JsonValueKind.Array) return ToRows(p.Value);
        return data.ValueKind == JsonValueKind.Array ? ToRows(data) : new();
    }

    /// <summary>직원 메뉴 권한(허용 메뉴 키 목록, rt_menu_perm). 대표가 서버에서 설정한 값</summary>
    public async Task<List<string>> GetStaffMenuPermAsync(long rtNo)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/staff-menu-perm/{rtNo}");
        var data = Unwrap(body, "메뉴 권한 조회 실패", allowEmpty: true);
        var keys = data.ValueKind == JsonValueKind.Object ? Prop(data, "keys") : data.ValueKind == JsonValueKind.Array ? data : null;
        return keys is { ValueKind: JsonValueKind.Array } arr
            ? arr.EnumerateArray().Where(k => k.ValueKind == JsonValueKind.String).Select(k => k.GetString()!).ToList()
            : new();
    }

    /// <summary>직원 메뉴 권한 저장(전체 교체) — 대표만. 서버 rt_menu_perm에 저장되어 직원 로그인 시 적용된다.</summary>
    public async Task SetStaffMenuPermAsync(long rtNo, IEnumerable<string> keys, string userId)
    {
        var body = await SendAsync(HttpMethod.Put, $"api/staff-menu-perm/{rtNo}", new { Keys = keys.ToList(), UserId = userId });
        Unwrap(body, "메뉴 권한 저장 실패");
    }

    // ---------------- 사무소·직원 정보 변경(서버 데이터 — 운영 서버에 바로 반영) ----------------

    /// <summary>사무소 정보 수정 — 기존 OfficeManagementPage(PUT /api/office/{offNo}). office 키: OffNm, Addr, RpsNm, RpsPhone, OffTel, OffFax, RegNo, BizNo</summary>
    public async Task UpdateOfficeAsync(long offNo, Row office, string userId)
    {
        var body = await SendAsync(HttpMethod.Put, $"api/office/{offNo}", new
        {
            OffNm = office.Str("OffNm"), Addr = office.Str("Addr"), RpsNm = office.Str("RpsNm"), RpsPhone = office.Str("RpsPhone"),
            OffTel = office.Str("OffTel"), OffFax = office.Str("OffFax"), RegNo = office.Str("RegNo"), BizNo = office.Str("BizNo"), UserId = userId,
        });
        Unwrap(body, "사무실 정보 수정에 실패했습니다.");
    }

    /// <summary>직원 등록 — 기존 StaffAccountManagementPage(POST /api/realestaters). 키: rtType, rtNm, rtTel, rtRegNo, grade, id, pw, email, joinDate, leaveDate, note</summary>
    public async Task CreateRealtorAsync(long offNo, Row staff, string userId)
    {
        var body = await SendAsync(HttpMethod.Post, "api/realestaters", new
        {
            RtType = staff.Str("rtType") ?? "RTTYP02", RtNm = staff.Str("rtNm"), RtTel = staff.Str("rtTel"), RtRegNo = staff.Str("rtRegNo"),
            OffNo = (int)offNo, Grade = staff.Str("grade"), Id = staff.Str("id"), Pw = staff.Str("pw"), UserId = userId,
            Email = staff.Str("email"), JoinDate = staff.Str("joinDate"), LeaveDate = staff.Str("leaveDate"), Note = staff.Str("note"),
        });
        Unwrap(body, "중개인 등록에 실패했습니다.");
    }

    /// <summary>직원 수정(PUT /api/realestaters/{rtNo}) — 비밀번호(pw)는 입력했을 때만 보낸다. 이메일·입사일·퇴사일·비고는 빈 값도 보낸다(비우기 허용 — 기존과 같음)</summary>
    public async Task UpdateRealtorAsync(long rtNo, Row staff, string userId)
    {
        var dto = new Dictionary<string, object?>
        {
            ["RtType"] = staff.Str("rtType"), ["RtNm"] = staff.Str("rtNm"), ["RtTel"] = staff.Str("rtTel"), ["RtRegNo"] = staff.Str("rtRegNo"),
            ["Grade"] = staff.Str("grade"), ["UserId"] = userId,
            ["Email"] = staff.Str("email") ?? "", ["JoinDate"] = staff.Str("joinDate") ?? "", ["LeaveDate"] = staff.Str("leaveDate") ?? "", ["Note"] = staff.Str("note") ?? "",
        };
        if (staff.Has("pw")) dto["Pw"] = staff.Str("pw");
        foreach (var k in dto.Where(kv => kv.Value is null).Select(kv => kv.Key).ToList()) dto.Remove(k);
        var body = await SendAsync(HttpMethod.Put, $"api/realestaters/{rtNo}", dto);
        Unwrap(body, "중개인 수정에 실패했습니다.");
    }

    /// <summary>직원 삭제(DELETE /api/realestaters/{rtNo}?userId=)</summary>
    public async Task DeleteRealtorAsync(long rtNo, string userId)
    {
        var body = await SendAsync(HttpMethod.Delete, $"api/realestaters/{rtNo}?userId={Uri.EscapeDataString(userId)}");
        Unwrap(body, "중개인 삭제에 실패했습니다.");
    }

    // ---------------- 대시보드(서버 데이터 — 조회) ----------------

    /// <summary>공지사항(대시보드 표시분). 결과: noticeId, title, regDt, isTop, showOnDashboard</summary>
    public async Task<List<Row>> GetNoticesAsync(int rows = 5)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/system/notices?pageNumber=1&rowsPerPage={rows}");
        var data = Unwrap(body, "공지사항 조회 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Object && Prop(data, "notices") is { ValueKind: JsonValueKind.Array } arr ? ToRows(arr) : new();
    }

    /// <summary>공개 이벤트(대시보드 표시분). 결과: eventId, title, regDt, linkUrl</summary>
    public async Task<List<Row>> GetDashboardEventsAsync()
    {
        var body = await SendAsync(HttpMethod.Get, "api/admin/events?isPublic=Y&showDashboard=Y&rowsPerPage=20");
        var data = Unwrap(body, "이벤트 조회 실패", allowEmpty: true);
        if (data.ValueKind != JsonValueKind.Object) return new();
        var arr = Prop(data, "events") ?? Prop(data, "Events");
        return arr is { ValueKind: JsonValueKind.Array } a ? ToRows(a) : new();
    }

    // ---------------- 공지·이벤트·커뮤니티(서버 데이터 — 조회. 상세 조회는 서버가 조회수를 하루 1회 올린다) ----------------

    /// <summary>공지 목록(GET /api/system/notices) — 내용(content)·팝업(isPopup·startDate·endDate·popupW/H)·조회수 포함</summary>
    public async Task<List<Row>> GetNoticeListAsync(int rows = 200)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/system/notices?pageNumber=1&rowsPerPage={rows}");
        var data = Unwrap(body, "공지사항 조회 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Object && Prop(data, "notices") is { ValueKind: JsonValueKind.Array } arr ? ToRows(arr) : new();
    }

    /// <summary>공지 상세(GET /api/system/notices/{id}?viewerId=)</summary>
    public async Task<Row?> GetNoticeDetailAsync(long noticeId, string? viewerId)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/system/notices/{noticeId}" + Viewer(viewerId));
        var data = Unwrap(body, "공지사항 조회 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Object ? ToRow(data) : null;
    }

    /// <summary>
    /// 이벤트 목록(GET /api/admin/events) — 조건: 공개(isPublic)·팝업(isPopup)·대시보드 표시(showDashboard), 'Y'만 보낸다.
    /// 결과: eventId, title, content, regDt, startDate, endDate, viewCount, linkUrl, popupW/H
    /// </summary>
    public async Task<List<Row>> GetEventListAsync(bool isPublic = true, bool isPopup = false, bool showDashboard = false, int rows = 200)
    {
        var q = $"api/admin/events?rowsPerPage={rows}" + (isPublic ? "&isPublic=Y" : "") + (isPopup ? "&isPopup=Y" : "")
                + (showDashboard ? "&showDashboard=Y" : "");
        var body = await SendAsync(HttpMethod.Get, q);
        var data = Unwrap(body, "이벤트 조회 실패", allowEmpty: true);
        if (data.ValueKind != JsonValueKind.Object) return new();
        return Prop(data, "events") is { ValueKind: JsonValueKind.Array } arr ? ToRows(arr) : new();
    }

    /// <summary>이벤트 상세(GET /api/admin/events/{id}?viewerId=)</summary>
    public async Task<Row?> GetEventDetailAsync(long eventId, string? viewerId)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/admin/events/{eventId}" + Viewer(viewerId));
        var data = Unwrap(body, "이벤트 조회 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Object ? ToRow(data) : null;
    }

    /// <summary>커뮤니티 게시판 목록(GET /api/community/list?tab=&amp;q=) — 사무소 양도('사무소 매수/매도') 등. 결과: postId, tab, title, content, fields(JSON), author, viewCnt, regDt</summary>
    public async Task<List<Row>> GetCommunityListAsync(string tab, string? q)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/community/list?tab={Uri.EscapeDataString(tab)}" + (string.IsNullOrWhiteSpace(q) ? "" : $"&q={Uri.EscapeDataString(q.Trim())}"));
        return Items(Unwrap(body, "게시글 조회 실패", allowEmpty: true));
    }

    public async Task<Row?> GetCommunityDetailAsync(long postId, string? viewerId)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/community/{postId}" + Viewer(viewerId));
        var data = Unwrap(body, "게시글 조회 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Object ? ToRow(data) : null;
    }

    /// <summary>구인·구직 게시판 목록(GET /api/community/job/list?kind=구인|구직&amp;q=). 결과: postId, kind, title, author, fields(JSON), viewCnt, regDt</summary>
    public async Task<List<Row>> GetJobListAsync(string kind, string? q)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/community/job/list?kind={Uri.EscapeDataString(kind)}" + (string.IsNullOrWhiteSpace(q) ? "" : $"&q={Uri.EscapeDataString(q.Trim())}"));
        return Items(Unwrap(body, "게시글 조회 실패", allowEmpty: true));
    }

    public async Task<Row?> GetJobDetailAsync(long postId, string? viewerId)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/community/job/{postId}" + Viewer(viewerId));
        var data = Unwrap(body, "게시글 조회 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Object ? ToRow(data) : null;
    }

    // ---------------- 자동 업데이트(로그인 전) ----------------

    /// <summary>
    /// 로컬(라이트) 프로그램 최신 버전(GET /api/version/light/latest?platform= — 서버 app_version_light, docs/server/APP_VERSION_LIGHT.md).
    /// 결과: version, downloadUrl, mandatory, releaseNote. 등록된 버전이 없으면 null
    /// </summary>
    public async Task<Row?> GetLatestLightVersionAsync(string platform = "win")
    {
        var body = await SendAsync(HttpMethod.Get, $"api/version/light/latest?platform={Uri.EscapeDataString(platform)}");
        var data = Unwrap(body, "버전 확인 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Object ? ToRow(data) : null;
    }

    /// <summary>새 exe 내려받기(진행률 0~1 보고). 주소는 버전 API가 준 download_url</summary>
    public async Task DownloadFileAsync(string url, string path, IProgress<double>? progress = null, CancellationToken ct = default)
    {
        try
        {
            using var res = await _storage.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!res.IsSuccessStatusCode) throw new ServerApiException($"다운로드에 실패했습니다({(int)res.StatusCode}).", "DOWNLOAD");
            var total = res.Content.Headers.ContentLength ?? 0;
            await using var src = await res.Content.ReadAsStreamAsync(ct);
            await using var dst = File.Create(path);
            var buf = new byte[81920];
            long done = 0;
            int n;
            while ((n = await src.ReadAsync(buf, ct)) > 0)
            {
                await dst.WriteAsync(buf.AsMemory(0, n), ct);
                done += n;
                if (total > 0) progress?.Report((double)done / total);
            }
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            throw new ServerApiException("다운로드에 실패했습니다.\n" + e.Message, "NETWORK");
        }
    }

    // ---------------- 커뮤니티 글쓰기·삭제(서버 쓰기 — 운영 서버에 바로 반영) ----------------

    /// <summary>
    /// 커뮤니티 게시글 등록(POST /api/community) — 사무소 양도 등. fields = 정형 항목 JSON 문자열, rtNo는 서버 DTO가 문자열이라 문자열로 보낸다(기존 normalizeRtNo).
    /// 반환: 새 postId. 서버가 필수값 누락으로 postId 없이 응답하면 예외
    /// </summary>
    public async Task<long> CreateCommunityPostAsync(CommunityPost p)
    {
        var body = await SendAsync(HttpMethod.Post, "api/community", new
        {
            Tab = p.Tab, Title = p.Title, Content = p.Content, Fields = p.Fields, Author = p.Author, OffNo = p.OffNo, RtNo = p.RtNo?.ToString(), RegId = p.RegId,
        });
        return NewPostId(body);
    }

    /// <summary>구인·구직 등록(POST /api/community/job) — kind = 구인|구직, 구직은 비밀번호(pwd). 반환: 새 postId</summary>
    public async Task<long> CreateJobPostAsync(CommunityPost p)
    {
        var body = await SendAsync(HttpMethod.Post, "api/community/job", new
        {
            Kind = p.Tab, Title = p.Title, Author = p.Author, Fields = p.Fields, Pwd = p.Pwd, OffNo = p.OffNo, RtNo = p.RtNo?.ToString(), RegId = p.RegId,
        });
        return NewPostId(body);
    }

    /// <summary>커뮤니티 게시글 삭제(DELETE /api/community/{postId}, 서버는 소프트 삭제). 반환: 삭제됐는지</summary>
    public async Task<bool> DeleteCommunityPostAsync(long postId) =>
        Deleted(Unwrap(await SendAsync(HttpMethod.Delete, $"api/community/{postId}"), "삭제에 실패했습니다."));

    /// <summary>구인·구직 삭제(DELETE /api/community/job/{postId}, 소프트 삭제)</summary>
    public async Task<bool> DeleteJobPostAsync(long postId) =>
        Deleted(Unwrap(await SendAsync(HttpMethod.Delete, $"api/community/job/{postId}"), "삭제에 실패했습니다."));

    private static long NewPostId(JsonElement body)
    {
        var data = Unwrap(body, "등록에 실패했습니다.");
        if (Prop(data, "postId") is { ValueKind: JsonValueKind.Number } id) return id.GetInt64();
        throw new ServerApiException((body.ValueKind == JsonValueKind.Object ? Str(body, "message") : null) ?? "등록에 실패했습니다.", "NOT_CREATED");
    }

    private static bool Deleted(JsonElement data) => Prop(data, "deleted") is not { ValueKind: JsonValueKind.False };

    // ---------------- 이벤트 확정 알림(대시보드 — 대표 로그인 시 1회) ----------------

    /// <summary>참여 이벤트 중 확인완료 + 아직 안 본 것(GET /api/events/entries/confirmed-unseen?userId=&amp;offNo=). 결과: entryId, eventId, eventTitle, confirmedDt ...</summary>
    public async Task<List<Row>> GetConfirmedUnseenEntriesAsync(string? userId, long? offNo)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/events/entries/confirmed-unseen?userId={Uri.EscapeDataString(userId ?? "")}&offNo={offNo}");
        return Items(Unwrap(body, "이벤트 알림 조회 실패", allowEmpty: true));
    }

    /// <summary>알림을 보여 준 참여 건을 확인 처리(POST /api/events/entries/mark-seen — user_seen='Y')</summary>
    public async Task MarkEntriesSeenAsync(IEnumerable<long> entryIds)
    {
        var body = await SendAsync(HttpMethod.Post, "api/events/entries/mark-seen", new { EntryIds = entryIds.ToList() });
        Unwrap(body, "확인 처리 실패");
    }

    /// <summary>내 추천 목록(GET /api/realestaters/referrals?rtNo=) — 결과: offNm(상호)·rtNm(대표)·regDt(가입일)</summary>
    public async Task<List<Row>> GetReferralsAsync(long rtNo)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/realestaters/referrals?rtNo={rtNo}");
        var data = Unwrap(body, "추천 목록 조회 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Object && Prop(data, "referredUsers") is { ValueKind: JsonValueKind.Array } arr ? ToRows(arr) : new();
    }

    /// <summary>파일만 스토리지에 올리고 메타를 돌려준다(서버 sys_file 등록 없음 — 회원가입처럼 다른 API가 메타를 저장할 때). 결과: objectKey, origName, contentType, fileSize, ext</summary>
    public async Task<Row> UploadToStorageAsync(string fileDiv, string fileName, byte[] content, string? contentType, long maxBytes = MaxUploadBytes)
    {
        if (content.LongLength > maxBytes) throw new ServerApiException($"파일 용량은 {maxBytes / 1024 / 1024}MB를 초과할 수 없습니다.", "FILE_TOO_LARGE");
        var presign = Unwrap(await SendAsync(HttpMethod.Post, "api/files/presign", new { FileDiv = fileDiv, FileName = fileName }), "업로드 주소를 받지 못했습니다.");
        var objectKey = presign.ValueKind == JsonValueKind.Object ? Str(presign, "objectKey") : null;
        var uploadUrl = presign.ValueKind == JsonValueKind.Object ? Str(presign, "uploadUrl") : null;
        if (string.IsNullOrEmpty(objectKey) || string.IsNullOrEmpty(uploadUrl)) throw new ServerApiException("업로드 주소를 받지 못했습니다.", "PRESIGN");
        await PutToStorageAsync(uploadUrl, content, contentType);
        return new Row
        {
            ["objectKey"] = objectKey, ["origName"] = fileName, ["contentType"] = contentType, ["fileSize"] = content.LongLength,
            ["ext"] = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant(),
        };
    }

    private async Task PutToStorageAsync(string uploadUrl, byte[] content, string? contentType)
    {
        try
        {
            using var put = new HttpRequestMessage(HttpMethod.Put, uploadUrl) { Content = new ByteArrayContent(content) };
            put.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType ?? "application/octet-stream");
            using var res = await _storage.SendAsync(put);
            if (!res.IsSuccessStatusCode) throw new ServerApiException($"파일 업로드에 실패했습니다({(int)res.StatusCode}).", "UPLOAD");
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
        {
            throw new ServerApiException("파일 업로드에 실패했습니다.\n" + e.Message, "NETWORK");
        }
    }

    private static string Viewer(string? viewerId) => string.IsNullOrEmpty(viewerId) ? "" : $"?viewerId={Uri.EscapeDataString(viewerId)}";

    private static List<Row> Items(JsonElement data) =>
        data.ValueKind == JsonValueKind.Object && Prop(data, "items") is { ValueKind: JsonValueKind.Array } arr ? ToRows(arr)
        : data.ValueKind == JsonValueKind.Array ? ToRows(data) : new();

    /// <summary>사무소 멤버십(상품명·무료개월·가입일·다음결제일). 없으면 null</summary>
    public async Task<Row?> GetMembershipAsync(long offNo)
    {
        try
        {
            var body = await SendAsync(HttpMethod.Get, $"api/admin/memberships/office/{offNo}");
            var data = Unwrap(body, "멤버십 조회 실패", allowEmpty: true);
            if (data.ValueKind != JsonValueKind.Object) return null;
            var row = ToRow(data);
            return row.Has("ProdName") || row.Has("prodName") ? row : null;
        }
        catch (ServerApiException) { return null; }
    }

    /// <summary>멤버십 변동 이력(GET /api/admin/memberships/office/{offNo}/history) — 결과: Kind(JOIN·EVENT·REWARD)·Title·Qty·Unit·AddDays·RegDt, 최신순</summary>
    public async Task<List<Row>> GetMembershipHistoryAsync(long offNo)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/admin/memberships/office/{offNo}/history");
        return Items(Unwrap(body, "무료개월 내역 조회 실패", allowEmpty: true));
    }

    /// <summary>대시보드 인사말 저장(사무소 공유) — PUT /api/office/{offNo}/greeting</summary>
    public async Task UpdateGreetingAsync(long offNo, string greeting, string userId)
    {
        var body = await SendAsync(HttpMethod.Put, $"api/office/{offNo}/greeting", new { Greeting = greeting, UserId = userId });
        Unwrap(body, "인사말 저장 실패");
    }

    /// <summary>비밀번호 재확인(사무소관리 진입 전 — 기존과 같이 로그인 API로 확인)</summary>
    public async Task<bool> VerifyPasswordAsync(string id, string pw)
    {
        try { await LoginAsync(id, pw); return true; }
        catch (ServerApiException) { return false; }
    }

    // ---------------- 사무실관리 허브: 패스워드·가입비·상품가입·증빙 파일(서버 데이터) ----------------

    /// <summary>패스워드 변경 — 현재 패스워드 확인 후 변경(POST /api/realestaters/change-password). 실패 시 서버 문구로 예외</summary>
    public async Task ChangePasswordAsync(string id, string currentPw, string newPw)
    {
        var body = await SendAsync(HttpMethod.Post, "api/realestaters/change-password", new { Id = id, CurrentPw = currentPw, NewPw = newPw });
        Unwrap(body, "패스워드 변경에 실패했습니다.");
    }

    /// <summary>사무소 가입비 결제 여부(GET /api/payments/entry-fee). 결과: paid(bool), paidDt, amount</summary>
    public async Task<Row> GetEntryFeeAsync(long offNo)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/payments/entry-fee?offNo={offNo}");
        var data = Unwrap(body, "가입비 상태 조회 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Object ? ToRow(data) : new Row { ["paid"] = false };
    }

    /// <summary>웹 결제창 자동로그인 1회용 토큰(POST /api/realestaters/payment-token)</summary>
    public async Task<string?> IssuePaymentTokenAsync(long rtNo)
    {
        var body = await SendAsync(HttpMethod.Post, "api/realestaters/payment-token", new { RtNo = rtNo });
        var data = Unwrap(body, "토큰 발급에 실패했습니다.");
        return data.ValueKind == JsonValueKind.Object ? Str(data, "token") : null;
    }

    /// <summary>멤버십 상품 목록(GET /api/admin/memberships). 결과: prodId, prodName, pcCnt, mobCnt, price, descr</summary>
    public async Task<List<Row>> GetMembershipProductsAsync()
    {
        var body = await SendAsync(HttpMethod.Get, "api/admin/memberships");
        var data = Unwrap(body, "상품 조회 실패", allowEmpty: true);
        var items = data.ValueKind == JsonValueKind.Object ? Prop(data, "items") : data.ValueKind == JsonValueKind.Array ? data : null;
        return items is { ValueKind: JsonValueKind.Array } arr ? ToRows(arr) : new();
    }

    /// <summary>상품 가입(사무소 멤버십 적용 — PUT /api/admin/memberships/office/{offNo}, 결제 없음)</summary>
    public async Task SubscribeMembershipAsync(long offNo, long prodId, string memo, string userId)
    {
        var body = await SendAsync(HttpMethod.Put, $"api/admin/memberships/office/{offNo}", new { ProdId = prodId, Memo = memo, UserId = userId });
        Unwrap(body, "가입에 실패했습니다.");
    }

    /// <summary>서버 파일 목록(GET /api/files) — 사업자등록증·개설등록증 등. 결과: fileId, origName, objectKey, url</summary>
    public async Task<List<Row>> ListFilesAsync(string fileTyp, string fileDiv, string refKey)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/files?fileTyp={Uri.EscapeDataString(fileTyp)}&fileDiv={Uri.EscapeDataString(fileDiv)}&refKey={Uri.EscapeDataString(refKey)}");
        var data = Unwrap(body, "파일 목록 조회 실패", allowEmpty: true);
        var items = data.ValueKind == JsonValueKind.Object ? Prop(data, "items") : null;
        return items is { ValueKind: JsonValueKind.Array } arr ? ToRows(arr) : new();
    }

    /// <summary>파일 보기용 주소(GET /api/files/url)</summary>
    public async Task<string?> GetFileUrlAsync(string objectKey)
    {
        var body = await SendAsync(HttpMethod.Get, $"api/files/url?objectKey={Uri.EscapeDataString(objectKey)}");
        var data = Unwrap(body, "파일 주소를 가져올 수 없습니다.");
        return data.ValueKind == JsonValueKind.Object ? Str(data, "url") : null;
    }

    /// <summary>서버 파일 삭제(DELETE /api/files/{fileId}?userId=)</summary>
    public async Task DeleteFileAsync(long fileId, string userId)
    {
        var body = await SendAsync(HttpMethod.Delete, $"api/files/{fileId}?userId={Uri.EscapeDataString(userId)}");
        Unwrap(body, "파일 삭제에 실패했습니다.");
    }

    /// <summary>서버 파일 올리기 최대 크기(기존 공통 10MB)</summary>
    public const long MaxUploadBytes = 10 * 1024 * 1024;

    /// <summary>
    /// 서버 파일 올리기(기존 FileUploadForm): presign(POST /api/files/presign) → 스토리지에 PUT → 메타 저장(POST /api/files). 반환: fileId
    /// </summary>
    public async Task<long?> UploadFileAsync(string fileTyp, string fileDiv, string refKey, string fileName, byte[] content, string? contentType, string userId)
    {
        if (content.LongLength > MaxUploadBytes) throw new ServerApiException("파일 용량은 10MB를 초과할 수 없습니다.", "FILE_TOO_LARGE");
        var meta = await UploadToStorageAsync(fileDiv, fileName, content, contentType);
        var reg = Unwrap(await SendAsync(HttpMethod.Post, "api/files", new
        {
            FileTyp = fileTyp, FileDiv = fileDiv, RefKey = refKey, OrigName = fileName, ObjectKey = meta.Str("objectKey"),
            ContentType = contentType, FileSize = content.LongLength, Ext = meta.Str("ext"), UserId = userId,
        }), "파일 정보 저장에 실패했습니다.");
        return reg.ValueKind == JsonValueKind.Object && Prop(reg, "fileId") is { ValueKind: JsonValueKind.Number } id ? id.GetInt64() : null;
    }

    // ---------------- 주소·단지 (서버 공용 데이터) ----------------

    /// <summary>addressType: 1=시도, 2=시군구, 4=법정동(읍면동), 7=리. 결과: bjdCode, bjdName, sidoName, sigunguName ...</summary>
    public Task<List<Row>> GetBjdListAsync(int addressType, string? addressCode = null) =>
        GetListAsync($"api/system/bjd-list?addressType={addressType}" + (addressCode is null ? "" : $"&addressCode={Uri.EscapeDataString(addressCode)}"));

    /// <summary>법정동 코드의 단지 목록. 결과: naverDanjiCode, buildingName, addressBunji, familyCnt, approveDate, hscpTypeCode, areas ...</summary>
    public Task<List<Row>> GetDanjiListAsync(string bjdCode, string? hscpType = null) =>
        GetListAsync($"api/system/danji-list?bjdCode={Uri.EscapeDataString(bjdCode)}" + (hscpType is null ? "" : $"&hscpType={Uri.EscapeDataString(hscpType)}"));

    public Task<List<Row>> GetDongListAsync(string danjiCode) =>
        GetListAsync($"api/system/dong-list?danjiCode={Uri.EscapeDataString(danjiCode)}");

    public Task<List<Row>> GetHoListAsync(string danjiCode, int dongNo) =>
        GetListAsync($"api/system/ho-list?danjiCode={Uri.EscapeDataString(danjiCode)}&dongNo={dongNo}");

    public Task<List<Row>> GetAreaListAsync(string danjiCode) =>
        GetListAsync($"api/system/area-list?danjiCode={Uri.EscapeDataString(danjiCode)}");

    // ---------------- 공통 ----------------

    private async Task<List<Row>> GetListAsync(string url)
    {
        var body = await SendAsync(HttpMethod.Get, url);
        if (body.ValueKind == JsonValueKind.Array) return ToRows(body);
        var data = Unwrap(body, "조회 실패", allowEmpty: true);
        return data.ValueKind == JsonValueKind.Array ? ToRows(data) : new();
    }

    private async Task<JsonElement> SendAsync(HttpMethod method, string url, object? body = null)
    {
        HttpResponseMessage res;
        try
        {
            using var req = new HttpRequestMessage(method, url);
            if (body is not null) req.Content = JsonContent.Create(body);
            res = await _http.SendAsync(req);
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
        {
            throw new ServerApiException("서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.\n" + e.Message, "NETWORK");
        }

        using (res)
        {
            var text = await res.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(text))
            {
                if (res.IsSuccessStatusCode) return default;
                throw new ServerApiException($"서버 오류({(int)res.StatusCode})", "HTTP");
            }
            JsonElement root;
            try { root = JsonDocument.Parse(text).RootElement.Clone(); }
            catch (JsonException) { throw new ServerApiException($"서버 응답을 해석할 수 없습니다({(int)res.StatusCode}).", "PARSE"); }

            if (!res.IsSuccessStatusCode && root.ValueKind == JsonValueKind.Object && !Prop(root, "success").HasValue)
                throw new ServerApiException(Str(root, "message") ?? $"서버 오류({(int)res.StatusCode})", "HTTP");
            return root;
        }
    }

    /// <summary>{ success, data } 에서 data를 꺼낸다. success=false면 예외. allowEmpty면 NOT_FOUND(0건)를 빈 값으로 본다.</summary>
    private static JsonElement Unwrap(JsonElement body, string defaultMessage, bool allowEmpty = false)
    {
        if (body.ValueKind != JsonValueKind.Object) return body;
        var success = Prop(body, "success");
        if (success is { ValueKind: JsonValueKind.False })
        {
            var err = Prop(body, "error");
            var code = err.HasValue ? Str(err.Value, "code") : null;
            var msg = (err.HasValue ? Str(err.Value, "message") : null) ?? Str(body, "message") ?? defaultMessage;
            if (allowEmpty && code is "NOT_FOUND") return default; // 기존 API는 0건을 400 NOT_FOUND로 응답
            throw new ServerApiException(msg, code);
        }
        return Prop(body, "data") ?? body;
    }

    private static JsonElement? Prop(JsonElement e, string name)
    {
        if (e.ValueKind != JsonValueKind.Object) return null;
        foreach (var p in e.EnumerateObject())
            if (string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase)) return p.Value;
        return null;
    }

    private static string? Str(JsonElement e, string name) =>
        Prop(e, name) is { ValueKind: JsonValueKind.String } v ? v.GetString() : null;

    public static List<Row> ToRows(JsonElement arr) =>
        arr.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.Object).Select(ToRow).ToList();

    public static Row ToRow(JsonElement obj)
    {
        var row = new Row();
        foreach (var p in obj.EnumerateObject()) row[p.Name] = ToValue(p.Value);
        return row;
    }

    private static object? ToValue(JsonElement v) => v.ValueKind switch
    {
        JsonValueKind.String => v.GetString(),
        JsonValueKind.Number => v.TryGetInt64(out var l) ? l : v.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Object => ToRow(v),
        JsonValueKind.Array => v.EnumerateArray().Select(ToValue).ToList(),
        _ => null,
    };
}

/// <summary>커뮤니티 등록 요청 — Tab: 게시판 탭(사무소 양도 등) 또는 구인·구직은 kind('구인'|'구직'). Fields: 정형 항목 JSON 문자열, Pwd: 구직 비밀번호</summary>
public sealed record CommunityPost(string Tab, string Title, string? Author, string? Content, string? Fields, string? Pwd, long? OffNo, long? RtNo, string? RegId);

using System.Net;
using System.Text;
using System.Text.Json;
using Neosys.Local.Core;
using Neosys.Local.Core.Server;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>회원가입(가짜 HTTP, 운영 서버 호출 없음)과 최초 실행 공유 설정(가짜 공유 함수, PC 설정 변경 없음)</summary>
public class SignupAndFirstRunTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "neosys_firstrun_" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_dir)) Directory.Delete(_dir, recursive: true);
    }

    private sealed class Fake(string response) : HttpMessageHandler
    {
        public List<(HttpMethod Method, string Url, string? Body)> Calls { get; } = new();
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls.Add((request.Method, request.RequestUri!.AbsoluteUri, request.Content is null ? null : await request.Content.ReadAsStringAsync(ct)));
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(response, Encoding.UTF8, "application/json") };
        }
    }

    private static SignupForm Valid() => new()
    {
        RtNm = "홍길동", RtTel = "010-1234-5678", Id = "tester1", CheckedId = "tester1", Email = "a@b.kr", Pw = "secret1", PwConfirm = "secret1",
        OffNm = "강남부동산", OffTel = "02-1", OffAddr = "서울 강남구", OffRegNo = "11680", BizNo = "123-45",
    };

    private static JsonElement P(JsonElement o, string n) => o.EnumerateObject().First(p => string.Equals(p.Name, n, StringComparison.OrdinalIgnoreCase)).Value;

    [Fact]
    public void 가입_검증()
    {
        Assert.Null(SignupRules.Validate(Valid()));
        var f = Valid(); f.Id = "tester2";   // 확인 후 아이디를 바꾸면 다시 확인
        Assert.Contains("중복확인", SignupRules.Validate(f));
        f = Valid(); f.PwConfirm = "x";
        Assert.Contains("일치", SignupRules.Validate(f));
        f = Valid(); f.Email = "wrong";
        Assert.Contains("이메일", SignupRules.Validate(f));
        f = Valid(); f.HasReferral = true;
        Assert.Contains("추천인 코드를 입력", SignupRules.Validate(f));
        f.ReferralCode = "A100001";
        Assert.Contains("[확인]", SignupRules.Validate(f));   // 추천인은 확인 필수
        f.CheckedReferralCode = "A100001";
        Assert.Null(SignupRules.Validate(f));
        f.ReferralCode = "A100002";                           // 확인 후 코드를 바꾸면 다시 확인
        Assert.Contains("[확인]", SignupRules.Validate(f));
    }

    [Fact]
    public async Task 가입_요청_본문_서버_필드와_추천인_코드()
    {
        var fake = new Fake("{\"success\":true,\"data\":true}");
        var api = new ServerApi("http://test.local", fake);
        var f = Valid();
        f.HasReferral = true;
        f.ReferralCode = " A100001 ";
        f.CheckedReferralCode = "A100001";
        f.BizFile = new Row { ["objectKey"] = "k/1.pdf", ["origName"] = "사업자.pdf", ["contentType"] = "application/pdf", ["fileSize"] = 10L, ["ext"] = "pdf" };

        await api.SignUpAsync(SignupRules.BuildRequest(f));

        var (m, url, body) = fake.Calls.Single();
        Assert.Equal(HttpMethod.Post, m);
        Assert.EndsWith("/api/realestaters", url);
        var j = JsonDocument.Parse(body!).RootElement;
        Assert.Equal("A100001", P(j, "ReferralCode").GetString());   // 서버 가입 처리는 공백을 지우지 않으므로 지워서 보낸다
        Assert.Equal("RTTYP01", P(j, "RtType").GetString());
        Assert.Equal("tester1", P(j, "Id").GetString());
        Assert.Equal("tester1", P(j, "UserId").GetString());
        Assert.Equal("11680", P(j, "RtRegNo").GetString());
        Assert.Equal("11680", P(j, "OffRegNo").GetString());
        Assert.Equal(JsonValueKind.Null, P(j, "OffNo").ValueKind);   // 서버가 사무소를 새로 만든다
        Assert.Equal("k/1.pdf", P(j, "BizObjectKey").GetString());
        Assert.Equal(10, P(j, "BizFileSize").GetInt64());
        Assert.Equal(JsonValueKind.Null, P(j, "OpenObjectKey").ValueKind);

        // 추천인 '없음'이면 코드를 보내지 않는다(입력했다가 없음으로 바꿔도)
        f.HasReferral = false;
        Assert.Null(SignupRules.BuildRequest(f)["ReferralCode"]);
    }

    [Theory]
    [InlineData("{\"success\":true,\"data\":true}", false)]    // 서버: 중복이어도 success=true, data=true
    [InlineData("{\"success\":true,\"data\":false}", true)]
    public async Task 아이디_중복확인은_data로_판단(string response, bool available)
    {
        var fake = new Fake(response);
        Assert.Equal(available, await new ServerApi("http://test.local", fake).IsIdAvailableAsync("a b"));
        Assert.EndsWith("/api/realestaters/CheckRealestaterId?id=a%20b", fake.Calls[0].Url);
    }

    [Fact]
    public async Task 추천인_코드_확인()
    {
        var ok = new Fake("{\"success\":true,\"data\":{\"valid\":true,\"rtNm\":\"김대표\",\"offNm\":\"강남부동산\"}}");
        var info = await new ServerApi("http://test.local", ok).GetReferralInfoAsync("A100001");
        Assert.Equal("김대표", info!.Str("rtNm"));
        Assert.Equal("강남부동산", info.Str("offNm"));
        Assert.EndsWith("/api/realestaters/referral-info?code=A100001", ok.Calls[0].Url);

        var bad = new Fake("{\"success\":false,\"error\":{\"code\":\"INVALID_REFERRAL\",\"message\":\"유효하지 않은 추천인 코드입니다.\"}}");
        Assert.Null(await new ServerApi("http://test.local", bad).GetReferralInfoAsync("X"));   // 코드 없음은 오류가 아니라 null
    }

    [Fact]
    public async Task 무료개월_내역은_이벤트와_보상만_센다()
    {
        var fake = new Fake("{\"success\":true,\"data\":{\"items\":[" +
            "{\"Kind\":\"REWARD\",\"Title\":\"추천인 혜택\",\"Qty\":1,\"Unit\":\"MONTH\",\"AddDays\":30,\"RegDt\":\"2026-10-20T09:00:00\"}," +
            "{\"Kind\":\"EVENT\",\"Title\":null,\"Qty\":5,\"Unit\":\"DAY\",\"AddDays\":0,\"RegDt\":\"2026-09-01T09:00:00\"}," +
            "{\"Kind\":\"JOIN\",\"Title\":\"기본 상품\",\"Qty\":1,\"Unit\":\"MONTH\",\"AddDays\":0,\"RegDt\":\"2026-08-01T09:00:00\"}]}}");
        var rows = await new ServerApi("http://test.local", fake).GetMembershipHistoryAsync(7);
        Assert.EndsWith("/api/admin/memberships/office/7/history", fake.Calls[0].Url);

        var items = FreeMonthsRules.Build(rows);
        Assert.Equal(new[] { "추천인 혜택", "이벤트" }, items.Select(i => i.Title));   // 상품 가입(JOIN)은 무료 혜택이 아니다
        Assert.Equal(new FreeMonthsRules.Item("2026-10-20", "추천인 혜택", 30, 1), items[0]);
        Assert.Equal(5, items[1].Days);                                                // 일수가 없으면 수량·단위로 환산
        Assert.Equal("1개월 5일", FreeMonthsRules.Summary(items.Sum(i => i.Days)));

        var none = new Fake("{\"success\":false,\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"없음\"}}");
        Assert.Empty(await new ServerApi("http://test.local", none).GetMembershipHistoryAsync(7));   // 0건은 오류가 아니다
    }

    [Fact]
    public async Task 최초실행_공유가_없으면_한번_켜고_완료로_기록()
    {
        var s = new AppSettings();
        Assert.True(FirstRunSetup.ShouldRun(s));
        var saved = 0;
        var enabled = new List<string>();
        var shared = false;
        var folder = Path.Combine(_dir, "Neosys");

        var r = await FirstRunSetup.RunAsync(s, folder, "tester", _ => Task.FromResult(shared),
            f => { enabled.Add(f); shared = true; return Task.FromResult<string?>(null); }, () => saved++);

        Assert.Equal(new FirstRunResult(true, null), r);
        Assert.Equal(new[] { folder }, enabled);
        Assert.True(Directory.Exists(BackupService.BackupFolder(folder, "tester")));
        Assert.False(FirstRunSetup.ShouldRun(s));
        Assert.Equal(1, saved);
    }

    [Fact]
    public async Task 최초실행_이미_공유돼_있으면_권한을_묻지_않음()
    {
        var called = false;
        var r = await FirstRunSetup.RunAsync(new AppSettings(), Path.Combine(_dir, "N"), "tester", _ => Task.FromResult(true),
            _ => { called = true; return Task.FromResult<string?>(null); }, () => { });
        Assert.True(r.Ready);
        Assert.False(called);
    }

    [Fact]
    public async Task 최초실행_취소_실패해도_다시_묻지_않고_이유를_돌려줌()
    {
        var s = new AppSettings();
        var r = await FirstRunSetup.RunAsync(s, Path.Combine(_dir, "N"), "tester", _ => Task.FromResult(false),
            _ => Task.FromResult<string?>("관리자 권한 확인 창에서 취소했습니다."), () => { });
        Assert.Equal(new FirstRunResult(false, "관리자 권한 확인 창에서 취소했습니다."), r);
        Assert.False(FirstRunSetup.ShouldRun(s));

        // 켰다고 했는데 확인이 안 되는 경우, 예외인 경우도 실패로 돌려준다
        r = await FirstRunSetup.RunAsync(new AppSettings(), Path.Combine(_dir, "N"), "tester", _ => Task.FromResult(false), _ => Task.FromResult<string?>(null), () => { });
        Assert.False(r.Ready);
        Assert.NotNull(r.Error);
        r = await FirstRunSetup.RunAsync(new AppSettings(), Path.Combine(_dir, "N"), "tester", _ => throw new IOException("읽기 실패"), _ => Task.FromResult<string?>(null), () => throw new IOException("저장 실패"));
        Assert.Equal("읽기 실패", r.Error);
    }
}

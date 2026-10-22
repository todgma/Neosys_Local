using System.Net;
using System.Text;
using System.Text.Json;
using Neosys.Local.Core.Server;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>
/// 사무실관리 허브(사무실정보·직원·가입비·상품가입) — 서버 API 요청 모양과 금액 규칙.
/// 가짜 HTTP 처리기만 쓰고 운영 서버·결제는 부르지 않는다.
/// </summary>
public class OfficeHubTests
{
    /// <summary>주소별로 응답을 고르는 가짜 처리기(요청 기록)</summary>
    private sealed class Fake(Func<HttpRequestMessage, string> respond) : HttpMessageHandler
    {
        public List<(HttpMethod Method, string Url, string? Body, string? ContentType)> Calls { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            string? body = null;
            if (request.Content is ByteArrayContent and not StringContent && request.Content.Headers.ContentType?.MediaType is "application/pdf" or "image/png")
                body = $"bytes:{(await request.Content.ReadAsByteArrayAsync(ct)).Length}";
            else if (request.Content is not null) body = await request.Content.ReadAsStringAsync(ct);
            Calls.Add((request.Method, request.RequestUri!.ToString(), body, request.Content?.Headers.ContentType?.MediaType));
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(respond(request), Encoding.UTF8, "application/json") };
        }
    }

    private static JsonElement Json(string s) => JsonDocument.Parse(s).RootElement;

    private static string? P(JsonElement o, string name) =>
        o.EnumerateObject().Where(p => string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase)).Select(p => p.Value.ToString()).FirstOrDefault();

    [Fact]
    public async Task 패스워드_변경_요청과_실패_문구()
    {
        var fake = new Fake(_ => "{\"success\":false,\"error\":{\"code\":\"CHANGE_PW_FAILED\",\"message\":\"현재 패스워드가 일치하지 않습니다.\"}}");
        var api = new ServerApi("http://test.local", fake);
        var ex = await Assert.ThrowsAsync<ServerApiException>(() => api.ChangePasswordAsync("boss", "old1", "new12"));
        Assert.Equal("현재 패스워드가 일치하지 않습니다.", ex.Message);
        var (m, url, body, _) = fake.Calls.Single();
        Assert.Equal(HttpMethod.Post, m);
        Assert.EndsWith("/api/realestaters/change-password", url);
        Assert.Equal("old1", P(Json(body!), "CurrentPw"));
        Assert.Equal("new12", P(Json(body!), "NewPw"));
    }

    [Fact]
    public async Task 가입비_상태_토큰_요청()
    {
        var fake = new Fake(r => r.RequestUri!.AbsolutePath.EndsWith("entry-fee")
            ? "{\"success\":true,\"data\":{\"paid\":true,\"paidDt\":\"2026-11-02T10:00:00\",\"amount\":165000}}"
            : "{\"success\":true,\"data\":{\"token\":\"abc+1/=\"}}");
        var api = new ServerApi("http://test.local", fake);
        var st = await api.GetEntryFeeAsync(100000010);
        Assert.Equal(true, st["paid"]);
        Assert.Equal(165000L, st.Long("amount"));
        Assert.EndsWith("/api/payments/entry-fee?offNo=100000010", fake.Calls[0].Url);

        var token = await api.IssuePaymentTokenAsync(300000016);
        Assert.Equal("abc+1/=", token);
        Assert.EndsWith("/api/realestaters/payment-token", fake.Calls[1].Url);
        Assert.Equal("300000016", P(Json(fake.Calls[1].Body!), "RtNo"));
        // 결제 페이지 주소: 토큰은 주소용으로 인코딩, 프로그램 안 결제창은 auto=1
        Assert.Equal("https://neosis.kr/payment?autologin=abc%2B1%2F%3D&auto=1", EntryFeeRules.PaymentUrl(token, inApp: true));
        Assert.Equal("https://neosis.kr/payment", EntryFeeRules.PaymentUrl(null, inApp: true));
    }

    [Fact]
    public void 가입비_결제_오픈일과_결과_판정()
    {
        // 테스트 결제를 위해 11/01 제한 해제(2026-10-21) — 오늘도 결제 가능
        var kst = TimeSpan.FromHours(9);
        Assert.True(EntryFeeRules.IsPayOpen(new DateTimeOffset(2026, 10, 21, 9, 0, 0, kst)));
        Assert.True(EntryFeeRules.IsPayOpen(new DateTimeOffset(2026, 11, 1, 0, 0, 0, kst)));
        Assert.Equal("success", EntryFeeRules.ResultFromTitle("결제 완료 NEOSIS_PAYMENT_DONE"));
        Assert.Equal("fail", EntryFeeRules.ResultFromTitle("NEOSIS_PAYMENT_FAIL"));
        Assert.Null(EntryFeeRules.ResultFromTitle("토스페이먼츠"));
        Assert.Null(EntryFeeRules.ResultFromTitle(null));
    }

    private static List<Row> Products() => new()
    {
        new() { ["prodId"] = 1L, ["prodName"] = "베이직", ["pcCnt"] = 1L, ["mobCnt"] = 1L, ["price"] = 30000L },
        new() { ["prodId"] = 2L, ["prodName"] = "스탠다드", ["pcCnt"] = 2L, ["mobCnt"] = 2L, ["price"] = 50000L },
        new() { ["prodId"] = 8L, ["prodName"] = "추가 요금", ["pcCnt"] = 0L, ["mobCnt"] = 0L, ["price"] = 9900L },
        new() { ["prodId"] = 9L, ["prodName"] = "기본요금", ["pcCnt"] = 0L, ["mobCnt"] = 0L, ["price"] = 0L },
    };

    [Fact]
    public void 상품_목록과_추가요금_분리()
    {
        var (plans, addFee) = MembershipPricing.Split(Products());
        Assert.Equal(new[] { "베이직", "스탠다드" }, plans.Select(p => p.ProdName));   // '추가 요금'·'기본요금' 숨김(공백 무시)
        Assert.Equal(9900, addFee);
        Assert.Equal(4, plans[1].Devices);
    }

    [Fact]
    public void 금액_계산_초과대수와_부가세()
    {
        var (plans, addFee) = MembershipPricing.Split(Products());
        var basic = plans[0];
        var q = MembershipPricing.Calc(basic, 1, 1, addFee);
        Assert.Equal((2, 0, 0L, 30000L, 33000L, "베이직"), (q.Total, q.Extra, q.ExtraFee, q.Grand, q.GrandWithVat, q.PlanLabel));

        var over = MembershipPricing.Calc(basic, 2, 3, addFee);   // 5대 = 기본 2 + 추가 3
        Assert.Equal(3, over.Extra);
        Assert.Equal(29700, over.ExtraFee);
        Assert.Equal(59700, over.Grand);
        Assert.Equal(65670, over.GrandWithVat);                   // 59,700 + 5,970
        Assert.Equal("베이직 +@", over.PlanLabel);
        Assert.Equal("베이직 +@ · 기기 5대(PC2/모바일3) · 추가3대 · 합계 65,670원(부가세포함)", MembershipPricing.Memo(over, 2, 3));
        Assert.Equal(5, MembershipPricing.Vat(45));                // 4.5 → 5(반올림)
    }

    [Fact]
    public async Task 상품가입_요청()
    {
        var fake = new Fake(r => r.Method == HttpMethod.Get
            ? "{\"success\":true,\"data\":{\"items\":[{\"prodId\":1,\"prodName\":\"베이직\",\"pcCnt\":1,\"mobCnt\":1,\"price\":30000}]}}"
            : "{\"success\":true,\"data\":{\"updated\":true}}");
        var api = new ServerApi("http://test.local", fake);
        Assert.Single(await api.GetMembershipProductsAsync());
        await api.SubscribeMembershipAsync(100000010, 1, "베이직 · 기기 2대(PC1/모바일1) · 합계 33,000원(부가세포함)", "boss");
        var (m, url, body, _) = fake.Calls[1];
        Assert.Equal(HttpMethod.Put, m);
        Assert.EndsWith("/api/admin/memberships/office/100000010", url);
        Assert.Equal("1", P(Json(body!), "ProdId"));
        Assert.Equal("boss", P(Json(body!), "UserId"));
        Assert.StartsWith("베이직", P(Json(body!), "Memo"));
    }

    [Fact]
    public async Task 증빙파일_목록_삭제_올리기()
    {
        var fake = new Fake(r =>
        {
            var path = r.RequestUri!.AbsolutePath;
            if (r.RequestUri.Host == "storage.test") return "";
            if (path.EndsWith("/presign")) return "{\"success\":true,\"data\":{\"objectKey\":\"files/biz.pdf\",\"uploadUrl\":\"https://storage.test/put?sig=1\"}}";
            if (r.Method == HttpMethod.Post) return "{\"success\":true,\"data\":{\"fileId\":77}}";
            if (r.Method == HttpMethod.Get) return "{\"success\":true,\"data\":{\"items\":[{\"fileId\":5,\"origName\":\"사업자등록증.pdf\",\"objectKey\":\"k\"}]}}";
            return "{\"success\":true,\"data\":{\"deleted\":true}}";
        });
        var api = new ServerApi("http://test.local", fake);
        var files = await api.ListFilesAsync("SYFTY05", "SYFDV03", "100000010");
        Assert.Equal("사업자등록증.pdf", files.Single().Str("origName"));
        Assert.EndsWith("/api/files?fileTyp=SYFTY05&fileDiv=SYFDV03&refKey=100000010", fake.Calls[0].Url);

        await api.DeleteFileAsync(5, "boss");
        Assert.Equal(HttpMethod.Delete, fake.Calls[1].Method);
        Assert.EndsWith("/api/files/5?userId=boss", fake.Calls[1].Url);

        var id = await api.UploadFileAsync("SYFTY05", "SYFDV03", "100000010", "biz.PDF", new byte[1234], "application/pdf", "boss");
        Assert.Equal(77, id);
        Assert.EndsWith("/api/files/presign", fake.Calls[2].Url);
        Assert.Equal((HttpMethod.Put, "https://storage.test/put?sig=1", "bytes:1234", "application/pdf"), fake.Calls[3]);   // 스토리지로 직접
        var reg = Json(fake.Calls[4].Body!);
        Assert.Equal("files/biz.pdf", P(reg, "ObjectKey"));
        Assert.Equal("pdf", P(reg, "Ext"));
        Assert.Equal("1234", P(reg, "FileSize"));
        Assert.Equal("100000010", P(reg, "RefKey"));

        // 10MB 초과는 서버를 부르기 전에 막는다
        var before = fake.Calls.Count;
        await Assert.ThrowsAsync<ServerApiException>(() => api.UploadFileAsync("SYFTY05", "SYFDV03", "1", "big.pdf", new byte[ServerApi.MaxUploadBytes + 1], "application/pdf", "boss"));
        Assert.Equal(before, fake.Calls.Count);
    }
}

using System.Net;
using System.Text;
using System.Text.Json;
using Neosys.Local.Core.Server;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>사무소·직원 정보 변경 API — 가짜 HTTP 처리기로 요청(메서드·주소·본문)만 확인한다. 운영 서버는 부르지 않는다.</summary>
public class ServerApiWriteTests
{
    private sealed class Fake(string response) : HttpMessageHandler
    {
        public List<(HttpMethod Method, string Url, string? Body)> Calls { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls.Add((request.Method, request.RequestUri!.PathAndQuery, request.Content is null ? null : await request.Content.ReadAsStringAsync(ct)));
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(response, Encoding.UTF8, "application/json") };
        }
    }

    private const string Ok = "{\"success\":true,\"data\":null}";

    /// <summary>JSON 속성(대소문자 무시 — 서버 모델 바인딩과 같다)</summary>
    private static JsonElement? Prop(JsonElement o, string name) =>
        o.EnumerateObject().Where(p => string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase)).Select(p => (JsonElement?)p.Value).FirstOrDefault();

    [Fact]
    public async Task 사무소_수정_요청()
    {
        var fake = new Fake(Ok);
        var api = new ServerApi("http://test.local", fake);
        await api.UpdateOfficeAsync(3, new Row { ["OffNm"] = "네오공인중개사", ["RpsNm"] = "홍대표", ["OffTel"] = "02-555-0000" }, "boss");
        var (method, url, body) = fake.Calls.Single();
        Assert.Equal(HttpMethod.Put, method);
        Assert.Equal("/api/office/3", url);
        var json = JsonDocument.Parse(body!).RootElement;
        Assert.Equal("네오공인중개사", Prop(json, "OffNm")!.Value.GetString());
        Assert.Equal("boss", Prop(json, "UserId")!.Value.GetString());
    }

    [Fact]
    public async Task 직원_등록_수정_삭제_요청()
    {
        var fake = new Fake(Ok);
        var api = new ServerApi("http://test.local", fake);
        await api.CreateRealtorAsync(3, new Row { ["rtNm"] = "김직원", ["id"] = "kim", ["pw"] = "1234" }, "boss");
        await api.UpdateRealtorAsync(9, new Row { ["rtNm"] = "김직원", ["email"] = null }, "boss");
        await api.DeleteRealtorAsync(9, "boss");

        Assert.Equal(HttpMethod.Post, fake.Calls[0].Method);
        Assert.Equal("/api/realestaters", fake.Calls[0].Url);
        var created = JsonDocument.Parse(fake.Calls[0].Body!).RootElement;
        Assert.Equal("RTTYP02", Prop(created, "RtType")!.Value.GetString());   // 기본 = 소속공인중개사
        Assert.Equal(3, Prop(created, "OffNo")!.Value.GetInt32());

        Assert.Equal(HttpMethod.Put, fake.Calls[1].Method);
        Assert.Equal("/api/realestaters/9", fake.Calls[1].Url);
        var updated = JsonDocument.Parse(fake.Calls[1].Body!).RootElement;
        Assert.False(Prop(updated, "Pw").HasValue);                    // 비밀번호는 입력했을 때만
        Assert.Equal("", Prop(updated, "Email")!.Value.GetString());           // 비우기 허용
        Assert.False(Prop(updated, "RtTel").HasValue);                 // null 값은 보내지 않음

        Assert.Equal(HttpMethod.Delete, fake.Calls[2].Method);
        Assert.Equal("/api/realestaters/9?userId=boss", fake.Calls[2].Url);
    }

    [Fact]
    public async Task 서버_오류는_메시지로()
    {
        var api = new ServerApi("http://test.local", new Fake("{\"success\":false,\"error\":{\"code\":\"DUP\",\"message\":\"이미 사용 중인 아이디입니다.\"}}"));
        var ex = await Assert.ThrowsAsync<ServerApiException>(() => api.CreateRealtorAsync(3, new Row { ["rtNm"] = "a", ["id"] = "a", ["pw"] = "1234" }, "boss"));
        Assert.Equal("이미 사용 중인 아이디입니다.", ex.Message);
    }
}

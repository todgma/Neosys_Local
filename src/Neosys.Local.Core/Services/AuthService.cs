using Neosys.Local.Core.Server;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>
/// 서버 계정 로그인. 서버가 확인한 중개사·사무소 정보를 로컬 rt_realtor_info / ofc_realter_office에 저장(비밀번호 제외)하고
/// 세션을 만든다. 로컬 데이터는 이 세션의 RtNo·OffNo로 저장·조회한다.
/// 로컬 DB는 계정별이라 로그인 전에는 없다 — 서버 확인 후 openLocal로 그 계정 DB를 연 다음 저장한다.
/// </summary>
public sealed class AuthService
{
    private readonly ServerApi _server;
    private readonly Func<SpRunner> _spAccessor;
    private SpRunner _sp => _spAccessor();

    /// <param name="sp">현재 계정 DB의 SpRunner(로그인 후 계정 DB를 열면 바뀌므로 호출 시점에 가져온다)</param>
    public AuthService(ServerApi server, Func<SpRunner> sp)
    {
        _server = server;
        _spAccessor = sp;
    }

    /// <summary>사무소 정보를 서버에서 다시 받아 로컬(ofc_realter_office)에 반영 — 사무소 정보 수정 후</summary>
    public async Task RefreshOfficeAsync(AppSession session)
    {
        var office = await _server.GetUserOfficeAsync(session.UserId);
        if (office is null || office.Long("offNo") is null) return;
        office["session_user_id"] = session.UserId;
        await _sp.ExecuteAsync("ofc_realter_office", "UPSERT", office);
        session.OffNm = office.Str("offNm");
        session.Greeting = office.Str("greeting");
    }

    /// <param name="openLocal">서버 로그인 성공 직후, 로컬 저장 전에 호출 — 그 계정의 로컬 DB를 연다</param>
    public async Task<AppSession> LoginAsync(string id, string pw, Func<AppSession, Task>? openLocal = null)
    {
        if (string.IsNullOrWhiteSpace(id) || string.IsNullOrEmpty(pw))
            throw new ServerApiException("아이디와 비밀번호를 입력해 주세요.");

        var rt = await _server.LoginAsync(id.Trim(), pw);
        var rtNo = rt.Long("rtNo") ?? throw new ServerApiException("로그인 응답에 중개사 번호가 없습니다.");
        rt["id"] ??= id.Trim();

        var session = new AppSession
        {
            RtNo = rtNo,
            OffNo = rt.Long("offNo"),
            UserId = rt.Str("id")!,
            RtNm = rt.Str("rtNm"),
            RtType = rt.Str("rtType"),
            Grade = rt.Str("grade"),
            ReferralCode = rt.Str("referralCode"),
        };

        if (openLocal is not null) await openLocal(session);
        await _sp.ExecuteAsync("rt_realtor_info", "UPSERT", rt);

        var office = await _server.GetUserOfficeAsync(session.UserId);
        if (office is not null && office.Long("offNo") is not null)
        {
            office["session_user_id"] = session.UserId;
            await _sp.ExecuteAsync("ofc_realter_office", "UPSERT", office);
            session.OffNm = office.Str("offNm");
            session.Greeting = office.Str("greeting");
        }

        // 직원(대표 외) 메뉴 권한 — 서버 설정값을 받고 로컬 rt_menu_perm에도 남긴다. 서버 조회 실패 시 로컬 값 사용
        if (!session.IsOwner)
        {
            List<string> keys;
            try
            {
                keys = await _server.GetStaffMenuPermAsync(rtNo);
                await _sp.ExecuteAsync("rt_menu_perm", "DEL", new { rt_no = rtNo });
                foreach (var k in keys.Distinct())
                    await _sp.ExecuteAsync("rt_menu_perm", "INS", new { rt_no = rtNo, menu_key = k, session_user_id = session.UserId });
            }
            catch (ServerApiException)
            {
                keys = await _sp.QueryAsync<string>("rt_menu_perm", "SEL", new { rt_no = rtNo });
            }
            session.AllowedMenus = keys.ToHashSet();
        }
        return session;
    }
}

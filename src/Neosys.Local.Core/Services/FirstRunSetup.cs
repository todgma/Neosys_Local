namespace Neosys.Local.Core.Services;

/// <summary>최초 실행 공유 설정 결과 — Ready: 다른 PC가 들어올 수 있는 상태, Error: 켜지 못한 이유</summary>
public sealed record FirstRunResult(bool Ready, string? Error);

/// <summary>
/// 이 PC에서 처음 로그인할 때 한 번 — Neosys 폴더·내 백업 폴더를 만들고 네트워크 공유를 켠다. 이미 공유돼 있으면 관리자 권한을 묻지 않는다.
/// 실패하거나 취소해도 다시 묻지 않는다(완료로 기록) — 공유 정보 창과 DB 관리에서 다시 켤 수 있다. 네트워크 종류(공용/개인)는 자동으로 바꾸지 않는다.
/// </summary>
public static class FirstRunSetup
{
    public static bool ShouldRun(AppSettings settings) => !settings.FirstRunSetupDone;

    /// <param name="isReady">폴더가 네트워크에 공유돼 있는지 확인</param>
    /// <param name="enable">공유 켜기(관리자 권한 확인). null = 성공, 그 외 = 오류 문구</param>
    /// <param name="save">설정 파일 저장</param>
    public static async Task<FirstRunResult> RunAsync(AppSettings settings, string folder, string userId,
        Func<string, Task<bool>> isReady, Func<string, Task<string?>> enable, Action save)
    {
        FirstRunResult result;
        try
        {
            Directory.CreateDirectory(BackupService.BackupFolder(folder, userId));
            if (await isReady(folder)) result = new(true, null);
            else
            {
                var error = await enable(folder);
                result = error is not null ? new(false, error)
                    : await isReady(folder) ? new(true, null)
                    : new(false, "공유 설정 후에도 공유가 확인되지 않았습니다.");
            }
        }
        catch (Exception ex) { result = new(false, ex.Message); }

        settings.FirstRunSetupDone = true;
        try { save(); } catch { /* 저장 못 하면 다음 실행 때 다시 시도할 뿐 */ }
        return result;
    }
}

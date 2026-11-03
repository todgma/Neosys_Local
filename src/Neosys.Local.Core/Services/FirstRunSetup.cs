namespace Neosys.Local.Core.Services;

/// <summary>최초 실행 공유 설정 결과 — Ready: 다른 PC가 들어올 수 있는 상태, Error: 켜지 못한 이유</summary>
public sealed record FirstRunResult(bool Ready, string? Error);

/// <summary>최초 실행 공유 설정 단계 — 진행 창 표시용</summary>
public enum FirstRunStep { Folder, Check, Enable, Verify, Done }

/// <summary>
/// 이 PC에서 처음 로그인할 때 한 번 — Neosys 폴더·내 백업 폴더를 만들고 네트워크 공유를 켠다. 이미 공유돼 있으면 관리자 권한을 묻지 않는다.
/// 끝날 때까지 진행 창이 메인 프로그램을 막는다(FirstRunWindow). 공유 켜기가 제한 시간 안에 끝나지 않으면 기다리지 않고 실패로 돌려준다.
/// 실패하거나 취소해도 다시 묻지 않는다(완료로 기록) — 공유 정보 창과 DB 관리에서 다시 켤 수 있다. 네트워크 종류(공용/개인)는 자동으로 바꾸지 않는다.
/// </summary>
public static class FirstRunSetup
{
    /// <summary>공유 켜기(관리자 권한 확인 창 포함)를 기다리는 최대 시간</summary>
    public static readonly TimeSpan EnableTimeout = TimeSpan.FromMinutes(3);

    public static bool ShouldRun(AppSettings settings) => !settings.FirstRunSetupDone;

    /// <param name="isReady">폴더가 네트워크에 공유돼 있는지 확인</param>
    /// <param name="enable">공유 켜기(관리자 권한 확인). null = 성공, 그 외 = 오류 문구</param>
    /// <param name="save">설정 파일 저장</param>
    /// <param name="onStep">단계가 바뀔 때(진행 창 표시)</param>
    /// <param name="enableTimeout">공유 켜기를 기다리는 최대 시간(기본 EnableTimeout)</param>
    public static async Task<FirstRunResult> RunAsync(AppSettings settings, string folder, string userId,
        Func<string, Task<bool>> isReady, Func<string, Task<string?>> enable, Action save,
        Action<FirstRunStep>? onStep = null, TimeSpan? enableTimeout = null)
    {
        FirstRunResult result;
        try
        {
            onStep?.Invoke(FirstRunStep.Folder);
            Directory.CreateDirectory(BackupService.BackupFolder(folder, userId));
            onStep?.Invoke(FirstRunStep.Check);
            if (await isReady(folder)) result = new(true, null);
            else
            {
                onStep?.Invoke(FirstRunStep.Enable);
                var task = enable(folder);
                var limit = enableTimeout ?? EnableTimeout;
                if (await Task.WhenAny(task, Task.Delay(limit)) != task)
                    result = new(false, $"공유 설정이 {limit.TotalMinutes:0}분 안에 끝나지 않았습니다.");
                else
                {
                    var error = await task;
                    onStep?.Invoke(FirstRunStep.Verify);
                    result = error is not null ? new(false, error)
                        : await isReady(folder) ? new(true, null)
                        : new(false, "공유 설정 후에도 공유가 확인되지 않았습니다.");
                }
            }
        }
        catch (Exception ex) { result = new(false, ex.Message); }

        settings.FirstRunSetupDone = true;
        try { save(); } catch { /* 저장 못 하면 다음 실행 때 다시 시도할 뿐 */ }
        onStep?.Invoke(FirstRunStep.Done);
        return result;
    }
}

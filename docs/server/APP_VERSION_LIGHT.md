# 로컬(라이트) 버전 관리 — 서버 변경안

네오시스 로컬(WPF 단일 exe)의 자동 업데이트용. 원본 프로그램(`app_version`, `GET /api/version/latest`)과 분리해
**`app_version_light` 테이블 + `GET /api/version/light/latest`** 로 관리한다(2026-10-23 사용자 결정).

이 저장소에는 서버 코드가 없다(`legacy/API`는 참고용 사본, 수정 금지). 아래 변경은 **서버 저장소(RealestateAPI)에서 직접** 반영·배포한다.
운영 DB에 대한 DDL도 관리자가 직접 실행한다 — 로컬 프로젝트 작업에서는 운영 DB에 쓰지 않는다.

## 1. DB — `docs/server/app_version_light.sql`

- `app_version`과 같은 컬럼: `version_id`(자체 시퀀스) · `platform`(기본 `win`) · `version` · `download_url` · `mandatory_yn` · `release_note` · `is_active` · `reg_dt`
- 인덱스 `(platform, is_active, reg_dt DESC)` — 최신 1건 조회용
- 파일 끝에 배포(INSERT)·회수(`is_active = FALSE`) 예시

## 2. API — 기존 `AppVersion` 모듈에 추가

응답 모양은 기존 `/api/version/latest`와 **똑같이** 한다(로컬 앱이 같은 해석기로 읽는다).

```
GET /api/version/light/latest?platform=win
200 { "success": true, "data": { "version": "0.2.0", "downloadUrl": "https://…/Neosys-0.2.0.exe",
                                 "mandatory": false, "releaseNote": "…", "platform": "win" }, "message": "…" }
등록된 버전이 없으면 data = null (오류 아님)
```

### `AppVersion/Services/VersionService.cs`

```csharp
public interface IVersionService
{
    Task<AppVersionInfo?> GetLatestVersion(string platform);
    Task<AppVersionInfo?> GetLatestLightVersion(string platform);   // 추가
}

// VersionService 클래스에 추가 — GetLatestVersion과 같고 테이블만 app_version_light
public async Task<AppVersionInfo?> GetLatestLightVersion(string platform)
{
    const string sql = @"
        SELECT version_id, platform, version, download_url,
               mandatory_yn, release_note, is_active, reg_dt
        FROM public.app_version_light
        WHERE is_active = TRUE
          AND (@platform IS NULL OR platform = @platform)
        ORDER BY reg_dt DESC
        LIMIT 1;";

    var parameters = new List<NpgsqlParameter>
    {
        new NpgsqlParameter("@platform", NpgsqlDbType.Varchar)
        {
            Value = string.IsNullOrWhiteSpace(platform) ? (object)DBNull.Value : platform
        }
    };

    var rows = await _dataService.QueryAsyncPg<AppVersionInfo>("DEV", sql, parameters);
    return rows?.FirstOrDefault();
}
```

### `AppVersion/Controllers/VersionController.cs`

```csharp
/// <summary>
/// 로컬(라이트) 프로그램 최신 버전 조회 (자동 업데이트용)
/// GET /api/version/light/latest?platform=win
/// </summary>
[HttpGet("light/latest")]
public async Task<IActionResult> GetLightLatest([FromQuery] string platform = "win")
{
    var info = await _service.GetLatestLightVersion(platform);
    if (info == null)
        return Ok(ResponseHelper.Success(null, "등록된 버전 정보가 없습니다."));

    var result = new
    {
        version = info.Version,
        downloadUrl = info.DownloadUrl,
        mandatory = info.MandatoryYn == 'Y',
        releaseNote = info.ReleaseNote,
        platform = info.Platform,
    };
    return Ok(ResponseHelper.Success(result, "최신 버전 조회 성공"));
}
```

`Program.cs`의 DI 등록(`IVersionService` → `VersionService`)은 그대로 둔다. 로그인 없이 부르는 API이므로 인증 미들웨어가 있다면 `/api/version/latest`와 같은 예외에 넣는다.

### 확인

```bash
curl "https://api.neosis.kr/api/version/light/latest?platform=win"
```
테이블이 비어 있으면 `data: null` — 로컬 앱은 이때 업데이트 없이 시작한다.

## 3. 배포 순서(새 로컬 버전을 낼 때)

1. `src/NeosysLight/NeosysLight.csproj`의 `<Version>`을 올린다(예 `0.1.0` → `0.2.0`).
2. `dotnet publish src/NeosysLight -p:PublishProfile=SingleFile` → `NeosysLight.exe`
3. exe를 내려받기 주소(https, 로그인 없이 받을 수 있는 곳)에 올린다. 파일 이름에 버전을 넣으면 캐시 문제가 없다(`Neosys-0.2.0.exe`).
4. `app_version_light`에 INSERT(`version` = 2의 버전, `download_url` = 3의 주소, 필수면 `mandatory_yn = 'Y'`).
5. 사용자가 프로그램을 켜면 로그인 전에 새 버전을 받아 교체하고 다시 실행한다(`docs/ARCHITECTURE.md` "자동 업데이트").

회수: 문제가 있으면 `is_active = FALSE` — 그 전 버전 행이 다시 최신이 된다(이미 받은 PC는 그대로).

# Neosys Local

네오시스 부동산 ERP의 로컬(단일 PC) 버전. WPF + SQLite, 단일 exe 배포.
로그인은 서버 계정으로 하고, 물건·고객·계약 등 업무 데이터는 이 PC의 SQLite(`%LOCALAPPDATA%\Neosys\neosis_local.db`)에 저장한다.

- 작업 지침과 확정된 결정: [CLAUDE.md](CLAUDE.md)
- 구조·SQL 규칙·데이터 흐름: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 메뉴별 이관 현황·남은 일: [docs/PLAN.md](docs/PLAN.md)
- DB 스키마·시드 추출: [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md)
- 기존 시스템 구조와 알려진 문제: [docs/LEGACY.md](docs/LEGACY.md)

## 요구 환경

- Windows 10/11, .NET SDK 8 이상(개발 시). 배포 exe는 .NET 설치 없이 실행된다.
- 로그인·법정동/단지 조회: 인터넷 연결(운영 서버 API)
- 스키마·시드 재추출: VPN 연결(운영 PostgreSQL, 읽기 전용)

## 빠른 시작

```bash
dotnet build src/Neosys.Local.sln
dotnet test src/Neosys.Local.Tests
dotnet run --project src/Neosys.Local.App
dotnet publish src/Neosys.Local.App -p:PublishProfile=SingleFile
```

마지막 명령의 결과는 `publish/Neosys.exe` 하나다(게시 프로필 `src/Neosys.Local.App/Properties/PublishProfiles/SingleFile.pubxml`, Visual Studio에서는 프로젝트 우클릭 → 게시 → SingleFile).
처음 실행하면 `%LOCALAPPDATA%\Neosys\neosis_local.db`가 자동으로 만들어진다(테이블·공통코드·계약서 서식이 exe 안에 포함, 별도 설치 없음).

# Neosys Local — 작업 지침

네오시스(부동산 중개 ERP)를 **PC 한 대에서 동작하는 로컬 버전**으로 다시 만드는 프로젝트다.
기존 시스템(React/Electron 프런트 + ASP.NET Core API + 운영 PostgreSQL)은 `legacy/`에 참고용으로 복사해 두었고,
새 코드는 `src/`에 작성한다.

## 확정된 결정 (2026-10-19, 사용자 결정)

| 항목 | 결정 |
| --- | --- |
| 프런트 | **WPF (C#, .NET 8)** 로 새로 작성. 기존 React 화면·동작을 기준으로 재구현 |
| 배포 | 빌드 결과는 **exe 파일 1개** (self-contained single-file publish) |
| 로컬 DB | **SQLite**. 운영 PostgreSQL 스키마를 그대로 옮겨 생성 |
| CRUD | 로컬 화면은 API를 거치지 않고 **SQLite에 직접** CRUD |
| SP | SQLite에는 SP가 없으므로 **SP 이름별 SQL 파일**을 만들고 C#에서 이름으로 호출. 기존 함수는 `pr_proc`(SEL/INS/UPD/DEL) 모드 구조라 `Sql/Procs/<sp이름>.<모드>.sql`로 나눈다 |
| API | ~~기존 API도 함께 빌드~~ → **솔루션에서 제외**(2026-10-19 변경). 서버 기능은 운영 서버 API(`https://api.neosis.kr`)를 HTTP로 호출 |
| 서버 API 용도 | 로그인(서버 계정), 서버 공용 데이터 조회(법정동·단지), 공동중개망 데이터 전송(추후) |
| 이관 범위 | **로컬 업무 메뉴만**: 물건·고객·계약·일정·메모·상담·업무일지·협력업체·만기·직원/권한·보고서·통합검색. 공동중개망·쪽지·고객센터·대량문자·PC폰은 제외(필요 시 서버 API). 가입비 결제·상품가입은 2026-10-21 사무실관리 허브로 이관(서버 API + 웹 결제창). 공지·이벤트·커뮤니티는 2026-10-21 서버 API 조회 화면으로 이관(커뮤니티 글쓰기는 미이관) |
| 첨부파일 | 사진·평면도·계약 첨부는 이 PC `%LOCALAPPDATA%\Neosys\files`에 저장, `sys_file`에 기록(2026-10-19 결정) |
| 기준 데이터 | 공통코드(`sys_code_*`)는 로컬 DB에 시드로 포함. 법정동·단지는 서버 API로 조회 |
| 스키마 출처 | 운영 DB를 **읽기 전용**으로 조회해 추출 (`tools/SchemaExport`) |
| 이름 | 프로젝트·게시 exe는 **NeosysLight**(2026-11-03). 코드 네임스페이스(`Neosys.Local.*`), Core·Data·Tests 프로젝트, 데이터 폴더(`%LOCALAPPDATA%\Neosys`), 네트워크 공유 이름(`Neosys`)은 기존 이름 유지(바꾸면 기존 데이터·백업과 끊어짐) |
| Git | 저장소 `https://github.com/todgma/Neosys_Local` (사용자가 생성). **커밋·푸시는 사용자가 직접** — 요청 없이 하지 말 것 |

해석이 필요한 부분과 열린 질문은 `docs/ARCHITECTURE.md`의 "열린 질문"에 모아 둔다. 추측으로 진행하지 말고 사용자에게 확인한다.

## 폴더 구조

```
Neosys_Local/
├─ CLAUDE.md                 이 파일
├─ README.md                 빠른 시작
├─ docs/
│  ├─ ARCHITECTURE.md        솔루션 구조·데이터 흐름·SP 대체 방식·열린 질문
│  ├─ PLAN.md                단계별 작업 계획과 진행 체크리스트
│  ├─ DB_SCHEMA.md           스키마 추출·변환 방법과 현재 상태
│  ├─ DB_UPDATE.md           로컬 DB 업데이트(마이그레이션·Procs 수정·첫 실행 적용 순서)
│  └─ LEGACY.md              기존 시스템 구조(메뉴·API·SQL)와 알려진 문제
├─ legacy/                   기존 소스 복사본(읽기 전용 참고용, 수정 금지)
│  ├─ front/                 React + Electron 프런트
│  ├─ API/                   ASP.NET Core 8 API (RealestateAPI) — 서버 측, 로컬 솔루션에 포함하지 않음
│  └─ ADMIN/                 Next.js 관리자 웹
├─ tools/SchemaExport/       운영 PG → schema/ 추출 + SQLite DDL 변환 + 공통코드 시드 추출 도구
├─ schema/                   추출 결과(자동 생성, 직접 수정 금지)
└─ src/
   ├─ NeosysLight.sln
   ├─ Neosys.Local.Core/     도메인 모델, 서비스(메뉴별), 서버 API 클라이언트, 공통 유틸
   ├─ Neosys.Local.Data/     SQLite 연결·DB 생성·이력 트리거·SpRunner·Row, Sql/Procs/*.sql(임베디드)
   ├─ NeosysLight/      WPF 화면 — Ui/(공통 부품), Views/<메뉴>/ — 단일 exe(NeosysLight.exe) 시작 프로젝트
   └─ Neosys.Local.Tests/    서비스·SQL 테스트(임시 SQLite 파일)
```

## 작업 규칙

- **운영 DB에 쓰기 금지.** 스키마 추출은 `tools/SchemaExport`(세션 `default_transaction_read_only=on` + `READ ONLY` 트랜잭션)로만 한다. 운영 API(`https://api.neosis.kr`)로 데이터를 만들거나 지우는 테스트도 사용자 허락 없이 하지 않는다.
- **비밀값 커밋 금지.** `legacy/API/appsettings.json`에는 운영 DB 비밀번호가 들어 있다. 새 코드는 연결 문자열을 `appsettings.Local.json`(git 제외) 또는 환경변수 `NEOSIS_PG`에서 읽는다.
- `legacy/`는 참고용이다. 동작을 확인하거나 SQL을 옮길 때 읽기만 하고 고치지 않는다.
- `schema/`는 `tools/SchemaExport`가 만드는 결과물이다. 손으로 고치지 말고 도구를 고쳐서 다시 생성한다.
- UI 문구·메시지·주석은 한국어로 쓴다(기존 시스템과 동일).
- 날짜의 "오늘"은 **로컬 시간 기준**으로 만든다(`DateTime.Today`). 기존 프런트는 `toISOString()`(UTC) 때문에 오전 9시 전 하루 전 날짜가 들어가는 버그가 있었다 — 재현하지 말 것.
- 등록 후에는 **새 키(ID)를 반환받아 수정 모드로 전환**한다. 기존 물건·고객 등록 창은 키를 반환하지 않아 재저장 시 중복 생성되는 버그가 있었다.
- 빈 목록은 오류가 아니다. 결과 0건은 빈 리스트로 반환한다(기존 API는 400 NOT_FOUND로 응답).
- SQL은 `Sql/Procs/<SP>.<모드>.sql` 파일에만 쓴다(C# 코드에 SQL 문자열 금지 — DB 생성·트리거 설치 제외). 파라미터 이름 = DB 컬럼 이름,
  검색 조건 `@q_…`, 세션 `@session_…`. 파일 머리에 `-- from legacy/...` 원본 위치. 규칙 상세는 `docs/ARCHITECTURE.md`.
- 새 메뉴 기능은 서비스(Core) + SQL + 테스트(Tests)를 함께 만든다. 화면은 `Ui/` 공통 부품(FormBuilder·ListPage·EditWindow)을 쓴다.
- 개발 중 화면 확인은 디버그 빌드 스냅샷(`--snapshot`)으로 한다 — 운영 서버를 부르지 않는다. 실제 로그인은 사용자가 한다(비밀번호 입력 금지).

## 자주 쓰는 명령

```bash
# 스키마 다시 추출 (VPN 연결 필요 — docs/DB_SCHEMA.md 참고)
dotnet run --project tools/SchemaExport -- .

# 빌드 / 테스트 / 실행
dotnet build src/NeosysLight.sln
dotnet test src/Neosys.Local.Tests
dotnet run --project src/NeosysLight

# 단일 exe 배포 → D:\Source\Release\NeosysLight\NeosysLight.exe (게시 프로필 Properties/PublishProfiles/SingleFile.pubxml — VS에서는 우클릭 → 게시)
dotnet publish src/NeosysLight -p:PublishProfile=SingleFile

# 화면 캡처(디버그 빌드 전용, 테스트 세션·견본 데이터, 서버 호출 없음)
NEOSYS_DB=<임시.db> src/NeosysLight/bin/Debug/net8.0-windows/NeosysLight.exe --snapshot property out.png first

# 버튼 전체 점검(디버그 빌드 전용, 점검용 DB 사본 사용 — 결과는 docs/BUTTON_AUDIT.md 형식)
NEOSYS_DB=<점검용.db> src/NeosysLight/bin/Debug/net8.0-windows/NeosysLight.exe --audit audit.txt [메뉴키]

# 화면 등록·삭제 점검(디버그 빌드 전용, 빈 점검용 DB — 메뉴마다 3건 등록·1건 삭제, 결과는 docs/CRUD_AUDIT.md 형식)
NEOSYS_DB=<점검용.db> NEOSYS_FILES=<임시폴더> src/NeosysLight/bin/Debug/net8.0-windows/NeosysLight.exe --crud crud.txt [메뉴키]
```

## 현재 상태

`docs/PLAN.md`가 기준이다. 2026-10-19 기준: 솔루션·로컬 DB·단일 exe 완료, 로컬 메뉴 11개 이관(물건·고객·계약·일정·상담·
협력업체·만기·업무일지·메모·통합검색·사무소/직원), 첨부파일(로컬 폴더), 테스트 32건 통과. 남은 큰 일은 계약 부속문서 서식 화면(별도 세션 진행),
보고서, 배치도/입주현황, 엑셀 일괄 업로드(`docs/PLAN.md` 표). 운영 DB 접속은 **VPN 연결 상태에서만** 된다.

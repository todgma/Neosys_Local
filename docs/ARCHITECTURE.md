# 아키텍처

## 목표

기존 네오시스를 PC 한 대에서 동작하는 단일 실행 파일로 만든다. 화면은 WPF로 다시 작성하고,
데이터는 로컬 SQLite에 직접 읽고 쓴다. 서버가 필요한 기능은 운영 서버 API를 HTTP로 호출한다(API 프로젝트는 솔루션에 넣지 않음).

## 솔루션 구성 (`src/`)

| 프로젝트 | 종류 | 역할 |
| --- | --- | --- |
| `Neosys.Local.App` | WPF (.NET 8, `net8.0-windows`) | 화면. 시작 프로젝트, 단일 exe(`Neosys.exe`)로 publish |
| `Neosys.Local.Core` | 클래스 라이브러리 | 메뉴별 서비스, 서버 API 클라이언트(`ServerApi`), 공통(`AppSession`·`LocalDate`·`Catalog`) |
| `Neosys.Local.Data` | 클래스 라이브러리 | SQLite 연결·DB 생성·마이그레이션·이력 트리거(`LocalDatabase`), SP 실행기(`SpRunner`), 행 모델(`Row`), `Sql/**`(임베디드) |
| `Neosys.Local.Tests` | xUnit | 서비스·SQL 테스트(테스트마다 임시 SQLite 파일) |

참조 방향: `App → Core → Data`. Data는 다른 프로젝트를 모른다.
`tools/SchemaExport`는 솔루션과 별개의 개발 도구다(운영 DB 읽기 전용 추출).

```
src/
├─ Neosys.Local.sln, global.json, Directory.Build.props
├─ Neosys.Local.Data/
│  ├─ LocalDatabase.cs      DB 파일 생성(schema.sql + Seed) → Migrations → *_hist 트리거 설치, digits() 함수 등록
│  ├─ SpRunner.cs           Sql/Procs/<sp>.<모드>.sql 실행(파라미터 자동 바인딩·트랜잭션)
│  ├─ Row.cs                한 행 = 컬럼명 사전(대소문자 무시) + 변경 알림(WPF 바인딩)
│  └─ Sql/
│     ├─ Procs/*.sql        SP 대체 SQL (메뉴별)
│     ├─ Migrations/NNN_*.sql  PRAGMA user_version 순서로 적용
│     ├─ schema.sql (링크)  ← schema/sqlite/schema.sql
│     └─ Seed/000_base.sql (링크) ← schema/sqlite/seed.sql (공통코드·메뉴·계약서 서식)
├─ Neosys.Local.Core/
│  ├─ AppSession, AppSettings, LocalDate, Catalog(기존 프런트 constants/*.js)
│  ├─ Server/ServerApi.cs   로그인·사무소·직원·메뉴권한·패스워드·가입비·상품가입·증빙파일·법정동·단지
│  └─ Services/             Auth, Code, Customer, Property, Contract, Schedule, Interview, Vendor,
│                           Expiry, Worklog, Memo, Neobot (+ ServiceBase, ChildSync)
├─ Neosys.Local.App/
│  ├─ App.xaml(.cs), AppServices.cs, Theme.xaml
│  ├─ Ui/                   공통 화면 부품: FormBuilder(필드 정의 → 입력 폼), GridBuilder, ListPage, EditWindow,
│  │                        FormEditWindow, ChildListEditor, RegionPicker(서버 법정동·단지), PickerDialog, SaleDivEditor …
│  └─ Views/<메뉴>/         메뉴별 목록 화면 + 등록창
└─ Neosys.Local.Tests/
```

## 데이터 흐름

```
[WPF 화면] ──▶ [서비스 (Core)] ──▶ [SpRunner (Data)] ──▶ SQLite (%LOCALAPPDATA%\Neosys\neosis_local.db)
                     │
                     └─(서버가 필요한 기능)──▶ [ServerApi (Core)] ──HTTP──▶ https://api.neosis.kr
```

- 로컬 CRUD(물건·고객·계약·일정·메모·상담·업무일지·협력업체·만기·통합검색)는 API를 거치지 않는다.
- 서버 API 호출: 로그인, 사무소·직원 조회·수정, 직원 메뉴 권한, 패스워드 변경, 가입비 상태·결제 토큰, 멤버십 상품·가입, 증빙 파일(presign → 스토리지 PUT → 등록), 법정동·단지 조회. (추후) 공동중개망 전송.
- 가입비 결제: 서버가 발급한 1회용 자동로그인 토큰으로 `https://neosis.kr/payment?autologin=…&auto=1`을 프로그램 안 결제창(WebView2)에 연다. 결제 페이지가 문서 제목에 `NEOSIS_PAYMENT_DONE`/`NEOSIS_PAYMENT_FAIL`을 넣으면 완료/실패(기존 Electron payment:open과 같음). WebView2를 못 쓰면 기본 브라우저 + [결제 확인]. 기존은 2026-11-01(KST) 이후에만 결제 버튼을 열었지만, 테스트 결제를 위해 제한을 풀었다(2026-10-21 사용자 요청 — 다시 막으려면 `EntryFeeRules.PayOpenAt`을 2026-11-01로).
- 로그인한 중개사의 `RtNo`·`OffNo`·`Id`는 세션(`AppSession`)에 두고, 모든 SQL에 `@session_rt_no`·`@session_off_no`·`@session_user_id`로
  넘어간다(`ServiceBase.P`). 로그인 결과는 로컬 `rt_realtor_info`·`ofc_realter_office`에도 저장한다(비밀번호 제외).
- 직원(대표 외)은 서버의 메뉴 권한(rt_menu_perm)에 있는 메뉴만 보인다. 서버 조회 실패 시 로컬에 남은 값.

## SP 대체 방식 — SP 이름별 SQL 파일

SQLite에는 저장 프로시저가 없다. SP를 SQL 파일로 만들고 C#에서 이름으로 실행한다.

```
src/Neosys.Local.Data/Sql/Procs/
├─ fn_pt_sale_holder.SEL.sql   기존 DB 함수(fn_*)를 옮긴 것: 함수 이름 + pr_proc 모드
├─ fn_pt_sale_holder.INS.sql
├─ ct_cust.LIST.sql            기존 API 인라인 SQL을 옮긴 것: 테이블 이름 + 동작
├─ ct_cust.INS.sql             … RETURNING cust_no (새 키 반환)
└─ …
```

- 파일 이름 = `<SP>.<모드>.sql`. SP = 기존 DB 함수가 있으면 그 이름(`fn_*`), 없으면 테이블 이름(또는 기능 이름: `neobot`).
  모드 = `LIST`/`GET`/`INS`/`UPD`/`DEL`/`SEL` 등 동작 이름.
- **파라미터 이름 = DB 컬럼 이름**(snake_case, 예 `@cust_no`). 검색 조건은 `@q_…`, 세션 값은 `@session_…`.
  `SpRunner`가 SQL의 `@이름`을 찾아 넘긴 값(`Row`·익명 객체의 같은 이름, 대소문자 무시)을 넣는다. **없으면 NULL, 빈 문자열도 NULL.**
  → 화면 행(`Row`)을 그대로 넘기면 된다. 주석·문자열 안의 `@`는 무시한다.
- 결과 컬럼도 DB 컬럼 이름 그대로(`SELECT *`). 화면은 `Row["컬럼"]`으로 바인딩한다.
- 등록(`INS`)은 `RETURNING <키>`로 **새 키를 반환**하고, 서비스가 행에 채워 이후 저장은 수정이 된다.
- 한 번의 호출은 한 트랜잭션. 여러 SP를 묶을 때는 `SpRunner.InTransactionAsync`(예: 고객 + 희망지역 + 구입자 + 메모 + 상담 일괄 저장).
- 각 SQL 파일 머리에 원본 위치를 주석으로 남긴다. 예: `-- from legacy/API/Vendor/Services/VendorService.cs InsertVendor`.
- 시각은 `datetime('now','localtime')`(로컬 시각)로 저장한다.

### PostgreSQL → SQLite 변환 규칙

| PostgreSQL | SQLite |
| --- | --- |
| `serial`/`nextval()` PK | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `RETURNING col` | 그대로(SQLite 3.35+) |
| `now()`, `CURRENT_TIMESTAMP` | `datetime('now','localtime')` |
| `ILIKE` | `LIKE` (ASCII만 대소문자 무시 — 한글은 영향 없음) |
| `x = ANY(string_to_array(@csv, ','))` | `(',' \|\| @csv \|\| ',') LIKE ('%,' \|\| x \|\| ',%')` 또는 `json_each('["' \|\| replace(@csv, ',', '","') \|\| '"]')` |
| `regexp_replace(tel,'[^0-9]','','g')` | `digits(tel)` — 연결마다 등록하는 C# 함수 |
| `string_agg` / `json_agg` | `group_concat` |
| `::type` 캐스트 | `CAST(x AS ...)` 또는 제거 |
| boolean | INTEGER 0/1 |
| jsonb | TEXT(JSON). `json_extract`·`json_set` |
| `DISTINCT ON` | `GROUP BY` + `MAX(키)` |

### 변경 이력(_hist) 트리거

운영 DB는 `fn_hist_snapshot` 트리거로 `X_hist`에 변경 이력을 남긴다(스키마 추출에는 트리거가 빠짐).
로컬은 `LocalDatabase.InstallHistTriggers`가 시작할 때마다 `X`와 `X_hist`가 모두 있는 테이블에 INSERT/UPDATE/DELETE 트리거를 만든다.
`log_type`(I/U/D)·`logged_at`(로컬 시각)·`changed_by`(행의 upd_id/reg_id …)·`changed_off`(행의 사무소, 없으면 작성자 사무소)를 기록한다.
업무일지의 자동집계·변경 이력이 이 테이블을 읽는다(삭제도 기록된다).

## 화면 구성 방식

- **창 구조는 기존 Electron과 같다**(2026-10-20): 로그인 → 대시보드 창(`DashboardWindow`, 폭 420·모니터 오른쪽 위 고정)
  → 메뉴를 누르면 메뉴마다 별도 창(`WindowManager.OpenMenu`: 기본 1400×700, 네오봇 520×825 여러 개, 메모 500×800).
  대시보드를 닫으면 앱 종료, 로그아웃하면 모든 창을 닫고 로그인으로.
- 대시보드의 공지·이벤트·멤버십·인사말·비밀번호 재확인은 **서버 데이터라 운영 서버 API를 그대로 호출**한다(로컬에 다시 만들지 않음).
  공동중개망·쪽지·대량문자 카드는 기존 배치대로 두고 "네오시스 웹에서 이용" 안내만 한다. 공지·이벤트 롤링 배너(5초, `RollingRules`)·로그인 후 팝업(`NoticePopupRules`, 숨김 기록 `%LOCALAPPDATA%\Neosys\notice_popup.json`)·커뮤니티 창(`Views/Community`, `CommunityRules`)·미션문구/리뷰이벤트·추천인 목록은 서버 API로 조회한다. 게시글·공지 내용(편집기 HTML)은 `Ui.HtmlView`(WebView2, 링크는 기본 브라우저). 맨 아래 [사무소관리 | 직원관리 | 가입비 및 상품결제](대표)는 비밀번호 확인 후 사무실관리 허브 창(`Views/Office/OfficeHubPage`)을 연다.
- 색·모양은 기존 React(Tailwind) 값을 따른다(`Theme.xaml`: indigo-600 #4F46E5, 회색 바탕 #F9FAFB, 둥근 버튼,
  등록폼 라벨 #8B7AD8). 기존 화면 부품은 `Ui/LegacyControls.cs`(유형 버튼·구분 탭·면적/금액 필터 팝업·상담모드 토글), 알림은 `Toast`.
- **글꼴·굵기·크기 기준(기존 `globals.css`·`tailwind.config.js`·`index.html`과 대조, 2026-10-20)**
  - 글꼴 Pretendard — 기존은 woff2를 앱에 넣어 씀 → 같은 버전 OTF를 `Assets/Fonts`에 포함(OFL). 없으면 맑은 고딕.
  - 기본: 13px · 굵기 500 · #111827(바탕 #F9FAFB). 모든 창에 적용(`App.ApplyLegacyTypography` — Window 속성 기본값).
    500 미만 굵기는 쓰지 않는다(기존 규칙: Tailwind normal/medium/semibold → 600, bold 이상 → 800).
  - 버튼 14px(text-sm) · 600, 목록 도구줄 버튼 14px · 500 · padding 6px 14px(`ListPage.ToolbarStyle`).
  - 목록 표(.prop-list-grid): 머리 14px · 500 · 검정 · 위 2px/아래 1px 검정선, 칸 11px · 500 · 검정, 행 구분선 #94A3B8, 세로선 #E5E7EB.
  - 입력칸: 목록 검색칸 rounded 4px, 등록폼 칸은 각진 모서리 #CBD5E1(`FormTextBox`), select 최소 높이 28px.
  - 색: 새 앱 코드의 색 77개 모두 기존 소스(hex + Tailwind 클래스)에 있는 색이다. #E6E6E6·#999999(달력 다른 달)는 기존이 쓰던 react-big-calendar CSS 값.
- 상담모드(대시보드·물건·고객 상단 토글, `settings.json`의 ConsultMode)를 켜면 물건·고객 등록창 오른쪽 카드를 숨긴다.
- 목록 화면 = `ListPage` — 기존 공통 표(PropertyListTable) 모양: 흰 검색 상자 / 도구줄 왼쪽 [페이지별 필터][N건],
  오른쪽 [페이지별 버튼][색 채우기][+ 신규 등록][수정][삭제] / 선택 체크 열 · 흰 머리 + 검은 윗선 표 · 행 우클릭 메뉴.
  색 채우기는 PC별(`%LOCALAPPDATA%\Neosys\row_colors.json`). 고객관리처럼 도구줄 두 줄이면 `UseStackedToolbar`.
- 등록창 = `EditWindow`(저장·삭제·닫기, 저장 후 "수정" 모드로 전환). 기존 버튼 글자("등록 | 저장")는 `SaveLabel`, 푸터 추가 버튼은 `AddRightButton`.
- 입력 폼은 `FieldDef` 목록으로 정의하고 `FormBuilder`가 보라색 라벨 + 입력칸 표로 그린다. `When(row => …)` 조건으로
  물건유형별 항목을 보이고 숨긴다(숨긴 칸은 자리 없이 다시 배치). 콤보는 목록에 없는 기존 값도 보존한다.
  물건·고객 등록창은 기존 행 배치를 쓰는 `RowFormBuilder`: `F.Section("금액|단위(만원)")`가 왼쪽 90px 보라 라벨 한 행이 되고,
  그 아래 필드는 작은 라벨+칸으로 한 줄에 이어 붙는다(`W(px)` 칸 너비, `Span(2)`·여러 줄은 한 줄 전체, 보이는 칸이 없으면 행 숨김).
- 기존처럼 같은 창 안에서 화면이 바뀌는 곳(계약관리 [계약목록]↔[계약서작성])은 `EditWindow.Embed()`로 창 내용을 떼어 넣는다
  (`CloseRequested`로 목록 복귀, 하위 대화상자 Owner는 `DialogOwner`).
- 하위 목록(구입자·소유자·메모·상담·임대차현황 등)은 `ChildListEditor`(행 추가·삭제가 되는 표).
- 서버 법정동·단지 선택은 `RegionPicker`, 다른 메뉴 데이터 선택은 `Pickers`(고객·물건·협력업체).

## 첨부파일

기존은 네이버클라우드 오브젝트 스토리지 + `sys_file`. 로컬은 `FileService`가 파일을 `%LOCALAPPDATA%\Neosys\files\<file_div>\<yyyyMM>\<GUID>.<확장자>`로
복사하고 `sys_file`(file_typ·file_div·ref_key·orig_name·object_key=상대 경로 …)에 기록한다. 코드는 기존과 같다:
평면도 SYFTY01/SYFDV05, 물건사진 SYFTY04/SYFDV01(ref_key = 물건번호), 계약 첨부 SYFTY03/SYFDV07(최대 10개·5MB),
공제증서 SYFTY05/SYFDV06(ref_key = 계약 master_id). 화면 부품은 `Ui/AttachmentPanel`(미리보기·추가·끌어다 놓기·열기·다른 이름으로 저장·삭제).
삭제는 사용안함 처리 + 파일을 `files\_trash`로 이동(복구 가능). 개발용 환경변수 `NEOSYS_FILES`로 폴더를 바꿀 수 있다.
**백업은 DB와 첨부 폴더를 함께**(`%LOCALAPPDATA%\Neosys` 폴더 전체).

## 서버 API 호출

주소는 `%LOCALAPPDATA%\Neosys\settings.json`의 `ServerApiBase`(기본 `https://api.neosis.kr`). 개발용으로 환경변수 `NEOSYS_API`가 우선한다.
기존 API 응답 형식 `{ success, data, message, error }`를 해석하고, 0건 `NOT_FOUND`는 빈 목록으로 본다.

## 단일 exe 배포

```bash
dotnet publish src/Neosys.Local.App -c Release -o publish
```

- Release 설정(csproj)에 `win-x64`·self-contained·`PublishSingleFile`·`IncludeNativeLibrariesForSelfExtract`·압축이 들어 있다.
  결과는 `publish/Neosys.exe` 1개(약 73MB). pdb는 만들지 않는다(`Directory.Build.props`).
- 첫 실행 시 DB 파일이 없으면 임베디드 `schema.sql` + 시드로 만들고, 이후 `Sql/Migrations`를 `PRAGMA user_version` 순서로 적용한다.
- 개발용 환경변수: `NEOSYS_DB`(DB 파일 경로), `NEOSYS_API`(서버 주소).
- 디버그 빌드 전용 화면 캡처: `Neosys.exe --snapshot <메뉴키> <출력.png> [new|first]` — 테스트 세션·견본 데이터로 화면을 PNG로 저장한다
  (서버는 부르지 않음). 메뉴키는 `Views/MenuRegistry.cs`.

## 질문과 답

| # | 질문 | 답 (2026-10-19) |
| --- | --- | --- |
| 1 | API 포함 방식 | API는 솔루션에서 제외. 필요할 때 운영 서버 API 호출 |
| 2 | 로컬↔서버 동기화 | 공동중개망 데이터 전송에만 서버 API 사용(추후). 그 외는 로컬 전용 |
| 3 | 로그인 | **서버 계정 로그인**(`/api/realestaters/login`) |
| 4 | 초기 데이터 | 공통코드·메뉴·계약서 서식은 로컬 시드. 법정동·단지는 **서버 API로 조회**. 운영 업무 데이터는 가져오지 않음(빈 DB 시작) |
| 5 | Electron 전용 기능(PC폰·원격지원·자동 업데이트) | 이관 제외 |
| 6 | 관리자 웹(ADMIN) | 이관 제외 |
| 7 | 이관 범위 | 공동중개망·쪽지·커뮤니티·공지·고객센터·결제·대량문자·PC폰 제외, 로컬 업무 메뉴만 |
| 8 | 첨부파일(사진·평면도·계약 첨부) | **이 PC 폴더**(`%LOCALAPPDATA%\Neosys\files`)에 저장하고 `sys_file`에 기록 |

### 남은 질문

- 서버가 꺼져 있거나 오프라인일 때 로그인(마지막 로그인 정보로 오프라인 진입 허용 여부). 현재: 서버 로그인 필수.
- 기존 운영 데이터(물건·고객 등)를 사무소 단위로 내려받아 로컬로 옮길지(현재는 빈 DB 시작).
- **자사매칭 규칙**(2026-10-20): 기존 물건 목록 '자사매칭/공동망매칭', 고객 목록 '매칭(자사 n / 공동 n)' 칸은 화면만 있고
  서버에 계산 로직이 없다(항상 '-'·0). 어떤 조건(물건유형·거래유형·금액·면적·희망지역 등)이 맞으면 매칭으로 셀지 정해 주셔야 구현할 수 있다. 현재 미구현.
- 부속문서·거래관련서식 인쇄 모양: 현재는 항목표 형태로 인쇄한다. 정부 서식(확인설명서 등) 모양 그대로 재현이 필요한지.

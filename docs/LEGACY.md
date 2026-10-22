# 기존 시스템 (legacy/)

2026-10-19에 `D:\Source\Neosys`에서 복사했다. 원본 저장소: `JooHeon-Lee/maemuljang_front`, `JooHeon-Lee/RealestateAPI`,
`JooHeon-Lee/realestate_maemuljang_admin` (main = `3927e85` / `3109cae` 기준).

## 구성

| 폴더 | 기술 | 비고 |
| --- | --- | --- |
| `legacy/front` | React 18 + Vite + Electron, Tailwind | 화면 기준. 팝업은 Electron 별도 창(`#/modal/<type>`), 메뉴는 `openTabInWindow` |
| `legacy/API` | ASP.NET Core 8, Npgsql 9 | `RealestateAPI`. DB 접근은 `IPostgresDataService`로 **인라인 SQL**(53개 파일) + 일부 DB 함수(`fn_*`) |
| `legacy/ADMIN` | Next.js | 관리자 웹(공지·이벤트·회원·결제 관리) |

- 운영 API: `https://api.neosis.kr` (`legacy/front/src/config/apiEndpoints.js`)
- 운영 DB: PostgreSQL `neosis.sldb.iwinv.net` / `postgres` (2026-10-16 `realestate.sldb.iwinv.net`에서 이관, API 커밋 `ea1827f`)
- 연결 문자열: `legacy/API/appsettings.json`의 `ConnectionStrings:DEV` (비밀번호 포함 — 커밋 금지)
- 저장소 반영(2026-10-19, 사용자 결정): `legacy/API/.gitignore`·`legacy/front/.gitignore`를 지워 참고용 `.md`·`.sql`도 올린다.
  비밀값이 하드코딩된 파일(`appsettings*.json`, `set_bucket_cors.py`, `tools/`, `PaymentService.cs`, `NaverSyncService.cs`, `ApiModels.cs`)은
  루트 `.gitignore`로 제외한다. 이 코드를 `src/`로 옮길 때는 키를 설정/환경변수로 빼야 한다.

## 메뉴 (대시보드 기준)

| 메뉴 | 프런트 | 주요 API | 비고 |
| --- | --- | --- | --- |
| 물건관리 | `pages/properties`, 등록창 `PropertyFormPageV2` | `/api/property`, `/api/holder`, `/api/layout` | 종류 15개, 종류별 입력 폼이 다름 |
| 고객관리 | `pages/customers`, `CustomerFormPageV2` | `/api/Customers`, `/api/CustomersTrade*` | |
| 공동중개망 | `pages/transaction-network`, `pages/hub/HubFormPage` | `/api/Hub` | 서버 공유 데이터 |
| 계약관리 | `pages/contracts` | `/api/contract-master`, `/api/Contract`, `/api/contract-template` | 계약서·확인설명서·개인정보동의서 |
| 협력업체관리 | `pages/partners`, `VendorModal` | `/api/vendors` | |
| 일정관리 | `pages/schedule` | `/api/Schedule`, `/api/realestater_schedule` | |
| 쪽지관리 | `pages/note` | `/api/Hub/note*`, SignalR `/hubs/note` | |
| 대량문자관리 | `services/sms` | `/api/Sms` | 외부 발송 |
| 만기관리 | `pages/expiry` | `/api/expiry` | |
| 업무일지 | `pages/worklog` | `/api/worklog`, `/api/worklog-history` | |
| 커뮤니티 | `components/community` | `/api/community`, `/api/community/job` | |
| 메모 | `pages/memo` | `/api/Memo` | |
| 상담관리 | `pages/interview` | `/api/Interview` | |
| 네오봇(통합검색) | `pages/neobot` | `/api/neobot`, `/api/search` | |
| 사무소·직원·결제 | `pages/agents`, `pages/settings` | `/api/office`, `/api/realestaters`, `/api/staff-menu-perm`, `/api/payments` | |
| 공지·알림·고객센터 | `pages/notice`, `notifications`, `support` | `/api/admin/notices`, `/api/admin/inquiries` | 알림 화면은 하드코딩 샘플 |
| PC폰·원격지원 | `pages/phone` | — | Electron 전용 |

API 컨트롤러 전체 목록은 `legacy/API/**/Controllers/*.cs`(53개).

## SQL 원본 위치

- DB 함수 정의: 스키마 추출 후 `schema/pg/functions/` (INDEX.md에 함수별 참조 테이블)
- 저장소에 있는 SQL 파일: `legacy/API/Hub/sql/*.sql`, `legacy/API/Property/fn_pt_sale*.sql`, `legacy/API/Vendor/fn_vd_vendor_info.sql`, `legacy/API/*.sql`(고객센터·공지·일정·협력업체)
  — 운영 DB와 다를 수 있으니 **운영 추출본을 기준**으로 한다.
- 인라인 SQL: `legacy/API/<영역>/Services/*.cs`

## 알려진 문제 (2026-10-19 기능 점검)

새 버전에서 같은 문제를 만들지 않도록 남겨 둔다. 상세는 점검 문서 "네오시스 메뉴별 기능 점검 결과".

| 문제 | 원인 | 새 버전에서 |
| --- | --- | --- |
| 공동중개망 신규 전송 500 (`rt_trade_info_pkey` 중복) | DB 이관 후 번호 시퀀스가 1부터 재시작 | SQLite AUTOINCREMENT 사용, 데이터 이관 시 `sqlite_sequence` 보정 |
| 물건·고객 등록 창 재저장 시 중복 생성 | 등록 API가 새 키를 반환하지 않음 | `_ins` SP는 항상 새 키 반환, 등록 후 수정 모드 전환 |
| 오전 9시 전 "오늘"이 어제로 들어감 | `toISOString()` UTC 사용 | `DateTime.Today`(로컬) |
| 빈 목록을 400 오류로 응답 | API 설계 | 0건 = 빈 리스트 |
| 쪽지 대화목록 500 | `/api/Hub/note/office` SQL 구문 오류 | SP 이식 시 수정 |
| 중개사 조회 0건 | 시군구 10자리 코드 전송, vworld는 5자리 | 시군구는 앞 5자리 |
| 물건 목록 탭 건수가 이상해 보임 | 표는 왼쪽 묶음(단지·건물) 하나만 표시, 묶음 목록 기본 접힘, 직접입력 단지명이 "개포동 아파트"로 표시 | 종류 전체 건수 표시, 묶음 이름에 단지/건물명 |
| 업무일지 자동집계 누락 | 삭제 이력 미기록 | 이력 기록을 SP에 포함 |
| 알림 화면 샘플 데이터 | 하드코딩 | 실제 데이터 또는 빈 상태 |
| **서버 API 인증 없음** | 로그인 응답의 토큰이 형식뿐(`token-{id}-{시각}`)이고 API가 토큰을 검사하지 않음. 예: `GET /api/realestaters?offNo=<번호>`가 아무 사무소 번호로 직원 이름·연락처를 돌려줌(2026-10-19 확인) | 로컬 버전은 서버 API를 로그인·조회에만 쓰지만, **서버 쪽 인증 추가가 필요**(로컬 범위 밖) |
| 일정 월말일 누락 | 종료일을 자정(`'YYYY-MM-31'::timestamptz`)으로 비교 | 다음날 0시 미만으로 조회 |
| 물건 삭제 시 고아 행 | `pt_sale`만 삭제 | 소유자·메모·공유·임대차·필지 함께 삭제 |

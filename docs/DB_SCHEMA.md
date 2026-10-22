# DB 스키마 추출·변환

## 방법

운영 PostgreSQL의 스키마를 **읽기 전용**으로 조회해 `schema/`에 저장하고 SQLite DDL로 변환한다.

```bash
# 저장소 루트에서
dotnet run --project tools/SchemaExport -- .
```

- 연결 문자열: 환경변수 `NEOSIS_PG` 우선, 없으면 `legacy/API/appsettings.json`의 `ConnectionStrings:DEV`.
- 읽기 전용 보장: 세션 옵션 `default_transaction_read_only=on` + `SET TRANSACTION READ ONLY`, 끝나면 롤백. DB에는 아무것도 쓰지 않는다.
- 조회 대상(`public` 스키마): 테이블·컬럼(`information_schema`), PK/UNIQUE/FK/CHECK(`pg_constraint`), 인덱스(`pg_indexes`), 함수·프로시저 정의(`pg_get_functiondef`, 확장 소유 제외), 뷰, 행 수 추정치.

## 출력

| 경로 | 내용 |
| --- | --- |
| `schema/pg/tables.json` | 원본 메타데이터 전체 |
| `schema/pg/functions/*.sql`, `INDEX.md` | DB 함수(SP) 원문과 목록(인자·반환·참조 테이블) |
| `schema/pg/views/*.sql` | 뷰 정의 원문 |
| `schema/sqlite/schema.sql` | SQLite DDL — 실제 SQLite에 실행해 성공한 문장만 포함 |
| `schema/sqlite/conversion_report.md` | 제외·변경된 항목(기본값, CHECK, 인덱스, 실행 실패) |
| `schema/sqlite/seed.sql` | 기준 데이터 INSERT(공통코드·메뉴·계약서 서식) — 로컬 DB 첫 생성 시 실행 |

## 변환 규칙

- 타입: 정수류 → INTEGER, numeric → NUMERIC, real/double → REAL, boolean → INTEGER(0/1), 날짜·시간 → TEXT(ISO 8601), json/jsonb·배열·uuid·문자열 → TEXT, bytea → BLOB.
- 단일 정수 PK + 시퀀스/identity → `INTEGER PRIMARY KEY AUTOINCREMENT`. 그 외 PK는 테이블 제약.
- 기본값: `now()` 류 → `CURRENT_TIMESTAMP`, `true/false` → `1/0`, 문자·숫자 리터럴 유지(`::type` 캐스트 제거), `gen_random_uuid()` → `lower(hex(randomblob(16)))`. 그 밖의 식은 제외하고 보고서에 남긴다.
- CHECK: `= ANY(ARRAY[...])` → `IN (...)`. PostgreSQL 전용 구문이 남으면 제외.
- 인덱스: btree/hash만 변환(`IF NOT EXISTS`), gin/gist 등은 제외. PK/UNIQUE 제약이 만든 인덱스는 건너뜀.
- 식별자는 모두 큰따옴표로 감싼다(대소문자 섞인 컬럼, 예: `"RtNo"`).

## 접속 조건

운영 DB(`neosis.sldb.iwinv.net:5432`)는 **VPN 연결 상태에서만** 접속된다. VPN 없이 실행하면 연결 직후
`SocketException 10054`(원격 호스트가 연결 끊음)로 실패한다.

## 현재 상태 (2026-10-19 추출 완료)

- 운영 DB: **PostgreSQL 10.15** (`server_version_num=100015`) — `pg_proc.prokind`가 없어 도구가 버전에 따라 조회문을 바꾼다.
- 추출: 테이블 **104개**, 인덱스 문장 170개, 함수(SP) **25개**, 뷰 0개.
- SQLite 검증: **274 / 274 문장 실행 성공** (`schema/sqlite/schema.sql`).
- 변환 중 처리한 PostgreSQL 전용 구문: `num_nonnulls(a, b)` CHECK → `((a IS NOT NULL) + (b IS NOT NULL))`,
  인덱스 `text_pattern_ops` 제거, 비트 기본값 `B'0'` → `0`.
- 제외 1건: `pt_sale_old.pt_no`의 시퀀스 기본값(PK가 아닌 예전 백업 테이블).
- SP 구조: 25개 함수 모두 `pr_proc` 인자로 `SEL`/`INS`/`UPD`/`DEL`을 나누는 방식 → SP 이식 규칙은 `docs/ARCHITECTURE.md` 참고.
- 참고: 기존 API의 DB 접근은 대부분 이 함수들이 아니라 서비스 코드의 **인라인 SQL**이다. 로컬 SP 목록은 함수 25개 + 인라인 SQL을 합쳐서 만든다.

## 기준 데이터 시드

`schema/sqlite/seed.sql` — 공통코드(`sys_code_*`), 메뉴(`sys_menu`), 계약서 서식(`cn_contract_template`)을 읽기 전용으로 받아
`INSERT OR IGNORE` 문으로 만든다(같은 검증 DB에서 실행 확인). 업무 데이터는 가져오지 않는다.

## 로컬 DB에서의 사용

- `schema.sql`과 `seed.sql`은 `src/Neosys.Local.Data`에 임베디드 리소스로 링크되어 exe 안에 들어간다(복사본 없음).
- 스키마 추출 후 로컬에서만 필요한 변경은 `src/Neosys.Local.Data/Sql/Migrations/NNN_*.sql`로 한다(예: `001_pt_sale_old_columns.sql`). 작성 방법·적용 순서·재추출 시 주의는 `docs/DB_UPDATE.md`.
- 운영 DB의 `_hist` 트리거(`fn_hist_snapshot`)는 추출되지 않으므로, 로컬은 `LocalDatabase.InstallHistTriggers`가 같은 역할의 SQLite 트리거를 만든다.

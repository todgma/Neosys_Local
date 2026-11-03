# 로컬 DB 업데이트 방법

로컬 DB(SQLite)의 테이블·SP(SQL 파일)를 바꿀 때 무엇을 어디에 쓰는지, 사용자 PC의 DB가 언제 어떻게 바뀌는지 정리한다.
코드 기준: `src/Neosys.Local.Data/LocalDatabase.cs`, `SpRunner.cs`, `SqlResources.cs` (2026-10-23).

## 한눈에

| 바꾸는 것 | 쓰는 곳 | 사용자 PC 반영 |
| --- | --- | --- |
| 테이블·컬럼·인덱스 | `src/Neosys.Local.Data/Sql/Migrations/NNN_설명.sql` (새 파일) | 새 exe 첫 실행 때 자동 적용(한 번만) |
| 기준 데이터(공통코드·메뉴·서식) 추가·수정 | 마이그레이션 파일에 `INSERT OR IGNORE` / `UPDATE` | 새 exe 첫 실행 때 자동 적용(한 번만) |
| SP(조회·저장 SQL) | `src/Neosys.Local.Data/Sql/Procs/<SP>.<모드>.sql` (수정 또는 새 파일) | 새 exe를 실행하면 바로(마이그레이션 불필요) |
| 변경 이력(`X_hist`) 트리거 | 손대지 않는다 | 시작할 때마다 자동으로 다시 만든다 |

SQL 파일은 모두 **임베디드 리소스**로 exe 안에 들어간다(`Neosys.Local.Data.csproj`의 `Sql\**\*.sql`). 파일을 추가하면 csproj를 고칠 필요 없이 빌드에 포함된다.
**배포는 exe 교체뿐**이고, DB 파일은 사용자 PC에 그대로 남아 새 exe가 필요한 만큼 고친다.

## DB 파일 위치

- 기본: 계정별 `%LOCALAPPDATA%\Neosys\accounts\<계정ID>\<계정ID>.db` — 로그인 성공 후 연다(WAL 모드라 `-wal`·`-shm` 파일이 옆에 생긴다). 예전 단일 DB `neosis_local.db`는 첫 로그인 때 그 계정으로 옮길지 묻는다(`AccountStore`, docs/DB_BACKUP.md).
- 개발·테스트: 환경변수 `NEOSYS_DB=<경로>`로 다른 파일을 쓴다 — 실제 데이터 DB를 건드리지 않고 마이그레이션을 시험할 때 쓴다.

## 실행할 때 일어나는 일 (`LocalDatabase.Initialize`)

앱 시작(`AppServices.InitializeAsync`) 때 한 번 실행된다. 순서:

1. **처음 만들기** — DB에 테이블이 하나도 없으면(새 PC·DB 삭제 후) 한 트랜잭션으로
   `schema.sql`(= `schema/sqlite/schema.sql`) → `Sql/Seed/*.sql`(= `schema/sqlite/seed.sql`, 이름순)을 실행한다.
   이때 `PRAGMA user_version`은 0이다.
2. **마이그레이션** — `PRAGMA user_version`(현재 DB 버전)을 읽고, `Sql/Migrations/NNN_*.sql` 중 **번호가 그보다 큰 파일만**
   번호 순서로 실행한다. 파일마다 트랜잭션 하나: 파일 실행 → `PRAGMA user_version = NNN` → 커밋.
   - 새로 만든 DB도 버전 0에서 시작하므로 **모든 마이그레이션이 차례로 실행된다**(1번 다음 바로 2번).
   - 이미 적용된 번호는 다시 실행하지 않는다.
3. **이력 트리거** — `X`와 `X_hist`가 둘 다 있는 테이블마다 INSERT/UPDATE/DELETE 트리거를 지우고 다시 만든다(공통 컬럼 기준).

마이그레이션이 실패하면 그 파일만 롤백되고(버전은 그대로) 앱은
"로컬 DB를 준비하지 못했습니다. <오류>" 메시지를 띄우고 종료한다. 앞서 성공한 파일은 이미 커밋되어 있다.
고친 exe로 다시 실행하면 실패한 번호부터 다시 시도한다.

### 현재 버전 확인

- SQL: `PRAGMA user_version;` → 마지막으로 적용된 마이그레이션 번호(지금은 `1`)
- 프로그램 안: 대시보드 톱니바퀴(데이터 확인 창, 비밀번호 필요)로 테이블·컬럼을 볼 수 있다.
- 외부 도구: DB Browser for SQLite 등으로 DB 파일을 연다(앱을 끄고 열 것 — 쓰기 잠금).

## 테이블 변경 — 마이그레이션 쓰는 법

1. `src/Neosys.Local.Data/Sql/Migrations/`에 **다음 번호**로 새 파일을 만든다. 예: `002_ct_cust_grade.sql`
   - 이름 규칙: `숫자_설명.sql` (정규식 `^(\d+)_.+\.sql$`). 3자리로 맞춘다(`002`, `010`) — 실행 순서는 숫자 값으로 정해진다.
   - 머리에 무엇을 왜 바꾸는지 한국어 주석.
2. 내용 예:

   ```sql
   -- 고객 등급 컬럼 추가(고객관리 등급 필터) — 2026-10-23
   ALTER TABLE ct_cust ADD COLUMN cust_grade TEXT;
   ALTER TABLE ct_cust_hist ADD COLUMN cust_grade TEXT;     -- 이력 테이블이 있으면 같이(트리거는 자동으로 따라온다)
   CREATE INDEX IF NOT EXISTS ix_ct_cust_grade ON ct_cust (cust_grade);

   -- 기준 데이터 추가(공통코드)
   INSERT OR IGNORE INTO sys_code_sub (...) VALUES (...);
   ```

3. 그 컬럼을 쓰는 `Sql/Procs/*.sql`과 서비스·화면을 같이 고친다(파라미터 이름 = 컬럼 이름이라 `Row`에 값만 넣으면 바인딩된다).
4. 테스트: `dotnet test src/Neosys.Local.Tests` — 테스트는 임시 DB를 새로 만들어 `schema.sql` + 모든 마이그레이션을 실행하므로 문법 오류가 바로 드러난다.
   기존 DB에 적용되는지는 실제 DB **사본**을 `NEOSYS_DB`로 지정해 한 번 실행해 본다.

### 지켜야 할 것

- **한 번 배포한 마이그레이션 파일은 고치지도, 번호를 바꾸지도 않는다.** 이미 적용된 PC에서는 다시 실행되지 않으므로 고친 내용이 반영되지 않는다. 잘못됐으면 다음 번호로 바로잡는 파일을 새로 만든다.
- 파일 안에 `PRAGMA user_version`, `BEGIN`/`COMMIT`을 쓰지 않는다(실행기가 트랜잭션과 버전을 처리한다).
- 번호가 겹치지 않게 한다(같은 번호 파일이 두 개면 둘 다 실행되고 순서는 파일 이름순 — 의도와 다를 수 있다).
- 데이터는 지우지 말고 옮긴다. 사용자 PC의 DB에는 그 사무소의 업무 데이터가 있고, 서버에 백업이 없다. 현재 마이그레이션 전 자동 백업은 없다.
- SQLite `ALTER TABLE`로 되는 것: `ADD COLUMN`(NOT NULL이면 기본값 필요), `RENAME COLUMN`, `RENAME TO`, `DROP COLUMN`(내장 SQLite 3.41).
  **안 되는 것**: 컬럼 타입·기본값·제약(PK/FK/CHECK) 변경 → 새 테이블 생성 → `INSERT INTO 새 SELECT … FROM 옛` → 옛 테이블 삭제 → 이름 변경 순서로 다시 만든다.
  이때 `X_hist` 트리거는 다음 시작 때 자동으로 다시 생긴다.
- 날짜·시각은 TEXT(ISO 8601), 참/거짓은 INTEGER 0/1, JSON은 TEXT (`docs/ARCHITECTURE.md` 변환 규칙).

## SP 변경 — Procs 파일 쓰는 법

규칙 상세는 `docs/ARCHITECTURE.md`의 "SP 대체 방식". 요약:

- 위치: `src/Neosys.Local.Data/Sql/Procs/<SP>.<모드>.sql`
  - SP = 기존 DB 함수 이름(`fn_*`) 또는 테이블·기능 이름. 모드 = `LIST`/`GET`/`INS`/`UPD`/`DEL`/`SEL` 등.
  - C#에서 `Sp.QueryRowsAsync("ct_cust", "LIST", param)` 처럼 이름·모드로 부른다(`SpRunner.ResourcePath` → `Procs/ct_cust.LIST.sql`).
- 파라미터: `@컬럼이름`(snake_case), 검색 조건 `@q_…`, 세션 `@session_rt_no`·`@session_off_no`·`@session_user_id`. 넘긴 값에 없거나 빈 문자열이면 NULL.
- 등록(`INS`)은 `RETURNING <키>`로 새 키를 돌려준다.
- 파일 머리에 `-- from legacy/...` 원본 위치.
- **C# 코드에 SQL 문자열을 쓰지 않는다**(DB 생성·트리거 설치 제외).
- Procs 파일은 DB에 저장되지 않으므로 고친 exe를 실행하는 순간 바뀐다 — 마이그레이션이 필요 없다.
  단, 새 컬럼을 쓰는 SQL은 그 컬럼을 만드는 마이그레이션과 **같은 exe**에 들어가야 한다.
- 새 메뉴 기능은 서비스(Core) + SQL + 테스트(Tests)를 함께 만든다.

## 운영 DB 스키마를 다시 추출할 때 (주의)

`dotnet run --project tools/SchemaExport -- .` (VPN 필요, 읽기 전용 — `docs/DB_SCHEMA.md`)는
`schema/sqlite/schema.sql`·`seed.sql`을 **다시 만든다**. 이 두 파일은 **처음 만드는 DB에만** 쓰이므로:

- 이미 쓰고 있는 PC의 DB에는 반영되지 않는다. 운영 DB에서 새로 생긴 컬럼을 기존 로컬 DB에도 넣으려면 같은 내용을 마이그레이션으로 써야 한다.
- 반대로 새 `schema.sql`에 이미 그 컬럼이 들어 있으면, 새 PC에서는 `schema.sql` 실행 후 마이그레이션이 같은 `ADD COLUMN`을 또 실행해
  "duplicate column" 오류로 시작이 실패한다.
  (예: 지금 `001_pt_sale_old_columns.sql`은 운영 `pt_sale_old`에 그 컬럼들이 **없다**는 전제다.)
- 그래서 다시 추출한 뒤에는 기존 마이그레이션과 겹치는지 확인하고, `dotnet test`(새 DB 생성 + 전체 마이그레이션)를 반드시 돌린다.
  겹치면 `schema.sql`을 손으로 고치지 말고(자동 생성물) 추출 도구 쪽에서 제외하거나, 사용자와 처리 방법을 정한다.

## 순서 정리(체크리스트)

1. 테이블 변경이 있으면 `Sql/Migrations/다음번호_설명.sql` 작성(`X_hist`도 같이)
2. 관련 `Sql/Procs/*.sql`, 서비스, 화면 수정
3. `dotnet test src/Neosys.Local.Tests` 통과
4. 실제 DB 사본으로 `NEOSYS_DB=<사본> NeosysLight.exe` 실행 → 시작 오류 없음, `PRAGMA user_version`이 새 번호인지 확인
5. `dotnet publish src/NeosysLight -p:PublishProfile=SingleFile` → `D:\Source\Release\NeosysLight\NeosysLight.exe` 배포
6. 사용자 PC: exe 교체 후 실행하면 1~3단계(생성·마이그레이션·트리거)가 자동으로 실행된다

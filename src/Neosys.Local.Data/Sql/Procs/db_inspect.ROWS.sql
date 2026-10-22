-- 테이블 데이터(최근 행 우선, 최대 @q_limit건). {table}은 SpRunner.QueryTableAsync가 목록에 있는 이름만 넣는다
-- from (신규) — 기존 시스템에 없음
SELECT * FROM {table} ORDER BY rowid DESC LIMIT @q_limit;

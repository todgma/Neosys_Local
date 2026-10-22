-- 로컬 DB 테이블 목록과 행 수(개발용 데이터 확인 — 대시보드 톱니바퀴). 이력(_hist) 테이블도 포함
-- from (신규) — 기존 시스템에 없음
SELECT name AS table_name
  FROM sqlite_master
 WHERE type = 'table'
   AND name NOT LIKE 'sqlite_%'
 ORDER BY name;

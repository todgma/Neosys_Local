# SQLite 변환 보고서

자동 생성 파일 — `tools/SchemaExport`로 다시 만든다.

- 테이블 104개, 인덱스 문장 170개, 함수(SP) 25개, 뷰 0개
- SQLite 실행 성공 274 / 274

## 타입 매핑

정수류 → INTEGER, numeric → NUMERIC, real/double → REAL, boolean → INTEGER(0/1), 날짜·시간 → TEXT(ISO 8601), json/jsonb·배열·uuid·문자열 → TEXT, bytea → BLOB.

## 제외·변경 항목

- `pt_sale_old.pt_no` 기본값 제외: `nextval('pt_sale_pt_no'::regclass)`

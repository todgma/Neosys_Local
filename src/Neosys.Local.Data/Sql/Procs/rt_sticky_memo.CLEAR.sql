-- 메모 내용 비우기(빈 문자열 저장 — UPD는 빈 값을 유지하므로 별도)
-- from legacy/API/Memo/Services/MemoServices.cs UpdateMemo
UPDATE rt_sticky_memo SET content = '', upd_dt = datetime('now','localtime') WHERE memo_id = @memo_id;

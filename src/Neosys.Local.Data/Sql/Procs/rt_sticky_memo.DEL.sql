-- 메모 삭제 — 사용안함 처리(기존과 동일)
-- from legacy/API/Memo/Services/MemoServices.cs DeleteMemo
UPDATE rt_sticky_memo SET use_yn = 'N', upd_dt = datetime('now','localtime') WHERE memo_id = @memo_id;

-- 메모 추가 — 새 memo_id 반환
-- from legacy/API/Memo/Services/MemoServices.cs InsertMemo
INSERT INTO rt_sticky_memo (user_id, content, color, sort_order, use_yn, reg_dt, upd_dt)
VALUES (@session_user_id, @content, @color, COALESCE(@sort_order, 0), 'Y', datetime('now','localtime'), datetime('now','localtime'))
RETURNING memo_id;

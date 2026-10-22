-- 내 메모(포스트잇) 목록 — 사용중만
-- from legacy/API/Memo/Services/MemoServices.cs GetMemos
SELECT * FROM rt_sticky_memo WHERE user_id = @session_user_id AND use_yn = 'Y' ORDER BY sort_order ASC, memo_id DESC;

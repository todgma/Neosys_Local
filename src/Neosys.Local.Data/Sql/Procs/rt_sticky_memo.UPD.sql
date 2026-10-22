-- 메모 수정(내용·색·순서, 빈 값은 유지)
-- from legacy/API/Memo/Services/MemoServices.cs UpdateMemo
UPDATE rt_sticky_memo SET
    content = COALESCE(@content, content), color = COALESCE(@color, color), sort_order = COALESCE(@sort_order, sort_order),
    upd_dt = datetime('now','localtime')
 WHERE memo_id = @memo_id;

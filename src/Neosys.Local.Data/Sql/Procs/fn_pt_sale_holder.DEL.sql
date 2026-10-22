-- 소유자/임차인 1건 삭제
-- from schema/pg/functions/fn_pt_sale_holder.sql (pr_proc='DEL')
DELETE FROM pt_sale_holder WHERE pt_no = @pt_no AND holder_idx = @holder_idx;

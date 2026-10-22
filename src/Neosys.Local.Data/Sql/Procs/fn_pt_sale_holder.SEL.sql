-- 물건 소유자/임차인 목록
-- from schema/pg/functions/fn_pt_sale_holder.sql (pr_proc='SEL')
SELECT * FROM pt_sale_holder WHERE pt_no = @pt_no ORDER BY holder_idx;

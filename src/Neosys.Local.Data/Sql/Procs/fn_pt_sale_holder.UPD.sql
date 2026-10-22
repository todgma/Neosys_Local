-- 소유자/임차인 수정(빈 값은 기존 값 유지 — 원본 함수의 COALESCE와 동일)
-- from schema/pg/functions/fn_pt_sale_holder.sql (pr_proc='UPD')
UPDATE pt_sale_holder
   SET holder_type = COALESCE(@holder_type, holder_type), holder_reg_date = COALESCE(@holder_reg_date, holder_reg_date),
       holder_name = COALESCE(@holder_name, holder_name), holder_phone = COALESCE(@holder_phone, holder_phone),
       cust_no = COALESCE(@cust_no, cust_no), holder_relation = COALESCE(@holder_relation, holder_relation),
       holder_memo = COALESCE(@holder_memo, holder_memo), holder_address = COALESCE(@holder_address, holder_address),
       upd_dt = datetime('now','localtime'), upd_id = @session_user_id
 WHERE pt_no = @pt_no AND holder_idx = @holder_idx;

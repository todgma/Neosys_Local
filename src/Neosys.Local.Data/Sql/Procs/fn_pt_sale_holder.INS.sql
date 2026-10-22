-- 소유자/임차인 등록(holder_idx는 서비스에서 채번)
-- from schema/pg/functions/fn_pt_sale_holder.sql (pr_proc='INS')
INSERT INTO pt_sale_holder (pt_no, holder_idx, holder_type, holder_reg_date, holder_name, holder_phone,
                            cust_no, holder_relation, holder_memo, holder_address, reg_dt, reg_id)
VALUES (@pt_no, @holder_idx, COALESCE(@holder_type, 'OWNER'), COALESCE(@holder_reg_date, date('now','localtime')), @holder_name, @holder_phone,
        @cust_no, @holder_relation, @holder_memo, @holder_address, datetime('now','localtime'), @session_user_id)
RETURNING holder_idx;

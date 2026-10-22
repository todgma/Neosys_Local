-- 메모 등록
-- from legacy/API/Customer/Services/CustomersServices.cs SyncMemos, Property/Services/PropertyServices.cs SyncPropertyMemos
INSERT INTO pt_memo (pt_no, cust_no, memo_date, memo_content, contact_name, contact_phone, user_id, reg_id, reg_dt)
VALUES (@pt_no, @cust_no, COALESCE(@memo_date, datetime('now','localtime')), @memo_content, @contact_name, @contact_phone,
        COALESCE(@user_id, @session_user_id), @session_user_id, datetime('now','localtime'))
RETURNING memo_no;

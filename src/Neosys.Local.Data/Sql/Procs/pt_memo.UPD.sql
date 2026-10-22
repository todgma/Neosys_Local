-- 메모 수정 — 내용·연락처가 실제로 바뀐 경우에만(변경 없으면 upd_dt 유지)
-- from legacy/API/Customer/Services/CustomersServices.cs SyncMemos
UPDATE pt_memo
   SET memo_date = COALESCE(@memo_date, memo_date), memo_content = @memo_content,
       contact_name = @contact_name, contact_phone = @contact_phone,
       upd_dt = datetime('now','localtime'), upd_id = @session_user_id
 WHERE memo_no = @memo_no
   AND (memo_content IS NOT @memo_content OR contact_name IS NOT @contact_name OR contact_phone IS NOT @contact_phone
        OR memo_date IS NOT COALESCE(@memo_date, memo_date));

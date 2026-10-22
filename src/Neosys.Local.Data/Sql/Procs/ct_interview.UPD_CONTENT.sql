-- 상담 내용·연락처만 수정(고객·물건 등록창의 상담이력) — 바뀐 경우에만
-- from legacy/API/Customer/Services/CustomersServices.cs SyncConsults
UPDATE ct_interview
   SET itv_content = @itv_content, contact_name = @contact_name, contact_phone = @contact_phone,
       upd_dt = datetime('now','localtime'), upd_id = @session_user_id
 WHERE itv_no = @itv_no
   AND (itv_content IS NOT @itv_content OR contact_name IS NOT @contact_name OR contact_phone IS NOT @contact_phone);

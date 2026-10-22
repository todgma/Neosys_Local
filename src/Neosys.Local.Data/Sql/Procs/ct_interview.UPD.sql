-- 상담 수정
-- from legacy/API/Interview/Services/InterviewServices.cs
UPDATE ct_interview
   SET itv_type = COALESCE(@itv_type, itv_type), itv_date = COALESCE(@itv_date, itv_date),
       cust_no = @cust_no, cust_name = @cust_name, cust_phone = @cust_phone, pt_no = @pt_no,
       itv_content = @itv_content, itv_memo = @itv_memo, contact_name = @contact_name, contact_phone = @contact_phone,
       upd_dt = datetime('now','localtime'), upd_id = @session_user_id
 WHERE itv_no = @itv_no;

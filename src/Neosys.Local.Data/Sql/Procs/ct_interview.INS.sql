-- 상담 등록 — 새 상담번호 반환. 상담일 기본값 = 오늘(로컬)
-- from legacy/API/Interview/Services/InterviewServices.cs, Customer/Services/CustomersServices.cs SyncConsults
INSERT INTO ct_interview (itv_type, itv_date, cust_no, cust_name, cust_phone, pt_no, itv_content, itv_memo,
                          contact_name, contact_phone, rt_no, off_no, vendor_id, reg_dt, reg_id)
VALUES (COALESCE(@itv_type, 'ITVTYP01'), COALESCE(@itv_date, date('now','localtime')), @cust_no, @cust_name, @cust_phone, @pt_no,
        @itv_content, @itv_memo, @contact_name, @contact_phone,
        COALESCE(@rt_no, @session_rt_no), COALESCE(@off_no, @session_off_no), @vendor_id, datetime('now','localtime'), @session_user_id)
RETURNING itv_no;

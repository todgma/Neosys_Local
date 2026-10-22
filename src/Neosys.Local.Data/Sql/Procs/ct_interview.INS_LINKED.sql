-- 상담 등록(상담관리·네오봇) 뒤 연결 저장:
--  1) 연락처가 고객 구입자 전화번호와 같으면 그 고객 상담이력에도(입력 대상 고객 제외)
--  2) 물건 미지정이고 연락처가 물건 소유자/임차인 전화번호와 같으면 그 물건 상담이력에도
-- from legacy/API/Interview/Services/InterviewServices.cs InsertInterview
INSERT INTO ct_interview (itv_type, itv_date, cust_no, cust_name, cust_phone, pt_no, itv_content, itv_memo, rt_no, off_no, vendor_id,
                          contact_name, contact_phone, reg_dt, reg_id)
SELECT COALESCE(@itv_type, 'ITVTYP01'), COALESCE(@itv_date, date('now','localtime')), c.cust_no, @cust_name, @cust_phone,
       NULL, @itv_content, @itv_memo, c.rt_no, c.off_no, @vendor_id, @contact_name, @contact_phone, datetime('now','localtime'), @session_user_id
  FROM (SELECT DISTINCT cc.cust_no, cc.rt_no, cc.off_no
          FROM ct_cust_buyer b JOIN ct_cust cc ON cc.cust_no = b.cust_no
         WHERE COALESCE(b.tel, '') <> '' AND digits(b.tel) = digits(@contact_phone)) c
 WHERE length(digits(COALESCE(@contact_phone, ''))) >= 9
   AND (@cust_no IS NULL OR c.cust_no <> @cust_no);

INSERT INTO ct_interview (itv_type, itv_date, cust_no, cust_name, cust_phone, pt_no, itv_content, itv_memo, rt_no, off_no, vendor_id,
                          contact_name, contact_phone, reg_dt, reg_id)
SELECT COALESCE(@itv_type, 'ITVTYP01'), COALESCE(@itv_date, date('now','localtime')), NULL, @cust_name, @cust_phone,
       h.pt_no, @itv_content, @itv_memo, h.rt_no, h.off_no, @vendor_id, @contact_name, @contact_phone, datetime('now','localtime'), @session_user_id
  FROM (SELECT DISTINCT ps.pt_no, ps.off_no,
               CASE WHEN ps.rt_no GLOB '[0-9]*' AND ps.rt_no NOT GLOB '*[^0-9]*' THEN CAST(ps.rt_no AS INTEGER) END AS rt_no
          FROM pt_sale_holder hh JOIN pt_sale ps ON ps.pt_no = hh.pt_no
         WHERE COALESCE(hh.holder_phone, '') <> '' AND digits(hh.holder_phone) = digits(@contact_phone)) h
 WHERE @pt_no IS NULL
   AND length(digits(COALESCE(@contact_phone, ''))) >= 9;

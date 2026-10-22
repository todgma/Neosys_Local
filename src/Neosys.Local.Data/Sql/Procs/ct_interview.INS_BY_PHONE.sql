-- 물건 상담 연락처가 고객 구입자 전화번호와 같으면 그 고객의 상담이력에도 함께 남긴다(숫자 9자리 이상만)
-- from legacy/API/Property/Services/PropertyServices.cs SyncPropertyConsults
INSERT INTO ct_interview (itv_type, itv_date, cust_no, cust_name, itv_content, contact_name, contact_phone, off_no, rt_no, reg_dt, reg_id)
SELECT 'ITVTYP01', COALESCE(@itv_date, date('now','localtime')), c.cust_no, @cust_name, @itv_content, @contact_name, @contact_phone,
       c.off_no, c.rt_no, datetime('now','localtime'), @session_user_id
  FROM (SELECT DISTINCT cc.cust_no, cc.off_no, cc.rt_no
          FROM ct_cust_buyer b JOIN ct_cust cc ON cc.cust_no = b.cust_no
         WHERE COALESCE(b.tel, '') <> '' AND digits(b.tel) = digits(@contact_phone)) c
 WHERE length(digits(COALESCE(@contact_phone, ''))) >= 9;

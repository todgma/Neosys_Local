-- 고객 삭제 — 희망지역·구입자·공동중개사·메모도 함께(상담이력은 남김: 상담관리 메뉴의 기록)
-- from legacy/API/Customer/Services/CustomersServices.cs DeleteCustomer
DELETE FROM ct_trd_area   WHERE cust_no = @cust_no;
DELETE FROM ct_cust_buyer WHERE cust_no = @cust_no;
DELETE FROM pt_share      WHERE cust_no = @cust_no;
DELETE FROM pt_memo       WHERE cust_no = @cust_no;
DELETE FROM report_cust   WHERE cust_no = @cust_no;
DELETE FROM ct_cust       WHERE cust_no = @cust_no;

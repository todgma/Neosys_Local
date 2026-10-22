-- 고객 구입자 1건(성함 필수 컬럼 — 비어 있으면 빈 문자열)
-- from legacy/API/Customer/Services/CustomersServices.cs SyncBuyers
INSERT INTO ct_cust_buyer (cust_no, seq, name, relation, tel, addr, reg_dt, reg_id)
VALUES (@cust_no, @seq, COALESCE(@name, ''), @relation, @tel, @addr, datetime('now','localtime'), @session_user_id);

-- 고객 구입희망지역 1건
-- from legacy/API/Customer/Services/CustomersServices.cs SyncAreas
INSERT INTO ct_trd_area (cust_no, seq, addr1, addr2, addr3, bjd_code, bld_nm, danji_code, detail_loc, reg_dt, reg_id)
VALUES (@cust_no, @seq, @addr1, @addr2, @addr3, @bjd_code, @bld_nm, @danji_code, @detail_loc, datetime('now','localtime'), @session_user_id);

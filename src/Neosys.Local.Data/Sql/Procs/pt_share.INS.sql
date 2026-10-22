-- 공동중개사 사무소 1건(pt_no·cust_no 중 하나만 채운다)
-- from legacy/API/Customer/Services/CustomersServices.cs SyncShares, Property/Services/PropertyServices.cs SyncPropertyShares
INSERT INTO pt_share (pt_no, cust_no, share_idx, office_name, region_name, office_phone, memo, share_date, reg_dt, reg_id)
VALUES (@pt_no, @cust_no, @share_idx, @office_name, @region_name, @office_phone, @memo, @share_date, datetime('now','localtime'), @session_user_id);

-- 임대차현황서 1행
-- from legacy/API/Property/Services/PropertyServices.cs SyncPropertyLeaseRows
INSERT INTO pt_lease_status (pt_no, seq, room_no, area, cur_status, deposit, monthly_rent, maint_cost,
                             contract_start, contract_end, business_type, business_name, reg_dt, reg_id)
VALUES (@pt_no, @seq, @room_no, @area, @cur_status, @deposit, @monthly_rent, @maint_cost,
        @contract_start, @contract_end, @business_type, @business_name, datetime('now','localtime'), @session_user_id);

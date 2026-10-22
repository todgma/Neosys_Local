-- 토지 필지 1행
-- from legacy/API/Property/Services/PropertyServices.cs SyncPropertyLandParcels
INSERT INTO pt_land_additional (pt_no, seq, dong, soji, bjd_code, jibun, land_area, land_category, land_use, other_restrictions, reg_dt, reg_id)
VALUES (@pt_no, @seq, @dong, @soji, @bjd_code, @jibun, @land_area, @land_category, @land_use, @other_restrictions, datetime('now','localtime'), @session_user_id);

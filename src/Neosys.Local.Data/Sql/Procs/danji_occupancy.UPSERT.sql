-- 점유현황 저장(사무소·단지·동·호 단위 upsert)
-- from legacy/API/Property/Services/LayoutService.cs SaveOccupancyAsync
INSERT INTO danji_occupancy (off_no, naver_danji_code, dong_no, ho_number, floor, occupancy_status, occupancy_name, occupancy_phone, memo, reg_dt, reg_id)
VALUES (COALESCE(@session_off_no, 0), @naver_danji_code, @dong_no, @ho_number, @floor, @occupancy_status, @occupancy_name, @occupancy_phone, @memo,
        datetime('now','localtime'), @session_user_id)
ON CONFLICT (off_no, naver_danji_code, dong_no, ho_number) DO UPDATE SET
    floor = excluded.floor, occupancy_status = excluded.occupancy_status, occupancy_name = excluded.occupancy_name,
    occupancy_phone = excluded.occupancy_phone, memo = excluded.memo, upd_dt = datetime('now','localtime'), upd_id = @session_user_id;

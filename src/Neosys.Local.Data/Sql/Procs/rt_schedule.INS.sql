-- 일정 등록 — 새 schedule_id 반환. 소유자=로그인 사용자, 사무소=로그인 사무소
-- from legacy/API/Schedule/Services/ScheduleServices.cs InsertSchedule
INSERT INTO rt_schedule (scope_div, owner_user_id, office_id, title, content, phone, location,
                         start_at, end_at, all_day, is_shared, is_private,
                         category, amount, contact_name, contact_role, phone2, contact_name2, contact_role2, use_yn, reg_id, reg_dt)
VALUES (COALESCE(@scope_div, 'MY'), @session_user_id, @session_off_no, @title, @content, @phone, @location,
        @start_at, @end_at, COALESCE(@all_day, 0), COALESCE(@is_shared, 0), COALESCE(@is_private, 0),
        @category, @amount, @contact_name, @contact_role, @phone2, @contact_name2, @contact_role2, 'Y', @session_user_id, datetime('now','localtime'))
RETURNING schedule_id;

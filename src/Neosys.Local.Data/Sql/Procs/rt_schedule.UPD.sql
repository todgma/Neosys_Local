-- 일정 수정
-- from legacy/API/Schedule/Services/ScheduleServices.cs UpdateSchedule
UPDATE rt_schedule SET
    scope_div = COALESCE(@scope_div, scope_div), title = @title, content = @content, phone = @phone, location = @location,
    start_at = COALESCE(@start_at, start_at), end_at = @end_at, all_day = COALESCE(@all_day, all_day),
    is_shared = COALESCE(@is_shared, is_shared), is_private = COALESCE(@is_private, is_private),
    category = @category, amount = @amount, contact_name = @contact_name, contact_role = @contact_role,
    phone2 = @phone2, contact_name2 = @contact_name2, contact_role2 = @contact_role2,
    upd_id = @session_user_id, upd_dt = datetime('now','localtime')
 WHERE schedule_id = @schedule_id;

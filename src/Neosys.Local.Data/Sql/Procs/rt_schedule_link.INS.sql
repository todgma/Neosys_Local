-- 일정 연동정보 1건(link_type: PT=물건)
-- from legacy/API/Schedule/Services/ScheduleServices.cs InsertScheduleLinks
INSERT INTO rt_schedule_link (schedule_id, link_type, link_key, meta, reg_id, reg_dt)
VALUES (@schedule_id, @link_type, @link_key, @meta, @session_user_id, datetime('now','localtime'));

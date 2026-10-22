-- 일정 삭제 — 사용안함 처리 + 연동정보 삭제(기존과 동일)
-- from legacy/API/Schedule/Services/ScheduleServices.cs DeleteSchedule
UPDATE rt_schedule SET use_yn = 'N', upd_id = @session_user_id, upd_dt = datetime('now','localtime') WHERE schedule_id = @schedule_id;
DELETE FROM rt_schedule_link WHERE schedule_id = @schedule_id;

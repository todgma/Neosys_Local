-- 일정 연동정보 전체 삭제(저장 시 전체 교체)
-- from legacy/API/Schedule/Services/ScheduleServices.cs UpdateSchedule
DELETE FROM rt_schedule_link WHERE schedule_id = @schedule_id;

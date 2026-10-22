-- 물건에 연동된 일정(rt_schedule_link link_type='PT')
-- from legacy/API/Schedule/Services/ScheduleServices.cs SelectScheduleListByProperty
SELECT s.* FROM rt_schedule s JOIN rt_schedule_link l ON l.schedule_id = s.schedule_id
 WHERE s.use_yn = 'Y' AND l.link_type = 'PT' AND l.link_key = CAST(@pt_no AS TEXT)
 ORDER BY s.start_at DESC;

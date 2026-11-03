-- 일정 1건(+ 연동 물건) — 사용중만(삭제한 일정은 없음)
-- from legacy/API/Schedule/Services/ScheduleServices.cs
SELECT s.*,
       (SELECT l.link_key FROM rt_schedule_link l WHERE l.schedule_id = s.schedule_id AND l.link_type = 'PT' ORDER BY l.link_id LIMIT 1) AS pt_no,
       (SELECT p.pt_name FROM rt_schedule_link l JOIN pt_sale p ON CAST(p.pt_no AS TEXT) = l.link_key
         WHERE l.schedule_id = s.schedule_id AND l.link_type = 'PT' ORDER BY l.link_id LIMIT 1) AS pt_name
  FROM rt_schedule s WHERE s.schedule_id = @schedule_id AND s.use_yn = 'Y';

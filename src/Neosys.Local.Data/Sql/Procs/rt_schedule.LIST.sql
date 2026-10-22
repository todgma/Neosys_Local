-- 일정 목록 — 기간(시작일시 기준)·범위. MY: 본인 소유(개인+공유), OFFICE: 사무실 일정(사무실+공유, 사무소 기준)
--  종료일은 그날 하루 전체 포함(기존은 자정 비교로 말일 일정이 빠졌음)
-- from legacy/API/Schedule/Services/ScheduleServices.cs SelectScheduleList
SELECT s.*,
       (SELECT l.link_key FROM rt_schedule_link l WHERE l.schedule_id = s.schedule_id AND l.link_type = 'PT' ORDER BY l.link_id LIMIT 1) AS pt_no,
       (SELECT p.pt_name FROM rt_schedule_link l JOIN pt_sale p ON CAST(p.pt_no AS TEXT) = l.link_key
         WHERE l.schedule_id = s.schedule_id AND l.link_type = 'PT' ORDER BY l.link_id LIMIT 1) AS pt_name
  FROM rt_schedule s
 WHERE s.use_yn = 'Y'
   AND (@q_from IS NULL OR s.start_at >= @q_from)
   AND (@q_to IS NULL OR s.start_at < date(@q_to, '+1 day'))
   AND (
         (@q_scope = 'OFFICE' AND s.scope_div IN ('OFFICE', 'SHARE') AND (s.office_id = @session_off_no OR @session_off_no IS NULL))
      OR (COALESCE(@q_scope, 'MY') = 'MY' AND s.scope_div IN ('MY', 'SHARE') AND s.owner_user_id = @session_user_id)
      OR (@q_scope = 'ALL' AND (s.owner_user_id = @session_user_id OR (s.scope_div IN ('OFFICE', 'SHARE') AND (s.office_id = @session_off_no OR @session_off_no IS NULL))))
   )
 ORDER BY s.start_at, s.schedule_id;

-- 월별 작성현황(사무소) — 작성된 (작성자, 일자)
-- from legacy/API/Worklog/Controllers/WorkJournalController.cs GetStatus
SELECT user_id, jrnl_date FROM rt_work_journal
 WHERE (off_no = @session_off_no OR @session_off_no IS NULL) AND jrnl_date >= @q_from AND jrnl_date < @q_to
 ORDER BY jrnl_date;

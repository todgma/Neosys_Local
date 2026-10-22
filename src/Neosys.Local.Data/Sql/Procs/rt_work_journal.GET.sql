-- 업무일지 1건(작성자·일자)
-- from legacy/API/Worklog/Controllers/WorkJournalController.cs GetJournal
SELECT * FROM rt_work_journal WHERE user_id = COALESCE(@q_user, @session_user_id) AND jrnl_date = @q_date;

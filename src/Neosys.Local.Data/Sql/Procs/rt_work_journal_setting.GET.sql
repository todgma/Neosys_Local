-- 업무일지 공유 설정(사무소 단위, 기본 'Y' = 모두공개)
-- from legacy/API/Worklog/Controllers/WorkJournalController.cs GetShare
SELECT COALESCE((SELECT share_all FROM rt_work_journal_setting WHERE off_no = @session_off_no), 'Y') AS share_all;

-- 업무일지 공유 설정 저장(대표만) — 'Y' 모두공개 / 'N' 대표+담당자공개
-- from legacy/API/Worklog/Controllers/WorkJournalController.cs SetShare
INSERT INTO rt_work_journal_setting (off_no, share_all, upd_id, upd_dt)
VALUES (@session_off_no, @share_all, @session_user_id, datetime('now','localtime'))
ON CONFLICT (off_no) DO UPDATE SET share_all = excluded.share_all, upd_id = excluded.upd_id, upd_dt = excluded.upd_dt;

-- 업무일지 저장(작성자·일자 기준 upsert)
-- from legacy/API/Worklog/Controllers/WorkJournalController.cs SaveJournal
INSERT INTO rt_work_journal (off_no, rt_no, user_id, jrnl_date, prop_reg, prop_upd, sched_reg, sched_upd,
                             call_cnt, consult_memo, content, remark, extra_pages, reg_id, reg_dt)
VALUES (@session_off_no, @session_rt_no, @session_user_id, @jrnl_date, COALESCE(@prop_reg, 0), COALESCE(@prop_upd, 0),
        COALESCE(@sched_reg, 0), COALESCE(@sched_upd, 0), COALESCE(@call_cnt, 0), COALESCE(@consult_memo, 0),
        @content, @remark, @extra_pages, @session_user_id, datetime('now','localtime'))
ON CONFLICT (user_id, jrnl_date) DO UPDATE SET
    off_no = excluded.off_no, rt_no = excluded.rt_no, prop_reg = excluded.prop_reg, prop_upd = excluded.prop_upd,
    sched_reg = excluded.sched_reg, sched_upd = excluded.sched_upd, call_cnt = excluded.call_cnt, consult_memo = excluded.consult_memo,
    content = excluded.content, remark = excluded.remark, extra_pages = excluded.extra_pages,
    upd_id = @session_user_id, upd_dt = datetime('now','localtime');

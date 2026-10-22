-- 업무일지 자동집계 — 로그인 사용자가 그날 등록(I)/수정(U)/삭제(D)한 건수(*_hist 기준)
--  공동중개망·쪽지·문자·커뮤니티는 로컬 이관 범위 밖이라 집계하지 않음
-- from legacy/API/Worklog/Controllers/WorkJournalController.cs GetSummary
SELECT (SELECT count(*) FROM "pt_sale_hist" WHERE changed_by = @session_user_id AND log_type = 'I' AND substr(logged_at, 1, 10) = @q_date) AS prop_reg,
       (SELECT count(*) FROM "pt_sale_hist" WHERE changed_by = @session_user_id AND log_type = 'U' AND substr(logged_at, 1, 10) = @q_date) AS prop_upd,
       (SELECT count(*) FROM "pt_sale_hist" WHERE changed_by = @session_user_id AND log_type = 'D' AND substr(logged_at, 1, 10) = @q_date) AS prop_del,
       (SELECT count(*) FROM "ct_cust_hist" WHERE changed_by = @session_user_id AND log_type = 'I' AND substr(logged_at, 1, 10) = @q_date) AS cust_reg,
       (SELECT count(*) FROM "ct_cust_hist" WHERE changed_by = @session_user_id AND log_type = 'U' AND substr(logged_at, 1, 10) = @q_date) AS cust_upd,
       (SELECT count(*) FROM "ct_cust_hist" WHERE changed_by = @session_user_id AND log_type = 'D' AND substr(logged_at, 1, 10) = @q_date) AS cust_del,
       (SELECT count(*) FROM "contract_master_hist" WHERE changed_by = @session_user_id AND log_type = 'I' AND substr(logged_at, 1, 10) = @q_date) AS contract_write,
       (SELECT count(*) FROM "contract_master_hist" WHERE changed_by = @session_user_id AND log_type = 'U' AND substr(logged_at, 1, 10) = @q_date) AS contract_upd,
       (SELECT count(*) FROM "rt_schedule_hist" WHERE changed_by = @session_user_id AND log_type = 'I' AND substr(logged_at, 1, 10) = @q_date) AS sched_reg,
       (SELECT count(*) FROM "rt_schedule_hist" WHERE changed_by = @session_user_id AND log_type = 'U' AND substr(logged_at, 1, 10) = @q_date) AS sched_upd,
       (SELECT count(*) FROM "rt_schedule_hist" WHERE changed_by = @session_user_id AND log_type = 'D' AND substr(logged_at, 1, 10) = @q_date) AS sched_del,
       (SELECT count(*) FROM "ct_interview_hist" WHERE changed_by = @session_user_id AND log_type = 'I' AND substr(logged_at, 1, 10) = @q_date) AS consult_memo,
       (SELECT count(*) FROM "vd_vendor_info_hist" WHERE changed_by = @session_user_id AND log_type = 'I' AND substr(logged_at, 1, 10) = @q_date) AS vendor_reg,
       (SELECT count(*) FROM "vd_vendor_info_hist" WHERE changed_by = @session_user_id AND log_type = 'U' AND substr(logged_at, 1, 10) = @q_date) AS vendor_upd,
       (SELECT count(*) FROM "vd_vendor_info_hist" WHERE changed_by = @session_user_id AND log_type = 'D' AND substr(logged_at, 1, 10) = @q_date) AS vendor_del;

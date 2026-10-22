-- 보고서 고객 배포(이미 있으면 무시)
-- from legacy/API/Report/Services/ReportService.cs AttachCustomers
INSERT INTO report_cust (report_no, cust_no, reg_dt, reg_id)
VALUES (@report_no, @cust_no, datetime('now','localtime'), @session_user_id)
ON CONFLICT (report_no, cust_no) DO NOTHING;

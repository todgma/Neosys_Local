-- 보고서(매물 브리핑) 등록 — 새 report_no 반환
-- from legacy/API/Report/Services/ReportService.cs CreateReport
INSERT INTO report (pt_no, title, comment, snapshot, content_html, reg_dt, reg_id)
VALUES (@pt_no, @title, @comment, @snapshot, @content_html, datetime('now','localtime'), @session_user_id)
RETURNING report_no;

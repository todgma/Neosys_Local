-- 보고서 수정
-- from legacy/API/Report/Services/ReportService.cs CreateReport(isUpdate)
UPDATE report
   SET pt_no = @pt_no, title = @title, comment = @comment, snapshot = @snapshot, content_html = @content_html,
       upd_dt = datetime('now','localtime'), upd_id = @session_user_id
 WHERE report_no = @report_no;

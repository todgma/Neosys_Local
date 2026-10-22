-- 보고서 삭제(배포 고객 먼저)
-- from legacy/API/Report/Services/ReportService.cs DeleteReport
DELETE FROM report_cust WHERE report_no = @report_no;
DELETE FROM report WHERE report_no = @report_no;

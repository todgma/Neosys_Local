-- 보고서 배포 고객 전체 삭제(수정 시 재구성)
-- from legacy/API/Report/Services/ReportService.cs CreateReport(isUpdate)
DELETE FROM report_cust WHERE report_no = @report_no;

-- 보고서 공유(배포) 고객 — 이름·연락처 포함
-- from legacy/API/Report/Services/ReportService.cs GetReportShares
SELECT rc.report_no, rc.cust_no, c.name, c.tel, rc.reg_dt
  FROM report_cust rc
  LEFT JOIN ct_cust c ON c.cust_no = rc.cust_no
 WHERE rc.report_no = @report_no
 ORDER BY rc.reg_dt DESC, rc.cust_no;

-- 보고서 목록 — 내가 만든 것(@q_user_id) / 물건별(@q_pt_no) / 고객별(@q_cust_no), 배포 고객 수 포함
-- from legacy/API/Report/Services/ReportService.cs GetReportsByUser / ByProperty / ByCustomer
SELECT r.report_no, r.pt_no, r.title, r.comment, r.reg_dt, r.reg_id, r.upd_dt,
       (SELECT COUNT(*) FROM report_cust rc WHERE rc.report_no = r.report_no) AS cust_count,
       (SELECT group_concat(c.name, ', ') FROM report_cust rc LEFT JOIN ct_cust c ON c.cust_no = rc.cust_no WHERE rc.report_no = r.report_no) AS cust_names
  FROM report r
 WHERE (@q_user_id IS NULL OR r.reg_id = @q_user_id)
   AND (@q_pt_no IS NULL OR r.pt_no = @q_pt_no)
   AND (@q_cust_no IS NULL OR EXISTS (SELECT 1 FROM report_cust rc WHERE rc.report_no = r.report_no AND rc.cust_no = @q_cust_no))
   AND (@q_keyword IS NULL OR r.title LIKE '%' || @q_keyword || '%' OR r.comment LIKE '%' || @q_keyword || '%')
 ORDER BY r.report_no DESC;

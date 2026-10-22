-- 상담관리 목록 — 기간(상담일자)·상담유형·검색어(고객명/연락처/내용/메모)
-- from legacy/API/Interview/Services/InterviewServices.cs SelectInterviewList
SELECT a.*,
       p.pt_name, p.addr3 AS pt_addr3, v.vendor_name
  FROM ct_interview a
  LEFT JOIN pt_sale p ON p.pt_no = a.pt_no
  LEFT JOIN vd_vendor_info v ON v.vendor_id = a.vendor_id
 WHERE (a.off_no = @session_off_no OR a.off_no IS NULL OR @session_off_no IS NULL)
   AND (@q_fr_date IS NULL OR a.itv_date >= @q_fr_date)
   AND (@q_to_date IS NULL OR a.itv_date <= @q_to_date)
   AND (@q_itv_type IS NULL OR a.itv_type = @q_itv_type)
   AND (@q_keyword IS NULL
        OR a.cust_name   LIKE '%' || @q_keyword || '%'
        OR a.contact_name LIKE '%' || @q_keyword || '%'
        OR digits(COALESCE(a.cust_phone, '') || ' ' || COALESCE(a.contact_phone, '')) LIKE '%' || digits(@q_keyword) || '%' AND length(digits(@q_keyword)) > 0
        OR a.itv_content LIKE '%' || @q_keyword || '%'
        OR a.itv_memo    LIKE '%' || @q_keyword || '%')
   AND (@q_vendor_id IS NULL OR a.vendor_id = @q_vendor_id)
 ORDER BY a.itv_date DESC, a.itv_no DESC;

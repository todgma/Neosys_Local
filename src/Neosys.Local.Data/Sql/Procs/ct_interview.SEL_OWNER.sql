-- 상담이력 — 고객(cust_no)·물건(pt_no)·협력업체(vendor_id) 중 지정한 대상에 딸린 목록, 최신순
-- from legacy/API/Interview/Services/InterviewServices.cs GetInterviewsByCustomer/ByProperty/ByVendor
SELECT * FROM ct_interview
 WHERE (@cust_no IS NULL OR cust_no = @cust_no)
   AND (@pt_no IS NULL OR pt_no = @pt_no)
   AND (@vendor_id IS NULL OR vendor_id = @vendor_id)
   AND (@cust_no IS NOT NULL OR @pt_no IS NOT NULL OR @vendor_id IS NOT NULL)
 ORDER BY reg_dt DESC, itv_no DESC;

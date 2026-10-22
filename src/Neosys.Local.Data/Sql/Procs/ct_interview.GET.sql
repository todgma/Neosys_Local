-- 상담 1건
-- from legacy/API/Interview/Services/InterviewServices.cs
SELECT a.*, p.pt_name, v.vendor_name
  FROM ct_interview a
  LEFT JOIN pt_sale p ON p.pt_no = a.pt_no
  LEFT JOIN vd_vendor_info v ON v.vendor_id = a.vendor_id
 WHERE a.itv_no = @itv_no;

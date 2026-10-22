-- 협력업체 목록 — 사용중(use_yn='Y')만. 분류·검색어(상호/담당자/전화/상품설명) 필터
-- from legacy/API/Vendor/Services/VendorService.cs SelectVendorList
SELECT v.*,
       (SELECT count(*) FROM ct_interview i WHERE i.vendor_id = v.vendor_id) AS consult_cnt,
       (SELECT group_concat(r.region_name, ', ') FROM (SELECT region_name FROM vd_vendor_region
                 WHERE vendor_id = v.vendor_id AND use_yn = 'Y' ORDER BY sort_order, vendor_region_id) r) AS business_region
  FROM vd_vendor_info v
 WHERE v.use_yn = 'Y'
   AND (v.off_no IS NULL OR @session_off_no IS NULL OR v.off_no = @session_off_no)
   AND (@q_category IS NULL OR v.category1 = @q_category)
   AND (@q_keyword IS NULL
        OR v.vendor_name LIKE '%' || @q_keyword || '%'
        OR v.manager_name LIKE '%' || @q_keyword || '%'
        OR v.ceo_name LIKE '%' || @q_keyword || '%'
        OR (length(digits(@q_keyword)) > 0 AND digits(COALESCE(v.manager_phone,'') || ' ' || COALESCE(v.manager_tel,'') || ' ' || COALESCE(v.ceo_phone,'')) LIKE '%' || digits(@q_keyword) || '%')
        OR v.product_desc LIKE '%' || @q_keyword || '%')
 ORDER BY v.sort_order, v.vendor_id DESC;

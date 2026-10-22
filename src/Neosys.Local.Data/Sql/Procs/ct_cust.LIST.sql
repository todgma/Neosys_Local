-- 고객 목록 — 사무소 기준. 검색어는 성함·계약당사자·전화·주소, 물건유형/거래유형/고객상태는 콤마 다중값
-- from legacy/API/Customer/Services/CustomersServices.cs SelecCustomerList
SELECT c.*,
       (SELECT group_concat(COALESCE(NULLIF(a.bld_nm, ''), a.addr3), ', ')
          FROM ct_trd_area a WHERE a.cust_no = c.cust_no) AS wish_areas,
       (SELECT count(*) FROM report_cust rc WHERE rc.cust_no = c.cust_no) AS report_count,
       (SELECT r."RtNm" FROM rt_realtor_info r WHERE r."RtNo" = c.rt_no) AS rt_nm
  FROM ct_cust c
 WHERE (c.off_no = @session_off_no OR c.off_no IS NULL OR @session_off_no IS NULL)
   AND (@q_keyword IS NULL
        OR c.name  LIKE '%' || @q_keyword || '%'
        OR c.alias LIKE '%' || @q_keyword || '%'
        OR replace(c.tel, '-', '') LIKE '%' || replace(@q_keyword, '-', '') || '%'
        OR c.addr  LIKE '%' || @q_keyword || '%'
        OR c.feature_note LIKE '%' || @q_keyword || '%'
        OR EXISTS (SELECT 1 FROM ct_trd_area a WHERE a.cust_no = c.cust_no
                     AND (a.addr3 LIKE '%' || @q_keyword || '%' OR a.bld_nm LIKE '%' || @q_keyword || '%')))
   AND (@q_want_type IS NULL OR c.want_type IN (SELECT value FROM json_each('["' || replace(@q_want_type, ',', '","') || '"]')))
   AND (@q_trd_type  IS NULL OR EXISTS (SELECT 1 FROM json_each('["' || replace(@q_trd_type, ',', '","') || '"]') t
                                         WHERE c.trd_type LIKE '%' || t.value || '%'))
   AND (@q_trd_prg   IS NULL OR c.trd_prg IN (SELECT value FROM json_each('["' || replace(@q_trd_prg, ',', '","') || '"]')))
   AND (@q_rt_no     IS NULL OR c.rt_no = @q_rt_no)
 ORDER BY COALESCE(c.upd_dt, c.reg_dt) DESC, c.cust_no DESC;

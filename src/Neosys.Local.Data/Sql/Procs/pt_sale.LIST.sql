-- 물건 목록 — 사무소 기준. 물건번호(좌측 물건리스트 단건)·유형(콤마 다중)·거래구분(콤마, LIKE)·진행상태·단지·지역(법정동 접두)·동/호·층·면적/금액/월세 범위·검색어
-- from legacy/API/Property/Services/PropertyServices.cs SelectPropertyList (PT_WHERE)
SELECT a.*,
       (SELECT MAX(r.report_no) FROM report r WHERE r.pt_no = a.pt_no) AS report_no,
       (SELECT i.itv_content FROM ct_interview i WHERE i.pt_no = a.pt_no ORDER BY i.itv_no DESC LIMIT 1) AS consult_content,
       (SELECT COALESCE(SUM(l.deposit), 0) FROM pt_lease_status l WHERE l.pt_no = a.pt_no) AS deposit_sum,
       (SELECT COALESCE(SUM(l.monthly_rent), 0) FROM pt_lease_status l WHERE l.pt_no = a.pt_no) AS mon_sum,
       (SELECT h.holder_name FROM pt_sale_holder h WHERE h.pt_no = a.pt_no AND COALESCE(h.holder_type, 'OWNER') = 'OWNER' ORDER BY h.holder_idx LIMIT 1) AS owner_name,
       (SELECT h.holder_phone FROM pt_sale_holder h WHERE h.pt_no = a.pt_no AND COALESCE(h.holder_type, 'OWNER') = 'OWNER' ORDER BY h.holder_idx LIMIT 1) AS owner_phone,
       (SELECT r."RtNm" FROM rt_realtor_info r WHERE CAST(r."RtNo" AS TEXT) = a.rt_no) AS rt_nm
  FROM pt_sale a
 WHERE (a.off_no = @session_off_no OR a.off_no IS NULL OR @session_off_no IS NULL)
   AND (@q_pt_no IS NULL OR a.pt_no = @q_pt_no)
   AND (@q_keyword IS NULL
        OR a.pt_name LIKE '%' || @q_keyword || '%' OR a.addr1 LIKE '%' || @q_keyword || '%'
        OR a.addr2 LIKE '%' || @q_keyword || '%' OR a.addr3 LIKE '%' || @q_keyword || '%'
        OR a.addr4 LIKE '%' || @q_keyword || '%' OR a.addr5 LIKE '%' || @q_keyword || '%'
        OR a.jibun LIKE '%' || @q_keyword || '%' OR a.pt_memo LIKE '%' || @q_keyword || '%'
        OR a.business_name LIKE '%' || @q_keyword || '%'
        OR CAST(a.dong AS TEXT) LIKE '%' || @q_keyword || '%' OR a.ho LIKE '%' || @q_keyword || '%'
        OR EXISTS (SELECT 1 FROM pt_sale_holder h WHERE h.pt_no = a.pt_no
                     AND (h.holder_name LIKE '%' || @q_keyword || '%'
                          OR (length(digits(@q_keyword)) >= 4 AND digits(h.holder_phone) LIKE '%' || digits(@q_keyword) || '%'))))
   AND (@q_pt_type IS NULL OR (',' || @q_pt_type || ',') LIKE ('%,' || a.pt_type || ',%'))
   AND (@q_sale_div IS NULL OR EXISTS (SELECT 1 FROM json_each('["' || replace(@q_sale_div, ',', '","') || '"]') f
                                        WHERE a.sale_div LIKE '%' || f.value || '%'))
   AND (@q_pt_sts IS NULL OR a.pt_sts LIKE '%' || @q_pt_sts || '%')
   AND (@q_rt_no IS NULL OR a.rt_no = CAST(@q_rt_no AS TEXT))
   AND (@q_danji_code IS NULL OR a.danji_code = @q_danji_code)
   AND (@q_bjd_codes IS NULL OR EXISTS (SELECT 1 FROM json_each('["' || replace(@q_bjd_codes, ',', '","') || '"]') b
                                         WHERE a.bjd_code LIKE b.value || '%'))
   AND (@q_dong IS NULL OR CAST(a.dong AS TEXT) LIKE '%' || @q_dong || '%')
   AND (@q_ho IS NULL OR a.ho LIKE '%' || @q_ho || '%')
   AND (@q_floor IS NULL
        OR (@q_floor = 'top' AND a.floor1 IS NOT NULL AND a.floor2 IS NOT NULL AND a.floor1 = a.floor2)
        OR (@q_floor = 'first' AND a.floor1 = 1)
        OR (@q_floor = 'exceptFirst' AND (a.floor1 IS NULL OR a.floor1 <> 1)))
   AND (@q_area_min IS NULL OR (CASE WHEN a.pt_type = 'SYCA115' THEN a.land_share ELSE a.exc_area END) >= @q_area_min)
   AND (@q_area_max IS NULL OR (CASE WHEN a.pt_type = 'SYCA115' THEN a.land_share ELSE a.exc_area END) <= @q_area_max)
   AND ((@q_amt_min IS NULL AND @q_amt_max IS NULL) OR EXISTS (
          SELECT 1 FROM (SELECT a.sale_amt AS v UNION ALL SELECT a.les_amt UNION ALL SELECT a.prot_amt UNION ALL SELECT a.etc_amt) x
           WHERE x.v IS NOT NULL AND x.v > 0
             AND (@q_amt_min IS NULL OR x.v >= @q_amt_min) AND (@q_amt_max IS NULL OR x.v <= @q_amt_max)))
   AND ((@q_mon_min IS NULL AND @q_mon_max IS NULL)
        OR (a.mon_amt > 0 AND (@q_mon_min IS NULL OR a.mon_amt >= @q_mon_min) AND (@q_mon_max IS NULL OR a.mon_amt <= @q_mon_max)))
 ORDER BY CASE WHEN @q_order = 'upd' THEN COALESCE(a.upd_dt, a.reg_dt) ELSE a.reg_dt END DESC, a.pt_no DESC;

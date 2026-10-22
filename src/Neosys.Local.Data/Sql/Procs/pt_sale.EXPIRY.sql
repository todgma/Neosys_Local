-- 만기관리 — 현상태가 전세·월세·기타임대인 물건의 만기일(mtry_date) 기간 조회. 건물(SYCA108)은 제외.
--  현 소유자·임차인(전 소유자/전 임차인 제외) 대표 1인 표시
-- from legacy/API/Expiry/Services/ExpiryService.cs GetList
SELECT * FROM (
  SELECT a.pt_no, a.pt_type, a.pt_name, a.current_status, a.pt_sts, a.sale_div, a.apt_typ, a.sup_area, a.exc_area,
         a.sale_amt, a.les_amt, a.prot_amt, a.mon_amt, a.etc_amt, a.etc_amt2, a.now_dep_amt, a.now_mon_amt,
         a.dong, a.ho, a.jibun, a.danji_code,
         trim(COALESCE(a.addr1, '') || ' ' || COALESCE(a.addr2, '') || ' ' || COALESCE(a.addr3, '') || ' ' ||
              COALESCE(NULLIF(CASE WHEN a.pt_type IN ('SYCA101','SYCA102','SYCA103','SYCA105','SYCA106','SYCA107') OR COALESCE(a.danji_code, '') <> ''
                                   THEN a.addr4 ELSE a.addr5 END, ''), a.pt_name, '')) AS addr,
         CASE WHEN a.pt_type = 'SYCA108' THEN NULL ELSE NULLIF(a.mtry_date, '') END AS expiry_date,
         (SELECT h.holder_name FROM pt_sale_holder h WHERE h.pt_no = a.pt_no AND h.holder_type = 'OWNER' AND COALESCE(h.holder_name, '') <> ''
             AND COALESCE(h.holder_relation, '') NOT IN ('전 소유자', '전 임차인') ORDER BY h.holder_idx LIMIT 1) AS owner_name,
         (SELECT h.holder_phone FROM pt_sale_holder h WHERE h.pt_no = a.pt_no AND h.holder_type = 'OWNER' AND COALESCE(h.holder_phone, '') <> ''
             AND COALESCE(h.holder_relation, '') NOT IN ('전 소유자', '전 임차인') ORDER BY h.holder_idx LIMIT 1) AS owner_phone,
         (SELECT h.holder_name FROM pt_sale_holder h WHERE h.pt_no = a.pt_no AND h.holder_type = 'BUYER' AND COALESCE(h.holder_name, '') <> ''
             AND COALESCE(h.holder_relation, '') NOT IN ('전 소유자', '전 임차인') ORDER BY h.holder_idx LIMIT 1) AS tenant_name,
         (SELECT h.holder_phone FROM pt_sale_holder h WHERE h.pt_no = a.pt_no AND h.holder_type = 'BUYER' AND COALESCE(h.holder_phone, '') <> ''
             AND COALESCE(h.holder_relation, '') NOT IN ('전 소유자', '전 임차인') ORDER BY h.holder_idx LIMIT 1) AS tenant_phone
    FROM pt_sale a
   WHERE (a.off_no = @session_off_no OR a.off_no IS NULL OR @session_off_no IS NULL)
     AND (@q_rt_no IS NULL OR a.rt_no = CAST(@q_rt_no AS TEXT))
     AND (@q_pt_type IS NULL OR (',' || @q_pt_type || ',') LIKE ('%,' || a.pt_type || ',%'))
     AND a.current_status IN ('전세', '월세', '기타임대')
) x
 WHERE x.expiry_date IS NOT NULL
   AND (@q_fr IS NULL OR substr(digits(x.expiry_date), 1, 8) >= digits(@q_fr))
   AND (@q_to IS NULL OR substr(digits(x.expiry_date), 1, 8) <= digits(@q_to))
 ORDER BY substr(digits(x.expiry_date), 1, 8), x.pt_no DESC;

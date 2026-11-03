-- 만기관리 — 만기일(mtry_date)이 입력된 물건을 기간으로 조회. 현상태·물건유형과 무관(원본 2026-10-30 변경, 건물도 포함).
--  현 소유자·임차인(전 소유자/전 임차인 제외) 대표 1인 표시
-- from legacy/API/Expiry/Services/ExpiryService.cs GetList (원본 RealestateAPI 3db7d79 — legacy 복사본에는 아직 없음)
SELECT * FROM (
  SELECT a.pt_no, a.pt_type, a.pt_name, a.current_status, a.pt_sts, a.sale_div, a.apt_typ, a.sup_area, a.exc_area,
         a.sale_amt, a.les_amt, a.prot_amt, a.mon_amt, a.etc_amt, a.etc_amt2, a.now_dep_amt, a.now_mon_amt,
         a.dong, a.ho, a.jibun, a.danji_code, a.addr4, a.addr5,
         trim(COALESCE(a.addr1, '') || ' ' || COALESCE(a.addr2, '') || ' ' || COALESCE(a.addr3, '') || ' ' ||
              COALESCE(NULLIF(CASE WHEN a.pt_type IN ('SYCA101','SYCA102','SYCA103','SYCA105','SYCA106','SYCA107') OR COALESCE(a.danji_code, '') <> ''
                                   THEN a.addr4 ELSE a.addr5 END, ''), a.pt_name, '')) AS addr,
         NULLIF(a.mtry_date, '') AS expiry_date,
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
) x
 WHERE x.expiry_date IS NOT NULL
   AND (@q_fr IS NULL OR substr(digits(x.expiry_date), 1, 8) >= digits(@q_fr))
   AND (@q_to IS NULL OR substr(digits(x.expiry_date), 1, 8) <= digits(@q_to))
 ORDER BY substr(digits(x.expiry_date), 1, 8), x.pt_no DESC;

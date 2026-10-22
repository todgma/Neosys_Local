-- 네오봇 통합검색 — 물건(소유자·임차인 포함) + 고객(구입자·희망지역) + 계약서(본문 JSON 포함) + 가계약. 종류별 최대 @q_limit건
--  전화번호는 숫자만 비교(하이픈·공백 무시). 단지형 물건은 단지명+동호, 그 외는 지역주소+건물명
-- from legacy/API/Neobot/Services/NeobotService.cs Search
SELECT * FROM (
  SELECT 'PT' AS kind, CAST(a.pt_no AS TEXT) AS ref_id, a.pt_type AS type_code,
         trim(CASE WHEN a.pt_type IN ('SYCA101','SYCA102','SYCA103','SYCA105','SYCA106','SYCA107') OR COALESCE(a.danji_code, '') <> '' THEN ''
                   ELSE trim(COALESCE(a.addr1, '') || ' ' || COALESCE(a.addr2, '') || ' ' || COALESCE(a.addr3, '')) || ' ' END
              || COALESCE(NULLIF(CASE WHEN a.pt_type IN ('SYCA101','SYCA102','SYCA103','SYCA105','SYCA106','SYCA107') OR COALESCE(a.danji_code, '') <> ''
                                      THEN a.addr4 ELSE a.addr5 END, ''), a.pt_name, '')
              || CASE WHEN COALESCE(a.dong, '') <> '' THEN ' ' || a.dong || '동' ELSE '' END
              || CASE WHEN COALESCE(a.ho, '') <> '' THEN ' ' || a.ho || '호' ELSE '' END) AS addr,
         (SELECT group_concat(CASE h.holder_type WHEN 'OWNER' THEN '소유자' WHEN 'BUYER' THEN '임차인' ELSE COALESCE(h.holder_type, '') END
                              || CASE WHEN h.holder_relation IN ('전 소유자', '전 임차인') THEN '(전)' ELSE '' END
                              || ' ' || COALESCE(h.holder_name, '') || ' ' || COALESCE(h.holder_phone, ''), ' / ')
            FROM pt_sale_holder h WHERE h.pt_no = a.pt_no AND (COALESCE(h.holder_name, '') <> '' OR COALESCE(h.holder_phone, '') <> '')) AS persons,
         (SELECT h2.holder_name FROM pt_sale_holder h2 WHERE h2.pt_no = a.pt_no AND COALESCE(h2.holder_phone, '') <> '' ORDER BY h2.holder_idx LIMIT 1) AS name,
         (SELECT h2.holder_phone FROM pt_sale_holder h2 WHERE h2.pt_no = a.pt_no AND COALESCE(h2.holder_phone, '') <> '' ORDER BY h2.holder_idx LIMIT 1) AS phone,
         a.sale_amt AS amount, a.sale_div AS sub_info, NULL AS ref_date
    FROM pt_sale a
   WHERE (a.off_no = @session_off_no OR a.off_no IS NULL OR @session_off_no IS NULL)
     AND (a.pt_name LIKE '%' || @q || '%' OR a.addr2 LIKE '%' || @q || '%' OR a.addr3 LIKE '%' || @q || '%'
          OR a.addr4 LIKE '%' || @q || '%' OR a.addr5 LIKE '%' || @q || '%' OR a.jibun LIKE '%' || @q || '%'
          OR EXISTS (SELECT 1 FROM pt_sale_holder h3 WHERE h3.pt_no = a.pt_no
                       AND (h3.holder_name LIKE '%' || @q || '%'
                            OR (length(digits(@q)) > 0 AND digits(h3.holder_phone) LIKE '%' || digits(@q) || '%'))))
   ORDER BY a.pt_no DESC LIMIT @q_limit
)
UNION ALL
SELECT * FROM (
  SELECT 'CUST', CAST(c.cust_no AS TEXT), c.want_type,
         (SELECT group_concat(COALESCE(NULLIF(ta.bld_nm, ''), ta.addr3), ', ') FROM ct_trd_area ta WHERE ta.cust_no = c.cust_no),
         COALESCE((SELECT group_concat('구입자 ' || COALESCE(b.name, '') || ' ' || COALESCE(b.tel, ''), ' / ')
                     FROM ct_cust_buyer b WHERE b.cust_no = c.cust_no AND (COALESCE(b.name, '') <> '' OR COALESCE(b.tel, '') <> '')),
                  '구입자 ' || COALESCE(c.name, '') || ' ' || COALESCE(c.tel, '')),
         COALESCE(NULLIF(c.name, ''), (SELECT b2.name FROM ct_cust_buyer b2 WHERE b2.cust_no = c.cust_no AND COALESCE(b2.name, '') <> '' ORDER BY b2.seq LIMIT 1)),
         COALESCE(NULLIF(c.tel, ''), (SELECT b3.tel FROM ct_cust_buyer b3 WHERE b3.cust_no = c.cust_no AND COALESCE(b3.tel, '') <> '' ORDER BY b3.seq LIMIT 1)),
         NULL, c.want_sub_type, NULL
    FROM ct_cust c
   WHERE (c.off_no = @session_off_no OR c.off_no IS NULL OR @session_off_no IS NULL)
     AND (c.name LIKE '%' || @q || '%' OR (length(digits(@q)) > 0 AND digits(c.tel) LIKE '%' || digits(@q) || '%')
          OR c.addr LIKE '%' || @q || '%' OR c.want_nm LIKE '%' || @q || '%' OR c.feature_note LIKE '%' || @q || '%'
          OR EXISTS (SELECT 1 FROM ct_trd_area ta WHERE ta.cust_no = c.cust_no AND (ta.bld_nm LIKE '%' || @q || '%' OR ta.addr3 LIKE '%' || @q || '%'))
          OR EXISTS (SELECT 1 FROM ct_cust_buyer b WHERE b.cust_no = c.cust_no
                       AND (b.name LIKE '%' || @q || '%' OR (length(digits(@q)) > 0 AND digits(b.tel) LIKE '%' || digits(@q) || '%'))))
   ORDER BY c.cust_no DESC LIMIT @q_limit
)
UNION ALL
SELECT * FROM (
  SELECT 'CT', cm.master_id, cm.doc_type, cm.addr,
         '취득의뢰인 ' || COALESCE(cm.buyer, '') || ' / 이전의뢰인 ' || COALESCE(cm.seller, ''),
         COALESCE(NULLIF(cm.buyer, ''), cm.seller), NULL, cm.amount, cm.trade_type, cm.contract_date
    FROM contract_master cm
   WHERE cm.use_yn = 'Y'
     AND (cm.off_no = @session_off_no OR cm.off_no IS NULL OR @session_off_no IS NULL)
     AND (cm.addr LIKE '%' || @q || '%' OR cm.buyer LIKE '%' || @q || '%' OR cm.seller LIKE '%' || @q || '%'
          OR cm.title LIKE '%' || @q || '%' OR cm.doc LIKE '%' || @q || '%'
          OR (length(digits(@q)) >= 4 AND digits(cm.doc) LIKE '%' || digits(@q) || '%'))
   ORDER BY COALESCE(cm.contract_date, substr(cm.reg_dt, 1, 10)) DESC LIMIT @q_limit
)
UNION ALL
SELECT * FROM (
  SELECT 'PRE', cd.master_id, cm.doc_type, cm.addr, '', COALESCE(NULLIF(cm.buyer, ''), cm.seller), NULL, cm.amount, cm.trade_type, cm.contract_date
    FROM contract_document cd JOIN contract_master cm ON cm.master_id = cd.master_id AND cm.use_yn = 'Y'
   WHERE cd.doc_kind IN ('가계약', '가계약문자') AND cd.use_yn = 'Y'
     AND (cm.off_no = @session_off_no OR cm.off_no IS NULL OR @session_off_no IS NULL)
     AND (cm.addr LIKE '%' || @q || '%' OR cm.title LIKE '%' || @q || '%' OR cd.data LIKE '%' || @q || '%'
          OR (length(digits(@q)) >= 4 AND digits(cd.data) LIKE '%' || digits(@q) || '%'))
   ORDER BY COALESCE(cm.contract_date, substr(cm.reg_dt, 1, 10)) DESC LIMIT @q_limit
);

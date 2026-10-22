-- 계약 목록 — 사무소 기준, 계약일 기간·검색어(제목/소재지/당사자)
-- from legacy/API/Contract/Services/ContractMasterService.cs GetList
SELECT m.*,
       EXISTS (SELECT 1 FROM contract_document d WHERE d.master_id = m.master_id AND d.doc_kind = '가계약문자' AND d.use_yn = 'Y') AS has_pre_sms,
       (SELECT group_concat(d.doc_kind, ', ') FROM contract_document d WHERE d.master_id = m.master_id AND d.use_yn = 'Y') AS doc_kinds
  FROM contract_master m
 WHERE m.use_yn = 'Y'
   AND (m.off_no = @session_off_no OR m.off_no IS NULL OR @session_off_no IS NULL)
   AND (@q_fr IS NULL OR m.contract_date >= @q_fr)
   AND (@q_to IS NULL OR m.contract_date <= @q_to)
   AND (@q_keyword IS NULL OR m.title LIKE '%' || @q_keyword || '%' OR m.addr LIKE '%' || @q_keyword || '%'
        OR m.seller LIKE '%' || @q_keyword || '%' OR m.buyer LIKE '%' || @q_keyword || '%')
 ORDER BY COALESCE(m.contract_date, substr(m.reg_dt, 1, 10)) DESC, m.reg_dt DESC;

-- 계약서 복사(부속문서 제외) — 새 master_id, origin_master_id=원본, 소재지에 '(복사)' 부기
-- from legacy/API/Contract/Services/ContractMasterService.cs CopyMaster
INSERT INTO contract_master (master_id, origin_master_id, contract_kind, doc_type, trade_type, title, addr, seller, buyer,
                             amount, contract_date, status, doc, off_no, rt_no, use_yn, reg_id, reg_dt)
SELECT @new_id, master_id, contract_kind, doc_type, trade_type, title,
       CASE WHEN COALESCE(addr, '') <> '' THEN '(복사) ' || addr ELSE addr END,
       seller, buyer, amount, contract_date, '작성',
       CASE WHEN COALESCE(json_extract(doc, '$.소재지'), '') <> ''
            THEN json_set(doc, '$.소재지', '(복사) ' || json_extract(doc, '$.소재지')) ELSE doc END,
       off_no, rt_no, 'Y', @session_user_id, datetime('now','localtime')
  FROM contract_master WHERE master_id = @master_id AND use_yn = 'Y';

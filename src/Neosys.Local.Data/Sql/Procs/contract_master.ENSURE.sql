-- 부속문서만 먼저 저장할 때 마스터 보장(소재지 '(임시)', 상태 '작성중'). 이미 있으면 빈 값만 채움
-- from legacy/API/Contract/Services/ContractMasterService.cs SaveDocument/EnsureMaster
INSERT INTO contract_master (master_id, contract_kind, doc_type, trade_type, addr, status, doc, off_no, rt_no, use_yn, reg_id, reg_dt)
VALUES (@master_id, @contract_kind, @doc_type, @trade_type, '(임시)', '작성중', '{}', @session_off_no, CAST(@session_rt_no AS TEXT), 'Y',
        @session_user_id, datetime('now','localtime'))
ON CONFLICT (master_id) DO UPDATE SET
    contract_kind = COALESCE(NULLIF(contract_master.contract_kind, ''), excluded.contract_kind),
    doc_type = COALESCE(NULLIF(contract_master.doc_type, ''), excluded.doc_type),
    trade_type = COALESCE(contract_master.trade_type, excluded.trade_type),
    addr = COALESCE(NULLIF(contract_master.addr, ''), excluded.addr),
    upd_id = @session_user_id, upd_dt = datetime('now','localtime');

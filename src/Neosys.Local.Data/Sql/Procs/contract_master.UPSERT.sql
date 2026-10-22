-- 계약 저장(신규/수정 통합, master_id는 화면에서 만든 UUID) — 기존과 같은 upsert
-- from legacy/API/Contract/Services/ContractMasterService.cs SaveMaster
INSERT INTO contract_master (master_id, contract_kind, doc_type, trade_type, title, addr, seller, buyer, amount,
                             contract_date, status, doc, off_no, rt_no, use_yn, reg_id, reg_dt)
VALUES (@master_id, @contract_kind, @doc_type, @trade_type, @title, @addr, @seller, @buyer, @amount,
        @contract_date, COALESCE(@status, '작성'), COALESCE(@doc, '{}'), @session_off_no, CAST(@session_rt_no AS TEXT), 'Y',
        @session_user_id, datetime('now','localtime'))
ON CONFLICT (master_id) DO UPDATE SET
    contract_kind = excluded.contract_kind, doc_type = excluded.doc_type, trade_type = excluded.trade_type,
    title = excluded.title, addr = excluded.addr, seller = excluded.seller, buyer = excluded.buyer,
    amount = excluded.amount, contract_date = excluded.contract_date, status = COALESCE(@status, contract_master.status),
    doc = excluded.doc, off_no = COALESCE(contract_master.off_no, excluded.off_no), rt_no = COALESCE(contract_master.rt_no, excluded.rt_no),
    use_yn = 'Y', upd_id = @session_user_id, upd_dt = datetime('now','localtime');

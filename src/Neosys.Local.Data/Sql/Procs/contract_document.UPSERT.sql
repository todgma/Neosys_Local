-- 부속문서 저장(문서 종류별 upsert)
-- from legacy/API/Contract/Services/ContractMasterService.cs SaveDocument
INSERT INTO contract_document (master_id, doc_kind, data, use_yn, reg_id, reg_dt)
VALUES (@master_id, @doc_kind, COALESCE(@data, '{}'), 'Y', @session_user_id, datetime('now','localtime'))
ON CONFLICT (master_id, doc_kind) DO UPDATE SET data = excluded.data, use_yn = 'Y', upd_id = @session_user_id, upd_dt = datetime('now','localtime');

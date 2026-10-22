-- 부속문서 삭제(사용안함)
-- from legacy/API/Contract/Services/ContractMasterService.cs
UPDATE contract_document SET use_yn = 'N', upd_id = @session_user_id, upd_dt = datetime('now','localtime')
 WHERE master_id = @master_id AND doc_kind = @doc_kind;

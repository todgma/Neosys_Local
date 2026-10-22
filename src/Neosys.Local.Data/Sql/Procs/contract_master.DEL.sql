-- 계약 삭제 — 사용안함 처리(기존과 동일)
-- from legacy/API/Contract/Services/ContractMasterService.cs DeleteMaster
UPDATE contract_master SET use_yn = 'N', upd_id = @session_user_id, upd_dt = datetime('now','localtime') WHERE master_id = @master_id;

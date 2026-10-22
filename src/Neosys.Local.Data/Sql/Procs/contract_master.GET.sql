-- 계약 1건
-- from legacy/API/Contract/Services/ContractMasterService.cs GetDetail
SELECT * FROM contract_master WHERE master_id = @master_id AND use_yn = 'Y';

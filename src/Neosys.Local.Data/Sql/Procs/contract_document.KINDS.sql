-- 계약에 저장된 부속문서 종류
-- from legacy/API/Contract/Services/ContractMasterService.cs GetDocumentKinds
SELECT doc_kind FROM contract_document WHERE master_id = @master_id AND use_yn = 'Y' ORDER BY doc_kind;

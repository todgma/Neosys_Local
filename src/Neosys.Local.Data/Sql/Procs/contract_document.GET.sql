-- 부속문서 1건(문서 종류별)
-- from legacy/API/Contract/Services/ContractMasterService.cs GetDocument
SELECT * FROM contract_document WHERE master_id = @master_id AND doc_kind = @doc_kind AND use_yn = 'Y';

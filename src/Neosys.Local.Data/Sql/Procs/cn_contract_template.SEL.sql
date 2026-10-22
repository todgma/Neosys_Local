-- 계약서 서식(사용중) — 기준 데이터(시드)
-- from legacy/API/Contract/Services/ContractTemplateService.cs
SELECT * FROM cn_contract_template WHERE use_yn = 'Y' ORDER BY sort, tpl_code;

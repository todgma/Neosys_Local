-- 거래신고 완료일 저장(NULL = 완료 취소)
-- from legacy/API/Contract/Services/ContractMasterService.cs SaveReportDate
UPDATE contract_master SET report_done_date = @report_done_date, upd_id = @session_user_id, upd_dt = datetime('now','localtime')
 WHERE master_id = @master_id;

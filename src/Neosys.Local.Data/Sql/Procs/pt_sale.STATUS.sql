-- 물건 진행상태만 변경(목록에서 바로 변경) — NULL이면 상태 해제
-- from legacy/API/Property/Services/PropertyServices.cs UpdatePropertyStatus
UPDATE pt_sale SET pt_sts = @pt_sts, upd_dt = datetime('now','localtime'), upd_id = @session_user_id WHERE pt_no = @pt_no;

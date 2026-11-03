-- 물건 연동 정보 삭제 — 일정은 남기고 물건 연동만 끊는다. 사진·평면도(sys_file ref_key = 물건번호)는 사용안함(파일은 폴더에 그대로 — 복구 가능)
-- from legacy/API/Property/Services/PropertyServices.cs DeleteProperty (기존은 연동을 지우지 않음 — 로컬 추가)
DELETE FROM rt_schedule_link WHERE link_type = 'PT' AND link_key = CAST(@pt_no AS TEXT);
UPDATE sys_file SET use_yn = 'N', upd_id = @session_user_id, upd_dt = datetime('now','localtime')
 WHERE use_yn = 'Y' AND ref_key = CAST(@pt_no AS TEXT) AND file_div IN ('SYFDV01', 'SYFDV05');

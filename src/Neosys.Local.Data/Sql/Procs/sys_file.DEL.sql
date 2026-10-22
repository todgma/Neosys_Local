-- 첨부파일 삭제 — 사용안함 처리(기존과 동일). 실제 파일은 서비스가 휴지통 폴더로 옮긴다
-- from legacy/API/Common/Services/FileService.cs DeleteFile
UPDATE sys_file SET use_yn = 'N', upd_id = @session_user_id, upd_dt = datetime('now','localtime') WHERE file_id = @file_id;

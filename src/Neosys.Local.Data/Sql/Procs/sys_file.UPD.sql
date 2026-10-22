-- 첨부파일 설명·순서 수정
-- from legacy/API/Common/Services/FileService.cs
UPDATE sys_file SET descr = @descr, sort_order = COALESCE(@sort_order, sort_order),
       upd_id = @session_user_id, upd_dt = datetime('now','localtime')
 WHERE file_id = @file_id;

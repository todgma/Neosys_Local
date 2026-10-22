-- 엑셀 업로드 임시저장 1건
-- from legacy/API/Upload/Services/UploadStagingService.cs
INSERT INTO rt_upload_staging (target, payload, label, off_no, reg_id, reg_dt)
VALUES (@target, @payload, @label, @session_off_no, @session_user_id, datetime('now','localtime'));

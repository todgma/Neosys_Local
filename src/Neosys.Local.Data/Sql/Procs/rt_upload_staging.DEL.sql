-- 엑셀 업로드 임시저장 삭제(확정 후 또는 직접 삭제)
-- from legacy/API/Upload/Services/UploadStagingService.cs
DELETE FROM rt_upload_staging WHERE staging_id = @staging_id;

-- 엑셀 업로드 임시저장 목록(사무소·대상별, 최근 순)
-- from legacy/API/Upload/Services/UploadStagingService.cs
SELECT * FROM rt_upload_staging
 WHERE target = @target
   AND (off_no = @session_off_no OR off_no IS NULL OR @session_off_no IS NULL)
 ORDER BY reg_dt DESC, staging_id DESC;

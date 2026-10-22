-- 첨부파일 목록(사용중) — 종류(file_typ)·구분(file_div)·대상 키(ref_key)
-- from legacy/API/Common/Services/FileService.cs GetFiles
SELECT * FROM sys_file
 WHERE use_yn = 'Y'
   AND (@file_typ IS NULL OR file_typ = @file_typ)
   AND (@file_div IS NULL OR file_div = @file_div)
   AND (@ref_key IS NULL OR ref_key = @ref_key)
 ORDER BY sort_order, file_id;

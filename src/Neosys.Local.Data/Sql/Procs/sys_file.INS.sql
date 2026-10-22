-- 첨부파일 메타 등록 — 새 file_id 반환. object_key = 첨부 폴더 기준 상대 경로(로컬 저장)
-- from legacy/API/Common/Services/FileService.cs SaveFile
INSERT INTO sys_file (file_typ, file_div, ref_key, orig_name, object_key, content_type, file_size, ext,
                      expose, sort_order, descr, etc_data, use_yn, reg_id, reg_dt)
VALUES (@file_typ, @file_div, @ref_key, @orig_name, @object_key, @content_type, @file_size, @ext,
        COALESCE(@expose, 'Y'), COALESCE(@sort_order, 0), @descr, @etc_data, 'Y', @session_user_id, datetime('now','localtime'))
RETURNING file_id;

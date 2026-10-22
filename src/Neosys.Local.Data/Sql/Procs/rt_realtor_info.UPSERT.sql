-- 서버 로그인 결과를 로컬 중개사 테이블에 반영(비밀번호는 저장하지 않음)
-- from legacy/API/Realestater/Services/RealestaterServices.cs LoginRealestater
INSERT INTO rt_realtor_info ("RtNo", "RtType", "RtNm", "RtTel", "RtRegNo", "OffNo", "Grade", "Id", "Email", "JoinDate", "LeaveDate", "Note", "RegDt", "RegId", "UpdDt", "UpdId")
VALUES (@rtNo, @rtType, @rtNm, @rtTel, @rtRegNo, @offNo, @grade, @id, @email, @joinDate, @leaveDate, @note, datetime('now','localtime'), @id, NULL, NULL)
ON CONFLICT ("RtNo") DO UPDATE SET
    "RtType" = excluded."RtType", "RtNm" = excluded."RtNm", "RtTel" = excluded."RtTel", "RtRegNo" = excluded."RtRegNo",
    "OffNo" = excluded."OffNo", "Grade" = excluded."Grade", "Id" = excluded."Id", "Email" = excluded."Email",
    "JoinDate" = excluded."JoinDate", "LeaveDate" = excluded."LeaveDate", "Note" = excluded."Note",
    "UpdDt" = datetime('now','localtime'), "UpdId" = excluded."Id";

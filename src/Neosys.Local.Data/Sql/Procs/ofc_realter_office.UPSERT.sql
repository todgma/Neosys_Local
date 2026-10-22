-- 서버에서 받은 소속 사무소 정보를 로컬에 반영
-- from legacy/API/Office/Services/OfficeServices.cs SelectOfficeByUser
INSERT INTO ofc_realter_office ("OffNo", "OffNm", "Addr", "RpsNm", "RpsPhone", "OffTel", "OffFax", "RegNo", "BizNo", "Greeting", "UseYn", "RegDt", "RegId")
VALUES (@offNo, @offNm, @addr, @rpsNm, @rpsPhone, @offTel, @offFax, @regNo, @bizNo, @greeting, COALESCE(@useYn, 'Y'), datetime('now','localtime'), @session_user_id)
ON CONFLICT ("OffNo") DO UPDATE SET
    "OffNm" = excluded."OffNm", "Addr" = excluded."Addr", "RpsNm" = excluded."RpsNm", "RpsPhone" = excluded."RpsPhone",
    "OffTel" = excluded."OffTel", "OffFax" = excluded."OffFax", "RegNo" = excluded."RegNo", "BizNo" = excluded."BizNo",
    "Greeting" = excluded."Greeting", "UseYn" = excluded."UseYn",
    "UpdDt" = datetime('now','localtime'), "UpdId" = @session_user_id;

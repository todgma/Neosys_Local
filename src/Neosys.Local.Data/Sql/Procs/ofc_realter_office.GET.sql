-- 로그인 사무소 정보(로컬에 저장된 값)
-- from legacy/API/Office/Services/OfficeServices.cs SelectOfficeByUser
SELECT * FROM ofc_realter_office WHERE "OffNo" = @session_off_no;

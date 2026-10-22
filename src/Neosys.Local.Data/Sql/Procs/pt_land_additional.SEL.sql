-- 토지 필지목록
-- from legacy/API/Property/Services/PropertyServices.cs GetPropertyDetail
SELECT * FROM pt_land_additional WHERE pt_no = @pt_no ORDER BY seq, land_id;

-- 토지 필지목록 전체 삭제(저장 시 전체 교체)
-- from legacy/API/Property/Services/PropertyServices.cs SyncPropertyLandParcels
DELETE FROM pt_land_additional WHERE pt_no = @pt_no;

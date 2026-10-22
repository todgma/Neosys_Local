-- 임대차현황서 전체 삭제(저장 시 전체 교체)
-- from legacy/API/Property/Services/PropertyServices.cs SyncPropertyLeaseRows
DELETE FROM pt_lease_status WHERE pt_no = @pt_no;

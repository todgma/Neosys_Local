-- 임대차현황서
-- from legacy/API/Property/Services/PropertyServices.cs GetPropertyDetail
SELECT * FROM pt_lease_status WHERE pt_no = @pt_no ORDER BY seq, lease_id;

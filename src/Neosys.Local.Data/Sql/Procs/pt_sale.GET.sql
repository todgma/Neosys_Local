-- 물건 상세(기본정보)
-- from legacy/API/Property/Services/PropertyServices.cs GetPropertyDetail
SELECT a.*, (SELECT count(*) FROM pt_sale_old o WHERE o.org_pt_no = a.pt_no) AS history_count
  FROM pt_sale a WHERE a.pt_no = @pt_no;

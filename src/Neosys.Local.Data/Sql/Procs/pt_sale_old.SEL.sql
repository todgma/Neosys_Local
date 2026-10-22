-- 과거내역 목록
-- from legacy/API/Property/Services/PropertyServices.cs GetPropertyHistoryList
SELECT org_pt_no, archived_dt, pt_no, pt_name, pt_type, sale_div, addr1, addr2, addr3, addr4, addr5, dong, ho,
       sale_amt, les_amt, prot_amt, mon_amt, current_status, registry_owner, contract_tenant
  FROM pt_sale_old WHERE org_pt_no = @pt_no ORDER BY archived_dt DESC;

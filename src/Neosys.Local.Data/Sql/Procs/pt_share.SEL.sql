-- 공동중개사 사무소(공유 이력) — 물건(pt_no) 또는 고객(cust_no) 하나에 딸린 목록
-- from legacy/API/Customer/Services/CustomersServices.cs GetCustomerDetail, Property/Services/PropertyServices.cs GetPropertyDetail
SELECT * FROM pt_share WHERE cust_no IS @cust_no AND pt_no IS @pt_no ORDER BY share_idx;

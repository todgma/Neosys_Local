-- 메모(구입물건특징·물건메모) — 물건(pt_no) 또는 고객(cust_no) 하나에 딸린 목록, 최신순
-- from legacy/API/Customer/Services/CustomerMemoService.cs, Property/Services/PropertyMemoService.cs
SELECT * FROM pt_memo WHERE cust_no IS @cust_no AND pt_no IS @pt_no ORDER BY memo_date DESC, memo_no DESC;

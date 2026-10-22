-- 공동중개사 사무소 전체 삭제(저장 시 전체 삭제 후 다시 넣음)
-- from legacy/API/Customer/Services/CustomersServices.cs SyncShares, Property/Services/PropertyServices.cs SyncPropertyShares
DELETE FROM pt_share WHERE cust_no IS @cust_no AND pt_no IS @pt_no;

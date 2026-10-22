-- 고객 구입자 전체 삭제(저장 시 전체 삭제 후 다시 넣음)
-- from legacy/API/Customer/Services/CustomersServices.cs SyncBuyers
DELETE FROM ct_cust_buyer WHERE cust_no = @cust_no;

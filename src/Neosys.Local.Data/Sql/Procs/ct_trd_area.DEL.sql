-- 고객 구입희망지역 전체 삭제(저장 시 전체 삭제 후 다시 넣음)
-- from legacy/API/Customer/Services/CustomersServices.cs SyncAreas
DELETE FROM ct_trd_area WHERE cust_no = @cust_no;

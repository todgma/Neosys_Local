-- 메모 1건 삭제
-- from legacy/API/Customer/Services/CustomersServices.cs SyncMemos
DELETE FROM pt_memo WHERE memo_no = @memo_no;

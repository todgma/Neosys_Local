-- 고객 구입희망지역
-- from legacy/API/Customer/Services/CustomersServices.cs GetCustomerDetail
SELECT * FROM ct_trd_area WHERE cust_no = @cust_no ORDER BY seq;

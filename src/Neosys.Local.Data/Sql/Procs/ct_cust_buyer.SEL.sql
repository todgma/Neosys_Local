-- 고객 구입자 정보
-- from legacy/API/Customer/Services/CustomersServices.cs GetCustomerDetail
SELECT * FROM ct_cust_buyer WHERE cust_no = @cust_no ORDER BY seq;

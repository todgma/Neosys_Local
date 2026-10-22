-- 고객 상세(기본정보)
-- from legacy/API/Customer/Services/CustomersServices.cs GetCustomerDetail
SELECT * FROM ct_cust WHERE cust_no = @cust_no;

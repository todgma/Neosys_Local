-- 물건 삭제 — 딸린 소유자·공동중개사·메모·임대차현황·필지도 함께 삭제(기존은 pt_sale만 지워 고아 행이 남았음)
-- from legacy/API/Property/Services/PropertyServices.cs DeleteProperty
DELETE FROM pt_sale_holder     WHERE pt_no = @pt_no;
DELETE FROM pt_share           WHERE pt_no = @pt_no;
DELETE FROM pt_memo            WHERE pt_no = @pt_no;
DELETE FROM pt_lease_status    WHERE pt_no = @pt_no;
DELETE FROM pt_land_additional WHERE pt_no = @pt_no;
DELETE FROM pt_sale            WHERE pt_no = @pt_no;

-- 과거내역(pt_sale_old)에 운영 DB 이관 후 pt_sale에만 추가된 컬럼을 맞춘다 — 보관 시 값 손실 방지
ALTER TABLE pt_sale_old ADD COLUMN former_addr4 TEXT;
ALTER TABLE pt_sale_old ADD COLUMN former_addr5 TEXT;
ALTER TABLE pt_sale_old ADD COLUMN city_gas TEXT;
ALTER TABLE pt_sale_old ADD COLUMN power_receiving TEXT;
ALTER TABLE pt_sale_old ADD COLUMN elec_capacity TEXT;

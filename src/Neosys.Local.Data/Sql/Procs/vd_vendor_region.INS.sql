-- 협력업체 영업지역 1건
-- from legacy/API/Vendor/Services/VendorService.cs SaveVendorAreas
INSERT INTO vd_vendor_region (vendor_id, region_code, region_name, sort_order, use_yn, reg_id, reg_dt)
VALUES (@vendor_id, @region_code, @region_name, @sort_order, 'Y', @session_user_id, datetime('now','localtime'))
ON CONFLICT (vendor_id, region_code) DO UPDATE SET region_name = excluded.region_name, use_yn = 'Y';

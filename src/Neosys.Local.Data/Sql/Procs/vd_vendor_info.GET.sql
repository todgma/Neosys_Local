-- 협력업체 1건(사용중만 — 삭제한 업체는 없음)
-- from legacy/API/Vendor/Services/VendorService.cs SelectVendorList(vendor_id)
SELECT * FROM vd_vendor_info WHERE vendor_id = @vendor_id AND use_yn = 'Y';

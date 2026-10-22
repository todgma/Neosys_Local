-- 협력업체 삭제 — 사용안함 처리(기존과 동일한 논리 삭제)
-- from legacy/API/Vendor/Services/VendorService.cs DeleteVendor
UPDATE vd_vendor_info SET use_yn = 'N', mod_id = @session_user_id, mod_dt = datetime('now','localtime')
 WHERE vendor_id = @vendor_id;

-- 협력업체 영업지역 전체 삭제(저장 시 전체 교체)
-- from legacy/API/Vendor/Services/VendorService.cs SaveVendorAreas
DELETE FROM vd_vendor_region WHERE vendor_id = @vendor_id;

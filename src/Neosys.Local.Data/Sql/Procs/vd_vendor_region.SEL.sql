-- 협력업체 영업지역
-- from legacy/API/Vendor/Services/VendorService.cs SelectVendorRegionList
SELECT * FROM vd_vendor_region WHERE vendor_id = @vendor_id AND use_yn = 'Y' ORDER BY sort_order, vendor_region_id;

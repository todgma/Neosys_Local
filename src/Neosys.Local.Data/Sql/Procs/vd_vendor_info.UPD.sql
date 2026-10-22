-- 협력업체 수정
-- from legacy/API/Vendor/Services/VendorService.cs UpdateVendor
UPDATE vd_vendor_info SET
    vendor_name = @vendor_name, category1 = @category1, category2 = @category2, category3 = @category3,
    ceo_name = @ceo_name, ceo_phone = @ceo_phone, manager_name = @manager_name, manager_phone = @manager_phone,
    manager_tel = @manager_tel, manager_fax = @manager_fax, homepage_url = @homepage_url,
    product_desc = @product_desc, consultation_note = @consultation_note,
    business_region_code = @business_region_code, bjd_code = @bjd_code, detail_address = @detail_address,
    sort_order = COALESCE(@sort_order, sort_order),
    mod_id = @session_user_id, mod_dt = datetime('now','localtime')
 WHERE vendor_id = @vendor_id;

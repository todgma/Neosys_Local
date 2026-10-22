-- 협력업체 등록 — 새 vendor_id 반환. 로컬 등록은 reg_type='USER', 사무소·담당자는 로그인 기준
-- from legacy/API/Vendor/Services/VendorService.cs InsertVendor
INSERT INTO vd_vendor_info
    (vendor_name, category1, category2, category3, ceo_name, ceo_phone,
     manager_name, manager_phone, manager_tel, manager_fax, homepage_url,
     product_desc, consultation_note, reg_type, business_region_code, bjd_code, detail_address,
     off_no, rt_no, sort_order, use_yn, reg_id, reg_dt)
VALUES
    (@vendor_name, @category1, @category2, @category3, @ceo_name, @ceo_phone,
     @manager_name, @manager_phone, @manager_tel, @manager_fax, @homepage_url,
     @product_desc, @consultation_note, COALESCE(@reg_type, 'USER'), @business_region_code, @bjd_code, @detail_address,
     COALESCE(@off_no, @session_off_no), COALESCE(@rt_no, @session_rt_no), COALESCE(@sort_order, 0), 'Y', @session_user_id, datetime('now','localtime'))
RETURNING vendor_id;

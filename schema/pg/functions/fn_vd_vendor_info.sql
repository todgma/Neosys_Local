CREATE OR REPLACE FUNCTION public.fn_vd_vendor_info(p_mode character varying DEFAULT 'SEL'::character varying, p_vendor_id bigint DEFAULT NULL::bigint, p_vendor_name character varying DEFAULT NULL::character varying, p_category1 character varying DEFAULT NULL::character varying, p_category2 character varying DEFAULT NULL::character varying, p_category3 character varying DEFAULT NULL::character varying, p_ceo_name character varying DEFAULT NULL::character varying, p_manager_name character varying DEFAULT NULL::character varying, p_manager_phone character varying DEFAULT NULL::character varying, p_manager_tel character varying DEFAULT NULL::character varying, p_manager_fax character varying DEFAULT NULL::character varying, p_homepage_url character varying DEFAULT NULL::character varying, p_product_desc text DEFAULT NULL::text, p_consultation_note text DEFAULT NULL::text, p_reg_type character varying DEFAULT NULL::character varying, p_business_region_code character varying DEFAULT NULL::character varying, p_detail_address character varying DEFAULT NULL::character varying, p_off_no bigint DEFAULT NULL::bigint, p_rt_no bigint DEFAULT NULL::bigint, p_sort_order integer DEFAULT NULL::integer, p_use_yn character DEFAULT NULL::bpchar, p_user_id character varying DEFAULT NULL::character varying, p_page_number integer DEFAULT 1, p_rows_per_page integer DEFAULT 10, p_bjd_code character varying DEFAULT NULL::character varying)
 RETURNS TABLE(vendor_id bigint, vendor_name character varying, category1 character varying, category2 character varying, category3 character varying, ceo_name character varying, manager_name character varying, manager_phone character varying, manager_tel character varying, manager_fax character varying, homepage_url character varying, product_desc text, consultation_note text, reg_type character varying, business_region_code character varying, detail_address character varying, off_no bigint, rt_no bigint, sort_order integer, use_yn character, reg_id character varying, reg_dt timestamp without time zone, mod_id character varying, mod_dt timestamp without time zone, bjd_code character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_offset INT;
BEGIN
    v_offset := (p_page_number - 1) * p_rows_per_page;

    -- ===== 조회 (SEL) =====
    IF UPPER(p_mode) = 'SEL' THEN
        RETURN QUERY
        SELECT
            v.vendor_id,
            v.vendor_name,
            v.category1,
            v.category2,
            v.category3,
            v.ceo_name,
            v.manager_name,
            v.manager_phone,
            v.manager_tel,
            v.manager_fax,
            v.homepage_url,
            v.product_desc,
            v.consultation_note,
            v.reg_type,
            v.business_region_code,
            v.detail_address,
            v.off_no,
            v.rt_no,
            v.sort_order,
            v.use_yn,
            v.reg_id,
            v.reg_dt,
            v.mod_id,
            v.mod_dt,
            v.bjd_code
        FROM public.vd_vendor_info v
        WHERE v.reg_type = 'ADMIN'
           OR (
                (p_vendor_id IS NULL OR v.vendor_id = p_vendor_id)
            AND (p_off_no   IS NULL OR v.off_no   = p_off_no)
            AND (p_rt_no    IS NULL OR v.rt_no    = p_rt_no)
            AND (p_bjd_code IS NULL OR v.bjd_code = p_bjd_code)
           )
        ORDER BY v.sort_order, v.vendor_id
        LIMIT p_rows_per_page OFFSET v_offset;

    -- ===== 등록 (INS) =====
    ELSIF UPPER(p_mode) = 'INS' THEN
        INSERT INTO public.vd_vendor_info (
            vendor_name,
            category1,
            category2,
            category3,
            ceo_name,
            manager_name,
            manager_phone,
            manager_tel,
            manager_fax,
            homepage_url,
            product_desc,
            consultation_note,
            reg_type,
            business_region_code,
            detail_address,
            off_no,
            rt_no,
            sort_order,
            use_yn,
            reg_id,
            reg_dt,
            bjd_code
        ) VALUES (
            p_vendor_name,
            p_category1,
            p_category2,
            p_category3,
            p_ceo_name,
            p_manager_name,
            p_manager_phone,
            p_manager_tel,
            p_manager_fax,
            p_homepage_url,
            p_product_desc,
            p_consultation_note,
            p_reg_type,
            p_business_region_code,
            p_detail_address,
            p_off_no,
            p_rt_no,
            COALESCE(p_sort_order, 0),
            COALESCE(p_use_yn, 'Y'),
            p_user_id,
            CURRENT_TIMESTAMP,
            p_bjd_code
        )
        RETURNING
            vd_vendor_info.vendor_id,
            vd_vendor_info.vendor_name,
            vd_vendor_info.category1,
            vd_vendor_info.category2,
            vd_vendor_info.category3,
            vd_vendor_info.ceo_name,
            vd_vendor_info.manager_name,
            vd_vendor_info.manager_phone,
            vd_vendor_info.manager_tel,
            vd_vendor_info.manager_fax,
            vd_vendor_info.homepage_url,
            vd_vendor_info.product_desc,
            vd_vendor_info.consultation_note,
            vd_vendor_info.reg_type,
            vd_vendor_info.business_region_code,
            vd_vendor_info.detail_address,
            vd_vendor_info.off_no,
            vd_vendor_info.rt_no,
            vd_vendor_info.sort_order,
            vd_vendor_info.use_yn,
            vd_vendor_info.reg_id,
            vd_vendor_info.reg_dt,
            vd_vendor_info.mod_id,
            vd_vendor_info.mod_dt,
            vd_vendor_info.bjd_code
        INTO
            vendor_id,
            vendor_name,
            category1,
            category2,
            category3,
            ceo_name,
            manager_name,
            manager_phone,
            manager_tel,
            manager_fax,
            homepage_url,
            product_desc,
            consultation_note,
            reg_type,
            business_region_code,
            detail_address,
            off_no,
            rt_no,
            sort_order,
            use_yn,
            reg_id,
            reg_dt,
            mod_id,
            mod_dt,
            bjd_code;

        RETURN NEXT;

    -- ===== 수정 (UPD) =====
    ELSIF UPPER(p_mode) = 'UPD' THEN
        UPDATE public.vd_vendor_info
        SET
            vendor_name          = COALESCE(p_vendor_name, vendor_name),
            category1            = COALESCE(p_category1, category1),
            category2            = COALESCE(p_category2, category2),
            category3            = COALESCE(p_category3, category3),
            ceo_name             = COALESCE(p_ceo_name, ceo_name),
            manager_name         = COALESCE(p_manager_name, manager_name),
            manager_phone        = COALESCE(p_manager_phone, manager_phone),
            manager_tel          = COALESCE(p_manager_tel, manager_tel),
            manager_fax          = COALESCE(p_manager_fax, manager_fax),
            homepage_url         = COALESCE(p_homepage_url, homepage_url),
            product_desc         = COALESCE(p_product_desc, product_desc),
            consultation_note    = COALESCE(p_consultation_note, consultation_note),
            reg_type             = COALESCE(p_reg_type, reg_type),
            business_region_code = COALESCE(p_business_region_code, business_region_code),
            detail_address       = COALESCE(p_detail_address, detail_address),
            off_no               = COALESCE(p_off_no, off_no),
            rt_no                = COALESCE(p_rt_no, rt_no),
            sort_order           = COALESCE(p_sort_order, sort_order),
            use_yn               = COALESCE(p_use_yn, use_yn),
            bjd_code             = COALESCE(p_bjd_code, bjd_code),
            mod_id               = COALESCE(p_user_id, mod_id),
            mod_dt               = CURRENT_TIMESTAMP
        WHERE vendor_id = p_vendor_id;

        RETURN QUERY
        SELECT
            v.vendor_id,
            v.vendor_name,
            v.category1,
            v.category2,
            v.category3,
            v.ceo_name,
            v.manager_name,
            v.manager_phone,
            v.manager_tel,
            v.manager_fax,
            v.homepage_url,
            v.product_desc,
            v.consultation_note,
            v.reg_type,
            v.business_region_code,
            v.detail_address,
            v.off_no,
            v.rt_no,
            v.sort_order,
            v.use_yn,
            v.reg_id,
            v.reg_dt,
            v.mod_id,
            v.mod_dt,
            v.bjd_code
        FROM public.vd_vendor_info v
        WHERE v.vendor_id = p_vendor_id;

    -- ===== 삭제 (DEL) =====
    ELSIF UPPER(p_mode) = 'DEL' THEN
        DELETE FROM public.vd_vendor_info
        WHERE vendor_id = p_vendor_id;

        RETURN;
    END IF;
END;
$function$

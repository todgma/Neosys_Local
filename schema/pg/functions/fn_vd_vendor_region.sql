CREATE OR REPLACE FUNCTION public.fn_vd_vendor_region(p_mode character varying DEFAULT 'SEL'::character varying, p_vendor_region_id bigint DEFAULT NULL::bigint, p_vendor_id bigint DEFAULT NULL::bigint, p_region_code character varying DEFAULT NULL::character varying, p_sort_order integer DEFAULT NULL::integer, p_use_yn character DEFAULT NULL::bpchar, p_user_id character varying DEFAULT NULL::character varying, p_page_number integer DEFAULT 1, p_rows_per_page integer DEFAULT 10)
 RETURNS TABLE(vendor_region_id bigint, vendor_id bigint, region_code character varying, sort_order integer, use_yn character, reg_id character varying, reg_dt timestamp without time zone, mod_id character varying, mod_dt timestamp without time zone)
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
            vr.vendor_region_id,
            vr.vendor_id,
            vr.region_code,
            vr.sort_order,
            vr.use_yn,
            vr.reg_id,
            vr.reg_dt,
            vr.mod_id,
            vr.mod_dt
        FROM public.vd_vendor_region vr
        WHERE (p_vendor_region_id IS NULL OR vr.vendor_region_id = p_vendor_region_id)
          AND (p_vendor_id IS NULL OR vr.vendor_id = p_vendor_id)
        ORDER BY vr.sort_order, vr.vendor_region_id
        LIMIT p_rows_per_page OFFSET v_offset;

    -- ===== 등록 (INS) =====
    ELSIF UPPER(p_mode) = 'INS' THEN
        INSERT INTO public.vd_vendor_region (
            vendor_id,
            region_code,
            sort_order,
            use_yn,
            reg_id,
            reg_dt
        ) VALUES (
            p_vendor_id,
            p_region_code,
            COALESCE(p_sort_order, 0),
            COALESCE(p_use_yn, 'Y'),
            p_user_id,
            CURRENT_TIMESTAMP
        )
        RETURNING * INTO vendor_region_id, vendor_id, region_code, sort_order, use_yn,
                         reg_id, reg_dt, mod_id, mod_dt;

        RETURN NEXT;

    -- ===== 수정 (UPD) =====
    ELSIF UPPER(p_mode) = 'UPD' THEN
        UPDATE public.vd_vendor_region
        SET
            vendor_id   = COALESCE(p_vendor_id, vendor_id),
            region_code = COALESCE(p_region_code, region_code),
            sort_order  = COALESCE(p_sort_order, sort_order),
            use_yn      = COALESCE(p_use_yn, use_yn),
            mod_id      = COALESCE(p_user_id, mod_id),
            mod_dt      = CURRENT_TIMESTAMP
        WHERE vendor_region_id = p_vendor_region_id;

        RETURN QUERY SELECT * FROM public.vd_vendor_region WHERE vendor_region_id = p_vendor_region_id;

    -- ===== 삭제 (DEL) =====
    ELSIF UPPER(p_mode) = 'DEL' THEN
        DELETE FROM public.vd_vendor_region
        WHERE vendor_region_id = p_vendor_region_id;

        -- 삭제된 결과 확인용 (빈 결과 반환)
        RETURN;

    END IF;
END;
$function$

-- =====================================================
-- 협력업체 정보 관리 함수 (fn_vd_vendor_info)
-- =====================================================
-- MODE: SEL(조회), INS(등록), UPD(수정), DEL(삭제)
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_vd_vendor_info(
    p_mode                 VARCHAR DEFAULT 'SEL',
    p_vendor_id            BIGINT  DEFAULT NULL,
    p_vendor_name          VARCHAR DEFAULT NULL,
    p_category1            VARCHAR DEFAULT NULL,
    p_category2            VARCHAR DEFAULT NULL,
    p_category3            VARCHAR DEFAULT NULL,
    p_ceo_name             VARCHAR DEFAULT NULL,
    p_manager_name         VARCHAR DEFAULT NULL,
    p_manager_phone        VARCHAR DEFAULT NULL,
    p_manager_tel          VARCHAR DEFAULT NULL,
    p_manager_fax          VARCHAR DEFAULT NULL,
    p_homepage_url         VARCHAR DEFAULT NULL,
    p_product_desc         TEXT    DEFAULT NULL,
    p_consultation_note    TEXT    DEFAULT NULL,
    p_reg_type             VARCHAR DEFAULT NULL,
    p_business_region_code VARCHAR DEFAULT NULL,
    p_detail_address       VARCHAR DEFAULT NULL,
    p_off_no               BIGINT  DEFAULT NULL,
    p_rt_no                BIGINT  DEFAULT NULL,
    p_sort_order           INT     DEFAULT NULL,
    p_use_yn               CHAR(1) DEFAULT NULL,
    p_user_id              VARCHAR DEFAULT NULL,
    p_page_number          INT     DEFAULT 1,
    p_rows_per_page        INT     DEFAULT 10
)
RETURNS TABLE (
    vendor_id            BIGINT,
    vendor_name          VARCHAR,
    category1            VARCHAR,
    category2            VARCHAR,
    category3            VARCHAR,
    ceo_name             VARCHAR,
    manager_name         VARCHAR,
    manager_phone        VARCHAR,
    manager_tel          VARCHAR,
    manager_fax          VARCHAR,
    homepage_url         VARCHAR,
    product_desc         TEXT,
    consultation_note    TEXT,
    reg_type             VARCHAR,
    business_region_code VARCHAR,
    detail_address       VARCHAR,
    off_no               BIGINT,
    rt_no                BIGINT,
    sort_order           INT,
    use_yn               CHAR(1),
    reg_id               VARCHAR,
    reg_dt               TIMESTAMP,
    mod_id               VARCHAR,
    mod_dt               TIMESTAMP
)
LANGUAGE plpgsql
AS $$
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
            v.mod_dt
        FROM public.vd_vendor_info v
        WHERE v.reg_type = 'ADMIN'
           OR ((p_vendor_id IS NULL OR v.vendor_id = p_vendor_id)
          AND (p_off_no IS NULL OR v.off_no = p_off_no)
          AND (p_rt_no IS NULL OR v.rt_no = p_rt_no))
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
            reg_dt
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
            CURRENT_TIMESTAMP
        )
        RETURNING * INTO vendor_id, vendor_name, category1, category2, category3, ceo_name,
                         manager_name, manager_phone, manager_tel, manager_fax, homepage_url,
                         product_desc, consultation_note, reg_type, business_region_code,
                         detail_address, off_no, rt_no, sort_order, use_yn, reg_id, reg_dt,
                         mod_id, mod_dt;

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
            mod_id               = COALESCE(p_user_id, mod_id),
            mod_dt               = CURRENT_TIMESTAMP
        WHERE vendor_id = p_vendor_id;

        RETURN QUERY SELECT * FROM public.vd_vendor_info WHERE vendor_id = p_vendor_id;

    -- ===== 삭제 (DEL) =====
    ELSIF UPPER(p_mode) = 'DEL' THEN
        DELETE FROM public.vd_vendor_info
        WHERE vendor_id = p_vendor_id;

        -- 삭제된 결과 확인용 (빈 결과 반환)
        RETURN;

    END IF;
END;
$$;


-- =====================================================
-- 협력업체 영업지역 관리 함수 (fn_vd_vendor_region)
-- =====================================================
-- MODE: SEL(조회), INS(등록), UPD(수정), DEL(삭제)
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_vd_vendor_region(
    p_mode              VARCHAR DEFAULT 'SEL',
    p_vendor_region_id  BIGINT  DEFAULT NULL,
    p_vendor_id         BIGINT  DEFAULT NULL,
    p_region_code       VARCHAR DEFAULT NULL,
    p_sort_order        INT     DEFAULT NULL,
    p_use_yn            CHAR(1) DEFAULT NULL,
    p_user_id           VARCHAR DEFAULT NULL,
    p_page_number       INT     DEFAULT 1,
    p_rows_per_page     INT     DEFAULT 10
)
RETURNS TABLE (
    vendor_region_id   BIGINT,
    vendor_id          BIGINT,
    region_code        VARCHAR,
    sort_order         INT,
    use_yn             CHAR(1),
    reg_id             VARCHAR,
    reg_dt             TIMESTAMP,
    mod_id             VARCHAR,
    mod_dt             TIMESTAMP
)
LANGUAGE plpgsql
AS $$
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
$$;

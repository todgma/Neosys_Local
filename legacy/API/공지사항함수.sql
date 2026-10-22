-- =====================================================
-- 공지사항 관리 함수 (fn_nt_notice)
-- =====================================================
-- MODE: SEL(조회), INS(등록), UPD(수정), DEL(삭제)
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_nt_notice(
    p_mode         VARCHAR DEFAULT 'SEL',
    p_notice_id    BIGINT  DEFAULT NULL,
    p_title        VARCHAR DEFAULT NULL,
    p_content      TEXT    DEFAULT NULL,
    p_category     VARCHAR DEFAULT NULL,
    p_is_top       CHAR(1) DEFAULT NULL,
    p_is_public    CHAR(1) DEFAULT NULL,
    p_is_popup     CHAR(1) DEFAULT NULL,
    p_attach_file  VARCHAR DEFAULT NULL,
    p_start_date   DATE    DEFAULT NULL,
    p_end_date     DATE    DEFAULT NULL,
    p_sort_order   INT     DEFAULT NULL,
    p_user_id      VARCHAR DEFAULT NULL,
    p_page_number  INT     DEFAULT 1,
    p_rows_per_page INT    DEFAULT 10
)
RETURNS TABLE (
    notice_id    BIGINT,
    title        VARCHAR,
    content      TEXT,
    category     VARCHAR,
    view_count   INT,
    is_top       CHAR(1),
    is_public    CHAR(1),
    is_popup     CHAR(1),
    attach_file  VARCHAR,
    start_date   DATE,
    end_date     DATE,
    sort_order   INT,
    reg_id       VARCHAR,
    reg_dt       TIMESTAMP,
    mod_id       VARCHAR,
    mod_dt       TIMESTAMP
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
            n.notice_id,
            n.title,
            n.content,
            n.category,
            n.view_count,
            n.is_top,
            n.is_public,
            n.is_popup,
            n.attach_file,
            n.start_date,
            n.end_date,
            n.sort_order,
            n.reg_id,
            n.reg_dt,
            n.mod_id,
            n.mod_dt
        FROM public.nt_notice n
        WHERE (p_notice_id IS NULL OR n.notice_id = p_notice_id)
          AND (p_category IS NULL OR n.category = p_category)
          AND (p_is_public IS NULL OR n.is_public = p_is_public)
          AND (p_is_popup IS NULL OR n.is_popup = p_is_popup)
        ORDER BY n.is_top DESC, n.sort_order, n.notice_id DESC
        LIMIT p_rows_per_page OFFSET v_offset;

    -- ===== 등록 (INS) =====
    ELSIF UPPER(p_mode) = 'INS' THEN
        INSERT INTO public.nt_notice (
            title,
            content,
            category,
            is_top,
            is_public,
            is_popup,
            attach_file,
            start_date,
            end_date,
            sort_order,
            reg_id,
            reg_dt
        ) VALUES (
            p_title,
            p_content,
            p_category,
            COALESCE(p_is_top, 'N'),
            COALESCE(p_is_public, 'Y'),
            COALESCE(p_is_popup, 'N'),
            p_attach_file,
            p_start_date,
            p_end_date,
            COALESCE(p_sort_order, 0),
            p_user_id,
            CURRENT_TIMESTAMP
        )
        RETURNING * INTO notice_id, title, content, category, view_count, is_top, is_public, is_popup,
                         attach_file, start_date, end_date, sort_order, reg_id, reg_dt,
                         mod_id, mod_dt;

        RETURN NEXT;

    -- ===== 수정 (UPD) =====
    ELSIF UPPER(p_mode) = 'UPD' THEN
        UPDATE public.nt_notice
        SET
            title        = COALESCE(p_title, title),
            content      = COALESCE(p_content, content),
            category     = COALESCE(p_category, category),
            is_top       = COALESCE(p_is_top, is_top),
            is_public    = COALESCE(p_is_public, is_public),
            is_popup     = COALESCE(p_is_popup, is_popup),
            attach_file  = COALESCE(p_attach_file, attach_file),
            start_date   = COALESCE(p_start_date, start_date),
            end_date     = COALESCE(p_end_date, end_date),
            sort_order   = COALESCE(p_sort_order, sort_order),
            mod_id       = COALESCE(p_user_id, mod_id),
            mod_dt       = CURRENT_TIMESTAMP
        WHERE notice_id = p_notice_id;

        RETURN QUERY SELECT * FROM public.nt_notice WHERE notice_id = p_notice_id;

    -- ===== 삭제 (DEL) =====
    ELSIF UPPER(p_mode) = 'DEL' THEN
        DELETE FROM public.nt_notice
        WHERE notice_id = p_notice_id;

        RETURN;

    END IF;
END;
$$;

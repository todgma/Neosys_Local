CREATE OR REPLACE FUNCTION public.fn_nt_notice(p_mode character varying DEFAULT 'SEL'::character varying, p_notice_id bigint DEFAULT NULL::bigint, p_title character varying DEFAULT NULL::character varying, p_content text DEFAULT NULL::text, p_category character varying DEFAULT NULL::character varying, p_is_top character DEFAULT NULL::bpchar, p_is_public character DEFAULT NULL::bpchar, p_is_popup character DEFAULT NULL::bpchar, p_attach_file character varying DEFAULT NULL::character varying, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_sort_order integer DEFAULT NULL::integer, p_user_id character varying DEFAULT NULL::character varying, p_page_number integer DEFAULT 1, p_rows_per_page integer DEFAULT 10)
 RETURNS TABLE(notice_id bigint, title character varying, content text, category character varying, view_count integer, is_top character, is_public character, is_popup character, attach_file character varying, start_date date, end_date date, sort_order integer, reg_id character varying, reg_dt timestamp without time zone, mod_id character varying, mod_dt timestamp without time zone)
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
$function$

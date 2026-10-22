CREATE OR REPLACE FUNCTION public.fn_cs_customer_center(p_mode character varying DEFAULT 'SEL'::character varying, p_inquiry_id bigint DEFAULT NULL::bigint, p_user_id character varying DEFAULT NULL::character varying, p_name character varying DEFAULT NULL::character varying, p_email character varying DEFAULT NULL::character varying, p_phone character varying DEFAULT NULL::character varying, p_category character varying DEFAULT NULL::character varying, p_title character varying DEFAULT NULL::character varying, p_content text DEFAULT NULL::text, p_answer text DEFAULT NULL::text, p_answer_id character varying DEFAULT NULL::character varying, p_status character varying DEFAULT NULL::character varying, p_sort_order integer DEFAULT NULL::integer, p_reg_id character varying DEFAULT NULL::character varying, p_page_number integer DEFAULT 1, p_rows_per_page integer DEFAULT 10)
 RETURNS TABLE(inquiry_id bigint, user_id character varying, name character varying, email character varying, phone character varying, category character varying, title character varying, content text, answer text, answer_id character varying, answer_dt timestamp without time zone, status character varying, sort_order integer, reg_id character varying, reg_dt timestamp without time zone, mod_id character varying, mod_dt timestamp without time zone)
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
            c.inquiry_id,
            c.user_id,
            c.name,
            c.email,
            c.phone,
            c.category,
            c.title,
            c.content,
            c.answer,
            c.answer_id,
            c.answer_dt,
            c.status,
            c.sort_order,
            c.reg_id,
            c.reg_dt,
            c.mod_id,
            c.mod_dt
        FROM public.cs_customer_center c
        WHERE (p_inquiry_id IS NULL OR c.inquiry_id = p_inquiry_id)
          AND (p_user_id IS NULL OR c.user_id = p_user_id)
          AND (p_category IS NULL OR c.category = p_category)
          AND (p_status IS NULL OR c.status = p_status)
        ORDER BY c.sort_order, c.inquiry_id DESC
        LIMIT p_rows_per_page OFFSET v_offset;

    -- ===== 등록 (INS) =====
    ELSIF UPPER(p_mode) = 'INS' THEN
        INSERT INTO public.cs_customer_center (
            user_id,
            name,
            email,
            phone,
            category,
            title,
            content,
            status,
            sort_order,
            reg_id,
            reg_dt
        ) VALUES (
            p_user_id,
            p_name,
            p_email,
            p_phone,
            p_category,
            p_title,
            p_content,
            COALESCE(p_status, 'PENDING'),
            COALESCE(p_sort_order, 0),
            p_reg_id,
            CURRENT_TIMESTAMP
        )
        RETURNING * INTO inquiry_id, user_id, name, email, phone, category, title, content,
                         answer, answer_id, answer_dt, status, sort_order, reg_id, reg_dt,
                         mod_id, mod_dt;

        RETURN NEXT;

    -- ===== 수정 (UPD) =====
    ELSIF UPPER(p_mode) = 'UPD' THEN
        UPDATE public.cs_customer_center
        SET
            name         = COALESCE(p_name, name),
            email        = COALESCE(p_email, email),
            phone        = COALESCE(p_phone, phone),
            category     = COALESCE(p_category, category),
            title        = COALESCE(p_title, title),
            content      = COALESCE(p_content, content),
            status       = COALESCE(p_status, status),
            sort_order   = COALESCE(p_sort_order, sort_order),
            mod_id       = COALESCE(p_reg_id, mod_id),
            mod_dt       = CURRENT_TIMESTAMP
        WHERE inquiry_id = p_inquiry_id;

        RETURN QUERY SELECT * FROM public.cs_customer_center WHERE inquiry_id = p_inquiry_id;

    -- ===== 답변등록 (ANS) =====
    ELSIF UPPER(p_mode) = 'ANS' THEN
        UPDATE public.cs_customer_center
        SET
            answer     = p_answer,
            answer_id  = p_answer_id,
            answer_dt  = CURRENT_TIMESTAMP,
            status     = 'DONE',
            mod_id     = p_answer_id,
            mod_dt     = CURRENT_TIMESTAMP
        WHERE inquiry_id = p_inquiry_id;

        RETURN QUERY SELECT * FROM public.cs_customer_center WHERE inquiry_id = p_inquiry_id;

    -- ===== 삭제 (DEL) =====
    ELSIF UPPER(p_mode) = 'DEL' THEN
        DELETE FROM public.cs_customer_center
        WHERE inquiry_id = p_inquiry_id;

        RETURN;

    END IF;
END;
$function$

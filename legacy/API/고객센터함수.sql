-- =====================================================
-- 고객센터 문의 관리 함수 (fn_cs_customer_center)
-- =====================================================
-- MODE: SEL(조회), INS(등록), UPD(수정), DEL(삭제), ANS(답변등록)
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_cs_customer_center(
    p_mode         VARCHAR DEFAULT 'SEL',
    p_inquiry_id   BIGINT  DEFAULT NULL,
    p_user_id      VARCHAR DEFAULT NULL,
    p_name         VARCHAR DEFAULT NULL,
    p_email        VARCHAR DEFAULT NULL,
    p_phone        VARCHAR DEFAULT NULL,
    p_category     VARCHAR DEFAULT NULL,
    p_title        VARCHAR DEFAULT NULL,
    p_content      TEXT    DEFAULT NULL,
    p_answer       TEXT    DEFAULT NULL,
    p_answer_id    VARCHAR DEFAULT NULL,
    p_status       VARCHAR DEFAULT NULL,
    p_sort_order   INT     DEFAULT NULL,
    p_reg_id       VARCHAR DEFAULT NULL,
    p_page_number  INT     DEFAULT 1,
    p_rows_per_page INT    DEFAULT 10
)
RETURNS TABLE (
    inquiry_id   BIGINT,
    user_id      VARCHAR,
    name         VARCHAR,
    email        VARCHAR,
    phone        VARCHAR,
    category     VARCHAR,
    title        VARCHAR,
    content      TEXT,
    answer       TEXT,
    answer_id    VARCHAR,
    answer_dt    TIMESTAMP,
    status       VARCHAR,
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
$$;

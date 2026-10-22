-- =========================================
-- fn_rt_schedule
-- 일정 관리 통합 함수 (mode 기반)
-- mode: SEL, INS, UPD, DEL
-- =========================================

CREATE OR REPLACE FUNCTION public.fn_rt_schedule(
    pr_mode          VARCHAR(10),        -- 'SEL', 'INS', 'UPD', 'DEL'

    -- 조회 조건
    pr_schedule_id   BIGINT    DEFAULT NULL,
    pr_scope_div     VARCHAR(16)   DEFAULT NULL,
    pr_owner_user_id VARCHAR(50)   DEFAULT NULL,
    pr_office_id     BIGINT    DEFAULT NULL,
    pr_start_date    VARCHAR(20)   DEFAULT NULL,
    pr_end_date      VARCHAR(20)   DEFAULT NULL,
    pr_page          INT       DEFAULT 1,
    pr_page_size     INT       DEFAULT 20,

    -- 등록/수정 데이터
    pr_title         VARCHAR(200)  DEFAULT NULL,
    pr_content       TEXT      DEFAULT NULL,
    pr_phone         VARCHAR(30)   DEFAULT NULL,
    pr_location      VARCHAR(200)  DEFAULT NULL,
    pr_start_at      VARCHAR(30)   DEFAULT NULL,
    pr_end_at        VARCHAR(30)   DEFAULT NULL,
    pr_all_day       BOOLEAN   DEFAULT FALSE,
    pr_is_shared     BOOLEAN   DEFAULT FALSE,
    pr_is_private    BOOLEAN   DEFAULT FALSE,
    pr_user_id       VARCHAR(50)   DEFAULT NULL,

    -- 연동 정보 (JSON 배열)
    pr_links_json    TEXT      DEFAULT NULL
)
RETURNS TABLE (
    schedule_id    BIGINT,
    scope_div      VARCHAR(16),
    owner_user_id  VARCHAR(50),
    office_id      BIGINT,
    title          VARCHAR(200),
    content        TEXT,
    phone          VARCHAR(30),
    location       VARCHAR(200),
    start_at       TIMESTAMPTZ,
    end_at         TIMESTAMPTZ,
    all_day        BOOLEAN,
    use_yn         CHAR(1),
    is_shared      BOOLEAN,
    is_private     BOOLEAN,
    reg_id         VARCHAR(50),
    reg_dt         TIMESTAMPTZ,
    upd_id         VARCHAR(50),
    upd_dt         TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset       INT;
    v_new_schedule_id BIGINT;
    v_link         JSONB;
BEGIN
    -- =========================================
    -- SEL: 일정 목록 조회
    -- =========================================
    IF pr_mode = 'SEL' THEN
        v_offset := (pr_page - 1) * pr_page_size;

        RETURN QUERY
        SELECT
            s.schedule_id,
            s.scope_div,
            s.owner_user_id,
            s.office_id,
            s.title,
            s.content,
            s.phone,
            s.location,
            s.start_at,
            s.end_at,
            s.all_day,
            s.use_yn,
            s.is_shared,
            s.is_private,
            s.reg_id,
            s.reg_dt,
            s.upd_id,
            s.upd_dt
        FROM rt_schedule s
        WHERE s.use_yn = 'Y'
          AND (pr_schedule_id IS NULL OR s.schedule_id = pr_schedule_id)
          AND (pr_scope_div IS NULL OR s.scope_div = pr_scope_div)
          AND (pr_owner_user_id IS NULL OR s.owner_user_id = pr_owner_user_id)
          AND (pr_office_id IS NULL OR s.office_id = pr_office_id)
          AND (pr_start_date IS NULL OR s.start_at >= pr_start_date::TIMESTAMPTZ)
          AND (pr_end_date IS NULL OR s.start_at <= pr_end_date::TIMESTAMPTZ)
        ORDER BY s.start_at DESC
        LIMIT pr_page_size
        OFFSET v_offset;

    -- =========================================
    -- INS: 일정 등록
    -- =========================================
    ELSIF pr_mode = 'INS' THEN
        INSERT INTO rt_schedule (
            scope_div,
            owner_user_id,
            office_id,
            title,
            content,
            phone,
            location,
            start_at,
            end_at,
            all_day,
            is_shared,
            is_private,
            reg_id,
            reg_dt
        ) VALUES (
            pr_scope_div,
            pr_owner_user_id,
            pr_office_id,
            pr_title,
            pr_content,
            pr_phone,
            pr_location,
            pr_start_at::TIMESTAMPTZ,
            pr_end_at::TIMESTAMPTZ,
            pr_all_day,
            pr_is_shared,
            pr_is_private,
            pr_user_id,
            NOW()
        )
        RETURNING schedule_id INTO v_new_schedule_id;

        -- 연동 정보 등록
        IF pr_links_json IS NOT NULL AND pr_links_json != '' THEN
            FOR v_link IN SELECT * FROM jsonb_array_elements(pr_links_json::JSONB)
            LOOP
                INSERT INTO rt_schedule_link (
                    schedule_id,
                    link_type,
                    link_key,
                    meta,
                    reg_id,
                    reg_dt
                ) VALUES (
                    v_new_schedule_id,
                    v_link->>'LinkType',
                    v_link->>'LinkKey',
                    (v_link->>'Meta')::JSONB,
                    pr_user_id,
                    NOW()
                );
            END LOOP;
        END IF;

        RETURN QUERY SELECT v_new_schedule_id, pr_scope_div, pr_owner_user_id, pr_office_id, pr_title, pr_content, pr_phone, pr_location, pr_start_at::TIMESTAMPTZ, pr_end_at::TIMESTAMPTZ, pr_all_day, 'Y'::CHAR(1), pr_is_shared, pr_is_private, pr_user_id, NOW(), NULL::VARCHAR(50), NULL::TIMESTAMPTZ;

    -- =========================================
    -- UPD: 일정 수정
    -- =========================================
    ELSIF pr_mode = 'UPD' THEN
        UPDATE rt_schedule
        SET
            scope_div      = COALESCE(pr_scope_div, scope_div),
            owner_user_id  = COALESCE(pr_owner_user_id, owner_user_id),
            office_id      = COALESCE(pr_office_id, office_id),
            title          = COALESCE(pr_title, title),
            content        = COALESCE(pr_content, content),
            phone          = COALESCE(pr_phone, phone),
            location       = COALESCE(pr_location, location),
            start_at       = COALESCE(pr_start_at::TIMESTAMPTZ, start_at),
            end_at         = COALESCE(pr_end_at::TIMESTAMPTZ, end_at),
            all_day        = COALESCE(pr_all_day, all_day),
            is_shared      = COALESCE(pr_is_shared, is_shared),
            is_private     = COALESCE(pr_is_private, is_private),
            upd_id         = pr_user_id,
            upd_dt         = NOW()
        WHERE schedule_id = pr_schedule_id;

        -- 연동 정보 업데이트 (기존 삭제 후 재등록)
        IF pr_links_json IS NOT NULL THEN
            DELETE FROM rt_schedule_link WHERE schedule_id = pr_schedule_id;

            IF pr_links_json != '' THEN
                FOR v_link IN SELECT * FROM jsonb_array_elements(pr_links_json::JSONB)
                LOOP
                    INSERT INTO rt_schedule_link (
                        schedule_id,
                        link_type,
                        link_key,
                        meta,
                        reg_id,
                        reg_dt
                    ) VALUES (
                        pr_schedule_id,
                        v_link->>'LinkType',
                        v_link->>'LinkKey',
                        (v_link->>'Meta')::JSONB,
                        pr_user_id,
                        NOW()
                    );
                END LOOP;
            END IF;
        END IF;

        RETURN QUERY
        SELECT
            s.schedule_id,
            s.scope_div,
            s.owner_user_id,
            s.office_id,
            s.title,
            s.content,
            s.phone,
            s.location,
            s.start_at,
            s.end_at,
            s.all_day,
            s.use_yn,
            s.is_shared,
            s.is_private,
            s.reg_id,
            s.reg_dt,
            s.upd_id,
            s.upd_dt
        FROM rt_schedule s
        WHERE s.schedule_id = pr_schedule_id;

    -- =========================================
    -- DEL: 일정 삭제 (논리 삭제)
    -- =========================================
    ELSIF pr_mode = 'DEL' THEN
        UPDATE rt_schedule
        SET
            use_yn = 'N',
            upd_id = pr_user_id,
            upd_dt = NOW()
        WHERE schedule_id = pr_schedule_id;

        -- 연동 정보도 삭제 (물리 삭제)
        DELETE FROM rt_schedule_link WHERE schedule_id = pr_schedule_id;

        RETURN QUERY SELECT pr_schedule_id, NULL::VARCHAR(16), NULL::VARCHAR(50), NULL::BIGINT, NULL::VARCHAR(200), NULL::TEXT, NULL::VARCHAR(30), NULL::VARCHAR(200), NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::BOOLEAN, 'N'::CHAR(1), NULL::BOOLEAN, NULL::BOOLEAN, NULL::VARCHAR(50), NULL::TIMESTAMPTZ, pr_user_id, NOW();
    END IF;

END;
$$;


-- =========================================
-- fn_rt_schedule_link
-- 일정 연동 정보 조회 함수
-- =========================================

CREATE OR REPLACE FUNCTION public.fn_rt_schedule_link(
    pr_schedule_id BIGINT
)
RETURNS TABLE (
    link_id      BIGINT,
    schedule_id  BIGINT,
    link_type    VARCHAR(30),
    link_key     VARCHAR(100),
    meta         JSONB,
    reg_id       VARCHAR(50),
    reg_dt       TIMESTAMPTZ,
    upd_id       VARCHAR(50),
    upd_dt       TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.link_id,
        l.schedule_id,
        l.link_type,
        l.link_key,
        l.meta,
        l.reg_id,
        l.reg_dt,
        l.upd_id,
        l.upd_dt
    FROM rt_schedule_link l
    WHERE l.schedule_id = pr_schedule_id
    ORDER BY l.link_id;
END;
$$;

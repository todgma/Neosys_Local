CREATE OR REPLACE FUNCTION public.fn_apt_art_iros(pr_proc text, pr_id bigint DEFAULT NULL::bigint, pr_address character varying DEFAULT NULL::character varying, pr_unique_num character varying DEFAULT NULL::character varying, pr_type character varying DEFAULT NULL::character varying, pr_ic_id character varying DEFAULT NULL::character varying, pr_reg_dt timestamp without time zone DEFAULT NULL::timestamp without time zone, pr_reg_id character varying DEFAULT NULL::character varying, pr_page_no integer DEFAULT 1, pr_page_size integer DEFAULT 20)
 RETURNS TABLE(id bigint, address character varying, uniquenum character varying, type character varying, icid character varying, regdt timestamp without time zone, regid character varying, rowcount bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    ----------------------------------------------------------------------
    -- INSERT
    ----------------------------------------------------------------------
    IF pr_proc = 'INS' THEN
        RETURN QUERY
        INSERT INTO apt_art_iros (
            address, unique_num, type, ic_id, reg_dt, reg_id
        )
        VALUES (
            pr_address,
            pr_unique_num,
            pr_type,
            pr_ic_id,
            COALESCE(pr_reg_dt, NOW()),
            pr_reg_id
        )
        RETURNING
            apt_art_iros.id         AS "Id",
            apt_art_iros.address    AS "Address",
            apt_art_iros.unique_num AS "UniqueNum",
            apt_art_iros.type       AS "Type",
            apt_art_iros.ic_id      AS "IcId",
            apt_art_iros.reg_dt     AS "RegDt",
            apt_art_iros.reg_id     AS "RegId",
            1::bigint               AS "RowCount";

    ----------------------------------------------------------------------
    -- SELECT
    ----------------------------------------------------------------------
    ELSIF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT
            a.id          AS "Id",
            a.address     AS "Address",
            a.unique_num  AS "UniqueNum",
            a.type        AS "Type",
            a.ic_id       AS "IcId",
            a.reg_dt      AS "RegDt",
            a.reg_id      AS "RegId",
            COUNT(*) OVER() AS "RowCount"
        FROM apt_art_iros a
        WHERE (pr_id         IS NULL OR a.id = pr_id)
          AND (pr_address     IS NULL OR a.address LIKE pr_address || '%')
          AND (pr_unique_num  IS NULL OR a.unique_num LIKE pr_unique_num || '%')
          AND (pr_type        IS NULL OR a.type LIKE pr_type || '%')
          AND (pr_ic_id       IS NULL OR a.ic_id LIKE pr_ic_id || '%')
          AND (pr_reg_id      IS NULL OR a.reg_id LIKE pr_reg_id || '%')
        ORDER BY a.address, a.id DESC
        LIMIT pr_page_size
        OFFSET (pr_page_no - 1) * pr_page_size;
    END IF;
END;
$function$

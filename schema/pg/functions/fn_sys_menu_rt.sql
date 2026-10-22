CREATE OR REPLACE FUNCTION public.fn_sys_menu_rt(pr_proc character varying, pr_rt_no bigint DEFAULT NULL::bigint, pr_id integer DEFAULT NULL::integer, pr_c_yn character DEFAULT NULL::bpchar, pr_r_yn character DEFAULT NULL::bpchar, pr_u_yn character DEFAULT NULL::bpchar, pr_d_yn character DEFAULT NULL::bpchar, pr_use_yn character DEFAULT NULL::bpchar, pr_user_id character varying DEFAULT NULL::character varying)
 RETURNS TABLE("RtNo" bigint, "Id" integer, "CYn" character varying, "RYn" character varying, "UYn" character varying, "DYn" character varying, "UseYn" character varying, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count integer;
BEGIN
    -- ▣ INSERT
    IF pr_proc = 'INS' THEN
        INSERT INTO sys_menu_rt (
            rt_no, id, c_yn, r_yn, u_yn, d_yn, use_yn, reg_dt, reg_id
        )
        VALUES (
            pr_rt_no, pr_id, pr_c_yn, pr_r_yn, pr_u_yn, pr_d_yn, 
            COALESCE(pr_use_yn, 'Y'), NOW(), pr_user_id
        );
		RETURN;


    -- ▣ UPDATE
    ELSIF pr_proc = 'UPD' THEN
        UPDATE sys_menu_rt
        SET
            c_yn   = COALESCE(pr_c_yn, c_yn),
            r_yn   = COALESCE(pr_r_yn, r_yn),
            u_yn   = COALESCE(pr_u_yn, u_yn),
            d_yn   = COALESCE(pr_d_yn, d_yn),
            use_yn = COALESCE(pr_use_yn, use_yn),
            upd_dt = NOW(),
            upd_id = pr_user_id
        WHERE rt_no = pr_rt_no
          AND id    = pr_id;

        GET DIAGNOSTICS v_count = ROW_COUNT;

        -- 존재하지 않으면 INSERT
        IF v_count = 0 THEN
            INSERT INTO sys_menu_rt (
                rt_no, id, c_yn, r_yn, u_yn, d_yn, use_yn, reg_dt, reg_id
            )
            VALUES (
                pr_rt_no, pr_id, pr_c_yn, pr_r_yn, pr_u_yn, pr_d_yn,
                COALESCE(pr_use_yn, 'Y'), NOW(), pr_user_id
            );
        END IF;

        RETURN;

--        RETURNING 
--            rt_no AS "RtNo", id AS "Id", c_yn AS "CYn", r_yn AS "RYn",
--            u_yn AS "UYn", d_yn AS "DYn", use_yn AS "UseYn",
--            reg_dt AS "RegDt", reg_id AS "RegId",
--            upd_dt AS "UpdDt", upd_id AS "UpdId";

    -- ▣ DELETE
    ELSIF pr_proc = 'DEL' THEN
        DELETE FROM sys_menu_rt
        WHERE rt_no = pr_rt_no AND id = pr_id;
	RETURN;

    -- ▣ SELECT
    ELSIF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT 
            rt_no AS "RtNo",
            id AS "Id",
            c_yn AS "CYn",
            r_yn AS "RYn",
            u_yn AS "UYn",
            d_yn AS "DYn",
            use_yn AS "UseYn",
            reg_dt AS "RegDt",
            reg_id AS "RegId",
            upd_dt AS "UpdDt",
            upd_id AS "UpdId"
        FROM sys_menu_rt
        WHERE (pr_rt_no IS NULL OR rt_no = pr_rt_no)
        ORDER BY rt_no, id;
    END IF;
END;
$function$

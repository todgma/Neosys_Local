CREATE OR REPLACE FUNCTION public.fn_sys_menu(pr_proc character varying, pr_id integer DEFAULT NULL::integer, pr_mnu_nm character varying DEFAULT NULL::character varying, pr_lvl integer DEFAULT NULL::integer, pr_parent_id integer DEFAULT NULL::integer, pr_use_yn character varying DEFAULT NULL::character varying, pr_sort integer DEFAULT NULL::integer, pr_user_id character varying DEFAULT NULL::character varying)
 RETURNS TABLE("Id" integer, "MnuNm" character varying, "Lvl" integer, "ParentId" integer, "UseYn" character varying, "Sort" integer, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- ▣ INSERT
    IF pr_proc = 'INS' THEN
        INSERT INTO sys_menu (
            mnu_nm, lvl, parent_id, use_yn, sort, reg_dt, reg_id
        )
        VALUES (
            pr_mnu_nm, pr_lvl, pr_parent_id, COALESCE(pr_use_yn, 'Y'), pr_sort, NOW(), pr_user_id
        )
        ;

    -- ▣ UPDATE
    ELSIF pr_proc = 'UPD' THEN
        UPDATE sys_menu
        SET 
            mnu_nm = COALESCE(pr_mnu_nm, mnu_nm),
            lvl = COALESCE(pr_lvl, lvl),
            parent_id = COALESCE(pr_parent_id, parent_id),
            use_yn = COALESCE(pr_use_yn, use_yn),
			sort = COALESCE(pr_sort, sort),
            upd_dt = NOW(),
            upd_id = pr_user_id
        WHERE id = pr_id
        ;

    -- ▣ DELETE
    ELSIF pr_proc = 'DEL' THEN
        DELETE FROM sys_menu
        WHERE id = pr_id
        ;

    -- ▣ SELECT (전체 or 특정 ID)
    ELSIF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT 
            id as "Id", 
            mnu_nm as "MnuNm", 
            lvl as "Lvl", 
            parent_id as "ParentId", 
            use_yn as "UseYn",
            sort as "Sort", 
            reg_dt as "RegDt",
            reg_id as "RegId", 
            upd_dt as "UpdDt",
            upd_id as "UpdId"
        FROM sys_menu
        WHERE (pr_id IS NULL OR id = pr_id)
        ORDER BY sort;
    END IF;

END;
$function$

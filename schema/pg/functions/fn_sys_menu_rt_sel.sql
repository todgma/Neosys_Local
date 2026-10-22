CREATE OR REPLACE FUNCTION public.fn_sys_menu_rt_sel(pr_rt_no bigint DEFAULT NULL::bigint)
 RETURNS TABLE("Id" integer, "MnuNm" character varying, "Lvl" integer, "ParentId" integer, "RtNo" bigint, "CYn" character varying, "RYn" character varying, "UYn" character varying, "DYn" character varying, "UseYn" character varying, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        m.id                         AS "Id",
        m.mnu_nm                     AS "MnuNm",
        m.lvl                        AS "Lvl",
        COALESCE(m.parent_id, 0)     AS "ParentId",
        r.rt_no                      AS "RtNo",
        r.c_yn                       AS "CYn",
        r.r_yn                       AS "RYn",
        r.u_yn                       AS "UYn",
        r.d_yn                       AS "DYn",
        r.use_yn                     AS "UseYn",
        r.reg_dt                     AS "RegDt",
        r.reg_id                     AS "RegId",
        r.upd_dt                     AS "UpdDt",
        r.upd_id                     AS "UpdId"
    FROM public.sys_menu_rt r
    JOIN public.sys_menu    m ON m.id = r.id
    WHERE (pr_rt_no IS NULL OR r.rt_no = pr_rt_no)
      -- 필요 시 활성 메뉴만:
      -- AND COALESCE(m.use_yn, 'Y') = 'Y'
      -- AND COALESCE(r.use_yn, 'Y') = 'Y'
    ORDER BY
        m.lvl NULLS FIRST,
        m.sort NULLS LAST,
        m.id;
END;
$function$

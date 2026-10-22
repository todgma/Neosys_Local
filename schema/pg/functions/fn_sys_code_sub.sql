CREATE OR REPLACE FUNCTION public.fn_sys_code_sub(pr_proc character varying, pr_cat_cd character varying DEFAULT NULL::character varying, pr_mid_cd character varying DEFAULT NULL::character varying, pr_sub_cd character varying DEFAULT NULL::character varying, pr_sub_nm character varying DEFAULT NULL::character varying, pr_etc1 character varying DEFAULT NULL::character varying, pr_etc2 character varying DEFAULT NULL::character varying, pr_etc3 character varying DEFAULT NULL::character varying, pr_etc4 character varying DEFAULT NULL::character varying, pr_etc5 character varying DEFAULT NULL::character varying, pr_etc6 character varying DEFAULT NULL::character varying, pr_etc7 character varying DEFAULT NULL::character varying, pr_etc8 character varying DEFAULT NULL::character varying, pr_etc9 character varying DEFAULT NULL::character varying, pr_etc10 character varying DEFAULT NULL::character varying, pr_use_yn character varying DEFAULT NULL::character varying, pr_sort integer DEFAULT NULL::integer, pr_user_id character varying DEFAULT NULL::character varying)
 RETURNS TABLE("CatCd" character varying, "MidCd" character varying, "SubCd" character varying, "SubNm" character varying, "Etc1" character varying, "Etc2" character varying, "Etc3" character varying, "Etc4" character varying, "Etc5" character varying, "Etc6" character varying, "Etc7" character varying, "Etc8" character varying, "Etc9" character varying, "Etc10" character varying, "UseYn" character varying, "Sort" integer, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- INSERT
    IF pr_proc = 'INS' THEN
        INSERT INTO sys_code_sub (
            cat_cd, mid_cd, sub_cd, sub_nm,
            etc1, etc2, etc3, etc4, etc5,
            etc6, etc7, etc8, etc9, etc10,
            use_yn, sort, reg_dt, reg_id
        ) VALUES (
            pr_cat_cd, pr_mid_cd, pr_sub_cd, pr_sub_nm,
            pr_etc1, pr_etc2, pr_etc3, pr_etc4, pr_etc5,
            pr_etc6, pr_etc7, pr_etc8, pr_etc9, pr_etc10,
            pr_use_yn, pr_sort, NOW(), pr_user_id
        );

    -- UPDATE
    ELSIF pr_proc = 'UPD' THEN
        UPDATE sys_code_sub a
        SET
            sub_nm = COALESCE(pr_sub_nm, a.sub_nm),
            etc1 = COALESCE(pr_etc1, a.etc1),
            etc2 = COALESCE(pr_etc2, a.etc2),
            etc3 = COALESCE(pr_etc3, a.etc3),
            etc4 = COALESCE(pr_etc4, a.etc4),
            etc5 = COALESCE(pr_etc5, a.etc5),
            etc6 = COALESCE(pr_etc6, a.etc6),
            etc7 = COALESCE(pr_etc7, a.etc7),
            etc8 = COALESCE(pr_etc8, a.etc8),
            etc9 = COALESCE(pr_etc9, a.etc9),
            etc10 = COALESCE(pr_etc10, a.etc10),
            use_yn = COALESCE(pr_use_yn, a.use_yn),
            sort = COALESCE(pr_sort, a.sort),
            upd_dt = NOW(),
            upd_id = pr_user_id
        WHERE cat_cd = pr_cat_cd
          AND mid_cd = pr_mid_cd
          AND sub_cd = pr_sub_cd;

    -- DELETE
    ELSIF pr_proc = 'DEL' THEN
        DELETE FROM sys_code_sub
        WHERE cat_cd = pr_cat_cd
          AND mid_cd = pr_mid_cd
          AND sub_cd = pr_sub_cd;

    END IF;

    -- SELECT 결과 반환 (INS, UPD, DEL 후에도 전체 반환)
    RETURN QUERY
    SELECT
        a.cat_cd AS "CatCd",
        a.mid_cd AS "MidCd",
        a.sub_cd AS "SubCd",
        a.sub_nm AS "SubNm",
        a.etc1 AS "Etc1",
        a.etc2 AS "Etc2",
        a.etc3 AS "Etc3",
        a.etc4 AS "Etc4",
        a.etc5 AS "Etc5",
        a.etc6 AS "Etc6",
        a.etc7 AS "Etc7",
        a.etc8 AS "Etc8",
        a.etc9 AS "Etc9",
        a.etc10 AS "Etc10",
        a.use_yn AS "UseYn",
        a.sort AS "Sort",
        a.reg_dt AS "RegDt",
        a.reg_id AS "RegId",
        a.upd_dt AS "UpdDt",
        a.upd_id AS "UpdId"
    FROM sys_code_sub a
    WHERE (pr_proc = 'SEL'
        AND (pr_cat_cd IS NULL OR a.cat_cd = pr_cat_cd)
        AND (pr_mid_cd IS NULL OR a.mid_cd = pr_mid_cd)
        AND (pr_sub_cd IS NULL OR a.sub_cd = pr_sub_cd))
       OR (pr_proc IN ('INS', 'UPD', 'DEL')
        AND a.cat_cd = pr_cat_cd
        AND a.mid_cd = pr_mid_cd
        AND a.sub_cd = pr_sub_cd);

END;
$function$

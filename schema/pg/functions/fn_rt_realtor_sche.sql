CREATE OR REPLACE FUNCTION public.fn_rt_realtor_sche(pr_proc character varying, pr_sch_idx bigint DEFAULT NULL::bigint, pr_rt_no bigint DEFAULT NULL::bigint, pr_sch_type character varying DEFAULT NULL::character varying, pr_sha_yn character varying DEFAULT NULL::character varying, pr_sch_date character varying DEFAULT NULL::character varying, pr_sch_time integer DEFAULT NULL::integer, pr_sch_min integer DEFAULT NULL::integer, pr_title character varying DEFAULT NULL::character varying, pr_content character varying DEFAULT NULL::character varying, pr_cust_no1 bigint DEFAULT NULL::bigint, pr_cust_no2 bigint DEFAULT NULL::bigint, pr_cust_info1 character varying DEFAULT NULL::character varying, pr_cust_info2 character varying DEFAULT NULL::character varying, pr_user_id character varying DEFAULT NULL::character varying, pr_sch_date_fr character varying DEFAULT NULL::character varying, pr_sch_date_to character varying DEFAULT NULL::character varying, pr_page bigint DEFAULT NULL::bigint, pr_page_size bigint DEFAULT NULL::bigint)
 RETURNS TABLE("SchIdx" bigint, "RtNo" bigint, "SchType" character varying, "ShaYn" character varying, "SchDate" character varying, "SchTime" integer, "SchMin" integer, "Title" character varying, "Content" character varying, "CustNo1" bigint, "CustNo2" bigint, "CustInfo1" character varying, "CustInfo2" character varying, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- INSERT
    IF pr_proc = 'INS' THEN
        INSERT INTO rt_realtor_sche (
            rt_no, sch_type, sha_yn, sch_date, sch_time, sch_min, title, content,
            cust_no1, cust_no2, cust_info1, cust_info2, reg_dt, reg_id
        ) VALUES (
            pr_rt_no, pr_sch_type, pr_sha_yn, pr_sch_date, pr_sch_time, pr_sch_min,
            pr_title, pr_content, pr_cust_no1, pr_cust_no2, pr_cust_info1, pr_cust_info2, NOW(), pr_user_id
        )
        ;
    END IF;

    -- UPDATE
    IF pr_proc = 'UPD' THEN
        UPDATE rt_realtor_sche
           SET rt_no       = COALESCE(pr_rt_no, rt_no),
               sch_type    = COALESCE(pr_sch_type, sch_type),
               sha_yn      = COALESCE(pr_sha_yn, sha_yn),
               sch_date    = COALESCE(pr_sch_date, sch_date),
               sch_time    = COALESCE(pr_sch_time, sch_time),
               sch_min     = COALESCE(pr_sch_min, sch_min),
               title       = COALESCE(pr_title, title),
               content     = COALESCE(pr_content, content),
               cust_no1    = COALESCE(pr_cust_no1, cust_no1),
               cust_no2    = COALESCE(pr_cust_no2, cust_no2),
               cust_info1  = COALESCE(pr_cust_info1, cust_info1),
               cust_info2  = COALESCE(pr_cust_info2, cust_info2),
               upd_dt      = NOW(),
               upd_id      = pr_user_id
         WHERE sch_idx = pr_sch_idx
        ;
    END IF;

    -- DELETE
    IF pr_proc = 'DEL' THEN
        DELETE FROM rt_realtor_sche WHERE sch_idx = pr_sch_idx;
        RETURN;
    END IF;

    -- SELECT (검색 + 기간 조회)
    IF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT 
            sch_idx   AS "SchIdx",
            rt_no     AS "RtNo",
            sch_type  AS "SchType",
            sha_yn    AS "ShaYn",
            sch_date  AS "SchDate",
            sch_time  AS "SchTime",
            sch_min   AS "SchMin",
            title     AS "Title",
            content   AS "Content",
            cust_no1  AS "CustNo1",
            cust_no2  AS "CustNo2",
            cust_info1 AS "CustInfo1",
            cust_info2 AS "CustInfo2",
            reg_dt    AS "RegDt",
            reg_id    AS "RegId",
            upd_dt    AS "UpdDt",
            upd_id    AS "UpdId"
        FROM rt_realtor_sche
        WHERE (pr_sch_idx  IS NULL OR sch_idx = pr_sch_idx)
          AND (pr_rt_no    IS NULL OR rt_no = pr_rt_no)
          AND (pr_sch_type IS NULL OR sch_type = pr_sch_type)
          AND (pr_sha_yn   IS NULL OR sha_yn = pr_sha_yn)
		  AND (
                (pr_sch_date_fr IS NULL AND pr_sch_date_to IS NULL)
                OR (sch_date BETWEEN pr_sch_date_fr AND pr_sch_date_to)
              )
		  AND (pr_title    IS NULL OR title ILIKE '%' || pr_title || '%')
          AND (pr_cust_no1   IS NULL OR (cust_no1 = pr_cust_no1 OR cust_no2 = pr_cust_no1))
		  AND (pr_cust_info1    IS NULL OR (cust_info1 ILIKE '%' || pr_cust_info1 || '%' OR cust_info2 ILIKE '%' || pr_cust_info1 || '%' ))
        ORDER BY sch_date DESC
		LIMIT pr_page_size
	    OFFSET (pr_page - 1) * pr_page_size
;
    END IF;
END;
$function$

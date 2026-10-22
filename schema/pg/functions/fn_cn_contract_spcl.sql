CREATE OR REPLACE FUNCTION public.fn_cn_contract_spcl(pr_proc character varying, pr_cn_no integer DEFAULT NULL::integer, pr_cns_no integer DEFAULT NULL::integer, pr_spcl_desc character varying DEFAULT NULL::character varying, pr_file_id character varying DEFAULT NULL::character varying, pr_user_id character varying DEFAULT NULL::character varying, pr_json_data jsonb DEFAULT NULL::jsonb, pr_page integer DEFAULT 1, pr_page_size integer DEFAULT 10)
 RETURNS TABLE("CnNo" integer, "CnsNo" integer, "SpclDesc" character varying, "FileId" character varying, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- INSERT
    IF pr_proc = 'INS' THEN
        INSERT INTO cn_contract_spcl 
			   (cn_no, cns_no, spcl_desc, file_id, reg_dt, reg_id)
		SELECT pr_cn_no,
		     ( value->>'CnsNo')::INT,
		       value->>'SpclDesc',
		       value->>'FileId',
			   NOW(),
		       pr_user_id
		    FROM jsonb_array_elements(pr_json_data);

    -- UPDATE (NULL 값은 기존 값 유지)
    ELSIF pr_proc = 'UPD' THEN
        UPDATE cn_contract_spcl AS t
           SET spcl_desc = COALESCE(j.value->>'SpclDesc', t.spcl_desc),
               file_id   = COALESCE(j.value->>'FileId', t.file_id),
               upd_dt    = NOW(),
               upd_id    = pr_user_id
          FROM jsonb_array_elements(pr_json_data) AS j(value)
         WHERE t.cn_no = pr_cn_no
           AND t.cns_no = (j.value->>'CnsNo')::INT;

    -- DELETE
    ELSIF pr_proc = 'DEL' THEN
        DELETE FROM cn_contract_spcl
         WHERE cn_no = pr_cn_no
           AND cns_no = pr_cns_no
        ;

        RETURN NEXT;

    -- SELECT (LIKE 검색 + 페이징)
    ELSIF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT 
            cn_no AS "CnNo",
            cns_no AS "CnsNo",
            spcl_desc AS "SpclDesc",
            file_id AS "FileId",
            reg_dt AS "RegDt",
            reg_id AS "RegId",
            upd_dt AS "UpdDt",
            upd_id AS "UpdId"
        FROM cn_contract_spcl
        WHERE (pr_cn_no IS NULL OR cn_no = pr_cn_no)
          AND (pr_cns_no IS NULL OR cns_no = pr_cns_no)
          AND (pr_spcl_desc IS NULL OR spcl_desc ILIKE '%' || pr_spcl_desc || '%')
        ORDER BY cn_no, cns_no DESC
        LIMIT pr_page_size
        OFFSET (pr_page - 1) * pr_page_size;
    END IF;
END;
$function$

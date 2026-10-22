CREATE OR REPLACE FUNCTION public.fn_ct_interview(pr_proc character varying, pr_itv_no bigint DEFAULT NULL::bigint, pr_itv_type character varying DEFAULT NULL::character varying, pr_itv_date character varying DEFAULT NULL::character varying, pr_cust_no bigint DEFAULT NULL::bigint, pr_cust_name character varying DEFAULT NULL::character varying, pr_cust_phone character varying DEFAULT NULL::character varying, pr_pt_no bigint DEFAULT NULL::bigint, pr_itv_content character varying DEFAULT NULL::character varying, pr_itv_memo character varying DEFAULT NULL::character varying, pr_rt_no bigint DEFAULT NULL::bigint, pr_off_no bigint DEFAULT NULL::bigint, pr_vendor_id integer DEFAULT NULL::integer, pr_user_id character varying DEFAULT NULL::character varying, pr_itv_fr_date character varying DEFAULT NULL::character varying, pr_itv_to_date character varying DEFAULT NULL::character varying, pr_page integer DEFAULT NULL::integer, pr_page_size integer DEFAULT NULL::integer)
 RETURNS TABLE("ItvNo" bigint, "ItvType" character varying, "ItvDate" character varying, "CustNo" bigint, "CustName" character varying, "CustPhone" character varying, "PtNo" bigint, "ItvContent" character varying, "ItvMemo" character varying, "RtNo" bigint, "OffNo" bigint, "VendorId" bigint, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF pr_proc = 'INS' THEN
        INSERT INTO ct_interview (
            itv_type, itv_date, cust_no, cust_name, cust_phone,
            pt_no, itv_content, itv_memo, rt_no, off_no, vendor_id,
            reg_dt, reg_id
        )
        VALUES (
            pr_itv_type, pr_itv_date, pr_cust_no, pr_cust_name, pr_cust_phone,
            pr_pt_no, pr_itv_content, pr_itv_memo, pr_rt_no, pr_off_no, pr_vendor_id,
            NOW(), pr_user_id
        )
    ;

    ELSIF pr_proc = 'UPD' THEN
        UPDATE ct_interview a
        SET
            itv_type    = COALESCE(pr_itv_type, a.itv_type),
            itv_date    = COALESCE(pr_itv_date, a.itv_date),
            cust_no     = COALESCE(pr_cust_no, a.cust_no),
            cust_name   = COALESCE(pr_cust_name, a.cust_name),
            cust_phone  = COALESCE(pr_cust_phone, a.cust_phone),
            pt_no       = COALESCE(pr_pt_no, a.pt_no),
            itv_content = COALESCE(pr_itv_content, a.itv_content),
            itv_memo    = COALESCE(pr_itv_memo, a.itv_memo),
            rt_no       = COALESCE(pr_rt_no, a.rt_no),
            off_no      = COALESCE(pr_off_no, a.off_no),
            vendor_id   = COALESCE(pr_vendor_id, a.vendor_id),
            upd_dt      = NOW(),
            upd_id      = pr_user_id
        WHERE a.itv_no = pr_itv_no;

    ELSIF pr_proc = 'DEL' THEN
        DELETE FROM ct_interview a
        WHERE a.itv_no = pr_itv_no
	;


    ELSIF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT a.itv_no as "ItvNo",
			   a.itv_type as "ItvType",
			   a.itv_date as "ItvDate",
			   a.cust_no as "CustNo",
			   a.cust_name as "CustName",
			   a.cust_phone as "CustPhone",
			   a.pt_no as "PtNo",
			   a.itv_content as "ItvContent",
			   a.itv_memo as "ItvMemo",
			   a.rt_no as "RtNo",
			   a.off_no as "OffNo",
               a.vendor_id as "VendorId",
			   a.reg_dt as "RegDt",
			   a.reg_id as "RegId",
			   a.upd_dt as "UpdDt",
			   a.upd_id as "UpdId"
          FROM ct_interview a
         WHERE 1=1
           AND TO_DATE(a.itv_date, 'YYYY-MM-DD')
            BETWEEN TO_DATE(pr_itv_fr_date, 'YYYY-MM-DD')
            AND TO_DATE(pr_itv_to_date, 'YYYY-MM-DD')
           AND (pr_itv_no IS NULL OR itv_no = pr_itv_no)
           AND (pr_cust_name IS NULL OR a.cust_name ILIKE '%' || pr_cust_name || '%')
           AND (pr_itv_content IS NULL OR a.itv_content ILIKE '%' || pr_itv_content || '%')
           AND (pr_itv_memo IS NULL OR a.itv_memo ILIKE '%' || pr_itv_memo || '%')
           AND (pr_vendor_id IS NULL OR vendor_id = pr_vendor_id)
         ORDER BY itv_no DESC
   		 LIMIT pr_page_size
	    OFFSET (pr_page - 1) * pr_page_size
		;

    ELSE
        RAISE EXCEPTION 'Invalid pr_proc value: %, must be INS | UPD | DEL | SEL', pr_proc;
    END IF;
END;
$function$

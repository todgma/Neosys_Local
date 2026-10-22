CREATE OR REPLACE FUNCTION public.fn_ofc_non_shared(pr_proc character varying, pr_non_idx integer DEFAULT NULL::integer, pr_off_no bigint DEFAULT NULL::bigint, pr_off_nm character varying DEFAULT NULL::character varying, pr_addr character varying DEFAULT NULL::character varying, pr_rps_nm character varying DEFAULT NULL::character varying, pr_rps_phone character varying DEFAULT NULL::character varying, pr_off_tel character varying DEFAULT NULL::character varying, pr_off_fax character varying DEFAULT NULL::character varying, pr_reg_no character varying DEFAULT NULL::character varying, pr_biz_no character varying DEFAULT NULL::character varying, pr_pt_no bigint DEFAULT NULL::bigint, pr_cust_no bigint DEFAULT NULL::bigint, pr_regist_date character varying DEFAULT NULL::character varying, pr_lift_date character varying DEFAULT NULL::character varying, pr_reason character varying DEFAULT NULL::character varying, pr_user_id character varying DEFAULT NULL::character varying)
 RETURNS TABLE("NonIdx" integer, "OffNo" bigint, "OffNm" character varying, "Addr" character varying, "RpsNm" character varying, "RpsPhone" character varying, "OffTel" character varying, "OffFax" character varying, "RegNo" character varying, "BizNo" character varying, "PtNo" bigint, "CustNo" bigint, "RegistDate" character varying, "LiftDate" character varying, "Reason" character varying, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- INSERT
    IF pr_proc = 'INS' THEN
        INSERT INTO ofc_non_shared (
            off_no, off_nm, addr, rps_nm, rps_phone, off_tel, off_fax,
            reg_no, biz_no, pt_no, cust_no, regist_date, lift_date,
            reason, reg_dt, reg_id
        )
        VALUES (
            pr_off_no, pr_off_nm, pr_addr, pr_rps_nm, pr_rps_phone, pr_off_tel, pr_off_fax,
            pr_reg_no, pr_biz_no, pr_pt_no, pr_cust_no, pr_regist_date, pr_lift_date,
            pr_reason, NOW(), pr_user_id
        )
		;

    -- UPDATE
    ELSIF pr_proc = 'UPD' THEN
        UPDATE ofc_non_shared
        SET
            off_no = pr_off_no,
            off_nm = pr_off_nm,
            addr = pr_addr,
            rps_nm = pr_rps_nm,
            rps_phone = pr_rps_phone,
            off_tel = pr_off_tel,
            off_fax = pr_off_fax,
            reg_no = pr_reg_no,
            biz_no = pr_biz_no,
            pt_no = pr_pt_no,
            cust_no = pr_cust_no,
            regist_date = pr_regist_date,
            lift_date = pr_lift_date,
            reason = pr_reason,
            upd_dt = NOW(),
            upd_id = pr_user_id
        WHERE non_idx = pr_non_idx
        ;

    -- DELETE
    ELSIF pr_proc = 'DEL' THEN
        DELETE FROM ofc_non_shared
        WHERE non_idx = pr_non_idx
        ;

    -- SELECT
    ELSIF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT
            non_idx AS "NonIdx",
            off_no AS "OffNo",
            off_nm AS "OffNm",
            addr AS "Addr",
            rps_nm AS "RpsNm",
            rps_phone AS "RpsPhone",
            off_tel AS "OffTel",
            off_fax AS "OffFax",
            reg_no AS "RegNo",
            biz_no AS "BizNo",
            pt_no AS "PtNo",
            cust_no AS "CustNo",
            regist_date AS "RegistDate",
            lift_date AS "LiftDate",
            reason AS "Reason",
            reg_dt AS "RegDt",
            reg_id AS "RegId",
            upd_dt AS "UpdDt",
            upd_id AS "UpdId"
        FROM ofc_non_shared
        WHERE (pr_non_idx IS NULL OR non_idx = pr_non_idx) 
          AND (pr_off_no IS NULL OR off_no = pr_off_no) 
          AND (pr_off_nm IS NULL OR off_nm ILIKE '%' || pr_off_nm || '%') 
          AND (pr_addr IS NULL OR addr ILIKE '%' || pr_addr || '%')
          AND (pr_rps_nm IS NULL OR rps_nm ILIKE '%' || pr_rps_nm || '%')
          AND (pr_rps_phone IS NULL OR rps_phone ILIKE '%' || pr_rps_phone || '%')
	      AND (pr_reg_no IS NULL OR reg_no = pr_reg_no)
		  AND (pr_biz_no IS NULL OR biz_no = pr_biz_no) 
		;
    END IF;
END;
$function$

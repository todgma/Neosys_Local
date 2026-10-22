CREATE OR REPLACE FUNCTION public.fn_pt_sale_holder(pr_proc character varying DEFAULT 'SEL'::character varying, pr_pt_no bigint DEFAULT NULL::bigint, pr_holder_idx integer DEFAULT NULL::integer, pr_holder_type character varying DEFAULT NULL::character varying, pr_holder_reg_date character varying DEFAULT NULL::character varying, pr_holder_name character varying DEFAULT NULL::character varying, pr_holder_phone character varying DEFAULT NULL::character varying, pr_cust_no bigint DEFAULT NULL::bigint, pr_holder_relation character varying DEFAULT NULL::character varying, pr_holder_memo text DEFAULT NULL::text, pr_holder_address character varying DEFAULT NULL::character varying, pr_user_id character varying DEFAULT NULL::character varying)
 RETURNS TABLE("PtNo" bigint, "HolderIdx" integer, "HolderType" character varying, "HolderRegDate" character varying, "HolderName" character varying, "HolderPhone" character varying, "CustNo" bigint, "HolderRelation" character varying, "HolderMemo" text, "HolderAddress" character varying, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- INSERT
    IF pr_proc = 'INS' THEN
        RETURN QUERY
        INSERT INTO pt_sale_holder(
            pt_no, holder_idx, holder_type, holder_reg_date, holder_name, holder_phone,
            cust_no, holder_relation, holder_memo, holder_address,
            reg_dt, reg_id
        )
        VALUES(
            pr_pt_no, pr_holder_idx, pr_holder_type, pr_holder_reg_date, pr_holder_name, pr_holder_phone,
            pr_cust_no, pr_holder_relation, pr_holder_memo, pr_holder_address,
            now(), pr_user_id
        )
        RETURNING
            pt_no as "PtNo",
            holder_idx as "HolderIdx",
            holder_type as "HolderType",
            holder_reg_date as "HolderRegDate",
            holder_name as "HolderName",
            holder_phone as "HolderPhone",
            cust_no as "CustNo",
            holder_relation as "HolderRelation",
            holder_memo as "HolderMemo",
            holder_address as "HolderAddress",
            reg_dt as "RegDt",
            reg_id as "RegId",
            upd_dt as "UpdDt",
            upd_id as "UpdId";

    -- UPDATE
    ELSIF pr_proc = 'UPD' THEN
        RETURN QUERY
        UPDATE pt_sale_holder a
           SET holder_type = COALESCE(pr_holder_type, a.holder_type),
               holder_reg_date = COALESCE(pr_holder_reg_date, a.holder_reg_date),
               holder_name = COALESCE(pr_holder_name, a.holder_name),
               holder_phone = COALESCE(pr_holder_phone, a.holder_phone),
               cust_no = COALESCE(pr_cust_no, a.cust_no),
               holder_relation = COALESCE(pr_holder_relation, a.holder_relation),
               holder_memo = COALESCE(pr_holder_memo, a.holder_memo),
               holder_address = COALESCE(pr_holder_address, a.holder_address),
               upd_dt = now(),
               upd_id = pr_user_id
         WHERE a.pt_no = pr_pt_no
           AND a.holder_idx = pr_holder_idx
         RETURNING
            a.pt_no as "PtNo",
            a.holder_idx as "HolderIdx",
            a.holder_type as "HolderType",
            a.holder_reg_date as "HolderRegDate",
            a.holder_name as "HolderName",
            a.holder_phone as "HolderPhone",
            a.cust_no as "CustNo",
            a.holder_relation as "HolderRelation",
            a.holder_memo as "HolderMemo",
            a.holder_address as "HolderAddress",
            a.reg_dt as "RegDt",
            a.reg_id as "RegId",
            a.upd_dt as "UpdDt",
            a.upd_id as "UpdId";

    -- DELETE
    ELSIF pr_proc = 'DEL' THEN
        RETURN QUERY
        DELETE FROM pt_sale_holder
         WHERE pt_no = pr_pt_no
           AND holder_idx = pr_holder_idx
         RETURNING
            pt_no as "PtNo",
            holder_idx as "HolderIdx",
            holder_type as "HolderType",
            holder_reg_date as "HolderRegDate",
            holder_name as "HolderName",
            holder_phone as "HolderPhone",
            cust_no as "CustNo",
            holder_relation as "HolderRelation",
            holder_memo as "HolderMemo",
            holder_address as "HolderAddress",
            reg_dt as "RegDt",
            reg_id as "RegId",
            upd_dt as "UpdDt",
            upd_id as "UpdId";

    -- DELETE ALL BY PT_NO
    ELSIF pr_proc = 'DELALL' THEN
        RETURN QUERY
        DELETE FROM pt_sale_holder
         WHERE pt_no = pr_pt_no
         RETURNING
            pt_no as "PtNo",
            holder_idx as "HolderIdx",
            holder_type as "HolderType",
            holder_reg_date as "HolderRegDate",
            holder_name as "HolderName",
            holder_phone as "HolderPhone",
            cust_no as "CustNo",
            holder_relation as "HolderRelation",
            holder_memo as "HolderMemo",
            holder_address as "HolderAddress",
            reg_dt as "RegDt",
            reg_id as "RegId",
            upd_dt as "UpdDt",
            upd_id as "UpdId";

    -- SELECT
    ELSE
        RETURN QUERY
        SELECT a.pt_no as "PtNo",
               a.holder_idx as "HolderIdx",
               a.holder_type as "HolderType",
               a.holder_reg_date as "HolderRegDate",
               a.holder_name as "HolderName",
               a.holder_phone as "HolderPhone",
               a.cust_no as "CustNo",
               a.holder_relation as "HolderRelation",
               a.holder_memo as "HolderMemo",
               a.holder_address as "HolderAddress",
               a.reg_dt as "RegDt",
               a.reg_id as "RegId",
               a.upd_dt as "UpdDt",
               a.upd_id as "UpdId"
          FROM pt_sale_holder a
         WHERE (pr_pt_no IS NULL OR a.pt_no = pr_pt_no)
           AND (pr_holder_idx IS NULL OR a.holder_idx = pr_holder_idx)
         ORDER BY a.pt_no, a.holder_idx;
    END IF;
END;
$function$

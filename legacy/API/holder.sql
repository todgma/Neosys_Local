-- DROP FUNCTION public.fn_pt_sale_holder(varchar, int8, int4, varchar, varchar, varchar, int8, varchar, int4, int4);

CREATE OR REPLACE FUNCTION public.fn_pt_sale_holder(pr_proc character varying, pr_pt_no bigint DEFAULT NULL::bigint, pr_idx integer DEFAULT NULL::integer, pr_holder_reg_date character varying DEFAULT NULL::character varying, pr_holder_name character varying DEFAULT NULL::character varying, pr_holder_phone character varying DEFAULT NULL::character varying, pr_cust_no bigint DEFAULT NULL::bigint, pr_holder_relation character varying DEFAULT NULL::character varying, pr_holder_memo text DEFAULT NULL::text, pr_user_id character varying DEFAULT NULL::character varying, pr_page integer DEFAULT 1, pr_page_size integer DEFAULT 20)
 RETURNS TABLE(ptno bigint, holderidx integer, holderregdate character varying, holdername character varying, holderphone character varying, custno bigint, holderrelation character varying, holdermemo text, regdt timestamp without time zone, regid character varying, upddt timestamp without time zone, updid character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_idx INT;
    v_offset INT;
BEGIN
    -- 페이징 계산
    v_offset := (COALESCE(pr_page,1) - 1) * COALESCE(pr_page_size, 20);

    -- ================================================================
    -- INSERT
    -- ================================================================
    IF pr_proc = 'INS' THEN

        -- MAX(idx) + 1, NULL일 경우 0 처리
        SELECT COALESCE(MAX(holder_idx), 0) + 1 INTO v_idx
        FROM pt_sale_holder
        WHERE pt_no = pr_pt_no;

        INSERT INTO pt_sale_holder (
            pt_no, holder_idx, holder_reg_date, holder_name, holder_phone,
            cust_no, holder_relation, holder_memo, reg_dt, reg_id
        ) VALUES (
            pr_pt_no,
            v_idx,
            pr_holder_reg_date,
            pr_holder_name,
            pr_holder_phone,
            pr_cust_no,
            pr_holder_relation,
            pr_holder_memo,
            NOW(),
            pr_user_id
        );

       RETURN;

    -- ================================================================
    -- UPDATE
    -- ================================================================
    ELSIF pr_proc = 'UPD' THEN

        UPDATE pt_sale_holder
        SET holder_reg_date = COALESCE(pr_holder_reg_date, holder_reg_date),
            holder_name = COALESCE(pr_holder_name, holder_name),
            holder_phone = COALESCE(pr_holder_phone, holder_phone),
            cust_no = COALESCE(pr_cust_no, cust_no),
            holder_relation = COALESCE(pr_holder_relation, holder_relation),
            holder_memo = COALESCE(pr_holder_memo, holder_memo),
            upd_dt = NOW(),
            upd_id = pr_user_id
        WHERE pt_no = pr_pt_no
          AND holder_idx = pr_idx;

        RETURN;

    -- ================================================================
    -- DELETE
    -- ================================================================
    ELSIF pr_proc = 'DEL' THEN

        DELETE FROM pt_sale_holder
        WHERE pt_no = pr_pt_no
          AND holder_idx = pr_idx;

        RETURN;

    -- ================================================================
    -- SELECT (페이징)
    -- ================================================================
    ELSIF pr_proc = 'SEL' THEN

        RETURN QUERY
        SELECT
            pt_no AS PtNo,
            holder_idx AS HolderIdx,
            holder_reg_date AS HolderRegDate,
            holder_name AS HolderName,
            holder_phone AS HolderPhone,
            cust_no AS CustNo,
            holder_relation AS HolderRelation,
            holder_memo AS HolderMemo,
            reg_dt AS RegDt,
            reg_id AS RegId,
            upd_dt AS UpdDt,
            upd_id AS UpdId
        FROM pt_sale_holder
        WHERE (pr_pt_no IS NULL OR pt_no = pr_pt_no)
        ORDER BY pt_no, holder_idx
        LIMIT pr_page_size OFFSET v_offset;

    END IF;

    RETURN;
END;
$function$
;

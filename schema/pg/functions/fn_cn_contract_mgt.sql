CREATE OR REPLACE FUNCTION public.fn_cn_contract_mgt(pr_proc character varying, pr_cn_no integer DEFAULT NULL::integer, pr_cn_sts character varying DEFAULT NULL::character varying, pr_cn_date character varying DEFAULT NULL::character varying, pr_pt_type character varying DEFAULT NULL::character varying, pr_addr character varying DEFAULT NULL::character varying, pr_pt_nm character varying DEFAULT NULL::character varying, pr_dong integer DEFAULT NULL::integer, pr_ho integer DEFAULT NULL::integer, pr_pt_no bigint DEFAULT NULL::bigint, pr_seller_nm character varying DEFAULT NULL::character varying, pr_seller_tel character varying DEFAULT NULL::character varying, pr_seller_cust_no integer DEFAULT NULL::integer, pr_buyer_nm character varying DEFAULT NULL::character varying, pr_buyer_tel character varying DEFAULT NULL::character varying, pr_buyer_cust_no integer DEFAULT NULL::integer, pr_trd_type character varying DEFAULT NULL::character varying, pr_sell_amt integer DEFAULT NULL::integer, pr_mid_amt1 integer DEFAULT NULL::integer, pr_mid_amt2 integer DEFAULT NULL::integer, pr_bal_amt_date character varying DEFAULT NULL::character varying, pr_trd_report character varying DEFAULT NULL::character varying, pr_contract_yn character varying DEFAULT NULL::character varying, pr_broker_type character varying DEFAULT NULL::character varying, pr_rt_no bigint DEFAULT NULL::bigint, pr_off_no bigint DEFAULT NULL::bigint, pr_vendor_id bigint DEFAULT NULL::bigint, pr_user_id character varying DEFAULT NULL::character varying, pr_fr_date character varying DEFAULT NULL::character varying, pr_to_date character varying DEFAULT NULL::character varying, pr_page integer DEFAULT 1, pr_page_size integer DEFAULT 20)
 RETURNS TABLE("CnNo" integer, "CnSts" character varying, "CnDate" character varying, "PtType" character varying, "Addr" character varying, "PtNm" character varying, "Dong" integer, "Ho" integer, "PtNo" bigint, "SellerNm" character varying, "SellerTel" character varying, "SellerCustNo" bigint, "BuyerNm" character varying, "BuyerTel" character varying, "BuyerCustNo" bigint, "TrdType" character varying, "SellAmt" integer, "MidAmt1" integer, "MidAmt2" integer, "BalAmtDate" character varying, "TrdReport" character varying, "ContractYn" character varying, "BrokerType" character varying, "RtNo" bigint, "OffNo" bigint, "VendorId" bigint, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_offset INT;
BEGIN
    -- OFFSET 계산
    v_offset := (COALESCE(pr_page, 1) - 1) * COALESCE(pr_page_size, 20);

    -- INSERT
    IF pr_proc = 'INS' THEN
        INSERT INTO cn_contract_mgt (
            cn_sts, cn_date, pt_type, addr, pt_nm, dong, ho, pt_no,
            seller_nm, seller_tel, seller_cust_no, buyer_nm, buyer_tel, buyer_cust_no,
            trd_type, sell_amt, mid_amt1, mid_amt2, bal_amt_date,
            trd_report, contract_yn, broker_type, rt_no, off_no, vendor_id, reg_dt, reg_id
        )
        VALUES (
            pr_cn_sts, pr_cn_date, pr_pt_type, pr_addr, pr_pt_nm, pr_dong, pr_ho, pr_pt_no,
            pr_seller_nm, pr_seller_tel, pr_seller_cust_no, pr_buyer_nm, pr_buyer_tel, pr_buyer_cust_no,
            pr_trd_type, pr_sell_amt, pr_mid_amt1, pr_mid_amt2,
            pr_bal_amt_date, pr_trd_report, pr_contract_yn, pr_broker_type, pr_rt_no, pr_off_no, pr_vendor_id,
            NOW(), pr_user_id
        )
		;

    -- UPDATE
    ELSIF pr_proc = 'UPD' THEN
        UPDATE cn_contract_mgt
        SET
            cn_sts = COALESCE(pr_cn_sts, cn_sts),
            cn_date = COALESCE(pr_cn_date, cn_date),
            pt_type = COALESCE(pr_pt_type, pt_type),
            addr = COALESCE(pr_addr, addr),
            pt_nm = COALESCE(pr_pt_nm, pt_nm),
            dong = COALESCE(pr_dong, dong),
            ho = COALESCE(pr_ho, ho),
            pt_no = COALESCE(pr_pt_no, pt_no),
            seller_nm = COALESCE(pr_seller_nm, seller_nm),
			seller_tel = COALESCE(pr_seller_tel, seller_tel),
			seller_cust_no = COALESCE(pr_seller_cust_no, seller_cust_no),
            buyer_nm = COALESCE(pr_buyer_nm, buyer_nm),
            buyer_tel = COALESCE(pr_buyer_tel, buyer_tel),
            buyer_cust_no = COALESCE(pr_buyer_cust_no, buyer_cust_no),
            trd_type = COALESCE(pr_trd_type, trd_type),
            sell_amt = COALESCE(pr_sell_amt, sell_amt),
            mid_amt1 = COALESCE(pr_mid_amt1, mid_amt1),
            mid_amt2 = COALESCE(pr_mid_amt2, mid_amt2),
            bal_amt_date = COALESCE(pr_bal_amt_date, bal_amt_date),
            trd_report = COALESCE(pr_trd_report, trd_report),
            contract_yn = COALESCE(pr_contract_yn, contract_yn),
            broker_type = COALESCE(pr_broker_type, broker_type),
			rt_no = COALESCE(pr_rt_no, rt_no),
			off_no = COALESCE(pr_off_no, off_no),
			vendor_id = COALESCE(pr_vendor_id, vendor_id),
            upd_dt = NOW(),
            upd_id = pr_user_id
        WHERE cn_no = pr_cn_no
        ;

    -- DELETE
    ELSIF pr_proc = 'DEL' THEN
        DELETE FROM cn_contract_mgt
        WHERE cn_no = pr_cn_no
	;

    -- SELECT
    ELSIF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT
            cn_no AS "CnNo",
            cn_sts AS "CnSts",
            cn_date AS "CnDate",
            pt_type AS "PtType",
            addr AS "Addr",
            pt_nm AS "PtNm",
            dong AS "Dong",
            ho AS "Ho",
            pt_no AS "PtNo",
            seller_nm AS "SellerNm",
            seller_tel AS "SellerTel",
            seller_cust_no AS "SellerCustNo",
            buyer_nm AS "BuyerNm",
            buyer_tel AS "BuyerTel",
            buyer_cust_no AS "BuyerCustNo",
            trd_type AS "TrdType",
            sell_amt AS "SellAmt",
            mid_amt1 AS "MidAmt1",
            mid_amt2 AS "MidAmt2",
            bal_amt_date AS "BalAmtDate",
            trd_report AS "TrdReport",
            contract_yn AS "ContractYn",
            broker_type AS "BrokerType",
            rt_no AS "RtNo",
            off_no AS "OffNo",
            vendor_id AS "VendorId",
            reg_dt AS "RegDt",
            reg_id AS "RegId",
            upd_dt AS "UpdDt",
            upd_id AS "UpdId"
        FROM cn_contract_mgt
        WHERE 1=1
          AND TO_DATE(cn_date, 'YYYY-MM-DD') BETWEEN TO_DATE(pr_fr_date, 'YYYY-MM-DD') AND TO_DATE(pr_to_date, 'YYYY-MM-DD')
          AND (pr_cn_no IS NULL OR cn_no = pr_cn_no) 
          AND (pr_cn_sts IS NULL OR cn_sts = pr_cn_sts) 
          AND (pr_addr IS NULL OR addr ILIKE '%' || pr_addr || '%') 
          AND (pr_pt_nm IS NULL OR pt_nm ILIKE '%' || pr_pt_nm || '%') 
          AND (pr_seller_nm IS NULL OR seller_nm ILIKE '%' || pr_seller_nm || '%') 
          AND (pr_buyer_nm IS NULL OR buyer_nm ILIKE '%' || pr_buyer_nm || '%')
        ORDER BY cn_date DESC, cn_no DESC
        LIMIT pr_page_size OFFSET v_offset;
    END IF;
END;
$function$

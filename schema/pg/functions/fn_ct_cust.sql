CREATE OR REPLACE FUNCTION public.fn_ct_cust(pr_proc character varying, pr_cust_no bigint DEFAULT NULL::bigint, pr_cust_type integer DEFAULT NULL::integer, pr_name character varying DEFAULT NULL::character varying, pr_alias character varying DEFAULT NULL::character varying, pr_tel character varying DEFAULT NULL::character varying, pr_addr character varying DEFAULT NULL::character varying, pr_memo character varying DEFAULT NULL::character varying, pr_rent_bsn_yn character varying DEFAULT NULL::character varying, pr_trd_prg character varying DEFAULT NULL::character varying, pr_want_type character varying DEFAULT NULL::character varying, pr_want_nm character varying DEFAULT NULL::character varying, pr_exc_area_fr numeric DEFAULT NULL::numeric, pr_exc_area_to numeric DEFAULT NULL::numeric, pr_land_share_fr numeric DEFAULT NULL::numeric, pr_land_share_to numeric DEFAULT NULL::numeric, pr_trd_type character varying DEFAULT NULL::character varying, pr_movein_yn character varying DEFAULT NULL::character varying, pr_move_date_fr character varying DEFAULT NULL::character varying, pr_move_date_to character varying DEFAULT NULL::character varying, pr_cash_ablt character varying DEFAULT NULL::character varying, pr_sale_amt_fr integer DEFAULT NULL::integer, pr_sale_amt_to integer DEFAULT NULL::integer, pr_les_amt_fr integer DEFAULT NULL::integer, pr_les_amt_to integer DEFAULT NULL::integer, pr_prot_amt_fr integer DEFAULT NULL::integer, pr_prot_amt_to integer DEFAULT NULL::integer, pr_mon_amt_fr integer DEFAULT NULL::integer, pr_mon_amt_to integer DEFAULT NULL::integer, pr_etc_prot_amt_fr integer DEFAULT NULL::integer, pr_etc_prot_amt_to integer DEFAULT NULL::integer, pr_etc_mon_amt_fr integer DEFAULT NULL::integer, pr_etc_mon_amt_to integer DEFAULT NULL::integer, pr_etc_type character varying DEFAULT NULL::character varying, pr_rmk character varying DEFAULT NULL::character varying, pr_rt_no bigint DEFAULT NULL::bigint, pr_off_no bigint DEFAULT NULL::bigint, pr_vendor_id bigint DEFAULT NULL::bigint, pr_user_id character varying DEFAULT NULL::character varying, pr_page integer DEFAULT 1, pr_page_size integer DEFAULT 10)
 RETURNS TABLE("CustNo" bigint, "CustType" integer, "Name" character varying, "Alias" character varying, "Tel" character varying, "Addr" character varying, "Memo" character varying, "RentBsnYn" character varying, "TrdPrg" character varying, "WantType" character varying, "WantNm" character varying, "ExcAreaFr" numeric, "ExcAreaTo" numeric, "LandShareFr" numeric, "LandShareTo" numeric, "TrdType" character varying, "MoveinYn" character varying, "MoveDateFr" character varying, "MoveDateTo" character varying, "CashAblt" character varying, "SaleAmtFr" integer, "SaleAmtTo" integer, "LesAmtFr" integer, "LesAmtTo" integer, "ProtAmtFr" integer, "ProtAmtTo" integer, "MonAmtFr" integer, "MonAmtTo" integer, "EtcProtAmtFr" integer, "EtcProtAmtTo" integer, "EtcMonAmtFr" integer, "EtcMonAmtTo" integer, "EtcType" character varying, "Rmk" character varying, "RtNo" bigint, "OffNo" bigint, "VendorId" bigint, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF pr_proc = 'INS' THEN
        INSERT INTO ct_cust (
            cust_type, name, alias, tel, addr, memo, rent_bsn_yn, trd_prg, want_type, want_nm,
            exc_area_fr, exc_area_to, land_share_fr, land_share_to, trd_type, movein_yn, move_date_fr,
            move_date_to, cash_ablt, sale_amt_fr, sale_amt_to, les_amt_fr, les_amt_to, prot_amt_fr,
            prot_amt_to, mon_amt_fr, mon_amt_to, etc_prot_amt_fr, etc_prot_amt_to, etc_mon_amt_fr,
            etc_mon_amt_to, etc_type, rmk, rt_no, off_no, vendor_id, reg_dt, reg_id
        ) VALUES (
            pr_cust_type, pr_name, pr_alias, pr_tel, pr_addr, pr_memo, pr_rent_bsn_yn, pr_trd_prg,
            pr_want_type, pr_want_nm, pr_exc_area_fr, pr_exc_area_to, pr_land_share_fr, pr_land_share_to,
            pr_trd_type, pr_movein_yn, pr_move_date_fr, pr_move_date_to, pr_cash_ablt, pr_sale_amt_fr,
            pr_sale_amt_to, pr_les_amt_fr, pr_les_amt_to, pr_prot_amt_fr, pr_prot_amt_to, pr_mon_amt_fr,
            pr_mon_amt_to, pr_etc_prot_amt_fr, pr_etc_prot_amt_to, pr_etc_mon_amt_fr, pr_etc_mon_amt_to,
            pr_etc_type, pr_rmk, pr_rt_no, pr_off_no, pr_vendor_id, NOW(), pr_user_id
        );
    ELSIF pr_proc = 'UPD' THEN
        UPDATE ct_cust
           SET cust_type       = COALESCE(pr_cust_type, cust_type),
               name            = COALESCE(pr_name, name),
               alias           = COALESCE(pr_alias, alias),
               tel             = COALESCE(pr_tel, tel),
               addr            = COALESCE(pr_addr, addr),
               memo            = COALESCE(pr_memo, memo),
               rent_bsn_yn     = COALESCE(pr_rent_bsn_yn, rent_bsn_yn),
               trd_prg         = COALESCE(pr_trd_prg, trd_prg),
               want_type       = COALESCE(pr_want_type, want_type),
               want_nm         = COALESCE(pr_want_nm, want_nm),
               exc_area_fr     = COALESCE(pr_exc_area_fr, exc_area_fr),
               exc_area_to     = COALESCE(pr_exc_area_to, exc_area_to),
               land_share_fr   = COALESCE(pr_land_share_fr, land_share_fr),
               land_share_to   = COALESCE(pr_land_share_to, land_share_to),
               trd_type        = COALESCE(pr_trd_type, trd_type),
               movein_yn       = COALESCE(pr_movein_yn, movein_yn),
               move_date_fr    = COALESCE(pr_move_date_fr, move_date_fr),
               move_date_to    = COALESCE(pr_move_date_to, move_date_to),
               cash_ablt       = COALESCE(pr_cash_ablt, cash_ablt),
               sale_amt_fr     = COALESCE(pr_sale_amt_fr, sale_amt_fr),
               sale_amt_to     = COALESCE(pr_sale_amt_to, sale_amt_to),
               les_amt_fr      = COALESCE(pr_les_amt_fr, les_amt_fr),
               les_amt_to      = COALESCE(pr_les_amt_to, les_amt_to),
               prot_amt_fr     = COALESCE(pr_prot_amt_fr, prot_amt_fr),
               prot_amt_to     = COALESCE(pr_prot_amt_to, prot_amt_to),
               mon_amt_fr      = COALESCE(pr_mon_amt_fr, mon_amt_fr),
               mon_amt_to      = COALESCE(pr_mon_amt_to, mon_amt_to),
               etc_prot_amt_fr = COALESCE(pr_etc_prot_amt_fr, etc_prot_amt_fr),
               etc_prot_amt_to = COALESCE(pr_etc_prot_amt_to, etc_prot_amt_to),
               etc_mon_amt_fr  = COALESCE(pr_etc_mon_amt_fr, etc_mon_amt_fr),
               etc_mon_amt_to  = COALESCE(pr_etc_mon_amt_to, etc_mon_amt_to),
               etc_type        = COALESCE(pr_etc_type, etc_type),
               rmk             = COALESCE(pr_rmk, rmk),
               rt_no           = COALESCE(pr_rt_no, rt_no),
               off_no          = COALESCE(pr_off_no, off_no),
               vendor_id       = COALESCE(pr_vendor_id, vendor_id),
               upd_dt          = NOW(),
               upd_id          = pr_user_id
         WHERE cust_no = pr_cust_no;
    ELSIF pr_proc = 'DEL' THEN
        DELETE FROM ct_cust WHERE cust_no = pr_cust_no;
    ELSIF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT
            cust_no AS "CustNo",
            cust_type AS "CustType",
            name AS "Name",
            alias AS "Alias",
            tel AS "Tel",
            addr AS "Addr",
            memo AS "Memo",
            rent_bsn_yn AS "RentBsnYn",
            trd_prg AS "TrdPrg",
            want_type AS "WantType",
            want_nm AS "WantNm",
            exc_area_fr AS "ExcAreaFr",
            exc_area_to AS "ExcAreaTo",
            land_share_fr AS "LandShareFr",
            land_share_to AS "LandShareTo",
            trd_type AS "TrdType",
            movein_yn AS "MoveinYn",
            move_date_fr AS "MoveDateFr",
            move_date_to AS "MoveDateTo",
            cash_ablt AS "CashAblt",
            sale_amt_fr AS "SaleAmtFr",
            sale_amt_to AS "SaleAmtTo",
            les_amt_fr AS "LesAmtFr",
            les_amt_to AS "LesAmtTo",
            prot_amt_fr AS "ProtAmtFr",
            prot_amt_to AS "ProtAmtTo",
            mon_amt_fr AS "MonAmtFr",
            mon_amt_to AS "MonAmtTo",
            etc_prot_amt_fr AS "EtcProtAmtFr",
            etc_prot_amt_to AS "EtcProtAmtTo",
            etc_mon_amt_fr AS "EtcMonAmtFr",
            etc_mon_amt_to AS "EtcMonAmtTo",
            etc_type AS "EtcType",
            rmk AS "Rmk",
            rt_no AS "RtNo",
            off_no AS "OffNo",
            vendor_id AS "VendorId",
            reg_dt AS "RegDt",
            reg_id AS "RegId",
            upd_dt AS "UpdDt",
            upd_id AS "UpdId"
        FROM ct_cust
	    WHERE (pr_cust_no IS NULL OR cust_no = pr_cust_no)
         AND (pr_name IS NULL OR name ILIKE '%' || pr_name || '%')
          AND (pr_alias IS NULL OR alias ILIKE '%' || pr_alias || '%')
          AND (pr_tel IS NULL OR tel ILIKE '%' || pr_tel || '%')
          AND (pr_off_no IS NULL OR off_no = pr_off_no)
          AND (pr_vendor_id IS NULL OR vendor_id = pr_vendor_id)
         AND (pr_rent_bsn_yn IS NULL OR rent_bsn_yn = pr_rent_bsn_yn)
         AND (pr_exc_area_fr IS NULL OR exc_area_fr >= pr_exc_area_fr)
         AND (pr_exc_area_to IS NULL OR exc_area_to <= pr_exc_area_to)
		 AND (pr_sale_amt_fr IS NULL OR sale_amt_fr >= pr_sale_amt_fr)
         AND (pr_sale_amt_to IS NULL OR sale_amt_to <= pr_sale_amt_to)
        ORDER BY cust_no
        LIMIT pr_page_size OFFSET (pr_page - 1) * pr_page_size;
    END IF;
END;
$function$

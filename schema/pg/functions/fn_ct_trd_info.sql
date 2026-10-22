CREATE OR REPLACE FUNCTION public.fn_ct_trd_info(pr_proc character varying, pr_trd_no bigint DEFAULT NULL::bigint, pr_trd_prg character varying DEFAULT NULL::character varying, pr_cust_no bigint DEFAULT NULL::bigint, pr_want_type character varying DEFAULT NULL::character varying, pr_want_nm character varying DEFAULT NULL::character varying, pr_exc_area_fr numeric DEFAULT NULL::numeric, pr_exc_area_to numeric DEFAULT NULL::numeric, pr_land_share_fr numeric DEFAULT NULL::numeric, pr_land_share_to numeric DEFAULT NULL::numeric, pr_trd_type character varying DEFAULT NULL::character varying, pr_movein_yn character varying DEFAULT NULL::character varying, pr_move_date_fr character varying DEFAULT NULL::character varying, pr_move_date_to character varying DEFAULT NULL::character varying, pr_cash_ablt character varying DEFAULT NULL::character varying, pr_sale_amt_fr integer DEFAULT NULL::integer, pr_sale_amt_to integer DEFAULT NULL::integer, pr_les_amt_fr integer DEFAULT NULL::integer, pr_les_amt_to integer DEFAULT NULL::integer, pr_prot_amt_fr integer DEFAULT NULL::integer, pr_prot_amt_to integer DEFAULT NULL::integer, pr_mon_amt_fr integer DEFAULT NULL::integer, pr_mon_amt_to integer DEFAULT NULL::integer, pr_etc_prot_amt_fr integer DEFAULT NULL::integer, pr_etc_prot_amt_to integer DEFAULT NULL::integer, pr_etc_mon_amt_fr integer DEFAULT NULL::integer, pr_etc_mon_amt_to integer DEFAULT NULL::integer, pr_etc_type character varying DEFAULT NULL::character varying, pr_rnk character varying DEFAULT NULL::character varying, pr_rt_no bigint DEFAULT NULL::bigint, pr_off_no bigint DEFAULT NULL::bigint, pr_user_id character varying DEFAULT NULL::character varying, pr_page integer DEFAULT 1, pr_page_size integer DEFAULT 10)
 RETURNS TABLE("TrdNo" bigint, "TrdPrg" character varying, "CustNo" bigint, "WantType" character varying, "WantNm" character varying, "ExcAreaFr" numeric, "ExcAreaTo" numeric, "LantShareFr" numeric, "LandShareTo" numeric, "TrdType" character varying, "MoveinYn" character varying, "MoveDateFr" character varying, "MoveDateTo" character varying, "CashAblt" character varying, "SaleAmtFr" integer, "SaleAmtTo" integer, "LesAmtFr" integer, "LesAmtTo" integer, "ProtAmtFr" integer, "ProtAmtTo" integer, "MonAmtFr" integer, "MonAmtTo" integer, "EtcProtAmtFr" integer, "EtcProtAmtTo" integer, "EtcMonAmtFr" integer, "EtcMonAmtTo" integer, "EtcType" character varying, "Rnk" character varying, "RtNo" bigint, "OffNo" bigint, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF pr_proc = 'INS' THEN
        INSERT INTO ct_trd_info (
            trd_prg, cust_no, want_type, want_nm, exc_area_fr, exc_area_to,
            land_share_fr, land_share_to, trd_type, movein_yn,
            move_date_fr, move_date_to, cash_ablt, sale_amt_fr, sale_amt_to,
            les_amt_fr, les_amt_to, prot_amt_fr, prot_amt_to,
            mon_amt_fr, mon_amt_to, etc_prot_amt_fr, etc_prot_amt_to,
            etc_mon_amt_fr, etc_mon_amt_to, etc_type, rnk, rt_no, off_no,
            reg_dt, reg_id
        )
        VALUES (
            pr_trd_prg, pr_cust_no, pr_want_type, pr_want_nm, pr_exc_area_fr, pr_exc_area_to,
            pr_land_share_fr, pr_land_share_to, pr_trd_type, pr_movein_yn,
            pr_move_date_fr, pr_move_date_to, pr_cash_ablt, pr_sale_amt_fr, pr_sale_amt_to,
            pr_les_amt_fr, pr_les_amt_to, pr_prot_amt_fr, pr_prot_amt_to,
            pr_mon_amt_fr, pr_mon_amt_to, pr_etc_prot_amt_fr, pr_etc_prot_amt_to,
            pr_etc_mon_amt_fr, pr_etc_mon_amt_to, pr_etc_type, pr_rnk, pr_rt_no, pr_off_no,
            NOW(), pr_user_id
        );

    ELSIF pr_proc = 'UPD' THEN
        UPDATE ct_trd_info
        SET
            trd_prg = COALESCE(pr_trd_prg, trd_prg),
            cust_no = COALESCE(pr_cust_no, cust_no),
            want_type = COALESCE(pr_want_type, want_type),
            want_nm = COALESCE(pr_want_nm, want_nm),
            exc_area_fr = COALESCE(pr_exc_area_fr, exc_area_fr),
            exc_area_to = COALESCE(pr_exc_area_to, exc_area_to),
            land_share_fr = COALESCE(pr_land_share_fr, land_share_fr),
            land_share_to = COALESCE(pr_land_share_to, land_share_to),
            trd_type = COALESCE(pr_trd_type, trd_type),
            movein_yn = COALESCE(pr_movein_yn, movein_yn),
            move_date_fr = COALESCE(pr_move_date_fr, move_date_fr),
            move_date_to = COALESCE(pr_move_date_to, move_date_to),
            cash_ablt = COALESCE(pr_cash_ablt, cash_ablt),
            sale_amt_fr = COALESCE(pr_sale_amt_fr, sale_amt_fr),
            sale_amt_to = COALESCE(pr_sale_amt_to, sale_amt_to),
            les_amt_fr = COALESCE(pr_les_amt_fr, les_amt_fr),
            les_amt_to = COALESCE(pr_les_amt_to, les_amt_to),
            prot_amt_fr = COALESCE(pr_prot_amt_fr, prot_amt_fr),
            prot_amt_to = COALESCE(pr_prot_amt_to, prot_amt_to),
            mon_amt_fr = COALESCE(pr_mon_amt_fr, mon_amt_fr),
            mon_amt_to = COALESCE(pr_mon_amt_to, mon_amt_to),
            etc_prot_amt_fr = COALESCE(pr_etc_prot_amt_fr, etc_prot_amt_fr),
            etc_prot_amt_to = COALESCE(pr_etc_prot_amt_to, etc_prot_amt_to),
            etc_mon_amt_fr = COALESCE(pr_etc_mon_amt_fr, etc_mon_amt_fr),
            etc_mon_amt_to = COALESCE(pr_etc_mon_amt_to, etc_mon_amt_to),
            etc_type = COALESCE(pr_etc_type, etc_type),
            rnk = COALESCE(pr_rnk, rnk),
            rt_no = COALESCE(pr_rt_no, rt_no),
            off_no = COALESCE(pr_off_no, off_no),
            upd_dt = NOW(),
            upd_id = pr_user_id
        WHERE trd_no = pr_trd_no;

    ELSIF pr_proc = 'DEL' THEN
        DELETE FROM ct_trd_info
        WHERE trd_no = pr_trd_no;

    ELSIF pr_proc = 'SEL' THEN
        RETURN QUERY
        SELECT
            trd_no AS "TrdNo",
            trd_prg AS "TrdPrg",
            cust_no AS "CustNo",
            want_type AS "WantType",
            want_nm AS "WantNm",
            exc_area_fr AS "ExcAreaFr",
            exc_area_to AS "ExcAreaTo",
            land_share_fr AS "LantShareFr",
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
            rnk AS "Rnk",
            rt_no AS "RtNo",
            off_no AS "OffNo",
            reg_dt AS "RegDt",
            reg_id AS "RegId",
            upd_dt AS "UpdDt",
            upd_id AS "UpdId"
        FROM ct_trd_info
        WHERE
            (pr_trd_no IS NULL OR trd_no = pr_trd_no)
            AND (pr_trd_prg IS NULL OR trd_prg = pr_trd_prg)
            AND (pr_cust_no IS NULL OR cust_no = pr_cust_no)
            AND (pr_want_type IS NULL OR want_type = pr_want_type)
            AND (pr_want_nm IS NULL OR want_nm ILIKE '%' || pr_want_nm || '%')
            AND (pr_exc_area_fr IS NULL OR pr_exc_area_to IS NULL OR exc_area_fr BETWEEN pr_exc_area_fr AND pr_exc_area_to)
            AND (pr_land_share_fr IS NULL OR pr_land_share_to IS NULL OR land_share_fr BETWEEN pr_land_share_fr AND pr_land_share_to)
            AND (pr_sale_amt_fr IS NULL OR pr_sale_amt_to IS NULL OR sale_amt_fr BETWEEN pr_sale_amt_fr AND pr_sale_amt_to)
            AND (pr_les_amt_fr IS NULL OR pr_les_amt_to IS NULL OR les_amt_fr BETWEEN pr_les_amt_fr AND pr_les_amt_to)
            AND (pr_prot_amt_fr IS NULL OR pr_prot_amt_to IS NULL OR prot_amt_fr BETWEEN pr_prot_amt_fr AND pr_prot_amt_to)
            AND (pr_mon_amt_fr IS NULL OR pr_mon_amt_to IS NULL OR mon_amt_fr BETWEEN pr_mon_amt_fr AND pr_mon_amt_to)
            AND (pr_etc_prot_amt_fr IS NULL OR pr_etc_prot_amt_to IS NULL OR etc_prot_amt_fr BETWEEN pr_etc_prot_amt_fr AND pr_etc_prot_amt_to)
            AND (pr_etc_mon_amt_fr IS NULL OR pr_etc_mon_amt_to IS NULL OR etc_mon_amt_fr BETWEEN pr_etc_mon_amt_fr AND pr_etc_mon_amt_to)
            AND (pr_etc_type IS NULL OR etc_type = pr_etc_type)
            AND (pr_rt_no IS NULL OR rt_no = pr_rt_no)
            AND (pr_off_no IS NULL OR off_no = pr_off_no)
        ORDER BY trd_no DESC
        LIMIT pr_page_size
        OFFSET (pr_page - 1) * pr_page_size;
    END IF;
END;
$function$

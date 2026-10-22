DROP FUNCTION IF EXISTS public.fn_pt_sale(varchar, int8, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, int4, varchar, int4, varchar, numeric, numeric, numeric, int4, int4, varchar, varchar, varchar, varchar, varchar, bpchar, int4, int4, numeric, int4, varchar, int4, int4, int4, int4, int4, int4, int4, int4, int4, int4, varchar, varchar, varchar, varchar, varchar, bpchar, int8, int8, varchar, int4, varchar, int4, int4);

CREATE OR REPLACE FUNCTION public.fn_pt_sale(pr_proc character varying DEFAULT 'SEL'::character varying, pr_pt_no bigint DEFAULT NULL::bigint, pr_pt_name character varying DEFAULT NULL::character varying, pr_prg_sts character varying DEFAULT NULL::character varying, pr_pt_sts character varying DEFAULT NULL::character varying, pr_pt_type character varying DEFAULT NULL::character varying, pr_pt_expl character varying DEFAULT NULL::character varying, pr_sale_div character varying DEFAULT NULL::character varying, pr_addr1 character varying DEFAULT NULL::character varying, pr_addr2 character varying DEFAULT NULL::character varying, pr_addr3 character varying DEFAULT NULL::character varying, pr_addr4 character varying DEFAULT NULL::character varying, pr_addr5 character varying DEFAULT NULL::character varying, pr_addr_post character varying DEFAULT NULL::character varying, pr_bjd_code character varying DEFAULT NULL::character varying, pr_danji_code character varying DEFAULT NULL::character varying, pr_dong character varying DEFAULT NULL::character varying, pr_ho character varying DEFAULT NULL::character varying, pr_floor integer DEFAULT NULL::integer, pr_opt character varying DEFAULT NULL::character varying, pr_house_cnt integer DEFAULT NULL::integer, pr_apt_typ character varying DEFAULT NULL::character varying, pr_sup_area numeric DEFAULT NULL::numeric, pr_exc_area numeric DEFAULT NULL::numeric, pr_land_share numeric DEFAULT NULL::numeric, pr_room_cnt integer DEFAULT NULL::integer, pr_bath_cnt integer DEFAULT NULL::integer, pr_dir_std character varying DEFAULT NULL::character varying, pr_heat_method character varying DEFAULT NULL::character varying, pr_heat_fuel character varying DEFAULT NULL::character varying, pr_entr_struct character varying DEFAULT NULL::character varying, pr_buid_struct character varying DEFAULT NULL::character varying, pr_balc_ext character DEFAULT NULL::bpchar, pr_floor1 integer DEFAULT NULL::integer, pr_floor2 integer DEFAULT NULL::integer, pr_pk_cnt numeric DEFAULT NULL::numeric, pr_maint_cost integer DEFAULT NULL::integer, pr_maint_dtl character varying DEFAULT NULL::character varying, pr_sale_amt integer DEFAULT NULL::integer, pr_les_amt integer DEFAULT NULL::integer, pr_prot_amt integer DEFAULT NULL::integer, pr_mon_amt integer DEFAULT NULL::integer, pr_etc_amt integer DEFAULT NULL::integer, pr_lay_amt integer DEFAULT NULL::integer, pr_now_dep_amt integer DEFAULT NULL::integer, pr_now_mon_amt integer DEFAULT NULL::integer, pr_loan_amt integer DEFAULT NULL::integer, pr_loan_amt_aft integer DEFAULT NULL::integer, pr_mtry_date character varying DEFAULT NULL::character varying, pr_expt_mov_date character varying DEFAULT NULL::character varying, pr_expt_date character varying DEFAULT NULL::character varying, pr_expt_com_date character varying DEFAULT NULL::character varying, pr_comp_year character varying DEFAULT NULL::character varying, pr_sha_yn character DEFAULT NULL::bpchar, pr_cust_no bigint DEFAULT NULL::bigint, pr_off_no bigint DEFAULT NULL::bigint, pr_rt_no character varying DEFAULT NULL::character varying, pr_cn_no integer DEFAULT NULL::integer, pr_mvn_psb_yn character varying DEFAULT NULL::character varying, pr_house_rental character varying DEFAULT NULL::character varying, pr_pet_yn character varying DEFAULT NULL::character varying, pr_top character varying DEFAULT NULL::character varying, pr_pt_memo character varying DEFAULT NULL::character varying, pr_user_id character varying DEFAULT NULL::character varying, pr_page integer DEFAULT NULL::integer, pr_page_size integer DEFAULT NULL::integer)
 RETURNS TABLE("PtNo" bigint, "PtName" character varying, "PtSts" character varying, "PtType" character varying, "PtExpl" character varying, "SaleDiv" character varying, "Addr1" character varying, "Addr2" character varying, "Addr3" character varying, "Addr4" character varying, "Addr5" character varying, "AddrPost" character varying, "BjdCode" character varying, "DanjiCode" character varying, "Dong" character varying, "Ho" character varying, "Floor" integer, "Opt" character varying, "HouseCnt" integer, "AptTyp" character varying, "SupArea" numeric, "ExcArea" numeric, "LandShare" numeric, "RoomCnt" integer, "BathCnt" integer, "DirStd" character varying, "HeatMethod" character varying, "HeatFuel" character varying, "EntrStruct" character varying, "BuidStruct" character varying, "BalcExt" character, "Floor1" integer, "Floor2" integer, "PkCnt" numeric, "MaintCost" integer, "MaintDtl" character varying, "SaleAmt" integer, "LesAmt" integer, "ProtAmt" integer, "MonAmt" integer, "EtcAmt" integer, "LayAmt" integer, "NowDepAmt" integer, "NowMonAmt" integer, "LoanAmt" integer, "LoanAmtAft" integer, "MtryDate" character varying, "ExptMovDate" character varying, "ExptDate" character varying, "ExptComDate" character varying, "CompYear" character varying, "ShaYn" character, "CustNo" bigint, "OffNo" bigint, "RtNo" character varying, "CnNo" integer, "MvnPsbYn" character varying, "HouseRental" character varying, "PetYn" character varying, "Top" character varying, "PtMemo" character varying, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- INSERT
    IF pr_proc = 'INS' THEN
        RETURN QUERY
        INSERT INTO pt_sale(
            pt_name, pt_sts, pt_type, pt_expl, sale_div,
            addr1, addr2, addr3, addr4, addr5, addr_post,
            bjd_code, danji_code, dong, ho, floor, opt, house_cnt,
            apt_typ, sup_area, exc_area, land_share, room_cnt, bath_cnt,
            dir_std, heat_method, heat_fuel, entr_struct, buid_struct,
            balc_ext, floor1, floor2, pk_cnt, maint_cost, maint_dtl,
            sale_amt, les_amt, prot_amt, mon_amt, etc_amt, lay_amt,
            now_dep_amt, now_mon_amt, loan_amt, loan_amt_aft, mtry_date,
            expt_mov_date, expt_date, expt_com_date, comp_year, sha_yn,
            cust_no, off_no, rt_no, cn_no,
            mvn_psb_yn, house_rental, pet_yn, top, pt_memo,
            reg_dt, reg_id
        )
        VALUES(
            pr_pt_name, pr_pt_sts, pr_pt_type, pr_pt_expl, pr_sale_div,
            pr_addr1, pr_addr2, pr_addr3, pr_addr4, pr_addr5, pr_addr_post,
            pr_bjd_code, pr_danji_code, pr_dong, pr_ho, pr_floor, pr_opt, pr_house_cnt,
            pr_apt_typ, pr_sup_area, pr_exc_area, pr_land_share, pr_room_cnt, pr_bath_cnt,
            pr_dir_std, pr_heat_method, pr_heat_fuel, pr_entr_struct, pr_buid_struct,
            pr_balc_ext, pr_floor1, pr_floor2, pr_pk_cnt, pr_maint_cost, pr_maint_dtl,
            pr_sale_amt, pr_les_amt, pr_prot_amt, pr_mon_amt, pr_etc_amt, pr_lay_amt,
            pr_now_dep_amt, pr_now_mon_amt, pr_loan_amt, pr_loan_amt_aft, pr_mtry_date,
            pr_expt_mov_date, pr_expt_date, pr_expt_com_date, pr_comp_year, pr_sha_yn,
            pr_cust_no, pr_off_no, pr_rt_no, pr_cn_no,
            pr_mvn_psb_yn, pr_house_rental, pr_pet_yn, pr_top, pr_pt_memo,
            now(), pr_user_id
        )
        RETURNING pt_no, pt_name, pt_sts, pt_type, pt_expl, sale_div,
                  addr1, addr2, addr3, addr4, addr5, addr_post,
                  bjd_code, danji_code, dong, ho, floor, opt, house_cnt,
                  apt_typ, sup_area, exc_area, land_share, room_cnt, bath_cnt,
                  dir_std, heat_method, heat_fuel, entr_struct, buid_struct,
                  balc_ext, floor1, floor2, pk_cnt, maint_cost, maint_dtl,
                  sale_amt, les_amt, prot_amt, mon_amt, etc_amt, lay_amt,
                  now_dep_amt, now_mon_amt, loan_amt, loan_amt_aft, mtry_date,
                  expt_mov_date, expt_date, expt_com_date, comp_year, sha_yn,
                  cust_no, off_no, rt_no, cn_no,
                  mvn_psb_yn, house_rental, pet_yn, top, pt_memo,
                  reg_dt, reg_id, upd_dt, upd_id;

    -- UPDATE
    ELSIF pr_proc = 'UPD' THEN
        RETURN QUERY
        UPDATE pt_sale a
           SET pt_name = COALESCE(pr_pt_name, a.pt_name),
               pt_sts = COALESCE(pr_pt_sts, a.pt_sts),
               pt_type = COALESCE(pr_pt_type, a.pt_type),
               pt_expl = COALESCE(pr_pt_expl, a.pt_expl),
               sale_div = COALESCE(pr_sale_div, a.sale_div),
               addr1 = COALESCE(pr_addr1, a.addr1),
               addr2 = COALESCE(pr_addr2, a.addr2),
               addr3 = COALESCE(pr_addr3, a.addr3),
               addr4 = COALESCE(pr_addr4, a.addr4),
               addr5 = COALESCE(pr_addr5, a.addr5),
               addr_post = COALESCE(pr_addr_post, a.addr_post),
               bjd_code = COALESCE(pr_bjd_code, a.bjd_code),
               danji_code = COALESCE(pr_danji_code, a.danji_code),
               dong = COALESCE(pr_dong, a.dong),
               ho = COALESCE(pr_ho, a.ho),
               floor = COALESCE(pr_floor, a.floor),
               opt = COALESCE(pr_opt, a.opt),
               house_cnt = COALESCE(pr_house_cnt, a.house_cnt),
               apt_typ = COALESCE(pr_apt_typ, a.apt_typ),
               sup_area = COALESCE(pr_sup_area, a.sup_area),
               exc_area = COALESCE(pr_exc_area, a.exc_area),
               land_share = COALESCE(pr_land_share, a.land_share),
               room_cnt = COALESCE(pr_room_cnt, a.room_cnt),
               bath_cnt = COALESCE(pr_bath_cnt, a.bath_cnt),
               dir_std = COALESCE(pr_dir_std, a.dir_std),
               heat_method = COALESCE(pr_heat_method, a.heat_method),
               heat_fuel = COALESCE(pr_heat_fuel, a.heat_fuel),
               entr_struct = COALESCE(pr_entr_struct, a.entr_struct),
               buid_struct = COALESCE(pr_buid_struct, a.buid_struct),
               balc_ext = COALESCE(pr_balc_ext, a.balc_ext),
               floor1 = COALESCE(pr_floor1, a.floor1),
               floor2 = COALESCE(pr_floor2, a.floor2),
               pk_cnt = COALESCE(pr_pk_cnt, a.pk_cnt),
               maint_cost = COALESCE(pr_maint_cost, a.maint_cost),
               maint_dtl = COALESCE(pr_maint_dtl, a.maint_dtl),
               sale_amt = COALESCE(pr_sale_amt, a.sale_amt),
               les_amt = COALESCE(pr_les_amt, a.les_amt),
               prot_amt = COALESCE(pr_prot_amt, a.prot_amt),
               mon_amt = COALESCE(pr_mon_amt, a.mon_amt),
               etc_amt = COALESCE(pr_etc_amt, a.etc_amt),
               lay_amt = COALESCE(pr_lay_amt, a.lay_amt),
               now_dep_amt = COALESCE(pr_now_dep_amt, a.now_dep_amt),
               now_mon_amt = COALESCE(pr_now_mon_amt, a.now_mon_amt),
               loan_amt = COALESCE(pr_loan_amt, a.loan_amt),
               loan_amt_aft = COALESCE(pr_loan_amt_aft, a.loan_amt_aft),
               mtry_date = COALESCE(pr_mtry_date, a.mtry_date),
               expt_mov_date = COALESCE(pr_expt_mov_date, a.expt_mov_date),
               expt_date = COALESCE(pr_expt_date, a.expt_date),
               expt_com_date = COALESCE(pr_expt_com_date, a.expt_com_date),
               comp_year = COALESCE(pr_comp_year, a.comp_year),
               sha_yn = COALESCE(pr_sha_yn, a.sha_yn),
               cust_no = COALESCE(pr_cust_no, a.cust_no),
               off_no = COALESCE(pr_off_no, a.off_no),
               rt_no = COALESCE(pr_rt_no, a.rt_no),
               cn_no = COALESCE(pr_cn_no, a.cn_no),
               mvn_psb_yn = COALESCE(pr_mvn_psb_yn, a.mvn_psb_yn),
               house_rental = COALESCE(pr_house_rental, a.house_rental),
               pet_yn = COALESCE(pr_pet_yn, a.pet_yn),
               top = COALESCE(pr_top, a.top),
               pt_memo = COALESCE(pr_pt_memo, a.pt_memo),
               upd_dt = now(),
               upd_id = pr_user_id
         WHERE a.pt_no = pr_pt_no
         RETURNING a.pt_no, a.pt_name, a.pt_sts, a.pt_type, a.pt_expl, a.sale_div,
                   a.addr1, a.addr2, a.addr3, a.addr4, a.addr5, a.addr_post,
                   a.bjd_code, a.danji_code, a.dong, a.ho, a.floor, a.opt, a.house_cnt,
                   a.apt_typ, a.sup_area, a.exc_area, a.land_share, a.room_cnt, a.bath_cnt,
                   a.dir_std, a.heat_method, a.heat_fuel, a.entr_struct, a.buid_struct,
                   a.balc_ext, a.floor1, a.floor2, a.pk_cnt, a.maint_cost, a.maint_dtl,
                   a.sale_amt, a.les_amt, a.prot_amt, a.mon_amt, a.etc_amt, a.lay_amt,
                   a.now_dep_amt, a.now_mon_amt, a.loan_amt, a.loan_amt_aft, a.mtry_date,
                   a.expt_mov_date, a.expt_date, a.expt_com_date, a.comp_year, a.sha_yn,
                   a.cust_no, a.off_no, a.rt_no, a.cn_no,
                   a.mvn_psb_yn, a.house_rental, a.pet_yn, a.top, a.pt_memo,
                   a.reg_dt, a.reg_id, a.upd_dt, a.upd_id;

    -- DELETE
    ELSIF pr_proc = 'DEL' THEN
        RETURN QUERY
        DELETE FROM pt_sale a
         WHERE a.pt_no = pr_pt_no
         RETURNING a.pt_no, a.pt_name, a.pt_sts, a.pt_type, a.pt_expl, a.sale_div,
                   a.addr1, a.addr2, a.addr3, a.addr4, a.addr5, a.addr_post,
                   a.bjd_code, a.danji_code, a.dong, a.ho, a.floor, a.opt, a.house_cnt,
                   a.apt_typ, a.sup_area, a.exc_area, a.land_share, a.room_cnt, a.bath_cnt,
                   a.dir_std, a.heat_method, a.heat_fuel, a.entr_struct, a.buid_struct,
                   a.balc_ext, a.floor1, a.floor2, a.pk_cnt, a.maint_cost, a.maint_dtl,
                   a.sale_amt, a.les_amt, a.prot_amt, a.mon_amt, a.etc_amt, a.lay_amt,
                   a.now_dep_amt, a.now_mon_amt, a.loan_amt, a.loan_amt_aft, a.mtry_date,
                   a.expt_mov_date, a.expt_date, a.expt_com_date, a.comp_year, a.sha_yn,
                   a.cust_no, a.off_no, a.rt_no, a.cn_no,
                   a.mvn_psb_yn, a.house_rental, a.pet_yn, a.top, a.pt_memo,
                   a.reg_dt, a.reg_id, a.upd_dt, a.upd_id;

    -- SELECT
    ELSE
        RETURN QUERY
         SELECT a.pt_no as "PtNo",
			    a.pt_name as "PtName",
			    a.pt_sts as "PtSts",
			    a.pt_type as "PtType",
			    a.pt_expl as "PtExpl",
			    a.sale_div as "SaleDiv",
			    a.addr1 as "Addr1",
			    a.addr2 as "Addr2",
			    a.addr3 as "Addr3",
			    a.addr4 as "Addr4",
			    a.addr5 as "Addr5",
			    a.addr_post as "AddrPost",
			    a.bjd_code as "BjdCode",
			    a.danji_code as "DanjiCode",
			    a.dong as "Dong",
			    a.ho as "Ho",
			    a.floor as "Floor",
			    a.opt as "Opt",
			    a.house_cnt as "HouseCnt",
			    a.apt_typ as "AptTyp",
			    a.sup_area as "SupArea",
			    a.exc_area as "ExcArea",
			    a.land_share as "LandShare",
			    a.room_cnt as "RoomCnt",
			    a.bath_cnt as "BathCnt",
			    a.dir_std as "DirStd",
			    a.heat_method as "HeatMethod",
			    a.heat_fuel as "HeatFuel",
			    a.entr_struct as "EntrStruct",
			    a.buid_struct as "BuidStruct",
			    a.balc_ext as "BalcExt",
			    a.floor1 as "Floor1",
			    a.floor2 as "Floor2",
			    a.pk_cnt as "PkCnt",
			    a.maint_cost as "MaintCost",
			    a.maint_dtl as "MaintDtl",
			    a.sale_amt as "SaleAmt",
			    a.les_amt as "LesAmt",
			    a.prot_amt as "ProtAmt",
			    a.mon_amt as "MonAmt",
			    a.etc_amt as "EtcAmt",
			    a.lay_amt as "LayAmt",
			    a.now_dep_amt as "NowDepAmt",
			    a.now_mon_amt as "NowMonAmt",
			    a.loan_amt as "LoanAmt",
			    a.loan_amt_aft as "LoanAmtAft",
			    a.mtry_date as "MtryDate",
			    a.expt_mov_date as "ExptMovDate",
			    a.expt_date as "ExptDate",
			    a.expt_com_date as "ExptComDate",
			    a.comp_year as "CompYear",
			    a.sha_yn as "ShaYn",
			    a.cust_no as "CustNo",
			    a.off_no as "OffNo",
			    a.rt_no as "RtNo",
			    a.cn_no as "CnNo",
			    a.mvn_psb_yn as "MvnPsbYn",
			    a.house_rental as "HouseRental",
			    a.pet_yn as "PetYn",
			    a.top as "Top",
			    a.pt_memo as "PtMemo",
			    a.reg_dt as "RegDt",
			    a.reg_id as "RegId",
			    a.upd_dt as "UpdDt",
			    a.upd_id as "UpdId"
           FROM pt_sale a
          WHERE (pr_pt_no IS NULL OR a.pt_no = pr_pt_no)
            AND (pr_pt_name IS NULL OR a.pt_name ILIKE '%' || pr_pt_name || '%')
            AND (pr_pt_type IS NULL OR a.pt_type = pr_pt_type)
            AND (pr_prg_sts IS NULL OR a.pt_sts = pr_prg_sts)
            AND (pr_sale_div IS NULL OR
                 EXISTS (
                   SELECT 1
                   FROM unnest(string_to_array(pr_sale_div, ',')) AS filter_div
                   WHERE a.sale_div LIKE '%' || filter_div || '%'
                 ))
            AND (pr_off_no IS NULL OR a.off_no = pr_off_no)
            AND (pr_rt_no IS NULL OR a.rt_no = pr_rt_no)
            AND (pr_danji_code IS NULL OR a.danji_code = pr_danji_code)
            AND (pr_addr3 IS NULL OR a.addr3 = pr_addr3)
		  ORDER BY pt_no DESC
		  LIMIT pr_page_size
	     OFFSET (pr_page - 1) * pr_page_size
;
    END IF;
END;
$function$
;

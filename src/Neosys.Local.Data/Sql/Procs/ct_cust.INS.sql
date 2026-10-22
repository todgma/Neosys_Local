-- 고객 등록 — 새 고객번호(cust_no)를 반환한다. 담당자·사무소가 비어 있으면 로그인 사용자 기준
-- from legacy/API/Customer/Services/CustomersServices.cs InsertCustomer
INSERT INTO ct_cust (
    cust_type, name, alias, tel, addr, memo,
    rent_bsn_yn, trd_prg, want_type, want_nm, exc_area_fr, exc_area_to,
    land_share_fr, land_share_to, trd_type, movein_yn, move_date_fr, move_date_to,
    cash_ablt, sale_amt_fr, sale_amt_to, les_amt_fr, les_amt_to, prot_amt_fr,
    prot_amt_to, mon_amt_fr, mon_amt_to, etc_prot_amt_fr, etc_prot_amt_to, etc_mon_amt_fr,
    etc_mon_amt_to, etc_type, rmk, rnk, room_cnt, bath_cnt,
    park_cnt, community_fac, feature_note, gap_invest_yn, irrelevant_yn, want_sub_type,
    gross_area_fr, gross_area_to, area_kind, land_share_ratio_fr, land_share_ratio_to, area_unit,
    invest_yn, child_yn, child_cond, pet_allow, pet_cond, opt,
    building_use, biz_type, elevator_cnt, stair_cnt, city_gas_yn, electric_yn,
    elec_capacity, access_road, land_use, land_category, balc_ext, entr_struct,
    building_form, build_permit_pref, contract_date, hold_date, vendor_id,
    rt_no, off_no, reg_dt, reg_id
) VALUES (
    @cust_type, @name, @alias, @tel, @addr, @memo,
    @rent_bsn_yn, @trd_prg, @want_type, @want_nm, @exc_area_fr, @exc_area_to,
    @land_share_fr, @land_share_to, @trd_type, @movein_yn, @move_date_fr, @move_date_to,
    @cash_ablt, @sale_amt_fr, @sale_amt_to, @les_amt_fr, @les_amt_to, @prot_amt_fr,
    @prot_amt_to, @mon_amt_fr, @mon_amt_to, @etc_prot_amt_fr, @etc_prot_amt_to, @etc_mon_amt_fr,
    @etc_mon_amt_to, @etc_type, @rmk, @rnk, @room_cnt, @bath_cnt,
    @park_cnt, @community_fac, @feature_note, @gap_invest_yn, @irrelevant_yn, @want_sub_type,
    @gross_area_fr, @gross_area_to, @area_kind, @land_share_ratio_fr, @land_share_ratio_to, @area_unit,
    @invest_yn, @child_yn, @child_cond, @pet_allow, @pet_cond, @opt,
    @building_use, @biz_type, @elevator_cnt, @stair_cnt, @city_gas_yn, @electric_yn,
    @elec_capacity, @access_road, @land_use, @land_category, @balc_ext, @entr_struct,
    @building_form, @build_permit_pref, @contract_date, @hold_date, @vendor_id,
    COALESCE(@rt_no, @session_rt_no), COALESCE(@off_no, @session_off_no), datetime('now','localtime'), @session_user_id
) RETURNING cust_no;

-- 고객 수정
-- from legacy/API/Customer/Services/CustomersServices.cs UpdateCustomer
UPDATE ct_cust SET
    cust_type = @cust_type, name = @name, alias = @alias, tel = @tel,
    addr = @addr, memo = @memo, rent_bsn_yn = @rent_bsn_yn, trd_prg = @trd_prg,
    want_type = @want_type, want_nm = @want_nm, exc_area_fr = @exc_area_fr, exc_area_to = @exc_area_to,
    land_share_fr = @land_share_fr, land_share_to = @land_share_to, trd_type = @trd_type, movein_yn = @movein_yn,
    move_date_fr = @move_date_fr, move_date_to = @move_date_to, cash_ablt = @cash_ablt, sale_amt_fr = @sale_amt_fr,
    sale_amt_to = @sale_amt_to, les_amt_fr = @les_amt_fr, les_amt_to = @les_amt_to, prot_amt_fr = @prot_amt_fr,
    prot_amt_to = @prot_amt_to, mon_amt_fr = @mon_amt_fr, mon_amt_to = @mon_amt_to, etc_prot_amt_fr = @etc_prot_amt_fr,
    etc_prot_amt_to = @etc_prot_amt_to, etc_mon_amt_fr = @etc_mon_amt_fr, etc_mon_amt_to = @etc_mon_amt_to, etc_type = @etc_type,
    rmk = @rmk, rnk = @rnk, room_cnt = @room_cnt, bath_cnt = @bath_cnt,
    park_cnt = @park_cnt, community_fac = @community_fac, feature_note = @feature_note, gap_invest_yn = @gap_invest_yn,
    irrelevant_yn = @irrelevant_yn, want_sub_type = @want_sub_type, gross_area_fr = @gross_area_fr, gross_area_to = @gross_area_to,
    area_kind = @area_kind, land_share_ratio_fr = @land_share_ratio_fr, land_share_ratio_to = @land_share_ratio_to, area_unit = @area_unit,
    invest_yn = @invest_yn, child_yn = @child_yn, child_cond = @child_cond, pet_allow = @pet_allow,
    pet_cond = @pet_cond, opt = @opt, building_use = @building_use, biz_type = @biz_type,
    elevator_cnt = @elevator_cnt, stair_cnt = @stair_cnt, city_gas_yn = @city_gas_yn, electric_yn = @electric_yn,
    elec_capacity = @elec_capacity, access_road = @access_road, land_use = @land_use, land_category = @land_category,
    balc_ext = @balc_ext, entr_struct = @entr_struct, building_form = @building_form, build_permit_pref = @build_permit_pref,
    contract_date = @contract_date, hold_date = @hold_date, vendor_id = @vendor_id,
    rt_no = COALESCE(@rt_no, rt_no, @session_rt_no), off_no = COALESCE(@off_no, off_no, @session_off_no),
    upd_dt = datetime('now','localtime'), upd_id = @session_user_id
 WHERE cust_no = @cust_no;

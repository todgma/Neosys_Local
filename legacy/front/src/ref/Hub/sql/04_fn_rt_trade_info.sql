-- =====================================================
-- 공동중개망 통합 함수 fn_rt_trade_info
-- =====================================================
-- MODE 분기: SEL(조회), RECENT(최근N개), INS(등록), UPD(수정), DEL(삭제)
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_rt_trade_info(
    pr_mode             VARCHAR DEFAULT 'SEL',        -- 처리 모드

    -- 조회 조건 (SEL, RECENT)
    pr_trade_id         BIGINT DEFAULT NULL,
    pr_trade_div        VARCHAR DEFAULT NULL,         -- 'CUST' or 'PT'
    pr_off_no           VARCHAR DEFAULT NULL,
    pr_trade_state      VARCHAR DEFAULT NULL,
    pr_cust_no          VARCHAR DEFAULT NULL,
    pr_pt_no            VARCHAR DEFAULT NULL,
    pr_reg_dt_fr        TIMESTAMPTZ DEFAULT NULL,
    pr_reg_dt_to        TIMESTAMPTZ DEFAULT NULL,

    -- 페이징 (SEL)
    pr_page             INT DEFAULT 1,
    pr_page_size        INT DEFAULT 20,

    -- 최근 N개 (RECENT)
    pr_recent_cnt       INT DEFAULT 10,

    -- 공통 필드 (INS, UPD)
    pr_reg_user_id      VARCHAR DEFAULT NULL,
    pr_is_cust_registered BOOLEAN DEFAULT FALSE,
    pr_is_pt_registered BOOLEAN DEFAULT FALSE,
    pr_trade_state_desc VARCHAR DEFAULT NULL,

    -- 공동중개 필드
    pr_co_brokerage_title   VARCHAR DEFAULT NULL,
    pr_co_brokerage_content TEXT DEFAULT NULL,
    pr_co_brokerage_memo    TEXT DEFAULT NULL,

    -- 고객정보 필드
    pr_cust_type        VARCHAR DEFAULT NULL,
    pr_cust_name        VARCHAR DEFAULT NULL,
    pr_cust_alias       VARCHAR DEFAULT NULL,
    pr_cust_tel         VARCHAR DEFAULT NULL,
    pr_cust_addr        VARCHAR DEFAULT NULL,
    pr_cust_memo        TEXT DEFAULT NULL,
    pr_cust_rent_bsn_yn CHAR DEFAULT NULL,
    pr_cust_trd_prg     VARCHAR DEFAULT NULL,
    pr_cust_want_type   VARCHAR DEFAULT NULL,
    pr_cust_exc_area_fr NUMERIC DEFAULT NULL,
    pr_cust_exc_area_to NUMERIC DEFAULT NULL,
    pr_cust_region1     VARCHAR DEFAULT NULL,
    pr_cust_region2     VARCHAR DEFAULT NULL,
    pr_cust_region3     VARCHAR DEFAULT NULL,
    pr_cust_trd_type    VARCHAR DEFAULT NULL,
    pr_cust_trd_type_detail VARCHAR DEFAULT NULL,
    pr_cust_sale_amt_fr NUMERIC DEFAULT NULL,
    pr_cust_sale_amt_to NUMERIC DEFAULT NULL,
    pr_cust_les_amt_fr  NUMERIC DEFAULT NULL,
    pr_cust_les_amt_to  NUMERIC DEFAULT NULL,
    pr_cust_prot_amt_fr NUMERIC DEFAULT NULL,
    pr_cust_prot_amt_to NUMERIC DEFAULT NULL,
    pr_cust_mon_amt_fr  NUMERIC DEFAULT NULL,
    pr_cust_mon_amt_to  NUMERIC DEFAULT NULL,
    pr_cust_etc_prot_amt_fr NUMERIC DEFAULT NULL,
    pr_cust_etc_prot_amt_to NUMERIC DEFAULT NULL,
    pr_cust_etc_mon_amt_fr NUMERIC DEFAULT NULL,
    pr_cust_etc_mon_amt_to NUMERIC DEFAULT NULL,
    pr_cust_etc_type    VARCHAR DEFAULT NULL,
    pr_cust_movein_yn   CHAR DEFAULT NULL,
    pr_cust_move_date_fr DATE DEFAULT NULL,
    pr_cust_move_date_to DATE DEFAULT NULL,
    pr_cust_cash_ablt   NUMERIC DEFAULT NULL,
    pr_cust_rmk         TEXT DEFAULT NULL,

    -- 물건정보 필드
    pr_p_pt_name        VARCHAR DEFAULT NULL,
    pr_p_pt_type        VARCHAR DEFAULT NULL,
    pr_p_sale_div       VARCHAR DEFAULT NULL,
    pr_p_sale_amt       NUMERIC DEFAULT NULL,
    pr_p_now_dep_amt    NUMERIC DEFAULT NULL,
    pr_p_now_mon_amt    NUMERIC DEFAULT NULL,
    pr_p_exc_area       NUMERIC DEFAULT NULL,
    pr_p_sup_area       NUMERIC DEFAULT NULL,
    pr_p_addr_full      VARCHAR DEFAULT NULL,
    pr_p_dong           VARCHAR DEFAULT NULL,
    pr_p_ho             VARCHAR DEFAULT NULL,
    pr_p_floor1         INT DEFAULT NULL,
    pr_p_floor2         INT DEFAULT NULL,
    pr_p_floor_desc     VARCHAR DEFAULT NULL,
    pr_p_dir_std        VARCHAR DEFAULT NULL,
    pr_p_balc_ext       VARCHAR DEFAULT NULL,
    pr_p_room_cnt       INT DEFAULT NULL,
    pr_p_bath_cnt       INT DEFAULT NULL,
    pr_p_pk_cnt         NUMERIC DEFAULT NULL,
    pr_p_maint_cost     NUMERIC DEFAULT NULL,
    pr_p_heat_method    VARCHAR DEFAULT NULL,
    pr_p_heat_fuel      VARCHAR DEFAULT NULL,
    pr_p_heat_system    VARCHAR DEFAULT NULL,
    pr_p_buid_struct    VARCHAR DEFAULT NULL,
    pr_immediate_movein_yn CHAR DEFAULT NULL,
    pr_p_expt_date      DATE DEFAULT NULL,
    pr_p_prg_sts        VARCHAR DEFAULT NULL,
    pr_p_opt            TEXT DEFAULT NULL,
    pr_p_pt_expl        TEXT DEFAULT NULL,
    pr_p_comp_year      VARCHAR DEFAULT NULL,
    pr_owner_rent_bsn_yn CHAR DEFAULT NULL,
    pr_trade_status     VARCHAR DEFAULT 'Y',

    -- 자동 등록 옵션
    pr_auto_register_customer BOOLEAN DEFAULT FALSE,
    pr_auto_register_property BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    trade_id BIGINT,
    trade_div VARCHAR,
    cust_no VARCHAR,
    pt_no VARCHAR,
    reg_user_id VARCHAR,
    off_no VARCHAR,
    reg_dt TIMESTAMPTZ,
    upd_dt TIMESTAMPTZ,
    is_cust_registered BOOLEAN,
    is_pt_registered BOOLEAN,
    trade_state VARCHAR,
    trade_state_desc VARCHAR,

    -- 공동중개 필드
    co_brokerage_title VARCHAR,
    co_brokerage_content TEXT,
    co_brokerage_memo TEXT,

    -- 고객정보 필드
    cust_type VARCHAR,
    cust_name VARCHAR,
    cust_alias VARCHAR,
    cust_tel VARCHAR,
    cust_addr VARCHAR,
    cust_memo TEXT,
    cust_rent_bsn_yn CHAR,
    cust_trd_prg VARCHAR,
    cust_want_type VARCHAR,
    cust_exc_area_fr NUMERIC,
    cust_exc_area_to NUMERIC,
    cust_region1 VARCHAR,
    cust_region2 VARCHAR,
    cust_region3 VARCHAR,
    cust_trd_type VARCHAR,
    cust_trd_type_detail VARCHAR,
    cust_sale_amt_fr NUMERIC,
    cust_sale_amt_to NUMERIC,
    cust_les_amt_fr NUMERIC,
    cust_les_amt_to NUMERIC,
    cust_prot_amt_fr NUMERIC,
    cust_prot_amt_to NUMERIC,
    cust_mon_amt_fr NUMERIC,
    cust_mon_amt_to NUMERIC,
    cust_etc_prot_amt_fr NUMERIC,
    cust_etc_prot_amt_to NUMERIC,
    cust_etc_mon_amt_fr NUMERIC,
    cust_etc_mon_amt_to NUMERIC,
    cust_etc_type VARCHAR,
    cust_movein_yn CHAR,
    cust_move_date_fr DATE,
    cust_move_date_to DATE,
    cust_cash_ablt NUMERIC,
    cust_rmk TEXT,

    -- 물건정보 필드
    p_pt_name VARCHAR,
    p_pt_type VARCHAR,
    p_sale_div VARCHAR,
    p_sale_amt NUMERIC,
    p_now_dep_amt NUMERIC,
    p_now_mon_amt NUMERIC,
    p_exc_area NUMERIC,
    p_sup_area NUMERIC,
    p_addr_full VARCHAR,
    p_dong VARCHAR,
    p_ho VARCHAR,
    p_floor1 INT,
    p_floor2 INT,
    p_floor_desc VARCHAR,
    p_dir_std VARCHAR,
    p_balc_ext VARCHAR,
    p_room_cnt INT,
    p_bath_cnt INT,
    p_pk_cnt NUMERIC,
    p_maint_cost NUMERIC,
    p_heat_method VARCHAR,
    p_heat_fuel VARCHAR,
    p_heat_system VARCHAR,
    p_buid_struct VARCHAR,
    immediate_movein_yn CHAR,
    p_expt_date DATE,
    p_prg_sts VARCHAR,
    p_opt TEXT,
    p_pt_expl TEXT,
    p_comp_year VARCHAR,
    owner_rent_bsn_yn CHAR,
    trade_status VARCHAR,

    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INT;
    v_total_count BIGINT := 0;
    v_new_trade_id BIGINT;
    v_new_cust_no VARCHAR;
    v_new_pt_no VARCHAR;
BEGIN
    -- ==================== SEL: 페이징 조회 ====================
    IF pr_mode = 'SEL' THEN
        v_offset := (pr_page - 1) * pr_page_size;

        -- 전체 카운트 계산
        SELECT COUNT(*)
        INTO v_total_count
        FROM public.rt_trade_info
        WHERE (pr_trade_id IS NULL OR public.rt_trade_info.trade_id = pr_trade_id)
          AND (pr_trade_div IS NULL OR public.rt_trade_info.trade_div = pr_trade_div)
          AND (pr_off_no IS NULL OR public.rt_trade_info.off_no = pr_off_no)
          AND (pr_trade_state IS NULL OR public.rt_trade_info.trade_state = pr_trade_state)
          AND (pr_cust_no IS NULL OR public.rt_trade_info.cust_no = pr_cust_no)
          AND (pr_pt_no IS NULL OR public.rt_trade_info.pt_no = pr_pt_no)
          AND (pr_reg_dt_fr IS NULL OR public.rt_trade_info.reg_dt >= pr_reg_dt_fr)
          AND (pr_reg_dt_to IS NULL OR public.rt_trade_info.reg_dt <= pr_reg_dt_to);

        -- 데이터 조회
        RETURN QUERY
        SELECT
            t.*,
            v_total_count
        FROM public.rt_trade_info t
        WHERE (pr_trade_id IS NULL OR t.trade_id = pr_trade_id)
          AND (pr_trade_div IS NULL OR t.trade_div = pr_trade_div)
          AND (pr_off_no IS NULL OR t.off_no = pr_off_no)
          AND (pr_trade_state IS NULL OR t.trade_state = pr_trade_state)
          AND (pr_cust_no IS NULL OR t.cust_no = pr_cust_no)
          AND (pr_pt_no IS NULL OR t.pt_no = pr_pt_no)
          AND (pr_reg_dt_fr IS NULL OR t.reg_dt >= pr_reg_dt_fr)
          AND (pr_reg_dt_to IS NULL OR t.reg_dt <= pr_reg_dt_to)
        ORDER BY t.reg_dt DESC
        LIMIT pr_page_size
        OFFSET v_offset;

        RETURN;
    END IF;

    -- ==================== RECENT: 최근 N개 조회 ====================
    IF pr_mode = 'RECENT' THEN
        RETURN QUERY
        SELECT
            t.*,
            0::BIGINT AS total_count
        FROM public.rt_trade_info t
        WHERE (pr_trade_div IS NULL OR t.trade_div = pr_trade_div)
          AND (pr_off_no IS NULL OR t.off_no = pr_off_no)
          AND (pr_trade_state IS NULL OR t.trade_state = pr_trade_state)
        ORDER BY t.reg_dt DESC
        LIMIT pr_recent_cnt;

        RETURN;
    END IF;

    -- ==================== INS: 신규 등록 ====================
    IF pr_mode = 'INS' THEN
        -- 필수 검증
        IF pr_trade_div IS NULL OR pr_reg_user_id IS NULL OR pr_off_no IS NULL THEN
            RAISE EXCEPTION 'INS 모드: trade_div, reg_user_id, off_no는 필수입니다.';
        END IF;

        -- INSERT
        INSERT INTO public.rt_trade_info (
            trade_div, cust_no, pt_no, reg_user_id, off_no,
            is_cust_registered, is_pt_registered, trade_state, trade_state_desc,
            co_brokerage_title, co_brokerage_content, co_brokerage_memo,
            cust_type, cust_name, cust_alias, cust_tel, cust_addr, cust_memo,
            cust_rent_bsn_yn, cust_trd_prg, cust_want_type, cust_exc_area_fr, cust_exc_area_to,
            cust_region1, cust_region2, cust_region3, cust_trd_type, cust_trd_type_detail,
            cust_sale_amt_fr, cust_sale_amt_to, cust_les_amt_fr, cust_les_amt_to,
            cust_prot_amt_fr, cust_prot_amt_to, cust_mon_amt_fr, cust_mon_amt_to,
            cust_etc_prot_amt_fr, cust_etc_prot_amt_to, cust_etc_mon_amt_fr, cust_etc_mon_amt_to,
            cust_etc_type, cust_movein_yn, cust_move_date_fr, cust_move_date_to,
            cust_cash_ablt, cust_rmk,
            p_pt_name, p_pt_type, p_sale_div, p_sale_amt, p_now_dep_amt, p_now_mon_amt,
            p_exc_area, p_sup_area, p_addr_full, p_dong, p_ho,
            p_floor1, p_floor2, p_floor_desc, p_dir_std, p_balc_ext,
            p_room_cnt, p_bath_cnt, p_pk_cnt, p_maint_cost,
            p_heat_method, p_heat_fuel, p_heat_system, p_buid_struct,
            immediate_movein_yn, p_expt_date, p_prg_sts, p_opt, p_pt_expl,
            p_comp_year, owner_rent_bsn_yn, trade_status
        )
        VALUES (
            pr_trade_div, pr_cust_no, pr_pt_no, pr_reg_user_id, pr_off_no,
            pr_is_cust_registered, pr_is_pt_registered, COALESCE(pr_trade_state, 'active'), pr_trade_state_desc,
            pr_co_brokerage_title, pr_co_brokerage_content, pr_co_brokerage_memo,
            pr_cust_type, pr_cust_name, pr_cust_alias, pr_cust_tel, pr_cust_addr, pr_cust_memo,
            pr_cust_rent_bsn_yn, pr_cust_trd_prg, pr_cust_want_type, pr_cust_exc_area_fr, pr_cust_exc_area_to,
            pr_cust_region1, pr_cust_region2, pr_cust_region3, pr_cust_trd_type, pr_cust_trd_type_detail,
            pr_cust_sale_amt_fr, pr_cust_sale_amt_to, pr_cust_les_amt_fr, pr_cust_les_amt_to,
            pr_cust_prot_amt_fr, pr_cust_prot_amt_to, pr_cust_mon_amt_fr, pr_cust_mon_amt_to,
            pr_cust_etc_prot_amt_fr, pr_cust_etc_prot_amt_to, pr_cust_etc_mon_amt_fr, pr_cust_etc_mon_amt_to,
            pr_cust_etc_type, pr_cust_movein_yn, pr_cust_move_date_fr, pr_cust_move_date_to,
            pr_cust_cash_ablt, pr_cust_rmk,
            pr_p_pt_name, pr_p_pt_type, pr_p_sale_div, pr_p_sale_amt, pr_p_now_dep_amt, pr_p_now_mon_amt,
            pr_p_exc_area, pr_p_sup_area, pr_p_addr_full, pr_p_dong, pr_p_ho,
            pr_p_floor1, pr_p_floor2, pr_p_floor_desc, pr_p_dir_std, pr_p_balc_ext,
            pr_p_room_cnt, pr_p_bath_cnt, pr_p_pk_cnt, pr_p_maint_cost,
            pr_p_heat_method, pr_p_heat_fuel, pr_p_heat_system, pr_p_buid_struct,
            pr_immediate_movein_yn, pr_p_expt_date, pr_p_prg_sts, pr_p_opt, pr_p_pt_expl,
            pr_p_comp_year, pr_owner_rent_bsn_yn, pr_trade_status
        )
        RETURNING public.rt_trade_info.trade_id INTO v_new_trade_id;

        -- 자동 등록 로직 (TODO: ct_cust, pt_sale 테이블 구조에 따라 구현)
        -- IF pr_auto_register_customer AND pr_trade_div = 'CUST' AND pr_cust_no IS NULL THEN
        --     -- INSERT INTO ct_cust ... RETURNING cust_no INTO v_new_cust_no;
        --     -- UPDATE rt_trade_info SET cust_no = v_new_cust_no, is_cust_registered = TRUE WHERE trade_id = v_new_trade_id;
        -- END IF;

        -- IF pr_auto_register_property AND pr_trade_div = 'PT' AND pr_pt_no IS NULL THEN
        --     -- INSERT INTO pt_sale ... RETURNING pt_no INTO v_new_pt_no;
        --     -- UPDATE rt_trade_info SET pt_no = v_new_pt_no, is_pt_registered = TRUE WHERE trade_id = v_new_trade_id;
        -- END IF;

        -- 등록된 데이터 반환
        RETURN QUERY
        SELECT t.*, 1::BIGINT
        FROM public.rt_trade_info t
        WHERE t.trade_id = v_new_trade_id;

        RETURN;
    END IF;

    -- ==================== UPD: 수정 ====================
    IF pr_mode = 'UPD' THEN
        IF pr_trade_id IS NULL THEN
            RAISE EXCEPTION 'UPD 모드: trade_id는 필수입니다.';
        END IF;

        UPDATE public.rt_trade_info
        SET
            trade_div = COALESCE(pr_trade_div, trade_div),
            cust_no = COALESCE(pr_cust_no, cust_no),
            pt_no = COALESCE(pr_pt_no, pt_no),
            off_no = COALESCE(pr_off_no, off_no),
            upd_dt = NOW(),
            is_cust_registered = COALESCE(pr_is_cust_registered, is_cust_registered),
            is_pt_registered = COALESCE(pr_is_pt_registered, is_pt_registered),
            trade_state = COALESCE(pr_trade_state, trade_state),
            trade_state_desc = COALESCE(pr_trade_state_desc, trade_state_desc),

            co_brokerage_title = COALESCE(pr_co_brokerage_title, co_brokerage_title),
            co_brokerage_content = COALESCE(pr_co_brokerage_content, co_brokerage_content),
            co_brokerage_memo = COALESCE(pr_co_brokerage_memo, co_brokerage_memo),

            cust_type = COALESCE(pr_cust_type, cust_type),
            cust_name = COALESCE(pr_cust_name, cust_name),
            cust_alias = COALESCE(pr_cust_alias, cust_alias),
            cust_tel = COALESCE(pr_cust_tel, cust_tel),
            cust_addr = COALESCE(pr_cust_addr, cust_addr),
            cust_memo = COALESCE(pr_cust_memo, cust_memo),
            cust_rent_bsn_yn = COALESCE(pr_cust_rent_bsn_yn, cust_rent_bsn_yn),
            cust_trd_prg = COALESCE(pr_cust_trd_prg, cust_trd_prg),
            cust_want_type = COALESCE(pr_cust_want_type, cust_want_type),
            cust_exc_area_fr = COALESCE(pr_cust_exc_area_fr, cust_exc_area_fr),
            cust_exc_area_to = COALESCE(pr_cust_exc_area_to, cust_exc_area_to),
            cust_region1 = COALESCE(pr_cust_region1, cust_region1),
            cust_region2 = COALESCE(pr_cust_region2, cust_region2),
            cust_region3 = COALESCE(pr_cust_region3, cust_region3),
            cust_trd_type = COALESCE(pr_cust_trd_type, cust_trd_type),
            cust_trd_type_detail = COALESCE(pr_cust_trd_type_detail, cust_trd_type_detail),
            cust_sale_amt_fr = COALESCE(pr_cust_sale_amt_fr, cust_sale_amt_fr),
            cust_sale_amt_to = COALESCE(pr_cust_sale_amt_to, cust_sale_amt_to),
            cust_les_amt_fr = COALESCE(pr_cust_les_amt_fr, cust_les_amt_fr),
            cust_les_amt_to = COALESCE(pr_cust_les_amt_to, cust_les_amt_to),
            cust_prot_amt_fr = COALESCE(pr_cust_prot_amt_fr, cust_prot_amt_fr),
            cust_prot_amt_to = COALESCE(pr_cust_prot_amt_to, cust_prot_amt_to),
            cust_mon_amt_fr = COALESCE(pr_cust_mon_amt_fr, cust_mon_amt_fr),
            cust_mon_amt_to = COALESCE(pr_cust_mon_amt_to, cust_mon_amt_to),
            cust_etc_prot_amt_fr = COALESCE(pr_cust_etc_prot_amt_fr, cust_etc_prot_amt_fr),
            cust_etc_prot_amt_to = COALESCE(pr_cust_etc_prot_amt_to, cust_etc_prot_amt_to),
            cust_etc_mon_amt_fr = COALESCE(pr_cust_etc_mon_amt_fr, cust_etc_mon_amt_fr),
            cust_etc_mon_amt_to = COALESCE(pr_cust_etc_mon_amt_to, cust_etc_mon_amt_to),
            cust_etc_type = COALESCE(pr_cust_etc_type, cust_etc_type),
            cust_movein_yn = COALESCE(pr_cust_movein_yn, cust_movein_yn),
            cust_move_date_fr = COALESCE(pr_cust_move_date_fr, cust_move_date_fr),
            cust_move_date_to = COALESCE(pr_cust_move_date_to, cust_move_date_to),
            cust_cash_ablt = COALESCE(pr_cust_cash_ablt, cust_cash_ablt),
            cust_rmk = COALESCE(pr_cust_rmk, cust_rmk),

            p_pt_name = COALESCE(pr_p_pt_name, p_pt_name),
            p_pt_type = COALESCE(pr_p_pt_type, p_pt_type),
            p_sale_div = COALESCE(pr_p_sale_div, p_sale_div),
            p_sale_amt = COALESCE(pr_p_sale_amt, p_sale_amt),
            p_now_dep_amt = COALESCE(pr_p_now_dep_amt, p_now_dep_amt),
            p_now_mon_amt = COALESCE(pr_p_now_mon_amt, p_now_mon_amt),
            p_exc_area = COALESCE(pr_p_exc_area, p_exc_area),
            p_sup_area = COALESCE(pr_p_sup_area, p_sup_area),
            p_addr_full = COALESCE(pr_p_addr_full, p_addr_full),
            p_dong = COALESCE(pr_p_dong, p_dong),
            p_ho = COALESCE(pr_p_ho, p_ho),
            p_floor1 = COALESCE(pr_p_floor1, p_floor1),
            p_floor2 = COALESCE(pr_p_floor2, p_floor2),
            p_floor_desc = COALESCE(pr_p_floor_desc, p_floor_desc),
            p_dir_std = COALESCE(pr_p_dir_std, p_dir_std),
            p_balc_ext = COALESCE(pr_p_balc_ext, p_balc_ext),
            p_room_cnt = COALESCE(pr_p_room_cnt, p_room_cnt),
            p_bath_cnt = COALESCE(pr_p_bath_cnt, p_bath_cnt),
            p_pk_cnt = COALESCE(pr_p_pk_cnt, p_pk_cnt),
            p_maint_cost = COALESCE(pr_p_maint_cost, p_maint_cost),
            p_heat_method = COALESCE(pr_p_heat_method, p_heat_method),
            p_heat_fuel = COALESCE(pr_p_heat_fuel, p_heat_fuel),
            p_heat_system = COALESCE(pr_p_heat_system, p_heat_system),
            p_buid_struct = COALESCE(pr_p_buid_struct, p_buid_struct),
            immediate_movein_yn = COALESCE(pr_immediate_movein_yn, immediate_movein_yn),
            p_expt_date = COALESCE(pr_p_expt_date, p_expt_date),
            p_prg_sts = COALESCE(pr_p_prg_sts, p_prg_sts),
            p_opt = COALESCE(pr_p_opt, p_opt),
            p_pt_expl = COALESCE(pr_p_pt_expl, p_pt_expl),
            p_comp_year = COALESCE(pr_p_comp_year, p_comp_year),
            owner_rent_bsn_yn = COALESCE(pr_owner_rent_bsn_yn, owner_rent_bsn_yn),
            trade_status = COALESCE(pr_trade_status, trade_status)
        WHERE public.rt_trade_info.trade_id = pr_trade_id;

        -- 수정된 데이터 반환
        RETURN QUERY
        SELECT t.*, 1::BIGINT
        FROM public.rt_trade_info t
        WHERE t.trade_id = pr_trade_id;

        RETURN;
    END IF;

    -- ==================== DEL: 삭제 (논리 삭제) ====================
    IF pr_mode = 'DEL' THEN
        IF pr_trade_id IS NULL THEN
            RAISE EXCEPTION 'DEL 모드: trade_id는 필수입니다.';
        END IF;

        -- 논리 삭제 (trade_status를 'N'으로 변경)
        UPDATE public.rt_trade_info
        SET trade_status = 'N', upd_dt = NOW()
        WHERE public.rt_trade_info.trade_id = pr_trade_id;

        -- 실제 삭제가 필요한 경우 아래 주석 해제
        -- DELETE FROM public.rt_trade_info WHERE trade_id = pr_trade_id;

        RETURN;
    END IF;

    -- 알 수 없는 모드
    RAISE EXCEPTION '알 수 없는 모드입니다: %', pr_mode;
END;
$$;

-- =====================================================
-- 코멘트
-- =====================================================

COMMENT ON FUNCTION public.fn_rt_trade_info IS '공동중개망 통합 함수 (SEL/RECENT/INS/UPD/DEL)';

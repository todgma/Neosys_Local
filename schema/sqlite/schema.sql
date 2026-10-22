-- Neosys Local SQLite 스키마 — tools/SchemaExport 가 운영 PostgreSQL에서 자동 생성 (직접 수정 금지)
-- 원본: neosis.sldb.iwinv.net/postgres, 생성: 2026-10-19 21:58
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "api_error_log" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "api_name" TEXT,
    "user_id" TEXT,
    "request_path" TEXT,
    "request_method" TEXT,
    "request_query_string" TEXT,
    "request_body" TEXT,
    "error_message" TEXT,
    "stack_trace" TEXT,
    "error_type" TEXT,
    "trace_id" TEXT,
    "client_ip" TEXT,
    "user_agent" TEXT,
    "created_at" TEXT
);

CREATE TABLE IF NOT EXISTS "app_version" (
    "version_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL DEFAULT 'win',
    "version" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "mandatory_yn" TEXT NOT NULL DEFAULT 'N',
    "release_note" TEXT,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "apt_art_iros" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "address" TEXT,
    "unique_num" TEXT,
    "type" TEXT,
    "ic_id" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT
);

CREATE TABLE IF NOT EXISTS "cn_contract_mgt" (
    "cn_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "cn_sts" TEXT,
    "cn_date" TEXT,
    "pt_type" TEXT,
    "addr" TEXT,
    "pt_nm" TEXT,
    "dong" INTEGER,
    "ho" INTEGER,
    "pt_no" INTEGER,
    "seller_nm" TEXT,
    "seller_tel" TEXT,
    "seller_cust_no" INTEGER,
    "buyer_nm" TEXT,
    "buyer_tel" TEXT,
    "buyer_cust_no" INTEGER,
    "trd_type" TEXT,
    "sell_amt" INTEGER,
    "mid_amt1" INTEGER,
    "mid_amt2" INTEGER,
    "bal_amt_date" TEXT,
    "trd_report" TEXT,
    "contract_yn" TEXT,
    "broker_type" TEXT,
    "rt_no" INTEGER,
    "off_no" INTEGER,
    "vendor_id" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT
);

CREATE TABLE IF NOT EXISTS "cn_contract_mgt_hist" (
    "cn_no" INTEGER NOT NULL,
    "cn_sts" TEXT,
    "cn_date" TEXT,
    "pt_type" TEXT,
    "addr" TEXT,
    "pt_nm" TEXT,
    "dong" INTEGER,
    "ho" INTEGER,
    "pt_no" INTEGER,
    "seller_nm" TEXT,
    "seller_tel" TEXT,
    "seller_cust_no" INTEGER,
    "buyer_nm" TEXT,
    "buyer_tel" TEXT,
    "buyer_cust_no" INTEGER,
    "trd_type" TEXT,
    "sell_amt" INTEGER,
    "mid_amt1" INTEGER,
    "mid_amt2" INTEGER,
    "bal_amt_date" TEXT,
    "trd_report" TEXT,
    "contract_yn" TEXT,
    "broker_type" TEXT,
    "rt_no" INTEGER,
    "off_no" INTEGER,
    "vendor_id" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "cn_contract_spcl" (
    "cn_no" INTEGER NOT NULL,
    "cns_no" INTEGER NOT NULL,
    "spcl_desc" TEXT,
    "file_id" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    PRIMARY KEY ("cn_no", "cns_no")
);

CREATE TABLE IF NOT EXISTS "cn_contract_spcl_hist" (
    "cn_no" INTEGER NOT NULL,
    "cns_no" INTEGER NOT NULL,
    "spcl_desc" TEXT,
    "file_id" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "cn_contract_template" (
    "tpl_code" TEXT NOT NULL,
    "kind_cd" TEXT NOT NULL,
    "kind_nm" TEXT,
    "trade_cd" TEXT,
    "trade_nm" TEXT,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body_json" TEXT NOT NULL,
    "ver" INTEGER NOT NULL DEFAULT 1,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    "upd_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    PRIMARY KEY ("tpl_code")
);

CREATE TABLE IF NOT EXISTS "community_job" (
    "post_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "fields" TEXT NOT NULL DEFAULT '{}',
    "pwd" TEXT,
    "view_cnt" INTEGER NOT NULL DEFAULT 0,
    "off_no" INTEGER,
    "rt_no" TEXT,
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT
);

CREATE TABLE IF NOT EXISTS "community_post" (
    "post_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "tab" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "author" TEXT,
    "view_cnt" INTEGER NOT NULL DEFAULT 0,
    "off_no" INTEGER,
    "rt_no" TEXT,
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    "fields" TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS "contract_document" (
    "doc_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "master_id" TEXT NOT NULL,
    "doc_kind" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    CONSTRAINT "contract_document_master_id_doc_kind_key" UNIQUE ("master_id", "doc_kind")
);

CREATE TABLE IF NOT EXISTS "contract_document_hist" (
    "doc_id" INTEGER NOT NULL,
    "master_id" TEXT NOT NULL,
    "doc_kind" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "use_yn" TEXT NOT NULL,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "contract_master" (
    "master_id" TEXT NOT NULL,
    "contract_kind" TEXT,
    "doc_type" TEXT,
    "trade_type" TEXT,
    "title" TEXT,
    "addr" TEXT,
    "seller" TEXT,
    "buyer" TEXT,
    "amount" INTEGER,
    "contract_date" TEXT,
    "status" TEXT DEFAULT '작성',
    "doc" TEXT NOT NULL DEFAULT '{}',
    "off_no" INTEGER,
    "rt_no" TEXT,
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    "origin_master_id" TEXT,
    "report_done_date" TEXT,
    PRIMARY KEY ("master_id")
);

CREATE TABLE IF NOT EXISTS "contract_master_hist" (
    "master_id" TEXT NOT NULL,
    "contract_kind" TEXT,
    "doc_type" TEXT,
    "trade_type" TEXT,
    "title" TEXT,
    "addr" TEXT,
    "seller" TEXT,
    "buyer" TEXT,
    "amount" INTEGER,
    "contract_date" TEXT,
    "status" TEXT,
    "doc" TEXT NOT NULL,
    "off_no" INTEGER,
    "rt_no" TEXT,
    "use_yn" TEXT NOT NULL,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT,
    "origin_master_id" TEXT,
    "report_done_date" TEXT
);

CREATE TABLE IF NOT EXISTS "cs_customer_center" (
    "inquiry_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "answer" TEXT,
    "answer_id" TEXT,
    "answer_dt" TEXT,
    "status" TEXT DEFAULT 'PENDING',
    "sort_order" INTEGER DEFAULT 0,
    "reg_id" TEXT NOT NULL,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "mod_id" TEXT,
    "mod_dt" TEXT
);

CREATE TABLE IF NOT EXISTS "cs_customer_center_hist" (
    "inquiry_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "answer" TEXT,
    "answer_id" TEXT,
    "answer_dt" TEXT,
    "status" TEXT,
    "sort_order" INTEGER,
    "reg_id" TEXT NOT NULL,
    "reg_dt" TEXT,
    "mod_id" TEXT,
    "mod_dt" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "ct_cust" (
    "cust_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "cust_type" INTEGER,
    "tel" TEXT,
    "addr" TEXT,
    "memo" TEXT,
    "rent_bsn_yn" TEXT,
    "trd_prg" TEXT,
    "want_type" TEXT,
    "want_nm" TEXT,
    "exc_area_fr" NUMERIC,
    "exc_area_to" NUMERIC,
    "land_share_fr" NUMERIC,
    "land_share_to" NUMERIC,
    "trd_type" TEXT,
    "room_cnt" INTEGER,
    "bath_cnt" INTEGER,
    "park_cnt" INTEGER,
    "community_fac" TEXT,
    "feature_note" TEXT,
    "sale_amt_fr" INTEGER,
    "sale_amt_to" INTEGER,
    "les_amt_fr" INTEGER,
    "les_amt_to" INTEGER,
    "prot_amt_fr" INTEGER,
    "prot_amt_to" INTEGER,
    "mon_amt_fr" INTEGER,
    "mon_amt_to" INTEGER,
    "etc_prot_amt_fr" INTEGER,
    "etc_prot_amt_to" INTEGER,
    "etc_mon_amt_fr" INTEGER,
    "etc_mon_amt_to" INTEGER,
    "etc_type" TEXT,
    "cash_ablt" TEXT,
    "movein_yn" TEXT,
    "gap_invest_yn" TEXT,
    "irrelevant_yn" TEXT,
    "move_date_fr" TEXT,
    "move_date_to" TEXT,
    "rmk" TEXT,
    "rnk" TEXT,
    "rt_no" INTEGER,
    "off_no" INTEGER,
    "vendor_id" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "want_sub_type" TEXT,
    "gross_area_fr" NUMERIC,
    "gross_area_to" NUMERIC,
    "area_kind" TEXT,
    "land_share_ratio_fr" NUMERIC,
    "land_share_ratio_to" NUMERIC,
    "area_unit" TEXT,
    "invest_yn" TEXT,
    "child_yn" TEXT,
    "child_cond" TEXT,
    "pet_allow" TEXT,
    "pet_cond" TEXT,
    "opt" TEXT,
    "building_use" TEXT,
    "biz_type" TEXT,
    "elevator_cnt" INTEGER,
    "stair_cnt" INTEGER,
    "city_gas_yn" TEXT,
    "electric_yn" TEXT,
    "elec_capacity" TEXT,
    "access_road" TEXT,
    "land_use" TEXT,
    "land_category" TEXT,
    "contract_date" TEXT,
    "hold_date" TEXT,
    "balc_ext" TEXT,
    "entr_struct" TEXT,
    "building_form" TEXT,
    "build_permit_pref" TEXT
);

CREATE TABLE IF NOT EXISTS "ct_cust_buyer" (
    "cust_no" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT,
    "tel" TEXT,
    "addr" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    PRIMARY KEY ("cust_no", "seq")
);

CREATE TABLE IF NOT EXISTS "ct_cust_buyer_hist" (
    "cust_no" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT,
    "tel" TEXT,
    "addr" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "ct_cust_hist" (
    "cust_no" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "cust_type" INTEGER,
    "tel" TEXT,
    "addr" TEXT,
    "memo" TEXT,
    "rent_bsn_yn" TEXT,
    "trd_prg" TEXT,
    "want_type" TEXT,
    "want_nm" TEXT,
    "exc_area_fr" NUMERIC,
    "exc_area_to" NUMERIC,
    "land_share_fr" NUMERIC,
    "land_share_to" NUMERIC,
    "trd_type" TEXT,
    "room_cnt" INTEGER,
    "bath_cnt" INTEGER,
    "park_cnt" INTEGER,
    "community_fac" TEXT,
    "feature_note" TEXT,
    "sale_amt_fr" INTEGER,
    "sale_amt_to" INTEGER,
    "les_amt_fr" INTEGER,
    "les_amt_to" INTEGER,
    "prot_amt_fr" INTEGER,
    "prot_amt_to" INTEGER,
    "mon_amt_fr" INTEGER,
    "mon_amt_to" INTEGER,
    "etc_prot_amt_fr" INTEGER,
    "etc_prot_amt_to" INTEGER,
    "etc_mon_amt_fr" INTEGER,
    "etc_mon_amt_to" INTEGER,
    "etc_type" TEXT,
    "cash_ablt" TEXT,
    "movein_yn" TEXT,
    "gap_invest_yn" TEXT,
    "irrelevant_yn" TEXT,
    "move_date_fr" TEXT,
    "move_date_to" TEXT,
    "rmk" TEXT,
    "rnk" TEXT,
    "rt_no" INTEGER,
    "off_no" INTEGER,
    "vendor_id" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "want_sub_type" TEXT,
    "gross_area_fr" NUMERIC,
    "gross_area_to" NUMERIC,
    "area_kind" TEXT,
    "land_share_ratio_fr" NUMERIC,
    "land_share_ratio_to" NUMERIC,
    "area_unit" TEXT,
    "invest_yn" TEXT,
    "child_yn" TEXT,
    "child_cond" TEXT,
    "pet_allow" TEXT,
    "pet_cond" TEXT,
    "opt" TEXT,
    "building_use" TEXT,
    "biz_type" TEXT,
    "elevator_cnt" INTEGER,
    "stair_cnt" INTEGER,
    "city_gas_yn" TEXT,
    "electric_yn" TEXT,
    "elec_capacity" TEXT,
    "access_road" TEXT,
    "land_use" TEXT,
    "land_category" TEXT,
    "contract_date" TEXT,
    "hold_date" TEXT,
    "balc_ext" TEXT,
    "entr_struct" TEXT,
    "building_form" TEXT,
    "build_permit_pref" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "ct_interview" (
    "itv_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "itv_type" TEXT NOT NULL,
    "itv_date" TEXT NOT NULL,
    "cust_no" INTEGER,
    "cust_name" TEXT,
    "cust_phone" TEXT,
    "pt_no" INTEGER,
    "itv_content" TEXT,
    "itv_memo" TEXT,
    "rt_no" INTEGER,
    "off_no" INTEGER,
    "vendor_id" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT
);

CREATE TABLE IF NOT EXISTS "ct_interview_hist" (
    "itv_no" INTEGER NOT NULL,
    "itv_type" TEXT NOT NULL,
    "itv_date" TEXT NOT NULL,
    "cust_no" INTEGER,
    "cust_name" TEXT,
    "cust_phone" TEXT,
    "pt_no" INTEGER,
    "itv_content" TEXT,
    "itv_memo" TEXT,
    "rt_no" INTEGER,
    "off_no" INTEGER,
    "vendor_id" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT
);

CREATE TABLE IF NOT EXISTS "ct_trd_area" (
    "cust_no" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "addr1" TEXT,
    "addr2" TEXT,
    "addr3" TEXT,
    "bjd_code" TEXT,
    "bld_nm" TEXT,
    "danji_code" TEXT,
    "detail_loc" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    PRIMARY KEY ("cust_no", "seq")
);

CREATE TABLE IF NOT EXISTS "ct_trd_area_hist" (
    "cust_no" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "addr1" TEXT,
    "addr2" TEXT,
    "addr3" TEXT,
    "bjd_code" TEXT,
    "bld_nm" TEXT,
    "danji_code" TEXT,
    "detail_loc" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "ct_trd_info" (
    "trd_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "trd_prg" TEXT,
    "cust_no" INTEGER,
    "want_type" TEXT,
    "want_nm" TEXT,
    "exc_area_fr" NUMERIC,
    "exc_area_to" NUMERIC,
    "land_share_fr" NUMERIC,
    "land_share_to" NUMERIC,
    "trd_type" TEXT,
    "movein_yn" TEXT,
    "move_date_fr" TEXT,
    "move_date_to" TEXT,
    "cash_ablt" TEXT,
    "sale_amt_fr" INTEGER,
    "sale_amt_to" INTEGER,
    "les_amt_fr" INTEGER,
    "les_amt_to" INTEGER,
    "prot_amt_fr" INTEGER,
    "prot_amt_to" INTEGER,
    "mon_amt_fr" INTEGER,
    "mon_amt_to" INTEGER,
    "etc_prot_amt_fr" INTEGER,
    "etc_prot_amt_to" INTEGER,
    "etc_mon_amt_fr" INTEGER,
    "etc_mon_amt_to" INTEGER,
    "etc_type" TEXT,
    "rnk" TEXT,
    "rt_no" INTEGER,
    "off_no" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT
);

CREATE TABLE IF NOT EXISTS "ct_trd_info_hist" (
    "trd_no" INTEGER NOT NULL,
    "trd_prg" TEXT,
    "cust_no" INTEGER,
    "want_type" TEXT,
    "want_nm" TEXT,
    "exc_area_fr" NUMERIC,
    "exc_area_to" NUMERIC,
    "land_share_fr" NUMERIC,
    "land_share_to" NUMERIC,
    "trd_type" TEXT,
    "movein_yn" TEXT,
    "move_date_fr" TEXT,
    "move_date_to" TEXT,
    "cash_ablt" TEXT,
    "sale_amt_fr" INTEGER,
    "sale_amt_to" INTEGER,
    "les_amt_fr" INTEGER,
    "les_amt_to" INTEGER,
    "prot_amt_fr" INTEGER,
    "prot_amt_to" INTEGER,
    "mon_amt_fr" INTEGER,
    "mon_amt_to" INTEGER,
    "etc_prot_amt_fr" INTEGER,
    "etc_prot_amt_to" INTEGER,
    "etc_mon_amt_fr" INTEGER,
    "etc_mon_amt_to" INTEGER,
    "etc_type" TEXT,
    "rnk" TEXT,
    "rt_no" INTEGER,
    "off_no" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "danji" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "building_code" TEXT,
    "building_name" TEXT,
    "bjd_code" TEXT,
    "address_bunji" TEXT,
    "naver_danji_code" TEXT,
    "family_cnt" INTEGER,
    "max_floor" INTEGER,
    "min_floor" INTEGER,
    "tot_bld_cnt" INTEGER,
    "approve_date" TEXT,
    "heat_type" TEXT,
    "heat_ful" TEXT,
    "is_prk" INTEGER,
    "totprk_cnt" INTEGER,
    "building_closing_rate" TEXT,
    "floor_area_rate" TEXT,
    "map_x" TEXT,
    "map_y" TEXT,
    "hscp_type_code" TEXT,
    "is_service" INTEGER,
    "csco_name" TEXT,
    "reg_date" TEXT,
    "update_date" TEXT,
    "picture_url" TEXT,
    "totprk_cnt_per" NUMERIC,
    "is_active" INTEGER DEFAULT 1,
    "deleted_at" TEXT,
    "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "danji_area_new" (
    "idx" INTEGER,
    "plan_type_name" TEXT,
    "ptp_no" INTEGER,
    "sply_spc" REAL,
    "excls_spc" REAL,
    "ctrt_spc" REAL,
    "in_use" TEXT,
    "naver_danji_code" INTEGER,
    "reg_date" TEXT,
    "update_date" TEXT,
    "room_cnt" INTEGER,
    "bathroom_cnt" INTEGER
);

CREATE TABLE IF NOT EXISTS "danji_dong_new" (
    "dong_name" TEXT,
    "naver_danji_code" INTEGER,
    "dong_no" INTEGER,
    "highest_floor_cnt" INTEGER,
    "direction_type_code" TEXT,
    "entrance_type_cd" TEXT,
    "in_use" TEXT,
    "reg_date" TEXT,
    "update_date" TEXT
);

CREATE TABLE IF NOT EXISTS "danji_ho_new" (
    "dong_no" INTEGER,
    "naver_danji_code" INTEGER,
    "ho_name" TEXT,
    "ptp_no" INTEGER,
    "ho_number" INTEGER,
    "floor" TEXT,
    "sply_spc" REAL,
    "excls_spc" REAL,
    "ctrt_spc" REAL,
    "reg_date" TEXT,
    "update_date" TEXT,
    "ptp_name" TEXT,
    "piloti_yn" TEXT,
    "line_no" TEXT,
    "store_yn" TEXT DEFAULT 0,
    "ho_gubun" TEXT
);

CREATE TABLE IF NOT EXISTS "danji_occupancy" (
    "occ_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "off_no" INTEGER NOT NULL,
    "naver_danji_code" INTEGER NOT NULL,
    "dong_no" INTEGER NOT NULL,
    "ho_number" INTEGER NOT NULL,
    "floor" TEXT,
    "occupancy_status" TEXT,
    "occupancy_name" TEXT,
    "occupancy_phone" TEXT,
    "memo" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    CONSTRAINT "uq_danji_occupancy" UNIQUE ("off_no", "naver_danji_code", "dong_no", "ho_number")
);

CREATE TABLE IF NOT EXISTS "hjd_bjd" (
    "idx" INTEGER PRIMARY KEY AUTOINCREMENT,
    "hjd_code" TEXT NOT NULL,
    "sido_name" TEXT,
    "sigungu_name" TEXT,
    "sigungu_name2" TEXT,
    "hjd_name" TEXT,
    "bjd_code" TEXT NOT NULL,
    "bjd_name" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "is_sigungu" INTEGER,
    "map_x" TEXT,
    "map_y" TEXT,
    "hjd_code_kosis" TEXT,
    "bjd_code_rprst" TEXT,
    "sido_name_short" TEXT,
    "sort" INTEGER,
    "is_active" INTEGER DEFAULT 1,
    "deleted_at" TEXT,
    "insert_date" TEXT DEFAULT CURRENT_TIMESTAMP,
    "update_date" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "membership_history" (
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "off_no" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'DAY',
    "add_days" INTEGER NOT NULL DEFAULT 0,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memo" TEXT
);

CREATE TABLE IF NOT EXISTS "membership_product" (
    "prod_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "prod_name" TEXT NOT NULL,
    "pc_cnt" INTEGER NOT NULL DEFAULT 0,
    "mob_cnt" INTEGER NOT NULL DEFAULT 0,
    "acct_cnt" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL DEFAULT 0,
    "descr" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_dt" TEXT,
    "period_months" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "nt_event" (
    "event_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "image_url" TEXT,
    "link_url" TEXT,
    "view_count" INTEGER DEFAULT 0,
    "is_public" TEXT DEFAULT 'Y',
    "is_popup" TEXT DEFAULT 'N',
    "popup_w" INTEGER,
    "popup_h" INTEGER,
    "start_date" TEXT,
    "end_date" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "reg_id" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "mod_id" TEXT,
    "mod_dt" TEXT,
    "show_on_dashboard" TEXT DEFAULT 'Y',
    "is_participatory" TEXT DEFAULT 'N'
);

CREATE TABLE IF NOT EXISTS "nt_event_entry" (
    "entry_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "event_id" INTEGER NOT NULL,
    "off_no" INTEGER,
    "rt_no" INTEGER,
    "user_id" TEXT,
    "user_nm" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "admin_memo" TEXT,
    "confirmed_by" TEXT,
    "confirmed_dt" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_seen" TEXT NOT NULL DEFAULT 'N'
);

CREATE TABLE IF NOT EXISTS "nt_notice" (
    "notice_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "view_count" INTEGER DEFAULT 0,
    "is_top" TEXT DEFAULT 'N',
    "is_public" TEXT DEFAULT 'Y',
    "attach_file" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "reg_id" TEXT NOT NULL,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "mod_id" TEXT,
    "mod_dt" TEXT,
    "is_popup" TEXT DEFAULT 'N',
    "popup_w" INTEGER,
    "popup_h" INTEGER,
    "show_on_dashboard" TEXT DEFAULT 'Y'
);

CREATE TABLE IF NOT EXISTS "ofc_non_shared" (
    "non_idx" INTEGER PRIMARY KEY AUTOINCREMENT,
    "off_no" INTEGER,
    "off_nm" TEXT,
    "addr" TEXT,
    "rps_nm" TEXT,
    "rps_phone" TEXT,
    "off_tel" TEXT,
    "off_fax" TEXT,
    "reg_no" TEXT,
    "biz_no" TEXT,
    "pt_no" INTEGER,
    "cust_no" INTEGER,
    "regist_date" TEXT,
    "lift_date" TEXT,
    "reason" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT
);

CREATE TABLE IF NOT EXISTS "ofc_non_shared_hist" (
    "non_idx" INTEGER NOT NULL,
    "off_no" INTEGER,
    "off_nm" TEXT,
    "addr" TEXT,
    "rps_nm" TEXT,
    "rps_phone" TEXT,
    "off_tel" TEXT,
    "off_fax" TEXT,
    "reg_no" TEXT,
    "biz_no" TEXT,
    "pt_no" INTEGER,
    "cust_no" INTEGER,
    "regist_date" TEXT,
    "lift_date" TEXT,
    "reason" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "ofc_realter_office" (
    "OffNo" INTEGER PRIMARY KEY AUTOINCREMENT,
    "OffNm" TEXT,
    "Addr" TEXT,
    "RpsNm" TEXT,
    "RpsPhone" TEXT,
    "OffTel" TEXT,
    "OffFax" TEXT,
    "RegNo" TEXT,
    "BizNo" TEXT,
    "RegDt" TEXT,
    "RegId" TEXT,
    "UpdDt" TEXT,
    "UpdId" TEXT,
    "AllowIp" TEXT,
    "Greeting" TEXT,
    "UseYn" TEXT DEFAULT 'Y'
);

CREATE TABLE IF NOT EXISTS "ofc_realter_office_hist" (
    "OffNo" INTEGER NOT NULL,
    "OffNm" TEXT,
    "Addr" TEXT,
    "RpsNm" TEXT,
    "RpsPhone" TEXT,
    "OffTel" TEXT,
    "OffFax" TEXT,
    "RegNo" TEXT,
    "BizNo" TEXT,
    "RegDt" TEXT,
    "RegId" TEXT,
    "UpdDt" TEXT,
    "UpdId" TEXT,
    "AllowIp" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT,
    "Greeting" TEXT
);

CREATE TABLE IF NOT EXISTS "office_entry_fee" (
    "off_no" INTEGER NOT NULL,
    "paid_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_key" TEXT,
    "amount" INTEGER,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("off_no")
);

CREATE TABLE IF NOT EXISTS "office_membership" (
    "off_no" INTEGER NOT NULL,
    "prod_id" INTEGER NOT NULL,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_dt" TEXT,
    PRIMARY KEY ("off_no"),
    CONSTRAINT "office_membership_prod_id_fkey" FOREIGN KEY (prod_id) REFERENCES membership_product(prod_id)
);

CREATE TABLE IF NOT EXISTS "payment_history" (
    "pay_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "off_no" INTEGER,
    "rt_no" INTEGER,
    "user_id" TEXT,
    "order_id" TEXT NOT NULL,
    "order_name" TEXT,
    "payment_key" TEXT,
    "prod_id" INTEGER,
    "prod_name" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT,
    "status" TEXT NOT NULL,
    "card_company" TEXT,
    "card_number" TEXT,
    "approved_at" TEXT,
    "receipt_url" TEXT,
    "fail_code" TEXT,
    "fail_msg" TEXT,
    "response_body" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pt_land_additional" (
    "land_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "pt_no" INTEGER NOT NULL,
    "seq" INTEGER,
    "dong" TEXT,
    "jibun" TEXT,
    "land_area" NUMERIC,
    "land_category" TEXT,
    "land_use" TEXT,
    "other_restrictions" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "soji" TEXT,
    "bjd_code" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_land_additional_hist" (
    "land_id" INTEGER NOT NULL,
    "pt_no" INTEGER NOT NULL,
    "seq" INTEGER,
    "dong" TEXT,
    "jibun" TEXT,
    "land_area" NUMERIC,
    "land_category" TEXT,
    "land_use" TEXT,
    "other_restrictions" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT,
    "soji" TEXT,
    "bjd_code" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_lease_status" (
    "lease_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "pt_no" INTEGER NOT NULL,
    "seq" INTEGER,
    "room_no" TEXT,
    "area" NUMERIC,
    "cur_status" TEXT,
    "deposit" INTEGER,
    "monthly_rent" INTEGER,
    "maint_cost" INTEGER,
    "contract_start" TEXT,
    "contract_end" TEXT,
    "business_type" TEXT,
    "business_name" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_lease_status_hist" (
    "lease_id" INTEGER NOT NULL,
    "pt_no" INTEGER NOT NULL,
    "seq" INTEGER,
    "room_no" TEXT,
    "area" NUMERIC,
    "cur_status" TEXT,
    "deposit" INTEGER,
    "monthly_rent" INTEGER,
    "maint_cost" INTEGER,
    "contract_start" TEXT,
    "contract_end" TEXT,
    "business_type" TEXT,
    "business_name" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_memo" (
    "memo_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "pt_no" INTEGER,
    "memo_date" TEXT NOT NULL,
    "memo_content" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reg_id" TEXT NOT NULL,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    "cust_no" INTEGER,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    CONSTRAINT "ck_pt_memo_owner" CHECK ((((pt_no IS NOT NULL) + (cust_no IS NOT NULL)) = 1))
);

CREATE TABLE IF NOT EXISTS "pt_memo_hist" (
    "memo_no" INTEGER NOT NULL,
    "pt_no" INTEGER,
    "memo_date" TEXT NOT NULL,
    "memo_content" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reg_id" TEXT NOT NULL,
    "reg_dt" TEXT NOT NULL,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    "cust_no" INTEGER,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_occupancy" (
    "occupancy_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "naver_danji_code" INTEGER NOT NULL,
    "dong_no" INTEGER NOT NULL,
    "ho_number" INTEGER NOT NULL,
    "floor" TEXT,
    "occupancy_status" TEXT NOT NULL DEFAULT 'NEED_CHECK',
    "custom_status" TEXT,
    "occupancy_name" TEXT,
    "occupancy_phone" TEXT,
    "memo" TEXT,
    "crt_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "crt_id" TEXT,
    "upd_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    CONSTRAINT "uk_pt_occupancy_danji_dong_ho" UNIQUE ("naver_danji_code", "dong_no", "ho_number")
);

CREATE TABLE IF NOT EXISTS "pt_occupancy_hist" (
    "occupancy_no" INTEGER NOT NULL,
    "naver_danji_code" INTEGER NOT NULL,
    "dong_no" INTEGER NOT NULL,
    "ho_number" INTEGER NOT NULL,
    "floor" TEXT,
    "occupancy_status" TEXT NOT NULL,
    "custom_status" TEXT,
    "occupancy_name" TEXT,
    "occupancy_phone" TEXT,
    "memo" TEXT,
    "crt_dt" TEXT,
    "crt_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_sale" (
    "pt_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "pt_name" TEXT,
    "pt_sts" TEXT,
    "pt_type" TEXT,
    "pt_expl" TEXT,
    "sale_div" TEXT,
    "addr1" TEXT,
    "addr2" TEXT,
    "addr3" TEXT,
    "addr4" TEXT,
    "addr5" TEXT,
    "addr_post" TEXT,
    "bjd_code" TEXT,
    "danji_code" TEXT,
    "dong" TEXT,
    "ho" TEXT,
    "floor" INTEGER,
    "opt" TEXT,
    "house_cnt" INTEGER,
    "apt_typ" TEXT,
    "sup_area" NUMERIC,
    "exc_area" NUMERIC,
    "land_share" NUMERIC,
    "room_cnt" INTEGER,
    "bath_cnt" INTEGER,
    "dir_std" TEXT,
    "heat_method" TEXT,
    "heat_fuel" TEXT,
    "entr_struct" TEXT,
    "buid_struct" TEXT,
    "balc_ext" TEXT,
    "floor1" INTEGER,
    "floor2" INTEGER,
    "pk_cnt" NUMERIC,
    "maint_cost" INTEGER,
    "maint_dtl" TEXT,
    "sale_amt" INTEGER,
    "les_amt" INTEGER,
    "prot_amt" INTEGER,
    "mon_amt" INTEGER,
    "etc_amt" INTEGER,
    "lay_amt" INTEGER,
    "now_dep_amt" INTEGER,
    "now_mon_amt" INTEGER,
    "loan_amt" INTEGER,
    "loan_amt_aft" INTEGER,
    "mtry_date" TEXT,
    "expt_mov_date" TEXT,
    "expt_date" TEXT,
    "expt_com_date" TEXT,
    "comp_year" TEXT,
    "sha_yn" TEXT,
    "cust_no" INTEGER,
    "off_no" INTEGER,
    "rt_no" TEXT,
    "cn_no" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "mvn_psb_yn" TEXT,
    "house_rental" TEXT,
    "pet_yn" TEXT,
    "top" TEXT,
    "pt_memo" TEXT,
    "business_type" TEXT,
    "business_name" TEXT,
    "bal_date" TEXT,
    "registry_owner" TEXT,
    "contract_tenant" TEXT,
    "etc_amt2" INTEGER,
    "child_yn" TEXT,
    "pet_allow" TEXT,
    "pet_cond" TEXT,
    "lend_amt" INTEGER,
    "lend_amt_aft" INTEGER,
    "dep_loan_bank" TEXT,
    "dep_loan_amt" INTEGER,
    "past_data_yn" TEXT,
    "child_cond" TEXT,
    "etc_lease_type" TEXT,
    "land_use" TEXT,
    "building_use" TEXT,
    "land_category" TEXT,
    "other_restrictions" TEXT,
    "contract_renewal_right" TEXT,
    "housing_rental_business" TEXT,
    "current_status" TEXT,
    "jibun" TEXT,
    "contract_date" TEXT,
    "hold_date" TEXT,
    "dir_base" TEXT,
    "gross_area" NUMERIC,
    "building_area" NUMERIC,
    "land_share_ratio" NUMERIC,
    "facility_cost" INTEGER,
    "elevator_cnt" INTEGER,
    "stairs_cnt" INTEGER,
    "recommended_business" TEXT,
    "sub_type" TEXT,
    "building_form" TEXT,
    "main_building_use" TEXT,
    "community_facility" TEXT,
    "basement_floor" INTEGER,
    "ground_floor" INTEGER,
    "addr_detail" TEXT,
    "guest_room_cnt" INTEGER,
    "access_road" NUMERIC,
    "office_area" NUMERIC,
    "toilet" TEXT,
    "presale_amt" INTEGER,
    "expansion_amt" INTEGER,
    "option_amt" INTEGER,
    "premium_amt" INTEGER,
    "deposit_total" INTEGER,
    "loan_total" INTEGER,
    "invest_amt" INTEGER,
    "inc_rent_m" INTEGER,
    "inc_rent_y" INTEGER,
    "inc_mgmt_m" INTEGER,
    "inc_mgmt_y" INTEGER,
    "inc_etc_m" INTEGER,
    "inc_etc_y" INTEGER,
    "exp_labor_m" INTEGER,
    "exp_labor_y" INTEGER,
    "exp_util_m" INTEGER,
    "exp_util_y" INTEGER,
    "exp_loan_m" INTEGER,
    "exp_loan_y" INTEGER,
    "exp_etc_m" INTEGER,
    "exp_etc_y" INTEGER,
    "zone_adjust" INTEGER,
    "zone_overheat" INTEGER,
    "zone_spec" INTEGER,
    "zone_land_permit" INTEGER,
    "build_permit" INTEGER,
    "permit_date" TEXT,
    "road_info" NUMERIC,
    "zone_dev_restrict" INTEGER,
    "right_surface" INTEGER,
    "right_grave" INTEGER,
    "right_easement" INTEGER,
    "former_area" NUMERIC,
    "add_contrib_amt" INTEGER,
    "right_value_amt" INTEGER,
    "moving_cost" INTEGER,
    "former_pt_type" TEXT,
    "former_bjd_code" TEXT,
    "former_addr1" TEXT,
    "former_addr2" TEXT,
    "former_addr3" TEXT,
    "former_jibun" TEXT,
    "former_dong" TEXT,
    "former_ho" TEXT,
    "former_danji_code" TEXT,
    "former_apt_typ" TEXT,
    "former_sup_area" NUMERIC,
    "former_exc_area" NUMERIC,
    "former_total_floor_area" NUMERIC,
    "former_land_area" NUMERIC,
    "former_land_share_ratio" NUMERIC,
    "former_addr4" TEXT,
    "former_addr5" TEXT,
    "city_gas" TEXT,
    "power_receiving" TEXT,
    "elec_capacity" TEXT,
    "ev_charger_cnt" INTEGER,
    "maint_zone_name" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_sale_hist" (
    "pt_no" INTEGER NOT NULL,
    "pt_name" TEXT,
    "pt_sts" TEXT,
    "pt_type" TEXT,
    "pt_expl" TEXT,
    "sale_div" TEXT,
    "addr1" TEXT,
    "addr2" TEXT,
    "addr3" TEXT,
    "addr4" TEXT,
    "addr5" TEXT,
    "addr_post" TEXT,
    "bjd_code" TEXT,
    "danji_code" TEXT,
    "dong" TEXT,
    "ho" TEXT,
    "floor" INTEGER,
    "opt" TEXT,
    "house_cnt" INTEGER,
    "apt_typ" TEXT,
    "sup_area" NUMERIC,
    "exc_area" NUMERIC,
    "land_share" NUMERIC,
    "room_cnt" INTEGER,
    "bath_cnt" INTEGER,
    "dir_std" TEXT,
    "heat_method" TEXT,
    "heat_fuel" TEXT,
    "entr_struct" TEXT,
    "buid_struct" TEXT,
    "balc_ext" TEXT,
    "floor1" INTEGER,
    "floor2" INTEGER,
    "pk_cnt" NUMERIC,
    "maint_cost" INTEGER,
    "maint_dtl" TEXT,
    "sale_amt" INTEGER,
    "les_amt" INTEGER,
    "prot_amt" INTEGER,
    "mon_amt" INTEGER,
    "etc_amt" INTEGER,
    "lay_amt" INTEGER,
    "now_dep_amt" INTEGER,
    "now_mon_amt" INTEGER,
    "loan_amt" INTEGER,
    "loan_amt_aft" INTEGER,
    "mtry_date" TEXT,
    "expt_mov_date" TEXT,
    "expt_date" TEXT,
    "expt_com_date" TEXT,
    "comp_year" TEXT,
    "sha_yn" TEXT,
    "cust_no" INTEGER,
    "off_no" INTEGER,
    "rt_no" TEXT,
    "cn_no" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "mvn_psb_yn" TEXT,
    "house_rental" TEXT,
    "pet_yn" TEXT,
    "top" TEXT,
    "pt_memo" TEXT,
    "business_type" TEXT,
    "business_name" TEXT,
    "bal_date" TEXT,
    "registry_owner" TEXT,
    "contract_tenant" TEXT,
    "etc_amt2" INTEGER,
    "child_yn" TEXT,
    "pet_allow" TEXT,
    "pet_cond" TEXT,
    "lend_amt" INTEGER,
    "lend_amt_aft" INTEGER,
    "dep_loan_bank" TEXT,
    "dep_loan_amt" INTEGER,
    "past_data_yn" TEXT,
    "child_cond" TEXT,
    "etc_lease_type" TEXT,
    "land_use" TEXT,
    "building_use" TEXT,
    "land_category" TEXT,
    "other_restrictions" TEXT,
    "contract_renewal_right" TEXT,
    "housing_rental_business" TEXT,
    "current_status" TEXT,
    "jibun" TEXT,
    "contract_date" TEXT,
    "hold_date" TEXT,
    "dir_base" TEXT,
    "gross_area" NUMERIC,
    "building_area" NUMERIC,
    "land_share_ratio" NUMERIC,
    "facility_cost" INTEGER,
    "elevator_cnt" INTEGER,
    "stairs_cnt" INTEGER,
    "recommended_business" TEXT,
    "sub_type" TEXT,
    "building_form" TEXT,
    "main_building_use" TEXT,
    "community_facility" TEXT,
    "basement_floor" INTEGER,
    "ground_floor" INTEGER,
    "addr_detail" TEXT,
    "guest_room_cnt" INTEGER,
    "access_road" NUMERIC,
    "office_area" NUMERIC,
    "toilet" TEXT,
    "presale_amt" INTEGER,
    "expansion_amt" INTEGER,
    "option_amt" INTEGER,
    "premium_amt" INTEGER,
    "deposit_total" INTEGER,
    "loan_total" INTEGER,
    "invest_amt" INTEGER,
    "inc_rent_m" INTEGER,
    "inc_rent_y" INTEGER,
    "inc_mgmt_m" INTEGER,
    "inc_mgmt_y" INTEGER,
    "inc_etc_m" INTEGER,
    "inc_etc_y" INTEGER,
    "exp_labor_m" INTEGER,
    "exp_labor_y" INTEGER,
    "exp_util_m" INTEGER,
    "exp_util_y" INTEGER,
    "exp_loan_m" INTEGER,
    "exp_loan_y" INTEGER,
    "exp_etc_m" INTEGER,
    "exp_etc_y" INTEGER,
    "zone_adjust" INTEGER,
    "zone_overheat" INTEGER,
    "zone_spec" INTEGER,
    "zone_land_permit" INTEGER,
    "build_permit" INTEGER,
    "permit_date" TEXT,
    "road_info" NUMERIC,
    "zone_dev_restrict" INTEGER,
    "right_surface" INTEGER,
    "right_grave" INTEGER,
    "right_easement" INTEGER,
    "former_area" NUMERIC,
    "add_contrib_amt" INTEGER,
    "right_value_amt" INTEGER,
    "moving_cost" INTEGER,
    "former_pt_type" TEXT,
    "former_bjd_code" TEXT,
    "former_addr1" TEXT,
    "former_addr2" TEXT,
    "former_addr3" TEXT,
    "former_jibun" TEXT,
    "former_dong" TEXT,
    "former_ho" TEXT,
    "former_danji_code" TEXT,
    "former_apt_typ" TEXT,
    "former_sup_area" NUMERIC,
    "former_exc_area" NUMERIC,
    "former_total_floor_area" NUMERIC,
    "former_land_area" NUMERIC,
    "former_land_share_ratio" NUMERIC,
    "former_addr4" TEXT,
    "former_addr5" TEXT,
    "city_gas" TEXT,
    "power_receiving" TEXT,
    "elec_capacity" TEXT,
    "ev_charger_cnt" INTEGER,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT,
    "maint_zone_name" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_sale_holder" (
    "pt_no" INTEGER NOT NULL,
    "holder_idx" INTEGER NOT NULL,
    "holder_reg_date" TEXT,
    "holder_name" TEXT,
    "holder_phone" TEXT,
    "cust_no" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "holder_relation" TEXT,
    "holder_memo" TEXT,
    "holder_type" TEXT,
    "holder_address" TEXT,
    PRIMARY KEY ("pt_no", "holder_idx")
);

CREATE TABLE IF NOT EXISTS "pt_sale_holder_hist" (
    "pt_no" INTEGER NOT NULL,
    "holder_idx" INTEGER NOT NULL,
    "holder_reg_date" TEXT,
    "holder_name" TEXT,
    "holder_phone" TEXT,
    "cust_no" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "holder_relation" TEXT,
    "holder_memo" TEXT,
    "holder_type" TEXT,
    "holder_address" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_sale_old" (
    "org_pt_no" INTEGER,
    "archived_dt" TEXT,
    "pt_no" INTEGER NOT NULL,
    "pt_name" TEXT,
    "pt_sts" TEXT,
    "pt_type" TEXT,
    "pt_expl" TEXT,
    "sale_div" TEXT,
    "addr1" TEXT,
    "addr2" TEXT,
    "addr3" TEXT,
    "addr4" TEXT,
    "addr5" TEXT,
    "addr_post" TEXT,
    "bjd_code" TEXT,
    "danji_code" TEXT,
    "dong" TEXT,
    "ho" TEXT,
    "floor" INTEGER,
    "opt" TEXT,
    "house_cnt" INTEGER,
    "apt_typ" TEXT,
    "sup_area" NUMERIC,
    "exc_area" NUMERIC,
    "land_share" NUMERIC,
    "room_cnt" INTEGER,
    "bath_cnt" INTEGER,
    "dir_std" TEXT,
    "heat_method" TEXT,
    "heat_fuel" TEXT,
    "entr_struct" TEXT,
    "buid_struct" TEXT,
    "balc_ext" TEXT,
    "floor1" INTEGER,
    "floor2" INTEGER,
    "pk_cnt" NUMERIC,
    "maint_cost" INTEGER,
    "maint_dtl" TEXT,
    "sale_amt" INTEGER,
    "les_amt" INTEGER,
    "prot_amt" INTEGER,
    "mon_amt" INTEGER,
    "etc_amt" INTEGER,
    "lay_amt" INTEGER,
    "now_dep_amt" INTEGER,
    "now_mon_amt" INTEGER,
    "loan_amt" INTEGER,
    "loan_amt_aft" INTEGER,
    "mtry_date" TEXT,
    "expt_mov_date" TEXT,
    "expt_date" TEXT,
    "expt_com_date" TEXT,
    "comp_year" TEXT,
    "sha_yn" TEXT,
    "cust_no" INTEGER,
    "off_no" INTEGER,
    "rt_no" TEXT,
    "cn_no" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "mvn_psb_yn" TEXT,
    "house_rental" TEXT,
    "pet_yn" TEXT,
    "top" TEXT,
    "pt_memo" TEXT,
    "business_type" TEXT,
    "business_name" TEXT,
    "bal_date" TEXT,
    "registry_owner" TEXT,
    "contract_tenant" TEXT,
    "etc_amt2" INTEGER,
    "child_yn" TEXT,
    "pet_allow" TEXT,
    "pet_cond" TEXT,
    "lend_amt" INTEGER,
    "lend_amt_aft" INTEGER,
    "dep_loan_bank" TEXT,
    "dep_loan_amt" INTEGER,
    "past_data_yn" TEXT,
    "child_cond" TEXT,
    "etc_lease_type" TEXT,
    "land_use" TEXT,
    "building_use" TEXT,
    "land_category" TEXT,
    "other_restrictions" TEXT,
    "contract_renewal_right" TEXT,
    "housing_rental_business" TEXT,
    "current_status" TEXT,
    "jibun" TEXT,
    "contract_date" TEXT,
    "hold_date" TEXT,
    "dir_base" TEXT,
    "gross_area" NUMERIC,
    "building_area" NUMERIC,
    "land_share_ratio" NUMERIC,
    "facility_cost" INTEGER,
    "elevator_cnt" INTEGER,
    "stairs_cnt" INTEGER,
    "recommended_business" TEXT,
    "sub_type" TEXT,
    "building_form" TEXT,
    "main_building_use" TEXT,
    "community_facility" TEXT,
    "basement_floor" INTEGER,
    "ground_floor" INTEGER,
    "addr_detail" TEXT,
    "guest_room_cnt" INTEGER,
    "access_road" NUMERIC,
    "office_area" NUMERIC,
    "toilet" TEXT,
    "presale_amt" INTEGER,
    "expansion_amt" INTEGER,
    "option_amt" INTEGER,
    "premium_amt" INTEGER,
    "deposit_total" INTEGER,
    "loan_total" INTEGER,
    "invest_amt" INTEGER,
    "inc_rent_m" INTEGER,
    "inc_rent_y" INTEGER,
    "inc_mgmt_m" INTEGER,
    "inc_mgmt_y" INTEGER,
    "inc_etc_m" INTEGER,
    "inc_etc_y" INTEGER,
    "exp_labor_m" INTEGER,
    "exp_labor_y" INTEGER,
    "exp_util_m" INTEGER,
    "exp_util_y" INTEGER,
    "exp_loan_m" INTEGER,
    "exp_loan_y" INTEGER,
    "exp_etc_m" INTEGER,
    "exp_etc_y" INTEGER,
    "zone_adjust" INTEGER,
    "zone_overheat" INTEGER,
    "zone_spec" INTEGER,
    "zone_land_permit" INTEGER,
    "build_permit" INTEGER,
    "permit_date" TEXT,
    "road_info" NUMERIC,
    "zone_dev_restrict" INTEGER,
    "right_surface" INTEGER,
    "right_grave" INTEGER,
    "right_easement" INTEGER,
    "former_area" NUMERIC,
    "add_contrib_amt" INTEGER,
    "right_value_amt" INTEGER,
    "moving_cost" INTEGER,
    "former_pt_type" TEXT,
    "former_bjd_code" TEXT,
    "former_addr1" TEXT,
    "former_addr2" TEXT,
    "former_addr3" TEXT,
    "former_jibun" TEXT,
    "former_dong" TEXT,
    "former_ho" TEXT,
    "former_danji_code" TEXT,
    "former_apt_typ" TEXT,
    "former_sup_area" NUMERIC,
    "former_exc_area" NUMERIC,
    "former_total_floor_area" NUMERIC,
    "former_land_area" NUMERIC,
    "former_land_share_ratio" NUMERIC,
    "ev_charger_cnt" INTEGER,
    "maint_zone_name" TEXT
);

CREATE TABLE IF NOT EXISTS "pt_sale_old_bak" (
    "pt_no" INTEGER NOT NULL,
    "pt_name" TEXT,
    "pt_sts" TEXT,
    "pt_type" TEXT,
    "pt_expl" TEXT,
    "sale_div" TEXT,
    "addr1" TEXT,
    "addr2" TEXT,
    "addr3" TEXT,
    "addr4" TEXT,
    "addr5" TEXT,
    "addr_post" TEXT,
    "bjd_code" TEXT,
    "danji_code" TEXT,
    "dong" TEXT,
    "ho" TEXT,
    "floor" INTEGER,
    "opt" TEXT,
    "house_cnt" INTEGER,
    "apt_typ" TEXT,
    "sup_area" NUMERIC,
    "exc_area" NUMERIC,
    "land_share" NUMERIC,
    "room_cnt" INTEGER,
    "bath_cnt" INTEGER,
    "dir_std" TEXT,
    "heat_method" TEXT,
    "heat_fuel" TEXT,
    "entr_struct" TEXT,
    "buid_struct" TEXT,
    "balc_ext" TEXT,
    "floor1" INTEGER,
    "floor2" INTEGER,
    "pk_cnt" NUMERIC,
    "maint_cost" INTEGER,
    "maint_dtl" TEXT,
    "sale_amt" INTEGER,
    "les_amt" INTEGER,
    "prot_amt" INTEGER,
    "mon_amt" INTEGER,
    "etc_amt" INTEGER,
    "lay_amt" INTEGER,
    "now_dep_amt" INTEGER,
    "now_mon_amt" INTEGER,
    "loan_amt" INTEGER,
    "loan_amt_aft" INTEGER,
    "mtry_date" TEXT,
    "expt_mov_date" TEXT,
    "expt_date" TEXT,
    "expt_com_date" TEXT,
    "comp_year" TEXT,
    "sha_yn" TEXT,
    "cust_no" INTEGER,
    "off_no" INTEGER,
    "rt_no" TEXT,
    "cn_no" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "mvn_psb_yn" TEXT,
    "house_rental" TEXT,
    "pet_yn" TEXT,
    "top" TEXT,
    "pt_memo" TEXT,
    "business_type" TEXT,
    "business_name" TEXT,
    "bal_date" TEXT,
    "registry_owner" TEXT,
    "contract_tenant" TEXT,
    "etc_amt2" INTEGER,
    "child_yn" TEXT,
    "pet_allow" TEXT,
    "pet_cond" TEXT,
    "lend_amt" INTEGER,
    "lend_amt_aft" INTEGER,
    "dep_loan_bank" TEXT,
    "dep_loan_amt" INTEGER,
    "past_data_yn" TEXT,
    "org_pt_no" INTEGER,
    "archived_dt" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pt_share" (
    "pt_no" INTEGER,
    "share_idx" INTEGER NOT NULL,
    "office_name" TEXT,
    "region_name" TEXT,
    "office_phone" TEXT,
    "memo" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "share_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "cust_no" INTEGER,
    "share_date" TEXT,
    CONSTRAINT "ck_pt_share_owner" CHECK ((((pt_no IS NOT NULL) + (cust_no IS NOT NULL)) = 1))
);

CREATE TABLE IF NOT EXISTS "pt_share_hist" (
    "pt_no" INTEGER,
    "share_idx" INTEGER NOT NULL,
    "office_name" TEXT,
    "region_name" TEXT,
    "office_phone" TEXT,
    "memo" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "share_no" INTEGER NOT NULL,
    "cust_no" INTEGER,
    "share_date" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "referral_benefits" (
    "rb_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "rt_no" INTEGER NOT NULL,
    "referred_rt_no" INTEGER NOT NULL,
    "referred_rt_nm" TEXT,
    "referred_reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "free_days" INTEGER DEFAULT 30,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "mod_dt" TEXT
);

CREATE TABLE IF NOT EXISTS "referral_code_prefix" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "prefix" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT,
    "memo" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    "upd_dt" TEXT
);

CREATE TABLE IF NOT EXISTS "report" (
    "report_no" INTEGER PRIMARY KEY AUTOINCREMENT,
    "pt_no" INTEGER,
    "title" TEXT,
    "comment" TEXT,
    "snapshot" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "content_html" TEXT
);

CREATE TABLE IF NOT EXISTS "report_cust" (
    "report_no" INTEGER NOT NULL,
    "cust_no" INTEGER NOT NULL,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    PRIMARY KEY ("report_no", "cust_no")
);

CREATE TABLE IF NOT EXISTS "rt_bulk_request" (
    "req_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT,
    "off_no" INTEGER,
    "category" TEXT,
    "title" TEXT,
    "content" TEXT,
    "office_name" TEXT,
    "office_tel" TEXT,
    "office_addr" TEXT,
    "agent_name" TEXT,
    "agent_grade" TEXT,
    "agent_phone" TEXT,
    "status" TEXT NOT NULL DEFAULT '접수',
    "answer" TEXT,
    "answer_id" TEXT,
    "answer_dt" TEXT,
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_login_log" (
    "log_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT,
    "login_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "user_agent" TEXT,
    "login_type" TEXT,
    "login_cnt" INTEGER NOT NULL DEFAULT 1,
    "first_login_dt" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_main_region" (
    "region_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "off_no" INTEGER,
    "rt_no" TEXT,
    "bjd_code" TEXT NOT NULL,
    "region_name" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    CONSTRAINT "uq_rt_main_region" UNIQUE ("off_no", "rt_no", "bjd_code")
);

CREATE TABLE IF NOT EXISTS "rt_menu_perm" (
    "rt_no" INTEGER NOT NULL,
    "menu_key" TEXT NOT NULL,
    "allowed" TEXT NOT NULL DEFAULT 'Y',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_dt" TEXT,
    PRIMARY KEY ("rt_no", "menu_key")
);

CREATE TABLE IF NOT EXISTS "rt_menu_perm_hist" (
    "rt_no" INTEGER NOT NULL,
    "menu_key" TEXT NOT NULL,
    "allowed" TEXT NOT NULL,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL,
    "upd_dt" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_note" (
    "note_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "sender_id" TEXT,
    "sender_name" TEXT,
    "receiver_id" TEXT NOT NULL,
    "receiver_name" TEXT,
    "title" TEXT,
    "content" TEXT,
    "ref_trade_id" INTEGER,
    "is_read" TEXT DEFAULT 'N',
    "read_dt" TEXT,
    "sender_del" TEXT DEFAULT 'N',
    "receiver_del" TEXT DEFAULT 'N',
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "rt_note_hist" (
    "note_id" INTEGER NOT NULL,
    "sender_id" TEXT,
    "sender_name" TEXT,
    "receiver_id" TEXT NOT NULL,
    "receiver_name" TEXT,
    "title" TEXT,
    "content" TEXT,
    "ref_trade_id" INTEGER,
    "is_read" TEXT,
    "read_dt" TEXT,
    "sender_del" TEXT,
    "receiver_del" TEXT,
    "reg_dt" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_note_share" (
    "off_no" INTEGER NOT NULL,
    "owner_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "share" TEXT NOT NULL DEFAULT 'N',
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "upd_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("off_no", "owner_id", "partner_id")
);

CREATE TABLE IF NOT EXISTS "rt_note_share_hist" (
    "off_no" INTEGER NOT NULL,
    "owner_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "share" TEXT NOT NULL,
    "reg_dt" TEXT,
    "upd_dt" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_office_block" (
    "block_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "off_no" INTEGER NOT NULL,
    "my_reg_no" TEXT,
    "blocked_reg_no" TEXT NOT NULL,
    "blocked_nm" TEXT,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "reg_id" TEXT,
    CONSTRAINT "rt_office_block_off_no_blocked_reg_no_key" UNIQUE ("off_no", "blocked_reg_no")
);

CREATE TABLE IF NOT EXISTS "rt_payment_token" (
    "token" TEXT NOT NULL,
    "rt_no" INTEGER NOT NULL,
    "off_no" INTEGER,
    "expires_at" TEXT NOT NULL,
    "used_yn" TEXT NOT NULL DEFAULT 'N',
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("token")
);

CREATE TABLE IF NOT EXISTS "rt_realtor_info" (
    "RtNo" INTEGER PRIMARY KEY AUTOINCREMENT,
    "RtType" TEXT,
    "RtNm" TEXT,
    "RtTel" TEXT,
    "RtRegNo" TEXT,
    "OffNo" INTEGER,
    "Grade" TEXT,
    "Id" TEXT,
    "Pw" TEXT,
    "RegDt" TEXT,
    "RegId" TEXT,
    "UpdDt" TEXT,
    "UpdId" TEXT,
    "referred_rt_no" INTEGER,
    "referral_code" TEXT,
    "Email" TEXT,
    "JoinDate" TEXT,
    "LeaveDate" TEXT,
    "Note" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_realtor_info_hist" (
    "RtNo" INTEGER NOT NULL,
    "RtType" TEXT,
    "RtNm" TEXT,
    "RtTel" TEXT,
    "RtRegNo" TEXT,
    "OffNo" INTEGER,
    "Grade" TEXT,
    "Id" TEXT,
    "Pw" TEXT,
    "RegDt" TEXT,
    "RegId" TEXT,
    "UpdDt" TEXT,
    "UpdId" TEXT,
    "referred_rt_no" INTEGER,
    "referral_code" TEXT,
    "Email" TEXT,
    "JoinDate" TEXT,
    "LeaveDate" TEXT,
    "Note" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_realtor_sche" (
    "sch_idx" INTEGER PRIMARY KEY AUTOINCREMENT,
    "rt_no" INTEGER,
    "sch_type" TEXT,
    "sha_yn" TEXT,
    "sch_date" TEXT,
    "sch_time" INTEGER,
    "sch_min" INTEGER,
    "title" TEXT,
    "content" TEXT,
    "cust_no1" INTEGER,
    "cust_no2" INTEGER,
    "cust_info1" TEXT,
    "cust_info2" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_realtor_sche_hist" (
    "sch_idx" INTEGER NOT NULL,
    "rt_no" INTEGER,
    "sch_type" TEXT,
    "sha_yn" TEXT,
    "sch_date" TEXT,
    "sch_time" INTEGER,
    "sch_min" INTEGER,
    "title" TEXT,
    "content" TEXT,
    "cust_no1" INTEGER,
    "cust_no2" INTEGER,
    "cust_info1" TEXT,
    "cust_info2" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_schedule" (
    "schedule_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "scope_div" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "office_id" INTEGER,
    "title" TEXT,
    "content" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "start_at" TEXT NOT NULL,
    "end_at" TEXT,
    "all_day" INTEGER NOT NULL DEFAULT 0,
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "is_shared" INTEGER NOT NULL DEFAULT 0,
    "is_private" INTEGER NOT NULL DEFAULT 0,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    "category" TEXT,
    "amount" NUMERIC,
    "contact_name" TEXT,
    "contact_role" TEXT,
    "phone2" TEXT,
    "contact_name2" TEXT,
    "contact_role2" TEXT,
    CONSTRAINT "ck_rt_schedule_scope" CHECK (((scope_div) IN (('MY'), ('OFFICE'), ('SHARE'))))
);

CREATE TABLE IF NOT EXISTS "rt_schedule_hist" (
    "schedule_id" INTEGER NOT NULL,
    "scope_div" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "office_id" INTEGER,
    "title" TEXT,
    "content" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "start_at" TEXT NOT NULL,
    "end_at" TEXT,
    "all_day" INTEGER NOT NULL,
    "use_yn" TEXT NOT NULL,
    "is_shared" INTEGER NOT NULL,
    "is_private" INTEGER NOT NULL,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    "category" TEXT,
    "amount" NUMERIC,
    "contact_name" TEXT,
    "contact_role" TEXT,
    "phone2" TEXT,
    "contact_name2" TEXT,
    "contact_role2" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_schedule_link" (
    "link_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "schedule_id" INTEGER NOT NULL,
    "link_type" TEXT NOT NULL,
    "link_key" TEXT,
    "meta" TEXT,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    CONSTRAINT "rt_schedule_link_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES rt_schedule(schedule_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "rt_schedule_link_hist" (
    "link_id" INTEGER NOT NULL,
    "schedule_id" INTEGER NOT NULL,
    "link_type" TEXT NOT NULL,
    "link_key" TEXT,
    "meta" TEXT,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_sms_group" (
    "group_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "off_no" INTEGER NOT NULL,
    "rt_no" INTEGER,
    "group_name" TEXT NOT NULL,
    "group_memo" TEXT,
    "members" TEXT NOT NULL DEFAULT '[]',
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_sms_send_hist" (
    "send_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "group_id" INTEGER,
    "off_no" INTEGER NOT NULL,
    "rt_no" INTEGER,
    "group_name" TEXT,
    "send_message" TEXT NOT NULL,
    "recipients" TEXT NOT NULL DEFAULT '[]',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "send_type" TEXT NOT NULL DEFAULT 'SMS',
    "send_status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rt_sms_send_hist_group_id_fkey" FOREIGN KEY (group_id) REFERENCES rt_sms_group(group_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "rt_sticky_memo" (
    "memo_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "content" TEXT,
    "color" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "use_yn" TEXT DEFAULT 'Y',
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "upd_dt" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "rt_trade_info" (
    "trade_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "trade_div" TEXT NOT NULL,
    "cust_no" TEXT,
    "pt_no" TEXT,
    "reg_user_id" TEXT NOT NULL,
    "off_no" TEXT NOT NULL,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_dt" TEXT,
    "is_cust_registered" INTEGER NOT NULL DEFAULT 0,
    "is_pt_registered" INTEGER NOT NULL DEFAULT 0,
    "trade_state" TEXT DEFAULT 'active',
    "trade_state_desc" TEXT,
    "cust_type" TEXT,
    "cust_name" TEXT,
    "cust_alias" TEXT,
    "cust_tel" TEXT,
    "cust_addr" TEXT,
    "cust_memo" TEXT,
    "cust_rent_bsn_yn" TEXT,
    "cust_trd_prg" TEXT,
    "cust_want_type" TEXT,
    "cust_exc_area_fr" NUMERIC,
    "cust_exc_area_to" NUMERIC,
    "cust_region1" TEXT,
    "cust_region2" TEXT,
    "cust_region3" TEXT,
    "cust_trd_type" TEXT,
    "cust_trd_type_detail" TEXT,
    "cust_sale_amt_fr" NUMERIC,
    "cust_sale_amt_to" NUMERIC,
    "cust_les_amt_fr" NUMERIC,
    "cust_les_amt_to" NUMERIC,
    "cust_prot_amt_fr" NUMERIC,
    "cust_prot_amt_to" NUMERIC,
    "cust_mon_amt_fr" NUMERIC,
    "cust_mon_amt_to" NUMERIC,
    "cust_etc_prot_amt_fr" NUMERIC,
    "cust_etc_prot_amt_to" NUMERIC,
    "cust_etc_mon_amt_fr" NUMERIC,
    "cust_etc_mon_amt_to" NUMERIC,
    "cust_etc_type" TEXT,
    "cust_movein_yn" TEXT,
    "cust_move_date_fr" TEXT,
    "cust_move_date_to" TEXT,
    "cust_cash_ablt" NUMERIC,
    "cust_rmk" TEXT,
    "p_pt_name" TEXT,
    "p_pt_type" TEXT,
    "p_sale_div" TEXT,
    "p_sale_amt" NUMERIC,
    "p_now_dep_amt" NUMERIC,
    "p_now_mon_amt" NUMERIC,
    "p_exc_area" NUMERIC,
    "p_sup_area" NUMERIC,
    "p_addr_full" TEXT,
    "p_dong" TEXT,
    "p_ho" TEXT,
    "p_floor1" INTEGER,
    "p_floor2" INTEGER,
    "p_floor_desc" TEXT,
    "p_dir_std" TEXT,
    "p_balc_ext" TEXT,
    "p_room_cnt" INTEGER,
    "p_bath_cnt" INTEGER,
    "p_pk_cnt" NUMERIC,
    "p_maint_cost" NUMERIC,
    "p_heat_method" TEXT,
    "p_heat_fuel" TEXT,
    "p_heat_system" TEXT,
    "p_buid_struct" TEXT,
    "immediate_movein_yn" TEXT,
    "p_expt_date" TEXT,
    "p_prg_sts" TEXT,
    "p_opt" TEXT,
    "p_pt_expl" TEXT,
    "p_comp_year" TEXT,
    "owner_rent_bsn_yn" TEXT,
    "trade_status" TEXT DEFAULT 'Y',
    "p_addr1" TEXT,
    "p_addr2" TEXT,
    "p_addr3" TEXT,
    "p_addr4" TEXT,
    "p_addr5" TEXT,
    "p_bjd_code" TEXT,
    "p_danji_code" TEXT,
    "p_apt_typ" TEXT,
    "p_land_share" NUMERIC,
    "p_current_status" TEXT,
    "p_les_amt" NUMERIC,
    "p_maturity_date" TEXT,
    "p_bond_max_amt" NUMERIC,
    "p_loan_amt_aft" NUMERIC,
    "p_contract_renewal_right" TEXT,
    "p_maint_dtl" TEXT,
    "p_house_cnt" INTEGER,
    "p_entr_struct" TEXT,
    "cust_bld_nm" TEXT,
    "cust_bjd_code" TEXT,
    "cust_danji_code" TEXT,
    "cust_room_cnt" INTEGER,
    "cust_bath_cnt" INTEGER,
    "cust_park_cnt" INTEGER,
    "cust_child_yn" TEXT,
    "cust_pet_yn" TEXT,
    "cust_community_fac" TEXT,
    "cust_feature_note" TEXT,
    "co_brokerage_title" TEXT,
    "co_brokerage_content" TEXT,
    "co_brokerage_memo" TEXT,
    "p_sub_type" TEXT,
    "p_dir_base" TEXT,
    "p_loan_amt" NUMERIC,
    "p_access_road" TEXT,
    "p_add_contrib_amt" NUMERIC,
    "p_basement_floor" INTEGER,
    "p_building_area" NUMERIC,
    "p_building_form" TEXT,
    "p_building_use" TEXT,
    "p_business_name" TEXT,
    "p_business_type" TEXT,
    "p_child_cond" TEXT,
    "p_child_yn" TEXT,
    "p_community_facility" TEXT,
    "p_elevator_cnt" INTEGER,
    "p_etc_dep_amt" NUMERIC,
    "p_etc_mon_amt" NUMERIC,
    "p_exp_etc_m" NUMERIC,
    "p_exp_etc_y" NUMERIC,
    "p_exp_labor_m" NUMERIC,
    "p_exp_labor_y" NUMERIC,
    "p_exp_loan_m" NUMERIC,
    "p_exp_loan_y" NUMERIC,
    "p_exp_util_m" NUMERIC,
    "p_exp_util_y" NUMERIC,
    "p_expansion_amt" NUMERIC,
    "p_facility_cost" NUMERIC,
    "p_ground_floor" INTEGER,
    "p_guest_room_cnt" INTEGER,
    "p_inc_etc_m" NUMERIC,
    "p_inc_etc_y" NUMERIC,
    "p_inc_mgmt_m" NUMERIC,
    "p_inc_mgmt_y" NUMERIC,
    "p_inc_rent_m" NUMERIC,
    "p_inc_rent_y" NUMERIC,
    "p_land_area" NUMERIC,
    "p_land_category" TEXT,
    "p_land_share_ratio" NUMERIC,
    "p_land_use" TEXT,
    "p_lay_amt" NUMERIC,
    "p_moving_cost" NUMERIC,
    "p_option_amt" NUMERIC,
    "p_other_restrictions" TEXT,
    "p_pet_allow" TEXT,
    "p_premium_amt" NUMERIC,
    "p_presale_amt" NUMERIC,
    "p_right_value_amt" NUMERIC,
    "p_road_info" TEXT,
    "p_stair_cnt" INTEGER,
    "p_toilet" TEXT,
    "p_total_floor_area" NUMERIC,
    "p_zone_adjust" INTEGER,
    "p_zone_land_permit" INTEGER,
    "p_zone_overheat" INTEGER,
    "p_zone_spec" INTEGER,
    "cust_access_road" TEXT,
    "cust_balc_ext" TEXT,
    "cust_biz_type" TEXT,
    "cust_build_permit_pref" TEXT,
    "cust_building_form" TEXT,
    "cust_building_use" TEXT,
    "cust_child_cond" TEXT,
    "cust_city_gas_yn" TEXT,
    "cust_elec_capacity" TEXT,
    "cust_elevator_cnt" INTEGER,
    "cust_entr_struct" TEXT,
    "cust_land_category" TEXT,
    "cust_land_use" TEXT,
    "cust_opt" TEXT,
    "cust_pet_allow" TEXT,
    "cust_stair_cnt" INTEGER,
    "charge_name" TEXT
);

CREATE TABLE IF NOT EXISTS "rt_trade_info_log" (
    "trade_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "trade_div" TEXT NOT NULL,
    "cust_no" TEXT,
    "pt_no" TEXT,
    "reg_user_id" TEXT NOT NULL,
    "off_no" TEXT NOT NULL,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_dt" TEXT,
    "is_cust_registered" INTEGER NOT NULL DEFAULT 0,
    "is_pt_registered" INTEGER NOT NULL DEFAULT 0,
    "trade_state" TEXT DEFAULT 'active',
    "trade_state_desc" TEXT,
    "cust_type" TEXT,
    "cust_name" TEXT,
    "cust_alias" TEXT,
    "cust_tel" TEXT,
    "cust_addr" TEXT,
    "cust_memo" TEXT,
    "cust_rent_bsn_yn" TEXT,
    "cust_trd_prg" TEXT,
    "cust_want_type" TEXT,
    "cust_exc_area_fr" NUMERIC,
    "cust_exc_area_to" NUMERIC,
    "cust_region1" TEXT,
    "cust_region2" TEXT,
    "cust_region3" TEXT,
    "cust_trd_type" TEXT,
    "cust_trd_type_detail" TEXT,
    "cust_sale_amt_fr" NUMERIC,
    "cust_sale_amt_to" NUMERIC,
    "cust_les_amt_fr" NUMERIC,
    "cust_les_amt_to" NUMERIC,
    "cust_prot_amt_fr" NUMERIC,
    "cust_prot_amt_to" NUMERIC,
    "cust_mon_amt_fr" NUMERIC,
    "cust_mon_amt_to" NUMERIC,
    "cust_etc_prot_amt_fr" NUMERIC,
    "cust_etc_prot_amt_to" NUMERIC,
    "cust_etc_mon_amt_fr" NUMERIC,
    "cust_etc_mon_amt_to" NUMERIC,
    "cust_etc_type" TEXT,
    "cust_movein_yn" TEXT,
    "cust_move_date_fr" TEXT,
    "cust_move_date_to" TEXT,
    "cust_cash_ablt" NUMERIC,
    "cust_rmk" TEXT,
    "p_pt_name" TEXT,
    "p_pt_type" TEXT,
    "p_sale_div" TEXT,
    "p_sale_amt" NUMERIC,
    "p_now_dep_amt" NUMERIC,
    "p_now_mon_amt" NUMERIC,
    "p_exc_area" NUMERIC,
    "p_sup_area" NUMERIC,
    "p_addr_full" TEXT,
    "p_dong" TEXT,
    "p_ho" TEXT,
    "p_floor1" INTEGER,
    "p_floor2" INTEGER,
    "p_floor_desc" TEXT,
    "p_dir_std" TEXT,
    "p_balc_ext" TEXT,
    "p_room_cnt" INTEGER,
    "p_bath_cnt" INTEGER,
    "p_pk_cnt" NUMERIC,
    "p_maint_cost" NUMERIC,
    "p_heat_method" TEXT,
    "p_heat_fuel" TEXT,
    "p_heat_system" TEXT,
    "p_buid_struct" TEXT,
    "immediate_movein_yn" TEXT,
    "p_expt_date" TEXT,
    "p_prg_sts" TEXT,
    "p_opt" TEXT,
    "p_pt_expl" TEXT,
    "p_comp_year" TEXT,
    "owner_rent_bsn_yn" TEXT,
    "trade_status" TEXT DEFAULT 'Y',
    "logged_at" TEXT DEFAULT CURRENT_TIMESTAMP,
    "log_type" TEXT DEFAULT 'UPDATE'
);

CREATE TABLE IF NOT EXISTS "rt_upload_staging" (
    "staging_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "target" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "label" TEXT,
    "off_no" INTEGER,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "rt_view_log" (
    "post_type" TEXT NOT NULL,
    "post_id" INTEGER NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "view_ymd" TEXT NOT NULL,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("post_type", "post_id", "viewer_id", "view_ymd")
);

CREATE TABLE IF NOT EXISTS "rt_work_journal" (
    "journal_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "off_no" INTEGER,
    "rt_no" INTEGER,
    "user_id" TEXT NOT NULL,
    "jrnl_date" TEXT NOT NULL,
    "prop_reg" INTEGER NOT NULL DEFAULT 0,
    "prop_upd" INTEGER NOT NULL DEFAULT 0,
    "sched_reg" INTEGER NOT NULL DEFAULT 0,
    "sched_upd" INTEGER NOT NULL DEFAULT 0,
    "call_cnt" INTEGER NOT NULL DEFAULT 0,
    "consult_memo" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT,
    "remark" TEXT,
    "extra_pages" TEXT,
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    CONSTRAINT "uq_work_journal" UNIQUE ("user_id", "jrnl_date")
);

CREATE TABLE IF NOT EXISTS "rt_work_journal_setting" (
    "off_no" INTEGER NOT NULL,
    "share_all" TEXT NOT NULL DEFAULT 'Y',
    "upd_id" TEXT,
    "upd_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("off_no")
);

CREATE TABLE IF NOT EXISTS "sys_admin" (
    "admin_id" TEXT NOT NULL,
    "pw" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'NORMAL',
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT,
    PRIMARY KEY ("admin_id")
);

CREATE TABLE IF NOT EXISTS "sys_code_cat" (
    "cat_cd" TEXT NOT NULL,
    "cat_nm" TEXT,
    "use_yn" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    PRIMARY KEY ("cat_cd")
);

CREATE TABLE IF NOT EXISTS "sys_code_mid" (
    "cat_cd" TEXT NOT NULL,
    "mid_cd" TEXT NOT NULL,
    "mid_nm" TEXT,
    "use_yn" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    PRIMARY KEY ("cat_cd", "mid_cd")
);

CREATE TABLE IF NOT EXISTS "sys_code_sub" (
    "cat_cd" TEXT NOT NULL,
    "mid_cd" TEXT NOT NULL,
    "sub_cd" TEXT NOT NULL,
    "sub_nm" TEXT,
    "etc1" TEXT,
    "etc2" TEXT,
    "etc3" TEXT,
    "etc4" TEXT,
    "etc5" TEXT,
    "etc6" TEXT,
    "etc7" TEXT,
    "etc8" TEXT,
    "etc9" TEXT,
    "etc10" TEXT,
    "use_yn" TEXT,
    "sort" INTEGER,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    PRIMARY KEY ("cat_cd", "mid_cd", "sub_cd")
);

CREATE TABLE IF NOT EXISTS "sys_file" (
    "file_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "file_typ" TEXT NOT NULL,
    "file_div" TEXT NOT NULL,
    "ref_key" TEXT,
    "orig_name" TEXT,
    "object_key" TEXT NOT NULL,
    "content_type" TEXT,
    "file_size" INTEGER,
    "ext" TEXT,
    "expose" TEXT NOT NULL DEFAULT 'Y',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "descr" TEXT,
    "etc_data" TEXT,
    "use_yn" TEXT NOT NULL DEFAULT 'Y',
    "reg_id" TEXT,
    "reg_dt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upd_id" TEXT,
    "upd_dt" TEXT
);

CREATE TABLE IF NOT EXISTS "sys_menu" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "mnu_nm" TEXT,
    "lvl" INTEGER,
    "parent_id" INTEGER,
    "use_yn" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    "sort" INTEGER
);

CREATE TABLE IF NOT EXISTS "sys_menu_rt" (
    "rt_no" INTEGER NOT NULL,
    "id" INTEGER NOT NULL,
    "c_yn" TEXT,
    "r_yn" TEXT,
    "u_yn" TEXT,
    "d_yn" TEXT,
    "use_yn" TEXT,
    "reg_dt" TEXT,
    "reg_id" TEXT,
    "upd_dt" TEXT,
    "upd_id" TEXT,
    PRIMARY KEY ("rt_no", "id")
);

CREATE TABLE IF NOT EXISTS "sys_user_log" (
    "ulog_idx" INTEGER PRIMARY KEY AUTOINCREMENT,
    "id" TEXT,
    "end_point" TEXT,
    "act_dt" TEXT,
    "act_control" TEXT,
    "info1" TEXT,
    "info2" TEXT,
    "created_at" TEXT,
    "rt_no" INTEGER,
    "off_no" INTEGER,
    "vendor_id" INTEGER
);

CREATE TABLE IF NOT EXISTS "vd_vendor_info" (
    "vendor_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "vendor_name" TEXT NOT NULL,
    "category1" TEXT,
    "category2" TEXT,
    "category3" TEXT,
    "ceo_name" TEXT,
    "manager_name" TEXT,
    "manager_phone" TEXT,
    "manager_tel" TEXT,
    "manager_fax" TEXT,
    "homepage_url" TEXT,
    "product_desc" TEXT,
    "consultation_note" TEXT,
    "reg_type" TEXT DEFAULT 'ADMIN',
    "business_region_code" TEXT,
    "detail_address" TEXT,
    "off_no" INTEGER,
    "rt_no" INTEGER,
    "sort_order" INTEGER DEFAULT 0,
    "use_yn" TEXT DEFAULT 'Y',
    "reg_id" TEXT NOT NULL,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "mod_id" TEXT,
    "mod_dt" TEXT,
    "bjd_code" TEXT,
    "ceo_phone" TEXT,
    CONSTRAINT "chk_vd_vendor_use_yn" CHECK ((use_yn IN ('Y', 'N')))
);

CREATE TABLE IF NOT EXISTS "vd_vendor_info_hist" (
    "vendor_id" INTEGER NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "category1" TEXT,
    "category2" TEXT,
    "category3" TEXT,
    "ceo_name" TEXT,
    "manager_name" TEXT,
    "manager_phone" TEXT,
    "manager_tel" TEXT,
    "manager_fax" TEXT,
    "homepage_url" TEXT,
    "product_desc" TEXT,
    "consultation_note" TEXT,
    "reg_type" TEXT,
    "business_region_code" TEXT,
    "detail_address" TEXT,
    "off_no" INTEGER,
    "rt_no" INTEGER,
    "sort_order" INTEGER,
    "use_yn" TEXT,
    "reg_id" TEXT NOT NULL,
    "reg_dt" TEXT,
    "mod_id" TEXT,
    "mod_dt" TEXT,
    "bjd_code" TEXT,
    "ceo_phone" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE TABLE IF NOT EXISTS "vd_vendor_region" (
    "vendor_region_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "vendor_id" INTEGER NOT NULL,
    "region_code" TEXT NOT NULL,
    "sort_order" INTEGER DEFAULT 0,
    "use_yn" TEXT DEFAULT 'Y',
    "reg_id" TEXT NOT NULL,
    "reg_dt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "mod_id" TEXT,
    "mod_dt" TEXT,
    "region_name" TEXT,
    CONSTRAINT "uq_vendor_region" UNIQUE ("vendor_id", "region_code"),
    CONSTRAINT "vd_vendor_region_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES vd_vendor_info(vendor_id) ON DELETE CASCADE,
    CONSTRAINT "chk_vd_vendor_region_use_yn" CHECK ((use_yn IN ('Y', 'N')))
);

CREATE TABLE IF NOT EXISTS "vd_vendor_region_hist" (
    "vendor_region_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "region_code" TEXT NOT NULL,
    "sort_order" INTEGER,
    "use_yn" TEXT,
    "reg_id" TEXT NOT NULL,
    "reg_dt" TEXT,
    "mod_id" TEXT,
    "mod_dt" TEXT,
    "region_name" TEXT,
    "hist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT,
    "logged_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "changed_off" INTEGER,
    "client_ip" TEXT
);

CREATE INDEX IF NOT EXISTS ix_app_version_latest ON app_version (platform, is_active, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_cn_contract_mgt_hist_by ON cn_contract_mgt_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_cn_contract_mgt_hist_off ON cn_contract_mgt_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_cn_contract_spcl_hist_by ON cn_contract_spcl_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_cn_contract_spcl_hist_off ON cn_contract_spcl_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_cn_contract_template_kind_trade ON cn_contract_template (kind_cd, trade_cd);

CREATE INDEX IF NOT EXISTS idx_cn_contract_template_use ON cn_contract_template (use_yn, sort);

CREATE INDEX IF NOT EXISTS ix_community_job_kind ON community_job (kind, use_yn, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_community_post_tab ON community_post (tab, use_yn, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_contract_document_master ON contract_document (master_id, doc_kind);

CREATE INDEX IF NOT EXISTS ix_contract_document_hist_by ON contract_document_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_contract_document_hist_off ON contract_document_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_contract_master_origin ON contract_master (origin_master_id);

CREATE INDEX IF NOT EXISTS ix_contract_master_scope ON contract_master (off_no, rt_no, use_yn, contract_date DESC);

CREATE INDEX IF NOT EXISTS ix_contract_master_hist_by ON contract_master_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_contract_master_hist_off ON contract_master_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_cs_customer_center_hist_by ON cs_customer_center_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_cs_customer_center_hist_off ON cs_customer_center_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ct_cust_buyer_cust ON ct_cust_buyer (cust_no);

CREATE INDEX IF NOT EXISTS ix_ct_cust_buyer_hist_by ON ct_cust_buyer_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ct_cust_buyer_hist_off ON ct_cust_buyer_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ct_cust_hist_by ON ct_cust_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ct_cust_hist_off ON ct_cust_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_ct_interview_vendor_id ON ct_interview (vendor_id);

CREATE INDEX IF NOT EXISTS ix_ct_interview_hist_by ON ct_interview_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ct_interview_hist_off ON ct_interview_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ct_trd_area_bjd ON ct_trd_area (bjd_code);

CREATE INDEX IF NOT EXISTS ix_ct_trd_area_cust ON ct_trd_area (cust_no);

CREATE INDEX IF NOT EXISTS ix_ct_trd_area_hist_by ON ct_trd_area_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ct_trd_area_hist_off ON ct_trd_area_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ct_trd_info_hist_by ON ct_trd_info_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ct_trd_info_hist_off ON ct_trd_info_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_name ON danji (building_name);

CREATE INDEX IF NOT EXISTS idx_danji_bjd_code ON danji (bjd_code);

CREATE INDEX IF NOT EXISTS idx_danji_bjd_code_building_name ON danji (bjd_code, building_name);

CREATE INDEX IF NOT EXISTS idx_danji_bjdcode_active ON danji (bjd_code) WHERE ((is_active = true) AND (deleted_at IS NULL));

CREATE INDEX IF NOT EXISTS idx_danji_is_active ON danji (is_active);

CREATE INDEX IF NOT EXISTS idx_naver_danji_code ON danji (naver_danji_code);

CREATE INDEX IF NOT EXISTS idx_danji_area_new_in_use ON danji_area_new (naver_danji_code, sply_spc) WHERE ((in_use) = 'Y');

CREATE INDEX IF NOT EXISTS idx_danji_area_new_naver_danji_code ON danji_area_new (naver_danji_code);

CREATE INDEX IF NOT EXISTS idx_danji_area_new_naver_danji_code_sply_spc ON danji_area_new (naver_danji_code, sply_spc);

CREATE INDEX IF NOT EXISTS idx_danji_area_new_naver_danji_excls ON danji_area_new (naver_danji_code, excls_spc);

CREATE INDEX IF NOT EXISTS idx_danji_area_new_naver_varchar ON danji_area_new (((naver_danji_code)));

CREATE INDEX IF NOT EXISTS idx_danji_area_new_ptp_no ON danji_area_new (ptp_no);

CREATE INDEX IF NOT EXISTS idx_danji_dong_new_naver_danji_code ON danji_dong_new (naver_danji_code);

CREATE INDEX IF NOT EXISTS idx_danji_dong_new_naver_danji_dong_no ON danji_dong_new (naver_danji_code, dong_no);

CREATE INDEX IF NOT EXISTS idx_danji_ho_new_naver_danji_dong ON danji_ho_new (naver_danji_code, dong_no);

CREATE INDEX IF NOT EXISTS idx_danji_ho_new_naver_danji_dong_ho ON danji_ho_new (naver_danji_code, dong_no, ho_number);

CREATE INDEX IF NOT EXISTS ix_danji_occupancy_key ON danji_occupancy (off_no, naver_danji_code, dong_no);

CREATE INDEX IF NOT EXISTS idx_bjd_code ON hjd_bjd (bjd_code);

CREATE INDEX IF NOT EXISTS idx_hjd_bjd_bjdcode_pat ON hjd_bjd (bjd_code) WHERE (end_date IS NULL);

CREATE INDEX IF NOT EXISTS idx_hjd_bjd_hjdcode_pat ON hjd_bjd (hjd_code) WHERE (end_date IS NULL);

CREATE INDEX IF NOT EXISTS idx_hjd_code ON hjd_bjd (hjd_code);

CREATE INDEX IF NOT EXISTS idx_is_active ON hjd_bjd (is_active);

CREATE INDEX IF NOT EXISTS idx_sido_name ON hjd_bjd (sido_name);

CREATE INDEX IF NOT EXISTS idx_sigungu_name ON hjd_bjd (sigungu_name);

CREATE INDEX IF NOT EXISTS ix_membership_history_off ON membership_history (off_no, reg_dt DESC);

CREATE INDEX IF NOT EXISTS idx_nt_event_public ON nt_event (is_public, sort_order, event_id);

CREATE INDEX IF NOT EXISTS idx_nt_event_entry_event ON nt_event_entry (event_id, reg_dt DESC);

CREATE INDEX IF NOT EXISTS idx_nt_event_entry_off ON nt_event_entry (off_no, reg_dt DESC);

CREATE INDEX IF NOT EXISTS idx_nt_event_entry_user ON nt_event_entry (user_id, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_ofc_non_shared_hist_by ON ofc_non_shared_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ofc_non_shared_hist_off ON ofc_non_shared_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ofc_realter_office_hist_by ON ofc_realter_office_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_ofc_realter_office_hist_off ON ofc_realter_office_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_payment_history_off ON payment_history (off_no, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_payment_history_order ON payment_history (order_id);

CREATE INDEX IF NOT EXISTS ix_payment_history_user ON payment_history (user_id, reg_dt DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_payment_history_key ON payment_history (payment_key) WHERE (payment_key IS NOT NULL);

CREATE INDEX IF NOT EXISTS ix_pt_land_additional_pt_no ON pt_land_additional (pt_no);

CREATE INDEX IF NOT EXISTS ix_pt_land_additional_hist_by ON pt_land_additional_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_land_additional_hist_off ON pt_land_additional_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_lease_status_pt_no ON pt_lease_status (pt_no);

CREATE INDEX IF NOT EXISTS ix_pt_lease_status_hist_by ON pt_lease_status_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_lease_status_hist_off ON pt_lease_status_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_pt_memo_date ON pt_memo (memo_date DESC);

CREATE INDEX IF NOT EXISTS idx_pt_memo_pt_no ON pt_memo (pt_no);

CREATE INDEX IF NOT EXISTS ix_pt_memo_cust ON pt_memo (cust_no);

CREATE INDEX IF NOT EXISTS ix_pt_memo_hist_by ON pt_memo_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_memo_hist_off ON pt_memo_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_pt_occupancy_danji ON pt_occupancy (naver_danji_code);

CREATE INDEX IF NOT EXISTS idx_pt_occupancy_danji_dong ON pt_occupancy (naver_danji_code, dong_no);

CREATE INDEX IF NOT EXISTS ix_pt_occupancy_hist_by ON pt_occupancy_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_occupancy_hist_off ON pt_occupancy_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_sale_hist_by ON pt_sale_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_sale_hist_off ON pt_sale_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_sale_holder_hist_by ON pt_sale_holder_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_sale_holder_hist_off ON pt_sale_holder_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_sale_old_org ON pt_sale_old_bak (org_pt_no);

CREATE INDEX IF NOT EXISTS ix_pt_share_cust ON pt_share (cust_no, share_idx);

CREATE INDEX IF NOT EXISTS ix_pt_share_hist_by ON pt_share_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_pt_share_hist_off ON pt_share_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_rt_no ON referral_benefits (rt_no);

CREATE INDEX IF NOT EXISTS idx_referred_rt_no ON referral_benefits (referred_rt_no);

CREATE INDEX IF NOT EXISTS idx_referral_code_prefix_period ON referral_code_prefix (start_date, end_date);

CREATE INDEX IF NOT EXISTS ix_report_pt ON report (pt_no);

CREATE INDEX IF NOT EXISTS ix_report_cust_cust ON report_cust (cust_no);

CREATE INDEX IF NOT EXISTS ix_bulk_req_off ON rt_bulk_request (off_no, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_bulk_req_status ON rt_bulk_request (status, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_bulk_req_user ON rt_bulk_request (user_id, reg_dt DESC);

CREATE INDEX IF NOT EXISTS idx_rt_login_log_user_dt ON rt_login_log (user_id, login_dt DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_rt_login_log_user ON rt_login_log (user_id);

CREATE INDEX IF NOT EXISTS idx_rt_main_region_off ON rt_main_region (off_no);

CREATE INDEX IF NOT EXISTS idx_rt_main_region_rt ON rt_main_region (rt_no);

CREATE INDEX IF NOT EXISTS ix_rt_menu_perm_rt ON rt_menu_perm (rt_no, allowed);

CREATE INDEX IF NOT EXISTS ix_rt_menu_perm_hist_by ON rt_menu_perm_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_menu_perm_hist_off ON rt_menu_perm_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_rt_note_receiver ON rt_note (receiver_id, is_read);

CREATE INDEX IF NOT EXISTS idx_rt_note_sender ON rt_note (sender_id);

CREATE INDEX IF NOT EXISTS ix_rt_note_hist_by ON rt_note_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_note_hist_off ON rt_note_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_rt_note_share_off ON rt_note_share (off_no);

CREATE INDEX IF NOT EXISTS ix_rt_note_share_hist_by ON rt_note_share_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_note_share_hist_off ON rt_note_share_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_rt_office_block_blkreg ON rt_office_block (blocked_reg_no);

CREATE INDEX IF NOT EXISTS idx_rt_office_block_myreg ON rt_office_block (my_reg_no);

CREATE INDEX IF NOT EXISTS idx_rt_payment_token_rt ON rt_payment_token (rt_no, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_rt_realtor_referral_code ON rt_realtor_info (referral_code);

CREATE INDEX IF NOT EXISTS ix_rt_realtor_info_hist_by ON rt_realtor_info_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_realtor_info_hist_off ON rt_realtor_info_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_realtor_sche_hist_by ON rt_realtor_sche_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_realtor_sche_hist_off ON rt_realtor_sche_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_schedule_office ON rt_schedule (office_id);

CREATE INDEX IF NOT EXISTS ix_rt_schedule_owner ON rt_schedule (owner_user_id);

CREATE INDEX IF NOT EXISTS ix_rt_schedule_time ON rt_schedule (start_at, end_at);

CREATE INDEX IF NOT EXISTS ix_rt_schedule_hist_by ON rt_schedule_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_schedule_hist_off ON rt_schedule_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_schedule_link_sched ON rt_schedule_link (schedule_id);

CREATE INDEX IF NOT EXISTS ix_rt_schedule_link_tk ON rt_schedule_link (link_type, link_key);

CREATE UNIQUE INDEX IF NOT EXISTS ux_rt_schedule_link_nodup ON rt_schedule_link (schedule_id, link_type, link_key) WHERE (link_key IS NOT NULL);

CREATE INDEX IF NOT EXISTS ix_rt_schedule_link_hist_by ON rt_schedule_link_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_schedule_link_hist_off ON rt_schedule_link_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_rt_sms_group_off ON rt_sms_group (off_no, use_yn, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_rt_sms_group_rt ON rt_sms_group (rt_no, use_yn, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_rt_sms_send_hist_group ON rt_sms_send_hist (group_id, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_rt_sms_send_hist_off ON rt_sms_send_hist (off_no, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_rt_sms_send_hist_rt ON rt_sms_send_hist (rt_no, reg_dt DESC);

CREATE INDEX IF NOT EXISTS idx_rt_sticky_memo_user ON rt_sticky_memo (user_id, use_yn);

CREATE INDEX IF NOT EXISTS idx_rt_trade_info_cust_no ON rt_trade_info (cust_no) WHERE (cust_no IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_rt_trade_info_off_no ON rt_trade_info (off_no);

CREATE INDEX IF NOT EXISTS idx_rt_trade_info_pt_no ON rt_trade_info (pt_no) WHERE (pt_no IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_rt_trade_info_reg_dt ON rt_trade_info (reg_dt DESC);

CREATE INDEX IF NOT EXISTS idx_rt_trade_info_trade_div ON rt_trade_info (trade_div);

CREATE INDEX IF NOT EXISTS idx_rt_trade_info_trade_state ON rt_trade_info (trade_state);

CREATE INDEX IF NOT EXISTS idx_rt_trade_info_log_logged_at ON rt_trade_info_log (logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_rt_trade_info_log_trade_id ON rt_trade_info_log (trade_id);

CREATE INDEX IF NOT EXISTS rt_trade_info_log_cust_no_idx ON rt_trade_info_log (cust_no) WHERE (cust_no IS NOT NULL);

CREATE INDEX IF NOT EXISTS rt_trade_info_log_off_no_idx ON rt_trade_info_log (off_no);

CREATE INDEX IF NOT EXISTS rt_trade_info_log_pt_no_idx ON rt_trade_info_log (pt_no) WHERE (pt_no IS NOT NULL);

CREATE INDEX IF NOT EXISTS rt_trade_info_log_reg_dt_idx ON rt_trade_info_log (reg_dt DESC);

CREATE INDEX IF NOT EXISTS rt_trade_info_log_trade_div_idx ON rt_trade_info_log (trade_div);

CREATE INDEX IF NOT EXISTS rt_trade_info_log_trade_state_idx ON rt_trade_info_log (trade_state);

CREATE INDEX IF NOT EXISTS ix_rt_upload_staging_off ON rt_upload_staging (off_no, target, reg_dt DESC);

CREATE INDEX IF NOT EXISTS ix_work_journal_off_date ON rt_work_journal (off_no, jrnl_date);

CREATE INDEX IF NOT EXISTS ix_sys_file_ref ON sys_file (file_typ, file_div, ref_key, use_yn);

CREATE INDEX IF NOT EXISTS ix_sys_file_refkey ON sys_file (ref_key, use_yn);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_info_category1 ON vd_vendor_info (category1);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_info_category2 ON vd_vendor_info (category2);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_info_category3 ON vd_vendor_info (category3);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_info_off_no ON vd_vendor_info (off_no);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_info_rt_no ON vd_vendor_info (rt_no);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_info_sort_order ON vd_vendor_info (sort_order);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_info_vendor_name ON vd_vendor_info (vendor_name);

CREATE INDEX IF NOT EXISTS ix_vd_vendor_info_hist_by ON vd_vendor_info_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_vd_vendor_info_hist_off ON vd_vendor_info_hist (changed_off, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_region_region_code ON vd_vendor_region (region_code);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_region_sort_order ON vd_vendor_region (sort_order);

CREATE INDEX IF NOT EXISTS idx_vd_vendor_region_vendor_id ON vd_vendor_region (vendor_id);

CREATE INDEX IF NOT EXISTS ix_vd_vendor_region_hist_by ON vd_vendor_region_hist (changed_by, logged_at DESC);

CREATE INDEX IF NOT EXISTS ix_vd_vendor_region_hist_off ON vd_vendor_region_hist (changed_off, logged_at DESC);


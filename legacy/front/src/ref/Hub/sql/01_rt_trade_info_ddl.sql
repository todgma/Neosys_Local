-- =====================================================
-- 공동중개망 메인 테이블 DDL
-- =====================================================

CREATE TABLE public.rt_trade_info (
    trade_id        BIGSERIAL PRIMARY KEY,                   -- 공동중개망 고유 ID

    trade_div       VARCHAR(10) NOT NULL,                    -- 등록 유형(CUST=고객, PT=물건)

    cust_no         VARCHAR(20),                             -- 고객번호(ct_cust.cust_no) / 없을 수도 있음
    pt_no           VARCHAR(20),                             -- 물건번호(pt_sale.pt_no) / 없을 수도 있음

    reg_user_id     VARCHAR(50) NOT NULL,                    -- 등록자(사용자 ID)
    off_no          VARCHAR(20) NOT NULL,                    -- 사무소번호

    reg_dt          TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- 등록일시
    upd_dt          TIMESTAMPTZ,                             -- 수정일시

    is_cust_registered   BOOLEAN NOT NULL DEFAULT FALSE,     -- 고객테이블(ct_cust) 실제 등록 여부
    is_pt_registered     BOOLEAN NOT NULL DEFAULT FALSE,     -- 물건테이블(pt_sale) 실제 등록 여부

    trade_state     VARCHAR(20) DEFAULT 'active',            -- 업무 상태(진행중/매칭중/완료 등)
    trade_state_desc VARCHAR(200),                           -- 상태 설명 메모

    -------------------------------------------------------------------
    -- 공동중개 관련 필드
    -------------------------------------------------------------------
    co_brokerage_title  VARCHAR(200),                        -- 공동중개 제목
    co_brokerage_content TEXT,                               -- 공동중개 내용
    co_brokerage_memo    TEXT,                               -- 공동중개 메모

    -------------------------------------------------------------------
    -- 고객정보 입력 필드 (공동중개망-고객등록 화면 사용)
    -------------------------------------------------------------------

    cust_type       VARCHAR(20),                             -- 고객유형(소유주/구매자/임차인)
    cust_name       VARCHAR(100),                            -- 고객 이름
    cust_alias      VARCHAR(100),                            -- 고객 별칭
    cust_tel        VARCHAR(50),                             -- 고객 전화번호
    cust_addr       VARCHAR(200),                            -- 고객 주소
    cust_memo       TEXT,                                    -- 고객 메모
    cust_rent_bsn_yn CHAR(1),                                -- 주택임대사업자 여부(Y/N)
    cust_trd_prg    VARCHAR(20),                             -- 고객 진행상태

    cust_want_type      VARCHAR(20),                         -- 희망 물건 종류(아파트/오피스텔 등)
    cust_exc_area_fr    NUMERIC(15,2),                       -- 전용면적 From
    cust_exc_area_to    NUMERIC(15,2),                       -- 전용면적 To

    cust_region1    VARCHAR(50),                             -- 지역1(시/도)
    cust_region2    VARCHAR(50),                             -- 지역2(시/군/구)
    cust_region3    VARCHAR(50),                             -- 지역3(동/읍/면)

    cust_trd_type       VARCHAR(20),                         -- 거래구분(매매/전세/월세/기타)
    cust_trd_type_detail VARCHAR(100),                       -- 거래유형 상세(다중 선택 저장용)

    cust_sale_amt_fr    NUMERIC(18,0),                       -- 희망 매매가 From
    cust_sale_amt_to    NUMERIC(18,0),                       -- 희망 매매가 To
    cust_les_amt_fr     NUMERIC(18,0),                       -- 희망 전세가 From
    cust_les_amt_to     NUMERIC(18,0),                       -- 희망 전세가 To

    cust_prot_amt_fr    NUMERIC(18,0),                       -- 희망 보증금 From
    cust_prot_amt_to    NUMERIC(18,0),                       -- 희망 보증금 To
    cust_mon_amt_fr     NUMERIC(18,0),                       -- 희망 월차임 From
    cust_mon_amt_to     NUMERIC(18,0),                       -- 희망 월차임 To

    cust_etc_prot_amt_fr NUMERIC(18,0),                      -- 기타 보증금 From
    cust_etc_prot_amt_to NUMERIC(18,0),                      -- 기타 보증금 To
    cust_etc_mon_amt_fr NUMERIC(18,0),                       -- 기타 차임 From
    cust_etc_mon_amt_to NUMERIC(18,0),                       -- 기타 차임 To

    cust_etc_type       VARCHAR(50),                         -- 기타 임차 형태
    cust_movein_yn      CHAR(1),                             -- 매매 시 입주 여부(Y/N)

    cust_move_date_fr   DATE,                                -- 이사예정일 From
    cust_move_date_to   DATE,                                -- 이사예정일 To

    cust_cash_ablt      NUMERIC(18,0),                       -- 고객 현금여력
    cust_rmk            TEXT,                                -- 기타사항

    -------------------------------------------------------------------
    -- 물건정보 입력 필드 (공동중개망-물건등록 화면 사용)
    -------------------------------------------------------------------

    p_pt_name       VARCHAR(200),                            -- 물건명
    p_pt_type       VARCHAR(20),                             -- 물건종류(아파트 등)
    p_sale_div      VARCHAR(200),                             -- 거래구분(매매/전세/월세 등)
    p_sale_amt      NUMERIC(18,0),                           -- 매매가
    p_now_dep_amt   NUMERIC(18,0),                           -- 현보증금
    p_now_mon_amt   NUMERIC(18,0),                           -- 현월차임

    p_exc_area      NUMERIC(15,2),                           -- 전용면적(㎡)
    p_sup_area      NUMERIC(15,2),                           -- 공급면적(㎡)

    p_addr_full     VARCHAR(300),                            -- 전체 주소 문자열
    p_dong          VARCHAR(20),                             -- 동
    p_ho            VARCHAR(20),                             -- 호수

    p_floor1        INTEGER,                                 -- 해당층
    p_floor2        INTEGER,                                 -- 탑층
    p_floor_desc    VARCHAR(50),                             -- 층 설명(중층/저층 등)

    p_dir_std       VARCHAR(50),                             -- 방향(남향/거실창 등)
    p_balc_ext      VARCHAR(20),                             -- 발코니확장 여부
    p_room_cnt      INTEGER,                                 -- 방 수
    p_bath_cnt      INTEGER,                                 -- 욕실 수
    p_pk_cnt        NUMERIC(10,2),                           -- 가구당 주차대수
    p_maint_cost    NUMERIC(18,0),                           -- 관리비

    p_heat_method   VARCHAR(50),                             -- 난방방식(지역/중앙/개별)
    p_heat_fuel     VARCHAR(50),                             -- 난방연료(도시가스 등)
    p_heat_system   VARCHAR(50),                             -- 열원(열병합/지역난방 등)
    p_buid_struct   VARCHAR(50),                             -- 건물구조(계단식 등)

    immediate_movein_yn CHAR(1),                             -- 즉시입주 여부(Y/N)
    p_expt_date     DATE,                                    -- 입주예정일
    p_prg_sts       VARCHAR(20),                             -- 물건 진행상태

    p_opt           TEXT,                                    -- 옵션사항
    p_pt_expl       TEXT,                                    -- 물건설명
    p_comp_year     VARCHAR(4),                              -- 준공년도(YYYY)

    owner_rent_bsn_yn CHAR(1),                               -- 소유자 임대사업자 여부(Y/N)

    trade_status    VARCHAR(20) DEFAULT 'Y'                  -- 사용여부(Y/N)
);

-- =====================================================
-- 인덱스 생성
-- =====================================================

CREATE INDEX idx_rt_trade_info_trade_div ON public.rt_trade_info(trade_div);
CREATE INDEX idx_rt_trade_info_off_no ON public.rt_trade_info(off_no);
CREATE INDEX idx_rt_trade_info_cust_no ON public.rt_trade_info(cust_no) WHERE cust_no IS NOT NULL;
CREATE INDEX idx_rt_trade_info_pt_no ON public.rt_trade_info(pt_no) WHERE pt_no IS NOT NULL;
CREATE INDEX idx_rt_trade_info_trade_state ON public.rt_trade_info(trade_state);
CREATE INDEX idx_rt_trade_info_reg_dt ON public.rt_trade_info(reg_dt DESC);

-- =====================================================
-- 코멘트
-- =====================================================

COMMENT ON TABLE public.rt_trade_info IS '공동중개망 메인 테이블';
COMMENT ON COLUMN public.rt_trade_info.trade_id IS '공동중개망 고유 ID';
COMMENT ON COLUMN public.rt_trade_info.trade_div IS '등록 유형 (CUST=고객, PT=물건)';
COMMENT ON COLUMN public.rt_trade_info.cust_no IS '고객번호 (ct_cust.cust_no)';
COMMENT ON COLUMN public.rt_trade_info.pt_no IS '물건번호 (pt_sale.pt_no)';
COMMENT ON COLUMN public.rt_trade_info.is_cust_registered IS '고객테이블 실제 등록 여부';
COMMENT ON COLUMN public.rt_trade_info.is_pt_registered IS '물건테이블 실제 등록 여부';
COMMENT ON COLUMN public.rt_trade_info.co_brokerage_title IS '공동중개 제목';
COMMENT ON COLUMN public.rt_trade_info.co_brokerage_content IS '공동중개 내용';
COMMENT ON COLUMN public.rt_trade_info.co_brokerage_memo IS '공동중개 메모';

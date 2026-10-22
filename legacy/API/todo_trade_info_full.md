# TODO – 거래정보망 설계 및 구현 메모 (rt_trade_info + log)

## 0. DB 스키마 정리

---

## 0-1. 거래정보망 메인 테이블 DDL (rt_trade_info)

```sql
CREATE TABLE public.rt_trade_info (
    trade_id        BIGSERIAL PRIMARY KEY,                   -- 거래정보망 고유 ID

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
    -- 고객정보 입력 필드 (거래정보망-고객등록 화면 사용)
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
    -- 물건정보 입력 필드 (거래정보망-물건등록 화면 사용)
    -------------------------------------------------------------------

    p_pt_name       VARCHAR(200),                            -- 물건명
    p_pt_type       VARCHAR(20),                             -- 물건종류(아파트 등)
    p_sale_div      VARCHAR(20),                             -- 거래구분(매매/전세/월세 등)
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

```

---

## 0-2. 거래정보망 로그 테이블 DDL (rt_trade_info_log)

```sql
CREATE TABLE public.rt_trade_info_log (
    LIKE public.rt_trade_info INCLUDING ALL
);

-- PK 제거 필요 (로그는 동일 trade_id 여러 개 허용)
-- ALTER TABLE public.rt_trade_info_log DROP CONSTRAINT rt_trade_info_pkey;

-- 필요시 로그 시간/타입 필드 추가
-- ALTER TABLE public.rt_trade_info_log ADD COLUMN logged_at TIMESTAMPTZ DEFAULT NOW();
-- ALTER TABLE public.rt_trade_info_log ADD COLUMN log_type VARCHAR(20) DEFAULT 'UPDATE';
```

---

## 0-3. UPDATE/DELETE 로그 트리거

```sql
CREATE OR REPLACE FUNCTION public.fn_rt_trade_info_log_before_ud()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.rt_trade_info_log
    SELECT OLD.*;

    IF (TG_OP = 'UPDATE') THEN
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$$;

CREATE TRIGGER trg_rt_trade_info_log_before_ud
BEFORE UPDATE OR DELETE ON public.rt_trade_info
FOR EACH ROW
EXECUTE FUNCTION public.fn_rt_trade_info_log_before_ud();
```

---

# 1. 기능 TODO 리스트

---

## 01. 거래정보망 - 고객정보 등록  
### (A) 고객번호만 입력  
### (B) 고객정보 필드 직접 입력

- [ ] 입력방식 2가지 지원 (cust_no or cust_* 직접입력)
- [ ] trade_div = 'CUST'
- [ ] reg_user_id / off_no 필수
- [ ] cust_no 입력 시: 고객테이블 존재 여부 검증 (선택)
- [ ] 직접입력 시: 반드시 이름 or 전화번호 필요
- [ ] is_cust_registered = TRUE/FALSE 처리

---

## 02. 거래정보망 - 물건정보 등록  
### (A) 물건번호만 입력  
### (B) 물건정보 필드 직접입력

- [ ] 입력방식 2가지 지원 (pt_no or p_* 직접입력)
- [ ] trade_div = 'PT'
- [ ] reg_user_id / off_no 필수
- [ ] pt_no 입력 시: pt_sale 존재 여부 검증 (선택)
- [ ] 직접입력 시: 주소 or 물건명 + 가격 필수
- [ ] is_pt_registered = TRUE/FALSE 처리

---

## 03. 거래정보망 조회 / 수정 / 삭제 / 등록

- [ ] GET 조회 API (필터: trade_div, off_no, trade_state, cust_no, pt_no, 날짜 범위)
- [ ] GET 상세조회 API
- [ ] PUT 수정 (트리거가 OLD 로그 자동 백업)
- [ ] DELETE 삭제 (논리삭제 or 실제삭제 결정)
- [ ] POST 신규 등록 (01/02 API 구조 재사용 또는 통합)

---

## 04. 고객정보 직접입력 → 고객테이블(ct_cust) 자동등록 (옵션)

- [ ] 파라미터: autoRegisterCustomer (bool)
- [ ] 조건: trade_div = 'CUST' AND cust_no IS NULL AND autoRegisterCustomer = true
- [ ] ct_cust INSERT
- [ ] 신규 cust_no 발급 후 rt_trade_info 업데이트
- [ ] is_cust_registered = TRUE
- [ ] 실패 시 전체 트랜잭션 롤백

---

## 05. 물건정보 직접입력 → 물건테이블(pt_sale) 자동등록 (옵션)

- [ ] 파라미터: autoRegisterProperty (bool)
- [ ] 조건: trade_div = 'PT' AND pt_no IS NULL AND autoRegisterProperty = true
- [ ] pt_sale INSERT
- [ ] 신규 pt_no 발급 후 rt_trade_info 업데이트
- [ ] is_pt_registered = TRUE
- [ ] 실패 시 전체 트랜잭션 롤백

---

## 부가 TODO

- [ ] trade_state 코드테이블 필요하면 생성
- [ ] 인덱스 설계
  - [ ] idx_rt_trade_info_trade_div
  - [ ] idx_rt_trade_info_off_no
  - [ ] idx_rt_trade_info_cust_no
  - [ ] idx_rt_trade_info_pt_no
  - [ ] idx_rt_trade_info_trade_state
- [ ] 고객/물건 통합 조회뷰 필요 시 생성

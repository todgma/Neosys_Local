CREATE TABLE public.vd_vendor_info (
    vendor_id            BIGSERIAL PRIMARY KEY,               -- PK
    vendor_name          VARCHAR(200) NOT NULL,               -- 상호
    category1            VARCHAR(100),                        -- 1차 분류
    category2            VARCHAR(100),                        -- 2차 분류
    category3            VARCHAR(100),                        -- 3차 분류
    ceo_name             VARCHAR(100),                        -- 대표자명
    manager_name         VARCHAR(100),                        -- 담당자명
    manager_phone        VARCHAR(30),                         -- 담당자 휴대폰
    manager_tel          VARCHAR(30),                         -- 전화번호
    manager_fax          VARCHAR(30),                         -- 팩스번호
    homepage_url         VARCHAR(200),                        -- 홈페이지
    product_desc         TEXT,                                -- 상품설명
    consultation_note    TEXT,                                -- 상담내용

    reg_type             VARCHAR(50) DEFAULT 'ADMIN',         -- 등록구분 (ADMIN/USER/AUTO 등)

    -- 사업장 주소 (분리)
    business_region_code VARCHAR(12),                         -- 사업장 지역 코드
    detail_address       VARCHAR(300),                        -- 상세주소

    -- 관계
    off_no               BIGINT,                              -- 오피스 번호
    rt_no                BIGINT,                              -- 공인중개사 번호

    sort_order           INT DEFAULT 0,                       -- 정렬순서
    use_yn               CHAR(1) DEFAULT 'Y',                 -- 사용 여부

    reg_id               VARCHAR(50) NOT NULL,                -- 등록자
    reg_dt               TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 등록일시
    mod_id               VARCHAR(50),                         -- 수정자
    mod_dt               TIMESTAMP,                           -- 수정일시

    CONSTRAINT chk_vd_vendor_use_yn CHECK (use_yn IN ('Y','N')),
);

협력업체 ↔ 영업지역 매핑 테이블 — vd_vendor_region
CREATE TABLE public.vd_vendor_region (
    vendor_region_id   BIGSERIAL PRIMARY KEY,                -- PK
    vendor_id          BIGINT NOT NULL
                       REFERENCES public.vd_vendor_info(vendor_id)
                       ON DELETE CASCADE,                    -- 업체 삭제 시 매핑 자동 삭제
    region_code        VARCHAR(12) NOT NULL,                 -- 영업지역 코드 (별도 마스터 없음)

    sort_order         INT DEFAULT 0,                        -- 정렬순서
    use_yn             CHAR(1) DEFAULT 'Y',                  -- 사용 여부

    reg_id             VARCHAR(50) NOT NULL,
    reg_dt             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mod_id             VARCHAR(50),
    mod_dt             TIMESTAMP,

    CONSTRAINT uq_vendor_region UNIQUE (vendor_id, region_code),
    CONSTRAINT chk_vd_vendor_region_use_yn CHECK (use_yn IN ('Y','N')),
    CONSTRAINT chk_vd_vendor_region_code_fmt CHECK (
      region_code ~ '^[0-9A-Za-z]{1,12}$'
    )
);


CREATE INDEX idx_vd_vendor_info_vendor_name ON public.vd_vendor_info (vendor_name);
CREATE INDEX idx_vd_vendor_info_category1 ON public.vd_vendor_info (category1);
CREATE INDEX idx_vd_vendor_info_category2 ON public.vd_vendor_info (category2);
CREATE INDEX idx_vd_vendor_info_category3 ON public.vd_vendor_info (category3);
CREATE INDEX idx_vd_vendor_info_off_no ON public.vd_vendor_info (off_no);
CREATE INDEX idx_vd_vendor_info_rt_no ON public.vd_vendor_info (rt_no);
CREATE INDEX idx_vd_vendor_info_sort_order ON public.vd_vendor_info (sort_order);

CREATE INDEX idx_vd_vendor_region_vendor_id ON public.vd_vendor_region (vendor_id);
CREATE INDEX idx_vd_vendor_region_region_code ON public.vd_vendor_region (region_code);
CREATE INDEX idx_vd_vendor_region_sort_order ON public.vd_vendor_region (sort_order);

-- =============================================
-- Table: cs_customer_center (고객센터 문의관리)
-- =============================================
CREATE TABLE public.cs_customer_center (
    inquiry_id     BIGSERIAL PRIMARY KEY,         -- 문의ID
    user_id        VARCHAR(50),                   -- 문의자ID
    name           VARCHAR(100),                  -- 문의자명
    email          VARCHAR(200),                  -- 이메일
    phone          VARCHAR(30),                   -- 연락처
    category       VARCHAR(50),                   -- 문의유형
    title          VARCHAR(300) NOT NULL,         -- 제목
    content        TEXT NOT NULL,                 -- 내용
    answer         TEXT,                          -- 답변내용
    answer_id      VARCHAR(50),                   -- 답변자ID
    answer_dt      TIMESTAMP,                     -- 답변일시
    status         VARCHAR(20) DEFAULT 'PENDING', -- 처리상태 (예: PENDING, DONE)
    sort_order     INT DEFAULT 0,                 -- 정렬순서
    reg_id         VARCHAR(50) NOT NULL,          -- 등록자ID
    reg_dt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 등록일시
    mod_id         VARCHAR(50),                   -- 수정자ID
    mod_dt         TIMESTAMP                      -- 수정일시
);

COMMENT ON TABLE public.cs_customer_center IS '고객센터 문의관리';
COMMENT ON COLUMN public.cs_customer_center.inquiry_id IS '문의ID';
COMMENT ON COLUMN public.cs_customer_center.user_id IS '문의자ID';
COMMENT ON COLUMN public.cs_customer_center.name IS '문의자명';
COMMENT ON COLUMN public.cs_customer_center.email IS '이메일';
COMMENT ON COLUMN public.cs_customer_center.phone IS '연락처';
COMMENT ON COLUMN public.cs_customer_center.category IS '문의유형';
COMMENT ON COLUMN public.cs_customer_center.title IS '제목';
COMMENT ON COLUMN public.cs_customer_center.content IS '내용';
COMMENT ON COLUMN public.cs_customer_center.answer IS '답변내용';
COMMENT ON COLUMN public.cs_customer_center.answer_id IS '답변자ID';
COMMENT ON COLUMN public.cs_customer_center.answer_dt IS '답변일시';
COMMENT ON COLUMN public.cs_customer_center.status IS '처리상태';
COMMENT ON COLUMN public.cs_customer_center.sort_order IS '정렬순서';
COMMENT ON COLUMN public.cs_customer_center.reg_id IS '등록자ID';
COMMENT ON COLUMN public.cs_customer_center.reg_dt IS '등록일시';
COMMENT ON COLUMN public.cs_customer_center.mod_id IS '수정자ID';
COMMENT ON COLUMN public.cs_customer_center.mod_dt IS '수정일시';

-- =========================================
-- 1) 일정 메인 테이블
-- =========================================
CREATE TABLE IF NOT EXISTS rt_schedule (
    schedule_id    BIGSERIAL PRIMARY KEY,
    
    -- 소유/범위
    scope_div      VARCHAR(16)   NOT NULL,       -- 'MY' | 'OFFICE' | 'SHARE' 등
    owner_user_id  VARCHAR(50)   NOT NULL,       -- 생성자/소유자
    office_id      BIGINT,                        -- 사무소 단위 일정
    
    -- 일정 기본
    title          VARCHAR(200),
    content        TEXT,
    phone          VARCHAR(30),
    location       VARCHAR(200),
    
    -- 시간 정보
    start_at       TIMESTAMPTZ   NOT NULL,
    end_at         TIMESTAMPTZ,
    all_day        BOOLEAN       NOT NULL DEFAULT FALSE,
    
    -- 상태 및 권한
    use_yn         CHAR(1)       NOT NULL DEFAULT 'Y',
    is_shared      BOOLEAN       NOT NULL DEFAULT FALSE,
    is_private     BOOLEAN       NOT NULL DEFAULT FALSE,
    
    -- 등록/수정 정보
    reg_id         VARCHAR(50),
    reg_dt         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    upd_id         VARCHAR(50),
    upd_dt         TIMESTAMPTZ,
    
    CONSTRAINT ck_rt_schedule_scope CHECK (scope_div IN ('MY', 'OFFICE', 'SHARE'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS ix_rt_schedule_time   ON rt_schedule(start_at, end_at);
CREATE INDEX IF NOT EXISTS ix_rt_schedule_owner  ON rt_schedule(owner_user_id);
CREATE INDEX IF NOT EXISTS ix_rt_schedule_office ON rt_schedule(office_id);



-- =========================================
-- 2) 일정 연동(링크) 테이블
-- =========================================
CREATE TABLE IF NOT EXISTS rt_schedule_link (
    link_id        BIGSERIAL PRIMARY KEY,
    schedule_id    BIGINT       NOT NULL REFERENCES rt_schedule(schedule_id) ON DELETE CASCADE,
    
    -- 연동 구분
    link_type      VARCHAR(30)  NOT NULL,     -- 'CUST', 'PT', 'CONT', 'TASK', 'FILE', 'ETC' 등
    link_key       VARCHAR(100),              -- 대상 키 (예: cust_no, pt_no 등)
    
    -- 비등록/임시 대상 정보
    meta           JSONB,                     -- 예: {"cust_name":"홍길동","cust_phone":"010-1234-5678"}
    
    -- 등록/수정 정보
    reg_id         VARCHAR(50),
    reg_dt         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    upd_id         VARCHAR(50),
    upd_dt         TIMESTAMPTZ
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS ux_rt_schedule_link_nodup
    ON rt_schedule_link (schedule_id, link_type, link_key)
    WHERE link_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_rt_schedule_link_sched ON rt_schedule_link(schedule_id);
CREATE INDEX IF NOT EXISTS ix_rt_schedule_link_tk    ON rt_schedule_link(link_type, link_key);

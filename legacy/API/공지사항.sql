-- =============================================
-- Table: nt_notice (공지사항)
-- =============================================
CREATE TABLE public.nt_notice (
    notice_id      BIGSERIAL PRIMARY KEY,         -- 공지사항ID
    title          VARCHAR(300) NOT NULL,         -- 제목
    content        TEXT NOT NULL,                 -- 내용
    category       VARCHAR(50),                   -- 구분
    view_count     INT DEFAULT 0,                 -- 조회수
    is_top         CHAR(1) DEFAULT 'N',           -- 상단고정여부
    is_public      CHAR(1) DEFAULT 'Y',           -- 공개여부
    attach_file    VARCHAR(500),                  -- 첨부파일경로
    start_date     DATE,                          -- 게시시작일
    end_date       DATE,                          -- 게시종료일
    sort_order     INT DEFAULT 0,                 -- 정렬순서
    reg_id         VARCHAR(50) NOT NULL,          -- 등록자ID
    reg_dt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 등록일시
    mod_id         VARCHAR(50),                   -- 수정자ID
    mod_dt         TIMESTAMP                      -- 수정일시
);

COMMENT ON TABLE public.nt_notice IS '공지사항';
COMMENT ON COLUMN public.nt_notice.notice_id IS '공지사항ID';
COMMENT ON COLUMN public.nt_notice.title IS '제목';
COMMENT ON COLUMN public.nt_notice.content IS '내용';
COMMENT ON COLUMN public.nt_notice.category IS '구분';
COMMENT ON COLUMN public.nt_notice.view_count IS '조회수';
COMMENT ON COLUMN public.nt_notice.is_top IS '상단고정여부';
COMMENT ON COLUMN public.nt_notice.is_public IS '공개여부';
COMMENT ON COLUMN public.nt_notice.attach_file IS '첨부파일경로';
COMMENT ON COLUMN public.nt_notice.start_date IS '게시시작일';
COMMENT ON COLUMN public.nt_notice.end_date IS '게시종료일';
COMMENT ON COLUMN public.nt_notice.sort_order IS '정렬순서';
COMMENT ON COLUMN public.nt_notice.reg_id IS '등록자ID';
COMMENT ON COLUMN public.nt_notice.reg_dt IS '등록일시';
COMMENT ON COLUMN public.nt_notice.mod_id IS '수정자ID';
COMMENT ON COLUMN public.nt_notice.mod_dt IS '수정일시';

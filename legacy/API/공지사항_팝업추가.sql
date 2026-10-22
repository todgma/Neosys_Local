-- nt_notice 테이블에 팝업여부 컬럼 추가
ALTER TABLE public.nt_notice
ADD COLUMN is_popup CHAR(1) DEFAULT 'N';

COMMENT ON COLUMN public.nt_notice.is_popup IS '팝업여부 (Y/N)';

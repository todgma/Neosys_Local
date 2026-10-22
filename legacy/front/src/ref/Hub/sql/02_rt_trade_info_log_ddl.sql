-- =====================================================
-- 공동중개망 로그 테이블 DDL
-- =====================================================

CREATE TABLE public.rt_trade_info_log (
    LIKE public.rt_trade_info INCLUDING ALL
);

-- PK 제거 (로그는 동일 trade_id 여러 개 허용)
ALTER TABLE public.rt_trade_info_log DROP CONSTRAINT IF EXISTS rt_trade_info_pkey;

-- 로그 시간/타입 필드 추가
ALTER TABLE public.rt_trade_info_log ADD COLUMN logged_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.rt_trade_info_log ADD COLUMN log_type VARCHAR(20) DEFAULT 'UPDATE';

-- =====================================================
-- 인덱스 생성
-- =====================================================

CREATE INDEX idx_rt_trade_info_log_trade_id ON public.rt_trade_info_log(trade_id);
CREATE INDEX idx_rt_trade_info_log_logged_at ON public.rt_trade_info_log(logged_at DESC);

-- =====================================================
-- 코멘트
-- =====================================================

COMMENT ON TABLE public.rt_trade_info_log IS '공동중개망 로그 테이블 (UPDATE/DELETE 이력)';
COMMENT ON COLUMN public.rt_trade_info_log.logged_at IS '로그 기록 시각';
COMMENT ON COLUMN public.rt_trade_info_log.log_type IS '로그 타입 (UPDATE/DELETE)';

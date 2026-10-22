-- =====================================================
-- UPDATE/DELETE 로그 트리거 함수
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_rt_trade_info_log_before_ud()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.rt_trade_info_log
    SELECT OLD.*, NOW(), TG_OP;

    IF (TG_OP = 'UPDATE') THEN
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$$;

-- =====================================================
-- 트리거 생성
-- =====================================================

DROP TRIGGER IF EXISTS trg_rt_trade_info_log_before_ud ON public.rt_trade_info;

CREATE TRIGGER trg_rt_trade_info_log_before_ud
BEFORE UPDATE OR DELETE ON public.rt_trade_info
FOR EACH ROW
EXECUTE FUNCTION public.fn_rt_trade_info_log_before_ud();

-- =====================================================
-- 코멘트
-- =====================================================

COMMENT ON FUNCTION public.fn_rt_trade_info_log_before_ud() IS '공동중개망 UPDATE/DELETE 로그 기록 트리거 함수';

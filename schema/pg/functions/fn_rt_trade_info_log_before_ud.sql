CREATE OR REPLACE FUNCTION public.fn_rt_trade_info_log_before_ud()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO public.rt_trade_info_log
    SELECT OLD.*, NOW(), TG_OP;

    IF (TG_OP = 'UPDATE') THEN
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$function$

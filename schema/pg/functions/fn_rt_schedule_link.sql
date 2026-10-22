CREATE OR REPLACE FUNCTION public.fn_rt_schedule_link(pr_schedule_id bigint)
 RETURNS TABLE(link_id bigint, schedule_id bigint, link_type character varying, link_key character varying, meta jsonb, reg_id character varying, reg_dt timestamp with time zone, upd_id character varying, upd_dt timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        l.link_id,
        l.schedule_id,
        l.link_type,
        l.link_key,
        l.meta,
        l.reg_id,
        l.reg_dt,
        l.upd_id,
        l.upd_dt
    FROM rt_schedule_link l
    WHERE l.schedule_id = pr_schedule_id
    ORDER BY l.link_id;
END;
$function$

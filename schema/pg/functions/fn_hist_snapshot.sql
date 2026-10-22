CREATE OR REPLACE FUNCTION public.fn_hist_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_hist   text  := TG_TABLE_NAME || '_hist';
    v_row    jsonb;                                   -- I/U=NEW, D=OLD (BEGIN 내부에서 TG_OP로 분기)
    v_cols   text  := TG_ARGV[0];                     -- 원본 컬럼 목록(설치 시 주입)
    v_by     text;
    v_off    bigint;
    v_offtxt text;
BEGIN
    BEGIN
        -- COALESCE(NEW,OLD)는 INSERT시 OLD/ DELETE시 NEW가 미할당이라 55000 오류 → TG_OP로 분기
        IF TG_OP = 'DELETE' THEN
            v_row := to_jsonb(OLD);
        ELSE
            v_row := to_jsonb(NEW);
        END IF;

        -- 작성자: 행의 작성자 컬럼 → 쪽지류(sender_id/owner_id) → 세션변수 app.uid 순. 빈 문자열은 NULL 취급.
        v_by := COALESCE(NULLIF(v_row->>'UpdId',''),  NULLIF(v_row->>'RegId',''),  NULLIF(v_row->>'reg_user_id',''),
                         NULLIF(v_row->>'upd_id',''), NULLIF(v_row->>'reg_id',''), NULLIF(v_row->>'UpdID',''), NULLIF(v_row->>'RegID',''),
                         NULLIF(v_row->>'sender_id',''), NULLIF(v_row->>'owner_id',''),
                         NULLIF(current_setting('app.uid', true), ''));

        v_offtxt := COALESCE(v_row->>'OffNo', v_row->>'off_no');
        IF v_offtxt ~ '^[0-9]+$' THEN
            v_off := v_offtxt::bigint;
        ELSE
            SELECT r."OffNo" INTO v_off FROM rt_realtor_info r WHERE r."Id" = v_by;
        END IF;

        EXECUTE format(
            'INSERT INTO public.%I (%s, log_type, logged_at, changed_by, changed_off, client_ip)
             SELECT (jsonb_populate_record(NULL::public.%I, $1)).*, $2, now(), $3, $4, $5',
            v_hist, v_cols, TG_TABLE_NAME)
        USING v_row, left(TG_OP, 1), v_by, v_off, current_setting('app.ip', true);
    EXCEPTION WHEN OTHERS THEN
        -- 감사 실패는 원 작업을 막지 않는다(무시)
        NULL;
    END;
    RETURN NULL;
END $function$

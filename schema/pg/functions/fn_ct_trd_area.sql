CREATE OR REPLACE FUNCTION public.fn_ct_trd_area(p_proc character varying, p_trd_no bigint DEFAULT NULL::bigint, p_seq integer DEFAULT NULL::integer, p_addr1 character varying DEFAULT NULL::character varying, p_addr2 character varying DEFAULT NULL::character varying, p_addr3 character varying DEFAULT NULL::character varying, p_addr4 character varying DEFAULT NULL::character varying, p_user_id character varying DEFAULT NULL::character varying)
 RETURNS TABLE("TrdNo" bigint, "Seq" integer, "Addr1" character varying, "Addr2" character varying, "Addr3" character varying, "Addr4" character varying, "RegDt" timestamp without time zone, "RegId" character varying, "UpdDt" timestamp without time zone, "UpdId" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- INSERT
    IF p_proc = 'INS' THEN
        INSERT INTO ct_trd_area (
            "TrdNo", "Seq", "Addr1", "Addr2", "Addr3", "Addr4",
            "RegDt", "RegId"
        ) VALUES (
            p_trd_no, 
            COALESCE(p_seq, (
                SELECT COALESCE(MAX(a."Seq"), 0) + 1 FROM ct_trd_area a WHERE a."TrdNo" = p_trd_no
            )),
            p_addr1, p_addr2, p_addr3, p_addr4,
            CURRENT_TIMESTAMP, p_user_id
        );

    -- UPDATE
    ELSIF p_proc = 'UPD' THEN
        UPDATE ct_trd_area a
           SET "Addr1" = COALESCE(p_addr1, a."Addr1"),
               "Addr2" = COALESCE(p_addr2, a."Addr2"),
               "Addr3" = COALESCE(p_addr3, a."Addr3"),
               "Addr4" = COALESCE(p_addr4, a."Addr4"),
               "UpdDt" = CURRENT_DATE,
               "UpdId" = p_user_id
         WHERE a."TrdNo" = p_trd_no
           AND a."Seq" = p_seq;

    -- DELETE
    ELSIF p_proc = 'DEL' THEN
        DELETE FROM ct_trd_area a
         WHERE a."TrdNo" = p_trd_no
           AND (p_seq IS NULL OR a."Seq" = p_seq);

    -- SELECT
    ELSIF p_proc = 'SEL' THEN
        RETURN QUERY
        SELECT a."TrdNo", a."Seq", a."Addr1", a."Addr2", a."Addr3", a."Addr4",
               a."RegDt", a."RegId", a."UpdDt", a."UpdId"
          FROM ct_trd_area a
         WHERE (p_trd_no IS NULL OR a."TrdNo" = p_trd_no)
           AND (p_seq IS NULL OR a."Seq" = p_seq)
         ORDER BY a."TrdNo", a."Seq";

    ELSE
        RAISE EXCEPTION 'Invalid p_proc value: % (must be INS, UPD, DEL, SEL)', p_proc;
    END IF;

    -- SELECT 외에는 결과를 반환하지 않음
    IF p_proc <> 'SEL' THEN
        RETURN QUERY
        SELECT a."TrdNo", a."Seq", a."Addr1", a."Addr2", a."Addr3", a."Addr4",
               a."RegDt", a."RegId", a."UpdDt", a."UpdId"
          FROM ct_trd_area a
         WHERE a."TrdNo" = p_trd_no
         ORDER BY a."Seq";
    END IF;

END;
$function$

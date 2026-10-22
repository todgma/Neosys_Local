CREATE OR REPLACE FUNCTION public.fn_rt_realtor_info(p_proc character varying DEFAULT 'SEL'::character varying, p_rt_no bigint DEFAULT NULL::bigint, p_rt_type character varying DEFAULT NULL::character varying, p_rt_nm character varying DEFAULT NULL::character varying, p_rt_tel character varying DEFAULT NULL::character varying, p_rt_reg_no character varying DEFAULT NULL::character varying, p_off_no bigint DEFAULT NULL::bigint, p_grade character varying DEFAULT NULL::character varying, p_id character varying DEFAULT NULL::character varying, p_pw character varying DEFAULT NULL::character varying, p_user_id character varying DEFAULT NULL::character varying)
 RETURNS SETOF rt_realtor_info
 LANGUAGE plpgsql
AS $function$
DECLARE
     v_rt_no int8;
BEGIN
    -- SELECT (목록 조회)
    IF p_proc = 'SEL' THEN
        RETURN QUERY
        SELECT a."RtNo"
             , a."RtType"
             , a."RtNm"
             , a."RtTel"
             , a."RtRegNo"
             , a."OffNo"
             , a."Grade"
             , a."Id"
             , a."Pw"
             , a."RegDt"
             , a."RegId"
             , a."UpdDt"
             , a."UpdId"
             , a.referred_rt_no
        FROM rt_realtor_info a
        WHERE (p_rt_no IS NULL OR a."RtNo" = p_rt_no)
            AND (p_off_no IS NULL OR a."OffNo" = p_off_no);

    -- DTL (상세 조회 - 단건)
    ELSIF p_proc = 'DTL' THEN
        RETURN QUERY
        SELECT a."RtNo"
             , a."RtType"
             , a."RtNm"
             , a."RtTel"
             , a."RtRegNo"
             , a."OffNo"
             , a."Grade"
             , a."Id"
             , a."Pw"
             , a."RegDt"
             , a."RegId"
             , a."UpdDt"
             , a."UpdId"
             , a.referred_rt_no
        FROM rt_realtor_info a
        WHERE a."RtNo" = p_rt_no;

    -- INSERT
    ELSIF p_proc = 'INS' THEN
        INSERT INTO rt_realtor_info
        (
             "RtType", "RtNm", "RtTel", "RtRegNo", "OffNo", "Grade", "Id", "Pw",
            "RegDt", "RegId"
        )
        VALUES
        (
            p_rt_type,
            p_rt_nm,
            p_rt_tel,
            p_rt_reg_no,
            p_off_no,
            p_grade,
            p_id,
            p_pw,
            CURRENT_TIMESTAMP,
            p_user_id
        )
        RETURNING "RtNo" INTO v_rt_no; -- 생성된 RtNo를 변수에 저장

        -- RtType이 'RTTYP01'인 경우에만 sys_menu_rt에 권한 삽입
        IF p_rt_type = 'RTTYP01' THEN
            -- sys_menu의 모든 메뉴를 sys_menu_rt에 권한 Y로 삽입
            INSERT INTO sys_menu_rt (rt_no, id, c_yn, r_yn, u_yn, d_yn, use_yn, reg_dt, reg_id)
            SELECT
                v_rt_no,           -- 방금 생성된 회원의 RtNo
                sm.id,             -- sys_menu의 id
                'Y',               -- Create 권한
                'Y',               -- Read 권한
                'Y',               -- Update 권한
                'Y',               -- Delete 권한
                'Y',               -- 사용여부
                CURRENT_TIMESTAMP, -- 등록일시
                p_user_id          -- 등록자 ID
            FROM sys_menu sm
            WHERE sm.use_yn = 'Y';  -- 사용 가능한 메뉴만 삽입
        END IF;

    -- UPDATE
    ELSIF p_proc = 'UPD' THEN
        UPDATE rt_realtor_info a
        SET "RtType"   = COALESCE(p_rt_type, a."RtType"),
            "RtNm"     = COALESCE(p_rt_nm, a."RtNm"),
            "RtTel"    = COALESCE(p_rt_tel, a."RtTel"),
            "RtRegNo"  = COALESCE(p_rt_reg_no, a."RtRegNo"),
            "OffNo"    = COALESCE(p_off_no, a."OffNo"),
            "Grade"    = COALESCE(p_grade, a."Grade"),
            "Id"       = COALESCE(p_id, a."Id"),
            "Pw"       = COALESCE(p_pw, a."Pw"),
            "UpdDt"    = CURRENT_TIMESTAMP,
            "UpdId"    = p_user_id
        WHERE a."RtNo" = p_rt_no;

    -- DELETE
    ELSIF p_proc = 'DEL' THEN
        DELETE FROM rt_realtor_info a
        WHERE a."RtNo" = p_rt_no;

    -- LGI (로그인)
    ELSIF p_proc = 'LGI' THEN
        RETURN QUERY
        SELECT a."RtNo"
             , a."RtType"
             , a."RtNm"
             , a."RtTel"
             , a."RtRegNo"
             , a."OffNo"
             , a."Grade"
             , a."Id"
             , a."Pw"
             , a."RegDt"
             , a."RegId"
             , a."UpdDt"
             , a."UpdId"
             , a.referred_rt_no
          FROM rt_realtor_info a
         WHERE a."Id" = p_id;
    ELSE
        RAISE EXCEPTION 'Unknown p_proc value: %', p_proc;
    END IF;
END;
$function$

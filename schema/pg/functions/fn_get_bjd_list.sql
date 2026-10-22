CREATE OR REPLACE FUNCTION public.fn_get_bjd_list(p_address_type integer, p_address_code text DEFAULT NULL::text)
 RETURNS TABLE("Idx" bigint, "DongCode" text, "DongName" text, "HjdCode" text, "HjdName" text, "BjdCode" text, "BjdName" text, "StartDate" text, "EndDate" text, "IsSigungu" boolean, "SidoName" text, "SidoNameShort" text, "SigunguName" text, "SigunguName2" text, "MapX" text, "MapY" text, "Sort" integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- address_type = 1: 시/도 조회
    IF p_address_type = 1 THEN
        RETURN QUERY
        SELECT
            h.idx::bigint        AS "Idx",
            NULL::text           AS "DongCode",
            NULL::text           AS "DongName",
            h.hjd_code::text     AS "HjdCode",
            h.hjd_name::text     AS "HjdName",
            h.bjd_code::text     AS "BjdCode",
            h.bjd_name::text     AS "BjdName",
            h.start_date::text   AS "StartDate",
            h.end_date::text     AS "EndDate",
            h.is_sigungu         AS "IsSigungu",
            h.sido_name::text    AS "SidoName",
            h.sido_name_short::text AS "SidoNameShort",
            h.sigungu_name::text AS "SigunguName",
            h.sigungu_name2::text AS "SigunguName2",
            h.map_x::text        AS "MapX",
            h.map_y::text        AS "MapY",
            h.sort               AS "Sort"
        FROM hjd_bjd h
        WHERE h.hjd_code LIKE '%00000000'
          AND h.end_date IS NULL
        ORDER BY h.sort;

    -- address_type = 2: 시군구 조회 (세종시 특수 처리)
    ELSIF p_address_type = 2 AND p_address_code = '3600000000' THEN
        RETURN QUERY
        SELECT
            NULL::bigint         AS "Idx",
            '3611000000'::text   AS "DongCode",
            '세종시'::text       AS "DongName",
            NULL::text           AS "HjdCode",
            NULL::text           AS "HjdName",
            NULL::text           AS "BjdCode",
            NULL::text           AS "BjdName",
            NULL::text           AS "StartDate",
            NULL::text           AS "EndDate",
            NULL::boolean        AS "IsSigungu",
            NULL::text           AS "SidoName",
            NULL::text           AS "SidoNameShort",
            NULL::text           AS "SigunguName",
            NULL::text           AS "SigunguName2",
            '127.292375'::text   AS "MapX",
            '36.592907'::text    AS "MapY",
            NULL::integer        AS "Sort";

    -- address_type = 4: 읍면동 조회 (세종시 특수 처리)
    ELSIF p_address_type = 4 AND p_address_code = '3611000000' THEN
        RETURN QUERY
        SELECT
            t."DongCode",
            t."DongName",
            t."MapX",
            t."MapY",
            NULL::bigint   AS "Idx",
            NULL::text     AS "HjdCode",
            NULL::text     AS "HjdName",
            NULL::text     AS "BjdCode",
            NULL::text     AS "BjdName",
            NULL::text     AS "StartDate",
            NULL::text     AS "EndDate",
            NULL::boolean  AS "IsSigungu",
            NULL::text     AS "SidoName",
            NULL::text     AS "SidoNameShort",
            NULL::text     AS "SigunguName",
            NULL::text     AS "SigunguName2",
            NULL::integer  AS "Sort"
        FROM (
            SELECT DISTINCT
                h.hjd_name::text AS "DongName",
                h.hjd_code::text AS "DongCode",
                h.map_x::text    AS "MapX",
                h.map_y::text    AS "MapY"
            FROM hjd_bjd h
            WHERE h.hjd_code LIKE '36%'
              AND h.end_date IS NULL
              AND COALESCE(h.hjd_name,'') <> ''
              AND h.hjd_name NOT IN ('', '한솔동')

            UNION ALL

            SELECT DISTINCT
                h.bjd_name::text AS "DongName",
                h.bjd_code::text AS "DongCode",
                h.map_x::text    AS "MapX",
                h.map_y::text    AS "MapY"
            FROM hjd_bjd h
            WHERE h.hjd_code LIKE '36%'
              AND h.end_date IS NULL
              AND h.hjd_name = '한솔동'
        ) t
        ORDER BY t."DongName";

    -- address_type = 2: 일반 시군구 조회
    ELSIF p_address_type = 2
      AND p_address_code IS NOT NULL
      AND p_address_code > '' THEN
        RETURN QUERY
        SELECT
            h.idx::bigint        AS "Idx",
            NULL::text           AS "DongCode",
            NULL::text           AS "DongName",
            h.hjd_code::text     AS "HjdCode",
            h.hjd_name::text     AS "HjdName",
            h.bjd_code::text     AS "BjdCode",
            h.bjd_name::text     AS "BjdName",
            h.start_date::text   AS "StartDate",
            h.end_date::text     AS "EndDate",
            h.is_sigungu         AS "IsSigungu",
            h.sido_name::text    AS "SidoName",
            h.sido_name_short::text AS "SidoNameShort",
            h.sigungu_name::text AS "SigunguName",
            h.sigungu_name2::text AS "SigunguName2",
            h.map_x::text        AS "MapX",
            h.map_y::text        AS "MapY",
            h.sort               AS "Sort"
        FROM hjd_bjd h
        WHERE h.bjd_code LIKE (substring(p_address_code from 1 for 2) || '%')
          AND h.bjd_code LIKE '%00000'
          AND COALESCE(h.sigungu_name,'') <> ''
          AND COALESCE(h.map_x,'') <> ''
          AND h.end_date IS NULL
          AND h.bjd_name IS NOT NULL
        ORDER BY h.sigungu_name, h.sigungu_name2;

    -- address_type = 3: 읍면동 조회 (행정동)
    ELSIF p_address_type = 3
      AND p_address_code IS NOT NULL
      AND p_address_code > '' THEN
        RETURN QUERY
        SELECT DISTINCT ON (h.sido_name, h.sigungu_name, h.sigungu_name2, h.hjd_name)
            NULL::bigint          AS "Idx",
            NULL::text            AS "DongCode",
            NULL::text            AS "DongName",
            h.hjd_code::text      AS "HjdCode",
            h.hjd_name::text      AS "HjdName",
            NULL::text            AS "BjdCode",
            NULL::text            AS "BjdName",
            NULL::text            AS "StartDate",
            NULL::text            AS "EndDate",
            NULL::boolean         AS "IsSigungu",
            h.sido_name::text     AS "SidoName",
            NULL::text            AS "SidoNameShort",
            h.sigungu_name::text  AS "SigunguName",
            h.sigungu_name2::text AS "SigunguName2",
            h.map_x::text         AS "MapX",
            h.map_y::text         AS "MapY",
            NULL::integer         AS "Sort"
        FROM hjd_bjd h
        WHERE h.hjd_code LIKE (substring(p_address_code from 1 for 5) || '%')
          AND h.end_date IS NULL
          AND h.hjd_code NOT LIKE '%00000'
          AND COALESCE(h.sigungu_name,'') <> ''
          AND COALESCE(h.hjd_name,'') <> ''
          AND COALESCE(h.map_x,'') <> ''
          AND h.hjd_code LIKE '%00'
        ORDER BY h.sido_name, h.sigungu_name, h.sigungu_name2, h.hjd_name;

    -- address_type = 4: 법정동 조회
    ELSIF p_address_type = 4
      AND p_address_code IS NOT NULL
      AND p_address_code > '' THEN
        RETURN QUERY
        SELECT DISTINCT ON (h.sido_name, h.sigungu_name, h.sigungu_name2, h.bjd_name)
            NULL::bigint          AS "Idx",
            NULL::text            AS "DongCode",
            NULL::text            AS "DongName",
            NULL::text            AS "HjdCode",
            NULL::text            AS "HjdName",
            h.bjd_code::text      AS "BjdCode",
            h.bjd_name::text      AS "BjdName",
            NULL::text            AS "StartDate",
            NULL::text            AS "EndDate",
            NULL::boolean         AS "IsSigungu",
            h.sido_name::text     AS "SidoName",
            NULL::text            AS "SidoNameShort",
            h.sigungu_name::text  AS "SigunguName",
            h.sigungu_name2::text AS "SigunguName2",
            h.map_x::text         AS "MapX",
            h.map_y::text         AS "MapY",
            NULL::integer         AS "Sort"
        FROM hjd_bjd h
        WHERE h.bjd_code LIKE (substring(p_address_code from 1 for 5) || '%')
          AND h.end_date IS NULL
          AND h.bjd_code NOT LIKE '%00000'
          AND COALESCE(h.sigungu_name,'') <> ''
          AND COALESCE(h.bjd_name,'') <> ''
          AND h.bjd_code LIKE '%00'
        ORDER BY h.sido_name, h.sigungu_name, h.sigungu_name2, h.bjd_name;

    -- address_type = 5: 행정동 코드로 상세 조회
    ELSIF p_address_type = 5
      AND p_address_code IS NOT NULL
      AND p_address_code > '' THEN
        RETURN QUERY
        SELECT
            h.idx::bigint        AS "Idx",
            NULL::text           AS "DongCode",
            NULL::text           AS "DongName",
            h.hjd_code::text     AS "HjdCode",
            h.hjd_name::text     AS "HjdName",
            h.bjd_code::text     AS "BjdCode",
            h.bjd_name::text     AS "BjdName",
            h.start_date::text   AS "StartDate",
            h.end_date::text     AS "EndDate",
            h.is_sigungu         AS "IsSigungu",
            h.sido_name::text    AS "SidoName",
            h.sido_name_short::text AS "SidoNameShort",
            h.sigungu_name::text AS "SigunguName",
            h.sigungu_name2::text AS "SigunguName2",
            h.map_x::text        AS "MapX",
            h.map_y::text        AS "MapY",
            h.sort               AS "Sort"
        FROM hjd_bjd h
        WHERE h.hjd_code = p_address_code
          AND COALESCE(h.map_x,'') <> ''
          AND h.end_date IS NULL
        ORDER BY h.sido_name, h.sigungu_name, h.sigungu_name2, h.hjd_name;

    -- address_type = 6: 법정동 코드로 상세 조회
    ELSIF p_address_type = 6
      AND p_address_code IS NOT NULL
      AND p_address_code > '' THEN
        RETURN QUERY
        SELECT
            h.idx::bigint        AS "Idx",
            NULL::text           AS "DongCode",
            NULL::text           AS "DongName",
            h.hjd_code::text     AS "HjdCode",
            h.hjd_name::text     AS "HjdName",
            h.bjd_code::text     AS "BjdCode",
            h.bjd_name::text     AS "BjdName",
            h.start_date::text   AS "StartDate",
            h.end_date::text     AS "EndDate",
            h.is_sigungu         AS "IsSigungu",
            h.sido_name::text    AS "SidoName",
            h.sido_name_short::text AS "SidoNameShort",
            h.sigungu_name::text AS "SigunguName",
            h.sigungu_name2::text AS "SigunguName2",
            h.map_x::text        AS "MapX",
            h.map_y::text        AS "MapY",
            h.sort               AS "Sort"
        FROM hjd_bjd h
        WHERE h.bjd_code = p_address_code
          AND COALESCE(h.map_x,'') <> ''
          AND h.end_date IS NULL
        ORDER BY h.sido_name, h.sigungu_name, h.sigungu_name2, h.bjd_name;

    -- address_type = 7: 리 조회
    ELSIF p_address_type = 7
      AND p_address_code IS NOT NULL
      AND p_address_code > '' THEN
        RETURN QUERY
        SELECT DISTINCT ON (h.sido_name, h.sigungu_name, h.sigungu_name2, h.bjd_name)
            NULL::bigint          AS "Idx",
            NULL::text            AS "DongCode",
            NULL::text            AS "DongName",
            NULL::text            AS "HjdCode",
            NULL::text            AS "HjdName",
            h.bjd_code::text      AS "BjdCode",
            h.bjd_name::text      AS "BjdName",
            NULL::text            AS "StartDate",
            NULL::text            AS "EndDate",
            NULL::boolean         AS "IsSigungu",
            h.sido_name::text     AS "SidoName",
            NULL::text            AS "SidoNameShort",
            h.sigungu_name::text  AS "SigunguName",
            h.sigungu_name2::text AS "SigunguName2",
            h.map_x::text         AS "MapX",
            h.map_y::text         AS "MapY",
            NULL::integer         AS "Sort"
        FROM hjd_bjd h
        WHERE h.bjd_code LIKE (substring(p_address_code from 1 for 8) || '%')
          AND h.end_date IS NULL
          AND COALESCE(h.bjd_name,'') <> ''
          AND h.bjd_code NOT LIKE '%00'
        ORDER BY h.sido_name, h.sigungu_name, h.sigungu_name2, h.bjd_name;

    ELSE
        RAISE EXCEPTION '허용되지 않는 address_type입니다.';
    END IF;
END;
$function$

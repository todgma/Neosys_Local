CREATE OR REPLACE FUNCTION public.fn_get_danji_list_by_bjd(p_bjd_code character varying, p_hscp_type_code character varying DEFAULT NULL::character varying)
 RETURNS TABLE(id bigint, building_code character varying, building_name character varying, bjd_code character varying, address_bunji character varying, naver_danji_code character varying, family_cnt integer, max_floor integer, min_floor integer, tot_bld_cnt integer, approve_date character varying, heat_type character varying, heat_ful character varying, is_prk boolean, totprk_cnt integer, building_closing_rate character varying, floor_area_rate character varying, map_x character varying, map_y character varying, hscp_type_code character varying, is_service boolean, csco_name character varying, picture_url character varying, totprk_cnt_per numeric, areas json)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.building_code,
        d.building_name,
        d.bjd_code,
        d.address_bunji,
        d.naver_danji_code,
        d.family_cnt,
        d.max_floor,
        d.min_floor,
        d.tot_bld_cnt,
        d.approve_date,
        d.heat_type,
        d.heat_ful,
        d.is_prk,
        d.totprk_cnt,
        d.building_closing_rate,
        d.floor_area_rate,
        d.map_x,
        d.map_y,
        d.hscp_type_code,
        d.is_service,
        d.csco_name,
        d.picture_url,
        d.totprk_cnt_per,
        COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'id',               da.idx,
                        'planTypeName',     da.plan_type_name,
                        'ptpNo',            da.ptp_no,
                        'splySpc',          da.sply_spc,
                        'exclsSpc',         da.excls_spc,
                        'ctrtSpc',          da.ctrt_spc,
                        'roomCount',        da.room_cnt,
                        'bathroomCount',    da.bathroom_cnt,
                        'inUse',            CASE WHEN da.in_use = 'Y' THEN TRUE ELSE FALSE END
                    )
                    ORDER BY da.sply_spc
                )
                FROM danji_area_new da
                WHERE da.naver_danji_code::VARCHAR = d.naver_danji_code
            ),
            '[]'::json
        ) AS areas
    FROM danji d
    WHERE d.bjd_code = p_bjd_code
      -- 단지유형 지정 시 해당 유형만(NULL/'' = 전체)
      AND (p_hscp_type_code IS NULL OR p_hscp_type_code = '' OR d.hscp_type_code = p_hscp_type_code)
      AND d.is_active = TRUE
      AND d.deleted_at IS NULL
    ORDER BY d.building_name;
END;
$function$

-- bjd_code(+단지유형)로 단지 + 평형 목록 조회 함수
-- 반환: 단지 기본정보 + 평형 목록(JSON 배열)
--  · p_hscp_type_code 지정 시 해당 단지유형(재건축/재개발/오피스텔 등)만 반환. NULL/'' = 전체

-- 기존 1-인자 버전 제거(시그니처 변경 → 오버로드 방지)
DROP FUNCTION IF EXISTS fn_get_danji_list_by_bjd(VARCHAR);

CREATE OR REPLACE FUNCTION fn_get_danji_list_by_bjd(
    p_bjd_code VARCHAR,
    p_hscp_type_code VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id                      BIGINT,
    building_code           VARCHAR,
    building_name           VARCHAR,
    bjd_code                VARCHAR,
    address_bunji           VARCHAR,
    naver_danji_code        VARCHAR,
    family_cnt              INTEGER,
    max_floor               INTEGER,
    min_floor               INTEGER,
    tot_bld_cnt             INTEGER,
    approve_date            VARCHAR,
    heat_type               VARCHAR,
    heat_ful                VARCHAR,
    is_prk                  BOOLEAN,
    totprk_cnt              INTEGER,
    building_closing_rate   VARCHAR,
    floor_area_rate         VARCHAR,
    map_x                   VARCHAR,
    map_y                   VARCHAR,
    hscp_type_code          VARCHAR,
    is_service              BOOLEAN,
    csco_name               VARCHAR,
    picture_url             VARCHAR,
    totprk_cnt_per          NUMERIC,
    areas                   JSON
)
LANGUAGE plpgsql
AS $$
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
$$;

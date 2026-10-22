using System.Data;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using RealestateAPI.Property.Models;

namespace RealestateAPI.Property.Services
{
    public interface ILayoutService
    {
        Task<List<DanjiDong>> GetDongListAsync(int danjiCode);
        Task<List<DanjiHo>> GetHoListAsync(int danjiCode, int dongNo);
        Task<List<Occupancy>> GetOccupancyListAsync(int danjiCode, int dongNo, long offNo);
        Task<int> SaveOccupancyAsync(OccupancyRequest request);
        Task<object> GetAllLayoutDataAsync(int danjiCode, long offNo);
    }

    public class LayoutService : ILayoutService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<LayoutService> _logger;

        public LayoutService(IPostgresDataService dataService, IConfiguration configuration, ILogger<LayoutService> logger)
        {
            _dataService = dataService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<List<DanjiDong>> GetDongListAsync(int danjiCode)
        {
            const string sql = "SELECT dong_no AS \"DongNo\", dong_name AS \"DongName\", highest_floor_cnt AS \"HighestFloorCnt\", direction_type_code AS \"DirectionTypeCd\", entrance_type_cd AS \"EntranceTypeCd\", in_use AS \"InUse\", reg_date AS \"RegDate\", update_date AS \"UpdateDate\" FROM danji_dong_new WHERE naver_danji_code = @danjiCode ORDER BY dong_no ASC;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@danjiCode", danjiCode)
            };

            var result = await _dataService.QueryAsyncPg<DanjiDong>("DEV", sql, parameters);
            return result ?? new List<DanjiDong>();
        }

        public async Task<List<DanjiHo>> GetHoListAsync(int danjiCode, int dongNo)
        {
            try { await _dataService.ExecuteNonQueryAsyncPg("DEV", "ALTER TABLE danji_ho_new ADD COLUMN IF NOT EXISTS store_yn bit(1) DEFAULT B'0'; ALTER TABLE danji_ho_new ADD COLUMN IF NOT EXISTS ho_gubun varchar(20);", new List<NpgsqlParameter>()); } catch { /* ignore */ }
            // 물건등록폼 호 목록 — 상가/필로티/기타(입력) 호는 제외하고 일반 호만 제공
            const string sql = "SELECT dong_no AS \"DongNo\", ho_number AS \"HoNumber\", ho_name AS \"HoName\", ptp_no AS \"PtpNo\", ptp_name AS \"PtpName\", floor AS \"Floor\", sply_spc AS \"SplySpc\", excls_spc AS \"ExclsSpc\", ctrt_spc AS \"CtrtSpc\", line_no AS \"LineNo\", CASE WHEN piloti_yn = B'1' THEN 'Y' ELSE 'N' END AS \"PilotiYn\", CASE WHEN store_yn = B'1' THEN 'Y' ELSE 'N' END AS \"StoreYn\", ho_gubun AS \"HoGubun\", reg_date AS \"RegDate\", update_date AS \"UpdateDate\" FROM danji_ho_new WHERE naver_danji_code = @danjiCode AND dong_no = @dongNo AND btrim(COALESCE(ho_name, '')) <> '' AND COALESCE(store_yn, B'0') <> B'1' AND COALESCE(piloti_yn, B'0') <> B'1' AND COALESCE(NULLIF(ho_gubun, ''), '일반') NOT IN ('상가', '필로티', '기타') ORDER BY CASE WHEN floor ~ '^-?[0-9]+$' THEN CAST(floor AS INTEGER) ELSE 0 END DESC, ho_number ASC;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@danjiCode", danjiCode),
                new NpgsqlParameter("@dongNo", dongNo)
            };

            var result = await _dataService.QueryAsyncPg<DanjiHo>("DEV", sql, parameters);
            return result ?? new List<DanjiHo>();
        }

        public async Task<List<Occupancy>> GetOccupancyListAsync(int danjiCode, int dongNo, long offNo)
        {
            const string sql = "SELECT occ_no AS \"OccupancyNo\", off_no AS \"OffNo\", naver_danji_code AS \"NaverDanjiCode\", dong_no AS \"DongNo\", ho_number AS \"HoNumber\", floor AS \"Floor\", occupancy_status AS \"OccupancyStatus\", occupancy_name AS \"OccupancyName\", occupancy_phone AS \"OccupancyPhone\", memo AS \"Memo\", reg_dt AS \"CrtDt\", reg_id AS \"CrtId\", upd_dt AS \"UpdDt\", upd_id AS \"UpdId\" FROM danji_occupancy WHERE naver_danji_code = @danjiCode AND dong_no = @dongNo AND (off_no = @offNo OR off_no = 0) ORDER BY CASE WHEN floor ~ '^-?[0-9]+$' THEN CAST(floor AS INTEGER) ELSE 0 END DESC, ho_number ASC;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@danjiCode", danjiCode),
                new NpgsqlParameter("@dongNo", dongNo),
                new NpgsqlParameter("@offNo", offNo)
            };

            var result = await _dataService.QueryAsyncPg<Occupancy>("DEV", sql, parameters);
            return result ?? new List<Occupancy>();
        }

        public async Task<int> SaveOccupancyAsync(OccupancyRequest request)
        {
            // 중개사무소(off_no) 단위 저장/공유. (off_no, danji, dong, ho) 단위 upsert
            const string sql = "INSERT INTO danji_occupancy (off_no, naver_danji_code, dong_no, ho_number, floor, occupancy_status, occupancy_name, occupancy_phone, memo, reg_dt, reg_id, upd_dt, upd_id) VALUES (@offNo, @naverDanjiCode, @dongNo, @hoNumber, @floor, @occupancyStatus, @occupancyName, @occupancyPhone, @memo, CURRENT_TIMESTAMP, @userId, CURRENT_TIMESTAMP, @userId) ON CONFLICT (off_no, naver_danji_code, dong_no, ho_number) DO UPDATE SET floor = EXCLUDED.floor, occupancy_status = EXCLUDED.occupancy_status, occupancy_name = EXCLUDED.occupancy_name, occupancy_phone = EXCLUDED.occupancy_phone, memo = EXCLUDED.memo, upd_dt = CURRENT_TIMESTAMP, upd_id = EXCLUDED.upd_id RETURNING occ_no;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@offNo", request.OffNo),
                new NpgsqlParameter("@naverDanjiCode", request.NaverDanjiCode),
                new NpgsqlParameter("@dongNo", request.DongNo),
                new NpgsqlParameter("@hoNumber", request.HoNumber),
                new NpgsqlParameter("@floor", (object?)request.Floor ?? DBNull.Value),
                new NpgsqlParameter("@occupancyStatus", (object?)request.OccupancyStatus ?? DBNull.Value),
                new NpgsqlParameter("@occupancyName", (object?)request.OccupancyName ?? DBNull.Value),
                new NpgsqlParameter("@occupancyPhone", (object?)request.OccupancyPhone ?? DBNull.Value),
                new NpgsqlParameter("@memo", (object?)request.Memo ?? DBNull.Value),
                new NpgsqlParameter("@userId", (object?)request.UserId ?? DBNull.Value)
            };

            int occupancyNo = 0;
            using (var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV")))
            {
                await connection.OpenAsync();
                using (var command = new NpgsqlCommand(sql, connection))
                {
                    command.Parameters.AddRange(parameters.ToArray());
                    var result = await command.ExecuteScalarAsync();
                    if (result != null && result != DBNull.Value)
                    {
                        occupancyNo = Convert.ToInt32(result);
                    }
                }
            }

            return occupancyNo;
        }

        public async Task<object> GetAllLayoutDataAsync(int danjiCode, long offNo)
        {
            // 1. 동 목록 조회
            var dongList = await GetDongListAsync(danjiCode);

            // 2. 모든 동의 호 리스트 + 점유현황(중개사무소 off_no 스코프) 조회
            try { await _dataService.ExecuteNonQueryAsyncPg("DEV", "ALTER TABLE danji_ho_new ADD COLUMN IF NOT EXISTS store_yn bit(1) DEFAULT B'0'; ALTER TABLE danji_ho_new ADD COLUMN IF NOT EXISTS ho_gubun varchar(20);", new List<NpgsqlParameter>()); } catch { /* ignore */ }
            const string hoSql = "SELECT dong_no AS \"DongNo\", ho_number AS \"HoNumber\", ho_name AS \"HoName\", ptp_no AS \"PtpNo\", ptp_name AS \"PtpName\", floor AS \"Floor\", sply_spc AS \"SplySpc\", excls_spc AS \"ExclsSpc\", ctrt_spc AS \"CtrtSpc\", line_no AS \"LineNo\", CASE WHEN piloti_yn = B'1' THEN 'Y' ELSE 'N' END AS \"PilotiYn\", CASE WHEN store_yn = B'1' THEN 'Y' ELSE 'N' END AS \"StoreYn\", ho_gubun AS \"HoGubun\", reg_date AS \"RegDate\", update_date AS \"UpdateDate\" FROM danji_ho_new WHERE naver_danji_code = @danjiCode ORDER BY dong_no ASC, ho_number DESC;";

            // off_no=@offNo(내 사무소 점유현황) + off_no=0(관리자 전체공통 조합원분) 병합
            const string occupancySql = "SELECT occ_no AS \"OccupancyNo\", off_no AS \"OffNo\", naver_danji_code AS \"NaverDanjiCode\", dong_no AS \"DongNo\", ho_number AS \"HoNumber\", floor AS \"Floor\", occupancy_status AS \"OccupancyStatus\", occupancy_name AS \"OccupancyName\", occupancy_phone AS \"OccupancyPhone\", memo AS \"Memo\", reg_dt AS \"CrtDt\", reg_id AS \"CrtId\", upd_dt AS \"UpdDt\", upd_id AS \"UpdId\" FROM danji_occupancy WHERE naver_danji_code = @danjiCode AND (off_no = @offNo OR off_no = 0) ORDER BY dong_no ASC, ho_number DESC;";

            var hoParameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@danjiCode", danjiCode)
            };

            var occupancyParameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@danjiCode", danjiCode),
                new NpgsqlParameter("@offNo", offNo)
            };

            var hoListAll = await _dataService.QueryAsyncPg<DanjiHo>("DEV", hoSql, hoParameters) ?? new List<DanjiHo>();
            var occupancyListAll = await _dataService.QueryAsyncPg<Occupancy>("DEV", occupancySql, occupancyParameters) ?? new List<Occupancy>();

            // 2-1. 단지 헤더 정보(아파트명/주소/세대수) 조회
            const string danjiSql = @"
                SELECT d.building_name AS ""BuildingName"",
                       d.address_bunji AS ""AddressBunji"",
                       d.family_cnt    AS ""FamilyCnt"",
                       d.bjd_code      AS ""BjdCode"",
                       h.sido_name     AS ""SidoName"",
                       h.sigungu_name  AS ""SigunguName"",
                       h.bjd_name      AS ""BjdName"",
                       TRIM(CONCAT_WS(' ', h.sido_name, h.sigungu_name, h.bjd_name, d.address_bunji)) AS ""FullAddress""
                FROM danji d
                LEFT JOIN LATERAL (
                    SELECT sido_name, sigungu_name, bjd_name
                    FROM hjd_bjd
                    WHERE bjd_code::text = d.bjd_code::text AND end_date IS NULL
                    LIMIT 1
                ) h ON TRUE
                WHERE d.naver_danji_code = @danjiCode::varchar AND d.is_active = TRUE AND d.deleted_at IS NULL
                LIMIT 1;";
            var danjiParameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@danjiCode", danjiCode)
            };
            var danjiInfoList = await _dataService.QueryAsyncPg<DanjiHeader>("DEV", danjiSql, danjiParameters);
            var danjiInfo = (danjiInfoList != null && danjiInfoList.Count > 0) ? danjiInfoList[0] : null;

            // 3. 동별로 그룹화
            var layoutDataByDong = dongList.Select(dong => new
            {
                dongNo = dong.DongNo,
                dongName = dong.DongName,
                hoList = hoListAll.Where(ho => ho.DongNo == dong.DongNo).ToList(),
                occupancyList = occupancyListAll.Where(occ => occ.DongNo == dong.DongNo).ToList()
            }).ToList();

            return new
            {
                dongList = dongList,
                layoutData = layoutDataByDong,
                danjiInfo = danjiInfo
            };
        }
    }
}

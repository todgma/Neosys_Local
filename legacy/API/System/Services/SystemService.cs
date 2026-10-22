using RealestateAPI.System.Models;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using System.Text.Json;
using System.Data;
using RealestateAPI.Admin.Models;

namespace RealestateAPI.System.Services
{
    public interface ISystemService
    {
        Task<List<BjdDto>> GetBjdListAsync(int addressType, string? addressCode);
        Task<List<DanjiDto>> GetDanjiListByBjdCodeAsync(string bjdCode, string? hscpType = null);
        Task<List<DanjiDongDto>> GetDongListByDanjiAsync(string danjiCode);
        Task<List<DanjiHoDto>> GetHoListByDongAsync(string danjiCode, int dongNo);
        Task<List<DanjiAreaDto2>> GetAreaListByDanjiAsync(string danjiCode);
        Task<NoticeList> GetNoticeListAsync(long? noticeId, string? category, string? isPublic, string? isPopup, int pageNumber, int rowsPerPage);
    }

    public class SystemService : ISystemService
    {
        private readonly IPostgresDataService _dataService;

        public SystemService(IPostgresDataService dataService)
        {
            _dataService = dataService;
        }

        public async Task<List<BjdDto>> GetBjdListAsync(int addressType, string? addressCode)
        {
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("p_address_type", NpgsqlDbType.Integer) { Value = addressType },
                new NpgsqlParameter("p_address_code", NpgsqlDbType.Text) { Value = (object?)addressCode ?? DBNull.Value }
            };

            var dt = await _dataService.ExecFunctionAsyncPgWithDataTable("DEV", "fn_get_bjd_list", parameters);

            var result = new List<BjdDto>();
            foreach (DataRow row in dt.Rows)
            {
                result.Add(new BjdDto
                {
                    Idx = row["Idx"] != DBNull.Value ? Convert.ToInt64(row["Idx"]) : null,
                    DongCode = row["DongCode"]?.ToString(),
                    DongName = row["DongName"]?.ToString(),
                    HjdCode = row["HjdCode"]?.ToString(),
                    HjdName = row["HjdName"]?.ToString(),
                    BjdCode = row["BjdCode"]?.ToString(),
                    BjdName = row["BjdName"]?.ToString(),
                    StartDate = row["StartDate"]?.ToString(),
                    EndDate = row["EndDate"]?.ToString(),
                    IsSigungu = row["IsSigungu"] != DBNull.Value ? Convert.ToBoolean(row["IsSigungu"]) : null,
                    SidoName = row["SidoName"]?.ToString(),
                    SidoNameShort = row["SidoNameShort"]?.ToString(),
                    SigunguName = row["SigunguName"]?.ToString(),
                    SigunguName2 = row["SigunguName2"]?.ToString(),
                    MapX = row["MapX"]?.ToString(),
                    MapY = row["MapY"]?.ToString(),
                    Sort = row["Sort"] != DBNull.Value ? Convert.ToInt32(row["Sort"]) : null
                });
            }

            return result;
        }

        public async Task<List<DanjiDto>> GetDanjiListByBjdCodeAsync(string bjdCode, string? hscpType = null)
        {
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("p_bjd_code", NpgsqlDbType.Varchar) { Value = bjdCode },
                new NpgsqlParameter("p_hscp_type_code", NpgsqlDbType.Varchar) { Value = string.IsNullOrWhiteSpace(hscpType) ? (object)DBNull.Value : hscpType }
            };

            var dt = await _dataService.ExecFunctionAsyncPgWithDataTable("DEV", "fn_get_danji_list_by_bjd", parameters);

            var result = new List<DanjiDto>();
            foreach (DataRow row in dt.Rows)
            {
                var areas = new List<DanjiAreaDto>();

                // JSON 배열 파싱
                if (row["areas"] != DBNull.Value && row["areas"] != null)
                {
                    var areasJson = row["areas"].ToString();
                    if (!string.IsNullOrEmpty(areasJson))
                    {
                        try
                        {
                            var areasArray = JsonSerializer.Deserialize<List<JsonElement>>(areasJson);
                            if (areasArray != null)
                            {
                                foreach (var area in areasArray)
                                {
                                    areas.Add(new DanjiAreaDto
                                    {
                                        Id = area.GetProperty("id").GetInt64(),
                                        PlanTypeName = area.TryGetProperty("planTypeName", out var ptn) ? ptn.GetString() : null,
                                        PtpNo = area.TryGetProperty("ptpNo", out var ptpNo) ? ptpNo.GetString() : null,
                                        SplySpc = area.TryGetProperty("splySpc", out var splySpc) ? splySpc.GetString() : null,
                                        ExclsSpc = area.TryGetProperty("exclsSpc", out var exclsSpc) ? exclsSpc.GetString() : null,
                                        CtrtSpc = area.TryGetProperty("ctrtSpc", out var ctrtSpc) ? ctrtSpc.GetString() : null,
                                        RoomCount = area.TryGetProperty("roomCount", out var roomCount) ? (roomCount.ValueKind == JsonValueKind.Number ? roomCount.GetInt32() : (int?)null) : null,
                                        BathroomCount = area.TryGetProperty("bathroomCount", out var bathroomCount) ? (bathroomCount.ValueKind == JsonValueKind.Number ? bathroomCount.GetInt32() : (int?)null) : null,
                                        InUse = area.TryGetProperty("inUse", out var inUse) ? (inUse.ValueKind == JsonValueKind.True || inUse.ValueKind == JsonValueKind.False ? inUse.GetBoolean() : (bool?)null) : null
                                    });
                                }
                            }
                        }
                        catch
                        {
                            // JSON 파싱 실패 시 빈 배열 유지
                        }
                    }
                }

                result.Add(new DanjiDto
                {
                    Id = Convert.ToInt64(row["id"]),
                    BuildingCode = row["building_code"]?.ToString(),
                    BuildingName = row["building_name"]?.ToString(),
                    BjdCode = row["bjd_code"]?.ToString(),
                    AddressBunji = row["address_bunji"]?.ToString(),
                    NaverDanjiCode = row["naver_danji_code"]?.ToString(),
                    FamilyCnt = row["family_cnt"] != DBNull.Value ? Convert.ToInt32(row["family_cnt"]) : null,
                    MaxFloor = row["max_floor"] != DBNull.Value ? Convert.ToInt32(row["max_floor"]) : null,
                    MinFloor = row["min_floor"] != DBNull.Value ? Convert.ToInt32(row["min_floor"]) : null,
                    TotBldCnt = row["tot_bld_cnt"] != DBNull.Value ? Convert.ToInt32(row["tot_bld_cnt"]) : null,
                    ApproveDate = row["approve_date"]?.ToString(),
                    HeatType = row["heat_type"]?.ToString(),
                    HeatFul = row["heat_ful"]?.ToString(),
                    IsPrk = row["is_prk"] != DBNull.Value ? Convert.ToBoolean(row["is_prk"]) : null,
                    TotprkCnt = row["totprk_cnt"] != DBNull.Value ? Convert.ToInt32(row["totprk_cnt"]) : null,
                    BuildingClosingRate = row["building_closing_rate"]?.ToString(),
                    FloorAreaRate = row["floor_area_rate"]?.ToString(),
                    MapX = row["map_x"]?.ToString(),
                    MapY = row["map_y"]?.ToString(),
                    HscpTypeCode = row["hscp_type_code"]?.ToString(),
                    IsService = row["is_service"] != DBNull.Value ? Convert.ToBoolean(row["is_service"]) : null,
                    CscoName = row["csco_name"]?.ToString(),
                    PictureUrl = row["picture_url"]?.ToString(),
                    TotprkCntPer = row["totprk_cnt_per"] != DBNull.Value ? Convert.ToDecimal(row["totprk_cnt_per"]) : null,
                    Areas = areas
                });
            }

            return result;
        }

        public async Task<List<DanjiDongDto>> GetDongListByDanjiAsync(string danjiCode)
        {
            const string sql = @"
                SELECT dong_name, naver_danji_code, dong_no, highest_floor_cnt,
                       direction_type_code, entrance_type_cd, in_use, reg_date, update_date
                FROM danji_dong_new
                WHERE naver_danji_code = @danjiCode::int
                ORDER BY dong_no;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@danjiCode", NpgsqlDbType.Varchar) { Value = danjiCode }
            };

            var result = await _dataService.QueryAsyncPg<DanjiDongDto>("DEV", sql, parameters);
            return result ?? new List<DanjiDongDto>();
        }

        public async Task<List<DanjiHoDto>> GetHoListByDongAsync(string danjiCode, int dongNo)
        {
            const string sql = @"
                SELECT dong_no, naver_danji_code, ho_name, ptp_no, ho_number,
                       floor, sply_spc, excls_spc, ctrt_spc, reg_date, update_date, ptp_name
                FROM danji_ho_new
                WHERE naver_danji_code = @danjiCode::int AND dong_no = @dongNo
                ORDER BY ho_number;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@danjiCode", NpgsqlDbType.Varchar) { Value = danjiCode },
                new NpgsqlParameter("@dongNo", NpgsqlDbType.Integer) { Value = dongNo }
            };

            var result = await _dataService.QueryAsyncPg<DanjiHoDto>("DEV", sql, parameters);
            return result ?? new List<DanjiHoDto>();
        }

        public async Task<List<DanjiAreaDto2>> GetAreaListByDanjiAsync(string danjiCode)
        {
            const string sql = @"
                SELECT idx, plan_type_name, ptp_no, sply_spc, excls_spc, ctrt_spc,
                       in_use, naver_danji_code, reg_date, update_date, room_cnt, bathroom_cnt
                FROM danji_area_new
                WHERE naver_danji_code = @danjiCode::int
                ORDER BY excls_spc;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@danjiCode", NpgsqlDbType.Varchar) { Value = danjiCode }
            };

            var result = await _dataService.QueryAsyncPg<DanjiAreaDto2>("DEV", sql, parameters);
            return result ?? new List<DanjiAreaDto2>();
        }

        public async Task<NoticeList> GetNoticeListAsync(long? noticeId, string? category, string? isPublic, string? isPopup, int pageNumber, int rowsPerPage)
        {
            const string sql = @"
            select *
            from public.fn_nt_notice(
                p_mode          => @p_mode,
                p_notice_id     => @p_notice_id,
                p_category      => @p_category,
                p_is_public     => @p_is_public,
                p_is_popup      => @p_is_popup,
                p_page_number   => @p_page_number,
                p_rows_per_page => @p_rows_per_page
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_mode", NpgsqlDbType.Varchar) { Value = "SEL" },
                new NpgsqlParameter("@p_notice_id", NpgsqlDbType.Bigint) { Value = (object?)noticeId ?? DBNull.Value },
                new NpgsqlParameter("@p_category", NpgsqlDbType.Varchar) { Value = (object?)category ?? DBNull.Value },
                new NpgsqlParameter("@p_is_public", NpgsqlDbType.Char) { Value = (object?)isPublic ?? DBNull.Value },
                new NpgsqlParameter("@p_is_popup", NpgsqlDbType.Char) { Value = (object?)isPopup ?? DBNull.Value },
                new NpgsqlParameter("@p_page_number", NpgsqlDbType.Integer) { Value = pageNumber },
                new NpgsqlParameter("@p_rows_per_page", NpgsqlDbType.Integer) { Value = rowsPerPage }
            };

            var rows = await _dataService.QueryAsyncPg<Notice>("DEV", sql, parameters);

            int totalCount = rows?.Count ?? 0;

            return new NoticeList { Notices = rows, TotalCount = totalCount };
        }
    }
}

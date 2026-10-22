using Npgsql;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using System.Text.Json;

namespace RealestateAPI.Domains
{
    public interface IDanjiServices
    {
        Task<DanjiList> GetDanjiListByBjdCode(string bjdCode);
        Task<Danji?> GetDanjiByNaverCode(string naverDanjiCode);
    }

    public class DanjiServices : IDanjiServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly ILogger<DanjiServices> _logger;

        public DanjiServices(IPostgresDataService dataService, ILogger<DanjiServices> logger)
        {
            _dataService = dataService;
            _logger = logger;
        }

        public async Task<DanjiList> GetDanjiListByBjdCode(string bjdCode)
        {
            const string sql = @"
                SELECT *
                FROM public.fn_get_danji_list_by_bjd(@p_bjd_code);";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_bjd_code", bjdCode)
            };

            var danjis = await _dataService.QueryAsyncPg<DanjiDto>("DEV", sql, parameters);

            // JSON areas를 List<DanjiArea>로 변환
            var result = danjis.Select(d => new Danji
            {
                Id = d.Id,
                BuildingCode = d.BuildingCode,
                BuildingName = d.BuildingName,
                BjdCode = d.BjdCode,
                AddressBunji = d.AddressBunji,
                NaverDanjiCode = d.NaverDanjiCode,
                FamilyCnt = d.FamilyCnt,
                MaxFloor = d.MaxFloor,
                MinFloor = d.MinFloor,
                TotBldCnt = d.TotBldCnt,
                ApproveDate = d.ApproveDate,
                HeatType = d.HeatType,
                HeatFul = d.HeatFul,
                IsPrk = d.IsPrk,
                TotprkCnt = d.TotprkCnt,
                BuildingClosingRate = d.BuildingClosingRate,
                FloorAreaRate = d.FloorAreaRate,
                MapX = d.MapX,
                MapY = d.MapY,
                HscpTypeCode = d.HscpTypeCode,
                IsService = d.IsService,
                CscoName = d.CscoName,
                PictureUrl = d.PictureUrl,
                TotprkCntPer = d.TotprkCntPer,
                Areas = string.IsNullOrEmpty(d.Areas)
                    ? new List<DanjiArea>()
                    : JsonSerializer.Deserialize<List<DanjiArea>>(d.Areas)
            }).ToList();

            return new DanjiList { Danjis = result };
        }

        public async Task<Danji?> GetDanjiByNaverCode(string naverDanjiCode)
        {
            const string sql = @"
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
                                    'id',               da.id,
                                    'planTypeName',     da.plan_type_name,
                                    'ptpNo',            da.ptp_no,
                                    'splySpc',          da.sply_spc,
                                    'exclsSpc',         da.excls_spc,
                                    'ctrtSpc',          da.ctrt_spc,
                                    'roomCount',        da.room_count,
                                    'bathroomCount',    da.bathroom_count,
                                    'inUse',            da.in_use
                                )
                                ORDER BY da.sply_spc
                            )
                            FROM danji_area da
                            WHERE da.naver_danji_code = d.naver_danji_code
                              AND da.is_active = TRUE
                              AND da.deleted_at IS NULL
                        ),
                        '[]'::json
                    ) AS areas
                FROM danji d
                WHERE d.naver_danji_code = @p_naver_danji_code
                  AND d.is_active = TRUE
                  AND d.deleted_at IS NULL
                LIMIT 1;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_naver_danji_code", naverDanjiCode)
            };

            var danjis = await _dataService.QueryAsyncPg<DanjiDto>("DEV", sql, parameters);

            if (danjis == null || !danjis.Any())
            {
                return null;
            }

            var danjiDto = danjis.First();

            return new Danji
            {
                Id = danjiDto.Id,
                BuildingCode = danjiDto.BuildingCode,
                BuildingName = danjiDto.BuildingName,
                BjdCode = danjiDto.BjdCode,
                AddressBunji = danjiDto.AddressBunji,
                NaverDanjiCode = danjiDto.NaverDanjiCode,
                FamilyCnt = danjiDto.FamilyCnt,
                MaxFloor = danjiDto.MaxFloor,
                MinFloor = danjiDto.MinFloor,
                TotBldCnt = danjiDto.TotBldCnt,
                ApproveDate = danjiDto.ApproveDate,
                HeatType = danjiDto.HeatType,
                HeatFul = danjiDto.HeatFul,
                IsPrk = danjiDto.IsPrk,
                TotprkCnt = danjiDto.TotprkCnt,
                BuildingClosingRate = danjiDto.BuildingClosingRate,
                FloorAreaRate = danjiDto.FloorAreaRate,
                MapX = danjiDto.MapX,
                MapY = danjiDto.MapY,
                HscpTypeCode = danjiDto.HscpTypeCode,
                IsService = danjiDto.IsService,
                CscoName = danjiDto.CscoName,
                PictureUrl = danjiDto.PictureUrl,
                TotprkCntPer = danjiDto.TotprkCntPer,
                Areas = string.IsNullOrEmpty(danjiDto.Areas)
                    ? new List<DanjiArea>()
                    : JsonSerializer.Deserialize<List<DanjiArea>>(danjiDto.Areas)
            };
        }
    }

    // DB에서 반환되는 DTO (areas가 JSON 문자열)
    internal class DanjiDto
    {
        public long Id { get; set; }
        public string? BuildingCode { get; set; }
        public string? BuildingName { get; set; }
        public string? BjdCode { get; set; }
        public string? AddressBunji { get; set; }
        public string? NaverDanjiCode { get; set; }
        public int? FamilyCnt { get; set; }
        public int? MaxFloor { get; set; }
        public int? MinFloor { get; set; }
        public int? TotBldCnt { get; set; }
        public string? ApproveDate { get; set; }
        public string? HeatType { get; set; }
        public string? HeatFul { get; set; }
        public bool? IsPrk { get; set; }
        public int? TotprkCnt { get; set; }
        public string? BuildingClosingRate { get; set; }
        public string? FloorAreaRate { get; set; }
        public string? MapX { get; set; }
        public string? MapY { get; set; }
        public string? HscpTypeCode { get; set; }
        public bool? IsService { get; set; }
        public string? CscoName { get; set; }
        public string? PictureUrl { get; set; }
        public decimal? TotprkCntPer { get; set; }
        public string? Areas { get; set; } // JSON 문자열
    }
}

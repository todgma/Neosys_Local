using Npgsql;
using NpgsqlTypes;
using RealestateAPI.AppVersion.Models;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.AppVersion.Services
{
    public interface IVersionService
    {
        Task<AppVersionInfo?> GetLatestVersion(string platform);
    }

    public class VersionService : IVersionService
    {
        private readonly IPostgresDataService _dataService;

        public VersionService(IPostgresDataService dataService)
        {
            _dataService = dataService;
        }

        /// <summary>
        /// 활성(is_active) 버전 중 최신 1건 조회 - 직접쿼리
        /// </summary>
        public async Task<AppVersionInfo?> GetLatestVersion(string platform)
        {
            const string sql = @"
                SELECT version_id, platform, version, download_url,
                       mandatory_yn, release_note, is_active, reg_dt
                FROM public.app_version
                WHERE is_active = TRUE
                  AND (@platform IS NULL OR platform = @platform)
                ORDER BY reg_dt DESC
                LIMIT 1;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@platform", NpgsqlDbType.Varchar)
                {
                    Value = string.IsNullOrWhiteSpace(platform) ? (object)DBNull.Value : platform
                }
            };

            var rows = await _dataService.QueryAsyncPg<AppVersionInfo>("DEV", sql, parameters);
            return rows?.FirstOrDefault();
        }
    }
}

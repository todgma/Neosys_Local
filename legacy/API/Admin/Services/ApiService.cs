using System.Data;
using RealestateAPI.Admin.Models;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using System.Net.Http;
using System.Diagnostics;
using RealestateAPI.Shared;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using System.Numerics;
using System.Xml.Linq;
using NpgsqlTypes;

namespace RealestateAPI.Admin.Services
{
    public interface IApiService
    {
        Task<string> GetBizDtl(int bizNo);
        Task<string> GetLandRtPrice(CityInfoSel addr1, string addr2, ArtTypeSel type, string year);

        Task<string> GetArtIros(string? address, string? unique_num, string? type);

        Task<string> GetArtIrosDownload(string ic_id, string? format);
    }

    public class ApiService : IApiService
    {
        private readonly HttpClient _httpClient;
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public ApiService(IPostgresDataService dataService, IConfiguration configuration, HttpClient httpClient)
        {
            _dataService = dataService;
            _configuration = configuration;
            _httpClient = httpClient;

        }

        public async Task<string> GetBizDtl(int bizNo)
        {
            ApiKey apiKey = new ApiKey();

            var url = "https://apick.app/rest/biz_detail";

            var form = new Dictionary<string, string>
            {
                { "biz_no", bizNo.ToString() }
            };

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("CL_AUTH_KEY", apiKey.Key);

            var response = await _httpClient.PostAsync(url, new FormUrlEncodedContent(form));
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> GetLandRtPrice(CityInfoSel addr1, string addr2, ArtTypeSel type, string year)
        {
            ApiKey apiKey = new ApiKey();

            var url = "https://apick.app/rest/land_rt_price";

            string[] arrType = type.arttypes.ToString().Split('_');

            var form = new Dictionary<string, string>
            {
                { "addr1", addr1.Citis.ToString() },
                { "addr2", addr2},
                { "type",  arrType[0]},
                { "year", year }
            };

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("CL_AUTH_KEY", apiKey.Key);

            var response = await _httpClient.PostAsync(url, new FormUrlEncodedContent(form));
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync();
        }

        /// <summary>
        /// 부동산등기부등본 열람
        /// </summary>
        /// <param name="address"></param>
        /// <param name="unique_num"></param>
        /// <param name="type"></param>
        /// <returns></returns>
        public async Task<string> GetArtIros(string? address, string? unique_num, string? type)
        {
            ApiKey apiKey = new ApiKey();

            var url = "https://apick.app/rest/iros/1";

            var form = new Dictionary<string, string>
            {
                { "address", address },
                { "unique_num", unique_num},
                { "type",  type}
            };

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("CL_AUTH_KEY", apiKey.Key);

            var response = await _httpClient.PostAsync(url, new FormUrlEncodedContent(form));

            var json = await response.Content.ReadAsStringAsync();

            dynamic result = Newtonsoft.Json.JsonConvert.DeserializeObject(json);
            string icId = result.data.ic_id.ToString();

            if (string.IsNullOrEmpty(icId))
            {
                if (!result)
                {
                    ResponseHelper.Error("DELETE_FAILED", "부동산등기부등록 조회 실패");
                }
            }
           
            var resultDwon = await GetArtIrosDownload(icId, null);

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_proc", NpgsqlDbType.Text){ Value = "INS" },
                new NpgsqlParameter("@pr_address", NpgsqlDbType.Varchar){ Value = (object?)address ?? DBNull.Value },
                new NpgsqlParameter("@pr_unique_num", NpgsqlDbType.Varchar){ Value = (object?)unique_num ?? DBNull.Value },
                new NpgsqlParameter("@pr_type", NpgsqlDbType.Varchar){ Value = (object?)type ?? "pdf" },
                new NpgsqlParameter("@pr_ic_id", NpgsqlDbType.Varchar){ Value = (object?)icId ?? DBNull.Value },
                new NpgsqlParameter("@pr_reg_dt", NpgsqlDbType.Timestamp){ Value = DateTime.Now },
                new NpgsqlParameter("@pr_reg_id", NpgsqlDbType.Varchar){ Value = "admin" }
            };

            await _dataService.ExecFunctionAsyncPg("DEV", "fn_apt_art_iros", parameters);
            //////////////////
            ///
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        /// <summary>
        /// 부동산등기부등본 다운로드
        /// </summary>
        /// <param name="ic_id"></param>
        /// <param name="format"></param>
        /// <returns></returns>
        public async Task<string> GetArtIrosDownload(string ic_id, string? format)
        {
            ApiKey apiKey = new ApiKey();

            var url = "https://apick.app/rest/iros_download/1";

            var form = new Dictionary<string, string>
            {
                { "ic_id", ic_id },
                { "format", format} //pdf, excel
            };

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("CL_AUTH_KEY", apiKey.Key);

            var response = await _httpClient.PostAsync(url, new FormUrlEncodedContent(form));
            response.EnsureSuccessStatusCode();

            if (format == "excel")
            {
                var excelBytes = await response.Content.ReadAsByteArrayAsync();

                // 📌 저장 파일 경로
                var filePath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                    "output.xlsx"
                );

                // 📌 파일 저장
                await File.WriteAllBytesAsync(filePath, excelBytes);

                // 📌 파일 바로 열기 (Excel 실행)
                var psi = new ProcessStartInfo()
                {
                    FileName = filePath,
                    UseShellExecute = true
                };
                Process.Start(psi);
            }
            else
            {
                var pdfBytes = await response.Content.ReadAsByteArrayAsync();

                // 저장될 파일 경로
                var filePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                                            "output.pdf");

                // 파일 저장
                await File.WriteAllBytesAsync(filePath, pdfBytes);

                // -------------------------------
                // 📌 PDF 바로 열기
                // -------------------------------
                var psi = new ProcessStartInfo()
                {
                    FileName = filePath,
                    UseShellExecute = true // ← 중요! 기본 PDF 뷰어로 열림
                };

                Process.Start(psi);
            }

            return await response.Content.ReadAsStringAsync();
        }
    }
}

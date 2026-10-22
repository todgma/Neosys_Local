using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;

namespace RealestateAPI.Broker.Controllers
{
    /// <summary>
    /// 중개사(개업공인중개사) 조회 — 국토부 vworld 중개업소 목록을 서버에서 대신 호출(HTML 반환).
    ///  · CORS/세션 문제로 브라우저 직접 호출 불가 → 서버 프록시. 파싱은 프론트(DOMParser)에서 수행.
    /// </summary>
    [ApiController]
    [Route("api/broker")]
    public class BrokerController : ControllerBase
    {
        private const string VworldUrl = "https://www.vworld.kr/dtld/broker/dtld_list_s001.do";

        public class BrokerSearchDto
        {
            public string? BjdCode { get; set; }          // 법정동코드(10자리) — 여기서 시도/시군구/동 코드 파생
            public string? SvcCode { get; set; }          // 117=중개업사무소 / 118=중개법인
            public string? CmpNm { get; set; }            // 상호
            public string? RaRegno { get; set; }          // 등록번호
            public int PageIndex { get; set; } = 1;
            public int RecordCountPerPage { get; set; } = 10;
        }

        /// <summary>중개사 목록 조회(vworld 프록시) — 결과 HTML을 그대로 반환</summary>
        [HttpPost("search")]
        public async Task<IActionResult> Search([FromBody] BrokerSearchDto dto)
        {
            string bjd = (dto?.BjdCode ?? "").Trim();
            if (bjd.Length < 5)
                return Ok(ResponseHelper.Error("BAD_REQUEST", "법정동 코드가 필요합니다."));

            string sidoCd = bjd.Length >= 2 ? bjd.Substring(0, 2) : "";
            string sigunguCd = bjd.Length >= 5 ? bjd.Substring(0, 5) : "";
            string dongCd = bjd.Length >= 8 ? bjd.Substring(0, 8) : bjd; // v_lawd_cd/dongCd = 앞 8자리
            string svc = string.IsNullOrWhiteSpace(dto?.SvcCode) ? "117" : dto!.SvcCode!.Trim();
            // 118(중개사/보조원)은 이름 입력을 상호(v_cmp_nm)가 아닌 성명(v_rdealer_nm)으로 검색해야 결과가 나옴
            bool isDealer = svc == "118";
            string nameInput = dto?.CmpNm ?? "";

            var form = new List<KeyValuePair<string, string>>
            {
                new("v_lawd_cd", dongCd),
                new("pageIndex", (dto?.PageIndex ?? 1).ToString()),
                new("recordCountPerPage", (dto?.RecordCountPerPage ?? 10).ToString()),
                new("v_sort", ""),
                new("v_sort_order", ""),
                new("GUJESI_YN", "Y"),
                new("sggCd", ""),
                new("raRegno", dto?.RaRegno ?? ""),
                new("sysRegno", ""),
                new("sidoCd", sidoCd),
                new("sigunguCd", sigunguCd),
                new("dongCd", dongCd),
                new("svcCode", svc),
                new("v_cmp_nm", isDealer ? "" : nameInput),
                new("v_ra_regno", dto?.RaRegno ?? ""),
                new("v_rdealer_nm", isDealer ? nameInput : ""),
                new("v_pos_gbn", ""),
            };

            try
            {
                using var handler = new HttpClientHandler
                {
                    UseCookies = true,
                    CookieContainer = new CookieContainer(),
                    AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
                };
                using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(20) };
                client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36");
                client.DefaultRequestHeaders.TryAddWithoutValidation("Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                client.DefaultRequestHeaders.TryAddWithoutValidation("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7");

                // 세션 쿠키 확보용 워밍업 GET(실패해도 무시)
                try { await client.GetAsync(VworldUrl); } catch { /* ignore */ }

                using var req = new HttpRequestMessage(HttpMethod.Post, VworldUrl)
                {
                    Content = new FormUrlEncodedContent(form),
                };
                req.Headers.TryAddWithoutValidation("Origin", "https://www.vworld.kr");
                req.Headers.TryAddWithoutValidation("Referer", VworldUrl);

                using var resp = await client.SendAsync(req);
                string html = await resp.Content.ReadAsStringAsync();
                return Ok(ResponseHelper.Success(new { html, status = (int)resp.StatusCode }, "중개사 조회 성공"));
            }
            catch (Exception ex)
            {
                return Ok(ResponseHelper.Error("FETCH_FAILED", "중개사 조회 실패: " + ex.Message));
            }
        }
    }
}

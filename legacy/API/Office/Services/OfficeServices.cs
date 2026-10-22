using System.Data;
using RealestateAPI.Office.Models;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.Linq;
using Npgsql;
using NpgsqlTypes;
using Newtonsoft.Json.Linq;
using System.Text.RegularExpressions;
using System.Numerics;

namespace RealestateAPI.Office.Services
{
    public interface IOfficeServices
    {
        public Task<OfficeList> SelectOfficeList(int? offNo, string? offNm);
        public Task<bool> InsertOffice(string offNm, string? addr, string rpsNm, string? rpsPhone, string? offTel, string? offFax, string? regNo, string? bizNo, string? userId);
        public Task<bool> UpdateOffice(int offNo, string? offNm, string? addr, string rpsNm, string? rpsPhone, string? offTel, string? offFax, string? regNo, string? bizNo, string? userId);
        public Task<bool> DeleteOffice(int offNo, string? userId);
        public Task<OfficeInfo> SelectOfficeByUser(string offNm);
        public Task<bool> UpdateGreeting(int offNo, string? greeting, string? userId);  // 인사말(사무소 공유) 저장
    }

    // fn_ofc_realter_office(DB 함수) 대신 인라인 SQL 사용. 테이블 컬럼은 큰따옴표 PascalCase("OffNo" 등)
    public class OfficeServices : IOfficeServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public OfficeServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        // 조회 공통 컬럼(AllowIp 포함, OffNo는 int로 캐스팅해 모델 매핑)
        private const string COLS = @"
            a.""OffNo""::int AS ""OffNo"", a.""OffNm"", a.""Addr"", a.""RpsNm"", a.""RpsPhone"",
            a.""OffTel"", a.""OffFax"", a.""RegNo"", a.""BizNo"", a.""RegDt"", a.""RegId"",
            a.""UpdDt"", a.""UpdId"", a.""AllowIp"", a.""Greeting""";

        public async Task<OfficeList> SelectOfficeList(int? offNo, string? offNm)
        {
            string sql = $@"
                SELECT {COLS}
                  FROM ofc_realter_office a
                 WHERE (@off_no IS NULL OR a.""OffNo"" = @off_no)
                   AND (@off_nm IS NULL OR a.""OffNm"" ILIKE '%' || @off_nm || '%')
                 ORDER BY a.""OffNo""";
            var parameters = new List<NpgsqlParameter>
            {
                P("@off_no", NpgsqlDbType.Bigint,  offNo.HasValue ? (long)offNo.Value : (object?)null),
                P("@off_nm", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(offNm) ? null : offNm),
            };
            var offices = await _dataService.QueryAsyncPg<OfficeInfo>("DEV", sql, parameters);
            return new OfficeList { Offices = offices?.ToList() ?? new List<OfficeInfo>() };
        }

        public async Task<bool> InsertOffice(string offNm, string? addr, string rpsNm, string? rpsPhone, string? offTel, string? offFax, string? regNo, string? bizNo, string? userId)
        {
            // 사무소 INSERT 후 등록자(rt_realtor_info)의 OffNo 연결 — 데이터 수정 CTE 한 문장으로 처리
            const string sql = @"
                WITH ins AS (
                    INSERT INTO ofc_realter_office
                        (""OffNm"", ""Addr"", ""RpsNm"", ""RpsPhone"", ""OffTel"", ""OffFax"", ""RegNo"", ""BizNo"", ""RegDt"", ""RegId"")
                    VALUES (@off_nm, @addr, @rps_nm, @rps_phone, @off_tel, @off_fax, @reg_no, @biz_no, CURRENT_TIMESTAMP, @user_id)
                    RETURNING ""OffNo""
                )
                UPDATE rt_realtor_info
                   SET ""OffNo"" = (SELECT ""OffNo"" FROM ins),
                       ""UpdDt"" = CURRENT_TIMESTAMP,
                       ""UpdId"" = @user_id
                 WHERE ""Id"" = @user_id";
            var parameters = new List<NpgsqlParameter>
            {
                P("@off_nm",    NpgsqlDbType.Varchar, offNm),
                P("@addr",      NpgsqlDbType.Varchar, addr),
                P("@rps_nm",    NpgsqlDbType.Varchar, rpsNm),
                P("@rps_phone", NpgsqlDbType.Varchar, rpsPhone),
                P("@off_tel",   NpgsqlDbType.Varchar, offTel),
                P("@off_fax",   NpgsqlDbType.Varchar, offFax),
                P("@reg_no",    NpgsqlDbType.Varchar, regNo),
                P("@biz_no",    NpgsqlDbType.Varchar, bizNo),
                P("@user_id",   NpgsqlDbType.Varchar, userId),
            };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        public async Task<bool> UpdateOffice(int offNo, string? offNm, string? addr, string? rpsNm, string? rpsPhone, string? offTel, string? offFax, string? regNo, string? bizNo, string? userId)
        {
            const string sql = @"
                UPDATE ofc_realter_office
                   SET ""OffNm""    = COALESCE(@off_nm, ""OffNm""),
                       ""Addr""     = COALESCE(@addr, ""Addr""),
                       ""RpsNm""    = COALESCE(@rps_nm, ""RpsNm""),
                       ""RpsPhone"" = COALESCE(@rps_phone, ""RpsPhone""),
                       ""OffTel""   = COALESCE(@off_tel, ""OffTel""),
                       ""OffFax""   = COALESCE(@off_fax, ""OffFax""),
                       ""RegNo""    = COALESCE(@reg_no, ""RegNo""),
                       ""BizNo""    = COALESCE(@biz_no, ""BizNo""),
                       ""UpdDt""    = CURRENT_TIMESTAMP,
                       ""UpdId""    = @user_id
                 WHERE ""OffNo"" = @off_no";
            var parameters = new List<NpgsqlParameter>
            {
                P("@off_no",    NpgsqlDbType.Bigint,  (long)offNo),
                P("@off_nm",    NpgsqlDbType.Varchar, offNm),
                P("@addr",      NpgsqlDbType.Varchar, addr),
                P("@rps_nm",    NpgsqlDbType.Varchar, rpsNm),
                P("@rps_phone", NpgsqlDbType.Varchar, rpsPhone),
                P("@off_tel",   NpgsqlDbType.Varchar, offTel),
                P("@off_fax",   NpgsqlDbType.Varchar, offFax),
                P("@reg_no",    NpgsqlDbType.Varchar, regNo),
                P("@biz_no",    NpgsqlDbType.Varchar, bizNo),
                P("@user_id",   NpgsqlDbType.Varchar, userId),
            };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters) > 0;
        }

        public async Task<bool> DeleteOffice(int offNo, string? userId)
        {
            const string sql = @"DELETE FROM ofc_realter_office WHERE ""OffNo"" = @off_no";
            var parameters = new List<NpgsqlParameter> { P("@off_no", NpgsqlDbType.Bigint, (long)offNo) };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters) > 0;
        }

        public async Task<OfficeInfo> SelectOfficeByUser(string userId)
        {
            const string sql = @"
                SELECT a.""OffNo""::int AS ""OffNo"", a.""OffNm"", a.""Addr"", a.""RpsNm"", a.""RpsPhone"",
                       a.""OffTel"", a.""OffFax"", a.""RegNo"", a.""BizNo"", a.""RegDt"", a.""RegId"",
                       a.""UpdDt"", a.""UpdId"", a.""AllowIp"", a.""Greeting""
                  FROM ofc_realter_office a
                  JOIN rt_realtor_info b ON a.""OffNo"" = b.""OffNo""
                 WHERE b.""Id"" = @user_id";
            var parameters = new List<NpgsqlParameter> { P("@user_id", NpgsqlDbType.Varchar, userId) };
            var rows = await _dataService.QueryAsyncPg<OfficeInfo>("DEV", sql, parameters);
            return rows?.FirstOrDefault() ?? new OfficeInfo();
        }

        // 인사말(사무소 공유) 저장 — Greeting 컬럼만 갱신
        public async Task<bool> UpdateGreeting(int offNo, string? greeting, string? userId)
        {
            const string sql = @"
                UPDATE ofc_realter_office
                   SET ""Greeting"" = @greeting, ""UpdDt"" = CURRENT_TIMESTAMP, ""UpdId"" = @user_id
                 WHERE ""OffNo"" = @off_no";
            var parameters = new List<NpgsqlParameter>
            {
                P("@off_no",   NpgsqlDbType.Bigint,  (long)offNo),
                P("@greeting", NpgsqlDbType.Varchar, greeting),
                P("@user_id",  NpgsqlDbType.Varchar, userId),
            };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters) > 0;
        }
    }
}

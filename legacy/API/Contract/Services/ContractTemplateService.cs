using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Contract.Models;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Contract.Services
{
    public interface IContractTemplateService
    {
        Task<List<ContractTemplate>> GetList(bool includeDisabled = false);  // 캐시용 전체 조회
        Task<ContractTemplate?> GetByCode(string tplCode);
        Task<int> GetMaxVer();                                               // 클라이언트 캐시 갱신 감지용
        Task<bool> Upsert(ContractTemplateDto dto);                          // 신규/수정(수정 시 ver 증가)
        Task<bool> Delete(string tplCode, string? userId);                   // use_yn='N'
    }

    public class ContractTemplateService : IContractTemplateService
    {
        private readonly IPostgresDataService _db;
        public ContractTemplateService(IPostgresDataService db) { _db = db; }

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };

        private const string COLS = @"
            tpl_code AS ""TplCode"", kind_cd AS ""KindCd"", kind_nm AS ""KindNm"",
            trade_cd AS ""TradeCd"", trade_nm AS ""TradeNm"", label AS ""Label"", category AS ""Category"",
            body_json::text AS ""BodyJson"", ver AS ""Ver"", sort AS ""Sort"", use_yn AS ""UseYn"",
            to_char(upd_dt, 'YYYY-MM-DD HH24:MI:SS') AS ""UpdDt""";

        public async Task<List<ContractTemplate>> GetList(bool includeDisabled = false)
        {
            string where = includeDisabled ? "" : "WHERE use_yn = 'Y'";
            string sql = $@"SELECT {COLS} FROM cn_contract_template {where} ORDER BY sort, kind_cd, trade_cd";
            var rows = await _db.QueryAsyncPg<ContractTemplate>("DEV", sql, new List<NpgsqlParameter>());
            return rows?.ToList() ?? new List<ContractTemplate>();
        }

        public async Task<ContractTemplate?> GetByCode(string tplCode)
        {
            string sql = $@"SELECT {COLS} FROM cn_contract_template WHERE tpl_code=@code";
            var rows = await _db.QueryAsyncPg<ContractTemplate>("DEV", sql, new List<NpgsqlParameter> { P("@code", NpgsqlDbType.Varchar, tplCode) });
            return rows?.FirstOrDefault();
        }

        public async Task<int> GetMaxVer()
        {
            const string sql = @"SELECT COALESCE(MAX(ver),0) AS ""Ver"" FROM cn_contract_template";
            var rows = await _db.QueryAsyncPg<ContractTemplate>("DEV", sql, new List<NpgsqlParameter>());
            return rows?.FirstOrDefault()?.Ver ?? 0;
        }

        // (tpl_code) 기준 upsert. 수정 시 ver +1 (클라이언트 캐시 무효화)
        public async Task<bool> Upsert(ContractTemplateDto d)
        {
            const string sql = @"
                INSERT INTO cn_contract_template
                    (tpl_code, kind_cd, kind_nm, trade_cd, trade_nm, label, category, body_json, ver, sort, use_yn, reg_id, reg_dt, upd_id, upd_dt)
                VALUES
                    (@code, @kind, @kindnm, @trade, @tradenm, @label, @cat, @body::jsonb, 1, COALESCE(@sort,0), COALESCE(@use,'Y'), @uid, now(), @uid, now())
                ON CONFLICT (tpl_code) DO UPDATE SET
                    kind_cd=EXCLUDED.kind_cd, kind_nm=EXCLUDED.kind_nm, trade_cd=EXCLUDED.trade_cd, trade_nm=EXCLUDED.trade_nm,
                    label=EXCLUDED.label, category=EXCLUDED.category, body_json=EXCLUDED.body_json,
                    sort=EXCLUDED.sort, use_yn=EXCLUDED.use_yn,
                    ver=cn_contract_template.ver + 1, upd_id=EXCLUDED.upd_id, upd_dt=now()";
            var ps = new List<NpgsqlParameter>
            {
                P("@code", NpgsqlDbType.Varchar, d.TplCode),
                P("@kind", NpgsqlDbType.Varchar, d.KindCd),
                P("@kindnm", NpgsqlDbType.Varchar, d.KindNm),
                P("@trade", NpgsqlDbType.Varchar, d.TradeCd),
                P("@tradenm", NpgsqlDbType.Varchar, d.TradeNm),
                P("@label", NpgsqlDbType.Varchar, d.Label),
                P("@cat", NpgsqlDbType.Varchar, d.Category),
                P("@body", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(d.BodyJson) ? "{}" : d.BodyJson),
                P("@sort", NpgsqlDbType.Integer, d.Sort),
                P("@use", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(d.UseYn) ? null : d.UseYn),
                P("@uid", NpgsqlDbType.Varchar, d.UserId),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<bool> Delete(string tplCode, string? userId)
        {
            const string sql = @"UPDATE cn_contract_template SET use_yn='N', ver=ver+1, upd_id=@uid, upd_dt=now() WHERE tpl_code=@code";
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                P("@code", NpgsqlDbType.Varchar, tplCode), P("@uid", NpgsqlDbType.Varchar, userId),
            }) > 0;
        }
    }
}

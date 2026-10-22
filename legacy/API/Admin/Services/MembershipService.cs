using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Admin.Models;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Admin.Services
{
    public interface IMembershipService
    {
        Task<List<MembershipProduct>> GetProducts(bool includeHidden);
        Task<long> CreateProduct(MembershipProductDto dto);
        Task<bool> UpdateProduct(long prodId, MembershipProductDto dto);
        Task<bool> DeleteProduct(long prodId);
        Task<object?> GetOfficeMembership(long offNo);      // 사무소 적용 상품(+상품정보+만료/무료개월)
        Task<bool> SetOfficeMembership(long offNo, long prodId, string? memo, string? userId);
        Task<bool> ExtendMembership(long offNo, string kind, string? title, int qty, string unit, string? userId, string? memo); // 기간연장(이벤트/보상)
        Task<List<object>> GetMembershipHistory(long offNo);   // 멤버십 변동 이력
    }

    public class MembershipService : IMembershipService
    {
        private readonly IPostgresDataService _db;
        public MembershipService(IPostgresDataService db) { _db = db; }

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };
        private sealed class JsonRow { public string? Json { get; set; } }  // dynamic 매핑 이슈 회피용

        private const string COLS = @"
            prod_id AS ""ProdId"", prod_name AS ""ProdName"", pc_cnt AS ""PcCnt"", mob_cnt AS ""MobCnt"",
            acct_cnt AS ""AcctCnt"", period_months AS ""PeriodMonths"", price AS ""Price"", descr AS ""Descr"", sort_order AS ""SortOrder"",
            use_yn AS ""UseYn"", reg_dt AS ""RegDt""";

        public async Task<List<MembershipProduct>> GetProducts(bool includeHidden)
        {
            string sql = $@"SELECT {COLS} FROM membership_product
                            WHERE (@all = TRUE OR use_yn = 'Y')
                            ORDER BY sort_order, prod_id";
            var ps = new List<NpgsqlParameter> { P("@all", NpgsqlDbType.Boolean, includeHidden) };
            var rows = await _db.QueryAsyncPg<MembershipProduct>("DEV", sql, ps);
            return rows?.ToList() ?? new List<MembershipProduct>();
        }

        public async Task<long> CreateProduct(MembershipProductDto d)
        {
            const string sql = @"
                INSERT INTO membership_product (prod_name, pc_cnt, mob_cnt, acct_cnt, period_months, price, descr, sort_order, use_yn)
                VALUES (@nm, @pc, @mob, @acct, @period, @price, @descr, @sort, @use)
             RETURNING prod_id AS ""ProdId""";
            var ps = new List<NpgsqlParameter>
            {
                P("@nm", NpgsqlDbType.Varchar, d.ProdName), P("@pc", NpgsqlDbType.Integer, d.PcCnt),
                P("@mob", NpgsqlDbType.Integer, d.MobCnt), P("@acct", NpgsqlDbType.Integer, d.AcctCnt),
                P("@period", NpgsqlDbType.Integer, d.PeriodMonths <= 0 ? 1 : d.PeriodMonths),
                P("@price", NpgsqlDbType.Integer, d.Price), P("@descr", NpgsqlDbType.Text, d.Descr),
                P("@sort", NpgsqlDbType.Integer, d.SortOrder), P("@use", NpgsqlDbType.Char, string.IsNullOrEmpty(d.UseYn) ? "Y" : d.UseYn),
            };
            var rows = await _db.QueryAsyncPg<MembershipProduct>("DEV", sql, ps);
            return rows?.FirstOrDefault()?.ProdId ?? 0;
        }

        public async Task<bool> UpdateProduct(long prodId, MembershipProductDto d)
        {
            const string sql = @"
                UPDATE membership_product SET
                  prod_name=@nm, pc_cnt=@pc, mob_cnt=@mob, acct_cnt=@acct, period_months=@period, price=@price,
                  descr=@descr, sort_order=@sort, use_yn=@use, upd_dt=CURRENT_TIMESTAMP
                WHERE prod_id=@id";
            var ps = new List<NpgsqlParameter>
            {
                P("@id", NpgsqlDbType.Bigint, prodId), P("@nm", NpgsqlDbType.Varchar, d.ProdName),
                P("@pc", NpgsqlDbType.Integer, d.PcCnt), P("@mob", NpgsqlDbType.Integer, d.MobCnt),
                P("@acct", NpgsqlDbType.Integer, d.AcctCnt), P("@period", NpgsqlDbType.Integer, d.PeriodMonths <= 0 ? 1 : d.PeriodMonths),
                P("@price", NpgsqlDbType.Integer, d.Price),
                P("@descr", NpgsqlDbType.Text, d.Descr), P("@sort", NpgsqlDbType.Integer, d.SortOrder),
                P("@use", NpgsqlDbType.Char, string.IsNullOrEmpty(d.UseYn) ? "Y" : d.UseYn),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<bool> DeleteProduct(long prodId)
        {
            const string sql = @"UPDATE membership_product SET use_yn='N', upd_dt=CURRENT_TIMESTAMP WHERE prod_id=@id";
            var ps = new List<NpgsqlParameter> { P("@id", NpgsqlDbType.Bigint, prodId) };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<object?> GetOfficeMembership(long offNo)
        {
            // 만료일 = 가입일 + 이용개월 + 연장일수(membership_history 합계). 다음결제일 = 만료일.
            //  · 무료개월 = 이벤트/보상 연장 일수 합계 / 30 (소수1자리)
            const string sql = @"
                SELECT to_jsonb(t)::text AS ""Json"" FROM (
                    SELECT om.off_no AS ""OffNo"", p.prod_id AS ""ProdId"", p.prod_name AS ""ProdName"",
                           p.pc_cnt AS ""PcCnt"", p.mob_cnt AS ""MobCnt"", p.acct_cnt AS ""AcctCnt"", p.price AS ""Price"",
                           p.period_months AS ""PeriodMonths"", om.reg_dt AS ""RegDt"",
                           COALESCE(h.ext_days, 0) AS ""ExtraDays"",
                           ROUND(COALESCE(h.free_days, 0) / 30.0, 1) AS ""FreeMonths"",
                           (om.reg_dt::date + (p.period_months || ' months')::interval + (COALESCE(h.ext_days,0) || ' days')::interval)::date AS ""EndDate"",
                           (om.reg_dt::date + (p.period_months || ' months')::interval + (COALESCE(h.ext_days,0) || ' days')::interval)::date AS ""NextPaymentDate"",
                           GREATEST(0, ((om.reg_dt::date + (p.period_months || ' months')::interval + (COALESCE(h.ext_days,0) || ' days')::interval)::date - CURRENT_DATE))::int AS ""RemainDays""
                      FROM office_membership om
                      JOIN membership_product p ON p.prod_id = om.prod_id
                      LEFT JOIN (
                          SELECT off_no, SUM(add_days) AS ext_days,
                                 SUM(CASE WHEN kind IN ('EVENT','REWARD') THEN add_days ELSE 0 END) AS free_days
                            FROM membership_history GROUP BY off_no
                      ) h ON h.off_no = om.off_no
                     WHERE om.off_no = @off
                ) t";
            var ps = new List<NpgsqlParameter> { P("@off", NpgsqlDbType.Bigint, offNo) };
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, ps);
            var json = rows?.FirstOrDefault()?.Json;
            return string.IsNullOrWhiteSpace(json) ? null : (object)JsonSerializer.Deserialize<JsonElement>(json);
        }

        public async Task<bool> SetOfficeMembership(long offNo, long prodId, string? memo, string? userId)
        {
            // 상품 적용 + '가입(JOIN)' 이력 기록(상품명 title, 메모). 이력은 히스토리 관리용
            const string sql = @"
                INSERT INTO office_membership (off_no, prod_id) VALUES (@off, @prod)
                ON CONFLICT (off_no) DO UPDATE SET prod_id = EXCLUDED.prod_id, upd_dt = CURRENT_TIMESTAMP;

                INSERT INTO membership_history (off_no, kind, title, qty, unit, add_days, memo, reg_id, reg_dt)
                SELECT @off, 'JOIN', p.prod_name, 1, 'MONTH', 0, @memo, @uid, CURRENT_TIMESTAMP
                  FROM membership_product p WHERE p.prod_id = @prod";
            var ps = new List<NpgsqlParameter>
            {
                P("@off", NpgsqlDbType.Bigint, offNo), P("@prod", NpgsqlDbType.Bigint, prodId),
                P("@memo", NpgsqlDbType.Text, memo), P("@uid", NpgsqlDbType.Varchar, userId),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        // 기간연장(이벤트/보상) — qty+unit → add_days 환산 후 이력 저장
        public async Task<bool> ExtendMembership(long offNo, string kind, string? title, int qty, string unit, string? userId, string? memo)
        {
            int per = (unit ?? "DAY").ToUpper() switch { "WEEK" => 7, "MONTH" => 30, _ => 1 };
            int addDays = Math.Max(0, qty) * per;
            const string sql = @"
                INSERT INTO membership_history (off_no, kind, title, qty, unit, add_days, memo, reg_id, reg_dt)
                VALUES (@off, @kind, @title, @qty, @unit, @add, @memo, @uid, CURRENT_TIMESTAMP)";
            var ps = new List<NpgsqlParameter>
            {
                P("@off", NpgsqlDbType.Bigint, offNo),
                P("@kind", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(kind) ? "EVENT" : kind.ToUpper()),
                P("@title", NpgsqlDbType.Varchar, title),
                P("@qty", NpgsqlDbType.Integer, qty),
                P("@unit", NpgsqlDbType.Varchar, (unit ?? "DAY").ToUpper()),
                P("@add", NpgsqlDbType.Integer, addDays),
                P("@memo", NpgsqlDbType.Text, memo),
                P("@uid", NpgsqlDbType.Varchar, userId),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<List<object>> GetMembershipHistory(long offNo)
        {
            const string sql = @"
                SELECT to_jsonb(t)::text AS ""Json"" FROM (
                    SELECT hist_id AS ""HistId"", off_no AS ""OffNo"", kind AS ""Kind"", title AS ""Title"",
                           qty AS ""Qty"", unit AS ""Unit"", add_days AS ""AddDays"", memo AS ""Memo"", reg_id AS ""RegId"", reg_dt AS ""RegDt""
                      FROM membership_history WHERE off_no = @off ORDER BY reg_dt DESC, hist_id DESC
                ) t";
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, new List<NpgsqlParameter> { P("@off", NpgsqlDbType.Bigint, offNo) });
            return (rows ?? new List<JsonRow>())
                .Where(x => !string.IsNullOrWhiteSpace(x.Json))
                .Select(x => (object)JsonSerializer.Deserialize<JsonElement>(x.Json!))
                .ToList();
        }
    }
}

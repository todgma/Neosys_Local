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
    public interface IContractMasterService
    {
        Task<string> SaveMaster(ContractMasterDto dto);                          // upsert → masterId(UUID)
        Task<string> CopyMaster(string sourceMasterId, string? userId);          // 계약서만 복사(부속문서 제외) → 새 masterId
        Task<ContractMasterList> GetList(string? frDate, string? toDate, long? offNo, string? rtNo, string? keyword, int page, int pageSize);
        Task<ContractMaster?> GetDetail(string masterId);
        Task<bool> DeleteMaster(string masterId, string? userId);
        Task<bool> SaveReportDate(string masterId, string? reportDoneDate, string? userId);   // 거래신고 완료일 저장(null=취소)
        Task<bool> SaveDocument(string masterId, string docKind, string? data, string? userId,
            string? contractKind = null, string? docType = null, string? tradeType = null);   // upsert(+마스터 lazy 생성, 메타/소재지(임시) 기록)
        Task<bool> EnsureMaster(string masterId, string? userId, string? contractKind, string? docType, string? tradeType);   // 파일만 첨부 시 마스터 보장
        Task<ContractDocumentRow?> GetDocument(string masterId, string docKind);
        Task<List<string>> GetDocumentKinds(string masterId);
    }

    public class ContractMasterService : IContractMasterService
    {
        private readonly IPostgresDataService _db;
        private readonly IConfiguration _config;
        public ContractMasterService(IPostgresDataService db, IConfiguration config) { _db = db; _config = config; }

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };
        // UUID 파라미터(문자열 → Guid). 빈값이면 새 Guid 생성
        private static NpgsqlParameter Pid(string n, string? v, out Guid used)
        {
            used = (!string.IsNullOrWhiteSpace(v) && Guid.TryParse(v, out var g)) ? g : Guid.NewGuid();
            return new NpgsqlParameter(n, NpgsqlDbType.Uuid) { Value = used };
        }

        private const string COLS = @"
            master_id::text AS ""MasterId"", contract_kind AS ""ContractKind"", doc_type AS ""DocType"", trade_type AS ""TradeType"",
            title AS ""Title"", addr AS ""Addr"", seller AS ""Seller"", buyer AS ""Buyer"", amount AS ""Amount"",
            contract_date AS ""ContractDate"", status AS ""Status"", doc::text AS ""Doc"", report_done_date AS ""ReportDoneDate"", reg_dt AS ""RegDt"", upd_dt AS ""UpdDt"",
            EXISTS (SELECT 1 FROM contract_document d WHERE d.master_id = contract_master.master_id AND d.doc_kind = '가계약문자' AND d.use_yn = 'Y') AS ""HasPreSms""";

        // 클라이언트가 생성한 UUID로 upsert(신규/수정 통합)
        public async Task<string> SaveMaster(ContractMasterDto d)
        {
            const string sql = @"
                INSERT INTO contract_master (master_id, contract_kind, doc_type, trade_type, title, addr, seller, buyer, amount,
                                             contract_date, status, doc, off_no, rt_no, reg_id, reg_dt)
                VALUES (@id, @ck, @dt, @tt, @title, @addr, @seller, @buyer, @amount, @cdate, COALESCE(@status,'작성'), @doc::jsonb, @off_no, @rt_no, @uid, CURRENT_TIMESTAMP)
                ON CONFLICT (master_id) DO UPDATE SET
                  contract_kind=EXCLUDED.contract_kind, doc_type=EXCLUDED.doc_type, trade_type=EXCLUDED.trade_type,
                  title=EXCLUDED.title, addr=EXCLUDED.addr, seller=EXCLUDED.seller, buyer=EXCLUDED.buyer,
                  amount=EXCLUDED.amount, contract_date=EXCLUDED.contract_date, status=COALESCE(EXCLUDED.status, contract_master.status),
                  doc=EXCLUDED.doc, off_no=COALESCE(EXCLUDED.off_no, contract_master.off_no), rt_no=COALESCE(EXCLUDED.rt_no, contract_master.rt_no),
                  use_yn='Y', upd_id=EXCLUDED.reg_id, upd_dt=CURRENT_TIMESTAMP";
            var ps = MasterParams(d, true);
            ps.Add(Pid("@id", d.MasterId, out var id));
            await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps);
            return id.ToString();
        }

        // 계약서(마스터)만 복사 — 부속문서(영수증/가계약 등)는 복사하지 않음.
        //  · 새 master_id 발급, origin_master_id = 원본, 소재지/addr 에 '(복사본)' 부기
        public async Task<string> CopyMaster(string sourceMasterId, string? userId)
        {
            const string sql = @"
                INSERT INTO contract_master
                    (master_id, origin_master_id, contract_kind, doc_type, trade_type, title, addr, seller, buyer,
                     amount, contract_date, status, doc, off_no, rt_no, use_yn, reg_id, reg_dt)
                SELECT @newid, master_id, contract_kind, doc_type, trade_type, title,
                       (CASE WHEN COALESCE(addr,'') <> '' THEN '(복사) ' || addr ELSE addr END),
                       seller, buyer, amount, contract_date, '작성',
                       CASE WHEN jsonb_exists(doc, '소재지') AND COALESCE(doc->>'소재지','') <> ''
                            THEN jsonb_set(doc, '{소재지}', to_jsonb('(복사) ' || (doc->>'소재지')))
                            ELSE doc END,
                       off_no, rt_no, 'Y', @uid, CURRENT_TIMESTAMP
                  FROM contract_master
                 WHERE master_id = @src AND use_yn = 'Y'";
            var ps = new List<NpgsqlParameter>
            {
                Pid("@src", sourceMasterId, out _),
                P("@uid", NpgsqlDbType.Varchar, userId),
            };
            ps.Add(Pid("@newid", null, out var newId));  // 새 UUID
            var affected = await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps);
            return affected > 0 ? newId.ToString() : "";
        }

        private static List<NpgsqlParameter> MasterParams(ContractMasterDto d, bool withScope = false)
        {
            var ps = new List<NpgsqlParameter>
            {
                P("@ck", NpgsqlDbType.Varchar, d.ContractKind), P("@dt", NpgsqlDbType.Varchar, d.DocType),
                P("@tt", NpgsqlDbType.Varchar, d.TradeType), P("@title", NpgsqlDbType.Varchar, d.Title),
                P("@addr", NpgsqlDbType.Varchar, d.Addr), P("@seller", NpgsqlDbType.Varchar, d.Seller),
                P("@buyer", NpgsqlDbType.Varchar, d.Buyer), P("@amount", NpgsqlDbType.Bigint, d.Amount),
                P("@cdate", NpgsqlDbType.Date, d.ContractDate), P("@status", NpgsqlDbType.Varchar, d.Status),
                P("@doc", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(d.Doc) ? "{}" : d.Doc),
                P("@uid", NpgsqlDbType.Varchar, d.UserId),
            };
            if (withScope) { ps.Add(P("@off_no", NpgsqlDbType.Bigint, d.OffNo)); ps.Add(P("@rt_no", NpgsqlDbType.Varchar, d.RtNo)); }
            return ps;
        }

        public async Task<ContractMasterList> GetList(string? frDate, string? toDate, long? offNo, string? rtNo, string? keyword, int page, int pageSize)
        {
            int pg = page <= 0 ? 1 : page, sz = pageSize <= 0 ? 20 : pageSize;
            string where = @"
                 WHERE use_yn = 'Y'
                   AND (@off_no IS NULL OR off_no = @off_no)
                   AND (@rt_no  IS NULL OR rt_no  = @rt_no)
                   AND (@fr IS NULL OR contract_date >= @fr::date)
                   AND (@to IS NULL OR contract_date <= @to::date)
                   AND (@q  IS NULL OR title ILIKE '%'||@q||'%' OR addr ILIKE '%'||@q||'%'
                                    OR seller ILIKE '%'||@q||'%' OR buyer ILIKE '%'||@q||'%')";
            List<NpgsqlParameter> Filter() => new List<NpgsqlParameter>
            {
                P("@off_no", NpgsqlDbType.Bigint, offNo),
                P("@rt_no",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(rtNo) ? null : rtNo),
                P("@fr", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(frDate) ? null : frDate),
                P("@to", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(toDate) ? null : toDate),
                P("@q",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(keyword) ? null : keyword.Trim()),
            };
            string sql = $@"SELECT {COLS} FROM contract_master {where}
                             ORDER BY COALESCE(contract_date, reg_dt::date) DESC, master_id DESC
                             LIMIT @sz OFFSET (@pg - 1) * @sz";
            var lp = Filter(); lp.Add(P("@sz", NpgsqlDbType.Integer, sz)); lp.Add(P("@pg", NpgsqlDbType.Integer, pg));
            var items = await _db.QueryAsyncPg<ContractMaster>("DEV", sql, lp);

            int total = items?.Count ?? 0;
            try
            {
                using var conn = new NpgsqlConnection(_config.GetConnectionString("DEV"));
                await conn.OpenAsync();
                using var cmd = new NpgsqlCommand($"SELECT count(*)::int FROM contract_master {where}", conn);
                cmd.Parameters.AddRange(Filter().ToArray());
                var r = await cmd.ExecuteScalarAsync();
                total = (r != null && r != DBNull.Value) ? Convert.ToInt32(r) : total;
            }
            catch { /* keep page count */ }

            return new ContractMasterList { Items = items ?? new List<ContractMaster>(), TotalCount = total };
        }

        public async Task<ContractMaster?> GetDetail(string masterId)
        {
            string sql = $@"SELECT {COLS} FROM contract_master WHERE master_id=@id AND use_yn='Y'";
            var rows = await _db.QueryAsyncPg<ContractMaster>("DEV", sql, new List<NpgsqlParameter> { Pid("@id", masterId, out _) });
            return rows?.FirstOrDefault();
        }

        public async Task<bool> DeleteMaster(string masterId, string? userId)
        {
            const string sql = @"UPDATE contract_master SET use_yn='N', upd_id=@uid, upd_dt=CURRENT_TIMESTAMP WHERE master_id=@id";
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter> { Pid("@id", masterId, out _), P("@uid", NpgsqlDbType.Varchar, userId) }) > 0;
        }

        // 거래신고 완료일 저장 — report_done_date만 갱신(null이면 완료 취소)
        public async Task<bool> SaveReportDate(string masterId, string? reportDoneDate, string? userId)
        {
            const string sql = @"UPDATE contract_master
                                    SET report_done_date = @rd, upd_id = @uid, upd_dt = CURRENT_TIMESTAMP
                                  WHERE master_id = @id";
            var ps = new List<NpgsqlParameter>
            {
                Pid("@id", masterId, out _),
                P("@rd", NpgsqlDbType.Date, string.IsNullOrWhiteSpace(reportDoneDate) ? (object?)null : DateTime.Parse(reportDoneDate)),
                P("@uid", NpgsqlDbType.Varchar, userId),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        // 부속문서 저장 — 마스터가 없으면 먼저 stub 생성(lazy) 후 upsert (FK 안전)
        //  · 계약서를 저장하지 않아도 현재 계약종류/물건유형/거래유형 + 소재지(임시)를 마스터에 기록(목록 노출용)
        //  · 이미 저장된 마스터(실제 소재지/유형 있음)는 COALESCE로 덮어쓰지 않음(채워진 값 보존)
        public async Task<bool> SaveDocument(string masterId, string docKind, string? data, string? userId,
            string? contractKind = null, string? docType = null, string? tradeType = null)
        {
            const string sql = @"
                INSERT INTO contract_master (master_id, contract_kind, doc_type, trade_type, addr, status, off_no, rt_no, reg_id, reg_dt)
                VALUES (@mid, @ck, @dt, @tt, '(임시)', '작성중',
                        (SELECT ""OffNo"" FROM rt_realtor_info WHERE ""Id"" = @uid LIMIT 1),
                        (SELECT ""RtNo""::text FROM rt_realtor_info WHERE ""Id"" = @uid LIMIT 1),
                        @uid, CURRENT_TIMESTAMP)
                ON CONFLICT (master_id) DO UPDATE SET
                    contract_kind = COALESCE(NULLIF(contract_master.contract_kind,''), EXCLUDED.contract_kind),
                    doc_type      = COALESCE(NULLIF(contract_master.doc_type,''),      EXCLUDED.doc_type),
                    trade_type    = COALESCE(contract_master.trade_type,               EXCLUDED.trade_type),
                    addr          = COALESCE(NULLIF(contract_master.addr,''),          EXCLUDED.addr),
                    off_no        = COALESCE(contract_master.off_no, EXCLUDED.off_no),
                    rt_no         = COALESCE(contract_master.rt_no,  EXCLUDED.rt_no),
                    upd_id        = @uid2, upd_dt = CURRENT_TIMESTAMP;

                INSERT INTO contract_document (master_id, doc_kind, data, reg_id, reg_dt)
                VALUES (@mid, @kind, @data::jsonb, @uid, CURRENT_TIMESTAMP)
                ON CONFLICT (master_id, doc_kind)
                DO UPDATE SET data = EXCLUDED.data, use_yn='Y', upd_id=@uid2, upd_dt=CURRENT_TIMESTAMP";
            var ps = new List<NpgsqlParameter>
            {
                Pid("@mid", masterId, out _), P("@kind", NpgsqlDbType.Varchar, docKind),
                P("@data", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(data) ? "{}" : data),
                P("@ck", NpgsqlDbType.Varchar, contractKind), P("@dt", NpgsqlDbType.Varchar, docType),
                P("@tt", NpgsqlDbType.Varchar, tradeType),
                P("@uid", NpgsqlDbType.Varchar, userId), P("@uid2", NpgsqlDbType.Varchar, userId),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        // 마스터 보장 — 계약서/부속문서 저장 없이 파일(공제증서 등)만 첨부할 때, 마스터 행을 만들어 목록에 노출(유실 방지)
        //  · 소재지=(임시), 현재 계약종류/물건유형/거래유형 기록. 이미 채워진 값은 COALESCE로 보존
        public async Task<bool> EnsureMaster(string masterId, string? userId, string? contractKind, string? docType, string? tradeType)
        {
            const string sql = @"
                INSERT INTO contract_master (master_id, contract_kind, doc_type, trade_type, addr, status, off_no, rt_no, reg_id, reg_dt)
                VALUES (@mid, @ck, @dt, @tt, '(임시)', '작성중',
                        (SELECT ""OffNo"" FROM rt_realtor_info WHERE ""Id"" = @uid LIMIT 1),
                        (SELECT ""RtNo""::text FROM rt_realtor_info WHERE ""Id"" = @uid LIMIT 1),
                        @uid, CURRENT_TIMESTAMP)
                ON CONFLICT (master_id) DO UPDATE SET
                    contract_kind = COALESCE(NULLIF(contract_master.contract_kind,''), EXCLUDED.contract_kind),
                    doc_type      = COALESCE(NULLIF(contract_master.doc_type,''),      EXCLUDED.doc_type),
                    trade_type    = COALESCE(contract_master.trade_type,               EXCLUDED.trade_type),
                    addr          = COALESCE(NULLIF(contract_master.addr,''),          EXCLUDED.addr),
                    off_no        = COALESCE(contract_master.off_no, EXCLUDED.off_no),
                    rt_no         = COALESCE(contract_master.rt_no,  EXCLUDED.rt_no),
                    upd_id        = @uid2, upd_dt = CURRENT_TIMESTAMP";
            var ps = new List<NpgsqlParameter>
            {
                Pid("@mid", masterId, out _),
                P("@ck", NpgsqlDbType.Varchar, contractKind), P("@dt", NpgsqlDbType.Varchar, docType),
                P("@tt", NpgsqlDbType.Varchar, tradeType),
                P("@uid", NpgsqlDbType.Varchar, userId), P("@uid2", NpgsqlDbType.Varchar, userId),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<ContractDocumentRow?> GetDocument(string masterId, string docKind)
        {
            const string sql = @"SELECT doc_id AS ""DocId"", master_id::text AS ""MasterId"", doc_kind AS ""DocKind"", data::text AS ""Data"", upd_dt AS ""UpdDt""
                                   FROM contract_document WHERE master_id=@mid AND doc_kind=@kind AND use_yn='Y'";
            var rows = await _db.QueryAsyncPg<ContractDocumentRow>("DEV", sql, new List<NpgsqlParameter> { Pid("@mid", masterId, out _), P("@kind", NpgsqlDbType.Varchar, docKind) });
            return rows?.FirstOrDefault();
        }

        public async Task<List<string>> GetDocumentKinds(string masterId)
        {
            const string sql = @"SELECT doc_kind AS ""DocKind"" FROM contract_document WHERE master_id=@mid AND use_yn='Y' ORDER BY doc_kind";
            var rows = await _db.QueryAsyncPg<ContractDocumentRow>("DEV", sql, new List<NpgsqlParameter> { Pid("@mid", masterId, out _) });
            return (rows ?? new List<ContractDocumentRow>()).Select(x => x.DocKind).ToList();
        }
    }
}

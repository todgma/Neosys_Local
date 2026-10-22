using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Upload.Services
{
    public class StagingSaveItem
    {
        public object? Payload { get; set; }   // 업로드 1건 payload(camelCase)
        public string? Label { get; set; }     // 목록 표시용(물건명/고객명 등)
    }

    public class StagingSaveDto
    {
        public string? Target { get; set; }     // property | customer
        public long? OffNo { get; set; }
        public string? RegId { get; set; }
        public List<StagingSaveItem>? Items { get; set; }
    }

    public class StagingDeleteDto { public List<long>? Ids { get; set; } }

    public interface IUploadStagingService
    {
        Task<int> SaveMany(StagingSaveDto dto);
        Task<List<object>> GetList(string? target, long? offNo);
        Task<bool> Delete(long id);
        Task<int> DeleteMany(List<long>? ids);
    }

    // 엑셀 업로드 임시저장(스테이징) — payload(JSONB) 그대로 보관. 확정은 프론트가 기존 bulk로 재전송 후 삭제.
    public class UploadStagingService : IUploadStagingService
    {
        private readonly IPostgresDataService _db;
        public UploadStagingService(IPostgresDataService db) { _db = db; }

        private sealed class JsonRow { public string? Json { get; set; } }

        public async Task<int> SaveMany(StagingSaveDto dto)
        {
            if (dto?.Items == null || dto.Items.Count == 0) return 0;
            string target = string.IsNullOrWhiteSpace(dto.Target) ? "property" : dto.Target!.Trim();
            int n = 0;
            const string sql = @"INSERT INTO rt_upload_staging (target, payload, label, off_no, reg_id)
                                 VALUES (@t, @p::jsonb, @l, @off, @rid)";
            foreach (var it in dto.Items)
            {
                string payloadJson = JsonSerializer.Serialize(it.Payload ?? new { });
                var ps = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@t",   NpgsqlDbType.Varchar) { Value = target },
                    new NpgsqlParameter("@p",   NpgsqlDbType.Jsonb)   { Value = payloadJson },
                    new NpgsqlParameter("@l",   NpgsqlDbType.Varchar) { Value = (object?)it.Label ?? DBNull.Value },
                    new NpgsqlParameter("@off", NpgsqlDbType.Bigint)  { Value = (object?)dto.OffNo ?? DBNull.Value },
                    new NpgsqlParameter("@rid", NpgsqlDbType.Varchar) { Value = (object?)dto.RegId ?? DBNull.Value },
                };
                await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps);
                n++;
            }
            return n;
        }

        public async Task<List<object>> GetList(string? target, long? offNo)
        {
            var ps = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@t",   NpgsqlDbType.Varchar) { Value = string.IsNullOrWhiteSpace(target) ? (object)DBNull.Value : target.Trim() },
                new NpgsqlParameter("@off", NpgsqlDbType.Bigint)  { Value = (object?)offNo ?? DBNull.Value },
            };
            const string sql = @"
                SELECT jsonb_build_object(
                           'stagingId', staging_id,
                           'target',    target,
                           'label',     label,
                           'payload',   payload,
                           'regId',     reg_id,
                           'regDt',     reg_dt
                       )::text AS ""Json""
                  FROM rt_upload_staging
                 WHERE (@t IS NULL OR target = @t)
                   AND (@off IS NULL OR off_no = @off)
                 ORDER BY staging_id DESC
                 LIMIT 2000";
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, ps);
            return rows?.Where(r => !string.IsNullOrWhiteSpace(r.Json))
                        .Select(r => (object)JsonSerializer.Deserialize<JsonElement>(r.Json!))
                        .ToList() ?? new List<object>();
        }

        public async Task<bool> Delete(long id)
            => await _db.ExecuteNonQueryAsyncPg("DEV", "DELETE FROM rt_upload_staging WHERE staging_id = @id",
                   new List<NpgsqlParameter> { new NpgsqlParameter("@id", NpgsqlDbType.Bigint) { Value = id } }) > 0;

        public async Task<int> DeleteMany(List<long>? ids)
        {
            if (ids == null || ids.Count == 0) return 0;
            return await _db.ExecuteNonQueryAsyncPg("DEV",
                "DELETE FROM rt_upload_staging WHERE staging_id = ANY(@ids)",
                new List<NpgsqlParameter> { new NpgsqlParameter("@ids", NpgsqlDbType.Array | NpgsqlDbType.Bigint) { Value = ids.ToArray() } });
        }
    }
}

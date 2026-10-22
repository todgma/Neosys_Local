using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Common.Services
{
    public class FileMetaDto
    {
        public string FileTyp { get; set; } = "";
        public string FileDiv { get; set; } = "";
        public string? RefKey { get; set; }
        public string? OrigName { get; set; }
        public string ObjectKey { get; set; } = "";
        public string? ContentType { get; set; }
        public long? FileSize { get; set; }
        public string? Ext { get; set; }
        public string? Expose { get; set; }
        public int? SortOrder { get; set; }
        public string? Descr { get; set; }
        public string? EtcData { get; set; }
        public string? UserId { get; set; }
    }

    public interface IFileService
    {
        (string objectKey, string uploadUrl) PresignPut(string fileDiv, string fileName, int expiresSec = 600);
        string PresignGet(string objectKey, int expiresSec = 600);
        Task<long> SaveFile(FileMetaDto dto);
        Task<List<object>> GetFiles(string? fileTyp, string? fileDiv, string? refKey);
        Task<bool> DeleteFile(long fileId, string? userId);
    }

    /// <summary>공용 파일 서비스 — 네이버클라우드 Object Storage(S3 호환) presigned URL + sys_file 메타(인라인).</summary>
    public class FileService : IFileService
    {
        private readonly IPostgresDataService _db;
        private readonly IConfiguration _config;
        public FileService(IPostgresDataService db, IConfiguration config) { _db = db; _config = config; }

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };
        private sealed class JsonRow { public string? Json { get; set; } }
        private sealed class IdRow { public long FileId { get; set; } }

        private string Bucket => _config["NaverCloud:Bucket"] ?? "";
        private string ServiceUrl => _config["NaverCloud:ServiceUrl"] ?? "https://kr.object.ncloudstorage.com";
        private string Region => _config["NaverCloud:Region"] ?? "kr-standard";
        private string PublicBaseUrl => _config["NaverCloud:PublicBaseUrl"] ?? "";

        private AmazonS3Client CreateClient()
        {
            var cfg = new AmazonS3Config
            {
                ServiceURL = ServiceUrl,
                ForcePathStyle = true,          // 경로형 URL(버킷/키)
                AuthenticationRegion = Region,  // SigV4 서명 리전
            };
            return new AmazonS3Client(_config["NaverCloud:AccessKey"], _config["NaverCloud:SecretKey"], cfg);
        }

        // 업로드용 presigned PUT URL 발급. objectKey = {div}/{yyyyMM}/{guid}{ext}
        public (string objectKey, string uploadUrl) PresignPut(string fileDiv, string fileName, int expiresSec = 600)
        {
            string ext = "";
            int dot = (fileName ?? "").LastIndexOf('.');
            if (dot >= 0) ext = fileName!.Substring(dot);
            string ym = DateTime.UtcNow.AddHours(9).ToString("yyyyMM");
            string safeDiv = string.IsNullOrWhiteSpace(fileDiv) ? "etc" : fileDiv;
            string objectKey = $"{safeDiv}/{ym}/{Guid.NewGuid():N}{ext}";

            using var client = CreateClient();
            var req = new GetPreSignedUrlRequest
            {
                BucketName = Bucket,
                Key = objectKey,
                Verb = HttpVerb.PUT,
                Expires = DateTime.UtcNow.AddSeconds(expiresSec),
                // ContentType 미지정 → 브라우저 PUT이 임의 Content-Type로도 성공
            };
            string url = client.GetPreSignedURL(req);
            return (objectKey, url);
        }

        // 조회/미리보기용 URL. 공개버킷(PublicBaseUrl)이면 직접 URL, 아니면 presigned GET.
        public string PresignGet(string objectKey, int expiresSec = 600)
        {
            if (string.IsNullOrWhiteSpace(objectKey)) return "";
            if (!string.IsNullOrWhiteSpace(PublicBaseUrl))
                return $"{PublicBaseUrl.TrimEnd('/')}/{objectKey}";
            using var client = CreateClient();
            var req = new GetPreSignedUrlRequest
            {
                BucketName = Bucket,
                Key = objectKey,
                Verb = HttpVerb.GET,
                Expires = DateTime.UtcNow.AddSeconds(expiresSec),
            };
            return client.GetPreSignedURL(req);
        }

        public async Task<long> SaveFile(FileMetaDto d)
        {
            const string sql = @"
                INSERT INTO sys_file (file_typ, file_div, ref_key, orig_name, object_key, content_type, file_size, ext,
                                      expose, sort_order, descr, etc_data, reg_id, reg_dt)
                VALUES (@typ, @div, @ref, @nm, @key, @ct, @size, @ext, @expose, @sort, @descr, @etc, @uid, CURRENT_TIMESTAMP)
             RETURNING file_id AS ""FileId""";
            var ps = new List<NpgsqlParameter>
            {
                P("@typ", NpgsqlDbType.Varchar, d.FileTyp), P("@div", NpgsqlDbType.Varchar, d.FileDiv),
                P("@ref", NpgsqlDbType.Varchar, d.RefKey), P("@nm", NpgsqlDbType.Varchar, d.OrigName),
                P("@key", NpgsqlDbType.Varchar, d.ObjectKey), P("@ct", NpgsqlDbType.Varchar, d.ContentType),
                P("@size", NpgsqlDbType.Bigint, d.FileSize), P("@ext", NpgsqlDbType.Varchar, d.Ext),
                P("@expose", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(d.Expose) ? "Y" : d.Expose),
                P("@sort", NpgsqlDbType.Integer, d.SortOrder ?? 0), P("@descr", NpgsqlDbType.Varchar, d.Descr),
                P("@etc", NpgsqlDbType.Varchar, d.EtcData), P("@uid", NpgsqlDbType.Varchar, d.UserId),
            };
            var rows = await _db.QueryAsyncPg<IdRow>("DEV", sql, ps);
            return rows?.FirstOrDefault()?.FileId ?? 0;
        }

        public async Task<List<object>> GetFiles(string? fileTyp, string? fileDiv, string? refKey)
        {
            const string sql = @"
                SELECT to_jsonb(t)::text AS ""Json"" FROM (
                    SELECT file_id AS ""FileId"", file_typ AS ""FileTyp"", file_div AS ""FileDiv"", ref_key AS ""RefKey"",
                           orig_name AS ""OrigName"", object_key AS ""ObjectKey"", content_type AS ""ContentType"",
                           file_size AS ""FileSize"", ext AS ""Ext"", expose AS ""Expose"", sort_order AS ""SortOrder"",
                           descr AS ""Descr"", etc_data AS ""EtcData"", reg_dt AS ""RegDt""
                      FROM sys_file
                     WHERE use_yn = 'Y'
                       AND (@typ IS NULL OR file_typ = @typ)
                       AND (@div IS NULL OR file_div = @div)
                       AND (@ref IS NULL OR ref_key = @ref)
                     ORDER BY sort_order, file_id
                ) t";
            var ps = new List<NpgsqlParameter>
            {
                P("@typ", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(fileTyp) ? null : fileTyp),
                P("@div", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(fileDiv) ? null : fileDiv),
                P("@ref", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(refKey) ? null : refKey),
            };
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, ps);
            var list = (rows ?? new List<JsonRow>())
                .Where(x => !string.IsNullOrWhiteSpace(x.Json))
                .Select(x => JsonSerializer.Deserialize<JsonElement>(x.Json!))
                .ToList();

            // 각 파일에 조회용 URL 부착
            var result = new List<object>();
            foreach (var el in list)
            {
                var dict = new Dictionary<string, object?>();
                foreach (var pr in el.EnumerateObject()) dict[pr.Name] = pr.Value.ValueKind == JsonValueKind.Null ? null : (object)pr.Value.ToString();
                var key = el.TryGetProperty("ObjectKey", out var ok) ? ok.GetString() : null;
                dict["Url"] = string.IsNullOrWhiteSpace(key) ? null : PresignGet(key!);
                result.Add(dict);
            }
            return result;
        }

        public async Task<bool> DeleteFile(long fileId, string? userId)
        {
            const string sql = @"UPDATE sys_file SET use_yn='N', upd_id=@uid, upd_dt=CURRENT_TIMESTAMP WHERE file_id=@id";
            var ps = new List<NpgsqlParameter> { P("@id", NpgsqlDbType.Bigint, fileId), P("@uid", NpgsqlDbType.Varchar, userId) };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }
    }
}

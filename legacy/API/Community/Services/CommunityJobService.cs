using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Community.Models;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Community.Services
{
    // 구인·구직 게시판(community_job) — 사무소 게시판(community_post)과 분리
    public interface ICommunityJobService
    {
        Task<List<CommunityJob>> GetList(string? kind, string? q);
        Task<CommunityJob?> GetDetail(long postId, string? viewerId);   // 조회 시 조회수 +1(하루 1회)
        Task<long> Create(CommunityJobCreateDto dto);
        Task<bool> Delete(long postId);
    }

    public class CommunityJobService : ICommunityJobService
    {
        private readonly IPostgresDataService _dataService;

        public CommunityJobService(IPostgresDataService dataService)
        {
            _dataService = dataService;
        }

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        private const string COLS = @"
            post_id AS ""PostId"", kind AS ""Kind"", title AS ""Title"", author AS ""Author"",
            fields::text AS ""Fields"", view_cnt AS ""ViewCnt"", reg_dt AS ""RegDt"", reg_id AS ""RegId""";

        public async Task<List<CommunityJob>> GetList(string? kind, string? q)
        {
            string sql = $@"
                SELECT {COLS}
                  FROM community_job
                 WHERE use_yn = 'Y'
                   AND (@kind IS NULL OR kind = @kind)
                   AND (@q IS NULL OR title ILIKE '%' || @q || '%'
                                   OR author ILIKE '%' || @q || '%'
                                   OR fields::text ILIKE '%' || @q || '%')
                 ORDER BY reg_dt DESC
                 LIMIT 500";
            var parameters = new List<NpgsqlParameter>
            {
                P("@kind", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(kind) ? null : kind),
                P("@q",    NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(q) ? null : q.Trim()),
            };
            var rows = await _dataService.QueryAsyncPg<CommunityJob>("DEV", sql, parameters);
            return rows?.ToList() ?? new List<CommunityJob>();
        }

        public async Task<CommunityJob?> GetDetail(long postId, string? viewerId)
        {
            // 하루 1회만 조회수 +1 (rt_view_log 유니크로 중복 방지)
            string sql = $@"
                WITH ins AS (
                    INSERT INTO rt_view_log(post_type, post_id, viewer_id, view_ymd, reg_dt)
                    VALUES ('CJOB', @post_id, COALESCE(@viewer, 'anon'), to_char(now(),'YYYYMMDD'), now())
                    ON CONFLICT DO NOTHING RETURNING 1
                )
                UPDATE community_job
                   SET view_cnt = view_cnt + (SELECT count(*) FROM ins)
                 WHERE post_id = @post_id AND use_yn = 'Y'
             RETURNING {COLS}";
            var parameters = new List<NpgsqlParameter>
            {
                P("@post_id", NpgsqlDbType.Bigint, postId),
                P("@viewer", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(viewerId) ? null : viewerId),
            };
            var rows = await _dataService.QueryAsyncPg<CommunityJob>("DEV", sql, parameters);
            return rows?.FirstOrDefault();
        }

        public async Task<long> Create(CommunityJobCreateDto dto)
        {
            const string sql = @"
                INSERT INTO community_job (kind, title, author, fields, pwd, off_no, rt_no, reg_id, reg_dt)
                VALUES (@kind, @title, @author, @fields::jsonb, @pwd, @off_no, @rt_no, @reg_id, CURRENT_TIMESTAMP)
             RETURNING post_id AS ""PostId""";
            var parameters = new List<NpgsqlParameter>
            {
                P("@kind",   NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(dto.Kind) ? "구인" : dto.Kind),
                P("@title",  NpgsqlDbType.Varchar, dto.Title),
                P("@author", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(dto.Author) ? "익명" : dto.Author),
                P("@fields", NpgsqlDbType.Text,    string.IsNullOrWhiteSpace(dto.Fields) ? "{}" : dto.Fields),
                P("@pwd",    NpgsqlDbType.Varchar, dto.Pwd),
                P("@off_no", NpgsqlDbType.Bigint,  dto.OffNo),
                P("@rt_no",  NpgsqlDbType.Varchar, dto.RtNo),
                P("@reg_id", NpgsqlDbType.Varchar, dto.RegId),
            };
            var rows = await _dataService.QueryAsyncPg<CommunityJob>("DEV", sql, parameters);
            return rows?.FirstOrDefault()?.PostId ?? 0;
        }

        public async Task<bool> Delete(long postId)
        {
            const string sql = @"
                UPDATE community_job
                   SET use_yn = 'N', upd_dt = CURRENT_TIMESTAMP
                 WHERE post_id = @post_id";
            var parameters = new List<NpgsqlParameter> { P("@post_id", NpgsqlDbType.Bigint, postId) };
            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return result > 0;
        }
    }
}

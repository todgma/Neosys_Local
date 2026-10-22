using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Community.Models;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Community.Services
{
    public interface ICommunityService
    {
        Task<List<CommunityPost>> GetList(string? tab, string? q);
        Task<CommunityPost?> GetDetail(long postId, string? viewerId);   // 조회 시 조회수 +1(하루 1회)
        Task<long> Create(CommunityCreateDto dto);
        Task<bool> Delete(long postId);
    }

    public class CommunityService : ICommunityService
    {
        private readonly IPostgresDataService _dataService;

        public CommunityService(IPostgresDataService dataService)
        {
            _dataService = dataService;
        }

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        private const string COLS = @"
            post_id  AS ""PostId"",  tab     AS ""Tab"",       title  AS ""Title"",
            content  AS ""Content"", fields::text AS ""Fields"", author AS ""Author"",  view_cnt AS ""ViewCnt"",
            reg_dt   AS ""RegDt"",   reg_id  AS ""RegId""";

        public async Task<List<CommunityPost>> GetList(string? tab, string? q)
        {
            string sql = $@"
                SELECT {COLS}
                  FROM community_post
                 WHERE use_yn = 'Y'
                   AND (@tab IS NULL OR tab = @tab)
                   AND (@q IS NULL OR title ILIKE '%' || @q || '%'
                                   OR content ILIKE '%' || @q || '%'
                                   OR author ILIKE '%' || @q || '%')
                 ORDER BY reg_dt DESC
                 LIMIT 500";
            var parameters = new List<NpgsqlParameter>
            {
                P("@tab", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(tab) ? null : tab),
                P("@q",   NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(q) ? null : q.Trim()),
            };
            var rows = await _dataService.QueryAsyncPg<CommunityPost>("DEV", sql, parameters);
            return rows?.ToList() ?? new List<CommunityPost>();
        }

        public async Task<CommunityPost?> GetDetail(long postId, string? viewerId)
        {
            // 하루 1회만 조회수 +1: rt_view_log(post_type,post_id,viewer,ymd) 유니크 → 신규 삽입 시에만 +1
            string sql = $@"
                WITH ins AS (
                    INSERT INTO rt_view_log(post_type, post_id, viewer_id, view_ymd, reg_dt)
                    VALUES ('CPOST', @post_id, COALESCE(@viewer, 'anon'), to_char(now(),'YYYYMMDD'), now())
                    ON CONFLICT DO NOTHING RETURNING 1
                )
                UPDATE community_post
                   SET view_cnt = view_cnt + (SELECT count(*) FROM ins)
                 WHERE post_id = @post_id AND use_yn = 'Y'
             RETURNING {COLS}";
            var parameters = new List<NpgsqlParameter>
            {
                P("@post_id", NpgsqlDbType.Bigint, postId),
                P("@viewer", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(viewerId) ? null : viewerId),
            };
            var rows = await _dataService.QueryAsyncPg<CommunityPost>("DEV", sql, parameters);
            return rows?.FirstOrDefault();
        }

        public async Task<long> Create(CommunityCreateDto dto)
        {
            const string sql = @"
                INSERT INTO community_post (tab, title, content, fields, author, off_no, rt_no, reg_id, reg_dt)
                VALUES (@tab, @title, @content, @fields::jsonb, @author, @off_no, @rt_no, @reg_id, CURRENT_TIMESTAMP)
             RETURNING post_id AS ""PostId""";
            var parameters = new List<NpgsqlParameter>
            {
                P("@tab",     NpgsqlDbType.Varchar, dto.Tab),
                P("@title",   NpgsqlDbType.Varchar, dto.Title),
                P("@content", NpgsqlDbType.Text,    dto.Content),
                P("@fields",  NpgsqlDbType.Text,    string.IsNullOrWhiteSpace(dto.Fields) ? "{}" : dto.Fields),
                P("@author",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(dto.Author) ? "익명" : dto.Author),
                P("@off_no",  NpgsqlDbType.Bigint,  dto.OffNo),
                P("@rt_no",   NpgsqlDbType.Varchar, dto.RtNo),
                P("@reg_id",  NpgsqlDbType.Varchar, dto.RegId),
            };
            var rows = await _dataService.QueryAsyncPg<CommunityPost>("DEV", sql, parameters);
            return rows?.FirstOrDefault()?.PostId ?? 0;
        }

        public async Task<bool> Delete(long postId)
        {
            const string sql = @"
                UPDATE community_post
                   SET use_yn = 'N', upd_dt = CURRENT_TIMESTAMP
                 WHERE post_id = @post_id";
            var parameters = new List<NpgsqlParameter> { P("@post_id", NpgsqlDbType.Bigint, postId) };
            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return result > 0;
        }
    }
}

using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Memo.Models;

namespace RealestateAPI.Memo.Services
{
    public interface IMemoServices
    {
        Task<List<StickyMemo>> GetMemos(string userId);
        Task<StickyMemo?> InsertMemo(StickyMemoCreateDto dto);
        Task<bool> UpdateMemo(long memoId, StickyMemoUpdateDto dto);
        Task<bool> DeleteMemo(long memoId, string? userId);
    }

    public class MemoServices : IMemoServices
    {
        private readonly IPostgresDataService _dataService;

        public MemoServices(IPostgresDataService dataService)
        {
            _dataService = dataService;
        }

        private const string MEMO_COLUMNS = @"
            memo_id    AS ""MemoId"",
            user_id    AS ""UserId"",
            content    AS ""Content"",
            color      AS ""Color"",
            sort_order AS ""SortOrder"",
            reg_dt     AS ""RegDt"",
            upd_dt     AS ""UpdDt""";

        public async Task<List<StickyMemo>> GetMemos(string userId)
        {
            string sql = $@"
                SELECT {MEMO_COLUMNS}
                FROM public.rt_sticky_memo
                WHERE user_id = @user_id AND use_yn = 'Y'
                ORDER BY sort_order ASC, memo_id DESC;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@user_id", NpgsqlDbType.Varchar) { Value = (object?)userId ?? DBNull.Value }
            };
            var items = await _dataService.QueryAsyncPg<StickyMemo>("DEV", sql, parameters);
            return items ?? new List<StickyMemo>();
        }

        public async Task<StickyMemo?> InsertMemo(StickyMemoCreateDto dto)
        {
            string sql = $@"
                INSERT INTO public.rt_sticky_memo (user_id, content, color, sort_order, reg_dt, upd_dt)
                VALUES (@user_id, @content, @color, @sort_order, now(), now())
                RETURNING {MEMO_COLUMNS};";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@user_id",    NpgsqlDbType.Varchar) { Value = (object?)dto.UserId ?? DBNull.Value },
                new NpgsqlParameter("@content",    NpgsqlDbType.Text)    { Value = (object?)dto.Content ?? DBNull.Value },
                new NpgsqlParameter("@color",      NpgsqlDbType.Varchar) { Value = (object?)dto.Color ?? DBNull.Value },
                new NpgsqlParameter("@sort_order", NpgsqlDbType.Integer) { Value = (object?)dto.SortOrder ?? 0 }
            };
            var result = await _dataService.QueryAsyncPg<StickyMemo>("DEV", sql, parameters);
            return result?.FirstOrDefault();
        }

        public async Task<bool> UpdateMemo(long memoId, StickyMemoUpdateDto dto)
        {
            const string sql = @"
                UPDATE public.rt_sticky_memo SET
                    content    = COALESCE(@content, content),
                    color      = COALESCE(@color, color),
                    sort_order = COALESCE(@sort_order, sort_order),
                    upd_dt     = now()
                WHERE memo_id = @memo_id;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@memo_id",    NpgsqlDbType.Bigint)  { Value = memoId },
                new NpgsqlParameter("@content",    NpgsqlDbType.Text)    { Value = (object?)dto.Content ?? DBNull.Value },
                new NpgsqlParameter("@color",      NpgsqlDbType.Varchar) { Value = (object?)dto.Color ?? DBNull.Value },
                new NpgsqlParameter("@sort_order", NpgsqlDbType.Integer) { Value = (object?)dto.SortOrder ?? DBNull.Value }
            };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        public async Task<bool> DeleteMemo(long memoId, string? userId)
        {
            const string sql = @"
                UPDATE public.rt_sticky_memo SET use_yn = 'N', upd_dt = now()
                WHERE memo_id = @memo_id;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@memo_id", NpgsqlDbType.Bigint) { Value = memoId }
            };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }
    }
}

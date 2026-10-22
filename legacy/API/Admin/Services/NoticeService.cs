using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using RealestateAPI.Admin.Models;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;

namespace RealestateAPI.Admin.Services
{
    public interface INoticeService
    {
        Task<NoticeList> SelectNoticeList(long? noticeId, string? category, string? isPublic, string? isPopup, string? showDashboard, int pageNumber, int rowsPerPage);
        Task<bool> InsertNotice(string title, string content, string? category, string? isTop, string? isPublic, string? isPopup, string? showOnDashboard,
            int? popupW, int? popupH, string? attachFile, DateTime? startDate, DateTime? endDate, int? sortOrder, string? userId);
        Task<bool> UpdateNotice(long noticeId, string? title, string? content, string? category, string? isTop,
            string? isPublic, string? isPopup, string? showOnDashboard, int? popupW, int? popupH, string? attachFile, DateTime? startDate, DateTime? endDate, int? sortOrder, string? userId);
        Task<bool> DeleteNotice(long noticeId, string? userId);
    }

    // fn_nt_notice 미사용 — nt_notice 직접 인라인 쿼리
    public class NoticeService : INoticeService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public NoticeService(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };

        private const string COLS = @"
            notice_id AS ""NoticeId"", title AS ""Title"", content AS ""Content"", category AS ""Category"",
            view_count AS ""ViewCount"", is_top AS ""IsTop"", is_public AS ""IsPublic"", is_popup AS ""IsPopup"", show_on_dashboard AS ""ShowOnDashboard"",
            popup_w AS ""PopupW"", popup_h AS ""PopupH"", attach_file AS ""AttachFile"",
            start_date AS ""StartDate"", end_date AS ""EndDate"", sort_order AS ""SortOrder"",
            reg_id AS ""RegId"", reg_dt AS ""RegDt"", mod_id AS ""ModId"", mod_dt AS ""ModDt""";

        public async Task<NoticeList> SelectNoticeList(long? noticeId, string? category, string? isPublic, string? isPopup, string? showDashboard, int pageNumber, int rowsPerPage)
        {
            int page = pageNumber <= 0 ? 1 : pageNumber;
            int rows = rowsPerPage <= 0 ? 10 : rowsPerPage;
            string where = @"
                 WHERE (@notice_id IS NULL OR notice_id = @notice_id)
                   AND (@category  IS NULL OR category = @category)
                   AND (@is_public IS NULL OR is_public = @is_public)
                   AND (@is_popup  IS NULL OR is_popup  = @is_popup)
                   AND (@show_dashboard IS NULL OR COALESCE(show_on_dashboard,'Y') = @show_dashboard)";
            List<NpgsqlParameter> Filter() => new List<NpgsqlParameter>
            {
                P("@notice_id", NpgsqlDbType.Bigint, noticeId),
                P("@category",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(category) ? null : category),
                P("@is_public", NpgsqlDbType.Char, string.IsNullOrWhiteSpace(isPublic) ? null : isPublic),
                P("@is_popup",  NpgsqlDbType.Char, string.IsNullOrWhiteSpace(isPopup) ? null : isPopup),
                P("@show_dashboard", NpgsqlDbType.Char, string.IsNullOrWhiteSpace(showDashboard) ? null : showDashboard),
            };

            string sql = $@"SELECT {COLS} FROM public.nt_notice {where}
                             ORDER BY is_top DESC, sort_order, notice_id DESC
                             LIMIT @rows OFFSET (@page - 1) * @rows";
            var listParams = Filter();
            listParams.Add(P("@rows", NpgsqlDbType.Integer, rows));
            listParams.Add(P("@page", NpgsqlDbType.Integer, page));
            var noticeRows = await _dataService.QueryAsyncPg<Notice>("DEV", sql, listParams);

            int totalCount = noticeRows?.Count ?? 0;
            try
            {
                using var conn = new NpgsqlConnection(_configuration.GetConnectionString("DEV"));
                await conn.OpenAsync();
                using var cmd = new NpgsqlCommand($"SELECT count(*)::int FROM public.nt_notice {where}", conn);
                cmd.Parameters.AddRange(Filter().ToArray());
                var r = await cmd.ExecuteScalarAsync();
                totalCount = (r != null && r != DBNull.Value) ? Convert.ToInt32(r) : totalCount;
            }
            catch { /* count 실패 시 페이지 건수로 대체 */ }

            return new NoticeList { Notices = noticeRows, TotalCount = totalCount };
        }

        public async Task<bool> InsertNotice(string title, string content, string? category, string? isTop, string? isPublic, string? isPopup, string? showOnDashboard,
            int? popupW, int? popupH, string? attachFile, DateTime? startDate, DateTime? endDate, int? sortOrder, string? userId)
        {
            const string sql = @"
                INSERT INTO public.nt_notice (title, content, category, is_top, is_public, is_popup, show_on_dashboard, popup_w, popup_h,
                                              attach_file, start_date, end_date, sort_order, reg_id, reg_dt)
                VALUES (@title, @content, @category, COALESCE(@is_top,'N'), COALESCE(@is_public,'Y'), COALESCE(@is_popup,'N'), COALESCE(@show_dashboard,'Y'),
                        @popup_w, @popup_h, @attach_file, @start_date, @end_date, COALESCE(@sort_order,0), COALESCE(@user_id,'admin'), CURRENT_TIMESTAMP)";
            var ps = new List<NpgsqlParameter>
            {
                P("@title", NpgsqlDbType.Varchar, title), P("@content", NpgsqlDbType.Text, content),
                P("@category", NpgsqlDbType.Varchar, category), P("@is_top", NpgsqlDbType.Char, isTop),
                P("@is_public", NpgsqlDbType.Char, isPublic), P("@is_popup", NpgsqlDbType.Char, isPopup),
                P("@show_dashboard", NpgsqlDbType.Char, showOnDashboard),
                P("@popup_w", NpgsqlDbType.Integer, popupW), P("@popup_h", NpgsqlDbType.Integer, popupH),
                P("@attach_file", NpgsqlDbType.Varchar, attachFile), P("@start_date", NpgsqlDbType.Date, startDate),
                P("@end_date", NpgsqlDbType.Date, endDate), P("@sort_order", NpgsqlDbType.Integer, sortOrder),
                P("@user_id", NpgsqlDbType.Varchar, userId),
            };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<bool> UpdateNotice(long noticeId, string? title, string? content, string? category, string? isTop,
            string? isPublic, string? isPopup, string? showOnDashboard, int? popupW, int? popupH, string? attachFile, DateTime? startDate, DateTime? endDate, int? sortOrder, string? userId)
        {
            const string sql = @"
                UPDATE public.nt_notice SET
                  title      = COALESCE(@title, title),
                  content    = COALESCE(@content, content),
                  category   = @category,
                  is_top     = COALESCE(@is_top, is_top),
                  is_public  = COALESCE(@is_public, is_public),
                  is_popup   = COALESCE(@is_popup, is_popup),
                  show_on_dashboard = COALESCE(@show_dashboard, show_on_dashboard),
                  popup_w    = @popup_w,
                  popup_h    = @popup_h,
                  attach_file= @attach_file,
                  start_date = @start_date,
                  end_date   = @end_date,
                  sort_order = COALESCE(@sort_order, sort_order),
                  mod_id     = @user_id,
                  mod_dt     = CURRENT_TIMESTAMP
                WHERE notice_id = @notice_id";
            var ps = new List<NpgsqlParameter>
            {
                P("@notice_id", NpgsqlDbType.Bigint, noticeId),
                P("@title", NpgsqlDbType.Varchar, title), P("@content", NpgsqlDbType.Text, content),
                P("@category", NpgsqlDbType.Varchar, category), P("@is_top", NpgsqlDbType.Char, isTop),
                P("@is_public", NpgsqlDbType.Char, isPublic), P("@is_popup", NpgsqlDbType.Char, isPopup),
                P("@show_dashboard", NpgsqlDbType.Char, showOnDashboard),
                P("@popup_w", NpgsqlDbType.Integer, popupW), P("@popup_h", NpgsqlDbType.Integer, popupH),
                P("@attach_file", NpgsqlDbType.Varchar, attachFile), P("@start_date", NpgsqlDbType.Date, startDate),
                P("@end_date", NpgsqlDbType.Date, endDate), P("@sort_order", NpgsqlDbType.Integer, sortOrder),
                P("@user_id", NpgsqlDbType.Varchar, userId),
            };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<bool> DeleteNotice(long noticeId, string? userId)
        {
            const string sql = @"DELETE FROM public.nt_notice WHERE notice_id = @notice_id";
            var ps = new List<NpgsqlParameter> { P("@notice_id", NpgsqlDbType.Bigint, noticeId) };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }
    }
}

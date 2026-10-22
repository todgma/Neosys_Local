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
    public interface IEventService
    {
        Task<EventList> SelectEventList(long? eventId, string? isPublic, string? isPopup, string? showDashboard, string? isParticipatory, int pageNumber, int rowsPerPage);
        Task<Event?> GetDetail(long eventId, string? viewerId);   // 조회 시 조회수 +1(하루 1회)
        Task<bool> InsertEvent(string title, string? content, string? imageUrl, string? linkUrl, string? isPublic, string? isPopup, string? showOnDashboard,
            int? popupW, int? popupH, DateTime? startDate, DateTime? endDate, int? sortOrder, string? isParticipatory, string? userId);
        Task<bool> UpdateEvent(long eventId, string? title, string? content, string? imageUrl, string? linkUrl, string? isPublic, string? isPopup, string? showOnDashboard,
            int? popupW, int? popupH, DateTime? startDate, DateTime? endDate, int? sortOrder, string? isParticipatory, string? userId);
        Task<bool> DeleteEvent(long eventId, string? userId);
    }

    public class EventService : IEventService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;
        public EventService(IPostgresDataService dataService, IConfiguration configuration) { _dataService = dataService; _configuration = configuration; }

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };

        private const string COLS = @"
            event_id AS ""EventId"", title AS ""Title"", content AS ""Content"", image_url AS ""ImageUrl"", link_url AS ""LinkUrl"",
            view_count AS ""ViewCount"", is_public AS ""IsPublic"", is_popup AS ""IsPopup"", show_on_dashboard AS ""ShowOnDashboard"", popup_w AS ""PopupW"", popup_h AS ""PopupH"",
            start_date AS ""StartDate"", end_date AS ""EndDate"", sort_order AS ""SortOrder"", COALESCE(is_participatory,'N') AS ""IsParticipatory"",
            reg_id AS ""RegId"", reg_dt AS ""RegDt"", mod_id AS ""ModId"", mod_dt AS ""ModDt""";

        public async Task<EventList> SelectEventList(long? eventId, string? isPublic, string? isPopup, string? showDashboard, string? isParticipatory, int pageNumber, int rowsPerPage)
        {
            int page = pageNumber <= 0 ? 1 : pageNumber;
            int rows = rowsPerPage <= 0 ? 100 : rowsPerPage;
            string where = @"
                 WHERE (@event_id IS NULL OR event_id = @event_id)
                   AND (@is_public IS NULL OR is_public = @is_public)
                   AND (@is_popup  IS NULL OR is_popup  = @is_popup)
                   AND (@show_dashboard IS NULL OR COALESCE(show_on_dashboard,'Y') = @show_dashboard)
                   AND (@is_part IS NULL OR COALESCE(is_participatory,'N') = @is_part)";
            List<NpgsqlParameter> Filter() => new List<NpgsqlParameter>
            {
                P("@event_id", NpgsqlDbType.Bigint, eventId),
                P("@is_public", NpgsqlDbType.Char, string.IsNullOrWhiteSpace(isPublic) ? null : isPublic),
                P("@is_popup",  NpgsqlDbType.Char, string.IsNullOrWhiteSpace(isPopup) ? null : isPopup),
                P("@show_dashboard", NpgsqlDbType.Char, string.IsNullOrWhiteSpace(showDashboard) ? null : showDashboard),
                P("@is_part", NpgsqlDbType.Char, string.IsNullOrWhiteSpace(isParticipatory) ? null : isParticipatory),
            };
            string sql = $@"SELECT {COLS} FROM public.nt_event {where}
                             ORDER BY sort_order, event_id DESC
                             LIMIT @rows OFFSET (@page - 1) * @rows";
            var lp = Filter(); lp.Add(P("@rows", NpgsqlDbType.Integer, rows)); lp.Add(P("@page", NpgsqlDbType.Integer, page));
            var list = await _dataService.QueryAsyncPg<Event>("DEV", sql, lp);

            int total = list?.Count ?? 0;
            try
            {
                using var conn = new NpgsqlConnection(_configuration.GetConnectionString("DEV"));
                await conn.OpenAsync();
                using var cmd = new NpgsqlCommand($"SELECT count(*)::int FROM public.nt_event {where}", conn);
                cmd.Parameters.AddRange(Filter().ToArray());
                var r = await cmd.ExecuteScalarAsync();
                total = (r != null && r != DBNull.Value) ? Convert.ToInt32(r) : total;
            }
            catch { /* keep page count */ }

            return new EventList { Events = list, TotalCount = total };
        }

        public async Task<Event?> GetDetail(long eventId, string? viewerId)
        {
            // 하루 1회만 조회수 +1 (rt_view_log 유니크로 중복 방지)
            string sql = $@"
                WITH ins AS (
                    INSERT INTO rt_view_log(post_type, post_id, viewer_id, view_ymd, reg_dt)
                    VALUES ('EVENT', @id, COALESCE(@viewer, 'anon'), to_char(now(),'YYYYMMDD'), now())
                    ON CONFLICT DO NOTHING RETURNING 1
                )
                UPDATE public.nt_event
                   SET view_count = view_count + (SELECT count(*) FROM ins)
                 WHERE event_id = @id
             RETURNING {COLS}";
            var ps = new List<NpgsqlParameter>
            {
                P("@id", NpgsqlDbType.Bigint, eventId),
                P("@viewer", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(viewerId) ? null : viewerId),
            };
            var rows = await _dataService.QueryAsyncPg<Event>("DEV", sql, ps);
            return rows?.FirstOrDefault();
        }

        public async Task<bool> InsertEvent(string title, string? content, string? imageUrl, string? linkUrl, string? isPublic, string? isPopup, string? showOnDashboard,
            int? popupW, int? popupH, DateTime? startDate, DateTime? endDate, int? sortOrder, string? isParticipatory, string? userId)
        {
            const string sql = @"
                INSERT INTO public.nt_event (title, content, image_url, link_url, is_public, is_popup, show_on_dashboard, popup_w, popup_h,
                                             start_date, end_date, sort_order, is_participatory, reg_id, reg_dt)
                VALUES (@title, @content, @image_url, @link_url, COALESCE(@is_public,'Y'), COALESCE(@is_popup,'N'), COALESCE(@show_dashboard,'Y'),
                        @popup_w, @popup_h, @start_date, @end_date, COALESCE(@sort_order,0), COALESCE(@is_part,'N'), COALESCE(@user_id,'admin'), CURRENT_TIMESTAMP)";
            var ps = new List<NpgsqlParameter>
            {
                P("@title", NpgsqlDbType.Varchar, title), P("@content", NpgsqlDbType.Text, content),
                P("@image_url", NpgsqlDbType.Varchar, imageUrl), P("@link_url", NpgsqlDbType.Varchar, linkUrl),
                P("@is_public", NpgsqlDbType.Char, isPublic), P("@is_popup", NpgsqlDbType.Char, isPopup),
                P("@show_dashboard", NpgsqlDbType.Char, showOnDashboard),
                P("@popup_w", NpgsqlDbType.Integer, popupW), P("@popup_h", NpgsqlDbType.Integer, popupH),
                P("@start_date", NpgsqlDbType.Date, startDate), P("@end_date", NpgsqlDbType.Date, endDate),
                P("@sort_order", NpgsqlDbType.Integer, sortOrder), P("@is_part", NpgsqlDbType.Char, isParticipatory),
                P("@user_id", NpgsqlDbType.Varchar, userId),
            };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<bool> UpdateEvent(long eventId, string? title, string? content, string? imageUrl, string? linkUrl, string? isPublic, string? isPopup, string? showOnDashboard,
            int? popupW, int? popupH, DateTime? startDate, DateTime? endDate, int? sortOrder, string? isParticipatory, string? userId)
        {
            const string sql = @"
                UPDATE public.nt_event SET
                  title      = COALESCE(@title, title),
                  content    = @content,
                  image_url  = @image_url,
                  link_url   = @link_url,
                  is_public  = COALESCE(@is_public, is_public),
                  is_popup   = COALESCE(@is_popup, is_popup),
                  show_on_dashboard = COALESCE(@show_dashboard, show_on_dashboard),
                  popup_w    = @popup_w,
                  popup_h    = @popup_h,
                  start_date = @start_date,
                  end_date   = @end_date,
                  sort_order = COALESCE(@sort_order, sort_order),
                  is_participatory = COALESCE(@is_part, is_participatory),
                  mod_id     = @user_id,
                  mod_dt     = CURRENT_TIMESTAMP
                WHERE event_id = @event_id";
            var ps = new List<NpgsqlParameter>
            {
                P("@event_id", NpgsqlDbType.Bigint, eventId),
                P("@title", NpgsqlDbType.Varchar, title), P("@content", NpgsqlDbType.Text, content),
                P("@image_url", NpgsqlDbType.Varchar, imageUrl), P("@link_url", NpgsqlDbType.Varchar, linkUrl),
                P("@is_public", NpgsqlDbType.Char, isPublic), P("@is_popup", NpgsqlDbType.Char, isPopup),
                P("@show_dashboard", NpgsqlDbType.Char, showOnDashboard),
                P("@popup_w", NpgsqlDbType.Integer, popupW), P("@popup_h", NpgsqlDbType.Integer, popupH),
                P("@start_date", NpgsqlDbType.Date, startDate), P("@end_date", NpgsqlDbType.Date, endDate),
                P("@sort_order", NpgsqlDbType.Integer, sortOrder), P("@is_part", NpgsqlDbType.Char, isParticipatory),
                P("@user_id", NpgsqlDbType.Varchar, userId),
            };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<bool> DeleteEvent(long eventId, string? userId)
        {
            const string sql = @"DELETE FROM public.nt_event WHERE event_id = @event_id";
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter> { P("@event_id", NpgsqlDbType.Bigint, eventId) }) > 0;
        }
    }
}

using System.Data;
using RealestateAPI.Admin.Models;
using RealestateAPI.Shared.Interfaces;
using Npgsql;

namespace RealestateAPI.Admin.Services
{
    public interface ICustomerCenterService
    {
        Task<CustomerInquiryList> SelectInquiryList(long? inquiryId, string? userId, string? category, string? status, int pageNumber, int rowsPerPage);
        Task<bool> InsertInquiry(string? userId, string? name, string? email, string? phone, string? category,
            string title, string content, int? sortOrder, string? regId);
        Task<bool> UpdateInquiry(long inquiryId, string? name, string? email, string? phone, string? category,
            string? title, string? content, string? status, int? sortOrder, string? regId);
        Task<bool> AnswerInquiry(long inquiryId, string answer, string answerId);
        Task<bool> DeleteInquiry(long inquiryId, string? regId);
    }

    public class CustomerCenterService : ICustomerCenterService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public CustomerCenterService(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        public async Task<CustomerInquiryList> SelectInquiryList(long? inquiryId, string? userId, string? category, string? status, int pageNumber, int rowsPerPage)
        {
            const string sql = @"
            select *
            from public.fn_cs_customer_center(
                p_mode          => @p_mode,
                p_inquiry_id    => @p_inquiry_id,
                p_user_id       => @p_user_id,
                p_category      => @p_category,
                p_status        => @p_status,
                p_page_number   => @p_page_number,
                p_rows_per_page => @p_rows_per_page
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_mode", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = "SEL" },
                new NpgsqlParameter("@p_inquiry_id", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)inquiryId ?? DBNull.Value },
                new NpgsqlParameter("@p_user_id", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)userId ?? DBNull.Value },
                new NpgsqlParameter("@p_category", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)category ?? DBNull.Value },
                new NpgsqlParameter("@p_status", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)status ?? DBNull.Value },
                new NpgsqlParameter("@p_page_number", NpgsqlTypes.NpgsqlDbType.Integer) { Value = pageNumber },
                new NpgsqlParameter("@p_rows_per_page", NpgsqlTypes.NpgsqlDbType.Integer) { Value = rowsPerPage }
            };

            var rows = await _dataService.QueryAsyncPg<CustomerInquiry>("DEV", sql, parameters);

            int totalCount = rows?.Count ?? 0;

            return new CustomerInquiryList { Inquiries = rows, TotalCount = totalCount };
        }

        public async Task<bool> InsertInquiry(string? userId, string? name, string? email, string? phone, string? category,
            string title, string content, int? sortOrder, string? regId)
        {
            const string sql = @"
            select *
            from public.fn_cs_customer_center(
                p_mode        => @p_mode,
                p_user_id     => @p_user_id,
                p_name        => @p_name,
                p_email       => @p_email,
                p_phone       => @p_phone,
                p_category    => @p_category,
                p_title       => @p_title,
                p_content     => @p_content,
                p_sort_order  => @p_sort_order,
                p_reg_id      => @p_reg_id
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_mode", "INS"),
                new NpgsqlParameter("@p_user_id", (object?)userId ?? DBNull.Value),
                new NpgsqlParameter("@p_name", (object?)name ?? DBNull.Value),
                new NpgsqlParameter("@p_email", (object?)email ?? DBNull.Value),
                new NpgsqlParameter("@p_phone", (object?)phone ?? DBNull.Value),
                new NpgsqlParameter("@p_category", (object?)category ?? DBNull.Value),
                new NpgsqlParameter("@p_title", (object?)title ?? DBNull.Value),
                new NpgsqlParameter("@p_content", (object?)content ?? DBNull.Value),
                new NpgsqlParameter("@p_sort_order", (object?)sortOrder ?? DBNull.Value),
                new NpgsqlParameter("@p_reg_id", (object?)regId ?? DBNull.Value)
            };

            await _dataService.QueryAsyncPg<CustomerInquiry>("DEV", sql, parameters);
            return true;
        }

        public async Task<bool> UpdateInquiry(long inquiryId, string? name, string? email, string? phone, string? category,
            string? title, string? content, string? status, int? sortOrder, string? regId)
        {
            const string sql = @"
            select *
            from public.fn_cs_customer_center(
                p_mode        => @p_mode,
                p_inquiry_id  => @p_inquiry_id,
                p_name        => @p_name,
                p_email       => @p_email,
                p_phone       => @p_phone,
                p_category    => @p_category,
                p_title       => @p_title,
                p_content     => @p_content,
                p_status      => @p_status,
                p_sort_order  => @p_sort_order,
                p_reg_id      => @p_reg_id
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_mode", "UPD"),
                new NpgsqlParameter("@p_inquiry_id", (object?)inquiryId ?? DBNull.Value),
                new NpgsqlParameter("@p_name", (object?)name ?? DBNull.Value),
                new NpgsqlParameter("@p_email", (object?)email ?? DBNull.Value),
                new NpgsqlParameter("@p_phone", (object?)phone ?? DBNull.Value),
                new NpgsqlParameter("@p_category", (object?)category ?? DBNull.Value),
                new NpgsqlParameter("@p_title", (object?)title ?? DBNull.Value),
                new NpgsqlParameter("@p_content", (object?)content ?? DBNull.Value),
                new NpgsqlParameter("@p_status", (object?)status ?? DBNull.Value),
                new NpgsqlParameter("@p_sort_order", (object?)sortOrder ?? DBNull.Value),
                new NpgsqlParameter("@p_reg_id", (object?)regId ?? DBNull.Value)
            };

            await _dataService.QueryAsyncPg<CustomerInquiry>("DEV", sql, parameters);
            return true;
        }

        public async Task<bool> AnswerInquiry(long inquiryId, string answer, string answerId)
        {
            const string sql = @"
            select *
            from public.fn_cs_customer_center(
                p_mode        => @p_mode,
                p_inquiry_id  => @p_inquiry_id,
                p_answer      => @p_answer,
                p_answer_id   => @p_answer_id
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_mode", "ANS"),
                new NpgsqlParameter("@p_inquiry_id", (object?)inquiryId ?? DBNull.Value),
                new NpgsqlParameter("@p_answer", (object?)answer ?? DBNull.Value),
                new NpgsqlParameter("@p_answer_id", (object?)answerId ?? DBNull.Value)
            };

            await _dataService.QueryAsyncPg<CustomerInquiry>("DEV", sql, parameters);
            return true;
        }

        public async Task<bool> DeleteInquiry(long inquiryId, string? regId)
        {
            const string sql = @"
            select *
            from public.fn_cs_customer_center(
                p_mode       => @p_mode,
                p_inquiry_id => @p_inquiry_id,
                p_reg_id     => @p_reg_id
            );";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_mode", "DEL"),
                new NpgsqlParameter("@p_inquiry_id", (object?)inquiryId ?? DBNull.Value),
                new NpgsqlParameter("@p_reg_id", (object?)regId ?? DBNull.Value)
            };

            await _dataService.QueryAsyncPg<CustomerInquiry>("DEV", sql, parameters);
            return true;
        }
    }
}

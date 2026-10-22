using RealestateAPI.Report.Models;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;

namespace RealestateAPI.Report.Services
{
    public interface IReportService
    {
        Task<long> CreateReport(ReportCreateDto dto);
        Task<ReportInfo?> GetReport(long reportNo);
        Task<List<ReportInfo>> GetReportsByCustomer(long custNo);
        Task<List<ReportInfo>> GetReportsByProperty(long ptNo);
        Task<List<ReportInfo>> GetReportsByUser(string userId);
        Task<bool> AttachCustomers(long reportNo, List<long> custNos, string? userId);
        Task<List<ReportShareInfo>> GetReportShares(long reportNo);
        Task<bool> DeleteReport(long reportNo);
    }

    public class ReportService : IReportService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public ReportService(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        private NpgsqlConnection Conn() => new NpgsqlConnection(_configuration.GetConnectionString("DEV"));

        // 보고서 생성 + 고객 배포 (직접 쿼리)
        public async Task<long> CreateReport(ReportCreateDto dto)
        {
            using var conn = Conn();
            await conn.OpenAsync();
            using var tx = conn.BeginTransaction();

            long reportNo;
            bool isUpdate = dto.ReportNo.HasValue && dto.ReportNo.Value > 0;

            if (isUpdate)
            {
                // 기존 보고서 수정
                reportNo = dto.ReportNo!.Value;
                const string upd = @"
                    UPDATE report
                       SET pt_no = @pt_no, title = @title, comment = @comment,
                           snapshot = CAST(@snapshot AS jsonb), content_html = @content_html
                     WHERE report_no = @report_no";
                using (var cmd = new NpgsqlCommand(upd, conn, tx))
                {
                    cmd.Parameters.Add(new NpgsqlParameter("@report_no", NpgsqlDbType.Bigint) { Value = reportNo });
                    cmd.Parameters.Add(new NpgsqlParameter("@pt_no", NpgsqlDbType.Bigint) { Value = (object?)dto.PtNo ?? DBNull.Value });
                    cmd.Parameters.Add(new NpgsqlParameter("@title", NpgsqlDbType.Varchar) { Value = (object?)dto.Title ?? DBNull.Value });
                    cmd.Parameters.Add(new NpgsqlParameter("@comment", NpgsqlDbType.Text) { Value = (object?)dto.Comment ?? DBNull.Value });
                    cmd.Parameters.Add(new NpgsqlParameter("@snapshot", NpgsqlDbType.Text) { Value = (object?)dto.Snapshot ?? DBNull.Value });
                    cmd.Parameters.Add(new NpgsqlParameter("@content_html", NpgsqlDbType.Text) { Value = (object?)dto.ContentHtml ?? DBNull.Value });
                    await cmd.ExecuteNonQueryAsync();
                }
                // 고객 배포 재구성 (기존 삭제 후 재삽입)
                using (var del = new NpgsqlCommand("DELETE FROM report_cust WHERE report_no = @report_no", conn, tx))
                {
                    del.Parameters.AddWithValue("@report_no", reportNo);
                    await del.ExecuteNonQueryAsync();
                }
            }
            else
            {
                const string ins = @"
                    INSERT INTO report (pt_no, title, comment, snapshot, content_html, reg_dt, reg_id)
                    VALUES (@pt_no, @title, @comment, CAST(@snapshot AS jsonb), @content_html, now(), @reg_id)
                    RETURNING report_no";
                using (var cmd = new NpgsqlCommand(ins, conn, tx))
                {
                    cmd.Parameters.Add(new NpgsqlParameter("@pt_no", NpgsqlDbType.Bigint) { Value = (object?)dto.PtNo ?? DBNull.Value });
                    cmd.Parameters.Add(new NpgsqlParameter("@title", NpgsqlDbType.Varchar) { Value = (object?)dto.Title ?? DBNull.Value });
                    cmd.Parameters.Add(new NpgsqlParameter("@comment", NpgsqlDbType.Text) { Value = (object?)dto.Comment ?? DBNull.Value });
                    cmd.Parameters.Add(new NpgsqlParameter("@snapshot", NpgsqlDbType.Text) { Value = (object?)dto.Snapshot ?? DBNull.Value });
                    cmd.Parameters.Add(new NpgsqlParameter("@content_html", NpgsqlDbType.Text) { Value = (object?)dto.ContentHtml ?? DBNull.Value });
                    cmd.Parameters.Add(new NpgsqlParameter("@reg_id", NpgsqlDbType.Varchar) { Value = (object?)dto.UserId ?? DBNull.Value });
                    reportNo = Convert.ToInt64(await cmd.ExecuteScalarAsync());
                }
            }

            if (dto.CustNos != null)
            {
                foreach (var custNo in dto.CustNos.Distinct())
                {
                    using var cmd = new NpgsqlCommand(@"
                        INSERT INTO report_cust (report_no, cust_no, reg_dt, reg_id)
                        VALUES (@report_no, @cust_no, now(), @reg_id)
                        ON CONFLICT (report_no, cust_no) DO NOTHING", conn, tx);
                    cmd.Parameters.AddWithValue("@report_no", reportNo);
                    cmd.Parameters.AddWithValue("@cust_no", custNo);
                    cmd.Parameters.Add(new NpgsqlParameter("@reg_id", NpgsqlDbType.Varchar) { Value = (object?)dto.UserId ?? DBNull.Value });
                    await cmd.ExecuteNonQueryAsync();
                }
            }

            await tx.CommitAsync();
            return reportNo;
        }

        // 기존 보고서에 고객 추가 배포
        public async Task<bool> AttachCustomers(long reportNo, List<long> custNos, string? userId)
        {
            if (custNos == null || custNos.Count == 0) return false;
            using var conn = Conn();
            await conn.OpenAsync();
            foreach (var custNo in custNos.Distinct())
            {
                using var cmd = new NpgsqlCommand(@"
                    INSERT INTO report_cust (report_no, cust_no, reg_dt, reg_id)
                    VALUES (@report_no, @cust_no, now(), @reg_id)
                    ON CONFLICT (report_no, cust_no) DO NOTHING", conn);
                cmd.Parameters.AddWithValue("@report_no", reportNo);
                cmd.Parameters.AddWithValue("@cust_no", custNo);
                cmd.Parameters.Add(new NpgsqlParameter("@reg_id", NpgsqlDbType.Varchar) { Value = (object?)userId ?? DBNull.Value });
                await cmd.ExecuteNonQueryAsync();
            }
            return true;
        }

        public async Task<ReportInfo?> GetReport(long reportNo)
        {
            const string sql = @"
                SELECT report_no AS ""ReportNo"", pt_no AS ""PtNo"", title AS ""Title"",
                       comment AS ""Comment"", snapshot::text AS ""Snapshot"", content_html AS ""ContentHtml"",
                       reg_dt AS ""RegDt"", reg_id AS ""RegId""
                  FROM report WHERE report_no = @report_no";
            var list = await _dataService.QueryAsyncPg<ReportInfo>("DEV", sql,
                new List<NpgsqlParameter> { new NpgsqlParameter("@report_no", reportNo) });
            var report = list.FirstOrDefault();
            if (report == null) return null;
            report.CustNos = await GetReportCustNos(reportNo);
            return report;
        }

        public async Task<List<ReportInfo>> GetReportsByCustomer(long custNo)
        {
            const string sql = @"
                SELECT r.report_no AS ""ReportNo"", r.pt_no AS ""PtNo"", r.title AS ""Title"",
                       r.comment AS ""Comment"", r.reg_dt AS ""RegDt"", r.reg_id AS ""RegId""
                  FROM report r
                  JOIN report_cust rc ON rc.report_no = r.report_no
                 WHERE rc.cust_no = @cust_no
                 ORDER BY r.report_no DESC";
            return await _dataService.QueryAsyncPg<ReportInfo>("DEV", sql,
                new List<NpgsqlParameter> { new NpgsqlParameter("@cust_no", custNo) });
        }

        public async Task<List<ReportInfo>> GetReportsByProperty(long ptNo)
        {
            const string sql = @"
                SELECT report_no AS ""ReportNo"", pt_no AS ""PtNo"", title AS ""Title"",
                       comment AS ""Comment"", reg_dt AS ""RegDt"", reg_id AS ""RegId""
                  FROM report WHERE pt_no = @pt_no ORDER BY report_no DESC";
            return await _dataService.QueryAsyncPg<ReportInfo>("DEV", sql,
                new List<NpgsqlParameter> { new NpgsqlParameter("@pt_no", ptNo) });
        }

        // 내가(사용자가) 만든 보고서 목록
        public async Task<List<ReportInfo>> GetReportsByUser(string userId)
        {
            const string sql = @"
                SELECT r.report_no AS ""ReportNo"", r.pt_no AS ""PtNo"", r.title AS ""Title"",
                       r.comment AS ""Comment"", r.reg_dt AS ""RegDt"", r.reg_id AS ""RegId"",
                       (SELECT COUNT(*) FROM report_cust rc WHERE rc.report_no = r.report_no) AS ""CustCount""
                  FROM report r
                 WHERE r.reg_id = @user_id
                 ORDER BY r.report_no DESC";
            return await _dataService.QueryAsyncPg<ReportInfo>("DEV", sql,
                new List<NpgsqlParameter> { new NpgsqlParameter("@user_id", (object?)userId ?? DBNull.Value) });
        }

        // 보고서별 공유(고객) 이력 — 고객명/연락처 포함
        public async Task<List<ReportShareInfo>> GetReportShares(long reportNo)
        {
            const string sql = @"
                SELECT rc.cust_no AS ""CustNo"", c.name AS ""Name"", c.tel AS ""Tel"", rc.reg_dt AS ""SharedDt""
                  FROM report_cust rc
                  LEFT JOIN ct_cust c ON c.cust_no = rc.cust_no
                 WHERE rc.report_no = @report_no
                 ORDER BY rc.reg_dt DESC, rc.cust_no";
            return await _dataService.QueryAsyncPg<ReportShareInfo>("DEV", sql,
                new List<NpgsqlParameter> { new NpgsqlParameter("@report_no", reportNo) });
        }

        // 보고서 삭제 (report_cust 먼저 삭제 후 report)
        public async Task<bool> DeleteReport(long reportNo)
        {
            using var conn = Conn();
            await conn.OpenAsync();
            using var tx = conn.BeginTransaction();
            using (var delCust = new NpgsqlCommand("DELETE FROM report_cust WHERE report_no = @report_no", conn, tx))
            {
                delCust.Parameters.AddWithValue("@report_no", reportNo);
                await delCust.ExecuteNonQueryAsync();
            }
            int affected;
            using (var del = new NpgsqlCommand("DELETE FROM report WHERE report_no = @report_no", conn, tx))
            {
                del.Parameters.AddWithValue("@report_no", reportNo);
                affected = await del.ExecuteNonQueryAsync();
            }
            await tx.CommitAsync();
            return affected > 0;
        }

        private async Task<List<long>> GetReportCustNos(long reportNo)
        {
            using var conn = Conn();
            await conn.OpenAsync();
            using var cmd = new NpgsqlCommand("SELECT cust_no FROM report_cust WHERE report_no = @report_no ORDER BY cust_no", conn);
            cmd.Parameters.AddWithValue("@report_no", reportNo);
            var result = new List<long>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync()) result.Add(reader.GetInt64(0));
            return result;
        }
    }
}

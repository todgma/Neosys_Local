using System.Data;
using System.Linq;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using RealestateAPI.Shared.Infrastructure;
using Newtonsoft.Json;
using System.Collections.Generic;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Schedule.Models;
using RealestateAPI.Schedule.Controllers;

namespace RealestateAPI.Schedule.Services
{
    public interface IScheduleServices
    {
        public Task<ScheduleList> SelectScheduleList(string StartDate, string EndDate, long? ScheduleId, string? ScopeDiv, string? OwnerUserId, long? OfficeId, int Page, int PageSize);
        public Task<ScheduleList> SelectScheduleListByProperty(string ptNo);
        public Task<bool> InsertSchedule(ScheduleCreateDto dto);
        public Task<bool> UpdateSchedule(long scheduleId, ScheduleUpdateDto dto);
        public Task<bool> DeleteSchedule(long scheduleId, string? userId);
    }


    public class ScheduleServices : IScheduleServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public ScheduleServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        // 목록/상세 공통 SELECT 컬럼
        private const string SCHEDULE_COLUMNS = @"
                s.schedule_id   AS ""ScheduleId"",
                s.scope_div     AS ""ScopeDiv"",
                s.owner_user_id AS ""OwnerUserId"",
                s.office_id     AS ""OfficeId"",
                s.title         AS ""Title"",
                s.content       AS ""Content"",
                s.phone         AS ""Phone"",
                s.location      AS ""Location"",
                s.start_at      AS ""StartAt"",
                s.end_at        AS ""EndAt"",
                s.all_day       AS ""AllDay"",
                s.use_yn        AS ""UseYn"",
                s.is_shared     AS ""IsShared"",
                s.is_private    AS ""IsPrivate"",
                s.category      AS ""Category"",
                s.amount        AS ""Amount"",
                s.contact_name  AS ""ContactName"",
                s.contact_role  AS ""ContactRole"",
                s.phone2        AS ""Phone2"",
                s.contact_name2 AS ""ContactName2"",
                s.contact_role2 AS ""ContactRole2"",
                s.reg_id        AS ""RegId"",
                s.reg_dt        AS ""RegDt"",
                s.upd_id        AS ""UpdId"",
                s.upd_dt        AS ""UpdDt""";

        public async Task<ScheduleList> SelectScheduleList(string StartDate, string EndDate, long? ScheduleId, string? ScopeDiv, string? OwnerUserId, long? OfficeId, int Page = 1, int PageSize = 20)
        {
            int page = Page < 1 ? 1 : Page;
            int pageSize = PageSize < 1 ? 20 : PageSize;
            int offset = (page - 1) * pageSize;

            string sql = $@"
            SELECT
            {SCHEDULE_COLUMNS}
            FROM rt_schedule s
            WHERE s.use_yn = 'Y'
                AND (@pr_schedule_id   IS NULL OR s.schedule_id   = @pr_schedule_id)
                -- SHARE(둘 다) 일정은 MY/OFFICE 필터 모두에 포함
                AND (@pr_scope_div IS NULL
                     OR s.scope_div = @pr_scope_div
                     OR (s.scope_div = 'SHARE' AND @pr_scope_div IN ('MY','OFFICE')))
                AND (@pr_owner_user_id IS NULL OR s.owner_user_id = @pr_owner_user_id)
                AND (@pr_office_id     IS NULL OR s.office_id      = @pr_office_id)
                AND (@pr_start_date    IS NULL OR s.start_at >= @pr_start_date::timestamptz)
                AND (@pr_end_date      IS NULL OR s.start_at <= @pr_end_date::timestamptz)
            ORDER BY s.start_at DESC
            LIMIT @page_size OFFSET @offset;";

            // 널 파라미터 자료형 미결정(42P08) 방지 → 명시적 타입 지정
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pr_schedule_id", NpgsqlDbType.Bigint)   { Value = (object?)ScheduleId ?? DBNull.Value },
                new NpgsqlParameter("@pr_scope_div", NpgsqlDbType.Varchar)    { Value = (object?)ScopeDiv ?? DBNull.Value },
                new NpgsqlParameter("@pr_owner_user_id", NpgsqlDbType.Varchar){ Value = (object?)OwnerUserId ?? DBNull.Value },
                new NpgsqlParameter("@pr_office_id", NpgsqlDbType.Bigint)     { Value = (object?)OfficeId ?? DBNull.Value },
                new NpgsqlParameter("@pr_start_date", NpgsqlDbType.Varchar)   { Value = (object?)StartDate ?? DBNull.Value },
                new NpgsqlParameter("@pr_end_date", NpgsqlDbType.Varchar)     { Value = (object?)EndDate ?? DBNull.Value },
                new NpgsqlParameter("@page_size", NpgsqlDbType.Integer)       { Value = pageSize },
                new NpgsqlParameter("@offset", NpgsqlDbType.Integer)          { Value = offset }
            };

            var schedules = await _dataService.QueryAsyncPg<ScheduleModel>("DEV", sql, parameters);
            await AttachLinks(schedules);

            return new ScheduleList { Schedules = schedules };
        }

        // 물건번호로 연동된 일정 조회 (rt_schedule_link link_type='PT')
        public async Task<ScheduleList> SelectScheduleListByProperty(string ptNo)
        {
            string sql = $@"
            SELECT
            {SCHEDULE_COLUMNS}
            FROM rt_schedule s
            JOIN rt_schedule_link l ON l.schedule_id = s.schedule_id
            WHERE s.use_yn = 'Y'
              AND l.link_type = 'PT'
              AND l.link_key = @pt_no
            ORDER BY s.start_at DESC;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pt_no", NpgsqlDbType.Varchar) { Value = (object?)ptNo ?? DBNull.Value }
            };

            var schedules = await _dataService.QueryAsyncPg<ScheduleModel>("DEV", sql, parameters);
            await AttachLinks(schedules);
            return new ScheduleList { Schedules = schedules };
        }

        // 조회된 일정들의 연동정보(rt_schedule_link)를 한 번의 쿼리로 채워넣음 (N+1 방지)
        private async Task AttachLinks(List<ScheduleModel> schedules)
        {
            if (schedules == null || schedules.Count == 0) return;

            var ids = schedules.Select(s => s.ScheduleId).ToArray();

            const string linkSql = @"
                SELECT link_id      AS ""LinkId"",
                       schedule_id  AS ""ScheduleId"",
                       link_type    AS ""LinkType"",
                       link_key     AS ""LinkKey"",
                       meta::text   AS ""Meta"",
                       reg_id       AS ""RegId"",
                       reg_dt       AS ""RegDt"",
                       upd_id       AS ""UpdId"",
                       upd_dt       AS ""UpdDt""
                  FROM rt_schedule_link
                 WHERE schedule_id = ANY(@ids)
                 ORDER BY link_id;";

            var linkParams = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@ids", NpgsqlDbType.Array | NpgsqlDbType.Bigint) { Value = ids }
            };

            var links = await _dataService.QueryAsyncPg<ScheduleLinkModel>("DEV", linkSql, linkParams);
            var byId = links.GroupBy(l => l.ScheduleId).ToDictionary(g => g.Key, g => g.ToList());

            foreach (var s in schedules)
            {
                s.Links = byId.TryGetValue(s.ScheduleId, out var ls) ? ls : new List<ScheduleLinkModel>();
            }
        }

        public async Task<bool> InsertSchedule(ScheduleCreateDto dto)
        {
            const string sql = @"
            INSERT INTO rt_schedule (
                scope_div, owner_user_id, office_id, title, content, phone, location,
                start_at, end_at, all_day, is_shared, is_private,
                category, amount, contact_name, contact_role, phone2, contact_name2, contact_role2,
                reg_id, reg_dt
            ) VALUES (
                @pr_scope_div, @pr_owner_user_id, @pr_office_id, @pr_title, @pr_content, @pr_phone, @pr_location,
                @pr_start_at::timestamptz, @pr_end_at::timestamptz, @pr_all_day, @pr_is_shared, @pr_is_private,
                @pr_category, @pr_amount, @pr_contact_name, @pr_contact_role, @pr_phone2, @pr_contact_name2, @pr_contact_role2,
                @pr_user_id, NOW()
            )
            RETURNING schedule_id;";

            // 메인 저장 → 발급 key로 연동정보 저장까지 하나의 트랜잭션으로 처리
            await using var conn = new NpgsqlConnection(_configuration.GetConnectionString("DEV"));
            await conn.OpenAsync();
            await conn.SetAppUidAsync(dto.UserId); // _hist 작성자(app.uid) — 트랜잭션 전에 설정
            await using var tx = await conn.BeginTransactionAsync();
            try
            {
                long scheduleId;
                await using (var cmd = new NpgsqlCommand(sql, conn, tx))
                {
                    cmd.Parameters.AddRange(new[]
                    {
                        new NpgsqlParameter("@pr_scope_div", (object?)dto.ScopeDiv ?? DBNull.Value),
                        new NpgsqlParameter("@pr_owner_user_id", (object?)dto.OwnerUserId ?? DBNull.Value),
                        new NpgsqlParameter("@pr_office_id", (object?)dto.OfficeId ?? DBNull.Value),
                        new NpgsqlParameter("@pr_title", (object?)dto.Title ?? DBNull.Value),
                        new NpgsqlParameter("@pr_content", (object?)dto.Content ?? DBNull.Value),
                        new NpgsqlParameter("@pr_phone", (object?)dto.Phone ?? DBNull.Value),
                        new NpgsqlParameter("@pr_location", (object?)dto.Location ?? DBNull.Value),
                        new NpgsqlParameter("@pr_start_at", (object?)dto.StartAt ?? DBNull.Value),
                        new NpgsqlParameter("@pr_end_at", (object?)dto.EndAt ?? DBNull.Value),
                        new NpgsqlParameter("@pr_all_day", dto.AllDay),
                        new NpgsqlParameter("@pr_is_shared", dto.IsShared),
                        new NpgsqlParameter("@pr_is_private", dto.IsPrivate),
                        new NpgsqlParameter("@pr_category", (object?)dto.Category ?? DBNull.Value),
                        new NpgsqlParameter("@pr_amount", (object?)dto.Amount ?? DBNull.Value),
                        new NpgsqlParameter("@pr_contact_name", (object?)dto.ContactName ?? DBNull.Value),
                        new NpgsqlParameter("@pr_contact_role", (object?)dto.ContactRole ?? DBNull.Value),
                        new NpgsqlParameter("@pr_phone2", (object?)dto.Phone2 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_contact_name2", (object?)dto.ContactName2 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_contact_role2", (object?)dto.ContactRole2 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)dto.UserId ?? DBNull.Value)
                    });
                    var result = await cmd.ExecuteScalarAsync();
                    scheduleId = (result != null && result != DBNull.Value) ? Convert.ToInt64(result) : 0;
                }

                if (scheduleId > 0 && dto.Links != null && dto.Links.Count > 0)
                {
                    await InsertScheduleLinks(conn, tx, scheduleId, dto.Links, dto.UserId);
                }

                await tx.CommitAsync();
                return scheduleId > 0;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        // 연동정보 저장 (공유 트랜잭션 위에서 실행)
        private async Task InsertScheduleLinks(NpgsqlConnection conn, NpgsqlTransaction tx, long scheduleId, List<ScheduleLinkDto> links, string? userId)
        {
            const string linkSql = @"
                INSERT INTO rt_schedule_link (schedule_id, link_type, link_key, meta, reg_id, reg_dt)
                VALUES (@schedule_id, @link_type, @link_key, (@meta)::jsonb, @reg_id, NOW());";

            foreach (var link in links)
            {
                await using var cmd = new NpgsqlCommand(linkSql, conn, tx);
                cmd.Parameters.AddRange(new[]
                {
                    new NpgsqlParameter("@schedule_id", scheduleId),
                    new NpgsqlParameter("@link_type", (object?)link.LinkType ?? DBNull.Value),
                    new NpgsqlParameter("@link_key", (object?)link.LinkKey ?? DBNull.Value),
                    new NpgsqlParameter("@meta", (object?)link.Meta ?? DBNull.Value),
                    new NpgsqlParameter("@reg_id", (object?)userId ?? DBNull.Value)
                });
                await cmd.ExecuteNonQueryAsync();
            }
        }

        public async Task<bool> UpdateSchedule(long scheduleId, ScheduleUpdateDto dto)
        {
            const string sql = @"
            UPDATE rt_schedule SET
                scope_div     = COALESCE(@pr_scope_div, scope_div),
                owner_user_id = COALESCE(@pr_owner_user_id, owner_user_id),
                office_id     = COALESCE(@pr_office_id, office_id),
                title         = COALESCE(@pr_title, title),
                content       = COALESCE(@pr_content, content),
                phone         = COALESCE(@pr_phone, phone),
                location      = COALESCE(@pr_location, location),
                start_at      = COALESCE(@pr_start_at::timestamptz, start_at),
                end_at        = COALESCE(@pr_end_at::timestamptz, end_at),
                all_day       = COALESCE(@pr_all_day, all_day),
                is_shared     = COALESCE(@pr_is_shared, is_shared),
                is_private    = COALESCE(@pr_is_private, is_private),
                category      = COALESCE(@pr_category, category),
                amount        = COALESCE(@pr_amount, amount),
                contact_name  = COALESCE(@pr_contact_name, contact_name),
                contact_role  = COALESCE(@pr_contact_role, contact_role),
                phone2        = COALESCE(@pr_phone2, phone2),
                contact_name2 = COALESCE(@pr_contact_name2, contact_name2),
                contact_role2 = COALESCE(@pr_contact_role2, contact_role2),
                upd_id        = @pr_user_id,
                upd_dt        = NOW()
            WHERE schedule_id = @pr_schedule_id;";

            await using var conn = new NpgsqlConnection(_configuration.GetConnectionString("DEV"));
            await conn.OpenAsync();
            await conn.SetAppUidAsync(dto.UserId); // _hist 작성자(app.uid) — 트랜잭션 전에 설정
            await using var tx = await conn.BeginTransactionAsync();
            try
            {
                await using (var cmd = new NpgsqlCommand(sql, conn, tx))
                {
                    cmd.Parameters.AddRange(new[]
                    {
                        new NpgsqlParameter("@pr_schedule_id", scheduleId),
                        new NpgsqlParameter("@pr_scope_div", (object?)dto.ScopeDiv ?? DBNull.Value),
                        new NpgsqlParameter("@pr_owner_user_id", (object?)dto.OwnerUserId ?? DBNull.Value),
                        new NpgsqlParameter("@pr_office_id", (object?)dto.OfficeId ?? DBNull.Value),
                        new NpgsqlParameter("@pr_title", (object?)dto.Title ?? DBNull.Value),
                        new NpgsqlParameter("@pr_content", (object?)dto.Content ?? DBNull.Value),
                        new NpgsqlParameter("@pr_phone", (object?)dto.Phone ?? DBNull.Value),
                        new NpgsqlParameter("@pr_location", (object?)dto.Location ?? DBNull.Value),
                        new NpgsqlParameter("@pr_start_at", (object?)dto.StartAt ?? DBNull.Value),
                        new NpgsqlParameter("@pr_end_at", (object?)dto.EndAt ?? DBNull.Value),
                        new NpgsqlParameter("@pr_all_day", (object?)dto.AllDay ?? DBNull.Value),
                        new NpgsqlParameter("@pr_is_shared", (object?)dto.IsShared ?? DBNull.Value),
                        new NpgsqlParameter("@pr_is_private", (object?)dto.IsPrivate ?? DBNull.Value),
                        new NpgsqlParameter("@pr_category", (object?)dto.Category ?? DBNull.Value),
                        new NpgsqlParameter("@pr_amount", (object?)dto.Amount ?? DBNull.Value),
                        new NpgsqlParameter("@pr_contact_name", (object?)dto.ContactName ?? DBNull.Value),
                        new NpgsqlParameter("@pr_contact_role", (object?)dto.ContactRole ?? DBNull.Value),
                        new NpgsqlParameter("@pr_phone2", (object?)dto.Phone2 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_contact_name2", (object?)dto.ContactName2 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_contact_role2", (object?)dto.ContactRole2 ?? DBNull.Value),
                        new NpgsqlParameter("@pr_user_id", (object?)dto.UserId ?? DBNull.Value)
                    });
                    await cmd.ExecuteNonQueryAsync();
                }

                // 연동정보가 넘어온 경우에만 전체 교체(삭제 후 재삽입)
                if (dto.Links != null)
                {
                    await using (var delCmd = new NpgsqlCommand(@"DELETE FROM rt_schedule_link WHERE schedule_id = @pr_schedule_id;", conn, tx))
                    {
                        delCmd.Parameters.Add(new NpgsqlParameter("@pr_schedule_id", scheduleId));
                        await delCmd.ExecuteNonQueryAsync();
                    }

                    if (dto.Links.Count > 0)
                    {
                        await InsertScheduleLinks(conn, tx, scheduleId, dto.Links, dto.UserId);
                    }
                }

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> DeleteSchedule(long scheduleId, string? userId)
        {
            const string sql = @"
            UPDATE rt_schedule SET
                use_yn = 'N',
                upd_id = @pr_user_id,
                upd_dt = NOW()
            WHERE schedule_id = @pr_schedule_id;";

            await using var conn = new NpgsqlConnection(_configuration.GetConnectionString("DEV"));
            await conn.OpenAsync();
            await conn.SetAppUidAsync(userId); // _hist 작성자(app.uid) — 트랜잭션 전에 설정
            await using var tx = await conn.BeginTransactionAsync();
            try
            {
                await using (var cmd = new NpgsqlCommand(sql, conn, tx))
                {
                    cmd.Parameters.AddRange(new[]
                    {
                        new NpgsqlParameter("@pr_schedule_id", scheduleId),
                        new NpgsqlParameter("@pr_user_id", (object?)userId ?? DBNull.Value)
                    });
                    await cmd.ExecuteNonQueryAsync();
                }

                await using (var delCmd = new NpgsqlCommand(@"DELETE FROM rt_schedule_link WHERE schedule_id = @pr_schedule_id;", conn, tx))
                {
                    delCmd.Parameters.Add(new NpgsqlParameter("@pr_schedule_id", scheduleId));
                    await delCmd.ExecuteNonQueryAsync();
                }

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }
    }
}

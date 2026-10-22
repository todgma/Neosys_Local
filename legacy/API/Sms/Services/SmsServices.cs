using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using System.Text.Json;
using RealestateAPI.Sms.Models;

namespace RealestateAPI.Sms.Services
{
    public interface ISmsServices
    {
        Task<List<SmsGroup>> GetGroups(long rtNo);
        Task<SmsGroup?> CreateGroup(SmsGroupCreateDto dto);
        Task<bool> UpdateGroup(long groupId, SmsGroupUpdateDto dto);
        Task<bool> DeleteGroup(long groupId);
        Task<List<SmsSendHistory>> GetHistory(long rtNo, long? groupId);
        Task<SmsSendHistory?> LogSend(SmsSendDto dto);
    }

    public class SmsServices : ISmsServices
    {
        private readonly IPostgresDataService _dataService;
        private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        public SmsServices(IPostgresDataService dataService)
        {
            _dataService = dataService;
        }

        private const string GROUP_COLUMNS = @"
            group_id      AS ""GroupId"",
            off_no        AS ""OffNo"",
            rt_no         AS ""RtNo"",
            group_name    AS ""GroupName"",
            group_memo    AS ""GroupMemo"",
            members::text AS ""Members"",
            member_count  AS ""MemberCount"",
            reg_dt        AS ""RegDt"",
            upd_dt        AS ""UpdDt""";

        private const string HIST_COLUMNS = @"
            send_id         AS ""SendId"",
            group_id        AS ""GroupId"",
            off_no          AS ""OffNo"",
            rt_no           AS ""RtNo"",
            group_name      AS ""GroupName"",
            send_message    AS ""SendMessage"",
            recipients::text AS ""Recipients"",
            recipient_count AS ""RecipientCount"",
            send_type       AS ""SendType"",
            send_status     AS ""SendStatus"",
            reg_dt          AS ""RegDt""";

        // ── 그룹 ──────────────────────────────────────────────
        // 같은 사무소라도 회원(중개인)별로 분리 → rt_no 기준 조회
        public async Task<List<SmsGroup>> GetGroups(long rtNo)
        {
            string sql = $@"
                SELECT {GROUP_COLUMNS}
                FROM public.rt_sms_group
                WHERE rt_no = @rt_no AND use_yn = 'Y'
                ORDER BY member_count DESC, group_id DESC;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@rt_no", NpgsqlDbType.Bigint) { Value = rtNo }
            };
            var items = await _dataService.QueryAsyncPg<SmsGroup>("DEV", sql, parameters);
            return items ?? new List<SmsGroup>();
        }

        public async Task<SmsGroup?> CreateGroup(SmsGroupCreateDto dto)
        {
            var members = dto.Members ?? new List<SmsMemberDto>();
            var membersJson = JsonSerializer.Serialize(members, JsonOpts);

            string sql = $@"
                INSERT INTO public.rt_sms_group
                    (off_no, rt_no, group_name, group_memo, members, member_count, reg_id, reg_dt, upd_dt)
                VALUES
                    (@off_no, @rt_no, @group_name, @group_memo, @members, @member_count, @reg_id, now(), now())
                RETURNING {GROUP_COLUMNS};";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@off_no",       NpgsqlDbType.Bigint)  { Value = dto.OffNo },
                new NpgsqlParameter("@rt_no",        NpgsqlDbType.Bigint)  { Value = (object?)dto.RtNo ?? DBNull.Value },
                new NpgsqlParameter("@group_name",   NpgsqlDbType.Varchar) { Value = (object?)dto.GroupName ?? DBNull.Value },
                new NpgsqlParameter("@group_memo",   NpgsqlDbType.Text)    { Value = (object?)dto.GroupMemo ?? DBNull.Value },
                new NpgsqlParameter("@members",      NpgsqlDbType.Jsonb)   { Value = membersJson },
                new NpgsqlParameter("@member_count", NpgsqlDbType.Integer) { Value = members.Count },
                new NpgsqlParameter("@reg_id",       NpgsqlDbType.Varchar) { Value = (object?)dto.RegId ?? DBNull.Value }
            };
            var result = await _dataService.QueryAsyncPg<SmsGroup>("DEV", sql, parameters);
            return result?.FirstOrDefault();
        }

        public async Task<bool> UpdateGroup(long groupId, SmsGroupUpdateDto dto)
        {
            // 그룹명/메모만 수정(멤버·전송이력은 수정하지 않음)
            const string sql = @"
                UPDATE public.rt_sms_group SET
                    group_name = COALESCE(@group_name, group_name),
                    group_memo = COALESCE(@group_memo, group_memo),
                    upd_id     = @upd_id,
                    upd_dt     = now()
                WHERE group_id = @group_id;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@group_id",   NpgsqlDbType.Bigint)  { Value = groupId },
                new NpgsqlParameter("@group_name", NpgsqlDbType.Varchar) { Value = (object?)dto.GroupName ?? DBNull.Value },
                new NpgsqlParameter("@group_memo", NpgsqlDbType.Text)    { Value = (object?)dto.GroupMemo ?? DBNull.Value },
                new NpgsqlParameter("@upd_id",     NpgsqlDbType.Varchar) { Value = (object?)dto.UpdId ?? DBNull.Value }
            };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        public async Task<bool> DeleteGroup(long groupId)
        {
            const string sql = @"
                UPDATE public.rt_sms_group SET use_yn = 'N', upd_dt = now()
                WHERE group_id = @group_id;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@group_id", NpgsqlDbType.Bigint) { Value = groupId }
            };
            await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return true;
        }

        // ── 발송 이력 ─────────────────────────────────────────
        public async Task<List<SmsSendHistory>> GetHistory(long rtNo, long? groupId)
        {
            string sql = $@"
                SELECT {HIST_COLUMNS}
                FROM public.rt_sms_send_hist
                WHERE rt_no = @rt_no
                  {(groupId.HasValue ? "AND group_id = @group_id" : "")}
                ORDER BY reg_dt DESC, send_id DESC;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@rt_no", NpgsqlDbType.Bigint) { Value = rtNo }
            };
            if (groupId.HasValue)
                parameters.Add(new NpgsqlParameter("@group_id", NpgsqlDbType.Bigint) { Value = groupId.Value });

            var items = await _dataService.QueryAsyncPg<SmsSendHistory>("DEV", sql, parameters);
            return items ?? new List<SmsSendHistory>();
        }

        public async Task<SmsSendHistory?> LogSend(SmsSendDto dto)
        {
            var recipients = dto.Recipients ?? new List<SmsMemberDto>();
            var recipientsJson = JsonSerializer.Serialize(recipients, JsonOpts);

            string sql = $@"
                INSERT INTO public.rt_sms_send_hist
                    (group_id, off_no, rt_no, group_name, send_message, recipients, recipient_count, send_type, send_status, reg_id, reg_dt)
                VALUES
                    (@group_id, @off_no, @rt_no, @group_name, @send_message, @recipients, @recipient_count, @send_type, 'SUCCESS', @reg_id, now())
                RETURNING {HIST_COLUMNS};";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@group_id",        NpgsqlDbType.Bigint)  { Value = (object?)dto.GroupId ?? DBNull.Value },
                new NpgsqlParameter("@off_no",          NpgsqlDbType.Bigint)  { Value = dto.OffNo },
                new NpgsqlParameter("@rt_no",           NpgsqlDbType.Bigint)  { Value = (object?)dto.RtNo ?? DBNull.Value },
                new NpgsqlParameter("@group_name",      NpgsqlDbType.Varchar) { Value = (object?)dto.GroupName ?? DBNull.Value },
                new NpgsqlParameter("@send_message",    NpgsqlDbType.Text)    { Value = (object?)dto.SendMessage ?? DBNull.Value },
                new NpgsqlParameter("@recipients",      NpgsqlDbType.Jsonb)   { Value = recipientsJson },
                new NpgsqlParameter("@recipient_count", NpgsqlDbType.Integer) { Value = recipients.Count },
                new NpgsqlParameter("@send_type",       NpgsqlDbType.Varchar) { Value = (object?)(string.IsNullOrEmpty(dto.SendType) ? "SMS" : dto.SendType) },
                new NpgsqlParameter("@reg_id",          NpgsqlDbType.Varchar) { Value = (object?)dto.RegId ?? DBNull.Value }
            };
            var result = await _dataService.QueryAsyncPg<SmsSendHistory>("DEV", sql, parameters);
            return result?.FirstOrDefault();
        }
    }
}

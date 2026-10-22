using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Admin.Models;
using RealestateAPI.Common.Services;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Admin.Services
{
    public interface IEventEntryService
    {
        Task<long> SubmitEntry(EventEntrySubmitDto dto);
        Task<List<EventEntry>> GetMyEntries(string? userId, long? offNo);
        Task<List<EventEntry>> GetEventEntries(long eventId);
        Task<bool> ConfirmEntry(long entryId, EventEntryConfirmDto dto);
        Task<List<EventEntry>> GetConfirmedUnseen(string? userId, long? offNo); // 확인완료+미확인(대시보드 팝업용)
        Task<int> MarkSeen(IEnumerable<long> entryIds);                          // 팝업 표시 후 user_seen='Y'
    }

    public class EventEntryService : IEventEntryService
    {
        private readonly IPostgresDataService _db;
        private readonly IFileService _fileService;
        public EventEntryService(IPostgresDataService db, IFileService fileService) { _db = db; _fileService = fileService; }

        // 이벤트참여 첨부: 문서(SYFTY02) / 이벤트참여(SYFDV08)
        private const string FileTyp = "SYFTY02";
        private const string FileDiv = "SYFDV08";

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };
        private sealed class IdRow { public long EntryId { get; set; } }

        private const string COLS = @"
            e.entry_id AS ""EntryId"", e.event_id AS ""EventId"", e.off_no AS ""OffNo"", e.rt_no AS ""RtNo"",
            e.user_id AS ""UserId"", e.user_nm AS ""UserNm"", e.content AS ""Content"", e.status AS ""Status"",
            e.admin_memo AS ""AdminMemo"", e.confirmed_by AS ""ConfirmedBy"", e.confirmed_dt AS ""ConfirmedDt"", e.reg_dt AS ""RegDt"",
            v.title AS ""EventTitle"",
            (SELECT count(*)::int FROM sys_file f WHERE f.file_div = 'SYFDV08' AND f.ref_key = e.entry_id::text AND f.use_yn = 'Y') AS ""FileCnt""";

        public async Task<long> SubmitEntry(EventEntrySubmitDto dto)
        {
            if (dto == null || dto.EventId <= 0) return 0;
            // 제출할 때마다 새 참여 내역으로 적재(이력 누적) — 관리자 참여자 목록에 각각 표시
            const string sql = @"
                INSERT INTO nt_event_entry (event_id, off_no, rt_no, user_id, user_nm, content, status, reg_dt)
                VALUES (@eid, @off, @rt, @uid, @unm, @content, 'SUBMITTED', now())
                RETURNING entry_id AS ""EntryId""";
            var ps = new List<NpgsqlParameter>
            {
                P("@eid", NpgsqlDbType.Bigint, dto.EventId),
                P("@off", NpgsqlDbType.Bigint, dto.OffNo),
                P("@rt", NpgsqlDbType.Bigint, dto.RtNo),
                P("@uid", NpgsqlDbType.Varchar, dto.UserId),
                P("@unm", NpgsqlDbType.Varchar, dto.UserNm),
                P("@content", NpgsqlDbType.Text, dto.Content),
            };
            var rows = await _db.QueryAsyncPg<IdRow>("DEV", sql, ps);
            long entryId = rows?.FirstOrDefault()?.EntryId ?? 0;
            if (entryId <= 0) return 0;

            // 첨부 파일 메타 저장(sys_file, ref_key=entry_id)
            if (dto.Files != null)
            {
                foreach (var f in dto.Files)
                {
                    if (string.IsNullOrWhiteSpace(f?.ObjectKey)) continue;
                    try
                    {
                        await _fileService.SaveFile(new FileMetaDto
                        {
                            FileTyp = FileTyp, FileDiv = FileDiv, RefKey = entryId.ToString(),
                            OrigName = f.OrigName, ObjectKey = f.ObjectKey, ContentType = f.ContentType,
                            FileSize = f.FileSize, Ext = f.Ext, UserId = dto.UserId,
                        });
                    }
                    catch (Exception ex) { Console.WriteLine("이벤트참여 첨부 저장 실패: " + ex.Message); }
                }
            }
            return entryId;
        }

        public async Task<List<EventEntry>> GetMyEntries(string? userId, long? offNo)
        {
            var where = new List<string>();
            var ps = new List<NpgsqlParameter>();
            if (!string.IsNullOrWhiteSpace(userId)) { where.Add("e.user_id = @uid"); ps.Add(P("@uid", NpgsqlDbType.Varchar, userId)); }
            if (offNo.HasValue) { where.Add("e.off_no = @off"); ps.Add(P("@off", NpgsqlDbType.Bigint, offNo.Value)); }
            if (where.Count == 0) return new List<EventEntry>();
            var sql = $@"SELECT {COLS}
                          FROM nt_event_entry e
                          LEFT JOIN nt_event v ON v.event_id = e.event_id
                         WHERE {string.Join(" OR ", where)}
                         ORDER BY e.reg_dt DESC, e.entry_id DESC";
            var rows = await _db.QueryAsyncPg<EventEntry>("DEV", sql, ps);
            return rows ?? new List<EventEntry>();
        }

        public async Task<List<EventEntry>> GetEventEntries(long eventId)
        {
            // 참여자 목록 — 아이디/사무소명/연락처 + 참여횟수(동일 사무소 기준 제출 순번)
            var sql = $@"SELECT {COLS},
                           o.""OffNm"" AS ""OffNm"",
                           COALESCE(rr.""RtTel"", ru.""RtTel"") AS ""Phone"",
                           ROW_NUMBER() OVER (
                               PARTITION BY e.event_id, COALESCE(e.off_no::text, e.user_id, e.entry_id::text)
                               ORDER BY e.reg_dt ASC, e.entry_id ASC
                           )::int AS ""SeqNo""
                          FROM nt_event_entry e
                          LEFT JOIN nt_event v ON v.event_id = e.event_id
                          LEFT JOIN ofc_realter_office o ON o.""OffNo""::bigint = e.off_no
                          LEFT JOIN rt_realtor_info rr ON rr.""RtNo"" = e.rt_no
                          LEFT JOIN rt_realtor_info ru ON ru.""Id"" = e.user_id
                         WHERE e.event_id = @eid
                         ORDER BY e.reg_dt DESC, e.entry_id DESC";
            var rows = await _db.QueryAsyncPg<EventEntry>("DEV", sql, new List<NpgsqlParameter> { P("@eid", NpgsqlDbType.Bigint, eventId) });
            return rows ?? new List<EventEntry>();
        }

        public async Task<bool> ConfirmEntry(long entryId, EventEntryConfirmDto dto)
        {
            var status = string.IsNullOrWhiteSpace(dto?.Status) ? "CONFIRMED" : dto!.Status!;
            // 확인완료(CONFIRMED)로 처리하면 user_seen='N'으로 되돌려 사용자 대시보드 팝업 1회 노출
            const string sql = @"
                UPDATE nt_event_entry
                   SET status = @status, admin_memo = @memo, confirmed_by = @uid, confirmed_dt = now(),
                       user_seen = CASE WHEN @status = 'CONFIRMED' THEN 'N' ELSE user_seen END
                 WHERE entry_id = @id";
            var ps = new List<NpgsqlParameter>
            {
                P("@id", NpgsqlDbType.Bigint, entryId),
                P("@status", NpgsqlDbType.Varchar, status),
                P("@memo", NpgsqlDbType.Varchar, dto?.AdminMemo),
                P("@uid", NpgsqlDbType.Varchar, dto?.UserId),
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        public async Task<List<EventEntry>> GetConfirmedUnseen(string? userId, long? offNo)
        {
            var where = new List<string>();
            var ps = new List<NpgsqlParameter>();
            if (!string.IsNullOrWhiteSpace(userId)) { where.Add("e.user_id = @uid"); ps.Add(P("@uid", NpgsqlDbType.Varchar, userId)); }
            if (offNo.HasValue) { where.Add("e.off_no = @off"); ps.Add(P("@off", NpgsqlDbType.Bigint, offNo.Value)); }
            if (where.Count == 0) return new List<EventEntry>();
            var sql = $@"SELECT {COLS}
                          FROM nt_event_entry e
                          LEFT JOIN nt_event v ON v.event_id = e.event_id
                         WHERE e.status = 'CONFIRMED' AND COALESCE(e.user_seen,'N') = 'N'
                           AND ({string.Join(" OR ", where)})
                         ORDER BY e.confirmed_dt DESC, e.entry_id DESC";
            var rows = await _db.QueryAsyncPg<EventEntry>("DEV", sql, ps);
            return rows ?? new List<EventEntry>();
        }

        public async Task<int> MarkSeen(IEnumerable<long> entryIds)
        {
            var ids = (entryIds ?? Enumerable.Empty<long>()).Distinct().ToList();
            if (ids.Count == 0) return 0;
            const string sql = @"UPDATE nt_event_entry SET user_seen = 'Y' WHERE entry_id = ANY(@ids)";
            var ps = new List<NpgsqlParameter> { P("@ids", NpgsqlDbType.Array | NpgsqlDbType.Bigint, ids.ToArray()) };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps);
        }
    }
}

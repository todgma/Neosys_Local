using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace RealestateAPI.Admin.Controllers
{
    // 일괄변경요청 — 고객센터(cs_customer_center)와 분리된 전용 테이블(rt_bulk_request)
    //  · 프로그램: 접수(POST) / 내 요청 조회(GET ?userId=)
    //  · 관리자: 전체 조회(GET) / 처리완료+코멘트(PUT {id}/complete)
    [ApiController]
    [Route("api/bulk-requests")]
    public class BulkRequestController : ControllerBase
    {
        private readonly IPostgresDataService _db;
        public BulkRequestController(IPostgresDataService db) { _db = db; }

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };
        private sealed class JsonRow { public string? Json { get; set; } }
        private sealed class IdRow { public long ReqId { get; set; } }

        /// <summary>목록 — userId 있으면 본인 요청, 없으면 전체(관리자). status/offNo 필터</summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] string? userId, [FromQuery] string? status, [FromQuery] long? offNo)
        {
            const string sql = @"
                SELECT to_jsonb(t)::text AS ""Json"" FROM (
                    SELECT req_id AS ""ReqId"", user_id AS ""UserId"", off_no AS ""OffNo"", category AS ""Category"",
                           title AS ""Title"", content AS ""Content"", office_name AS ""OfficeName"", office_tel AS ""OfficeTel"",
                           office_addr AS ""OfficeAddr"", agent_name AS ""AgentName"", agent_grade AS ""AgentGrade"", agent_phone AS ""AgentPhone"",
                           status AS ""Status"", answer AS ""Answer"", answer_id AS ""AnswerId"", answer_dt AS ""AnswerDt"",
                           reg_id AS ""RegId"", reg_dt AS ""RegDt""
                      FROM rt_bulk_request
                     WHERE use_yn = 'Y'
                       AND (@uid    IS NULL OR user_id = @uid)
                       AND (@status IS NULL OR status  = @status)
                       AND (@off    IS NULL OR off_no  = @off)
                     ORDER BY reg_dt DESC
                     LIMIT 500
                ) t";
            var ps = new List<NpgsqlParameter>
            {
                P("@uid",    NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(userId) ? null : userId),
                P("@status", NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(status) ? null : status),
                P("@off",    NpgsqlDbType.Bigint,  offNo),
            };
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, ps);
            var items = (rows ?? new List<JsonRow>())
                .Where(r => !string.IsNullOrWhiteSpace(r.Json))
                .Select(r => (object)JsonSerializer.Deserialize<JsonElement>(r.Json!)).ToList();
            return Ok(ResponseHelper.Success(new { items }, "일괄변경요청 목록"));
        }

        /// <summary>접수(프로그램에서 요청 등록)</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BulkRequestCreateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Category))
                return Ok(ResponseHelper.Error("BAD_REQUEST", "변경 항목(category)이 필요합니다."));

            const string sql = @"
                INSERT INTO rt_bulk_request
                    (user_id, off_no, category, title, content, office_name, office_tel, office_addr,
                     agent_name, agent_grade, agent_phone, status, reg_id, reg_dt)
                VALUES (@uid, @off, @cat, @title, @content, @onm, @otel, @oaddr, @anm, @agrade, @aphone, '접수', @uid, now())
             RETURNING req_id AS ""ReqId""";
            var ps = new List<NpgsqlParameter>
            {
                P("@uid",    NpgsqlDbType.Varchar, dto.UserId),
                P("@off",    NpgsqlDbType.Bigint,  dto.OffNo),
                P("@cat",    NpgsqlDbType.Varchar, dto.Category),
                P("@title",  NpgsqlDbType.Varchar, dto.Title),
                P("@content",NpgsqlDbType.Text,    dto.Content),
                P("@onm",    NpgsqlDbType.Varchar, dto.OfficeName),
                P("@otel",   NpgsqlDbType.Varchar, dto.OfficeTel),
                P("@oaddr",  NpgsqlDbType.Varchar, dto.OfficeAddr),
                P("@anm",    NpgsqlDbType.Varchar, dto.AgentName),
                P("@agrade", NpgsqlDbType.Varchar, dto.AgentGrade),
                P("@aphone", NpgsqlDbType.Varchar, dto.AgentPhone),
            };
            var rows = await _db.QueryAsyncPg<IdRow>("DEV", sql, ps);
            return Ok(ResponseHelper.Success(new { reqId = rows?.FirstOrDefault()?.ReqId ?? 0 }, "일괄변경요청 접수"));
        }

        /// <summary>처리완료 + 코멘트(관리자)</summary>
        [HttpPut("{reqId:long}/complete")]
        public async Task<IActionResult> Complete(long reqId, [FromBody] BulkRequestCompleteDto dto)
        {
            const string sql = @"
                UPDATE rt_bulk_request
                   SET status = '처리완료', answer = @answer, answer_id = @aid, answer_dt = now(),
                       upd_id = @aid, upd_dt = now()
                 WHERE req_id = @id AND use_yn = 'Y'";
            var ok = await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                P("@id",     NpgsqlDbType.Bigint,  reqId),
                P("@answer", NpgsqlDbType.Text,    dto?.Answer),
                P("@aid",    NpgsqlDbType.Varchar, dto?.AnswerId),
            }) > 0;
            return Ok(ResponseHelper.Success(new { updated = ok }, ok ? "처리완료" : "대상 없음"));
        }
    }

    public class BulkRequestCreateDto
    {
        public string? UserId { get; set; }
        public long? OffNo { get; set; }
        public string? Category { get; set; }
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? OfficeName { get; set; }
        public string? OfficeTel { get; set; }
        public string? OfficeAddr { get; set; }
        public string? AgentName { get; set; }
        public string? AgentGrade { get; set; }
        public string? AgentPhone { get; set; }
    }
    public class BulkRequestCompleteDto
    {
        public string? Answer { get; set; }
        public string? AnswerId { get; set; }
    }
}

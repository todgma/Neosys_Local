using Microsoft.AspNetCore.Mvc;
using RealestateAPI.Shared;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace RealestateAPI.Admin.Controllers
{
    // 관리자 계정 — 로그인 + CRUD. 권한: SUPER(슈퍼관리자) / NORMAL(일반관리자)
    [ApiController]
    [Route("api/admin/accounts")]
    public class AdminAccountController : ControllerBase
    {
        private readonly IPostgresDataService _db;
        public AdminAccountController(IPostgresDataService db) { _db = db; }

        private static NpgsqlParameter P(string n, NpgsqlDbType t, object? v) => new NpgsqlParameter(n, t) { Value = v ?? DBNull.Value };
        private sealed class AdminRow { public string? AdminId { get; set; } public string? Name { get; set; } public string? Role { get; set; } public string? UseYn { get; set; } public DateTime? RegDt { get; set; } }
        private sealed class PwRow { public string? Pw { get; set; } public string? Name { get; set; } public string? Role { get; set; } }

        /// <summary>로그인 — 아이디/비밀번호(BCrypt) 검증 → 계정정보 반환</summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AdminLoginDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.AdminId) || string.IsNullOrWhiteSpace(dto.Pw))
                return Ok(ResponseHelper.Error("BAD_REQUEST", "아이디/비밀번호를 입력하세요."));

            const string sql = @"SELECT pw AS ""Pw"", name AS ""Name"", role AS ""Role"" FROM sys_admin WHERE admin_id=@id AND use_yn='Y'";
            var rows = await _db.QueryAsyncPg<PwRow>("DEV", sql, new List<NpgsqlParameter> { P("@id", NpgsqlDbType.Varchar, dto.AdminId) });
            var row = rows?.FirstOrDefault();
            if (row == null || string.IsNullOrEmpty(row.Pw) || !BCrypt.Net.BCrypt.Verify(dto.Pw, row.Pw))
                return Ok(ResponseHelper.Error("LOGIN_FAILED", "아이디 또는 비밀번호가 올바르지 않습니다."));

            return Ok(ResponseHelper.Success(new { adminId = dto.AdminId, name = row.Name, role = row.Role }, "로그인 성공"));
        }

        /// <summary>관리자 목록</summary>
        [HttpGet]
        public async Task<IActionResult> GetList()
        {
            const string sql = @"SELECT admin_id AS ""AdminId"", name AS ""Name"", role AS ""Role"", use_yn AS ""UseYn"", reg_dt AS ""RegDt""
                                   FROM sys_admin WHERE use_yn='Y' ORDER BY (role='SUPER') DESC, reg_dt";
            var rows = await _db.QueryAsyncPg<AdminRow>("DEV", sql, new List<NpgsqlParameter>());
            return Ok(ResponseHelper.Success(new { items = rows ?? new List<AdminRow>() }, "관리자 목록"));
        }

        /// <summary>관리자 추가 (SUPER만 — 클라이언트에서 권한 체크). CUD 처리자는 regId</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] AdminUpsertDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.AdminId) || string.IsNullOrWhiteSpace(dto.Pw))
                return Ok(ResponseHelper.Error("BAD_REQUEST", "아이디/비밀번호는 필수입니다."));

            var dup = await _db.QueryAsyncPg<AdminRow>("DEV", @"SELECT admin_id AS ""AdminId"" FROM sys_admin WHERE admin_id=@id",
                new List<NpgsqlParameter> { P("@id", NpgsqlDbType.Varchar, dto.AdminId) });
            if (dup != null && dup.Count > 0)
                return Ok(ResponseHelper.Error("DUP_ID", "이미 존재하는 아이디입니다."));

            string hash = BCrypt.Net.BCrypt.HashPassword(dto.Pw, 12);
            const string sql = @"INSERT INTO sys_admin (admin_id, pw, name, role, use_yn, reg_id, reg_dt)
                                 VALUES (@id, @pw, @nm, COALESCE(@role,'NORMAL'), 'Y', @by, now())";
            await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                P("@id", NpgsqlDbType.Varchar, dto.AdminId), P("@pw", NpgsqlDbType.Varchar, hash),
                P("@nm", NpgsqlDbType.Varchar, dto.Name), P("@role", NpgsqlDbType.Varchar, dto.Role),
                P("@by", NpgsqlDbType.Varchar, dto.ActorId),
            });
            return Ok(ResponseHelper.Success(new { adminId = dto.AdminId }, "관리자 추가 성공"));
        }

        /// <summary>관리자 수정 (이름/권한/비밀번호). 비번은 값 있을 때만 변경. 처리자 updId</summary>
        [HttpPut("{adminId}")]
        public async Task<IActionResult> Update(string adminId, [FromBody] AdminUpsertDto dto)
        {
            string? hash = string.IsNullOrWhiteSpace(dto?.Pw) ? null : BCrypt.Net.BCrypt.HashPassword(dto!.Pw, 12);
            const string sql = @"UPDATE sys_admin SET
                                    name = COALESCE(@nm, name),
                                    role = COALESCE(@role, role),
                                    pw   = COALESCE(@pw, pw),
                                    upd_id = @by, upd_dt = now()
                                 WHERE admin_id=@id AND use_yn='Y'";
            var ok = await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                P("@id", NpgsqlDbType.Varchar, adminId), P("@nm", NpgsqlDbType.Varchar, dto?.Name),
                P("@role", NpgsqlDbType.Varchar, dto?.Role), P("@pw", NpgsqlDbType.Varchar, hash),
                P("@by", NpgsqlDbType.Varchar, dto?.ActorId),
            }) > 0;
            return Ok(ResponseHelper.Success(new { updated = ok }, ok ? "수정 성공" : "대상 없음"));
        }

        /// <summary>관리자 삭제(soft). 슈퍼관리자 최소 1명 보호. 처리자 updId</summary>
        [HttpDelete("{adminId}")]
        public async Task<IActionResult> Delete(string adminId, [FromQuery] string? actorId)
        {
            // 마지막 SUPER 삭제 방지
            var supers = await _db.QueryAsyncPg<AdminRow>("DEV",
                @"SELECT admin_id AS ""AdminId"", role AS ""Role"" FROM sys_admin WHERE use_yn='Y' AND role='SUPER'",
                new List<NpgsqlParameter>());
            bool targetIsSuper = supers != null && supers.Any(s => s.AdminId == adminId);
            if (targetIsSuper && (supers?.Count ?? 0) <= 1)
                return Ok(ResponseHelper.Error("LAST_SUPER", "마지막 슈퍼관리자는 삭제할 수 없습니다."));

            const string sql = @"UPDATE sys_admin SET use_yn='N', upd_id=@by, upd_dt=now() WHERE admin_id=@id";
            var ok = await _db.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                P("@id", NpgsqlDbType.Varchar, adminId), P("@by", NpgsqlDbType.Varchar, actorId),
            }) > 0;
            return Ok(ResponseHelper.Success(new { deleted = ok }, ok ? "삭제 성공" : "대상 없음"));
        }
    }

    public class AdminLoginDto { public string? AdminId { get; set; } public string? Pw { get; set; } }
    public class AdminUpsertDto
    {
        public string? AdminId { get; set; }
        public string? Pw { get; set; }
        public string? Name { get; set; }
        public string? Role { get; set; }   // SUPER | NORMAL
        public string? ActorId { get; set; } // CUD 처리자(로그인 아이디)
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Admin.Services
{
    public class MemberUpdateDto
    {
        public string? RtNm { get; set; }
        public string? RtTel { get; set; }
        public string? RtRegNo { get; set; }
        public long? OffNo { get; set; }
        public string? Grade { get; set; }
        public string? RtType { get; set; }
    }

    public interface IAdminMemberService
    {
        Task<List<object>> GetMembers(string? q);
        Task<List<object>> GetWithdrawnMembers(string? q);   // 비활성(탈퇴) 사무소 소속 회원
        Task<object?> GetMemberDetail(long rtNo);
        Task<bool> UpdateMember(long rtNo, MemberUpdateDto dto);
        Task<bool> ResetPassword(long rtNo, string newPw);   // BCrypt 해시로 저장
    }

    public class AdminMemberService : IAdminMemberService
    {
        private readonly IPostgresDataService _db;
        public AdminMemberService(IPostgresDataService db) { _db = db; }

        // to_jsonb(row)::text 한 컬럼으로 받아 실제 컬럼 전체를 JSON으로 반환(스키마 변동 무관, dynamic 매핑 불가 회피)
        private sealed class JsonRow { public string? Json { get; set; } }

        /// <summary>회원(중개사) 목록 — 사무소 멤버십 적용 상품명 포함. rt_realtor_info 전체 컬럼을 JSON으로 반환.</summary>
        public async Task<List<object>> GetMembers(string? q)
        {
            object qVal = string.IsNullOrWhiteSpace(q) ? (object)DBNull.Value : q.Trim();
            List<NpgsqlParameter> QParams() => new List<NpgsqlParameter> { new NpgsqlParameter("@q", NpgsqlDbType.Varchar) { Value = qVal } };

            // 사무소(중개사무소명) + 멤버십 상품명/한도 병합. off_no 컬럼은 rt_realtor_info의 ""OffNo"".
            //  · 소속중개사는 대표와 같은 off_no → 동일 멤버십이 그대로 조인됨.
            string sql = @"
                SELECT (to_jsonb(r) || jsonb_build_object(
                            'OffNm',             o.""OffNm"",
                            'OffTel',            o.""OffTel"",
                            'MembershipName',    mp.prod_name,
                            'MembershipAcctCnt', mp.acct_cnt,
                            'MembershipPcCnt',   mp.pc_cnt,
                            'MembershipMobCnt',  mp.mob_cnt
                        ))::text AS ""Json""
                  FROM rt_realtor_info r
                  LEFT JOIN ofc_realter_office o ON o.""OffNo"" = r.""OffNo""
                  LEFT JOIN office_membership om ON om.off_no = r.""OffNo""
                  LEFT JOIN membership_product mp ON mp.prod_id = om.prod_id
                 WHERE COALESCE(o.""UseYn"", 'Y') <> 'N'   -- 비활성(탈퇴) 사무소 소속은 제외
                   AND (@q IS NULL OR r.""RtNm"" ILIKE '%'||@q||'%' OR r.""Id"" ILIKE '%'||@q||'%' OR o.""OffNm"" ILIKE '%'||@q||'%')
                 ORDER BY r.""RtNo"" DESC
                 LIMIT 500";
            try
            {
                var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, QParams());
                return Parse(rows);
            }
            catch
            {
                // office_membership/membership_product 미생성 또는 off_no 컬럼 부재 시 기본 목록만
                string fallback = @"SELECT to_jsonb(r)::text AS ""Json"" FROM rt_realtor_info r
                                     WHERE (@q IS NULL OR r.""RtNm"" ILIKE '%'||@q||'%' OR r.""Id"" ILIKE '%'||@q||'%')
                                     ORDER BY r.""RtNo"" DESC LIMIT 500";
                var rows = await _db.QueryAsyncPg<JsonRow>("DEV", fallback, QParams());
                return Parse(rows);
            }
        }

        /// <summary>탈퇴회원 목록 — 비활성화(UseYn='N') 사무소에 소속된 회원 전체(사무소명 포함).</summary>
        public async Task<List<object>> GetWithdrawnMembers(string? q)
        {
            object qVal = string.IsNullOrWhiteSpace(q) ? (object)DBNull.Value : q.Trim();
            List<NpgsqlParameter> QParams() => new List<NpgsqlParameter> { new NpgsqlParameter("@q", NpgsqlDbType.Varchar) { Value = qVal } };

            string sql = @"
                SELECT (to_jsonb(r) || jsonb_build_object(
                            'OffNm',  o.""OffNm"",
                            'OffTel', o.""OffTel"",
                            'OffUpdDt', o.""UpdDt""
                        ))::text AS ""Json""
                  FROM rt_realtor_info r
                  JOIN ofc_realter_office o ON o.""OffNo"" = r.""OffNo""
                 WHERE o.""UseYn"" = 'N'
                   AND (@q IS NULL OR r.""RtNm"" ILIKE '%'||@q||'%' OR r.""Id"" ILIKE '%'||@q||'%' OR o.""OffNm"" ILIKE '%'||@q||'%')
                 ORDER BY o.""UpdDt"" DESC NULLS LAST, r.""RtNo"" DESC
                 LIMIT 500";
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, QParams());
            return Parse(rows);
        }

        /// <summary>회원 상세 — rt_realtor_info 전체 컬럼(JSON). 비밀번호(Pw)는 제외.</summary>
        public async Task<object?> GetMemberDetail(long rtNo)
        {
            const string sql = @"SELECT (to_jsonb(r) - 'Pw')::text AS ""Json"" FROM rt_realtor_info r WHERE r.""RtNo"" = @rtNo";
            var rows = await _db.QueryAsyncPg<JsonRow>("DEV", sql, new List<NpgsqlParameter> { new NpgsqlParameter("@rtNo", NpgsqlDbType.Bigint) { Value = rtNo } });
            return Parse(rows).FirstOrDefault();
        }

        /// <summary>회원정보 수정(이름/연락처/등록번호/사무소/등급/유형)</summary>
        public async Task<bool> UpdateMember(long rtNo, MemberUpdateDto d)
        {
            const string sql = @"
                UPDATE rt_realtor_info SET
                    ""RtNm""    = COALESCE(@nm, ""RtNm""),
                    ""RtTel""   = COALESCE(@tel, ""RtTel""),
                    ""RtRegNo"" = COALESCE(@reg, ""RtRegNo""),
                    ""OffNo""   = COALESCE(@off, ""OffNo""),
                    ""Grade""   = COALESCE(@grade, ""Grade""),
                    ""RtType""  = COALESCE(@type, ""RtType""),
                    ""UpdDt""   = NOW()
                 WHERE ""RtNo"" = @rtNo";
            var ps = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@rtNo", NpgsqlDbType.Bigint) { Value = rtNo },
                new NpgsqlParameter("@nm", NpgsqlDbType.Varchar) { Value = (object?)d.RtNm ?? DBNull.Value },
                new NpgsqlParameter("@tel", NpgsqlDbType.Varchar) { Value = (object?)d.RtTel ?? DBNull.Value },
                new NpgsqlParameter("@reg", NpgsqlDbType.Varchar) { Value = (object?)d.RtRegNo ?? DBNull.Value },
                new NpgsqlParameter("@off", NpgsqlDbType.Bigint) { Value = (object?)d.OffNo ?? DBNull.Value },
                new NpgsqlParameter("@grade", NpgsqlDbType.Varchar) { Value = (object?)d.Grade ?? DBNull.Value },
                new NpgsqlParameter("@type", NpgsqlDbType.Varchar) { Value = (object?)d.RtType ?? DBNull.Value },
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        /// <summary>비밀번호 초기화 — 관리자가 입력한 새 비밀번호를 BCrypt 해시로 저장(로그인 검증과 동일 방식)</summary>
        public async Task<bool> ResetPassword(long rtNo, string newPw)
        {
            if (string.IsNullOrWhiteSpace(newPw)) return false;
            string hash = BCrypt.Net.BCrypt.HashPassword(newPw, 12);
            const string sql = @"UPDATE rt_realtor_info SET ""Pw"" = @pw, ""UpdDt"" = NOW() WHERE ""RtNo"" = @rtNo";
            var ps = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@rtNo", NpgsqlDbType.Bigint) { Value = rtNo },
                new NpgsqlParameter("@pw", NpgsqlDbType.Varchar) { Value = hash },
            };
            return await _db.ExecuteNonQueryAsyncPg("DEV", sql, ps) > 0;
        }

        private static List<object> Parse(List<JsonRow>? rows)
            => (rows ?? new List<JsonRow>())
                .Where(x => !string.IsNullOrWhiteSpace(x.Json))
                .Select(x => (object)JsonSerializer.Deserialize<JsonElement>(x.Json!))
                .ToList();
    }
}

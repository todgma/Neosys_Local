using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Realestater.Services
{
    public interface IStaffMenuPermService
    {
        Task<List<string>> GetPerm(long rtNo);              // 허용 메뉴 키 목록
        Task<bool> SetPerm(long rtNo, List<string> keys, string? userId);
    }

    /// <summary>직원(소속중개사) 메뉴 권한 — rt_menu_perm (대시보드 메뉴 대상, sys_menu_rt와 별개)</summary>
    public class StaffMenuPermService : IStaffMenuPermService
    {
        private readonly IPostgresDataService _db;
        public StaffMenuPermService(IPostgresDataService db) { _db = db; }
        private sealed class KeyRow { public string? MenuKey { get; set; } }

        public async Task<List<string>> GetPerm(long rtNo)
        {
            const string sql = @"SELECT menu_key AS ""MenuKey"" FROM rt_menu_perm WHERE rt_no = @rt AND allowed = 'Y'";
            var rows = await _db.QueryAsyncPg<KeyRow>("DEV", sql, new List<NpgsqlParameter> { new NpgsqlParameter("@rt", NpgsqlDbType.Bigint) { Value = rtNo } });
            return (rows ?? new List<KeyRow>()).Where(x => !string.IsNullOrWhiteSpace(x.MenuKey)).Select(x => x.MenuKey!).ToList();
        }

        // 전체 교체(delete → insert). 체크된 키만 allowed='Y'로 저장.
        public async Task<bool> SetPerm(long rtNo, List<string> keys, string? userId)
        {
            await _db.ExecuteNonQueryAsyncPg("DEV", "DELETE FROM rt_menu_perm WHERE rt_no = @rt",
                new List<NpgsqlParameter> { new NpgsqlParameter("@rt", NpgsqlDbType.Bigint) { Value = rtNo } });

            foreach (var key in (keys ?? new List<string>()).Where(k => !string.IsNullOrWhiteSpace(k)).Distinct())
            {
                const string ins = @"INSERT INTO rt_menu_perm (rt_no, menu_key, allowed, reg_id, reg_dt)
                                      VALUES (@rt, @key, 'Y', @uid, CURRENT_TIMESTAMP)
                                      ON CONFLICT (rt_no, menu_key) DO UPDATE SET allowed='Y', upd_dt=CURRENT_TIMESTAMP";
                await _db.ExecuteNonQueryAsyncPg("DEV", ins, new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@rt", NpgsqlDbType.Bigint) { Value = rtNo },
                    new NpgsqlParameter("@key", NpgsqlDbType.Varchar) { Value = key },
                    new NpgsqlParameter("@uid", NpgsqlDbType.Varchar) { Value = (object?)userId ?? DBNull.Value },
                });
            }
            return true;
        }
    }
}

using System.Data;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Property.Models;
using Npgsql;

namespace RealestateAPI.Property.Services
{
    public interface IPropertyMemoService
    {
        Task<List<PtMemoDto>> GetMemoList(int ptNo);
        Task<PtMemoDto?> GetLatestMemo(int ptNo);
        Task<bool> CreateMemo(int ptNo, CreatePtMemoRequest request);
        Task<bool> UpdateMemo(int ptNo, int memoNo, UpdatePtMemoRequest request);
        Task<bool> DeleteMemo(int ptNo, int memoNo);
    }

    public class PropertyMemoService : IPropertyMemoService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public PropertyMemoService(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        /// <summary>
        /// 특정 매물의 메모 목록 조회 (날짜 내림차순)
        /// </summary>
        public async Task<List<PtMemoDto>> GetMemoList(int ptNo)
        {
            const string sql = @"
                SELECT
                    memo_no as MemoNo,
                    pt_no as PtNo,
                    memo_date as MemoDate,
                    memo_content as MemoContent,
                    contact_name as ContactName,
                    contact_phone as ContactPhone,
                    user_id as UserId,
                    reg_id as RegId,
                    reg_dt as RegDt,
                    upd_id as UpdId,
                    upd_dt as UpdDt
                FROM pt_memo
                WHERE pt_no = @pt_no
                ORDER BY memo_date DESC, reg_dt DESC
            ";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pt_no", ptNo)
            };

            var memos = await _dataService.QueryAsyncPg<PtMemoDto>("DEV", sql, parameters);
            return memos?.ToList() ?? new List<PtMemoDto>();
        }

        /// <summary>
        /// 특정 매물의 최신 메모 1건 조회
        /// </summary>
        public async Task<PtMemoDto?> GetLatestMemo(int ptNo)
        {
            const string sql = @"
                SELECT
                    memo_no as MemoNo,
                    pt_no as PtNo,
                    memo_date as MemoDate,
                    memo_content as MemoContent,
                    contact_name as ContactName,
                    contact_phone as ContactPhone,
                    user_id as UserId,
                    reg_id as RegId,
                    reg_dt as RegDt,
                    upd_id as UpdId,
                    upd_dt as UpdDt
                FROM pt_memo
                WHERE pt_no = @pt_no
                ORDER BY memo_date DESC, reg_dt DESC
                LIMIT 1
            ";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pt_no", ptNo)
            };

            var memos = await _dataService.QueryAsyncPg<PtMemoDto>("DEV", sql, parameters);
            return memos?.FirstOrDefault();
        }

        /// <summary>
        /// 메모 등록
        /// </summary>
        public async Task<bool> CreateMemo(int ptNo, CreatePtMemoRequest request)
        {
            const string sql = @"
                INSERT INTO pt_memo (
                    pt_no,
                    memo_date,
                    memo_content,
                    user_id,
                    reg_id,
                    reg_dt
                ) VALUES (
                    @pt_no,
                    @memo_date,
                    @memo_content,
                    @user_id,
                    @reg_id,
                    CURRENT_TIMESTAMP
                )
            ";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pt_no", ptNo),
                new NpgsqlParameter("@memo_date", request.MemoDate),
                new NpgsqlParameter("@memo_content", request.MemoContent),
                new NpgsqlParameter("@user_id", request.UserId),
                new NpgsqlParameter("@reg_id", request.UserId)
            };

            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return result > 0;
        }

        /// <summary>
        /// 메모 수정
        /// </summary>
        public async Task<bool> UpdateMemo(int ptNo, int memoNo, UpdatePtMemoRequest request)
        {
            const string sql = @"
                UPDATE pt_memo
                SET
                    memo_date = @memo_date,
                    memo_content = @memo_content,
                    upd_dt = CURRENT_TIMESTAMP
                WHERE memo_no = @memo_no AND pt_no = @pt_no
            ";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@memo_no", memoNo),
                new NpgsqlParameter("@pt_no", ptNo),
                new NpgsqlParameter("@memo_date", request.MemoDate),
                new NpgsqlParameter("@memo_content", request.MemoContent)
            };

            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return result > 0;
        }

        /// <summary>
        /// 메모 삭제
        /// </summary>
        public async Task<bool> DeleteMemo(int ptNo, int memoNo)
        {
            const string sql = @"
                DELETE FROM pt_memo
                WHERE memo_no = @memo_no AND pt_no = @pt_no
            ";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@memo_no", memoNo),
                new NpgsqlParameter("@pt_no", ptNo)
            };

            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return result > 0;
        }
    }
}

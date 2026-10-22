using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Property.Models;   // PtMemoDto / CreatePtMemoRequest / UpdatePtMemoRequest 재사용
using Npgsql;

namespace RealestateAPI.Customer.Services
{
    // 고객 상담메모 — pt_memo(공통) 테이블을 cust_no 로 사용
    // ※ 사전조건: 최종DB/공통/02_pt_memo_share_with_customer.sql 실행 (pt_memo.cust_no 추가)
    public interface ICustomerMemoService
    {
        Task<List<PtMemoDto>> GetMemoList(long custNo);
        Task<bool> CreateMemo(long custNo, CreatePtMemoRequest request);
        Task<bool> UpdateMemo(long custNo, int memoNo, UpdatePtMemoRequest request);
        Task<bool> DeleteMemo(long custNo, int memoNo);
    }

    public class CustomerMemoService : ICustomerMemoService
    {
        private readonly IPostgresDataService _dataService;

        public CustomerMemoService(IPostgresDataService dataService)
        {
            _dataService = dataService;
        }

        public async Task<List<PtMemoDto>> GetMemoList(long custNo)
        {
            const string sql = @"
                SELECT memo_no as MemoNo,
                       cust_no::int as PtNo,
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
                 WHERE cust_no = @cust_no
                 ORDER BY memo_date DESC, reg_dt DESC";
            var parameters = new List<NpgsqlParameter> { new NpgsqlParameter("@cust_no", custNo) };
            var memos = await _dataService.QueryAsyncPg<PtMemoDto>("DEV", sql, parameters);
            return memos?.ToList() ?? new List<PtMemoDto>();
        }

        public async Task<bool> CreateMemo(long custNo, CreatePtMemoRequest request)
        {
            const string sql = @"
                INSERT INTO pt_memo (cust_no, memo_date, memo_content, user_id, reg_id, reg_dt)
                VALUES (@cust_no, @memo_date, @memo_content, @user_id, @reg_id, CURRENT_TIMESTAMP)";
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@cust_no", custNo),
                new NpgsqlParameter("@memo_date", request.MemoDate),
                new NpgsqlParameter("@memo_content", request.MemoContent),
                new NpgsqlParameter("@user_id", (object?)request.UserId ?? DBNull.Value),
                new NpgsqlParameter("@reg_id", (object?)request.UserId ?? DBNull.Value)
            };
            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return result > 0;
        }

        public async Task<bool> UpdateMemo(long custNo, int memoNo, UpdatePtMemoRequest request)
        {
            const string sql = @"
                UPDATE pt_memo
                   SET memo_date = @memo_date,
                       memo_content = @memo_content,
                       upd_dt = CURRENT_TIMESTAMP
                 WHERE memo_no = @memo_no AND cust_no = @cust_no";
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@memo_no", memoNo),
                new NpgsqlParameter("@cust_no", custNo),
                new NpgsqlParameter("@memo_date", request.MemoDate),
                new NpgsqlParameter("@memo_content", request.MemoContent)
            };
            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return result > 0;
        }

        public async Task<bool> DeleteMemo(long custNo, int memoNo)
        {
            const string sql = @"DELETE FROM pt_memo WHERE memo_no = @memo_no AND cust_no = @cust_no";
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@memo_no", memoNo),
                new NpgsqlParameter("@cust_no", custNo)
            };
            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return result > 0;
        }
    }
}

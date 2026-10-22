using System.Data;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Interview.Models;
using RealestateAPI.Interview.Controllers;

namespace RealestateAPI.Interview.Services
{
    public interface IInterviewServices
    {
        public Task<InterviewList> SelectInterviewList(string ItvFrDate, string ItvToDate, int? ItvNo, string? CustName, string? ItvContent, string? ItvMemo, int? VendorId, int Page, int PageSize);
        public Task<InterviewList> GetInterviewsByCustomer(int CustNo);
        public Task<InterviewList> GetInterviewsByProperty(int PtNo);
        public Task<InterviewList> GetInterviewsByVendor(int VendorId);
        public Task<bool> InsertInterview(InterviewCreateDto dto);
        public Task<bool> UpdateInterview(int itvNo, InterviewUpdateDto dto);
        public Task<bool> DeleteInterview(int itvNo, string? userId);
    }

    // ct_interview 직접 쿼리 (함수 미사용)
    public class InterviewServices : IInterviewServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public InterviewServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        // 조회 컬럼 별칭
        private const string ITV_COLS = @"
            a.itv_no AS ""ItvNo"", a.itv_type AS ""ItvType"", a.itv_date AS ""ItvDate"",
            COALESCE(a.cust_no,0) AS ""CustNo"", a.cust_name AS ""CustName"", a.cust_phone AS ""CustPhone"",
            COALESCE(a.pt_no,0) AS ""PtNo"", a.itv_content AS ""ItvContent"", a.itv_memo AS ""ItvMemo"",
            COALESCE(a.rt_no,0) AS ""RtNo"", COALESCE(a.off_no,0) AS ""OffNo"", COALESCE(a.vendor_id,0) AS ""VendorId"",
            a.contact_name AS ""ContactName"", a.contact_phone AS ""ContactPhone"",
            a.reg_dt AS ""RegDt"", a.reg_id AS ""RegId"", a.upd_dt AS ""UpdDt"", a.upd_id AS ""UpdId""";

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        // 상담 목록 (상담관리 메뉴)
        public async Task<InterviewList> SelectInterviewList(string ItvFrDate, string ItvToDate, int? ItvNo, string? CustName, string? ItvContent, string? ItvMemo, int? VendorId, int Page = 1, int PageSize = 20)
        {
            string sql = $@"
                SELECT {ITV_COLS}
                  FROM ct_interview a
                 WHERE 1=1
                   AND (@fr_date IS NULL OR @to_date IS NULL
                        OR TO_DATE(a.itv_date, 'YYYY-MM-DD') BETWEEN TO_DATE(@fr_date, 'YYYY-MM-DD') AND TO_DATE(@to_date, 'YYYY-MM-DD'))
                   AND (@itv_no      IS NULL OR a.itv_no = @itv_no)
                   AND (@cust_name   IS NULL OR a.cust_name   ILIKE '%' || @cust_name   || '%')
                   AND (@itv_content IS NULL OR a.itv_content ILIKE '%' || @itv_content || '%')
                   AND (@itv_memo    IS NULL OR a.itv_memo    ILIKE '%' || @itv_memo    || '%')
                   AND (@vendor_id   IS NULL OR a.vendor_id = @vendor_id)
                 ORDER BY a.itv_no DESC
                 LIMIT @page_size OFFSET (@page - 1) * @page_size";

            var parameters = new List<NpgsqlParameter>
            {
                P("@fr_date",     NpgsqlDbType.Varchar, ItvFrDate),
                P("@to_date",     NpgsqlDbType.Varchar, ItvToDate),
                P("@itv_no",      NpgsqlDbType.Bigint,  ItvNo),
                P("@cust_name",   NpgsqlDbType.Varchar, CustName),
                P("@itv_content", NpgsqlDbType.Varchar, ItvContent),
                P("@itv_memo",    NpgsqlDbType.Varchar, ItvMemo),
                P("@vendor_id",   NpgsqlDbType.Integer, VendorId),
                P("@page",        NpgsqlDbType.Integer, Page <= 0 ? 1 : Page),
                P("@page_size",   NpgsqlDbType.Integer, PageSize <= 0 ? 20 : PageSize),
            };

            var list = await _dataService.QueryAsyncPg<InterviewModel>("DEV", sql, parameters);
            return new InterviewList { Interviews = list };
        }

        // 고객의 상담이력 (cust_no 기준)
        public async Task<InterviewList> GetInterviewsByCustomer(int CustNo)
        {
            string sql = $@"SELECT {ITV_COLS} FROM ct_interview a WHERE a.cust_no = @cust_no ORDER BY a.itv_no DESC";
            var list = await _dataService.QueryAsyncPg<InterviewModel>("DEV", sql,
                new List<NpgsqlParameter> { P("@cust_no", NpgsqlDbType.Bigint, CustNo) });
            return new InterviewList { Interviews = list };
        }

        // 물건의 상담이력 (pt_no 기준)
        public async Task<InterviewList> GetInterviewsByProperty(int PtNo)
        {
            string sql = $@"SELECT {ITV_COLS} FROM ct_interview a WHERE a.pt_no = @pt_no ORDER BY a.itv_no DESC";
            var list = await _dataService.QueryAsyncPg<InterviewModel>("DEV", sql,
                new List<NpgsqlParameter> { P("@pt_no", NpgsqlDbType.Bigint, PtNo) });
            return new InterviewList { Interviews = list };
        }

        // 협력업체의 상담이력 (vendor_id 기준)
        public async Task<InterviewList> GetInterviewsByVendor(int VendorId)
        {
            string sql = $@"SELECT {ITV_COLS} FROM ct_interview a WHERE a.vendor_id = @vendor_id ORDER BY a.itv_no DESC";
            var list = await _dataService.QueryAsyncPg<InterviewModel>("DEV", sql,
                new List<NpgsqlParameter> { P("@vendor_id", NpgsqlDbType.Integer, VendorId) });
            return new InterviewList { Interviews = list };
        }

        // 상담 등록
        //  · 기본(입력한 대상) 저장
        //  · 연락처 전화번호(contact_phone)가 고객 구입자(ct_cust_buyer.tel)와 일치하면 → 해당 고객 상담이력에도 동시 저장
        //  · pt_no 미지정(네오봇 단독 저장)일 때 연락처가 물건 소유자/임차인(pt_sale_holder.holder_phone)과 일치하면 → 해당 물건 상담이력에도 저장
        public async Task<bool> InsertInterview(InterviewCreateDto dto)
        {
            const string sql = @"
                -- 1) 기본(입력한 대상) 저장
                INSERT INTO ct_interview (
                    itv_type, itv_date, cust_no, cust_name, cust_phone,
                    pt_no, itv_content, itv_memo, rt_no, off_no, vendor_id,
                    contact_name, contact_phone, reg_dt, reg_id
                ) VALUES (
                    @itv_type, @itv_date, @cust_no, @cust_name, @cust_phone,
                    @pt_no, @itv_content, @itv_memo, @rt_no, @off_no, @vendor_id,
                    @contact_name, @contact_phone, NOW(), @reg_id
                );

                -- 2) 연락처가 고객 구입자 전화번호와 일치하면 해당 고객 상담이력에도 동시 저장(입력 대상 고객 제외)
                INSERT INTO ct_interview (
                    itv_type, itv_date, cust_no, cust_name, cust_phone,
                    pt_no, itv_content, itv_memo, rt_no, off_no, vendor_id,
                    contact_name, contact_phone, reg_dt, reg_id
                )
                SELECT @itv_type, @itv_date, c.cust_no, @cust_name, @cust_phone,
                       NULL, @itv_content, @itv_memo, c.rt_no, c.off_no, @vendor_id,
                       @contact_name, @contact_phone, NOW(), @reg_id
                  FROM (SELECT DISTINCT cc.cust_no, cc.rt_no, cc.off_no
                          FROM ct_cust_buyer b JOIN ct_cust cc ON cc.cust_no = b.cust_no
                         WHERE COALESCE(b.tel,'') <> ''
                           AND regexp_replace(b.tel,'[^0-9]','','g') = regexp_replace(COALESCE(@contact_phone,''),'[^0-9]','','g')) c
                 WHERE length(regexp_replace(COALESCE(@contact_phone,''),'[^0-9]','','g')) >= 9
                   AND (@cust_no IS NULL OR c.cust_no <> @cust_no);

                -- 3) pt_no 미지정(네오봇 단독 저장)이고 연락처가 물건 소유자/임차인 전화번호와 일치하면 해당 물건 상담이력에도 저장
                INSERT INTO ct_interview (
                    itv_type, itv_date, cust_no, cust_name, cust_phone,
                    pt_no, itv_content, itv_memo, rt_no, off_no, vendor_id,
                    contact_name, contact_phone, reg_dt, reg_id
                )
                SELECT @itv_type, @itv_date, NULL, @cust_name, @cust_phone,
                       h.pt_no, @itv_content, @itv_memo, h.rt_no, h.off_no, @vendor_id,
                       @contact_name, @contact_phone, NOW(), @reg_id
                  FROM (SELECT DISTINCT ps.pt_no, ps.off_no,
                               (CASE WHEN ps.rt_no ~ '^[0-9]+$' THEN ps.rt_no::bigint END) AS rt_no
                          FROM pt_sale_holder hh JOIN pt_sale ps ON ps.pt_no = hh.pt_no
                         WHERE COALESCE(hh.holder_phone,'') <> ''
                           AND regexp_replace(hh.holder_phone,'[^0-9]','','g') = regexp_replace(COALESCE(@contact_phone,''),'[^0-9]','','g')) h
                 WHERE @pt_no IS NULL
                   AND length(regexp_replace(COALESCE(@contact_phone,''),'[^0-9]','','g')) >= 9;";
            var parameters = new List<NpgsqlParameter>
            {
                P("@itv_type",    NpgsqlDbType.Varchar, dto.ItvType),
                P("@itv_date",    NpgsqlDbType.Varchar, dto.ItvDate),
                P("@cust_no",     NpgsqlDbType.Bigint,  dto.CustNo),
                P("@cust_name",   NpgsqlDbType.Varchar, dto.CustName),
                P("@cust_phone",  NpgsqlDbType.Varchar, dto.CustPhone),
                P("@pt_no",       NpgsqlDbType.Bigint,  dto.PtNo),
                P("@itv_content", NpgsqlDbType.Varchar, dto.ItvContent),
                P("@itv_memo",    NpgsqlDbType.Varchar, dto.ItvMemo),
                P("@rt_no",       NpgsqlDbType.Bigint,  dto.RtNo),
                P("@off_no",      NpgsqlDbType.Bigint,  dto.OffNo),
                P("@vendor_id",   NpgsqlDbType.Integer, dto.VendorId),
                P("@contact_name",  NpgsqlDbType.Varchar, dto.ContactName),
                P("@contact_phone", NpgsqlDbType.Varchar, dto.ContactPhone),
                P("@reg_id",      NpgsqlDbType.Varchar, dto.UserId),
            };
            var rows = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return rows > 0;
        }

        // 상담 수정 (COALESCE — 넘어온 값만 갱신)
        //  · 같은 상담이 물건·고객 양쪽에 분리 저장된 경우(동일 전화·일자·작성자·내용·작성시각) 그룹 전체 반영
        //    → 네오봇 중복 제거 노출과 일관(편집하면 두 군데 모두 수정). cust_no/pt_no는 각 행 고유값이라 덮어쓰지 않음.
        public async Task<bool> UpdateInterview(int itvNo, InterviewUpdateDto dto)
        {
            const string sql = @"
                UPDATE ct_interview SET
                    itv_type    = COALESCE(@itv_type, itv_type),
                    itv_date    = COALESCE(@itv_date, itv_date),
                    cust_name   = COALESCE(@cust_name, cust_name),
                    cust_phone  = COALESCE(@cust_phone, cust_phone),
                    itv_content = COALESCE(@itv_content, itv_content),
                    itv_memo    = COALESCE(@itv_memo, itv_memo),
                    rt_no       = COALESCE(@rt_no, rt_no),
                    off_no      = COALESCE(@off_no, off_no),
                    vendor_id   = COALESCE(@vendor_id, vendor_id),
                    contact_name  = COALESCE(@contact_name, contact_name),
                    contact_phone = COALESCE(@contact_phone, contact_phone),
                    upd_dt      = NOW(),
                    upd_id      = @user_id
                 WHERE (
                        regexp_replace(COALESCE(contact_phone,''),'[^0-9]','','g'),
                        itv_date::text, COALESCE(reg_id,''), COALESCE(itv_content,''), reg_dt
                       ) = (
                        SELECT regexp_replace(COALESCE(g.contact_phone,''),'[^0-9]','','g'),
                               g.itv_date::text, COALESCE(g.reg_id,''), COALESCE(g.itv_content,''), g.reg_dt
                          FROM ct_interview g WHERE g.itv_no = @itv_no
                       )";
            var parameters = new List<NpgsqlParameter>
            {
                P("@itv_no",      NpgsqlDbType.Bigint,  itvNo),
                P("@itv_type",    NpgsqlDbType.Varchar, dto.ItvType),
                P("@itv_date",    NpgsqlDbType.Varchar, dto.ItvDate),
                P("@cust_name",   NpgsqlDbType.Varchar, dto.CustName),
                P("@cust_phone",  NpgsqlDbType.Varchar, dto.CustPhone),
                P("@itv_content", NpgsqlDbType.Varchar, dto.ItvContent),
                P("@itv_memo",    NpgsqlDbType.Varchar, dto.ItvMemo),
                P("@rt_no",       NpgsqlDbType.Bigint,  dto.RtNo),
                P("@off_no",      NpgsqlDbType.Bigint,  dto.OffNo),
                P("@vendor_id",   NpgsqlDbType.Integer, dto.VendorId),
                P("@contact_name",  NpgsqlDbType.Varchar, dto.ContactName),
                P("@contact_phone", NpgsqlDbType.Varchar, dto.ContactPhone),
                P("@user_id",     NpgsqlDbType.Varchar, dto.UserId),
            };
            var rows = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return rows > 0;
        }

        // 상담 삭제 — 같은 상담이 물건·고객 양쪽에 분리 저장된 경우 그룹 전체 삭제(편집/노출과 일관)
        public async Task<bool> DeleteInterview(int itvNo, string? userId)
        {
            const string sql = @"
                DELETE FROM ct_interview
                 WHERE (
                        regexp_replace(COALESCE(contact_phone,''),'[^0-9]','','g'),
                        itv_date::text, COALESCE(reg_id,''), COALESCE(itv_content,''), reg_dt
                       ) = (
                        SELECT regexp_replace(COALESCE(g.contact_phone,''),'[^0-9]','','g'),
                               g.itv_date::text, COALESCE(g.reg_id,''), COALESCE(g.itv_content,''), g.reg_dt
                          FROM ct_interview g WHERE g.itv_no = @itv_no
                       )";
            var parameters = new List<NpgsqlParameter> { P("@itv_no", NpgsqlDbType.Bigint, itvNo) };
            var rows = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            return rows > 0;
        }
    }
}

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Vendor.Models;
using RealestateAPI.Shared.Interfaces;

namespace RealestateAPI.Vendor.Services
{
    public interface IVendorService
    {
        // 협력업체 (함수 미사용 · 인라인 쿼리)
        Task<VendorList> SelectVendorList(long? vendorId, long? offNo, long? rtNo, int pageNumber, int rowsPerPage);
        Task<long> InsertVendor(string? vendorName, string? category1, string? category2, string? category3,
            string? ceoName, string? ceoPhone, string? managerName, string? managerPhone, string? managerTel, string? managerFax,
            string? homepageUrl, string? productDesc, string? consultationNote, string? regType,
            string? businessRegionCode, string? detailAddress, long? offNo, long? rtNo,
            int? sortOrder, string? useYn, string? userId, List<VendorAreaDto>? areas);
        Task<bool> UpdateVendor(long vendorId, string? vendorName, string? category1, string? category2, string? category3,
            string? ceoName, string? ceoPhone, string? managerName, string? managerPhone, string? managerTel, string? managerFax,
            string? homepageUrl, string? productDesc, string? consultationNote, string? regType,
            string? businessRegionCode, string? detailAddress, long? offNo, long? rtNo,
            int? sortOrder, string? useYn, string? userId, List<VendorAreaDto>? areas);
        Task<bool> DeleteVendor(long vendorId, string? userId);

        // 영업지역 (개별 CRUD — 인라인)
        Task<VendorRegionList> SelectVendorRegionList(long? vendorRegionId, long? vendorId, int pageNumber, int rowsPerPage);
        Task<bool> InsertVendorRegion(long vendorId, string regionCode, int? sortOrder, string? useYn, string? userId);
        Task<bool> UpdateVendorRegion(long vendorRegionId, long vendorId, string regionCode, int? sortOrder, string? useYn, string? userId);
        Task<bool> DeleteVendorRegion(long vendorRegionId, string? userId);
    }

    public class VendorService : IVendorService
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public VendorService(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? global::System.DBNull.Value };

        // ===================== 목록 =====================
        public async Task<VendorList> SelectVendorList(long? vendorId, long? offNo, long? rtNo, int pageNumber, int rowsPerPage)
        {
            int page = pageNumber <= 0 ? 1 : pageNumber;
            int rows = rowsPerPage <= 0 ? 10 : rowsPerPage;

            // off_no IS NULL = 관리자 전역 협력업체(모든 사용자에게 노출, 최상단). 그 외는 사무소/중개인 범위.
            const string where = @"
                 WHERE v.use_yn = 'Y'
                   AND (@vendor_id IS NULL OR v.vendor_id = @vendor_id)
                   AND (
                         v.off_no IS NULL
                      OR ((@off_no IS NULL OR v.off_no = @off_no)
                          AND (@rt_no IS NULL OR v.rt_no = @rt_no))
                   )";

            string sql = $@"
                SELECT v.vendor_id, v.vendor_name, v.category1, v.category2, v.category3,
                       v.ceo_name, v.ceo_phone, v.manager_name, v.manager_phone, v.manager_tel, v.manager_fax,
                       v.homepage_url, v.product_desc, v.consultation_note, v.reg_type,
                       v.business_region_code, v.detail_address, v.off_no, v.rt_no, v.sort_order, v.use_yn,
                       v.reg_id, v.reg_dt, v.mod_id, v.mod_dt,
                       (SELECT count(*) FROM ct_interview i WHERE i.vendor_id = v.vendor_id) AS ""ConsultCnt"",
                       (SELECT COALESCE(string_agg(r.region_name, ', ' ORDER BY r.sort_order, r.vendor_region_id), '')
                          FROM vd_vendor_region r WHERE r.vendor_id = v.vendor_id AND r.use_yn = 'Y') AS ""BusinessRegion"",
                       (SELECT COALESCE(json_agg(json_build_object('bjdCode', r.region_code, 'regionName', r.region_name)
                                        ORDER BY r.sort_order, r.vendor_region_id), '[]'::json)::text
                          FROM vd_vendor_region r WHERE r.vendor_id = v.vendor_id AND r.use_yn = 'Y') AS ""BusinessAreasJson""
                  FROM vd_vendor_info v
                {where}
                 ORDER BY (CASE WHEN v.off_no IS NULL THEN 0 ELSE 1 END), v.sort_order, v.vendor_id DESC
                 LIMIT @rows OFFSET (@page - 1) * @rows";

            var parameters = new List<NpgsqlParameter>
            {
                P("@vendor_id", NpgsqlDbType.Bigint, vendorId),
                P("@off_no",    NpgsqlDbType.Bigint, offNo),
                P("@rt_no",     NpgsqlDbType.Bigint, rtNo),
                P("@page",      NpgsqlDbType.Integer, page),
                P("@rows",      NpgsqlDbType.Integer, rows),
            };
            var list = await _dataService.QueryAsyncPg<VendorInfo>("DEV", sql, parameters);

            int totalCount = 0;
            try
            {
                string countSql = $@"SELECT count(*)::int AS cnt FROM vd_vendor_info v {where}";
                var cnt = await _dataService.QueryAsyncPg<CountRow>("DEV", countSql, new List<NpgsqlParameter>
                {
                    P("@vendor_id", NpgsqlDbType.Bigint, vendorId),
                    P("@off_no",    NpgsqlDbType.Bigint, offNo),
                    P("@rt_no",     NpgsqlDbType.Bigint, rtNo),
                });
                totalCount = cnt?.FirstOrDefault()?.Cnt ?? (list?.Count ?? 0);
            }
            catch { totalCount = list?.Count ?? 0; }

            int totalPages = rows > 0 ? (int)global::System.Math.Ceiling((double)totalCount / rows) : 1;
            return new VendorList { Vendors = list, TotalCount = totalCount, TotalPages = totalPages < 1 ? 1 : totalPages };
        }

        private class CountRow { public int Cnt { get; set; } }

        // ===================== 등록 =====================
        public async Task<long> InsertVendor(string? vendorName, string? category1, string? category2, string? category3,
            string? ceoName, string? ceoPhone, string? managerName, string? managerPhone, string? managerTel, string? managerFax,
            string? homepageUrl, string? productDesc, string? consultationNote, string? regType,
            string? businessRegionCode, string? detailAddress, long? offNo, long? rtNo,
            int? sortOrder, string? useYn, string? userId, List<VendorAreaDto>? areas)
        {
            const string sql = @"
                INSERT INTO vd_vendor_info
                    (vendor_name, category1, category2, category3, ceo_name, ceo_phone,
                     manager_name, manager_phone, manager_tel, manager_fax, homepage_url,
                     product_desc, consultation_note, reg_type, business_region_code, detail_address,
                     off_no, rt_no, sort_order, use_yn, reg_id, reg_dt)
                VALUES
                    (@vendor_name, @category1, @category2, @category3, @ceo_name, @ceo_phone,
                     @manager_name, @manager_phone, @manager_tel, @manager_fax, @homepage_url,
                     @product_desc, @consultation_note, COALESCE(@reg_type,'ADMIN'), @business_region_code, @detail_address,
                     @off_no, @rt_no, COALESCE(@sort_order,0), COALESCE(@use_yn,'Y'), COALESCE(@user_id,'system'), CURRENT_TIMESTAMP)
                RETURNING vendor_id";

            List<NpgsqlParameter> Params() => VendorParams(vendorName, category1, category2, category3,
                ceoName, ceoPhone, managerName, managerPhone, managerTel, managerFax, homepageUrl, productDesc, consultationNote,
                regType, businessRegionCode, detailAddress, offNo, rtNo, sortOrder, useYn, userId);

            List<VendorInfo>? rows;
            try
            {
                rows = (await _dataService.QueryAsyncPg<VendorInfo>("DEV", sql, Params()))?.ToList();
            }
            catch (Exception ex) when (IsVendorPkDuplicate(ex))
            {
                // vendor_id 시퀀스가 실데이터(MAX)보다 뒤처진 경우(이관 시 id 직접 입력) → 시퀀스 보정 후 1회 재시도
                await _dataService.ExecuteNonQueryAsyncPg("DEV", @"
                    SELECT setval(pg_get_serial_sequence('vd_vendor_info', 'vendor_id'),
                                  (SELECT COALESCE(MAX(vendor_id), 1) FROM vd_vendor_info))", new List<NpgsqlParameter>());
                rows = (await _dataService.QueryAsyncPg<VendorInfo>("DEV", sql, Params()))?.ToList();
            }
            long newId = rows?.FirstOrDefault()?.VendorId ?? 0;
            if (newId > 0) await ReplaceRegions(newId, areas, userId);
            return newId;
        }

        // PK(vd_vendor_info_pkey) 중복 여부 — 래핑된 예외 메시지까지 확인
        private static bool IsVendorPkDuplicate(Exception ex)
        {
            for (var e = ex; e != null; e = e.InnerException)
            {
                if (e is PostgresException pg && pg.SqlState == "23505" && pg.ConstraintName == "vd_vendor_info_pkey") return true;
                if (e.Message.Contains("23505") && e.Message.Contains("vd_vendor_info_pkey")) return true;
            }
            return false;
        }

        // ===================== 수정 =====================
        public async Task<bool> UpdateVendor(long vendorId, string? vendorName, string? category1, string? category2, string? category3,
            string? ceoName, string? ceoPhone, string? managerName, string? managerPhone, string? managerTel, string? managerFax,
            string? homepageUrl, string? productDesc, string? consultationNote, string? regType,
            string? businessRegionCode, string? detailAddress, long? offNo, long? rtNo,
            int? sortOrder, string? useYn, string? userId, List<VendorAreaDto>? areas)
        {
            const string sql = @"
                UPDATE vd_vendor_info SET
                    vendor_name = @vendor_name, category1 = @category1, category2 = @category2, category3 = @category3,
                    ceo_name = @ceo_name, ceo_phone = @ceo_phone, manager_name = @manager_name,
                    manager_phone = @manager_phone, manager_tel = @manager_tel, manager_fax = @manager_fax,
                    homepage_url = @homepage_url, product_desc = @product_desc, consultation_note = @consultation_note,
                    reg_type = COALESCE(@reg_type, reg_type), business_region_code = @business_region_code, detail_address = @detail_address,
                    off_no = COALESCE(@off_no, off_no), rt_no = COALESCE(@rt_no, rt_no),
                    sort_order = COALESCE(@sort_order, sort_order), use_yn = COALESCE(@use_yn, use_yn),
                    mod_id = @user_id, mod_dt = CURRENT_TIMESTAMP
                 WHERE vendor_id = @vendor_id";

            var parameters = VendorParams(vendorName, category1, category2, category3, ceoName, ceoPhone,
                managerName, managerPhone, managerTel, managerFax, homepageUrl, productDesc, consultationNote,
                regType, businessRegionCode, detailAddress, offNo, rtNo, sortOrder, useYn, userId);
            parameters.Add(P("@vendor_id", NpgsqlDbType.Bigint, vendorId));

            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters);
            await ReplaceRegions(vendorId, areas, userId);
            return result > 0;
        }

        // 등록/수정 공통 파라미터
        private static List<NpgsqlParameter> VendorParams(string? vendorName, string? category1, string? category2, string? category3,
            string? ceoName, string? ceoPhone, string? managerName, string? managerPhone, string? managerTel, string? managerFax,
            string? homepageUrl, string? productDesc, string? consultationNote, string? regType,
            string? businessRegionCode, string? detailAddress, long? offNo, long? rtNo,
            int? sortOrder, string? useYn, string? userId)
            => new List<NpgsqlParameter>
            {
                P("@vendor_name",          NpgsqlDbType.Varchar, vendorName),
                P("@category1",            NpgsqlDbType.Varchar, category1),
                P("@category2",            NpgsqlDbType.Varchar, category2),
                P("@category3",            NpgsqlDbType.Varchar, category3),
                P("@ceo_name",             NpgsqlDbType.Varchar, ceoName),
                P("@ceo_phone",            NpgsqlDbType.Varchar, ceoPhone),
                P("@manager_name",         NpgsqlDbType.Varchar, managerName),
                P("@manager_phone",        NpgsqlDbType.Varchar, managerPhone),
                P("@manager_tel",          NpgsqlDbType.Varchar, managerTel),
                P("@manager_fax",          NpgsqlDbType.Varchar, managerFax),
                P("@homepage_url",         NpgsqlDbType.Varchar, homepageUrl),
                P("@product_desc",         NpgsqlDbType.Text,    productDesc),
                P("@consultation_note",    NpgsqlDbType.Text,    consultationNote),
                P("@reg_type",             NpgsqlDbType.Varchar, regType),
                P("@business_region_code", NpgsqlDbType.Varchar, businessRegionCode),
                P("@detail_address",       NpgsqlDbType.Varchar, detailAddress),
                P("@off_no",               NpgsqlDbType.Bigint,  offNo),
                P("@rt_no",                NpgsqlDbType.Bigint,  rtNo),
                P("@sort_order",           NpgsqlDbType.Integer, sortOrder),
                P("@use_yn",               NpgsqlDbType.Varchar, useYn),
                P("@user_id",              NpgsqlDbType.Varchar, userId),
            };

        // 영업지역 전체 교체(등록/수정 공통) — 기존 삭제 후 재삽입
        private async Task ReplaceRegions(long vendorId, List<VendorAreaDto>? areas, string? userId)
        {
            await _dataService.ExecuteNonQueryAsyncPg("DEV",
                "DELETE FROM vd_vendor_region WHERE vendor_id = @vendor_id",
                new List<NpgsqlParameter> { P("@vendor_id", NpgsqlDbType.Bigint, vendorId) });

            if (areas == null || areas.Count == 0) return;
            int seq = 0;
            foreach (var a in areas)
            {
                if (string.IsNullOrWhiteSpace(a.BjdCode)) continue;
                await _dataService.ExecuteNonQueryAsyncPg("DEV", @"
                    INSERT INTO vd_vendor_region (vendor_id, region_code, region_name, sort_order, use_yn, reg_id, reg_dt)
                    VALUES (@vendor_id, @region_code, @region_name, @sort_order, 'Y', COALESCE(@user_id,'system'), CURRENT_TIMESTAMP)
                    ON CONFLICT (vendor_id, region_code) DO UPDATE SET region_name = EXCLUDED.region_name, use_yn = 'Y'",
                    new List<NpgsqlParameter>
                    {
                        P("@vendor_id",   NpgsqlDbType.Bigint,  vendorId),
                        P("@region_code", NpgsqlDbType.Varchar, a.BjdCode),
                        P("@region_name", NpgsqlDbType.Varchar, a.RegionName),
                        P("@sort_order",  NpgsqlDbType.Integer, seq++),
                        P("@user_id",     NpgsqlDbType.Varchar, userId),
                    });
            }
        }

        // ===================== 삭제(소프트) =====================
        public async Task<bool> DeleteVendor(long vendorId, string? userId)
        {
            const string sql = @"
                UPDATE vd_vendor_info SET use_yn = 'N', mod_id = @user_id, mod_dt = CURRENT_TIMESTAMP
                 WHERE vendor_id = @vendor_id";
            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                P("@vendor_id", NpgsqlDbType.Bigint, vendorId),
                P("@user_id",   NpgsqlDbType.Varchar, userId),
            });
            return result > 0;
        }

        // ===================== 영업지역 개별 CRUD =====================
        public async Task<VendorRegionList> SelectVendorRegionList(long? vendorRegionId, long? vendorId, int pageNumber, int rowsPerPage)
        {
            const string sql = @"
                SELECT vendor_region_id, vendor_id, region_code, region_name, sort_order, use_yn,
                       reg_id, reg_dt, mod_id, mod_dt
                  FROM vd_vendor_region
                 WHERE use_yn = 'Y'
                   AND (@vendor_region_id IS NULL OR vendor_region_id = @vendor_region_id)
                   AND (@vendor_id IS NULL OR vendor_id = @vendor_id)
                 ORDER BY sort_order, vendor_region_id";
            var rows = await _dataService.QueryAsyncPg<VendorRegion>("DEV", sql, new List<NpgsqlParameter>
            {
                P("@vendor_region_id", NpgsqlDbType.Bigint, vendorRegionId),
                P("@vendor_id",        NpgsqlDbType.Bigint, vendorId),
            });
            return new VendorRegionList { VendorRegions = rows, TotalCount = rows?.Count ?? 0 };
        }

        public async Task<bool> InsertVendorRegion(long vendorId, string regionCode, int? sortOrder, string? useYn, string? userId)
        {
            const string sql = @"
                INSERT INTO vd_vendor_region (vendor_id, region_code, sort_order, use_yn, reg_id, reg_dt)
                VALUES (@vendor_id, @region_code, COALESCE(@sort_order,0), COALESCE(@use_yn,'Y'), COALESCE(@user_id,'system'), CURRENT_TIMESTAMP)
                ON CONFLICT (vendor_id, region_code) DO UPDATE SET use_yn = 'Y'";
            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                P("@vendor_id",   NpgsqlDbType.Bigint,  vendorId),
                P("@region_code", NpgsqlDbType.Varchar, regionCode),
                P("@sort_order",  NpgsqlDbType.Integer, sortOrder),
                P("@use_yn",      NpgsqlDbType.Varchar, useYn),
                P("@user_id",     NpgsqlDbType.Varchar, userId),
            });
            return result > 0;
        }

        public async Task<bool> UpdateVendorRegion(long vendorRegionId, long vendorId, string regionCode, int? sortOrder, string? useYn, string? userId)
        {
            const string sql = @"
                UPDATE vd_vendor_region SET vendor_id = @vendor_id, region_code = @region_code,
                       sort_order = COALESCE(@sort_order, sort_order), use_yn = COALESCE(@use_yn, use_yn),
                       mod_id = @user_id, mod_dt = CURRENT_TIMESTAMP
                 WHERE vendor_region_id = @vendor_region_id";
            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                P("@vendor_region_id", NpgsqlDbType.Bigint,  vendorRegionId),
                P("@vendor_id",        NpgsqlDbType.Bigint,  vendorId),
                P("@region_code",      NpgsqlDbType.Varchar, regionCode),
                P("@sort_order",       NpgsqlDbType.Integer, sortOrder),
                P("@use_yn",           NpgsqlDbType.Varchar, useYn),
                P("@user_id",          NpgsqlDbType.Varchar, userId),
            });
            return result > 0;
        }

        public async Task<bool> DeleteVendorRegion(long vendorRegionId, string? userId)
        {
            const string sql = @"
                UPDATE vd_vendor_region SET use_yn = 'N', mod_id = @user_id, mod_dt = CURRENT_TIMESTAMP
                 WHERE vendor_region_id = @vendor_region_id";
            var result = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, new List<NpgsqlParameter>
            {
                P("@vendor_region_id", NpgsqlDbType.Bigint,  vendorRegionId),
                P("@user_id",          NpgsqlDbType.Varchar, userId),
            });
            return result > 0;
        }
    }
}

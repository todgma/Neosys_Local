using System.Data;
using RealestateAPI.Customer.Models;
using RealestateAPI.Shared.Interfaces;
using Npgsql;
using NpgsqlTypes;
using RealestateAPI.Customer.Controllers;
using RealestateAPI.Shared.Infrastructure;

namespace RealestateAPI.Customer.Services
{
    public interface ICustomersServices
    {
        public Task<CustomerList> SelecCustomerList(int? CustNo, string? Name, string? Alias, string? Tel, int? OffNo, int? VendorId, string? WantType, string? TrdType, string? TrdPrg, int Page, int PageSize, string? SortBy = null, string? SortDir = null, string? Keyword = null);
        public Task<CustomerInfo?> GetCustomerDetail(long CustNo);
        public Task<long> InsertCustomer(CustomersCreateDto? Dto, string? UserId);
        // 엑셀 일괄 업로드 — 건별 등록(구입자/희망지역 등 자식 포함)
        public Task<CustomerBulkResult> BulkInsertCustomers(CustomerBulkUploadDto Dto);
        public Task<bool> UpdateCustomer(long CustNo, CustomersUpdateDto Dto, string? UserId);
        public Task<bool> DeleteCustomer(int CustNo, string? UserId);
    }

    public class CustomersServices : ICustomersServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public CustomersServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        // ct_cust SELECT 컬럼(별칭) — 함수 없이 직접 매핑
        private const string CUST_COLUMNS = @"
            cust_no AS ""CustNo"", cust_type AS ""CustType"", name AS ""Name"", alias AS ""Alias"",
            tel AS ""Tel"", addr AS ""Addr"", memo AS ""Memo"", rent_bsn_yn AS ""RentBsnYn"",
            trd_prg AS ""TrdPrg"", want_type AS ""WantType"", want_nm AS ""WantNm"",
            exc_area_fr AS ""ExcAreaFr"", exc_area_to AS ""ExcAreaTo"",
            land_share_fr AS ""LandShareFr"", land_share_to AS ""LandShareTo"",
            trd_type AS ""TrdType"", movein_yn AS ""MoveinYn"",
            move_date_fr AS ""MoveDateFr"", move_date_to AS ""MoveDateTo"", cash_ablt AS ""CashAblt"",
            sale_amt_fr AS ""SaleAmtFr"", sale_amt_to AS ""SaleAmtTo"",
            les_amt_fr AS ""LesAmtFr"", les_amt_to AS ""LesAmtTo"",
            prot_amt_fr AS ""ProtAmtFr"", prot_amt_to AS ""ProtAmtTo"",
            mon_amt_fr AS ""MonAmtFr"", mon_amt_to AS ""MonAmtTo"",
            etc_prot_amt_fr AS ""EtcProtAmtFr"", etc_prot_amt_to AS ""EtcProtAmtTo"",
            etc_mon_amt_fr AS ""EtcMonAmtFr"", etc_mon_amt_to AS ""EtcMonAmtTo"",
            etc_type AS ""EtcType"", rmk AS ""Rmk"", rnk AS ""Rnk"",
            room_cnt AS ""RoomCnt"", bath_cnt AS ""BathCnt"", park_cnt AS ""ParkCnt"",
            community_fac AS ""CommunityFac"", feature_note AS ""FeatureNote"",
            gap_invest_yn AS ""GapInvestYn"", irrelevant_yn AS ""IrrelevantYn"",
            want_sub_type AS ""WantSubType"", gross_area_fr AS ""GrossAreaFr"", gross_area_to AS ""GrossAreaTo"",
            area_kind AS ""AreaKind"", land_share_ratio_fr AS ""LandShareRatioFr"", land_share_ratio_to AS ""LandShareRatioTo"",
            area_unit AS ""AreaUnit"", invest_yn AS ""InvestYn"", child_yn AS ""ChildYn"", child_cond AS ""ChildCond"",
            pet_allow AS ""PetAllow"", pet_cond AS ""PetCond"", opt AS ""Opt"", building_use AS ""BuildingUse"", biz_type AS ""BizType"",
            elevator_cnt AS ""ElevatorCnt"", stair_cnt AS ""StairCnt"", city_gas_yn AS ""CityGasYn"", electric_yn AS ""ElectricYn"",
            elec_capacity AS ""ElecCapacity"", access_road AS ""AccessRoad"", land_use AS ""LandUse"", land_category AS ""LandCategory"",
            balc_ext AS ""BalcExt"", entr_struct AS ""EntrStruct"", building_form AS ""BuildingForm"", build_permit_pref AS ""BuildPermitPref"",
            contract_date AS ""ContractDate"", hold_date AS ""HoldDate"",
            rt_no AS ""RtNo"", off_no AS ""OffNo"", vendor_id AS ""VendorId"",
            reg_dt AS ""RegDt"", reg_id AS ""RegId"", upd_dt AS ""UpdDt"", upd_id AS ""UpdId""";

        private static NpgsqlParameter P(string name, NpgsqlDbType type, object? value)
            => new NpgsqlParameter(name, type) { Value = value ?? DBNull.Value };

        // ===================== 목록 =====================
        public async Task<CustomerList> SelecCustomerList(int? CustNo, string? Name, string? Alias, string? Tel, int? OffNo, int? VendorId, string? WantType, string? TrdType, string? TrdPrg, int Page, int PageSize, string? SortBy = null, string? SortDir = null, string? Keyword = null)
        {
            // 공통 WHERE (목록/카운트 동일 조건·동일 파라미터)
            const string whereClause = @"
                 WHERE (@cust_no   IS NULL OR cust_no   = @cust_no)
                   AND (@name      IS NULL OR name      ILIKE '%' || @name  || '%')
                   AND (@alias     IS NULL OR alias     ILIKE '%' || @alias || '%')
                   AND (@tel       IS NULL OR tel       ILIKE '%' || @tel   || '%')
                   AND (@off_no    IS NULL OR off_no    = @off_no)
                   AND (@vendor_id IS NULL OR vendor_id = @vendor_id)
                   AND (@want_type IS NULL OR want_type = ANY(string_to_array(@want_type, ',')))
                   AND (@trd_type  IS NULL OR EXISTS (
                          SELECT 1 FROM unnest(string_to_array(@trd_type, ',')) t
                           WHERE trd_type LIKE '%' || t || '%'))
                   AND (@trd_prg   IS NULL OR trd_prg = ANY(string_to_array(@trd_prg, ',')))
                   AND (@keyword   IS NULL
                        OR name  ILIKE '%' || @keyword || '%'
                        OR alias ILIKE '%' || @keyword || '%'
                        OR tel   ILIKE '%' || @keyword || '%'
                        OR addr  ILIKE '%' || @keyword || '%')";

            // 정렬: 화이트리스트만 허용 (raw SortBy 절대 미보간)
            string orderColumn = (SortBy ?? "").ToLower() switch
            {
                "name" => "name",
                "upddt" or "upd_dt" => "upd_dt",
                "regdt" or "reg_dt" => "reg_dt",
                _ => "cust_no",
            };
            string orderDir = (SortDir ?? "").ToUpper() == "ASC" ? "ASC" : "DESC";

            string sql = $@"
                SELECT {CUST_COLUMNS},
                       (SELECT string_agg(COALESCE(NULLIF(a.bld_nm, ''), a.addr3), ', ')
                          FROM ct_trd_area a WHERE a.cust_no = ct_cust.cust_no) AS ""WishAreas"",
                       (SELECT count(*)::int FROM report_cust rc WHERE rc.cust_no = ct_cust.cust_no) AS ""ReportCount"",
                       (SELECT MAX(t.reg_dt) FROM rt_trade_info t
                          WHERE t.cust_no = ct_cust.cust_no::text AND COALESCE(t.trade_status,'Y') <> 'N') AS ""TransmitDt""
                  FROM ct_cust
                {whereClause}
                 ORDER BY {orderColumn} {orderDir}
                 LIMIT @page_size OFFSET (@page - 1) * @page_size";

            int page = Page <= 0 ? 1 : Page;
            int pageSize = PageSize <= 0 ? 20 : PageSize;

            var parameters = new List<NpgsqlParameter>
            {
                P("@cust_no",   NpgsqlDbType.Integer, CustNo),
                P("@name",      NpgsqlDbType.Varchar, Name),
                P("@alias",     NpgsqlDbType.Varchar, Alias),
                P("@tel",       NpgsqlDbType.Varchar, Tel),
                P("@off_no",    NpgsqlDbType.Integer, OffNo),
                P("@vendor_id", NpgsqlDbType.Integer, VendorId),
                P("@want_type", NpgsqlDbType.Varchar, WantType),
                P("@trd_type",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(TrdType) ? null : TrdType),
                P("@trd_prg",   NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(TrdPrg) ? null : TrdPrg),
                P("@keyword",   NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(Keyword) ? null : Keyword.Trim()),
                P("@page",      NpgsqlDbType.Integer, page),
                P("@page_size", NpgsqlDbType.Integer, pageSize),
            };

            var customers = await _dataService.QueryAsyncPg<CustomerInfo>("DEV", sql, parameters);

            // 전체 개수(페이징용) — 동일 WHERE·동일 파라미터 재사용
            int totalCount = 0;
            string countSql = $@"SELECT count(*)::int AS cnt FROM ct_cust {whereClause}";
            var countParams = new List<NpgsqlParameter>
            {
                P("@cust_no",   NpgsqlDbType.Integer, CustNo),
                P("@name",      NpgsqlDbType.Varchar, Name),
                P("@alias",     NpgsqlDbType.Varchar, Alias),
                P("@tel",       NpgsqlDbType.Varchar, Tel),
                P("@off_no",    NpgsqlDbType.Integer, OffNo),
                P("@vendor_id", NpgsqlDbType.Integer, VendorId),
                P("@want_type", NpgsqlDbType.Varchar, WantType),
                P("@trd_type",  NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(TrdType) ? null : TrdType),
                P("@trd_prg",   NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(TrdPrg) ? null : TrdPrg),
                P("@keyword",   NpgsqlDbType.Varchar, string.IsNullOrWhiteSpace(Keyword) ? null : Keyword.Trim()),
            };
            using (var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV")))
            {
                await connection.OpenAsync();
                using (var cmd = new NpgsqlCommand(countSql, connection))
                {
                    cmd.Parameters.AddRange(countParams.ToArray());
                    var result = await cmd.ExecuteScalarAsync();
                    totalCount = (result != null && result != DBNull.Value) ? Convert.ToInt32(result) : 0;
                }
            }

            return new CustomerList
            {
                Customers = customers,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = pageSize > 0 ? (int)Math.Ceiling(totalCount / (double)pageSize) : 0,
            };
        }

        // ===================== 상세 =====================
        public async Task<CustomerInfo?> GetCustomerDetail(long CustNo)
        {
            string custSql = $"SELECT {CUST_COLUMNS} FROM ct_cust WHERE cust_no = @cust_no";
            var custList = await _dataService.QueryAsyncPg<CustomerInfo>("DEV", custSql,
                new List<NpgsqlParameter> { P("@cust_no", NpgsqlDbType.Bigint, CustNo) });
            var cust = custList.FirstOrDefault();
            if (cust == null) return null;

            // 희망지역
            string areaSql = @"
                SELECT cust_no AS ""CustNo"", seq AS ""Seq"", addr1 AS ""Addr1"", addr2 AS ""Addr2"",
                       addr3 AS ""Addr3"", bjd_code AS ""BjdCode"", bld_nm AS ""BldNm"",
                       danji_code AS ""DanjiCode"", detail_loc AS ""DetailLoc""
                  FROM ct_trd_area WHERE cust_no = @cust_no ORDER BY seq";
            cust.Areas = await _dataService.QueryAsyncPg<CustArea>("DEV", areaSql,
                new List<NpgsqlParameter> { P("@cust_no", NpgsqlDbType.Bigint, CustNo) });

            // 구입자정보
            string buyerSql = @"
                SELECT cust_no AS ""CustNo"", seq AS ""Seq"", name AS ""Name"", relation AS ""Relation"",
                       tel AS ""Tel"", addr AS ""Addr""
                  FROM ct_cust_buyer WHERE cust_no = @cust_no ORDER BY seq";
            cust.Buyers = await _dataService.QueryAsyncPg<CustBuyer>("DEV", buyerSql,
                new List<NpgsqlParameter> { P("@cust_no", NpgsqlDbType.Bigint, CustNo) });

            // 공동중개사 사무소 (pt_share)
            string shareSql = @"
                SELECT office_name AS ""OfficeName"", region_name AS ""RegionName"",
                       office_phone AS ""OfficePhone"", memo AS ""Memo"", share_date AS ""Date""
                  FROM pt_share WHERE cust_no = @cust_no ORDER BY share_idx";
            cust.Shares = await _dataService.QueryAsyncPg<CustShare>("DEV", shareSql,
                new List<NpgsqlParameter> { P("@cust_no", NpgsqlDbType.Bigint, CustNo) });

            return cust;
        }

        // ===================== 등록 =====================
        public async Task<long> InsertCustomer(CustomersCreateDto? Dto, string? UserId)
        {
            if (Dto == null) return 0;

            using var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV"));
            await connection.OpenAsync();
            await connection.SetAppUidAsync(UserId); // _hist 작성자(app.uid) — 트랜잭션 전에 설정
            using var tx = connection.BeginTransaction();

            const string sql = @"
                INSERT INTO ct_cust (
                    cust_type, name, alias, tel, addr, memo, rent_bsn_yn, trd_prg, want_type, want_nm,
                    exc_area_fr, exc_area_to, land_share_fr, land_share_to, trd_type, movein_yn,
                    move_date_fr, move_date_to, cash_ablt, sale_amt_fr, sale_amt_to, les_amt_fr, les_amt_to,
                    prot_amt_fr, prot_amt_to, mon_amt_fr, mon_amt_to, etc_prot_amt_fr, etc_prot_amt_to,
                    etc_mon_amt_fr, etc_mon_amt_to, etc_type, rmk, rnk, room_cnt, bath_cnt, park_cnt,
                    community_fac, feature_note, gap_invest_yn, irrelevant_yn,
                    want_sub_type, gross_area_fr, gross_area_to, area_kind, land_share_ratio_fr, land_share_ratio_to,
                    area_unit, invest_yn, child_yn, child_cond, pet_allow, pet_cond, opt, building_use, biz_type,
                    elevator_cnt, stair_cnt, city_gas_yn, electric_yn, elec_capacity, access_road, land_use, land_category,
                    balc_ext, entr_struct, building_form, build_permit_pref,
                    contract_date, hold_date, rt_no, off_no, vendor_id,
                    reg_dt, reg_id
                ) VALUES (
                    @cust_type, @name, @alias, @tel, @addr, @memo, @rent_bsn_yn, @trd_prg, @want_type, @want_nm,
                    @exc_area_fr, @exc_area_to, @land_share_fr, @land_share_to, @trd_type, @movein_yn,
                    @move_date_fr, @move_date_to, @cash_ablt, @sale_amt_fr, @sale_amt_to, @les_amt_fr, @les_amt_to,
                    @prot_amt_fr, @prot_amt_to, @mon_amt_fr, @mon_amt_to, @etc_prot_amt_fr, @etc_prot_amt_to,
                    @etc_mon_amt_fr, @etc_mon_amt_to, @etc_type, @rmk, @rnk, @room_cnt, @bath_cnt, @park_cnt,
                    @community_fac, @feature_note, @gap_invest_yn, @irrelevant_yn,
                    @want_sub_type, @gross_area_fr, @gross_area_to, @area_kind, @land_share_ratio_fr, @land_share_ratio_to,
                    @area_unit, @invest_yn, @child_yn, @child_cond, @pet_allow, @pet_cond, @opt, @building_use, @biz_type,
                    @elevator_cnt, @stair_cnt, @city_gas_yn, @electric_yn, @elec_capacity, @access_road, @land_use, @land_category,
                    @balc_ext, @entr_struct, @building_form, @build_permit_pref,
                    @contract_date, @hold_date, @rt_no, @off_no, @vendor_id,
                    NOW(), @user_id
                ) RETURNING cust_no";

            long custNo;
            using (var cmd = new NpgsqlCommand(sql, connection, tx))
            {
                AddCustParams(cmd, Dto.CustType, Dto.Name, Dto.Alias, Dto.Tel, Dto.Addr, Dto.Memo, Dto.RentBsnYn,
                    Dto.TrdPrg, Dto.WantType, Dto.WantNm, Dto.ExcAreaFr, Dto.ExcAreaTo, Dto.LandShareFr, Dto.LandShareTo,
                    Dto.TrdType, Dto.MoveinYn, Dto.MoveDateFr, Dto.MoveDateTo, Dto.CashAblt, Dto.SaleAmtFr, Dto.SaleAmtTo,
                    Dto.LesAmtFr, Dto.LesAmtTo, Dto.ProtAmtFr, Dto.ProtAmtTo, Dto.MonAmtFr, Dto.MonAmtTo,
                    Dto.EtcProtAmtFr, Dto.EtcProtAmtTo, Dto.EtcMonAmtFr, Dto.EtcMonAmtTo, Dto.EtcType, Dto.Rmk, Dto.Rnk,
                    Dto.RoomCnt, Dto.BathCnt, Dto.ParkCnt, Dto.CommunityFac, Dto.FeatureNote, Dto.GapInvestYn, Dto.IrrelevantYn,
                    Dto.WantSubType, Dto.GrossAreaFr, Dto.GrossAreaTo, Dto.AreaKind, Dto.LandShareRatioFr, Dto.LandShareRatioTo,
                    Dto.AreaUnit, Dto.InvestYn, Dto.ChildYn, Dto.ChildCond, Dto.PetAllow, Dto.PetCond, Dto.Opt, Dto.BuildingUse, Dto.BizType,
                    Dto.ElevatorCnt, Dto.StairCnt, Dto.CityGasYn, Dto.ElectricYn, Dto.ElecCapacity, Dto.AccessRoad, Dto.LandUse, Dto.LandCategory,
                    Dto.BalcExt, Dto.EntrStruct, Dto.BuildingForm, Dto.BuildPermitPref,
                    Dto.ContractDate, Dto.HoldDate,
                    Dto.RtNo, Dto.OffNo, Dto.VendorId, UserId);
                var result = await cmd.ExecuteScalarAsync();
                custNo = Convert.ToInt64(result);
            }

            await SyncAreas(connection, tx, custNo, Dto.Areas, UserId);
            await SyncBuyers(connection, tx, custNo, Dto.Buyers, UserId);
            await SyncShares(connection, tx, custNo, Dto.Shares, UserId);
            await SyncMemos(connection, tx, custNo, Dto.Memos, Dto.DeletedMemoNos, UserId);
            await SyncConsults(connection, tx, custNo, Dto.Consultations, Dto.DeletedItvNos, Dto.Name, Dto.OffNo, Dto.RtNo, UserId);

            await tx.CommitAsync();
            return custNo;
        }

        // ===================== 엑셀 일괄 업로드 =====================
        public async Task<CustomerBulkResult> BulkInsertCustomers(CustomerBulkUploadDto Dto)
        {
            var res = new CustomerBulkResult { Total = Dto?.Items?.Count ?? 0 };
            if (Dto?.Items == null || Dto.Items.Count == 0) return res;

            for (int i = 0; i < Dto.Items.Count; i++)
            {
                var item = Dto.Items[i];
                int rowNo = i + 1;
                try
                {
                    // 공통 컨텍스트 주입(개별 값이 없을 때만)
                    if (item.OffNo == null) item.OffNo = Dto.OffNo;
                    if (item.RtNo == null) item.RtNo = Dto.RtNo;
                    if (item.VendorId == null) item.VendorId = Dto.VendorId;
                    if (string.IsNullOrWhiteSpace(item.UserId)) item.UserId = Dto.UserId;

                    long custNo = await InsertCustomer(item, item.UserId);
                    if (custNo > 0) res.Success++;
                    else { res.Failed++; res.Errors.Add(new CustomerBulkError { Row = rowNo, Message = "등록 실패" }); }
                }
                catch (Exception ex)
                {
                    res.Failed++;
                    res.Errors.Add(new CustomerBulkError { Row = rowNo, Message = ex.Message });
                }
            }
            return res;
        }

        // ===================== 수정 =====================
        public async Task<bool> UpdateCustomer(long CustNo, CustomersUpdateDto Dto, string? UserId)
        {
            using var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV"));
            await connection.OpenAsync();
            await connection.SetAppUidAsync(UserId); // _hist 작성자(app.uid) — 트랜잭션 전에 설정
            using var tx = connection.BeginTransaction();

            const string sql = @"
                UPDATE ct_cust SET
                    cust_type=@cust_type, name=@name, alias=@alias, tel=@tel, addr=@addr, memo=@memo,
                    rent_bsn_yn=@rent_bsn_yn, trd_prg=@trd_prg, want_type=@want_type, want_nm=@want_nm,
                    exc_area_fr=@exc_area_fr, exc_area_to=@exc_area_to, land_share_fr=@land_share_fr, land_share_to=@land_share_to,
                    trd_type=@trd_type, movein_yn=@movein_yn, move_date_fr=@move_date_fr, move_date_to=@move_date_to,
                    cash_ablt=@cash_ablt, sale_amt_fr=@sale_amt_fr, sale_amt_to=@sale_amt_to, les_amt_fr=@les_amt_fr, les_amt_to=@les_amt_to,
                    prot_amt_fr=@prot_amt_fr, prot_amt_to=@prot_amt_to, mon_amt_fr=@mon_amt_fr, mon_amt_to=@mon_amt_to,
                    etc_prot_amt_fr=@etc_prot_amt_fr, etc_prot_amt_to=@etc_prot_amt_to, etc_mon_amt_fr=@etc_mon_amt_fr, etc_mon_amt_to=@etc_mon_amt_to,
                    etc_type=@etc_type, rmk=@rmk, rnk=@rnk, room_cnt=@room_cnt, bath_cnt=@bath_cnt, park_cnt=@park_cnt,
                    community_fac=@community_fac, feature_note=@feature_note, gap_invest_yn=@gap_invest_yn, irrelevant_yn=@irrelevant_yn,
                    want_sub_type=@want_sub_type, gross_area_fr=@gross_area_fr, gross_area_to=@gross_area_to, area_kind=@area_kind,
                    land_share_ratio_fr=@land_share_ratio_fr, land_share_ratio_to=@land_share_ratio_to, area_unit=@area_unit,
                    invest_yn=@invest_yn, child_yn=@child_yn, child_cond=@child_cond, pet_allow=@pet_allow, pet_cond=@pet_cond,
                    opt=@opt, building_use=@building_use, biz_type=@biz_type, elevator_cnt=@elevator_cnt, stair_cnt=@stair_cnt,
                    city_gas_yn=@city_gas_yn, electric_yn=@electric_yn, elec_capacity=@elec_capacity, access_road=@access_road,
                    land_use=@land_use, land_category=@land_category,
                    balc_ext=@balc_ext, entr_struct=@entr_struct, building_form=@building_form, build_permit_pref=@build_permit_pref,
                    contract_date=@contract_date, hold_date=@hold_date,
                    rt_no=@rt_no, off_no=@off_no, vendor_id=@vendor_id, upd_dt=NOW(), upd_id=@user_id
                 WHERE cust_no=@cust_no";

            using (var cmd = new NpgsqlCommand(sql, connection, tx))
            {
                AddCustParams(cmd, Dto.CustType, Dto.Name, Dto.Alias, Dto.Tel, Dto.Addr, Dto.Memo, Dto.RentBsnYn,
                    Dto.TrdPrg, Dto.WantType, Dto.WantNm, Dto.ExcAreaFr, Dto.ExcAreaTo, Dto.LandShareFr, Dto.LandShareTo,
                    Dto.TrdType, Dto.MoveinYn, Dto.MoveDateFr, Dto.MoveDateTo, Dto.CashAblt, Dto.SaleAmtFr, Dto.SaleAmtTo,
                    Dto.LesAmtFr, Dto.LesAmtTo, Dto.ProtAmtFr, Dto.ProtAmtTo, Dto.MonAmtFr, Dto.MonAmtTo,
                    Dto.EtcProtAmtFr, Dto.EtcProtAmtTo, Dto.EtcMonAmtFr, Dto.EtcMonAmtTo, Dto.EtcType, Dto.Rmk, Dto.Rnk,
                    Dto.RoomCnt, Dto.BathCnt, Dto.ParkCnt, Dto.CommunityFac, Dto.FeatureNote, Dto.GapInvestYn, Dto.IrrelevantYn,
                    Dto.WantSubType, Dto.GrossAreaFr, Dto.GrossAreaTo, Dto.AreaKind, Dto.LandShareRatioFr, Dto.LandShareRatioTo,
                    Dto.AreaUnit, Dto.InvestYn, Dto.ChildYn, Dto.ChildCond, Dto.PetAllow, Dto.PetCond, Dto.Opt, Dto.BuildingUse, Dto.BizType,
                    Dto.ElevatorCnt, Dto.StairCnt, Dto.CityGasYn, Dto.ElectricYn, Dto.ElecCapacity, Dto.AccessRoad, Dto.LandUse, Dto.LandCategory,
                    Dto.BalcExt, Dto.EntrStruct, Dto.BuildingForm, Dto.BuildPermitPref,
                    Dto.ContractDate, Dto.HoldDate,
                    Dto.RtNo, Dto.OffNo, Dto.VendorId, UserId);
                cmd.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, CustNo));
                await cmd.ExecuteNonQueryAsync();
            }

            await SyncAreas(connection, tx, CustNo, Dto.Areas, UserId);
            await SyncBuyers(connection, tx, CustNo, Dto.Buyers, UserId);
            await SyncShares(connection, tx, CustNo, Dto.Shares, UserId);
            await SyncMemos(connection, tx, CustNo, Dto.Memos, Dto.DeletedMemoNos, UserId);
            await SyncConsults(connection, tx, CustNo, Dto.Consultations, Dto.DeletedItvNos, Dto.Name, Dto.OffNo, Dto.RtNo, UserId);

            await tx.CommitAsync();
            return true;
        }

        // ===================== 삭제 =====================
        public async Task<bool> DeleteCustomer(int CustNo, string? UserId)
        {
            using var connection = new NpgsqlConnection(_configuration.GetConnectionString("DEV"));
            await connection.OpenAsync();
            await connection.SetAppUidAsync(UserId); // _hist 작성자(app.uid) — 트랜잭션 전에 설정
            using var tx = connection.BeginTransaction();

            foreach (var t in new[] { "ct_trd_area", "ct_cust_buyer", "pt_share", "pt_memo", "ct_cust" })
            {
                using var cmd = new NpgsqlCommand($"DELETE FROM {t} WHERE cust_no = @cust_no", connection, tx);
                cmd.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, (long)CustNo));
                await cmd.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
            return true;
        }

        // ===================== 1:N 동기화 =====================
        private async Task SyncAreas(NpgsqlConnection connection, NpgsqlTransaction tx, long custNo, List<CustAreaDto>? areas, string? userId)
        {
            using (var del = new NpgsqlCommand("DELETE FROM ct_trd_area WHERE cust_no = @cust_no", connection, tx))
            {
                del.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                await del.ExecuteNonQueryAsync();
            }
            if (areas == null) return;

            int seq = 1;
            foreach (var a in areas)
            {
                // 완전 빈 행은 건너뜀
                if (string.IsNullOrWhiteSpace(a.Addr1) && string.IsNullOrWhiteSpace(a.Addr3) &&
                    string.IsNullOrWhiteSpace(a.BjdCode) && string.IsNullOrWhiteSpace(a.BldNm) &&
                    string.IsNullOrWhiteSpace(a.DetailLoc)) continue;

                const string ins = @"
                    INSERT INTO ct_trd_area (cust_no, seq, addr1, addr2, addr3, bjd_code, bld_nm, danji_code, detail_loc, reg_dt, reg_id)
                    VALUES (@cust_no, @seq, @addr1, @addr2, @addr3, @bjd_code, @bld_nm, @danji_code, @detail_loc, NOW(), @reg_id)";
                using var cmd = new NpgsqlCommand(ins, connection, tx);
                cmd.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                cmd.Parameters.Add(P("@seq", NpgsqlDbType.Integer, seq++));
                cmd.Parameters.Add(P("@addr1", NpgsqlDbType.Varchar, a.Addr1));
                cmd.Parameters.Add(P("@addr2", NpgsqlDbType.Varchar, a.Addr2));
                cmd.Parameters.Add(P("@addr3", NpgsqlDbType.Varchar, a.Addr3));
                cmd.Parameters.Add(P("@bjd_code", NpgsqlDbType.Varchar, a.BjdCode));
                cmd.Parameters.Add(P("@bld_nm", NpgsqlDbType.Varchar, a.BldNm));
                cmd.Parameters.Add(P("@danji_code", NpgsqlDbType.Varchar, a.DanjiCode));
                cmd.Parameters.Add(P("@detail_loc", NpgsqlDbType.Varchar, a.DetailLoc));
                cmd.Parameters.Add(P("@reg_id", NpgsqlDbType.Varchar, userId));
                await cmd.ExecuteNonQueryAsync();
            }
        }

        private async Task SyncBuyers(NpgsqlConnection connection, NpgsqlTransaction tx, long custNo, List<CustBuyerDto>? buyers, string? userId)
        {
            using (var del = new NpgsqlCommand("DELETE FROM ct_cust_buyer WHERE cust_no = @cust_no", connection, tx))
            {
                del.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                await del.ExecuteNonQueryAsync();
            }
            if (buyers == null) return;

            int seq = 1;
            foreach (var b in buyers)
            {
                if (string.IsNullOrWhiteSpace(b.Name) && string.IsNullOrWhiteSpace(b.Tel) &&
                    string.IsNullOrWhiteSpace(b.Relation) && string.IsNullOrWhiteSpace(b.Addr)) continue;

                const string ins = @"
                    INSERT INTO ct_cust_buyer (cust_no, seq, name, relation, tel, addr, reg_dt, reg_id)
                    VALUES (@cust_no, @seq, @name, @relation, @tel, @addr, NOW(), @reg_id)";
                using var cmd = new NpgsqlCommand(ins, connection, tx);
                cmd.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                cmd.Parameters.Add(P("@seq", NpgsqlDbType.Integer, seq++));
                cmd.Parameters.Add(P("@name", NpgsqlDbType.Varchar, b.Name));
                cmd.Parameters.Add(P("@relation", NpgsqlDbType.Varchar, b.Relation));
                cmd.Parameters.Add(P("@tel", NpgsqlDbType.Varchar, b.Tel));
                cmd.Parameters.Add(P("@addr", NpgsqlDbType.Varchar, b.Addr));
                cmd.Parameters.Add(P("@reg_id", NpgsqlDbType.Varchar, userId));
                await cmd.ExecuteNonQueryAsync();
            }
        }

        // 공동중개사 사무소 동기화 - pt_share (cust_no 기준, 전체 삭제 후 재삽입)
        private async Task SyncShares(NpgsqlConnection connection, NpgsqlTransaction tx, long custNo, List<CustShareDto>? shares, string? userId)
        {
            using (var del = new NpgsqlCommand("DELETE FROM pt_share WHERE cust_no = @cust_no", connection, tx))
            {
                del.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                await del.ExecuteNonQueryAsync();
            }
            if (shares == null) return;

            int idx = 1;
            foreach (var s in shares)
            {
                if (string.IsNullOrWhiteSpace(s.OfficeName) && string.IsNullOrWhiteSpace(s.OfficePhone) &&
                    string.IsNullOrWhiteSpace(s.RegionName) && string.IsNullOrWhiteSpace(s.Memo)) continue;

                const string ins = @"
                    INSERT INTO pt_share (cust_no, share_idx, office_name, region_name, office_phone, memo, share_date, reg_dt, reg_id)
                    VALUES (@cust_no, @share_idx, @office_name, @region_name, @office_phone, @memo, @share_date, now(), @reg_id)";
                using var cmd = new NpgsqlCommand(ins, connection, tx);
                cmd.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                cmd.Parameters.Add(P("@share_idx", NpgsqlDbType.Integer, idx++));
                cmd.Parameters.Add(P("@office_name", NpgsqlDbType.Varchar, s.OfficeName));
                cmd.Parameters.Add(P("@region_name", NpgsqlDbType.Varchar, s.RegionName));
                cmd.Parameters.Add(P("@office_phone", NpgsqlDbType.Varchar, s.OfficePhone));
                cmd.Parameters.Add(P("@memo", NpgsqlDbType.Varchar, s.Memo));
                cmd.Parameters.Add(P("@share_date", NpgsqlDbType.Varchar, s.Date));
                cmd.Parameters.Add(P("@reg_id", NpgsqlDbType.Varchar, userId));
                await cmd.ExecuteNonQueryAsync();
            }
        }

        // 고객 상담메모 동기화 - pt_memo (cust_no 기준)
        // 신규 INSERT / 변경분만 UPDATE / 없어진 것(+명시 삭제목록) DELETE
        private async Task SyncMemos(NpgsqlConnection connection, NpgsqlTransaction tx, long custNo, List<CustMemoDto>? memos, List<long>? deletedMemoNos, string? userId)
        {
            if (memos == null && (deletedMemoNos == null || deletedMemoNos.Count == 0)) return;

            // 명시적 삭제 목록 우선 처리
            if (deletedMemoNos != null)
            {
                foreach (var id in deletedMemoNos)
                {
                    using var del = new NpgsqlCommand("DELETE FROM pt_memo WHERE memo_no = @memo_no AND cust_no = @cust_no", connection, tx);
                    del.Parameters.Add(P("@memo_no", NpgsqlDbType.Bigint, id));
                    del.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                    await del.ExecuteNonQueryAsync();
                }
            }

            if (memos == null) return;

            // 기존 memo_no 목록
            var existingIds = new List<long>();
            using (var sel = new NpgsqlCommand("SELECT memo_no FROM pt_memo WHERE cust_no = @cust_no", connection, tx))
            {
                sel.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                using var r = await sel.ExecuteReaderAsync();
                while (await r.ReadAsync()) existingIds.Add(r.GetInt64(0));
            }

            var keepIds = memos.Where(m => m.MemoNo.HasValue && m.MemoNo.Value > 0 && m.Deleted != true)
                               .Select(m => m.MemoNo!.Value).ToHashSet();

            // 삭제: 기존에는 있으나 들어온 목록에 없는 것
            foreach (var id in existingIds.Where(id => !keepIds.Contains(id)))
            {
                using var del = new NpgsqlCommand("DELETE FROM pt_memo WHERE memo_no = @memo_no AND cust_no = @cust_no", connection, tx);
                del.Parameters.Add(P("@memo_no", NpgsqlDbType.Bigint, id));
                del.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                await del.ExecuteNonQueryAsync();
            }

            foreach (var m in memos)
            {
                if (m.Deleted == true) continue;
                bool isNew = !(m.MemoNo.HasValue && m.MemoNo.Value > 0);
                if (isNew)
                {
                    if (string.IsNullOrWhiteSpace(m.MemoContent)) continue;
                    using var ins = new NpgsqlCommand(@"
                        INSERT INTO pt_memo (cust_no, memo_date, memo_content, contact_name, contact_phone, user_id, reg_id, reg_dt)
                        VALUES (@cust_no, CAST(@memo_date AS timestamp), @memo_content, @contact_name, @contact_phone, @user_id, @reg_id, CURRENT_TIMESTAMP)", connection, tx);
                    ins.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                    ins.Parameters.Add(P("@memo_date", NpgsqlDbType.Varchar, m.MemoDate));
                    ins.Parameters.Add(P("@memo_content", NpgsqlDbType.Varchar, m.MemoContent));
                    ins.Parameters.Add(P("@contact_name", NpgsqlDbType.Varchar, m.ContactName));
                    ins.Parameters.Add(P("@contact_phone", NpgsqlDbType.Varchar, m.ContactPhone));
                    ins.Parameters.Add(P("@user_id", NpgsqlDbType.Varchar, m.UserId ?? userId));
                    ins.Parameters.Add(P("@reg_id", NpgsqlDbType.Varchar, m.UserId ?? userId));
                    await ins.ExecuteNonQueryAsync();
                }
                else
                {
                    // 내용/연락처가 실제로 다를 때만 갱신 → 변경 없으면 upd_dt 유지
                    using var upd = new NpgsqlCommand(@"
                        UPDATE pt_memo
                           SET memo_date = CAST(@memo_date AS timestamp), memo_content = @memo_content,
                               contact_name = @contact_name, contact_phone = @contact_phone,
                               upd_dt = CURRENT_TIMESTAMP, upd_id = @upd_id
                         WHERE memo_no = @memo_no AND cust_no = @cust_no
                           AND (memo_content IS DISTINCT FROM @memo_content
                                OR contact_name IS DISTINCT FROM @contact_name
                                OR contact_phone IS DISTINCT FROM @contact_phone)", connection, tx);
                    upd.Parameters.Add(P("@memo_no", NpgsqlDbType.Bigint, m.MemoNo!.Value));
                    upd.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                    upd.Parameters.Add(P("@memo_date", NpgsqlDbType.Varchar, m.MemoDate));
                    upd.Parameters.Add(P("@memo_content", NpgsqlDbType.Varchar, m.MemoContent));
                    upd.Parameters.Add(P("@contact_name", NpgsqlDbType.Varchar, m.ContactName));
                    upd.Parameters.Add(P("@contact_phone", NpgsqlDbType.Varchar, m.ContactPhone));
                    upd.Parameters.Add(P("@upd_id", NpgsqlDbType.Varchar, m.UserId ?? userId));
                    await upd.ExecuteNonQueryAsync();
                }
            }
        }

        // 고객 상담이력 동기화 - ct_interview (cust_no 기준)
        // 신규 INSERT / 변경분만 UPDATE / 없어진 것(+명시 삭제목록) DELETE
        private async Task SyncConsults(NpgsqlConnection connection, NpgsqlTransaction tx, long custNo, List<CustConsultDto>? consults, List<long>? deletedItvNos, string? custName, long? offNo, long? rtNo, string? userId)
        {
            if (consults == null && (deletedItvNos == null || deletedItvNos.Count == 0)) return;

            // 명시적 삭제 목록 우선 처리
            if (deletedItvNos != null)
            {
                foreach (var id in deletedItvNos)
                {
                    using var del = new NpgsqlCommand("DELETE FROM ct_interview WHERE itv_no = @itv_no AND cust_no = @cust_no", connection, tx);
                    del.Parameters.Add(P("@itv_no", NpgsqlDbType.Bigint, id));
                    del.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                    await del.ExecuteNonQueryAsync();
                }
            }

            if (consults == null) return;

            var existingIds = new List<long>();
            using (var sel = new NpgsqlCommand("SELECT itv_no FROM ct_interview WHERE cust_no = @cust_no", connection, tx))
            {
                sel.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                using var r = await sel.ExecuteReaderAsync();
                while (await r.ReadAsync()) existingIds.Add(r.GetInt64(0));
            }

            var keepIds = consults.Where(c => c.ItvNo.HasValue && c.ItvNo.Value > 0 && c.Deleted != true)
                                  .Select(c => c.ItvNo!.Value).ToHashSet();

            foreach (var id in existingIds.Where(id => !keepIds.Contains(id)))
            {
                using var del = new NpgsqlCommand("DELETE FROM ct_interview WHERE itv_no = @itv_no AND cust_no = @cust_no", connection, tx);
                del.Parameters.Add(P("@itv_no", NpgsqlDbType.Bigint, id));
                del.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                await del.ExecuteNonQueryAsync();
            }

            var itvDateDefault = DateTime.UtcNow.AddHours(9).ToString("yyyy-MM-dd"); // KST

            foreach (var c in consults)
            {
                if (c.Deleted == true) continue;
                bool isNew = !(c.ItvNo.HasValue && c.ItvNo.Value > 0);
                if (isNew)
                {
                    if (string.IsNullOrWhiteSpace(c.ItvContent)) continue;
                    using var ins = new NpgsqlCommand(@"
                        INSERT INTO ct_interview (itv_type, itv_date, cust_no, cust_name, itv_content, contact_name, contact_phone, off_no, rt_no, reg_dt, reg_id)
                        VALUES ('ITVTYP01', @itv_date, @cust_no, @cust_name, @itv_content, @contact_name, @contact_phone, @off_no, @rt_no, NOW(), @reg_id)", connection, tx);
                    ins.Parameters.Add(P("@itv_date", NpgsqlDbType.Varchar, c.ItvDate ?? itvDateDefault));
                    ins.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                    ins.Parameters.Add(P("@cust_name", NpgsqlDbType.Varchar, custName));
                    ins.Parameters.Add(P("@itv_content", NpgsqlDbType.Varchar, c.ItvContent));
                    ins.Parameters.Add(P("@contact_name", NpgsqlDbType.Varchar, c.ContactName));
                    ins.Parameters.Add(P("@contact_phone", NpgsqlDbType.Varchar, c.ContactPhone));
                    ins.Parameters.Add(P("@off_no", NpgsqlDbType.Bigint, offNo));
                    ins.Parameters.Add(P("@rt_no", NpgsqlDbType.Bigint, rtNo));
                    ins.Parameters.Add(P("@reg_id", NpgsqlDbType.Varchar, userId));
                    await ins.ExecuteNonQueryAsync();
                }
                else
                {
                    using var upd = new NpgsqlCommand(@"
                        UPDATE ct_interview
                           SET itv_content = @itv_content, contact_name = @contact_name, contact_phone = @contact_phone,
                               upd_dt = NOW(), upd_id = @upd_id
                         WHERE itv_no = @itv_no AND cust_no = @cust_no
                           AND (itv_content IS DISTINCT FROM @itv_content
                                OR contact_name IS DISTINCT FROM @contact_name
                                OR contact_phone IS DISTINCT FROM @contact_phone)", connection, tx);
                    upd.Parameters.Add(P("@itv_no", NpgsqlDbType.Bigint, c.ItvNo!.Value));
                    upd.Parameters.Add(P("@cust_no", NpgsqlDbType.Bigint, custNo));
                    upd.Parameters.Add(P("@itv_content", NpgsqlDbType.Varchar, c.ItvContent));
                    upd.Parameters.Add(P("@contact_name", NpgsqlDbType.Varchar, c.ContactName));
                    upd.Parameters.Add(P("@contact_phone", NpgsqlDbType.Varchar, c.ContactPhone));
                    upd.Parameters.Add(P("@upd_id", NpgsqlDbType.Varchar, userId));
                    await upd.ExecuteNonQueryAsync();
                }
            }
        }

        // ct_cust INSERT/UPDATE 공통 파라미터
        private static void AddCustParams(NpgsqlCommand cmd,
            int? custType, string? name, string? alias, string? tel, string? addr, string? memo, string? rentBsnYn,
            string? trdPrg, string? wantType, string? wantNm, decimal? excAreaFr, decimal? excAreaTo, decimal? landShareFr, decimal? landShareTo,
            string? trdType, string? moveinYn, string? moveDateFr, string? moveDateTo, string? cashAblt, int? saleAmtFr, int? saleAmtTo,
            int? lesAmtFr, int? lesAmtTo, int? protAmtFr, int? protAmtTo, int? monAmtFr, int? monAmtTo,
            int? etcProtAmtFr, int? etcProtAmtTo, int? etcMonAmtFr, int? etcMonAmtTo, string? etcType, string? rmk, string? rnk,
            int? roomCnt, int? bathCnt, int? parkCnt, string? communityFac, string? featureNote, string? gapInvestYn, string? irrelevantYn,
            string? wantSubType, decimal? grossAreaFr, decimal? grossAreaTo, string? areaKind, decimal? landShareRatioFr, decimal? landShareRatioTo,
            string? areaUnit, string? investYn, string? childYn, string? childCond, string? petAllow, string? petCond, string? opt, string? buildingUse, string? bizType,
            int? elevatorCnt, int? stairCnt, string? cityGasYn, string? electricYn, string? elecCapacity, string? accessRoad, string? landUse, string? landCategory,
            string? balcExt, string? entrStruct, string? buildingForm, string? buildPermitPref,
            string? contractDate, string? holdDate,
            long? rtNo, long? offNo, long? vendorId, string? userId)
        {
            cmd.Parameters.Add(P("@cust_type", NpgsqlDbType.Integer, custType));
            cmd.Parameters.Add(P("@name", NpgsqlDbType.Varchar, name));
            cmd.Parameters.Add(P("@alias", NpgsqlDbType.Varchar, alias));
            cmd.Parameters.Add(P("@tel", NpgsqlDbType.Varchar, tel));
            cmd.Parameters.Add(P("@addr", NpgsqlDbType.Varchar, addr));
            cmd.Parameters.Add(P("@memo", NpgsqlDbType.Varchar, memo));
            cmd.Parameters.Add(P("@rent_bsn_yn", NpgsqlDbType.Varchar, rentBsnYn));
            cmd.Parameters.Add(P("@trd_prg", NpgsqlDbType.Varchar, trdPrg));
            cmd.Parameters.Add(P("@want_type", NpgsqlDbType.Varchar, wantType));
            cmd.Parameters.Add(P("@want_nm", NpgsqlDbType.Varchar, wantNm));
            cmd.Parameters.Add(P("@exc_area_fr", NpgsqlDbType.Numeric, excAreaFr));
            cmd.Parameters.Add(P("@exc_area_to", NpgsqlDbType.Numeric, excAreaTo));
            cmd.Parameters.Add(P("@land_share_fr", NpgsqlDbType.Numeric, landShareFr));
            cmd.Parameters.Add(P("@land_share_to", NpgsqlDbType.Numeric, landShareTo));
            cmd.Parameters.Add(P("@trd_type", NpgsqlDbType.Varchar, trdType));
            cmd.Parameters.Add(P("@movein_yn", NpgsqlDbType.Varchar, moveinYn));
            cmd.Parameters.Add(P("@move_date_fr", NpgsqlDbType.Varchar, moveDateFr));
            cmd.Parameters.Add(P("@move_date_to", NpgsqlDbType.Varchar, moveDateTo));
            cmd.Parameters.Add(P("@cash_ablt", NpgsqlDbType.Varchar, cashAblt));
            cmd.Parameters.Add(P("@sale_amt_fr", NpgsqlDbType.Integer, saleAmtFr));
            cmd.Parameters.Add(P("@sale_amt_to", NpgsqlDbType.Integer, saleAmtTo));
            cmd.Parameters.Add(P("@les_amt_fr", NpgsqlDbType.Integer, lesAmtFr));
            cmd.Parameters.Add(P("@les_amt_to", NpgsqlDbType.Integer, lesAmtTo));
            cmd.Parameters.Add(P("@prot_amt_fr", NpgsqlDbType.Integer, protAmtFr));
            cmd.Parameters.Add(P("@prot_amt_to", NpgsqlDbType.Integer, protAmtTo));
            cmd.Parameters.Add(P("@mon_amt_fr", NpgsqlDbType.Integer, monAmtFr));
            cmd.Parameters.Add(P("@mon_amt_to", NpgsqlDbType.Integer, monAmtTo));
            cmd.Parameters.Add(P("@etc_prot_amt_fr", NpgsqlDbType.Integer, etcProtAmtFr));
            cmd.Parameters.Add(P("@etc_prot_amt_to", NpgsqlDbType.Integer, etcProtAmtTo));
            cmd.Parameters.Add(P("@etc_mon_amt_fr", NpgsqlDbType.Integer, etcMonAmtFr));
            cmd.Parameters.Add(P("@etc_mon_amt_to", NpgsqlDbType.Integer, etcMonAmtTo));
            cmd.Parameters.Add(P("@etc_type", NpgsqlDbType.Varchar, etcType));
            cmd.Parameters.Add(P("@rmk", NpgsqlDbType.Varchar, rmk));
            cmd.Parameters.Add(P("@rnk", NpgsqlDbType.Varchar, rnk));
            cmd.Parameters.Add(P("@room_cnt", NpgsqlDbType.Integer, roomCnt));
            cmd.Parameters.Add(P("@bath_cnt", NpgsqlDbType.Integer, bathCnt));
            cmd.Parameters.Add(P("@park_cnt", NpgsqlDbType.Integer, parkCnt));
            cmd.Parameters.Add(P("@community_fac", NpgsqlDbType.Varchar, communityFac));
            cmd.Parameters.Add(P("@feature_note", NpgsqlDbType.Varchar, featureNote));
            cmd.Parameters.Add(P("@gap_invest_yn", NpgsqlDbType.Varchar, gapInvestYn));
            cmd.Parameters.Add(P("@irrelevant_yn", NpgsqlDbType.Varchar, irrelevantYn));
            cmd.Parameters.Add(P("@want_sub_type", NpgsqlDbType.Varchar, wantSubType));
            cmd.Parameters.Add(P("@gross_area_fr", NpgsqlDbType.Numeric, grossAreaFr));
            cmd.Parameters.Add(P("@gross_area_to", NpgsqlDbType.Numeric, grossAreaTo));
            cmd.Parameters.Add(P("@area_kind", NpgsqlDbType.Varchar, areaKind));
            cmd.Parameters.Add(P("@land_share_ratio_fr", NpgsqlDbType.Numeric, landShareRatioFr));
            cmd.Parameters.Add(P("@land_share_ratio_to", NpgsqlDbType.Numeric, landShareRatioTo));
            cmd.Parameters.Add(P("@area_unit", NpgsqlDbType.Varchar, areaUnit));
            cmd.Parameters.Add(P("@invest_yn", NpgsqlDbType.Varchar, investYn));
            cmd.Parameters.Add(P("@child_yn", NpgsqlDbType.Varchar, childYn));
            cmd.Parameters.Add(P("@child_cond", NpgsqlDbType.Varchar, childCond));
            cmd.Parameters.Add(P("@pet_allow", NpgsqlDbType.Varchar, petAllow));
            cmd.Parameters.Add(P("@pet_cond", NpgsqlDbType.Varchar, petCond));
            cmd.Parameters.Add(P("@opt", NpgsqlDbType.Varchar, opt));
            cmd.Parameters.Add(P("@building_use", NpgsqlDbType.Varchar, buildingUse));
            cmd.Parameters.Add(P("@biz_type", NpgsqlDbType.Varchar, bizType));
            cmd.Parameters.Add(P("@elevator_cnt", NpgsqlDbType.Integer, elevatorCnt));
            cmd.Parameters.Add(P("@stair_cnt", NpgsqlDbType.Integer, stairCnt));
            cmd.Parameters.Add(P("@city_gas_yn", NpgsqlDbType.Varchar, cityGasYn));
            cmd.Parameters.Add(P("@electric_yn", NpgsqlDbType.Varchar, electricYn));
            cmd.Parameters.Add(P("@elec_capacity", NpgsqlDbType.Varchar, elecCapacity));
            cmd.Parameters.Add(P("@access_road", NpgsqlDbType.Varchar, accessRoad));
            cmd.Parameters.Add(P("@land_use", NpgsqlDbType.Varchar, landUse));
            cmd.Parameters.Add(P("@land_category", NpgsqlDbType.Varchar, landCategory));
            cmd.Parameters.Add(P("@balc_ext", NpgsqlDbType.Varchar, balcExt));
            cmd.Parameters.Add(P("@entr_struct", NpgsqlDbType.Varchar, entrStruct));
            cmd.Parameters.Add(P("@building_form", NpgsqlDbType.Varchar, buildingForm));
            cmd.Parameters.Add(P("@build_permit_pref", NpgsqlDbType.Varchar, buildPermitPref));
            cmd.Parameters.Add(P("@contract_date", NpgsqlDbType.Varchar, contractDate));
            cmd.Parameters.Add(P("@hold_date", NpgsqlDbType.Varchar, holdDate));
            cmd.Parameters.Add(P("@rt_no", NpgsqlDbType.Bigint, rtNo));
            cmd.Parameters.Add(P("@off_no", NpgsqlDbType.Bigint, offNo));
            cmd.Parameters.Add(P("@vendor_id", NpgsqlDbType.Bigint, vendorId));
            cmd.Parameters.Add(P("@user_id", NpgsqlDbType.Varchar, userId));
        }
    }
}

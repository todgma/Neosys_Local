using System.Data;
using RealestateAPI.Realestater.Models;
using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using Newtonsoft.Json;
using System.Collections.Generic;
using Npgsql;
using Newtonsoft.Json.Linq;
using System.Text.RegularExpressions;
using System.Numerics;
using RealestateAPI.Office.Models;
using Org.BouncyCastle.Crypto.Generators;
using BCrypt.Net;

namespace RealestateAPI.Realestater.Services
{
    public interface IRealestaterServices
    {
        public Task<RelatorList> SelectRealestaterList(long? rtNo, long? offNo);
        public Task<Realtor?> SelectRealestaterDetail(long rtNo);
        public Task<bool> InsertRealestater(string rtType, string rtNm, string? rtTel, string? rtRegNo, int? offNo, string? grade, string? id, string? pw, string? userId, string? referralCode,
            string? offNm = null, string? offAddr = null, string? offTel = null, string? offFax = null, string? offRegNo = null, string? bizNo = null,
            string? bizObjectKey = null, string? bizOrigName = null, string? bizContentType = null, long? bizFileSize = null, string? bizExt = null,
            string? email = null, string? joinDate = null, string? leaveDate = null, string? note = null,
            string? openObjectKey = null, string? openOrigName = null, string? openContentType = null, long? openFileSize = null, string? openExt = null);
        public Task<bool> UpdateRealestater(int rtNo, string? rtType, string? rtNm, string? rtTel, string? rtRegNo, int? offNo, string? grade, string? id, string? pw, string? userId,
            string? email = null, string? joinDate = null, string? leaveDate = null, string? note = null);
        public Task<bool> DeleteRealestater(int offNo, string? userId);
        public Task<string> LoginRealestater(string id, string pw);
        public Task<bool> CheckRealestaterId(string id);
        public Task<ReferralInfo?> GetReferralInfo(string code);
        // 추천 혜택(내가 추천한 목록) — 팝업 열 때 최신 조회용(로그인 응답과 분리)
        public Task<EventInfo> GetReferralBenefits(long rtNo);
        // 패스워드 변경 — 현재 패스워드 검증 후 Pw만 변경. 실패 사유(null=성공) 반환
        public Task<string?> ChangePassword(string id, string currentPw, string newPw);
        // 웹 결제창 자동로그인 1회용 토큰 발급/검증
        public Task<string?> IssuePaymentToken(long rtNo);
        public Task<Realtor?> RedeemPaymentToken(string token);
    }

    // 추천인 코드 검증 결과(가입 전 확인용) — 대표중개사(RTTYP01)의 성명/사무소명
    public class ReferralInfo
    {
        public string? RtNm { get; set; }   // 대표자명
        public string? OffNm { get; set; }  // 중개사무소명
    }

    // RETURNING 스칼라 매핑용 (dynamic → IDictionary 캐스팅 회피)
    internal class KeyRow
    {
        public long OffNo { get; set; }
        public long RtNo { get; set; }
    }

    // 추천 처리용 행 매핑(QueryAsyncPg는 구체 타입 속성에만 매핑 → dynamic 사용 불가)
    internal class RtNameRow
    {
        public long RtNo { get; set; }
        public string? RtNm { get; set; }
    }

    internal class UseYnRow { public string? UseYn { get; set; } }

    public class RealestaterServices : IRealestaterServices
    {
        private readonly IPostgresDataService _dataService;
        private readonly IConfiguration _configuration;

        public RealestaterServices(IPostgresDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }


        // 조회용 공통 컬럼(직원 필드 포함). Pw는 제외.
        private const string RT_COLS = @"
            ""RtNo"", ""RtType"", ""RtNm"", ""RtTel"", ""RtRegNo"", ""OffNo"", ""Grade"", ""Id"",
            ""RegDt"", ""RegId"", ""UpdDt"", ""UpdId"", referred_rt_no, referral_code AS ""ReferralCode"",
            ""Email"", ""JoinDate"", ""LeaveDate"", ""Note""";

        public async Task<RelatorList> SelectRealestaterList(long? rtNo, long? offNo)
        {
            string sql = $@"
                SELECT {RT_COLS} FROM rt_realtor_info
                 WHERE (@p_rt_no  IS NULL OR ""RtNo"" = @p_rt_no)
                   AND (@p_off_no IS NULL OR ""OffNo"" = @p_off_no)
                 ORDER BY ""RtNo"" DESC";
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_rt_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)rtNo ?? DBNull.Value },
                new NpgsqlParameter("@p_off_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)offNo ?? DBNull.Value },
            };
            var rows = await _dataService.QueryAsyncPg<Realtor>("DEV", sql, parameters);
            return new RelatorList { Relaters = rows };
        }

        public async Task<Realtor?> SelectRealestaterDetail(long rtNo)
        {
            string sql = $@"SELECT {RT_COLS} FROM rt_realtor_info WHERE ""RtNo"" = @p_rt_no";
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_rt_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = rtNo }
            };

            var rows = await _dataService.QueryAsyncPg<Realtor>("DEV", sql, parameters);
            var realtor = rows?.FirstOrDefault();

            // 혜택 정보 조회
            if (realtor != null)
            {
                realtor.eventInfo = await GetReferralBenefits(rtNo);
                // 대표중개사(RTTYP01)만 추천인 코드 노출 — 저장된 코드 우선, 없으면 PREFIX+순번(100001~) 영구 발급
                if (realtor.rtType == "RTTYP01" && string.IsNullOrWhiteSpace(realtor.referralCode))
                    realtor.referralCode = await EnsureReferralCode(realtor.rtNo);
            }

            return realtor;
        }

        // 추천인 코드가 비어있는 대표중개사(RTTYP01)에게 PREFIX(관리자설정·없으면 'A') + 순번(referral_code_seq, 100001~)을 영구 발급.
        //  · 과거 'A'+RtNo(6자리) 방식 폴백을 대체 — 읽기 시 1회 채워 넣고 그 값을 반환(이미 있으면 그대로).
        private async Task<string?> EnsureReferralCode(long rtNo)
        {
            Func<List<NpgsqlParameter>> rtParam = () => new List<NpgsqlParameter> { new NpgsqlParameter("@rt", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = rtNo } };
            try { await _dataService.ExecuteNonQueryAsyncPg("DEV", "CREATE SEQUENCE IF NOT EXISTS referral_code_seq START WITH 100001 INCREMENT BY 1;", new List<NpgsqlParameter>()); } catch (Exception ex) { Console.WriteLine("referral_code_seq 생성 스킵: " + ex.Message); }
            const string updPrefix = @"
                UPDATE rt_realtor_info
                   SET referral_code = COALESCE((
                           SELECT p.prefix FROM referral_code_prefix p
                            WHERE CURRENT_DATE >= p.start_date AND (p.end_date IS NULL OR CURRENT_DATE <= p.end_date)
                            ORDER BY p.start_date DESC LIMIT 1), 'A') || nextval('referral_code_seq')::text
                 WHERE ""RtNo"" = @rt AND ""RtType"" = 'RTTYP01' AND (referral_code IS NULL OR referral_code = '')";
            const string updFallback = @"
                UPDATE rt_realtor_info SET referral_code = 'A' || nextval('referral_code_seq')::text
                 WHERE ""RtNo"" = @rt AND ""RtType"" = 'RTTYP01' AND (referral_code IS NULL OR referral_code = '')";
            try { await _dataService.ExecuteNonQueryAsyncPg("DEV", updPrefix, rtParam()); }
            catch { try { await _dataService.ExecuteNonQueryAsyncPg("DEV", updFallback, rtParam()); } catch (Exception ex) { Console.WriteLine("referral_code 발급 스킵: " + ex.Message); } }
            try
            {
                var rows = await _dataService.QueryAsyncPg<Realtor>("DEV", @"SELECT referral_code AS ""ReferralCode"" FROM rt_realtor_info WHERE ""RtNo"" = @rt", rtParam());
                var code = rows?.FirstOrDefault()?.referralCode;
                return string.IsNullOrWhiteSpace(code) ? ("A" + rtNo.ToString("D6")) : code;
            }
            catch { return "A" + rtNo.ToString("D6"); }
        }

        // 가입비(사무소 단위) 결제 여부
        private async Task<bool> IsEntryFeePaid(long? offNo)
        {
            if (offNo == null) return false;
            try
            {
                var ps = new List<NpgsqlParameter> { new NpgsqlParameter("@off", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = offNo.Value } };
                var rows = await _dataService.QueryAsyncPg<dynamic>("DEV", "SELECT 1 AS ok FROM office_entry_fee WHERE off_no = @off LIMIT 1", ps);
                return rows != null && rows.Any();
            }
            catch { return false; }
        }

        // 웹 결제창 자동로그인 1회용 토큰 발급 (10분 유효·단일 사용)
        public async Task<string?> IssuePaymentToken(long rtNo)
        {
            var token = Guid.NewGuid().ToString("N");
            try { await _dataService.ExecuteNonQueryAsyncPg("DEV", @"CREATE TABLE IF NOT EXISTS rt_payment_token (token varchar(64) PRIMARY KEY, rt_no bigint NOT NULL, off_no bigint, expires_at timestamp NOT NULL, used_yn char(1) NOT NULL DEFAULT 'N', reg_dt timestamp NOT NULL DEFAULT now())", new List<NpgsqlParameter>()); } catch { }
            const string sql = @"
                INSERT INTO rt_payment_token (token, rt_no, off_no, expires_at)
                SELECT @token, r.""RtNo"", r.""OffNo"", now() + interval '10 minutes'
                  FROM rt_realtor_info r WHERE r.""RtNo"" = @rt";
            var ps = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@token", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = token },
                new NpgsqlParameter("@rt", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = rtNo },
            };
            var n = await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, ps);
            return n > 0 ? token : null;
        }

        // 토큰 검증(단일 사용 처리) → 해당 중개인 상세 반환(웹 자동로그인용)
        public async Task<Realtor?> RedeemPaymentToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return null;
            const string upd = @"UPDATE rt_payment_token SET used_yn = 'Y'
                                 WHERE token = @token AND used_yn = 'N' AND expires_at > now()
                                 RETURNING rt_no AS ""RtNo""";
            var ps = new List<NpgsqlParameter> { new NpgsqlParameter("@token", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = token } };
            var rows = await _dataService.QueryAsyncPg<KeyRow>("DEV", upd, ps);
            var rtNo = rows?.FirstOrDefault()?.RtNo ?? 0;
            if (rtNo <= 0) return null;
            var realtor = await SelectRealestaterDetail(rtNo);
            if (realtor != null)
            {
                try { realtor.hasMembership = await IsMembershipActive(realtor.offNo); } catch { }
                realtor.hasEntryFee = await IsEntryFeePaid(realtor.offNo);
            }
            return realtor;
        }

        // 사무소 멤버십 활성 여부(가입비/토큰 재조회용)
        private async Task<bool> IsMembershipActive(long? offNo)
        {
            if (offNo == null) return false;
            try
            {
                var ps = new List<NpgsqlParameter> { new NpgsqlParameter("@off", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = offNo.Value } };
                var rows = await _dataService.QueryAsyncPg<dynamic>("DEV", "SELECT 1 AS ok FROM office_membership WHERE off_no = @off LIMIT 1", ps);
                return rows != null && rows.Any();
            }
            catch { return false; }
        }

        public async Task<EventInfo> GetReferralBenefits(long rtNo)
        {
            const string sql = @"
            SELECT
                rb.rb_id,
                o.""OffNm"" as off_nm,
                rb.referred_rt_nm as rt_nm,
                rb.referred_reg_dt as reg_dt,
                rb.free_days
            FROM referral_benefits rb
            LEFT JOIN rt_realtor_info b ON b.""RtNo"" = rb.referred_rt_no
            LEFT JOIN ofc_realter_office o ON o.""OffNo"" = b.""OffNo""
            WHERE rb.rt_no = @p_rt_no
            ORDER BY rb.referred_reg_dt DESC;";

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_rt_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = rtNo }
            };

            var referredUsers = await _dataService.QueryAsyncPg<ReferredUser>("DEV", sql, parameters);

            return new EventInfo
            {
                referredCount = referredUsers?.Count ?? 0,
                totalFreeDays = referredUsers?.Sum(u => u.freeDays) ?? 0,
                referredUsers = referredUsers?.ToList()
            };
        }

        public async Task<bool> InsertRealestater(string rtType, string rtNm, string? rtTel, string? rtRegNo, int? offNo, string? grade, string? id, string? pw, string? userId, string? referralCode,
            string? offNm = null, string? offAddr = null, string? offTel = null, string? offFax = null, string? offRegNo = null, string? bizNo = null,
            string? bizObjectKey = null, string? bizOrigName = null, string? bizContentType = null, long? bizFileSize = null, string? bizExt = null,
            string? email = null, string? joinDate = null, string? leaveDate = null, string? note = null,
            string? openObjectKey = null, string? openOrigName = null, string? openContentType = null, long? openFileSize = null, string? openExt = null)
        {
            bool rtnVal = false;

            string? strHashPw = pw != null ? BCrypt.Net.BCrypt.HashPassword(pw, workFactor: 12) : null;

            long? resolvedOffNo = offNo;

            // 사무소명이 있고 off_no 미지정이면 사무소 신규 등록(인라인) → off_no 확보. 대표자=가입자(rtNm)
            if ((resolvedOffNo == null || resolvedOffNo == 0) && !string.IsNullOrWhiteSpace(offNm))
            {
                const string offSql = @"
                    INSERT INTO ofc_realter_office (""OffNm"", ""Addr"", ""RpsNm"", ""RpsPhone"", ""OffTel"", ""OffFax"", ""RegNo"", ""BizNo"", ""RegId"", ""RegDt"")
                    VALUES (@nm, @addr, @rps, @rpsp, @tel, @fax, @reg, @biz, @uid, NOW())
                    RETURNING ""OffNo"" AS ""OffNo""";
                var offPs = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@nm", (object?)offNm ?? DBNull.Value),
                    new NpgsqlParameter("@addr", (object?)offAddr ?? DBNull.Value),
                    new NpgsqlParameter("@rps", (object?)rtNm ?? DBNull.Value),
                    new NpgsqlParameter("@rpsp", (object?)rtTel ?? DBNull.Value),
                    new NpgsqlParameter("@tel", (object?)offTel ?? DBNull.Value),
                    new NpgsqlParameter("@fax", (object?)offFax ?? DBNull.Value),
                    new NpgsqlParameter("@reg", (object?)offRegNo ?? DBNull.Value),
                    new NpgsqlParameter("@biz", (object?)bizNo ?? DBNull.Value),
                    new NpgsqlParameter("@uid", (object?)userId ?? DBNull.Value),
                };
                var offRows = await _dataService.QueryAsyncPg<KeyRow>("DEV", offSql, offPs);
                var offFirst = offRows?.FirstOrDefault();
                if (offFirst != null && offFirst.OffNo > 0) resolvedOffNo = offFirst.OffNo;
            }

            // 중개사 등록(인라인). off_no는 위에서 확보한 값(신규사무소) 또는 전달값
            const string rtSql = @"
                INSERT INTO rt_realtor_info (""RtType"", ""RtNm"", ""RtTel"", ""RtRegNo"", ""OffNo"", ""Grade"", ""Id"", ""Pw"",
                                             ""Email"", ""JoinDate"", ""LeaveDate"", ""Note"", ""RegId"", ""RegDt"")
                VALUES (@type, @nm, @tel, @reg, @off, @grade, @id, @pw, @email, @join, @leave, @note, @uid, NOW())
                RETURNING ""RtNo"" AS ""RtNo""";
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@type", (object?)rtType ?? DBNull.Value),
                new NpgsqlParameter("@nm", (object?)rtNm ?? DBNull.Value),
                new NpgsqlParameter("@tel", (object?)rtTel ?? DBNull.Value),
                new NpgsqlParameter("@reg", (object?)rtRegNo ?? DBNull.Value),
                new NpgsqlParameter("@off", (object?)(resolvedOffNo.HasValue ? (int)resolvedOffNo.Value : (object?)null) ?? DBNull.Value),
                new NpgsqlParameter("@grade", (object?)grade ?? DBNull.Value),
                new NpgsqlParameter("@id", (object?)id ?? DBNull.Value),
                new NpgsqlParameter("@pw", (object?)strHashPw ?? DBNull.Value),
                new NpgsqlParameter("@email", (object?)email ?? DBNull.Value),
                new NpgsqlParameter("@join", (object?)joinDate ?? DBNull.Value),
                new NpgsqlParameter("@leave", (object?)leaveDate ?? DBNull.Value),
                new NpgsqlParameter("@note", (object?)note ?? DBNull.Value),
                new NpgsqlParameter("@uid", (object?)userId ?? DBNull.Value),
            };
            var rtRows = await _dataService.QueryAsyncPg<KeyRow>("DEV", rtSql, parameters);
            long newRtNo = 0;
            var rtFirst = rtRows?.FirstOrDefault();
            if (rtFirst != null) newRtNo = rtFirst.RtNo;

            // 사업자등록증 등 첨부(sys_file) — 업로드는 프론트에서 완료(objectKey 전달), 여기선 메타만 저장
            //   ref_key = 사무소번호(OffNo) : 사무소 정보 수정 화면에서 조회 가능하도록 사무소 기준으로 저장
            if (!string.IsNullOrWhiteSpace(bizObjectKey) && newRtNo > 0)
            {
                var bizRefKey = (resolvedOffNo.HasValue && resolvedOffNo.Value > 0) ? resolvedOffNo.Value.ToString() : newRtNo.ToString();
                const string fileSql = @"
                    INSERT INTO sys_file (file_typ, file_div, ref_key, orig_name, object_key, content_type, file_size, ext, reg_id, reg_dt)
                    VALUES (@typ, @div, @ref, @nm, @key, @ct, @size, @ext, @uid, CURRENT_TIMESTAMP)";
                var fileParams = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@typ", "SYFTY05"),   // 증빙
                    new NpgsqlParameter("@div", "SYFDV03"),   // 기타문서(사업자등록증)
                    new NpgsqlParameter("@ref", bizRefKey),
                    new NpgsqlParameter("@nm", (object?)bizOrigName ?? DBNull.Value),
                    new NpgsqlParameter("@key", (object?)bizObjectKey ?? DBNull.Value),
                    new NpgsqlParameter("@ct", (object?)bizContentType ?? DBNull.Value),
                    new NpgsqlParameter("@size", (object?)bizFileSize ?? DBNull.Value),
                    new NpgsqlParameter("@ext", (object?)bizExt ?? DBNull.Value),
                    new NpgsqlParameter("@uid", (object?)userId ?? DBNull.Value),
                };
                try { await _dataService.ExecuteNonQueryAsyncPg("DEV", fileSql, fileParams); } catch (Exception ex) { Console.WriteLine("사업자등록증 저장 실패: " + ex.Message); }
            }

            // 개설등록증(SYFDV04) 첨부 — 사업자등록증과 동일 방식(ref_key = 사무소번호 우선)
            if (!string.IsNullOrWhiteSpace(openObjectKey) && newRtNo > 0)
            {
                var openRefKey = (resolvedOffNo.HasValue && resolvedOffNo.Value > 0) ? resolvedOffNo.Value.ToString() : newRtNo.ToString();
                const string openSql = @"
                    INSERT INTO sys_file (file_typ, file_div, ref_key, orig_name, object_key, content_type, file_size, ext, reg_id, reg_dt)
                    VALUES (@typ, @div, @ref, @nm, @key, @ct, @size, @ext, @uid, CURRENT_TIMESTAMP)";
                var openParams = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@typ", "SYFTY05"),   // 증빙
                    new NpgsqlParameter("@div", "SYFDV04"),   // 개설등록증
                    new NpgsqlParameter("@ref", openRefKey),
                    new NpgsqlParameter("@nm", (object?)openOrigName ?? DBNull.Value),
                    new NpgsqlParameter("@key", (object?)openObjectKey ?? DBNull.Value),
                    new NpgsqlParameter("@ct", (object?)openContentType ?? DBNull.Value),
                    new NpgsqlParameter("@size", (object?)openFileSize ?? DBNull.Value),
                    new NpgsqlParameter("@ext", (object?)openExt ?? DBNull.Value),
                    new NpgsqlParameter("@uid", (object?)userId ?? DBNull.Value),
                };
                try { await _dataService.ExecuteNonQueryAsyncPg("DEV", openSql, openParams); } catch (Exception ex) { Console.WriteLine("개설등록증 저장 실패: " + ex.Message); }
            }

            // 대표중개사(RTTYP01)에게만 추천인 코드 발급 (소속중개사 계정은 미발급).
            //  코드 = [가입일 기준 기간 PREFIX(referral_code_prefix), 관리자 설정·없으면 'A'] + 순번(referral_code_seq, 100001~)
            if (rtType == "RTTYP01")
            {
                const string createSeqSql = @"CREATE SEQUENCE IF NOT EXISTS referral_code_seq START WITH 100001 INCREMENT BY 1;";
                const string setCodeSqlPrefix = @"
                UPDATE rt_realtor_info
                   SET referral_code = COALESCE((
                           SELECT p.prefix FROM referral_code_prefix p
                            WHERE CURRENT_DATE >= p.start_date
                              AND (p.end_date IS NULL OR CURRENT_DATE <= p.end_date)
                            ORDER BY p.start_date DESC LIMIT 1), 'A')
                         || nextval('referral_code_seq')::text
                 WHERE ""Id"" = @p_id
                   AND ""RtType"" = 'RTTYP01'
                   AND (referral_code IS NULL OR referral_code = '');";
                const string setCodeSqlFallback = @"
                UPDATE rt_realtor_info
                   SET referral_code = 'A' || nextval('referral_code_seq')::text
                 WHERE ""Id"" = @p_id
                   AND ""RtType"" = 'RTTYP01'
                   AND (referral_code IS NULL OR referral_code = '');";
                var codeParams = new List<NpgsqlParameter>
                {
                    new NpgsqlParameter("@p_id", (object?)id ?? DBNull.Value)
                };
                // 시퀀스 보장(멱등) 후 PREFIX+순번 발급, 실패(PREFIX 테이블 없음 등) 시 'A'+순번 폴백
                try { await _dataService.ExecuteNonQueryAsyncPg("DEV", createSeqSql, new List<NpgsqlParameter>()); } catch (Exception exSeq) { Console.WriteLine("referral_code_seq 생성 스킵: " + exSeq.Message); }
                try { await _dataService.ExecuteNonQueryAsyncPg("DEV", setCodeSqlPrefix, codeParams); }
                catch (Exception ex)
                {
                    Console.WriteLine("referral_code(기간 PREFIX) 설정 스킵 → 기본 A 시도: " + ex.Message);
                    var p2 = new List<NpgsqlParameter> { new NpgsqlParameter("@p_id", (object?)id ?? DBNull.Value) };
                    try { await _dataService.ExecuteNonQueryAsyncPg("DEV", setCodeSqlFallback, p2); } catch (Exception ex2) { Console.WriteLine("referral_code 설정 스킵: " + ex2.Message); }
                }
            }

            // 가입 성공 후 추천인 코드가 있으면 referral_benefits 테이블에 추가(실패해도 가입 자체는 막지 않음)
            if (!string.IsNullOrWhiteSpace(referralCode))
            {
                try { await ProcessReferralCode(id, referralCode); }
                catch (Exception ex) { Console.WriteLine("추천인 코드 처리 실패(가입은 완료): " + ex.Message); }
            }

            rtnVal = true;

            return rtnVal;
        }

        private async Task ProcessReferralCode(string? newUserId, string referralCode)
        {
            // 추천인 코드로 추천인 조회 (referral_code 우선, 하위호환으로 Id도 허용)
            const string findReferrerSql = @"
            SELECT ""RtNo"", ""Id""
            FROM rt_realtor_info
            WHERE referral_code = @p_referral_code OR ""Id"" = @p_referral_code
            LIMIT 1;";

            var findParams = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_referral_code", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = referralCode }
            };

            var referrer = await _dataService.QueryAsyncPg<KeyRow>("DEV", findReferrerSql, findParams);

            if (referrer == null || !referrer.Any())
            {
                // 추천인 코드가 유효하지 않으면 무시
                return;
            }

            // 새로 가입한 사용자 정보 조회
            const string findNewUserSql = @"
            SELECT ""RtNo"", ""RtNm""
            FROM rt_realtor_info
            WHERE ""Id"" = @p_new_user_id
            LIMIT 1;";

            var newUserParams = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_new_user_id", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)newUserId ?? DBNull.Value }
            };

            var newUser = await _dataService.QueryAsyncPg<RtNameRow>("DEV", findNewUserSql, newUserParams);

            if (newUser == null || !newUser.Any())
            {
                return;
            }

            long referrerRtNo = referrer.First().RtNo;
            long newUserRtNo = newUser.First().RtNo;
            string? newUserRtNm = newUser.First().RtNm;

            // referral_benefits 테이블에 추가
            const string insertReferralSql = @"
            INSERT INTO referral_benefits (rt_no, referred_rt_no, referred_rt_nm, free_days)
            VALUES (@p_rt_no, @p_referred_rt_no, @p_referred_rt_nm, 30);";

            var insertParams = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_rt_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = referrerRtNo },
                new NpgsqlParameter("@p_referred_rt_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = newUserRtNo },
                new NpgsqlParameter("@p_referred_rt_nm", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)newUserRtNm ?? DBNull.Value }
            };

            await _dataService.ExecuteNonQueryAsyncPg("DEV", insertReferralSql, insertParams);

            // 가입자 본인 행에도 '내가 입력한 추천인(referrer)'을 referred_rt_no 로 기록(데이터 정합)
            const string linkSql = @"UPDATE rt_realtor_info SET referred_rt_no = @p_rt_no WHERE ""RtNo"" = @p_new_rt_no";
            await _dataService.ExecuteNonQueryAsyncPg("DEV", linkSql, new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@p_rt_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = referrerRtNo },
                new NpgsqlParameter("@p_new_rt_no", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = newUserRtNo },
            });
        }

        public async Task<bool> UpdateRealestater(int rtNo, string? rtType, string? rtNm, string? rtTel, string? rtRegNo, int? offNo, string? grade, string? id, string? pw, string? userId,
            string? email = null, string? joinDate = null, string? leaveDate = null, string? note = null)
        {
            // 비밀번호는 입력된 경우에만 해시하여 변경(빈 값이면 기존 유지)
            string? strHashPw = string.IsNullOrWhiteSpace(pw) ? null : BCrypt.Net.BCrypt.HashPassword(pw, workFactor: 12);

            const string sql = @"
                UPDATE rt_realtor_info SET
                    ""RtType""    = COALESCE(@type, ""RtType""),
                    ""RtNm""      = COALESCE(@nm, ""RtNm""),
                    ""RtTel""     = @tel,
                    ""RtRegNo""   = @reg,
                    ""OffNo""     = COALESCE(@off, ""OffNo""),
                    ""Grade""     = @grade,
                    ""Pw""        = COALESCE(@pw, ""Pw""),
                    ""Email""     = @email,
                    ""JoinDate""  = @join,
                    ""LeaveDate"" = @leave,
                    ""Note""      = @note,
                    ""UpdId""     = @uid,
                    ""UpdDt""     = NOW()
                 WHERE ""RtNo"" = @rtno";
            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@rtno", rtNo),
                new NpgsqlParameter("@type", (object?)rtType ?? DBNull.Value),
                new NpgsqlParameter("@nm", (object?)rtNm ?? DBNull.Value),
                new NpgsqlParameter("@tel", (object?)rtTel ?? DBNull.Value),
                new NpgsqlParameter("@reg", (object?)rtRegNo ?? DBNull.Value),
                new NpgsqlParameter("@off", (object?)offNo ?? DBNull.Value),
                new NpgsqlParameter("@grade", (object?)grade ?? DBNull.Value),
                new NpgsqlParameter("@pw", (object?)strHashPw ?? DBNull.Value),
                new NpgsqlParameter("@email", (object?)email ?? DBNull.Value),
                new NpgsqlParameter("@join", (object?)joinDate ?? DBNull.Value),
                new NpgsqlParameter("@leave", (object?)leaveDate ?? DBNull.Value),
                new NpgsqlParameter("@note", (object?)note ?? DBNull.Value),
                new NpgsqlParameter("@uid", (object?)userId ?? DBNull.Value),
            };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", sql, parameters) > 0;
        }

        public async Task<bool> DeleteRealestater(int rtNo, string? userId)
        {
            // 직원(중개사) 삭제 — 인라인. 메뉴권한도 함께 정리
            await _dataService.ExecuteNonQueryAsyncPg("DEV", "DELETE FROM rt_menu_perm WHERE rt_no = @rtno",
                new List<NpgsqlParameter> { new NpgsqlParameter("@rtno", (long)rtNo) });
            var parameters = new List<NpgsqlParameter> { new NpgsqlParameter("@rtno", rtNo) };
            return await _dataService.ExecuteNonQueryAsyncPg("DEV", @"DELETE FROM rt_realtor_info WHERE ""RtNo"" = @rtno", parameters) > 0;
        }
        public async Task<string> LoginRealestater(string id, string pw)
        {
            string rtnVal = string.Empty;

            // 로그인 — 인라인 조회(Pw 포함). Id로 계정 조회 후 BCrypt 검증
            const string loginSql = @"
                SELECT ""RtNo"", ""RtType"", ""RtNm"", ""RtTel"", ""RtRegNo"", ""OffNo"", ""Grade"", ""Id"", ""Pw"",
                       ""RegDt"", ""RegId"", ""UpdDt"", ""UpdId"", referred_rt_no, referral_code AS ""ReferralCode"",
                       ""Email"", ""JoinDate"", ""LeaveDate"", ""Note""
                  FROM rt_realtor_info WHERE ""Id"" = @id LIMIT 1";
            var parameters = new List<NpgsqlParameter> { new NpgsqlParameter("@id", id) };
            var relator = await _dataService.QueryAsyncPg<Realtor>("DEV", loginSql, parameters);

            if (relator.Count > 0)
            {
                //    strHashPw = BCrypt.Net.BCrypt.HashPassword(pw, workFactor: 12); // workFactor: 10~14 권장 (성능에 따라)
                bool ok = BCrypt.Net.BCrypt.Verify(pw, relator[0].pw);

                if (ok)
                {
                    // 비활성화(탈퇴 처리)된 사무소 소속이면 로그인 차단 — 자동로그인/수동로그인 모두 막힘.
                    if (relator[0].offNo != null)
                    {
                        try
                        {
                            var offRows = await _dataService.QueryAsyncPg<UseYnRow>("DEV",
                                @"SELECT ""UseYn"" FROM ofc_realter_office WHERE ""OffNo"" = @off LIMIT 1",
                                new List<NpgsqlParameter> { new NpgsqlParameter("@off", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)relator[0].offNo ?? DBNull.Value } });
                            var useYn = offRows?.FirstOrDefault()?.UseYn;
                            if (string.Equals(useYn, "N", StringComparison.OrdinalIgnoreCase))
                                return "비활성화된 사무소입니다. 관리자에게 문의해 주세요.";
                        }
                        catch { /* 사무소 상태 조회 실패 시 로그인은 통과(과잉 차단 방지) */ }
                    }

                    // 멤버십 보유 여부(사무소 기준). 없어도 로그인은 허용하고 프론트에서 메뉴 잠금/안내.
                    //  · 소속중개사도 대표(같은 off_no)의 멤버십을 그대로 따름 → off_no 기준 판정.
                    try
                    {
                        var memParams = new List<NpgsqlParameter>
                        {
                            new NpgsqlParameter("@off", NpgsqlTypes.NpgsqlDbType.Bigint) { Value = (object?)relator[0].offNo ?? DBNull.Value }
                        };
                        var mem = await _dataService.QueryAsyncPg<dynamic>("DEV", "SELECT 1 AS ok FROM office_membership WHERE off_no = @off LIMIT 1", memParams);
                        relator[0].hasMembership = mem != null && mem.Any();
                    }
                    catch { relator[0].hasMembership = false; }

                    // 가입비(사무소 단위) 결제 여부
                    relator[0].hasEntryFee = await IsEntryFeePaid(relator[0].offNo);

                    // 로그인은 멤버십 여부와 무관하게 허용(소속중개사 포함). 멤버십 미가입 시 메뉴 접근만 프론트에서 제한.
                    // 혜택 정보 조회 후 추가
                    relator[0].eventInfo = await GetReferralBenefits(relator[0].rtNo);
                    // 대표중개사(RTTYP01)만 추천인 코드 노출 — 저장된 코드 우선, 없으면 PREFIX+순번(100001~) 영구 발급
                    if (relator[0].rtType == "RTTYP01" && string.IsNullOrWhiteSpace(relator[0].referralCode))
                        relator[0].referralCode = await EnsureReferralCode(relator[0].rtNo);
                    rtnVal = JsonConvert.SerializeObject(relator[0]);
                }
                else
                {
                    rtnVal = "비밀번호가 일치하지 않습니다.";
                }
            }
            else
            {
                rtnVal = "ID가 존재하지 않습니다.";
            }
            return rtnVal;
        }

        // 패스워드 변경 — 현재 패스워드 BCrypt 검증 후 Pw 컬럼만 갱신(다른 필드 영향 없음)
        public async Task<string?> ChangePassword(string id, string currentPw, string newPw)
        {
            var selParams = new List<NpgsqlParameter> { new NpgsqlParameter("@id", id) };
            var rows = await _dataService.QueryAsyncPg<Realtor>("DEV",
                @"SELECT ""RtNo"", ""Pw"" FROM rt_realtor_info WHERE ""Id"" = @id LIMIT 1", selParams);
            if (rows == null || rows.Count == 0) return "계정을 찾을 수 없습니다.";
            if (string.IsNullOrEmpty(rows[0].pw) || !BCrypt.Net.BCrypt.Verify(currentPw, rows[0].pw))
                return "현재 패스워드가 올바르지 않습니다.";

            string newHash = BCrypt.Net.BCrypt.HashPassword(newPw, workFactor: 12);
            var updParams = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("@pw", newHash),
                new NpgsqlParameter("@uid", id),
                new NpgsqlParameter("@id", id),
            };
            var ok = await _dataService.ExecuteNonQueryAsyncPg("DEV",
                @"UPDATE rt_realtor_info SET ""Pw"" = @pw, ""UpdId"" = @uid, ""UpdDt"" = NOW() WHERE ""Id"" = @id", updParams) > 0;
            return ok ? null : "패스워드 변경에 실패했습니다.";
        }

        public async Task<bool> CheckRealestaterId(string id)
        {
            bool rtnVal = false;

            // ID 존재 여부 — 인라인
            var parameters = new List<NpgsqlParameter> { new NpgsqlParameter("@id", id) };
            var relator = await _dataService.QueryAsyncPg<Realtor>("DEV", @"SELECT ""RtNo"" FROM rt_realtor_info WHERE ""Id"" = @id LIMIT 1", parameters);

            if (relator != null && relator.Count > 0)
                rtnVal = true;

            return rtnVal;
        }

        // 추천인 코드 검증 — 대표중개사(RTTYP01)를 referral_code / Id / 'RF'+RtNo 로 조회 후 성명·사무소명 반환
        public async Task<ReferralInfo?> GetReferralInfo(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return null;
            var ps = new List<NpgsqlParameter> { new NpgsqlParameter("@code", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = code.Trim() } };
            // referral_code 컬럼이 없는 환경도 있어 우선 컬럼 포함으로 시도, 실패 시 Id/RF 패턴만으로 재시도
            const string sqlWithCol = @"
                SELECT r.""RtNm"" AS ""RtNm"", o.""OffNm"" AS ""OffNm""
                  FROM rt_realtor_info r
                  LEFT JOIN ofc_realter_office o ON o.""OffNo"" = r.""OffNo""
                 WHERE r.""RtType"" = 'RTTYP01'
                   AND (r.referral_code = @code OR r.""Id"" = @code OR ('RF' || LPAD(r.""RtNo""::text, 6, '0')) = @code)
                 LIMIT 1";
            const string sqlNoCol = @"
                SELECT r.""RtNm"" AS ""RtNm"", o.""OffNm"" AS ""OffNm""
                  FROM rt_realtor_info r
                  LEFT JOIN ofc_realter_office o ON o.""OffNo"" = r.""OffNo""
                 WHERE r.""RtType"" = 'RTTYP01'
                   AND (r.""Id"" = @code OR ('RF' || LPAD(r.""RtNo""::text, 6, '0')) = @code)
                 LIMIT 1";
            try
            {
                var rows = await _dataService.QueryAsyncPg<ReferralInfo>("DEV", sqlWithCol, ps);
                return rows?.FirstOrDefault();
            }
            catch
            {
                var ps2 = new List<NpgsqlParameter> { new NpgsqlParameter("@code", NpgsqlTypes.NpgsqlDbType.Varchar) { Value = code.Trim() } };
                var rows = await _dataService.QueryAsyncPg<ReferralInfo>("DEV", sqlNoCol, ps2);
                return rows?.FirstOrDefault();
            }
        }
    }
}

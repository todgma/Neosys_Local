-- 업무일지 — 날짜별 변경 이력 통합(각 *_hist UNION, 시간순). 대상: 물건이면 소재지·동호, 고객이면 성함
--  (*_hist는 로컬 트리거가 기록 — LocalDatabase.InstallHistTriggers)
-- from legacy/API/Worklog/Controllers/WorkJournalController.cs GetActivity
SELECT u.src, u.label, u.logged_at, u.changed_by, u.log_type, u.pk,
       CASE
         WHEN u.src IN ('pt_sale', 'pt_sale_holder') THEN
           (SELECT trim(COALESCE(p.addr1, '') || ' ' || COALESCE(p.addr2, '') || ' ' || COALESCE(p.addr3, '') || ' ' || COALESCE(NULLIF(p.addr4, ''), p.pt_name, '')
                        || CASE WHEN COALESCE(p.dong, '') <> '' THEN ' ' || p.dong || '동' ELSE '' END
                        || CASE WHEN COALESCE(p.ho, '') <> '' THEN ' ' || p.ho || '호' ELSE '' END)
              FROM pt_sale p WHERE CAST(p.pt_no AS TEXT) = substr(u.pk, 1, instr(u.pk || ',', ',') - 1))
         WHEN u.src IN ('ct_cust', 'ct_cust_buyer') THEN
           (SELECT NULLIF(c.name, '') FROM ct_cust c WHERE CAST(c.cust_no AS TEXT) = substr(u.pk, 1, instr(u.pk || ',', ',') - 1))
         ELSE NULL
       END AS target
  FROM (
  SELECT 'rt_realtor_info' AS src, '직원정보' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("RtNo" AS TEXT), '')) AS pk
    FROM "rt_realtor_info_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'ofc_realter_office' AS src, '사무소정보' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("OffNo" AS TEXT), '')) AS pk
    FROM "ofc_realter_office_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'ofc_non_shared' AS src, '비공개설정' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("non_idx" AS TEXT), '')) AS pk
    FROM "ofc_non_shared_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'rt_menu_perm' AS src, '직원권한' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("rt_no" AS TEXT), '') || ',' || COALESCE(CAST("menu_key" AS TEXT), '')) AS pk
    FROM "rt_menu_perm_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'pt_sale' AS src, '물건' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("pt_no" AS TEXT), '')) AS pk
    FROM "pt_sale_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'pt_sale_holder' AS src, '물건 소유자' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("pt_no" AS TEXT), '') || ',' || COALESCE(CAST("holder_idx" AS TEXT), '')) AS pk
    FROM "pt_sale_holder_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'pt_land_additional' AS src, '토지 부가정보' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("land_id" AS TEXT), '')) AS pk
    FROM "pt_land_additional_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'pt_lease_status' AS src, '임대 현황' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("lease_id" AS TEXT), '')) AS pk
    FROM "pt_lease_status_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'pt_occupancy' AS src, '입주 정보' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("occupancy_no" AS TEXT), '')) AS pk
    FROM "pt_occupancy_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'pt_memo' AS src, '물건 메모' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("memo_no" AS TEXT), '')) AS pk
    FROM "pt_memo_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'pt_share' AS src, '물건 공유' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("share_no" AS TEXT), '')) AS pk
    FROM "pt_share_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'ct_cust' AS src, '고객' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("cust_no" AS TEXT), '')) AS pk
    FROM "ct_cust_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'ct_cust_buyer' AS src, '매수 고객' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("cust_no" AS TEXT), '') || ',' || COALESCE(CAST("seq" AS TEXT), '')) AS pk
    FROM "ct_cust_buyer_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'ct_interview' AS src, '상담' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("itv_no" AS TEXT), '')) AS pk
    FROM "ct_interview_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'ct_trd_area' AS src, '희망 지역' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("cust_no" AS TEXT), '') || ',' || COALESCE(CAST("seq" AS TEXT), '')) AS pk
    FROM "ct_trd_area_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'ct_trd_info' AS src, '거래 정보' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("trd_no" AS TEXT), '')) AS pk
    FROM "ct_trd_info_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'cn_contract_mgt' AS src, '계약관리' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("cn_no" AS TEXT), '')) AS pk
    FROM "cn_contract_mgt_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'cn_contract_spcl' AS src, '특약사항' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("cn_no" AS TEXT), '') || ',' || COALESCE(CAST("cns_no" AS TEXT), '')) AS pk
    FROM "cn_contract_spcl_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'contract_master' AS src, '계약 마스터' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("master_id" AS TEXT), '')) AS pk
    FROM "contract_master_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'contract_document' AS src, '계약 문서' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("doc_id" AS TEXT), '')) AS pk
    FROM "contract_document_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'rt_schedule' AS src, '일정' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("schedule_id" AS TEXT), '')) AS pk
    FROM "rt_schedule_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'rt_realtor_sche' AS src, '중개사 일정' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("sch_idx" AS TEXT), '')) AS pk
    FROM "rt_realtor_sche_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'rt_schedule_link' AS src, '일정 연결' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("link_id" AS TEXT), '')) AS pk
    FROM "rt_schedule_link_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'rt_note' AS src, '쪽지' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("note_id" AS TEXT), '')) AS pk
    FROM "rt_note_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'rt_note_share' AS src, '쪽지 공유' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("off_no" AS TEXT), '') || ',' || COALESCE(CAST("owner_id" AS TEXT), '') || ',' || COALESCE(CAST("partner_id" AS TEXT), '')) AS pk
    FROM "rt_note_share_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'vd_vendor_info' AS src, '협력업체' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("vendor_id" AS TEXT), '')) AS pk
    FROM "vd_vendor_info_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'vd_vendor_region' AS src, '협력업체 지역' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("vendor_region_id" AS TEXT), '')) AS pk
    FROM "vd_vendor_region_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  UNION ALL
  SELECT 'cs_customer_center' AS src, '고객센터 문의' AS label, logged_at, changed_by, log_type, (COALESCE(CAST("inquiry_id" AS TEXT), '')) AS pk
    FROM "cs_customer_center_hist" WHERE (changed_off = @session_off_no OR @session_off_no IS NULL) AND substr(logged_at, 1, 10) = @q_date AND (@q_user IS NULL OR changed_by = @q_user)
  ) u
 ORDER BY u.logged_at;

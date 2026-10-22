import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';
import { useAuthStore } from '../stores/authStore';

/**
 * 계약관리 백엔드 연동 — 계약서 마스터 + 부속문서.
 *  - 마스터: 계약서종류/물건유형/거래유형 + 표내용(doc). 목록/상세/저장/삭제.
 *  - 부속문서: 상단 버튼별 문서(kind) 저장/조회.
 */
const unwrap = (res) => res?.data ?? res;

// 저장 시 off_no/reg_id가 NULL로 저장돼 목록에서 빠지는 것 방지 — 로그인 유저로 기본값 보강
const authUser = () => { try { return useAuthStore.getState().user || {}; } catch { return {}; } };
const uidOf = (userId) => userId || authUser().userId || null;

export const contractApiService = {
  // 목록 (기간/검색/페이징)
  getList: async ({ frDate, toDate, offNo, rtNo, keyword, page = 1, pageSize = 200 } = {}) => {
    const params = { page, pageSize };
    if (frDate) params.frDate = frDate;
    if (toDate) params.toDate = toDate;
    if (offNo != null) params.offNo = offNo;
    if (rtNo != null) params.rtNo = rtNo;
    if (keyword) params.keyword = keyword;
    const d = unwrap(await apiClient.get(API_ENDPOINTS.contractMaster.list, params));
    return d?.items || d?.Items || [];
  },

  // 상세(마스터 + doc). doc은 JSON 문자열 → 파싱해서 반환
  getDetail: async (masterId) => {
    const d = unwrap(await apiClient.get(API_ENDPOINTS.contractMaster.detail(masterId)));
    if (!d) return null;
    let doc = {};
    try { doc = typeof d.doc === 'string' ? JSON.parse(d.doc || '{}') : (d.doc || {}); } catch { doc = {}; }
    return { ...d, doc };
  },

  // 마스터 저장(신규/수정 upsert). payload.masterId(UUID) 필수. payload.doc(객체) → JSON 문자열. masterId 반환
  saveMaster: async (payload) => {
    const u = authUser();
    const p = {
      ...payload,
      userId: payload.userId ?? u.userId ?? null,
      offNo: payload.offNo ?? u.offNo ?? null,
      rtNo: payload.rtNo ?? u.rtNo ?? null,
    };
    const body = { ...p, MasterId: p.masterId || null, Doc: JSON.stringify(p.doc || {}) };
    delete body.doc;
    // 백엔드 ContractMasterDto.RtNo 는 string 타입 → 숫자로 보내면 400. 문자열로 변환하고 소문자 키 제거.
    if ('rtNo' in body) { body.RtNo = body.rtNo != null && body.rtNo !== '' ? String(body.rtNo) : null; delete body.rtNo; }
    const d = unwrap(await apiClient.post(API_ENDPOINTS.contractMaster.save, body));
    return d?.masterId ?? d?.MasterId ?? null;
  },

  remove: async (masterId, userId) => unwrap(await apiClient.delete(`${API_ENDPOINTS.contractMaster.remove(masterId)}?userId=${encodeURIComponent(uidOf(userId) || '')}`)),

  // 거래신고 완료일 저장(마스터 report_done_date). date=null이면 완료 취소
  saveReportDate: async (masterId, date, userId) => unwrap(await apiClient.put(API_ENDPOINTS.contractMaster.reportDate(masterId), { ReportDoneDate: date || null, UserId: uidOf(userId) })),

  // 계약서 복사(계약서만, 부속문서 제외) → 새 masterId. 소재지에 '(복사본)' 부기
  copy: async (masterId, userId) => {
    const d = unwrap(await apiClient.post(`${API_ENDPOINTS.contractMaster.copy(masterId)}?userId=${encodeURIComponent(uidOf(userId) || '')}`, {}));
    return d?.masterId ?? d?.MasterId ?? null;
  },

  // 마스터 보장 — 파일(공제증서)만 첨부할 때 마스터 행 생성(소재지=(임시) + 메타). 유실 방지
  ensureMaster: async (masterId, meta = null, userId = null) => {
    const body = { UserId: uidOf(userId) };
    if (meta) {
      if (meta.contractKind != null) body.ContractKind = meta.contractKind;
      if (meta.docType != null) body.DocType = meta.docType;
      if (meta.tradeType != null) body.TradeType = meta.tradeType;
    }
    return unwrap(await apiClient.post(API_ENDPOINTS.contractMaster.ensure(masterId), body));
  },
  // 부속문서 저장(kind, data객체). meta={contractKind,docType,tradeType} 전달 시
  //  계약서 미저장 상태라도 마스터에 현재 계약 메타 기록(소재지=(임시))
  saveDocument: async (masterId, kind, data, userId, meta = null) => {
    const body = { Data: JSON.stringify(data || {}), UserId: uidOf(userId) };
    if (meta) {
      if (meta.contractKind != null) body.ContractKind = meta.contractKind;
      if (meta.docType != null) body.DocType = meta.docType;
      if (meta.tradeType != null) body.TradeType = meta.tradeType;
    }
    return unwrap(await apiClient.put(API_ENDPOINTS.contractMaster.docSave(masterId, kind), body));
  },
  // 부속문서 조회(kind) → data 객체
  getDocument: async (masterId, kind) => {
    const d = unwrap(await apiClient.get(API_ENDPOINTS.contractMaster.docGet(masterId, kind)));
    if (!d) return null;
    let data = {};
    try { data = typeof d.data === 'string' ? JSON.parse(d.data || '{}') : (d.data || {}); } catch { data = {}; }
    return data;
  },
  getDocumentKinds: async (masterId) => {
    const d = unwrap(await apiClient.get(API_ENDPOINTS.contractMaster.docKinds(masterId)));
    return d?.kinds || [];
  },
};

export default contractApiService;

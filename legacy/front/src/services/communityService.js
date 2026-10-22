import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

/**
 * 커뮤니티 게시판 서비스 — 공지사항/구인구직/점포매수매도 공용.
 *  백엔드: /api/community (list/detail/create/remove)
 */
// 백엔드 DTO의 rt_no는 VARCHAR(string?) → 숫자로 보내면 모델 바인딩 실패(400). 문자열로 강제 변환.
const normalizeRtNo = (payload) => (
  payload && payload.rtNo != null ? { ...payload, rtNo: String(payload.rtNo) } : payload
);

export const communityService = {
  // 목록 (탭/검색어)
  getList: async (tab, q) => {
    const params = {};
    if (tab) params.tab = tab;
    if (q) params.q = q;
    const res = await apiClient.get(API_ENDPOINTS.community.list, params);
    return res?.data?.items ?? res?.data?.Items ?? [];
  },
  // 상세 (조회수 +1)
  getDetail: async (postId, viewerId) => {
    const res = await apiClient.get(API_ENDPOINTS.community.detail(postId), viewerId ? { viewerId } : {});
    return res?.data ?? null;
  },
  // 등록 (fields = 정형 항목 객체가 있으면 JSON 문자열로 변환)
  create: async (payload) => {
    const p = normalizeRtNo(payload);
    const body = p.fields && typeof p.fields === 'object' ? { ...p, fields: JSON.stringify(p.fields) } : p;
    const res = await apiClient.post(API_ENDPOINTS.community.create, body);
    return res?.data ?? res;
  },
  // 삭제
  remove: async (postId) => {
    const res = await apiClient.delete(API_ENDPOINTS.community.remove(postId));
    return res?.data ?? res;
  },

  // ── 구인·구직 게시판(정형 입력) ──
  // 목록 (kind: '구인'|'구직')
  getJobList: async (kind, q) => {
    const params = {};
    if (kind) params.kind = kind;
    if (q) params.q = q;
    const res = await apiClient.get(API_ENDPOINTS.community.jobList, params);
    return res?.data?.items ?? res?.data?.Items ?? [];
  },
  // 상세 (조회수 +1, 하루 1회 — viewerId 기준)
  getJobDetail: async (postId, viewerId) => {
    const res = await apiClient.get(API_ENDPOINTS.community.jobDetail(postId), viewerId ? { viewerId } : {});
    return res?.data ?? null;
  },
  // 등록 (fields = 정형 항목 객체)
  createJob: async (payload) => {
    const p = normalizeRtNo(payload);
    const body = { ...p, fields: JSON.stringify(p.fields || {}) };
    const res = await apiClient.post(API_ENDPOINTS.community.jobCreate, body);
    return res?.data ?? res;
  },
  // 삭제
  removeJob: async (postId) => {
    const res = await apiClient.delete(API_ENDPOINTS.community.jobRemove(postId));
    return res?.data ?? res;
  },
};

export default communityService;

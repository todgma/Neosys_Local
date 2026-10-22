import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

// 일괄변경요청 서비스 (고객센터와 분리된 rt_bulk_request 전용)
const unwrap = (res) => res?.data ?? res;

export const bulkRequestService = {
  // 접수(등록)
  create: async (data) => {
    const body = {
      UserId: data.userId ?? null,
      OffNo: data.offNo ?? null,
      Category: data.category ?? null,
      Title: data.title ?? null,
      Content: data.content ?? null,
      OfficeName: data.officeName ?? null,
      OfficeTel: data.officeTel ?? null,
      OfficeAddr: data.officeAddr ?? null,
      AgentName: data.agentName ?? null,
      AgentGrade: data.agentGrade ?? null,
      AgentPhone: data.agentPhone ?? null,
    };
    const d = unwrap(await apiClient.post(API_ENDPOINTS.bulkRequest.create, body));
    return d?.reqId ?? d?.ReqId ?? null;
  },

  // 목록: 본인(userId) 또는 전체(admin). status 필터 가능
  list: async ({ userId, status, offNo } = {}) => {
    const params = {};
    if (userId) params.userId = userId;
    if (status) params.status = status;
    if (offNo) params.offNo = offNo;
    const d = unwrap(await apiClient.get(API_ENDPOINTS.bulkRequest.list, params));
    return d?.items || [];
  },

  // 처리완료 + 코멘트(관리자)
  complete: async (reqId, answer, answerId) => {
    const d = unwrap(await apiClient.put(API_ENDPOINTS.bulkRequest.complete(reqId), { Answer: answer ?? null, AnswerId: answerId ?? null }));
    return d?.updated ?? d?.Updated ?? false;
  },
};

export default bulkRequestService;

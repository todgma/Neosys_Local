import apiClient from '../utils/apiClient';

// 엑셀 업로드 임시저장(스테이징) — 저장/목록/삭제. 확정은 기존 bulkUpload로 재전송 후 삭제.
const BASE = '/api/upload-staging';

export const uploadStagingService = {
  // items: [{ payload, label }]
  save: async ({ target, offNo = null, regId = null, items = [] }) => {
    const body = { Target: target, OffNo: offNo, RegId: regId, Items: items };
    const res = await apiClient.post(BASE, body);
    return res?.data ?? res;
  },
  list: async (target, offNo = null) => {
    const res = await apiClient.get(BASE, { target, offNo });
    return res?.data?.items ?? res?.items ?? [];
  },
  remove: async (id) => {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return res?.data ?? res;
  },
  removeMany: async (ids) => {
    const res = await apiClient.post(`${BASE}/delete-batch`, { Ids: ids });
    return res?.data ?? res;
  },
};

export default uploadStagingService;

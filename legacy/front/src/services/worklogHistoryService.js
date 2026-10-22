import apiClient from '../utils/apiClient';
import { API_BASE_URL } from '../config/apiEndpoints';

// 작업이력(메뉴별 스냅샷 변경이력) 조회 서비스
const BASE = `${API_BASE_URL}/api/worklog-history`;

export const worklogHistoryService = {
  // 메뉴(항목) 목록
  async getMenus() {
    const res = await apiClient.get(`${BASE}/menus`);
    return res?.data ?? res;
  },
  // 메뉴별 이력 조회
  //  params: { offNo, userId, from, to, page, size }
  async getHistory(menuKey, params = {}) {
    const clean = {};
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') clean[k] = v; });
    const res = await apiClient.get(`${BASE}/${encodeURIComponent(menuKey)}`, clean);
    return res?.data ?? res;
  },
};

export default worklogHistoryService;

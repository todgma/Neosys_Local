import apiClient from '../utils/apiClient';
import { API_BASE_URL } from '../config/apiEndpoints';

// 업무일지 저장/조회 + 공유설정 + 날짜별 이력(통합) 서비스
const BASE = `${API_BASE_URL}/api/worklog`;
const clean = (p = {}) => { const o = {}; Object.entries(p).forEach(([k, v]) => { if (v != null && v !== '') o[k] = v; }); return o; };

export const worklogService = {
  // 업무일지 단건 조회 → { item }
  async getJournal(userId, date) {
    const res = await apiClient.get(`${BASE}/journal`, clean({ userId, date }));
    return res?.data ?? res;
  },
  // 업무일지 저장(upsert)
  async saveJournal(body) {
    const res = await apiClient.post(`${BASE}/journal`, body);
    return res?.data ?? res;
  },
  // 월별 작성현황 → { items: [{ userId, date }] }
  async getStatus(offNo, year, month) {
    const res = await apiClient.get(`${BASE}/status`, clean({ offNo, year, month }));
    return res?.data ?? res;
  },
  // 날짜별 전 직원 이력(통합, 시간 오름차순) → { items: [{ loggedAt, changedBy, table, label, logType, pk }] }
  async getActivity(offNo, date, userId) {
    const res = await apiClient.get(`${BASE}/activity`, clean({ offNo, date, userId }));
    return res?.data ?? res;
  },
  // 오늘 업무 자동집계(hist 기반) → { summary }
  async getSummary(userId, date) {
    const res = await apiClient.get(`${BASE}/summary`, clean({ userId, date }));
    return res?.data ?? res;
  },
  // 공유설정 조회 → { shareAll: 'Y'|'N' }
  async getShare(offNo) {
    const res = await apiClient.get(`${BASE}/share`, clean({ offNo }));
    return res?.data ?? res;
  },
  // 공유설정 저장
  async setShare(offNo, shareAll, userId) {
    const res = await apiClient.post(`${BASE}/share`, { offNo, shareAll, userId });
    return res?.data ?? res;
  },
};

export default worklogService;

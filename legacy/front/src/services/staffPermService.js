import axios from 'axios';
import { API_BASE_URL } from '../config/apiEndpoints';

/**
 * 직원 메뉴 권한(rt_menu_perm) — 대시보드 메뉴 대상 체크박스 권한
 */
const unwrap = (res) => (res?.data?.data ?? res?.data ?? res);

export const staffPermService = {
  // 허용 메뉴 키 목록
  get: async (rtNo) => {
    try {
      const d = unwrap(await axios.get(`${API_BASE_URL}/api/staff-menu-perm/${rtNo}`));
      return d?.keys || [];
    } catch (e) { console.error('메뉴 권한 조회 실패:', e); return []; }
  },
  // 전체 교체 저장
  set: async (rtNo, keys, userId) => {
    return unwrap(await axios.put(`${API_BASE_URL}/api/staff-menu-perm/${rtNo}`, { Keys: keys, UserId: userId || null }));
  },
};

export default staffPermService;

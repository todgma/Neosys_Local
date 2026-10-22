import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

/**
 * 스티커 메모(대시보드 메모관리) — 사용자별 백엔드 저장(rt_sticky_memo)
 */
export const memoService = {
  // 목록 조회
  getList: async (userId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.memo.list, { UserId: userId });
      return { success: true, data: response.data || [] };
    } catch (error) {
      if (error.code === 'NOT_FOUND') return { success: true, data: [] };
      console.error('메모 목록 조회 실패:', error);
      return { success: false, data: [] };
    }
  },

  // 등록 → 생성된 메모(memoId 포함) 반환
  create: async ({ userId, content, color, sortOrder }) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.memo.create, {
        UserId: userId,
        Content: content ?? '',
        Color: color ?? null,
        SortOrder: sortOrder ?? 0,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('메모 등록 실패:', error);
      return { success: false, data: null };
    }
  },

  // 수정 (내용/색상)
  update: async (memoId, { content, color, sortOrder, userId }) => {
    try {
      const body = {};
      if (content !== undefined) body.Content = content;
      if (color !== undefined) body.Color = color;
      if (sortOrder !== undefined) body.SortOrder = sortOrder;
      if (userId !== undefined) body.UserId = userId;
      await apiClient.put(API_ENDPOINTS.memo.update(memoId), body);
      return { success: true };
    } catch (error) {
      console.error('메모 수정 실패:', error);
      return { success: false };
    }
  },

  // 삭제 (논리 삭제)
  delete: async (memoId, userId) => {
    try {
      await apiClient.delete(API_ENDPOINTS.memo.delete(memoId), { userId });
      return { success: true };
    } catch (error) {
      console.error('메모 삭제 실패:', error);
      return { success: false };
    }
  },
};

export default memoService;

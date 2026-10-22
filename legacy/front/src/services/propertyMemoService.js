import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

export const propertyMemoService = {
  // 메모 목록 조회 (날짜 내림차순)
  getMemoList: async (ptNo) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.propertyMemo.list(ptNo));
      return response;
    } catch (error) {
      console.error('메모 목록 조회 실패:', error);
      throw error;
    }
  },

  // 최신 메모 1건 조회 (목록용)
  getLatestMemo: async (ptNo) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.propertyMemo.latest(ptNo));
      return response;
    } catch (error) {
      console.error('최신 메모 조회 실패:', error);
      throw error;
    }
  },

  // 메모 등록
  createMemo: async (ptNo, memoData) => {
    try {
      const payload = {
        MemoDate: memoData.memoDate,
        MemoContent: memoData.memoContent,
        UserId: memoData.userId,
      };
      const response = await apiClient.post(API_ENDPOINTS.propertyMemo.create(ptNo), payload);
      return response;
    } catch (error) {
      console.error('메모 등록 실패:', error);
      throw error;
    }
  },

  // 메모 수정
  updateMemo: async (ptNo, memoNo, memoData) => {
    try {
      const payload = {
        MemoDate: memoData.memoDate,
        MemoContent: memoData.memoContent,
      };
      const response = await apiClient.put(API_ENDPOINTS.propertyMemo.update(ptNo, memoNo), payload);
      return response;
    } catch (error) {
      console.error('메모 수정 실패:', error);
      throw error;
    }
  },

  // 메모 삭제
  deleteMemo: async (ptNo, memoNo) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.propertyMemo.delete(ptNo, memoNo));
      return response;
    } catch (error) {
      console.error('메모 삭제 실패:', error);
      throw error;
    }
  },
};

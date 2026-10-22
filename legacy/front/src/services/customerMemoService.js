import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

// 고객 상담메모 (pt_memo + cust_no)
export const customerMemoService = {
  getMemoList: async (custNo) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.customer.memoList(custNo));
      return response;
    } catch (error) {
      console.error('상담메모 목록 조회 실패:', error);
      throw error;
    }
  },

  createMemo: async (custNo, memoData) => {
    try {
      const payload = {
        MemoDate: memoData.memoDate,
        MemoContent: memoData.memoContent,
        UserId: memoData.userId,
      };
      const response = await apiClient.post(API_ENDPOINTS.customer.memoCreate(custNo), payload);
      return response;
    } catch (error) {
      console.error('상담메모 등록 실패:', error);
      throw error;
    }
  },

  updateMemo: async (custNo, memoNo, memoData) => {
    try {
      const payload = {
        MemoDate: memoData.memoDate,
        MemoContent: memoData.memoContent,
      };
      const response = await apiClient.put(API_ENDPOINTS.customer.memoUpdate(custNo, memoNo), payload);
      return response;
    } catch (error) {
      console.error('상담메모 수정 실패:', error);
      throw error;
    }
  },

  deleteMemo: async (custNo, memoNo) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.customer.memoDelete(custNo, memoNo));
      return response;
    } catch (error) {
      console.error('상담메모 삭제 실패:', error);
      throw error;
    }
  },
};

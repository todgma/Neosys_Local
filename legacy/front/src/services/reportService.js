import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

export const reportService = {
  // 보고서 생성 (+ 고객 배포)
  create: async (reportData, userId) => {
    try {
      const url = userId
        ? `${API_ENDPOINTS.report.create}?userId=${encodeURIComponent(userId)}`
        : API_ENDPOINTS.report.create;
      const response = await apiClient.post(url, reportData);
      return response;
    } catch (error) {
      console.error('보고서 생성 실패:', error);
      throw error;
    }
  },

  getDetail: async (reportNo) => {
    try {
      return await apiClient.get(API_ENDPOINTS.report.detail(reportNo));
    } catch (error) {
      console.error('보고서 조회 실패:', error);
      throw error;
    }
  },

  getByCustomer: async (custNo) => {
    try {
      return await apiClient.get(API_ENDPOINTS.report.byCustomer(custNo));
    } catch (error) {
      console.error('고객 보고서 목록 조회 실패:', error);
      throw error;
    }
  },

  getByProperty: async (ptNo) => {
    try {
      return await apiClient.get(API_ENDPOINTS.report.byProperty(ptNo));
    } catch (error) {
      console.error('물건 보고서 목록 조회 실패:', error);
      throw error;
    }
  },

  // 내가(사용자가) 만든 보고서 목록
  getByUser: async (userId) => {
    try {
      return await apiClient.get(API_ENDPOINTS.report.byUser(userId));
    } catch (error) {
      console.error('사용자 보고서 목록 조회 실패:', error);
      throw error;
    }
  },

  attachCustomers: async (reportNo, custNos, userId) => {
    try {
      const url = userId
        ? `${API_ENDPOINTS.report.attachCustomers(reportNo)}?userId=${encodeURIComponent(userId)}`
        : API_ENDPOINTS.report.attachCustomers(reportNo);
      return await apiClient.post(url, custNos);
    } catch (error) {
      console.error('보고서 고객 배포 실패:', error);
      throw error;
    }
  },

  // 보고서 삭제
  delete: async (reportNo, userId) => {
    try {
      const url = userId
        ? `${API_ENDPOINTS.report.remove(reportNo)}?userId=${encodeURIComponent(userId)}`
        : API_ENDPOINTS.report.remove(reportNo);
      return await apiClient.delete(url);
    } catch (error) {
      console.error('보고서 삭제 실패:', error);
      throw error;
    }
  },

  // 보고서별 공유(고객) 이력
  getShares: async (reportNo) => {
    try {
      return await apiClient.get(API_ENDPOINTS.report.shares(reportNo));
    } catch (error) {
      console.error('보고서 공유이력 조회 실패:', error);
      throw error;
    }
  },
};

import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

export const layoutService = {
  // 동 목록 조회
  getDongList: async (danjiCode) => {
    try {
      const data = await apiClient.get(API_ENDPOINTS.layout.dongList(danjiCode));
      return data;
    } catch (error) {
      console.error('동 목록 조회 실패:', error);
      throw error;
    }
  },

  // 호 목록 조회
  getHoList: async (danjiCode, dongNo) => {
    try {
      const data = await apiClient.get(API_ENDPOINTS.layout.hoList(danjiCode, dongNo));
      return data;
    } catch (error) {
      console.error('호 목록 조회 실패:', error);
      throw error;
    }
  },

  // 점유현황 조회 (중개사무소 off_no 스코프)
  getOccupancyData: async (danjiCode, dongNo, offNo) => {
    try {
      const data = await apiClient.get(API_ENDPOINTS.layout.occupancyList(danjiCode, dongNo, offNo));
      return data;
    } catch (error) {
      console.error('점유현황 조회 실패:', error);
      throw error;
    }
  },

  // 점유현황 저장
  saveOccupancy: async (data) => {
    try {
      const result = await apiClient.post(API_ENDPOINTS.layout.occupancySave, data);
      return result;
    } catch (error) {
      console.error('점유현황 저장 실패:', error);
      throw error;
    }
  },

  // 전체 배치도 데이터 조회 (단지코드로 모든 동의 호 리스트 + 점유현황, 중개사무소 off_no 스코프)
  getAllLayoutData: async (danjiCode, offNo) => {
    try {
      const data = await apiClient.get(API_ENDPOINTS.layout.all(danjiCode, offNo));
      return data;
    } catch (error) {
      console.error('전체 배치도 데이터 조회 실패:', error);
      throw error;
    }
  },
};

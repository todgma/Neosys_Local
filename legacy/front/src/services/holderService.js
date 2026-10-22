import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

export const holderService = {
  // 소유주 정보 조회
  getList: async (ptNo, holderName, holderPhone, page = 1, pageSize = 20) => {
    try {
      const params = {
        Page: page,
        PageSize: pageSize,
      };

      if (ptNo) params.ptNo = ptNo;
      if (holderName) params.HolderName = holderName;
      if (holderPhone) params.HolderPhone = holderPhone;

      const response = await apiClient.get(API_ENDPOINTS.holder.list, params);
      return response;
    } catch (error) {
      console.error('소유주 정보 조회 실패:', error);
      throw error;
    }
  },

  // 소유주 정보 등록
  create: async (ptNo, userId, holderData) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.holder.create,
        holderData,
        {
          params: {
            PtNo: ptNo,
            UserId: userId,
          },
        }
      );
      return response;
    } catch (error) {
      console.error('소유주 정보 등록 실패:', error);
      throw error;
    }
  },

  // 소유주 정보 수정
  update: async (ptNo, idx, userId, holderData) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.holder.update(ptNo),
        holderData,
        {
          params: {
            Idx: idx,
            UserId: userId,
          },
        }
      );
      return response;
    } catch (error) {
      console.error('소유주 정보 수정 실패:', error);
      throw error;
    }
  },

  // 소유주 정보 삭제
  delete: async (ptNo, idx, userId) => {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.holder.delete(ptNo),
        {
          params: {
            Idx: idx,
            UserId: userId,
          },
        }
      );
      return response;
    } catch (error) {
      console.error('소유주 정보 삭제 실패:', error);
      throw error;
    }
  },
};
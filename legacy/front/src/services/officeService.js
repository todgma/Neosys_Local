import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

export const officeService = {
  /**
   * 사용자 사무실 정보 조회
   * @param {string} userId - 사용자 ID
   * @returns {Promise<Object>} 사무실 정보
   */
  async getOfficeByUser(userId) {
    return await apiHandler.handle(
      () => apiClient.get(API_ENDPOINTS.office.getByUser, { userId }),
      { defaultErrorMessage: '사무실 정보 조회에 실패했습니다.' }
    );
  },

  /**
   * 사무실 목록 조회
   * @param {number} offNo - 사무실 번호 (선택)
   * @param {string} offNm - 사무실 이름 (선택)
   * @returns {Promise<Object>} 사무실 목록
   */
  async getOfficeList(offNo = null, offNm = null) {
    const params = {};
    if (offNo) params.offNo = offNo;
    if (offNm) params.offNm = offNm;

    return await apiHandler.handle(
      () => apiClient.get(API_ENDPOINTS.office.list, params),
      { defaultErrorMessage: '사무실 목록 조회에 실패했습니다.' }
    );
  },

  /**
   * 사무실 정보 등록
   * @param {Object} officeData - 사무실 정보
   * @returns {Promise<Object>} 등록 결과
   */
  async createOffice(officeData) {
    return await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.office.create, officeData),
      { defaultErrorMessage: '사무실 등록에 실패했습니다.' }
    );
  },

  /**
   * 사무실 정보 수정
   * @param {number} offNo - 사무실 번호
   * @param {Object} officeData - 수정할 사무실 정보
   * @returns {Promise<Object>} 수정 결과
   */
  async updateOffice(offNo, officeData) {
    return await apiHandler.handle(
      () => apiClient.put(API_ENDPOINTS.office.update(offNo), officeData),
      { defaultErrorMessage: '사무실 정보 수정에 실패했습니다.' }
    );
  },

  /**
   * 사무실 정보 삭제
   * @param {number} offNo - 사무실 번호
   * @param {string} userId - 사용자 ID
   * @returns {Promise<Object>} 삭제 결과
   */
  async deleteOffice(offNo, userId) {
    return await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.office.delete(offNo), { userId }),
      { defaultErrorMessage: '사무실 삭제에 실패했습니다.' }
    );
  },

  /**
   * 인사말(사무소 공유) 저장 — 소속 전원 동일 인사말
   */
  async updateGreeting(offNo, greeting, userId) {
    return await apiHandler.handle(
      () => apiClient.put(`${API_ENDPOINTS.office.update(offNo)}/greeting`, { Greeting: greeting, UserId: userId }),
      { defaultErrorMessage: '인사말 저장에 실패했습니다.' }
    );
  },
};

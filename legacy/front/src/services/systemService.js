import axios from 'axios';
import { API_BASE_URL } from '../config/apiEndpoints';

/**
 * System API 서비스
 */
const systemService = {
  /**
   * 공지사항 목록 조회 (공개된 공지사항만)
   * @param {string} category - 카테고리 필터
   * @param {number} pageNumber - 페이지 번호 (기본값: 1)
   * @param {number} rowsPerPage - 페이지당 행 수 (기본값: 10)
   * @returns {Promise<Object>} 공지사항 목록
   */
  async getNotices(category = null, pageNumber = 1, rowsPerPage = 10) {
    try {
      const params = {
        pageNumber,
        rowsPerPage,
      };

      if (category) {
        params.category = category;
      }

      const response = await axios.get(`${API_BASE_URL}/api/system/notices`, {
        params,
      });

      return response.data;
    } catch (error) {
      console.error('공지사항 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 공지사항 상세 조회
   * @param {number} noticeId - 공지사항 ID
   * @returns {Promise<Object>} 공지사항 상세 정보
   */
  async getNoticeDetail(noticeId, viewerId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/system/notices/${noticeId}`, { params: viewerId ? { viewerId } : {} });
      return response.data;
    } catch (error) {
      console.error('공지사항 상세 조회 실패:', error);
      throw error;
    }
  },
};

export default systemService;

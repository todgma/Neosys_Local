import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

class NoticeService {
  /**
   * 공지사항 목록 조회 (페이징)
   * GET /api/admin/notices?noticeId={noticeId}&category={category}&isPublic={isPublic}&pageNumber={pageNumber}&rowsPerPage={rowsPerPage}
   */
  async getNoticeList(noticeId = null, category = null, isPublic = null, pageNumber = 1, rowsPerPage = 10) {
    const params = { pageNumber, rowsPerPage };
    if (noticeId) params.noticeId = noticeId;
    if (category) params.category = category;
    if (isPublic) params.isPublic = isPublic;

    try {
      const response = await apiClient.get(API_ENDPOINTS.notice.list, params);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // NOT_FOUND는 빈 목록으로 처리
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { notices: [], totalPages: 1 },
        };
      }

      // 다른 에러는 메시지 표시하고 throw
      apiHandler.showError(error, '공지사항 목록 조회에 실패했습니다.');
      throw error;
    }
  }
}

export const noticeService = new NoticeService();

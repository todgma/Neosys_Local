import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

class InquiryService {
  /**
   * 고객센터 문의 목록 조회 (페이징)
   * GET /api/admin/inquiries?inquiryId={inquiryId}&userId={userId}&category={category}&status={status}&pageNumber={pageNumber}&rowsPerPage={rowsPerPage}
   */
  async getInquiryList(inquiryId = null, userId = null, category = null, status = null, pageNumber = 1, rowsPerPage = 10) {
    const params = { pageNumber, rowsPerPage };
    if (inquiryId) params.inquiryId = inquiryId;
    if (userId) params.userId = userId;
    if (category) params.category = category;
    if (status) params.status = status;

    try {
      const response = await apiClient.get(API_ENDPOINTS.inquiry.list, params);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // NOT_FOUND는 빈 목록으로 처리
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { inquiries: [], totalPages: 1 },
        };
      }

      // 다른 에러는 메시지 표시하고 throw
      apiHandler.showError(error, '문의 목록 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 고객센터 문의 등록
   * POST /api/admin/inquiries
   */
  async createInquiry(inquiryData) {
    const requestData = {};

    // null이 아닌 값만 포함 (PascalCase로 변환)
    if (inquiryData.userId !== undefined && inquiryData.userId !== null)
      requestData.UserId = inquiryData.userId;
    if (inquiryData.name !== undefined && inquiryData.name !== null)
      requestData.Name = inquiryData.name;
    if (inquiryData.email !== undefined && inquiryData.email !== null)
      requestData.Email = inquiryData.email;
    if (inquiryData.phone !== undefined && inquiryData.phone !== null)
      requestData.Phone = inquiryData.phone;
    if (inquiryData.category !== undefined && inquiryData.category !== null)
      requestData.Category = inquiryData.category;
    if (inquiryData.title !== undefined && inquiryData.title !== null)
      requestData.Title = inquiryData.title;
    if (inquiryData.content !== undefined && inquiryData.content !== null)
      requestData.Content = inquiryData.content;
    if (inquiryData.sortOrder !== undefined && inquiryData.sortOrder !== null)
      requestData.SortOrder = parseInt(inquiryData.sortOrder);
    if (inquiryData.regId !== undefined && inquiryData.regId !== null)
      requestData.RegId = inquiryData.regId;

    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.inquiry.create, requestData),
      { defaultErrorMessage: '문의 등록에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }
}

export const inquiryService = new InquiryService();

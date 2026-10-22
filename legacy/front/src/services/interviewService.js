import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

class InterviewService {
  /**
   * 고객상담 목록 조회 (페이징)
   * GET /api/Interview?ItvFrDate={ItvFrDate}&ItvToDate={ItvToDate}&ItvNo={ItvNo}&CustName={CustName}&ItvContent={ItvContent}&ItvMemo={ItvMemo}&VendorId={VendorId}&Page={Page}&PageSize={PageSize}
   */
  async getInterviewList(params = {}) {
    const {
      itvFrDate,
      itvToDate,
      itvNo = null,
      custName = null,
      itvContent = null,
      itvMemo = null,
      vendorId = null,
      page = 1,
      pageSize = 20
    } = params;

    const queryParams = {
      ItvFrDate: itvFrDate,
      ItvToDate: itvToDate,
      Page: page,
      PageSize: pageSize
    };

    if (itvNo) queryParams.ItvNo = itvNo;
    if (custName) queryParams.CustName = custName;
    if (itvContent) queryParams.ItvContent = itvContent;
    if (itvMemo) queryParams.ItvMemo = itvMemo;
    if (vendorId) queryParams.VendorId = vendorId;

    try {
      const response = await apiClient.get(API_ENDPOINTS.interview.list, queryParams);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // NOT_FOUND는 빈 목록으로 처리
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { interviews: [], totalPages: 1 },
        };
      }

      // 다른 에러는 메시지 표시하고 throw
      apiHandler.showError(error, '상담 목록 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 고객의 상담이력 (cust_no 기준) — 고객폼용
   */
  async getByCustomer(custNo) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.interview.byCustomer(custNo));
      return { success: true, data: response.data };
    } catch (error) {
      if (error.code === 'NOT_FOUND') return { success: true, data: { interviews: [] } };
      throw error;
    }
  }

  /**
   * 물건의 상담이력 (pt_no 기준) — 물건폼용
   */
  async getByProperty(ptNo) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.interview.byProperty(ptNo));
      return { success: true, data: response.data };
    } catch (error) {
      if (error.code === 'NOT_FOUND') return { success: true, data: { interviews: [] } };
      throw error;
    }
  }

  /**
   * 협력업체의 상담이력 (vendor_id 기준) — 협력업체폼용
   */
  async getByVendor(vendorId) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.interview.byVendor(vendorId));
      return { success: true, data: response.data };
    } catch (error) {
      if (error.code === 'NOT_FOUND') return { success: true, data: { interviews: [] } };
      throw error;
    }
  }

  /**
   * 고객상담 등록
   * POST /api/Interview
   */
  async createInterview(interviewData) {
    const requestData = {
      ItvType: interviewData.itvType,
      ItvDate: interviewData.itvDate,
      CustName: interviewData.custName,
    };

    // 선택적 필드
    if (interviewData.custNo !== undefined && interviewData.custNo !== null)
      requestData.CustNo = parseInt(interviewData.custNo);
    if (interviewData.custPhone) requestData.CustPhone = interviewData.custPhone;
    if (interviewData.ptNo !== undefined && interviewData.ptNo !== null)
      requestData.PtNo = parseInt(interviewData.ptNo);
    if (interviewData.itvContent) requestData.ItvContent = interviewData.itvContent;
    if (interviewData.itvMemo) requestData.ItvMemo = interviewData.itvMemo;
    if (interviewData.rtNo !== undefined && interviewData.rtNo !== null)
      requestData.RtNo = parseInt(interviewData.rtNo);
    if (interviewData.offNo !== undefined && interviewData.offNo !== null)
      requestData.OffNo = parseInt(interviewData.offNo);
    if (interviewData.vendorId !== undefined && interviewData.vendorId !== null)
      requestData.VendorId = parseInt(interviewData.vendorId);
    if (interviewData.contactName !== undefined) requestData.ContactName = interviewData.contactName;
    if (interviewData.contactPhone !== undefined) requestData.ContactPhone = interviewData.contactPhone;
    if (interviewData.userId) requestData.UserId = interviewData.userId;

    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.interview.create, requestData),
      { defaultErrorMessage: '상담 등록에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 고객상담 수정
   * PUT /api/Interview/{itvNo}
   */
  async updateInterview(itvNo, interviewData) {
    const requestData = {};

    // null이 아닌 값만 포함
    if (interviewData.itvType) requestData.ItvType = interviewData.itvType;
    if (interviewData.itvDate) requestData.ItvDate = interviewData.itvDate;
    if (interviewData.custNo !== undefined && interviewData.custNo !== null)
      requestData.CustNo = parseInt(interviewData.custNo);
    if (interviewData.custName) requestData.CustName = interviewData.custName;
    if (interviewData.custPhone) requestData.CustPhone = interviewData.custPhone;
    if (interviewData.ptNo !== undefined && interviewData.ptNo !== null)
      requestData.PtNo = parseInt(interviewData.ptNo);
    if (interviewData.itvContent) requestData.ItvContent = interviewData.itvContent;
    if (interviewData.itvMemo) requestData.ItvMemo = interviewData.itvMemo;
    if (interviewData.rtNo !== undefined && interviewData.rtNo !== null)
      requestData.RtNo = parseInt(interviewData.rtNo);
    if (interviewData.offNo !== undefined && interviewData.offNo !== null)
      requestData.OffNo = parseInt(interviewData.offNo);
    if (interviewData.vendorId !== undefined && interviewData.vendorId !== null)
      requestData.VendorId = parseInt(interviewData.vendorId);
    if (interviewData.contactName !== undefined) requestData.ContactName = interviewData.contactName;
    if (interviewData.contactPhone !== undefined) requestData.ContactPhone = interviewData.contactPhone;
    if (interviewData.userId) requestData.UserId = interviewData.userId;

    const response = await apiHandler.handle(
      () => apiClient.put(API_ENDPOINTS.interview.update(itvNo), requestData),
      { defaultErrorMessage: '상담 수정에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 고객상담 삭제
   * DELETE /api/Interview/{itvNo}?userId={userId}
   */
  async deleteInterview(itvNo, userId) {
    const response = await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.interview.delete(itvNo), { userId }),
      { defaultErrorMessage: '상담 삭제에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }
}

export const interviewService = new InterviewService();

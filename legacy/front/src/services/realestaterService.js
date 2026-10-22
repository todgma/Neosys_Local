import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

class RealestaterService {
  /**
   * 중개인 목록 조회
   * GET /api/realestaters?rtNo={rtNo}&offNo={offNo}
   */
  async getList(rtNo = null, offNo = null) {
    const params = {};
    if (rtNo) params.rtNo = rtNo;
    if (offNo) params.offNo = offNo;

    const response = await apiHandler.handle(
      () => apiClient.get(API_ENDPOINTS.realestater.list, params),
      { defaultErrorMessage: '중개인 목록 조회에 실패했습니다.' }
    );

    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * 중개인 상세 조회 (단건)
   * GET /api/realestaters/{rtNo}
   */
  async getDetail(rtNo) {
    const response = await apiHandler.handle(
      () => apiClient.get(API_ENDPOINTS.realestater.detail(rtNo)),
      { defaultErrorMessage: '중개인 상세 조회에 실패했습니다.' }
    );

    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * 중개인 등록
   * POST /api/realestaters
   */
  async create(userData) {
    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.realestater.create, {
        RtType: userData.rtType || 'RTTYP01',
        RtNm: userData.rtNm,
        RtTel: userData.rtTel || null,
        RtRegNo: userData.rtRegNo || null,
        OffNo: userData.offNo ? parseInt(userData.offNo) : null,
        Grade: userData.grade || null,
        Id: userData.id,
        Pw: userData.pw,
        UserId: userData.userId || userData.id,
        // 직원 필드(이메일/입사일/퇴사일/비고)
        Email: userData.email || null,
        JoinDate: userData.joinDate || null,
        LeaveDate: userData.leaveDate || null,
        Note: userData.note || null,
      }),
      { defaultErrorMessage: '중개인 등록에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 중개인 수정
   * PUT /api/realestaters/{rtNo}
   */
  async update(rtNo, userData) {
    const requestData = {};

    // null이 아닌 값만 포함 (PascalCase로 변환)
    if (userData.rtType !== undefined && userData.rtType !== null) requestData.RtType = userData.rtType;
    if (userData.rtNm !== undefined && userData.rtNm !== null) requestData.RtNm = userData.rtNm;
    if (userData.rtTel !== undefined && userData.rtTel !== null) requestData.RtTel = userData.rtTel;
    if (userData.rtRegNo !== undefined && userData.rtRegNo !== null) requestData.RtRegNo = userData.rtRegNo;
    if (userData.offNo !== undefined && userData.offNo !== null) requestData.OffNo = parseInt(userData.offNo);
    if (userData.grade !== undefined && userData.grade !== null) requestData.Grade = userData.grade;
    if (userData.id !== undefined && userData.id !== null) requestData.Id = userData.id;
    if (userData.pw !== undefined && userData.pw !== null) requestData.Pw = userData.pw;
    if (userData.userId !== undefined && userData.userId !== null) requestData.UserId = userData.userId;
    // 직원 필드 — 빈 문자열도 전송(수정에서 비우기 허용)
    if (userData.email !== undefined) requestData.Email = userData.email;
    if (userData.joinDate !== undefined) requestData.JoinDate = userData.joinDate;
    if (userData.leaveDate !== undefined) requestData.LeaveDate = userData.leaveDate;
    if (userData.note !== undefined) requestData.Note = userData.note;

    const response = await apiHandler.handle(
      () => apiClient.put(API_ENDPOINTS.realestater.update(rtNo), requestData),
      { defaultErrorMessage: '중개인 수정에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 중개인 삭제
   * DELETE /api/realestaters/{rtNo}?userId={userId}
   */
  async delete(rtNo, userId) {
    const response = await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.realestater.delete(rtNo), { userId }),
      { defaultErrorMessage: '중개인 삭제에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }
}

export const realestaterService = new RealestaterService();

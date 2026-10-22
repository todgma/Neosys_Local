import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

class ScheduleService {
  /**
   * 일정 목록 조회
   * GET /api/Schedule?StartDate={}&EndDate={}&ScheduleId={}&ScopeDiv={}&OwnerUserId={}&OfficeId={}&Page={}&PageSize={}
   */
  async getScheduleList(params = {}) {
    const {
      startDate,
      endDate,
      scheduleId = null,
      scopeDiv = null,
      ownerUserId = null,
      officeId = null,
      page = 1,
      pageSize = 100
    } = params;

    const queryParams = {
      StartDate: startDate,
      EndDate: endDate,
      Page: page,
      PageSize: pageSize
    };

    if (scheduleId) queryParams.ScheduleId = scheduleId;
    if (scopeDiv) queryParams.ScopeDiv = scopeDiv;
    if (ownerUserId) queryParams.OwnerUserId = ownerUserId;
    if (officeId) queryParams.OfficeId = officeId;

    try {
      const response = await apiClient.get(API_ENDPOINTS.schedule.list, queryParams);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // NOT_FOUND는 빈 목록으로 처리
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { schedules: [], totalPages: 1 },
        };
      }

      // 다른 에러는 메시지 표시하고 throw
      apiHandler.showError(error, '일정 목록 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 물건번호로 연동된 일정 조회
   * GET /api/Schedule/by-property/{ptNo}
   */
  async getSchedulesByProperty(ptNo) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.schedule.byProperty(ptNo));
      return { success: true, data: response.data };
    } catch (error) {
      if (error.code === 'NOT_FOUND') return { success: true, data: { schedules: [] } };
      return { success: false, data: { schedules: [] } };
    }
  }

  /**
   * 일정 등록
   * POST /api/Schedule
   */
  async createSchedule(scheduleData) {
    const requestData = {
      ScopeDiv: scheduleData.scopeDiv,
      OwnerUserId: scheduleData.ownerUserId,
      StartAt: scheduleData.startAt,
      AllDay: scheduleData.allDay || false,
      IsShared: scheduleData.isShared || false,
      IsPrivate: scheduleData.isPrivate || false,
    };

    // 선택적 필드
    if (scheduleData.officeId) requestData.OfficeId = scheduleData.officeId;
    if (scheduleData.title) requestData.Title = scheduleData.title;
    if (scheduleData.content) requestData.Content = scheduleData.content;
    if (scheduleData.phone) requestData.Phone = scheduleData.phone;
    if (scheduleData.location) requestData.Location = scheduleData.location;
    if (scheduleData.endAt) requestData.EndAt = scheduleData.endAt;
    if (scheduleData.category) requestData.Category = scheduleData.category;
    if (scheduleData.amount !== undefined && scheduleData.amount !== '' && scheduleData.amount !== null) requestData.Amount = Number(scheduleData.amount);
    if (scheduleData.contactName) requestData.ContactName = scheduleData.contactName;
    if (scheduleData.contactRole) requestData.ContactRole = scheduleData.contactRole;
    if (scheduleData.phone2) requestData.Phone2 = scheduleData.phone2;
    if (scheduleData.contactName2) requestData.ContactName2 = scheduleData.contactName2;
    if (scheduleData.contactRole2) requestData.ContactRole2 = scheduleData.contactRole2;
    if (scheduleData.userId) requestData.UserId = scheduleData.userId;
    if (scheduleData.links) requestData.Links = scheduleData.links;

    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.schedule.create, requestData),
      { defaultErrorMessage: '일정 등록에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 일정 수정
   * PUT /api/Schedule/{scheduleId}
   */
  async updateSchedule(scheduleId, scheduleData) {
    const requestData = {};

    // null이 아닌 값만 포함
    if (scheduleData.scopeDiv) requestData.ScopeDiv = scheduleData.scopeDiv;
    if (scheduleData.ownerUserId) requestData.OwnerUserId = scheduleData.ownerUserId;
    if (scheduleData.officeId) requestData.OfficeId = scheduleData.officeId;
    if (scheduleData.title) requestData.Title = scheduleData.title;
    if (scheduleData.content) requestData.Content = scheduleData.content;
    if (scheduleData.phone) requestData.Phone = scheduleData.phone;
    if (scheduleData.location) requestData.Location = scheduleData.location;
    if (scheduleData.startAt) requestData.StartAt = scheduleData.startAt;
    if (scheduleData.endAt) requestData.EndAt = scheduleData.endAt;
    if (scheduleData.allDay !== undefined) requestData.AllDay = scheduleData.allDay;
    if (scheduleData.isShared !== undefined) requestData.IsShared = scheduleData.isShared;
    if (scheduleData.isPrivate !== undefined) requestData.IsPrivate = scheduleData.isPrivate;
    if (scheduleData.category) requestData.Category = scheduleData.category;
    if (scheduleData.amount !== undefined && scheduleData.amount !== '' && scheduleData.amount !== null) requestData.Amount = Number(scheduleData.amount);
    if (scheduleData.contactName) requestData.ContactName = scheduleData.contactName;
    if (scheduleData.contactRole) requestData.ContactRole = scheduleData.contactRole;
    if (scheduleData.phone2) requestData.Phone2 = scheduleData.phone2;
    if (scheduleData.contactName2) requestData.ContactName2 = scheduleData.contactName2;
    if (scheduleData.contactRole2) requestData.ContactRole2 = scheduleData.contactRole2;
    if (scheduleData.userId) requestData.UserId = scheduleData.userId;
    if (scheduleData.links) requestData.Links = scheduleData.links;

    const response = await apiHandler.handle(
      () => apiClient.put(API_ENDPOINTS.schedule.update(scheduleId), requestData),
      { defaultErrorMessage: '일정 수정에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 일정 삭제
   * DELETE /api/Schedule/{scheduleId}?userId={userId}
   */
  async deleteSchedule(scheduleId, userId) {
    const response = await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.schedule.delete(scheduleId), { userId }),
      { defaultErrorMessage: '일정 삭제에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }
}

export const scheduleService = new ScheduleService();
export default scheduleService;

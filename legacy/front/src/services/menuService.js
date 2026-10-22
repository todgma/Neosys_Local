// src/services/MenuService.js
import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

class MenuService {
  /**
   * 사용자 메뉴 조회 (rtNo 기반)
   * GET /api/admin/menus/user?rtNo={rtNo}
   */
  async getMenuListByRtNo(rtNo) {
    if (rtNo === undefined || rtNo === null)
      throw new Error('rtNo는 필수 파라미터입니다.');

    const params = { rtNo };

    try {
      const response = await apiClient.get(API_ENDPOINTS.menu.userList, params);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // NOT_FOUND 에러는 빈 목록으로 처리 (에러 메시지 표시 안함)
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { menusRt: [] },
        };
      }

      // 다른 에러는 메시지 표시하고 throw
      apiHandler.showError(error, '사용자 메뉴 목록 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 전체 메뉴 조회
   * GET /api/admin/menus
   */
  async getMenuList() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.menu.list);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // NOT_FOUND 에러는 빈 목록으로 처리
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { menus: [] },
        };
      }

      // 다른 에러는 메시지 표시하고 throw
      apiHandler.showError(error, '메뉴 목록 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 사용자 메뉴 권한 등록
   * POST /api/menu/InsertMenuListRt
   */
  async createMenuPermissions(rtNo, permissions, userId) {
    if (!rtNo || !permissions || permissions.length === 0) {
      throw new Error('필수 파라미터가 누락되었습니다.');
    }

    const createMenusRt = permissions.map((p) => ({
      rtNo: rtNo,
      id: p.id,
      cYn: p.cYn || 'N',
      rYn: p.rYn || 'N',
      uYn: p.uYn || 'N',
      dYn: p.dYn || 'N',
      useYn: p.useYn || 'Y',
    }));

    const response = await apiHandler.handle(
      () => apiClient.post(
        API_ENDPOINTS.menu.userCreate,
        { createMenusRt },
        { params: { userId } }
      ),
      { defaultErrorMessage: '메뉴 권한 등록에 실패했습니다.' }
    );

    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * 사용자 메뉴 권한 수정
   * PUT /api/menu/UpdateMenuListRt
   */
  async updateMenuPermissions(rtNo, permissions, userId) {
    if (!rtNo || !permissions || permissions.length === 0) {
      throw new Error('필수 파라미터가 누락되었습니다.');
    }

    const updateMenusRt = permissions.map((p) => ({
      rtNo: rtNo,
      id: p.id,
      cYn: p.cYn || 'N',
      rYn: p.rYn || 'N',
      uYn: p.uYn || 'N',
      dYn: p.dYn || 'N',
      useYn: p.useYn || 'Y',
    }));

    const response = await apiHandler.handle(
      () => apiClient.put(
        API_ENDPOINTS.menu.userUpdate,
        { updateMenusRt },
        { params: { userId } }
      ),
      { defaultErrorMessage: '메뉴 권한 수정에 실패했습니다.' }
    );

    return {
      success: true,
      data: response.data,
    };
  }
}

export const menuService = new MenuService();
export default menuService;

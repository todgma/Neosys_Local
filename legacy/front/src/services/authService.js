import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';
import { useMenuStore } from '../stores/menuStore';

class AuthService {
  // 로그인 이력 기록(수동/자동) — IP는 서버에서 캡처. 실패해도 무시(fire-and-forget)
  async logLogin(userId, loginType = 'MANUAL') {
    if (!userId) return;
    try { await apiClient.post(API_ENDPOINTS.auth.loginLog, { userId, loginType }); } catch { /* noop */ }
  }

  async login(id, password) {
    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.auth.login, { Id: id, Pw: password }),
      { defaultErrorMessage: '로그인에 실패했습니다.' }
    );

    // 로그인 성공 - 응답 데이터에서 사용자 정보 추출
    // 백엔드에서 data가 문자열로 올 수 있으므로 파싱 처리
    let userData = response.data || {};
    if (typeof userData === 'string') {
      try {
        userData = JSON.parse(userData);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }

    // rtNo가 있으면 사용자 메뉴를 로드
    if (userData.rtNo) {
      try {
        await useMenuStore.getState().loadUserMenus(userData.rtNo);
        console.log('User menus loaded successfully');
      } catch (menuError) {
        console.error('Failed to load user menus:', menuError);
        // 메뉴 로드 실패해도 로그인은 계속 진행
      }
    }

    return {
      success: true,
      data: {
        user: {
          userId: userData.id || id,
          rtNo: userData.rtNo,
          rtType: userData.rtType,
          hasMembership: userData.hasMembership === true, // 멤버십(사무소) 보유 여부
          hasEntryFee: userData.hasEntryFee === true, // 가입비(사무소) 결제 여부
          referralCode: userData.referralCode, // 추천인 코드(대표중개사)
          rtNm: userData.rtNm,
          rtTel: userData.rtTel,
          rtRegNo: userData.rtRegNo,
          offNo: userData.offNo,
          grade: userData.grade,
          id: userData.id || id,
          email: userData.id || id,
          name: userData.rtNm || id,
          role: 'user',
          phone: userData.rtTel || '',
          department: '',
          avatar: '/avatars/default.jpg',
          createdAt: userData.regDt || new Date().toISOString(),
          updatedAt: userData.updDt || new Date().toISOString(),
        },
        token: `token-${id}-${Date.now()}`,
      },
    };
  }

  async register(userData) {
    await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.auth.register, {
        RtType: userData.rtType || 'RTTYP01',
        RtNm: userData.rtNm,
        RtTel: userData.rtTel || null,
        RtRegNo: userData.rtRegNo || null,
        OffNo: userData.offNo ? parseInt(userData.offNo) : null,
        Grade: userData.grade || null,
        Id: userData.id,
        Pw: userData.pw,
        UserId: userData.userId || userData.id,
        ReferralCode: userData.referralCode || null, // 추천인 코드
        // 사무소 정보(함께 등록 → ofc_realter_office)
        OffNm: userData.offNm || null,
        OffAddr: userData.offAddr || null,
        OffTel: userData.offTel || null,
        OffFax: userData.offFax || null,
        OffRegNo: userData.offRegNo || null,
        BizNo: userData.bizNo || null,
        // 사업자등록증(업로드 완료된 objectKey)
        BizObjectKey: userData.bizObjectKey || null,
        BizOrigName: userData.bizOrigName || null,
        BizContentType: userData.bizContentType || null,
        BizFileSize: userData.bizFileSize || null,
        BizExt: userData.bizExt || null,
        // 개설등록증(업로드 완료된 objectKey)
        OpenObjectKey: userData.openObjectKey || null,
        OpenOrigName: userData.openOrigName || null,
        OpenContentType: userData.openContentType || null,
        OpenFileSize: userData.openFileSize || null,
        OpenExt: userData.openExt || null,
      }),
      { defaultErrorMessage: '회원가입에 실패했습니다.' }
    );

    return {
      success: true,
      data: {
        user: {
          email: userData.id,
          name: userData.rtNm,
        },
      },
    };
  }

  async updateProfile(rtNo, userData) {
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

    const response = await apiHandler.handle(
      () => apiClient.put(`${API_ENDPOINTS.realestater.update}/${rtNo}`, requestData),
      { defaultErrorMessage: '회원정보 수정에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  async logout() {
    try {
      // 메뉴 스토어 초기화
      useMenuStore.getState().clearMenus();
      // 로컬 스토리지 정리는 store에서 처리
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async refreshToken(token) {
    return await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.auth.refresh, { token }),
      { defaultErrorMessage: '토큰 갱신에 실패했습니다.' }
    );
  }

  async checkDuplicateId(id) {
    const response = await apiHandler.handleSilent(
      () => apiClient.get(API_ENDPOINTS.auth.checkId, { id })
    );

    if (response.success) {
      return {
        success: true,
        available: true,
        message: '사용 가능한 아이디입니다.',
      };
    } else {
      return {
        success: false,
        available: false,
        message: response.error?.message || '이미 사용중인 아이디입니다.',
      };
    }
  }

  // 패스워드 변경 — 현재 패스워드 검증 후 변경 → { success, message }
  async changePassword(id, currentPw, newPw) {
    const response = await apiHandler.handleSilent(
      () => apiClient.post(API_ENDPOINTS.auth.changePassword, { Id: id, CurrentPw: currentPw, NewPw: newPw })
    );
    if (response.success) return { success: true, message: '패스워드가 변경되었습니다.' };
    return { success: false, message: response.error?.message || '패스워드 변경에 실패했습니다.' };
  }

  // 추천인 코드 검증 → { success, rtNm(대표자명), offNm(중개사무소명), message }
  async getReferralInfo(code) {
    const response = await apiHandler.handleSilent(
      () => apiClient.get(API_ENDPOINTS.auth.referralInfo, { code })
    );
    const d = response?.data;
    if (response?.success && d?.valid) {
      return { success: true, rtNm: d.rtNm || '', offNm: d.offNm || '' };
    }
    return { success: false, message: response?.error?.message || '유효하지 않은 추천인 코드입니다.' };
  }
}

export const authService = new AuthService();
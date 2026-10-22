import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

class HubService {
  /**
   * 공동중개망 목록 조회 (페이징)
   * GET /api/Hub
   */
  async getHubList(params = {}) {
    const {
      tradeId = null,
      tradeDiv = null,
      offNo = null,
      tradeState = null,
      custNo = null,
      ptNo = null,
      regDtFr = null,
      regDtTo = null,
      viewerOffNo = null,
      page = 1,
      pageSize = 20
    } = params;

    const queryParams = {
      Page: page,
      PageSize: pageSize
    };

    if (tradeId) queryParams.TradeId = tradeId;
    if (tradeDiv) queryParams.TradeDiv = tradeDiv;
    if (offNo) queryParams.OffNo = offNo;
    if (viewerOffNo) queryParams.ViewerOffNo = viewerOffNo;
    if (tradeState) queryParams.TradeState = tradeState;
    if (custNo) queryParams.CustNo = custNo;
    if (ptNo) queryParams.PtNo = ptNo;
    if (regDtFr) queryParams.RegDtFr = regDtFr;
    if (regDtTo) queryParams.RegDtTo = regDtTo;

    try {
      const response = await apiClient.get(API_ENDPOINTS.hub.list, queryParams);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // NOT_FOUND는 빈 목록으로 처리
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { items: [], totalCount: 0 },
        };
      }

      // 다른 에러는 메시지 표시하고 throw
      apiHandler.showError(error, '공동중개망 목록 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 최근 N개 공동중개망 조회
   * GET /api/Hub/recent
   */
  async getRecentHub(params = {}) {
    const {
      tradeDiv = null,
      offNo = null,
      tradeState = null,
      recentCnt = 10
    } = params;

    const queryParams = {
      RecentCnt: recentCnt
    };

    if (tradeDiv) queryParams.TradeDiv = tradeDiv;
    if (offNo) queryParams.OffNo = offNo;
    if (tradeState) queryParams.TradeState = tradeState;

    try {
      const response = await apiClient.get(API_ENDPOINTS.hub.recent, queryParams);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { items: [], totalCount: 0 },
        };
      }

      apiHandler.showError(error, '최근 공동중개망 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 공동중개망 신규 등록
   * POST /api/Hub
   */
  async createHub(hubData, userId, autoRegisterCustomer = false, autoRegisterProperty = false) {
    // 전체 페이로드 전송 (백엔드 DTO가 미지정 필드는 무시). 식별자는 문자열 필수.
    const requestData = {
      ...hubData,
      offNo: hubData.offNo != null && hubData.offNo !== '' ? String(hubData.offNo) : null,
      custNo: hubData.custNo != null && hubData.custNo !== '' ? String(hubData.custNo) : null,
      ptNo: hubData.ptNo != null && hubData.ptNo !== '' ? String(hubData.ptNo) : null,
      isCustRegistered: hubData.isCustRegistered || false,
      isPtRegistered: hubData.isPtRegistered || false,
      tradeState: hubData.tradeState || 'active',
      tradeStatus: hubData.tradeStatus || 'Y',
    };
    // 주소선택기 임시 필드/DTO 미존재 필드 제거
    ['addr1', 'addr2', 'addr3', 'addr4', 'addr5', 'bjdCode', 'danjiCode', 'rtNo', 'transmitDt', 'reportNo',
     'alreadyTransmitted', 'transmittedAt',
     // 호만 비공개(동은 저장/노출 허용)
     'pHo'].forEach((k) => { delete requestData[k]; });

    // apiClient.post(url, data, options) — 3번째 인자는 options라 쿼리스트링은 URL에 직접 부착
    const qs = new URLSearchParams({
      UserId: userId ?? '',
      AutoRegisterCustomer: String(autoRegisterCustomer),
      AutoRegisterProperty: String(autoRegisterProperty),
    }).toString();
    const createUrl = `${API_ENDPOINTS.hub.create}?${qs}`;

    const response = await apiHandler.handle(
      () => apiClient.post(createUrl, requestData),
      { defaultErrorMessage: '공동중개망 등록에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
      data: response.data,
    };
  }

  /**
   * 공동중개망 수정
   * PUT /api/Hub/{tradeId}
   */
  async updateHub(tradeId, hubData) {
    // 전체 페이로드 전송 (백엔드 DTO가 미지정 필드는 무시). 식별자는 문자열.
    const requestData = { ...hubData };
    if (requestData.offNo != null) requestData.offNo = String(requestData.offNo);
    if (requestData.custNo != null && requestData.custNo !== '') requestData.custNo = String(requestData.custNo);
    if (requestData.ptNo != null && requestData.ptNo !== '') requestData.ptNo = String(requestData.ptNo);
    // 주소선택기 임시 필드/DTO 미존재 필드 제거
    ['addr1', 'addr2', 'addr3', 'addr4', 'addr5', 'bjdCode', 'danjiCode', 'rtNo', 'transmitDt', 'reportNo',
     'alreadyTransmitted', 'transmittedAt',
     // 호만 비공개(동은 저장/노출 허용)
     'pHo'].forEach((k) => { delete requestData[k]; });

    const response = await apiHandler.handle(
      () => apiClient.put(API_ENDPOINTS.hub.update(tradeId), requestData),
      { defaultErrorMessage: '공동중개망 수정에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
      data: response.data,
    };
  }

  /**
   * 공동중개망 삭제 (논리 삭제)
   * DELETE /api/Hub/{tradeId}
   */
  async deleteHub(tradeId) {
    const response = await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.hub.delete(tradeId)),
      { defaultErrorMessage: '공동중개망 삭제에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  // ==================== 주거래지역 ====================

  /**
   * 주거래지역 목록 조회 (개인 rt_no 기준)
   * GET /api/Hub/main-region
   */
  async getMainRegions({ offNo = null, rtNo = null } = {}) {
    const queryParams = {};
    if (offNo) queryParams.OffNo = String(offNo);
    if (rtNo) queryParams.RtNo = String(rtNo);
    try {
      const response = await apiClient.get(API_ENDPOINTS.hub.mainRegionList, queryParams);
      return { success: true, data: response.data || [] };
    } catch (error) {
      if (error.code === 'NOT_FOUND') return { success: true, data: [] };
      apiHandler.showError(error, '주거래지역 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 주거래지역 추가
   * POST /api/Hub/main-region
   */
  async addMainRegion({ offNo = null, rtNo = null, bjdCode, regionName = null, regId = null }) {
    const requestData = {
      offNo: offNo != null && offNo !== '' ? Number(offNo) : null,
      rtNo: rtNo != null && rtNo !== '' ? String(rtNo) : null,
      bjdCode: bjdCode != null ? String(bjdCode) : null,
      regionName: regionName != null ? String(regionName) : null,
      regId: regId != null && regId !== '' ? String(regId) : null,
    };
    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.hub.mainRegionCreate, requestData),
      { defaultErrorMessage: '주거래지역 추가에 실패했습니다.' }
    );
    return { success: true, message: response.message, data: response.data };
  }

  /**
   * 주거래지역 삭제
   * DELETE /api/Hub/main-region/{regionId}
   */
  async deleteMainRegion(regionId) {
    const response = await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.hub.mainRegionDelete(regionId)),
      { defaultErrorMessage: '주거래지역 삭제에 실패했습니다.' }
    );
    return { success: true, message: response.message };
  }

  // ==================== 비공유업체 ====================

  /** 비공유업체 목록 (중개사무소 단위) — 본인 사무소가 등록한 것만 조회됨 */
  async getOfficeBlocks(offNo) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.hub.blockList, { OffNo: offNo });
      return { success: true, data: response.data || [] };
    } catch (error) {
      if (error.code === 'NOT_FOUND') return { success: true, data: [] };
      apiHandler.showError(error, '비공유업체 조회에 실패했습니다.');
      throw error;
    }
  }

  /** 비공유업체 등록 (부동산등록번호 기준) */
  async addOfficeBlock({ offNo, blockedRegNo, blockedNm = '', regId = '' }) {
    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.hub.blockCreate, { OffNo: offNo, BlockedRegNo: blockedRegNo, BlockedNm: blockedNm, RegId: regId }),
      { defaultErrorMessage: '비공유업체 등록에 실패했습니다.' }
    );
    return { success: true, data: response.data };
  }

  /** 비공유업체 삭제 */
  async deleteOfficeBlock(blockId) {
    const response = await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.hub.blockDelete(blockId)),
      { defaultErrorMessage: '비공유업체 삭제에 실패했습니다.' }
    );
    return { success: true, message: response.message };
  }

  // ==================== 쪽지 ====================

  /**
   * 쪽지 목록 조회
   * GET /api/Hub/note?UserId=&Box=all|received|sent
   */
  async getNotes(userId, box = 'all', opts = {}) {
    try {
      const params = { UserId: userId, Box: box };
      if (opts.regDtFr) params.RegDtFr = opts.regDtFr;
      if (opts.regDtTo) params.RegDtTo = opts.regDtTo;
      if (opts.keyword) params.Keyword = opts.keyword;
      if (opts.bizKeyword) params.BizKeyword = opts.bizKeyword;
      const response = await apiClient.get(API_ENDPOINTS.hub.noteList, params);
      return { success: true, data: response.data || [] };
    } catch (error) {
      if (error.code === 'NOT_FOUND') return { success: true, data: [] };
      apiHandler.showError(error, '쪽지 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 안읽은 쪽지 개수
   * GET /api/Hub/note/unread-count?UserId=
   */
  async getUnreadNoteCount(userId) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.hub.noteUnreadCount, { UserId: userId });
      return { success: true, count: response.data?.count ?? 0 };
    } catch (error) {
      return { success: false, count: 0 };
    }
  }

  /**
   * 쪽지 발송 (수신자 복수)
   * POST /api/Hub/note
   */
  async sendNote({ senderId, senderName, receiverIds, receiverNames, title, content, refTradeId = null }) {
    const requestData = {
      senderId: senderId != null ? String(senderId) : null,
      senderName: senderName != null ? String(senderName) : null,
      receiverIds: (receiverIds || []).map((x) => String(x)),
      receiverNames: (receiverNames || []).map((x) => (x != null ? String(x) : '')),
      title: title != null ? String(title) : null,
      content: content != null ? String(content) : null,
      refTradeId: refTradeId != null ? Number(refTradeId) : null,
    };
    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.hub.noteSend, requestData),
      { defaultErrorMessage: '쪽지 발송에 실패했습니다.' }
    );
    return { success: true, message: response.message, data: response.data };
  }

  /**
   * 대표(사무소) 단위 대화목록 조회 — 사무소 전체 직원의 쪽지
   * GET /api/Hub/note/office?OffNo=&UserId=
   *  - 서버에서 역할(대표/직원) 판단 없이 전체를 내려주고 프론트에서 표시 범위를 정함
   *  - 미구현(404 등)이면 빈 배열로 폴백 → 개인 조회로 동작
   */
  async getOfficeNotes(offNo, userId, opts = {}) {
    try {
      const params = { OffNo: offNo, UserId: userId };
      if (opts.regDtFr) params.RegDtFr = opts.regDtFr;
      if (opts.regDtTo) params.RegDtTo = opts.regDtTo;
      if (opts.keyword) params.Keyword = opts.keyword;
      if (opts.bizKeyword) params.BizKeyword = opts.bizKeyword;
      const response = await apiClient.get(API_ENDPOINTS.hub.noteOffice, params);
      return { success: true, data: response.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }

  /**
   * 대화방 공개여부 설정 조회
   * GET /api/Hub/note/share?OffNo=  → [{ ownerId, partnerId, share: 'Y'|'N' }]
   */
  async getNoteShares(offNo) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.hub.noteShare, { OffNo: offNo });
      return { success: true, data: response.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }

  /**
   * 대화방 공개여부 설정(대표 전용)
   * PUT /api/Hub/note/share { offNo, ownerId, partnerId, share:'Y'|'N' }
   */
  async setNoteShare({ offNo, ownerId, partnerId, share }) {
    try {
      await apiClient.put(API_ENDPOINTS.hub.noteShare, { offNo, ownerId: String(ownerId), partnerId: String(partnerId), share });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * 사무소 전체 대화방 공개여부 일괄 설정(대표 전용)
   * PUT /api/Hub/note/share/all { offNo, share:'Y'|'N' }
   */
  async setAllNoteShare({ offNo, share }) {
    try {
      await apiClient.put(API_ENDPOINTS.hub.noteShareAll, { offNo, share });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * 쪽지 읽음 처리
   * PUT /api/Hub/note/{noteId}/read
   */
  async markNoteRead(noteId) {
    try {
      await apiClient.put(API_ENDPOINTS.hub.noteRead(noteId), {});
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * 쪽지 삭제 (해당 사용자만)
   * DELETE /api/Hub/note/{noteId}?UserId=
   */
  async deleteNote(noteId, userId) {
    const url = `${API_ENDPOINTS.hub.noteDelete(noteId)}?UserId=${encodeURIComponent(userId ?? '')}`;
    const response = await apiHandler.handle(
      () => apiClient.delete(url),
      { defaultErrorMessage: '쪽지 삭제에 실패했습니다.' }
    );
    return { success: true, message: response.message };
  }
}

export const hubService = new HubService();
export default hubService;

import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

export const customerService = {
  // 고객 목록 조회
  getList: async (custNo, name, alias, tel, offNo, vendorId, page = 1, pageSize = 20, wantType = null, trdType = null, trdPrg = null, sortBy = null, sortDir = null, keyword = null) => {
    try {
      const params = {
        Page: page,
        PageSize: pageSize,
      };

      if (custNo) params.CustNo = custNo;
      if (name) params.Name = name;
      if (alias) params.Alias = alias;
      if (tel) params.Tel = tel;
      if (offNo) params.OffNo = offNo;
      if (vendorId) params.VendorId = vendorId;
      if (wantType) params.WantType = wantType;
      if (trdType) params.TrdType = trdType;
      if (trdPrg) params.TrdPrg = trdPrg;
      if (sortBy) params.SortBy = sortBy;
      if (sortDir) params.SortDir = sortDir;
      if (keyword) params.Keyword = keyword; // 통합검색(이름/상호/연락처/주소)

      const response = await apiClient.get(API_ENDPOINTS.customer.list, params);
      return response;
    } catch (error) {
      console.error('고객 목록 조회 실패:', error);
      throw error;
    }
  },

  // 고객 상세 조회 (희망지역/구입자 포함)
  getDetail: async (custNo) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.customer.detail(custNo));
      return response;
    } catch (error) {
      console.error('고객 상세 조회 실패:', error);
      throw error;
    }
  },

  // 고객 등록
  create: async (customerData) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.customer.create,
        customerData,
        {
          params: { UserId: customerData.userId },
        }
      );
      return response;
    } catch (error) {
      console.error('고객 등록 실패:', error);
      throw error;
    }
  },

  // 엑셀 일괄 업로드 — items는 camelCase 고객 payload 배열(구입자/희망지역 포함)
  bulkUpload: async ({ items, offNo = null, rtNo = null, vendorId = null, userId = null }) => {
    try {
      const body = {
        OffNo: offNo ?? null,
        RtNo: rtNo ?? null,
        VendorId: vendorId ?? null,
        UserId: userId || null,
        Items: items || [],
      };
      const response = await apiClient.post(API_ENDPOINTS.customer.bulkCreate, body);
      return response; // { success, data: { total, success, failed, errors[] }, message }
    } catch (error) {
      console.error('고객 일괄 업로드 실패:', error);
      throw error;
    }
  },

  // 고객 수정
  update: async (custNo, customerData) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.customer.update(custNo),
        customerData,
        {
          params: { UserId: customerData.userId },
        }
      );
      return response;
    } catch (error) {
      console.error('고객 수정 실패:', error);
      throw error;
    }
  },

  // 고객 삭제
  // saveHistory: true → 고객 이력에 저장 후 삭제, false → 영구 삭제
  delete: async (custNo, userId, saveHistory = false) => {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.customer.delete(custNo),
        { UserId: userId, SaveHistory: saveHistory ? 'Y' : 'N' }
      );
      return response;
    } catch (error) {
      console.error('고객 삭제 실패:', error);
      throw error;
    }
  },

  // 고객 거래정보 조회
  getTradeList: async (params) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.customer.tradeList, params);
      return response;
    } catch (error) {
      console.error('고객 거래정보 조회 실패:', error);
      throw error;
    }
  },

  // 고객 거래정보 등록
  createTrade: async (tradeData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.customer.tradeCreate, tradeData);
      return response;
    } catch (error) {
      console.error('고객 거래정보 등록 실패:', error);
      throw error;
    }
  },

  // 고객 거래정보 수정
  updateTrade: async (trdNo, tradeData) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.customer.tradeUpdate(trdNo),
        tradeData
      );
      return response;
    } catch (error) {
      console.error('고객 거래정보 수정 실패:', error);
      throw error;
    }
  },

  // 고객 거래정보 삭제
  deleteTrade: async (trdNo, userId) => {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.customer.tradeDelete(trdNo),
        { userId }
      );
      return response;
    } catch (error) {
      console.error('고객 거래정보 삭제 실패:', error);
      throw error;
    }
  },

  // 고객 거래지역 조회
  getTradeAreaList: async (trdNo, seq, addr1, addr2, addr3, addr4) => {
    try {
      const params = {};
      if (trdNo) params.trdNo = trdNo;
      if (seq) params.seq = seq;
      if (addr1) params.addr1 = addr1;
      if (addr2) params.addr2 = addr2;
      if (addr3) params.addr3 = addr3;
      if (addr4) params.addr4 = addr4;

      const response = await apiClient.get(API_ENDPOINTS.customer.tradeAreaList, params);
      return response;
    } catch (error) {
      console.error('고객 거래지역 조회 실패:', error);
      throw error;
    }
  },

  // 고객 거래지역 등록
  createTradeArea: async (trdNo, areaList) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.customer.tradeAreaCreate,
        areaList,
        {
          params: { trdNo },
        }
      );
      return response;
    } catch (error) {
      console.error('고객 거래지역 등록 실패:', error);
      throw error;
    }
  },

  // 고객 거래지역 수정
  updateTradeArea: async (trdNo, areaList) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.customer.tradeAreaUpdate(trdNo),
        areaList
      );
      return response;
    } catch (error) {
      console.error('고객 거래지역 수정 실패:', error);
      throw error;
    }
  },

  // 고객 거래지역 삭제
  deleteTradeArea: async (trdNo, areaList) => {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.customer.tradeAreaDelete(trdNo),
        {
          data: areaList,
        }
      );
      return response;
    } catch (error) {
      console.error('고객 거래지역 삭제 실패:', error);
      throw error;
    }
  },
};

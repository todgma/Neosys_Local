import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

// camelCase를 PascalCase로 변환하는 함수
const toPascalCase = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// 객체의 모든 키를 PascalCase로 변환
const convertKeysToPascalCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToPascalCase);

  const converted = {};
  Object.keys(obj).forEach(key => {
    const pascalKey = toPascalCase(key);
    converted[pascalKey] = convertKeysToPascalCase(obj[key]);
  });
  return converted;
};

export const propertyService = {
  // 물건 목록 조회
  getList: async (ptNo, ptName, page = 1, pageSize = 20, ptType = null, danjiCode = null, addr3 = null, offNo = null, rtNo = null, saleDiv = null, orderBy = null, orderDirection = null, bjdCodes = null, dong = null, floorFilter = null, progressOnly = null, keyword = null, extra = {}) => {
    try {
      const params = {
        Page: page,
        PageSize: pageSize,
      };

      if (ptNo) params.ptNo = ptNo;
      if (ptName) params.ptName = ptName;
      if (ptType) params.ptType = ptType;
      if (danjiCode) params.danjiCode = danjiCode;
      if (addr3) params.addr3 = addr3;
      if (offNo) params.offNo = offNo;
      if (rtNo) params.rtNo = rtNo;
      if (saleDiv) params.saleDiv = saleDiv;
      if (orderBy) params.orderBy = orderBy;
      if (orderDirection) params.orderDirection = orderDirection;
      if (bjdCodes && bjdCodes.length > 0) params.bjdCodes = bjdCodes.join(',');
      if (dong && String(dong).trim()) params.dong = String(dong).trim();
      if (floorFilter && floorFilter !== 'all') params.floorFilter = floorFilter;
      if (progressOnly) params.progressOnly = progressOnly;
      if (keyword) params.keyword = keyword; // 통합검색(여러 필드 대상)
      // 추가 범위 필터(서버 필터) — 호/면적(㎡)/거래금액(만원)/월차임(만원)
      if (extra && typeof extra === 'object') {
        if (extra.ho && String(extra.ho).trim()) params.ho = String(extra.ho).trim();
        if (extra.areaMin != null && extra.areaMin !== '') params.areaMin = extra.areaMin;
        if (extra.areaMax != null && extra.areaMax !== '') params.areaMax = extra.areaMax;
        if (extra.amtMin != null && extra.amtMin !== '') params.amtMin = extra.amtMin;
        if (extra.amtMax != null && extra.amtMax !== '') params.amtMax = extra.amtMax;
        if (extra.monMin != null && extra.monMin !== '') params.monMin = extra.monMin;
        if (extra.monMax != null && extra.monMax !== '') params.monMax = extra.monMax;
      }

      const response = await apiClient.get(API_ENDPOINTS.property.list, params);
      return response;
    } catch (error) {
      console.error('물건 목록 조회 실패:', error);
      throw error;
    }
  },

  // 단지 목록 조회 (아파트/오피스텔)
  getComplexList: async (ptType, page = 1, pageSize = 100) => {
    try {
      const params = {
        ptType: ptType,
        Page: page,
        PageSize: pageSize,
      };

      // TODO: API 엔드포인트 추가 필요
      const response = await apiClient.get('/api/property/GetComplexList', params);
      return response;
    } catch (error) {
      console.error('단지 목록 조회 실패:', error);
      throw error;
    }
  },

  // 물건 등록
  create: async (propertyData) => {
    try {
      const convertedData = convertKeysToPascalCase(propertyData);
      const response = await apiClient.post(
        API_ENDPOINTS.property.create,
        convertedData
      );
      return response;
    } catch (error) {
      console.error('물건 등록 실패:', error);
      throw error;
    }
  },

  // 엑셀 일괄 업로드 — items는 camelCase 물건 payload 배열. 동/호는 명칭(백엔드에서 DB 정규화)
  bulkUpload: async ({ items, danjiCode = null, offNo = null, rtNo = null, userId = null }) => {
    try {
      const body = {
        DanjiCode: danjiCode || null,
        OffNo: offNo ?? null,
        RtNo: rtNo || null,
        UserId: userId || null,
        Items: (items || []).map(convertKeysToPascalCase),
      };
      const response = await apiClient.post(API_ENDPOINTS.property.bulkCreate, body);
      return response; // { success, data: { total, success, failed, errors[] }, message }
    } catch (error) {
      console.error('물건 일괄 업로드 실패:', error);
      throw error;
    }
  },

  // 물건 수정
  update: async (ptNo, propertyData) => {
    try {
      const convertedData = convertKeysToPascalCase(propertyData);
      const response = await apiClient.put(
        API_ENDPOINTS.property.update(ptNo),
        convertedData
      );
      return response;
    } catch (error) {
      console.error('물건 수정 실패:', error);
      throw error;
    }
  },

  // 물건 삭제
  // saveHistory: true → 과거데이터에 저장 후 삭제, false → 영구 삭제
  delete: async (ptNo, userId, saveHistory = false) => {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.property.delete(ptNo),
        { UserId: userId, SaveHistory: saveHistory ? 'Y' : 'N' }
      );
      return response;
    } catch (error) {
      console.error('물건 삭제 실패:', error);
      throw error;
    }
  },

  // 물건 상세 조회
  getDetail: async (ptNo) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.property.detail(ptNo));
      return response;
    } catch (error) {
      console.error('물건 상세 조회 실패:', error);
      throw error;
    }
  },

  // 과거내역 보관 (현재 물건 데이터를 pt_sale_old로 복사)
  archive: async (ptNo, userId) => {
    try {
      const url = userId
        ? `${API_ENDPOINTS.property.archive(ptNo)}?UserId=${encodeURIComponent(userId)}`
        : API_ENDPOINTS.property.archive(ptNo);
      const response = await apiClient.post(url, {});
      return response;
    } catch (error) {
      console.error('과거내역 보관 실패:', error);
      throw error;
    }
  },

  // 과거내역 목록 조회
  getHistory: async (ptNo) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.property.history(ptNo));
      return response;
    } catch (error) {
      console.error('과거내역 목록 조회 실패:', error);
      throw error;
    }
  },

  // 물건 상태 변경 (진행중으로 변경)
  updateStatus: async (ptNo, ptSts, userId) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.property.updateStatus(ptNo),
        { PtSts: ptSts, UserId: userId }
      );
      return response;
    } catch (error) {
      console.error('물건 상태 변경 실패:', error);
      throw error;
    }
  },
};

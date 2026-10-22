import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

// 계약서 서식 템플릿(조항) — 캐시 로드 + 관리자 편집
export const contractTemplateService = {
  // 전체 목록 + 최대 ver (프로그램 실행 시 캐시 로드용)
  async list(includeDisabled = false) {
    return await apiHandler.handle(
      () => apiClient.get(API_ENDPOINTS.contractTemplate.list, { includeDisabled }),
      { defaultErrorMessage: '계약서 템플릿 조회 실패', showError: false }
    );
  },
  // 최신 ver만 (가벼운 갱신 감지)
  async version() {
    return await apiHandler.handle(
      () => apiClient.get(API_ENDPOINTS.contractTemplate.version),
      { defaultErrorMessage: '템플릿 버전 조회 실패', showError: false }
    );
  },
  async detail(tplCode) {
    return await apiHandler.handle(
      () => apiClient.get(API_ENDPOINTS.contractTemplate.detail(tplCode)),
      { defaultErrorMessage: '템플릿 조회 실패' }
    );
  },
  // 저장(신규/수정 upsert) — 관리자 편집/시드
  async save(dto) {
    return await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.contractTemplate.save, dto),
      { defaultErrorMessage: '템플릿 저장 실패' }
    );
  },
  async remove(tplCode, userId) {
    return await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.contractTemplate.remove(tplCode), { userId }),
      { defaultErrorMessage: '템플릿 삭제 실패' }
    );
  },
};

export default contractTemplateService;

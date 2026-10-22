/**
 * API 공통 핸들러
 * 백엔드 에러 응답 형식:
 * {
 *   success: false,
 *   error: {
 *     code: "ERROR_CODE",
 *     message: "에러 메시지"
 *   },
 *   traceId: "..."
 * }
 */

import toast from 'react-hot-toast';

class ApiHandler {
  /**
   * API 응답 처리
   * @param {Function} apiCall - API 호출 함수
   * @param {Object} options - 옵션
   * @param {boolean} options.showError - 에러 메시지를 alert로 표시할지 여부 (기본값: true)
   * @param {string} options.defaultErrorMessage - 기본 에러 메시지
   * @returns {Promise<Object>} API 응답 데이터
   */
  async handle(apiCall, options = {}) {
    const {
      showError = true,
      defaultErrorMessage = 'API 요청 중 오류가 발생했습니다.',
    } = options;

    try {
      const response = await apiCall();

      // 성공 응답 처리
      if (response && response.success) {
        return response;
      }

      // 실패 응답 처리 (success: false)
      const errorMessage = response?.error?.message || response?.message || defaultErrorMessage;
      const errorCode = response?.error?.code || 'UNKNOWN_ERROR';

      console.error(`API Error [${errorCode}]:`, errorMessage);

      if (showError) {
        toast.error(errorMessage);
      }

      throw new Error(errorMessage);
    } catch (error) {
      // 네트워크 오류나 예상치 못한 오류 처리
      let errorMessage;

      if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = defaultErrorMessage;
      }

      console.error('API Handler Error:', error);

      if (showError && !error.message.includes('API Error')) {
        toast.error(errorMessage);
      }

      throw error;
    }
  }

  /**
   * API 응답 처리 (에러 메시지를 표시하지 않음)
   * @param {Function} apiCall - API 호출 함수
   * @returns {Promise<Object>} API 응답 데이터
   */
  async handleSilent(apiCall) {
    return this.handle(apiCall, { showError: false });
  }

  /**
   * API 응답 처리 (성공 여부만 반환)
   * @param {Function} apiCall - API 호출 함수
   * @param {Object} options - 옵션
   * @returns {Promise<boolean>} 성공 여부
   */
  async handleBoolean(apiCall, options = {}) {
    try {
      await this.handle(apiCall, options);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * API 응답에서 data 추출
   * @param {Function} apiCall - API 호출 함수
   * @param {Object} options - 옵션
   * @returns {Promise<any>} API 응답의 data 필드
   */
  async getData(apiCall, options = {}) {
    const response = await this.handle(apiCall, options);
    return response?.data || null;
  }

  /**
   * 여러 API 호출을 병렬로 처리
   * @param {Array<Function>} apiCalls - API 호출 함수 배열
   * @param {Object} options - 옵션
   * @returns {Promise<Array>} API 응답 배열
   */
  async handleMultiple(apiCalls, options = {}) {
    const promises = apiCalls.map((apiCall) => this.handle(apiCall, options));
    return Promise.all(promises);
  }

  /**
   * 에러 응답 처리 (백엔드 표준 에러 형식)
   * @param {Object} response - API 응답
   * @param {string} defaultMessage - 기본 에러 메시지
   * @returns {Object} 처리된 에러 정보
   */
  parseError(response, defaultMessage = 'API 요청 중 오류가 발생했습니다.') {
    if (!response) {
      return {
        code: 'UNKNOWN_ERROR',
        message: defaultMessage,
      };
    }

    // 백엔드 표준 에러 형식
    if (response.error) {
      return {
        code: response.error.code || 'UNKNOWN_ERROR',
        message: response.error.message || defaultMessage,
        traceId: response.traceId,
      };
    }

    // 이전 버전 호환성
    if (response.message) {
      return {
        code: response.code || 'UNKNOWN_ERROR',
        message: response.message,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: defaultMessage,
    };
  }

  /**
   * 에러 메시지 표시
   * @param {Object|Error|string} error - 에러 객체 또는 메시지
   * @param {string} defaultMessage - 기본 에러 메시지
   */
  showError(error, defaultMessage = 'API 요청 중 오류가 발생했습니다.') {
    let message = defaultMessage;

    if (typeof error === 'string') {
      message = error;
    } else if (error?.error?.message) {
      message = error.error.message;
    } else if (error?.message) {
      message = error.message;
    }

    console.error('API Error:', error);
    toast.error(message);
  }
}

export const apiHandler = new ApiHandler();
export default apiHandler;

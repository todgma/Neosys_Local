class ApiClient {
  constructor() {
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  getAuthToken() {
    const authStore = localStorage.getItem('auth-storage');
    if (authStore) {
      try {
        const { state } = JSON.parse(authStore);
        return state?.token;
      } catch (error) {
        console.error('토큰 파싱 오류:', error);
        return null;
      }
    }
    return null;
  }

  getHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    const token = this.getAuthToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async request(url, options = {}) {
    try {
      const config = {
        ...options,
        headers: this.getHeaders(options.headers),
      };

      const response = await fetch(url, config);

      // 응답이 JSON이 아닐 수 있으므로 체크
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      const data = isJson ? await response.json() : await response.text();

      // 에러 응답 확인 (HTTP 상태 코드 에러 또는 success: false)
      const isError = !response.ok || (data && typeof data === 'object' && data.success === false);

      if (isError && data && typeof data === 'object') {
        // 백엔드 표준 에러 응답 형식 처리
        // { success: false, error: { code, message }, traceId }
        let errorMessage = 'API 요청에 실패했습니다.';
        let errorCode = 'UNKNOWN_ERROR';

        // error.message 우선 사용
        if (data.error?.message) {
          errorMessage = data.error.message;
          errorCode = data.error.code || 'UNKNOWN_ERROR';
        }
        // 이전 버전 호환성: message 필드
        else if (data.message) {
          errorMessage = data.message;
          errorCode = data.code || 'UNKNOWN_ERROR';
        }
        // HTTP 상태 에러인 경우
        else if (!response.ok) {
          errorMessage = `HTTP error! status: ${response.status}`;
        }

        const error = new Error(errorMessage);
        error.code = errorCode;
        error.traceId = data.traceId;
        error.response = data;
        error.status = response.status;
        throw error;
      }

      // HTTP 에러지만 JSON이 아닌 경우
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      // 에러 로깅
      console.error('API 요청 오류:', {
        url,
        method: options.method || 'GET',
        error: error.message,
        code: error.code,
        traceId: error.traceId,
      });

      throw error;
    }
  }

  async get(url, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    return this.request(fullUrl, {
      ...options,
      method: 'GET',
    });
  }

  async post(url, data = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(url, data = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(url, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    return this.request(fullUrl, {
      ...options,
      method: 'DELETE',
    });
  }

  // Form 데이터 전송용 메서드
  async postForm(url, formData, options = {}) {
    const headers = { ...options.headers };
    delete headers['Content-Type']; // multipart/form-data는 브라우저가 자동 설정

    return this.request(url, {
      ...options,
      method: 'POST',
      headers,
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;

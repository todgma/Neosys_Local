import axios from 'axios';
import { API_BASE_URL } from '../../config/apiEndpoints';

/**
 * 주소 관련 공통 서비스
 * System API 명세 기반
 */

const addressService = {
  /**
   * 행정동/법정동 목록 조회
   * @param {number} addressType - 1=시도, 2=시군구, 3=읍면동(행정), 4=법정동, 5=행정동상세, 6=법정동상세, 7=리
   * @param {string|null} addressCode - 상위 주소 코드 (addressType에 따라 필수 여부 결정)
   * @returns {Promise<Array>} 주소 목록
   */
  async getBjdList(addressType, addressCode = null) {
    try {
      const params = { addressType };
      if (addressCode) {
        params.addressCode = addressCode;
      }

      const response = await axios.get(`${API_BASE_URL}/api/system/bjd-list`, {
        params,
      });

      return response.data;
    } catch (error) {
      console.error('행정동/법정동 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 시도 목록 조회
   * @returns {Promise<Array>} 시도 목록
   */
  async getSidoList() {
    return this.getBjdList(1);
  },

  /**
   * 시군구 목록 조회
   * @param {string} sidoCode - 시도 코드 (예: 1100000000)
   * @returns {Promise<Array>} 시군구 목록
   */
  async getSigunguList(sidoCode) {
    if (!sidoCode) {
      throw new Error('시도 코드는 필수입니다.');
    }
    return this.getBjdList(2, sidoCode);
  },

  /**
   * 읍면동 목록 조회 (법정동)
   * @param {string} sigunguCode - 시군구 코드 (예: 1174000000)
   * @returns {Promise<Array>} 읍면동 목록
   */
  async getEupMyeonDongList(sigunguCode) {
    if (!sigunguCode) {
      throw new Error('시군구 코드는 필수입니다.');
    }
    return this.getBjdList(4, sigunguCode);
  },

  /**
   * 법정동 목록 조회
   * @param {string} sigunguCode - 시군구 코드 (예: 1174000000)
   * @returns {Promise<Array>} 법정동 목록
   */
  async getBeopjeongDongList(sigunguCode) {
    if (!sigunguCode) {
      throw new Error('시군구 코드는 필수입니다.');
    }
    return this.getBjdList(4, sigunguCode);
  },

  /**
   * 행정동 상세 조회
   * @param {string} hjdCode - 행정동 코드 (예: 1174010600)
   * @returns {Promise<Array>} 행정동 상세 정보
   */
  async getHjdDetail(hjdCode) {
    if (!hjdCode) {
      throw new Error('행정동 코드는 필수입니다.');
    }
    return this.getBjdList(5, hjdCode);
  },

  /**
   * 법정동 상세 조회
   * @param {string} bjdCode - 법정동 코드 (예: 1174010600)
   * @returns {Promise<Array>} 법정동 상세 정보
   */
  async getBjdDetail(bjdCode) {
    if (!bjdCode) {
      throw new Error('법정동 코드는 필수입니다.');
    }
    return this.getBjdList(6, bjdCode);
  },

  /**
   * 리 목록 조회
   * @param {string} eupMyeonDongCode - 읍면동 코드 (예: 11740106)
   * @returns {Promise<Array>} 리 목록
   */
  async getRiList(eupMyeonDongCode) {
    if (!eupMyeonDongCode) {
      throw new Error('읍면동 코드는 필수입니다.');
    }
    return this.getBjdList(7, eupMyeonDongCode);
  },

  /**
   * 법정동 코드로 단지 목록 조회
   * @param {string} bjdCode - 법정동 코드 (예: 1174010600)
   * @returns {Promise<Array>} 단지 목록 (areas 포함)
   */
  async getDanjiListByBjd(bjdCode, hscpType = null) {
    try {
      if (!bjdCode) {
        throw new Error('법정동 코드는 필수입니다.');
      }

      // 단지유형(hscpType) 지정 시 백엔드에서 해당 유형 단지만 필터링해서 반환
      const params = { bjdCode };
      if (hscpType) params.hscpType = hscpType;
      const response = await axios.get(`${API_BASE_URL}/api/system/danji-list`, { params });

      return response.data;
    } catch (error) {
      console.error('단지 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 단지 코드로 동 목록 조회
   * @param {number} danjiCode - 네이버 단지 코드
   * @returns {Promise<Array>} 동 목록
   */
  async getDongListByDanji(danjiCode) {
    try {
      if (!danjiCode) {
        throw new Error('단지 코드는 필수입니다.');
      }

      const response = await axios.get(`${API_BASE_URL}/api/system/dong-list`, {
        params: { danjiCode },
      });

      return response.data;
    } catch (error) {
      console.error('동 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 단지 코드와 동번호로 호 목록 조회
   * @param {number} danjiCode - 네이버 단지 코드
   * @param {number} dongNo - 동 번호
   * @returns {Promise<Array>} 호 목록
   */
  async getHoListByDong(danjiCode, dongNo) {
    try {
      if (!danjiCode || !dongNo) {
        throw new Error('단지 코드와 동 번호는 필수입니다.');
      }

      const response = await axios.get(`${API_BASE_URL}/api/system/ho-list`, {
        params: { danjiCode, dongNo },
      });

      return response.data;
    } catch (error) {
      console.error('호 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 단지 코드로 타입(면적) 목록 조회
   * @param {number} danjiCode - 네이버 단지 코드
   * @returns {Promise<Array>} 타입(면적) 목록
   */
  async getAreaListByDanji(danjiCode) {
    try {
      if (!danjiCode) {
        throw new Error('단지 코드는 필수입니다.');
      }

      const response = await axios.get(`${API_BASE_URL}/api/system/area-list`, {
        params: { danjiCode },
      });

      return response.data;
    } catch (error) {
      console.error('타입(면적) 목록 조회 실패:', error);
      throw error;
    }
  },
};

export default addressService;

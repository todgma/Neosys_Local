import apiClient from '../utils/apiClient';
import apiHandler from '../utils/apiHandler';
import API_ENDPOINTS from '../config/apiEndpoints';

class VendorService {
  /**
   * 협력업체 목록 조회 (페이징)
   * GET /api/vendors?vendorId={vendorId}&offNo={offNo}&rtNo={rtNo}&pageNumber={pageNumber}&rowsPerPage={rowsPerPage}
   */
  async getVendorList(vendorId = null, offNo = null, rtNo = null, pageNumber = 1, rowsPerPage = 10) {
    const params = { pageNumber, rowsPerPage };
    if (vendorId) params.vendorId = vendorId;
    if (offNo) params.offNo = offNo;
    if (rtNo) params.rtNo = rtNo;

    try {
      const response = await apiClient.get(API_ENDPOINTS.vendor.list, params);
      const data = response.data || {};
      // businessAreasJson(문자열) → businessAreas(배열) 파싱 (VendorModal 영업지역 편집용)
      const vendors = (data.vendors || []).map((v) => {
        let businessAreas = [];
        try { businessAreas = v.businessAreasJson ? JSON.parse(v.businessAreasJson) : []; } catch { businessAreas = []; }
        return { ...v, businessAreas };
      });
      return {
        success: true,
        data: { ...data, vendors },
      };
    } catch (error) {
      // NOT_FOUND는 빈 목록으로 처리
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { vendors: [], totalPages: 1 },
        };
      }

      // 다른 에러는 메시지 표시하고 throw
      apiHandler.showError(error, '협력업체 목록 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 협력업체 등록
   * POST /api/vendors
   */
  async createVendor(vendorData) {
    const requestData = {};

    // null이 아닌 값만 포함 (PascalCase로 변환)
    if (vendorData.vendorName !== undefined && vendorData.vendorName !== null)
      requestData.VendorName = vendorData.vendorName;
    if (vendorData.category1 !== undefined && vendorData.category1 !== null)
      requestData.Category1 = vendorData.category1;
    if (vendorData.category2 !== undefined && vendorData.category2 !== null)
      requestData.Category2 = vendorData.category2;
    if (vendorData.category3 !== undefined && vendorData.category3 !== null)
      requestData.Category3 = vendorData.category3;
    if (vendorData.ceoName !== undefined && vendorData.ceoName !== null)
      requestData.CeoName = vendorData.ceoName;
    if (vendorData.ceoPhone !== undefined && vendorData.ceoPhone !== null)
      requestData.CeoPhone = vendorData.ceoPhone;
    if (vendorData.managerName !== undefined && vendorData.managerName !== null)
      requestData.ManagerName = vendorData.managerName;
    if (vendorData.managerPhone !== undefined && vendorData.managerPhone !== null)
      requestData.ManagerPhone = vendorData.managerPhone;
    if (vendorData.managerTel !== undefined && vendorData.managerTel !== null)
      requestData.ManagerTel = vendorData.managerTel;
    if (vendorData.managerFax !== undefined && vendorData.managerFax !== null)
      requestData.ManagerFax = vendorData.managerFax;
    if (vendorData.homepageUrl !== undefined && vendorData.homepageUrl !== null)
      requestData.HomepageUrl = vendorData.homepageUrl;
    if (vendorData.productDesc !== undefined && vendorData.productDesc !== null)
      requestData.ProductDesc = vendorData.productDesc;
    if (vendorData.consultationNote !== undefined && vendorData.consultationNote !== null)
      requestData.ConsultationNote = vendorData.consultationNote;
    if (vendorData.regType !== undefined && vendorData.regType !== null)
      requestData.RegType = vendorData.regType;
    if (vendorData.businessRegionCode !== undefined && vendorData.businessRegionCode !== null)
      requestData.BusinessRegionCode = vendorData.businessRegionCode;
    if (vendorData.detailAddress !== undefined && vendorData.detailAddress !== null)
      requestData.DetailAddress = vendorData.detailAddress;
    if (vendorData.offNo !== undefined && vendorData.offNo !== null)
      requestData.OffNo = parseInt(vendorData.offNo);
    if (vendorData.rtNo !== undefined && vendorData.rtNo !== null)
      requestData.RtNo = parseInt(vendorData.rtNo);
    if (vendorData.sortOrder !== undefined && vendorData.sortOrder !== null)
      requestData.SortOrder = parseInt(vendorData.sortOrder);
    if (vendorData.useYn !== undefined && vendorData.useYn !== null)
      requestData.UseYn = vendorData.useYn;
    if (vendorData.userId !== undefined && vendorData.userId !== null)
      requestData.UserId = vendorData.userId;
    if (Array.isArray(vendorData.businessAreas))
      requestData.BusinessAreas = vendorData.businessAreas.map((a) => ({ BjdCode: a.bjdCode || a.BjdCode, RegionName: a.regionName || a.RegionName }));

    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.vendor.create, requestData),
      { defaultErrorMessage: '협력업체 등록에 실패했습니다.' }
    );

    // 백엔드가 { vendorId } 반환 → 상담이력 저장에 사용
    const newVendorId = response?.data?.vendorId ?? response?.data ?? null;
    return {
      success: true,
      message: response.message,
      vendorId: newVendorId,
    };
  }

  /**
   * 협력업체 수정
   * PUT /api/vendors/{vendorId}
   */
  async updateVendor(vendorId, vendorData) {
    const requestData = {};

    // null이 아닌 값만 포함 (PascalCase로 변환)
    if (vendorData.vendorName !== undefined && vendorData.vendorName !== null)
      requestData.VendorName = vendorData.vendorName;
    if (vendorData.category1 !== undefined && vendorData.category1 !== null)
      requestData.Category1 = vendorData.category1;
    if (vendorData.category2 !== undefined && vendorData.category2 !== null)
      requestData.Category2 = vendorData.category2;
    if (vendorData.category3 !== undefined && vendorData.category3 !== null)
      requestData.Category3 = vendorData.category3;
    if (vendorData.ceoName !== undefined && vendorData.ceoName !== null)
      requestData.CeoName = vendorData.ceoName;
    if (vendorData.ceoPhone !== undefined && vendorData.ceoPhone !== null)
      requestData.CeoPhone = vendorData.ceoPhone;
    if (vendorData.managerName !== undefined && vendorData.managerName !== null)
      requestData.ManagerName = vendorData.managerName;
    if (vendorData.managerPhone !== undefined && vendorData.managerPhone !== null)
      requestData.ManagerPhone = vendorData.managerPhone;
    if (vendorData.managerTel !== undefined && vendorData.managerTel !== null)
      requestData.ManagerTel = vendorData.managerTel;
    if (vendorData.managerFax !== undefined && vendorData.managerFax !== null)
      requestData.ManagerFax = vendorData.managerFax;
    if (vendorData.homepageUrl !== undefined && vendorData.homepageUrl !== null)
      requestData.HomepageUrl = vendorData.homepageUrl;
    if (vendorData.productDesc !== undefined && vendorData.productDesc !== null)
      requestData.ProductDesc = vendorData.productDesc;
    if (vendorData.consultationNote !== undefined && vendorData.consultationNote !== null)
      requestData.ConsultationNote = vendorData.consultationNote;
    if (vendorData.regType !== undefined && vendorData.regType !== null)
      requestData.RegType = vendorData.regType;
    if (vendorData.businessRegionCode !== undefined && vendorData.businessRegionCode !== null)
      requestData.BusinessRegionCode = vendorData.businessRegionCode;
    if (vendorData.detailAddress !== undefined && vendorData.detailAddress !== null)
      requestData.DetailAddress = vendorData.detailAddress;
    if (vendorData.offNo !== undefined && vendorData.offNo !== null)
      requestData.OffNo = parseInt(vendorData.offNo);
    if (vendorData.rtNo !== undefined && vendorData.rtNo !== null)
      requestData.RtNo = parseInt(vendorData.rtNo);
    if (vendorData.sortOrder !== undefined && vendorData.sortOrder !== null)
      requestData.SortOrder = parseInt(vendorData.sortOrder);
    if (vendorData.useYn !== undefined && vendorData.useYn !== null)
      requestData.UseYn = vendorData.useYn;
    if (vendorData.userId !== undefined && vendorData.userId !== null)
      requestData.UserId = vendorData.userId;
    if (Array.isArray(vendorData.businessAreas))
      requestData.BusinessAreas = vendorData.businessAreas.map((a) => ({ BjdCode: a.bjdCode || a.BjdCode, RegionName: a.regionName || a.RegionName }));

    const response = await apiHandler.handle(
      () => apiClient.put(API_ENDPOINTS.vendor.update(vendorId), requestData),
      { defaultErrorMessage: '협력업체 수정에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 협력업체 삭제
   * DELETE /api/vendors/{vendorId}?userId={userId}
   */
  async deleteVendor(vendorId, userId) {
    const response = await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.vendor.delete(vendorId), { userId }),
      { defaultErrorMessage: '협력업체 삭제에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 협력업체 영업지역 목록 조회 (페이징)
   * GET /api/vendors/regions?vendorRegionId={vendorRegionId}&vendorId={vendorId}&pageNumber={pageNumber}&rowsPerPage={rowsPerPage}
   */
  async getVendorRegionList(vendorRegionId = null, vendorId = null, pageNumber = 1, rowsPerPage = 10) {
    const params = { pageNumber, rowsPerPage };
    if (vendorRegionId) params.vendorRegionId = vendorRegionId;
    if (vendorId) params.vendorId = vendorId;

    try {
      const response = await apiClient.get(API_ENDPOINTS.vendor.regionList, params);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      // NOT_FOUND는 빈 목록으로 처리
      if (error.code === 'NOT_FOUND') {
        return {
          success: true,
          data: { vendorRegions: [], totalPages: 1 },
        };
      }

      // 다른 에러는 메시지 표시하고 throw
      apiHandler.showError(error, '협력업체 영업지역 목록 조회에 실패했습니다.');
      throw error;
    }
  }

  /**
   * 협력업체 영업지역 등록
   * POST /api/vendors/regions
   */
  async createVendorRegion(regionData) {
    const requestData = {
      VendorId: parseInt(regionData.vendorId),
      RegionCode: regionData.regionCode,
    };

    if (regionData.sortOrder !== undefined && regionData.sortOrder !== null)
      requestData.SortOrder = parseInt(regionData.sortOrder);
    if (regionData.useYn !== undefined && regionData.useYn !== null)
      requestData.UseYn = regionData.useYn;
    if (regionData.userId !== undefined && regionData.userId !== null)
      requestData.UserId = regionData.userId;

    const response = await apiHandler.handle(
      () => apiClient.post(API_ENDPOINTS.vendor.regionCreate, requestData),
      { defaultErrorMessage: '협력업체 영업지역 등록에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 협력업체 영업지역 수정
   * PUT /api/vendors/regions/{vendorRegionId}
   */
  async updateVendorRegion(vendorRegionId, regionData) {
    const requestData = {
      VendorId: parseInt(regionData.vendorId),
      RegionCode: regionData.regionCode,
    };

    if (regionData.sortOrder !== undefined && regionData.sortOrder !== null)
      requestData.SortOrder = parseInt(regionData.sortOrder);
    if (regionData.useYn !== undefined && regionData.useYn !== null)
      requestData.UseYn = regionData.useYn;
    if (regionData.userId !== undefined && regionData.userId !== null)
      requestData.UserId = regionData.userId;

    const response = await apiHandler.handle(
      () => apiClient.put(API_ENDPOINTS.vendor.regionUpdate(vendorRegionId), requestData),
      { defaultErrorMessage: '협력업체 영업지역 수정에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }

  /**
   * 협력업체 영업지역 삭제
   * DELETE /api/vendors/regions/{vendorRegionId}?userId={userId}
   */
  async deleteVendorRegion(vendorRegionId, userId) {
    const response = await apiHandler.handle(
      () => apiClient.delete(API_ENDPOINTS.vendor.regionDelete(vendorRegionId), { userId }),
      { defaultErrorMessage: '협력업체 영업지역 삭제에 실패했습니다.' }
    );

    return {
      success: true,
      message: response.message,
    };
  }
}

export const vendorService = new VendorService();

import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { interviewService } from '../../services/interviewService';
import toast from 'react-hot-toast';
import CustomerSearchModal from './CustomerSearchModal';
import PropertySearchModal from './PropertySearchModal';
import VendorSearchModal from './VendorSearchModal';

/**
 * 상담 등록/수정 모달
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onSuccess - 성공 시 콜백
 * @param {Object} props.editData - 수정할 데이터 (없으면 신규 등록)
 * @param {Object} props.defaultData - 기본값 설정 (예: 물건번호, 고객번호, 협력업체ID 등)
 */
const ConsultationModal = ({ isOpen, onClose, onSuccess, editData = null, defaultData = {} }) => {
  const [formData, setFormData] = useState({
    itvType: '',
    itvDate: new Date().toISOString().split('T')[0],
    custNo: null,
    custName: '',
    custPhone: '',
    ptNo: null,
    ptAddress: '', // 물건주소 (표시용)
    itvContent: '',
    itvMemo: '',
    vendorId: null,
    vendorName: '', // 협력업체명 (표시용)
  });

  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showPropertySearch, setShowPropertySearch] = useState(false);
  const [showVendorSearch, setShowVendorSearch] = useState(false);

  // 상담 유형
  const interviewTypes = [
    { value: 'ITVTYP01', label: '전화상담' },
    { value: 'ITVTYP02', label: '방문상담' },
    { value: 'ITVTYP03', label: '현장상담' },
    { value: 'ITVTYP04', label: '온라인상담' },
  ];

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      // 수정 모드
      setFormData({
        itvType: editData.itvType || '',
        itvDate: editData.itvDate ? editData.itvDate.split('T')[0] : new Date().toISOString().split('T')[0],
        custNo: editData.custNo || null,
        custName: editData.custName || '',
        custPhone: editData.custPhone || '',
        ptNo: editData.ptNo || null,
        ptAddress: editData.ptAddress || '',
        itvContent: editData.itvContent || '',
        itvMemo: editData.itvMemo || '',
        vendorId: editData.vendorId || null,
        vendorName: editData.vendorName || '',
      });
    } else {
      // 신규 등록 모드 - defaultData 적용
      setFormData({
        itvType: defaultData.itvType || '',
        itvDate: new Date().toISOString().split('T')[0],
        custNo: defaultData.custNo || null,
        custName: defaultData.custName || '',
        custPhone: defaultData.custPhone || '',
        ptNo: defaultData.ptNo || null,
        ptAddress: defaultData.ptAddress || '',
        itvContent: '',
        itvMemo: '',
        vendorId: defaultData.vendorId || null,
        vendorName: defaultData.vendorName || '',
      });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomerSelect = (customer) => {
    setFormData((prev) => ({
      ...prev,
      custNo: customer.custNo,
      custName: customer.custName,
      custPhone: customer.custPhone || '',
    }));
    setShowCustomerSearch(false);
  };

  const handlePropertySelect = (property) => {
    setFormData((prev) => ({
      ...prev,
      ptNo: property.ptNo,
      ptAddress: property.ptAddress || '',
    }));
    setShowPropertySearch(false);
  };

  const handleVendorSelect = (vendor) => {
    setFormData((prev) => ({
      ...prev,
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName || '',
    }));
    setShowVendorSearch(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 필수 필드 검증
    if (!formData.itvType) {
      toast.error('상담 유형을 선택해주세요.');
      return;
    }
    if (!formData.itvDate) {
      toast.error('상담 일자를 입력해주세요.');
      return;
    }
    if (!formData.custName) {
      toast.error('고객명을 입력해주세요.');
      return;
    }

    try {
      if (editData) {
        // 수정
        await interviewService.updateInterview(editData.itvNo, formData);
        toast.success('상담 정보가 수정되었습니다.');
      } else {
        // 등록
        await interviewService.createInterview(formData);
        toast.success('상담이 등록되었습니다.');
      }

      // 토스트 표시 후 목록 갱신 및 모달 닫기
      onSuccess && onSuccess();

      // 약간의 딜레이 후 모달 닫기 (토스트가 먼저 렌더링되도록)
      requestAnimationFrame(() => {
        onClose();
      });
    } catch (error) {
      console.error('상담 저장 실패:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {editData ? '상담 수정' : '상담 등록'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 상담 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상담 유형 <span className="text-red-500">*</span>
              </label>
              <select
                name="itvType"
                value={formData.itvType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">선택</option>
                {interviewTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 상담 일자 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상담 일자 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="itvDate"
                value={formData.itvDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* 고객 정보 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                고객명 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="custName"
                  value={formData.custName}
                  onChange={handleChange}
                  placeholder="고객명"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCustomerSearch(true)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  검색
                </button>
              </div>
              {formData.custNo && (
                <p className="text-xs text-gray-500 mt-1">고객번호: {formData.custNo}</p>
              )}
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연락처
              </label>
              <input
                type="text"
                name="custPhone"
                value={formData.custPhone}
                onChange={handleChange}
                placeholder="연락처"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 물건 정보 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                관련 물건
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="ptAddress"
                  value={formData.ptAddress}
                  onChange={handleChange}
                  placeholder="물건 주소 (직접 입력 또는 검색)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPropertySearch(true)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  검색
                </button>
              </div>
              {formData.ptNo && (
                <p className="text-xs text-gray-500 mt-1">물건번호: {formData.ptNo}</p>
              )}
            </div>

            {/* 협력업체 정보 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                관련 협력업체
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="vendorName"
                  value={formData.vendorName}
                  onChange={handleChange}
                  placeholder="협력업체명 (직접 입력 또는 검색)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowVendorSearch(true)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  검색
                </button>
              </div>
              {formData.vendorId && (
                <p className="text-xs text-gray-500 mt-1">협력업체 ID: {formData.vendorId}</p>
              )}
            </div>

            {/* 상담 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상담 내용
              </label>
              <textarea
                name="itvContent"
                value={formData.itvContent}
                onChange={handleChange}
                rows={4}
                placeholder="상담 내용을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                메모
              </label>
              <textarea
                name="itvMemo"
                value={formData.itvMemo}
                onChange={handleChange}
                rows={3}
                placeholder="메모를 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            {editData ? '수정' : '등록'}
          </button>
        </div>
      </div>

      {/* 고객 검색 모달 */}
      <CustomerSearchModal
        isOpen={showCustomerSearch}
        onClose={() => setShowCustomerSearch(false)}
        onSelect={handleCustomerSelect}
      />

      {/* 물건 검색 모달 */}
      <PropertySearchModal
        isOpen={showPropertySearch}
        onClose={() => setShowPropertySearch(false)}
        onSelect={handlePropertySelect}
      />

      {/* 협력업체 검색 모달 */}
      <VendorSearchModal
        isOpen={showVendorSearch}
        onClose={() => setShowVendorSearch(false)}
        onSelect={handleVendorSelect}
      />
    </div>
  );
};

export default ConsultationModal;

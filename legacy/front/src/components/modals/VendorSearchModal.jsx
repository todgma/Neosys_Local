import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { vendorService } from '../../services/vendorService';
import toast from 'react-hot-toast';

/**
 * 협력업체 검색 모달
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onSelect - 협력업체 선택 콜백
 */
const VendorSearchModal = ({ isOpen, onClose, onSelect }) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (isOpen) {
      handleSearch();
    }
  }, [isOpen, currentPage]);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const response = await vendorService.getVendorList(
        searchKeyword || null, // vendorName
        null, // offNo
        null, // useYn
        currentPage,
        pageSize
      );

      if (response.success && response.data) {
        setVendors(response.data.vendors || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('협력업체 검색 실패:', error);
      toast.error('협력업체 검색에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      handleSearch();
    }
  };

  const handleSelectVendor = (vendor) => {
    onSelect({
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
    });
  };

  const getCategoryText = (category1, category2, category3) => {
    const categories = [category1, category2, category3].filter(Boolean);
    return categories.join(' > ') || '-';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">협력업체 검색</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="업체명으로 검색"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                setCurrentPage(1);
                handleSearch();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              검색
            </button>
          </div>
        </div>

        {/* Vendor List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              검색 결과가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {vendors.map((vendor) => (
                <button
                  key={vendor.vendorId}
                  onClick={() => handleSelectVendor(vendor)}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {vendor.vendorName}
                        </span>
                        {vendor.useYn === 'Y' ? (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                            사용중
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                            미사용
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span>{getCategoryText(vendor.category1, vendor.category2, vendor.category3)}</span>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-700 mt-2">
                        {vendor.ceoName && <span>대표: {vendor.ceoName}</span>}
                        {vendor.managerName && <span>담당자: {vendor.managerName}</span>}
                        {(vendor.managerPhone || vendor.managerTel) && (
                          <span>연락처: {vendor.managerPhone || vendor.managerTel}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 ml-4">
                      업체ID: {vendor.vendorId}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && vendors.length > 0 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t bg-gray-50">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorSearchModal;

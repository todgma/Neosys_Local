import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import toast from 'react-hot-toast';

/**
 * 물건 검색 모달
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onSelect - 물건 선택 콜백
 */
const PropertySearchModal = ({ isOpen, onClose, onSelect }) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [properties, setProperties] = useState([]);
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
      const response = await propertyService.getList(
        null, // ptNo
        searchKeyword || null, // keyword
        currentPage,
        pageSize
      );

      if (response?.data) {
        const propertyList = response.data.ptSales || [];
        setProperties(propertyList);
        setTotalPages(Math.ceil((response.data.totalCount || propertyList.length) / pageSize));
      }
    } catch (error) {
      console.error('물건 검색 실패:', error);
      toast.error('물건 검색에 실패했습니다.');
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

  const handleSelectProperty = (property) => {
    const address = [property.addr1, property.addr2, property.addr3].filter(Boolean).join(' ');
    onSelect({
      ptNo: property.ptNo,
      ptAddress: address,
      ptName: property.ptName,
      ptType: property.ptType,
    });
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    if (price >= 10000) {
      return `${(price / 10000).toFixed(1)}억`;
    }
    return `${price.toLocaleString()}만`;
  };

  const getSaleDivLabel = (saleDiv) => {
    const labels = {
      'SALEDIV01': '매매',
      'SALEDIV02': '전세',
      'SALEDIV03': '월세',
      'SALEDIV04': '기타임대',
    };
    return labels[saleDiv] || '-';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">물건 검색</h3>
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
              placeholder="물건명 또는 주소로 검색"
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

        {/* Property List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              검색 결과가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {properties.map((property) => {
                const address = [property.addr1, property.addr2, property.addr3].filter(Boolean).join(' ');
                return (
                  <button
                    key={property.ptNo}
                    onClick={() => handleSelectProperty(property)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {property.ptName || address}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {getSaleDivLabel(property.saleDiv)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {address}
                          {property.dong && <span className="ml-2">{property.dong}동</span>}
                          {property.ho && <span className="ml-1">{property.ho}호</span>}
                        </div>
                        <div className="flex gap-4 text-sm text-gray-700 mt-2">
                          {property.saleAmt > 0 && (
                            <span className="font-medium text-indigo-600">
                              매매: {formatPrice(property.saleAmt)}
                            </span>
                          )}
                          {property.protAmt > 0 && (
                            <span className="font-medium text-blue-600">
                              보증금: {formatPrice(property.protAmt)}
                            </span>
                          )}
                          {property.monAmt > 0 && (
                            <span className="font-medium text-green-600">
                              월세: {formatPrice(property.monAmt)}
                            </span>
                          )}
                          {property.excArea > 0 && (
                            <span>전용: {property.excArea.toFixed(2)}㎡</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 ml-4">
                        물건번호: {property.ptNo}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && properties.length > 0 && (
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

export default PropertySearchModal;

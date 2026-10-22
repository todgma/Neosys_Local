import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { vendorService } from '../../services/vendorService';
import { useAuthStore } from '../../stores/authStore';

const VendorRegionModal = ({ isOpen, onClose, vendor }) => {
  const { user } = useAuthStore();
  const [regionList, setRegionList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (vendor) {
      fetchRegionList();
    }
  }, [vendor]);

  const fetchRegionList = async () => {
    setIsLoading(true);
    try {
      const response = await vendorService.getVendorRegionList(null, vendor.vendorId, 1, 100);
      if (response.success && response.data) {
        setRegionList(response.data.vendorRegions || []);
      }
    } catch (error) {
      console.error('영업지역 목록 조회 실패:', error);
      toast.error('영업지역 목록 조회에 실패했습니다.');
      setRegionList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRegion = async (region) => {
    if (!window.confirm('이 영업지역을 삭제하시겠습니까?')) return;

    try {
      const response = await vendorService.deleteVendorRegion(region.vendorRegionId, user?.userId);
      if (response.success) {
        toast.success('영업지역이 삭제되었습니다.');
        fetchRegionList();
      }
    } catch (error) {
      console.error('영업지역 삭제 실패:', error);
      toast.error(error.message || '영업지역 삭제에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200" style={{ backgroundColor: '#6366f1' }}>
          <h2 className="text-base font-semibold text-white">
            영업지역 관리 - {vendor?.vendorName}
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div style={{ padding: '8px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: '13px' }}>
              로딩 중...
            </div>
          ) : (
            <>
              {regionList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: '13px' }}>
                  등록된 영업지역이 없습니다.
                </div>
              ) : (
                <div style={{ marginBottom: '8px', padding: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 4px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>■ 영업지역 목록</h4>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginTop: '4px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>지역코드</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>정렬순서</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>사용여부</th>
                        <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #e2e8f0', width: '80px' }}>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regionList.map((region, index) => (
                        <tr key={region.vendorRegionId} style={{ borderBottom: index < regionList.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '4px 8px' }}>{region.regionCode}</td>
                          <td style={{ padding: '4px 8px' }}>{region.sortOrder}</td>
                          <td style={{ padding: '4px 8px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              backgroundColor: region.useYn === 'Y' ? '#dcfce7' : '#f3f4f6',
                              color: region.useYn === 'Y' ? '#166534' : '#4b5563'
                            }}>
                              {region.useYn === 'Y' ? '사용' : '미사용'}
                            </span>
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleDeleteRegion(region)}
                              style={{
                                padding: '2px 6px',
                                fontSize: '11px',
                                color: '#dc2626',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                              title="삭제"
                            >
                              <Trash2 style={{ width: '14px', height: '14px' }} />
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={onClose}
            style={{ padding: '4px 16px', fontSize: '13px', border: '1px solid #cbd5e1', backgroundColor: 'white', borderRadius: '3px', cursor: 'pointer' }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorRegionModal;

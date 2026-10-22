import React, { useState, useEffect } from 'react';
import { holderService } from '../../services/holderService';
import { useAuthStore } from '../../stores/authStore';
import { useHubModalStore } from '../../stores/hubModalStore';
import ResizableModal from '../ui/ResizableModal';
import ConsultationHistoryPanel from '../consultation/ConsultationHistoryPanel';
import { saleDivLabel } from '../../constants/tradeDivisions';
import { toast } from 'react-hot-toast';

const PropertyViewModal = ({ isOpen, onClose, property, onEdit }) => {
  const { user } = useAuthStore();
  const { openWithProperty } = useHubModalStore();
  const [activeTab, setActiveTab] = useState('basic');
  const [holders, setHolders] = useState([]);
  const [currentHolder, setCurrentHolder] = useState({
    holderRegDate: '',
    holderName: '',
    holderPhone: '',
    custNo: '',
    holderRelation: '',
    holderMemo: '',
  });
  const [showHolderHistory, setShowHolderHistory] = useState(false);

  const propertyTypes = {
    'apartment': '아파트',
    'officetel': '오피스텔',
    'store': '상가',
    'office': '사무실',
    'building': '건물',
    'land': '토지',
    'knowledge-industry': '지식산업센터',
  };

  const propertyStatuses = {
    'PTSTS01': '진행중',
    'PTSTS02': '계약',
    'PTSTS03': '타계',
    'PTSTS04': '보류',
  };

  const tradeDivisions = {
    'SALEDIV01': '매매',
    'SALEDIV02': '전세',
    'SALEDIV03': '월세',
    'SALEDIV04': '기타임대',
  };

  const tabs = [
    { id: 'basic', label: '기본정보' },
    { id: 'detail', label: '상세정보' },
    { id: 'consultation', label: '상담이력' },
  ];

  useEffect(() => {
    console.log('PropertyViewModal opened:', { isOpen, property });
    if (isOpen && property?.ptNo) {
      loadHolders(property.ptNo);
    }
  }, [isOpen, property]);

  const loadHolders = async (ptNo) => {
    try {
      const response = await holderService.getList(ptNo);
      if (response.success && response.data?.ptHolders) {
        const holderList = response.data.ptHolders;
        setHolders(holderList);
        if (holderList.length > 0) {
          const latestHolder = holderList[0];
          setCurrentHolder({
            holderRegDate: latestHolder.holderRegDate || '',
            holderName: latestHolder.holderName || '',
            holderPhone: latestHolder.holderPhone || '',
            custNo: latestHolder.custNo || '',
            holderRelation: latestHolder.holderRelation || '',
            holderMemo: latestHolder.holderMemo || '',
          });
        }
      }
    } catch (error) {
      console.error('소유주 정보 조회 실패:', error);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    if (price >= 10000) {
      return `${(price / 10000).toFixed(1)}억`;
    }
    return `${price.toLocaleString()}만원`;
  };

  if (!isOpen) return null;

  // property가 없거나 빈 객체인 경우 처리
  if (!property || Object.keys(property).length === 0) {
    return (
      <ResizableModal
        isOpen={isOpen}
        onClose={onClose}
        title="물건 정보"
        initialWidth={600}
        initialHeight={400}
      >
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">물건 정보를 불러올 수 없습니다.</p>
        </div>
      </ResizableModal>
    );
  }

  return (
    <ResizableModal
      isOpen={isOpen}
      onClose={onClose}
      title={`물건 상세 - ${property?.ptName || '물건정보'}`}
      initialWidth={1200}
      initialHeight={800}
      minWidth={900}
      minHeight={600}
      footer={
        <div className="flex items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => openWithProperty(property)}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-md hover:bg-sky-600"
          >
            정보망전송
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => {
                onEdit?.(property);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              수정
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* 탭 헤더 */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '1.5rem' }}>
          {/* 소유주 정보 - 모든 탭에 공통 표시 */}
          <div className="mb-6 p-4 border-2 border-indigo-200 rounded-lg bg-indigo-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-indigo-900">소유주 정보</h4>
              <button
                type="button"
                onClick={() => setShowHolderHistory(!showHolderHistory)}
                className="px-3 py-1 text-xs font-medium text-white bg-indigo-500 rounded hover:bg-indigo-600"
              >
                {showHolderHistory ? '이력 숨기기' : `이력 보기 (${holders.length})`}
              </button>
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">등록일자</label>
                <div className="px-2 py-1.5 text-sm bg-white rounded border border-gray-300">
                  {currentHolder.holderRegDate || '-'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">소유주명</label>
                <div className="px-2 py-1.5 text-sm bg-white rounded border border-gray-300">
                  {currentHolder.holderName || '-'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">연락처</label>
                <div className="px-2 py-1.5 text-sm bg-white rounded border border-gray-300">
                  {currentHolder.holderPhone || '-'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">관계</label>
                <div className="px-2 py-1.5 text-sm bg-white rounded border border-gray-300">
                  {currentHolder.holderRelation || '-'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">비고</label>
                <div className="px-2 py-1.5 text-sm bg-white rounded border border-gray-300">
                  {currentHolder.holderMemo || '-'}
                </div>
              </div>
            </div>

            {/* 소유주 이력 */}
            {showHolderHistory && holders.length > 0 && (
              <div className="mt-4 border-t border-indigo-200 pt-3">
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-indigo-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-700">등록일</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-700">소유주명</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-700">연락처</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-700">관계</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-700">비고</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {holders.map((holder, index) => (
                        <tr key={index} className="hover:bg-indigo-50">
                          <td className="px-2 py-1.5">{holder.holderRegDate}</td>
                          <td className="px-2 py-1.5">{holder.holderName}</td>
                          <td className="px-2 py-1.5">{holder.holderPhone}</td>
                          <td className="px-2 py-1.5">{holder.holderRelation}</td>
                          <td className="px-2 py-1.5">{holder.holderMemo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 기본정보 탭 */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">물건명</label>
                    <div className="text-base">{property.ptName || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">물건유형</label>
                    <div className="text-base">{propertyTypes[property.ptType] || property.ptType || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">물건설명</label>
                    <div className="text-base">{property.ptExpl || '-'}</div>
                  </div>
                </div>
              </div>

              {/* 물건 상태 */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">물건 상태</h3>
                <div className="flex gap-4 flex-wrap">
                  {Array.isArray(property.ptSts) && property.ptSts.length > 0 ? (
                    property.ptSts.map((status) => (
                      <span key={status} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                        {propertyStatuses[status] || status}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
              </div>

              {/* 거래 구분 */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">거래 구분</h3>
                <div className="flex gap-4 flex-wrap">
                  {Array.isArray(property.saleDiv) && property.saleDiv.length > 0 ? (
                    property.saleDiv.map((division) => (
                      <span key={division} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {saleDivLabel(division)}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
              </div>

              {/* 주소 정보 */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">주소 정보</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">시/도</label>
                    <div className="text-base">{property.addr1 || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">구/군</label>
                    <div className="text-base">{property.addr2 || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">동/읍/면</label>
                    <div className="text-base">{property.addr3 || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">상세주소</label>
                    <div className="text-base">{property.addr4 || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">동</label>
                    <div className="text-base">{property.dong || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">호</label>
                    <div className="text-base">{property.ho || '-'}</div>
                  </div>
                </div>
              </div>

              {/* 면적 정보 */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">면적 및 층 정보</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">공급면적(㎡)</label>
                    <div className="text-base">{property.supArea ? property.supArea.toFixed(2) : '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">전용면적(㎡)</label>
                    <div className="text-base">{property.excArea ? property.excArea.toFixed(2) : '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">층</label>
                    <div className="text-base">{property.floor || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">방/화장실</label>
                    <div className="text-base">{property.roomCnt || '0'} / {property.bathCnt || '0'}</div>
                  </div>
                </div>
              </div>

              {/* 가격 정보 */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">가격 정보</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">매매가</label>
                    <div className="text-lg font-semibold text-indigo-600">{formatPrice(property.saleAmt)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">전세가</label>
                    <div className="text-lg font-semibold text-blue-600">{formatPrice(property.lesAmt)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">보증금</label>
                    <div className="text-lg font-semibold text-green-600">{formatPrice(property.protAmt)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">월세</label>
                    <div className="text-lg font-semibold text-orange-600">{formatPrice(property.monAmt)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">관리비</label>
                    <div className="text-base">{formatPrice(property.maintCost)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 상세정보 탭 */}
          {activeTab === 'detail' && (
            <div className="space-y-6">
              {/* 추가 정보 */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">추가 정보</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">방향</label>
                    <div className="text-base">{property.dirStd || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">난방방식</label>
                    <div className="text-base">{property.heatMethod || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">난방연료</label>
                    <div className="text-base">{property.heatFuel || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">건물구조</label>
                    <div className="text-base">{property.buidStruct || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">발코니 확장</label>
                    <div className="text-base">{property.balcExt || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">주차 대수</label>
                    <div className="text-base">{property.pkCnt || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">준공년도</label>
                    <div className="text-base">{property.compYear || '-'}</div>
                  </div>
                </div>
              </div>

              {/* 임차인 정보 */}
              {(property.tenant || property.tenantTel) && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">임차인 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">성함</label>
                      <div className="text-base">{property.tenant || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">별칭</label>
                      <div className="text-base">{property.tenantAlias || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">관계</label>
                      <div className="text-base">{property.tenantRelation || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                      <div className="text-base">{property.tenantTel || '-'}</div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                      <div className="text-base">{property.tenantAddr || '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 상담이력 탭 */}
          {activeTab === 'consultation' && (
            <div className="bg-white rounded-lg border border-gray-200" style={{ minHeight: '500px' }}>
              <ConsultationHistoryPanel
                ptNo={property.ptNo}
                defaultData={{
                  ptNo: property.ptNo,
                  ptName: property.ptName,
                  ptType: property.ptType,
                }}
                autoOpen={true}
              />
            </div>
          )}
        </div>
      </div>
    </ResizableModal>
  );
};

export default PropertyViewModal;

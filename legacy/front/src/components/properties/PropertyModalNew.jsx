import React, { useState, useEffect } from 'react';
import { propertyService } from '../../services/propertyService';
import { useAuthStore } from '../../stores/authStore';
import { useHubModalStore } from '../../stores/hubModalStore';
import ResizableModal from '../ui/ResizableModal';
import ConsultationHistoryPanel from '../consultation/ConsultationHistoryPanel';
import { toast } from 'react-hot-toast';

const PropertyModalNew = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const { user } = useAuthStore();
  const { openWithProperty } = useHubModalStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'detail'
  const [expandedSections, setExpandedSections] = useState({
    ownerInfo: false,
    tenantInfo: false,
  });

  const [formData, setFormData] = useState({
    ptName: '',
    prgSts: 'PRGSTS01',
    ptSts: [],
    ptType: 'apartment',
    ptExpl: '',
    saleDiv: [],
    addr1: '',
    addr2: '',
    addr3: '',
    addr4: '',
    dong: '',
    ho: '',
    floor: '',
    supArea: '',
    excArea: '',
    roomCnt: '',
    bathCnt: '',
    dirStd: '',
    saleAmt: '',
    lesAmt: '',
    protAmt: '',
    monAmt: '',
    maintCost: '',
    heatMethod: '',
    heatFuel: '',
    buidStruct: '',
    balcExt: '',
    pkCnt: '',
    compYear: '',
    owner: '',
    ownerAlias: '',
    ownerRelation: '',
    ownerTel: '',
    ownerAddr: '',
    tenant: '',
    tenantAlias: '',
    tenantRelation: '',
    tenantTel: '',
    tenantAddr: '',
    offNo: user?.offNo || '',
    rtNo: user?.rtNo || '',
    userId: user?.userId || '',
  });

  const propertyTypes = [
    { value: 'apartment', label: '아파트' },
    { value: 'officetel', label: '오피스텔' },
    { value: 'store', label: '상가' },
    { value: 'office', label: '사무실' },
    { value: 'building', label: '건물' },
    { value: 'land', label: '토지' },
    { value: 'knowledge-industry', label: '지식산업센터' },
  ];

  const propertyStatuses = [
    { value: 'PTSTS01', label: '진행중' },
    { value: 'PTSTS02', label: '계약' },
    { value: 'PTSTS03', label: '타계' },
    { value: 'PTSTS04', label: '보류' },
  ];

  const tradeDivisions = [
    { value: 'SALEDIV01', label: '매매' },
    { value: 'SALEDIV02', label: '전세' },
    { value: 'SALEDIV03', label: '월세' },
    { value: 'SALEDIV04', label: '기타임대' },
  ];

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setFormData({
        ptName: '',
        prgSts: 'PRGSTS01',
        ptSts: [],
        ptType: 'apartment',
        ptExpl: '',
        saleDiv: [],
        addr1: '',
        addr2: '',
        addr3: '',
        addr4: '',
        dong: '',
        ho: '',
        floor: '',
        supArea: '',
        excArea: '',
        roomCnt: '',
        bathCnt: '',
        dirStd: '',
        saleAmt: '',
        lesAmt: '',
        protAmt: '',
        monAmt: '',
        maintCost: '',
        heatMethod: '',
        heatFuel: '',
        buidStruct: '',
        balcExt: '',
        pkCnt: '',
        compYear: '',
        owner: '',
        ownerAlias: '',
        ownerRelation: '',
        ownerTel: '',
        ownerAddr: '',
        tenant: '',
        tenantAlias: '',
        tenantRelation: '',
        tenantTel: '',
        tenantAddr: '',
        offNo: user?.offNo || '',
        rtNo: user?.rtNo || '',
        userId: user?.userId || '',
        ...editData,
      });
    } else {
      setFormData({
        ptName: '',
        prgSts: 'PRGSTS01',
        ptSts: [],
        ptType: 'apartment',
        ptExpl: '',
        saleDiv: [],
        addr1: '',
        addr2: '',
        addr3: '',
        addr4: '',
        dong: '',
        ho: '',
        floor: '',
        supArea: '',
        excArea: '',
        roomCnt: '',
        bathCnt: '',
        dirStd: '',
        saleAmt: '',
        lesAmt: '',
        protAmt: '',
        monAmt: '',
        maintCost: '',
        heatMethod: '',
        heatFuel: '',
        buidStruct: '',
        balcExt: '',
        pkCnt: '',
        compYear: '',
        owner: '',
        ownerAlias: '',
        ownerRelation: '',
        ownerTel: '',
        ownerAddr: '',
        tenant: '',
        tenantAlias: '',
        tenantRelation: '',
        tenantTel: '',
        tenantAddr: '',
        offNo: user?.offNo || '',
        rtNo: user?.rtNo || '',
        userId: user?.userId || '',
      });
    }
  }, [isOpen]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field, value, checked) => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(v => v !== value) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.ptName) {
      toast.error('물건명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      if (editData) {
        await propertyService.update(editData.ptNo, formData);
        toast.success('물건이 수정되었습니다.');
      } else {
        await propertyService.create(formData);
        toast.success('물건이 등록되었습니다.');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('물건 저장 실패:', error);
      toast.error(editData ? '물건 수정에 실패했습니다.' : '물건 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic', label: '기본정보' },
    { id: 'detail', label: '상세정보' },
  ];

  return (
    <ResizableModal
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? '물건 수정' : '물건 등록'}
      initialWidth={1200}
      initialHeight={800}
      minWidth={900}
      minHeight={600}
    >
      <div className="flex flex-col h-full">
        {/* 상단 버튼 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => {
              if (editData && editData.ptNo) {
                openWithProperty(editData);
              } else {
                toast.error('저장된 물건 정보만 정보망 전송이 가능합니다.');
              }
            }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-sky-500 hover:bg-sky-600"
          >
            정보망전송
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? '저장 중...' : (editData ? '수정' : '등록')}
            </button>
          </div>
        </div>

        {/* 탭 헤더 */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 상단: 탭 컨텐츠 (스크롤 가능) - 70% */}
        <div style={{ flex: '0 0 70%', overflowY: 'auto' }}>
          {/* 소유자/임차인 토글 버튼 */}
          <div className="flex gap-2 px-2 py-2 border-b border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => toggleSection('ownerInfo')}
              className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              소유자
            </button>
            <button
              type="button"
              onClick={() => toggleSection('tenantInfo')}
              className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              임차인
            </button>
          </div>

          {/* 기본정보 탭 */}
          {activeTab === 'basic' && (
            <div className="p-2 space-y-2">
              {/* 소유자 정보 확장 패널 */}
              {expandedSections.ownerInfo && (
                <div className="border border-indigo-300 p-2 bg-indigo-50 animate-slideDown">
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">소유자 정보</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-700 mb-0.5">성함</label>
                      <input
                        type="text"
                        value={formData.owner}
                        onChange={(e) => handleChange('owner', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 mb-0.5">별칭</label>
                      <input
                        type="text"
                        value={formData.ownerAlias}
                        onChange={(e) => handleChange('ownerAlias', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 mb-0.5">관계</label>
                      <input
                        type="text"
                        value={formData.ownerRelation}
                        onChange={(e) => handleChange('ownerRelation', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 mb-0.5">전화번호</label>
                      <input
                        type="text"
                        value={formData.ownerTel}
                        onChange={(e) => handleChange('ownerTel', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-700 mb-0.5">주소</label>
                      <input
                        type="text"
                        value={formData.ownerAddr}
                        onChange={(e) => handleChange('ownerAddr', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 임차인 정보 확장 패널 */}
              {expandedSections.tenantInfo && (
                <div className="border border-indigo-300 p-2 bg-indigo-50 animate-slideDown">
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">임차인 정보</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">성함</label>
                      <input
                        type="text"
                        value={formData.tenant}
                        onChange={(e) => handleChange('tenant', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">별칭</label>
                      <input
                        type="text"
                        value={formData.tenantAlias}
                        onChange={(e) => handleChange('tenantAlias', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">관계</label>
                      <input
                        type="text"
                        value={formData.tenantRelation}
                        onChange={(e) => handleChange('tenantRelation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                      <input
                        type="text"
                        value={formData.tenantTel}
                        onChange={(e) => handleChange('tenantTel', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                      <input
                        type="text"
                        value={formData.tenantAddr}
                        onChange={(e) => handleChange('tenantAddr', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 물건 상태 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">물건 상태</label>
                <div className="flex gap-4 flex-wrap">
                  {propertyStatuses.map((status) => (
                    <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.ptSts?.includes(status.value) || false}
                        onChange={(e) => handleCheckboxChange('ptSts', status.value, e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 물건 종류 & 거래 구분 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">물건 종류</label>
                  <select
                    value={formData.ptType}
                    onChange={(e) => handleChange('ptType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {propertyTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">거래 구분</label>
                  <div className="flex gap-4 flex-wrap">
                    {tradeDivisions.map((division) => (
                      <label key={division.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.saleDiv?.includes(division.value) || false}
                          onChange={(e) => handleCheckboxChange('saleDiv', division.value, e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-indigo-600"
                        />
                        <span className="text-sm text-gray-700">{division.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    물건명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ptName}
                    onChange={(e) => handleChange('ptName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">물건설명</label>
                  <input
                    type="text"
                    value={formData.ptExpl}
                    onChange={(e) => handleChange('ptExpl', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 주소 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">물건 주소</label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={formData.addr1}
                    onChange={(e) => handleChange('addr1', e.target.value)}
                    placeholder="시/도"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={formData.addr2}
                    onChange={(e) => handleChange('addr2', e.target.value)}
                    placeholder="구/군"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={formData.addr3}
                    onChange={(e) => handleChange('addr3', e.target.value)}
                    placeholder="동/읍/면"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={formData.addr4}
                    onChange={(e) => handleChange('addr4', e.target.value)}
                    placeholder="상세주소"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="text"
                    value={formData.dong}
                    onChange={(e) => handleChange('dong', e.target.value)}
                    placeholder="동"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={formData.ho}
                    onChange={(e) => handleChange('ho', e.target.value)}
                    placeholder="호"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 면적 정보 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">면적 정보</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">공급면적(㎡)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.supArea}
                      onChange={(e) => handleChange('supArea', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">전용면적(㎡)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.excArea}
                      onChange={(e) => handleChange('excArea', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">층</label>
                    <input
                      type="number"
                      value={formData.floor}
                      onChange={(e) => handleChange('floor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 가격 정보 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">가격 정보</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">매매가(만원)</label>
                    <input
                      type="number"
                      value={formData.saleAmt}
                      onChange={(e) => handleChange('saleAmt', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">전세가(만원)</label>
                    <input
                      type="number"
                      value={formData.lesAmt}
                      onChange={(e) => handleChange('lesAmt', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">보증금(만원)</label>
                    <input
                      type="number"
                      value={formData.protAmt}
                      onChange={(e) => handleChange('protAmt', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">월세(만원)</label>
                    <input
                      type="number"
                      value={formData.monAmt}
                      onChange={(e) => handleChange('monAmt', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 상세정보 탭 */}
          {activeTab === 'detail' && (
            <div className="p-2 space-y-2">
              {/* 추가 정보 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">방 개수</label>
                  <input
                    type="number"
                    value={formData.roomCnt}
                    onChange={(e) => handleChange('roomCnt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">욕실 개수</label>
                  <input
                    type="number"
                    value={formData.bathCnt}
                    onChange={(e) => handleChange('bathCnt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주차 대수</label>
                  <input
                    type="number"
                    value={formData.pkCnt}
                    onChange={(e) => handleChange('pkCnt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">방향</label>
                  <input
                    type="text"
                    value={formData.dirStd}
                    onChange={(e) => handleChange('dirStd', e.target.value)}
                    placeholder="예: 남향, 남동향"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">난방방식</label>
                  <input
                    type="text"
                    value={formData.heatMethod}
                    onChange={(e) => handleChange('heatMethod', e.target.value)}
                    placeholder="예: 개별난방, 중앙난방"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">난방연료</label>
                  <input
                    type="text"
                    value={formData.heatFuel}
                    onChange={(e) => handleChange('heatFuel', e.target.value)}
                    placeholder="예: 도시가스, 전기"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">건물구조</label>
                  <input
                    type="text"
                    value={formData.buidStruct}
                    onChange={(e) => handleChange('buidStruct', e.target.value)}
                    placeholder="예: 철근콘크리트"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">발코니 확장</label>
                  <input
                    type="text"
                    value={formData.balcExt}
                    onChange={(e) => handleChange('balcExt', e.target.value)}
                    placeholder="예: 확장, 미확장"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">준공년도</label>
                  <input
                    type="text"
                    value={formData.compYear}
                    onChange={(e) => handleChange('compYear', e.target.value)}
                    placeholder="예: 2020"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">관리비(만원)</label>
                <input
                  type="number"
                  value={formData.maintCost}
                  onChange={(e) => handleChange('maintCost', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 하단: 상담이력 고정 패널 - 30% */}
        <div className="border-t border-gray-200" style={{ flex: '0 0 30%', minHeight: '200px' }}>
          {editData?.ptNo ? (
            <ConsultationHistoryPanel
              ptNo={editData.ptNo}
              defaultData={{
                ptNo: editData.ptNo,
                ptName: editData.ptName,
                ptType: editData.ptType,
              }}
              autoOpen={true}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <p className="text-sm text-gray-500">물건 저장 후 상담이력을 등록할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* ERP 스타일: 빽빽한 레이아웃 */
        input[type="text"],
        input[type="number"],
        select {
          padding: 2px 6px !important;
          font-size: 0.813rem !important;
          height: 24px !important;
          border-radius: 2px !important;
        }

        label {
          font-size: 0.875rem !important;
          margin-bottom: 2px !important;
          font-weight: 600 !important;
        }

        .space-y-6 > * + * {
          margin-top: 8px !important;
        }

        .space-y-2 > * + * {
          margin-top: 4px !important;
        }

        .gap-4 {
          gap: 6px !important;
        }

        .gap-2 {
          gap: 4px !important;
        }

        .p-6 {
          padding: 8px !important;
        }

        .p-2 {
          padding: 4px !important;
        }

        .mb-4 {
          margin-bottom: 6px !important;
        }

        .mb-2 {
          margin-bottom: 4px !important;
        }

        .mb-1 {
          margin-bottom: 2px !important;
        }

        h3 {
          font-size: 0.875rem !important;
          margin-bottom: 6px !important;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </ResizableModal>
  );
};

export default PropertyModalNew;

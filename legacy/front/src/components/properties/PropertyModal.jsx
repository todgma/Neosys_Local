import React, { useState, useEffect } from 'react';
import { propertyService } from '../../services/propertyService';
import { holderService } from '../../services/holderService';
import addressService from '../../services/common/addressService';
import { useAuthStore } from '../../stores/authStore';
import { useHubModalStore } from '../../stores/hubModalStore';
import ResizableModal from '../ui/ResizableModal';
import { toast } from 'react-hot-toast';
import { PROPERTY_TYPES } from '../../constants/propertyTypes';

const PropertyModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const { user } = useAuthStore();
  const { openWithProperty } = useHubModalStore();
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    ownerInfo: false,
    tenantInfo: false,
  });
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
  const [editingHolderIdx, setEditingHolderIdx] = useState(null);
  const [isCustomRelation, setIsCustomRelation] = useState(false);
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [eupMyeonDongList, setEupMyeonDongList] = useState([]);
  const [danjiList, setDanjiList] = useState([]);
  const [selectedSido, setSelectedSido] = useState('');
  const [selectedSigungu, setSelectedSigungu] = useState('');
  const [selectedEupMyeonDong, setSelectedEupMyeonDong] = useState('');
  const [formData, setFormData] = useState({
    ptName: '',
    ptSts: [], // 물건상태 - 체크박스
    ptType: 'SYCA101', // 물건유형 - 아파트 기본값
    ptExpl: '',
    saleDiv: [], // 거래구분 - 체크박스
    addr1: '',
    addr2: '',
    addr3: '',
    addr4: '',
    addr5: '',
    addrPost: '',
    bjdCode: '',
    danjiCode: '',
    dong: '',
    ho: '',
    floor: '',
    opt: '',
    houseCnt: '',
    aptTyp: '',
    supArea: '',
    excArea: '',
    landShare: '',
    roomCnt: '',
    bathCnt: '',
    dirStd: '',
    heatMethod: '',
    heatFuel: '',
    entrStruct: '',
    buidStruct: '',
    balcExt: '',
    floor1: '',
    floor2: '',
    pkCnt: '',
    maintCost: '',
    maintDtl: '',
    saleAmt: '',
    lesAmt: '',
    protAmt: '',
    monAmt: '',
    etcAmt: '',
    layAmt: '',
    nowDepAmt: '',
    nowMonAmt: '',
    loanAmt: '',
    loanAmtAft: '',
    mtryDate: '',
    exptMovDate: '',
    exptDate: '',
    exptComDate: '',
    compYear: '',
    shaYn: 'N',
    custNo: '',
    offNo: user?.offNo || '',
    rtNo: user?.rtNo || '',
    owner: '',
    ownerAlias: '',
    ownerRelation: '',
    ownerTel: '',
    ownerAddr: '',
    ownerId: '',
    tenant: '',
    tenantAlias: '',
    tenantRelation: '',
    tenantTel: '',
    tenantAddr: '',
    tenantId: '',
    buyer: '',
    buyerTel: '',
    buyerId: '',
    cnNo: '',
    cnDt: '',
    cnType: '',
    cnDoc: '',
    cnVer: '',
    tradeAmt: '',
    cnAmtPart: '',
    cnAmtPartDate: '',
    cnAmt: '',
    cnAmtDate: '',
    midAmt: '',
    midAmtDate: '',
    rmdAmt: '',
    rmdAmtDate: '',
    spcCnDesc: '',
    mvnPsbYn: 'N',
    houseRental: 'N',
    petYn: 'N',
    top: '',
    ptMemo: '',
    userId: user?.userId || '',
  });


  const propertyStatuses = [
    { value: 'PTSTS01', label: '진행중222' },
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
    if (isOpen) {
      loadSidoList();
    }
  }, [isOpen]);

  const loadSidoList = async () => {
    try {
      const data = await addressService.getSidoList();
      setSidoList(data || []);
    } catch (error) {
      console.error('시도 목록 조회 실패:', error);
      toast.error('시도 목록을 불러오지 못했습니다.');
    }
  };

  const handleSidoChange = async (sidoCode) => {
    setSelectedSido(sidoCode);
    setSelectedSigungu('');
    setSelectedEupMyeonDong('');
    setSigunguList([]);
    setEupMyeonDongList([]);
    setDanjiList([]);

    if (sidoCode) {
      try {
        const data = await addressService.getSigunguList(sidoCode);
        setSigunguList(data || []);
      } catch (error) {
        console.error('시군구 목록 조회 실패:', error);
        toast.error('시군구 목록을 불러오지 못했습니다.');
      }
    }
  };

  const handleSigunguChange = async (sigunguCode) => {
    setSelectedSigungu(sigunguCode);
    setSelectedEupMyeonDong('');
    setEupMyeonDongList([]);
    setDanjiList([]);

    if (sigunguCode) {
      try {
        const data = await addressService.getEupMyeonDongList(sigunguCode);
        setEupMyeonDongList(data || []);
      } catch (error) {
        console.error('읍면동 목록 조회 실패:', error);
        toast.error('읍면동 목록을 불러오지 못했습니다.');
      }
    }
  };

  const handleEupMyeonDongChange = async (bjdCode, bjdName) => {
    setSelectedEupMyeonDong(bjdCode);
    handleChange('bjdCode', bjdCode);
    handleChange('addr3', bjdName);

    if (bjdCode) {
      try {
        const data = await addressService.getDanjiListByBjd(bjdCode);
        setDanjiList(data || []);
      } catch (error) {
        console.error('단지 목록 조회 실패:', error);
        toast.error('단지 목록을 불러오지 못했습니다.');
      }
    }
  };

  const handleDanjiChange = (danjiCode, danjiName) => {
    handleChange('danjiCode', danjiCode);
    handleChange('addr4', danjiName);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setFormData({
        ptName: '',
        ptSts: [],
        ptType: 'SYCA101',
        ptExpl: '',
        saleDiv: [],
        addr1: '',
        addr2: '',
        addr3: '',
        addr4: '',
        addr5: '',
        addrPost: '',
        bjdCode: '',
        danjiCode: '',
        dong: '',
        ho: '',
        floor: '',
        opt: '',
        houseCnt: '',
        aptTyp: '',
        supArea: '',
        excArea: '',
        landShare: '',
        roomCnt: '',
        bathCnt: '',
        dirStd: '',
        heatMethod: '',
        heatFuel: '',
        entrStruct: '',
        buidStruct: '',
        balcExt: '',
        floor1: '',
        floor2: '',
        pkCnt: '',
        maintCost: '',
        maintDtl: '',
        saleAmt: '',
        lesAmt: '',
        protAmt: '',
        monAmt: '',
        etcAmt: '',
        layAmt: '',
        nowDepAmt: '',
        nowMonAmt: '',
        loanAmt: '',
        loanAmtAft: '',
        mtryDate: '',
        exptMovDate: '',
        exptDate: '',
        exptComDate: '',
        compYear: '',
        shaYn: 'N',
        custNo: '',
        offNo: user?.offNo || '',
        rtNo: user?.rtNo || '',
        owner: '',
        ownerAlias: '',
        ownerRelation: '',
        ownerTel: '',
        ownerAddr: '',
        ownerId: '',
        tenant: '',
        tenantAlias: '',
        tenantRelation: '',
        tenantTel: '',
        tenantAddr: '',
        tenantId: '',
        buyer: '',
        buyerTel: '',
        buyerId: '',
        cnNo: '',
        cnDt: '',
        cnType: '',
        cnDoc: '',
        cnVer: '',
        tradeAmt: '',
        cnAmtPart: '',
        cnAmtPartDate: '',
        cnAmt: '',
        cnAmtDate: '',
        midAmt: '',
        midAmtDate: '',
        rmdAmt: '',
        rmdAmtDate: '',
        spcCnDesc: '',
        mvnPsbYn: 'N',
        houseRental: 'N',
        petYn: 'N',
        top: '',
        ptMemo: '',
        userId: user?.userId || '',
        ...editData,
      });
      // 수정 모드일 때 소유주 정보 조회
      if (editData.ptNo) {
        loadHolders(editData.ptNo);
      }
    } else {
      // 초기화
      setFormData({
        ptName: '',
        ptSts: [],
        ptType: 'SYCA101',
        ptExpl: '',
        saleDiv: [],
        addr1: '',
        addr2: '',
        addr3: '',
        addr4: '',
        addr5: '',
        addrPost: '',
        bjdCode: '',
        danjiCode: '',
        dong: '',
        ho: '',
        floor: '',
        opt: '',
        houseCnt: '',
        aptTyp: '',
        supArea: '',
        excArea: '',
        landShare: '',
        roomCnt: '',
        bathCnt: '',
        dirStd: '',
        heatMethod: '',
        heatFuel: '',
        entrStruct: '',
        buidStruct: '',
        balcExt: '',
        floor1: '',
        floor2: '',
        pkCnt: '',
        maintCost: '',
        maintDtl: '',
        saleAmt: '',
        lesAmt: '',
        protAmt: '',
        monAmt: '',
        etcAmt: '',
        layAmt: '',
        nowDepAmt: '',
        nowMonAmt: '',
        loanAmt: '',
        loanAmtAft: '',
        mtryDate: '',
        exptMovDate: '',
        exptDate: '',
        exptComDate: '',
        compYear: '',
        shaYn: 'N',
        custNo: '',
        offNo: user?.offNo || '',
        rtNo: user?.rtNo || '',
        owner: '',
        ownerAlias: '',
        ownerRelation: '',
        ownerTel: '',
        ownerAddr: '',
        ownerId: '',
        tenant: '',
        tenantAlias: '',
        tenantRelation: '',
        tenantTel: '',
        tenantAddr: '',
        tenantId: '',
        buyer: '',
        buyerTel: '',
        buyerId: '',
        cnNo: '',
        cnDt: '',
        cnType: '',
        cnDoc: '',
        cnVer: '',
        tradeAmt: '',
        cnAmtPart: '',
        cnAmtPartDate: '',
        cnAmt: '',
        cnAmtDate: '',
        midAmt: '',
        midAmtDate: '',
        rmdAmt: '',
        rmdAmtDate: '',
        spcCnDesc: '',
        mvnPsbYn: 'N',
        houseRental: 'N',
        petYn: 'N',
        top: '',
        ptMemo: '',
        userId: user?.userId || '',
      });
      setHolders([]);
      setCurrentHolder({
        holderRegDate: '',
        holderName: '',
        holderPhone: '',
        custNo: '',
        holderRelation: '',
        holderMemo: '',
      });
      setShowHolderHistory(false);
    }
  }, [isOpen]);

  const loadHolders = async (ptNo) => {
    try {
      const response = await holderService.getList(ptNo);
      if (response.success && response.data?.ptHolders) {
        const holderList = response.data.ptHolders;
        setHolders(holderList);
        // 최신 소유주 정보를 currentHolder에 설정
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

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleHolderChange = (field, value) => {
    setCurrentHolder(prev => ({ ...prev, [field]: value }));

    // 관계 필드가 "직접입력"이면 커스텀 입력 모드 활성화
    if (field === 'holderRelation') {
      setIsCustomRelation(value === '직접입력');
      if (value !== '직접입력') {
        // 직접입력이 아닌 경우 선택된 값 설정
        setCurrentHolder(prev => ({ ...prev, holderRelation: value }));
      } else {
        // 직접입력 선택 시 빈 값으로 초기화
        setCurrentHolder(prev => ({ ...prev, holderRelation: '' }));
      }
    }
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

  const handleSaveHolder = async () => {
    if (!currentHolder.holderName) {
      toast.error('소유주명을 입력해주세요.');
      return;
    }

    if (!editData?.ptNo) {
      toast.error('물건을 먼저 저장해주세요.');
      return;
    }

    try {
      // 등록일자를 자동으로 현재 날짜로 설정 (신규 등록 시)
      const holderDataToSave = {
        ...currentHolder,
        holderRegDate: editingHolderIdx !== null
          ? currentHolder.holderRegDate
          : new Date().toISOString().split('T')[0]
      };

      if (editingHolderIdx !== null) {
        // 수정
        await holderService.update(
          editData.ptNo,
          editingHolderIdx,
          user?.userId,
          holderDataToSave
        );
        toast.success('소유주 정보가 수정되었습니다.');
      } else {
        // 신규 등록
        await holderService.create(
          editData.ptNo,
          user?.userId,
          holderDataToSave
        );
        toast.success('소유주 정보가 등록되었습니다.');
      }

      // 소유주 목록 새로고침
      await loadHolders(editData.ptNo);
      setEditingHolderIdx(null);
    } catch (error) {
      console.error('소유주 정보 저장 실패:', error);
      toast.error('소유주 정보 저장에 실패했습니다.');
    }
  };

  const handleEditHolder = (holder) => {
    setCurrentHolder({
      holderRegDate: holder.holderRegDate || '',
      holderName: holder.holderName || '',
      holderPhone: holder.holderPhone || '',
      custNo: holder.custNo || '',
      holderRelation: holder.holderRelation || '',
      holderMemo: holder.holderMemo || '',
    });
    setEditingHolderIdx(holder.holderIdx);

    // 기본 옵션이 아니면 직접입력 모드로 설정
    const defaultOptions = ['', '본인', '배우자', '자녀', '부모'];
    if (!defaultOptions.includes(holder.holderRelation)) {
      setIsCustomRelation(true);
    } else {
      setIsCustomRelation(false);
    }
  };

  const handleDeleteHolder = async (holder) => {
    if (!confirm('소유주 정보를 삭제하시겠습니까?')) return;

    try {
      await holderService.delete(
        editData.ptNo,
        holder.holderIdx,
        user?.userId
      );
      toast.success('소유주 정보가 삭제되었습니다.');
      await loadHolders(editData.ptNo);
    } catch (error) {
      console.error('소유주 정보 삭제 실패:', error);
      toast.error('소유주 정보 삭제에 실패했습니다.');
    }
  };

  const handleNewHolder = () => {
    setCurrentHolder({
      holderRegDate: new Date().toISOString().split('T')[0],
      holderName: '',
      holderPhone: '',
      custNo: '',
      holderRelation: '',
      holderMemo: '',
    });
    setEditingHolderIdx(null);
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

  return (
    <ResizableModal
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? '물건 수정' : '물건 등록'}
      initialWidth={1000}
      initialHeight={750}
      minWidth={700}
      minHeight={550}
      footer={
        <div className="flex items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => {
              if (editData && editData.ptNo) {
                openWithProperty(editData);
              } else {
                toast.error('저장된 물건 정보만 정보망 전송이 가능합니다.');
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-md hover:bg-sky-600"
          >
            정보망전송2
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? '저장 중...' : (editData ? '수정' : '등록')}
            </button>
          </div>
        </div>
      }
    >
      {/* 폼 */}
      <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="p-6 space-y-6" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* 소유주 정보 - 최상단 가로배치 */}
          <div className="mb-6 p-4 border-2 border-indigo-200 rounded-lg bg-indigo-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-indigo-900">소유주 정보</h4>
              <div className="flex gap-2">
                {editData?.ptNo && (
                  <>
                    <button
                      type="button"
                      onClick={handleNewHolder}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600"
                    >
                      신규
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHolderHistory(!showHolderHistory)}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-500 rounded hover:bg-indigo-600"
                    >
                      {showHolderHistory ? '이력 숨기기' : `+ 이력 (${holders.length})`}
                    </button>
                  </>
                )}
                {editData?.ptNo && (
                  <button
                    type="button"
                    onClick={handleSaveHolder}
                    className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
                  >
                    저장
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">관계</label>
                {!isCustomRelation ? (
                  <select
                    value={currentHolder.holderRelation}
                    onChange={(e) => handleHolderChange('holderRelation', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">선택</option>
                    <option value="본인">본인</option>
                    <option value="배우자">배우자</option>
                    <option value="자녀">자녀</option>
                    <option value="부모">부모</option>
                    <option value="직접입력">직접입력</option>
                  </select>
                ) : (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={currentHolder.holderRelation}
                      onChange={(e) => setCurrentHolder(prev => ({ ...prev, holderRelation: e.target.value }))}
                      placeholder="관계 입력"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomRelation(false);
                        setCurrentHolder(prev => ({ ...prev, holderRelation: '' }));
                      }}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                      title="선택으로 돌아가기"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">소유주명</label>
                <input
                  type="text"
                  value={currentHolder.holderName}
                  onChange={(e) => handleHolderChange('holderName', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">연락처</label>
                <input
                  type="text"
                  value={currentHolder.holderPhone}
                  onChange={(e) => handleHolderChange('holderPhone', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">비고</label>
                <input
                  type="text"
                  value={currentHolder.holderMemo}
                  onChange={(e) => handleHolderChange('holderMemo', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                        <th className="px-2 py-1.5 text-center font-medium text-gray-700">작업</th>
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
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleEditHolder(holder)}
                              className="px-2 py-0.5 text-xs text-blue-600 hover:text-blue-800 mr-1"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHolder(holder)}
                              className="px-2 py-0.5 text-xs text-red-600 hover:text-red-800"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* === 소재지 === */}
          <div className="border-t-2 border-gray-300 pt-4">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-indigo-600 rounded"></span>
              소재지
            </h3>

            <div className="space-y-3">
              {/* 주소 선택 */}
              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">주소</label>
                <div className="col-span-10 grid grid-cols-4 gap-2">
                  <select
                    value={selectedSido}
                    onChange={(e) => {
                      const selected = sidoList.find(item => item.bjdCode === e.target.value);
                      handleChange('addr1', selected?.bjdName || '');
                      handleSidoChange(e.target.value);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="">시/도</option>
                    {sidoList.map((sido) => (
                      <option key={sido.bjdCode} value={sido.bjdCode}>{sido.bjdName}</option>
                    ))}
                  </select>
                  <select
                    value={selectedSigungu}
                    onChange={(e) => {
                      const selected = sigunguList.find(item => item.bjdCode === e.target.value);
                      handleChange('addr2', selected?.bjdName || '');
                      handleSigunguChange(e.target.value);
                    }}
                    disabled={!selectedSido}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-gray-100"
                  >
                    <option value="">시/군/구</option>
                    {sigunguList.map((sigungu) => (
                      <option key={sigungu.bjdCode} value={sigungu.bjdCode}>{sigungu.bjdName}</option>
                    ))}
                  </select>
                  <select
                    value={selectedEupMyeonDong}
                    onChange={(e) => {
                      const selected = eupMyeonDongList.find(item => item.bjdCode === e.target.value);
                      handleEupMyeonDongChange(e.target.value, selected?.bjdName || '');
                    }}
                    disabled={!selectedSigungu}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-gray-100"
                  >
                    <option value="">읍/면/동</option>
                    {eupMyeonDongList.map((emd) => (
                      <option key={emd.bjdCode} value={emd.bjdCode}>{emd.bjdName}</option>
                    ))}
                  </select>
                  <select
                    value={formData.danjiCode}
                    onChange={(e) => {
                      const selected = danjiList.find(item => item.danjiCode === e.target.value);
                      handleDanjiChange(e.target.value, selected?.danjiName || '');
                    }}
                    disabled={!selectedEupMyeonDong}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-gray-100"
                  >
                    <option value="">단지</option>
                    {danjiList.map((danji) => (
                      <option key={danji.danjiCode} value={danji.danjiCode}>{danji.danjiName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 동/층/호 */}
              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">동/층/호</label>
                <div className="col-span-10 grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.dong}
                    onChange={(e) => handleChange('dong', e.target.value)}
                    placeholder="동"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => handleChange('floor', e.target.value)}
                    placeholder="층"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <input
                    type="text"
                    value={formData.ho}
                    onChange={(e) => handleChange('ho', e.target.value)}
                    placeholder="호"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 임차인 정보 */}
          <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
            <h4 className="text-sm font-semibold text-purple-900 mb-3">임차인 정보</h4>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">성함</label>
                <input
                  type="text"
                  value={formData.tenant}
                  onChange={(e) => handleChange('tenant', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">별칭</label>
                <input
                  type="text"
                  value={formData.tenantAlias}
                  onChange={(e) => handleChange('tenantAlias', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">관계</label>
                <input
                  type="text"
                  value={formData.tenantRelation}
                  onChange={(e) => handleChange('tenantRelation', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">전화번호</label>
                <input
                  type="text"
                  value={formData.tenantTel}
                  onChange={(e) => handleChange('tenantTel', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">주소</label>
                <input
                  type="text"
                  value={formData.tenantAddr}
                  onChange={(e) => handleChange('tenantAddr', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* === 기본 정보 === */}
          <div className="border-t-2 border-gray-300 pt-4">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-indigo-600 rounded"></span>
              기본 정보
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">물건명 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.ptName}
                  onChange={(e) => handleChange('ptName', e.target.value)}
                  className="col-span-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">물건 유형</label>
                <select
                  value={formData.ptType}
                  onChange={(e) => handleChange('ptType', e.target.value)}
                  className="col-span-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PROPERTY_TYPES.map(type => (
                    <option key={type.code} value={type.code}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">물건 상태</label>
                <div className="col-span-10 flex gap-4 flex-wrap">
                  {propertyStatuses.map((status) => (
                    <label key={status.value} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-indigo-600">
                      <input
                        type="checkbox"
                        checked={formData.ptSts.includes(status.value)}
                        onChange={(e) => handleCheckboxChange('ptSts', status.value, e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-indigo-600"
                      />
                      <span>{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">거래 구분</label>
                <div className="col-span-10 flex gap-4 flex-wrap">
                  {tradeDivisions.map((division) => (
                    <label key={division.value} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-indigo-600">
                      <input
                        type="checkbox"
                        checked={formData.saleDiv.includes(division.value)}
                        onChange={(e) => handleCheckboxChange('saleDiv', division.value, e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-indigo-600"
                      />
                      <span>{division.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">공급/전용면적</label>
                <div className="col-span-10 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.supArea}
                    onChange={(e) => handleChange('supArea', e.target.value)}
                    placeholder="공급면적(㎡)"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.excArea}
                    onChange={(e) => handleChange('excArea', e.target.value)}
                    placeholder="전용면적(㎡)"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">방/화장실</label>
                <div className="col-span-10 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={formData.roomCnt}
                    onChange={(e) => handleChange('roomCnt', e.target.value)}
                    placeholder="방 개수"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    value={formData.bathCnt}
                    onChange={(e) => handleChange('bathCnt', e.target.value)}
                    placeholder="욕실 개수"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">물건설명</label>
                <textarea
                  value={formData.ptExpl}
                  onChange={(e) => handleChange('ptExpl', e.target.value)}
                  rows={2}
                  className="col-span-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* === 금액 정보 === */}
          <div className="border-t-2 border-gray-300 pt-4">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-indigo-600 rounded"></span>
              금액 정보
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">매매가</label>
                <div className="col-span-10 flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.saleAmt}
                    onChange={(e) => handleChange('saleAmt', e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">만원</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">전세가</label>
                <div className="col-span-10 flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.lesAmt}
                    onChange={(e) => handleChange('lesAmt', e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">만원</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">보증금/월세</label>
                <div className="col-span-10 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.protAmt}
                      onChange={(e) => handleChange('protAmt', e.target.value)}
                      placeholder="보증금"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-600">만원</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.monAmt}
                      onChange={(e) => handleChange('monAmt', e.target.value)}
                      placeholder="월세"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-600">만원</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">관리비</label>
                <div className="col-span-10 flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.maintCost}
                    onChange={(e) => handleChange('maintCost', e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">만원</span>
                </div>
              </div>
            </div>
          </div>

          {/* === 기타 정보 === */}
          <div className="border-t-2 border-gray-300 pt-4">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-indigo-600 rounded"></span>
              기타 정보
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 items-center">
                <label className="col-span-2 text-sm font-medium text-gray-700">메모</label>
                <textarea
                  value={formData.ptMemo}
                  onChange={(e) => handleChange('ptMemo', e.target.value)}
                  rows={3}
                  placeholder="물건 관련 메모를 입력하세요"
                  className="col-span-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          </div>
        </form>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% {
            box-shadow: 0 2px 4px rgba(99, 102, 241, 0.4);
          }
          50% {
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.8);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .animate-pulse-slow:hover {
          animation: none;
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

export default PropertyModal;

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { hubService } from '../../services/hubService';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

/**
 * 공동중개망 등록/수정 모달
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onSuccess - 성공 시 콜백
 * @param {Object} props.editData - 수정할 데이터 (없으면 신규 등록)
 * @param {string} props.defaultTradeDiv - 기본 거래구분 ('CUST' | 'PT')
 */
const HubModal = ({ isOpen, onClose, onSuccess, editData = null, defaultTradeDiv = 'CUST' }) => {
  const { user, office } = useAuthStore();
  const [formData, setFormData] = useState({
    tradeDiv: defaultTradeDiv,
    tradeState: 'active',
    tradeStatus: 'Y',
    isCustRegistered: false,
    isPtRegistered: false,
    custNo: null,
    ptNo: null,
    tradeStateDesc: '',

    // 공동중개 필드
    coBrokerageTitle: '',
    coBrokerageContent: '',
    coBrokerageMemo: '',

    // 고객 정보 필드
    custType: '',
    custName: '',
    custAlias: '',
    custTel: '',
    custAddr: '',
    custMemo: '',
    custRentBsnYn: 'N',
    custTrdPrg: '',
    custWantType: '',
    custExcAreaFr: '',
    custExcAreaTo: '',
    custRegion1: '',
    custRegion2: '',
    custRegion3: '',
    custTrdType: '',
    custTrdTypeDetail: '',
    custSaleAmtFr: '',
    custSaleAmtTo: '',
    custLesAmtFr: '',
    custLesAmtTo: '',
    custProtAmtFr: '',
    custProtAmtTo: '',
    custMonAmtFr: '',
    custMonAmtTo: '',
    custMoveinYn: 'N',
    custMoveDateFr: '',
    custMoveDateTo: '',
    custCashAblt: '',
    custRmk: '',

    // 물건 정보 필드
    pPtName: '',
    pPtType: '',
    pSaleDiv: '',
    pSaleAmt: '',
    pNowDepAmt: '',
    pNowMonAmt: '',
    pExcArea: '',
    pSupArea: '',
    pAddrFull: '',
    pDong: '',
    pHo: '',
    pFloor1: '',
    pFloor2: '',
    pFloorDesc: '',
    pDirStd: '',
    pBalcExt: '',
    pRoomCnt: '',
    pBathCnt: '',
    pPkCnt: '',
    pMaintCost: '',
    pHeatMethod: '',
    pHeatFuel: '',
    pHeatSystem: '',
    pBuidStruct: '',
    immediateMoveinYn: 'N',
    pExptDate: '',
    pPrgSts: '',
    pOpt: '',
    pPtExpl: '',
    pCompYear: '',
    ownerRentBsnYn: 'N',
  });

  const [autoRegisterCustomer, setAutoRegisterCustomer] = useState(false);
  const [autoRegisterProperty, setAutoRegisterProperty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      // 수정 모드
      setFormData({
        tradeDiv: editData.tradeDiv || defaultTradeDiv,
        tradeState: editData.tradeState || 'active',
        tradeStatus: editData.tradeStatus || 'Y',
        isCustRegistered: editData.isCustRegistered || false,
        isPtRegistered: editData.isPtRegistered || false,
        custNo: editData.custNo || null,
        ptNo: editData.ptNo || null,
        tradeStateDesc: editData.tradeStateDesc || '',

        // 공동중개 정보
        coBrokerageTitle: editData.coBrokerageTitle || '',
        coBrokerageContent: editData.coBrokerageContent || '',
        coBrokerageMemo: editData.coBrokerageMemo || '',

        // 고객 정보
        custType: editData.custType || '',
        custName: editData.custName || '',
        custAlias: editData.custAlias || '',
        custTel: editData.custTel || '',
        custAddr: editData.custAddr || '',
        custMemo: editData.custMemo || '',
        custRentBsnYn: editData.custRentBsnYn || 'N',
        custTrdPrg: editData.custTrdPrg || '',
        custWantType: editData.custWantType || '',
        custExcAreaFr: editData.custExcAreaFr || '',
        custExcAreaTo: editData.custExcAreaTo || '',
        custRegion1: editData.custRegion1 || '',
        custRegion2: editData.custRegion2 || '',
        custRegion3: editData.custRegion3 || '',
        custTrdType: editData.custTrdType || '',
        custTrdTypeDetail: editData.custTrdTypeDetail || '',
        custSaleAmtFr: editData.custSaleAmtFr || '',
        custSaleAmtTo: editData.custSaleAmtTo || '',
        custLesAmtFr: editData.custLesAmtFr || '',
        custLesAmtTo: editData.custLesAmtTo || '',
        custProtAmtFr: editData.custProtAmtFr || '',
        custProtAmtTo: editData.custProtAmtTo || '',
        custMonAmtFr: editData.custMonAmtFr || '',
        custMonAmtTo: editData.custMonAmtTo || '',
        custMoveinYn: editData.custMoveinYn || 'N',
        custMoveDateFr: editData.custMoveDateFr || '',
        custMoveDateTo: editData.custMoveDateTo || '',
        custCashAblt: editData.custCashAblt || '',
        custRmk: editData.custRmk || '',

        // 물건 정보
        pPtName: editData.pPtName || '',
        pPtType: editData.pPtType || '',
        pSaleDiv: editData.pSaleDiv || '',
        pSaleAmt: editData.pSaleAmt || '',
        pNowDepAmt: editData.pNowDepAmt || '',
        pNowMonAmt: editData.pNowMonAmt || '',
        pExcArea: editData.pExcArea || '',
        pSupArea: editData.pSupArea || '',
        pAddrFull: editData.pAddrFull || '',
        pDong: editData.pDong || '',
        pHo: editData.pHo || '',
        pFloor1: editData.pFloor1 || '',
        pFloor2: editData.pFloor2 || '',
        pFloorDesc: editData.pFloorDesc || '',
        pDirStd: editData.pDirStd || '',
        pBalcExt: editData.pBalcExt || '',
        pRoomCnt: editData.pRoomCnt || '',
        pBathCnt: editData.pBathCnt || '',
        pPkCnt: editData.pPkCnt || '',
        pMaintCost: editData.pMaintCost || '',
        pHeatMethod: editData.pHeatMethod || '',
        pHeatFuel: editData.pHeatFuel || '',
        pHeatSystem: editData.pHeatSystem || '',
        pBuidStruct: editData.pBuidStruct || '',
        immediateMoveinYn: editData.immediateMoveinYn || 'N',
        pExptDate: editData.pExptDate || '',
        pPrgSts: editData.pPrgSts || '',
        pOpt: editData.pOpt || '',
        pPtExpl: editData.pPtExpl || '',
        pCompYear: editData.pCompYear || '',
        ownerRentBsnYn: editData.ownerRentBsnYn || 'N',
      });
    } else {
      // 신규 등록 모드
      resetForm();
    }
  }, [isOpen, editData]);

  const resetForm = () => {
    setFormData({
      tradeDiv: defaultTradeDiv,
      tradeState: 'active',
      tradeStatus: 'Y',
      isCustRegistered: false,
      isPtRegistered: false,
      custNo: null,
      ptNo: null,
      tradeStateDesc: '',

      coBrokerageTitle: '',
      coBrokerageContent: '',
      coBrokerageMemo: '',

      custType: '',
      custName: '',
      custAlias: '',
      custTel: '',
      custAddr: '',
      custMemo: '',
      custRentBsnYn: 'N',
      custTrdPrg: '',
      custWantType: '',
      custExcAreaFr: '',
      custExcAreaTo: '',
      custRegion1: '',
      custRegion2: '',
      custRegion3: '',
      custTrdType: '',
      custTrdTypeDetail: '',
      custSaleAmtFr: '',
      custSaleAmtTo: '',
      custLesAmtFr: '',
      custLesAmtTo: '',
      custProtAmtFr: '',
      custProtAmtTo: '',
      custMonAmtFr: '',
      custMonAmtTo: '',
      custMoveinYn: 'N',
      custMoveDateFr: '',
      custMoveDateTo: '',
      custCashAblt: '',
      custRmk: '',

      pPtName: '',
      pPtType: '',
      pSaleDiv: '',
      pSaleAmt: '',
      pNowDepAmt: '',
      pNowMonAmt: '',
      pExcArea: '',
      pSupArea: '',
      pAddrFull: '',
      pDong: '',
      pHo: '',
      pFloor1: '',
      pFloor2: '',
      pFloorDesc: '',
      pDirStd: '',
      pBalcExt: '',
      pRoomCnt: '',
      pBathCnt: '',
      pPkCnt: '',
      pMaintCost: '',
      pHeatMethod: '',
      pHeatFuel: '',
      pHeatSystem: '',
      pBuidStruct: '',
      immediateMoveinYn: 'N',
      pExptDate: '',
      pPrgSts: '',
      pOpt: '',
      pPtExpl: '',
      pCompYear: '',
      ownerRentBsnYn: 'N',
    });
    setAutoRegisterCustomer(false);
    setAutoRegisterProperty(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 필수 필드 검증
    if (formData.tradeDiv === 'CUST') {
      if (!formData.custName) {
        toast.error('고객명을 입력해주세요.');
        return;
      }
    } else if (formData.tradeDiv === 'PT') {
      if (!formData.pPtName) {
        toast.error('물건명을 입력해주세요.');
        return;
      }
    }

    try {
      const submitData = {
        ...formData,
        offNo: office?.offNo,
      };

      if (editData) {
        // 수정
        await hubService.updateHub(editData.tradeId, submitData);
      } else {
        // 등록
        await hubService.createHub(submitData, user?.userId, autoRegisterCustomer, autoRegisterProperty);
      }

      // 먼저 모달 닫기
      onClose();

      // 모달이 닫힌 후 토스트 표시
      setTimeout(() => {
        if (editData) {
          toast.success('거래정보가 수정되었습니다.');
        } else {
          toast.success('거래정보가 등록되었습니다.');
        }
        onSuccess && onSuccess();
      }, 100);
    } catch (error) {
      console.error('거래정보 저장 실패:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {editData ? '거래정보 수정' : '거래정보 등록'}
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 거래 구분 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  거래 구분 <span className="text-red-500">*</span>
                </label>
                <select
                  name="tradeDiv"
                  value={formData.tradeDiv}
                  onChange={handleChange}
                  disabled={editData !== null}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                >
                  <option value="CUST">고객</option>
                  <option value="PT">물건</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상태
                </label>
                <select
                  name="tradeState"
                  value={formData.tradeState}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">활성</option>
                  <option value="matching">매칭중</option>
                  <option value="completed">완료</option>
                  <option value="canceled">취소</option>
                  <option value="hold">보류</option>
                </select>
              </div>
            </div>

            {/* 상태 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태 설명
              </label>
              <input
                type="text"
                name="tradeStateDesc"
                value={formData.tradeStateDesc}
                onChange={handleChange}
                placeholder="상태에 대한 설명을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 공동중개 섹션 */}
            <div className="border-t pt-4">
              <h3 className="text-md font-semibold text-gray-800 mb-4">공동중개 정보</h3>

              {/* 공동중개 제목 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공동중개 제목
                </label>
                <input
                  type="text"
                  name="coBrokerageTitle"
                  value={formData.coBrokerageTitle}
                  onChange={handleChange}
                  placeholder="공동중개 제목을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 공동중개 내용 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공동중개 내용
                </label>
                <textarea
                  name="coBrokerageContent"
                  value={formData.coBrokerageContent}
                  onChange={handleChange}
                  rows={3}
                  placeholder="공동중개 내용을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 공동중개 메모 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공동중개 메모
                </label>
                <textarea
                  name="coBrokerageMemo"
                  value={formData.coBrokerageMemo}
                  onChange={handleChange}
                  rows={2}
                  placeholder="공동중개 메모를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 고객 정보 섹션 */}
            {formData.tradeDiv === 'CUST' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">고객 정보</h3>

                  {/* 고객명, 별칭 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        고객명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="custName"
                        value={formData.custName}
                        onChange={handleChange}
                        placeholder="고객명"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        별칭
                      </label>
                      <input
                        type="text"
                        name="custAlias"
                        value={formData.custAlias}
                        onChange={handleChange}
                        placeholder="별칭"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 연락처, 주소 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        연락처
                      </label>
                      <input
                        type="text"
                        name="custTel"
                        value={formData.custTel}
                        onChange={handleChange}
                        placeholder="010-0000-0000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        주소
                      </label>
                      <input
                        type="text"
                        name="custAddr"
                        value={formData.custAddr}
                        onChange={handleChange}
                        placeholder="주소"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 희망 물건종류, 거래구분 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        희망 물건종류
                      </label>
                      <input
                        type="text"
                        name="custWantType"
                        value={formData.custWantType}
                        onChange={handleChange}
                        placeholder="아파트, 오피스텔 등"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        거래구분
                      </label>
                      <input
                        type="text"
                        name="custTrdType"
                        value={formData.custTrdType}
                        onChange={handleChange}
                        placeholder="매매, 전세, 월세 등"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 희망지역 */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        시/도
                      </label>
                      <input
                        type="text"
                        name="custRegion1"
                        value={formData.custRegion1}
                        onChange={handleChange}
                        placeholder="서울특별시"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        시/군/구
                      </label>
                      <input
                        type="text"
                        name="custRegion2"
                        value={formData.custRegion2}
                        onChange={handleChange}
                        placeholder="강남구"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        읍/면/동
                      </label>
                      <input
                        type="text"
                        name="custRegion3"
                        value={formData.custRegion3}
                        onChange={handleChange}
                        placeholder="역삼동"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 희망 전용면적 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        희망 전용면적 (㎡) - 시작
                      </label>
                      <input
                        type="number"
                        name="custExcAreaFr"
                        value={formData.custExcAreaFr}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        희망 전용면적 (㎡) - 끝
                      </label>
                      <input
                        type="number"
                        name="custExcAreaTo"
                        value={formData.custExcAreaTo}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 희망 매매가 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        희망 매매가 (만원) - 시작
                      </label>
                      <input
                        type="number"
                        name="custSaleAmtFr"
                        value={formData.custSaleAmtFr}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        희망 매매가 (만원) - 끝
                      </label>
                      <input
                        type="number"
                        name="custSaleAmtTo"
                        value={formData.custSaleAmtTo}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 희망 전세금 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        희망 전세금 (만원) - 시작
                      </label>
                      <input
                        type="number"
                        name="custLesAmtFr"
                        value={formData.custLesAmtFr}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        희망 전세금 (만원) - 끝
                      </label>
                      <input
                        type="number"
                        name="custLesAmtTo"
                        value={formData.custLesAmtTo}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 비고 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      비고
                    </label>
                    <textarea
                      name="custRmk"
                      value={formData.custRmk}
                      onChange={handleChange}
                      rows={3}
                      placeholder="추가 메모"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 물건 정보 섹션 */}
            {formData.tradeDiv === 'PT' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">물건 정보</h3>

                  {/* 물건명, 물건종류 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        물건명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="pPtName"
                        value={formData.pPtName}
                        onChange={handleChange}
                        placeholder="물건명"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        물건종류
                      </label>
                      <input
                        type="text"
                        name="pPtType"
                        value={formData.pPtType}
                        onChange={handleChange}
                        placeholder="아파트, 오피스텔 등"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 주소 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      주소
                    </label>
                    <input
                      type="text"
                      name="pAddrFull"
                      value={formData.pAddrFull}
                      onChange={handleChange}
                      placeholder="전체 주소"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 동/호수 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        동
                      </label>
                      <input
                        type="text"
                        name="pDong"
                        value={formData.pDong}
                        onChange={handleChange}
                        placeholder="101동"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        호수
                      </label>
                      <input
                        type="text"
                        name="pHo"
                        value={formData.pHo}
                        onChange={handleChange}
                        placeholder="1001호"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 거래구분, 가격 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        거래구분
                      </label>
                      <input
                        type="text"
                        name="pSaleDiv"
                        value={formData.pSaleDiv}
                        onChange={handleChange}
                        placeholder="매매, 전세, 월세 등"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        가격 (만원)
                      </label>
                      <input
                        type="number"
                        name="pSaleAmt"
                        value={formData.pSaleAmt}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 현재 보증금/월세 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        현재 보증금 (만원)
                      </label>
                      <input
                        type="number"
                        name="pNowDepAmt"
                        value={formData.pNowDepAmt}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        현재 월세 (만원)
                      </label>
                      <input
                        type="number"
                        name="pNowMonAmt"
                        value={formData.pNowMonAmt}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 전용/공급면적 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        전용면적 (㎡)
                      </label>
                      <input
                        type="number"
                        name="pExcArea"
                        value={formData.pExcArea}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        공급면적 (㎡)
                      </label>
                      <input
                        type="number"
                        name="pSupArea"
                        value={formData.pSupArea}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 방/화장실 개수 */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        방 개수
                      </label>
                      <input
                        type="number"
                        name="pRoomCnt"
                        value={formData.pRoomCnt}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        욕실 개수
                      </label>
                      <input
                        type="number"
                        name="pBathCnt"
                        value={formData.pBathCnt}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        주차 대수
                      </label>
                      <input
                        type="number"
                        name="pPkCnt"
                        value={formData.pPkCnt}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 물건 설명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      물건 설명
                    </label>
                    <textarea
                      name="pPtExpl"
                      value={formData.pPtExpl}
                      onChange={handleChange}
                      rows={3}
                      placeholder="물건에 대한 상세 설명"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 자동 등록 옵션 (신규 등록시만) */}
            {!editData && (
              <div className="border-t pt-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">자동 등록 옵션</h3>
                <div className="space-y-2">
                  {formData.tradeDiv === 'CUST' && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoRegisterCustomer}
                        onChange={(e) => setAutoRegisterCustomer(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">고객 DB에 자동 등록</span>
                    </label>
                  )}
                  {formData.tradeDiv === 'PT' && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoRegisterProperty}
                        onChange={(e) => setAutoRegisterProperty(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">물건 DB에 자동 등록</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* 중개사무소 정보 */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">중개사무소 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사무소명
                  </label>
                  <input
                    type="text"
                    value={office?.offName || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사무소 번호
                  </label>
                  <input
                    type="text"
                    value={office?.offNo || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    대표자명
                  </label>
                  <input
                    type="text"
                    value={office?.ceoName || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    연락처
                  </label>
                  <input
                    type="text"
                    value={office?.offTel || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사무소 주소
                  </label>
                  <input
                    type="text"
                    value={office?.offAddr || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
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
    </div>
  );
};

export default HubModal;

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { hubService } from '../../services/hubService';
import { officeService } from '../../services/officeService';
import { propertyService } from '../../services/propertyService';
import { useAuthStore } from '../../stores/authStore';
import { getPropertyTypeLabel } from '../../constants/propertyTypes';
import { toRentBsnCode } from '../../constants/propertyOptions';
import toast from 'react-hot-toast';
import PropertyInfoTable from '../../components/hub/PropertyInfoTable';
import CustomerInfoTable from '../../components/hub/CustomerInfoTable';
import OfficeInfoTable from '../../components/hub/OfficeInfoTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// 내 매물(물건) → 공동중개망 물건 폼 필드 매핑
const mapPropertyToForm = (p) => {
  return {
    tradeDiv: 'PT',
    ptNo: p.ptNo,
    pPtName: p.ptName,
    pPtType: p.ptType,
    pSubType: p.subType || '',
    pSaleDiv: p.saleDiv || '', // 전체 거래구분(콤마) 유지 → 화면에 콤마 표기
    pSaleAmt: p.saleAmt,
    pNowDepAmt: p.nowDepAmt,
    pNowMonAmt: p.nowMonAmt,
    pExcArea: p.excArea,
    pSupArea: p.supArea,
    addr1: p.addr1 || '', addr2: p.addr2 || '', addr3: p.addr3 || '',
    addr4: p.addr4 || '', addr5: p.addr5 || '',
    bjdCode: p.bjdCode || '', danjiCode: p.danjiCode || '',
    pJibun: p.jibun || '',
    pAddrFull: [p.addr1, p.addr2, p.addr3, p.jibun, p.addr4, p.addr5].filter(Boolean).join(' '),
    pDong: p.dong, pHo: p.ho,
    pFloor1: p.floor1, pFloor2: p.floor2,
    pDirStd: p.dirStd, pDirBase: p.dirBase || '', pBalcExt: p.balcExt,
    pRoomCnt: p.roomCnt, pBathCnt: p.bathCnt, pPkCnt: p.pkCnt,
    pMaintCost: p.maintCost, pMaintDtl: p.maintDtl,
    pHeatMethod: p.heatMethod, pHeatFuel: p.heatFuel,
    pBuidStruct: p.buidStruct, pEntrStruct: p.entrStruct,
    pOpt: p.opt, pPtExpl: p.ptExpl, pCompYear: p.compYear,
    pAptTyp: p.aptTyp, pLandShare: p.landShare, pCurrentStatus: p.currentStatus,
    // 유형별 면적 (물건등록폼 필드명 매핑)
    pLandShareRatio: p.landShareRatio, pLandArea: p.landShare, pBuildingArea: p.buildingArea, pTotalFloorArea: p.grossArea,
    pLesAmt: p.lesAmt, pLoanAmtAft: p.loanAmtAft,
    pLoanAmt: p.loanAmt, // 대출금 = 물건등록폼 대출금액(loanAmt) 연동
    pContractRenewalRight: p.contractRenewalRight, pHouseCnt: p.houseCnt,
    ownerRentBsnYn: toRentBsnCode(p.houseRental) || 'N',
    // 제한사항(규제지역) — 물건등록폼과 동일 필드(프론트 전용)
    pZoneAdjust: p.zoneAdjust || false, pZoneOverheat: p.zoneOverheat || false,
    pZoneSpec: p.zoneSpec || false, pZoneLandPermit: p.zoneLandPermit || false,
    // 어린이/반려동물/조건부 — 물건등록폼과 동일 필드
    pChildYn: p.childYn || 'N', pPetAllow: p.petAllow || '', pChildCond: p.childCond || '',
    // 건물형 층수(지하/지상)
    pBasementFloor: p.basementFloor, pGroundFloor: p.groundFloor,
    // 건물/빌딩 금액표 (수입/지출)
    pDepositTotal: p.depositTotal, pLoanTotal: p.loanTotal, pInvestAmt: p.investAmt,
    pIncRentM: p.incRentM, pIncRentY: p.incRentY, pIncMgmtM: p.incMgmtM, pIncMgmtY: p.incMgmtY,
    pIncEtcM: p.incEtcM, pIncEtcY: p.incEtcY,
    pExpLaborM: p.expLaborM, pExpLaborY: p.expLaborY, pExpUtilM: p.expUtilM, pExpUtilY: p.expUtilY,
    pExpLoanM: p.expLoanM, pExpLoanY: p.expLoanY, pExpEtcM: p.expEtcM, pExpEtcY: p.expEtcY,
  };
};

/**
 * 공동중개망 등록/수정 페이지
 * Electron 모달 또는 standalone 페이지로 사용 가능
 */
const HubFormPage = ({ modalData: propsModalData, onClose: propsOnClose, onSuccess: propsOnSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, office, updateOffice } = useAuthStore();
  const [localOffice, setLocalOffice] = useState(office);

  const isModalMode = !!propsModalData || !!window.electronAPI?.modal;

  // URL 또는 props 또는 모달 데이터에서 전달된 데이터 가져오기
  const editData = propsModalData?.editData || location.state?.editData || null;
  const defaultTradeDiv = propsModalData?.tradeDiv || searchParams.get('tradeDiv') || location.state?.defaultTradeDiv || 'CUST';
  const propertyData = propsModalData?.propertyData || location.state?.propertyData || null;
  const customerData = propsModalData?.customerData || location.state?.customerData || null;
  const ptNo = propsModalData?.ptNo || location.state?.ptNo || null;
  const custNo = propsModalData?.custNo || location.state?.custNo || null;
  // 이미 전송된 물건이면 전송버튼 숨김 + 전송일시 표기
  const alreadyTransmitted = propsModalData?.alreadyTransmitted || location.state?.alreadyTransmitted || false;
  const transmittedAt = propsModalData?.transmittedAt || location.state?.transmittedAt || null;
  const transmittedLabel = (() => {
    if (!alreadyTransmitted || !transmittedAt) return '';
    const d = new Date(transmittedAt);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}시 ${String(d.getMinutes()).padStart(2, '0')}분에 등록`;
  })();

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

    // 고객 중개정보 추가 필드
    custRoomCnt: '', custBathCnt: '', custParkCnt: '',
    custChildYn: '', custPetYn: '', custCommunityFac: '', custFeatureNote: '',
    custBldNm: '', custBjdCode: '', custDanjiCode: '',

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

    // 담당자명 — 현재 로그인 유저 이름 기본값(수정가능)
    chargeName: user?.userName || user?.name || user?.rtName || '',

    // 소재지(주소) 구조화 - AddressSelectorSimple 연동
    addr1: '', addr2: '', addr3: '', addr4: '', addr5: '', bjdCode: '', danjiCode: '',

    // 중개정보 추가 필드
    pAptTyp: '', pLandShare: '', pCurrentStatus: '', pLesAmt: '', pMaturityDate: '',
    pBondMaxAmt: '', pLoanAmt: '', pLoanAmtAft: '', pContractRenewalRight: '', pMaintDtl: '',
    pHouseCnt: '', pEntrStruct: '',
    // 추가: 세부유형 / 방향기준 (백엔드 컬럼 필요) · 지번(pAddrFull에 포함) · 공개층은 기존 pFloorDesc(고/중/저) 사용
    pSubType: '', pDirBase: '', pJibun: '',
  });

  const [autoRegisterCustomer, setAutoRegisterCustomer] = useState(false);
  const [autoRegisterProperty, setAutoRegisterProperty] = useState(false);
  const [danjiList, setDanjiList] = useState([]);

  // 내 매물 불러오기 (물건 폼) — 신규 물건 등록은 매물 선택 전까지 폼을 가림
  const needsPropertyPick = !editData && !propertyData && !ptNo && defaultTradeDiv === 'PT';
  const [awaitingPick, setAwaitingPick] = useState(needsPropertyPick);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerList, setPickerList] = useState([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  // 이미 전송(등록)된 매물의 기존 거래정보 tradeId (수정/삭제용)
  const [existingTradeId, setExistingTradeId] = useState(null);
  // 공통 확인 모달 (window.confirm 대체 — 소유자 카드와 동일한 ConfirmDialog)
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  const loadMyProperties = async (search = '') => {
    if (!user?.offNo) { toast.error('사무소 정보가 없습니다.'); return; }
    setPickerLoading(true);
    try {
      const res = await propertyService.getList(null, search || null, 1, 50, null, null, null, user.offNo, user.rtNo);
      setPickerList(res?.data?.ptSales || []);
    } catch (error) {
      console.error('내 매물 조회 실패:', error);
      setPickerList([]);
    } finally {
      setPickerLoading(false);
    }
  };

  const openPropertyPicker = () => { setShowPicker(true); setPickerSearch(''); loadMyProperties(''); };
  const selectMyProperty = (p) => {
    setFormData((prev) => ({ ...prev, ...mapPropertyToForm(p) }));
    setShowPicker(false);
    setAwaitingPick(false); // 매물 선택 완료 → 폼 노출
  };
  // 피커 닫기: 아직 매물 선택 전(신규 물건)이면 창 자체를 닫음(선택해야 넘어감)
  const closePicker = () => {
    if (awaitingPick) { handleCancel(); return; }
    setShowPicker(false);
  };

  // 신규 '물건' 등록 진입 시: 폼 열리기 전에 매물 목록 팝업 먼저 오픈
  useEffect(() => {
    if (needsPropertyPick) openPropertyPicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이미 전송(등록)된 매물이면 기존 거래정보 전체를 불러와 폼에 반영 → 실제 값으로 수정/삭제 가능
  useEffect(() => {
    const loadExisting = async () => {
      if (editData || !alreadyTransmitted || !ptNo || !user?.offNo) return;
      try {
        const res = await hubService.getHubList({ ptNo, offNo: user.offNo, tradeDiv: 'PT', pageSize: 1 });
        const items = res?.data?.items || [];
        if (items.length > 0) {
          const t = items[0];
          setExistingTradeId(t.tradeId);
          // 기존 거래정보 값으로 폼 채움 (DB pAddr*/코드 → 주소선택기 addr* 매핑)
          setFormData((prev) => ({
            ...prev,
            ...t,
            addr1: t.pAddr1 || prev.addr1 || '',
            addr2: t.pAddr2 || prev.addr2 || '',
            addr3: t.pAddr3 || prev.addr3 || '',
            addr4: t.pAddr4 || prev.addr4 || '',
            addr5: t.pAddr5 || prev.addr5 || '',
            bjdCode: t.pBjdCode || prev.bjdCode || '',
            danjiCode: t.pDanjiCode || prev.danjiCode || '',
          }));
        }
      } catch (e) {
        console.error('기존 거래정보 조회 실패:', e);
      }
    };
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyTransmitted, ptNo, user?.offNo]);

  // AddressSelectorSimple / 드롭다운용 필드 setter
  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = editData
      ? '네오시스 - 거래정보 수정'
      : '네오시스 - 거래정보 등록';
  }, [editData]);

  // office 정보가 없을 때 조회
  useEffect(() => {
    const loadOffice = async () => {
      console.log('loadOffice - office:', office);
      console.log('loadOffice - user:', user);
      console.log('loadOffice - user.offNo:', user?.offNo);

      if (!office && user?.offNo) {
        try {
          console.log('사무실 정보 조회 시작 - offNo:', user.offNo);
          const response = await officeService.getOfficeList(user.offNo);
          console.log('사무실 정보 조회 응답:', response);

          if (response.success && response.data) {
            let officeData = null;

            // response.data.offices 배열인 경우
            if (response.data.offices && Array.isArray(response.data.offices) && response.data.offices.length > 0) {
              officeData = response.data.offices[0];
            }
            // data가 배열인 경우
            else if (Array.isArray(response.data) && response.data.length > 0) {
              officeData = response.data[0];
            }
            // data가 객체이고 offNo가 있는 경우 (직접 office 객체)
            else if (response.data.offNo) {
              officeData = response.data;
            }

            console.log('사무실 정보 설정:', officeData);
            console.log('사무실 정보 필드명:', officeData ? Object.keys(officeData) : 'null');
            if (officeData) {
              setLocalOffice(officeData);
              updateOffice(officeData);
            }
          }
        } catch (error) {
          console.error('사무실 정보 조회 실패:', error);
        }
      } else if (office) {
        console.log('기존 office 사용:', office);
        // office.offices 배열이 있는 경우 첫 번째 요소 사용
        if (office.offices && Array.isArray(office.offices) && office.offices.length > 0) {
          setLocalOffice(office.offices[0]);
        } else {
          setLocalOffice(office);
        }
      }
    };

    loadOffice();
  }, [office, user, updateOffice]);

  // 편집 데이터 또는 전달받은 데이터로 폼 초기화
  useEffect(() => {
    let initialData = { ...formData };

    // 편집 모드
    if (editData) {
      initialData = {
        ...initialData,
        ...editData,
        // DB의 pAddr*(물건) / custRegion*(고객) → 주소선택기(addr*) 매핑
        addr1: editData.pAddr1 || editData.custRegion1 || '',
        addr2: editData.pAddr2 || editData.custRegion2 || '',
        addr3: editData.pAddr3 || editData.custRegion3 || '',
        addr4: editData.pAddr4 || '',
        addr5: editData.pAddr5 || editData.custBldNm || '',
        bjdCode: editData.pBjdCode || editData.custBjdCode || '',
        danjiCode: editData.pDanjiCode || editData.custDanjiCode || '',
      };
    }
    // 물건 데이터가 전달된 경우 — 물건종류/거래구분은 코드값 그대로(드롭다운 매칭), 주소는 구조화 필드로
    else if (propertyData) {
      initialData = {
        ...initialData,
        tradeDiv: 'PT',
        ptNo: ptNo || propertyData.ptNo,
        pPtName: propertyData.ptName,
        pPtType: propertyData.ptType,          // SYCA 코드
        pSaleDiv: propertyData.saleDiv || '',  // 전체 거래구분(콤마) 유지 → 화면에 콤마 표기
        pSaleAmt: propertyData.saleAmt,
        pNowDepAmt: propertyData.nowDepAmt,
        pNowMonAmt: propertyData.nowMonAmt,
        pExcArea: propertyData.excArea,
        pSupArea: propertyData.supArea,
        // 구조화 주소(드롭다운/단지/지번/건물명)
        addr1: propertyData.addr1 || '',
        addr2: propertyData.addr2 || '',
        addr3: propertyData.addr3 || '',
        addr4: propertyData.addr4 || '',
        addr5: propertyData.addr5 || '',
        bjdCode: propertyData.bjdCode || '',
        danjiCode: propertyData.danjiCode || '',
        pAddrFull: [propertyData.addr1, propertyData.addr2, propertyData.addr3, propertyData.addr4, propertyData.addr5]
          .filter(Boolean)
          .join(' '),
        pDong: propertyData.dong,
        pHo: propertyData.ho,
        pFloor1: propertyData.floor1,
        pFloor2: propertyData.floor2,
        pDirStd: propertyData.dirStd,
        pBalcExt: propertyData.balcExt,
        pRoomCnt: propertyData.roomCnt,
        pBathCnt: propertyData.bathCnt,
        pPkCnt: propertyData.pkCnt,
        pMaintCost: propertyData.maintCost,
        pMaintDtl: propertyData.maintDtl,
        pHeatMethod: propertyData.heatMethod,
        pHeatFuel: propertyData.heatFuel,
        pBuidStruct: propertyData.buidStruct,
        pEntrStruct: propertyData.entrStruct,
        pOpt: propertyData.opt,
        pPtExpl: propertyData.ptExpl,
        pCompYear: propertyData.compYear,
        // 중개정보 추가 자동채움
        pAptTyp: propertyData.aptTyp,
        pLandShare: propertyData.landShare,
        pLandShareRatio: propertyData.landShareRatio,
        pLandArea: propertyData.landShare,
        pBuildingArea: propertyData.buildingArea,
        pTotalFloorArea: propertyData.grossArea,
        pCurrentStatus: propertyData.currentStatus,
        pLesAmt: propertyData.lesAmt,
        pLoanAmtAft: propertyData.loanAmtAft,
        pLoanAmt: propertyData.loanAmt, // 대출금 = 물건등록폼 대출금액(loanAmt) 연동
        pContractRenewalRight: propertyData.contractRenewalRight,
        pHouseCnt: propertyData.houseCnt,
        ownerRentBsnYn: toRentBsnCode(propertyData.houseRental) || 'N',
      };
    }
    // 고객 데이터가 전달된 경우 — 고객등록폼 필드 자동채움
    else if (customerData) {
      const firstTrdType = customerData.trdType
        ? (Array.isArray(customerData.trdType) ? customerData.trdType[0] : String(customerData.trdType).split(',')[0].trim())
        : '';
      const firstArea = Array.isArray(customerData.areas) && customerData.areas.length ? customerData.areas[0] : {};
      const trdTypeList = customerData.trdType
        ? (Array.isArray(customerData.trdType) ? customerData.trdType : String(customerData.trdType).split(',').map((s) => s.trim()).filter(Boolean))
        : [];
      initialData = {
        ...initialData,
        tradeDiv: 'CUST',
        custAreas: Array.isArray(customerData.areas) ? customerData.areas : [],
        custTrdTypes: trdTypeList,
        custNo: custNo || customerData.custNo,
        custName: customerData.name,
        custAlias: customerData.alias,
        custTel: customerData.tel,
        custAddr: customerData.addr,
        custMemo: customerData.memo,
        // 중개정보 자동채움
        custWantType: customerData.wantType || '',
        custTrdType: firstTrdType,
        custLesAmtFr: customerData.lesAmtFr ?? '',
        custLesAmtTo: customerData.lesAmtTo ?? '',
        custExcAreaFr: customerData.excAreaFr ?? '',
        custExcAreaTo: customerData.excAreaTo ?? '',
        custMoveinYn: customerData.moveinYn === 'Y' ? 'Y' : '',
        custMoveDateFr: customerData.moveDateFr ? String(customerData.moveDateFr).split('T')[0] : '',
        custMoveDateTo: customerData.moveDateTo ? String(customerData.moveDateTo).split('T')[0] : '',
        custRoomCnt: customerData.roomCnt ?? '',
        custBathCnt: customerData.bathCnt ?? '',
        custParkCnt: customerData.parkCnt ?? '',
        custCommunityFac: customerData.communityFac || '',
        // 구입물건특징은 데이터 미연동(직접입력 전용)
        custFeatureNote: '',
        // 희망지역(첫번째) → 주소선택기 addr*
        addr1: firstArea.addr1 || '',
        addr2: firstArea.addr2 || '',
        addr3: firstArea.addr3 || '',
        addr5: firstArea.bldNm || '',
        bjdCode: firstArea.bjdCode || '',
        danjiCode: firstArea.danjiCode || '',
      };
    }
    // ptNo나 custNo만 전달된 경우
    else {
      if (ptNo) {
        initialData.ptNo = ptNo;
        initialData.tradeDiv = 'PT';
      }
      if (custNo) {
        initialData.custNo = custNo;
        initialData.tradeDiv = 'CUST';
      }
    }

    setFormData(initialData);
  }, [editData, propertyData, customerData, ptNo, custNo]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'Y' : 'N') : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      // pSaleDiv가 배열/숫자로 들어오는 경우 방어: 문자열로 정규화
      const saleDivStr = Array.isArray(formData.pSaleDiv)
        ? formData.pSaleDiv.join(',')
        : (formData.pSaleDiv == null ? '' : String(formData.pSaleDiv));

      // 거래유형(물건) 필수 — 미선택 시 저장 불가
      if (formData.tradeDiv === 'PT') {
        const avail = saleDivStr.split(',').map((s) => s.trim()).filter(Boolean);
        const selDiv = formData.pSaleDivSel || (avail.length === 1 ? avail[0] : '');
        if (!selDiv) { toast.error('거래유형을 선택해주세요.'); return; }
      }

      // 숫자 필드 목록 (빈값 → null, 그 외 → 숫자)
      const NUM_FIELDS = [
        'pSaleAmt', 'pNowDepAmt', 'pNowMonAmt', 'pExcArea', 'pSupArea', 'pPkCnt', 'pMaintCost',
        'pFloor1', 'pFloor2', 'pRoomCnt', 'pBathCnt', 'pHouseCnt',
        'pLandShare', 'pLesAmt', 'pBondMaxAmt', 'pLoanAmt', 'pLoanAmtAft',
        'custExcAreaFr', 'custExcAreaTo', 'custSaleAmtFr', 'custSaleAmtTo',
        'custLesAmtFr', 'custLesAmtTo', 'custProtAmtFr', 'custProtAmtTo',
        'custMonAmtFr', 'custMonAmtTo', 'custCashAblt',
        'custRoomCnt', 'custBathCnt', 'custParkCnt',
        // 유형별 추가 숫자 필드(공동중개 전송)
        'pAddContribAmt', 'pBasementFloor', 'pBuildingArea', 'pElevatorCnt', 'pEtcDepAmt', 'pEtcMonAmt',
        'pExpEtcM', 'pExpEtcY', 'pExpLaborM', 'pExpLaborY', 'pExpLoanM', 'pExpLoanY',
        'pExpUtilM', 'pExpUtilY', 'pExpansionAmt', 'pFacilityCost', 'pGroundFloor', 'pGuestRoomCnt',
        'pIncEtcM', 'pIncEtcY', 'pIncMgmtM', 'pIncMgmtY', 'pIncRentM', 'pIncRentY',
        'pLandArea', 'pLandShareRatio', 'pLayAmt', 'pMovingCost', 'pOptionAmt', 'pPremiumAmt',
        'pPresaleAmt', 'pRightValueAmt', 'pStairCnt', 'pTotalFloorArea', 'custElevatorCnt', 'custStairCnt',
      ];

      const isPt = formData.tradeDiv === 'PT';

      const payload = {
        ...formData,
        pSaleDiv: saleDivStr,
        // 백엔드 char?(CHAR(1)) — '미등록' 같은 한글이 그대로 가면 400(역직렬화 실패)
        ownerRentBsnYn: toRentBsnCode(formData.ownerRentBsnYn),
        // p_comp_year VARCHAR(4) — 물건 compYear는 'YYYYMMDD'로 오므로 연도만 전송
        pCompYear: formData.pCompYear ? String(formData.pCompYear).replace(/\D/g, '').slice(0, 4) || null : null,
        offNo: office?.offNo,
        rtNo: user?.rtNo,
      };

      if (isPt) {
        // 물건: 구조화 주소 → pAddr* + 전체주소 문자열
        Object.assign(payload, {
          pAddr1: formData.addr1 || null,
          pAddr2: formData.addr2 || null,
          pAddr3: formData.addr3 || null,
          pAddr4: formData.addr4 || null,
          pAddr5: formData.addr5 || null,
          pBjdCode: formData.bjdCode || null,
          pDanjiCode: formData.danjiCode || null,
          pAddrFull: [formData.addr1, formData.addr2, formData.addr3, formData.pJibun, formData.addr4, formData.addr5]
            .filter(Boolean).join(' ') || formData.pAddrFull || null,
        });
      } else {
        // 고객: 희망지역 주소 → custRegion*/custBldNm/코드
        Object.assign(payload, {
          custRegion1: formData.addr1 || null,
          custRegion2: formData.addr2 || null,
          custRegion3: formData.addr3 || null,
          custBldNm: formData.addr5 || formData.addr4 || null,
          custBjdCode: formData.bjdCode || null,
          custDanjiCode: formData.danjiCode || null,
        });
      }

      // UI 전용 필드(배열/직접입력 보조/카테고리 등) 제거 — 백엔드 미사용
      ['custAreas', 'custTrdTypes', '_areaIdx', 'custWantCategory',
        'custSaleAmtDirect', 'custLesAmtDirect', 'custProtAmtDirect', 'custExcAreaDirect', 'custMoveDateDirect']
        .forEach((k) => { delete payload[k]; });

      // 빈 문자열 → null, 숫자 필드 변환
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') { payload[k] = null; return; }
        if (NUM_FIELDS.includes(k) && payload[k] != null) {
          const n = Number(payload[k]);
          payload[k] = Number.isNaN(n) ? null : n;
        }
      });

      // 기존 거래정보(수정) 여부 — 편집 진입 or 이미 전송된 매물의 기존 tradeId
      const tid = editData?.tradeId || existingTradeId;

      if (!tid) {
        // 신규 등록
        payload.autoRegisterCustomer = autoRegisterCustomer;
        payload.autoRegisterProperty = autoRegisterProperty;
      }

      const response = tid
        ? await hubService.updateHub(tid, payload)
        : await hubService.createHub(payload, user?.userId, autoRegisterCustomer, autoRegisterProperty);

      if (response.success) {
        const notice = tid ? '공동중개망 수정이 완료되었습니다.' : '공동중개망 전송이 완료되었습니다.';

        // props 콜백이 있으면 사용 (모달 모드) — 팝업은 바로 닫히므로 알림은 연 창(Router)에서 표시
        if (propsOnSuccess) {
          const d = response.data;
          propsOnSuccess(d && typeof d === 'object' ? { ...d, hubNotice: notice } : { result: d, hubNotice: notice });
          if (propsOnClose) {
            propsOnClose();
          }
        }
        // Electron API 모달 모드
        else if (isModalMode && window.electronAPI?.modal) {
          window.electronAPI.modal.success({
            type: 'hub-form',
            data: response.data,
          });
        }
        // 일반 페이지 모드
        else {
          toast.success(notice);
          navigate('/hub');
        }
      } else {
        toast.error(response.message || '처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('거래정보 처리 실패:', error);
      toast.error('처리 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = () => {
    // props 콜백이 있으면 사용 (모달 모드)
    if (propsOnClose) {
      propsOnClose();
    }
    // Electron API 모달 모드
    else if (isModalMode && window.electronAPI?.modal) {
      window.electronAPI.modal.close();
    }
    // 일반 페이지 모드
    else {
      navigate('/hub');
    }
  };

  // 삭제 (편집 진입 or 이미 전송된 매물의 기존 거래정보) — ConfirmDialog로 확인
  const handleDelete = () => {
    const tid = editData?.tradeId || existingTradeId;
    if (!tid) { toast.error('삭제할 거래정보를 찾을 수 없습니다.'); return; }
    setConfirm({
      message: '이 거래정보를 삭제하시겠습니까?',
      onConfirm: async () => {
        try {
          const res = await hubService.deleteHub(tid);
          if (res.success) {
            toast.success('삭제되었습니다.');
            if (propsOnSuccess) {
              propsOnSuccess(null);
              propsOnClose?.();
            } else if (isModalMode && window.electronAPI?.modal) {
              window.electronAPI.modal.success({ type: 'hub-form', data: null });
            } else {
              navigate('/hub');
            }
          } else {
            toast.error(res.message || '삭제에 실패했습니다.');
          }
        } catch (error) {
          console.error('거래정보 삭제 실패:', error);
          toast.error('삭제 중 오류가 발생했습니다.');
        }
      },
    });
  };

  return (
    <div className="h-screen bg-white flex flex-col hub-form-page">
      {/* 드롭다운 글자 세로 중앙정렬 강제 (line-height:normal이 안 먹는 환경 대응) */}
      <style>{`
        .hub-form-page select { height: 28px !important; line-height: 26px !important; padding-top: 0 !important; padding-bottom: 0 !important; box-sizing: border-box !important; }
      `}</style>
      {/* Header (PropertyFormPageV2 규격: px-4 py-2, text-lg/600) */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">
          {formData.tradeDiv === 'PT'
            ? (editData ? '공동중개망 물건정보수정' : '공동중개망 물건정보등록')
            : '공동중개망 고객정보'}
        </h2>
        {transmittedLabel && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '6px', padding: '4px 12px' }}>
            {transmittedLabel}
          </span>
        )}
      </div>

      {/* Body — 신규 물건은 매물 선택 전까지 폼을 가림 (여백 최소화: PropertyFormPageV2 규격) */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '4px' }}>
        {awaitingPick ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            매물 목록에서 매물을 선택하면 등록 정보가 표시됩니다.
          </div>
        ) : (
          <>
            {/* 물건 정보 (거래구분이 물건일 때) */}
            {formData.tradeDiv === 'PT' && (
              <PropertyInfoTable
                formData={formData}
                handleChange={handleChange}
                setField={setField}
                danjiList={danjiList}
                setDanjiList={setDanjiList}
                lockTradeFields={alreadyTransmitted || !!existingTradeId}
              />
            )}

            {/* 고객 정보 (거래구분이 고객일 때) */}
            {formData.tradeDiv === 'CUST' && (
              <CustomerInfoTable
                formData={formData}
                handleChange={handleChange}
                setField={setField}
                danjiList={danjiList}
                setDanjiList={setDanjiList}
                areas={formData.custAreas || []}
                trdTypes={formData.custTrdTypes || []}
              />
            )}

            {/* 중개사무소 정보 */}
            <OfficeInfoTable
              office={localOffice}
              chargeName={formData.chargeName}
              onChargeNameChange={(v) => setField('chargeName', v)}
            />
          </>
        )}
      </div>

      {/* Footer: 좌측끝 등록·수정 + 삭제 | 우측 닫기 (매물 선택 완료 후 노출) */}
      {!awaitingPick && (
      <div className="flex justify-between items-center border-t bg-gray-50" style={{ padding: '3px 12px' }}>
        {/* 좌측 끝: 삭제 */}
        <div className="flex gap-2">
          {(editData || existingTradeId) && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
        {/* 우측: 등록/저장 + 닫기 */}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            {(editData || existingTradeId) ? '수정 | 저장' : '등록 | 저장'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-8 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
      )}

      {/* 공통 확인 모달 (삭제 등) */}
      <ConfirmDialog
        open={!!confirm}
        message={confirm?.message}
        onConfirm={() => { confirm?.onConfirm?.(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />

      {/* 내 매물 불러오기 모달 */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-40" onClick={closePicker} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold text-gray-900">내 매물 선택</h3>
              <button type="button" onClick={closePicker} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="p-3 border-b flex gap-2">
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadMyProperties(pickerSearch); }}
                placeholder="물건명 검색"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <button type="button" onClick={() => loadMyProperties(pickerSearch)} className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200">검색</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {pickerLoading ? (
                <div className="p-6 text-center text-gray-500 text-sm">불러오는 중...</div>
              ) : pickerList.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">등록된 매물이 없습니다.</div>
              ) : (
                pickerList.map((p) => (
                  <button
                    key={p.ptNo}
                    type="button"
                    onClick={() => selectMyProperty(p)}
                    className="w-full text-left px-4 py-2 border-b border-gray-100 hover:bg-blue-50 text-sm"
                  >
                    <div className="font-medium text-gray-900">
                      {p.ptName || getPropertyTypeLabel(p.ptType) || '-'}
                      <span className="ml-2 text-xs text-gray-400">{getPropertyTypeLabel(p.ptType)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {[p.addr1, p.addr2, p.addr3, p.addr4, p.addr5].filter(Boolean).join(' ')}
                      {p.dong ? ` ${p.dong}동` : ''}{p.ho ? ` ${p.ho}호` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HubFormPage;

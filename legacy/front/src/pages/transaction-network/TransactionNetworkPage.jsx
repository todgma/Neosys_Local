import React, { useState, useEffect, useRef } from 'react';
import { Users, Home, List, Plus, Edit, Trash2, X, Info } from 'lucide-react';
import Card from '../../components/ui/Card';
import PropertyListTable from '../../components/properties/PropertyListTable';
import MenuTopActions from '../../components/layout/MenuTopActions';
import ReportBuilderModal from '../../components/reports/ReportBuilderModal';
import TableSettings from '../../components/ui/TableSettings';
import PriceRangeFilter, { priceUnitToMan } from '../../components/ui/PriceRangeFilter';
import HubModal from '../../components/modals/HubModal';
import { hubService } from '../../services/hubService';
import { useAuthStore } from '../../stores/authStore';
import AddressSelectorSimple from '../../components/property/AddressSelectorSimple';
import MainRegionModal from '../../components/hub/MainRegionModal';
import BrokerSearchModal from '../../components/contracts/BrokerSearchModal';
import { useNoteStore } from '../../stores/noteStore';
import { PROPERTY_TYPE_FILTER_BUTTONS } from '../../constants/propertyTypes';
import { rentBsnLabel } from '../../constants/propertyOptions';
import { loadOrderedButtons, saveButtonOrder, moveItem } from '../../utils/buttonOrder';
import toast from 'react-hot-toast';

// 물건유형(모든유형이 0번째)
const PROPERTY_TYPES = [
  { value: '', label: '모든유형' },
  { value: 'SYCA101', label: '아파트' }, { value: 'SYCA102', label: '오피스텔' }, { value: 'SYCA103', label: '주상복합' },
  { value: 'SYCA104', label: '재건축' }, { value: 'SYCA105', label: '아파트 분양권' }, { value: 'SYCA106', label: '오피스텔 분양권' },
  { value: 'SYCA107', label: '주상복합 분양권' }, { value: 'SYCA108', label: '빌딩/건물' }, { value: 'SYCA109', label: '상가건물' },
  { value: 'SYCA110', label: '숙박/콘도' }, { value: 'SYCA111', label: '공장/창고' }, { value: 'SYCA112', label: '기타' },
  { value: 'SYCA113', label: '사무실' }, { value: 'SYCA114', label: '상가점포' }, { value: 'SYCA115', label: '토지' },
  { value: 'SYCA116', label: '지식산업센터' }, { value: 'SYCA117', label: '원투룸' }, { value: 'SYCA118', label: '빌라/연립' },
  { value: 'SYCA119', label: '주택' }, { value: 'SYCA120', label: '재개발' },
];
const TRADE_TYPES = [
  { value: '', label: '전체' },
  { value: 'SALEDIV01', label: '매매' }, { value: 'SALEDIV02', label: '전세' },
  { value: 'SALEDIV03', label: '월세' }, { value: 'SALEDIV04', label: '기타임대' },
];

// 고객관리(CUST) 물건유형 버튼: 재건축|분양권·재개발|분양권 제거, 입주권 추가(재건축/재개발 코드 매핑)
const CUST_TYPE_BUTTONS = PROPERTY_TYPE_FILTER_BUTTONS
  .filter((b) => b.value !== 'SYCA104' && b.value !== 'SYCA120')
  .reduce((acc, b) => {
    acc.push(b);
    if (b.value === 'SYCA105,SYCA107') acc.push({ label: '입주권', value: 'SYCA104,SYCA120' });
    return acc;
  }, []);


// 물건유형 4그룹 → 세부유형(복수선택). value=SYCA 코드(복수는 콤마)
const HUB_TYPE_GROUPS = [
  { key: '부동산', label: '부동산', types: [
    { label: '아파트', value: 'SYCA101,SYCA103' },
    { label: '오피스텔', value: 'SYCA102' },
    { label: '원투룸', value: 'SYCA117' },
    { label: '빌라ㅣ연립', value: 'SYCA118' },
    { label: '단독ㅣ다가구', value: 'SYCA119' },
    { label: '상가ㅣ사무실', value: 'SYCA109,SYCA113,SYCA114' },
    { label: '지식산업센터', value: 'SYCA116' },
    { label: '숙박ㅣ펜션', value: 'SYCA110' },
    { label: '공장ㅣ창고', value: 'SYCA111' },
  ] },
  { key: '분양권', label: '분양권', types: [
    { label: '아파트분양권', value: 'SYCA105,SYCA107' },
    { label: '오피스텔분양권', value: 'SYCA106' },
  ] },
  { key: '입주권', label: '입주권', types: [
    { label: '재건축', value: 'SYCA104' },
    { label: '재개발', value: 'SYCA120' },
  ] },
  { key: '건물', label: '건물', types: [
    { label: '건물ㅣ빌딩', value: 'SYCA108' },
  ] },
  { key: '토지', label: '토지', types: [
    { label: '토지', value: 'SYCA115' },
  ] },
];

// 유형별 헤드라인 컬럼(이미지 기준) — 단일 헤더(1행) 플랫 구성. 선택/보고서만 2행
const hc = (key, label, width) => ({ key, label, width });
// 선택 / 보고서작성 — 각각 별도 칼럼(각 칼럼 안에서 세로글자 가운데 정렬, 칼럼 경계선이 구분선 역할)
const vLabel = (text, color) => (
  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '46px' }}>
    <span style={{ writingMode: 'vertical-rl', textOrientation: 'upright', fontSize: '13px', fontWeight: 800, lineHeight: 1.05, color }}>{text}</span>
  </span>
);
const HUB_SELECT = { key: 'select_only', width: 26, noRowClick: true, label: vLabel('선　택', '#111827') };
const HUB_REPORT = { key: 'report_only', width: 30, noRowClick: true, label: vLabel('보고서', '#4338ca') };
const HUB_MATCH = hc('h_match', '자사/공동망 매칭', 110);
const HUB_TPL = {
  // 부동산 일반(아파트/오피스텔/원투룸/빌라/숙박/공장)
  realtyStd: () => [hc('h_regdt', '등록일', 84), HUB_SELECT, HUB_REPORT, hc('h_name', '물건명', 160), hc('h_dong', '동', 56), hc('h_floor', '층', 56), hc('h_type', '타입', 78), hc('h_area', '면적', 92), hc('h_dir', '방향', 66), hc('h_trd', '거래유형', 88), hc('h_reqamt', '의뢰금액', 92), hc('h_loan', '융자금', 84), hc('h_status', '현상태', 96), hc('h_maturity', '만기일', 90), HUB_MATCH, hc('h_consult', '상담내용', 180)],
  // 단독ㅣ다가구(동/타입 제외)
  realtyHouse: () => [hc('h_regdt', '등록일', 84), HUB_SELECT, HUB_REPORT, hc('h_name', '물건명', 170), hc('h_floor', '층', 56), hc('h_area', '면적', 92), hc('h_dir', '방향', 66), hc('h_trd', '거래유형', 88), hc('h_reqamt', '의뢰금액', 92), hc('h_loan', '융자금', 84), hc('h_status', '현상태', 96), hc('h_maturity', '만기일', 90), HUB_MATCH, hc('h_consult', '상담내용', 180)],
  // 상가ㅣ사무실 · 지식산업센터(타입 제외 + 권리금)
  realtyBiz: () => [hc('h_regdt', '등록일', 84), HUB_SELECT, HUB_REPORT, hc('h_name', '물건명', 160), hc('h_dong', '동', 56), hc('h_floor', '층', 56), hc('h_area', '면적', 92), hc('h_dir', '방향', 66), hc('h_trd', '거래유형', 88), hc('h_reqamt', '의뢰금액', 92), hc('h_loan', '융자금', 84), hc('h_status', '현상태', 96), hc('h_keymoney', '권리금', 88), hc('h_maturity', '만기일', 90), HUB_MATCH, hc('h_consult', '상담내용', 170)],
  // 분양권
  bunyang: () => [hc('h_regdt', '등록일', 84), HUB_SELECT, HUB_REPORT, hc('h_name', '물건명', 160), hc('h_dong', '동', 56), hc('h_floor', '층', 56), hc('h_type', '타입', 78), hc('h_area', '면적', 92), hc('h_dir', '방향', 66), hc('h_reqamt', '의뢰금액', 92), hc('h_presale', '분양금액', 92), hc('h_balcony', '발코니확장금액', 110), hc('h_option', '옵션금액', 88), hc('h_premium', '프리미엄', 88), HUB_MATCH, hc('h_consult', '상담내용', 170)],
  // 정비사업(재건축/재개발)
  redev: () => [hc('h_regdt', '등록일', 84), HUB_SELECT, HUB_REPORT, hc('h_name', '물건명', 150), hc('h_dong', '동', 56), hc('h_floor', '층', 56), hc('h_type', '타입', 74), hc('h_area', '면적', 88), hc('h_dir', '방향', 62), hc('h_rightamt', '권리가액', 90), hc('h_moving', '이주비대출', 96), hc('h_reqamt', '의뢰금액', 90), hc('h_presale', '분양금액', 90), hc('h_balcony', '발코니확장금액', 104), hc('h_option', '옵션금액', 84), hc('h_premium', '프리미엄', 84), HUB_MATCH, hc('h_consult', '상담내용', 150)],
  // 건물ㅣ빌딩
  building: () => [hc('h_regdt', '등록일', 84), HUB_SELECT, HUB_REPORT, hc('h_name', '물건명', 150), hc('h_gnd', '지상/지하', 76), hc('h_landarea', '대지면적', 90), hc('h_gross', '연면적', 90), hc('h_comp', '준공년도', 82), hc('h_trd', '거래유형', 84), hc('h_reqamt', '의뢰금액', 90), hc('h_loantotal', '대출금액', 90), hc('h_deposit', '보증금총액', 96), hc('h_yincome', '년수입합계', 96), hc('h_yexpense', '년지출합계', 96), hc('h_jimok', '지목', 74), hc('h_landuse', '용도지역', 110), HUB_MATCH, hc('h_consult', '상담내용', 150)],
  // 토지
  land: () => [hc('h_regdt', '등록일', 84), HUB_SELECT, HUB_REPORT, hc('h_name', '물건명', 160), hc('h_landarea', '토지면적', 90), hc('h_jimok', '지목', 78), hc('h_landuse', '용도지역', 120), hc('h_permit', '건축허가여부', 96), hc('h_trd', '거래유형', 88), hc('h_reqamt', '의뢰금액', 92), hc('h_loan', '융자금', 84), hc('h_status', '현상태', 96), hc('h_maturity', '만기일', 90), HUB_MATCH, hc('h_consult', '상담내용', 170)],
};
const HUB_SUBTYPE_TPL = {
  'SYCA101,SYCA103': 'realtyStd', 'SYCA102': 'realtyStd', 'SYCA117': 'realtyStd', 'SYCA118': 'realtyStd', 'SYCA110': 'realtyStd', 'SYCA111': 'realtyStd',
  'SYCA119': 'realtyHouse',
  'SYCA109,SYCA113,SYCA114': 'realtyBiz', 'SYCA116': 'realtyBiz',
  'SYCA105,SYCA107': 'bunyang', 'SYCA106': 'bunyang',
  'SYCA104': 'redev', 'SYCA120': 'redev',
  'SYCA108': 'building', 'SYCA115': 'land',
};
const HUB_GROUP_DEFAULT_TPL = { '부동산': 'realtyStd', '분양권': 'bunyang', '입주권': 'redev', '건물': 'building', '토지': 'land' };
// 선택된 그룹/세부유형 → 헤드라인 컬럼(세부유형 1개면 그 유형, 아니면 그룹 기본)
const resolveHubColumns = (group, types) => {
  let tplKey;
  if (types && types.length === 1) tplKey = HUB_SUBTYPE_TPL[types[0]];
  tplKey = tplKey || HUB_GROUP_DEFAULT_TPL[group] || 'realtyStd';
  return (HUB_TPL[tplKey] || HUB_TPL.realtyStd)();
};

const ptTypeLabel = (code) => PROPERTY_TYPES.find((t) => t.value === code)?.label || code || '-';
const saleDivLabel = (code) => String(code || '').split(',').map((c) => TRADE_TYPES.find((t) => t.value === c.trim())?.label || c.trim()).filter(Boolean).join(', ') || '-';
const amtMan = (v) => (v || v === 0) ? `${Number(v).toLocaleString()}만원` : '-';
// 고객 거래유형(TRDTYP) 라벨
const CUST_TRD = { TRDTYP01: '매매', TRDTYP02: '전세', TRDTYP03: '월세', TRDTYP04: '기타임대' };
const custTrdLabel = (v) => String(v || '').split(',').map((c) => CUST_TRD[c.trim()] || c.trim()).filter(Boolean).join(', ') || '-';

// 고객목록 컬럼 (헤더 1행 고정 = subHeaders 없음)
const CUST_COLUMNS = [
  { key: 'select', label: '선택', width: 40, noRowClick: true },
  { key: 'regDt', label: '등록일', width: 100 },
  { key: 'custWantType', label: '물건유형', width: 100 },
  { key: 'custRegion', label: '구입희망지역', width: 170 },
  { key: 'custJimok', label: '지목', width: 70 },
  { key: 'custUsage', label: '건축물용도', width: 90 },
  { key: 'custExcArea', label: '면적', width: 110 },
  { key: 'custTrdType', label: '거래유형', width: 90 },
  { key: 'custMovein', label: '입주여부', width: 80 },
  { key: 'custFeature', label: '구입물건특징', width: 160 },
  { key: 'office_nm', label: '부동산상호', width: 130 },
  { key: 'cust_office_tel', label: '사무소번호', width: 120 },
  { key: 'cust_tel', label: '대표번호', width: 120 },
];

const TransactionNetworkPage = () => {
  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = '네오시스 - 공동중개망';
  }, []);

  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState('PT'); // 'CUST'(고객목록) | 'PT'(물건목록)
  const [mineOnly, setMineOnly] = useState(false); // 내 물건/내 고객 (내 사무소만)
  const [ptTypes, setPtTypes] = useState([HUB_TYPE_GROUPS[0].types[0].value]); // 물건유형 다중선택(버튼) — 기본 첫 유형 자동선택
  const [ptGroup, setPtGroup] = useState('부동산'); // 물건유형 그룹(부동산/분양권/입주권/건물/토지)
  // 유형 버튼 순서(드래그 재정렬 + localStorage 자동저장) — 물건목록/고객목록 각각
  const [ptTypeOrder, setPtTypeOrder] = useState(() => loadOrderedButtons(PROPERTY_TYPE_FILTER_BUTTONS, 'hub_pt_type_btn_order'));
  const [custTypeOrder, setCustTypeOrder] = useState(() => loadOrderedButtons(CUST_TYPE_BUTTONS, 'hub_cust_type_btn_order'));
  const typeDragIdx = useRef(null);
  // 물건유형 대분류(그룹) 순서 — 드래그 재정렬(하위 상세유형도 이 순서를 따름). key 기준 저장
  const HUB_GROUP_ORDER_KEY = 'hub_pt_group_order';
  const [hubGroups, setHubGroups] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HUB_GROUP_ORDER_KEY) || 'null');
      if (Array.isArray(saved)) {
        const byKey = new Map(HUB_TYPE_GROUPS.map((g) => [g.key, g]));
        const ordered = saved.map((k) => byKey.get(k)).filter(Boolean);
        HUB_TYPE_GROUPS.forEach((g) => { if (!saved.includes(g.key)) ordered.push(g); });
        return ordered;
      }
    } catch { /* ignore */ }
    return [...HUB_TYPE_GROUPS];
  });
  const groupDragIdx = useRef(null);
  const onGroupDrop = (toIdx) => {
    const next = moveItem(hubGroups, groupDragIdx.current, toIdx);
    setHubGroups(next);
    try { localStorage.setItem(HUB_GROUP_ORDER_KEY, JSON.stringify(next.map((g) => g.key))); } catch { /* ignore */ }
    groupDragIdx.current = null;
  };
  const [mainRegionOn, setMainRegionOn] = useState(false); // 주거래지역 체크박스
  const [mainRegions, setMainRegions] = useState([]);      // 설정된 주거래지역 목록
  const [regionModal, setRegionModal] = useState({ open: false, mode: 'edit' }); // 주거래지역 모달
  const [blockModalOpen, setBlockModalOpen] = useState(false); // 비공유업체 관리 모달
  const [blocks, setBlocks] = useState([]);                    // 비공유업체 목록
  const [brokerPickOpen, setBrokerPickOpen] = useState(false); // 공동중개사 조회(업체 선택) 팝업
  const { openNotes } = useNoteStore(); // 쪽지: 전역 스토어(쪽지보내기용)
  const [addrOn, setAddrOn] = useState(true);              // 주소 체크박스(기본 선택)
  const [floorFilter, setFloorFilter] = useState('');     // 층수
  // 물건목록 필터 (클라이언트 측)
  const [ptFilter, setPtFilter] = useState({
    ptType: '', trdType: '', region: '',
    addr1: '', addr2: '', addr3: '',
    excAreaFr: '', excAreaTo: '', saleAmtFr: '', saleAmtTo: '',
  });
  const [selectedRows, setSelectedRows] = useState([]); // 선택된 tradeId (색채우기/삭제)
  const [reportRows, setReportRows] = useState([]); // 보고서 작성 선택(보고서 버튼 전용 · 선택체크박스와 분리)
  const [colorFillRequest, setColorFillRequest] = useState(null); // {seq, ids, color}
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [columns, setColumns] = useState([]);
  const [areaUnit, setAreaUnit] = useState('㎡'); // 물건목록 면적 컬럼 단위(㎡/평) 토글
  const [areaFilterKind, setAreaFilterKind] = useState('전용'); // 검색바 면적 종류(전용/공급)
  const [areaFilterUnit, setAreaFilterUnit] = useState('㎡'); // 검색바 면적 단위(㎡/평)
  // 상단 필터버튼(면적/금액) — 물건목록과 동일 UX
  const [areaFilter, setAreaFilter] = useState({ min: '', max: '', unit: '평' });
  const [areaMenu, setAreaMenu] = useState(null); // { x, y }
  const [amountFilter, setAmountFilter] = useState({ min: '', max: '', unit: '억원', monMin: '', monMax: '', monUnit: '만원' });
  const [amountMenu, setAmountMenu] = useState(null); // { x, y }
  const amtActive = amountFilter.min !== '' || amountFilter.max !== '' || (amountFilter.monMin ?? '') !== '' || (amountFilter.monMax ?? '') !== '';
  // leftContent(테이블 툴바)에서도 쓰는 공용 헬퍼/스타일 — 아래 IIFE의 동일 이름 const는 블록 스코프라 별개
  const setF = (name, value) => setPtFilter((p) => ({ ...p, [name]: value }));
  const lbl = { fontSize: '14px', fontWeight: 600, color: '#000', whiteSpace: 'nowrap' };
  const inp = { padding: '4px 8px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' };
  const [showGuide, setShowGuide] = useState(false); // 이용안내 팝오버
  const [hubData, setHubData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [editData, setEditData] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [rowCount, setRowCount] = useState('20'); // 줄수: '20' | '30' | 'all'
  const pageSize = rowCount === 'all' ? 9999 : parseInt(rowCount, 10);
  const [zoom, setZoom] = useState(100); // 화면 배율(%)
  const zoomNum = (parseFloat(zoom) || 100);
  const zoomIn = () => setZoom(Math.min(400, zoomNum + 5));
  const zoomOut = () => setZoom(Math.max(30, zoomNum - 5));
  const [showReportBuilder, setShowReportBuilder] = useState(false); // 보고서 작성(공동중개망)
  const [reportProps, setReportProps] = useState(null);

  // 공동중개망 행 → 보고서 물건 객체 매핑 (주소는 호수 제외·동/층 표기, 중개사메모=사무소정보)
  const hubRowToReportProp = (r) => ({
    ptNo: r.ptNo || r.tradeId,
    ptName: r.pPtName, ptType: r.pPtType, saleDiv: (r.pSaleDiv || '').split(',')[0],
    addr1: r.pAddr1, addr2: r.pAddr2, addr3: r.pAddr3, addr4: r.pAddr4, addr5: r.pAddr5,
    dong: r.pDong, ho: r.pHo, floor1: r.pFloor1, floorDesc: r.pFloorDesc,
    supArea: r.pSupArea, excArea: r.pExcArea,
    saleAmt: r.pSaleAmt, lesAmt: r.pLesAmt, protAmt: r.pNowDepAmt, monAmt: r.pNowMonAmt,
    roomCnt: r.pRoomCnt, bathCnt: r.pBathCnt, dirStd: r.pDirStd, currentStatus: r.pCurrentStatus,
    officeName: r.offNm, repName: r.rpsNm, tel: r.offTel,
  });

  // 보고서 작성(신규창) — 보고서 버튼으로 선택한 공동중개망 물건들로 열기
  const openHubReport = () => {
    if (reportRows.length === 0) { toast.error('보고서 버튼으로 작성할 행을 먼저 선택하세요.'); return; }
    const rows = hubData.filter((r) => reportRows.includes(r.tradeId)).map(hubRowToReportProp);
    setReportProps(rows);
    setShowReportBuilder(true);
  };

  // URL 파라미터에서 데이터 추출
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');

    if (dataParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(dataParam));
        setPrefillData(decoded);

        // 데이터 타입에 따라 모달 자동 열기
        if (decoded.type === 'CUST' && decoded.customerData) {
          const cust = decoded.customerData;
          setEditData({
            tradeDiv: 'CUST',
            custNo: cust.custNo,
            custName: cust.name,
            custAlias: cust.alias,
            custTel: cust.tel,
            custAddr: cust.addr,
            custMemo: cust.memo,
            custRentBsnYn: cust.rentBsnYn,
            custTrdPrg: cust.trdPrg,
            custWantType: cust.wantType,
            custExcAreaFr: cust.excAreaFr,
            custExcAreaTo: cust.excAreaTo,
            custRegion1: cust.address1,
            custRegion2: cust.address2,
            custRegion3: cust.address3,
            custTrdType: cust.trdType,
            custSaleAmtFr: cust.saleAmtFr,
            custSaleAmtTo: cust.saleAmtTo,
            custLesAmtFr: cust.lesAmtFr,
            custLesAmtTo: cust.lesAmtTo,
            custProtAmtFr: cust.protAmtFr,
            custProtAmtTo: cust.protAmtTo,
            custMonAmtFr: cust.monAmtFr,
            custMonAmtTo: cust.monAmtTo,
            custMoveinYn: cust.moveinYn,
            custMoveDateFr: cust.moveDateFr,
            custMoveDateTo: cust.moveDateTo,
            custCashAblt: cust.cashAblt,
            custRmk: cust.rmk,
          });
          setShowModal(true);
        } else if (decoded.type === 'PT' && decoded.propertyData) {
          const prop = decoded.propertyData;
          setEditData({
            tradeDiv: 'PT',
            ptNo: prop.ptNo,
            pPtName: prop.ptName,
            pPtType: prop.ptType,
            pSaleDiv: prop.saleDiv,
            pSaleAmt: prop.saleAmt,
            pNowDepAmt: prop.nowDepAmt,
            pNowMonAmt: prop.nowMonAmt,
            pExcArea: prop.excArea,
            pSupArea: prop.supArea,
            pAddrFull: [prop.addr1, prop.addr2, prop.addr3].filter(Boolean).join(' '),
            pDong: prop.dong,
            pHo: prop.ho,
            pFloor1: prop.floor1,
            pFloor2: prop.floor2,
            pFloorDesc: prop.floorDesc,
            pDirStd: prop.dirStd,
            pBalcExt: prop.balcExt,
            pRoomCnt: prop.roomCnt,
            pBathCnt: prop.bathCnt,
            pPkCnt: prop.pkCnt,
            pMaintCost: prop.maintCost,
            pHeatMethod: prop.heatMethod,
            pHeatFuel: prop.heatFuel,
            pHeatSystem: prop.heatSystem,
            pBuidStruct: prop.buidStruct,
            immediateMoveinYn: prop.immediateMoveinYn,
            pExptDate: prop.exptDate,
            pPrgSts: prop.prgSts,
            pOpt: prop.opt,
            pPtExpl: prop.ptExpl,
            pCompYear: prop.compYear,
            ownerRentBsnYn: prop.ownerRentBsnYn,
          });
          setShowModal(true);
        }

        // URL 파라미터 제거
        window.history.replaceState({}, '', '/transaction-network');
      } catch (error) {
        console.error('URL 파라미터 파싱 실패:', error);
      }
    }
  }, []);

  useEffect(() => {
    fetchHubData();
  }, [viewMode, currentPage, mineOnly, rowCount]);

  // 주거래지역 목록 로드 (개인 rt_no 기준)
  const loadMainRegions = async () => {
    if (!user?.rtNo && !user?.offNo) return;
    try {
      const res = await hubService.getMainRegions({ rtNo: user?.rtNo, offNo: user?.offNo });
      setMainRegions(res.data || []);
    } catch (e) { /* handled */ }
  };
  useEffect(() => {
    loadMainRegions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.rtNo, user?.offNo]);

  // 선택된 행의 등록자 → 쪽지 수신자 목록 (표기: 이름(중개사무소명))
  const noteReceivers = hubData
    .filter((r) => selectedRows.includes(r.tradeId) && r.regUserId)
    .map((r) => {
      const person = r.rpsNm || r.custName || r.pPtName || String(r.regUserId);
      const office = r.offNm || '';
      return { id: String(r.regUserId), name: office ? `${person}(${office})` : person };
    });

  const fetchHubData = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        pageSize: pageSize,
        // 공동중개망: 회원/사무소 구분 없이 전체 회원의 데이터 조회(offNo 필터 미적용)
      };

      // 보기 모드에 따라 TradeDiv 필터 적용
      if (viewMode === 'CUST') {
        params.tradeDiv = 'CUST';
      } else if (viewMode === 'PT') {
        params.tradeDiv = 'PT';
      }

      // 내 물건/내 고객: 내 사무소 데이터만
      if (mineOnly && user?.offNo) {
        params.offNo = user.offNo;
      }

      // 비공유업체(양방향) 제외 기준 = 현재 사무소
      if (user?.offNo) params.viewerOffNo = user.offNo;

      const response = await hubService.getHubList(params);

      if (response.success && response.data) {
        setHubData(response.data.items || []);
        setTotalCount(response.data.totalCount || 0);
        setTotalPages(Math.ceil((response.data.totalCount || 0) / pageSize));
      }
    } catch (error) {
      console.error('공동중개망 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchHubData();
  };

  // ── 비공유업체 관리 ──
  const loadBlocks = async () => {
    if (!user?.offNo) return;
    try { const res = await hubService.getOfficeBlocks(user.offNo); if (res.success) setBlocks(res.data || []); }
    catch (e) { console.error('비공유업체 조회 실패:', e); }
  };
  const openBlockModal = async () => {
    if (!user?.offNo) { toast.error('사무소 정보가 없습니다.'); return; }
    setBlockModalOpen(true);
    await loadBlocks();
  };
  const handlePickBlock = async (row) => {
    const regNo = row?.codes?.regNo || '';
    const nm = row?.cell?.['상호'] || row?.cell?.['중개업소명'] || row?.cell?.['사무소명'] || '';
    if (!regNo) { toast.error('선택한 업체의 부동산등록번호를 찾을 수 없습니다.'); return; }
    try {
      await hubService.addOfficeBlock({ offNo: user.offNo, blockedRegNo: regNo, blockedNm: nm, regId: user?.userId });
      setBrokerPickOpen(false);
      toast.success('비공유업체로 등록되었습니다.');
      await loadBlocks();
      fetchHubData();
    } catch (e) { /* apiHandler에서 처리 */ }
  };
  const handleDeleteBlock = async (b) => {
    if (!window.confirm(`${b.blockedNm || b.blockedRegNo} 비공유를 해제할까요?`)) return;
    try { await hubService.deleteOfficeBlock(b.blockId); await loadBlocks(); fetchHubData(); }
    catch (e) { /* apiHandler에서 처리 */ }
  };

  const handleAdd = () => {
    // 공동중개망은 직접 등록하지 않고 물건/고객 메뉴에서 전송
    toast('물건관리 또는 고객관리 메뉴에서 전송이 가능합니다.', { icon: 'ℹ️' });
  };

  const handleSelectType = async (tradeDiv) => {
    setShowTypeSelect(false);

    // Electron API를 통해 별도 창으로 열기
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'hub-form',
          data: {
            title: '거래정보 등록',
            tradeDiv: tradeDiv,
          },
          width: 900,
          height: 850,
          minWidth: 900,
          maxWidth: 900,
          resizable: false,
        });
      } catch (error) {
        console.error('거래정보 등록 창 열기 실패:', error);
        // fallback to modal
        setEditData({ tradeDiv });
        setShowModal(true);
      }
    } else {
      // Electron API 없으면 기존 모달 사용
      setEditData({ tradeDiv });
      setShowModal(true);
    }
  };

  const handleEdit = async (row) => {
    // Electron API를 통해 별도 창으로 열기
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'hub-form',
          data: {
            title: '거래정보 수정',
            editData: row,
          },
          width: 900,
          height: 850,
          minWidth: 900,
          maxWidth: 900,
          resizable: false,
        });
      } catch (error) {
        console.error('거래정보 수정 창 열기 실패:', error);
        // fallback to modal
        setEditData(row);
        setShowModal(true);
      }
    } else {
      // Electron API 없으면 기존 모달 사용
      setEditData(row);
      setShowModal(true);
    }
  };

  const handleDelete = async (tradeId) => {
    if (!window.confirm('이 거래정보를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await hubService.deleteHub(tradeId);
      toast.success('거래정보가 삭제되었습니다.');
      fetchHubData();
    } catch (error) {
      console.error('거래정보 삭제 실패:', error);
    }
  };

  // 색 채우기(선택 행)
  const handleColorFill = (color) => {
    if (selectedRows.length === 0) { toast.error('색을 채울 행을 선택하세요.'); return; }
    setColorFillRequest({ seq: Date.now(), ids: [...selectedRows], color });
  };

  // 선택 삭제(본인 등록분만)
  const handleDeleteSelectedOwn = async () => {
    if (selectedRows.length === 0) { toast.error('삭제할 행을 선택하세요.'); return; }
    const own = hubData.filter((r) => selectedRows.includes(r.tradeId) && String(r.regUserId) === String(user?.userId));
    if (own.length === 0) { toast.error('본인이 등록한 항목만 삭제할 수 있습니다.'); return; }
    const skipped = selectedRows.length - own.length;
    if (!window.confirm(`선택 ${selectedRows.length}건 중 본인 항목 ${own.length}건을 삭제합니다.${skipped ? ` (타인 ${skipped}건 제외)` : ''}`)) return;
    try {
      for (const r of own) { await hubService.deleteHub(r.tradeId); }
      toast.success('삭제되었습니다.');
      setSelectedRows([]);
      fetchHubData();
    } catch (e) { console.error(e); toast.error('삭제에 실패했습니다.'); }
  };

  // 선택 수정(마지막 체크 행)
  const handleEditSelected = () => {
    if (selectedRows.length === 0) { toast.error('수정할 행을 선택하세요.'); return; }
    const last = selectedRows[selectedRows.length - 1];
    const row = hubData.find((r) => r.tradeId === last);
    if (row) handleEdit(row);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return `${String(date.getFullYear()).slice(2)}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  // 쪽지 제목 자동기입: 선택 첫 행의 등록일 · 물건유형 · 주소 (formatDate 정의 이후에 배치)
  const noteSubject = (() => {
    const rows = hubData.filter((r) => selectedRows.includes(r.tradeId));
    if (rows.length === 0) return '';
    const r = rows[0];
    const reg = r.regDt ? formatDate(r.regDt) : '';
    const type = ptTypeLabel(r.pPtType) || (r.custWantType ? ptTypeLabel(r.custWantType) : '');
    const addr = [r.pAddr1, r.pAddr2, r.pAddr3].filter(Boolean).join(' ')
      || r.pAddrFull
      || [r.custRegion1, r.custRegion2, r.custRegion3].filter(Boolean).join(' ')
      || '';
    return [reg, type, addr].filter(Boolean).join(' ').slice(0, 50);
  })();

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return `${(value / 10000).toLocaleString()}만원`;
  };

  const getTradeDivLabel = (tradeDiv) => {
    return tradeDiv === 'CUST' ? '고객' : tradeDiv === 'PT' ? '물건' : '-';
  };

  const getTradeStateLabel = (tradeState) => {
    const stateMap = {
      active: '활성',
      matching: '매칭중',
      completed: '완료',
      canceled: '취소',
      hold: '보류',
    };
    return stateMap[tradeState] || tradeState || '-';
  };

  // 공통 컬럼 정의
  const commonColumns = [
    { key: 'tradeId', label: 'ID', hidden: true },
    { key: 'tradeDiv', label: '구분' },
    { key: 'title', label: '제목' },
    { key: 'regDt', label: '등록일' },
    { key: 'tradeState', label: '상태' },
    { key: 'coBrokerage', label: '공동중개' },
  ];

  // 고객 전용 컬럼
  const customerColumns = [
    { key: 'custName', label: '고객명' },
    { key: 'custTel', label: '연락처' },
    { key: 'custWantType', label: '희망물건' },
    { key: 'custRegion', label: '희망지역' },
    { key: 'custTrdType', label: '거래구분' },
    { key: 'custPriceRange', label: '희망가격' },
  ];

  // 물건 전용 컬럼
  const propertyColumns = [
    { key: 'pPtName', label: '물건명' },
    { key: 'pPtType', label: '물건종류' },
    { key: 'pAddrFull', label: '주소' },
    { key: 'pSaleDiv', label: '거래구분' },
    { key: 'pSaleAmt', label: '가격' },
    { key: 'pExcArea', label: '전용면적' },
  ];

  // 보기 모드에 따라 컬럼 선택
  const getColumns = () => {
    if (viewMode === 'CUST') {
      return [...commonColumns, ...customerColumns, { key: 'actions', label: '작업' }];
    } else if (viewMode === 'PT') {
      return [...commonColumns, ...propertyColumns, { key: 'actions', label: '작업' }];
    } else {
      // 전체 보기: 필수 컬럼만
      return [
        ...commonColumns,
        { key: 'name', label: '이름/물건명' },
        { key: 'contact', label: '연락처/주소' },
        { key: 'tradeInfo', label: '거래정보' },
        { key: 'actions', label: '작업' },
      ];
    }
  };

  // 보기모드별 컬럼 구성 — 헤드라인설정과 연동 (면적 컬럼 헤더는 ㎡/평 토글 버튼)
  useEffect(() => {
    if (viewMode === 'PT') {
      const areaHeader = (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAreaUnit((u) => (u === '㎡' ? '평' : '㎡')); }}
          title="㎡ / 평 전환"
          style={{ fontSize: '11px', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '3px', background: 'white', color: '#4f46e5', cursor: 'pointer', padding: '0 5px', lineHeight: 1.5 }}
        >
          면적({areaUnit})
        </button>
      );
      // 선택된 그룹/세부유형에 맞는 유형별 헤드라인 컬럼. 면적 컬럼 헤더는 ㎡/평 토글 버튼
      const cols = resolveHubColumns(ptGroup, ptTypes).map((c) => (c.key === 'h_area' ? { ...c, label: areaHeader } : c));
      setColumns(cols);
    } else {
      setColumns(CUST_COLUMNS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, areaUnit, ptGroup, ptTypes]);

  // 보기모드 전환 시에만 선택/색채우기 초기화 (단위 토글로는 유지)
  useEffect(() => {
    setSelectedRows([]);
    setReportRows([]);
    setColorFillRequest(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // 1회 클릭 = 선택(체크) 토글, 2회 클릭(onRowClick) = 수정창
  const handleRowSelect = (row) => setSelectedRows((s) => (s.includes(row.tradeId) ? s.filter((id) => id !== row.tradeId) : [...s, row.tradeId]));

  // 선택 — 보고서 사각형과 동일한 16×16 사각형(선택 시 체크표시)
  const renderSelectCheckbox = (row) => {
    const checked = selectedRows.includes(row.tradeId);
    return (
      <button
        type="button"
        title="선택"
        onClick={(e) => { e.stopPropagation(); setSelectedRows((s) => (checked ? s.filter((id) => id !== row.tradeId) : [...s, row.tradeId])); }}
        style={{ width: '16px', height: '16px', borderRadius: '3px', border: `1px solid ${checked ? '#334155' : '#cbd5e1'}`, background: checked ? '#334155' : '#ffffff', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 800, lineHeight: 1 }}
      >{checked ? '✓' : ''}</button>
    );
  };

  // 셀 렌더링 (subIndex: 0=상단행, 1=하단행, undefined=rowspan)
  const renderCell = (row, column, subIndex) => {
    // ===== 유형별 헤드라인(h_*) 단일 컬럼 렌더 =====
    if (column.key.startsWith('h_')) {
      const toPy = areaUnit === '평';
      const hArea = (v) => {
        if (v == null || v === '') return '-';
        const n = Number(v);
        if (Number.isNaN(n)) return '-';
        const val = toPy ? Math.round(n * 0.3025 * 100) / 100 : n;
        return `${val}${areaUnit}`;
      };
      const sumY = (keys) => {
        const s = keys.reduce((a, k) => a + (Number(row[k]) || 0), 0);
        return s ? amtMan(s) : '-';
      };
      const H = {
        h_regdt: () => formatDate(row.regDt),
        h_name: () => row.pPtName || row.pAddr4 || row.pAddr5 || '-',
        h_dong: () => (row.pDong ? `${row.pDong}동` : '-'),
        h_floor: () => row.pFloorDesc || (row.pFloor1 != null && row.pFloor1 !== '' ? `${row.pFloor1}${row.pFloor2 != null && row.pFloor2 !== '' ? '/' + row.pFloor2 : ''}층` : '-'),
        h_gnd: () => `${row.pGroundFloor ?? '-'}/${row.pBasementFloor ?? '-'}`,
        h_type: () => row.pAptTyp || '-',
        h_area: () => hArea(row.pExcArea ?? row.pSupArea),
        h_landarea: () => hArea(row.pLandArea ?? row.pLandShare),
        h_gross: () => hArea(row.pTotalFloorArea),
        h_dir: () => row.pDirStd || '-',
        h_trd: () => saleDivLabel(row.pSaleDiv),
        h_reqamt: () => amtMan(row.pSaleAmt),
        h_loan: () => amtMan(row.pLoanAmt),
        h_loantotal: () => amtMan(row.pLoanAmt),
        h_status: () => row.pCurrentStatus || row.pPrgSts || '-',
        h_keymoney: () => amtMan(row.pLayAmt),
        h_maturity: () => (row.pMaturityDate ? formatDate(row.pMaturityDate) : '-'),
        h_presale: () => amtMan(row.pPresaleAmt),
        h_balcony: () => amtMan(row.pExpansionAmt),
        h_option: () => amtMan(row.pOptionAmt),
        h_premium: () => amtMan(row.pPremiumAmt),
        h_rightamt: () => amtMan(row.pRightValueAmt),
        h_moving: () => amtMan(row.pMovingCost),
        h_comp: () => (row.pCompYear ? String(row.pCompYear).slice(0, 4) : '-'),
        h_deposit: () => amtMan(row.pNowDepAmt),
        h_yincome: () => sumY(['pIncRentY', 'pIncMgmtY', 'pIncEtcY']),
        h_yexpense: () => sumY(['pExpLaborY', 'pExpUtilY', 'pExpLoanY', 'pExpEtcY']),
        h_jimok: () => row.pLandCategory || '-',
        h_landuse: () => row.pLandUse || '-',
        h_permit: () => '-',
        h_match: () => '-',
        h_consult: () => row.pPtExpl || '-',
      };
      const fn = H[column.key];
      const val = fn ? fn() : '-';
      if (column.key === 'h_name' || column.key === 'h_consult') {
        return (
          <div className="text-xs" title={String(val || '')} style={{ maxWidth: column.key === 'h_consult' ? '180px' : '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</div>
        );
      }
      return <div className="text-xs" style={{ textAlign: 'center' }}>{val}</div>;
    }
    switch (column.key) {
      case 'select':
        return renderSelectCheckbox(row);

      // ===== 물건목록(PT) 선택 / 보고서 — 각각 별도 칼럼(체크박스 / 사각형) =====
      case 'select_only':
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>{renderSelectCheckbox(row)}</div>;
      case 'report_only': {
        const picked = reportRows.includes(row.tradeId);
        const sq = (bg, brd) => ({ width: '16px', height: '16px', borderRadius: '3px', border: `1px solid ${brd}`, background: bg, cursor: 'pointer', padding: 0, flexShrink: 0 });
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" title={picked ? '보고서 작성 선택됨' : '보고서 작성 선택/해제'}
              onClick={(e) => { e.stopPropagation(); setReportRows((s) => (s.includes(row.tradeId) ? s.filter((id) => id !== row.tradeId) : [...s, row.tradeId])); }}
              style={sq(picked ? '#4338ca' : '#e0e7ff', picked ? '#3730a3' : '#c7d2fe')} />
          </div>
        );
      }
      case 'pttype_regdt':
        return subIndex === 0
          ? <span className="text-xs">{ptTypeLabel(row.pPtType)}</span>
          : <span className="text-xs">{formatDate(row.regDt)}</span>;
      case 'type_area': {
        // 상단: 타입(평형타입) / 하단: 면적 (전용 우선 → 공급, 토지는 숫자만 · ㎡/평 단위 환산)
        if (subIndex === 0) return <span className="text-xs">{row.pAptTyp || '-'}</span>;
        const toPy = areaUnit === '평';
        const fmt = (v) => {
          if (v == null || v === '') return null;
          const n = Number(v);
          if (Number.isNaN(n)) return null;
          return toPy ? Math.round(n * 0.3025 * 100) / 100 : n;
        };
        const isLand = row.pPtType === 'SYCA115';
        if (isLand) {
          const v = fmt(row.pLandArea ?? row.pExcArea ?? row.pSupArea);
          return <span className="text-xs">{v != null ? `${v}` : '-'}</span>;
        }
        const exc = fmt(row.pExcArea);
        if (exc != null) return <span className="text-xs">{`${exc}(전용)`}</span>;
        const sup = fmt(row.pSupArea);
        if (sup != null) return <span className="text-xs">{`${sup}(공급)`}</span>;
        return <span className="text-xs">-</span>;
      }
      // 소재지(상단) / 물건명(하단) — 2행 컬럼
      case 'soji_name': {
        if (subIndex === 0) {
          const region = [row.pAddr1, row.pAddr2, row.pAddr3].filter(Boolean).join(' ');
          return <span style={{ fontSize: '14px' }}>{region || row.pAddrFull || '-'}</span>;
        }
        const name = row.pAddr4 || row.pAddr5 || row.pPtName || '';
        return <span style={{ fontSize: '14px', fontWeight: 500 }}>{name || '-'}</span>;
      }
      // 동(상단) / 호(하단) — 2행 컬럼
      case 'dong_ho': {
        if (subIndex === 0) return <span style={{ fontSize: '14px' }}>{row.pDong ? `${row.pDong}동` : '-'}</span>;
        return <span style={{ fontSize: '14px' }}>{row.pHo ? `${row.pHo}호` : '-'}</span>;
      }
      case 'landuse_jimok':
        return subIndex === 0
          ? <span className="text-xs">{row.pLandUse || '-'}</span>
          : <span className="text-xs">{row.pLandCategory || '-'}</span>;
      case 'biz_blduse':
        return subIndex === 0
          ? <span className="text-xs">{row.pBusinessType || '-'}</span>
          : <span className="text-xs">{row.pBuildingUse || '-'}</span>;
      case 'trd_amt':
        return subIndex === 0
          ? <span className="text-xs">{saleDivLabel(row.pSaleDiv)}</span>
          : <span className="text-xs">{amtMan(row.pSaleAmt)}</span>;
      case 'status_lease': {
        // 상단: 현상태 / 하단: 현임대조건(보증금·월세)
        if (subIndex === 0) return <span className="text-xs">{row.pCurrentStatus || row.pPrgSts || '-'}</span>;
        const parts = [];
        if (row.pNowDepAmt) parts.push(`보증금 ${amtMan(row.pNowDepAmt)}`);
        if (row.pNowMonAmt) parts.push(`월세 ${amtMan(row.pNowMonAmt)}`);
        return <span className="text-xs">{parts.length ? parts.join(' / ') : '-'}</span>;
      }
      case 'rental_renew':
        return subIndex === 0
          ? <span className="text-xs">{rentBsnLabel(row.ownerRentBsnYn) || '-'}</span>
          : <span className="text-xs">{row.pContractRenewalRight || '-'}</span>;
      case 'maturity_balance':
        return subIndex === 0
          ? <span className="text-xs">{row.pMaturityDate ? formatDate(row.pMaturityDate) : '-'}</span>
          : <span className="text-xs">{row.pExptDate ? formatDate(row.pExptDate) : '-'}</span>;
      case 'feature':
        return <div className="text-xs" title={row.pPtExpl || ''} style={{ maxWidth: '200px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{row.pPtExpl || '-'}</div>;
      case 'office_rep':
        return subIndex === 0
          ? <span className="text-xs">{row.offNm || '-'}</span>
          : <span className="text-xs">{row.rpsNm || '-'}</span>;
      case 'office_tel':
        return subIndex === 0
          ? <span className="text-xs">{row.offTel || '-'}</span>
          : <span className="text-xs">{row.offRpsPhone || '-'}</span>;
      case 'tradeDiv':
        return (
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
            row.tradeDiv === 'CUST'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {getTradeDivLabel(row.tradeDiv)}
          </span>
        );

      case 'regDt':
        return formatDate(row.regDt);

      case 'tradeState':
        return (
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
            row.tradeState === 'active'
              ? 'bg-green-100 text-green-800'
              : row.tradeState === 'matching'
              ? 'bg-yellow-100 text-yellow-800'
              : row.tradeState === 'completed'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {getTradeStateLabel(row.tradeState)}
          </span>
        );

      case 'title':
        return row.title || '-';

      case 'coBrokerage':
        if (row.coBrokerageTitle) {
          return (
            <div className="max-w-xs">
              <div className="font-medium text-sm text-gray-900 truncate" title={row.coBrokerageTitle}>
                {row.coBrokerageTitle}
              </div>
              {row.coBrokerageContent && (
                <div className="text-xs text-gray-500 truncate" title={row.coBrokerageContent}>
                  {row.coBrokerageContent}
                </div>
              )}
            </div>
          );
        }
        return '-';

      // 고객 정보 컬럼
      case 'custName':
        return row.custName || '-';

      case 'custTel':
      case 'cust_tel':
        return <span className="text-xs">{row.custTel || '-'}</span>;

      case 'custWantType':
        return <span className="text-xs">{ptTypeLabel(row.custWantType)}</span>;

      case 'custRegion': {
        // 여러 희망지역이면 "첫지역 외 N곳" + 마우스오버(title)로 전체 표시.
        // 다지역 데이터: row.custRegions(배열) 또는 row.custRegionsText('|' 구분). 없으면 단일 지역.
        let list = [];
        if (Array.isArray(row.custRegions)) list = row.custRegions.filter(Boolean);
        else if (typeof row.custRegionsText === 'string' && row.custRegionsText.trim())
          list = row.custRegionsText.split('|').map((s) => s.trim()).filter(Boolean);
        if (list.length === 0) {
          const single = [row.custRegion1, row.custRegion2, row.custRegion3, row.custBldNm].filter(Boolean).join(' ');
          if (single) list = [single];
        }
        if (list.length === 0) return <span className="text-xs">-</span>;
        const text = list.length > 1 ? `${list[0]} 외 ${list.length - 1}곳` : list[0];
        return (
          <span className="text-xs" title={list.join('\n')}
            style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: list.length > 1 ? 'help' : 'default' }}>
            {text}
          </span>
        );
      }

      case 'custTrdType':
        return <span className="text-xs">{custTrdLabel(row.custTrdType)}</span>;

      case 'custExcArea':
        return <span className="text-xs">{(row.custExcAreaFr || row.custExcAreaTo) ? `${row.custExcAreaFr ?? ''}~${row.custExcAreaTo ?? ''}㎡` : '-'}</span>;
      case 'custLandArea':
      case 'custUsage':
      case 'custJimok':
      case 'custBiz':
        return <span className="text-xs">-</span>;
      case 'custMovein':
        return <span className="text-xs">{row.custMoveinYn === 'Y' ? '실입주' : '-'}</span>;
      case 'custFeature':
        return <span className="text-xs" title={row.custFeatureNote || ''} style={{ display: 'block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.custFeatureNote || '-'}</span>;
      case 'office_nm':
        return <span className="text-xs">{row.offNm || '-'}</span>;
      case 'cust_office_tel':
        return <span className="text-xs">{row.offTel || '-'}</span>;

      case 'custPriceRange':
        if (row.custSaleAmtFr || row.custSaleAmtTo) {
          return `${formatCurrency(row.custSaleAmtFr)} ~ ${formatCurrency(row.custSaleAmtTo)}`;
        }
        if (row.custLesAmtFr || row.custLesAmtTo) {
          return `전세 ${formatCurrency(row.custLesAmtFr)} ~ ${formatCurrency(row.custLesAmtTo)}`;
        }
        return '-';

      // 물건 정보 컬럼
      case 'pPtName':
        return row.pPtName || '-';

      case 'pPtType':
        return row.pPtType || '-';

      case 'pAddrFull':
        return row.pAddrFull || '-';

      case 'pSaleDiv':
        return row.pSaleDiv || '-';

      case 'pSaleAmt':
        return formatCurrency(row.pSaleAmt);

      case 'pExcArea':
        return row.pExcArea ? `${row.pExcArea}㎡` : '-';

      // 전체 보기 통합 컬럼
      case 'name':
        return row.tradeDiv === 'CUST' ? row.custName || '-' : row.pPtName || '-';

      case 'contact':
        return row.tradeDiv === 'CUST' ? row.custTel || '-' : row.pAddrFull || '-';

      case 'tradeInfo':
        if (row.tradeDiv === 'CUST') {
          const region = [row.custRegion1, row.custRegion2, row.custRegion3]
            .filter(Boolean)
            .join(' ');
          return `${row.custWantType || '-'} / ${region || '-'}`;
        } else {
          return `${row.pSaleDiv || '-'} / ${formatCurrency(row.pSaleAmt)}`;
        }

      case 'actions':
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row);
              }}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="수정"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.tradeId);
              }}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );

      default:
        return row[column.key] || '-';
    }
  };

  // 클라이언트 필터 적용
  const f = ptFilter;
  // 선택된 유형 버튼(복수코드)들을 개별 SYCA 코드로 펼침.
  //  PT: 세부유형 미선택이면 현재 그룹의 전체 유형 코드로 필터(그룹만 선택 시 그 그룹만 노출)
  const groupTypeCodes = (HUB_TYPE_GROUPS.find((g) => g.key === ptGroup)?.types || []).flatMap((t) => t.value.split(','));
  const selectedTypeCodes = ptTypes.length
    ? ptTypes.flatMap((v) => v.split(','))
    : (viewMode === 'PT' ? groupTypeCodes : []);
  // 주거래지역 필터: 체크 & 설정지역 존재 시, 저장된 bjd_code 상위 prefix로 물건/고객 bjd_code 매칭
  const regionPrefixes = mainRegions.map((x) => String(x.bjdCode || '').replace(/0+$/, '')).filter(Boolean);
  const passRegion = (bjd) => !mainRegionOn || regionPrefixes.length === 0
    || regionPrefixes.some((p) => String(bjd || '').startsWith(p));
  const filterPt = (r) => {
    if (!passRegion(r.pBjdCode)) return false;
    if (selectedTypeCodes.length && !selectedTypeCodes.includes(r.pPtType)) return false;
    if (f.trdType && !String(r.pSaleDiv || '').includes(f.trdType)) return false;
    if (f.region) {
      const addr = [r.pAddr1, r.pAddr2, r.pAddr3, r.pAddrFull].filter(Boolean).join(' ');
      if (!addr.includes(f.region)) return false;
    }
    if (f.addr1 && r.pAddr1 && r.pAddr1 !== f.addr1) return false;
    if (f.addr2 && r.pAddr2 && r.pAddr2 !== f.addr2) return false;
    if (f.addr3 && r.pAddr3 && r.pAddr3 !== f.addr3) return false;
    // 면적 필터(전용면적 기준, 입력단위 평/㎡ → ㎡ 환산 비교)
    if (areaFilter.min !== '' || areaFilter.max !== '') {
      const areaVal = Number(r.pExcArea);
      if (!areaVal) return false;
      const toM2 = (v) => (areaFilter.unit === '평' ? Number(v) * 3.305785 : Number(v));
      if (areaFilter.min !== '' && !(areaVal >= toM2(areaFilter.min))) return false;
      if (areaFilter.max !== '' && !(areaVal <= toM2(areaFilter.max))) return false;
    }
    // 층수 필터 (전부/1층/1층제외/탑층/고/중/저)
    if (floorFilter) {
      const fl = Number(r.pFloor1);
      const total = Number(r.pFloor2);
      if (floorFilter === 'first' && fl !== 1) return false;
      if (floorFilter === 'exceptFirst' && fl === 1) return false;
      if (floorFilter === 'top' && !(total > 0 && fl === total)) return false;
      if (floorFilter === 'high' && r.pFloorDesc !== '고') return false;
      if (floorFilter === 'mid' && r.pFloorDesc !== '중') return false;
      if (floorFilter === 'low' && r.pFloorDesc !== '저') return false;
    }
    // 단지명 검색
    if (f.danjiName && !String(r.pPtName || '').includes(f.danjiName)) return false;
    // 거래금액 필터(만원 저장, 입력 억/만원 → 만원 환산). 매매/전세/보증금 중 하나라도 범위면 통과
    {
      const af = amountFilter;
      const hasMain = af.min !== '' || af.max !== '';
      const hasMon = (af.monMin ?? '') !== '' || (af.monMax ?? '') !== '';
      if (hasMain || hasMon) {
        const mainMin = af.min !== '' ? priceUnitToMan(af.min, af.unit) : null;
        const mainMax = af.max !== '' ? priceUnitToMan(af.max, af.unit) : null;
        const monMin = (af.monMin ?? '') !== '' ? priceUnitToMan(af.monMin, af.monUnit) : null;
        const monMax = (af.monMax ?? '') !== '' ? priceUnitToMan(af.monMax, af.monUnit) : null;
        const nums = (list) => list.map(Number).filter((n) => n && !Number.isNaN(n));
        const inRange = (vals, lo, hi) => vals.some((a) => (lo == null || a >= lo) && (hi == null || a <= hi));
        if (hasMain && !inRange(nums([r.pSaleAmt, r.pLesAmt, r.pNowDepAmt]), mainMin, mainMax)) return false;
        if (hasMon && !inRange(nums([r.pNowMonAmt]), monMin, monMax)) return false;
      }
    }
    return true;
  };
  const filterCust = (r) => {
    if (!passRegion(r.custBjdCode)) return false;
    if (ptTypes.length && !selectedTypeCodes.includes(r.custWantType)) return false;
    // 거래유형 드롭다운은 SALEDIV코드 → 고객은 TRDTYP코드(같은 순번)로 매핑
    if (f.trdType && !String(r.custTrdType || '').includes(f.trdType.replace('SALEDIV', 'TRDTYP'))) return false;
    if (f.region) {
      const region = [r.custRegion1, r.custRegion2, r.custRegion3, r.custBldNm].filter(Boolean).join(' ');
      if (!region.includes(f.region)) return false;
    }
    if (f.addr1 && r.custRegion1 && r.custRegion1 !== f.addr1) return false;
    if (f.addr2 && r.custRegion2 && r.custRegion2 !== f.addr2) return false;
    if (f.addr3 && r.custRegion3 && r.custRegion3 !== f.addr3) return false;
    return true;
  };
  const displayRows = viewMode === 'PT' ? hubData.filter(filterPt)
    : viewMode === 'CUST' ? hubData.filter(filterCust)
    : hubData;
  // CustomerTable 색/선택 식별용 id 부여(tradeId)
  const displayData = displayRows.map((r) => ({ ...r, id: r.tradeId }));

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb', zoom: zoomNum / 100 }}>
      {/* 헤더 */}
      <div style={{ padding: '0.5rem 0.5rem', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        {/* 보기 모드: 물건목록 / 고객목록 | 내 물건 / 내 고객 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewMode('PT'); setMineOnly(false); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'PT' && !mineOnly ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Home className="w-4 h-4 inline mr-2" />물건목록
          </button>
          <button
            onClick={() => { setViewMode('CUST'); setMineOnly(false); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'CUST' && !mineOnly ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Users className="w-4 h-4 inline mr-2" />고객목록
          </button>
          <span className="text-gray-300 mx-1">|</span>
          <button
            onClick={() => { setViewMode('PT'); setMineOnly(true); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${mineOnly && viewMode === 'PT' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >내 물건</button>
          <button
            onClick={() => { setViewMode('CUST'); setMineOnly(true); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${mineOnly && viewMode === 'CUST' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >내 고객</button>

          {/* 구분선 + 이용안내 */}
          <span className="text-gray-300 mx-1">|</span>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              title="이용안내"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '14px', fontWeight: 600, border: `1px solid ${showGuide ? '#4f46e5' : '#cbd5e1'}`, borderRadius: '6px', background: showGuide ? '#eef2ff' : 'white', color: showGuide ? '#4f46e5' : '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Info className="w-4 h-4" />이용안내
            </button>
            {showGuide && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 1300 }} onClick={() => setShowGuide(false)} />
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1301, width: '560px', maxWidth: '92vw', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', padding: '16px 18px' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>공동중개망 이용안내</span>
                    <button type="button" onClick={() => setShowGuide(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-5 h-5" /></button>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#374151', fontSize: '14px', fontWeight: 600, lineHeight: 1.5 }}>
                    <li>게시기간은 50일이며, 게시기간이 지나면 자동으로 삭제됩니다.</li>
                    <li style={{ color: '#dc2626', fontWeight: 800 }}>거래완료시 즉시 삭제하여야 하며, 허위매물 게시를 금지합니다.</li>
                    <li>물건목록 200개/최근50일, 고객목록 200개/최근 50일 게시 가능합니다(삭제 게시물 포함)</li>
                    <li>최근 게시한 매물이 상위 노출됩니다.</li>
                    <li>공동중개망은 무료로 운영되며, 게시기간·허위매물 금지위반·게시가능한 매물수 등은 변경될 수 있습니다.</li>
                    <li>인증마크는 허위매물이 아니며, 거래완료 즉시 자진 삭제할 물건 및 고객의 경우에 자진 인증합니다.</li>
                    <li>우리 모두 건전하고 성숙한 공동중개문화를 만들어 갑시다.</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* 상단바 대체: 고객센터·카톡문의·홈으로·상담모드 — 이용안내 줄 우측 끝 */}
          <div style={{ marginLeft: 'auto' }}><MenuTopActions consult /></div>
        </div>

        {/* 물건목록 필터 툴바 */}
        {(viewMode === 'PT' || viewMode === 'CUST') && (() => {
          const setF = (name, value) => setPtFilter((p) => ({ ...p, [name]: value }));
          const inp = { padding: '4px 8px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' };
          const lbl = { fontSize: '14px', fontWeight: 600, color: '#000', whiteSpace: 'nowrap' };
          const btn = { padding: '5px 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#000', cursor: 'pointer', whiteSpace: 'nowrap' };
          const typeBtn = (active) => ({ padding: '5px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', background: active ? '#4f46e5' : 'white', color: active ? 'white' : '#000', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, minWidth: '48px', textAlign: 'center', fontWeight: active ? 700 : 600 });
          // 드래그 재정렬 대상 목록/저장키 (뷰별)
          const typeList = viewMode === 'CUST' ? custTypeOrder : ptTypeOrder;
          const setTypeList = viewMode === 'CUST' ? setCustTypeOrder : setPtTypeOrder;
          const typeKey = viewMode === 'CUST' ? 'hub_cust_type_btn_order' : 'hub_pt_type_btn_order';
          const onTypeDrop = (toIdx) => { const next = moveItem(typeList, typeDragIdx.current, toIdx); setTypeList(next); saveButtonOrder(next, typeKey); typeDragIdx.current = null; };
          const link = { fontSize: '14px', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' };
          const chk = { fontSize: '14px', fontWeight: 600, color: '#000', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' };
          const dot = <span style={{ color: '#d1d5db' }}>·</span>;
          // 상세 필터(주거래지역/주소/단지명/보고서작성/비공유업체관리) — PT: 그룹 버튼 줄 우측 끝 / CUST: 유형 버튼 아래
          const detailFilter = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label style={chk}>
                <input type="checkbox" checked={mainRegionOn} onChange={() => { setMainRegionOn(true); setAddrOn(false); }} style={{ cursor: 'pointer' }} />
                주거래지역 <span style={{ color: '#9ca3af', fontWeight: 400 }}>{mainRegions.length}곳</span>
              </label>
              <span style={link} onClick={() => setRegionModal({ open: true, mode: 'edit' })}>관리</span>
              {dot}
              <label style={chk}>
                <input type="checkbox" checked={addrOn} onChange={() => { setAddrOn(true); setMainRegionOn(false); }} style={{ cursor: 'pointer' }} />
                주소
              </label>
              {/* 시/도 · 시/군/구 · 읍/면/동 (+리) 드롭다운 */}
              <AddressSelectorSimple formData={ptFilter} onChange={setF} ptType="SYCA101" />
              <input type="text" value={ptFilter.danjiName || ''} onChange={(e) => setF('danjiName', e.target.value)} placeholder="단지명" style={{ ...inp, width: '120px' }} />
              {dot}
              {/* 보고서 작성 — 데이터행 '보고서작성' 선택 후 작성 (비공유업체 좌측) */}
              {viewMode !== 'CUST' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', color: reportRows.length > 0 ? '#4f46e5' : '#000', fontWeight: 700, whiteSpace: 'nowrap' }}>보고서 작성{reportRows.length > 0 ? ` (${reportRows.length})` : ''}</span>
                  <select value="" onChange={(e) => { const v = e.target.value; if (!v) return; if (v === 'create') openHubReport(); else if (v === 'reset') setReportRows([]); }}
                    style={{ padding: '4px 8px', fontSize: '14px', borderRadius: '4px', cursor: 'pointer', border: reportRows.length > 0 ? '1px solid #6366f1' : '1px solid #e5e7eb', backgroundColor: reportRows.length > 0 ? '#eef2ff' : 'white', color: reportRows.length > 0 ? '#4f46e5' : '#000', fontWeight: reportRows.length > 0 ? 700 : 400 }}>
                    <option value="">선택</option>
                    <option value="create">작성{reportRows.length > 0 ? `(${reportRows.length})` : ''}</option>
                    <option value="reset">선택 초기화</option>
                  </select>
                </div>
              )}
              {viewMode !== 'CUST' && dot}
              <button type="button" onClick={openBlockModal} style={btn}>비공유업체관리</button>
            </div>
          );
          return (
            <div className="flat-topbar" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {viewMode === 'PT' ? (
                <>
                  {/* 물건유형 — 상위 그룹 없이 전 세부유형을 모두 활성, 단일 선택 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {hubGroups.map((g, gi) => (
                      <React.Fragment key={g.key}>
                        {gi > 0 && <span style={{ color: '#d1d5db', margin: '0 2px', userSelect: 'none' }}>|</span>}
                        {g.types.map((t) => (
                          <button key={t.value} type="button"
                            onClick={() => { setPtTypes([t.value]); setPtGroup(g.key); }}
                            style={typeBtn(ptTypes.includes(t.value))}>
                            {t.label}
                          </button>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                  {/* 상세 필터(주거래지역 등) — 좌측 정렬 별도 줄 */}
                  {detailFilter}
                </>
              ) : (
                <>
                  {/* 고객목록(CUST): 기존 플랫 유형 버튼(다중선택·드래그 재정렬) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                    <button onClick={() => setPtTypes([])} style={typeBtn(ptTypes.length === 0)}>모든유형</button>
                    {typeList.map((t, idx) => (
                      <button
                        key={t.value}
                        draggable
                        onDragStart={() => { typeDragIdx.current = idx; }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onTypeDrop(idx)}
                        onClick={() => setPtTypes((prev) => prev.includes(t.value) ? prev.filter((c) => c !== t.value) : [...prev, t.value])}
                        title="드래그하여 순서 변경"
                        style={{ ...typeBtn(ptTypes.includes(t.value)), cursor: 'grab' }}
                      >{t.label}</button>
                    ))}
                  </div>
                  {detailFilter}
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* 메인 컨텐츠 - 테이블 (물건목록 스타일: 색채우기/삭제/등록 툴바 포함) */}
      {/* 데이터 행 높이 살짝 키움(물건목록 수준) — 이 페이지 테이블에만 적용 */}
      <style>{`
        .hub-list-rows .prop-list-grid td { padding-top: 6px !important; padding-bottom: 6px !important; }
        /* 고정폭 컬럼: 내용 넘치면 … 처리 (선택/등록일 등 좁은 칼럼 유지) */
        .hub-list-rows .prop-list-grid td,
        .hub-list-rows .prop-list-grid th { overflow: hidden; text-overflow: ellipsis; padding-left: 6px !important; padding-right: 6px !important; }
        /* 데이터 셀 폰트 14px — 공유 11px/500 !important + text-xs 규칙을 상위 선택자로 덮어씀 (물건목록·고객목록 공통) */
        .hub-list-rows .prop-list-grid td,
        .hub-list-rows .prop-list-grid td div,
        .hub-list-rows .prop-list-grid td span {
          font-size: 14px !important;
        }
        /* 테이블 헤더 배경색 */
        .hub-list-rows .prop-list-grid thead th {
          background-color: #fafafa !important;
        }
        /* 헤더 높이 = 총 50px 고정. 1줄 헤더=50px, 2줄(subHeader) 헤더=각 25px(총 50px) → 100px 방지 */
        .hub-list-rows .prop-list-grid thead tr:only-child th { height: 50px !important; max-height: 50px !important; }
        .hub-list-rows .prop-list-grid thead tr:not(:only-child) { height: 25px !important; }
        .hub-list-rows .prop-list-grid thead tr:not(:only-child) th { height: 25px !important; max-height: 25px !important; }
      `}</style>
      <div className="hub-list-rows flex-1 flex flex-col overflow-hidden">
        <Card padding="none" className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          <PropertyListTable
            menuId={`hub_${viewMode.toLowerCase()}`}
            fixedColumns
            fluidWidth
            allColumns={columns}
            defaultColumns={columns}
            data={displayData}
            isLoading={isLoading}
            renderCell={renderCell}
            onRowClick={handleEdit}
            onRowSelect={handleRowSelect}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            emptyMessage={viewMode === 'CUST' ? '등록된 고객 정보가 없습니다.' : '등록된 물건 정보가 없습니다.'}
            leftContent={(
              <div className="flat-topbar" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {[
                  { value: '', label: '전체' },
                  { value: 'SALEDIV01', label: '매매' },
                  { value: 'SALEDIV02', label: '전세' },
                  { value: 'SALEDIV03', label: '월세' },
                  { value: 'SALEDIV04', label: '기타임대' },
                ].map((t) => {
                  const active = (ptFilter.trdType || '') === t.value;
                  return (
                    <button key={t.value || 'all'} onClick={() => setF('trdType', t.value)}
                      style={{ padding: '5px 10px', fontSize: '14px', fontWeight: active ? 600 : 500, border: '1px solid #4f46e5', borderRadius: '4px', background: active ? '#4f46e5' : 'white', color: active ? 'white' : '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {t.label}
                    </button>
                  );
                })}
                {/* 면적 / 금액 필터 (기타임대 우측으로 이동) */}
                <span style={{ width: '1px', height: '20px', background: '#d1d5db', margin: '0 4px' }} />
                <button type="button"
                  onClick={(e) => { const rc = e.currentTarget.getBoundingClientRect(); setAreaMenu({ x: rc.left, y: rc.bottom + 4 }); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '14px', fontWeight: 600, border: `1px solid ${(areaFilter.min !== '' || areaFilter.max !== '') ? '#4f46e5' : '#cbd5e1'}`, borderRadius: '4px', background: (areaFilter.min !== '' || areaFilter.max !== '') ? '#eef2ff' : 'white', color: (areaFilter.min !== '' || areaFilter.max !== '') ? '#4f46e5' : '#000', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  면적
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={(areaFilter.min !== '' || areaFilter.max !== '') ? '#4f46e5' : 'none'} stroke={(areaFilter.min !== '' || areaFilter.max !== '') ? '#4f46e5' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  {(areaFilter.min !== '' || areaFilter.max !== '') && <span style={{ fontSize: '13px', fontWeight: 700 }}>{`${areaFilter.min || 0}~${areaFilter.max || ''}${areaFilter.unit}`}</span>}
                </button>
                <button type="button"
                  onClick={(e) => { const rc = e.currentTarget.getBoundingClientRect(); setAmountMenu({ x: rc.left, y: rc.bottom + 4 }); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '14px', fontWeight: 600, border: `1px solid ${amtActive ? '#4f46e5' : '#cbd5e1'}`, borderRadius: '4px', background: amtActive ? '#eef2ff' : 'white', color: amtActive ? '#4f46e5' : '#000', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  금액
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={amtActive ? '#4f46e5' : 'none'} stroke={amtActive ? '#4f46e5' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  {amtActive && <span style={{ fontSize: '13px', fontWeight: 700 }}>{`${(amountFilter.min !== '' || amountFilter.max !== '') ? `${amountFilter.min || 0}~${amountFilter.max || ''}${amountFilter.unit}` : ''}${((amountFilter.monMin ?? '') !== '' || (amountFilter.monMax ?? '') !== '') ? ` 월${amountFilter.monMin || 0}~${amountFilter.monMax || ''}${amountFilter.monUnit}` : ''}`}</span>}
                </button>
                {/* 층 필터 — 금액 버튼 우측 */}
                <span style={lbl}>층</span>
                <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} style={inp}>
                  <option value="">전부</option>
                  <option value="first">1층</option>
                  <option value="exceptFirst">1층제외</option>
                  <option value="top">탑층</option>
                  <option value="high">고</option>
                  <option value="mid">중</option>
                  <option value="low">저</option>
                </select>
              </div>
            )}
            rightLeadContent={(
              <div className="flat-topbar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 배율 */}
                <span style={{ fontSize: '14px', color: '#000', fontWeight: '600', whiteSpace: 'nowrap' }}>배율</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button type="button" onClick={zoomOut} title="축소(-5%)"
                    style={{ padding: '3px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px 0 0 4px', background: 'white', color: '#000', cursor: 'pointer' }}>−</button>
                  <input type="number" value={zoom}
                    onChange={(e) => setZoom(e.target.value)}
                    onBlur={(e) => { const v = parseFloat(e.target.value); setZoom(v ? Math.min(400, Math.max(30, v)) : 100); }}
                    style={{ width: '52px', padding: '3px 4px', fontSize: '14px', textAlign: 'center', border: '1px solid #e5e7eb', borderLeft: 'none', borderRight: 'none', color: '#000' }} />
                  <span style={{ fontSize: '14px', color: '#000', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '3px 4px' }}>%</span>
                  <button type="button" onClick={zoomIn} title="확대(+5%)"
                    style={{ padding: '3px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '0 4px 4px 0', background: 'white', color: '#000', cursor: 'pointer' }}>+</button>
                </div>
                {/* 줄수 */}
                <span style={{ fontSize: '14px', color: '#000', fontWeight: '600', whiteSpace: 'nowrap' }}>줄수</span>
                <select value={rowCount} onChange={(e) => { setRowCount(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '4px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000' }}>
                  <option value="all">전부</option>
                  <option value="20">20줄</option>
                  <option value="30">30줄</option>
                </select>
                {/* 쪽지보내기 */}
                <button
                  onClick={() => {
                    if (selectedRows.length === 0) { toast.error('쪽지 보낼 행을 먼저 선택하세요.'); return; }
                    if (noteReceivers.length === 0) { toast.error('선택한 행에 수신자(등록자) 정보가 없습니다.'); return; }
                    openNotes({ receivers: noteReceivers, subject: noteSubject });
                  }}
                  style={{ padding: '6px 14px', fontSize: '14px', fontWeight: 500, border: '1px solid #6366f1', borderRadius: '6px', background: selectedRows.length === 0 ? '#eef2ff' : 'white', color: '#4f46e5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                >
                  ✉️ 쪽지보내기{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                </button>
              </div>
            )}
            onColorFill={handleColorFill}
            colorFillRequest={colorFillRequest}
            selectedCount={selectedRows.length}
            onAddPropertyV2={handleAdd}
            onEditSelected={handleEditSelected}
            onDeleteSelected={handleDeleteSelectedOwn}
            onCreateReport={() => toast('보고서 작성은 준비 중입니다.')}
          />
        </Card>
      </div>

      {/* 헤드라인(컬럼) 설정 */}
      <TableSettings
        isOpen={showTableSettings}
        onClose={() => setShowTableSettings(false)}
        menuId={`hub_${viewMode.toLowerCase()}`}
        allColumns={columns}
        columns={columns}
        setColumns={setColumns}
        onSave={() => setShowTableSettings(false)}
      />

      {/* 유형 선택 모달 */}
      {showTypeSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">등록할 정보를 선택하세요</h2>

            <div className="space-y-4">
              <button
                onClick={() => handleSelectType('CUST')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                <Users className="w-6 h-6" />
                <span className="text-lg font-medium">고객</span>
              </button>

              <button
                onClick={() => handleSelectType('PT')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
              >
                <Home className="w-6 h-6" />
                <span className="text-lg font-medium">물건</span>
              </button>
            </div>

            <button
              onClick={() => setShowTypeSelect(false)}
              className="w-full mt-6 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 거래정보 등록/수정 모달 */}
      <HubModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchHubData}
        editData={editData}
        defaultTradeDiv={viewMode === 'CUST' ? 'CUST' : viewMode === 'PT' ? 'PT' : 'CUST'}
      />

      {/* 주거래지역 보기/편집 모달 */}
      <MainRegionModal
        isOpen={regionModal.open}
        mode={regionModal.mode}
        offNo={user?.offNo}
        rtNo={user?.rtNo}
        onClose={() => setRegionModal((s) => ({ ...s, open: false }))}
        onChanged={loadMainRegions}
      />

      {/* 비공유업체 관리 모달 */}
      {blockModalOpen && (
        <div onClick={() => setBlockModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '640px', maxWidth: '96vw', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>비공유업체 관리</div>
              <button onClick={() => setBlockModalOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155', margin: 0 }}>비공유로 지정한 업체는 물건/고객 목록에서 서로 조회되지 않습니다.</p>
                <button type="button" onClick={() => setBrokerPickOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', height: '34px', padding: '0 14px', fontSize: '14px', fontWeight: 700, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <Plus className="w-4 h-4" /> 업체 추가
                </button>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '9px 12px', fontSize: '14px', fontWeight: 700, color: '#111827', textAlign: 'left', borderBottom: '2px solid #000' }}>상호</th>
                      <th style={{ padding: '9px 12px', fontSize: '14px', fontWeight: 700, color: '#111827', textAlign: 'left', borderBottom: '2px solid #000' }}>부동산등록번호</th>
                      <th style={{ padding: '9px 12px', fontSize: '14px', fontWeight: 700, color: '#111827', textAlign: 'center', borderBottom: '2px solid #000', width: '90px' }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: '28px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>등록된 비공유업체가 없습니다. 우측 상단 <b>업체 추가</b>로 등록하세요.</td></tr>
                    ) : blocks.map((b) => (
                      <tr key={b.blockId}>
                        <td style={{ padding: '9px 12px', fontSize: '14px', fontWeight: 700, color: '#111827', borderBottom: '1px solid #e5e7eb' }}>{b.blockedNm || '-'}</td>
                        <td style={{ padding: '9px 12px', fontSize: '14px', fontWeight: 600, color: '#334155', borderBottom: '1px solid #e5e7eb' }}>{b.blockedRegNo || '-'}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                          <button onClick={() => handleDeleteBlock(b)} title="비공유 해제"
                            style={{ padding: '4px 10px', fontSize: '13px', fontWeight: 700, color: '#dc2626', background: 'white', border: '1px solid #fecaca', borderRadius: '5px', cursor: 'pointer' }}>해제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 공동중개사 조회 공통 팝업 — 선택 시 부동산등록번호로 비공유 등록 */}
      {brokerPickOpen && (
        <BrokerSearchModal onClose={() => setBrokerPickOpen(false)} onSelect={handlePickBlock} />
      )}

      {/* 보고서 작성 (공동중개망: 주소 호수 제외·동/층, 중개사메모=사무소정보) */}
      {showReportBuilder && (
        <ReportBuilderModal
          isOpen={showReportBuilder}
          mode="hub"
          property={reportProps && reportProps.length === 1 ? reportProps[0] : null}
          properties={reportProps && reportProps.length > 1 ? reportProps : null}
          onClose={() => { setShowReportBuilder(false); setReportProps(null); }}
          onSaved={() => { setShowReportBuilder(false); setReportProps(null); }}
        />
      )}

      {/* 면적 필터 팝오버 (전용면적 기준) */}
      {areaMenu && (() => {
        const unit = areaFilter.unit;
        const setMin = (v) => setAreaFilter((p) => ({ ...p, min: v === '' ? '' : String(v) }));
        const setMax = (v) => setAreaFilter((p) => ({ ...p, max: v === '' ? '' : String(v) }));
        const setUnit = (u) => setAreaFilter((p) => {
          if (p.unit === u) return p;
          const fct = u === '평' ? (1 / 3.305785) : 3.305785;
          const conv = (v) => (v === '' ? '' : String(Math.round(Number(v) * fct)));
          return { unit: u, min: conv(p.min), max: conv(p.max) };
        });
        const uBtn = (u) => ({ padding: '2px 10px', fontSize: '13px', fontWeight: 700, border: '1px solid ' + (unit === u ? '#4f46e5' : '#cbd5e1'), background: unit === u ? '#4f46e5' : 'white', color: unit === u ? 'white' : '#475569', borderRadius: '4px', cursor: 'pointer' });
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1300 }} onClick={() => setAreaMenu(null)} />
            <div style={{ position: 'fixed', left: `${Math.max(8, areaMenu.x)}px`, top: `${areaMenu.y}px`, zIndex: 1301, width: '320px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '14px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>면적</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" style={uBtn('㎡')} onClick={() => setUnit('㎡')}>㎡</button>
                    <button type="button" style={uBtn('평')} onClick={() => setUnit('평')}>평</button>
                  </div>
                </div>
                <button type="button" onClick={() => setAreaMenu(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-5 h-5" /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginBottom: '6px' }}>
                <input type="number" value={areaFilter.min} onChange={(e) => setMin(e.target.value)} placeholder="최소" style={{ width: '90px', padding: '5px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }} />
                <span style={{ color: '#94a3b8' }}>~</span>
                <input type="number" value={areaFilter.max} onChange={(e) => setMax(e.target.value)} placeholder="최대" style={{ width: '90px', padding: '5px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }} />
                <span style={{ fontSize: '13px', color: '#64748b' }}>{unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setAreaFilter((p) => ({ ...p, min: '', max: '' }))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#64748b', borderRadius: '6px', cursor: 'pointer' }}>↺ 조건삭제</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* 거래금액 필터 팝오버 (매매/전세/보증금/분양가 + 월차임) */}
      {amountMenu && (
        <PriceRangeFilter value={amountFilter} onChange={setAmountFilter} onClose={() => setAmountMenu(null)} position={amountMenu} />
      )}
    </div>
  );
};

export default TransactionNetworkPage;

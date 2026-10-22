import React, { useState, useEffect } from 'react';
import { Search, Filter, Upload } from 'lucide-react';
import Card from '../../components/ui/Card';
import PropertyListTable from '../../components/properties/PropertyListTable';
import TableSettings from '../../components/ui/TableSettings';
import ReportBuilderModal from '../../components/reports/ReportBuilderModal';
import { customerService } from '../../services/customerService';
import { useAuthStore } from '../../stores/authStore';
import { useHubModalStore } from '../../stores/hubModalStore';
import { toast } from 'react-hot-toast';
import CustomerFormPageV2 from './CustomerFormPageV2';
import MenuTopActions from '../../components/layout/MenuTopActions';
import ConsultationHistoryPanel from '../../components/consultation/ConsultationHistoryPanel';
import { getPropertyTypeLabel as getWantTypeLabel } from '../../constants/propertyTypes';
import { LAND_USES } from '../../constants/landUses';
import { BUILDING_USES } from '../../constants/buildingUses';

const CustomersPage = () => {
  const { user } = useAuthStore();
  const { openWithCustomer } = useHubModalStore();
  const [customers, setCustomers] = useState([]);

  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = '네오시스 - 고객관리';
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    tradeType: '',
    address1: '',
    address2: '',
    address3: '',
    propertyType: '',
  });
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState(null);   // 정렬 컬럼('name'|'updDt'|'regDt') — null=기본(cust_no DESC)
  const [sortDir, setSortDir] = useState(null); // 정렬 방향('ASC'|'DESC')
  const [searchText, setSearchText] = useState('');       // 통합검색 입력값(이름/상호/연락처/주소)
  const [searchKeyword, setSearchKeyword] = useState(''); // 실제 조회에 반영된 검색어(엔터/검색버튼 시 확정)
  const [rowCount, setRowCount] = useState('20'); // 줄수: '20' | '30' | 'all'
  const pageSize = rowCount === 'all' ? 9999 : parseInt(rowCount, 10);
  const [zoom, setZoom] = useState(100); // 화면 배율(%) — 기본 100, 직접입력 자유(±50 버튼)
  const zoomNum = (parseFloat(zoom) || 100); // 적용용 숫자값
  const zoomIn = () => setZoom(Math.min(400, zoomNum + 5));
  const zoomOut = () => setZoom(Math.max(30, zoomNum - 5));
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [openCustomerModalId, setOpenCustomerModalId] = useState(null); // 열려있는 고객 등록/수정 새창 ID(한번에 하나)
  const [selectedWantType, setSelectedWantType] = useState('__ph'); // 최상단 물건유형 필터('__ph'=헤더/전체, ''=모든유형/전체)
  const [areaUnit, setAreaUnit] = useState('평'); // 면적 단위 토글(평 ↔ ㎡)
  const [activeCustTab, setActiveCustTab] = useState('');     // 고객상태 trdPrg('' = 전체, TRDPRG01~04)
  const [selectedTrdTypes, setSelectedTrdTypes] = useState([]);  // 거래유형 복수 선택(TRDTYP..)
  const [selectedCustNos, setSelectedCustNos] = useState([]);    // 체크된 고객
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [colorFillRequest, setColorFillRequest] = useState(null); // {seq, ids, color}
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [reportCustomer, setReportCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // 거래 구분
  const tradeTypes = [
    { value: '', label: '전체' },
    { value: 'TRDTYP01', label: '매매' },
    { value: 'TRDTYP02', label: '전세' },
    { value: 'TRDTYP03', label: '월세' },
    { value: 'TRDTYP04', label: '기타' },
  ];

  // 물건 종류
  const propertyTypes = [
    { value: '', label: '전체' },
    { value: 'WNTTYP01', label: '아파트' },
    { value: 'WNTTYP02', label: '오피스텔' },
    { value: 'WNTTYP03', label: '빌라/연립' },
    { value: 'WNTTYP04', label: '단독/다가구' },
    { value: 'WNTTYP05', label: '상가' },
    { value: 'WNTTYP06', label: '토지' },
  ];

  // 시/도
  const cities = [
    { value: '', label: '전체' },
    { value: '서울시', label: '서울시' },
    { value: '부산시', label: '부산시' },
    { value: '대구시', label: '대구시' },
    { value: '인천시', label: '인천시' },
    { value: '광주시', label: '광주시' },
    { value: '대전시', label: '대전시' },
    { value: '울산시', label: '울산시' },
    { value: '세종시', label: '세종시' },
    { value: '경기도', label: '경기도' },
  ];

  // 구/군 (서울시 기준 예시)
  const districts = [
    { value: '', label: '전체' },
    { value: '강남구', label: '강남구' },
    { value: '강동구', label: '강동구' },
    { value: '강북구', label: '강북구' },
    { value: '강서구', label: '강서구' },
    { value: '관악구', label: '관악구' },
    { value: '광진구', label: '광진구' },
    { value: '구로구', label: '구로구' },
    { value: '금천구', label: '금천구' },
    { value: '노원구', label: '노원구' },
    { value: '도봉구', label: '도봉구' },
    { value: '동대문구', label: '동대문구' },
    { value: '동작구', label: '동작구' },
    { value: '마포구', label: '마포구' },
    { value: '서대문구', label: '서대문구' },
    { value: '서초구', label: '서초구' },
    { value: '성동구', label: '성동구' },
    { value: '성북구', label: '성북구' },
    { value: '송파구', label: '송파구' },
    { value: '양천구', label: '양천구' },
    { value: '영등포구', label: '영등포구' },
    { value: '용산구', label: '용산구' },
    { value: '은평구', label: '은평구' },
    { value: '종로구', label: '종로구' },
    { value: '중구', label: '중구' },
    { value: '중랑구', label: '중랑구' },
  ];

  // 동
  const neighborhoods = [
    { value: '', label: '전체' },
    { value: '개포동', label: '개포동' },
    { value: '논현동', label: '논현동' },
    { value: '대치동', label: '대치동' },
    { value: '도곡동', label: '도곡동' },
    { value: '삼성동', label: '삼성동' },
    { value: '세곡동', label: '세곡동' },
    { value: '수서동', label: '수서동' },
    { value: '신사동', label: '신사동' },
    { value: '압구정동', label: '압구정동' },
    { value: '역삼동', label: '역삼동' },
    { value: '율현동', label: '율현동' },
    { value: '일원동', label: '일원동' },
    { value: '자곡동', label: '자곡동' },
    { value: '청담동', label: '청담동' },
  ];

  // 고객 유형
  const customerTypes = [
    { value: 1, label: '소유주' },
    { value: 2, label: '구매자' },
    { value: 3, label: '임차인' },
  ];

  // 최상단 물건유형 필터 — 물건관리(PropertiesPage) 상단과 동일한 순서/명칭
  // codes: 고객 want_type(SYCA) 매핑 (해당 그룹에 포함되는 물건유형)
  const PROPERTY_TYPE_FILTERS = [
    { label: '모든유형', value: '', codes: [] },
    { label: '아파트', value: 'PT_TYPE_01', codes: ['SYCA101', 'SYCA103'] },
    { label: '오피스텔', value: 'PT_TYPE_03', codes: ['SYCA102'] },
    { label: '아파트분양권', value: 'PT_TYPE_02', codes: ['SYCA105', 'SYCA107'] },
    { label: '재건축 | 분양권', value: 'PT_TYPE_16', codes: ['SYCA104'] },
    { label: '재개발 | 분양권', value: 'PT_TYPE_05', codes: ['SYCA120'] },
    { label: '오피스텔분양권', value: 'PT_TYPE_04', codes: ['SYCA106'] },
    { label: '원투룸', value: 'PT_TYPE_06', codes: ['SYCA117'] },
    { label: '빌라 | 연립', value: 'PT_TYPE_09', codes: ['SYCA118'] },
    { label: '단독 | 다가구', value: 'PT_TYPE_07', codes: ['SYCA119'] },
    { label: '상가 | 사무실', value: 'PT_TYPE_10', codes: ['SYCA109', 'SYCA113', 'SYCA114'] },
    { label: '지식산업센터', value: 'PT_TYPE_14', codes: ['SYCA116'] },
    { label: '건물 | 빌딩', value: 'PT_TYPE_12', codes: ['SYCA108'] },
    { label: '숙박 | 펜션', value: 'PT_TYPE_13', codes: ['SYCA110'] },
    { label: '공장 | 창고', value: 'PT_TYPE_11', codes: ['SYCA111'] },
    { label: '토지', value: 'PT_TYPE_15', codes: ['SYCA115'] },
  ];

  // 거래유형 버튼(복수) — 모든거래/매매/전세/월세/기타임대
  const CUST_TRADE_TYPES = [
    { value: 'TRDTYP01', label: '매매' },
    { value: 'TRDTYP02', label: '전세' },
    { value: 'TRDTYP03', label: '월세' },
    { value: 'TRDTYP04', label: '기타임대' },
  ];

  // 페이지 로드 / 필터 변경 시 고객 목록 조회
  useEffect(() => {
    fetchCustomers();
  }, [currentPage, selectedWantType, activeCustTab, selectedTrdTypes, rowCount, sortBy, sortDir, searchKeyword]);

  // 정렬 토글 (헤더 클릭 등에서 호출 가능) — 같은 컬럼 재클릭 시 방향 토글
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortDir('ASC');
    }
    setCurrentPage(1);
  };

  // 최상단 물건유형 버튼 선택
  const handleSelectWantType = (code) => {
    setSelectedWantType(code);
    setCurrentPage(1);
  };

  // 거래유형 토글(복수)
  const toggleTrdType = (code) => {
    setCurrentPage(1);
    if (code === '') { setSelectedTrdTypes([]); return; }
    setSelectedTrdTypes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };

  // 모달 이벤트 리스너
  useEffect(() => {
    if (!window.electronAPI?.modal) return;

    // 모달에서 성공 이벤트 수신 시 목록 새로고침
    const cleanupSuccess = window.electronAPI.modal.on('success', ({ modalId, type, data }) => {
      // 고객 등록/수정(customer) + 공동중개망 전송(hub-form) 성공 시 목록 갱신(전송됨 표시 반영)
      if (type === 'customer' || type === 'hub-form') {
        console.log('Customer/hub modal success:', data);
        fetchCustomers();
      }
    });

    // 고객 등록/수정 창이 닫히면 열린 창 ID 초기화 + 목록 갱신
    const cleanupClosed = window.electronAPI.modal.on('closed', ({ modalId }) => {
      setOpenCustomerModalId((currentId) => {
        if (modalId === currentId) { fetchCustomers(); return null; }
        return currentId;
      });
    });

    return () => { cleanupSuccess && cleanupSuccess(); cleanupClosed && cleanupClosed(); };
  }, []);

  // 고객 목록 조회
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await customerService.getList(
        null, // custNo
        null, // name
        null, // alias
        null, // tel
        null, // offNo
        null, // vendorId
        currentPage,
        pageSize,
        (selectedWantType && selectedWantType !== '__ph') ? selectedWantType : null, // 구입물건유형 카테고리(주거용/업무용/토지). __ph(헤더)·''=전체
        selectedTrdTypes.length ? selectedTrdTypes.join(',') : null, // 거래유형
        activeCustTab || null,    // 고객상태(trdPrg: TRDPRG01~04), '' = 전체
        sortBy || null,           // 정렬 컬럼
        sortDir || null,          // 정렬 방향
        searchKeyword || null     // 통합검색(이름/상호/연락처/주소)
      );

      if (response.success && response.data) {
        setCustomers(response.data.customers || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('고객 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 검색 필터 변경
  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  // 검색 실행(통합검색 확정) — searchKeyword 변경 → useEffect가 재조회
  const handleSearch = () => {
    setCurrentPage(1);
    setSearchKeyword(searchText.trim());
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchFilters({
      tradeType: '',
      address1: '',
      address2: '',
      address3: '',
      propertyType: '',
    });
    setSelectedWantType('');
    setSearchText('');
    setSearchKeyword('');
    setCurrentPage(1);
  };

  // 고객 유형 라벨 가져오기
  const getCustomerTypeLabel = (type) => {
    return customerTypes.find(t => t.value === type)?.label || '-';
  };

  // 날짜 포맷팅 — YY.MM.DD (칸 절약)
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const [y, m, d] = dateString.split('T')[0].split('-');
    if (!y || !m || !d) return dateString;
    return `${y.slice(2)}.${m}.${d}`;
  };

  // 고객 등록 - 새 창(한번에 하나만, 기존 창은 닫고 새로 열기)
  const handleAddCustomer = async () => {
    if (window.electronAPI?.modal) {
      try {
        if (openCustomerModalId) {
          try { await window.electronAPI.modal.close(openCustomerModalId); setOpenCustomerModalId(null); } catch (e) { /* 이미 닫혔을 수 있음 */ }
        }
        const modalId = await window.electronAPI.modal.open({
          type: 'customer',
          data: { title: '고객 등록', editData: null },
          width: 1200, height: 900, minHeight: 800, resizable: false,
        });
        setOpenCustomerModalId(modalId);
      } catch (error) {
        console.error('고객 등록 창 열기 실패:', error);
        setEditData(null); setShowModal(true);
      }
    } else {
      setEditData(null); setShowModal(true);
    }
  };

  // 수정 - 새 창(한번에 하나만, 기존 창이 있으면 데이터만 교체)
  const handleEdit = async (customer) => {
    if (window.electronAPI?.modal) {
      try {
        // 이미 열린 고객 창이 있으면 데이터만 업데이트 후 포커스
        if (openCustomerModalId && window.electronAPI.modal.updateData) {
          try {
            await window.electronAPI.modal.updateData(openCustomerModalId, {
              title: `고객 수정 - ${customer.name || '고객정보'}`,
              editData: customer,
            });
            if (window.electronAPI.modal.focus) { await window.electronAPI.modal.focus(openCustomerModalId); }
            return;
          } catch (e) {
            try { await window.electronAPI.modal.close(openCustomerModalId); } catch (ce) { /* skip */ }
            setOpenCustomerModalId(null);
          }
        }
        const modalId = await window.electronAPI.modal.open({
          type: 'customer',
          data: { title: `고객 수정 - ${customer.name || '고객정보'}`, editData: customer },
          width: 1200, height: 900, minHeight: 800, resizable: false,
        });
        setOpenCustomerModalId(modalId);
      } catch (error) {
        console.error('고객 수정 창 열기 실패:', error);
        setEditData(customer); setShowModal(true);
      }
    } else {
      setEditData(customer); setShowModal(true);
    }
  };

  // 우클릭 '복사등록' — 상세를 불러와 신규 등록창에 복사 프리필(copyData)
  const handleCopyCustomer = async (customer) => {
    if (!customer?.custNo) return;
    if (!window.electronAPI?.modal?.open) { toast.error('Electron 환경에서만 복사 등록이 가능합니다.'); return; }
    try {
      const res = await customerService.getDetail(customer.custNo);
      const d = res?.data || customer;
      const copy = { ...d, custNo: '', regDt: '', regId: '', updDt: '', updId: '' };
      await window.electronAPI.modal.open({
        type: 'customer',
        data: { title: '고객 등록 (복사)', copyData: copy },
        width: 1200, height: 900, minHeight: 800, resizable: false,
      });
    } catch (e) { console.error('복사 등록 실패:', e); toast.error('복사 등록 창을 여는 데 실패했습니다.'); }
  };

  // 삭제 버튼 클릭
  const handleDelete = async (custNo) => {
    if (!window.confirm('이 고객을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await customerService.delete(custNo, user?.userId);
      toast.success('고객이 삭제되었습니다.');
      fetchCustomers();
    } catch (error) {
      console.error('고객 삭제 실패:', error);
    }
  };

  // 모달 성공 콜백
  const handleModalSuccess = () => {
    fetchCustomers();
  };

  // 색 채우기 (선택 행)
  const handleColorFill = (color) => {
    if (selectedCustNos.length === 0) { toast.error('색을 채울 고객을 선택해주세요.'); return; }
    setColorFillRequest({ seq: Date.now(), ids: [...selectedCustNos], color });
  };

  // 선택 수정 (마지막 체크 고객)
  const handleEditSelected = () => {
    if (selectedCustNos.length === 0) { toast.error('수정할 고객을 선택해주세요.'); return; }
    const last = selectedCustNos[selectedCustNos.length - 1];
    const cust = customers.find((c) => c.custNo === last);
    if (cust) handleEdit(cust); else toast.error('선택한 고객 정보를 찾을 수 없습니다.');
  };

  // 선택 삭제
  const handleDeleteSelected = async () => {
    if (selectedCustNos.length === 0) { toast.error('삭제할 고객을 선택해주세요.'); return; }
    if (!window.confirm(`선택한 ${selectedCustNos.length}명의 고객을 삭제하시겠습니까?`)) return;
    try {
      for (const no of selectedCustNos) { await customerService.delete(no, user?.userId); }
      toast.success('삭제되었습니다.');
      setSelectedCustNos([]);
      fetchCustomers();
    } catch (e) { toast.error('고객 삭제에 실패했습니다.'); }
  };

  // 엑셀 붙여넣기 업로드 — 고객 대상(그리드형). 물건관리와 동일 컴포넌트, target으로 구분
  const handleExcelUpload = async () => {
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'data-upload',
          data: { title: '고객 엑셀 업로드', target: 'customer' },
          width: 1200,
          height: 760,
        });
      } catch (error) {
        console.error('Failed to open data upload modal:', error);
        toast.error('엑셀 업로드 창을 열 수 없습니다.');
      }
    } else {
      toast.error('Electron 환경에서만 사용 가능합니다.');
    }
  };

  // 보고서 보기/작성 — 새 창(페이지)으로 열기
  const openCustomerReport = async (customer) => {
    const cust = { custNo: customer.custNo, name: customer.name };
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({ type: 'report-builder', data: { title: '보고서', customer: cust }, width: 1400, height: 950 });
        return;
      } catch (e) { console.error('보고서 창 열기 실패:', e); }
    }
    setReportCustomer(cust);
    setShowReportBuilder(true);
  };

  // 고객 행 클릭 핸들러 — 1회 클릭=체크 토글, 2회 클릭(onRowClick)=수정창
  const handleRowClick = (customer) => {
    handleEdit(customer);
  };
  const handleRowSelect = (customer) => {
    setSelectedCustNos((prev) => (prev.includes(customer.custNo) ? prev.filter((no) => no !== customer.custNo) : [...prev, customer.custNo]));
  };

  // 패널 토글
  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  // 리사이저 마우스 다운
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // 리사이저 마우스 이동
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const container = document.querySelector('.cus-content-wrapper');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      // 최소 300px, 최대 800px
      if (newWidth >= 300 && newWidth <= 800) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 테이블 컬럼 정의 (요청 기본 항목)
  const tableColumns = [
    { key: 'checkbox', label: '선택', width: 44, noRowClick: true },
    { key: 'quick', label: '공동중개망', width: 100, noRowClick: true },
    { key: 'updDt', label: '수정일', width: 90 },
    { key: 'wantType', label: '물건유형', width: 90 },
    { key: 'subType', label: '세부유형', width: 120 },
    { key: 'wishAreas', label: '구입희망지역', width: 160 },
    { key: 'tradeType', label: '거래유형', width: 128 },
    { key: 'areaPyeong', width: 120, label: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        면적
        <button type="button" title="㎡ / 평 전환"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setAreaUnit((u) => (u === '평' ? '㎡' : '평')); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontWeight: 700, padding: '1px 7px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#fff', color: '#374151', cursor: 'pointer', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
          <span style={{ lineHeight: 1 }}>⇄</span>{areaUnit}</button>
      </span>
    ) },
    { key: 'landCategory', label: '지목', width: 90 },
    { key: 'bizType', label: '업종', width: 100 },
    { key: 'moveinYn', label: '입주여부', width: 100 },
    { key: 'moveDate', label: '잔금예정일', width: 150 },
    { key: 'report', label: '보고서 보기', width: 90, noRowClick: true },
    { key: 'featureNote', label: '구입물건특징', width: 180 },
    { key: 'matching', label: '매칭', width: 120 },
    { key: 'name', label: '성함', width: 80 },
    { key: 'tel', label: '전화번호', width: 120 },
  ];

  // 정렬 가능한 컬럼
  const sortableColumns = ['updDt', 'name'];

  // 필터 가능한 컬럼
  const filterableColumns = ['name', 'wantType', 'wishAreas'];

  // ㎡ → 평
  const toPyeong = (v) => (v || v === 0 ? (Number(v) / 3.3058).toFixed(1) : null);

  // 금액 포맷팅 (만원 단위)
  const formatPrice = (value) => {
    if (!value || value === 0) return '-';
    return `${(value / 10000).toFixed(0)}`;
  };

  // 면적 포맷팅
  const formatArea = (value) => {
    if (!value || value === 0) return '-';
    return value.toFixed(2);
  };

  // 거래 구분 라벨
  const getTradeTypeLabel = (code) => {
    const type = tradeTypes.find(t => t.value === code);
    return type ? type.label : '-';
  };

  // 물건 종류 라벨
  const getPropertyTypeLabel = (code) => {
    const type = propertyTypes.find(t => t.value === code);
    return type ? type.label : '-';
  };

  // 정보망 전송 핸들러 — 물건관리처럼 Electron 별도창으로 공동중개망 고객등록창 오픈
  const handleTransfer = async (customer) => {
    const alreadyTransmitted = !!customer.transmitDt;
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'hub-form',
          data: {
            title: alreadyTransmitted ? '공동중개망 고객정보 (전송됨)' : '공동중개망 고객정보 등록',
            tradeDiv: 'CUST',
            customerData: customer,
            custNo: customer.custNo, // 고객번호 전달
            alreadyTransmitted,                 // 전송 이력 있으면 전송버튼 숨김
            transmittedAt: customer.transmitDt || null,
          },
          width: 1120,
          height: 850,
          minWidth: 1120,
          maxWidth: 1120,
          resizable: false,
        });
        return;
      } catch (error) {
        console.error('공동중개망 고객정보 등록 창 열기 실패:', error);
        // fallback to in-app modal
      }
    }
    // Electron API 없으면 기존 방식 사용
    openWithCustomer(customer);
  };

  // 전송일시 포맷: "M월 D일 H시 mm분"
  const formatTransmitAt = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}시 ${String(d.getMinutes()).padStart(2, '0')}분`;
  };

  // 테이블 셀 렌더링
  const renderTableCell = (customer, column, subIndex) => {
    switch (column.key) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={selectedCustNos.includes(customer.custNo)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.checked) setSelectedCustNos([...selectedCustNos, customer.custNo]);
              else setSelectedCustNos(selectedCustNos.filter((no) => no !== customer.custNo));
            }}
            style={{ cursor: 'pointer' }}
          />
        );
      case 'quick': {
        const isTransmitted = !!customer.transmitDt; // 정보망 전송 이력
        // 물건관리 퀵메뉴와 동일 규칙 — 미전송=연회색 통일 / 전송됨=파스텔
        const qbtn = { width: '100%', padding: '1px 4px', fontSize: '12px', lineHeight: 1.2, borderRadius: '5px', whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 700 };
        const pastel = (bg, color, border) => ({ background: bg, color, border: `1px solid ${border}` });
        const off = pastel('#f1f5f9', '#94a3b8', '#e2e8f0');
        return (
          <div className="flex flex-col" style={{ width: '100%', gap: '3px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleTransfer(customer); }}
              style={{ ...qbtn, ...(isTransmitted
                ? pastel('#bfdbfe', '#1e3a8a', '#93c5fd')   // 전송됨 (연한 파랑)
                : off) }}
              title={isTransmitted ? `전송됨 (${formatTransmitAt(customer.transmitDt)})` : '정보망 전송'}
            >정보망전송</button>
          </div>
        );
      }
      case 'regDt':
        return <span className="text-black text-sm">{formatDate(customer.regDt)}</span>;
      case 'updDt':
        return <span className="text-black text-sm">{formatDate(customer.updDt)}</span>;
      case 'moveDate': {
        // 날짜 범위: 둘 다=범위 / 시작만='~부터' / 종료만='~까지'
        const fr = customer.moveDateFr ? formatDate(customer.moveDateFr) : '';
        const to = customer.moveDateTo ? formatDate(customer.moveDateTo) : '';
        if (!fr && !to) return '-';
        const txt = fr && to ? `${fr} ~ ${to}` : fr ? `${fr} 이후` : `${to} 까지`;
        return <span className="text-sm">{txt}</span>;
      }
      case 'featureNote':
        return <span className="text-sm" title={customer.featureNote || ''} style={{ display: 'block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.featureNote || '-'}</span>;
      case 'wantType': {
        // 물건유형 = 카테고리(주거용/업무용→상업용/토지) — 등록폼 wantType 값 그대로
        const c = customer.wantType;
        return c ? (c === '업무용' ? '상업용' : c) : '-';
      }
      case 'subType': {
        // 세부유형 = 등록폼 상세유형(wantSubType, CSV 복수) — 10글자 초과 시 …처리 + 호버 풀표기
        const full = (customer.wantSubType || '').split(',').map((s) => s.trim()).filter(Boolean).join(', ');
        if (!full) return '-';
        const shown = full.length > 10 ? `${full.slice(0, 10)}…` : full;
        return <span className="text-sm" title={full} style={{ display: 'block', whiteSpace: 'nowrap' }}>{shown}</span>;
      }
      case 'wishAreas': {
        const areas = (customer.wishAreas || '').split(',').map((s) => s.trim()).filter(Boolean);
        const display = areas.length === 0 ? '-'
          : areas.length === 1 ? areas[0]
          : `${areas[0]} 외 ${areas.length - 1}곳`;
        return <span className="text-sm" title={customer.wishAreas || ''} style={{ display: 'block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</span>;
      }
      case 'landCategory':
        return <span className="text-sm">{customer.landCategory || '-'}</span>;
      case 'landUse': {
        const lu = LAND_USES.find((u) => u.value === customer.landUse);
        return <span className="text-sm">{lu ? lu.label : (customer.landUse || '-')}</span>;
      }
      case 'buildingUse': {
        const bu = BUILDING_USES.find((u) => u.code === customer.buildingUse);
        return <span className="text-sm">{bu ? bu.label : (customer.buildingUse || '-')}</span>;
      }
      case 'areaPyeong': {
        // 면적 — 헤더 토글(㎡/평)에 따라 환산 표기. 최소만='이상' / 최대만='이하' / 둘 다=범위
        const conv = (v) => (areaUnit === '평' ? toPyeong(v) : (v || v === 0 ? Number(v).toFixed(1) : null));
        const fr = conv(customer.excAreaFr);
        const to = conv(customer.excAreaTo);
        if (!fr && !to) return '-';
        const unit = areaUnit === '평' ? '평' : '㎡';
        const txt = fr && to ? `${fr} ~ ${to} ${unit}` : fr ? `${fr}${unit} 이상` : `${to}${unit} 이하`;
        return <span className="text-sm">{txt}</span>;
      }
      case 'tradeType': {
        // 물건관리처럼 매·전·월·기 가로 표기(해당 유형 강조)
        const on = new Set((customer.trdType || '').split(',').map((s) => s.trim()).filter(Boolean));
        const segs = [['TRDTYP01', '매'], ['TRDTYP02', '전'], ['TRDTYP03', '월'], ['TRDTYP04', '기']];
        return (
          <span style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>
            {segs.map(([code, ch], i) => (
              <span key={code} style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: on.has(code) ? 800 : 500, color: on.has(code) ? '#4f46e5' : '#94a3b8', borderLeft: i ? '1px solid #e5e7eb' : 'none' }}>{on.has(code) ? ch : '-'}</span>
            ))}
          </span>
        );
      }
      case 'moveinYn': {
        const parts = [
          customer.moveinYn === 'Y' ? '실입주' : '',
          customer.gapInvestYn === 'Y' ? '갭투자' : '',
          customer.irrelevantYn === 'Y' ? '무관' : '',
        ].filter(Boolean);
        return parts.length ? parts.join(', ') : '-';
      }
      case 'name':
        return <span className="text-sm font-medium">{customer.name || '-'}</span>;
      case 'tel':
        return <span className="text-sm">{customer.tel || '-'}</span>;
      case 'report':
        return (
          <button
            onClick={(e) => { e.stopPropagation(); openCustomerReport(customer); }}
            style={{ padding: '2px 8px', fontSize: '11px', border: 'none', fontWeight: 600, color: customer.reportCount > 0 ? 'white' : '#334155', background: customer.reportCount > 0 ? '#15803d' : '#dcfce7', borderRadius: '3px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >{customer.reportCount || 0}건</button>
        );
      case 'matching':
        return <span className="text-xs text-black">자사 {customer.ownMatchCnt ?? 0} / 공동 {customer.coMatchCnt ?? 0}</span>;
      default:
        return customer[column.key] || '-';
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // 테이블 데이터 준비 (고유 id 추가)
  const tableData = customers.map((customer) => ({
    ...customer,
    id: customer.custNo,
  }));

  return (
    <div className="cus-page-container" style={{ zoom: zoomNum / 100 }}>
      {/* 메인 컨텐츠 */}
      <div className="cus-main-content">
        <div className="cus-content-wrapper">
          <div className="cus-table-section">

            {/* (구) 검색 필터 - 숨김 */}
            {false && (
            <Card className="cus-filter-card">
          <div className="cus-filter-container">
            <div className="cus-filter-header">
              <h3 className="cus-filter-title">검색 조건</h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="cus-filter-toggle"
              >
                <Filter className="cus-filter-icon" />
                {showFilters ? '접기' : '펼치기'}
              </button>
            </div>

            {showFilters && (
              <div className="cus-filter-body">
                <div className="cus-filter-row">
                  {/* 거래구분 */}
                  <div className="cus-filter-item">
                    <label className="cus-filter-label">거래구분</label>
                    <select
                      value={searchFilters.tradeType}
                      onChange={(e) => handleFilterChange('tradeType', e.target.value)}
                      className="cus-filter-select"
                    >
                      {tradeTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 주소 - 시/도 */}
                  <div className="cus-filter-item">
                    <label className="cus-filter-label">시/도</label>
                    <select
                      value={searchFilters.address1}
                      onChange={(e) => handleFilterChange('address1', e.target.value)}
                      className="cus-filter-select"
                    >
                      {cities.map((city) => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 주소 - 구/군 */}
                  <div className="cus-filter-item">
                    <label className="cus-filter-label">구/군</label>
                    <select
                      value={searchFilters.address2}
                      onChange={(e) => handleFilterChange('address2', e.target.value)}
                      className="cus-filter-select"
                    >
                      {districts.map((district) => (
                        <option key={district.value} value={district.value}>
                          {district.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 주소 - 동 */}
                  <div className="cus-filter-item">
                    <label className="cus-filter-label">동</label>
                    <select
                      value={searchFilters.address3}
                      onChange={(e) => handleFilterChange('address3', e.target.value)}
                      className="cus-filter-select"
                    >
                      {neighborhoods.map((neighborhood) => (
                        <option key={neighborhood.value} value={neighborhood.value}>
                          {neighborhood.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 물건종류 */}
                  <div className="cus-filter-item">
                    <label className="cus-filter-label">물건종류</label>
                    <select
                      value={searchFilters.propertyType}
                      onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                      className="cus-filter-select"
                    >
                      {propertyTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 버튼들 */}
                  <div className="cus-filter-buttons">
                    <button
                      onClick={handleResetFilters}
                      className="cus-btn cus-btn-secondary"
                    >
                      초기화
                    </button>
                    <button
                      onClick={handleSearch}
                      className="cus-btn cus-btn-search"
                    >
                      <Search className="cus-search-icon" />
                      검색
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
            )}

            {/* 고객 목록 - 물건관리와 동일 형태(PropertyListTable): 우상단 액션 + 헤더/폰트 통일 */}
            <Card className="cus-table-card" padding="none">
              <PropertyListTable
                menuId="customers"
                inlineSub
                stackToolbar
                allColumns={tableColumns}
                defaultColumns={tableColumns.filter((c) => !['name', 'tel'].includes(c.key))}
                data={tableData}
                isLoading={isLoading}
                renderCell={renderTableCell}
                onRowClick={handleRowClick}
                onRowSelect={handleRowSelect}
                onRowEdit={handleEdit}
                onRowCopy={handleCopyCustomer}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                colorFillRequest={colorFillRequest}
                emptyMessage="검색 결과가 없습니다"
                selectedCount={selectedCustNos.length}
                onColorFill={handleColorFill}
                onAddPropertyV2={handleAddCustomer}
                onEditSelected={handleEditSelected}
                onDeleteSelected={handleDeleteSelected}
                searchSlot={
                  /* 통합검색 — 배율 액션줄의 완전한 좌측 끝 */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                      placeholder="이름/상호/연락처/주소 검색"
                      style={{ padding: '6px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', color: '#000', width: '240px' }}
                    />
                    <button onClick={handleSearch}
                      style={{ padding: '6px 16px', fontSize: '14px', border: '1px solid #4f46e5', borderRadius: '4px', backgroundColor: '#4f46e5', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      검색
                    </button>
                    {searchKeyword && (
                      <button onClick={() => { setSearchText(''); setSearchKeyword(''); setCurrentPage(1); }}
                        title="검색 해제"
                        style={{ padding: '6px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', color: '#000', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        ✕
                      </button>
                    )}
                  </div>
                }
                rightLeadContent={
                  <div className="flat-topbar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* 배율 (화면 확대) */}
                    <span style={{ fontSize: '14px', color: '#000', fontWeight: '600', whiteSpace: 'nowrap' }}>배율</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button onClick={zoomOut} title="축소(-5%)"
                        style={{ padding: '3px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px 0 0 4px', background: 'white', color: '#000', cursor: 'pointer' }}>−</button>
                      <input
                        type="number" value={zoom}
                        onChange={(e) => setZoom(e.target.value)}
                        onBlur={(e) => { const v = parseFloat(e.target.value); setZoom(v ? Math.min(400, Math.max(30, v)) : 100); }}
                        style={{ width: '52px', padding: '3px 4px', fontSize: '14px', textAlign: 'center', border: '1px solid #e5e7eb', borderLeft: 'none', borderRight: 'none', color: '#000' }}
                      />
                      <span style={{ fontSize: '14px', color: '#000', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '3px 4px' }}>%</span>
                      <button onClick={zoomIn} title="확대(+5%)"
                        style={{ padding: '3px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '0 4px 4px 0', background: 'white', color: '#000', cursor: 'pointer' }}>+</button>
                    </div>
                    <span style={{ fontSize: '14px', color: '#000', fontWeight: '600', whiteSpace: 'nowrap' }}>줄수</span>
                    <select value={rowCount} onChange={(e) => { setRowCount(e.target.value); setCurrentPage(1); }}
                      style={{ padding: '4px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000' }}>
                      <option value="all">전부</option>
                      <option value="20">20줄</option>
                      <option value="30">30줄</option>
                    </select>
                    <button
                      onClick={() => setShowTableSettings(true)}
                      style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000', whiteSpace: 'nowrap' }}
                    >
                      헤드라인 설정
                    </button>
                    <button
                      onClick={handleExcelUpload}
                      style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      엑셀 업로드
                    </button>
                  </div>
                }
                leftContent={
                  <div className="flat-topbar" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                    {/* 구입물건유형 카테고리 드롭다운 */}
                    <select value={selectedWantType} onChange={(e) => { setSelectedWantType(e.target.value); setCurrentPage(1); }}
                      style={{ height: '32px', lineHeight: '30px', padding: '0 10px', boxSizing: 'border-box', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', color: '#000', cursor: 'pointer' }}>
                      <option value="__ph" disabled>물건유형</option>
                      <option value="">모든유형</option>
                      <option value="주거용">주거용</option>
                      <option value="업무용">상업용</option>
                      <option value="토지">토지</option>
                    </select>
                    {/* 고객 상태 드롭다운 */}
                    <select value={activeCustTab} onChange={(e) => { setActiveCustTab(e.target.value); setCurrentPage(1); }}
                      style={{ height: '32px', lineHeight: '30px', padding: '0 10px', boxSizing: 'border-box', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', color: '#000', cursor: 'pointer' }}>
                      <option value="">전체고객</option>
                      <option value="TRDPRG01">진행고객</option>
                      <option value="TRDPRG02">계약</option>
                      <option value="TRDPRG03">타계</option>
                      <option value="TRDPRG04">보류</option>
                    </select>
                    {/* 거래유형(복수) */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
                      <button onClick={() => toggleTrdType('')}
                        style={{ padding: '5px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: selectedTrdTypes.length === 0 ? '#4f46e5' : 'white', color: selectedTrdTypes.length === 0 ? 'white' : '#000', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        전체
                      </button>
                      {CUST_TRADE_TYPES.map((t) => (
                        <button key={t.value} onClick={() => toggleTrdType(t.value)}
                          style={{ padding: '5px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: selectedTrdTypes.includes(t.value) ? '#4f46e5' : 'white', color: selectedTrdTypes.includes(t.value) ? 'white' : '#000', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                }
                leftAfterCount={
                  /* 상단바 대체: 고객센터·카톡문의·홈으로·상담모드 — 거래유형 줄 우측 끝(건수는 기타임대 우측) */
                  <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}><MenuTopActions consult /></div>
                }
              />
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        /* 데이터 셀 폰트 14px — 공유 PropertyListTable의 11px !important 규칙을 상위 선택자로 덮어씀 */
        .cus-table-card .prop-list-grid td,
        .cus-table-card .prop-list-grid td div,
        .cus-table-card .prop-list-grid td span {
          font-size: 14px !important;
        }
        /* 헤더 높이 = 총 50px 고정. 1줄 헤더=50px, 2줄(subHeader) 헤더=각 25px(총 50px) → 100px 방지 */
        .cus-table-card .prop-list-grid thead tr:only-child th { height: 50px !important; max-height: 50px !important; }
        .cus-table-card .prop-list-grid thead tr:not(:only-child) { height: 25px !important; }
        .cus-table-card .prop-list-grid thead tr:not(:only-child) th { height: 25px !important; max-height: 25px !important; }
        /* 고객 목록: 행 높이 축소 + 레코드마다 얇은 두줄 구분선 (물건목록과 통일) */
        .cus-table-card td,
        .cus-table-card .prop-list-grid td {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
          line-height: 1.25 !important;
          text-align: center !important;
          vertical-align: middle !important;
        }
        /* 공동중개망(정보망전송) 칼럼: 셀 좌우 패딩 축소 → 버튼 글자가 칼럼 안에 들어오도록 */
        .cus-table-card .prop-list-grid td[data-col="quick"] {
          padding-left: 3px !important;
          padding-right: 3px !important;
        }
        /* 셀 내부 요소도 가운데 정렬 (block/span 포함) */
        .cus-table-card td > * {
          text-align: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
          justify-content: center !important;
        }
        .cus-table-card td[rowspan="2"] { border-bottom: 1px solid #94a3b8 !important; }
        .cus-table-card tbody tr:nth-of-type(2n) td { border-bottom: 1px solid #94a3b8 !important; }

        .cus-page-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9fafb;
        }

        .cus-page-header {
          padding: 1.5rem;
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .cus-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .cus-page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .cus-page-description {
          color: #4b5563;
        }

        .cus-header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .cus-btn {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .cus-btn-icon {
          width: 1rem;
          height: 1rem;
          margin-right: 0.5rem;
        }

        .cus-btn-outline {
          color: #000;
          background-color: white;
          border: 1px solid #d1d5db;
        }

        .cus-btn-outline:hover {
          background-color: #f9fafb;
        }

        .cus-btn-primary {
          color: white;
          background-color: #6366f1;
        }

        .cus-btn-primary:hover {
          background-color: #4f46e5;
        }

        .cus-btn-secondary {
          color: #000;
          background-color: white;
          border: 1px solid #d1d5db;
        }

        .cus-btn-secondary:hover {
          background-color: #f9fafb;
        }

        .cus-btn-search {
          color: white;
          background-color: #6366f1;
        }

        .cus-btn-search:hover {
          background-color: #4f46e5;
        }

        .cus-search-icon {
          width: 1rem;
          height: 1rem;
          display: inline;
          margin-right: 0.25rem;
        }

        .cus-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
        }

        .cus-content-wrapper {
          display: flex;
          gap: 1rem;
          flex: 1;
          overflow: hidden;
        }

        .cus-table-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        .cus-panel-wrapper {
          position: relative;
          display: flex;
          flex-shrink: 0;
          transition: width 0.3s ease;
        }

        .cus-panel-resizer {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          background-color: transparent;
          z-index: 15;
          transition: background-color 0.2s;
        }

        .cus-panel-resizer:hover {
          background-color: #6366f1;
        }

        .cus-panel-resizer:active {
          background-color: #4f46e5;
        }

        .cus-panel-toggle {
          position: absolute;
          left: 4px;
          top: 0;
          bottom: 0;
          width: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem 0 0 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        }

        .cus-panel-closed .cus-panel-toggle {
          left: 0;
        }

        .cus-panel-toggle:hover {
          background-color: #f9fafb;
        }

        .cus-panel-label {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-size: 0.875rem;
          font-weight: 500;
          color: #000;
          margin-top: 0.5rem;
        }

        .cus-panel-content {
          flex: 1;
          margin-left: 40px;
          overflow-y: auto;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-left: none;
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .cus-type-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 8px;
          margin-bottom: 0.5rem;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }

        .cus-type-btn {
          padding: 5px 12px;
          font-size: 13px;
          font-weight: 500;
          color: #000;
          background-color: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .cus-type-btn:hover {
          background-color: #f3f4f6;
        }

        .cus-type-btn.active {
          color: white;
          background-color: #6366f1;
          border-color: #6366f1;
        }

        .cus-filter-card {
          margin-bottom: 0.5rem;
        }

        .cus-filter-container {
          padding: 1rem;
        }

        .cus-filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .cus-filter-title {
          font-weight: 500;
          color: #111827;
        }

        .cus-filter-toggle {
          display: flex;
          align-items: center;
          font-size: 0.875rem;
          color: #4b5563;
          background: none;
          border: none;
          cursor: pointer;
        }

        .cus-filter-toggle:hover {
          color: #111827;
        }

        .cus-filter-icon {
          width: 1rem;
          height: 1rem;
          margin-right: 0.25rem;
        }

        .cus-filter-body {
          padding-top: 0.5rem;
        }

        .cus-filter-row {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .cus-filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 140px;
        }

        .cus-filter-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #000;
        }

        .cus-filter-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          outline: none;
          background-color: white;
          cursor: pointer;
        }

        .cus-filter-select:focus {
          outline: 2px solid #6366f1;
          outline-offset: 0;
          border-color: #6366f1;
        }

        .cus-filter-buttons {
          display: flex;
          gap: 0.5rem;
          margin-left: auto;
        }

        .cus-table-card {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
      `}</style>

      {/* 고객 등록/수정 폼 V2 (풀페이지, 한번에 하나만) */}
      {showModal && (
        <CustomerFormPageV2
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
          editData={editData}
        />
      )}

      {/* 헤드라인(컬럼) 설정 */}
      <TableSettings
        isOpen={showTableSettings}
        onClose={() => setShowTableSettings(false)}
        menuId="customers"
        allColumns={tableColumns}
        columns={tableColumns}
        setColumns={() => {}}
        onSave={() => { setShowTableSettings(false); }}
      />

      {/* 보고서 보기/작성 (고객 선택) */}
      {showReportBuilder && (
        <ReportBuilderModal
          isOpen={showReportBuilder}
          onClose={() => { setShowReportBuilder(false); setReportCustomer(null); }}
          customer={reportCustomer}
          onSaved={() => fetchCustomers()}
        />
      )}
    </div>
  );
};

export default CustomersPage;

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Building2, FileText, Plus, Filter, X, ChevronLeft, ChevronRight, Trash2, Upload } from 'lucide-react';
import Card from '../../components/ui/Card';
import CustomerTable from '../../components/ui/CustomerTable';
import PropertyListTable from '../../components/properties/PropertyListTable';
import MenuTopActions from '../../components/layout/MenuTopActions';
import TableSettings from '../../components/ui/TableSettings';
import PriceRangeFilter, { priceUnitToMan } from '../../components/ui/PriceRangeFilter';
import { propertyService } from '../../services/propertyService';
import { useAuthStore } from '../../stores/authStore';
import { useHubModalStore } from '../../stores/hubModalStore';
import { toast } from 'react-hot-toast';
import ConsultationHistoryPanel from '../../components/consultation/ConsultationHistoryPanel';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PropertyModal from '../../components/properties/PropertyModal';
import PropertyViewModal from '../../components/properties/PropertyViewModal';
import PropertyBriefingModal from '../../components/properties/PropertyBriefingModal';
import ReportBuilderModal from '../../components/reports/ReportBuilderModal';
import ReportManageModal from '../../components/reports/ReportManageModal';
import LayoutViewPopup from '../../components/properties/LayoutViewPopup';
import LayoutView from '../../components/properties/LayoutView';
import { getPropertyTypeLabel, PROPERTY_TYPE_FILTER_BUTTONS, PROPERTY_TYPE_OPTIONS } from '../../constants/propertyTypes';
import { loadOrderedButtons, saveButtonOrder, moveItem } from '../../utils/buttonOrder';

// 유형 필터 버튼 기본 목록(유형만 — '모든유형' 제거) — 드래그 재정렬 대상
const BASE_TYPE_BUTTONS = [...PROPERTY_TYPE_FILTER_BUTTONS];
// 진입 시 기본 선택 유형(첫 유형 = 아파트)
const DEFAULT_PT_TYPE = PROPERTY_TYPE_FILTER_BUTTONS[0]?.value || '';
// 등록폼 물건유형 드롭다운에 실제 존재하는 코드 집합(상가|사무실은 대표코드 SYCA113만 노출)
const PT_OPTION_CODES = new Set(PROPERTY_TYPE_OPTIONS.map((o) => o.code));
// 상단 유형필터값(복수코드 가능) → 등록폼이 바인딩할 수 있는 코드로 정규화
//  · 필터값은 'SYCA109,SYCA113,SYCA114'처럼 복수일 수 있고, 첫 코드가 드롭다운에 없을 수 있음(상가|사무실=109)
//  · 드롭다운 옵션에 존재하는 첫 코드를 선택, 없으면 첫 코드 폴백
const normalizeDefaultPtType = (filterValue) => {
  const codes = String(filterValue || '').split(',').map((c) => c.trim()).filter(Boolean);
  if (codes.length === 0) return null;
  return codes.find((c) => PT_OPTION_CODES.has(c)) || codes[0];
};
const PROP_TYPE_ORDER_KEY = 'property_type_btn_order';
import { getPropertyAddressTwoLines, formatKoreanAmount } from '../../utils/propertyUtils';
import { BUILDING_USES } from '../../constants/buildingUses';
import { TRADE_DIVISIONS, saleDivToStatusMap, divStatusCh, saleDivLabel, NONE_CH } from '../../constants/tradeDivisions';
import addressService from '../../services/common/addressService';
import InquiryModal from '../../components/support/InquiryModal';
import { inquiryService } from '../../services/inquiryService';
import { bulkRequestService } from '../../services/bulkRequestService';

const PropertiesPage = () => {
  const { user, office } = useAuthStore();
  const { openWithProperty } = useHubModalStore();

  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = '네오시스 - 물건관리';
  }, []);
  const [activeTab, setActiveTab] = useState('all'); // 'all' 또는 'progress'
  const [viewMode, setViewMode] = useState('sheet'); // 'sheet' 또는 'layout'
  const [areaUnit, setAreaUnit] = useState('㎡'); // 면적 컬럼 단위(㎡/평) 토글
  const [headerSort, setHeaderSort] = useState({ col: null, dir: null }); // 헤더 클릭 정렬(매물유형/등록일)
  // 물건명/동/호 컬럼 필터 — 헤더 하단 필터칸(부분일치 텍스트) + 깔때기 드롭다운(목록 다중선택)
  const [colFilter, setColFilter] = useState({ name: '', dong: '', ho: '' }); // 직접입력(텍스트)
  const [colPick, setColPick] = useState({ name: [], dong: [], ho: [] });     // 목록 다중선택(적용값)
  const [colMenu, setColMenu] = useState(null);   // { key, x, y } 드롭다운 위치
  const [colDraft, setColDraft] = useState([]);   // 드롭다운 임시 선택
  // 면적 필터 (유형별: 토지=대지면적 / 그외=전용면적) — 값은 선택 단위(평/㎡) 기준
  const [areaFilter, setAreaFilter] = useState({ min: '', max: '', unit: '평' });
  const [areaMenu, setAreaMenu] = useState(null); // { x, y }
  // 거래금액 필터 — 값은 선택 단위(억/만원) 기준, 비교는 만원으로 환산
  const [amountFilter, setAmountFilter] = useState({ min: '', max: '', unit: '억원', monMin: '', monMax: '', monUnit: '만원' });
  const amtActive = amountFilter.min !== '' || amountFilter.max !== '' || (amountFilter.monMin ?? '') !== '' || (amountFilter.monMax ?? '') !== '';
  const [amountMenu, setAmountMenu] = useState(null); // { x, y }
  const [sortOrder, setSortOrder] = useState('recent_reg'); // 'recent_reg', 'first_reg', 'modified'
  const [rowCount, setRowCount] = useState('100'); // '50', '100', 'all' — 기본 100
  const [zoom, setZoom] = useState(100); // 화면 배율(%) — 기본 100, 직접입력 자유(±5 버튼)
  const zoomNum = (parseFloat(zoom) || 100);
  const zoomIn = () => setZoom(Math.min(400, zoomNum + 5));
  const zoomOut = () => setZoom(Math.max(30, zoomNum - 5));
  const [floorFilter, setFloorFilter] = useState('all'); // 'all', 'top', 'first'
  const [dongSearch, setDongSearch] = useState(''); // 검색섹션 동 입력
  const [showLayoutPopup, setShowLayoutPopup] = useState(false); // 배치도 팝업
  const [selectedRegions, setSelectedRegions] = useState([]); // 선택된 지역 목록 (검색에 사용)
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [eupMyeonDongList, setEupMyeonDongList] = useState([]);
  const [riList, setRiList] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    sido: '',
    sigungu: '',
    eupMyeonDong: '',
    ri: '',
    prgSts: '',
    saleDiv: '',
    priceMin: '',
    priceMax: '',
    areaMin: '',
    areaMax: '',
    memo: '',
    buildingName: '',
    ptType: DEFAULT_PT_TYPE, // 물건 종류(기본: 아파트)
  });
  const [showSummaryList, setShowSummaryList] = useState(false);
  const [summarySearch, setSummarySearch] = useState(''); // 물건리스트(아파트리스트) 텍스트 검색
  const [properties, setProperties] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [typeCounts, setTypeCounts] = useState([]); // 물건유형별 건수(좌측 '모든유형' 표기)
  const [progressCount, setProgressCount] = useState(0);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [panelType, setPanelType] = useState(null); // 좌측 패널에서 펼쳐본 유형(상단 필터와 무관, 배치도/시트 로우만 노출)
  // 유형 필터 버튼(모든유형/아파트/…) — 드래그 재정렬 + localStorage 자동저장
  const [typeButtons, setTypeButtons] = useState(() => loadOrderedButtons(BASE_TYPE_BUTTONS, PROP_TYPE_ORDER_KEY));
  const typeDragIdx = useRef(null);
  // 물건유형 line 우측 여백 부족 여부(부족하면 우상단 액션을 '일괄변경' line으로 이동)
  const typeBtnsRef = useRef(null);
  const [btnsWrapped, setBtnsWrapped] = useState(false);
  // 물건유형 버튼 줄이 넘치거나 우측 여백이 액션 폭보다 작으면 wrapped=true
  useEffect(() => {
    const el = typeBtnsRef.current;
    if (!el) return;
    const ACTIONS_W = 300; // 카톡문의+홈으로+상담모드 대략 폭
    const measure = () => {
      const first = el.firstElementChild;
      const last = el.lastElementChild;
      if (!first || !last) return;
      const elRect = el.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const multiline = (lastRect.top - firstRect.top) > 4;
      const freeW = elRect.right - lastRect.right;
      setBtnsWrapped(multiline || freeW < ACTIONS_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [typeButtons, viewMode]);
  const handleTypeDrop = (toIdx) => {
    const next = moveItem(typeButtons, typeDragIdx.current, toIdx);
    setTypeButtons(next);
    saveButtonOrder(next, PROP_TYPE_ORDER_KEY);
    typeDragIdx.current = null;
  };
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editPropertyData, setEditPropertyData] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [viewProperty, setViewProperty] = useState(null);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [briefingProperty, setBriefingProperty] = useState(null);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [reportProperty, setReportProperty] = useState(null);
  const [reportProperties, setReportProperties] = useState(null);
  const [reportEditNo, setReportEditNo] = useState(null); // 기존 보고서 수정 시 report_no
  const [showReportManage, setShowReportManage] = useState(false); // 보고서 관리 모달
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0 });
  const [selectedPropertyNos, setSelectedPropertyNos] = useState([]);
  const [reportNos, setReportNos] = useState([]); // 보고서 작성 선택(보고서작성 버튼 전용 · 선택체크박스와 분리)
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [tableColumns, setTableColumns] = useState([]);
  const [openPropertyModalId, setOpenPropertyModalId] = useState(null); // 열려있는 물건 등록/수정 모달 ID 추적
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false); // 고객센터 접수 모달
  const [inquiryCategory, setInquiryCategory] = useState(''); // 일괄변경 선택 항목
  const [bulkDone, setBulkDone] = useState([]);        // 내 일괄변경요청 중 처리완료 목록
  const [bulkSeen, setBulkSeen] = useState(() => {     // 확인(읽음)한 요청 id 집합 — 사용자별 localStorage
    try { return new Set(JSON.parse(localStorage.getItem(`bulkReqSeen_${user?.userId || 'x'}`) || '[]')); } catch { return new Set(); }
  });
  const [showBulkDone, setShowBulkDone] = useState(false); // 처리완료 코멘트 목록 모달
  const [colorFillRequest, setColorFillRequest] = useState(null); // 색 채우기 요청 {seq, ids, color}

  // 최신 fetchProperties 참조(스테일 클로저 방지) — 창 닫힘 리스너에서 현재 필터로 조회
  const fetchPropertiesRef = useRef(null);


  // 모달 닫힘 이벤트 감지
  useEffect(() => {
    if (!window.electronAPI?.modal?.on) {
      console.log('modal.on not available');
      return;
    }

    console.log('Setting up modal closed listener');

    // 어떤 모달(수정/등록/중개망전송/보고서 등)이 닫히든 목록을 현재 필터로 새로고침
    const cleanup1 = window.electronAPI.modal.on('closed', ({ modalId }) => {
      fetchPropertiesRef.current?.();
      setOpenPropertyModalId((currentId) => (modalId === currentId ? null : currentId));
    });

    // windowClosing 이벤트도 감지 (백업 방법 - 모달 창에서 직접 전송)
    const cleanup2 = window.electronAPI.modal.on('windowClosing', ({ data }) => {
      fetchPropertiesRef.current?.();
      setOpenPropertyModalId((currentId) => (data?.modalId === currentId ? null : currentId));
    });

    return () => {
      cleanup1();
      cleanup2();
    };
  }, []); // 의존성 배열 비움 - 한 번만 등록

  // 시도 목록 로드
  useEffect(() => {
    loadSidoList();
  }, []);

  const loadSidoList = async () => {
    try {
      const data = await addressService.getSidoList();
      setSidoList(data || []);
    } catch (error) {
      console.error('시도 목록 로드 실패:', error);
    }
  };

  // 시도 변경 시 시군구 목록 로드
  useEffect(() => {
    if (searchFilters.sido) {
      loadSigunguList(searchFilters.sido);
    } else {
      setSigunguList([]);
      setEupMyeonDongList([]);
    }
  }, [searchFilters.sido]);

  const loadSigunguList = async (sidoCode) => {
    try {
      const data = await addressService.getSigunguList(sidoCode);
      setSigunguList(data || []);
    } catch (error) {
      console.error('시군구 목록 로드 실패:', error);
    }
  };

  // 시군구 변경 시 읍면동 목록 로드
  useEffect(() => {
    if (searchFilters.sigungu) {
      loadEupMyeonDongList(searchFilters.sigungu);
    } else {
      setEupMyeonDongList([]);
      setRiList([]);
    }
  }, [searchFilters.sigungu]);

  const loadEupMyeonDongList = async (sigunguCode) => {
    try {
      const data = await addressService.getEupMyeonDongList(sigunguCode);
      setEupMyeonDongList(data || []);
    } catch (error) {
      console.error('읍면동 목록 로드 실패:', error);
    }
  };

  // 읍면동 변경 시 리 목록 로드
  useEffect(() => {
    if (searchFilters.eupMyeonDong) {
      loadRiList(searchFilters.eupMyeonDong);
    } else {
      setRiList([]);
    }
  }, [searchFilters.eupMyeonDong]);

  const loadRiList = async (bjdCode) => {
    try {
      const data = await addressService.getRiList(bjdCode);
      setRiList(data || []);
    } catch (error) {
      console.error('리 목록 로드 실패:', error);
      setRiList([]);
    }
  };

  // rowCount나 sortOrder 변경 시 페이지 초기화
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [rowCount, sortOrder, areaFilter, amountFilter]);

  // API에서 물건 목록 조회 (검색 버튼 제거 - 필터 변경 시 자동 조회). 면적/금액도 서버 필터.
  useEffect(() => {
    fetchProperties();
  }, [pagination.page, pagination.pageSize, selectedSummary, activeTab, rowCount, sortOrder, searchFilters, selectedRegions, dongSearch, floorFilter, areaFilter, amountFilter]);

  // 신규 물건 등록 이벤트 리스너
  useEffect(() => {
    const handleOpenPropertyModal = () => {
      handleAddProperty();
    };
    window.addEventListener('openPropertyModal', handleOpenPropertyModal);
    return () => window.removeEventListener('openPropertyModal', handleOpenPropertyModal);
  }, []);

  // 모달 이벤트 리스너
  useEffect(() => {
    if (!window.electronAPI?.modal) return;

    // 모달에서 성공 이벤트 수신 시 목록 새로고침
    const cleanupSuccess = window.electronAPI.modal.on('success', ({ modalId, type, data }) => {
      if (type === 'property' || type === 'property-view') {
        console.log('Property modal success:', data);
        fetchProperties();
      }
    });

    // 모달에서 edit 이벤트 수신 시 수정 모달 열기
    const cleanupEdit = window.electronAPI.modal.on('edit', ({ modalId, type, data }) => {
      if (type === 'property-view') {
        console.log('Property edit requested:', data);
        // 수정 모달 열기
        window.electronAPI.modal.open({
          type: 'property',
          data: {
            title: '물건 수정',
            editData: data,
          },
          width: 1000,
          height: 750,
        });
      }
    });

    return () => {
      cleanupSuccess();
      cleanupEdit();
    };
  }, []);

  // 진행중 체크 공통 처리 — 진행중이면 공통모달로 '해제' 확인 후 pt_sts=null, 아니면 진행중(PTSTS01)으로 변경. 즉시 새로고침
  const [progressConfirm, setProgressConfirm] = useState(null); // { ptNo, toNull }
  const applyProgressChange = async (ptNo, toNull) => {
    try {
      await propertyService.updateStatus(ptNo, toNull ? null : 'PTSTS01', user?.userId);
      toast.success(toNull ? '진행중이 해제되었습니다.' : '물건이 진행중으로 변경되었습니다.');
      fetchProperties();
    } catch (error) {
      console.error('물건 상태 변경 실패:', error);
      toast.error('물건 상태 변경에 실패했습니다.');
    }
  };
  const askProgressToggle = (property) => {
    const isActive = String(property.ptSts || '').includes('PTSTS01');
    setProgressConfirm({ ptNo: property.ptNo, toNull: isActive });
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);

      // 선택된 summary 기반으로 필터 파라미터 설정
      const danjiCode = selectedSummary?.danjiCode || null;
      const addr3 = selectedSummary?.addr3 || null;
      const ptType = selectedSummary?.ptType || searchFilters.ptType || null;
      // 비단지 좌측리스트는 물건 1건 단위(groupKey='PT_<pt_no>') → 클릭 시 해당 물건만 시트에 표시
      const summaryPtNo = (selectedSummary?.groupKey && String(selectedSummary.groupKey).startsWith('PT_'))
        ? (Number(String(selectedSummary.groupKey).slice(3)) || null)
        : null;
      // 매물유형 필터 (모든유형/매매/전세/월세/기타임대)
      const saleDiv = searchFilters.saleDiv || null;

      // 페이지 크기 결정 (전부/20줄/30줄)
      const pageSize = rowCount === 'all' ? 9999 : parseInt(rowCount);

      // 정렬 방식 파라미터
      let orderBy = 'crt_dt'; // 기본값
      if (sortOrder === 'modified') {
        orderBy = 'upd_dt';
      } else if (sortOrder === 'recent_reg') {
        orderBy = 'crt_dt';
      } else if (sortOrder === 'first_reg') {
        orderBy = 'crt_dt';
      }
      const orderDirection = (sortOrder === 'recent_reg' || sortOrder === 'modified') ? 'DESC' : 'ASC';

      // 선택된 지역들의 bjdCode 추출
      const bjdCodes = selectedRegions.map(region => {
        // eupMyeonDong, sigungu, sido 순으로 우선순위
        return region.codes.eupMyeonDong || region.codes.sigungu || region.codes.sido;
      }).filter(Boolean);

      // 면적(㎡)·거래금액(만원) 서버 필터 — 클라이언트 필터링 제거, 백엔드 범위 조회
      const areaToM2 = (v) => (v === '' || v == null) ? null : (areaFilter.unit === '평' ? Math.round(Number(v) * 3.305785 * 100) / 100 : Number(v));
      const amtToMan = (v, u) => (v === '' || v == null) ? null : Math.round(priceUnitToMan(v, u));
      const extraFilters = {
        areaMin: areaToM2(areaFilter.min), areaMax: areaToM2(areaFilter.max),
        amtMin: amtToMan(amountFilter.min, amountFilter.unit), amtMax: amtToMan(amountFilter.max, amountFilter.unit),
        monMin: amtToMan(amountFilter.monMin, amountFilter.monUnit), monMax: amtToMan(amountFilter.monMax, amountFilter.monUnit),
      };

      const response = await propertyService.getList(
        summaryPtNo,                          // 비단지 좌측리스트 클릭 시 해당 물건(pt_no)만
        searchFilters.buildingName || null,   // ptName: 단지/건물명 전용
        pagination.page,
        pageSize,
        ptType,
        danjiCode,
        addr3,
        user?.offNo,  // 로그인한 사용자의 사무소 번호
        user?.rtNo,   // 로그인한 사용자의 중개인 번호
        saleDiv,      // 매물유형 필터
        orderBy,      // 정렬 컬럼
        orderDirection, // 정렬 방향
        bjdCodes,     // 선택된 지역 코드 배열
        dongSearch,   // 동 검색(서버 필터)
        floorFilter,  // 층 필터(전부/탑층/1층만)
        ({ progress: 'PTSTS01', contract: 'PTSTS02', closed: 'PTSTS03', hold: 'PTSTS04' }[activeTab] || null),  // 상태 탭: pt_sts 서버 필터
        searchFilters.keyword || null,  // 통합검색(여러 필드 대상)
        extraFilters                    // 면적/금액/월차임 서버 범위 필터
      );

      if (response?.data) {
        // API 응답에서 물건 리스트 추출 — 단지 미등록 호(ghost, ptNo=0)에는 고유 키 부여(중복 키/선택 충돌 방지)
        let ghostSeq = 0;
        let propertyList = (response.data.ptSales || []).map((p) => (
          (p.isGhost || !p.ptNo) ? { ...p, isGhost: true, ptNo: -(++ghostSeq) } : p
        ));
        // 좌측 물건리스트에서 선택하기 전에는 테이블을 비워둔다(섞여서 나오는 것 방지). 요약(좌측 목록)은 그대로 로드.
        if (!selectedSummary) propertyList = [];
        setProperties(propertyList);
        setPagination(prev => ({
          ...prev,
          pageSize: pageSize,
          total: selectedSummary ? (response.data.totalCount || propertyList.length) : 0,
        }));

        // 요약 정보 업데이트
        setSummaries(response.data.summaries || []);
        setTypeCounts(response.data.typeCounts || []);
        setProgressCount(response.data.progressCount || 0);
      } else {
        // 데이터가 없거나 에러인 경우 목록 비우기
        setProperties([]);
        setPagination(prev => ({
          ...prev,
          total: 0,
        }));
        setSummaries([]);
        setTypeCounts([]);
        setProgressCount(0);
      }
    } catch (error) {
      console.error('물건 목록 조회 실패:', error);
      // 에러 발생 시에도 목록 비우기
      setProperties([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
      }));
      setSummaries([]);
      setTypeCounts([]);
      setProgressCount(0);
    } finally {
      setLoading(false);
    }
  };

  // 최신 fetchProperties를 ref에 반영(창 닫힘 리스너가 항상 현재 필터로 조회)
  fetchPropertiesRef.current = fetchProperties;

  // 물건 요약 클릭 핸들러
  const handleSummaryClick = (summary) => {
    // 좌측 물건리스트는 '무조건 선택' 상태 유지 — 재클릭해도 해제하지 않음.
    //  (summary=null 은 유형 목록으로 돌아가기 등 내부 네비게이션 용도로만 허용)
    if (!summary) { setSelectedSummary(null); setPagination(prev => ({ ...prev, page: 1 })); return; }
    setSelectedSummary(summary);
    setPagination(prev => ({ ...prev, page: 1 })); // 페이지 초기화
  };

  // 요약(단지) 선택 + 보기모드(배치도/시트) 전환 — 토글 없이 항상 선택 상태로
  const selectSummaryForView = (summary, mode) => {
    setSelectedSummary(summary);
    setPagination(prev => ({ ...prev, page: 1 }));
    setViewMode(mode);
  };

  // 모든 필터링(동/층 포함)은 서버에서 처리 → 응답 그대로 사용
  // 주소 컬럼: 아파트류 판별 + 단지명/소재지 추출 (물건명 셀과 동일 규칙)
  const isAptRow = (p) => ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA104', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA120'].includes(p.ptType) || !!p.danjiCode;
  const danjiOf = (p) => (isAptRow(p) ? p.addr4 : p.addr5) || '';
  const regionOf = (p) => [p.addr1, p.addr2, p.addr3].filter(Boolean).join(' ');
  const nameHay = (p) => `${danjiOf(p)} ${regionOf(p)} ${p.ptName || ''}`.toLowerCase();

  // 깔때기 드롭다운 목록(단지/소재지/동/호) — 현재 목록 기준 distinct
  const addrLists = useMemo(() => {
    const danji = new Set(), soji = new Set(), dong = new Set(), ho = new Set();
    properties.forEach((p) => {
      const d = danjiOf(p); if (d) danji.add(d);
      const r = regionOf(p); if (r) soji.add(r);
      if (p.dong) dong.add(String(p.dong));
      if (p.ho) ho.add(String(p.ho));
    });
    const kSort = (a, b) => a.localeCompare(b, 'ko', { numeric: true });
    return { danji: [...danji].sort(kSort), soji: [...soji].sort(kSort), dong: [...dong].sort(kSort), ho: [...ho].sort(kSort) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties]);

  // filteredProperties useMemo는 colText 정의 아래로 이동(TDZ 방지)

  const handleFilterChange = (field, value) => {
    if (field === 'ptType') { setPanelType(null); setSelectedSummary(null); } // 유형 변경 시 좌측 펼침·선택 초기화(→ 새 유형 0번째 자동선택)
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  // 매물유형 토글 핸들러 (복수선택 가능)
  const handleSaleDivToggle = (value) => {
    if (!value) {
      // "모든유형" 클릭
      setSearchFilters(prev => ({ ...prev, saleDiv: '' }));
      return;
    }

    const currentSaleDivs = searchFilters.saleDiv
      ? searchFilters.saleDiv.split(',').filter(v => v)
      : [];

    const index = currentSaleDivs.indexOf(value);
    let newSaleDivs;

    if (index > -1) {
      // 이미 선택되어 있으면 제거
      newSaleDivs = currentSaleDivs.filter(v => v !== value);
    } else {
      // 선택되어 있지 않으면 추가
      newSaleDivs = [...currentSaleDivs, value];
    }

    setSearchFilters(prev => ({ ...prev, saleDiv: newSaleDivs.join(',') }));
  };

  // 매물유형 선택 체크
  const isSaleDivSelected = (value) => {
    if (!searchFilters.saleDiv) return false;
    const selected = searchFilters.saleDiv.split(',').filter(v => v);
    return selected.includes(value);
  };

  // 지역 추가 핸들러
  const handleAddRegion = () => {
    const { sido, sigungu, eupMyeonDong } = searchFilters;
    if (!sido && !sigungu && !eupMyeonDong) return;

    // 주소명 찾기
    const sidoName = sidoList.find(s => s.bjdCode === sido)?.bjdName || '';
    const sigunguName = sigunguList.find(s => s.bjdCode === sigungu)?.bjdName || '';
    const eupMyeonDongName = eupMyeonDongList.find(e => e.bjdCode === eupMyeonDong)?.bjdName || '';

    const regionText = [sidoName, sigunguName, eupMyeonDongName].filter(Boolean).join(' ');
    const regionCodes = { sido, sigungu, eupMyeonDong };

    // 중복 체크 (동일한 조합이 이미 있는지)
    const isDuplicate = selectedRegions.some(
      r => r.codes.sido === sido && r.codes.sigungu === sigungu && r.codes.eupMyeonDong === eupMyeonDong
    );

    if (regionText && !isDuplicate) {
      setSelectedRegions([...selectedRegions, { text: regionText, codes: regionCodes }]);
      // 드롭다운 초기화
      setSearchFilters(prev => ({ ...prev, sido: '', sigungu: '', eupMyeonDong: '' }));
    }
  };

  // 지역 삭제 핸들러
  const handleRemoveRegion = (index) => {
    setSelectedRegions(selectedRegions.filter((_, idx) => idx !== index));
  };

  const handleResetFilters = () => {
    setSearchFilters({
      sido: '',
      sigungu: '',
      eupMyeonDong: '',
      prgSts: '',
      saleDiv: '',
      priceMin: '',
      priceMax: '',
      areaMin: '',
      areaMax: '',
      memo: '',
      buildingName: '',
      ptType: '',
    });
    setSelectedRegions([]);
    setSelectedSummary(null);
  };


  const formatPrice = (price) => {
    if (!price) return '-';
    if (price >= 10000) {
      return `${(price / 10000).toFixed(1)}억`;
    }
    return `${price.toLocaleString()}만`;
  };

  // 날짜 표기 통일 — YY.MM.DD
  const fmtYYMMDD = (v) => {
    if (!v) return '-';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '-';
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  // 물건 등록 버튼 클릭 - 새 창으로 열기
  const handleAddProperty = async () => {
    console.log('=== handleAddProperty called ===');
    console.log('Current openPropertyModalId:', openPropertyModalId);

    if (window.electronAPI?.modal) {
      try {
        // 기존 모달이 있으면 무조건 닫기
        if (openPropertyModalId) {
          console.log('=== Closing existing modal before opening new one ===');
          try {
            await window.electronAPI.modal.close(openPropertyModalId);
            setOpenPropertyModalId(null); // 즉시 초기화
          } catch (e) {
            console.log('기존 모달 닫기 실패 (이미 닫혔을 수 있음):', e);
          }
        }

        // 항상 새 창으로 열기
        const modalId = await window.electronAPI.modal.open({
          type: 'property-form',
          data: {
            title: '물건 등록',
          },
          width: 1250,
          height: 800,
        });

        console.log('New property modal opened:', modalId);
        // 새로 열린 모달 ID 저장
        setOpenPropertyModalId(modalId);
      } catch (error) {
        console.error('Failed to open modal:', error);
        // Fallback: 기존 모달 방식
        setEditPropertyData(null);
        setShowPropertyModal(true);
      }
    } else {
      // 웹 환경: 기존 모달 방식
      setEditPropertyData(null);
      setShowPropertyModal(true);
    }
  };

  const handleAddPropertyV2 = async () => {
    console.log('=== handleAddPropertyV2 called ===');
    console.log('Current openPropertyModalId:', openPropertyModalId);

    if (window.electronAPI?.modal) {
      try {
        // 기존 모달이 있으면 무조건 닫기
        if (openPropertyModalId) {
          console.log('=== Closing existing modal before opening new one ===');
          try {
            await window.electronAPI.modal.close(openPropertyModalId);
            setOpenPropertyModalId(null); // 즉시 초기화
          } catch (e) {
            console.log('기존 모달 닫기 실패 (이미 닫혔을 수 있음):', e);
          }
        }

        // 항상 새 창으로 열기
        const modalId = await window.electronAPI.modal.open({
          type: 'property-form-v2',
          data: {
            title: '물건 등록 V2',
            // 현재 탭(물건유형) 자동선택 — 복수코드 중 등록폼 드롭다운에 존재하는 코드로 정규화(상가|사무실 109→113)
            defaultPtType: normalizeDefaultPtType(searchFilters.ptType),
          },
          width: 1580,
          height: 900,
          minWidth: 1580,
          minHeight: 900,
          resizable: true,
        });

        console.log('New property modal V2 opened:', modalId);
        // 새로 열린 모달 ID 저장
        setOpenPropertyModalId(modalId);
      } catch (error) {
        console.error('Failed to open modal V2:', error);
        // Fallback: 기존 모달 방식
        setEditPropertyData(null);
        setShowPropertyModal(true);
      }
    } else {
      // 웹 환경: 기존 모달 방식
      setEditPropertyData(null);
      setShowPropertyModal(true);
    }
  };

  // 수정 버튼 클릭 - 새 창으로 열기
  const handleEdit = async (property) => {
    if (window.electronAPI?.modal) {
      try {
        // 이미 열려있는 물건 모달이 있으면 데이터만 업데이트
        if (openPropertyModalId && window.electronAPI.modal.updateData) {
          try {
            await window.electronAPI.modal.updateData(openPropertyModalId, {
              title: `물건 수정 - ${property.ptName || '물건정보'}`,
              ptNo: property.ptNo,
            });
            // 창에 포커스
            if (window.electronAPI.modal.focus) {
              await window.electronAPI.modal.focus(openPropertyModalId);
            }
            return; // 새 창을 열지 않고 종료
          } catch (e) {
            console.log('기존 모달 업데이트 실패, 새 창을 엽니다:', e);
            // 업데이트 실패하면 기존 창 닫고 새로 열기
            try {
              await window.electronAPI.modal.close(openPropertyModalId);
            } catch (closeError) {
              console.log('기존 모달 닫기 실패:', closeError);
            }
          }
        }

        const modalId = await window.electronAPI.modal.open({
          type: 'property-form',
          data: {
            title: `물건 수정 - ${property.ptName || '물건정보'}`,
            ptNo: property.ptNo,
          },
          width: 1250,
          height: 800,
        });

        // 새로 열린 모달 ID 저장
        setOpenPropertyModalId(modalId);
      } catch (error) {
        console.error('Failed to open modal:', error);
        // Fallback: 기존 모달 방식
        setEditPropertyData(property);
        setShowPropertyModal(true);
      }
    } else {
      // 웹 환경: 기존 모달 방식
      setEditPropertyData(property);
      setShowPropertyModal(true);
    }
  };

  // 우클릭 '복사등록' — 상세를 불러와 등록폼 복사등록 로직(copyData)과 동일하게 신규 등록창 오픈
  const handleCopyProperty = async (property) => {
    if (!property?.ptNo) return;
    if (!window.electronAPI?.modal?.open) { toast.error('Electron 환경에서만 복사 등록이 가능합니다.'); return; }
    try {
      const res = await propertyService.getDetail(property.ptNo);
      const d = res?.data;
      if (!d) { toast.error('물건 정보를 불러오지 못했습니다.'); return; }
      const copy = {
        ...d,
        ptNo: '', regDt: '', regId: '', updDt: '', updId: '', pastDataYn: 'N',
        saleDiv: typeof d.saleDiv === 'string' ? d.saleDiv.split(',').filter(Boolean) : (d.saleDiv || []),
        etcLeaseType: typeof d.etcLeaseType === 'string' ? d.etcLeaseType.split(',').filter(Boolean) : (d.etcLeaseType || []),
        ptSts: d.ptSts || 'PTSTS01',
      };
      await window.electronAPI.modal.open({
        type: 'property-form-v2',
        data: { title: '물건 등록 (복사)', copyData: copy },
        width: 1580, height: 900, minWidth: 1580, minHeight: 900, resizable: true,
      });
    } catch (e) { console.error('복사 등록 실패:', e); toast.error('복사 등록 창을 여는 데 실패했습니다.'); }
  };

  // 엑셀 업로드 버튼 클릭
  const handleExcelUpload = async () => {
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'data-upload',
          data: {
            title: '물건 엑셀 업로드',
            target: 'property',
          },
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

  // 삭제 버튼 클릭
  const handleDelete = async (ptNo) => {
    if (!window.confirm('이 물건을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await propertyService.delete(ptNo, user?.userId);
      toast.success('물건이 삭제되었습니다.');
      fetchProperties();
    } catch (error) {
      console.error('물건 삭제 실패:', error);
      toast.error('물건 삭제에 실패했습니다.');
    }
  };

  // 색 채우기 핸들러 (체크된 행에 색상 적용, color=null이면 제거)
  const handleColorFill = (color) => {
    if (selectedPropertyNos.length === 0) {
      toast.error('색을 적용할 물건을 선택해주세요.');
      return;
    }
    setColorFillRequest({ seq: Date.now(), ids: [...selectedPropertyNos], color });
  };

  // 선택 수정 핸들러 (마지막에 체크한 행의 수정창 열기)
  const handleEditSelected = () => {
    if (selectedPropertyNos.length === 0) {
      toast.error('수정할 물건을 선택해주세요.');
      return;
    }
    const lastPtNo = selectedPropertyNos[selectedPropertyNos.length - 1];
    const property = properties.find(p => p.ptNo === lastPtNo);
    if (property) {
      handleRowClick(property);
    } else {
      toast.error('선택한 물건 정보를 찾을 수 없습니다.');
    }
  };

  // 보고서 작성 핸들러 (선택한 매물로 보고서 생성) — 단일/다중 모두 지원, 새 창(페이지)으로 열기
  const handleCreateReport = async () => {
    if (reportNos.length === 0) {
      toast.error('보고서작성 버튼으로 물건을 먼저 선택해주세요.');
      return;
    }
    // 선택 순서 유지하여 보고서 선택된 매물 전체 수집
    const selected = reportNos
      .map(no => properties.find(p => p.ptNo === no))
      .filter(Boolean);
    if (selected.length === 0) {
      toast.error('선택한 물건 정보를 찾을 수 없습니다.');
      return;
    }
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'report-builder',
          data: { title: '보고서 작성', property: selected[0], properties: selected },
          width: 1400,
          height: 950,
        });
        return;
      } catch (err) { console.error('보고서 창 열기 실패:', err); }
    }
    setReportProperty(selected[0]);
    setReportProperties(selected);
    setShowReportBuilder(true);
  };

  // 보고서 편집 핸들러 — 선택(보고서작성 버튼)한 매물의 기존 보고서를 편집창으로 연다(없으면 신규 작성)
  const handleEditReport = async () => {
    if (reportNos.length === 0) {
      toast.error('보고서작성 버튼으로 물건을 먼저 선택해주세요.');
      return;
    }
    const selected = reportNos
      .map(no => properties.find(p => p.ptNo === no))
      .filter(Boolean);
    if (selected.length === 0) {
      toast.error('선택한 물건 정보를 찾을 수 없습니다.');
      return;
    }
    const editNo = selected.find(p => p.reportNo)?.reportNo || null;
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'report-builder',
          data: { title: editNo ? '보고서 편집' : '보고서 작성', property: selected[0], properties: selected, reportNo: editNo },
          width: 1400,
          height: 950,
        });
        return;
      } catch (err) { console.error('보고서 창 열기 실패:', err); }
    }
    setReportProperty(selected[0]);
    setReportProperties(selected);
    setReportEditNo(editNo);
    setShowReportBuilder(true);
  };

  // 선택 삭제 핸들러
  const handleDeleteSelected = async () => {
    if (selectedPropertyNos.length === 0) {
      toast.error('삭제할 물건을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedPropertyNos.length}개의 물건을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // 각 물건을 순차적으로 삭제
      let successCount = 0;
      let failCount = 0;

      for (const ptNo of selectedPropertyNos) {
        try {
          await propertyService.delete(ptNo, user?.userId);
          successCount++;
        } catch (error) {
          console.error(`물건 ${ptNo} 삭제 실패:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount}개의 물건이 삭제되었습니다.${failCount > 0 ? ` (실패: ${failCount}개)` : ''}`);
      }
      if (failCount > 0 && successCount === 0) {
        toast.error('물건 삭제에 실패했습니다.');
      }

      // 선택 초기화 및 목록 새로고침
      setSelectedPropertyNos([]);
      fetchProperties();
    } catch (error) {
      console.error('물건 삭제 실패:', error);
      toast.error('물건 삭제에 실패했습니다.');
    }
  };

  // 모달 성공 콜백
  const handleModalSuccess = () => {
    fetchProperties();
  };

  // 내 일괄변경요청 중 처리완료 목록 로드(N 배지/코멘트 확인용)
  const loadBulkDone = async () => {
    if (!user?.userId) { setBulkDone([]); return; }
    try { const items = await bulkRequestService.list({ userId: user.userId, status: '처리완료' }); setBulkDone(items || []); }
    catch { setBulkDone([]); }
  };
  useEffect(() => { loadBulkDone(); /* eslint-disable-next-line */ }, [user]);

  const bulkReqId = (r) => (r?.reqId ?? r?.ReqId);
  const bulkNewCount = bulkDone.filter((r) => !bulkSeen.has(bulkReqId(r))).length;
  // 처리완료 목록 열기 → 모두 읽음 처리(N 제거)
  const openBulkDone = () => {
    setShowBulkDone(true);
    const next = new Set(bulkSeen);
    bulkDone.forEach((r) => next.add(bulkReqId(r)));
    setBulkSeen(next);
    try { localStorage.setItem(`bulkReqSeen_${user?.userId || 'x'}`, JSON.stringify([...next])); } catch { /* ignore */ }
  };

  // 일괄변경 드롭박스 선택 시 고객센터 접수 모달 열기
  const handleBatchChangeSelect = (value) => {
    if (!value) return;
    setInquiryCategory(value);
    setIsInquiryModalOpen(true);
  };

  // 접수 저장 — 일괄변경요청(isBulk)은 전용 테이블(rt_bulk_request), 그 외는 고객센터 문의
  const handleSaveInquiry = async (inquiryData) => {
    try {
      if (inquiryData?.isBulk) {
        const reqId = await bulkRequestService.create({ ...inquiryData });
        if (reqId) {
          toast.success('일괄변경요청이 접수되었습니다.');
          setIsInquiryModalOpen(false);
          setInquiryCategory('');
        } else {
          toast.error('일괄변경요청 접수에 실패했습니다.');
        }
        return;
      }
      const response = await inquiryService.createInquiry({ ...inquiryData, regId: user?.userId });
      if (response.success) {
        toast.success('문의가 접수되었습니다.');
        setIsInquiryModalOpen(false);
        setInquiryCategory('');
      }
    } catch (error) {
      console.error('접수 실패:', error);
      toast.error(error.message || '접수에 실패했습니다.');
    }
  };

  // 물건 행 클릭 핸들러 - 수정 페이지로 이동
  // 1회 클릭 = 선택(체크) 토글(단일선택), 2회 클릭(handleRowClick) = 수정창
  const handleRowSelect = (property) => setSelectedPropertyNos((prev) => (prev.includes(property.ptNo) ? [] : [property.ptNo]));

  const handleRowClick = async (property) => {
    console.log('Row clicked:', property);

    // 단지 미등록 호(ghost) → 배치도 클릭처럼 물건 등록창(소재지/유형 자동입력 + 잠금)
    if (property.isGhost) {
      if (!window.electronAPI?.modal) { window.location.href = '/properties/new'; return; }
      const copyData = {
        ptType: property.ptType || 'SYCA101',
        danjiCode: String(property.danjiCode || ''),
        addr1: property.addr1 || '', addr2: property.addr2 || '', addr3: property.addr3 || '',
        jibun: property.jibun || '', addr4: property.addr4 || '',
        bjdCode: property.bjdCode || '',
        dong: property.dong || '', ho: property.ho || '',
        floor1: property.floor ?? '',
        aptTyp: property.aptTyp || '',
        supArea: property.supArea != null ? String(property.supArea) : '',
        excArea: property.excArea != null ? String(property.excArea) : '',
      };
      try {
        await window.electronAPI.modal.open({
          type: 'property-form-v2',
          data: { title: '물건 등록', copyData, lockAddress: true, lockType: true },
          width: 1580, height: 900, minWidth: 1580, minHeight: 900, resizable: true,
        });
      } catch (e) { console.error('물건 등록창 열기 실패:', e); }
      return;
    }

    if (window.electronAPI?.modal) {
      // Electron 환경: 새 창으로 수정 모달 열기
      try {
        // 이미 열려있는 물건 모달이 있으면 데이터만 업데이트
        if (openPropertyModalId && window.electronAPI.modal.updateData) {
          try {
            console.log('=== Updating existing modal (Row Click) ===');
            console.log('Modal ID:', openPropertyModalId);
            console.log('New ptNo:', property.ptNo);

            await window.electronAPI.modal.updateData(openPropertyModalId, {
              title: `물건 수정 - ${property.ptName || '물건정보'}`,
              ptNo: property.ptNo,
            });

            console.log('Modal data updated successfully');

            // 창에 포커스
            if (window.electronAPI.modal.focus) {
              await window.electronAPI.modal.focus(openPropertyModalId);
            }
            return; // 새 창을 열지 않고 종료
          } catch (e) {
            console.log('기존 모달 업데이트 실패, 새 창을 엽니다:', e);
            // 업데이트 실패하면 기존 창 닫고 새로 열기
            try {
              await window.electronAPI.modal.close(openPropertyModalId);
            } catch (closeError) {
              console.log('기존 모달 닫기 실패:', closeError);
            }
          }
        }

        const modalId = await window.electronAPI.modal.open({
          type: 'property-form-v2',
          data: {
            title: `물건 수정 - ${property.ptName || '물건정보'}`,
            ptNo: property.ptNo,
          },
          width: 1580,
          height: 900,
          minWidth: 1580,
          minHeight: 900,
          resizable: true,
        });
        console.log('Property form modal opened:', modalId);

        // 새로 열린 모달 ID 저장
        setOpenPropertyModalId(modalId);
      } catch (error) {
        console.error('Failed to open modal:', error);
        // Fallback: 페이지 이동
        window.location.href = `/properties/edit/${property.ptNo}`;
      }
    } else {
      // 웹 환경: 페이지 이동
      window.location.href = `/properties/edit/${property.ptNo}`;
    }
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

      const container = document.querySelector('.prop-content-wrapper');
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

  // 헤더 클릭 정렬: 오름차순 → 내림차순 → 해제
  const cycleSort = (col) => setHeaderSort((s) => (
    s.col !== col ? { col, dir: 'asc' } : s.dir === 'asc' ? { col, dir: 'desc' } : { col: null, dir: null }
  ));
  const sortHead = (col, text) => {
    const active = headerSort.col === col ? headerSort.dir : null;
    return (
      <span onClick={(e) => { e.stopPropagation(); cycleSort(col); }} title="정렬: 오름차순 → 내림차순 → 해제"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', userSelect: 'none' }}>
        {text}
        <span aria-hidden style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 0L8 5H0z" fill={active === 'asc' ? '#ea580c' : '#cbd5e1'} /></svg>
          <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 5L0 0h8z" fill={active === 'desc' ? '#ea580c' : '#cbd5e1'} /></svg>
        </span>
      </span>
    );
  };

  // 물건명/동/호 컬럼 헤더 하단 필터칸 (부분일치 즉시 필터)
  const openColMenu = (key, e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setColDraft([...colPick[key]]);
    setColMenu({ key, x: r.right - 250, y: r.bottom + 4 });
  };
  const colFilterInput = (key, ph) => {
    const picks = colPick[key] || [];
    const active = !!colFilter[key] || picks.length > 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={colFilter[key] || ''}
          onChange={(e) => { setColFilter((prev) => ({ ...prev, [key]: e.target.value })); setPagination((prev) => ({ ...prev, page: 1 })); }}
          placeholder={ph}
          style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '1px 6px', fontSize: '13px', fontWeight: 400, border: `1px solid ${active ? '#4f46e5' : '#cbd5e1'}`, borderRadius: '4px', background: 'white', color: '#111827', lineHeight: 1.2 }}
        />
        <svg onClick={(e) => openColMenu(key, e)} width="13" height="13" viewBox="0 0 24 24"
          fill={picks.length > 0 ? '#4f46e5' : 'none'} stroke={picks.length > 0 ? '#4f46e5' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ cursor: 'pointer', flexShrink: 0 }} title="목록에서 선택">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </div>
    );
  };

  // 면적 표시(㎡/평 환산) — colText/필터에서 사용하므로 colText보다 먼저 정의(TDZ 방지)
  const areaDisplay = (property) => {
    const toPy = areaUnit === '평';
    const conv = (v) => { const n = Number(v); if (!v || Number.isNaN(n)) return null; return toPy ? Math.round(n * 0.3025 * 100) / 100 : n; };
    const code = property.ptType;
    const DANJI = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA104', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA120'];
    let prefix, val;
    if (code === 'SYCA115') { prefix = '토지'; val = conv(property.landShare ?? property.grossArea ?? property.excArea ?? property.supArea); }
    else if (DANJI.includes(code)) { const exc = conv(property.excArea); if (exc != null) { prefix = '전용'; val = exc; } else { prefix = '공급'; val = conv(property.supArea); } }
    else { prefix = '대지'; val = conv(property.grossArea ?? property.landShare ?? property.excArea ?? property.supArea); }
    return val != null ? `(${prefix})${val}${areaUnit}` : '';
  };

  // 단일 컬럼 텍스트 접근자(필터/표시 공용) — 유형별 헤드라인 단일 컬럼에서 사용
  const colText = (p, key) => {
    switch (key) {
      case 'name': return p.ptName || p.addr4 || '';
      case 'dong': return String(p.dong || '');
      case 'ho': return String(p.ho || '');
      case 'c_type': return p.aptTyp || '';
      case 'c_dir': return p.dirStd || '';
      case 'c_loan': return p.loanAmt ? String(p.loanAmt) : '';
      case 'c_status': return p.currentStatus || '';
      case 'c_maturity': return fmtYYMMDD(p.mtryDate) || '';
      case 'c_updt': return fmtYYMMDD(p.updDt || p.regDt) || '';
      case 'c_landcategory': return p.landCategory || '';
      case 'c_landuse': return p.landUse || '';
      case 'c_biz': return p.businessName || '';
      case 'c_consult': return p.consultContent || p.ptMemo || '';
      case 'c_saleamt': return p.saleAmt ? String(p.saleAmt) : '';
      case 'c_bunyang': return p.presaleAmt ? String(p.presaleAmt) : '';
      case 'c_premium': return p.premiumAmt ? String(p.premiumAmt) : '';
      case 'c_balcony': return p.expansionAmt ? String(p.expansionAmt) : '';
      case 'c_option': return p.optionAmt ? String(p.optionAmt) : '';
      case 'c_rightamt': return p.rightValueAmt ? String(p.rightValueAmt) : '';
      case 'c_keymoney': return p.layAmt ? String(p.layAmt) : '';
      case 'c_moving': return p.movingCost ? String(p.movingCost) : '';
      case 'c_buildyear': return p.compYear ? String(p.compYear).slice(0, 4) : '';
      case 'c_rooms': return p.guestRoomCnt ? String(p.guestRoomCnt) : '';
      case 'c_area_exc': return p.excArea ? String(p.excArea) : '';
      case 'c_area_sup': return p.supArea ? String(p.supArea) : '';
      case 'c_area_gross': return p.grossArea ? String(p.grossArea) : '';
      case 'c_area_land': return p.landShare ? String(p.landShare) : '';
      case 'c_area': return areaDisplay(p) || '';
      case 'c_deposit_sum': return p.depositSum ? String(p.depositSum) : '';
      case 'c_month_sum': return p.monSum ? String(p.monSum) : '';
      case 'c_loan_total': return p.loanTotal ? String(p.loanTotal) : '';
      case 'c_deposit_total': return p.depositTotal ? String(p.depositTotal) : '';
      case 'c_yincome': { const v = moneySum(p, 'c_yincome'); return v ? String(v) : ''; }
      case 'c_yexpense': { const v = moneySum(p, 'c_yexpense'); return v ? String(v) : ''; }
      // 헤드라인설정 추가 항목(필터/검색용)
      case 'c_addr': return regionOf(p) || '';
      case 'c_top': return String(p.top || '');
      case 'c_regdt': return fmtYYMMDD(p.regDt) || '';
      case 'c_movein': return String(p.mvnPsbYn || '');
      case 'c_balancedate': return fmtYYMMDD(p.exptDate) || '';
      case 'c_houserental': return String(p.houseRental || '');
      case 'c_renewal': return String(p.contractRenewalRight || '');
      case 'c_opt': return String(p.opt || '');
      case 'c_roomcnt': return p.roomCnt != null ? String(p.roomCnt) : '';
      case 'c_bathcnt': return p.bathCnt != null ? String(p.bathCnt) : '';
      case 'c_biztype': return String(p.businessType || '');
      case 'c_builduse': return String(p.buildingUse || p.mainBuildingUse || '');
      case 'c_expl': return String(p.ptExpl || '');
      case 'c_owner': return String(p.registryOwner || '');
      case 'c_tenant': return String(p.contractTenant || '');
      case 'c_leasecond': return [p.nowDepAmt, p.nowMonAmt].filter(Boolean).join('/');
      default: return '';
    }
  };

  // 물건명/동/호 등 컬럼 헤더 퀵필터(현재 페이지 표시 정제용) — 텍스트(부분일치) AND 목록선택(OR)
  //  · colText 정의 이후에 선언(TDZ 방지). 면적/거래금액 범위는 서버 필터라 여기서 미처리
  const filteredProperties = useMemo(() => {
    let arr = properties;
    const f = colFilter, pk = colPick;
    // 물건명은 별도 haystack(주소 포함) 사용
    if ((f.name || '').trim()) { const q = f.name.trim().toLowerCase(); arr = arr.filter((p) => nameHay(p).includes(q)); }
    if ((pk.name || []).length) arr = arr.filter((p) => pk.name.some((sel) => nameHay(p).includes(String(sel).toLowerCase())));
    // 그 외 단일 컬럼: colText 접근자로 부분일치 필터(전 컬럼 공용)
    Object.keys(f).forEach((key) => {
      if (key === 'name') return;
      const q = (f[key] || '').trim();
      if (q) arr = arr.filter((p) => colText(p, key).toLowerCase().includes(q.toLowerCase()));
      const picks = pk[key] || [];
      if (picks.length) arr = arr.filter((p) => picks.some((sel) => colText(p, key).includes(String(sel))));
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, colFilter, colPick]);

  // 전체 테이블 컬럼 정의 (기본 표시 컬럼 + 추가 가능한 컬럼)
  // 기본 표시 컬럼 (헤더 2행: subHeaders 있으면 위/아래 2칸, 없으면 rowspan 2 단일 셀)
  const defaultTableColumns = [
    { key: 'select_saletype', label: '선택', width: 80, subHeaders: ['선택', sortHead('saletype', '매물유형')], noRowClick: true },
    { key: 'name', label: '물건명', width: 200, titleFilter: true, filter: colFilterInput('name', '물건명 검색') }, // 상단:물건명 / 하단:필터칸 / 데이터 rowspan2
    { key: 'dong', label: '동', width: 74, titleFilter: true, filter: colFilterInput('dong', '동') },
    { key: 'ho', label: '호', width: 74, titleFilter: true, filter: colFilterInput('ho', '호') },
    { key: 'type_area', label: '타입', width: 110, subHeaders: ['타입', (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setAreaUnit((u) => (u === '㎡' ? '평' : '㎡')); }}
        title="㎡ / 평 전환"
        style={{ fontSize: '11px', fontWeight: 400, border: '1px solid #cbd5e1', borderRadius: '3px', background: 'white', color: '#000', cursor: 'pointer', padding: '0 5px', lineHeight: 1.5 }}
      >
        면적({areaUnit})
      </button>
    )] },
    { key: 'dir_loan', label: '방향', width: 100, subHeaders: ['방향', '융자금'] }, // 타입 우측 (방향/융자금)
    { key: 'date_info', label: '수정일', width: 110, subHeaders: ['수정일', sortHead('regdt', '등록일')] },
    { key: 'actions_quick', label: '퀵메뉴', width: 90, noRowClick: true }, // rowspan 2
    { key: 'category_biz', label: '지목', width: 150, subHeaders: ['지목', '상호'] },
    { key: 'trade_type', label: '거래유형', width: 80, colSpan: 2 }, // rowspan 2 + colspan 2
    { key: 'trade_amount', label: '의뢰금액', width: 100, colSpan: 2 }, // rowspan 2 + colspan 2
    { key: 'status_date', label: '현상태', width: 130, subHeaders: ['현상태', '현임대조건'] },
    { key: 'maturity_balance', label: '만기일', width: 110, subHeaders: ['만기일', '잔금예정일'] }, // 현상태 우측
    { key: 'rental', label: '주택임대사업자', width: 150, subHeaders: ['주택임대사업자', '계약갱신요구권'] },
    { key: 'match_info', label: '자사매칭', width: 120, subHeaders: ['자사매칭', '공동망매칭'] },
    { key: 'consultation', label: '상담내용', width: 200 }, // rowspan 2 (최근 상담내용 top1)
  ];

  // 전체 선택 가능한 컬럼 = 기본 표시 12+1 + 헤드라인설정에서 추가 가능한(기본 숨김) 항목
  const allTableColumns = [
    ...defaultTableColumns,
    // 기본 숨김 (헤드라인설정에서 표시 선택 가능)
    { key: 'etc_col', label: '기타', width: 150 }, // rowspan 2
    { key: 'landuse_category', label: '용도지역', width: 150, subHeaders: ['용도지역', '지목'] },
    { key: 'biz_name_type', label: '상호', width: 120, subHeaders: ['상호', '업종'] },
    { key: 'description', label: '물건특징', width: 120 }, // rowspan 2
    { key: 'room_bath', label: '방개수', width: 100, subHeaders: ['방개수', '욕실수'] },
    { key: 'building_landuse', label: '건축물용도', width: 150, subHeaders: ['건축물용도', '용도지역'] },
    { key: 'dir_top', label: '방향', width: 90, subHeaders: ['방향', '탑층'] },
  ];

  // ── 유형별 헤드라인 단일 컬럼 정의 ──────────────────────────────
  // 단일 컬럼: 텍스트/금액/면적은 필터검색창 부여, 다중값(거래유형/금액/매칭)·체크는 미부여
  // 모든 헤더는 rowspan1(제목) + 하단 필터칸으로 통일. 필터 불필요한 컬럼도 readonly 칸을 둔다.
  const roFilter = (
    <input type="text" readOnly tabIndex={-1}
      style={{ width: '100%', padding: '1px 4px', fontSize: '13px', border: '1px solid #e5e7eb', background: '#f1f5f9', color: '#94a3b8', boxSizing: 'border-box', cursor: 'default', lineHeight: 1.2 }} />
  );
  const scol = (key, label, w = 100) => ({ key, label, width: w, titleFilter: true, filter: colFilterInput(key, label) });
  const ncol = (key, label, w = 100) => ({ key, label, width: w, titleFilter: true, filter: roFilter });
  const COL = {
    sel: {
      key: 'sel', width: 96, noRowClick: true,
      // 헤더: 선택 │ 정보망 │ 보고서 │ 진행중 (세로글자 + 구분선 + 색상) — 필터행 없이 rowspan2
      label: (
        <span style={{ display: 'flex', width: '100%', alignItems: 'stretch', height: '100%', minHeight: '46px' }}>
          {[
            { t: '선　택', c: '#111827', b: false },
            { t: '정보망', c: '#1d4ed8', b: true },
            { t: '보고서', c: '#4338ca', b: true },
            { t: '진행중', c: '#c2410c', b: true },
          ].map((x) => (
            <span key={x.t} style={{ flex: 1, writingMode: 'vertical-rl', textOrientation: 'upright', fontSize: '13px', fontWeight: 800, lineHeight: 1.0, letterSpacing: '0', color: x.c, borderLeft: x.b ? '1px solid #cbd5e1' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{x.t}</span>
          ))}
        </span>
      ),
    },
    name: scol('name', '물건명', 180),
    dong: scol('dong', '동', 74),
    ho: scol('ho', '호', 74),
    type: scol('c_type', '타입', 90),
    area: scol('c_area', '면적', 110),
    areaExc: scol('c_area_exc', '전용면적', 100),
    areaSup: scol('c_area_sup', '공급면적', 100),
    areaGross: scol('c_area_gross', '연면적', 100),
    areaLand: scol('c_area_land', '대지면적', 100),
    landOnly: scol('c_area_land', '토지면적', 100),
    dir: scol('c_dir', '방향', 74),
    tradeType: {
      key: 'trade_type', label: '거래유형', width: 128, titleFilter: true,
      // 필터행: 매/전/월/기 입체 버튼(복수선택) — 상단 거래유형 탭과 동일 상태(saleDiv) 공유
      filter: (
        <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'stretch', gap: '2px', padding: '1px' }}>
          {[['SALEDIV01', '매'], ['SALEDIV02', '전'], ['SALEDIV03', '월'], ['SALEDIV04', '기']].map(([code, ch]) => {
            const on = isSaleDivSelected(code);
            return (
              <button key={code} type="button" title={{ SALEDIV01: '매매', SALEDIV02: '전세', SALEDIV03: '월세', SALEDIV04: '기타임대' }[code]}
                onClick={(e) => { e.stopPropagation(); handleSaleDivToggle(code); }}
                style={{
                  flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 800, lineHeight: 1, cursor: 'pointer',
                  borderRadius: '4px', border: `1px solid ${on ? '#3730a3' : '#b6bfca'}`,
                  background: on ? 'linear-gradient(180deg,#5b52e6,#4338ca)' : 'linear-gradient(180deg,#ffffff,#e6eaef)',
                  color: on ? '#fff' : '#111827',
                  boxShadow: on ? 'inset 0 2px 3px rgba(0,0,0,0.35)' : 'inset 0 1px 0 #fff, 0 1px 2px rgba(0,0,0,0.22)',
                  transition: 'all .1s',
                }}>
                {ch}
              </button>
            );
          })}
        </span>
      ),
    },
    // 거래금액: 필터행에 매매가|전세가|월세가|기타임대 가로 라벨(읽기전용) — 칼럼 넓게
    tradeAmt: {
      key: 'trade_amount', label: '의뢰금액', width: 360, titleFilter: true,
      filter: (
        <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'stretch' }}>
          {['매매가', '전세가', '월세가', '기타임대'].map((t, i) => (
            <span key={t} style={{ flex: [1, 1, 1.5, 1.2][i], minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#334155', borderLeft: i > 0 ? '1px solid #cbd5e1' : 'none', whiteSpace: 'nowrap' }}>{t}</span>
          ))}
        </span>
      ),
    },
    loan: scol('c_loan', '융자금', 100),
    updt: scol('c_updt', '수정일', 100),
    status: scol('c_status', '현상태', 100),
    maturity: scol('c_maturity', '만기일', 100),
    match: { key: 'c_match', label: '자사/공동망매칭', width: 120 }, // 필터 없음 → rowspan2
    consult: scol('c_consult', '상담내용', 180),
    saleAmt: scol('c_saleamt', '매매금액', 110),
    bunyang: scol('c_bunyang', '분양금액', 110),
    balcony: scol('c_balcony', '발코니확장금액', 120),
    option: scol('c_option', '옵션금액', 110),
    premium: scol('c_premium', '프리미엄', 100),
    rightAmt: scol('c_rightamt', '권리가액', 110),
    moving: scol('c_moving', '이주비', 100),
    biz: scol('c_biz', '사업체명', 120),
    keymoney: scol('c_keymoney', '권리금', 100),
    rooms: scol('c_rooms', '객실수', 80),
    depositSum: scol('c_deposit_sum', '보증금합계', 110),
    monthSum: scol('c_month_sum', '월세합계', 100),
    buildYear: scol('c_buildyear', '준공년도', 90),
    loanTotal: scol('c_loan_total', '대출금액', 110),
    depositTotal: scol('c_deposit_total', '보증금총액', 110),
    yincome: scol('c_yincome', '년수입합계', 110),
    yexpense: scol('c_yexpense', '년지출합계', 110),
    landCat: scol('c_landcategory', '지목', 90),
    landUse: scol('c_landuse', '용도지역', 110),
    // ── 헤드라인설정 추가 항목(백엔드 매핑) ──
    addr: scol('c_addr', '주소', 180),
    top: scol('c_top', '탑층', 70),
    regdt: scol('c_regdt', '등록일', 100),
    leaseCond: scol('c_leasecond', '현임대조건', 140),
    movein: scol('c_movein', '입주여부', 90),
    balanceDate: scol('c_balancedate', '잔금예정일', 110),
    houseRental: scol('c_houserental', '주택임대사업자', 130),
    renewal: scol('c_renewal', '계약갱신요구권', 130),
    opt: scol('c_opt', '옵션', 150),
    roomCnt: scol('c_roomcnt', '방개수', 80),
    bathCnt: scol('c_bathcnt', '욕실수', 80),
    bizType: scol('c_biztype', '업종', 110),
    buildUse: scol('c_builduse', '건축물용도', 130),
    expl: scol('c_expl', '물건특징', 160),
    owner: scol('c_owner', '소유자', 110),
    tenant: scol('c_tenant', '임차인', 110),
  };
  const C = COL;

  // 헤드라인설정 전체 선택 목록(마스터) — 모든 항목 백엔드 매핑됨. 순서=0910.md 헤드라인
  // 헤드라인설정 선택 목록 — '선택(sel)'은 항상 표시되는 고정 컬럼이라 제외(시트엔 항상 유지)
  const HEADLINE_MASTER = [
    C.addr, C.name, C.dong, C.ho, C.top, C.dir,
    C.type, C.area, C.tradeType, C.tradeAmt, C.loan, C.updt, C.regdt,
    C.status, C.leaseCond, C.movein, C.maturity, C.balanceDate, C.houseRental, C.renewal,
    C.opt, C.roomCnt, C.bathCnt, C.bunyang, C.balcony, C.option, C.premium,
    C.rightAmt, C.moving, C.bizType, C.buildUse, C.biz,
    C.landCat, C.landUse, C.expl, C.consult, C.match, C.owner, C.tenant,
    C.depositTotal, C.yincome, C.yexpense,
  ];
  const COLSET = {
    apt: [C.sel, C.name, C.dong, C.ho, C.type, C.dir, C.tradeType, C.tradeAmt, C.loan, C.updt, C.status, C.maturity, C.match, C.consult],
    bunyang: [C.sel, C.name, C.dong, C.ho, C.type, C.dir, C.saleAmt, C.bunyang, C.balcony, C.option, C.premium, C.updt, C.match, C.consult],
    redev: [C.sel, C.name, C.dong, C.ho, C.type, C.dir, C.rightAmt, C.moving, C.saleAmt, C.bunyang, C.balcony, C.option, C.premium, C.updt, C.match, C.consult],
    oneroom: [C.sel, C.name, C.dong, C.ho, C.area, C.dir, C.tradeType, C.tradeAmt, C.loan, C.updt, C.status, C.maturity, C.match, C.consult],
    house: [C.sel, C.name, C.ho, C.dir, C.areaLand, C.areaGross, C.tradeType, C.tradeAmt, C.loan, C.depositSum, C.monthSum, C.status, C.updt, C.maturity, C.match, C.consult],
    commercial: [C.sel, C.name, C.dong, C.ho, C.area, C.dir, C.tradeType, C.tradeAmt, C.loan, C.updt, C.status, C.biz, C.keymoney, C.maturity, C.match, C.consult],
    knowledge: [C.sel, C.name, C.dong, C.ho, C.area, C.dir, C.tradeType, C.tradeAmt, C.loan, C.updt, C.status, C.biz, C.maturity, C.match, C.consult],
    building: [C.sel, C.name, C.areaLand, C.areaGross, C.buildYear, C.saleAmt, C.loanTotal, C.depositTotal, C.yincome, C.yexpense, C.landCat, C.landUse, C.updt, C.match, C.consult],
    lodging: [C.sel, C.name, C.areaExc, C.areaLand, C.areaGross, C.rooms, C.tradeType, C.tradeAmt, C.loan, C.updt, C.status, C.biz, C.maturity, C.match, C.consult],
    factory: [C.sel, C.name, C.dong, C.ho, C.areaLand, C.areaGross, C.tradeType, C.tradeAmt, C.loan, C.updt, C.status, C.landCat, C.landUse, C.biz, C.maturity, C.match, C.consult],
    land: [C.sel, C.name, C.landOnly, C.landCat, C.landUse, C.tradeType, C.tradeAmt, C.loan, C.updt, C.status, C.biz, C.maturity, C.match, C.consult],
  };
  const TYPE_COLUMNS = {
    'SYCA101,SYCA103': COLSET.apt,   // 아파트/주상복합
    'SYCA102': COLSET.apt,           // 오피스텔
    'SYCA105,SYCA107': COLSET.bunyang, // 아파트분양권
    'SYCA106': COLSET.bunyang,       // 오피스텔분양권
    'SYCA104': COLSET.redev,         // 재건축
    'SYCA120': COLSET.redev,         // 재개발
    'SYCA117': COLSET.oneroom,       // 원투룸
    'SYCA118': COLSET.oneroom,       // 빌라 | 연립
    'SYCA119': COLSET.house,         // 단독 | 다가구
    'SYCA109,SYCA113,SYCA114': COLSET.commercial, // 상가 | 사무실
    'SYCA116': COLSET.knowledge,     // 지식산업센터
    'SYCA108': COLSET.building,      // 건물 | 빌딩
    'SYCA110': COLSET.lodging,       // 숙박 | 펜션
    'SYCA111': COLSET.factory,       // 공장 | 창고
    'SYCA115': COLSET.land,          // 토지
  };
  // 현재 선택 유형의 헤드라인 컬럼(없으면 아파트 기본)
  const activeTypeColumns = TYPE_COLUMNS[searchFilters.ptType] || COLSET.apt;

  // 헤드라인설정: 사용자가 커스텀 선택하면 그 컬럼, 아니면 유형별 기본 컬럼 사용.
  //  '선택(sel)'은 목록에서 제외했으므로 커스텀 시에도 항상 맨 앞에 유지
  const sheetColumns = (tableColumns && tableColumns.length > 0)
    ? [COL.sel, ...tableColumns.filter((c) => c && c.key !== 'sel')]
    : activeTypeColumns;
  // 저장된 헤드라인 선택 복원(최초 1회) + 변경 시 영속화
  const headlineHydrated = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('properties_headline_v1') || 'null');
      if (Array.isArray(saved) && saved.length) {
        const byKey = new Map(HEADLINE_MASTER.map((c) => [c.key, c]));
        const cols = saved.map((k) => byKey.get(k)).filter(Boolean);
        if (cols.length) setTableColumns(cols);
      }
    } catch { /* ignore */ }
    headlineHydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!headlineHydrated.current) return;
    try { localStorage.setItem('properties_headline_v1', JSON.stringify((tableColumns || []).map((c) => c.key))); } catch { /* ignore */ }
  }, [tableColumns]);

  // 구분 라벨 (매/전/월/기임)
  const getSaleDivLabel = (saleDiv) => saleDivLabel(saleDiv);

  // 정보망 전송 핸들러
  // 전송일시 포맷: "M월 D일 H시 mm분"
  const formatTransmitAt = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}시 ${String(d.getMinutes()).padStart(2, '0')}분`;
  };

  const handleTransfer = async (property) => {
    const alreadyTransmitted = !!property.transmitDt;
    // Electron API를 통해 별도 창으로 열기
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'hub-form',
          data: {
            title: alreadyTransmitted ? '거래정보 (전송됨)' : '거래정보 등록',
            tradeDiv: 'PT',
            propertyData: property,
            ptNo: property.ptNo, // 물건번호 전달
            alreadyTransmitted,                 // 전송 이력 있으면 전송버튼 숨김
            transmittedAt: property.transmitDt || null,
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
        openWithProperty(property);
      }
    } else {
      // Electron API 없으면 기존 방식 사용
      openWithProperty(property);
    }
  };

  // 퀵메뉴 보고서: 항상 신규 작성창을 연다(기존 보고서는 작성창 좌측 '보고서 이력'에서 수정)
  const handleQuickReport = async (property) => {
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'report-builder',
          data: { title: '보고서 작성', property, reportNo: null },
          width: 1400,
          height: 950,
        });
        return;
      } catch (err) { console.error('보고서 창 열기 실패:', err); }
    }
    setReportProperty(property);
    setReportEditNo(null);
    setShowReportBuilder(true);
  };

  // 테이블 셀 렌더링 (subHeaderIndex: 0=첫번째 행, 1=두번째 행)
  // 유형별 단일 헤드라인 컬럼 렌더(금액=한글금액 포맷 / 면적=단위환산 / 그 외 텍스트)
  // 실제 pt_sale DTO 필드명 매핑(만원 금액)
  const MONEY_FIELD = {
    c_loan: 'loanAmt', c_saleamt: 'saleAmt', c_bunyang: 'presaleAmt', c_premium: 'premiumAmt',
    c_balcony: 'expansionAmt', c_option: 'optionAmt', c_rightamt: 'rightValueAmt', c_keymoney: 'layAmt',
    c_moving: 'movingCost', c_deposit_total: 'depositTotal', c_loan_total: 'loanTotal',
    c_deposit_sum: 'depositSum', c_month_sum: 'monSum',
  };
  // 합산 금액(년수입/년지출 = 개별 항목 합)
  const moneySum = (p, key) => {
    if (key === 'c_yincome') return (Number(p.incRentY) || 0) + (Number(p.incMgmtY) || 0) + (Number(p.incEtcY) || 0);
    if (key === 'c_yexpense') return (Number(p.expLaborY) || 0) + (Number(p.expUtilY) || 0) + (Number(p.expLoanY) || 0) + (Number(p.expEtcY) || 0);
    return 0;
  };
  const SUM_KEYS = ['c_yincome', 'c_yexpense'];
  const AREA_FIELD = { c_area_exc: 'excArea', c_area_sup: 'supArea', c_area_gross: 'grossArea', c_area_land: 'landShare' };
  const SINGLE_KEYS = new Set([
    'sel', 'c_type', 'c_dir', 'c_status', 'c_maturity', 'c_updt', 'c_landcategory', 'c_landuse',
    'c_biz', 'c_consult', 'c_buildyear', 'c_rooms', 'c_area', 'c_match',
    // 헤드라인설정 추가 항목
    'c_addr', 'c_top', 'c_regdt', 'c_leasecond', 'c_movein', 'c_balancedate', 'c_houserental', 'c_renewal',
    'c_opt', 'c_roomcnt', 'c_bathcnt', 'c_biztype', 'c_builduse', 'c_expl', 'c_owner', 'c_tenant',
    ...Object.keys(MONEY_FIELD), ...SUM_KEYS, ...Object.keys(AREA_FIELD),
  ]);
  // 유형별 대표 면적(공급/전용/대지/토지) 계산 텍스트
  const renderSingleCol = (property, key) => {
    if (key === 'sel') {
      // 선택 체크박스 + 퀵메뉴(정보망/보고서/진행중) — 글자 없는 색상 사각 버튼(완료=진함, 미완=연함)
      const isTransmitted = !!property.transmitDt;
      const isSelReport = reportNos.includes(property.ptNo);
      const isActive = String(property.ptSts || '').includes('PTSTS01');
      const sq = (bg, brd) => ({ width: '16px', height: '16px', borderRadius: '3px', border: `1px solid ${brd}`, background: bg, cursor: 'pointer', padding: 0, flexShrink: 0 });
      const infoBg = isTransmitted ? '#1d4ed8' : '#dbeafe';   // 정보망(파랑): 전송됨=진함
      const reportBg = isSelReport ? '#4338ca' : '#e0e7ff';   // 보고서: 선택=인디고 (작성됨 별도색 없음)
      const actBg = isActive ? '#c2410c' : '#ffedd5';         // 진행중(주황): 진행중=진함
      // 헤더(선택/정보망/보고서/진행중)와 동일한 4분할 — 선택 칸만 넓게(flex 1.5)
      const seg = (extraFlex) => ({ flex: extraFlex, display: 'flex', alignItems: 'center', justifyContent: 'center' });
      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }} onClick={(e) => e.stopPropagation()}>
          <span style={seg(1.5)}>
            <input type="checkbox" checked={selectedPropertyNos.includes(property.ptNo)}
              onChange={(e) => { e.stopPropagation(); setSelectedPropertyNos(e.target.checked ? [property.ptNo] : []); }}
              className="w-4 h-4 cursor-pointer" />
          </span>
          <span style={seg(1)}>
            <button type="button" title={isTransmitted ? `정보망 전송됨 (${formatTransmitAt(property.transmitDt)})` : '정보망 전송'}
              onClick={(e) => { e.stopPropagation(); handleTransfer(property); }} style={sq(infoBg, isTransmitted ? '#1e3a8a' : '#93c5fd')} />
          </span>
          <span style={seg(1)}>
            <button type="button" title={isSelReport ? '보고서 작성 선택됨' : '보고서 작성 선택/해제'}
              onClick={(e) => { e.stopPropagation(); setReportNos((s) => (s.includes(property.ptNo) ? s.filter((n) => n !== property.ptNo) : [...s, property.ptNo])); }}
              style={sq(reportBg, isSelReport ? '#3730a3' : '#c7d2fe')} />
          </span>
          <span style={seg(1)}>
            <button type="button" title={isActive ? '진행중 해제' : '진행중으로 변경'}
              onClick={(e) => { e.stopPropagation(); askProgressToggle(property); }}
              style={sq(actBg, isActive ? '#9a3412' : '#fdba74')} />
          </span>
        </div>
      );
    }
    if (MONEY_FIELD[key] || SUM_KEYS.includes(key)) {
      const v = SUM_KEYS.includes(key) ? moneySum(property, key) : property[MONEY_FIELD[key]];
      return <div style={{ fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap' }}>{v ? formatKoreanAmount(v) : '-'}</div>;
    }
    if (key === 'c_area') {
      const t = areaDisplay(property);
      return <div style={{ fontSize: '13px', textAlign: 'center' }}>{t || '-'}</div>;
    }
    if (key === 'c_match') {
      // 자사매칭 / 공동망매칭 — 세로 2줄 → 가로 1줄(행 높이 축소)
      return (
        <div style={{ fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap' }}>
          {property.selfMatch || '-'} / {property.networkMatch || '-'}
        </div>
      );
    }
    if (AREA_FIELD[key]) {
      const raw = property[AREA_FIELD[key]] ?? (key === 'c_area_land' ? property.grossArea : undefined);
      const n = Number(raw);
      if (!raw || Number.isNaN(n)) return <div style={{ fontSize: '13px', textAlign: 'center' }}>-</div>;
      const val = areaUnit === '평' ? Math.round(n * 0.3025 * 100) / 100 : n;
      return <div style={{ fontSize: '13px', textAlign: 'center' }}>{val}{areaUnit}</div>;
    }
    // 현임대조건(보증금/월세) — 두 값 조합
    if (key === 'c_leasecond') {
      const dep = property.nowDepAmt, mon = property.nowMonAmt;
      const t = (dep || mon) ? `${dep ? formatKoreanAmount(dep) : '-'} / ${mon ? formatKoreanAmount(mon) : '-'}` : '';
      return <div style={{ fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap' }}>{t || '-'}</div>;
    }
    const txt = (() => {
      switch (key) {
        case 'c_type': return property.aptTyp;
        case 'c_dir': return property.dirStd;
        case 'c_status': return property.currentStatus;
        case 'c_maturity': return fmtYYMMDD(property.mtryDate);
        case 'c_updt': return fmtYYMMDD(property.updDt || property.regDt);
        case 'c_landcategory': return property.landCategory;
        case 'c_landuse': return property.landUse;
        case 'c_biz': return property.businessName;
        case 'c_consult': return property.consultContent || property.ptMemo;
        case 'c_buildyear': return property.compYear ? String(property.compYear).slice(0, 4) : '';
        case 'c_rooms': return property.guestRoomCnt;
        // ── 헤드라인설정 추가 항목(백엔드 매핑) ──
        case 'c_addr': return regionOf(property);
        case 'c_top': return property.top;
        case 'c_regdt': return fmtYYMMDD(property.regDt);
        case 'c_movein': return property.mvnPsbYn;
        case 'c_houserental': return property.houseRental;
        case 'c_renewal': return property.contractRenewalRight;
        case 'c_opt': return property.opt;
        case 'c_biztype': return property.businessType;
        case 'c_builduse': return property.buildingUse || property.mainBuildingUse;
        case 'c_expl': return property.ptExpl;
        case 'c_owner': return property.registryOwner;
        case 'c_tenant': return property.contractTenant;
        case 'c_roomcnt': return property.roomCnt != null && property.roomCnt !== '' ? String(property.roomCnt) : '';
        case 'c_bathcnt': return property.bathCnt != null && property.bathCnt !== '' ? String(property.bathCnt) : '';
        case 'c_balancedate': return fmtYYMMDD(property.exptDate);
        default: return '';
      }
    })();
    return <div style={{ fontSize: '13px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={txt || ''}>{txt || '-'}</div>;
  };

  const renderTableCell = (property, column, subHeaderIndex) => {
    if (SINGLE_KEYS.has(column.key)) return renderSingleCol(property, column.key);
    switch (column.key) {
      // 선택(체크박스) / 매물유형(물건종류)
      case 'select_saletype':
        if (subHeaderIndex === 0) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedPropertyNos.includes(property.ptNo)}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  // 단일선택: 체크 시 해당 행만 선택, 해제 시 비움
                  setSelectedPropertyNos(e.target.checked ? [property.ptNo] : []);
                }}
                className="w-4 h-4 cursor-pointer"
              />
            </div>
          );
        }
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{getPropertyTypeLabel(property.ptType) || '-'}</div>;

      // 건물명 (rowspan)
      case 'building_name':
        return <div style={{ fontSize: '13px' }}>{property.ptName || property.addr4 || '-'}</div>;

      // 자사매칭 / 공동망매칭
      case 'match_info':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.selfMatch || '-'}</div>;
        }
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.networkMatch || '-'}</div>;

      // 상담내용 (rowspan)
      case 'consultation':
        return (
          <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', height: '100%' }}>
            <span className="line-clamp-2">{property.consultContent || property.ptMemo || '-'}</span>
          </div>
        );

      // 지목 / 상호
      case 'category_biz':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.landCategory || '-'}</div>;
        }
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.businessName || '-'}</div>;

      // 소유자 / 소유자 전화번호
      case 'owner_phone': {
        const owners = property.holders?.filter(h => h.holderType === 'OWNER') || [];
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{owners.length > 0 ? owners.map(o => o.holderName).filter(Boolean).join(', ') : '-'}</div>;
        }
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{owners.length > 0 ? owners.map(o => o.holderPhone).filter(Boolean).join(', ') : '-'}</div>;
      }

      // 임차인 / 임차인 전화번호
      case 'tenant_phone': {
        const tenants = property.holders?.filter(h => h.holderType === 'BUYER') || [];
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{tenants.length > 0 ? tenants.map(t => t.holderName).filter(Boolean).join(', ') : '-'}</div>;
        }
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{tenants.length > 0 ? tenants.map(t => t.holderPhone).filter(Boolean).join(', ') : '-'}</div>;
      }

      // 기타 (rowspan 2) — 물건 메모
      case 'etc_col':
        return (
          <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', height: '100%' }}>
            <span className="line-clamp-2">{property.ptMemo || '-'}</span>
          </div>
        );

      // 용도지역 / 지목
      case 'landuse_category':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }} className="truncate">{property.landUse || '-'}</div>;
        }
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.landCategory || '-'}</div>;

      // 상호 / 업종
      case 'biz_name_type':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }}>{property.businessName || '-'}</div>;
        }
        return <div style={{ fontSize: '13px' }}>{property.businessType || '-'}</div>;

      // 건축물용도 / 용도지역
      case 'building_landuse': {
        if (subHeaderIndex === 0) {
          const buildingUseLabel = property.buildingUse
            ? (BUILDING_USES.find(u => u.code === property.buildingUse)?.label || property.buildingUse)
            : '-';
          return <div style={{ fontSize: '13px' }} className="truncate">{buildingUseLabel}</div>;
        }
        return <div style={{ fontSize: '13px' }} className="truncate">{property.landUse || '-'}</div>;
      }

      // 방향 / 탑층
      case 'dir_top':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.dirStd || '-'}</div>;
        }
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.top || '-'}</div>;

      case 'checkbox':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <input
              type="checkbox"
              checked={selectedPropertyNos.includes(property.ptNo)}
              onChange={(e) => {
                e.stopPropagation();
                // 단일선택: 체크 시 해당 행만 선택, 해제 시 비움
                setSelectedPropertyNos(e.target.checked ? [property.ptNo] : []);
              }}
              className="w-4 h-4 cursor-pointer"
            />
          </div>
        );

      case 'actions_quick': {
        const isTransmitted = !!property.transmitDt;                     // 정보망 전송된 적 있음
        const isActive = String(property.ptSts || '').includes('PTSTS01'); // 진행중 물건
        // 미전송/미저장/미선택/대기 상태는 연회색으로 전체 통일, 완료(전송/작성/진행중) 상태만 파스텔
        const qbtn = { width: '100%', padding: '1px 4px', fontSize: '12px', lineHeight: 1.2, borderRadius: '5px', whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 700 };
        const pastel = (bg, color, border) => ({ background: bg, color, border: `1px solid ${border}` });
        const off = pastel('#f1f5f9', '#94a3b8', '#e2e8f0'); // 미전송/미저장 공통 연회색
        return (
          <div className="flex flex-col" style={{ width: '100%', gap: '3px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleTransfer(property); }}
              style={{ ...qbtn, ...(isTransmitted
                ? pastel('#bfdbfe', '#1e3a8a', '#93c5fd')   // 전송됨 (연한 파랑)
                : off) }}
              title={isTransmitted ? `전송됨 (${formatTransmitAt(property.transmitDt)})` : '정보망 전송'}
            >
              정보망전송
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setReportNos((s) => (s.includes(property.ptNo) ? s.filter((n) => n !== property.ptNo) : [...s, property.ptNo])); }}
              style={{ ...qbtn, ...(reportNos.includes(property.ptNo)
                ? pastel('#e0e7ff', '#4338ca', '#c7d2fe')   // 선택됨 (연한 인디고)
                : off) }}
              title="보고서 작성 선택/해제 (상단 '보고서 작성 > 작성' 메뉴에서 작성)"
            >
              {reportNos.includes(property.ptNo) ? '✓ 보고서작성' : '보고서작성'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); askProgressToggle(property); }}
              style={{ ...qbtn, ...(isActive
                ? pastel('#ffedd5', '#9a3412', '#fdba74')   // 진행중 (연한 주황)
                : off) }}
            >
              진행중
            </button>
          </div>
        );
      }

      // 물건명 (단지명 없으면 소재지+지번) — rowspan 2 단일 셀
      case 'name': {
        const isAptAddr = isAptRow(property);
        const jibun = property.jibun || (!isAptAddr ? property.addr4 : '') || '';
        const abbrevSido = (s) => {
          if (!s) return s;
          if (s.startsWith('서울')) return '서울';
          return s.replace(/(특별자치도|특별자치시|특별시|광역시)$/, '');
        };
        const danjiName = isAptAddr ? property.addr4 : property.addr5;
        const region = [abbrevSido(property.addr1), property.addr2, property.addr3, jibun].filter(Boolean).join(' ');
        const val = danjiName || property.ptName || region;
        // 12자 초과 시 …로 축약, 호버(title) 시 전체 물건명 표기
        const display = val && val.length > 12 ? `${val.slice(0, 12)}…` : (val || '-');
        return <div title={val || ''} style={{ fontSize: '13px', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', padding: '0 4px', boxSizing: 'border-box' }}>{display}</div>;
      }

      // 동 / 호 — 각 rowspan 2 단일 셀
      case 'dong':
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.dong ? `${property.dong}동` : '-'}</div>;
      case 'ho':
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.ho ? `${property.ho}호` : '-'}</div>;

      case 'dong_ho':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.dong || '-'}</div>;
        } else {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.ho || '-'}</div>;
        }

      case 'type_area':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.aptTyp || '-'}</div>;
        } else {
          // 면적: 물건유형별 표기(공급/대지/토지) + ㎡/평 환산
          const toPy = areaUnit === '평';
          const conv = (v) => { const n = Number(v); if (!v || Number.isNaN(n)) return null; return toPy ? Math.round(n * 0.3025 * 100) / 100 : n; };
          const code = property.ptType;
          const DANJI = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA104', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA120']; // 아파트/오피스텔/주상복합/분양권/재건축/재개발
          let prefix, val;
          if (code === 'SYCA115') { prefix = '토지'; val = conv(property.landShare ?? property.grossArea ?? property.excArea ?? property.supArea); }
          else if (DANJI.includes(code)) {
            // 공급·전용 둘 다 있으면 전용면적을 표기(전용 우선)
            const exc = conv(property.excArea);
            if (exc != null) { prefix = '전용'; val = exc; }
            else { prefix = '공급'; val = conv(property.supArea); }
          }
          else { prefix = '대지'; val = conv(property.grossArea ?? property.landShare ?? property.excArea ?? property.supArea); }
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{val != null ? `(${prefix})${val}${areaUnit}` : '-'}</div>;
        }

      case 'trade_type': {
        // 4. 거래유형 — 매/전/월/기 4칸 세로. 상태별 문자(활성=매/전/월/기, 생각=생, 예정=예, 보류=보), 해당없음='-'
        const statusMap = saleDivToStatusMap(property.saleDiv);
        return (
          <div style={{ fontSize: '13px', display: 'flex', width: '100%', height: '100%', alignItems: 'stretch' }}>
            {TRADE_DIVISIONS.map((d, i) => {
              const ch = divStatusCh(d, statusMap[d.key]);
              const has = ch !== NONE_CH;
              return <span key={d.key} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: i > 0 ? '1px solid #eef2f7' : 'none', color: has ? '#111827' : '#cbd5e1', fontWeight: has ? 800 : 400 }}>{ch}</span>;
            })}
          </div>
        );
      }

      case 'trade_amount': {
        // 5. 거래금액 — 매매가|전세가|월세가|기타임대 4칸 가로(필터 라벨과 정렬). 해당없음 아닌 구분만 금액, 없으면 '-'
        const statusMap = saleDivToStatusMap(property.saleDiv);
        const amtOf = (key) => {
          switch (key) {
            case 'sale': return property.saleAmt ? formatKoreanAmount(property.saleAmt) : null;
            case 'lease': return property.lesAmt ? formatKoreanAmount(property.lesAmt) : null;
            case 'month': return (property.protAmt || property.monAmt) ? `${formatKoreanAmount(property.protAmt)}/${formatKoreanAmount(property.monAmt)}` : null;
            case 'etc': return (property.etcAmt || property.etcAmt2) ? `${formatKoreanAmount(property.etcAmt)}/${formatKoreanAmount(property.etcAmt2)}` : null;
            default: return null;
          }
        };
        return (
          <div style={{ fontSize: '13px', display: 'flex', width: '100%', height: '100%', alignItems: 'stretch' }}>
            {TRADE_DIVISIONS.map((d, i) => {
              const active = statusMap[d.key] && statusMap[d.key] !== 'none';
              const v = active ? amtOf(d.key) : null;
              return (
                <span key={d.key} style={{ flex: [1, 1, 1.5, 1.2][i], minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: i > 0 ? '1px solid #eef2f7' : 'none', color: v ? '#111827' : '#cbd5e1', fontWeight: v ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>{v || '-'}</span>
              );
            })}
          </div>
        );
      }

      case 'owner_buyer':
        const owners = property.holders?.filter(h => h.holderType === 'OWNER') || [];
        const buyers = property.holders?.filter(h => h.holderType === 'BUYER') || [];
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }}>{owners.length > 0 ? owners.map(o => o.holderName).join(', ') : '-'}</div>;
        } else {
          return <div style={{ fontSize: '13px' }}>{buyers.length > 0 ? buyers.map(b => b.holderName).join(', ') : '-'}</div>;
        }

      case 'phone':
        const ownersWithPhone = property.holders?.filter(h => h.holderType === 'OWNER') || [];
        const buyersWithPhone = property.holders?.filter(h => h.holderType === 'BUYER') || [];
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }}>{ownersWithPhone.length > 0 ? ownersWithPhone.map(o => o.holderPhone).filter(Boolean).join(', ') : '-'}</div>;
        } else {
          return <div style={{ fontSize: '13px' }}>{buyersWithPhone.length > 0 ? buyersWithPhone.map(b => b.holderPhone).filter(Boolean).join(', ') : '-'}</div>;
        }

      case 'status_date':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }}>{property.currentStatus || '-'}</div>;
        } else {
          // 현임대조건: 보증금/월세
          const lease = [];
          if (property.protAmt) lease.push(formatKoreanAmount(property.protAmt));
          if (property.monAmt) lease.push(formatKoreanAmount(property.monAmt));
          return <div style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{lease.length ? lease.join('/') : '-'}</div>;
        }

      // 방향 / 융자금 (타입 우측)
      case 'dir_loan':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.dirStd || '-'}</div>;
        }
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{formatPrice(property.loanAmt)}</div>;

      // 만기일 / 잔금예정일 (현상태 우측)
      case 'maturity_balance':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{fmtYYMMDD(property.mtryDate)}</div>;
        }
        return <div style={{ fontSize: '13px', textAlign: 'center' }}>{fmtYYMMDD(property.rmdDate)}</div>;

      case 'room_bath':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.roomCnt || '-'}</div>;
        } else {
          return <div style={{ fontSize: '13px', textAlign: 'center' }}>{property.bathCnt || '-'}</div>;
        }

      case 'rental':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }}>{property.houseRental || '-'}</div>;
        } else {
          return <div style={{ fontSize: '13px' }}>{property.contractRenewalRight || '-'}</div>;
        }

      case 'pet':
        // 11. 반려동물 (rowspan 2 효과)
        return (
          <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {property.petYn === 'Y' ? '가능' : '불가'}
          </div>
        );

      case 'land_building':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }} className="truncate">{property.landUse || '-'}</div>;
        } else {
          const buildingUseLabel = property.buildingUse
            ? BUILDING_USES.find(u => u.code === property.buildingUse)?.label || property.buildingUse
            : '-';
          return <div style={{ fontSize: '13px' }} className="truncate">{buildingUseLabel}</div>;
        }

      case 'category':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }}>{property.landCategory || '-'}</div>;
        } else {
          return <div style={{ fontSize: '13px' }} className="truncate">{property.otherRestrictions || '-'}</div>;
        }

      case 'business_info':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }}>{property.businessType || '-'}</div>;
        } else {
          return <div style={{ fontSize: '13px' }}>{property.businessName || '-'}</div>;
        }

      case 'date_info':
        if (subHeaderIndex === 0) {
          return <div style={{ fontSize: '13px' }}>{fmtYYMMDD(property.updDt)}</div>;
        } else {
          // 등록일: API 응답 필드는 regDt (crtDt 아님)
          return <div style={{ fontSize: '13px' }}>{fmtYYMMDD(property.regDt || property.crtDt)}</div>;
        }

      case 'description':
        // 14. 물건특징 (rowspan 2 효과)
        return (
          <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', height: '100%' }}>
            <span className="line-clamp-2">{property.ptExpl || '-'}</span>
          </div>
        );
      // ========== 2줄 조합 컬럼들 끝 ==========
      case 'ptNo':
        return property.ptNo || '-';
      case 'prgSts':
        const prgStsLabels = {
          'PRGSTS01': '대기',
          'PRGSTS02': '진행',
          'PRGSTS03': '보류',
          'PRGSTS04': '완료',
          'PRGSTS05': '취소',
        };
        return prgStsLabels[property.prgSts] || property.prgSts || '-';
      case 'ptSts':
        return property.ptSts || '-';
      case 'houseRental':
        return property.houseRental === 'Y' ? '가' : '부';
      case 'petYn':
        return property.petYn === 'Y' ? '가' : '부';
      case 'region':
        const address = [property.addr1, property.addr2, property.addr3].filter(Boolean).join(' ');
        return <div className="text-sm max-w-xs truncate">{address || '-'}</div>;
      case 'ptType':
        return getPropertyTypeLabel(property.ptType) || '-';
      case 'ptName':
        return property.ptName || '-';
      case 'danjiCode':
        return property.danjiCode || '-';
      case 'dong':
        return property.dong || '-';
      case 'ho':
        return property.ho || '-';
      case 'floor':
        return property.floor || '-';
      case 'top':
        return property.top || '-';
      case 'aptTyp':
        return property.aptTyp || '-';
      case 'areas':
        return (
          <div className="flex flex-col text-xs">
            <span className="text-gray-600">공급: {property.supArea ? property.supArea.toFixed(2) : '-'}</span>
            <span className="text-gray-600">전용: {property.excArea ? property.excArea.toFixed(2) : '-'}</span>
          </div>
        );
      case 'supArea':
        return property.supArea ? property.supArea.toFixed(2) : '-';
      case 'excArea':
        return property.excArea ? property.excArea.toFixed(2) : '-';
      case 'landShare':
        return property.landShare ? property.landShare.toFixed(2) : '-';
      case 'roomCnt':
        return property.roomCnt || '-';
      case 'bathCnt':
        return property.bathCnt || '-';
      case 'dirStd':
        return property.dirStd || '-';
      case 'heatMethod':
        return property.heatMethod || '-';
      case 'heatFuel':
        return property.heatFuel || '-';
      case 'balcExt':
        return property.balcExt === 'Y' ? '확장' : '미확장';
      case 'pkCnt':
        return property.pkCnt || '-';
      case 'maintCost':
        return property.maintCost ? `${property.maintCost.toLocaleString()}원` : '-';
      case 'saleDiv':
        return getSaleDivLabel(property.saleDiv);
      case 'saleAmt':
        return <span className="font-medium text-indigo-600">{formatPrice(property.saleAmt)}</span>;
      case 'lesAmt':
        return <span className="font-medium text-purple-600">{formatPrice(property.lesAmt)}</span>;
      case 'protAmt':
        return <span className="font-medium text-blue-600">{formatPrice(property.protAmt)}</span>;
      case 'monAmt':
        return <span className="font-medium text-green-600">{formatPrice(property.monAmt)}</span>;
      case 'etcAmt':
        return formatPrice(property.etcAmt);
      case 'nowDepAmt':
        return formatPrice(property.nowDepAmt);
      case 'nowMonAmt':
        return formatPrice(property.nowMonAmt);
      case 'loanAmt':
        return formatPrice(property.loanAmt);
      case 'loanAmtAft':
        return formatPrice(property.loanAmtAft);
      case 'mvnPsbYn':
        return property.mvnPsbYn === 'Y' ? '즉시입주' : '협의';
      case 'mtryDate':
        return fmtYYMMDD(property.mtryDate);
      case 'exptMovDate':
        return fmtYYMMDD(property.exptMovDate);
      case 'compYear':
        return property.compYear || '-';
      case 'opt':
        return <span className="max-w-xs truncate block text-sm">{property.opt || '-'}</span>;
      case 'cnNo':
        return property.cnNo || '-';
      case 'cnDt':
        return fmtYYMMDD(property.cnDt);
      case 'cnType':
        return property.cnType || '-';
      case 'tradeAmt':
        return <span className="font-medium text-red-600">{formatPrice(property.tradeAmt)}</span>;
      case 'cnAmt':
        return formatPrice(property.cnAmt);
      case 'midAmt':
        return formatPrice(property.midAmt);
      case 'rmdAmt':
        return formatPrice(property.rmdAmt);
      case 'owner':
        // holders 배열에서 OWNER 타입 찾기
        const ownersList = property.holders?.filter(h => h.holderType === 'OWNER') || [];
        return ownersList.length > 0 ? ownersList.map(o => o.holderName).join(', ') : '-';
      case 'ownerPhone':
        const ownerPhoneList = property.holders?.filter(h => h.holderType === 'OWNER') || [];
        return ownerPhoneList.length > 0 ? ownerPhoneList.map(o => o.holderPhone).filter(Boolean).join(', ') : '-';
      case 'buyer':
        // holders 배열에서 BUYER 타입 찾기
        const buyersList = property.holders?.filter(h => h.holderType === 'BUYER') || [];
        return buyersList.length > 0 ? buyersList.map(b => b.holderName).join(', ') : '-';
      case 'buyerPhone':
        const buyerPhoneList = property.holders?.filter(h => h.holderType === 'BUYER') || [];
        return buyerPhoneList.length > 0 ? buyerPhoneList.map(b => b.holderPhone).filter(Boolean).join(', ') : '-';
      case 'currentStatus':
        return property.currentStatus || '-';
      case 'landUse':
        return <span className="max-w-xs truncate block text-sm">{property.landUse || '-'}</span>;
      case 'buildingUse':
        return <span className="max-w-xs truncate block text-sm">{property.buildingUse || '-'}</span>;
      case 'landCategory':
        return property.landCategory || '-';
      case 'otherRestrictions':
        return <span className="max-w-xs truncate block text-sm">{property.otherRestrictions || '-'}</span>;
      case 'contractRenewalRight':
        return property.contractRenewalRight || '-';
      case 'ptExpl':
        return <span className="max-w-xs truncate block text-sm">{property.ptExpl || '-'}</span>;
      case 'addr1':
        return property.addr1 || '-';
      case 'addr2':
        return property.addr2 || '-';
      case 'addr3':
        return property.addr3 || '-';
      case 'ptMemo':
        return <span className="max-w-xs truncate block text-gray-700 text-sm">{property.ptMemo || '-'}</span>;
      case 'updDt':
        return <span className="text-gray-700 text-sm">{fmtYYMMDD(property.updDt)}</span>;
      case 'crtDt':
        return <span className="text-gray-700 text-sm">{fmtYYMMDD(property.regDt)}</span>;
      case 'actions':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(property);
              }}
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                color: '#4f46e5',
                background: 'white',
                border: '1px solid #4f46e5',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '60px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#eef2ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
              }}
            >
              수정
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(property.ptNo);
              }}
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                color: '#dc2626',
                background: 'white',
                border: '1px solid #dc2626',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '60px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#fef2f2';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
              }}
            >
              삭제
            </button>
          </div>
        );
      default:
        return property[column.key] || '-';
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 헤더 클릭 정렬(매물유형/등록일) — 현재 목록 클라이언트 정렬
  const sortedForTable = (() => {
    if (!headerSort.col) return filteredProperties;
    const dir = headerSort.dir === 'desc' ? -1 : 1;
    const arr = [...filteredProperties];
    arr.sort((a, b) => {
      if (headerSort.col === 'saletype') {
        return String(getPropertyTypeLabel(a.ptType) || '').localeCompare(String(getPropertyTypeLabel(b.ptType) || ''), 'ko') * dir;
      }
      const va = String(a.regDt || a.crtDt || ''); const vb = String(b.regDt || b.crtDt || '');
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
    return arr;
  })();

  // 테이블 데이터 준비 (고유 id 추가)
  const tableData = sortedForTable.map((property) => ({
    ...property,
    id: property.ptNo,
  }));

  // (물건리스트 사이드바는 데이터 없어도 항상 표시 — 이전 hasSummaryListForTab 게이트 제거)

  // 물건리스트 텍스트 검색 필터 + 집계(단지 수 / 총 건수)
  //  · 정렬: 내가 보유한 데이터(건수) 많은 순
  const filteredSummaries = summaries
    .filter(s => (s.displayName || '').toLowerCase().includes(summarySearch.trim().toLowerCase()))
    .sort((a, b) => (Number(b.propertyCount) || 0) - (Number(a.propertyCount) || 0));

  // 좌측 '모든유형'일 때: 물건유형별 건수(있는 유형만). 클릭 시 해당 유형으로 필터
  const isAllTypeSelected = !searchFilters.ptType;
  const PT_TYPE_GROUPS = [
    { label: '아파트', value: 'SYCA101,SYCA103', codes: ['SYCA101', 'SYCA103'] },
    { label: '오피스텔', value: 'SYCA102', codes: ['SYCA102'] },
    { label: '아파트분양권', value: 'SYCA105,SYCA107', codes: ['SYCA105', 'SYCA107'] },
    { label: '오피스텔분양권', value: 'SYCA106', codes: ['SYCA106'] },
    { label: '지식산업센터', value: 'SYCA116', codes: ['SYCA116'] },
    { label: '재건축', value: 'SYCA104', codes: ['SYCA104'] },
    { label: '재개발', value: 'SYCA120', codes: ['SYCA120'] },
  ];
  const typeCountMap = (typeCounts || []).reduce((acc, t) => {
    acc[t.ptType] = (acc[t.ptType] || 0) + (t.cnt || 0);
    return acc;
  }, {});
  const typeGroupRows = PT_TYPE_GROUPS
    .map((g) => ({
      ...g,
      count: g.codes.reduce((s, c) => s + (typeCountMap[c] || 0), 0),
      danjiCount: filteredSummaries.filter((s) => g.codes.includes(s.ptType)).length,
    }))
    .filter((g) => g.count > 0);
  // 좌측 패널에서 펼쳐본 유형(panelType)의 단지 목록 — 상단 필터는 건드리지 않고 로우만 노출
  const panelTypeGroup = panelType ? typeGroupRows.find((g) => g.value === panelType) : null;
  const panelFilteredSummaries = panelTypeGroup
    ? filteredSummaries.filter((s) => panelTypeGroup.codes.includes(s.ptType))
    : [];
  // 상단 유형 탭 선택 시: 좌측 리스트도 선택 유형 코드에 해당하는 것만(백엔드가 전체를 줘도 프론트에서 보정)
  //  · 아파트 탭 → 아파트 단지만, 상가/건물 등 비단지 → 해당 유형 물건명만
  const selectedTypeCodes = searchFilters.ptType ? String(searchFilters.ptType).split(',').filter(Boolean) : null;
  const typeFilteredSummaries = selectedTypeCodes
    ? filteredSummaries.filter((s) => selectedTypeCodes.includes(s.ptType))
    : filteredSummaries;
  // 좌측 패널 로우: 모든유형이면 펼쳐본 유형의 단지들, 특정 유형이면 그 유형만
  const summaryRowsToShow = isAllTypeSelected ? panelFilteredSummaries : typeFilteredSummaries;

  // 좌측 물건리스트에 목록이 있고 아직 선택이 없으면 0번째 자동 선택(선택해야 테이블 로드)
  const autoPickKey = summaryRowsToShow.length > 0 ? summaryRowsToShow[0].groupKey : '';
  useEffect(() => {
    if (selectedSummary) return;
    if (summaryRowsToShow.length === 0) return;
    setSelectedSummary(summaryRowsToShow[0]);
    setPagination(prev => ({ ...prev, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPickKey, selectedSummary]);

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = (e, property) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0 });
  };

  const handleNewProperty = () => {
    handleAddProperty();
    handleCloseContextMenu();
  };

  // 전역 클릭 이벤트로 컨텍스트 메뉴 닫기
  useEffect(() => {
    if (contextMenu.show) {
      document.addEventListener('click', handleCloseContextMenu);
      return () => document.removeEventListener('click', handleCloseContextMenu);
    }
  }, [contextMenu.show]);

  return (
    <div className="prop-page-container" style={{ zoom: zoomNum / 100 }}>

      {/* 메인 컨텐츠 */}
      <div className="prop-main-content">
        <div className="prop-content-wrapper">
          <div className="prop-table-section">
            {/* 검색 조건 - 이미지와 같은 UI */}
            <div className="prop-search-box" style={{
              position: 'relative',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              marginBottom: '5px',
            }}>
              {/* 우상단 액션(카톡문의·홈으로·상담모드) — 물건유형 line에 여백 있으면 그 우측 끝에 절대배치 */}
              {(viewMode === 'sheet' || viewMode === 'layout') && !btnsWrapped && (
                <div style={{ position: 'absolute', top: '5px', right: '8px', zIndex: 5 }}>
                  <MenuTopActions showPhone={false} consult />
                </div>
              )}
              {/* 세번째 행 - 상세 검색 조건 (시트/배치도 모두 유지) */}
              {(viewMode === 'sheet' || viewMode === 'layout') && (
              <div style={{ padding: '5px 8px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {/* 물건종류 필터 */}
                <div ref={typeBtnsRef} style={{ display: 'flex', gap: '4px', marginBottom: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {typeButtons.filter((t) => t.value).map((type, idx) => (
                    <button
                      key={type.value}
                      draggable
                      onDragStart={() => { typeDragIdx.current = idx; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleTypeDrop(idx)}
                      onClick={() => handleFilterChange('ptType', type.value)}
                      title="드래그하여 순서 변경"
                      style={{
                        padding: '6px 8px',
                        fontSize: '14px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        backgroundColor: searchFilters.ptType === type.value ? '#4f46e5' : 'white',
                        cursor: 'grab',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.2',
                        minWidth: '48px',
                        textAlign: 'center',
                        color: searchFilters.ptType === type.value ? 'white' : '#000',
                        fontWeight: searchFilters.ptType === type.value ? '700' : '400',
                        transition: 'all 0.2s',
                        boxShadow: searchFilters.ptType === type.value ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* 전체물건/진행중 탭 + 정렬방식 */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '0', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { value: 'all', label: '전체물건' },
                      { value: 'progress', label: '진행중' },
                    ].map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        style={{
                          padding: '4px 16px',
                          fontSize: '14px',
                          fontWeight: activeTab === tab.value ? '700' : '400',
                          border: '1px solid #d1d5db',
                          borderRadius: '3px',
                          backgroundColor: activeTab === tab.value ? '#4f46e5' : 'white',
                          cursor: 'pointer',
                          color: activeTab === tab.value ? 'white' : '#000'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* 배치도검색 버튼 — 숨김 처리
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '12px', borderLeft: '2px solid #d1d5db' }}>
                    <button
                      onClick={async () => {
                        if (window.electronAPI?.modal) {
                          try {
                            await window.electronAPI.modal.open({
                              type: 'layout-view',
                              data: { title: '배치도' },
                              width: 1400,
                              height: 900,
                            });
                          } catch (err) {
                            console.error('배치도 창 열기 실패:', err);
                            setShowLayoutPopup(true);
                          }
                        } else {
                          setShowLayoutPopup(true);
                        }
                      }}
                      style={{ padding: '5px 14px', fontSize: '14px', fontWeight: '500', border: '1px solid #4f46e5', borderRadius: '4px', backgroundColor: '#4f46e5', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      배치도검색
                    </button>
                  </div>
                  */}

                  {/* 보고서 작성 — 데이터행에서 '보고서작성' 선택 시 강조(선택 건수 표시) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '12px', borderLeft: '2px solid #d1d5db' }}>
                    <span style={{ fontSize: '14px', color: reportNos.length > 0 ? '#4f46e5' : '#000', fontWeight: '700', whiteSpace: 'nowrap' }}>보고서 작성{reportNos.length > 0 ? ` (${reportNos.length})` : ''}</span>
                    <select
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        if (v === 'create') handleCreateReport();
                        else if (v === 'reset') setReportNos([]);
                        else if (v === 'edit') handleEditReport();
                        else if (v === 'list') toast.info('목록 기능은 준비 중입니다.');
                        else if (v === 'manage') setShowReportManage(true);
                      }}
                      style={{ padding: '4px 8px', fontSize: '14px', borderRadius: '4px', cursor: 'pointer',
                        border: reportNos.length > 0 ? '1px solid #6366f1' : '1px solid #e5e7eb',
                        backgroundColor: reportNos.length > 0 ? '#eef2ff' : 'white',
                        color: reportNos.length > 0 ? '#4f46e5' : '#000',
                        fontWeight: reportNos.length > 0 ? 700 : 400,
                        boxShadow: reportNos.length > 0 ? '0 0 0 2px rgba(99,102,241,0.25)' : 'none' }}
                    >
                      <option value="">선택</option>
                      <option value="create">작성{reportNos.length > 0 ? `(${reportNos.length})` : ''}</option>
                      <option value="reset">선택 초기화</option>
                    </select>
                  </div>

                  {/* 헤드라인 설정 (버튼 - 바로 모달 열기) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '12px', borderLeft: '2px solid #d1d5db' }}>
                    <button
                      onClick={() => setShowTableSettings(true)}
                      style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000', whiteSpace: 'nowrap' }}
                    >
                      헤드라인 설정
                    </button>
                  </div>

                  {/* 엑셀 업로드 (색 없는 버튼) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '12px', borderLeft: '2px solid #d1d5db' }}>
                    <button
                      onClick={handleExcelUpload}
                      style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      엑셀 업로드
                    </button>
                  </div>

                  {/* 일괄변경수신 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '12px', borderLeft: '2px solid #d1d5db' }}>
                    <span style={{ fontSize: '14px', color: '#000', fontWeight: '600', whiteSpace: 'nowrap' }}>일괄변경수신 및 요청</span>
                    <select value={inquiryCategory} onChange={(e) => handleBatchChangeSelect(e.target.value)} style={{ padding: '4px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000' }}>
                      <option value="">선택</option>
                      <option value="주소">주소</option>
                      <option value="물건유형">물건유형</option>
                      <option value="단지명">단지명</option>
                      <option value="동">동</option>
                      <option value="호">호</option>
                    </select>
                    {/* 처리완료 확인 버튼 + 신규(N) 빨간 깜빡임 배지 */}
                    {bulkDone.length > 0 && (
                      <button type="button" onClick={openBulkDone}
                        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 600, padding: '4px 10px', border: '1px solid #4f46e5', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        처리결과
                        {bulkNewCount > 0 && (
                          <span className="bulk-new-badge" style={{ position: 'absolute', top: '-8px', right: '-8px', minWidth: '17px', height: '17px', padding: '0 4px', borderRadius: '9px', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>N</span>
                        )}
                      </button>
                    )}
                    <style>{'@keyframes bulkBlink{0%,100%{opacity:1}50%{opacity:0.2}} .bulk-new-badge{animation:bulkBlink 0.9s ease-in-out infinite;box-shadow:0 0 0 2px rgba(239,68,68,0.25)}'}</style>
                  </div>

                  {/* 물건유형 line 여백 부족(줄바꿈) 시 — 이 line(일괄변경 및 요청) 우측 끝으로 */}
                  {btnsWrapped && (
                    <div style={{ marginLeft: 'auto' }}>
                      <MenuTopActions showPhone={false} consult />
                    </div>
                  )}

                </div>

              </div>
              )}
            </div>

            {/* 데이터 목록 영역 (물건리스트 + 테이블) */}
            <div style={{ display: 'flex', flex: 1, gap: '0', overflow: 'hidden' }}>
              {/* 물건리스트 사이드바 — 데이터 없어도 항상 표시 */}
              {(
                <div style={{
                  width: showSummaryList ? '256px' : '48px',
                  backgroundColor: 'white',
                  borderRight: '1px solid #e5e7eb',
                  transition: 'width 0.3s ease',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div style={{
                    padding: showSummaryList ? '0.75rem' : '0.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: showSummaryList ? 'column' : 'row',
                    alignItems: showSummaryList ? 'stretch' : 'center',
                    gap: showSummaryList ? '8px' : '0',
                  }}>
                    {showSummaryList && (
                      <>
                        {/* 상단: 물건리스트 + 접기 (건수 표기 제거) */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h3 className="font-medium text-gray-900">
                            물건리스트
                          </h3>
                          <button
                            onClick={() => setShowSummaryList(false)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="접기"
                          >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                        {/* 검색: 해당 창 내 텍스트 검색 (실시간 필터 + 검색 버튼) */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="text"
                            value={summarySearch}
                            onChange={(e) => setSummarySearch(e.target.value)}
                            placeholder="리스트검색"
                            style={{ flex: 1, minWidth: 0, padding: '5px 8px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '4px', color: '#000', outline: 'none' }}
                          />
                          <button
                            type="button"
                            style={{ flexShrink: 0, padding: '5px 12px', fontSize: '14px', fontWeight: 600, border: '1px solid #4f46e5', borderRadius: '4px', background: '#4f46e5', color: 'white', cursor: 'pointer' }}
                          >
                            검색
                          </button>
                        </div>
                      </>
                    )}
                    {!showSummaryList && (
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => setShowSummaryList(true)}
                          className="p-1 hover:bg-gray-100 rounded mb-2"
                          title="펼치기"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                        <div style={{
                          writingMode: 'vertical-rl',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#4b5563',
                          letterSpacing: '0.1em'
                        }}>
                          물건리스트
                        </div>
                      </div>
                    )}
                  </div>
                  {showSummaryList && (
                    <>
                      <div className="p-2 overflow-y-auto" style={{ flex: 1 }}>
                        {/* 모든유형: 유형별 건수만 표시. 유형 클릭 시(상단 필터는 그대로) 배치도/시트 로우 노출 */}
                        {isAllTypeSelected && !panelType && typeGroupRows.length > 0 ? (
                          <div>
                            {typeGroupRows.map((g) => (
                              <div
                                key={g.value}
                                onClick={() => setPanelType(g.value)}
                                className="mb-1 rounded cursor-pointer hover:bg-indigo-50"
                                style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e5e7eb', background: '#f8fafc' }}
                                title="배치도/시트 보기"
                              >
                                <span className="text-sm text-gray-800">{g.label}({g.danjiCount})</span>
                                <span className="text-xs font-medium text-gray-600">{g.count}건</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                        <>
                        {isAllTypeSelected && panelType && (
                          <button
                            onClick={() => { setPanelType(null); handleSummaryClick(null); }}
                            className="w-full mb-2 flex items-center justify-between px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                          >
                            <span>← 유형 목록</span>
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {summaryRowsToShow.length === 0 && (
                          <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 600, padding: '24px 8px' }}>
                            {summaries.length === 0 ? '등록된 물건이 없습니다' : '검색 결과가 없습니다'}
                          </div>
                        )}
                        {summaryRowsToShow.map(summary => {
                          const isDanji = !!summary.danjiCode; // 단지형(아파트/오피스텔 등)만 배치도·시트 버튼
                          const isSelected = selectedSummary?.groupKey === summary.groupKey;
                          const layoutActive = viewMode === 'layout' && isSelected;
                          const sheetActive = viewMode === 'sheet' && isSelected;
                          return (
                            <div
                              key={summary.groupKey}
                              // 비단지형은 버튼 없이 행 클릭으로 바로 시트 필터
                              onClick={() => (isDanji ? handleSummaryClick(summary) : selectSummaryForView(summary, 'sheet'))}
                              className={`mb-1 rounded transition-colors cursor-pointer ${isSelected ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}
                              style={{ padding: '3px 8px', border: '1px solid #e5e7eb' }}
                            >
                              {/* 1줄: 단지명/동 + (단지형만) 배치도 */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <span className={`font-medium truncate text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>{summary.displayName}</span>
                                {isDanji && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); selectSummaryForView(summary, 'layout'); }}
                                    title="배치도로 보기"
                                    style={{ flexShrink: 0, width: '46px', textAlign: 'center', padding: '1px 0', fontSize: '11px', fontWeight: 600, border: '1px solid #4f46e5', borderRadius: '4px', background: layoutActive ? '#4f46e5' : 'white', color: layoutActive ? 'white' : '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  >
                                    배치도
                                  </button>
                                )}
                              </div>
                              {/* 2줄: X건 / Y세대 + (단지형만) 시트 */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '2px' }}>
                                <span className="text-xs text-gray-600">
                                  {summary.propertyCount}건{summary.familyCnt != null ? ` / ${Number(summary.familyCnt).toLocaleString()}세대` : ''}
                                </span>
                                {isDanji && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); selectSummaryForView(summary, 'sheet'); }}
                                    title="시트로 보기"
                                    style={{ flexShrink: 0, width: '46px', textAlign: 'center', padding: '1px 0', fontSize: '11px', fontWeight: 600, border: '1px solid #64748b', borderRadius: '4px', background: sheetActive ? '#64748b' : 'white', color: sheetActive ? 'white' : '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  >
                                    시트
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 테이블 카드 */}
              <Card
                className="prop-table-card"
                padding="none"
                style={{ flex: 1, minWidth: 0 }}
              >
              {viewMode === 'sheet' ? (
                <PropertyListTable
                  menuId="properties"
                  fixedWidth
                  fixedColumns
                  inlineSub
                  allColumns={sheetColumns}
                  defaultColumns={sheetColumns}
                  data={tableData}
                  isLoading={loading}
                  renderCell={renderTableCell}
                  onRowClick={handleRowClick}
                  onRowSelect={handleRowSelect}
                  onRowEdit={handleEdit}
                  onRowCopy={handleCopyProperty}
                  currentPage={pagination.page}
                  totalPages={Math.ceil(pagination.total / pagination.pageSize)}
                  pageSize={pagination.pageSize}
                  onPageChange={handlePageChange}
                  emptyMessage="검색 결과가 없습니다"
                  onExcelUpload={handleExcelUpload}
                  onAddProperty={handleAddProperty}
                  onAddPropertyV2={handleAddPropertyV2}
                  onEditSelected={handleEditSelected}
                  onDeleteSelected={handleDeleteSelected}
                  hideDelete
                  onCreateReport={handleCreateReport}
                  onColorFill={handleColorFill}
                  colorFillRequest={colorFillRequest}
                  selectedCount={selectedPropertyNos.length}
                  rightLeadContent={
                    <div className="prop-topbar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* 배율 (페이지 확대) */}
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
                      <select value={rowCount} onChange={(e) => setRowCount(e.target.value)} style={{ padding: '4px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000' }}>
                        <option value="50">50줄</option>
                        <option value="100">100줄</option>
                        <option value="all">전체</option>
                      </select>
                    </div>
                  }
                  leftContent={
                    <div className="prop-topbar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* 동 필터 제거, 층 필터는 상단 툴바(금액 버튼 우측)로 이동 */}
                    <div style={{
                      display: 'flex',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}>
                      <button
                        onClick={() => handleSaleDivToggle('')}
                        style={{ padding: '6px 12px', fontSize: '14px', fontWeight: searchFilters.saleDiv === '' ? '600' : '400', border: 'none', borderRight: '1px solid #e5e7eb', backgroundColor: searchFilters.saleDiv === '' ? '#4f46e5' : 'white', cursor: 'pointer', color: searchFilters.saleDiv === '' ? 'white' : '#000', transition: 'all 0.2s' }}
                      >
                        전체
                      </button>
                      <button
                        onClick={() => handleSaleDivToggle('SALEDIV01')}
                        style={{ padding: '6px 12px', fontSize: '14px', fontWeight: isSaleDivSelected('SALEDIV01') ? '600' : '400', border: 'none', borderRight: '1px solid #e5e7eb', backgroundColor: isSaleDivSelected('SALEDIV01') ? '#4f46e5' : 'white', cursor: 'pointer', color: isSaleDivSelected('SALEDIV01') ? 'white' : '#000', transition: 'all 0.2s' }}
                      >
                        매매
                      </button>
                      <button
                        onClick={() => handleSaleDivToggle('SALEDIV02')}
                        style={{ padding: '6px 12px', fontSize: '14px', fontWeight: isSaleDivSelected('SALEDIV02') ? '600' : '400', border: 'none', borderRight: '1px solid #e5e7eb', backgroundColor: isSaleDivSelected('SALEDIV02') ? '#4f46e5' : 'white', cursor: 'pointer', color: isSaleDivSelected('SALEDIV02') ? 'white' : '#000', transition: 'all 0.2s' }}
                      >
                        전세
                      </button>
                      <button
                        onClick={() => handleSaleDivToggle('SALEDIV03')}
                        style={{ padding: '6px 12px', fontSize: '14px', fontWeight: isSaleDivSelected('SALEDIV03') ? '600' : '400', border: 'none', borderRight: '1px solid #e5e7eb', backgroundColor: isSaleDivSelected('SALEDIV03') ? '#4f46e5' : 'white', cursor: 'pointer', color: isSaleDivSelected('SALEDIV03') ? 'white' : '#000', transition: 'all 0.2s' }}
                      >
                        월세
                      </button>
                      <button
                        onClick={() => handleSaleDivToggle('SALEDIV04')}
                        style={{ padding: '6px 12px', fontSize: '14px', fontWeight: isSaleDivSelected('SALEDIV04') ? '600' : '400', border: 'none', backgroundColor: isSaleDivSelected('SALEDIV04') ? '#4f46e5' : 'white', cursor: 'pointer', color: isSaleDivSelected('SALEDIV04') ? 'white' : '#000', transition: 'all 0.2s' }}
                      >
                        기타임대
                      </button>
                    </div>
                    {/* 면적 / 금액 필터 버튼 (상단에서 월세·기타임대 라인으로 이동) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid #d1d5db' }}>
                      <button
                        type="button"
                        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setAreaMenu({ x: r.left, y: r.bottom + 4 }); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '14px', fontWeight: 600, border: `1px solid ${(areaFilter.min !== '' || areaFilter.max !== '') ? '#4f46e5' : '#e5e7eb'}`, borderRadius: '4px', background: (areaFilter.min !== '' || areaFilter.max !== '') ? '#eef2ff' : 'white', color: (areaFilter.min !== '' || areaFilter.max !== '') ? '#4f46e5' : '#000', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        면적
                        <svg width="12" height="12" viewBox="0 0 24 24"
                          fill={(areaFilter.min !== '' || areaFilter.max !== '') ? '#4f46e5' : 'none'} stroke={(areaFilter.min !== '' || areaFilter.max !== '') ? '#4f46e5' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        {(areaFilter.min !== '' || areaFilter.max !== '') && (
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{`${areaFilter.min || 0}~${areaFilter.max || ''}${areaFilter.unit}`}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setAmountMenu({ x: r.left, y: r.bottom + 4 }); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '14px', fontWeight: 600, border: `1px solid ${amtActive ? '#4f46e5' : '#e5e7eb'}`, borderRadius: '4px', background: amtActive ? '#eef2ff' : 'white', color: amtActive ? '#4f46e5' : '#000', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        금액
                        <svg width="12" height="12" viewBox="0 0 24 24"
                          fill={amtActive ? '#4f46e5' : 'none'} stroke={amtActive ? '#4f46e5' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        {amtActive && (
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>
                            {(amountFilter.min !== '' || amountFilter.max !== '') ? `${amountFilter.min || 0}~${amountFilter.max || ''}${amountFilter.unit}` : ''}
                            {((amountFilter.monMin ?? '') !== '' || (amountFilter.monMax ?? '') !== '') ? ` 월${amountFilter.monMin || 0}~${amountFilter.monMax || ''}${amountFilter.monUnit}` : ''}
                          </span>
                        )}
                      </button>
                      {/* 층 필터 — 금액 버튼 우측 */}
                      <span style={{ fontSize: '14px', color: '#000', fontWeight: 600, whiteSpace: 'nowrap', paddingLeft: '4px' }}>층</span>
                      <select value={floorFilter} onChange={(e) => { setFloorFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} style={{ padding: '4px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000' }}>
                        <option value="all">전부</option>
                        <option value="first">1층만</option>
                        <option value="top">탑층만</option>
                        <option value="exceptFirst">1층제외</option>
                      </select>
                    </div>
                    </div>
                  }
                />
              ) : (
                <div style={{ height: '100%', overflowY: 'auto' }}>
                  <LayoutView
                    selectedDanji={selectedSummary}
                    onClose={() => setViewMode('sheet')}
                  />
                </div>
              )}
              </Card>
            </div>
            {/* 데이터 목록 영역 끝 */}
          </div>
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu.show && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            minWidth: '180px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleNewProperty}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-md"
          >
            <Plus className="w-4 h-4" />
            물건신규등록
          </button>
        </div>
      )}

      {/* 물건명/동/호 컬럼 필터 드롭다운 (목록 다중선택 + 적용) */}
      {colMenu && (() => {
        const key = colMenu.key;
        const suffix = key === 'dong' ? '동' : key === 'ho' ? '호' : '';
        const toggle = (v) => setColDraft((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
        const ck = (v, label) => (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', cursor: 'pointer', fontSize: '13px', background: colDraft.includes(v) ? '#eef2ff' : 'white' }}>
            <input type="checkbox" checked={colDraft.includes(v)} onChange={() => toggle(v)} style={{ width: '15px', height: '15px', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label ?? v}</span>
          </label>
        );
        const apply = () => { setColPick((prev) => ({ ...prev, [key]: colDraft })); setPagination((prev) => ({ ...prev, page: 1 })); setColMenu(null); };
        const empty = key === 'name' ? (addrLists.danji.length === 0 && addrLists.soji.length === 0) : (key === 'dong' ? addrLists.dong.length === 0 : addrLists.ho.length === 0);
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1300 }} onClick={() => setColMenu(null)} />
            <div style={{ position: 'fixed', left: `${Math.max(8, colMenu.x)}px`, top: `${colMenu.y}px`, zIndex: 1301, width: '250px', maxHeight: '360px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                {key === 'name' ? (
                  <>
                    {addrLists.danji.length > 0 && <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>단지목록</div>}
                    {addrLists.danji.map((v) => ck(v))}
                    {addrLists.soji.length > 0 && <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>소재지목록</div>}
                    {addrLists.soji.map((v) => ck(v))}
                  </>
                ) : (
                  (key === 'dong' ? addrLists.dong : addrLists.ho).map((v) => ck(v, `${v}${suffix}`))
                )}
                {empty && <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8' }}>목록이 없습니다.</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px', borderTop: '1px solid #eef1f5' }}>
                <button type="button" onClick={() => setColDraft([])}
                  style={{ padding: '5px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#64748b', borderRadius: '4px', cursor: 'pointer' }}>전체해제</button>
                <button type="button" onClick={apply}
                  style={{ padding: '5px 16px', fontSize: '13px', fontWeight: 700, border: '1px solid #4f46e5', background: '#4f46e5', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>적용{colDraft.length > 0 ? ` (${colDraft.length})` : ''}</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* 면적 필터 팝오버 (유형별: 토지=대지면적 / 그외=전용면적) */}
      {areaMenu && (() => {
        const unit = areaFilter.unit;
        const setMin = (v) => setAreaFilter((p) => ({ ...p, min: v === '' ? '' : String(v) }));
        const setMax = (v) => setAreaFilter((p) => ({ ...p, max: v === '' ? '' : String(v) }));
        const setUnit = (u) => setAreaFilter((p) => {
          if (p.unit === u) return p;
          const f = u === '평' ? (1 / 3.305785) : 3.305785; // ㎡<->평 환산(입력값 유지 변환)
          const conv = (v) => (v === '' ? '' : String(Math.round(Number(v) * f)));
          return { unit: u, min: conv(p.min), max: conv(p.max) };
        });
        const uBtn = (u) => ({ padding: '2px 10px', fontSize: '13px', fontWeight: 700, border: '1px solid ' + (unit === u ? '#4f46e5' : '#cbd5e1'), background: unit === u ? '#4f46e5' : 'white', color: unit === u ? 'white' : '#475569', borderRadius: '4px', cursor: 'pointer' });
        return (
          <>
            <style>{`
              .area-range { -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none; position: absolute; left: 0; width: 100%; height: 16px; margin: 0; }
              .area-range::-webkit-slider-thumb { -webkit-appearance: none; pointer-events: auto; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid #4f46e5; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
            `}</style>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1300 }} onClick={() => setAreaMenu(null)} />
            <div style={{ position: 'fixed', left: `${Math.max(8, areaMenu.x)}px`, top: `${areaMenu.y}px`, zIndex: 1301, width: '320px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '14px' }} onClick={(e) => e.stopPropagation()}>
              {/* 헤더: 면적 + 단위 토글 + 닫기 */}
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
              {/* 최소/최대 직접입력 (범위만) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginBottom: '6px' }}>
                <input type="number" value={areaFilter.min} onChange={(e) => setMin(e.target.value)} placeholder="최소" style={{ width: '90px', padding: '5px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }} />
                <span style={{ color: '#94a3b8' }}>~</span>
                <input type="number" value={areaFilter.max} onChange={(e) => setMax(e.target.value)} placeholder="최대" style={{ width: '90px', padding: '5px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }} />
                <span style={{ fontSize: '13px', color: '#64748b' }}>{unit}</span>
              </div>
              {/* 조건삭제 */}
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

      {/* 상담이력 패널 (컨텍스트 메뉴에서 열림) */}
      {isPanelOpen && selectedProperty && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: `${panelWidth}px`,
            backgroundColor: 'white',
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* 헤더 */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 className="font-semibold text-gray-900">상담이력</h3>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* 내용 */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ConsultationHistoryPanel
              ptNo={selectedProperty.ptNo}
              defaultData={{
                ptNo: selectedProperty.ptNo,
                ptName: selectedProperty.ptName,
                ptType: selectedProperty.ptType,
              }}
              autoOpen={true}
            />
          </div>
        </div>
      )}

      {/* 물건 등록/수정 모달 */}
      <PropertyModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        onSuccess={handleModalSuccess}
        editData={editPropertyData}
      />

      {/* 물건 보기 모달 */}
      <PropertyViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewProperty(null);
        }}
        property={viewProperty}
        onEdit={(property) => {
          setShowViewModal(false);
          setViewProperty(null);
          setEditPropertyData(property);
          setShowPropertyModal(true);
        }}
      />

      {/* 브리핑 모달 */}
      <PropertyBriefingModal
        isOpen={showBriefingModal}
        onClose={() => {
          setShowBriefingModal(false);
          setBriefingProperty(null);
        }}
        property={briefingProperty}
      />

      {/* 배치도 팝업 (아파트 단지 검색 → 배치도) */}
      <LayoutViewPopup isOpen={showLayoutPopup} onClose={() => setShowLayoutPopup(false)} />

      {/* 보고서 작성 모달 (매물 선택 → 고객 배포) */}
      {showReportBuilder && (
        <ReportBuilderModal
          isOpen={showReportBuilder}
          onClose={() => {
            setShowReportBuilder(false);
            setReportProperty(null);
            setReportProperties(null);
            setReportEditNo(null);
          }}
          property={reportProperty}
          properties={reportProperties}
          reportNo={reportEditNo}
        />
      )}

      {/* 보고서 관리 모달 (내 보고서 목록 → 수정/고객공유) */}
      <ReportManageModal
        isOpen={showReportManage}
        onClose={() => setShowReportManage(false)}
        onEdit={(report) => {
          setShowReportManage(false);
          setReportProperty(null);
          setReportProperties(null);
          setReportEditNo(report.reportNo);
          setShowReportBuilder(true);
        }}
      />

      {/* 고객센터 접수 모달 (일괄변경 선택 시) */}
      {isInquiryModalOpen && (
        <InquiryModal
          isOpen={isInquiryModalOpen}
          onClose={() => {
            setIsInquiryModalOpen(false);
            setInquiryCategory('');
          }}
          onSave={handleSaveInquiry}
          user={user}
          office={office}
          category={inquiryCategory}
        />
      )}

      {/* 일괄변경요청 처리결과(처리완료 코멘트) 확인 모달 */}
      {showBulkDone && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowBulkDone(false)}>
          <div style={{ width: '620px', maxWidth: '96%', maxHeight: '86vh', background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#4f46e5' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>일괄변경요청 처리결과</span>
              <button onClick={() => setShowBulkDone(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'white', display: 'inline-flex' }}><X className="w-5 h-5" /></button>
            </div>
            <div style={{ padding: '14px 16px', overflow: 'auto' }}>
              {bulkDone.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '14px', fontWeight: 600 }}>처리완료된 요청이 없습니다.</div>
              ) : bulkDone.map((r) => (
                <div key={bulkReqId(r)} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', borderRadius: '4px', padding: '2px 8px' }}>{r.category ?? r.Category}</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{r.title ?? r.Title}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>처리완료</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                    처리일시 {String(r.answerDt ?? r.AnswerDt ?? '').replace('T', ' ').slice(0, 16) || '-'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>처리 코멘트</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', background: 'white', minHeight: '40px' }}>
                    {(r.answer ?? r.Answer) || <span style={{ color: '#94a3b8' }}>(코멘트 없음)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 테이블 설정 모달 */}
      <TableSettings
        isOpen={showTableSettings}
        onClose={() => setShowTableSettings(false)}
        menuId="properties"
        allColumns={HEADLINE_MASTER}
        columns={tableColumns.length > 0 ? tableColumns : activeTypeColumns}
        setColumns={setTableColumns}
        onSave={() => {
          // 선택 컬럼(tableColumns) 변경은 useEffect에서 localStorage(properties_headline_v1)로 영속화됨
        }}
      />

      <style jsx>{`
        /* ── 폰트 규칙 적용(물건관리 목록) ──
           데이터 셀: 최소 13px · 기본 굵기 600 / 헤더(라벨): 15px · 강조 800.
           공유 PropertyListTable의 11px/500 !important 규칙을 상위 선택자로 덮어씀. */
        .prop-table-card .prop-list-grid td {
          font-size: 14px !important;
          /* 데이터셀 행 높이 — 전 메뉴 공통 6px(통일) */
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .prop-table-card .prop-list-grid td div,
        .prop-table-card .prop-list-grid td span {
          font-size: 14px !important;

        }
        /* 거래유형/거래금액 미선택(플레이스홀더) — 연하게 강제 */
        .prop-table-card .prop-list-grid td span.trade-ph {
          color: #cbd5e1 !important;
          font-weight: 400 !important;
        }
        /* 퀵메뉴 칼럼: 셀 좌우 패딩 축소 → 버튼 글자가 칼럼 안에 들어오도록 */
        .prop-table-card .prop-list-grid td[data-col="actions_quick"] {
          padding-left: 3px !important;
          padding-right: 3px !important;
        }
        /* 선택 칼럼(항상 첫 컬럼): 데이터/필터 셀 좌우 여백 최소화 */
        .prop-table-card .prop-list-grid td[data-col="sel"],
        .prop-table-card .prop-list-grid th[data-col="sel"] {
          padding-left: 2px !important;
          padding-right: 2px !important;
        }
        /* 거래유형/거래금액 필터·데이터셀: 세그먼트가 셀 전체를 채우도록 패딩 제거 */
        .prop-table-card .prop-list-grid thead tr:last-child th[data-col="trade_type"] { padding: 0 !important; }
        .prop-table-card .prop-list-grid thead tr:last-child th[data-col="trade_amount"] { padding: 0 !important; }
        .prop-table-card .prop-list-grid td[data-col="trade_amount"] { padding: 0 !important; }
        .prop-table-card .prop-list-grid td[data-col="trade_type"] { padding: 0 !important; }
        /* 선택 헤더(제목 첫 셀): 여백 제거 + 라벨(선택│정보망│보고서│진행중) 전체폭 채움 */
        .prop-table-card .prop-list-grid thead tr:first-child th:first-child { padding-left: 2px !important; padding-right: 2px !important; }
        .prop-table-card .prop-list-grid thead tr:first-child th:first-child > div { width: 100% !important; }
        .prop-table-card .prop-list-grid thead tr:first-child th:first-child > div > span { display: block !important; width: 100% !important; }
        .prop-table-card .prop-list-grid thead th {
          font-size: 14px !important;
          background-color: #fafafa !important;
        }
        /* 제목행: 상단만 1px. 하단 경계는 제거 → 필터행과 하나로 묶이는 느낌 */
        .prop-table-card .prop-list-grid thead tr:first-child th {
          border-top: 1px solid #000 !important;
          border-bottom: none !important;
        }
        /* rowspan2 헤더(선택/자사·공동망매칭)는 필터행이 없으므로 하단 경계 유지 */
        .prop-table-card .prop-list-grid thead tr:first-child th[rowspan="2"] {
          border-bottom: 1px solid #000 !important;
        }
        /* 필터행(마지막 헤더행): 헤더와 동일 배경으로 묶고, 하단 1px 검정을 헤더 묶음의 아래 경계로 */
        .prop-table-card .prop-list-grid thead tr:last-child th {
          background-color: #fafafa !important;
          border-bottom: 1px solid #000 !important;
          padding-top: 1px !important;
          padding-bottom: 1px !important;
        }
        /* 헤더 높이: 제목행+필터행 합쳐 50px (필터행 25px 유지, 제목행 25px로 축소) */
        .prop-table-card .prop-list-grid thead tr:first-child th { height: 25px !important; max-height: 25px !important; }
        .prop-table-card .prop-list-grid thead tr:last-child:not(:first-child) { height: 25px !important; }
        .prop-table-card .prop-list-grid thead tr:last-child:not(:first-child) th { height: 25px !important; max-height: 25px !important; }

        .prop-page-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9fafb;
        }

        .prop-page-header {
          padding: 1.5rem;
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .prop-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .prop-page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .prop-page-description {
          color: #4b5563;
        }

        .prop-header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .prop-btn {
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

        .prop-btn-icon {
          width: 1rem;
          height: 1rem;
          margin-right: 0.5rem;
        }

        .prop-btn-outline {
          color: #000;
          background-color: white;
          border: 1px solid #d1d5db;
        }

        .prop-btn-outline:hover {
          background-color: #f9fafb;
        }

        .prop-btn-primary {
          color: white;
          background-color: #6366f1;
        }

        .prop-btn-primary:hover {
          background-color: #4f46e5;
        }

        .prop-btn-secondary {
          color: #000;
          background-color: white;
          border: 1px solid #d1d5db;
        }

        .prop-btn-secondary:hover {
          background-color: #f9fafb;
        }

        .prop-tabs-container {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
          overflow-x: auto;
        }

        .prop-tab {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          border-bottom: 2px solid transparent;
          color: #000;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
        }

        .prop-tab-active {
          border-bottom: 2px solid #4f46e5;
          color: #4f46e5;
          font-weight: 500;
        }

        .prop-tab-icon {
          width: 1rem;
          height: 1rem;
          margin-right: 0.5rem;
        }

        /* 상단섹션(검색조건 박스 + 배율/줄수/동층/거래유형 툴바) 폰트 굵기 전체 제거(일반) */
        .prop-search-box, .prop-search-box *,
        .prop-topbar, .prop-topbar * { font-weight: 500 !important; }

        .prop-main-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .prop-content-wrapper {
          flex: 1;
          display: flex;
          gap: 1rem;
          overflow: hidden;
          padding: 0;
        }

        .prop-table-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }


        .prop-table-card {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .prop-panel-wrapper {
          position: relative;
          display: flex;
          flex-shrink: 0;
          transition: width 0.3s ease;
        }

        .prop-panel-resizer {
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

        .prop-panel-resizer:hover {
          background-color: #6366f1;
        }

        .prop-panel-resizer:active {
          background-color: #4f46e5;
        }

        .prop-panel-toggle {
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

        .prop-panel-closed .prop-panel-toggle {
          left: 0;
        }

        .prop-panel-toggle:hover {
          background-color: #f9fafb;
        }

        .prop-panel-label {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-size: 0.875rem;
          font-weight: 500;
          color: #000;
          margin-top: 0.5rem;
        }

        .prop-panel-content {
          flex: 1;
          margin-left: 40px;
          overflow-y: auto;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-left: none;
          border-radius: 0 0.5rem 0.5rem 0;
        }
      `}</style>

      {/* 진행중 체크: 진행중이면 해제 확인, 아니면 진행중 변경 확인 (공통 모달) */}
      <ConfirmDialog
        open={!!progressConfirm}
        message={progressConfirm?.toNull
          ? '진행중을 해제하시겠습니까?'
          : '해당 물건을 진행중으로 변경하시겠습니까?'}
        confirmText={progressConfirm?.toNull ? '해제' : '변경'}
        confirmColor={progressConfirm?.toNull ? '#dc2626' : '#c2410c'}
        onConfirm={() => { const c = progressConfirm; setProgressConfirm(null); if (c) applyProgressChange(c.ptNo, c.toNull); }}
        onCancel={() => setProgressConfirm(null)}
      />
    </div>
  );
};

export default PropertiesPage;
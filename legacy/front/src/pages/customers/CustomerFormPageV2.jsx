import React, { useState, useEffect, useRef } from 'react';
import { customerService } from '../../services/customerService';
import { customerMemoService } from '../../services/customerMemoService';
import { interviewService } from '../../services/interviewService';
import { reportService } from '../../services/reportService';
import { useAuthStore } from '../../stores/authStore';
import { useHubModalStore } from '../../stores/hubModalStore';
import { useConsultMode } from '../../hooks/useConsultMode';
import AddressSelectorSimple from '../../components/property/AddressSelectorSimple';
import { Trash2, Plus, X, Eraser } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DeleteChoiceDialog from '../../components/ui/DeleteChoiceDialog';
import ReportBuilderModal from '../../components/reports/ReportBuilderModal';
import OptionModal from '../../components/property/OptionModal';
import AmountInput from '../../components/ui/AmountInput';
import DateInput from '../../components/ui/DateInput';
import RegionTreeModal from '../../components/customers/RegionTreeModal';
import MainRegionModal from '../../components/hub/MainRegionModal';
import ScheduleModal from '../../components/modals/ScheduleModal';
import toast from 'react-hot-toast';
import { BUILDING_USES } from '../../constants/buildingUses';
import { LAND_USES } from '../../constants/landUses';
import { LAND_CATEGORIES } from '../../constants/landCategories';
import { BALCONY_OPTIONS, ENTR_STRUCT_OPTIONS, BUILDING_FORM_OPTIONS } from '../../constants/propertyOptions';
import './CustomerFormPageV2.css';

// 저장해둔 선택 범위(range)에 텍스트 삽입 → 갱신된 innerHTML 반환
const insertTextAtRange = (el, range, text) => {
  if (!el) return null;
  el.focus();
  let r = range;
  if (!r || !el.contains(r.commonAncestorContainer)) {
    r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
  }
  r.deleteContents();
  const node = document.createTextNode(text);
  r.insertNode(node);
  r.setStartAfter(node); r.setEndAfter(node);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  return el.innerHTML;
};
// 선택 범위를 색상 span으로 감싸기 → 갱신된 innerHTML 반환(선택 없으면 null)
const wrapRangeColor = (el, range, color) => {
  if (!el || !range || range.collapsed || !el.contains(range.commonAncestorContainer)) return null;
  const span = document.createElement('span');
  span.style.color = color;
  try { span.appendChild(range.extractContents()); range.insertNode(span); } catch (e) { return null; }
  return el.innerHTML;
};

// 한 줄 리치텍스트 에디터(contentEditable) — 색상 span이 실제로 렌더되도록 textarea 대체
function RichLine({ html, prefix, placeholder, onChange, onActivate, onSaveRange, onEmptyDelete, style }) {
  const ref = useRef(null);
  const preRef = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== (html || '')) el.innerHTML = html || '';
  }, [html]);
  useEffect(() => {
    const el = ref.current, p = preRef.current;
    if (el && p) el.style.textIndent = (p.offsetWidth + 4) + 'px';
  });
  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0);
      if (ref.current && ref.current.contains(r.commonAncestorContainer)) onSaveRange?.(ref.current, r.cloneRange());
    }
  };
  return (
    <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
      <span ref={preRef} data-prefix style={{ position: 'absolute', top: '2px', left: '2px', whiteSpace: 'nowrap', pointerEvents: 'none', fontSize: '11px', lineHeight: '1.5' }}>{prefix}</span>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => onActivate?.(ref.current)}
        onInput={() => onChange(ref.current.innerHTML)}
        onKeyUp={saveRange}
        onMouseUp={saveRange}
        onBlur={saveRange}
        onKeyDown={(e) => {
          const empty = !(ref.current?.textContent || '').length;
          if (empty && (e.key === 'Backspace' || e.key === 'Delete')) { e.preventDefault(); onEmptyDelete?.(); }
        }}
        data-ph={placeholder}
        className="cfp2-rich"
        style={style}
      />
    </div>
  );
}

/**
 * 고객 등록/수정 폼 V2 — 풀페이지 레이아웃(하단바 항상 고정)
 * PropertyFormPageV2와 동일한 구조, CSS는 CustomerFormPageV2.css(cfp2-*)로 분리
 */
const CustomerFormPageV2 = ({ isOpen = true, onClose, onSuccess, editData = null, copyData = null }) => {
  const { user } = useAuthStore();
  const { openWithCustomer } = useHubModalStore();
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'report'
  const [reports, setReports] = useState([]);          // 이 고객의 저장 보고서 목록
  const [viewReport, setViewReport] = useState(null);  // 보기 중인 보고서(contentHtml)
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [formData, setFormData] = useState({
    custType: '', name: '', alias: '', tel: '', addr: '', memo: '', rentBsnYn: 'N',
    trdPrg: '', wantType: '', wantSubType: '', wantNm: '', excAreaFr: '', excAreaTo: '', landShareFr: '', landShareTo: '', grossAreaFr: '', grossAreaTo: '', areaKind: '공급', landShareRatioFr: '', landShareRatioTo: '', areaUnit: '평',
    trdType: [], moveinYn: '', moveDateFr: '', moveDateTo: '', cashAblt: '',
    saleAmtFr: '', saleAmtTo: '', lesAmtFr: '', lesAmtTo: '', protAmtFr: '', protAmtTo: '',
    monAmtFr: '', monAmtTo: '', etcProtAmtFr: '', etcProtAmtTo: '', etcMonAmtFr: '', etcMonAmtTo: '',
    etcType: '', rmk: '', rnk: '', roomCnt: '', bathCnt: '', parkCnt: '', communityFac: '', featureNote: '',
    gapInvestYn: '', investYn: '', irrelevantYn: '', rtNo: user?.rtNo ?? null, offNo: user?.offNo ?? null, vendorId: null,
    childYn: 'N', childCond: '', petAllow: '', petCond: '', opt: '',
    balcExt: '', entrStruct: '', buildingForm: '', buildPermitPref: '',
    buildingUse: '', bizType: '', elevatorCnt: '', stairCnt: '', cityGasYn: '', electricYn: '', elecCapacity: '', accessRoad: '', landUse: '', landCategory: '',
    contractDate: '', holdDate: '',
  });

  const [wishAreas, setWishAreas] = useState([]);
  const [buyers, setBuyers] = useState([]);

  const customerTypes = [
    { value: 1, label: '소유주' },
    { value: 2, label: '구매자' },
    { value: 3, label: '임차인' },
  ];
  const progressStates = [
    { value: 'TRDPRG01', label: '진행중' },
    { value: 'TRDPRG02', label: '계약' },
    { value: 'TRDPRG03', label: '타계' },
    { value: 'TRDPRG04', label: '보류' },
  ];
  const tradeTypes = [
    { value: 'TRDTYP01', label: '매매' },
    { value: 'TRDTYP02', label: '전세' },
    { value: 'TRDTYP03', label: '월세' },
    { value: 'TRDTYP04', label: '기타임대' },
  ];
  // 기타임대 세부유형(물건등록창과 동일) — 단일 선택
  const etcLeaseTypes = [
    { value: '단기임대', label: '단기임대' },
    { value: '깔세', label: '깔세' },
    { value: '년세', label: '년세' },
  ];
  // 물건유형 카테고리(주거용/업무용/토지) + 카테고리별 상세유형(복수 선택). wantType=카테고리, wantSubType=CSV
  const WANT_CATEGORIES = ['주거용', '업무용', '토지'];
  // 표시 라벨(저장값은 호환 위해 '업무용' 유지) — 화면에는 '상업용(상가/공장/숙박)'로 표기
  const WANT_CAT_LABEL = { '업무용': '상업용(상가/공장/숙박)' };
  const catLabel = (c) => WANT_CAT_LABEL[c] || c;
  const WANT_SUBTYPES = {
    '주거용': ['아파트', '분양권', '입주권', '단독 | 다가구', '빌라 | 연립', '오피스텔', '도시형생활주택', '원투룸'],
    '업무용': ['상가 | 사무실', '건물 | 빌딩', '공장 | 창고', '숙박 | 펜션', '지식산업센터', '오피스텔'],
  };
  const selectedSubTypes = (formData.wantSubType || '').split(',').filter(Boolean);
  const toggleSubType = (val) => setFormData((p) => {
    const cur = (p.wantSubType || '').split(',').filter(Boolean);
    const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
    return { ...p, wantSubType: next.join(',') };
  });
  useEffect(() => {
    if (!isOpen) return;
    const src = editData || copyData; // 복사등록(copyData)도 동일 매핑으로 프리필 — 단, 신규로 저장됨
    if (src) {
      setFormData({
        custType: src.custType || '', name: src.name || '', alias: src.alias || '',
        tel: src.tel || '', addr: src.addr || '', memo: src.memo || '', rentBsnYn: src.rentBsnYn || 'N',
        trdPrg: src.trdPrg || '', wantType: src.wantType || '', wantSubType: src.wantSubType || '', wantNm: src.wantNm || '',
        excAreaFr: src.excAreaFr || '', excAreaTo: src.excAreaTo || '',
        landShareFr: src.landShareFr || '', landShareTo: src.landShareTo || '',
        grossAreaFr: src.grossAreaFr || '', grossAreaTo: src.grossAreaTo || '', areaKind: src.areaKind || '공급',
        landShareRatioFr: src.landShareRatioFr || '', landShareRatioTo: src.landShareRatioTo || '', areaUnit: src.areaUnit || '평',
        trdType: src.trdType ? (Array.isArray(src.trdType) ? src.trdType : String(src.trdType).split(',').filter(Boolean)) : [],
        moveinYn: src.moveinYn === 'Y' ? 'Y' : '',
        moveDateFr: src.moveDateFr ? String(src.moveDateFr).split('T')[0] : '',
        moveDateTo: src.moveDateTo ? String(src.moveDateTo).split('T')[0] : '',
        cashAblt: src.cashAblt || '',
        saleAmtFr: src.saleAmtFr || '', saleAmtTo: src.saleAmtTo || '',
        lesAmtFr: src.lesAmtFr || '', lesAmtTo: src.lesAmtTo || '',
        protAmtFr: src.protAmtFr || '', protAmtTo: src.protAmtTo || '',
        monAmtFr: src.monAmtFr || '', monAmtTo: src.monAmtTo || '',
        etcProtAmtFr: src.etcProtAmtFr || '', etcProtAmtTo: src.etcProtAmtTo || '',
        etcMonAmtFr: src.etcMonAmtFr || '', etcMonAmtTo: src.etcMonAmtTo || '',
        etcType: src.etcType || '', rmk: src.rmk || '', rnk: src.rnk || '',
        roomCnt: src.roomCnt ?? '', bathCnt: src.bathCnt ?? '', parkCnt: src.parkCnt ?? '',
        communityFac: src.communityFac || '', featureNote: src.featureNote || '',
        gapInvestYn: src.gapInvestYn || '', investYn: src.investYn || '', irrelevantYn: src.irrelevantYn || '',
        rtNo: src.rtNo || null, offNo: src.offNo || null, vendorId: src.vendorId || null,
        childYn: src.childYn || 'N', childCond: src.childCond || '',
        petAllow: src.petAllow || '', petCond: src.petCond || '', opt: src.opt || '',
        buildingUse: src.buildingUse || '', bizType: src.bizType || '',
        elevatorCnt: src.elevatorCnt ?? '', stairCnt: src.stairCnt ?? '',
        cityGasYn: src.cityGasYn || '', electricYn: src.electricYn || '',
        elecCapacity: src.elecCapacity || '', accessRoad: src.accessRoad ?? '', landUse: src.landUse || '', landCategory: src.landCategory || '',
        balcExt: src.balcExt || '', entrStruct: src.entrStruct || '', buildingForm: src.buildingForm || '', buildPermitPref: src.buildPermitPref || '',
        contractDate: src.contractDate ? String(src.contractDate).split('T')[0] : '',
        holdDate: src.holdDate ? String(src.holdDate).split('T')[0] : '',
      });
      if (editData?.custNo) {
        loadCustomerDetail(editData.custNo);
      } else if (copyData) {
        // 복사등록: 희망지역/구입자/공유이력은 복사하고 메모·상담이력은 비움(신규 저장)
        setWishAreas((copyData.areas || []).map((a) => ({ addr1: a.addr1 || '', addr2: a.addr2 || '', addr3: a.addr3 || '', bjdCode: a.bjdCode || '', bldNm: a.bldNm || '', danjiCode: a.danjiCode || '', detailLoc: a.detailLoc || '' })));
        const cb = (copyData.buyers || []).map((b) => ({ name: b.name || '', relation: b.relation || '', tel: b.tel || '', addr: b.addr || '' }));
        setBuyers(cb.length ? cb : Array.from({ length: 3 }, () => ({ name: '', relation: '', tel: '', addr: '' })));
        const cs = (copyData.shares || []).map((s) => ({ date: s.date || '', officeName: s.officeName || '', regionName: s.regionName || '', officePhone: s.officePhone || '', memo: s.memo || '' }));
        setShares(cs.length ? cs : [{ date: '', officeName: '', regionName: '', officePhone: '', memo: '' }]);
        setMemos([]); setConsultations([]); setDeletedMemoNos([]); setDeletedItvNos([]);
      }
    } else {
      setFormData({
        custType: '', name: '', alias: '', tel: '', addr: '', memo: '', rentBsnYn: 'N',
        trdPrg: '', wantType: '', wantSubType: '', wantNm: '', excAreaFr: '', excAreaTo: '', landShareFr: '', landShareTo: '', grossAreaFr: '', grossAreaTo: '', areaKind: '공급', landShareRatioFr: '', landShareRatioTo: '', areaUnit: '평',
        trdType: [], moveinYn: '', moveDateFr: '', moveDateTo: '', cashAblt: '',
        saleAmtFr: '', saleAmtTo: '', lesAmtFr: '', lesAmtTo: '', protAmtFr: '', protAmtTo: '',
        monAmtFr: '', monAmtTo: '', etcProtAmtFr: '', etcProtAmtTo: '', etcMonAmtFr: '', etcMonAmtTo: '',
        etcType: '', rmk: '', rnk: '', roomCnt: '', bathCnt: '', parkCnt: '', communityFac: '', featureNote: '',
        gapInvestYn: '', investYn: '', irrelevantYn: '', rtNo: user?.rtNo ?? null, offNo: user?.offNo ?? null, vendorId: null,
        childYn: 'N', childCond: '', petAllow: '', petCond: '', opt: '',
    balcExt: '', entrStruct: '', buildingForm: '', buildPermitPref: '',
        contractDate: '', holdDate: '',
      });
      setWishAreas([]);
      setBuyers(Array.from({ length: 3 }, () => ({ name: '', relation: '', tel: '', addr: '' })));
      setShares([{ date: '', officeName: '', regionName: '', officePhone: '', memo: '' }]);
      setMemos([]);
      setConsultations([]);
      setDeletedMemoNos([]);
      setDeletedItvNos([]);
    }
  }, [isOpen, editData, copyData]);

  const loadCustomerDetail = async (custNo) => {
    try {
      const res = await customerService.getDetail(custNo);
      const d = res?.data;
      if (!d) return;
      setFormData((prev) => ({
        ...prev,
        roomCnt: d.roomCnt ?? '', bathCnt: d.bathCnt ?? '', parkCnt: d.parkCnt ?? '',
        communityFac: d.communityFac || '', featureNote: d.featureNote || '',
        gapInvestYn: d.gapInvestYn || '', investYn: d.investYn || '', irrelevantYn: d.irrelevantYn || '',
        moveinYn: d.moveinYn === 'Y' ? 'Y' : '', rnk: d.rnk || '', rmk: d.rmk || prev.rmk,
        childYn: d.childYn || prev.childYn, childCond: d.childCond || prev.childCond,
        petAllow: d.petAllow || prev.petAllow, petCond: d.petCond || prev.petCond, opt: d.opt || prev.opt,
        // 물건유형/상세유형 + 면적 관련(상세조회 기준으로 채움 — 없으면 기존 editData 값 유지)
        wantType: d.wantType ?? prev.wantType, wantSubType: d.wantSubType ?? prev.wantSubType,
        grossAreaFr: d.grossAreaFr ?? prev.grossAreaFr, grossAreaTo: d.grossAreaTo ?? prev.grossAreaTo,
        areaKind: d.areaKind ?? prev.areaKind, areaUnit: d.areaUnit ?? prev.areaUnit,
        landShareRatioFr: d.landShareRatioFr ?? prev.landShareRatioFr, landShareRatioTo: d.landShareRatioTo ?? prev.landShareRatioTo,
        buildingUse: d.buildingUse ?? prev.buildingUse, bizType: d.bizType ?? prev.bizType,
        landUse: d.landUse ?? prev.landUse, landCategory: d.landCategory ?? prev.landCategory,
        balcExt: d.balcExt ?? prev.balcExt, entrStruct: d.entrStruct ?? prev.entrStruct,
        buildingForm: d.buildingForm ?? prev.buildingForm, buildPermitPref: d.buildPermitPref ?? prev.buildPermitPref,
        contractDate: d.contractDate ?? prev.contractDate, holdDate: d.holdDate ?? prev.holdDate,
      }));
      setWishAreas((d.areas || []).map((a) => ({
        addr1: a.addr1 || '', addr2: a.addr2 || '', addr3: a.addr3 || '',
        bjdCode: a.bjdCode || '', bldNm: a.bldNm || '', danjiCode: a.danjiCode || '', detailLoc: a.detailLoc || '',
      })));
      const loadedBuyers = (d.buyers || []).map((b) => ({
        name: b.name || '', relation: b.relation || '', tel: b.tel || '', addr: b.addr || '',
      }));
      setBuyers(loadedBuyers.length ? loadedBuyers : [{ name: '', relation: '', tel: '', addr: '' }]);
      const loadedShares = (d.shares || []).map((s) => ({
        date: s.date || '', officeName: s.officeName || '', regionName: s.regionName || '', officePhone: s.officePhone || '', memo: s.memo || '',
      }));
      setShares(loadedShares.length ? loadedShares : [{ date: '', officeName: '', regionName: '', officePhone: '', memo: '' }]);
      loadMemos(custNo);
      loadConsultations(custNo);
      loadReports(custNo);
    } catch (e) {
      console.error('고객 상세 로드 실패:', e);
    }
  };

  // 이 고객의 저장 보고서 목록
  const loadReports = async (custNo) => {
    if (!custNo) { setReports([]); return; }
    try {
      const res = await reportService.getByCustomer(custNo);
      const d = res?.data;
      setReports(Array.isArray(d) ? d : (d?.reports || []));
    } catch { setReports([]); }
  };

  // 상담이력 = 상담관리(ct_interview) (cust_no 기준)
  const loadConsultations = async (custNo) => {
    if (!custNo) { setConsultations([]); return; }
    try {
      const res = await interviewService.getByCustomer(custNo);
      const list = res?.data?.interviews || res?.data?.Interviews || [];
      setConsultations(list.map((i) => ({
        itvNo: i.itvNo,
        // 시간까지 표기: reg_dt(타임스탬프) 우선, 없으면 itv_date(날짜)
        datetime: (i.regDt || i.itvDate || '').toString().replace('T', ' ').slice(0, 16),
        userId: i.regId || '', content: i.itvContent || '',
        contactName: i.contactName || '', contactPhone: i.contactPhone || '',
      })));
    } catch (e) {
      console.error('상담이력 조회 실패:', e);
      setConsultations([]);
    }
  };

  // 메모/상담이력은 고객 저장 payload에 포함되어 백엔드 트랜잭션에서 일괄 반영됨
  // (기존 persistMemosAndConsults 개별 호출 제거 — customerService.create/update 로 함께 저장)

  const removeWishArea = (idx) => setWishAreas((prev) => prev.filter((_, i) => i !== idx));
  // 주거래지역 모달 방식으로 구입희망지역 추가(bjdCode 중복 제외)
  const addWishAreaLocal = (region) => setWishAreas((prev) => (
    region.bjdCode && prev.some((a) => a.bjdCode === region.bjdCode) ? prev : [...prev, region]
  ));

  // 지역 트리 모달에서 선택한 지역들 적용(bjdCode 기준 중복 제외)
  const applyRegions = (regions) => {
    setWishAreas((prev) => {
      const existing = new Set(prev.map((a) => a.bjdCode).filter(Boolean));
      const toAdd = (regions || []).filter((r) => r.bjdCode && !existing.has(r.bjdCode));
      return [...prev, ...toAdd];
    });
  };

  // 공동주택(아파트형) 유형 — 단지 드롭다운 노출 기준 (물건폼과 동일)
  const APT_TYPES = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'];
  // 희망옵션: 건물/상가/사무실/토지는 수기입력, 그 외는 옵션 모달 선택 (물건폼과 동일)
  const OPT_MANUAL_TYPES = ['SYCA108', 'SYCA109', 'SYCA113', 'SYCA114', 'SYCA115'];
  // 업무용/토지는 희망옵션 직접입력, 그 외(주거용)는 옵션 모달
  const isOptManual = formData.wantType === '업무용' || formData.wantType === '토지' || OPT_MANUAL_TYPES.includes(formData.wantType);
  const [areaDraft, setAreaDraft] = useState({});
  const [areaDraftKey, setAreaDraftKey] = useState(0);
  const [areaDraftDanjiList, setAreaDraftDanjiList] = useState([]);
  const updateAreaDraft = (field, value) => setAreaDraft((p) => ({ ...p, [field]: value }));
  const commitAreaDraft = () => {
    const isApt = APT_TYPES.includes(formData.wantType);
    const bldNm = isApt ? (areaDraft.bldNm || '') : (areaDraft.addr5 || '');
    const detailLoc = isApt ? '' : [areaDraft.addr4, areaDraft.detailLoc].filter(Boolean).join(' ');
    if (!areaDraft.addr1 && !areaDraft.addr3 && !areaDraft.bjdCode && !bldNm && !detailLoc && !areaDraft.danjiCode) {
      toast.error('희망지역을 선택/입력하세요.');
      return;
    }
    setWishAreas((prev) => [...prev, {
      addr1: areaDraft.addr1 || '', addr2: areaDraft.addr2 || '', addr3: areaDraft.addr3 || '',
      bjdCode: areaDraft.bjdCode || '', bldNm, danjiCode: areaDraft.danjiCode || '', detailLoc,
    }]);
    setAreaDraft({});
    setAreaDraftKey((k) => k + 1);
    setAreaDraftDanjiList([]);
  };

  const addBuyer = () => setBuyers((prev) => [...prev, { name: '', relation: '', tel: '', addr: '' }]);
  const removeBuyer = (idx) => setBuyers((prev) => prev.filter((_, i) => i !== idx));
  const updateBuyer = (idx, field, value) => setBuyers((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));

  const [shares, setShares] = useState([]);
  const addShare = () => setShares((prev) => [...prev, { date: '', officeName: '', regionName: '', officePhone: '', memo: '' }]);
  const removeShare = (idx) => setShares((prev) => prev.filter((_, i) => i !== idx));
  // 좌하단 통합 카드 탭(구입자 / 공동중개사 사무소) — 물건등록 소유자 카드처럼
  const [bottomTab, setBottomTab] = useState('BUYER');
  const updateShare = (idx, field, value) => setShares((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

  // 삭제/지우기 공통 확인 모달 (물건등록 소유자 카드와 동일)
  const [rowConfirm, setRowConfirm] = useState(null); // { message, onConfirm }
  const requestClearBuyer = (idx) => setRowConfirm({ message: '이 행의 내용을 지우시겠습니까?', onConfirm: () => setBuyers((prev) => prev.map((b, i) => (i === idx ? { name: '', relation: '', tel: '', addr: '' } : b))) });
  const requestRemoveBuyer = (idx) => setRowConfirm({ message: '이 행을 삭제하시겠습니까?', onConfirm: () => removeBuyer(idx) });
  const requestClearShare = (idx) => setRowConfirm({ message: '이 행의 내용을 지우시겠습니까?', onConfirm: () => setShares((prev) => prev.map((s, i) => (i === idx ? { date: '', officeName: '', regionName: '', officePhone: '', memo: '' } : s))) });
  const requestRemoveShare = (idx) => setRowConfirm({ message: '이 행을 삭제하시겠습니까?', onConfirm: () => removeShare(idx) });

  // 기본 빈 행 3개 시드 (물건등록 소유자 카드처럼)
  useEffect(() => {
    if (buyers.length === 0) setBuyers(Array.from({ length: 3 }, () => ({ name: '', relation: '', tel: '', addr: '' })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyers.length]);
  useEffect(() => {
    if (shares.length === 0) setShares(Array.from({ length: 3 }, () => ({ date: '', officeName: '', regionName: '', officePhone: '', memo: '' })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shares.length]);

  const [memos, setMemos] = useState([]);
  const [consultOn] = useConsultMode(); // 상담모드 ON 시 구입물건특징·상담내용 카드 숨김
  const [consultations, setConsultations] = useState([]);
  const [consultSort, setConsultSort] = useState('desc');     // 상담이력 날짜 정렬(desc: 최신순)
  const [consultFilter, setConsultFilter] = useState('');     // 상담이력 검색어
  const [consultField, setConsultField] = useState('내용');   // 상담이력 검색 기준(성함/전화번호/내용)
  const [deletedMemoNos, setDeletedMemoNos] = useState([]);   // 저장 시 삭제할 기존 메모 번호
  const [deletedItvNos, setDeletedItvNos] = useState([]);     // 저장 시 삭제할 기존 상담이력 번호
  const [showResetConfirm, setShowResetConfirm] = useState(false); // 입력초기화 확인 모달
  const [activeMemoIdx, setActiveMemoIdx] = useState(null);   // 활성(포커스된) 메모 행
  const [activeMemoRef, setActiveMemoRef] = useState(null);   // 활성 메모 textarea DOM
  const memoRangeRef = useRef({ el: null, range: null });     // 마지막 메모 선택 범위(글자색/삽입용)
  const consultRangeRef = useRef({ el: null, range: null });  // 마지막 상담 선택 범위

  const loadMemos = async (custNo) => {
    if (!custNo) { setMemos([]); return; }
    try {
      const res = await customerMemoService.getMemoList(custNo);
      setMemos(res?.data || []);
    } catch (e) {
      console.error('상담메모 조회 실패:', e);
      setMemos([]);
    }
  };

  // 메모/상담이력은 고객 저장 시 일괄 반영 (신규 INSERT / 변경분 UPDATE / 삭제분 DELETE)
  // [날짜입력] 클릭 시 새 메모 행 추가 (저장은 고객 저장 시 일괄 반영)
  const blankMemo = () => {
    const kst = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
    return { memoNo: `temp_${Date.now()}`, memoDate: kst.toISOString().slice(0, 16), memoContent: '', userId: user?.userId || '담당자', isTemp: true };
  };
  const blankConsult = () => {
    const kst = new Date();
    const dateStr = kst.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    return { datetime: dateStr, userId: user?.userId || '담당자', content: '' };
  };
  // 비어있으면 항상 기본 한 행 유지("정보 없음" 대신) — 빈 행은 저장 시 자동 제외됨
  useEffect(() => { if (memos.length === 0) setMemos([blankMemo()]); }, [memos.length]);
  useEffect(() => { if (consultations.length === 0) setConsultations([blankConsult()]); }, [consultations.length]);
  const addMemoRow = () => setMemos((prev) => [...prev, blankMemo()]);
  // 활성(포커스된) 메모 입력칸에 텍스트 삽입(contentEditable 범위 기준)
  const insertIntoMemo = (text) => {
    const el = activeMemoRef;
    if (activeMemoIdx == null || !el) { toast.error('메모 입력칸을 먼저 클릭하세요.'); return; }
    const html = insertTextAtRange(el, memoRangeRef.current?.range, text);
    if (html != null) setMemos((prev) => prev.map((m, i) => (i === activeMemoIdx ? { ...m, memoContent: html, _dirty: true } : m)));
  };
  const insertMemoSpecialChar = (ch) => { if (ch) insertIntoMemo(ch); };
  const applyMemoColor = (color) => {
    if (!color) return;
    // 드롭다운 클릭으로 포커스가 풀려도, 저장해둔 선택 범위에 색상 적용
    const info = memoRangeRef.current;
    if (activeMemoIdx == null || !info?.el) { toast.error('메모 입력칸을 먼저 클릭하세요.'); return; }
    const html = wrapRangeColor(info.el, info.range, color);
    if (html == null) { toast.error('색상을 적용할 텍스트를 선택하세요.'); return; }
    memoRangeRef.current = { el: info.el, range: null };
    setMemos((prev) => prev.map((m, i) => (i === activeMemoIdx ? { ...m, memoContent: html, _dirty: true } : m)));
  };
  // 날짜 표시 포맷: 년2자리.월.일.시:분 (공백 없이)
  const formatDotDate = (raw) => {
    if (!raw) return '';
    const s = String(raw);
    const m = s.match(/(\d{4})\D*(\d{1,2})\D*(\d{1,2})\D*(\d{1,2})\D*(\d{2})/);
    if (m) {
      const [, Y, Mo, D, H, Mi] = m;
      return `${Y.slice(2)}.${Mo.padStart(2, '0')}.${D.padStart(2, '0')}.${H.padStart(2, '0')}:${Mi}`;
    }
    const m2 = s.match(/(\d{4})\D*(\d{1,2})\D*(\d{1,2})/);
    if (m2) { const [, Y, Mo, D] = m2; return `${Y.slice(2)}.${Mo.padStart(2, '0')}.${D.padStart(2, '0')}`; }
    return s;
  };
  // 메모 행 삭제: 로컬에서만 제거, 기존 메모면 삭제 목록에 기록
  const deleteMemoRow = (index) => {
    const memo = memos[index];
    if (memo && !memo.isTemp && !String(memo.memoNo).startsWith('temp_')) setDeletedMemoNos((prev) => [...prev, memo.memoNo]);
    setMemos((prev) => prev.filter((_, i) => i !== index));
    setActiveMemoIdx((cur) => (cur === index ? null : cur));
  };

  // ── 상담이력 - 활성(포커스된) 입력칸 추적 + 삽입 ──
  const [activeConsultIdx, setActiveConsultIdx] = useState(null);
  const [activeConsultRef, setActiveConsultRef] = useState(null);
  const [phonePickerOpen, setPhonePickerOpen] = useState(false);
  const [phonePickerList, setPhonePickerList] = useState([]);
  const [phonePickerTarget, setPhonePickerTarget] = useState('memo');

  // 상담이력 행 삭제: 로컬에서만 제거, 기존 이력이면 삭제 목록에 기록
  const deleteConsultRow = (index) => {
    const entry = consultations[index];
    if (entry?.itvNo) setDeletedItvNos((prev) => [...prev, entry.itvNo]);
    setConsultations((prev) => prev.filter((_, i) => i !== index));
    setActiveConsultIdx((cur) => (cur === index ? null : cur));
  };

  const insertIntoConsult = (text) => {
    const el = activeConsultRef;
    if (activeConsultIdx == null || !el) { toast.error('상담 내용 입력칸을 먼저 클릭하세요.'); return; }
    const html = insertTextAtRange(el, consultRangeRef.current?.range, text);
    if (html != null) setConsultations((prev) => prev.map((c, i) => (i === activeConsultIdx ? { ...c, content: html, _dirty: true } : c)));
  };
  const insertConsultSpecialChar = (ch) => { if (ch) insertIntoConsult(ch); };
  const applyConsultColor = (color) => {
    if (!color) return;
    const info = consultRangeRef.current;
    if (activeConsultIdx == null || !info?.el) { toast.error('상담 내용 입력칸을 먼저 클릭하세요.'); return; }
    const html = wrapRangeColor(info.el, info.range, color);
    if (html == null) { toast.error('색상을 적용할 텍스트를 선택하세요.'); return; }
    consultRangeRef.current = { el: info.el, range: null };
    setConsultations((prev) => prev.map((c, i) => (i === activeConsultIdx ? { ...c, content: html, _dirty: true } : c)));
  };

  // 전화번호 버튼 → 구입자/공동중개사/고객 카드에 등록된 전화번호(+이름) 모아 모달 선택
  const gatherPhones = () => {
    const list = [];
    (buyers || []).forEach((b) => { if (b.tel && String(b.tel).trim()) list.push({ label: `구입자${b.name ? ' ' + b.name : ''}`, name: b.name || '구입자', phone: String(b.tel).trim() }); });
    (shares || []).forEach((s) => { if (s.officePhone && String(s.officePhone).trim()) list.push({ label: `공동중개사${s.officeName ? ' ' + s.officeName : ''}`, name: s.officeName || '공동중개사', phone: String(s.officePhone).trim() }); });
    if (formData.tel && String(formData.tel).trim()) list.push({ label: `고객${formData.name ? ' ' + formData.name : ''}`, name: formData.name || '고객', phone: String(formData.tel).trim() });
    return list;
  };
  const [phonePickerIdx, setPhonePickerIdx] = useState(null); // 연락처를 넣을 대상 행 index
  // 연락처 선택창 열기 — 대상(target: memo|consult) + 행 index
  const openPhonePickerFor = (target, index) => {
    if (index == null) { toast.error(`${target === 'memo' ? '메모' : '상담'} 행을 먼저 클릭하세요.`); return; }
    const list = gatherPhones();
    if (!list.length) { toast.error('등록된 전화번호가 없습니다.'); return; }
    setPhonePickerList(list); setPhonePickerTarget(target); setPhonePickerIdx(index); setPhonePickerOpen(true);
  };
  // 선택 시 내용이 아니라 해당 행의 접두(아이디·이름·연락처)에 반영
  const onPickPhone = (item) => {
    const idx = phonePickerIdx;
    if (phonePickerTarget === 'memo') setMemos((prev) => prev.map((m, i) => (i === idx ? { ...m, contactName: item.name || '', contactPhone: item.phone || '', _dirty: true } : m)));
    else setConsultations((prev) => prev.map((c, i) => (i === idx ? { ...c, contactName: item.name || '', contactPhone: item.phone || '', _dirty: true } : c)));
    setPhonePickerOpen(false);
  };
  const insertMemoPhone = () => openPhonePickerFor('memo', activeMemoIdx);
  const insertConsultPhone = () => openPhonePickerFor('consult', activeConsultIdx);
  // 접두 연락처 슬롯: 입력 전엔 "홍길동 010-0000-0000"(클릭 유도 색), 선택 후 실제 이름·연락처로 대체
  const contactSlot = (entry, target, index) => {
    const has = !!(entry.contactName || entry.contactPhone);
    const text = has ? `${entry.contactName || ''} ${entry.contactPhone || ''}`.trim() : '전화번호입력';
    return (
      <span
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); openPhonePickerFor(target, index); }}
        title="연락처 선택"
        style={{ pointerEvents: 'auto', cursor: 'pointer', fontWeight: 700, color: has ? '#0f766e' : '#f59e0b', textDecoration: 'underline', textUnderlineOffset: '2px' }}
      >{text}</span>
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => {
        const currentArray = prev[name] || [];
        if (checked) return { ...prev, [name]: [...currentArray, value] };
        return { ...prev, [name]: currentArray.filter((v) => v !== value) };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value }));
    }
  };

  // 입력초기화 — 희망 물건유형(wantType/wantSubType)만 유지하고 나머지 입력값 전부 초기화 (공통 확인 모달)
  const handleResetInput = () => {
    const keepType = formData.wantType, keepSub = formData.wantSubType;
    setFormData((prev) => {
      const cleared = {};
      Object.keys(prev).forEach((k) => { cleared[k] = Array.isArray(prev[k]) ? [] : ''; });
      return {
        ...cleared,
        wantType: keepType, wantSubType: keepSub,
        rentBsnYn: 'N', areaKind: '공급', areaUnit: '평', trdType: [],
        rtNo: user?.rtNo ?? null, offNo: user?.offNo ?? null, vendorId: null, userId: user?.userId,
      };
    });
    setBuyers([]); setWishAreas([]); setShares([]); setMemos([]); setConsultations([]);
    setDeletedMemoNos([]); setDeletedItvNos([]);
    toast.success('입력 내용을 초기화했습니다.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const primaryBuyer = buyers.find((b) => b.name) || {};
    const custName = formData.name || primaryBuyer.name || formData.alias || '';
    const custTel = formData.tel || primaryBuyer.tel || '';

    // 성함 필수 — 미입력 시 저장 차단(CustomerModal과 동일. 빈 값 저장/혼란 방지)
    if (!custName.trim()) {
      toast.error('구입자 성함(또는 실구입할 사람)을 입력해주세요.');
      return;
    }

    // 상담이력: 신규 상담은 전화번호(연락처)를 입력해야 저장 가능
    const consultNoPhone = (consultations || [])
      .filter((c) => !c.itvNo && (c.content || '').trim() && !(c.contactPhone || '').trim());
    if (consultNoPhone.length) {
      toast.error('상담이력은 전화번호를 입력해야 저장할 수 있습니다.');
      return;
    }

    try {
      const convertEmptyToNull = (value) => (value === '' || value === null || value === undefined ? null : value);
      const payload = {
        custType: convertEmptyToNull(formData.custType), name: custName, alias: convertEmptyToNull(formData.alias),
        tel: convertEmptyToNull(custTel), addr: convertEmptyToNull(formData.addr), memo: convertEmptyToNull(formData.memo),
        rentBsnYn: formData.rentBsnYn, trdPrg: convertEmptyToNull(formData.trdPrg),
        wantType: convertEmptyToNull(formData.wantType), wantSubType: convertEmptyToNull(formData.wantSubType), wantNm: convertEmptyToNull(formData.wantNm),
        excAreaFr: convertEmptyToNull(formData.excAreaFr), excAreaTo: convertEmptyToNull(formData.excAreaTo),
        landShareFr: convertEmptyToNull(formData.landShareFr), landShareTo: convertEmptyToNull(formData.landShareTo),
        grossAreaFr: convertEmptyToNull(formData.grossAreaFr), grossAreaTo: convertEmptyToNull(formData.grossAreaTo),
        areaKind: convertEmptyToNull(formData.areaKind),
        landShareRatioFr: convertEmptyToNull(formData.landShareRatioFr), landShareRatioTo: convertEmptyToNull(formData.landShareRatioTo), areaUnit: convertEmptyToNull(formData.areaUnit),
        trdType: (formData.trdType || []).join(',') || null, moveinYn: convertEmptyToNull(formData.moveinYn),
        moveDateFr: convertEmptyToNull(formData.moveDateFr), moveDateTo: convertEmptyToNull(formData.moveDateTo),
        cashAblt: convertEmptyToNull(formData.cashAblt),
        saleAmtFr: convertEmptyToNull(formData.saleAmtFr), saleAmtTo: convertEmptyToNull(formData.saleAmtTo),
        lesAmtFr: convertEmptyToNull(formData.lesAmtFr), lesAmtTo: convertEmptyToNull(formData.lesAmtTo),
        protAmtFr: convertEmptyToNull(formData.protAmtFr), protAmtTo: convertEmptyToNull(formData.protAmtTo),
        monAmtFr: convertEmptyToNull(formData.monAmtFr), monAmtTo: convertEmptyToNull(formData.monAmtTo),
        etcProtAmtFr: convertEmptyToNull(formData.etcProtAmtFr), etcProtAmtTo: convertEmptyToNull(formData.etcProtAmtTo),
        etcMonAmtFr: convertEmptyToNull(formData.etcMonAmtFr), etcMonAmtTo: convertEmptyToNull(formData.etcMonAmtTo),
        etcType: convertEmptyToNull(formData.etcType), rmk: convertEmptyToNull(formData.rmk), rnk: convertEmptyToNull(formData.rnk),
        roomCnt: convertEmptyToNull(formData.roomCnt), bathCnt: convertEmptyToNull(formData.bathCnt), parkCnt: convertEmptyToNull(formData.parkCnt),
        communityFac: convertEmptyToNull(formData.communityFac), featureNote: convertEmptyToNull(formData.featureNote),
        gapInvestYn: convertEmptyToNull(formData.gapInvestYn), investYn: convertEmptyToNull(formData.investYn), irrelevantYn: convertEmptyToNull(formData.irrelevantYn),
        childYn: convertEmptyToNull(formData.childYn), childCond: convertEmptyToNull(formData.childCond),
        petAllow: convertEmptyToNull(formData.petAllow), petCond: convertEmptyToNull(formData.petCond),
        opt: convertEmptyToNull(formData.opt),
        buildingUse: convertEmptyToNull(formData.buildingUse), bizType: convertEmptyToNull(formData.bizType),
        elevatorCnt: convertEmptyToNull(formData.elevatorCnt), stairCnt: convertEmptyToNull(formData.stairCnt),
        cityGasYn: convertEmptyToNull(formData.cityGasYn), electricYn: convertEmptyToNull(formData.electricYn),
        elecCapacity: convertEmptyToNull(formData.elecCapacity), accessRoad: convertEmptyToNull(formData.accessRoad), landUse: convertEmptyToNull(formData.landUse), landCategory: convertEmptyToNull(formData.landCategory),
        balcExt: convertEmptyToNull(formData.balcExt), entrStruct: convertEmptyToNull(formData.entrStruct), buildingForm: convertEmptyToNull(formData.buildingForm), buildPermitPref: convertEmptyToNull(formData.buildPermitPref),
        contractDate: convertEmptyToNull(formData.contractDate), holdDate: convertEmptyToNull(formData.holdDate),
        // 담당자(rt_no)/사무소(off_no)는 값이 없으면 로그인 사용자 기준으로 채움(신규/기존 NULL 보정)
        rtNo: convertEmptyToNull(formData.rtNo) ?? (user?.rtNo ?? null),
        offNo: convertEmptyToNull(formData.offNo) ?? (user?.offNo ?? null),
        vendorId: convertEmptyToNull(formData.vendorId),
        userId: user?.userId,
        areas: wishAreas.filter((a) => a.addr1 || a.addr3 || a.bjdCode || a.bldNm || a.detailLoc).map((a) => ({
          addr1: a.addr1 || null, addr2: a.addr2 || null, addr3: a.addr3 || null, bjdCode: a.bjdCode || null, bldNm: a.bldNm || null, danjiCode: a.danjiCode || null, detailLoc: a.detailLoc || null,
        })),
        buyers: buyers.filter((b) => b.name || b.tel || b.relation || b.addr).map((b) => ({
          name: b.name || null, relation: b.relation || null, tel: b.tel || null, addr: b.addr || null,
        })),
        shares: shares.filter((s) => s.date || s.officeName || s.regionName || s.officePhone || s.memo).map((s) => ({
          date: s.date || null, officeName: s.officeName || null, regionName: s.regionName || null, officePhone: s.officePhone || null, memo: s.memo || null,
        })),
        // 상담메모: 신규(temp)는 memoNo=null 로 전송, 기존행은 memoNo 유지 → 백엔드가 트랜잭션에서 일괄 반영
        memos: memos
          .filter((m) => {
            const isNew = m.isTemp || String(m.memoNo).startsWith('temp_');
            return isNew ? (m.memoContent || '').trim() : true;
          })
          .map((m) => {
            const isNew = m.isTemp || String(m.memoNo).startsWith('temp_');
            return {
              memoNo: isNew ? null : m.memoNo,
              memoDate: m.memoDate || null,
              memoContent: m.memoContent || null,
              contactName: m.contactName || null,
              contactPhone: m.contactPhone || null,
              userId: m.userId || user?.userId || null,
            };
          }),
        // 상담이력: 신규는 itvNo=null 로 전송, 기존행은 itvNo 유지
        consultations: consultations
          .filter((c) => (c.itvNo ? true : (c.content || '').trim()))
          .map((c) => ({
            itvNo: c.itvNo || null,
            itvContent: c.content || null,
            itvDate: null,
            contactName: c.contactName || null,
            contactPhone: c.contactPhone || null,
          })),
        deletedMemoNos,
        deletedItvNos,
      };

      if (editData) {
        // 메모/상담이력은 payload에 포함되어 고객 저장 트랜잭션에서 일괄 반영됨
        await customerService.update(editData.custNo, payload);
        setDeletedMemoNos([]);
        setDeletedItvNos([]);
        await loadMemos(editData.custNo);
        await loadConsultations(editData.custNo);
        toast.success('고객 정보가 저장되었습니다.');
        onSuccess && onSuccess();
      } else {
        // 신규 고객: 메모/상담이력도 payload에 포함되어 함께 저장됨
        await customerService.create(payload);
        setDeletedMemoNos([]);
        setDeletedItvNos([]);
        toast.success('고객 정보가 저장되었습니다.');
        onSuccess && onSuccess();
        requestAnimationFrame(() => { onClose && onClose(); });
      }
    } catch (error) {
      console.error('고객 저장 실패:', error);
      toast.error('고객 저장에 실패했습니다.');
    }
  };

  // 고객 삭제 (수정창 전용) — 삭제 방식 선택 모달
  const [showDeleteChoice, setShowDeleteChoice] = useState(false);
  const handleDelete = () => {
    if (!editData?.custNo) return;
    setShowDeleteChoice(true);
  };
  const doDelete = async (saveHistory) => {
    setShowDeleteChoice(false);
    try {
      await customerService.delete(editData.custNo, user?.userId, saveHistory);
      toast.success(saveHistory ? '고객 이력 저장 후 삭제되었습니다.' : '고객이 영구히 삭제되었습니다.');
      onSuccess && onSuccess();
      requestAnimationFrame(() => { onClose && onClose(); });
    } catch (error) {
      console.error('고객 삭제 실패:', error);
      toast.error('고객 삭제에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  const ROW = { display: 'flex', borderBottom: '1px solid #cbd5e1' };
  const LABEL = { width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' };
  const CONTENT = { flex: 1, padding: '6px' };
  const INPUT = { width: '100%', padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1' };
  // 금액 입력창과 동일 너비의 고정폭 입력창
  const FIXED_INPUT = { width: '110px', padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
  const RANGE = { display: 'flex', gap: '6px', alignItems: 'center' };
  const RANGE_INPUT = { flex: 1, padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1' };
  const CHECKS = { padding: '6px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', flex: 1 };
  const SUB = { fontSize: '13px', fontWeight: '600', color: '#374151', minWidth: '50px' };
  // 금액 라벨/입력 — 수직정렬 없이 좌측으로 붙임
  const AMT_LBL = { fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' };
  const AMT_ROW = { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' };
  const AMT_IN = { width: '70px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
  const AMT_CELL = { width: '100%', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
  const TILDE = { textAlign: 'center', color: '#94a3b8' };
  const CHIP = { alignSelf: 'stretch', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px', fontWeight: '600', color: '#92400e', background: '#fef3c7', border: '1px solid #fbbf24', whiteSpace: 'nowrap' };
  const thStyle = { fontSize:'14px',fontWeight:'500',padding: '4px 2px', border: '1px solid #cbd5e1', background: '#f1f5f9' };
  const tdStyle = { padding: '0', border: '1px solid #cbd5e1' };
  const cellInput = { width: '100%', padding: '4px 6px', fontSize: '11px', border: 'none', outline: 'none', background: 'transparent', boxSizing: 'border-box' };
  const delTdStyle = { width: '52px', padding: '0', border: '1px solid #cbd5e1', textAlign: 'center' };
  const delBtnStyle = { padding: '2px', border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const eraseBtnStyle = { padding: '2px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const addRowBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer' };
  // 통합 카드 탭 버튼 스타일(소유자 카드와 동일 톤)
  const bottomTabStyle = (active) => ({ width: '130px', padding: '6px', textAlign: 'center', fontSize: '14px', fontWeight: active ? '700' : '500', border: 'none', borderRight: '1px solid #cbd5e1', borderBottom: active ? '3px solid #4f46e5' : '3px solid transparent', background: active ? '#4f46e5' : '#f8fafc', color: active ? '#ffffff' : '#475569', cursor: 'pointer', whiteSpace: 'nowrap' });
  // 물건메모/상담이력 카드 좌측 액션 — 밑줄 텍스트(흰색), 네 항목을 하나의 박스로 묶음 (물건폼과 동일)
  const linkBtnStyle = { padding: '2px 2px', fontSize: '12px', fontWeight: 700, border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', textDecoration: 'none' };
  const linkSelectStyle = { padding: '2px 2px', fontSize: '12px', fontWeight: 700, border: 'none', background: 'transparent', color: 'white', cursor: 'pointer' };
  const linkGroupBoxStyle = { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', alignSelf: 'center', marginTop: '16px', border: '1px solid rgba(255,255,255,0.85)', borderRadius: '5px', padding: '7px 8px' };
  const buyerHasData = (b) => !!(b.name || b.tel || b.relation || b.addr);
  const shareHasData = (s) => !!(s.officeName || s.regionName || s.officePhone || s.memo);

  return (
    <>
    <div className="cfp2-page">
      {/* 숫자 입력창 상하 스피너 제거 */}
      <style>{`
        .cfp2-page input[type=number]::-webkit-inner-spin-button,
        .cfp2-page input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .cfp2-page input[type=number] { -moz-appearance: textfield; }
        /* 드롭다운 글자 세로 중앙정렬 강제 (line-height:normal이 안 먹는 환경 대응): 높이/라인하이트 고정 + 인라인 상하 padding 무력화 */
        .cfp2-page select { height: 28px !important; line-height: 26px !important; padding-top: 0 !important; padding-bottom: 0 !important; box-sizing: border-box !important; }
        /* 상담/메모 카드 좌측 링크형 드롭다운은 높이 강제 제외(버튼과 동일 컴팩트) — 물건등록폼과 동일 */
        .cfp2-page select.cfp2-link-select { height: auto !important; line-height: normal !important; }
        /* 특수문자/글자색 드롭다운: 펼친 옵션은 흰 배경에 검정 글자로 보이게 */
        .cfp2-link-select option { color: #111827; background: #ffffff; font-weight: 400; }
        /* 메모/상담 리치텍스트: 비었을 때 placeholder */
        .cfp2-rich:empty:before { content: attr(data-ph); color: #94a3b8; pointer-events: none; }
        /* 첫 줄만 prefix 만큼 들여쓰고, 엔터로 생긴 새 줄(블록)은 좌측 끝부터 시작 */
        .cfp2-rich div, .cfp2-rich p { text-indent: 0 !important; }
      `}</style>
      {/* 헤더 */}
      <div className="cfp2-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <h1 className="cfp2-title">{editData ? '고객정보 수정' : '고객정보 등록'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>담당자:</span>
              <input
                type="text"
                value={formData.managerName ?? user?.rtNm ?? user?.userName ?? user?.userId ?? ''}
                onChange={(e) => setFormData((p) => ({ ...p, managerName: e.target.value }))}
                readOnly={user?.rtType !== 'RTTYP01'}
                title={user?.rtType !== 'RTTYP01' ? '대표 공인중개사만 수정할 수 있습니다.' : ''}
                placeholder="담당자명"
                style={{ width: '96px', padding: '3px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#374151', background: user?.rtType !== 'RTTYP01' ? '#f1f5f9' : 'white', cursor: user?.rtType !== 'RTTYP01' ? 'not-allowed' : 'text' }}
              />
            </div>
            <span>등록일자: {(editData && editData.regDt) ? new Date(editData.regDt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
          </div>
          {editData && (
            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}>
              <span style={{ color: '#ef4444', fontWeight: '500' }}>
                최근수정일: {editData.updDt ? new Date(editData.updDt).toLocaleString() : '-'}
              </span>
            </div>
          )}
        </div>
        {/* 탭: 기본정보 | 보고서 (물건등록폼 기본정보|평면도/사진 스타일) */}
        {editData && (
          <div style={{ display: 'flex', gap: '4px', marginRight: '12px' }}>
            <button type="button" onClick={() => setActiveTab('basic')}
              style={{ padding: '4px 12px', fontSize: '13px', border: '1px solid #cbd5e1', background: activeTab === 'basic' ? '#3b82f6' : 'white', color: activeTab === 'basic' ? 'white' : '#64748b', cursor: 'pointer', borderRadius: '4px 0 0 4px', fontWeight: activeTab === 'basic' ? 600 : 400 }}>기본정보</button>
            <button type="button" onClick={() => { setActiveTab('report'); setViewReport(null); loadReports(editData.custNo); }}
              style={{ padding: '4px 12px', fontSize: '13px', border: '1px solid #cbd5e1', background: activeTab === 'report' ? '#3b82f6' : 'white', color: activeTab === 'report' ? 'white' : '#64748b', cursor: 'pointer', borderRadius: '0 4px 4px 0', fontWeight: activeTab === 'report' ? 600 : 400 }}>보고서{reports.length ? ` (${reports.length})` : ''}</button>
          </div>
        )}
        <button type="button" className="cfp2-close" onClick={onClose} title="닫기"><X className="w-5 h-5" /></button>
      </div>

      {activeTab === 'report' && editData ? (
        <div className="cfp2-form">
          <div className="cfp2-content" style={{ display: 'flex', gap: '10px' }}>
            {/* 좌: 저장된 보고서 목록 */}
            <div style={{ width: '280px', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'auto', background: 'white' }}>
              <div style={{ padding: '8px 12px', fontSize: '14px', fontWeight: 700, color: '#334155', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>저장된 보고서 ({reports.length})</div>
              {reports.length === 0 ? (
                <div style={{ padding: '20px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>이 고객에게 저장된 보고서가 없습니다.</div>
              ) : reports.map((r) => (
                <div key={r.reportNo} onClick={() => setViewReport(r)}
                  style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: viewReport?.reportNo === r.reportNo ? '#eef2ff' : 'white' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title || `보고서 #${r.reportNo}`}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.regDt ? String(r.regDt).replace('T', ' ').slice(0, 16) : ''}</div>
                </div>
              ))}
            </div>
            {/* 우: 보고서 내용(HTML) 보기 */}
            <div style={{ flex: 1, minWidth: 0, border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'auto', background: '#f9fafb', padding: '16px' }}>
              {viewReport ? (
                <div style={{ background: 'white', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} dangerouslySetInnerHTML={{ __html: viewReport.contentHtml || '<div style="color:#94a3b8">내용이 없습니다.</div>' }} />
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>좌측에서 보고서를 선택하세요.</div>
              )}
            </div>
          </div>
          <div className="cfp2-footer">
            <span />
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#374151', borderRadius: '5px', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="cfp2-form">
        <div className="cfp2-content">
          {/* 구입물건유형(좌측) + 구입희망지역 — 한 row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '0 8px 0 0', minHeight: '40px', background: '#fefce8', border: '2px solid #fbbf24' }}>
            <span style={{ ...CHIP, background: 'transparent', border: 'none' }}>구입물건유형</span>
            {editData ? (
              /* 수정 시 물건유형 고정 */
              <span style={{ width: '130px', padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formData.wantType ? catLabel(formData.wantType) : '-'}
              </span>
            ) : (
              <select name="wantType" value={formData.wantType} onChange={(e) => setFormData((p) => ({ ...p, wantType: e.target.value, wantSubType: '' }))} style={{ width: '160px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {WANT_CATEGORIES.map((c) => (<option key={c} value={c}>{catLabel(c)}</option>))}
              </select>
            )}
            <span style={{ ...CHIP, marginLeft: '8px', paddingLeft: '10px', borderLeft: '1px solid #fbbf24' }}>구입희망지역</span>
            {/* 추가된 희망지역 태그 — 지역추가 버튼 좌측 */}
            {wishAreas.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {wishAreas.map((area, idx) => (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', fontSize: '11px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', color: '#3730a3' }}>
                    {[area.addr1, area.addr2, area.addr3, area.bldNm, area.detailLoc].filter(Boolean).join(' ') || '(지역)'}
                    <button type="button" onClick={() => removeWishArea(idx)} style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
            {/* 지역추가 → 트리 모달에서 시/도·시/군/구·읍면동 체크박스로 다중 선택 */}
            <button type="button" onClick={() => setShowRegionModal(true)} style={{ padding: '5px 12px', fontSize: '13px', border: '1px solid #d97706', background: '#f59e0b', color: 'white', borderRadius: '3px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 지역추가</button>
          </div>

          {/* 좌우 분리 — 화면이 작으면 내용 높이를 유지하고 본문(cfp2-content)이 세로 스크롤 */}
          <div style={{ display: 'flex', gap: '6px', flex: '1 0 auto', minHeight: 0, alignItems: 'stretch' }}>
            {/* 좌측: 메인 폼 — 상담모드 ON 시 우측 숨김 → 100% 너비 */}
            <div style={{ flex: consultOn ? '1 1 100%' : '0 0 580px', display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', minHeight: 0 }}>
              {/* 상세유형 (주거용/업무용) — 복수 선택 체크박스. 토지는 상세유형 없음 */}
              {(formData.wantType === '주거용' || formData.wantType === '업무용') && (
                <div style={ROW}>
                  <div style={LABEL}>상세유형</div>
                  <div style={CHECKS}>
                    {(WANT_SUBTYPES[formData.wantType] || []).map((st) => (
                      <label key={st} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="checkbox" checked={selectedSubTypes.includes(st)} onChange={() => toggleSubType(st)} style={{ cursor: 'pointer' }} />
                        <span style={{ whiteSpace: 'nowrap' }}>{st}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 고객상태 (진행중/계약/타계/보류) — 면적 위 한 줄 상태 row */}
              <div style={ROW}>
                <div style={LABEL}>고객상태</div>
                <div style={{ ...CONTENT, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  {progressStates.map((state) => (
                    <React.Fragment key={state.value}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" name="trdPrg" value={state.value} checked={formData.trdPrg === state.value} onChange={handleChange} style={{ cursor: 'pointer' }} />
                        <span>{state.label}</span>
                      </label>
                      {state.value === 'TRDPRG02' && formData.trdPrg === 'TRDPRG02' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>계약일</label>
                          <DateInput value={formData.contractDate || ''} onChange={(v) => setFormData((p) => ({ ...p, contractDate: v }))} style={{ width: '85px', padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                        </div>
                      )}
                      {state.value === 'TRDPRG04' && formData.trdPrg === 'TRDPRG04' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>보류일</label>
                          <DateInput value={formData.holdDate || ''} onChange={(v) => setFormData((p) => ({ ...p, holdDate: v }))} style={{ width: '85px', padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* 면적 — 공급/대지면적/연면적 (평, 최소~최대) */}
              <div style={ROW}>
                <div style={{ ...LABEL, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <div>면적</div>
                  <button type="button" onClick={() => setFormData((p) => {
                    const toM2 = (p.areaUnit || '평') !== '㎡'; // 평→㎡ 방향
                    const factor = toM2 ? 3.305785 : 0.302500; // 1평=3.305785㎡
                    const conv = (v) => (v === '' || v == null || isNaN(Number(v))) ? v : String(Math.round(Number(v) * factor * 100) / 100);
                    return {
                      ...p,
                      areaUnit: toM2 ? '㎡' : '평',
                      excAreaFr: conv(p.excAreaFr), excAreaTo: conv(p.excAreaTo),
                      landShareRatioFr: conv(p.landShareRatioFr), landShareRatioTo: conv(p.landShareRatioTo),
                      landShareFr: conv(p.landShareFr), landShareTo: conv(p.landShareTo),
                      grossAreaFr: conv(p.grossAreaFr), grossAreaTo: conv(p.grossAreaTo),
                    };
                  })}
                    title="평 / ㎡ 전환 (값도 함께 환산)"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: '700', padding: '0 4px', border: '1px solid #a78bfa', borderRadius: '10px', background: '#ede9fe', color: '#5b4aa8', cursor: 'pointer', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
                    <span style={{ lineHeight: 1 }}>⇄</span>{formData.areaUnit || '평'}
                  </button>
                </div>
                <div style={CONTENT}>
                  {formData.wantType === '토지' ? (
                  /* 토지: 대지면적 단일 입력창 + 단위 */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AmountInput decimal value={formData.landShareFr} onChange={(v) => setFormData((p) => ({ ...p, landShareFr: v }))} placeholder="대지면적" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{formData.areaUnit || '평'}</span>
                  </div>
                  ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* 공급/전용 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <select value={formData.areaKind || '공급'} onChange={(e) => setFormData((p) => ({ ...p, areaKind: e.target.value }))} style={{ ...AMT_LBL, padding: '3px 4px', border: '1px solid #cbd5e1', borderRadius: '3px', cursor: 'pointer' }}>
                        <option value="공급">공급</option>
                        <option value="전용">전용</option>
                      </select>
                      <AmountInput decimal value={formData.excAreaFr} onChange={(v) => setFormData((p) => ({ ...p, excAreaFr: v }))} placeholder="최소" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      <span style={TILDE}>~</span>
                      <AmountInput decimal value={formData.excAreaTo} onChange={(v) => setFormData((p) => ({ ...p, excAreaTo: v }))} placeholder="최대" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{formData.areaUnit || '평'}</span>
                    </div>
                    {/* 대지지분 (공급 우측) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={AMT_LBL}>대지지분</span>
                      <AmountInput decimal value={formData.landShareRatioFr} onChange={(v) => setFormData((p) => ({ ...p, landShareRatioFr: v }))} placeholder="최소" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      <span style={TILDE}>~</span>
                      <AmountInput decimal value={formData.landShareRatioTo} onChange={(v) => setFormData((p) => ({ ...p, landShareRatioTo: v }))} placeholder="최대" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{formData.areaUnit || '평'}</span>
                    </div>
                    {/* 대지면적 (연면적 좌측) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={AMT_LBL}>대지면적</span>
                      <AmountInput decimal value={formData.landShareFr} onChange={(v) => setFormData((p) => ({ ...p, landShareFr: v }))} placeholder="최소" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      <span style={TILDE}>~</span>
                      <AmountInput decimal value={formData.landShareTo} onChange={(v) => setFormData((p) => ({ ...p, landShareTo: v }))} placeholder="최대" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{formData.areaUnit || '평'}</span>
                    </div>
                    {/* 연면적 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={AMT_LBL}>연면적</span>
                      <AmountInput decimal value={formData.grossAreaFr} onChange={(v) => setFormData((p) => ({ ...p, grossAreaFr: v }))} placeholder="최소" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      <span style={TILDE}>~</span>
                      <AmountInput decimal value={formData.grossAreaTo} onChange={(v) => setFormData((p) => ({ ...p, grossAreaTo: v }))} placeholder="최대" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{formData.areaUnit || '평'}</span>
                    </div>
                  </div>
                  )}
                </div>
              </div>

              {/* 거래 구분 — 매매/전세/월세 + 기타임대(단기임대/깔세/년세) 그룹 */}
              <div style={ROW}>
                <div style={LABEL}>거래 구분</div>
                <div style={CHECKS}>
                  {tradeTypes.filter((type) => type.value !== 'TRDTYP04').map((type) => (
                    <label key={type.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" name="trdType" value={type.value} checked={formData.trdType.includes(type.value)} onChange={handleChange} style={{ cursor: 'pointer' }} />
                      <span>{type.label}</span>
                    </label>
                  ))}
                  {/* 기타임대: 단일 선택. 선택 시 TRDTYP04 자동 설정 + 세부유형(etcType) 저장 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2px 8px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#111827' }}>기타임대</span>
                    {etcLeaseTypes.map((t) => (
                      <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        <input
                          type="checkbox"
                          checked={formData.etcType === t.value}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData((prev) => {
                              const nextEtc = checked ? t.value : '';
                              let nextTrd = (prev.trdType || []).filter((v) => v !== 'TRDTYP04');
                              if (nextEtc) nextTrd = [...nextTrd, 'TRDTYP04'];
                              return { ...prev, etcType: nextEtc, trdType: nextTrd };
                            });
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 금액 — 입력창 수직 정렬(그리드) */}
              <div style={ROW}>
                <div style={{ ...LABEL, flexDirection: 'column', gap: '4px' }}>
                  <div>금액</div>
                  <div style={{ fontSize: '12px', fontWeight: '500', lineHeight: '1.3', color: '#fef08a' }}>단위(만원)</div>
                </div>
                <div style={CONTENT}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* 매매 */}
                    <div style={AMT_ROW}>
                      <span style={AMT_LBL}>매매</span>
                      <AmountInput value={formData.saleAmtFr} onChange={(v) => setFormData((p) => ({ ...p, saleAmtFr: v }))} placeholder="최소" style={AMT_IN} />
                      <span style={TILDE}>~</span>
                      <AmountInput value={formData.saleAmtTo} onChange={(v) => setFormData((p) => ({ ...p, saleAmtTo: v }))} placeholder="최대" style={AMT_IN} />
                    </div>
                    {/* 전세 (매매 밑) */}
                    <div style={AMT_ROW}>
                      <span style={AMT_LBL}>전세</span>
                      <AmountInput value={formData.lesAmtFr} onChange={(v) => setFormData((p) => ({ ...p, lesAmtFr: v }))} placeholder="최소" style={AMT_IN} />
                      <span style={TILDE}>~</span>
                      <AmountInput value={formData.lesAmtTo} onChange={(v) => setFormData((p) => ({ ...p, lesAmtTo: v }))} placeholder="최대" style={AMT_IN} />
                    </div>
                    {/* 월세보증금 / 차임 */}
                    <div style={AMT_ROW}>
                      <span style={AMT_LBL}>월세보증금</span>
                      <AmountInput value={formData.protAmtFr} onChange={(v) => setFormData((p) => ({ ...p, protAmtFr: v }))} placeholder="최소" style={AMT_IN} />
                      <span style={TILDE}>~</span>
                      <AmountInput value={formData.protAmtTo} onChange={(v) => setFormData((p) => ({ ...p, protAmtTo: v }))} placeholder="최대" style={AMT_IN} />
                      <span style={AMT_LBL}>차임</span>
                      <AmountInput value={formData.monAmtFr} onChange={(v) => setFormData((p) => ({ ...p, monAmtFr: v }))} placeholder="최소" style={AMT_IN} />
                      <span style={TILDE}>~</span>
                      <AmountInput value={formData.monAmtTo} onChange={(v) => setFormData((p) => ({ ...p, monAmtTo: v }))} placeholder="최대" style={AMT_IN} />
                    </div>
                    {/* 기타임대 보증금 / 차임 */}
                    <div style={AMT_ROW}>
                      <span style={AMT_LBL}>기타임대 보증금</span>
                      <AmountInput value={formData.etcProtAmtFr} onChange={(v) => setFormData((p) => ({ ...p, etcProtAmtFr: v }))} placeholder="최소" style={AMT_IN} />
                      <span style={TILDE}>~</span>
                      <AmountInput value={formData.etcProtAmtTo} onChange={(v) => setFormData((p) => ({ ...p, etcProtAmtTo: v }))} placeholder="최대" style={AMT_IN} />
                      <span style={AMT_LBL}>차임</span>
                      <AmountInput value={formData.etcMonAmtFr} onChange={(v) => setFormData((p) => ({ ...p, etcMonAmtFr: v }))} placeholder="최소" style={AMT_IN} />
                      <span style={TILDE}>~</span>
                      <AmountInput value={formData.etcMonAmtTo} onChange={(v) => setFormData((p) => ({ ...p, etcMonAmtTo: v }))} placeholder="최대" style={AMT_IN} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 실입주 여부 */}
              <div style={ROW}>
                <div style={LABEL}>실입주 여부</div>
                <div style={CHECKS}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={formData.moveinYn === 'Y'} onChange={(e) => setFormData((p) => ({ ...p, moveinYn: e.target.checked ? 'Y' : '' }))} style={{ cursor: 'pointer' }} />
                    <span>실입주</span>
                  </label>
                  {formData.wantType !== '업무용' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={formData.gapInvestYn === 'Y'} onChange={(e) => setFormData((p) => ({ ...p, gapInvestYn: e.target.checked ? 'Y' : '' }))} style={{ cursor: 'pointer' }} />
                      <span>{formData.wantType === '토지' ? '개발예정' : '갭투자'}</span>
                    </label>
                  )}
                  {formData.wantType === '토지' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={formData.investYn === 'Y'} onChange={(e) => setFormData((p) => ({ ...p, investYn: e.target.checked ? 'Y' : '' }))} style={{ cursor: 'pointer' }} />
                      <span>투자</span>
                    </label>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={formData.irrelevantYn === 'Y'} onChange={(e) => setFormData((p) => ({ ...p, irrelevantYn: e.target.checked ? 'Y' : '' }))} style={{ cursor: 'pointer' }} />
                    <span>무관</span>
                  </label>
                </div>
              </div>

              {/* 잔금 예정일 */}
              <div style={ROW}>
                <div style={LABEL}>잔금 예정일</div>
                <div style={CONTENT}>
                  <div style={RANGE}>
                    <DateInput value={formData.moveDateFr} onChange={(v) => setFormData((p) => ({ ...p, moveDateFr: v }))} style={{ ...FIXED_INPUT, width: '85px' }} />
                    <span>~</span>
                    <DateInput value={formData.moveDateTo} onChange={(v) => setFormData((p) => ({ ...p, moveDateTo: v }))} style={{ ...FIXED_INPUT, width: '85px' }} />
                  </div>
                </div>
              </div>

              {/* 구입물건정보 — 주거용: 어린이/반려동물+방/욕실/주차+커뮤니티, 업무용: 건축물용도/업종/승강기·계단·주차/도시가스·전기 */}
              <div style={ROW}>
                <div style={LABEL}>구입물건정보</div>
                <div style={CONTENT}>
                  {formData.wantType === '업무용' ? (
                    <>
                      {/* 1줄: 계단수 이상 · 전기 kw · 도시가스 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>계단수</span>
                        <AmountInput value={formData.stairCnt} onChange={(v) => setFormData((p) => ({ ...p, stairCnt: v }))} style={{ width: '40px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        <span style={{ fontSize: '13px', color: '#374151' }}>이상</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginLeft: '10px' }}>전기</span>
                        <AmountInput value={formData.elecCapacity} onChange={(v) => setFormData((p) => ({ ...p, elecCapacity: v }))} style={{ width: '64px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        <span style={{ fontSize: '13px', color: '#374151' }}>kw</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginLeft: '10px' }}>도시가스</span>
                        <select value={formData.cityGasYn} onChange={(e) => setFormData((p) => ({ ...p, cityGasYn: e.target.value }))} style={{ width: '80px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          <option value="필요">필요</option>
                          <option value="무관">무관</option>
                        </select>
                      </div>
                      {/* 2줄: 도로 m이상 · 주차 대 이상 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>도로</span>
                        <AmountInput decimal value={formData.accessRoad} onChange={(v) => setFormData((p) => ({ ...p, accessRoad: v }))} style={{ width: '65px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        <span style={{ fontSize: '13px', color: '#374151' }}>m 이상</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginLeft: '10px' }}>주차</span>
                        <AmountInput value={formData.parkCnt} onChange={(v) => setFormData((p) => ({ ...p, parkCnt: v }))} style={{ width: '45px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        <span style={{ fontSize: '13px', color: '#374151' }}>대 이상</span>
                      </div>
                      {/* 3줄: 건축물용도 · 용도지역 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>건축물용도</span>
                        <select value={formData.buildingUse} onChange={(e) => setFormData((p) => ({ ...p, buildingUse: e.target.value }))} style={{ width: '120px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {BUILDING_USES.map((u) => (<option key={u.code} value={u.code}>{u.label}</option>))}
                        </select>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginLeft: '10px' }}>용도지역</span>
                        <select value={formData.landUse} onChange={(e) => setFormData((p) => ({ ...p, landUse: e.target.value }))} style={{ width: '104px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {LAND_USES.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}
                        </select>
                      </div>
                    </>
                  ) : formData.wantType === '토지' ? (
                    <>
                      {/* 업종 | 사용용도 (한 줄 길게) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>업종 | 사용용도</label>
                        <input type="text" name="bizType" value={formData.bizType} onChange={handleChange} placeholder="과수원(애플망고)" style={{ flex: 1, minWidth: 0, padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                      {/* 용도지역 / 지목 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>용도지역</label>
                          <select value={formData.landUse} onChange={(e) => setFormData((p) => ({ ...p, landUse: e.target.value }))} style={{ width: '130px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                            <option value="">선택</option>
                            {LAND_USES.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>지목</label>
                          <select value={formData.landCategory} onChange={(e) => setFormData((p) => ({ ...p, landCategory: e.target.value }))} style={{ width: '90px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                            <option value="">선택</option>
                            {LAND_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                          </select>
                        </div>
                      </div>
                      {/* 건축허가(필수/선호/무관) / 도로 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>건축허가</label>
                          <select value={formData.buildPermitPref || ''} onChange={(e) => setFormData((p) => ({ ...p, buildPermitPref: e.target.value }))} style={{ width: '90px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                            <option value="">선택</option>
                            <option value="필수">필수</option>
                            <option value="선호">선호</option>
                            <option value="무관">무관</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>도로</label>
                          <AmountInput decimal value={formData.accessRoad} onChange={(v) => setFormData((p) => ({ ...p, accessRoad: v }))} style={{ width: '65px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                          <span style={{ fontSize: '13px', color: '#374151' }}>m</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 첫줄: 어린이 / 반려동물 + 조건부 내용(하나) — 물건등록폼 제한사항과 동일 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>어린이</label>
                          <select value={formData.childYn} onChange={(e) => setFormData((p) => ({ ...p, childYn: e.target.value }))} style={{ width: '80px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                            <option value="Y">있음</option>
                            <option value="N">없음</option>
                            <option value="C">조건부</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>반려동물</label>
                          <select value={formData.petAllow} onChange={(e) => setFormData((p) => ({ ...p, petAllow: e.target.value }))} style={{ width: '80px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                            <option value="">선택</option>
                            <option value="있음">있음</option>
                            <option value="없음">없음</option>
                            <option value="조건부">조건부</option>
                          </select>
                        </div>
                        <input type="text" value={formData.childCond} onChange={(e) => setFormData((p) => ({ ...p, childCond: e.target.value }))} placeholder="조건부 내용" style={{ flex: 1, minWidth: '120px', padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#374151' }}>방</span>
                        <AmountInput value={formData.roomCnt} onChange={(v) => setFormData((p) => ({ ...p, roomCnt: v }))} style={{ width: '40px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        <span style={{ fontSize: '13px', color: '#374151' }}>개</span>
                        <span style={{ fontSize: '13px', color: '#374151', marginLeft: '8px' }}>욕실</span>
                        <AmountInput value={formData.bathCnt} onChange={(v) => setFormData((p) => ({ ...p, bathCnt: v }))} style={{ width: '40px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        <span style={{ fontSize: '13px', color: '#374151' }}>개</span>
                        <span style={{ fontSize: '13px', color: '#374151', marginLeft: '8px' }}>주차차량</span>
                        <AmountInput value={formData.parkCnt} onChange={(v) => setFormData((p) => ({ ...p, parkCnt: v }))} style={{ width: '45px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        <span style={{ fontSize: '13px', color: '#374151' }}>대</span>
                      </div>
                      {/* 발코니 / 현관구조 / 건물형태 (물건등록폼 참고 — 드롭다운) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>발코니</span>
                        <select value={formData.balcExt || ''} onChange={(e) => setFormData((p) => ({ ...p, balcExt: e.target.value }))} style={{ width: '84px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {BALCONY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                        </select>
                        <span style={{ fontSize: '13px', color: '#374151', whiteSpace: 'nowrap', marginLeft: '8px' }}>현관구조</span>
                        <select value={formData.entrStruct || ''} onChange={(e) => setFormData((p) => ({ ...p, entrStruct: e.target.value }))} style={{ width: '84px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {ENTR_STRUCT_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                        </select>
                        <span style={{ fontSize: '13px', color: '#374151', whiteSpace: 'nowrap', marginLeft: '8px' }}>건물형태</span>
                        <select value={formData.buildingForm || ''} onChange={(e) => setFormData((p) => ({ ...p, buildingForm: e.target.value }))} style={{ width: '84px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {BUILDING_FORM_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>커뮤니티시설</span>
                        <input type="text" name="communityFac" value={formData.communityFac} onChange={handleChange} placeholder="커뮤니티시설" style={{ flex: 1, minWidth: 0, padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 희망옵션 — 구입물건정보 row 아래 붙임 (물건등록폼 옵션 row와 동일: 라벨 클릭→선택, 입력창 직접입력) */}
              <div style={ROW}>
                {/* 라벨 클릭 → 옵션 선택창 열기 */}
                <div
                  onClick={() => setShowOptionModal(true)}
                  title="클릭하여 옵션 선택창 열기"
                  style={{ ...LABEL, flexDirection: 'column', gap: '2px', cursor: 'pointer' }}
                >
                  <span>희망옵션</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#fef08a' }}>선택 ▾</span>
                </div>
                <div style={{ ...CONTENT, display: 'flex' }}>
                  {/* 희망옵션은 항상 직접 입력 (또는 좌측 라벨 클릭하여 선택) */}
                  <textarea value={formData.opt || ''} onChange={(e) => setFormData((p) => ({ ...p, opt: e.target.value }))} placeholder="옵션 직접 입력 (또는 좌측 '희망옵션' 라벨 클릭하여 선택)" rows={2} style={{ width: '100%', padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            {/* 우측: 물건메모 + 상담이력 + 구입자/공동중개사 카드 — 상담모드 ON 시 전체 숨김 */}
            {!consultOn && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* 물건메모(구입물건특징) */}
              <div style={{ display: 'flex', border: '1px solid #cbd5e1', flex: 0.7, minHeight: '105px' }}>
                {/* 좌측: 라벨 + 묶음 박스, 전체 수직중앙 정렬 */}
                <div style={{ width: '90px', padding: '6px', background: '#8b7ad8', color: 'white', borderRight: '1px solid #5b4aa8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>구입물건특징</div>
                  <div style={linkGroupBoxStyle}>
                    <button type="button" onClick={addMemoRow} style={linkBtnStyle} title="메모 추가">날짜입력</button>
                    <button type="button" onClick={insertMemoPhone} style={linkBtnStyle} title="전화번호 삽입">전화번호입력</button>
                    <select onChange={(e) => { insertMemoSpecialChar(e.target.value); e.target.value = ''; }} value="" className="cfp2-link-select" style={linkSelectStyle}>
                      <option value="">특수문자</option>
                      <option value="★">★</option>
                      <option value="●">●</option>
                      <option value="■">■</option>
                      <option value="▶">▶</option>
                      <option value="✓">✓</option>
                      <option value="※">※</option>
                      <option value="→">→</option>
                    </select>
                    <select onChange={(e) => { applyMemoColor(e.target.value); e.target.value = ''; }} value="" className="cfp2-link-select" style={linkSelectStyle}>
                      <option value="">글자색</option>
                      <option value="red">빨강</option>
                      <option value="blue">파랑</option>
                      <option value="green">초록</option>
                      <option value="orange">주황</option>
                      <option value="purple">보라</option>
                    </select>
                  </div>
                </div>
                {/* 우측: 메모 목록 (인라인 행별 textarea) */}
                <div style={{ flex: 1, padding: 0, background: '#fef3c7', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, overflow: 'auto', border: 'none', padding: 0, background: 'white', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6', minHeight: '100px' }}>
                    {memos.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>메모 정보 없음</div>
                    ) : (
                      memos.map((entry, index) => (
                        <div key={entry.memoNo ?? index} style={{ padding: 0, borderBottom: 'none', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                          <RichLine
                            html={entry.memoContent}
                            placeholder="내용 입력..."
                            prefix={<>
                              <span style={{ color: '#64748b' }}>[{formatDotDate(entry.memoDate)}]</span>{' '}
                              <span style={{ color: '#3b82f6', fontWeight: '600' }}>[{entry.userId}]</span>{' '}
                              {contactSlot(entry, 'memo', index)}
                              <span> :&nbsp;</span>
                            </>}
                            onActivate={(el) => { setActiveMemoIdx(index); setActiveMemoRef(el); memoRangeRef.current = { el, range: null }; }}
                            onChange={(h) => setMemos((prev) => prev.map((m, i) => (i === index ? { ...m, memoContent: h, _dirty: true } : m)))}
                            onSaveRange={(el, r) => { memoRangeRef.current = { el, range: r }; }}
                            onEmptyDelete={() => { if (window.confirm('행을 삭제할까요?')) deleteMemoRow(index); }}
                            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '11px', fontFamily: 'inherit', padding: '2px', boxSizing: 'border-box', minWidth: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '17px' }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 상담이력(상담내용) */}
              <div style={{ display: 'flex', border: '1px solid #cbd5e1', flex: 1.3, minHeight: '195px' }}>
                <div style={{ width: '90px', padding: '6px', background: '#8b7ad8', color: 'white', borderRight: '1px solid #5b4aa8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>상담내용</div>
                  <div style={linkGroupBoxStyle}>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const dateStr = now.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
                        setConsultations([...consultations, { datetime: dateStr, userId: user?.userId || user?.userName || '담당자', content: '' }]);
                      }}
                      style={linkBtnStyle}
                      title="상담이력 추가"
                    >
                      날짜입력
                    </button>
                    <button type="button" onClick={insertConsultPhone} style={linkBtnStyle} title="전화번호 삽입">전화번호입력</button>
                    <select onChange={(e) => { insertConsultSpecialChar(e.target.value); e.target.value = ''; }} value="" className="cfp2-link-select" style={linkSelectStyle}>
                      <option value="">특수문자</option>
                      <option value="★">★</option>
                      <option value="●">●</option>
                      <option value="■">■</option>
                      <option value="▶">▶</option>
                      <option value="✓">✓</option>
                      <option value="※">※</option>
                      <option value="→">→</option>
                    </select>
                    <select onChange={(e) => { applyConsultColor(e.target.value); e.target.value = ''; }} value="" className="cfp2-link-select" style={linkSelectStyle}>
                      <option value="">글자색</option>
                      <option value="red">빨강</option>
                      <option value="blue">파랑</option>
                      <option value="green">초록</option>
                      <option value="orange">주황</option>
                      <option value="purple">보라</option>
                    </select>
                  </div>
                </div>
                <div style={{ flex: 1, padding: 0, background: '#fef3c7', display: 'flex', flexDirection: 'column' }}>
                  {/* 정렬/필터 헤더 줄 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '11px', flexShrink: 0 }}>
                    {/* 검색 기준: 성함 / 전화번호 / 내용 */}
                    <select value={consultField} onChange={(e) => setConsultField(e.target.value)}
                      style={{ padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '3px', background: 'white', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      <option value="성함">성함</option>
                      <option value="전화번호">전화번호</option>
                      <option value="내용">내용</option>
                    </select>
                    {/* 검색어 입력창 (우측 끝에 초기화 X 내장) */}
                    <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex' }}>
                      <input value={consultFilter} onChange={(e) => setConsultFilter(e.target.value)} placeholder={`${consultField} 검색`}
                        style={{ flex: 1, minWidth: 0, padding: '3px 24px 3px 6px', border: '1px solid #cbd5e1', borderRadius: '3px', fontSize: '13px', fontFamily: 'inherit' }} />
                      {consultFilter && (
                        <button type="button" onClick={() => setConsultFilter('')} title="검색 초기화"
                          style={{ position: 'absolute', right: '2px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '50%', background: '#e2e8f0', color: '#6b7280', cursor: 'pointer', fontSize: '11px', lineHeight: 1 }}>×</button>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', border: 'none', padding: 0, background: 'white', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6', minHeight: '100px' }}>
                    {(() => {
                      // 원본 인덱스(origIndex) 유지: 정렬/필터해도 편집·삭제가 올바른 행을 가리킴
                      const list = consultations
                        .map((entry, origIndex) => ({ entry, origIndex }))
                        .filter(({ entry }) => {
                          if (!consultFilter) return true;
                          const q = consultFilter.toLowerCase();
                          const content = (entry.content || '').replace(/<[^>]*>/g, '').toLowerCase();
                          const name = (entry.userId || '').toLowerCase();
                          if (consultField === '성함') return name.includes(q);
                          if (consultField === '전화번호') {
                            const d = q.replace(/\D/g, '');
                            return d ? content.replace(/\D/g, '').includes(d) : content.includes(q);
                          }
                          return content.includes(q); // 내용
                        })
                        .sort((a, b) => {
                          const da = a.entry.datetime || '', db = b.entry.datetime || '';
                          return consultSort === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
                        });
                      if (list.length === 0) {
                        return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>{consultFilter ? '검색 결과 없음' : '상담이력 정보 없음'}</div>;
                      }
                      return list.map(({ entry, origIndex }) => (
                        <div key={origIndex} style={{ padding: 0, borderBottom: 'none', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                          <RichLine
                            html={entry.content}
                            placeholder="내용 입력..."
                            prefix={<>
                              <span style={{ color: '#64748b' }}>[{formatDotDate(entry.datetime)}]</span>{' '}
                              <span style={{ color: '#3b82f6', fontWeight: '600' }}>[{entry.userId}]</span>{' '}
                              {contactSlot(entry, 'consult', origIndex)}
                              <span> :&nbsp;</span>
                            </>}
                            onActivate={(el) => { setActiveConsultIdx(origIndex); setActiveConsultRef(el); consultRangeRef.current = { el, range: null }; }}
                            onChange={(h) => setConsultations((prev) => prev.map((c, i) => (i === origIndex ? { ...c, content: h, _dirty: true } : c)))}
                            onSaveRange={(el, r) => { consultRangeRef.current = { el, range: r }; }}
                            onEmptyDelete={() => { if (window.confirm('행을 삭제할까요?')) deleteConsultRow(origIndex); }}
                            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '11px', fontFamily: 'inherit', padding: '2px', boxSizing: 'border-box', minWidth: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '17px' }}
                          />
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
              {/* 구입자 / 공동중개사 사무소 통합 카드 — 우측영역 하단 (행 3개 높이로 고정, 이상 스크롤) */}
              <div style={{ height: '164px', flexShrink: 0, marginTop: '4px', display: 'flex', flexDirection: 'column', border: '2px solid #8b7ad8', boxShadow: '0 2px 6px rgba(139,122,216,0.25)' }}>
                {/* 탭 + 입력 */}
                <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #cbd5e1', flexShrink: 0 }}>
                  <button type="button" onClick={() => setBottomTab('SHARE')} style={bottomTabStyle(bottomTab === 'SHARE')}>공동중개사 사무소</button>
                  <button type="button" onClick={() => setBottomTab('BUYER')} style={bottomTabStyle(bottomTab === 'BUYER')}>구입자</button>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', background: '#f1f5f9' }}>
                    {bottomTab === 'BUYER' && (
                      <input type="text" name="alias" value={formData.alias} onChange={handleChange} placeholder="계약당사자" style={{ ...FIXED_INPUT, width: '240px', borderRadius: '3px', color: '#1e293b' }} />
                    )}
                    <button type="button" onClick={bottomTab === 'BUYER' ? addBuyer : addShare} style={{ ...addRowBtnStyle, marginLeft: 'auto' }}><Plus size={12} /> 행추가</button>
                  </div>
                </div>
                {/* 표 (탭 전환) */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  {bottomTab === 'BUYER' ? (
                    <table style={{ width: '100%', height: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white', tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '104px' }} />
                        <col />
                        <col style={{ width: '44px' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={thStyle}>성함</th>
                          <th style={thStyle}>관계</th>
                          <th style={thStyle}>전화번호</th>
                          <th style={thStyle}>주 소</th>
                          <th style={{ ...thStyle, width: '52px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {buyers.map((b, idx) => (
                          <tr key={idx}>
                            <td style={tdStyle}><input type="text" value={b.name || ''} onChange={(e) => updateBuyer(idx, 'name', e.target.value)} placeholder="성함" style={cellInput} /></td>
                            <td style={tdStyle}><input type="text" value={b.relation || ''} onChange={(e) => updateBuyer(idx, 'relation', e.target.value)} placeholder="관계" style={cellInput} /></td>
                            <td style={tdStyle}><input type="text" value={b.tel || ''} onChange={(e) => updateBuyer(idx, 'tel', e.target.value)} placeholder="전화번호" style={cellInput} /></td>
                            <td style={tdStyle}><input type="text" value={b.addr || ''} onChange={(e) => updateBuyer(idx, 'addr', e.target.value)} placeholder="주소" style={cellInput} /></td>
                            <td style={delTdStyle}>
                              <button type="button" onClick={() => requestClearBuyer(idx)} title="내용 지우기" style={eraseBtnStyle}><Eraser size={13} /></button>
                              {idx >= 3 && (<button type="button" onClick={() => requestRemoveBuyer(idx)} title="행 삭제" style={delBtnStyle}><Trash2 size={13} /></button>)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ height: '100%' }}><td colSpan={5} style={{ border: '1px solid #cbd5e1' }} /></tr>
                      </tbody>
                    </table>
                  ) : (
                    <table style={{ width: '100%', height: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white', tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '76px' }} />
                        <col style={{ width: '104px' }} />
                        <col />
                        <col style={{ width: '44px' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={thStyle}>날짜</th>
                          <th style={thStyle}>상호</th>
                          <th style={thStyle}>지역명</th>
                          <th style={thStyle}>전화번호</th>
                          <th style={thStyle}>내용</th>
                          <th style={{ ...thStyle, width: '52px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {shares.map((s, idx) => (
                          <tr key={idx}>
                            <td style={tdStyle}><DateInput value={s.date || ''} onChange={(v) => updateShare(idx, 'date', v)} style={{ ...cellInput, width: '85px' }} /></td>
                            <td style={tdStyle}><input type="text" value={s.officeName || ''} onChange={(e) => updateShare(idx, 'officeName', e.target.value)} placeholder="상호" style={cellInput} /></td>
                            <td style={tdStyle}><input type="text" value={s.regionName || ''} onChange={(e) => updateShare(idx, 'regionName', e.target.value)} placeholder="지역명" style={cellInput} /></td>
                            <td style={tdStyle}><input type="text" value={s.officePhone || ''} onChange={(e) => updateShare(idx, 'officePhone', e.target.value)} placeholder="전화번호" style={cellInput} /></td>
                            <td style={tdStyle}><input type="text" value={s.memo || ''} onChange={(e) => updateShare(idx, 'memo', e.target.value)} placeholder="내용" style={cellInput} /></td>
                            <td style={delTdStyle}>
                              <button type="button" onClick={() => requestClearShare(idx)} title="내용 지우기" style={eraseBtnStyle}><Eraser size={13} /></button>
                              {idx >= 3 && (<button type="button" onClick={() => requestRemoveShare(idx)} title="행 삭제" style={delBtnStyle}><Trash2 size={13} /></button>)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ height: '100%' }}><td colSpan={6} style={{ border: '1px solid #cbd5e1' }} /></tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* 하단 고정바 */}
        <div className="cfp2-footer">
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" onClick={async () => {
              if (!editData || !editData.custNo) { toast.error('저장된 고객 정보만 정보망 전송이 가능합니다.'); return; }
              // 공동중개망 자동채움용 고객 데이터(희망지역 포함)
              const customerData = {
                custNo: editData.custNo,
                name: formData.name || editData.name,
                alias: formData.alias, tel: formData.tel, addr: formData.addr, memo: formData.memo,
                wantType: formData.wantType, trdType: formData.trdType,
                lesAmtFr: formData.lesAmtFr, lesAmtTo: formData.lesAmtTo,
                excAreaFr: formData.excAreaFr, excAreaTo: formData.excAreaTo,
                moveinYn: formData.moveinYn, moveDateFr: formData.moveDateFr, moveDateTo: formData.moveDateTo,
                roomCnt: formData.roomCnt, bathCnt: formData.bathCnt, parkCnt: formData.parkCnt,
                communityFac: formData.communityFac, featureNote: formData.featureNote,
                areas: wishAreas,
              };
              if (window.electronAPI?.modal) {
                try { await window.electronAPI.modal.open({ type: 'hub-form', data: { title: '공동중개망 등록', customerData }, width: 1120, height: 850, minWidth: 1120, maxWidth: 1120, resizable: false }); return; } catch (er) { console.error(er); }
              }
              openWithCustomer(editData);
            }} style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #0ea5e9', backgroundColor: '#0ea5e9', color: 'white', borderRadius: '3px', cursor: 'pointer' }}>정보망전송</button>
            <button type="button" onClick={() => setShowScheduleModal(true)}
              style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #a855f7', backgroundColor: '#a855f7', color: 'white', borderRadius: '3px', cursor: 'pointer' }}>일정관리</button>
            {editData && editData.custNo && (
              <button type="button" onClick={async () => {
                const cust = { custNo: editData.custNo, name: formData.name || editData.name };
                if (window.electronAPI?.modal) {
                  try { await window.electronAPI.modal.open({ type: 'report-builder', data: { title: '보고서', customer: cust }, width: 1400, height: 950 }); return; } catch (er) { console.error(er); }
                }
                setShowReport(true);
              }} style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #4f46e5', backgroundColor: '#4f46e5', color: 'white', borderRadius: '3px', cursor: 'pointer' }}>보고서 생성</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {/* 입력초기화 — 등록(신규)폼에서만 표시. 희망 물건유형만 유지하고 입력값 초기화 */}
            {!editData && (
              <button type="button" onClick={() => setShowResetConfirm(true)} style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#374151', borderRadius: '3px', cursor: 'pointer' }}>입력초기화</button>
            )}
            <button type="submit" style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #6366f1', backgroundColor: '#6366f1', color: 'white', borderRadius: '3px', cursor: 'pointer' }}>{editData ? '수정 | 저장' : '등록 | 저장'}</button>
            {editData && editData.custNo && (
              <button type="button" onClick={handleDelete} style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #dc2626', backgroundColor: '#dc2626', color: 'white', borderRadius: '3px', cursor: 'pointer' }}>삭제</button>
            )}
            {/* 닫기 — 저장 없이 창 닫기 */}
            <button type="button" onClick={() => onClose?.()} style={{ padding: '4px 12px', fontSize: '14px', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#374151', borderRadius: '3px', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>
      </form>
      )}
    </div>

    {showReport && (
      <ReportBuilderModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        customer={editData ? { custNo: editData.custNo, name: formData.name || editData.name } : null}
      />
    )}

    {phonePickerOpen && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPhonePickerOpen(false)}>
        <div style={{ background: 'white', borderRadius: '8px', width: '360px', maxHeight: '70vh', overflow: 'auto', padding: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>전화번호 선택</div>
            <button type="button" onClick={() => setPhonePickerOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
          </div>
          {phonePickerList.map((it, i) => (
            <button key={i} type="button" onClick={() => onPickPhone(it)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '6px', background: 'white', cursor: 'pointer' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{it.label}</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{it.phone}</div>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* 희망옵션 선택 모달 (물건폼과 동일) */}
    <OptionModal
      isOpen={showOptionModal}
      onClose={() => setShowOptionModal(false)}
      initialValue={formData.opt}
      onConfirm={(value) => setFormData((p) => ({ ...p, opt: value }))}
    />

    {/* 구입희망지역 추가 모달 — 공동중개망 주거래지역 모달 방식(드롭다운 시/도→읍면동→추가) */}
    <MainRegionModal
      isOpen={showRegionModal}
      onClose={() => setShowRegionModal(false)}
      mode="edit"
      title="구입희망지역"
      items={wishAreas}
      onAdd={addWishAreaLocal}
      onRemove={removeWishArea}
    />

    {/* 일정 등록 모달 (고객 성함/희망지역 자동입력) */}
    <ScheduleModal
      isOpen={showScheduleModal}
      onClose={() => setShowScheduleModal(false)}
      defaultLocation={wishAreas.length ? [wishAreas[0].addr1, wishAreas[0].addr2, wishAreas[0].addr3].filter(Boolean).join(' ') : ''}
      onSuccess={() => { setShowScheduleModal(false); toast.success('일정이 등록되었습니다.'); }}
    />

    {/* 행 삭제/지우기 공통 확인 모달 */}
    <ConfirmDialog
      open={!!rowConfirm}
      message={rowConfirm?.message}
      onConfirm={() => { rowConfirm?.onConfirm?.(); setRowConfirm(null); }}
      onCancel={() => setRowConfirm(null)}
    />
    {/* 고객 삭제 방식 선택 */}
    <DeleteChoiceDialog
      open={showDeleteChoice}
      title="고객 삭제"
      options={[
        { label: '고객의 이력에 저장 후 삭제합니다', color: '#4f46e5', onSelect: () => doDelete(true) },
        { label: '영구히 삭제합니다', color: '#dc2626', onSelect: () => doDelete(false) },
      ]}
      onCancel={() => setShowDeleteChoice(false)}
    />

    {/* 입력초기화 확인 모달 (공통) */}
    <ConfirmDialog
      open={showResetConfirm}
      message={'입력한 내용을 초기화하시겠습니까?\n(희망 물건유형은 유지됩니다)'}
      confirmText="초기화"
      onConfirm={() => { setShowResetConfirm(false); handleResetInput(); }}
      onCancel={() => setShowResetConfirm(false)}
    />
    </>
  );
};

export default CustomerFormPageV2;

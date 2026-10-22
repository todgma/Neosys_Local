import React, { useState, useEffect, useRef } from 'react';
import { propertyService } from '../../services/propertyService';
import { propertyMemoService } from '../../services/propertyMemoService';
import { interviewService } from '../../services/interviewService';
import { holderService } from '../../services/holderService';
import { useConsultMode } from '../../hooks/useConsultMode';
import addressService from '../../services/common/addressService';
import { loadAddressFromBjdCode } from '../../utils/addressUtils';
import { useAuthStore } from '../../stores/authStore';
import { useHubModalStore } from '../../stores/hubModalStore';
import ConsultationHistoryPanel from '../../components/consultation/ConsultationHistoryPanel';
import HolderSection from '../../components/property/HolderSection';
import FileUploadForm from '../../components/common/FileUploadForm';
import AddressSelector from '../../components/property/AddressSelector';
import AddressSelectorSimple from '../../components/property/AddressSelectorSimple';
import DanjiSelector from '../../components/property/DanjiSelector';
import HolderInlineEdit from '../../components/property/HolderInlineEdit';
import HolderCombinedCard from '../../components/property/HolderCombinedCard';
import DeleteChoiceDialog from '../../components/ui/DeleteChoiceDialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ApartmentForm from '../../components/properties/propertyForm/ApartmentForm';
import SalesRightForm from '../../components/properties/propertyForm/SalesRightForm';
import CommercialForm from '../../components/properties/propertyForm/CommercialForm';
import BuildingForm from '../../components/properties/propertyForm/BuildingForm';
import HouseForm from '../../components/properties/propertyForm/HouseForm';
import LodgingForm from '../../components/properties/propertyForm/LodgingForm';
import FactoryForm from '../../components/properties/propertyForm/FactoryForm';
import KnowledgeCenterForm from '../../components/properties/propertyForm/KnowledgeCenterForm';
import BillaForm from '../../components/properties/propertyForm/BillaForm';
import OneRoomForm from '../../components/properties/propertyForm/OneRoomForm';
import RedevelopmentForm from '../../components/properties/propertyForm/RedevelopmentForm';
import LandForm from '../../components/properties/propertyForm/LandForm';
import TradeDivisionSelector from '../../components/properties/propertyForm/TradeDivisionSelector';
import AptAddressBar from '../../components/properties/propertyForm/AptAddressBar';
import LandAddressBar from '../../components/properties/propertyForm/LandAddressBar';
import BuildingAddressBar from '../../components/properties/propertyForm/BuildingAddressBar';
import FacilityAddressBar from '../../components/properties/propertyForm/FacilityAddressBar';
import RedevAddressBar from '../../components/properties/propertyForm/RedevAddressBar';
import DefaultAddressBar from '../../components/properties/propertyForm/DefaultAddressBar';
import PropertyShareHistoryModal from '../../components/property/PropertyShareHistoryModal';
import OptionModal from '../../components/property/OptionModal';
import AmountInput from '../../components/ui/AmountInput';
import ScheduleModal from '../../components/modals/ScheduleModal';
import { scheduleService } from '../../services/scheduleService';
import { toast } from 'react-hot-toast';
import { X, FileText, Paperclip, MessageSquare, Calendar, Hash, Palette, Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { PROPERTY_TYPE_OPTIONS, COMMERCIAL_OFFICE_CODES, APARTMENT_RELATED_CODES, APARTMENT_FORM_CODES, SALES_RIGHT_FORM_CODES, BUILDING_FORM_CODES, HOUSE_FORM_CODES, LODGING_FORM_CODES, FACTORY_FORM_CODES, KNOWLEDGE_FORM_CODES, BILLA_FORM_CODES, ONEROOM_FORM_CODES, REDEV_FORM_CODES, getPropertyTypeLabel } from '../../constants/propertyTypes';
import { LAND_CATEGORIES } from '../../constants/landCategories';
import { fileUploadService, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '../../services/fileUploadService';
import { getSubTypeOptions } from '../../constants/propertyOptions';
import { BUILDING_USES } from '../../constants/buildingUses';
import { LAND_USES } from '../../constants/landUses';

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
      <span ref={preRef} data-prefix style={{ position: 'absolute', top: '2px', left: '2px', whiteSpace: 'nowrap', pointerEvents: 'none', fontSize: '12px', lineHeight: '1.5' }}>{prefix}</span>
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
        className="pfp2-rich"
        style={style}
      />
    </div>
  );
}

// 물건 첨부 섹션(공통 재사용) — fileDiv 단위(평면도/물건사진). refKey=ptNo
//  · 회원가입과 동일한 공용 FileUploadForm(드래그앤드롭 + 클릭) 사용. 파일첨부 버튼 제거.
function FileAttachSection({ ptNo, fileDiv, fileTyp, title, userId }) {
  const [files, setFiles] = useState([]);

  const reload = async () => {
    if (!ptNo) { setFiles([]); return; }
    try {
      const items = await fileUploadService.list({ fileDiv, refKey: String(ptNo) });
      // FileUploadForm value 형태(카멜)로 매핑 — previewUrl=서버 Url, fileId 포함(삭제용)
      setFiles((items || []).map((f) => ({
        origName: f.OrigName, objectKey: f.ObjectKey, contentType: f.ContentType,
        fileSize: f.FileSize, ext: f.Ext, fileId: f.FileId, previewUrl: f.Url,
      })));
    } catch (e) { console.error('첨부 목록 조회 실패:', e); setFiles([]); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [ptNo, fileDiv]);

  return (
    <div style={{ flex: 1, minWidth: 0, border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
        <ImageIcon className="w-4 h-4" style={{ color: '#4f46e5' }} /> {title}
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>({files.length})</span>
      </div>

      {!ptNo ? (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>
          물건을 먼저 저장한 후 첨부할 수 있습니다.
        </div>
      ) : (
        <FileUploadForm
          label={`${MAX_UPLOAD_LABEL} 이하 · 여러 개 첨부 가능`}
          accept={fileTyp === 'SYFTY01' ? 'image/*' : ''}
          fileTyp={fileTyp}
          fileDiv={fileDiv}
          refKey={String(ptNo)}
          multiple
          maxBytes={MAX_UPLOAD_BYTES}
          value={files}
          onChange={setFiles}
          userId={userId}
        />
      )}
    </div>
  );
}

const PropertyFormPageV2 = ({ editData = null, onClose, onSuccess, copyData = null, lockAddress = false, lockType = false, lockFloor = false, defaultPtType: defaultPtTypeRaw = null }) => {
  // 필터값('SYCA101,SYCA103'처럼 복수코드)이 들어와도 단일 물건유형 코드로 정규화
  const defaultPtType = defaultPtTypeRaw ? String(defaultPtTypeRaw).split(',')[0] : null;
  console.log(editData);
  const { user } = useAuthStore();
  const { openWithProperty } = useHubModalStore();

  // 디버깅: user 객체 확인
  console.log('PropertyFormPage user:', user);
  const [activeTab, setActiveTab] = useState('property');
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    ownerInfo: false,
    tenantInfo: false,
  });
  const [holders, setHolders] = useState([]);
  const [danjiList, setDanjiList] = useState([]);
  const [danjiAreaList, setDanjiAreaList] = useState([]); // 단지 타입(면적) 목록 - 면적 row 타입 드롭박스용
  const [consultations, setConsultations] = useState([]);
  const [consultOn] = useConsultMode(); // 상담모드 ON 시 물건특징·상담내용 카드 숨김
  const [consultSort, setConsultSort] = useState('desc');     // 상담내용 날짜 정렬(desc: 최신순)
  const [consultFilter, setConsultFilter] = useState('');     // 상담내용 검색어
  const [consultField, setConsultField] = useState('내용');   // 상담내용 검색 기준(성함/전화번호/내용)
  const [deletedMemoNos, setDeletedMemoNos] = useState([]);   // 저장 시 삭제할 기존 메모 번호
  const [deletedItvNos, setDeletedItvNos] = useState([]);     // 저장 시 삭제할 기존 상담내용 번호
  const [shareHistory, setShareHistory] = useState([]);
  const [showShareHistoryModal, setShowShareHistoryModal] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);          // 과거데이터(pt_sale_old) 건수
  const [historyList, setHistoryList] = useState([]);           // 과거내역 목록
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 물건 삭제 확인 모달
  const [showResetConfirm, setShowResetConfirm] = useState(false); // 입력초기화 확인 모달
  const [showHolderChangeModal, setShowHolderChangeModal] = useState(false); // 소유자/임차인 변경 모달
  const [holderChangeSel, setHolderChangeSel] = useState({ OWNER: false, BUYER: false }); // 변경 대상 체크
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCount, setScheduleCount] = useState(0); // 이 물건의 예정(미래) 일정 수
  const [memos, setMemos] = useState([]);
  const [newMemoContent, setNewMemoContent] = useState('');
  const [displayMemoContent, setDisplayMemoContent] = useState('');
  const [newMemoDate, setNewMemoDate] = useState('');
  const [showMemoInput, setShowMemoInput] = useState(false);
  const [editingMemoNo, setEditingMemoNo] = useState(null);
  const [editingMemoContent, setEditingMemoContent] = useState('');
  const [editingMemoDate, setEditingMemoDate] = useState('');
  const [memoTextareaRef, setMemoTextareaRef] = useState(null);
  const [activeMemoIdx, setActiveMemoIdx] = useState(null);   // 활성(포커스된) 메모 행
  const [activeMemoRef, setActiveMemoRef] = useState(null);   // 활성 메모 contentEditable DOM
  const memoRangeRef = useRef({ el: null, range: null });     // 마지막 메모 선택 범위(글자색/삽입용)
  const consultRangeRef = useRef({ el: null, range: null });  // 마지막 상담 선택 범위
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [eupMyeonDongList, setEupMyeonDongList] = useState([]);
  const [selectedSido, setSelectedSido] = useState('');
  const [selectedSigungu, setSelectedSigungu] = useState('');
  const [selectedEupMyeonDong, setSelectedEupMyeonDong] = useState('');
  const [isDanjiLoading, setIsDanjiLoading] = useState(false);
  const [formData, setFormData] = useState({
    ptName: '',
    ptSts: 'PTSTS01', // 물건상태
    ptType: 'SYCA101', // 물건유형 (아파트)
    ptExpl: '',
    saleDiv: [], // 거래구분 (배열, 기본 전부 해당없음)
    etcLeaseType: [],       // 기타임대유형 (단기임대/깔세/연세, 복수선택)
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
    evChargerCnt: '',       // 전기차충전대수(아파트 계열)
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
    offNo: user?.offNo || null,
    rtNo: user?.rtNo || null,
    mvnPsbYn: 'N',
    houseRental: 'N',
    petYn: 'N',
    top: '',
    ptMemo: '',
    registryOwner: '',        // 등기상 소유자
    contractTenant: '',       // 계약서상 임차인
    etcAmt2: '',              // 기타임대 금액2
    childYn: 'N',             // 어린이 가능여부 (Y/N/C=조건부)
    childCond: '',            // 어린이 조건부 내용
    petAllow: '',             // 반려동물 가능여부 (가능/불가능/조건부)
    petCond: '',              // 반려동물 조건부 내용
    lendAmt: '',              // 대출액
    lendAmtAft: '',           // 잔금 후 대출액
    depLoanBank: '',          // 보증금대출 은행
    depLoanAmt: '',           // 보증금대출 금액
    pastDataYn: 'N',          // 과거데이터 여부
    userId: user?.userId || '',
    landUse: '',              // 용도지역
    buildingUse: '',          // 건축물용도
    landCategory: '',         // 지목
    otherRestrictions: '',    // 기타제한사항
    contractRenewalRight: '', // 계약갱신청구권
    currentStatus: '',        // 현상태
    businessType: '',         // 업종
    businessName: '',         // 상호
    recommendedBusiness: '',  // 추천업종 (프론트 전용, 백엔드 연동 예정)
    elevatorCnt: '',          // 승강기수 (프론트 전용, 백엔드 연동 예정)
    stairsCnt: '',            // 계단수 (프론트 전용, 백엔드 연동 예정)
    subType: '',              // 세부유형 (상가/사무실, 프론트 전용, 백엔드 연동 예정)
    facilityCost: '',         // 시설비 (상가/사무실, 프론트 전용, 백엔드 연동 예정)
    cityGas: '',              // 도시가스 (상가/사무실: 인입완료/인입가능/인입불가)
    powerReceiving: '',       // 수전 (상가/사무실: 설치/미설치)
    elecCapacity: '',         // 전기용량(kW) (상가/사무실)
    buildingForm: '',         // 건물형태 (아파트 계열: 판상형/타워형, 프론트 전용, 백엔드 연동 예정)
    grossArea: '',            // 연면적 (상가/사무실, 프론트 전용, 백엔드 연동 예정)
    jibun: '',                // 지번 (모든 유형 공통)
    maintZoneName: '',        // 정비구역명 (재건축)
    zoneAdjust: false,        // 청약조정대상지역 (아파트, 프론트 전용, 백엔드 연동 예정)
    zoneOverheat: false,      // 투기과열지구 (아파트, 프론트 전용, 백엔드 연동 예정)
    zoneSpec: false,          // 투기지역 (아파트, 프론트 전용, 백엔드 연동 예정)
    zoneLandPermit: false,    // 토지거래허가구역 (아파트/토지, 프론트 전용, 백엔드 연동 예정)
    // 토지 전용 (프론트 전용, 백엔드 연동 예정)
    buildPermit: false,       // 건축허가 여부
    permitDate: '',           // 건축허가일
    roadInfo: '',             // 도로
    zoneDevRestrict: false,   // 개발제한구역
    rightSurface: false,      // 지상권
    rightGrave: false,        // 분묘기지권
    rightEasement: false,     // 지역권
    parcels: [],              // 토지 다필지 목록 (프론트 전용, land_additional 연동 예정)
  });

  // 물건에 연동된 일정 중 아직 안 지난 것 개수 (일정관리 버튼 배지)
  const loadScheduleCount = async () => {
    const ptNo = formData.ptNo || editData?.ptNo;
    if (!ptNo) { setScheduleCount(0); return; }
    try {
      const res = await scheduleService.getSchedulesByProperty(ptNo);
      const list = res?.data?.schedules || [];
      const now = new Date();
      setScheduleCount(list.filter((s) => s.startAt && new Date(s.startAt) >= now).length);
    } catch { setScheduleCount(0); }
  };
  useEffect(() => {
    loadScheduleCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.ptNo, editData?.ptNo]);

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

  // 기타임대유형(기타임대 선택 시 복수선택) — 콤마구분 문자열로 저장
  const etcLeaseTypes = [
    { value: '단기임대', label: '단기임대' },
    { value: '깔세', label: '깔세' },
    { value: '년세', label: '년세' },
  ];

  // 아파트 계열(단지형) 여부 — 단지명 드롭다운 / 방·욕실·현관·건물구조·세대수·발코니 노출 기준
  const isAptRelated = APARTMENT_RELATED_CODES.includes(formData.ptType);
  // 분양권 폼(SalesRightForm) 사용 여부 — 아파트분양권/오피스텔분양권 (ApartmentForm보다 먼저 검사)
  const isSalesRightForm = SALES_RIGHT_FORM_CODES.includes(formData.ptType);
  // 아파트 폼(ApartmentForm) 사용 여부 — 아파트/오피스텔/주상복합/주상복합분양권 (재건축·재개발·분양권폼 제외)
  const isApartmentForm = APARTMENT_FORM_CODES.includes(formData.ptType) && !isSalesRightForm;
  // 상가/사무실 여부 — 권리금 컬럼 / 추천업종(업종·상호) 노출 기준
  const isCommercial = COMMERCIAL_OFFICE_CODES.includes(formData.ptType);
  // 건물(빌딩) 폼 여부 — 빌딩/건물(SYCA108)
  const isBuildingForm = BUILDING_FORM_CODES.includes(formData.ptType);
  // 주택 폼 여부 — 주택(SYCA119, 단독 | 다가구)
  const isHouseForm = HOUSE_FORM_CODES.includes(formData.ptType);
  // 숙박 | 펜션 폼 여부 (SYCA110) — 소재지 바는 건물과 동일(BuildingAddressBar)
  const isLodgingForm = LODGING_FORM_CODES.includes(formData.ptType);
  // 공장 | 창고 폼 여부 (SYCA111) — 소재지 바는 건물과 동일(BuildingAddressBar)
  const isFactoryForm = FACTORY_FORM_CODES.includes(formData.ptType);
  // 지식산업센터 폼 여부 (SYCA116) — 상가폼 복사본
  const isKnowledgeForm = KNOWLEDGE_FORM_CODES.includes(formData.ptType);
  // 빌라·연립 폼 여부 (SYCA118) — 아파트폼 복사본, 일반 주소
  const isBillaForm = BILLA_FORM_CODES.includes(formData.ptType);
  // 원투룸 폼 여부 (SYCA117) — 빌라폼 복사본, 일반 주소
  const isOneRoomForm = ONEROOM_FORM_CODES.includes(formData.ptType);
  // 재개발·재건축 폼 여부 (SYCA104/120) — 아파트폼 복사본, 단지선택 없는 소재지
  const isRedevForm = REDEV_FORM_CODES.includes(formData.ptType);
  // 재개발·재건축 세부유형: '분양권'이면 아파트분양권(SalesRightForm)과 동일(종전주소 없음), 그 외(입주권 기본)는 RedevelopmentForm
  const isRedevBunyang = isRedevForm && formData.subType === '분양권';
  const isRedevJipju = isRedevForm && !isRedevBunyang; // 입주권(기본)
  // 세부유형(입주권/분양권) 드롭다운 노출 대상 — 재개발/재건축 (아파트분양권 SYCA105은 세부유형 없음)
  const hasJipjuBunyangSub = isRedevForm;
  // 토지 여부
  const isLand = formData.ptType === 'SYCA115';
  // 토지 필지목록 모달 — 소재지 바(LandAddressBar)의 버튼과 상세폼(LandForm)의 모달이 공유
  const [showParcelModal, setShowParcelModal] = useState(false);

  // 소재지/물건명 바 — 물건유형별 컴포넌트 분기 (case문)
  //  part='location'(소재지: 지역+지번), part='name'(물건명: 단지/건물/동·호)
  const renderAddressBar = (part = 'location') => {
    const common = { formData, handleChange, setDanjiList, part };
    switch (true) {
      case isRedevJipju:
        return <RedevAddressBar {...common} danjiList={danjiList} setDanjiAreaList={setDanjiAreaList} />;
      case isAptRelated:
        return <AptAddressBar {...common} danjiList={danjiList} setDanjiAreaList={setDanjiAreaList} />;
      case isLand:
        return <LandAddressBar {...common} setFormData={setFormData} parcelCount={(formData.parcels || []).filter((p) => ['jibun','landArea','landCategory','landUse','otherRestrictions'].some((k) => String(p[k] || '').trim() !== '')).length} onOpenParcelModal={() => setShowParcelModal(true)} />;
      case isBuildingForm:
        return <BuildingAddressBar {...common} />;
      case isLodgingForm || isFactoryForm:
        return <FacilityAddressBar {...common} />;
      default:
        return <DefaultAddressBar {...common} />;
    }
  };

  // 물건명 row 노출 여부 — 토지도 명칭(물건명) 입력을 위해 노출(LandAddressBar name 파트)
  const hasPtNameRow = true;
  // 해당층/총층 노출 여부 — 토지·건물·숙박·공장은 소재지/물건명 바 자체 층 입력으로 대체
  const showFloorPair = !isLand && !isBuildingForm && !isLodgingForm && !isFactoryForm;

  // 물건명 row — 폼(면적 row) 바로 위에 붙는 보라색 라벨 행
  //  단지목록/동/호/해당층/총층 또는 건물명. 토지는 미노출.
  const renderPtNameRow = () => {
    if (!hasPtNameRow) return null;
    return (
      <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderBottom: 'none', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
        <div style={{ width: '90px', flexShrink: 0, padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>물건명</div>
        <div style={{ flex: 1, minWidth: 0, padding: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {(editData || lockAddress) ? (
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
              {[
                [formData.addr4, formData.addr5].filter(Boolean).join(' '),
                formData.dong ? `${formData.dong}동` : '',
                formData.ho ? `${formData.ho}호` : '',
                showFloorPair && formData.floor1 ? `${formData.floor1}층` : '',
                showFloorPair && formData.floor2 ? `/ ${formData.floor2}층` : '',
              ].filter(Boolean).join(' ') || '-'}
            </span>
          ) : (
            <>
              {renderAddressBar('name')}
              {/* 해당층/총층 — 토지·건물·숙박·공장은 숨김 (바의 지하/지상 층으로 대체) */}
              {showFloorPair && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500' }}>해당층</label>
                    <input type="number" value={formData.floor1 || ''} onChange={(e) => handleChange('floor1', e.target.value)} readOnly={lockFloor} style={{ width: '40px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', ...(lockFloor ? { background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}) , textAlign: 'right' }} placeholder="해당층" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500' }}>총층</label>
                    <input type="number" value={formData.floor2 || ''} onChange={(e) => handleChange('floor2', e.target.value)} readOnly={lockFloor} style={{ width: '40px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', ...(lockFloor ? { background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}) , textAlign: 'right' }} placeholder="총층" />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // 물건특징/상담내용 카드 좌측 액션 — 밑줄 텍스트(흰색), 네 항목을 하나의 박스로 묶음
  const linkBtnStyle = { padding: '2px 2px', fontSize: '12px', fontWeight: 700, border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', textDecoration: 'none' };
  const linkSelectStyle = { padding: '2px 2px', fontSize: '12px', fontWeight: 700, border: 'none', background: 'transparent', color: 'white', cursor: 'pointer' };
  // 네 항목을 감싸는 박스
  const linkGroupBoxStyle = { display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'center', alignSelf: 'center', marginTop: '16px', border: '1px solid rgba(255,255,255,0.85)', borderRadius: '5px', padding: '7px 8px' };

  const tabs = [
    { id: 'property', label: '기본정보', icon: FileText },
    { id: 'attachments', label: '평면도/사진', icon: Paperclip },
  ];

  useEffect(() => {
    const loadDetailData = async () => {
      if (editData?.ptNo) {
        try {
          // 상세 조회 API 호출
          const response = await propertyService.getDetail(editData.ptNo);
          if (response?.data) {
            const detailData = response.data;
            setFormData({
              ptName: '',
              ptSts: 'PTSTS01',
              ptType: 'SYCA101',
              ptExpl: '',
              saleDiv: [],
              etcLeaseType: [],
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
              offNo: user?.offNo || null,
              rtNo: user?.rtNo || null,
              mvnPsbYn: 'N',
              houseRental: '',
              petYn: 'N',
              top: '',
              ptMemo: '',
              registryOwner: '',
              contractTenant: '',
              etcAmt2: '',
              childYn: 'N',
              childCond: '',
              petAllow: '',
              petCond: '',
              lendAmt: '',
              lendAmtAft: '',
              depLoanBank: '',
              depLoanAmt: '',
              pastDataYn: 'N',
              userId: user?.userId || '',
              regDt: '',
              regId: '',
              updDt: '',
              updId: '',
              ...detailData,
              // null/undefined 체크
              ptSts: detailData.ptSts || 'PTSTS01',
              saleDiv: detailData.saleDiv ? (typeof detailData.saleDiv === 'string' ? detailData.saleDiv.split(',').filter(Boolean) : detailData.saleDiv) : [],
              etcLeaseType: detailData.etcLeaseType ? (typeof detailData.etcLeaseType === 'string' ? detailData.etcLeaseType.split(',').filter(Boolean) : detailData.etcLeaseType) : [],
            });

            // BjdCode로 주소 select 자동 설정
            if (detailData.bjdCode) {
              await loadAddressFromBjdCode(
                detailData.bjdCode,
                setSidoList,
                setSigunguList,
                setEupMyeonDongList,
                setSelectedSido,
                setSelectedSigungu,
                setSelectedEupMyeonDong
              );

              // 단지 목록도 자동 조회 (아파트/오피스텔 등인 경우)
              const isDanjiProperty = APARTMENT_RELATED_CODES.includes(detailData.ptType);
              if (isDanjiProperty && detailData.bjdCode) {
                setIsDanjiLoading(true);
                try {
                  const data = await addressService.getDanjiListByBjd(detailData.bjdCode);
                  setDanjiList(data || []);
                } catch (error) {
                  console.error('단지 목록 조회 실패:', error);
                } finally {
                  setIsDanjiLoading(false);
                }
              }

              // 수정 진입 시 물건명 바(DanjiSelector)는 정적 텍스트로 대체되어 타입(면적) 목록이 로드되지 않음
              //  → 타입 드롭다운(면적 row)이 저장된 aptTyp를 선택 표시하도록 여기서 직접 타입 목록 로드
              if (isDanjiProperty && detailData.danjiCode) {
                try {
                  const areaData = await addressService.getAreaListByDanji(detailData.danjiCode);
                  setDanjiAreaList(areaData || []);
                } catch (error) {
                  console.error('타입(면적) 목록 조회 실패:', error);
                }
              }
            }

            // holders 데이터 설정 (API 응답에 이미 포함되어 있음)
            if (detailData.holders && detailData.holders.length > 0) {
              setHolders(detailData.holders);
            }

            // 부동산공유(공인중개사) 이력 설정
            setShareHistory(detailData.shares || []);

            // 과거데이터(pt_sale_old) 건수 설정
            setHistoryCount(detailData.historyCount || 0);
          }
        } catch (error) {
          console.error('상세 데이터 로드 실패:', error);
        }
      }
    };

    console.log('=== PropertyFormPage useEffect triggered ===');
    console.log('editData:', editData);
    console.log('editData?.ptNo:', editData?.ptNo);
    console.log('Current formData before update:', formData);

    setDeletedMemoNos([]);
    setDeletedItvNos([]);
    if (copyData && !(editData && editData.ptNo)) {
      // 복사 등록: 현재 내용 그대로 신규 등록창에 자동 입력 (식별자만 초기화)
      setFormData((prev) => ({ ...prev, ...copyData, ptNo: '', regDt: '', regId: '', updDt: '', updId: '', pastDataYn: 'N' }));
      // 배치도 등에서 복사 등록 시 물건명 바(DanjiSelector)가 잠겨 타입(면적) 목록이 로드되지 않음
      //  → 타입 드롭다운(면적 row)이 자동입력된 aptTyp를 선택 표시하도록 타입 목록 직접 로드
      if (copyData.danjiCode && APARTMENT_RELATED_CODES.includes(copyData.ptType)) {
        addressService.getAreaListByDanji(copyData.danjiCode)
          .then((areaData) => setDanjiAreaList(areaData || []))
          .catch((err) => console.error('타입(면적) 목록 조회 실패:', err));
      }
    } else if (editData && editData.ptNo) {
      console.log('Branch: Loading existing property data');
      loadDetailData();
      loadMemos(editData.ptNo);
      loadConsultations(editData.ptNo);
    } else {
      // 초기화 (신규 등록 또는 ptNo가 null인 경우) — 현재 탭(물건유형)이 있으면 자동선택
      console.log('Branch: Initializing form for new property');
      setFormData({
        ptName: '',
        ptSts: 'PTSTS01',
        ptType: defaultPtType || 'SYCA101',
        ptExpl: '',
        saleDiv: [],
        etcLeaseType: [],
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
        offNo: user?.offNo || null,
        rtNo: user?.rtNo || null,
        mvnPsbYn: 'N',
        houseRental: '',
        petYn: 'N',
        top: '',
        ptMemo: '',
        registryOwner: '',
        contractTenant: '',
        etcAmt2: '',
        childYn: 'N',
        childCond: '',
        petAllow: '',
        petCond: '',
        lendAmt: '',
        lendAmtAft: '',
        depLoanBank: '',
        depLoanAmt: '',
        pastDataYn: 'N',
        userId: user?.userId || '',
      });
      console.log('Form data reset complete for new property');
      setHolders([]);
      setMemos([]);
      setConsultations([]);
      console.log('Holders cleared');
    }
    console.log('=== useEffect complete ===');
  }, [editData]);

  const loadHolders = async (ptNo) => {
    try {
      const response = await holderService.getList(ptNo);
      if (response.success && response.data?.ptHolders) {
        setHolders(response.data.ptHolders);
      } else if (!response.success) {
        console.warn('소유주 정보 조회 실패 (백엔드 오류):', response.error);
        setHolders([]); // 빈 배열로 설정
      }
    } catch (error) {
      console.error('소유주 정보 조회 실패:', error);
      setHolders([]); // 빈 배열로 설정
    }
  };

  const loadMemos = async (ptNo) => {
    try {
      const response = await propertyMemoService.getMemoList(ptNo);
      if (response.success && response.data) {
        setMemos(response.data);
      }
    } catch (error) {
      console.error('메모 목록 조회 실패:', error);
      setMemos([]);
    }
  };

  // 상담내용 = 상담관리(ct_interview) 테이블 (pt_no 기준)
  const loadConsultations = async (ptNo) => {
    if (!ptNo) { setConsultations([]); return; }
    try {
      const res = await interviewService.getByProperty(ptNo);
      const list = res?.data?.interviews || res?.data?.Interviews || [];
      setConsultations(list.map((i) => ({
        itvNo: i.itvNo,
        // 시간까지 표기: reg_dt(타임스탬프) 우선, 없으면 itv_date(날짜)
        datetime: (i.regDt || i.itvDate || '').toString().replace('T', ' ').slice(0, 16),
        userId: i.regId || '',
        content: i.itvContent || '',
        contactName: i.contactName || '',
        contactPhone: i.contactPhone || '',
      })));
    } catch (error) {
      console.error('상담내용 조회 실패:', error);
      setConsultations([]);
    }
  };

  // 상담내용 행 삭제: 로컬에서만 제거, 기존 이력이면 삭제 목록에 기록
  const deleteConsultRow = (index) => {
    const entry = consultations[index];
    if (entry?.itvNo) setDeletedItvNos((prev) => [...prev, entry.itvNo]);
    setConsultations((prev) => prev.filter((_, i) => i !== index));
  };

  // 메모/상담내용은 물건 저장(PUT/POST) 시 propertyData에 함께 담아 한 번에 전송
  // (백엔드가 신규 INSERT / 변경분만 UPDATE / 없어진 것 DELETE 처리)

  // 메모는 개별 저장하지 않고 목록에만 추가 → 모달 저장 시 일괄 반영
  const handleCreateMemo = (/* ptNo (미사용) */) => {
    if (!newMemoContent.trim()) {
      toast.error('메모 내용을 입력하세요.');
      return;
    }
    const tempMemo = {
      memoNo: `temp_${Date.now()}`,
      memoDate: newMemoDate,
      memoContent: newMemoContent,
      userId: user?.userId || '담당자',
      isTemp: true,
    };
    setMemos([...memos, tempMemo]);
    setNewMemoContent('');
    setDisplayMemoContent('');
    setNewMemoDate('');
    setShowMemoInput(false);
  };

  const handleUpdateMemo = async (memoNo) => {
    if (!editingMemoContent.trim()) {
      toast.error('메모 내용을 입력하세요.');
      return;
    }

    try {
      await propertyMemoService.updateMemo(editData?.ptNo, memoNo, {
        memoDate: editingMemoDate,
        memoContent: editingMemoContent,
      });
      toast.success('메모가 수정되었습니다.');
      setEditingMemoNo(null);
      await loadMemos(editData?.ptNo);
    } catch (error) {
      console.error('메모 수정 실패:', error);
      toast.error('메모 수정에 실패했습니다.');
    }
  };

  const handleDeleteMemo = async (memoNo) => {
    if (!window.confirm('이 메모를 삭제하시겠습니까?')) return;

    // 임시 메모인 경우 로컬에서만 삭제
    const memo = memos.find(m => m.memoNo === memoNo);
    if (memo?.isTemp) {
      setMemos(memos.filter(m => m.memoNo !== memoNo));
      toast.success('메모가 삭제되었습니다.');
      return;
    }

    // 실제 저장된 메모는 API 호출
    try {
      await propertyMemoService.deleteMemo(editData?.ptNo, memoNo);
      toast.success('메모가 삭제되었습니다.');
      await loadMemos(editData?.ptNo);
    } catch (error) {
      console.error('메모 삭제 실패:', error);
      toast.error('메모 삭제에 실패했습니다.');
    }
  };

  // 인라인 수정: 로컬 목록만 갱신 → 모달 저장 시 일괄 반영
  const saveMemoInline = (memo, html) => {
    const next = html || '';
    if (next === (memo.memoContent || '')) return;
    setMemos((prev) => prev.map((m) => (m.memoNo === memo.memoNo ? { ...m, memoContent: next } : m)));
  };

  // 인라인 삭제(빈 내용에서 삭제키): 로컬에서만 제거, 기존 메모면 삭제 목록에 기록
  const deleteMemoInline = (memo) => {
    if (!memo.isTemp) setDeletedMemoNos((prev) => [...prev, memo.memoNo]);
    setMemos((prev) => prev.filter((m) => m.memoNo !== memo.memoNo));
  };

  const insertDateAtCursor = () => {
    if (!memoTextareaRef) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const start = memoTextareaRef.selectionStart;
    const end = memoTextareaRef.selectionEnd;
    const text = newMemoContent;
    const newText = text.substring(0, start) + `[${dateStr}] ` + text.substring(end);
    setNewMemoContent(newText);
    setTimeout(() => {
      memoTextareaRef.selectionStart = memoTextareaRef.selectionEnd = start + dateStr.length + 3;
      memoTextareaRef.focus();
    }, 0);
  };

  const insertSpecialChar = (char) => {
    if (!memoTextareaRef) return;
    const start = memoTextareaRef.selectionStart;
    const end = memoTextareaRef.selectionEnd;
    const text = displayMemoContent;
    const newText = text.substring(0, start) + char + text.substring(end);
    setNewMemoContent(newText);
    setDisplayMemoContent(newText);
    setTimeout(() => {
      memoTextareaRef.selectionStart = memoTextareaRef.selectionEnd = start + char.length;
      memoTextareaRef.focus();
    }, 0);
  };

  const applyColor = (color) => {
    if (!memoTextareaRef) return;
    const start = memoTextareaRef.selectionStart;
    const end = memoTextareaRef.selectionEnd;
    const selectedText = displayMemoContent.substring(start, end);
    if (!selectedText) {
      toast.error('색상을 적용할 텍스트를 선택하세요.');
      return;
    }
    const coloredText = `<span style="color: ${color}">${selectedText}</span>`;
    const text = displayMemoContent;
    const newText = text.substring(0, start) + coloredText + text.substring(end);

    // 실제 저장용 HTML 태그 포함 버전
    setNewMemoContent(newText);
    // 화면 표시용 (HTML 렌더링)
    setDisplayMemoContent(newText);

    setTimeout(() => {
      memoTextareaRef.selectionStart = memoTextareaRef.selectionEnd = start + selectedText.length;
      memoTextareaRef.focus();
    }, 0);
  };

  // 물건특징: 상담내용 카드와 동일한 방식(행별 textarea, 활성행 추적)
  // [날짜입력] 클릭 시 새 메모 행 추가 (저장은 모달 저장 시 일괄 반영)
  const blankMemo = () => {
    const kst = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
    return { memoNo: `temp_${Date.now()}`, memoDate: kst.toISOString().slice(0, 16), memoContent: '', userId: user?.userId || '담당자', isTemp: true };
  };
  const blankConsult = () => {
    const dateStr = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    return { datetime: dateStr, userId: user?.userId || user?.userName || '담당자', content: '' };
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
  // 날짜 표시 포맷: 년2자리.월.일.시:분 (공백 없이). 다양한 입력(ISO/한글/공백형) 대응
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
    if (memo && !memo.isTemp) setDeletedMemoNos((prev) => [...prev, memo.memoNo]);
    setMemos((prev) => prev.filter((_, i) => i !== index));
    setActiveMemoIdx((cur) => (cur === index ? null : cur));
  };

  // 상담내용 - 활성(포커스된) 입력칸 추적 + 삽입
  const [activeConsultIdx, setActiveConsultIdx] = useState(null);
  const [activeConsultRef, setActiveConsultRef] = useState(null);
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

  // 전화번호 버튼 → 소유자/임차인/공인중개사 카드에 등록된 전화번호 모아 모달 선택
  const [phonePickerOpen, setPhonePickerOpen] = useState(false);
  const [phonePickerList, setPhonePickerList] = useState([]);
  const [phonePickerTarget, setPhonePickerTarget] = useState('memo');
  const gatherPhones = () => {
    const list = [];
    (holders || []).forEach((h) => {
      if (h.holderPhone && String(h.holderPhone).trim()) {
        const role = h.holderType === 'BUYER' ? '임차인' : '소유자';
        list.push({ label: `${role}${h.holderName ? ' ' + h.holderName : ''}`, name: h.holderName || role, phone: String(h.holderPhone).trim() });
      }
    });
    (shareHistory || []).forEach((s) => {
      if (s.officePhone && String(s.officePhone).trim()) list.push({ label: `공인중개사${s.officeName ? ' ' + s.officeName : ''}`, name: s.officeName || '공인중개사', phone: String(s.officePhone).trim() });
    });
    return list;
  };
  const [phonePickerIdx, setPhonePickerIdx] = useState(null); // 연락처를 넣을 대상 행 index
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

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleChange = (field, value) => {
    // undefined나 null을 빈 문자열로 변환하여 controlled input 경고 방지
    const safeValue = value === undefined || value === null ? '' : value;
    setFormData(prev => ({ ...prev, [field]: safeValue }));
  };

  // 종전소재지(재개발·재건축) — AddressSelectorSimple 의 addr1/addr2/... 를 former* 필드로 매핑
  const handleFormerAddrChange = (field, value) => {
    const map = {
      addr1: 'formerAddr1', addr2: 'formerAddr2', addr3: 'formerAddr3', addr4: 'formerAddr4', addr5: 'formerAddr5',
      bjdCode: 'formerBjdCode', danjiCode: 'formerDanjiCode', jibun: 'formerJibun', dong: 'formerDong', ho: 'formerHo',
    };
    handleChange(map[field] || field, value);
  };

  // 면적 row 타입(단지 면적) 선택 시 타입/공급면적/전용면적 자동 채움
  const handleDanjiAreaSelect = (ptpNo) => {
    const selectedArea = danjiAreaList.find(area => area.ptp_no === parseInt(ptpNo));
    if (selectedArea) {
      handleChange('aptTyp', selectedArea.plan_type_name);
      handleChange('supArea', selectedArea.sply_spc ? parseFloat(selectedArea.sply_spc).toFixed(2) : '');
      handleChange('excArea', selectedArea.excls_spc ? parseFloat(selectedArea.excls_spc).toFixed(2) : '');
    } else if (!ptpNo) {
      handleChange('aptTyp', '');
      handleChange('supArea', '');
      handleChange('excArea', '');
    }
  };

  // 과거데이터 건수 클릭 → 과거내역 목록 모달
  const handleOpenHistory = async () => {
    if (!editData?.ptNo) return;
    try {
      const response = await propertyService.getHistory(editData.ptNo);
      setHistoryList(response?.data || []);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error('과거내역 조회에 실패했습니다.');
    }
  };

  // 과거내역에 저장 후 신규등록 (현재 물건을 pt_sale_old로 복사)
  const handleArchive = async () => {
    if (!editData?.ptNo) return;
    if (!window.confirm('현재 물건정보를 과거내역에 저장합니다. 계속하시겠습니까?')) return;
    setArchiving(true);
    try {
      await propertyService.archive(editData.ptNo, user?.userId);
      toast.success('과거내역에 저장되었습니다.');
      // 보관 건수 갱신
      try {
        const response = await propertyService.getHistory(editData.ptNo);
        const list = response?.data || [];
        setHistoryList(list);
        setHistoryCount(list.length);
      } catch (e) { /* 무시 */ }
    } catch (error) {
      toast.error('과거내역 저장에 실패했습니다.');
    } finally {
      setArchiving(false);
    }
  };

  const handleSubmit = async (e, opts = {}) => {
    e?.preventDefault?.();

    // 소재지(법정동코드) 필수 — 미입력 시 실제로는 저장되지 않으므로 저장 차단(등록됐다고 표시되는 문제 방지)
    if (!String(formData.bjdCode || '').trim()) {
      toast.error('소재지를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // holders 배열에서 빈 행 제거하고 등록일자 설정
      const holdersData = holders
        .filter(h => h.holderName || h.holderPhone) // 이름이나 연락처가 있는 행만
        .map(h => ({
          ...h,
          holderRegDate: h.holderRegDate || new Date().toISOString().split('T')[0],
          custNo: h.custNo || null,
        }));

      // 숫자 필드 목록
      const numberFields = ['floor', 'houseCnt', 'floor1', 'floor2', 'roomCnt', 'bathCnt',
        'saleAmt', 'lesAmt', 'protAmt', 'monAmt', 'etcAmt', 'etcAmt2', 'layAmt', 'nowDepAmt', 'nowMonAmt',
        'loanAmt', 'loanAmtAft', 'lendAmt', 'lendAmtAft', 'depLoanAmt', 'maintCost', 'cnNo', 'custNo',
        // 유형별 신규 정수 필드
        'facilityCost', 'elevatorCnt', 'stairsCnt', 'basementFloor', 'groundFloor', 'guestRoomCnt',
        'presaleAmt', 'expansionAmt', 'optionAmt', 'premiumAmt', 'depositTotal', 'loanTotal', 'investAmt',
        'incRentM', 'incRentY', 'incMgmtM', 'incMgmtY', 'incEtcM', 'incEtcY',
        'expLaborM', 'expLaborY', 'expUtilM', 'expUtilY', 'expLoanM', 'expLoanY', 'expEtcM', 'expEtcY',
        // 재개발 전용
        'addContribAmt', 'rightValueAmt', 'movingCost',
        // 전기차충전대수
        'evChargerCnt'];

      const decimalFields = ['supArea', 'excArea', 'landShare', 'pkCnt',
        // 유형별 신규 소수 필드
        'grossArea', 'buildingArea', 'landShareRatio', 'accessRoad', 'officeArea', 'roadInfo',
        // 재개발 전용
        'formerArea'];

      // 빈 문자열은 null(값 지움)로, 숫자 필드는 숫자로 변환.
      //  · 백엔드 UPDATE가 직접 대입(COALESCE 제거)이므로 비운 값(null)은 그대로 저장되어 지워진다.
      //  · 0은 유효값이므로 null로 떨어뜨리지 않는다(parseInt(x) || null 금지).
      // 숫자 변환 헬퍼 (0은 유효값이므로 유지 — parseInt||null 금지). 아래 parcels/lease 변환에서도 재사용
      const toInt = (v) => { if (v === '' || v == null) return null; const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; };
      const toDec = (v) => { if (v === '' || v == null) return null; const n = parseFloat(v); return Number.isNaN(n) ? null : n; };
      const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value === '' || value === undefined) {
          acc[key] = null;
        } else if (numberFields.includes(key) && value !== null) {
          acc[key] = toInt(value);
        } else if (decimalFields.includes(key) && value !== null) {
          acc[key] = toDec(value);
        } else if (key === 'rtNo' && value !== null) {
          // rtNo는 숫자일 수 있지만 문자열로 전송
          acc[key] = String(value);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});

      // 부동산공유(공인중개사) 이력 - 빈 행 제거
      const sharesData = (shareHistory || [])
        .filter(s => s.officeName || s.officePhone || s.regionName || s.memo)
        .map(s => ({
          officeName: s.officeName || null,
          regionName: s.regionName || null,
          officePhone: s.officePhone || null,
          memo: s.memo || null,
        }));

      // 물건특징 payload (신규는 memoNo=null, 기존은 memoNo 유지 → 백엔드가 변경분만 반영)
      // 빈 신규 행(날짜입력만 하고 내용 미입력)은 저장에서 제외
      const memosData = (memos || [])
        .filter(m => (!m.isTemp && !String(m.memoNo).startsWith('temp_')) || (m.memoContent || '').trim())
        .map(m => ({
          memoNo: (m.isTemp || String(m.memoNo).startsWith('temp_')) ? null : m.memoNo,
          memoDate: m.memoDate,
          memoContent: m.memoContent,
          contactName: m.contactName || null,
          contactPhone: m.contactPhone || null,
          userId: m.userId || user?.userId,
        }));

      // 상담내용 payload (신규는 itvNo=null, 기존은 itvNo 유지)
      const consultsData = (consultations || [])
        .filter(c => c.itvNo || (c.content || '').trim())
        .map(c => ({
          itvNo: c.itvNo || null,
          itvContent: c.content,
          contactName: c.contactName || null,
          contactPhone: c.contactPhone || null,
        }));

      // 상담이력: 신규 상담은 전화번호(연락처)를 입력해야 저장 가능
      const consultNoPhone = (consultations || [])
        .filter(c => !c.itvNo && (c.content || '').trim() && !(c.contactPhone || '').trim());
      if (consultNoPhone.length) {
        toast.error('상담이력은 전화번호를 입력해야 저장할 수 있습니다.');
        setLoading(false);
        return;
      }

      // 숫자 변환 헬퍼(toInt/toDec)는 위 cleanedData 블록에서 선언됨 — 재사용

      // 토지 다필지(parcels) — 빈 행 제외 (pt_land_additional 저장)
      const parcelsData = (formData.parcels || [])
        .filter((p) => ['jibun', 'landArea', 'landCategory', 'landUse', 'otherRestrictions'].some((k) => String(p[k] || '').trim() !== ''))
        .map((p) => ({
          dong: p.dong || null,
          soji: p.soji || null,
          bjdCode: p.bjdCode || null,
          jibun: p.jibun || null,
          landArea: toDec(p.landArea),
          landCategory: p.landCategory || null,
          landUse: p.landUse || null,
          otherRestrictions: p.otherRestrictions || null,
        }));

      // 임대차현황서(leaseRows) — 빈 행 제외 (pt_lease_status 저장)
      const leaseRowsData = (formData.leaseRows || [])
        .filter((r) => ['roomNo', 'area', 'curStatus', 'deposit', 'monthlyRent', 'maintCost', 'contractStart', 'contractEnd', 'businessType', 'businessName'].some((k) => String(r[k] || '').trim() !== ''))
        .map((r) => ({
          roomNo: r.roomNo || null,
          area: toDec(r.area),
          curStatus: r.curStatus || null,
          deposit: toInt(r.deposit),
          monthlyRent: toInt(r.monthlyRent),
          maintCost: toInt(r.maintCost),
          contractStart: r.contractStart || null,
          contractEnd: r.contractEnd || null,
          businessType: r.businessType || null,
          businessName: r.businessName || null,
        }));

      // 물건 데이터에 holders/shares/memos/consultations/parcels/leaseRows 통합 (한 번의 요청으로 저장)
      const propertyData = {
        ...cleanedData,
        parcels: parcelsData,
        leaseRows: leaseRowsData,
        saleDiv: Array.isArray(cleanedData.saleDiv) ? cleanedData.saleDiv.join(',') : cleanedData.saleDiv,
        // 기타임대유형: 기타임대(SALEDIV04, 상태접미 포함) 선택 시에만 저장, 아니면 빈 값으로 클리어
        etcLeaseType: (Array.isArray(cleanedData.saleDiv) ? cleanedData.saleDiv : String(cleanedData.saleDiv || '').split(',')).some((c) => String(c).startsWith('SALEDIV04'))
          ? (Array.isArray(cleanedData.etcLeaseType) ? cleanedData.etcLeaseType.join(',') : (cleanedData.etcLeaseType || ''))
          : '',
        holders: holdersData,
        shares: sharesData,
        memos: memosData,
        consultations: consultsData,
      };

      if (editData) {
        await propertyService.update(editData.ptNo, propertyData);
        setDeletedMemoNos([]);
        setDeletedItvNos([]);
        await loadMemos(editData.ptNo);
        await loadConsultations(editData.ptNo);
        toast.success('물건이 수정되었습니다.');
        onSuccess?.();
      } else {
        const response = await propertyService.create(propertyData);
        const newPtNo = response?.data?.ptNo;
        if (newPtNo) {
          setDeletedMemoNos([]);
          setDeletedItvNos([]);
          await loadMemos(newPtNo);
          await loadConsultations(newPtNo);
        }
        toast.success('물건이 등록되었습니다.');
        onSuccess?.();
        // 등록 후에도 창을 닫지 않음 (opts.close면 닫음)
      }
      if (opts.close) onClose?.();
    } catch (error) {
      console.error('물건 저장 실패:', error);
      toast.error(editData ? '물건 수정에 실패했습니다.' : '물건 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 물건 삭제 (수정폼에서만) — saveHistory: true=과거데이터 저장 후 삭제, false=영구 삭제
  const handleDelete = async (saveHistory = false) => {
    if (!editData?.ptNo) return;
    setLoading(true);
    try {
      await propertyService.delete(editData.ptNo, user?.userId, saveHistory);
      toast.success(saveHistory ? '과거데이터 저장 후 삭제되었습니다.' : '물건이 영구히 삭제되었습니다.');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('물건 삭제 실패:', error);
      toast.error('물건 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 소유자/임차인 변경 — 현재 소유자(등기상)/임차인(계약서상)을 과거로 이관
  //  · 탭 타이틀 우측 입력값을 비우고, 하단표에 관계='전 소유자'/'전 임차인' 행 추가(저장일=오늘 → 과거 최신순 상단)
  const canChangeOwner = !!(formData.registryOwner || '').trim();
  const canChangeTenant = !!(formData.contractTenant || '').trim();
  const applyHolderChange = () => {
    const today = new Date().toISOString().split('T')[0];
    const added = [];
    if (holderChangeSel.OWNER && canChangeOwner) {
      added.push({ holderType: 'OWNER', holderName: formData.registryOwner.trim(), holderRelation: '전 소유자', holderPhone: '', holderTelecom: '', holderAddress: '', holderRegDate: today });
    }
    if (holderChangeSel.BUYER && canChangeTenant) {
      added.push({ holderType: 'BUYER', holderName: formData.contractTenant.trim(), holderRelation: '전 임차인', holderPhone: '', holderTelecom: '', holderAddress: '', holderRegDate: today });
    }
    if (added.length === 0) { toast.error('변경할 대상을 선택하세요.'); return; }
    setHolders((prev) => [...prev, ...added]);
    setFormData((prev) => ({
      ...prev,
      registryOwner: holderChangeSel.OWNER ? '' : prev.registryOwner,
      contractTenant: holderChangeSel.BUYER ? '' : prev.contractTenant,
    }));
    setShowHolderChangeModal(false);
    setHolderChangeSel({ OWNER: false, BUYER: false });
    toast.success('과거 소유자/임차인으로 이관되었습니다.');
  };

  // 복사 등록: 현재 내용 그대로 새 등록창을 열어 자동 입력
  const handleCopyRegister = async () => {
    const copy = { ...formData, ptNo: '', regDt: '', regId: '', updDt: '', updId: '', pastDataYn: 'N' };
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'property-form-v2',
          data: { title: '물건 등록 (복사)', copyData: copy },
          width: 1500, height: 900, minWidth: 1500, minHeight: 900, resizable: true,
        });
        return;
      } catch (e) { console.error('복사 등록 창 열기 실패:', e); }
    }
    toast.error('Electron 환경에서만 복사 등록이 가능합니다.');
  };

  // 입력초기화 — 물건유형(ptType)만 유지하고 나머지 입력값 전부 초기화 (공통 확인 모달)
  const handleResetInput = () => {
    const keepType = formData.ptType;
    setFormData((prev) => {
      const cleared = {};
      Object.keys(prev).forEach((k) => { cleared[k] = Array.isArray(prev[k]) ? [] : ''; });
      return {
        ...cleared,
        ptType: keepType,
        ptSts: 'PTSTS01',
        saleDiv: [], etcLeaseType: [], parcels: [],
        shaYn: 'N', mvnPsbYn: 'N', petYn: 'N', childYn: 'N', pastDataYn: 'N',
        offNo: user?.offNo || null, rtNo: user?.rtNo || null, userId: user?.userId || '',
      };
    });
    setHolders([]); setMemos([]); setConsultations([]);
    setDeletedMemoNos([]); setDeletedItvNos([]);
    setSelectedSido(''); setSelectedSigungu(''); setSelectedEupMyeonDong('');
    setDanjiList([]); setDanjiAreaList([]);
    toast.success('입력 내용을 초기화했습니다.');
  };

  return (
    <div className="property-form-page">
      {/* 헤더 */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <h1 className="page-title">{editData ? '물건정보 수정' : '물건정보 등록'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>담당자:</span>
              <input
                type="text"
                value={formData.managerName ?? user?.rtNm ?? user?.userName ?? user?.userId ?? ''}
                onChange={(e) => handleChange('managerName', e.target.value)}
                readOnly={user?.rtType !== 'RTTYP01'}
                title={user?.rtType !== 'RTTYP01' ? '대표 공인중개사만 수정할 수 있습니다.' : ''}
                placeholder="담당자명"
                style={{ width: '96px', padding: '3px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#374151', background: user?.rtType !== 'RTTYP01' ? '#f1f5f9' : 'white', cursor: user?.rtType !== 'RTTYP01' ? 'not-allowed' : 'text' }}
              />
            </div>
            <span>등록일자: {(editData && formData.regDt) ? new Date(formData.regDt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
          </div>
          {editData && (
            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}>
              <span style={{ color: '#ef4444', fontWeight: '500' }}>
                최근수정일: {formData.updDt ? new Date(formData.updDt).toLocaleString() : '-'}
              </span>
            </div>
          )}
        </div>

        {/* 탭 토글 버튼 */}
        <div style={{ display: 'flex', gap: '4px', marginRight: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('property')}
            style={{
              padding: '4px 12px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              background: activeTab === 'property' ? '#3b82f6' : 'white',
              color: activeTab === 'property' ? 'white' : '#64748b',
              cursor: 'pointer',
              borderRadius: '4px 0 0 4px',
              fontWeight: activeTab === 'property' ? '600' : '400',
            }}
          >
            기본정보
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            style={{
              padding: '4px 12px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              background: activeTab === 'attachments' ? '#3b82f6' : 'white',
              color: activeTab === 'attachments' ? 'white' : '#64748b',
              cursor: 'pointer',
              borderRadius: '0 4px 4px 0',
              fontWeight: activeTab === 'attachments' ? '600' : '400',
            }}
          >
            평면도/사진
          </button>
        </div>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="page-form">
        {/* 숫자 입력 인풋의 증감(스피너) 화살표 숨김 */}
        <style>{`
          .page-form input[type=number]::-webkit-inner-spin-button,
          .page-form input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
          .page-form input[type=number] { -moz-appearance: textfield; appearance: textfield; }
          /* 특수문자/글자색 드롭다운: 펼친 옵션은 흰 배경에 검정 글자로 보이게 */
          .pfp2-link-select option { color: #111827; background: #ffffff; font-weight: 400; }
          /* 메모/상담 리치텍스트: 비었을 때 placeholder */
          .pfp2-rich:empty:before { content: attr(data-ph); color: #94a3b8; pointer-events: none; }
          /* 첫 줄만 prefix 만큼 들여쓰고, 엔터로 생긴 새 줄(블록)은 좌측 끝부터 시작 */
          .pfp2-rich div, .pfp2-rich p { text-indent: 0 !important; }
        `}</style>
        <div className="form-content" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '4px' }}>
          {activeTab === 'property' && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '4px' }}>

            {/* 최상단 노란 한 줄: 물건유형 + 세부유형 + 물건상태 + 소재지 (한 줄 통합) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '0 8px 0 0', minHeight: '40px', background: '#fefce8', border: '2px solid #fbbf24', borderBottom: isRedevJipju ? 'none' : '2px solid #fbbf24' }}>
              <span style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', fontSize: '14px', fontWeight: '600', color: '#92400e', background: '#fef3c7', border: '1px solid #fbbf24', whiteSpace: 'nowrap', width: '72px', boxSizing: 'border-box' }}>물건유형</span>
              {(editData || lockType) ? (
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827', padding: '0px 2px', whiteSpace: 'nowrap' }}>
                  {getPropertyTypeLabel(formData.ptType) || formData.ptType || '-'}
                </span>
              ) : (
                <select value={formData.ptType} onChange={(e) => handleChange('ptType', e.target.value)} style={{ width: '132px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', background: 'white', color: '#111827', cursor: 'pointer' }}>
                  {PROPERTY_TYPE_OPTIONS.map((type) => (
                    <option key={type.code} value={type.code}>{type.label}</option>
                  ))}
                </select>
              )}

              {/* 세부유형 (물건유형별 공통 옵션 — propertyOptions.getSubTypeOptions). 아파트분양권(SYCA105)은 세부유형 없음 */}
              {!hasJipjuBunyangSub && formData.ptType !== 'SYCA105' && getSubTypeOptions(formData.ptType).length > 0 && (
                <select value={formData.subType || ''} onChange={(e) => handleChange('subType', e.target.value)} style={{ width: '70px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', background: 'white', color: '#111827', cursor: 'pointer' }}>
                  <option value="">세부유형</option>
                  {getSubTypeOptions(formData.ptType).map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              )}

              {/* 세부유형 (입주권/분양권) — 재개발/재건축·아파트분양권. 분양권 선택 시 아파트분양권과 동일 폼 */}
              {hasJipjuBunyangSub && (
                <select value={formData.subType || (isRedevForm ? '전부' : '')} onChange={(e) => handleChange('subType', e.target.value)} style={{ width: '70px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', background: 'white', color: '#111827', cursor: 'pointer' }}>
                  {formData.ptType === 'SYCA105' && <option value="">세부유형</option>}
                  {isRedevForm && <option value="전부">전부</option>}
                  <option value="입주권">
                    {formData.ptType === 'SYCA104' ? '입주권(재건축)' : formData.ptType === 'SYCA120' ? '입주권(재개발)' : '입주권'}
                  </option>
                  <option value="분양권">분양권</option>
                </select>
              )}

              {/* 소재지 — 같은 줄에 이어붙임(지역+지번) */}
              <span style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', fontSize: '14px', fontWeight: '600', color: '#92400e', background: '#fef3c7', border: '1px solid #fbbf24', whiteSpace: 'nowrap', boxSizing: 'border-box', width: '72px' }}>소재지</span>
              {(editData || lockAddress) ? (
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#111827', padding: '0px 2px' }}>
                  {[formData.addr1, formData.addr2, formData.addr3, formData.jibun].filter(Boolean).join(' ') || '-'}
                </span>
              ) : (
                renderAddressBar('location')
              )}

              {/* 정비구역명 — 재건축(SYCA104)/재개발(SYCA120)일 때 지번(소재지) 우측에 입력창 */}
              {isRedevForm && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', whiteSpace: 'nowrap' }}>정비구역명</label>
                  <input
                    type="text"
                    value={formData.maintZoneName || ''}
                    onChange={(e) => handleChange('maintZoneName', e.target.value)}
                    placeholder="정비구역명"
                    style={{ width: '140px', padding: '2px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}

              {/* 물건상태 (진행중/계약/타계/보류) — 소재지 우측 끝으로 이동 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto', paddingLeft: '10px', borderLeft: '1px solid #fbbf24' }}>
                {propertyStatuses.map((status) => (
                  <React.Fragment key={status.value}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="radio" name="ptSts" checked={formData.ptSts === status.value} onChange={() => handleChange('ptSts', status.value)} style={{ cursor: 'pointer' }} />
                      <span>{status.label}</span>
                    </label>
                    {status.value === 'PTSTS02' && formData.ptSts === 'PTSTS02' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>계약일</label>
                        <input type="date" value={formData.contractDate || ''} onChange={(e) => handleChange('contractDate', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                      </div>
                    )}
                    {status.value === 'PTSTS04' && formData.ptSts === 'PTSTS04' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>보류일</label>
                        <input type="date" value={formData.holdDate || ''} onChange={(e) => handleChange('holdDate', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* 종전유형 / 종전주소 — 재개발·재건축 입주권 전용 (분양권은 아파트분양권과 동일 → 종전주소 없음) */}
            {isRedevJipju && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '0 8px 0 0', minHeight: '30px', background: '#f3f4f6', border: '2px solid #cbd5e1' }}>
                <span style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', fontSize: '13px', fontWeight: '600', color: '#111827', background: '#e5e7eb', border: '1px solid #cbd5e1', boxSizing: 'border-box', whiteSpace: 'nowrap', width: '72px' }}>종전유형</span>
                <select value={formData.formerPtType || ''} onChange={(e) => handleChange('formerPtType', e.target.value)} style={{ width: '104px', padding: '2px 8px', fontSize: '13px', border: '1px solid #cbd5e1', background: 'white', color: '#111827', cursor: 'pointer' }}>
                  <option value="">선택</option>
                  {/* 종전유형: 분양권 계열·원투룸 제외 */}
                  {PROPERTY_TYPE_OPTIONS
                    .filter((type) => !type.label.includes('분양권') && type.code !== 'SYCA117')
                    .map((type) => (
                      <option key={type.code} value={type.code}>{type.label}</option>
                    ))}
                </select>

                <span style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px', fontWeight: '600', color: '#111827', background: '#e5e7eb', border: '1px solid #cbd5e1', boxSizing: 'border-box', width: '72px', whiteSpace: 'nowrap' }}>종전주소</span>
                <AddressSelectorSimple
                  formData={{ bjdCode: formData.formerBjdCode, ptNo: formData.ptNo, ptType: formData.formerPtType }}
                  onChange={handleFormerAddrChange}
                  onDanjiListChange={() => {}}
                  ptType={formData.formerPtType || 'SYCA101'}
                />
                <input type="text" value={formData.formerJibun || ''} onChange={(e) => handleChange('formerJibun', e.target.value)} placeholder="지번" style={{ width: '55px', padding: '2px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                <input type="text" value={formData.formerDong || ''} onChange={(e) => handleChange('formerDong', e.target.value)} placeholder="동" style={{ width: '60px', padding: '2px 8px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                <input type="text" value={formData.formerHo || ''} onChange={(e) => handleChange('formerHo', e.target.value)} placeholder="호" style={{ width: '60px', padding: '2px 8px', fontSize: '13px', border: '1px solid #cbd5e1' }} />

                {/* 종전면적 / 종전대지지분 — 호 우측에 바로 붙임 */}
                <span style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px', fontWeight: '600', color: '#111827', background: '#e5e7eb', border: '1px solid #cbd5e1', boxSizing: 'border-box', whiteSpace: 'nowrap' }}>종전면적</span>
                <input type="text" value={formData.formerArea || ''} onChange={(e) => handleChange('formerArea', e.target.value)} placeholder="종전면적" style={{ width: '52px', padding: '2px 6px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                <span style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px', fontWeight: '600', color: '#111827', background: '#e5e7eb', border: '1px solid #cbd5e1', boxSizing: 'border-box', whiteSpace: 'nowrap' }}>종전대지지분</span>
                <input type="text" value={formData.formerLandShareRatio || ''} onChange={(e) => handleChange('formerLandShareRatio', e.target.value)} placeholder="대지지분" style={{ width: '52px', padding: '2px 6px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
              </div>
            )}

          <div style={{ display: 'flex', gap: '4px', flex: 1, alignItems: 'stretch' }}>
            {/* 좌측: 메인 폼 + 옵션(상세정보 바로 아래에 붙임 — 세로 늘어남 방지). 상담모드 ON 시 우측 숨김 → 100% */}
            <div style={{ width: consultOn ? '100%' : '630px', flexShrink: 0, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column' }}>
            {/* 물건명 row — 면적 row 바로 위 */}
            {renderPtNameRow()}
            {isRedevJipju ? (
              <RedevelopmentForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                danjiAreaList={danjiAreaList}
                handleDanjiAreaSelect={handleDanjiAreaSelect}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : (isSalesRightForm || isRedevBunyang) ? (
              <SalesRightForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                danjiAreaList={danjiAreaList}
                handleDanjiAreaSelect={handleDanjiAreaSelect}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isApartmentForm ? (
              <ApartmentForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                danjiAreaList={danjiAreaList}
                handleDanjiAreaSelect={handleDanjiAreaSelect}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isCommercial ? (
              <CommercialForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isBuildingForm ? (
              <BuildingForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isHouseForm ? (
              <HouseForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                danjiAreaList={danjiAreaList}
                handleDanjiAreaSelect={handleDanjiAreaSelect}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isLodgingForm ? (
              <LodgingForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isFactoryForm ? (
              <FactoryForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isKnowledgeForm ? (
              <KnowledgeCenterForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isBillaForm ? (
              <BillaForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                danjiAreaList={danjiAreaList}
                handleDanjiAreaSelect={handleDanjiAreaSelect}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isOneRoomForm ? (
              <OneRoomForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                danjiAreaList={danjiAreaList}
                handleDanjiAreaSelect={handleDanjiAreaSelect}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
              />
            ) : isLand ? (
              <LandForm
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                propertyStatuses={propertyStatuses}
                handleOpenHistory={handleOpenHistory}
                historyCount={historyCount}
                editData={editData}
                tradeDivisions={tradeDivisions}
                etcLeaseTypes={etcLeaseTypes}
                holders={holders}
                setHolders={setHolders}
                shareHistory={shareHistory}
                setShareHistory={setShareHistory}
                showParcelModal={showParcelModal}
                setShowParcelModal={setShowParcelModal}
              />
            ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1' }}>

              {/* Row 1: 물건상태 (+ 과거데이터 건수) */}
              <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
                <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>물건상태</div>
                <div style={{ flex: 1, padding: '6px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {propertyStatuses.map((status) => (
                    <React.Fragment key={status.value}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        <input
                          type="radio"
                          name="ptSts"
                          checked={formData.ptSts === status.value}
                          onChange={() => handleChange('ptSts', status.value)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{status.label}</span>
                      </label>
                      {/* 계약 선택 시: 계약일 라벨+입력창 */}
                      {status.value === 'PTSTS02' && formData.ptSts === 'PTSTS02' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>계약일</label>
                          <input type="date" value={formData.contractDate || ''} onChange={(e) => handleChange('contractDate', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                        </div>
                      )}
                      {/* 보류 선택 시: 보류일 라벨+입력창 */}
                      {status.value === 'PTSTS04' && formData.ptSts === 'PTSTS04' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>보류일</label>
                          <input type="date" value={formData.holdDate || ''} onChange={(e) => handleChange('holdDate', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  {/* 과거데이터 건수 (클릭 시 목록 모달) — 좌측 구분선 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', borderLeft: '1px solid #cbd5e1', paddingLeft: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap' }}>과거데이터</span>
                    <button
                      type="button"
                      onClick={handleOpenHistory}
                      disabled={!editData?.ptNo || historyCount === 0}
                      title={historyCount > 0 ? '과거내역 목록 보기' : '과거내역 없음'}
                      style={{
                        width: '50px', padding: '0px 2px', fontSize: '13px',
                        border: '1px solid #cbd5e1',
                        background: historyCount > 0 ? '#eef2ff' : '#f1f5f9',
                        color: historyCount > 0 ? '#4f46e5' : '#64748b',
                        fontWeight: historyCount > 0 ? '700' : '400',
                        textAlign: 'center',
                        cursor: (editData?.ptNo && historyCount > 0) ? 'pointer' : 'default',
                        textDecoration: historyCount > 0 ? 'underline' : 'none',
                      }}
                    >
                      {historyCount}
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap' }}>건</span>
                  </div>
                </div>
              </div>

              {/* Row 5: 면적 */}
              <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
                <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <div>면적</div>
                  <button type="button" onClick={() => setFormData((p) => {
                    const toPyeong = (p.areaUnit || '㎡') === '㎡'; // ㎡→평 방향
                    const factor = toPyeong ? 0.302500 : 3.305785; // 1평=3.305785㎡
                    const conv = (v) => (v === '' || v == null || isNaN(Number(v))) ? v : String(Math.round(Number(v) * factor * 100) / 100);
                    return { ...p, areaUnit: toPyeong ? '평' : '㎡', supArea: conv(p.supArea), excArea: conv(p.excArea), landShare: conv(p.landShare), grossArea: conv(p.grossArea) };
                  })}
                    title="평 / ㎡ 전환 (값도 함께 환산)"
                    style={{ fontSize: '13px', fontWeight: '700', padding: '1px 8px', border: '1px solid #cbd5e1', borderRadius: '3px', background: 'white', color: '#5b4aa8', cursor: 'pointer' }}>
                    {formData.areaUnit || '㎡'}
                  </button>
                </div>
                <div style={{ flex: 1, padding: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* 타입 (아파트형일 때만 표시 - 소재지에서 이동) */}
                    {['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'].includes(formData.ptType) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>타입</label>
                        {danjiAreaList.length > 0 ? (
                          <select
                            value={danjiAreaList.find(a => a.plan_type_name === formData.aptTyp)?.ptp_no || ''}
                            onChange={(e) => handleDanjiAreaSelect(e.target.value)}
                            style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="">타입</option>
                            {danjiAreaList.map((area) => (
                              <option key={area.ptp_no} value={area.ptp_no}>
                                {area.plan_type_name} ({area.excls_spc}㎡)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={formData.aptTyp || ''}
                            onChange={(e) => handleChange('aptTyp', e.target.value)}
                            style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="">타입</option>
                            <option value="59A">59A</option>
                            <option value="59B">59B</option>
                            <option value="59C">59C</option>
                            <option value="74A">74A</option>
                            <option value="74B">74B</option>
                            <option value="84A">84A</option>
                            <option value="84B">84B</option>
                            <option value="84C">84C</option>
                            <option value="99A">99A</option>
                            <option value="99B">99B</option>
                            <option value="114A">114A</option>
                            <option value="114B">114B</option>
                            <option value="129A">129A</option>
                            <option value="129B">129B</option>
                            <option value="144A">144A</option>
                            <option value="144B">144B</option>
                            <option value="159A">159A</option>
                            <option value="174A">174A</option>
                            <option value="194A">194A</option>
                          </select>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>공급면적</label>
                      <AmountInput decimal value={formData.supArea} onChange={(v) => handleChange('supArea', v)} style={{ width: '80px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder={formData.areaUnit || '㎡'} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>전용면적</label>
                      <AmountInput decimal value={formData.excArea} onChange={(v) => handleChange('excArea', v)} style={{ width: '80px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder={formData.areaUnit || '㎡'} />
                    </div>
                    {/* 대지면적: 아파트 계열(단지형)에서는 숨김 */}
                    {!['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'].includes(formData.ptType) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>대지면적</label>
                        <AmountInput decimal value={formData.landShare} onChange={(v) => handleChange('landShare', v)} style={{ width: '80px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder={formData.areaUnit || '㎡'} />
                      </div>
                    )}
                    {/* 상가/사무실: 대지면적 우측에 연면적 */}
                    {isCommercial && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>연면적</label>
                        <AmountInput decimal value={formData.grossArea || ''} onChange={(v) => handleChange('grossArea', v)} style={{ width: '80px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder={formData.areaUnit || '㎡'} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row: 거래구분 — 구분별 상태 드롭다운(공용 컴포넌트) */}
              <TradeDivisionSelector formData={formData} setFormData={setFormData} etcLeaseTypes={etcLeaseTypes} />

              {/* Row 8: 금액 */}
              <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
                <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div>금액</div>
                  <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '500', lineHeight: '1.3', color: '#fef08a' }}>단위(만원)</div>
                </div>
                <div style={{ flex: 1, padding: '6px' }}>
                  {(() => {
                    const amtTh = { padding: '7px 4px', border: '1px solid #b8c5db', borderRight: '1.5px solid #94a3b8', background: '#c9d6ea', fontWeight: 700, fontSize: '13px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap' };
                    const amtTd = { border: '1px solid #e5e7eb', borderRight: '1.5px solid #b6c0cf', padding: '4px', background: '#f8fafc' };
                    const amtTdLight = { ...amtTd, borderRight: '1px solid #e5e7eb' }; // 월세/기타임대 보증금-차임 사이(연한색)
                    const amtLabelTd = { border: '1px solid #b8c5db', padding: '0px 2px', background: '#c9d6ea', fontWeight: 700, fontSize: '12px', textAlign: 'center', whiteSpace: 'nowrap', color: '#1e293b' };
                    const amtLabelTdPlain = { border: '1px solid #b8c5db', padding: '0px 2px', background: 'white', fontWeight: 700, fontSize: '12px', textAlign: 'center', whiteSpace: 'nowrap', color: '#1e293b' };
                    const amtIn = { width: '100%', padding: '5px 6px', fontSize: '13px', border: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', background: 'white' };
                    return (
                      <table style={{ width: isCommercial ? '700px' : '620px', maxWidth: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: '2px solid #94a3b8' }}>
                        <thead>
                          <tr>
                            <th style={amtTh}>매매금액</th>
                            <th style={amtTh}>전세금액</th>
                            <th style={amtTh} colSpan={2}>월세금액</th>
                            <th style={amtTh} colSpan={2}>기타임대{formData.etcLeaseType.length ? `(${formData.etcLeaseType[0]})` : ''}</th>
                            {!isCommercial && <th style={amtTh}>대출금액</th>}
                            {isCommercial && <th style={amtTh}>권리금</th>}
                            {isCommercial && <th style={amtTh}>시설비</th>}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={amtTd}><AmountInput value={formData.saleAmt} onChange={(v) => handleChange('saleAmt', v)} style={amtIn} /></td>
                            <td style={amtTd}><AmountInput value={formData.lesAmt} onChange={(v) => handleChange('lesAmt', v)} style={amtIn} /></td>
                            <td style={amtTdLight}><AmountInput value={formData.protAmt} onChange={(v) => handleChange('protAmt', v)} placeholder="보증금" style={amtIn} /></td>
                            <td style={amtTd}><AmountInput value={formData.monAmt} onChange={(v) => handleChange('monAmt', v)} placeholder="차임" style={amtIn} /></td>
                            <td style={amtTdLight}><AmountInput value={formData.etcAmt} onChange={(v) => handleChange('etcAmt', v)} placeholder="보증금" style={amtIn} /></td>
                            <td style={amtTd}><AmountInput value={formData.etcAmt2} onChange={(v) => handleChange('etcAmt2', v)} placeholder="차임" style={amtIn} /></td>
                            {!isCommercial && <td style={amtTd}><AmountInput value={formData.loanAmt} onChange={(v) => handleChange('loanAmt', v)} style={amtIn} /></td>}
                            {isCommercial && <td style={amtTd}><AmountInput value={formData.layAmt} onChange={(v) => handleChange('layAmt', v)} placeholder="권리금" style={amtIn} /></td>}
                            {isCommercial && <td style={amtTd}><AmountInput value={formData.facilityCost || ''} onChange={(v) => handleChange('facilityCost', v)} placeholder="시설비" style={amtIn} /></td>}
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}
                  {/* 관리비 / 관리비내역 — 라벨+입력창 (세대수 등과 동일 형태) */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>관리비</label>
                      <AmountInput value={formData.maintCost} onChange={(v) => handleChange('maintCost', v)} style={{ width: '84px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder="만원" unit />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: '240px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>관리비내역</label>
                      <input type="text" value={formData.maintDtl} onChange={(e) => handleChange('maintDtl', e.target.value)} placeholder="관리비, 주차비 포함" style={{ flex: 1, minWidth: '180px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: 현상태 */}
              <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
                <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div>현상황</div>
                  <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '500', lineHeight: '1.3', color: '#fef08a' }}>단위(만원)</div>
                </div>
                <div style={{ flex: 1, padding: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* 첫 번째 줄: 현상태 + 보증금 + 월차임 + 보증금대출 은행/금액 */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>현상태</label>
                        <select value={formData.currentStatus} onChange={(e) => handleChange('currentStatus', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          <option value="주인거주">주인거주</option>
                          <option value="전세">전세</option>
                          <option value="공실">공실</option>
                          <option value="월세">월세</option>
                          <option value="기타임대">기타임대</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>보증금</label>
                        <AmountInput
                          value={formData.nowDepAmt || ''}
                          onChange={(v) => handleChange('nowDepAmt', v)}
                          style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}
                          placeholder="만원"
                          unit
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>월차임</label>
                        <AmountInput
                          value={formData.nowMonAmt || ''}
                          onChange={(v) => handleChange('nowMonAmt', v)}
                          style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}
                          placeholder="만원"
                          unit
                        />
                      </div>

                    </div>

                    {/* 두 번째 줄: 주택임대사업자 + 계약갱신청구권 (전세대출 은행/금액 숨김) */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>주택임대사업자</label>
                        <select value={formData.houseRental || ''} onChange={(e) => handleChange('houseRental', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          <option value="등록">등록</option>
                          <option value="미등록">미등록</option>
                          <option value="예정">예정</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>계약갱신청구권</label>
                        <select value={formData.contractRenewalRight} onChange={(e) => handleChange('contractRenewalRight', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          <option value="사용">사용</option>
                          <option value="미사용">미사용</option>
                        </select>
                      </div>
                    </div>

                    {/* 추천업종(업종/상호) - 상가/사무실일 때 현상황 row 안에 표시 */}
                    {isCommercial && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>사업체명</label>
                        <input type="text" value={formData.businessName} onChange={(e) => handleChange('businessName', e.target.value)} placeholder="예: 맛있는식당" style={{ width: '150px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>업종</label>
                        <input type="text" value={formData.businessType} onChange={(e) => handleChange('businessType', e.target.value)} placeholder="예: 음식점업" style={{ width: '150px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                      </div>

                    </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row: 추천업종 (상가/사무실만) — 바로 입력창 · 프론트 전용(백엔드 연동 예정) */}
              {isCommercial && (
                <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
                  <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>추천업종</div>
                  <div style={{ flex: 1, padding: '6px' }}>
                    <input type="text" value={formData.recommendedBusiness || ''} onChange={(e) => handleChange('recommendedBusiness', e.target.value)} placeholder="예: 카페, 편의점, 학원 등 추천 업종" style={{ width: '100%', maxWidth: '400px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              )}

              {/* Row 7: 일정 */}
              <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
                <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>일정</div>
                <div style={{ flex: 1, padding: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>만기일</label>
                      <input type="date" value={formData.mtryDate} onChange={(e) => handleChange('mtryDate', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>이사예정일</label>
                      <input type="date" value={formData.exptMovDate} onChange={(e) => handleChange('exptMovDate', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>잔금예정일</label>
                      <input type="date" value={formData.exptDate} onChange={(e) => handleChange('exptDate', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row: 제한사항 (어린이/반려동물) — 상가/사무실은 숨김 */}
              {!isCommercial && (
              <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
                <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>제한사항</div>
                <div style={{ flex: 1, padding: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>어린이</label>
                      <select value={formData.childYn} onChange={(e) => handleChange('childYn', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="Y">가능</option>
                        <option value="N">불가능</option>
                        <option value="C">조건부</option>
                      </select>
                      <input type="text" value={formData.childCond || ''} onChange={(e) => handleChange('childCond', e.target.value)} placeholder="조건부 내용" style={{ width: '160px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>반려동물</label>
                      <select value={formData.petAllow} onChange={(e) => handleChange('petAllow', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="가능">가능</option>
                        <option value="불가능">불가능</option>
                        <option value="조건부">조건부</option>
                      </select>
                      <input type="text" value={formData.petCond || ''} onChange={(e) => handleChange('petCond', e.target.value)} placeholder="조건부 내용" style={{ width: '160px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Row 9: 상세조건 */}
              <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
                <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>상세정보</div>
                <div style={{ flex: 1, padding: '6px' }}>
                  {/* 첫 번째 줄: 세대수, 주차, 준공년도, 방, 욕실 (세대수/방/욕실은 아파트 계열만) */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isAptRelated && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>세대수</label>
                      <input type="number" value={formData.houseCnt} onChange={(e) => handleChange('houseCnt', e.target.value)} style={{ width: '84px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
                    </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>총 주차대수</label>
                      <input type="number" step="0.1" value={formData.pkCnt} onChange={(e) => handleChange('pkCnt', e.target.value)} style={{ width: '84px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>준공년도</label>
                      <input
                        type="date"
                        value={formData.compYear && formData.compYear.length === 8 ? `${formData.compYear.slice(0,4)}-${formData.compYear.slice(4,6)}-${formData.compYear.slice(6,8)}` : ''}
                        onChange={(e) => handleChange('compYear', e.target.value.replace(/-/g, ''))}
                        style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    {/* 상가/사무실: 준공년도 우측에 난방방식/난방연료 */}
                    {isCommercial && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>난방방식</label>
                      <select value={formData.heatMethod} onChange={(e) => handleChange('heatMethod', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="개별난방">개별난방</option>
                        <option value="중앙난방">중앙난방</option>
                        <option value="지역난방">지역난방</option>
                      </select>
                    </div>
                    )}
                    {isCommercial && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>난방연료</label>
                      <select value={formData.heatFuel} onChange={(e) => handleChange('heatFuel', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="도시가스">도시가스</option>
                        <option value="기름">기름</option>
                        <option value="전기">전기</option>
                        <option value="심야전기">심야전기</option>
                      </select>
                    </div>
                    )}
                    {isAptRelated && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>전기차충전대수</label>
                      <input type="number" value={formData.evChargerCnt || ''} onChange={(e) => handleChange('evChargerCnt', e.target.value)} style={{ width: '48px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                    </div>
                    )}
                  </div>

                  {/* 상가/사무실: 도시가스 / 수전 / 전기용량 (총 주차대수 아래, 세 개 수평) */}
                  {isCommercial && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>도시가스</label>
                      <select value={formData.cityGas || ''} onChange={(e) => handleChange('cityGas', e.target.value)} style={{ width: '96px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="인입완료">인입완료</option>
                        <option value="인입가능">인입가능</option>
                        <option value="인입불가">인입불가</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>수전</label>
                      <select value={formData.powerReceiving || ''} onChange={(e) => handleChange('powerReceiving', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="설치">설치</option>
                        <option value="미설치">미설치</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>전기용량</label>
                      <input type="number" value={formData.elecCapacity || ''} onChange={(e) => handleChange('elecCapacity', e.target.value)} style={{ width: '70px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
                      <span style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>kw</span>
                    </div>
                  </div>
                  )}

                  {/* 두 번째 줄: 난방방식, 난방연료, 현관구조, 건물구조 (상가/사무실은 난방을 1줄로 옮겨 숨김) */}
                  {!isCommercial && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>난방방식</label>
                      <select value={formData.heatMethod} onChange={(e) => handleChange('heatMethod', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="개별난방">개별난방</option>
                        <option value="중앙난방">중앙난방</option>
                        <option value="지역난방">지역난방</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>난방연료</label>
                      <select value={formData.heatFuel} onChange={(e) => handleChange('heatFuel', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="도시가스">도시가스</option>
                        <option value="기름">기름</option>
                        <option value="전기">전기</option>
                        <option value="심야전기">심야전기</option>
                      </select>
                    </div>
                    {isAptRelated && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>현관구조</label>
                      <select value={formData.entrStruct} onChange={(e) => handleChange('entrStruct', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="계단식">계단식</option>
                        <option value="복도식">복도식</option>
                        <option value="복합식">복합식</option>
                      </select>
                    </div>
                    )}
                    {isAptRelated && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>건물형태</label>
                      <select value={formData.buildingForm || ''} onChange={(e) => handleChange('buildingForm', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="판상형">판상형</option>
                        <option value="타워형">타워형</option>
                      </select>
                    </div>
                    )}
                    {/* 건물구조: 아파트 계열에서는 숨김 */}
                    {!isAptRelated && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>건물구조</label>
                      <select value={formData.buidStruct} onChange={(e) => handleChange('buidStruct', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="철근콘크리트">철근콘크리트</option>
                        <option value="철골">철골</option>
                        <option value="철골콘크리트">철골콘크리트</option>
                        <option value="벽돌">벽돌</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>
                    )}
                  </div>
                  )}

                  {/* 세 번째 줄: 발코니(아파트 계열만), 방향, 방향기준 */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isAptRelated && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>발코니</label>
                      <select value={formData.balcExt} onChange={(e) => handleChange('balcExt', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="Y">확장</option>
                        <option value="N">미확장</option>
                      </select>
                    </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>방향</label>
                      <select value={formData.dirStd} onChange={(e) => handleChange('dirStd', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="남향">남향</option>
                        <option value="동향">동향</option>
                        <option value="서향">서향</option>
                        <option value="북향">북향</option>
                        <option value="남동향">남동향</option>
                        <option value="남서향">남서향</option>
                        <option value="북동향">북동향</option>
                        <option value="북서향">북서향</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>방향기준</label>
                      <select value={formData.dirBase || ''} onChange={(e) => handleChange('dirBase', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                        <option value="">선택</option>
                        <option value="거실기준">거실기준</option>
                        <option value="안방기준">안방기준</option>
                        <option value="주된출입구">주된출입구</option>
                      </select>
                    </div>
                    {/* 아파트 계열: 방향기준 우측으로 이동된 방 수 / 욕실 수 */}
                    {isAptRelated && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>방 수</label>
                      <input type="number" value={formData.roomCnt} onChange={(e) => handleChange('roomCnt', e.target.value)} style={{ width: '42px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                    </div>
                    )}
                    {isAptRelated && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>욕실 수</label>
                      <input type="number" value={formData.bathCnt} onChange={(e) => handleChange('bathCnt', e.target.value)} style={{ width: '42px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                    </div>
                    )}
                    {/* 상가/사무실: 방향기준 우측에 승강기수/계단수 */}
                    {isCommercial && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>승강기수</label>
                      <input type="number" value={formData.elevatorCnt || ''} onChange={(e) => handleChange('elevatorCnt', e.target.value)} style={{ width: '84px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
                    </div>
                    )}
                    {isCommercial && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>계단수</label>
                      <input type="number" value={formData.stairsCnt || ''} onChange={(e) => handleChange('stairsCnt', e.target.value)} style={{ width: '84px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
                    </div>
                    )}
                  </div>

                  {/* 건축물용도 등 추가 필드 - 토지가 아니고 아파트형이 아닌 경우 */}
                  {formData.ptType !== 'SYCA115' && !['SYCA101', 'SYCA102', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA104', 'SYCA120'].includes(formData.ptType) && (
                    isCommercial ? (
                    /* 상가/사무실: 건축물용도 라벨+드롭다운 우측에 용도지역 드롭다운 (인라인) */
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>건축물용도</label>
                        <select value={formData.buildingUse} onChange={(e) => handleChange('buildingUse', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {BUILDING_USES.map(use => (
                            <option key={use.code} value={use.code}>{use.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>용도지역</label>
                        <select value={formData.landUse} onChange={(e) => handleChange('landUse', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {LAND_USES.map(use => (
                            <option key={use.value} value={use.value}>{use.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ width: '150px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '2px' }}>건축물용도</label>
                        <select value={formData.buildingUse} onChange={(e) => handleChange('buildingUse', e.target.value)} style={{ width: '100%', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {BUILDING_USES.map(use => (
                            <option key={use.code} value={use.code}>{use.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    )
                  )}

                  {/* 용도지역, 지목 등 - 토지인 경우 */}
                  {formData.ptType === 'SYCA115' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ width: '150px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '2px' }}>용도지역</label>
                        <select value={formData.landUse} onChange={(e) => handleChange('landUse', e.target.value)} style={{ width: '100%', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {LAND_USES.map(use => (
                            <option key={use.value} value={use.value}>{use.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ width: '150px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '2px' }}>지목</label>
                        <select value={formData.landCategory} onChange={(e) => handleChange('landCategory', e.target.value)} style={{ width: '100%', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                          <option value="">선택</option>
                          {LAND_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '2px' }}>기타제한사항</label>
                        <input type="text" value={formData.otherRestrictions} onChange={(e) => handleChange('otherRestrictions', e.target.value)} placeholder="예: 주차장 제한" style={{ width: '100%', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* 소유자 카드는 우측(상담내용 아래)로 이동 */}
            </div>
            )}
              {/* 옵션 — 상세정보 바로 아래에 붙임 (폼 박스 이어서, 상단 테두리 없음) */}
              <div style={{ display: 'flex', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', minHeight: '56px' }}>
                {/* 라벨 클릭 → 옵션 선택창 열기 (모든 유형 통일) */}
                <div
                  onClick={() => setShowOptionModal(true)}
                  title="클릭하여 옵션 선택창 열기"
                  style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: 'pointer' }}
                >
                  <span>옵션</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#fef08a' }}>선택 ▾</span>
                </div>
                {/* 입력창은 항상 직접입력 (모든 유형 통일) */}
                <div style={{ flex: 1, padding: '6px', display: 'flex' }}>
                  <textarea
                    value={formData.opt || ''}
                    onChange={(e) => handleChange('opt', e.target.value)}
                    placeholder="옵션 직접 입력 (또는 좌측 '옵션' 라벨 클릭하여 선택)"
                    rows={2}
                    style={{ width: '100%', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* 우측: 물건특징/상담내용/소유자 카드 — 상담모드 ON 시 전체 숨김 */}
            {!consultOn && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* Row 11: 물건특징 */}
              <div style={{ display: 'flex', border: '1px solid #cbd5e1', flex: 0.6, minHeight: '160px' }}>
                {/* 좌측: 라벨 + (한 줄 여백) + 묶음 박스, 전체 수직중앙 정렬 */}
                <div style={{ width: '90px', padding: '6px', background: '#8b7ad8', color: 'white', borderRight: '1px solid #5b4aa8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>물건특징</div>
                  <div style={linkGroupBoxStyle}>
                    <button type="button" onClick={addMemoRow} style={linkBtnStyle} title="메모 추가">날짜입력</button>
                    <button type="button" onClick={insertMemoPhone} style={linkBtnStyle} title="전화번호 삽입">전화번호입력</button>
                    <select onChange={(e) => { insertMemoSpecialChar(e.target.value); e.target.value = ''; }} value="" className="pfp2-link-select" style={linkSelectStyle}>
                      <option value="">특수문자</option>
                      <option value="★">★</option>
                      <option value="●">●</option>
                      <option value="■">■</option>
                      <option value="▶">▶</option>
                      <option value="✓">✓</option>
                      <option value="※">※</option>
                      <option value="→">→</option>
                    </select>
                    <select onChange={(e) => { applyMemoColor(e.target.value); e.target.value = ''; }} value="" className="pfp2-link-select" style={linkSelectStyle}>
                      <option value="">글자색</option>
                      <option value="red">빨강</option>
                      <option value="blue">파랑</option>
                      <option value="green">초록</option>
                      <option value="orange">주황</option>
                      <option value="purple">보라</option>
                    </select>
                  </div>
                </div>
                {/* 우측: 메모 목록 (상담내용 목록과 동일 형태) */}
                <div style={{ flex: 1, padding: 0, background: '#fef3c7', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  border: 'none',
                  padding: 0,
                  background: 'white',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  minHeight: '100px'
                }}>
                  {memos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                      메모 정보 없음
                    </div>
                  ) : (
                    memos.map((entry, index) => (
                      <div key={entry.memoNo ?? index} style={{
                        padding: 0,
                        borderBottom: 'none',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '4px'
                      }}>
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
                          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontFamily: 'inherit', padding: '2px', boxSizing: 'border-box', minWidth: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '17px' }}
                        />
                      </div>
                    ))
                  )}
                </div>
                </div>
              </div>

              {/* 상담내용 카드 */}
              <div style={{ display: 'flex', border: '1px solid #cbd5e1', flex: 1.6, minHeight: '90px' }}>
                {/* 좌측: 라벨 + (한 줄 여백) + 묶음 박스, 전체 수직중앙 정렬 (물건특징과 동일 구성) */}
                <div style={{ width: '90px', padding: '6px', background: '#8b7ad8', color: 'white', borderRight: '1px solid #5b4aa8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>상담내용</div>
                  <div style={linkGroupBoxStyle}>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const dateStr = now.toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        });
                        const newEntry = {
                          datetime: dateStr,
                          userId: user?.userId || user?.userName || '담당자',
                          content: ''
                        };
                        setConsultations([...consultations, newEntry]);
                      }}
                      style={linkBtnStyle}
                      title="상담내용 추가"
                    >
                      날짜입력
                    </button>
                    <button type="button" onClick={insertConsultPhone} style={linkBtnStyle} title="전화번호 삽입">전화번호입력</button>
                    <select onChange={(e) => { insertConsultSpecialChar(e.target.value); e.target.value = ''; }} value="" className="pfp2-link-select" style={linkSelectStyle}>
                      <option value="">특수문자</option>
                      <option value="★">★</option>
                      <option value="●">●</option>
                      <option value="■">■</option>
                      <option value="▶">▶</option>
                      <option value="✓">✓</option>
                      <option value="※">※</option>
                      <option value="→">→</option>
                    </select>
                    <select onChange={(e) => { applyConsultColor(e.target.value); e.target.value = ''; }} value="" className="pfp2-link-select" style={linkSelectStyle}>
                      <option value="">글자색</option>
                      <option value="red">빨강</option>
                      <option value="blue">파랑</option>
                      <option value="green">초록</option>
                      <option value="orange">주황</option>
                      <option value="purple">보라</option>
                    </select>
                  </div>
                </div>
                {/* 우측: 상담내용 목록 */}
                <div style={{ flex: 1, padding: 0, background: '#fef3c7', display: 'flex', flexDirection: 'column' }}>
                {/* 정렬/필터 헤더 줄 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '12px', flexShrink: 0 }}>
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
                        style={{ position: 'absolute', right: '2px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '50%', background: '#e2e8f0', color: '#6b7280', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}>×</button>
                    )}
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  border: 'none',
                  padding: 0,
                  background: 'white',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  minHeight: '100px'
                }}>
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
                      return (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                          {consultFilter ? '검색 결과 없음' : '상담내용 정보 없음'}
                        </div>
                      );
                    }
                    return list.map(({ entry, origIndex }) => (
                      <div key={origIndex} style={{
                        padding: 0,
                        borderBottom: 'none',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '4px'
                      }}>
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
                          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontFamily: 'inherit', padding: '2px', boxSizing: 'border-box', minWidth: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '17px' }}
                        />
                      </div>
                    ));
                  })()}
                </div>
                </div>
              </div>
              {/* 소유자/임차인/공인중개사 카드 — 상담내용 아래(우하단). 3행 높이 고정, 초과 시 스크롤 */}
              <div style={{ height: '172px', flexShrink: 0, display: 'flex', marginTop: '4px' }}>
                <HolderCombinedCard
                  holders={holders}
                  onHoldersChange={setHolders}
                  ptNo={editData?.ptNo}
                  registryOwner={formData.registryOwner}
                  onRegistryOwnerChange={(v) => handleChange('registryOwner', v)}
                  contractTenant={formData.contractTenant}
                  onContractTenantChange={(v) => handleChange('contractTenant', v)}
                  shareHistory={shareHistory}
                  onShareHistoryChange={setShareHistory}
                />
              </div>
            </div>
            )}
          </div>
          </div>
          )}

          {/* 부동산공유이력 모달 */}
          <PropertyShareHistoryModal
            isOpen={showShareHistoryModal}
            onClose={() => setShowShareHistoryModal(false)}
            shareHistory={shareHistory}
            onShareHistoryChange={setShareHistory}
            ptNo={editData?.ptNo}
          />

          {activeTab === 'attachments' && (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>평면도 / 물건사진 첨부</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>파일당 최대 {MAX_UPLOAD_LABEL}</div>
              </div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <FileAttachSection
                  ptNo={formData.ptNo || editData?.ptNo}
                  fileDiv="SYFDV05" fileTyp="SYFTY01" title="평면도"
                  userId={user?.userId}
                />
                <FileAttachSection
                  ptNo={formData.ptNo || editData?.ptNo}
                  fileDiv="SYFDV01" fileTyp="SYFTY04" title="물건사진"
                  userId={user?.userId}
                />
              </div>
            </div>
          )}

        </div>

        {/* 푸터 버튼 */}
        {activeTab === 'property' && (
        <div className="page-footer" style={{ padding: '3px 12px' }}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              if (editData && editData.ptNo) {
                // Electron API를 통해 별도 창으로 열기
                if (window.electronAPI?.modal) {
                  try {
                    await window.electronAPI.modal.open({
                      type: 'hub-form',
                      data: {
                        title: '거래정보 등록',
                        tradeDiv: 'PT',
                        propertyData: formData,
                        ptNo: editData.ptNo,
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
                    openWithProperty(editData);
                  }
                } else {
                  // Electron API 없으면 기존 방식 사용
                  openWithProperty(editData);
                }
              } else {
                toast.error('저장된 물건 정보만 정보망 전송이 가능합니다.');
              }
            }}
            className="px-3 py-1 text-sm font-medium text-white bg-sky-500 rounded-md hover:bg-sky-600"
          >
            공동중개망전송
          </button>
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="relative px-3 py-1 text-sm font-medium text-white bg-purple-500 rounded-md hover:bg-purple-600"
          >
            일정관리
            {scheduleCount > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', minWidth: '16px', height: '16px', padding: '0 4px', borderRadius: '8px', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                {scheduleCount > 99 ? '99+' : scheduleCount}
              </span>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          {/* 입력초기화 — 등록(신규)폼에서만 표시. 물건유형만 유지하고 입력값 초기화 */}
          {!editData && (
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              입력초기화
            </button>
          )}
          {/* 소유자/임차인 변경: 현재 소유자·임차인을 과거로 이관 */}
          <button
            type="button"
            disabled={loading}
            onClick={() => { setHolderChangeSel({ OWNER: false, BUYER: false }); setShowHolderChangeModal(true); }}
            className="px-3 py-1 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50"
          >
            소유자/임차인 변경
          </button>
          {/* 복사 등록: 현재 내용으로 새 등록창 — 단지형(아파트/오피스텔/주상복합/재건축/재개발/분양권)은 제외 */}
          {!isAptRelated && (
            <button
              type="button"
              disabled={loading}
              onClick={handleCopyRegister}
              className="px-3 py-1 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
            >
              복사등록
            </button>
          )}
          {/* 등록·수정 저장: 저장 후에도 창 유지 (한 버튼, 라벨: 등록 | 저장 / 수정 | 저장) */}
          <button
            type="button"
            disabled={loading}
            onClick={(e) => handleSubmit(e)}
            className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '처리 중...' : (editData ? '수정 | 저장' : '등록 | 저장')}
          </button>
          {/* 닫기 — 저장 없이 창 닫기 */}
          <button
            type="button"
            onClick={() => onClose?.()}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
        </div>
        )}
      </form>

      {/* 소유자/임차인 변경 모달 — 대상 선택 + 과거 이관 확인(강조) */}
      {showHolderChangeModal && (
        <div onClick={() => setShowHolderChangeModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '440px', maxWidth: '96vw', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', fontSize: '16px', fontWeight: 800, color: '#111827' }}>소유자 / 임차인 변경</div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>과거로 이관할 대상을 선택하세요.</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: canChangeOwner ? '#111827' : '#94a3b8', cursor: canChangeOwner ? 'pointer' : 'not-allowed' }}>
                <input type="checkbox" checked={holderChangeSel.OWNER} disabled={!canChangeOwner} onChange={(e) => setHolderChangeSel((p) => ({ ...p, OWNER: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'inherit' }} />
                소유자 {canChangeOwner ? <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>({formData.registryOwner})</span> : <span style={{ fontSize: '12px', color: '#94a3b8' }}>(현재 없음)</span>}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: canChangeTenant ? '#111827' : '#94a3b8', cursor: canChangeTenant ? 'pointer' : 'not-allowed' }}>
                <input type="checkbox" checked={holderChangeSel.BUYER} disabled={!canChangeTenant} onChange={(e) => setHolderChangeSel((p) => ({ ...p, BUYER: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'inherit' }} />
                임차인 {canChangeTenant ? <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>({formData.contractTenant})</span> : <span style={{ fontSize: '12px', color: '#94a3b8' }}>(현재 없음)</span>}
              </label>
              {/* 확인 문구 — 소유자/임차인 강조 */}
              {(holderChangeSel.OWNER && canChangeOwner) && (
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '4px 0 0' }}>
                  현재 <b style={{ color: '#dc2626', fontWeight: 800 }}>소유자</b>(<b>{formData.registryOwner}</b>)를 과거 소유자로 변경하시겠습니까?
                </p>
              )}
              {(holderChangeSel.BUYER && canChangeTenant) && (
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '4px 0 0' }}>
                  현재 <b style={{ color: '#dc2626', fontWeight: 800 }}>임차인</b>(<b>{formData.contractTenant}</b>)를 과거 임차인으로 변경하시겠습니까?
                </p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button type="button" onClick={() => setShowHolderChangeModal(false)} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#374151', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={applyHolderChange} disabled={!((holderChangeSel.OWNER && canChangeOwner) || (holderChangeSel.BUYER && canChangeTenant))}
                style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: ((holderChangeSel.OWNER && canChangeOwner) || (holderChangeSel.BUYER && canChangeTenant)) ? 1 : 0.5 }}>네, 변경</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .property-form-page {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9fafb;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .page-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .close-btn {
          padding: 0.5rem;
          border-radius: 0.375rem;
          border: none;
          background: none;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background-color: #f3f4f6;
          color: #111827;
        }

        .page-form {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .form-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .page-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background-color: white;
          border-top: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

}
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

      {/* 옵션 선택 모달 */}
      <OptionModal
        isOpen={showOptionModal}
        onClose={() => setShowOptionModal(false)}
        initialValue={formData.opt}
        onConfirm={(value) => handleChange('opt', value)}
      />

      {/* 전화번호 선택 모달 (소유자/임차인/공인중개사) */}
      {phonePickerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPhonePickerOpen(false)}>
          <div style={{ background: 'white', borderRadius: '8px', width: '360px', maxHeight: '70vh', overflow: 'auto', padding: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>전화번호 선택</div>
              <button type="button" onClick={() => setPhonePickerOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
            </div>
            {phonePickerList.map((it, i) => (
              <button key={i} type="button" onClick={() => onPickPhone(it)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '6px', background: 'white', cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{it.label}</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{it.phone}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 일정 관리 모달 (물건소재지 자동입력 + 물건번호 연동 저장) */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        linkPtNo={formData.ptNo || null}
        defaultLocation={[
          [formData.addr1, formData.addr2, formData.addr3, formData.jibun, formData.addr4, formData.addr5].filter(Boolean).join(' '),
          formData.dong ? `${formData.dong}동` : '',
          formData.ho ? `${formData.ho}호` : '',
        ].filter(Boolean).join(' ')}
        onSuccess={() => {
          setShowScheduleModal(false);
          toast.success('일정이 등록되었습니다.');
          loadScheduleCount(); // 배지 갱신
        }}
      />

      {/* 입력초기화 확인 모달 (공통) */}
      <ConfirmDialog
        open={showResetConfirm}
        message={'입력한 내용을 초기화하시겠습니까?\n(물건유형은 유지됩니다)'}
        confirmText="초기화"
        onConfirm={() => { setShowResetConfirm(false); handleResetInput(); }}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* 과거내역 목록 모달 */}
      {showHistoryModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{ background: 'white', borderRadius: '8px', width: '760px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '12px 16px', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: '700' }}>과거내역 ({historyList.length}건)</span>
              <button type="button" onClick={() => setShowHistoryModal(false)} style={{ color: 'white', fontSize: '18px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ overflow: 'auto', padding: '8px' }}>
              {historyList.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>과거내역이 없습니다.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>보관일시</th>
                      <th style={{ padding: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>물건명</th>
                      <th style={{ padding: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>주소</th>
                      <th style={{ padding: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>동/호</th>
                      <th style={{ padding: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>현상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((h, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                          {h.archivedDt ? String(h.archivedDt).replace('T', ' ').slice(0, 16) : '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>{h.ptName || '-'}</td>
                        <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                          {[h.addr1, h.addr2, h.addr3].filter(Boolean).join(' ') || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                          {[h.dong && `${h.dong}동`, h.ho && `${h.ho}호`].filter(Boolean).join(' ') || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h.currentStatus || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: '8px 16px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button type="button" onClick={() => setShowHistoryModal(false)} className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">닫기</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PropertyFormPageV2;

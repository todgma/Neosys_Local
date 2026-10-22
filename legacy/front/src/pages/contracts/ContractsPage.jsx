import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Palette } from 'lucide-react';
import Card from '../../components/ui/Card';
import AddressSelectorSimple from '../../components/property/AddressSelectorSimple';
// 계약목록 물건유형 필터 옵션(계약서 물건유형 라벨 기준)
const CONTRACT_PT_TYPES = ['아파트', '오피스텔', '단독주택', '다가구주택', '다세대주택', '상가', '사무실', '공장', '창고', '지식산업센터', '건물', '토지', '아파트분양권', '오피스텔분양권', '상가분양권', '입주권'];
import ContractDocumentEditor from '../../components/contracts/ContractDocumentEditor';
import SettlementForm from '../../components/contracts/SettlementForm';
import ContractRegisterForm from '../../components/contracts/ContractRegisterForm';
import ReceiptForm from '../../components/contracts/ReceiptForm';
import ContractComposePage from './ContractComposePage';
import ContractListTable from '../../components/contracts/ContractListTable';
import GongjeCertModal from '../../components/contracts/GongjeCertModal';
import MenuTopActions from '../../components/layout/MenuTopActions';
import { fileUploadService } from '../../services/fileUploadService';
import { CONTRACT_DOCS } from '../../constants/contractTemplates';
import molitIcon from '../../assets/molit.ico';
import { saveContract } from '../../utils/contractStore';
import { contractApiService } from '../../services/contractApiService';
import { useAuthStore } from '../../stores/authStore';
import { FORM_HTML, openFormWindow } from '../../constants/receiptForms';

// 공적장부 — 발급/열람 사이트(프로그램 내부 아닌 외부 브라우저로 오픈). 상단 '공적장부 ▾' 드롭다운에서 사용
const PUBLIC_LEDGERS = [
  { name: '등기사항전부증명서', url: 'https://www.iros.go.kr/index.jsp' },
  { name: '건축물대장', url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000098' },
  { name: '토지이용계획확인서', url: 'https://www.eum.go.kr/web/ar/lu/luLandDet.jsp' },
  { name: '대지권등록부', url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000026' },
  { name: '지적도/임야도', url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000027' },
  { name: '토지/임야대장', url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000026' },
];
// 외부 브라우저로 열기(Electron: 기본 브라우저 / 웹: 새 탭)
const openExternalUrl = (url) => {
  if (typeof window !== 'undefined' && window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
  else window.open(url, '_blank', 'noopener');
};

// 거래유형 필터
const TRADE_TYPES = [
  { value: '', label: '전체' },
  { value: 'SALEDIV01', label: '매매' },
  { value: 'SALEDIV02', label: '전세' },
  { value: 'SALEDIV03', label: '월세' },
  { value: 'SALEDIV04', label: '연세' },
];
// 거래유형 코드(SALEDIV01 등) → 한글 라벨. 이미 라벨이면 그대로.
const tradeTypeLabel = (v) => (TRADE_TYPES.find((t) => t.value === v)?.label) || v || '';

// 테이블 컬럼 (요청 순서) — 각 컬럼은 상단/하단 2줄 구성. span:true 는 상·하 병합(rowspan 2)
// 헤드라인 1행 — 요청 컬럼 순서
const CONTRACT_COLS = [
  { key: 'select', label: '선택', width: 46, noRowClick: true },
  { key: '가계약문자', label: '가계약문자', width: 88 },
  { key: '거래신고여부', label: '거래신고여부', width: 100, noRowClick: true },
  { key: '신고완료일', label: '신고완료일', width: 96 },
  { key: '물건유형', label: '물건유형', width: 84 },
  { key: '소재지', label: '소재지', width: 280 },
  { key: '거래유형', label: '거래유형', width: 78 },
  { key: '거래금액', label: '거래금액', width: 100 },
  { key: '취득의뢰인', label: '취득의뢰인', width: 110 },
  { key: '이전의뢰인', label: '이전의뢰인', width: 110 },
  { key: '계약일', label: '계약일', width: 88 },
  { key: '중도금일', label: '중도금일', width: 88 },
  { key: '잔금일', label: '잔금일', width: 88 },
  { key: '공동중개사', label: '(전송|수신)공동중개사', width: 210 },
  { key: '전자계약', label: '전자계약', width: 88 },
  { key: '국토부회신', label: '국토부 회신 내용', width: 150 },
];

// 영수증 서식 HTML/새 창 미리보기 — 계약서작성 화면과 공용(constants/receiptForms)

const ContractsPage = () => {
  useEffect(() => { document.title = '네오시스 - 계약관리'; }, []);

  // 검색 필터 상태 (물건관리 상단 검색섹션 참고)
  const [ptType, setPtType] = useState('');
  const [tradeType, setTradeType] = useState('');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [rowCount, setRowCount] = useState('20');
  const [sortOrder, setSortOrder] = useState('recent');
  const [dateType, setDateType] = useState('계약일'); // 날짜 필터 기준
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [regionForm, setRegionForm] = useState({});
  const setRegion = (name, value) => setRegionForm((p) => ({ ...p, [name]: value }));
  const [showFormLibrary, setShowFormLibrary] = useState(false); // 서식자료실 슬라이드 패널
  const [showSettlement, setShowSettlement] = useState(false); // 공과금 등 정산서 편집 팝업
  const [showRegister, setShowRegister] = useState(false); // 계약 등록 표형식 입력 폼
  const [editRegister, setEditRegister] = useState(null);  // 약식 등록건 수정 대상(row)
  const [receiptForm, setReceiptForm] = useState(null); // 영수증 편집 팝업(제목)
  const [danjiList, setDanjiList] = useState([]);   // 선택 지역의 단지 목록
  const [danjiSel, setDanjiSel] = useState('');     // 단지 선택값(__manual__ | naverDanjiCode | '')
  const [danjiManual, setDanjiManual] = useState(''); // 직접입력 단지명

  // 계약 목록 (백엔드: contract_master)
  const { user } = useAuthStore();
  const [contracts, setContracts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hoverId, setHoverId] = useState(null); // 2줄 행 공통 hover
  const [reportModal, setReportModal] = useState(null); // 거래신고 완료일 입력 모달 { id, date }
  const [reportDates, setReportDates] = useState({});    // { [contractId]: 'YYYY-MM-DD' } 신고완료일(로컬)
  const [showPalette, setShowPalette] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [ledgerMenu, setLedgerMenu] = useState(false); // 공적장부 드롭다운
  const [mode, setMode] = useState('list'); // 'list'(계약목록) | 'compose'(계약서작성)
  const [editorDoc, setEditorDoc] = useState(null); // 비-Electron 폴백용 인페이지 에디터
  const [activeMasterId, setActiveMasterId] = useState(null); // 작성화면으로 열 계약 master_id (null=신규)
  const [gongjeOpen, setGongjeOpen] = useState(false); // 공제증서 첨부 모달
  const [gongjeCount, setGongjeCount] = useState(0);   // 공제증서 첨부 개수(배지)
  const [composeMasterId, setComposeMasterId] = useState(null); // 작성 중인 계약 masterId(공제증서 ref_key)
  const [composeMeta, setComposeMeta] = useState(null); // 작성 중인 계약종류/물건유형/거래유형(공제증서만 첨부 시 마스터 보장)

  // 공제증서 첨부 개수 로드(계약서작성 진입 시, 계약서 PK 기준)
  useEffect(() => {
    if (mode !== 'compose' || !composeMasterId) { setGongjeCount(0); return; }
    (async () => {
      try {
        const items = await fileUploadService.list({ fileTyp: 'SYFTY05', fileDiv: 'SYFDV06', refKey: String(composeMasterId) });
        setGongjeCount((items || []).length);
      } catch (e) { console.error('공제증서 개수 로드 실패:', e); }
    })();
  }, [mode, composeMasterId]);

  // 마스터 행 + doc(JSON) 병합 → 목록 헤드라인 셀(cellVal)에서 그대로 사용
  const mapRow = (m) => {
    let doc = {};
    try { doc = typeof m.doc === 'string' ? JSON.parse(m.doc || '{}') : (m.doc || {}); } catch { doc = {}; }
    return {
      ...doc,
      id: m.masterId ?? m.MasterId,
      docType: m.docType || doc.docType,
      ptType: m.docType || doc.ptType,
      거래유형: tradeTypeLabel(m.tradeType || doc.거래유형),
      소재지: m.addr || doc.소재지,
      거래금액: m.amount != null ? Number(m.amount).toLocaleString() : (doc.거래금액 || '-'),
      계약일: m.contractDate ? String(m.contractDate).slice(0, 10) : (doc.계약일 || doc.계약일자),
      거래신고완료일: m.reportDoneDate ? String(m.reportDoneDate).slice(0, 10) : (doc.거래신고완료일 || ''),
      status: m.status || doc.status,
      rowColor: doc.rowColor,
      contractKind: m.contractKind || doc.contractKind,
      tradeTypeRaw: m.tradeType || doc.거래유형,
      hasPreSms: !!(m.hasPreSms ?? m.HasPreSms),  // 가계약문자 작성 여부
    };
  };

  const reload = useCallback(async () => {
    try {
      const items = await contractApiService.getList({
        offNo: user?.offNo, rtNo: user?.rtNo,
        frDate: dateFrom || undefined, toDate: dateTo || undefined,
        keyword: keyword || undefined, pageSize: 500,
      });
      setContracts((items || []).map(mapRow));
    } catch (e) { console.error('계약 목록 조회 실패', e); setContracts([]); }
  }, [user, dateFrom, dateTo, keyword]);

  useEffect(() => { reload(); }, [reload]);

  // 노란색 섹션(물건유형 + 시도/시군구/법정동) 클라이언트 필터
  const visibleContracts = useMemo(() => {
    const norm = (s) => (s || '').replace(/\s+/g, '');
    // 시도명 축약 변형(예: '서울특별시' → '서울')까지 허용
    const sidoVariants = (n) => {
      const base = (n || '').replace(/(특별자치시|특별자치도|특별시|광역시|자치시|자치도|도|시)$/, '');
      return [n, base].filter(Boolean);
    };
    return contracts.filter((c) => {
      if (ptType && c.ptType !== ptType) return false;
      const addr = norm(c.소재지);
      if (regionForm.addr1 && !sidoVariants(regionForm.addr1).some((v) => addr.includes(norm(v)))) return false;
      if (regionForm.addr2 && !addr.includes(norm(regionForm.addr2))) return false;
      if (regionForm.addr3 && !addr.includes(norm(regionForm.addr3))) return false;
      return true;
    });
  }, [contracts, ptType, regionForm]);

  // 서식자료실 서식 미리보기(새 창 A4)
  const openFormPreview = (key, name) => {
    const html = FORM_HTML[key];
    if (!html) { toast(`${name || '해당'} 서식은 준비 중입니다.`); return; }
    if (!openFormWindow(html, '서식 미리보기')) { toast('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); return; }
    setShowFormLibrary(false);
  };

  // 새 창(모달) 저장/닫힘 시 목록 새로고침
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    let offSuccess, offClosed;
    if (window.electronAPI?.modal?.on) {
      offSuccess = window.electronAPI.modal.on('success', reload);
      offClosed = window.electronAPI.modal.on('closed', reload);
    }
    return () => {
      window.removeEventListener('focus', onFocus);
      offSuccess?.(); offClosed?.();
    };
  }, [reload]);

  // 계약서 에디터 열기 — Electron이면 새 창, 아니면 인페이지 오버레이
  const openEditor = (rec) => {
    const isNew = !rec.id;
    if (window.electronAPI?.modal) {
      window.electronAPI.modal.open({
        type: 'contract-editor',
        data: { title: rec.docType || '계약서', editData: isNew ? null : rec, docType: rec.docType },
        width: 1040, height: 940, minWidth: 900, resizable: true,
      }).catch(() => setEditorDoc(isNew ? { __new: true, docType: rec.docType } : rec));
      return;
    }
    setEditorDoc(isNew ? { __new: true, docType: rec.docType } : rec);
  };

  const startNew = (docType) => { setShowTypePicker(false); openEditor({ docType }); };

  // 약식 등록/수정 저장 — 계약 마스터(백엔드)로 저장해 목록에 표시. 전체 폼은 doc 에 보존(수정 복원용)
  const handleSaveDoc = async (rec) => {
    const amount = parseInt(String(rec.거래금액 || '').replace(/[^0-9]/g, ''), 10);
    const payload = {
      masterId: rec.masterId || undefined,
      docType: rec.ptType || '',
      tradeType: rec.거래유형 || '',
      addr: rec.소재지 || '',
      seller: rec.이전의뢰인 || '',
      buyer: rec.취득의뢰인 || '',
      amount: Number.isFinite(amount) ? amount : null,
      contractDate: rec.계약일 || null,
      status: '작성',
      offNo: user?.offNo,
      rtNo: user?.rtNo,
      doc: { ...rec, _simple: true },  // 약식 등록 표식 + 폼 전체 보존
    };
    try {
      const id = await contractApiService.saveMaster(payload);
      reload();
      toast.success('계약서가 저장되었습니다.');
      return id;
    } catch (e) { console.error('약식 계약 저장 실패', e); toast.error('저장에 실패했습니다.'); return null; }
  };

  const toggleSel = (id) => setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  // 행 1회 클릭 = 선택(체크) 토글 / 2회 클릭 = 계약서 열기(compose). 타이머로 단일·더블 구분.
  const rowClickTimer = useRef(null);
  const openCompose = (id) => { setActiveMasterId(id ?? null); setMode('compose'); };
  // 가계약 문자 보기 — 저장된 가계약문자(masterId+docKind)로 팝업 바로 열기
  const openPreSms = (c) => {
    if (!window.electronAPI?.modal) { toast.error('팝업을 열 수 없습니다.'); return; }
    window.electronAPI.modal.open({
      type: 'pre-contract',
      data: {
        masterId: c.id,
        docKind: '가계약문자',
        meta: { contractKind: c.contractKind, docType: c.docType, tradeType: c.tradeTypeRaw },
        defaults: { kindLabel: c.contractKind || '', ptTypeLabel: c.docType || '', tradeLabel: c.거래유형 || '' },
      },
      width: 1240, height: 920, minWidth: 900, minHeight: 600, resizable: true, maximized: true,
    });
  };
  const onRowSingleClick = (id) => { if (rowClickTimer.current) return; rowClickTimer.current = setTimeout(() => { rowClickTimer.current = null; toggleSel(id); }, 230); };
  const onRowDoubleClick = (id) => { if (rowClickTimer.current) { clearTimeout(rowClickTimer.current); rowClickTimer.current = null; } openCompose(id); };
  const handleDelete = async () => {
    if (selectedIds.length === 0) { toast.error('삭제할 계약을 선택하세요.'); return; }
    try {
      await Promise.all(selectedIds.map((id) => contractApiService.remove(id, user?.userId)));
      setSelectedIds([]);
      await reload();
      toast.success('삭제되었습니다.');
    } catch (e) { console.error('계약 삭제 실패', e); toast.error('삭제에 실패했습니다.'); }
  };

  // 색 채우기 (선택 행 배경색 · color=null이면 제거) — 물건관리와 동일
  const FILL_COLORS = ['#fee2e2', '#fef9c3', '#dcfce7', '#dbeafe', '#f3e8ff', '#fed7aa'];
  const handleColorFill = (color) => {
    setShowPalette(false);
    if (selectedIds.length === 0) { toast.error('색을 채울 계약을 선택하세요.'); return; }
    selectedIds.forEach((id) => saveContract({ id, rowColor: color || null }));
    reload();
  };

  const typeBtn = (active) => ({
    padding: '6px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px',
    backgroundColor: active ? '#4f46e5' : 'white', cursor: 'pointer', whiteSpace: 'nowrap',
    minWidth: '48px', textAlign: 'center', color: active ? 'white' : '#000', fontWeight: 500,
  });
  const selectStyle = { padding: '4px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', color: '#000', cursor: 'pointer' };
  const fRow = { display: 'flex', alignItems: 'center', gap: '4px' };
  const fLabel = { fontSize: '14px', color: '#000', whiteSpace: 'nowrap', fontWeight: 500 };
  // 물건관리 헤더와 동일 규칙: 흰 배경 · 검정 글자 · 일반 굵기 · 상하 검정 테두리
  // sticky 헤더: 상/하 검정선은 border 대신 inset box-shadow로 그려 스크롤 시 끊기지 않게 함
  // border-collapse:separate + 셀 오른쪽/아래 보더로 1px 그리드(테이블에 위/왼쪽 보더). sticky 헤더도 보더 유지됨
  const th = { padding: '0 8px', height: '50px', fontSize: '14px', fontWeight: 600, color: '#000', background: '#f9fafb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', textAlign: 'center' };
  const navBtn = (active) => ({ padding: '6px 14px', fontSize: '14px', fontWeight: 500, border: '1px solid #cbd5e1', borderRadius: '4px', background: active ? '#4f46e5' : 'white', color: active ? 'white' : '#000', cursor: 'pointer', whiteSpace: 'nowrap' });

  // 저장된 계약서 → 테이블 셀 값 매핑 (key 기준)
  // YYYY-MM-DD → YY.MM.DD
  const fmtYYMMDD = (v) => { if (!v) return ''; const [y, m, d] = String(v).split('T')[0].split('-'); return (y && m && d) ? `${y.slice(2)}.${m}.${d}` : v; };
  // 거래신고 D-day: 거래신고기준일(없으면 계약일) + 30일 기준 잔여일
  const reportDday = (c) => {
    const base = c.거래신고기준일 || c.계약일 || c.계약일자;
    if (!base) return '-';
    const bd = new Date(String(base).split('T')[0]);
    if (isNaN(bd.getTime())) return '-';
    const deadline = new Date(bd); deadline.setDate(deadline.getDate() + 30);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadline - today) / 86400000);
    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return 'D-DAY';
    return `D+${-diff}`;
  };
  // 신고완료일(로컬 입력 우선, 없으면 백엔드 필드)
  const reportDoneOf = (c) => reportDates[c.id] ?? c.거래신고완료일 ?? '';

  const cellVal = (c, key) => {
    switch (key) {
      case '가계약문자': return c.가계약문자 || '-';
      case '물건유형': return c.ptType || '-';
      case '거래유형': return c.거래유형 || '-';
      case '소재지': return c.소재지 || '-';
      case '이전의뢰인': return c.이전의뢰인 || '-';
      case '취득의뢰인': return c.취득의뢰인 || '-';
      case '거래금액': return c.거래금액 || '-';
      case '계약일': return c.계약일 || c.계약일자 || '-';
      case '신고완료일': { const dv = reportDoneOf(c); return dv ? fmtYYMMDD(dv) : '-'; }
      case '중도금일': return c.중도금1 || c.중도금 || '-';
      case '잔금일': return c.잔금일 || c.잔금일자 || '-';
      case '전자계약': return c.전자계약 || '-';
      case '국토부회신': return c.국토부회신 || '-';
      default: return '-';
    }
  };

  // 공용 테이블(ContractListTable)용 셀 렌더러 — 특수 셀(선택/거래신고여부/공동중개사)은 별도 처리
  const renderContractCell = (c, col) => {
    switch (col.key) {
      case '가계약문자':
        return c.hasPreSms ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); openPreSms(c); }} title="가계약 문자 보기"
            style={{ padding: '3px 12px', fontSize: '13px', fontWeight: 700, border: '1px solid #c7d2fe', borderRadius: '4px', background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            보기
          </button>
        ) : '-';
      case 'select':
        return <input type="checkbox" checked={selectedIds.includes(c.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSel(c.id)} style={{ cursor: 'pointer' }} />;
      case '거래신고여부': {
        const done = reportDoneOf(c);
        return (
          <span onClick={(e) => { e.stopPropagation(); setReportModal({ id: c.id, date: (reportDates[c.id] ?? c.거래신고완료일 ?? '') }); }}
            title="클릭하여 거래신고 완료일 입력"
            style={{ cursor: 'pointer', fontWeight: 700, color: done ? '#16a34a' : '#dc2626' }}>
            {done ? `(완)${fmtYYMMDD(done)}` : reportDday(c)}
          </span>
        );
      }
      case '공동중개사':
        return (
          <div style={{ lineHeight: 1.4, textAlign: 'left' }}>
            <div>(전)&gt; {c.전송업체 || '-'}</div>
            <div>(수)&gt; {c.수신업체 || '-'}</div>
          </div>
        );
      default:
        return cellVal(c, col.key);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* 검색 조건 (타이틀 섹션 제거 · 물건관리 상단 검색섹션 참고) */}
      <div style={{ flexShrink: 0, padding: mode === 'compose' ? '8px 8px 0' : '8px 8px 8px' }}>
        {/* 좌측 최상단: 모드 전환 + (계약서작성 모드에서만) 공통 기능 버튼 */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
          <button style={navBtn(mode === 'list')} onClick={() => { setMode('list'); reload(); }}>계약목록</button>
          <button style={navBtn(mode === 'compose')} onClick={() => { setActiveMasterId(null); setMode('compose'); }}>계약서작성</button>
          {mode === 'compose' && (
            <>
              <span style={{ alignSelf: 'stretch', width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
              <button style={navBtn(gongjeCount > 0)} onClick={() => setGongjeOpen(true)}>공제증서{gongjeCount > 0 ? `(${gongjeCount})` : ''}</button>
              {/* 공적장부 — 클릭 시 하단 드롭다운 (거래관련서식과 동일한 방식) */}
              <div style={{ position: 'relative' }}>
                <button style={navBtn(ledgerMenu)} onClick={() => setLedgerMenu((v) => !v)}>공적장부 ▾</button>
                {ledgerMenu && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 50, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: '200px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {PUBLIC_LEDGERS.map((it, i) => (
                      <button key={it.name} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', borderTop: i === 0 ? 'none' : '1px solid #f1f5f9', background: 'white', cursor: 'pointer' }} onClick={() => { setLedgerMenu(false); openExternalUrl(it.url); }}>{it.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <button style={{ ...navBtn(false), display: 'inline-flex', alignItems: 'center', gap: '5px' }} onClick={() => { const url = 'https://irts.molit.go.kr'; if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url); else window.open(url, '_blank', 'noopener'); }}><img src={molitIcon} alt="국토교통부" style={{ width: '14px', height: '14px', flexShrink: 0 }} />부동산거래 전자계약시스템</button>
            </>
          )}
          {/* 상단바 대체: 고객센터·카톡문의·홈으로 (우측 정렬) */}
          <div style={{ marginLeft: 'auto' }}><MenuTopActions /></div>
        </div>
        {/* 노란색 섹션(계약서작성 상단 참고) — 물건유형 + 시도/시군구/법정동 지역검색 (계약목록 모드에서만) */}
        {mode === 'list' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '8px 12px', marginBottom: '8px', background: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '4px' }}>
          <div style={fRow}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', whiteSpace: 'nowrap' }}>물건유형</span>
            <select value={ptType} onChange={(e) => setPtType(e.target.value)} style={selectStyle}>
              <option value="">모든유형</option>
              {CONTRACT_PT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div style={fRow}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', whiteSpace: 'nowrap' }}>지역</span>
            <AddressSelectorSimple formData={regionForm} onChange={setRegion} ptType={ptType} />
            {(regionForm.addr1 || regionForm.addr2 || regionForm.addr3) && (
              <button type="button" onClick={() => setRegionForm({})}
                style={{ padding: '4px 10px', fontSize: '13px', fontWeight: 700, border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', color: '#92400e', cursor: 'pointer' }}>
                지역해제
              </button>
            )}
          </div>
        </div>
        )}
        {/* 필터바 — 물건관리처럼 박스/테두리 없이 한 줄 (계약목록 모드에서만) */}
        {mode === 'list' && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={fRow}>
            <span style={fLabel}>거래유형</span>
            <select value={tradeType} onChange={(e) => setTradeType(e.target.value)} style={selectStyle}>
              {TRADE_TYPES.map((t) => (<option key={t.value || 'all'} value={t.value}>{t.label}</option>))}
            </select>
          </div>
          <div style={fRow}>
            <span style={fLabel}>날짜</span>
            <select value={dateType} onChange={(e) => setDateType(e.target.value)} style={selectStyle}>
              <option value="계약일">계약일</option>
              <option value="중도금1차">중도금1차</option>
              <option value="중도금2차">중도금2차</option>
              <option value="잔금일">잔금일</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '4px 6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
            <span style={{ color: '#94a3b8' }}>~</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '4px 6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
          </div>
          <div style={fRow}>
            <span style={fLabel}>완료여부</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
              <option value="">전부</option>
              <option value="진행">진행</option>
              <option value="완료">완료</option>
              <option value="해지">해지</option>
            </select>
          </div>
          <div style={fRow}>
            <span style={fLabel}>검색</span>
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
              placeholder="주소/의뢰인" style={{ width: '200px', padding: '4px 8px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
          </div>
          {/* 우측: 색 채우기 / 등록 / 삭제 — 물건관리 버튼 스타일 동일 */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowPalette((v) => !v)}
                style={{ padding: '6px 14px', fontSize: '14px', fontWeight: '500', border: '1px solid #6366f1', borderRadius: '6px', backgroundColor: 'white', color: '#4f46e5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <Palette className="w-4 h-4" />
                색 채우기{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </button>
              {showPalette && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 50, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {FILL_COLORS.map((c) => (
                    <button key={c} onClick={() => handleColorFill(c)} title="색 적용" style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: c, cursor: 'pointer' }} />
                  ))}
                  <button onClick={() => handleColorFill(null)} title="색 지우기" style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', color: '#dc2626', lineHeight: 1 }}>✕</button>
                </div>
              )}
            </div>
            <button onClick={() => setShowRegister(true)}
              style={{ padding: '6px 14px', fontSize: '14px', fontWeight: '500', border: '1px solid #4f46e5', borderRadius: '6px', backgroundColor: '#4f46e5', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Plus className="w-4 h-4" />
              등록
            </button>
            <button onClick={handleDelete}
              style={{ padding: '6px 14px', fontSize: '14px', fontWeight: '500', border: '1px solid #dc2626', borderRadius: '6px', backgroundColor: '#dc2626', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Trash2 className="w-4 h-4" />
              삭제{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </button>
          </div>
        </div>
        )}
      </div>

      {/* 본문: 계약목록(테이블) 또는 계약서작성 워크스페이스 */}
      {mode === 'compose' ? (
        <ContractComposePage
          key={activeMasterId || 'new'}
          masterId={activeMasterId}
          onMasterId={setComposeMasterId}
          onComposeMeta={setComposeMeta}
          onSaved={(id) => { if (id != null) setActiveMasterId(id); reload(); }}
        />
      ) : (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'}}>
        {/* 계약목록 — 물건/고객관리와 동일한 공통 테이블(ContractListTable) 사용 */}
        <ContractListTable
          menuId="contracts"
          allColumns={CONTRACT_COLS}
          defaultColumns={CONTRACT_COLS}
          data={visibleContracts}
          isLoading={false}
          renderCell={renderContractCell}
          onRowSelect={(row) => toggleSel(row.id)}
          onRowClick={(row) => {
            // 약식 등록건은 계약서작성이 아니라 약식 수정창으로
            if (row._simple) { setEditRegister(row); setShowRegister(true); }
            else { setActiveMasterId(row.id ?? null); setMode('compose'); }
          }}
          onRowEdit={(row) => {
            if (row._simple) { setEditRegister(row); setShowRegister(true); }
            else { setActiveMasterId(row.id ?? null); setMode('compose'); }
          }}
          onRowCopy={async (row) => {
            if (row._simple || !row.id) { toast.error('약식 등록건은 복사등록을 지원하지 않습니다.'); return; }
            try {
              await contractApiService.copy(row.id, user?.userId);
              toast.success('계약서가 복사되었습니다.');
              reload();
            } catch (e) { console.error('계약서 복사 실패:', e); toast.error('복사등록에 실패했습니다.'); }
          }}
          currentPage={1}
          totalPages={1}
          pageSize={visibleContracts.length || 1}
          onPageChange={() => {}}
          emptyMessage="계약 데이터가 없습니다. 우측 상단 신규등록으로 계약서를 작성하세요."
          colorFillRequest={null}
          fluidWidth
        />
      </div>
      )}

      {/* 거래신고 완료일 입력 모달 — 셀 클릭 시. 저장하면 '(완)YY.MM.DD' 표기 */}
      {reportModal && (
        <div onClick={() => setReportModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '360px', maxWidth: '92vw', background: 'white', borderRadius: '10px', boxShadow: '0 16px 44px rgba(0,0,0,0.32)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', fontSize: '18px', fontWeight: 800, color: '#111827' }}>거래신고 완료일</div>
            <div style={{ padding: '18px' }}>
              <label style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>신고 완료일 입력</label>
              <input type="date" value={reportModal.date || ''} onChange={(e) => setReportModal((m) => ({ ...m, date: e.target.value }))}
                style={{ width: '100%', height: '38px', padding: '0 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>완료일을 입력하면 셀에 (완){reportModal.date ? fmtYYMMDD(reportModal.date) : 'YY.MM.DD'} 로 표기됩니다.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button type="button" onClick={async () => { const id = reportModal.id; setReportDates((m) => { const n = { ...m }; delete n[id]; return n; }); setReportModal(null); try { await contractApiService.saveReportDate(id, null, user?.userId); } catch (e) { console.error(e); } reload(); }}
                style={{ marginRight: 'auto', padding: '8px 14px', fontSize: '14px', fontWeight: 600, color: '#dc2626', background: 'white', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer' }}>완료 취소</button>
              <button type="button" onClick={() => setReportModal(null)}
                style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={async () => { const { id, date } = reportModal; if (date) setReportDates((m) => ({ ...m, [id]: date })); setReportModal(null); try { await contractApiService.saveReportDate(id, date || null, user?.userId); toast.success('거래신고 완료일이 저장되었습니다.'); } catch (e) { console.error(e); toast.error('저장 실패'); } reload(); }}
                style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 신규등록: 계약서 종류 선택 모달 */}
      {showTypePicker && (
        <div onClick={() => setShowTypePicker(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '580px', maxWidth: '92vw', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>계약서 종류 선택</div>
              <button onClick={() => setShowTypePicker(false)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '62vh', overflowY: 'auto' }}>
              {CONTRACT_DOCS.map((t) => (
                <button key={t.label}
                  onClick={() => startNew(t.label)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', fontSize: '13px', textAlign: 'left',
                    border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', color: '#111827', cursor: 'pointer', fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#eef2ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 계약서 A4 에디터 (비-Electron 폴백: 인페이지 오버레이) */}
      {editorDoc && (
        <ContractDocumentEditor
          initialData={editorDoc.__new ? { docType: editorDoc.docType } : editorDoc}
          onSave={handleSaveDoc}
          onClose={() => { setEditorDoc(null); reload(); }}
        />
      )}

      {/* 서식자료실 — 우측 슬라이드 패널 (화면 살짝 어둡게) */}
      {showFormLibrary && (
        <>
          <div onClick={() => setShowFormLibrary(false)} style={{ position: 'fixed', inset: 0, zIndex: 1190, background: 'rgba(15,23,42,0.35)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1200, width: '320px', maxWidth: '90vw', background: 'white', boxShadow: '-4px 0 18px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.22s ease' }}>
            <style>{'@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}'}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>서식자료실</div>
              <button onClick={() => setShowFormLibrary(false)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: '위임장', key: 'wimjang' },
                { label: '영수증1', key: 'receipt1' },
                { label: '영수증2', key: 'receipt2' },
                { label: '정산서', key: 'settlement' },
              ].map((f) => (
                <button key={f.key} onClick={() => { if (f.key === 'settlement') { setShowFormLibrary(false); setShowSettlement(true); } else if (f.key === 'receipt1' || f.key === 'receipt2') { setShowFormLibrary(false); setReceiptForm(f.label); } else { openFormPreview(f.key, f.label); } }}
                  style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, textAlign: 'left', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#1e293b', cursor: 'pointer' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 공과금 등 정산서 — 편집 팝업(미리보기·인쇄) */}
      {showSettlement && <SettlementForm onClose={() => setShowSettlement(false)} />}

      {/* 영수증 편집 팝업(표 입력 → 미리보기·인쇄) */}
      {receiptForm && <ReceiptForm title={receiptForm} onClose={() => setReceiptForm(null)} />}

      {/* 계약 등록 — 표형식 입력 폼(첨부파일 포함) */}
      {showRegister && (
        <ContractRegisterForm
          editData={editRegister}
          onSave={(rec) => handleSaveDoc(rec)}
          onClose={() => { setShowRegister(false); setEditRegister(null); reload(); }}
        />
      )}

      {/* 공제증서 첨부 모달 (계약서 PK 기준) */}
      {gongjeOpen && (
        <GongjeCertModal
          refKey={composeMasterId}
          userId={user?.userId}
          meta={composeMeta}
          onCount={setGongjeCount}
          onClose={() => setGongjeOpen(false)}
        />
      )}
    </div>
  );
};

export default ContractsPage;

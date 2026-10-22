import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-hot-toast';
import { buildContractTemplate } from '../../constants/contractTemplates';
import { saveContract } from '../../utils/contractStore';
import { useAuthStore } from '../../stores/authStore';
import { LAND_CATEGORIES } from '../../constants/landCategories';
import { BUILDING_USES } from '../../constants/buildingUses';
import { propertyService } from '../../services/propertyService';
import StandardLeaseBody from './StandardLeaseBody';
import KeyMoneyBody from './KeyMoneyBody';
import BunyangBody from './BunyangBody';
import IpjugwonBody from './IpjugwonBody';
import SpecialClauseManager from './SpecialClauseManager';
import BrokerSearchModal from './BrokerSearchModal';
import DaumAddressModal from '../common/DaumAddressModal';

// 계약서 부동산표시 - 건물구조 / 대지권종류 옵션
const STRUCT_OPTIONS = ['철근콘크리트', '철골', '철골콘크리트', '벽돌', '기타'];
const LANDRIGHT_OPTIONS = ['소유권', '지상권', '전세권', '임차권', '기타'];

// 특약사항 프리셋
const SPECIAL_FREQUENT = [
  '현 시설상태에서의 계약이며, 매수(임차)인은 등기부등본 및 현 시설상태를 확인하고 계약을 체결함.',
  '잔금일 기준으로 제반 공과금(전기·수도·가스·관리비 등)을 정산하기로 한다.',
  '본 계약에 명시되지 않은 사항은 관계법령 및 부동산 거래 관행에 따른다.',
];
const SPECIAL_COLLECTION = [
  '현 등기부상의 근저당권(채권최고액 원)은 잔금일에 말소하기로 한다.',
  '현 임대차(보증금 원/월세 원)는 매수인이 승계하기로 한다.',
  '매도인은 잔금일까지 전입세대 및 점유자를 명도하기로 한다.',
  '계약 후 잔금 전까지 화재 등 천재지변으로 인한 멸실·훼손 시 계약은 무효로 하고 계약금을 반환한다.',
  '중개대상물 확인·설명서 및 공제증서를 교부받았음을 확인한다.',
];

/**
 * 계약서 — A4 편집/인쇄 문서 에디터 (카테고리 템플릿 기반)
 *  - 매매/전세/월세/교환/권리양도/전대차/전속중개 등 모든 계약서 지원
 *  - 저장(onSave) / 인쇄(window.print, 여러 페이지 지원) / 닫기(onClose)
 *  - document.body로 포털 렌더 → 인쇄 시 앱 숨기고 문서만 A4 여러 페이지로 출력
 *  참고: 원본 .doc이 Fasoo DRM 암호화되어 열람 불가 → 한국 표준 서식으로 재현
 */

// 문서 내 편집용 인라인 인풋 (밑줄) — 모듈 스코프(리마운트/포커스 유지)
const Field = ({ value, onChange, w, ph, center }) => (
  <input type="text" value={value ?? ''} onChange={onChange} placeholder={ph || ''}
    style={{ width: w || 'auto', border: 'none', outline: 'none', fontSize: '13px', padding: '1px 4px', background: 'transparent', fontFamily: 'inherit', textAlign: center ? 'center' : 'left', boxSizing: 'border-box' }} />
);

const cellTh = { border: '1px solid #334155', background: '#f1f5f9', padding: '2px 6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' };
const cellTd = { border: '1px solid #334155', padding: '2px 6px', fontSize: '13px', verticalAlign: 'middle' };
const cellParty = { ...cellTh, background: '#dcfce7', width: '58px' }; // 당사자 라벨(초록)
const cellSub = { ...cellTh, background: '#cffafe' };                  // 항목 라벨(하늘)
const cellSeal = { ...cellTh, background: 'white', width: '40px', color: '#111827' }; // 서명(인)
const clauseTitle = { fontSize: '13px', fontWeight: 700, marginTop: '3px' };
const clauseText = { fontSize: '13px', lineHeight: 1.35, color: '#1f2937', marginTop: '1px' };
// 제N조 걸이형 들여쓰기: 첫 줄은 '제N조'부터, 줄바꿈된 내용은 그 아래로 정렬
const clauseHang = { ...clauseText, paddingLeft: '3.2em', textIndent: '-3.2em' };
const pillBtn = { padding: '4px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #6366f1', borderRadius: '6px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' };

// 부동산 계약서 융자금(현상태 승계) 행 — 템플릿에 없어도 '융자금 추가' 시 이 행을 주입해 표시
const LOAN_ROW = { label: '융자금', text: ['金 ', { k: '융자금한글', w: '48%' }, ' 원정은 현상태에서 승계함.'] };
// 융자금/현임대보증금 승계 문구(드롭다운 공통)
const LOAN_TERMS = [
  '현 상태에서 매수인이 승계함.',
  '매도인이 잔금지급일까지 말소한다.',
  '특약사항에 별도 명시한다.',
  '매수인이 인수한다.',
  '매수인이 인수하지 아니한다.',
];
// 융자금 행 상태: 템플릿에 있으면 기본표시(_융자금표시!==false), 없으면 매매대금/보증금 계약(부동산)에서 추가 가능(_융자금표시===true일 때만 표시)
const loanInfo = (tpl, doc) => {
  const rows = tpl?.amountRows || [];
  const hasRow = rows.some((r) => r.label === '융자금');
  const first = rows[0]?.label;
  const eligible = hasRow || first === '매매대금' || first === '보증금';
  // 매매: 융자금 기본 표시 유지 / 전세·월세: 추가 시 표시. '＋ 융자금 추가' 버튼은 부동산 계약이면 항상 노출
  const visible = hasRow ? doc._융자금표시 !== false : doc._융자금표시 === true;
  return { hasRow, eligible, visible, showBtn: eligible };
};
// 융자금 동적 리스트({ amt, 승계, 라벨 })로 관리 — 여러 건 추가 가능. 구버전 단일값(융자금한글 등) 승계
const getLoans = (tpl, doc) => {
  if (Array.isArray(doc._loans)) return doc._loans;
  if (doc.융자금한글 != null && doc.융자금한글 !== '') return [{ amt: doc.융자금한글, 승계: doc.융자금승계 || LOAN_TERMS[0], 라벨: doc.융자금라벨 || '융자금' }];
  const { hasRow } = loanInfo(tpl, doc);
  if (hasRow && doc._융자금표시 !== false) return [{ amt: '', 승계: LOAN_TERMS[0], 라벨: '융자금' }];
  return [];
};
const selStyle = { border: 'none', outline: 'none', fontSize: '13px', padding: '1px 4px', background: 'transparent', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', color: '#111827', cursor: 'pointer' };
// 신분증 번호 유형(당사자·대리인 공통) / 대리인 라벨 유형
// 테두리 있는 입력칸(대지권비율 분모/분자·토지면적 — 밑줄 제거 정책 예외)
const landBox = { border: '1px solid #94a3b8', borderRadius: '3px', outline: 'none', fontSize: '13px', padding: '2px 4px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' };
const landSel = { border: '1px solid #94a3b8', borderRadius: '3px', outline: 'none', fontSize: '13px', padding: '2px 4px', background: 'white', fontFamily: 'inherit', cursor: 'pointer', color: '#111827' };
const landLbl = { fontSize: '13px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' };
const ID_TYPES = ['주민등록번호', '법인등록번호', '외국인등록번호', '기타단체등록번호','재외국민주민번호','사업자번호','종중등록번호','종교단체등록번호','여권번호','고유등록번호'];
// 건축물 용도 드롭다운 항목(마지막 '직접입력' 선택 시 텍스트 입력)
const BUILDING_USE_OPTS = ['아파트', '업무시설', '공동주택', '연립주택', '다세대주택', '단독주택', '다가구주택', '다중주택', '근린생활시설 및 주택', '근린생활시설', '공장', '창고시설', '없음', '직접입력'];
// 숫자 → 한글 금액 표기 (예: 350000000 → 삼억오천만)
const HAN_D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const HAN_S = ['', '십', '백', '천'];
const HAN_B = ['', '만', '억', '조', '경'];
const hangulAmount = (value) => {
  const n = Math.floor(Number(String(value ?? '').replace(/[^0-9]/g, '')));
  if (!n || isNaN(n)) return '';
  const digits = String(n).split('').reverse();
  const groups = [];
  for (let i = 0; i < digits.length; i += 4) groups.push(digits.slice(i, i + 4));
  let result = '';
  for (let g = groups.length - 1; g >= 0; g--) {
    const grp = groups[g];
    let s = '';
    for (let i = grp.length - 1; i >= 0; i--) { const d = Number(grp[i]); if (d) s += HAN_D[d] + HAN_S[i]; }
    if (s) result += s + HAN_B[g];
  }
  return result;
};
const DAERI_TYPES = ['없음', '대리인', '공동명의인', '출력후수기입력', '대표자', '법정대리인', '매수인'];

// 금액 입력창 — 포커스 시 숫자 입력(+만 단위 표시), 포커스 해제 시 입력창 안에 한글 금액(예: 오백만)으로 표기
//  · 한글은 '원' 없이 표기하고, 뒤에 붙는 '원정은/원정' 문구가 '원'을 완성 → '오백만원정은' 형태로 자연스럽게 이어짐
//  · 만원 단위일 때는 숫자 입력 중에만 '만'을 덧붙여 '500만원정은'처럼 읽히게 함
const fmtCommaStr = (s) => {
  if (!s) return '';
  const [ip, dp] = s.split('.');
  const i = ip ? Number(ip).toLocaleString('en-US') : '0';
  return s.includes('.') ? `${i}.${dp ?? ''}` : i;
};
const AmountInput = ({ value, onChange, man, style, placeholder }) => {
  const [focused, setFocused] = useState(false);
  const raw = String(value ?? '').replace(/[^0-9.]/g, '');
  const num = raw ? Number(raw) : 0;
  const won = (!raw || isNaN(num)) ? 0 : (man ? num * 10000 : num);
  const withCommas = fmtCommaStr(raw);                         // 세자리 콤마 표기(소수점 허용)
  const showHan = !focused && raw !== '' && won > 0;
  // 저장값은 숫자(+소수점)만 유지, 표시만 콤마 적용
  const handleChange = (e) => {
    let v = e.target.value.replace(/[^0-9.]/g, '');
    const dot = v.indexOf('.');
    if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
    onChange({ target: { value: v } });
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      <input
        type="text"
        inputMode="decimal"
        value={showHan ? hangulAmount(won) : withCommas}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={handleChange}
        placeholder={placeholder || '숫자 입력'}
        style={style}
        readOnly={showHan}
      />
      {focused && man && <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>만</span>}
    </span>
  );
};

export default function ContractDocumentEditor({ initialData = null, onSave, onClose, inline = false, readOnly = false, hideClauses = false, stage = '본계약', value = null, onChange = null, hideActions = false, onPrint = null }) {
  const pre = stage === '가계약'; // 가계약: 부동산 표시에 소재지만, 제목에 '- 가계약'
  const [brokerSearch, setBrokerSearch] = useState(null); // 중개사 조회 팝업 대상 행 index(bi) — null이면 닫힘
  const [internalDoc, setInternalDoc] = useState(() => ({ docType: '부동산매매계약서(단독)', ...(initialData || {}) }));
  // value가 있으면 제어형(미리보기), 없으면 내부상태(편집) — onChange는 항상 부모에 통지(미리보기/저장용)
  const doc = value != null ? value : internalDoc;
  // 최신 doc 참조(특약관리 storage 리스너 등 오래 사는 콜백의 stale 클로저 방지)
  const docRef = useRef(doc);
  docRef.current = doc;
  const setDoc = (updater) => {
    const base = value != null ? value : docRef.current;
    const next = typeof updater === 'function' ? updater(base) : updater;
    if (value == null) setInternalDoc(next);
    if (onChange) onChange(next);
  };
  const showClauses = true; // 조항(제2조~) 항상 표시
  const [showSpecialMgr, setShowSpecialMgr] = useState(false); // 특약관리(웹 폴백 인페이지 모달)
  // 특약사항에 텍스트 추가(끝에 줄바꿈 후 삽입)
  const appendSpecial = (text) => {
    const t = (text || '').trim(); if (!t) return;
    setDoc((p) => ({ ...p, 특약사항: (p.특약사항 ? p.특약사항.replace(/\s+$/, '') + '\n' : '') + t }));
  };
  // 특약관리 열기 — 새 창(Electron), 웹은 인페이지 모달
  const openSpecialManager = () => {
    if (window.electronAPI?.modal?.open) {
      window.electronAPI.modal.open({ type: 'special-clause-manager', data: {}, width: 940, height: 680, minWidth: 720, minHeight: 480, resizable: true })
        .catch(() => setShowSpecialMgr(true));
    } else {
      setShowSpecialMgr(true);
    }
  };
  // 특약관리 새 창의 '적용'을 수신(같은 origin localStorage 브리지). 편집 인스턴스에서만.
  useEffect(() => {
    if (readOnly || hideActions) return undefined;
    let lastN = null;
    const onStorage = (e) => {
      if (e.key !== 'specialClauseApply' || !e.newValue) return;
      try { const { text, n } = JSON.parse(e.newValue); if (n === lastN) return; lastN = n; appendSpecial(text); } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, hideActions]);
  const [ptPicker, setPtPicker] = useState(false);      // 물건정보 불러오기 팝업
  const [ptList, setPtList] = useState([]);
  const [ptLoading, setPtLoading] = useState(false);
  // 지번추가: 1.부동산 표시 항목을 모달로 입력 → 본 표 아래에 블록으로 추가
  const [jibunModal, setJibunModal] = useState(null);   // null | { index:number|null, data:{...} }
  const [showAddr, setShowAddr] = useState(false);      // 소재지 주소검색 모달
  const [addrTargetKey, setAddrTargetKey] = useState('소재지'); // 주소검색 결과를 넣을 필드 키
  const openAddr = (key = '소재지') => { if (readOnly) return; setAddrTargetKey(key); setShowAddr(true); };
  const set = (k) => (e) => { if (readOnly) return; setDoc((p) => ({ ...p, [k]: e.target.value })); };
  // 지번(부동산 표시) 블록 — 본 표와 동일 항목
  const EMPTY_JIBUN = { 소재지: '', 토지지목: '', 대지권종류: '', 대지권분모: '', 대지권분자: '', 토지면적: '', 건물구조: '', 건물용도: '', 건물용도직접: '', 건물면적: '' };
  const jibunList = (doc._지번들 || []).map((v) => (typeof v === 'string' ? { ...EMPTY_JIBUN, 소재지: v } : { ...EMPTY_JIBUN, ...v }));
  const openJibunModal = (index = null) => setJibunModal({ index, data: index == null ? { ...EMPTY_JIBUN } : { ...EMPTY_JIBUN, ...jibunList[index] } });
  const saveJibun = () => {
    if (!jibunModal) return;
    const { index, data } = jibunModal;
    setDoc((p) => {
      const cur = (p._지번들 || []).map((v) => (typeof v === 'string' ? { ...EMPTY_JIBUN, 소재지: v } : v));
      const next = index == null ? [...cur, data] : cur.map((x, j) => (j === index ? data : x));
      return { ...p, _지번들: next };
    });
    setJibunModal(null);
  };
  const removeJibun = (index) => setDoc((p) => ({ ...p, _지번들: (p._지번들 || []).filter((_, j) => j !== index) }));
  const setJD = (k, v) => setJibunModal((m) => (m ? { ...m, data: { ...m.data, [k]: v } } : m));
  const jimokLabel = (v) => (LAND_CATEGORIES.find((c) => c.value === v)?.label || v || '');
  const useLabel = (d) => (d.건물용도 === '직접입력' ? (d.건물용도직접 || '') : (d.건물용도 || ''));
  // 지번 모달 입력 스타일
  const jmRow = { display: 'flex', alignItems: 'center', gap: '8px' };
  const jmLb = { fontSize: '13px', fontWeight: 700, color: '#111827', width: '72px', flexShrink: 0 };
  const jmInp = { flex: 1, padding: '6px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };
  const jmSel = { flex: 1, padding: '6px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white', cursor: 'pointer' };
  const jmTwo = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
  const tpl = buildContractTemplate(doc.docType, doc.category);
  const isStandardLease = doc.category === 'standardLease' || (doc.docType || '').includes('표준임대차');
  const isKeyMoney = doc.category === 'keymoney' || (doc.docType || '').includes('권리금');
  const isBunyang = doc.category === 'bunyang' || (doc.docType || '').includes('분양권 매매');
  const isIpjugwon = doc.category === 'ipjugwon' || (doc.docType || '').includes('입주권 매매');
  const isAssign = doc.category === 'assign' || (doc.docType || '').includes('양수 양도');
  const office = useAuthStore((s) => s.office);
  const authUser = useAuthStore((s) => s.user);

  // 매매 계약 여부 — 매매대금 금액행이 있으면 매매. (임대할부분은 매매가 아닐 때만 표시)
  const isSaleContract = (tpl.amountRows || []).some((r) => r.label === '매매대금');

  // 거래당사자/공동중개사 추가·삭제 (버튼은 좌측 액션바에서 통일 렌더)
  const signCfg = tpl.sign || { parties: tpl.parties, daeri: 'full', broker: 'gaeup', brokerCount: 1 };
  const partyP0 = signCfg.parties[0], partyP1 = signCfg.parties[1];
  const addParty = (label) => setDoc((prev) => { const id = Date.now(); return { ...prev, _addParties: [...(prev._addParties || []), { label, id }], [`_addlabel_${label}#${id}`]: '대리인' }; });
  const removeParty = (id) => setDoc((prev) => ({ ...prev, _addParties: (prev._addParties || []).filter((a) => a.id !== id) }));
  const addBroker = () => setDoc((prev) => ({ ...prev, _공동중개사수: (prev._공동중개사수 || 0) + 1 }));
  const removeBroker = () => setDoc((prev) => ({ ...prev, _공동중개사수: Math.max(0, (prev._공동중개사수 || 0) - 1) }));
  // 중개사 조회 팝업(라벨 돋보기)에서 선택 → 돋보기로 지정한 그 행에 자동입력(새 행 추가 안 함)
  const onSelectBroker = (row) => {
    const s = signCfg;
    const baseBn = s.broker === 'none' ? 0 : (s.brokerCount || 1);
    // 돋보기로 지정한 대상 행 index (지정 없으면 마지막 행)
    const bi = typeof brokerSearch === 'number' ? brokerSearch : (baseBn + Math.max(0, (doc._공동중개사수 || 0) - 1));
    setDoc((prev) => {
      const pf = bi === 0 ? '중개' : `중개${bi + 1}`;
      const nameKey = s.broker === 'gaeup' ? `${pf}상호` : (s.broker === 'std' ? `${pf}사무소명칭` : '중개상호');
      const addrKey = s.broker === 'exclusive' ? '중개사무소소재지' : `${pf}사무소소재지`;
      const regKey = s.broker === 'exclusive' ? '중개등록번호' : `${pf}등록번호`;
      const repKey = s.broker === 'exclusive' ? '중개대표' : `${pf}대표`;
      const sosokKey = `${pf}소속`;
      const cell = (row && row.cell) || {};
      const jikwi = cell['직위'] || '';
      const person = cell['성명'] || '';
      const reg = (row && row.codes && row.codes.regNo) || cell['등록번호'] || '';
      const next = { ...prev };
      if (cell['상호']) next[nameKey] = cell['상호'];
      if (reg) next[regKey] = reg;
      if (cell['소재지']) next[addrKey] = cell['소재지'];
      const rep = cell['대표자'] || (jikwi === '대표' ? person : '');
      if (rep) next[repKey] = rep;
      if (s.broker === 'gaeup' && person && jikwi && jikwi !== '대표') next[sosokKey] = person;
      return next;
    });
    setBrokerSearch(null);
  };
  const delPill = { ...pillBtn, color: '#dc2626', borderColor: '#fca5a5' };

  // 개업공인중개사: 로그인(회원가입) 사무소/중개사 정보 자동 세팅(빈 값만) — 직접입력 우선
  useEffect(() => {
    if (readOnly) return; // 미리보기(읽기전용) 인스턴스는 자동 세팅 생략
    const sign = tpl.sign;
    if (!sign || sign.broker === 'none' || (!office && !authUser)) return;
    setDoc((p) => {
      const next = { ...p };
      const bn = sign.brokerCount || 1;
      for (let bi = 0; bi < bn; bi++) {
        const pf = bi === 0 ? '중개' : `중개${bi + 1}`;
        const nameKey = sign.broker === 'gaeup' ? `${pf}상호` : (sign.broker === 'std' ? `${pf}사무소명칭` : '중개상호');
        const addrKey = sign.broker === 'exclusive' ? '중개사무소소재지' : `${pf}사무소소재지`;
        const regKey = sign.broker === 'exclusive' ? '중개등록번호' : `${pf}등록번호`;
        const repKey = sign.broker === 'exclusive' ? '중개대표' : `${pf}대표`;
        const telKey = sign.broker === 'exclusive' ? '중개전화' : `${pf}전화`;
        if (!next[nameKey] && office?.offNm) next[nameKey] = office.offNm;
        if (!next[addrKey] && office?.addr) next[addrKey] = office.addr;
        if (!next[regKey] && office?.regNo) next[regKey] = office.regNo;
        if (!next[repKey] && office?.rpsNm) next[repKey] = office.rpsNm;
        if (!next[telKey] && office?.offTel) next[telKey] = office.offTel;
        if (sign.broker === 'gaeup' && !next[`${pf}소속`] && authUser?.rtNm) next[`${pf}소속`] = authUser.rtNm;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [office, authUser, doc.docType]);

  // 조항 내 날짜 항목(…일자 / …종료)은 데이트피커 사용, 읽기전용/인쇄는 'YYYY년 MM월 DD일' 텍스트
  const fmtDateK = (v) => { if (!v) return ''; const [y, m, d] = String(v).split('-'); return (y && m && d) ? `${y}년 ${m}월 ${d}일` : v; };
  const isDateKey = (k) => /(일자|종료)$/.test(k || '');
  const seg = (parts) => parts.map((part, i) => {
    if (typeof part === 'string') return <React.Fragment key={i}>{part}</React.Fragment>;
    if (isDateKey(part.k)) {
      return readOnly
        ? <span key={i} style={{ padding: '1px 4px', fontSize: '13px' }}>{fmtDateK(doc[part.k])}</span>
        : <input key={i} type="date" value={doc[part.k] || ''} onChange={set(part.k)}
            style={{ width: part.w || '150px', padding: '1px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', fontFamily: 'inherit', background: 'white', verticalAlign: 'middle', boxSizing: 'border-box' }} />;
    }
    return <Field key={i} value={doc[part.k]} onChange={set(part.k)} w={part.w} ph={part.ph} center={part.center} />;
  });

  const handleSave = async () => {
    const payload = { ...doc, docType: doc.docType, ptType: tpl.ptTypeLabel, ...tpl.summary(doc) };
    // onSave 있으면 부모에 위임(완료/실패 알림도 부모가 표시 — 중복 방지), 없으면(새 창) 직접 localStorage 저장
    const id = onSave ? await onSave(payload) : saveContract(payload);
    if (!id) return;
    if (!doc.id) setDoc((p) => ({ ...p, id }));
    if (!onSave) toast.success('계약서가 저장되었습니다.');
  };
  const handlePrint = () => { if (onPrint) { onPrint(); return; } window.print(); };

  // 물건정보 불러오기 — 내 물건목록 조회 후 선택 시 부동산표시 자동입력
  const openPtPicker = async () => {
    setPtPicker(true); setPtLoading(true);
    try {
      const res = await propertyService.getList(null, '', 1, 100, null, null, null, office?.offNo || authUser?.offNo, authUser?.rtNo, null, 'crt_dt', 'DESC');
      setPtList(res?.data?.ptSales || []);
    } catch (e) { setPtList([]); } finally { setPtLoading(false); }
  };
  const selectProperty = (p) => {
    setDoc((prev) => ({
      ...prev,
      소재지: [p.addr1, p.addr2, p.addr3, p.jibun].filter(Boolean).join(' '),
      토지지목: p.landCategory || prev.토지지목 || '',
      토지면적: p.landShare || p.landArea || prev.토지면적 || '',
      대지권종류: prev.대지권종류 || '',
      건물구조: p.buidStruct || prev.건물구조 || '',
      건물용도: p.buildingUse || prev.건물용도 || '',
      건물면적: p.excArea || p.grossArea || prev.건물면적 || '',
    }));
    setPtPicker(false);
    toast.success('물건정보를 불러왔습니다.');
  };

  const heading = (doc.docType || '').replace('(단독)', '').trim();

  const body = (
    <div className={'contract-print' + (readOnly ? ' contract-ro' : '')} style={inline
      ? { position: 'relative', height: '100%', minHeight: 0, background: '#e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
      : { position: 'fixed', inset: 0, zIndex: 1200, background: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
      {/* 인쇄 전용 스타일 */}
      <style>{inline ? `
        @media print {
          body * { visibility: hidden !important; }
          .contract-a4, .contract-a4 * { visibility: visible !important; }
          .contract-a4 { position: absolute; left: 0; top: 0; margin: 0 !important; box-shadow: none !important; width: auto !important; min-height: 0 !important; }
          .contract-actions { display: none !important; }
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
        }
      ` : `
        @media print {
          body > *:not(.contract-print) { display: none !important; }
          .contract-print { position: static !important; overflow: visible !important; background: #fff !important; display: block !important; height: auto !important; }
          .contract-toolbar { display: none !important; }
          .contract-scroll { overflow: visible !important; padding: 0 !important; display: block !important; height: auto !important; }
          .contract-a4 { box-shadow: none !important; width: auto !important; min-height: 0 !important; margin: 0 auto !important; padding: 0 !important; }
          .contract-actions { display: none !important; }
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
        }
      `}</style>
      {/* 계약서 전체: 프리텐다드 폰트 · 숫자 스핀버튼 제거 · 줄 간격 최소화 */}
      <style>{`
        .contract-a4 { font-family: 'Pretendard','Pretendard Variable',-apple-system,BlinkMacSystemFont,'Malgun Gothic','맑은 고딕',sans-serif; }
        .contract-a4 input[type=number]::-webkit-inner-spin-button,
        .contract-a4 input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; -moz-appearance: none; appearance: none; margin: 0; }
        .contract-a4 input[type=number] { -moz-appearance: textfield; appearance: textfield; }
        .contract-a4 table { margin-top: 2px !important; margin-bottom: 0 !important; }
      `}</style>

      {/* 미리보기/인쇄(readOnly): 조항·년월일 굴림 9px, 표 헤더 10px, 줄 여백 최소화 */}
      {readOnly && (
        <style>{`
          .contract-ro .contract-a4,
          .contract-ro .contract-a4 input,
          .contract-ro .contract-a4 span,
          .contract-ro .contract-a4 label,
          .contract-ro .contract-a4 td,
          .contract-ro .contract-a4 p,
          .contract-ro .contract-a4 div:not(.contract-heading) { font-family: '굴림','Gulim','돋움','Dotum','Malgun Gothic',sans-serif !important; }
          .contract-ro .contract-a4 { font-size: 10px !important; line-height: 1.2 !important; }
          .contract-ro .contract-a4 td,
          .contract-ro .contract-a4 input,
          .contract-ro .contract-a4 label,
          .contract-ro .contract-a4 p,
          .contract-ro .contract-a4 span,
          .contract-ro .contract-a4 div:not(.contract-heading) { font-size: 10px !important; line-height: 1.2 !important; }
          .contract-ro .contract-a4 th { font-size: 10px !important; line-height: 1.2 !important; }
          .contract-ro .contract-a4 td, .contract-ro .contract-a4 th { padding-top: 1px !important; padding-bottom: 1px !important; }
          /* 줄/조항 사이 여백 최소화 (제목 제외) */
          .contract-ro .contract-a4 div:not(.contract-heading) { margin-top: 1px !important; margin-bottom: 0 !important; }
          .contract-ro .contract-a4 table { margin-top: 2px !important; margin-bottom: 2px !important; }
        `}</style>
      )}

      {/* 툴바 (인쇄 제외) */}
      <div className="contract-toolbar" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'white', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
            거래신고기준일
            <input type="date" value={doc.거래신고기준일 || ''} onChange={set('거래신고기준일')} readOnly={readOnly}
              style={{ fontSize: '13px', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'inherit', background: 'white' }} />
          </label>
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '16px', fontWeight: 800, color: '#dc2626', whiteSpace: 'nowrap' }}>[{pre ? '가계약' : '본계약'} 편집중]</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* '만단위 적용' 체크박스 제거 → 계약내용 표 우상단 '입력금액단위' 드롭다운으로 통일 */}
          <button onClick={handlePrint} style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, color: '#4f46e5', background: 'white', border: '1px solid #4f46e5', borderRadius: '4px', cursor: 'pointer' }}>미리보기 및 인쇄</button>
          <button onClick={handleSave} style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>저장</button>
          <button onClick={onClose} style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, color: '#374151', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>닫기</button>
        </div>
      </div>

      {/* 물건정보 불러오기 팝업 */}
      {ptPicker && (
        <div onClick={() => setPtPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '640px', maxWidth: '92vw', maxHeight: '80vh', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>물건정보 불러오기</div>
              <button onClick={() => setPtPicker(false)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#111827' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {ptLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#111827', fontSize: '13px' }}>불러오는 중…</div>
              ) : ptList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#111827', fontSize: '13px' }}>등록된 물건이 없습니다.</div>
              ) : (
                ptList.map((p, i) => (
                  <button key={p.ptNo ?? i} type="button" onClick={() => selectProperty(p)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'white', cursor: 'pointer' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{p.ptName || [p.addr1, p.addr2, p.addr3, p.jibun].filter(Boolean).join(' ') || '(주소 없음)'}</div>
                    <div style={{ fontSize: '13px', color: '#111827', marginTop: '2px' }}>{[p.addr1, p.addr2, p.addr3, p.jibun].filter(Boolean).join(' ')}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 지번추가 — 1.부동산 표시 항목 입력 모달 */}
      {jibunModal && (
        <div onClick={() => setJibunModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '560px', maxWidth: '92vw', maxHeight: '85vh', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{jibunModal.index == null ? '지번 추가' : '지번 수정'}</div>
              <button onClick={() => setJibunModal(null)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#111827' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={jmRow}><span style={jmLb}>소재지</span><input value={jibunModal.data.소재지} onChange={(e) => setJD('소재지', e.target.value)} placeholder="소재지 (지번/도로명)" style={jmInp} /></label>
              {!pre && (
                <>
                  <div style={jmTwo}>
                    <label style={jmRow}><span style={jmLb}>지목</span><select value={jibunModal.data.토지지목} onChange={(e) => setJD('토지지목', e.target.value)} style={jmSel}><option value="">선택</option>{LAND_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}</select></label>
                    <label style={jmRow}><span style={jmLb}>대지권종류</span><select value={jibunModal.data.대지권종류} onChange={(e) => setJD('대지권종류', e.target.value)} style={jmSel}><option value="">선택</option>{LANDRIGHT_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}</select></label>
                  </div>
                  <label style={jmRow}><span style={jmLb}>대지권비율</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><input value={jibunModal.data.대지권분모} onChange={(e) => setJD('대지권분모', e.target.value)} placeholder="분모" style={{ ...jmInp, width: '80px', flex: 'none', textAlign: 'center' }} /><span style={{ fontSize: '13px' }}>분의</span><input value={jibunModal.data.대지권분자} onChange={(e) => setJD('대지권분자', e.target.value)} placeholder="분자" style={{ ...jmInp, width: '80px', flex: 'none', textAlign: 'center' }} /></span></label>
                  <label style={jmRow}><span style={jmLb}>토지면적</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><input value={jibunModal.data.토지면적} onChange={(e) => setJD('토지면적', e.target.value)} placeholder="면적" style={{ ...jmInp, width: '60px', flex: 'none', textAlign: 'right' }} />㎡</span></label>
                  <div style={jmTwo}>
                    <label style={jmRow}><span style={jmLb}>건물구조</span><select value={jibunModal.data.건물구조} onChange={(e) => setJD('건물구조', e.target.value)} style={jmSel}><option value="">선택</option>{STRUCT_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}</select></label>
                    <label style={jmRow}><span style={jmLb}>건물면적</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><input value={jibunModal.data.건물면적} onChange={(e) => setJD('건물면적', e.target.value)} placeholder="면적" style={{ ...jmInp, width: '60px', flex: 'none', textAlign: 'right' }} />㎡</span></label>
                  </div>
                  <label style={jmRow}><span style={jmLb}>용도</span><span style={{ display: 'flex', gap: '6px', flex: 1 }}><select value={jibunModal.data.건물용도} onChange={(e) => setJD('건물용도', e.target.value)} style={{ ...jmSel, flex: '0 0 170px' }}><option value="">선택</option>{BUILDING_USE_OPTS.map((u) => (<option key={u} value={u}>{u}</option>))}</select>{jibunModal.data.건물용도 === '직접입력' && <input value={jibunModal.data.건물용도직접} onChange={(e) => setJD('건물용도직접', e.target.value)} placeholder="직접입력" style={jmInp} />}</span></label>
                </>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
              <button type="button" onClick={() => setJibunModal(null)} style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#111827', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={saveJibun} style={{ padding: '7px 18px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '6px', background: '#4f46e5', color: 'white', cursor: 'pointer' }}>{jibunModal.index == null ? '추가' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 문서 영역 — 편집(화면)은 여백 최소·넓게, 미리보기/인쇄(readOnly)만 실제 A4 규격 */}
      <div className="contract-scroll" style={{ flex: 1, overflow: 'auto', padding: readOnly ? '16px' : '10px' }}>
        <div className="contract-a4" style={readOnly
          ? { width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', padding: '8mm 7mm', boxSizing: 'border-box', color: '#111827', pointerEvents: 'none', display: 'flex', flexDirection: 'column' }
          : { width: '100%', maxWidth: '1000px', minHeight: 0, margin: '0 auto', background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.1)', padding: '18px 26px', boxSizing: 'border-box', color: '#111827' }}>
          {/* 제목 */}
          <div className="contract-heading" style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800, letterSpacing: '2px', marginBottom: '8px' }}>{heading}</div>
          <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
            {tpl.intro || `${tpl.parties.map((p) => p.label).join('과(와) ')} 쌍방은 아래 표시 부동산에 관하여 다음 내용과 같이 계약을 체결한다.`}
          </div>

          {(isStandardLease || isKeyMoney || isBunyang || isIpjugwon) ? (
          <>
            {!hideActions && isStandardLease && <div className="contract-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}><button type="button" onClick={openPtPicker} style={pillBtn}>＋ 물건정보 불러오기</button></div>}
            {isIpjugwon
              ? <IpjugwonBody doc={doc} set={set} setDoc={setDoc} readOnly={readOnly} onAddrSearch={openAddr} />
              : isBunyang
                ? <BunyangBody doc={doc} set={set} setDoc={setDoc} readOnly={readOnly} onAddrSearch={openAddr} />
                : isKeyMoney
                  ? <KeyMoneyBody doc={doc} set={set} setDoc={setDoc} readOnly={readOnly} onAddrSearch={openAddr} />
                  : <StandardLeaseBody doc={doc} set={set} setDoc={setDoc} readOnly={readOnly} pre={pre} />}
          </>
          ) : (
          <>
          {/* 1. 부동산의 표시 / 중개대상물의 표시 */}
          <div style={{ ...clauseTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{tpl.propertyHeading || `1. ${tpl.propertyTitle}`}</span>
            {/* 일단 숨김: {!hideActions && <button type="button" className="contract-actions" onClick={() => openJibunModal(null)} style={pillBtn}>＋ 물건 | 지번 추가</button>} */}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
            <tbody>
              <tr>
                <td style={{ ...cellTh, width: '80px' }}><button type="button" onClick={() => { if (!readOnly) openAddr('소재지'); }} title="주소 검색" style={{ display: 'inline-block', width: '68px', border: 'none', background: 'transparent', font: 'inherit', color: readOnly ? 'inherit' : '#4f46e5', textDecoration: readOnly ? 'none' : 'underline', cursor: readOnly ? 'default' : 'pointer', padding: 0 }}>소재지</button></td>
                <td style={cellTd} colSpan={8}><Field value={doc.소재지} onChange={set('소재지')} w="100%" ph="소재지 (지번/도로명)" /></td>
              </tr>
              {/* 권리(시설) 양수·양도: 상호/면적 · 업종/허가신고번호 (토지·건축물 대신) */}
              {!pre && isAssign && (
                <>
                  <tr>
                    <td style={{ ...cellTh, width: '80px' }}>상 호</td>
                    <td style={cellTd} colSpan={5}><Field value={doc.상호} onChange={set('상호')} w="100%" ph="상호" /></td>
                    <td style={{ ...cellTh, width: '60px' }}>면 적</td>
                    <td style={cellTd} colSpan={2}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {readOnly ? <span style={{ fontSize: '13px' }}>{doc.면적 || ''}</span>
                          : <input type="text" value={doc.면적 ?? ''} onChange={set('면적')} placeholder="면적" style={{ ...landBox, width: '70px', textAlign: 'right' }} />}
                        <span style={{ fontSize: '13px' }}>㎡</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...cellTh, width: '80px' }}>업 종</td>
                    <td style={cellTd} colSpan={5}><Field value={doc.업종} onChange={set('업종')} w="100%" ph="업종" /></td>
                    <td style={{ ...cellTh, width: '90px', whiteSpace: 'nowrap' }}>허가신고번호</td>
                    <td style={cellTd} colSpan={2}><Field value={doc.허가신고번호} onChange={set('허가신고번호')} w="100%" ph="허가신고번호" /></td>
                  </tr>
                </>
              )}
              {/* 가계약은 소재지만 표기, 본계약은 토지/건축물 표시 */}
              {!pre && !isAssign && (
                <>
                  {/* 토지 — 지목 / 대지권종류 / 대지권비율 / 대지권의 목적인 토지의 면적 (건축물 행과 같은 표·열) */}
                  <tr>
                    <td style={{ ...cellTh, width: '80px' }}><span style={{ display: 'inline-block', width: '68px' }}>토&nbsp;&nbsp;&nbsp;지</span></td>
                    <td style={{ ...cellTh, width: '46px' }}>지목</td>
                    <td style={cellTd}>
                      <select value={doc.토지지목 ?? ''} onChange={set('토지지목')} style={{ ...landSel, width: '110px' }}>
                        <option value="">선택</option>
                        {LAND_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                      </select>
                    </td>
                    <td style={{ ...cellTh, width: '72px' }}>대지권종류</td>
                    <td style={cellTd}>
                      <select value={doc.대지권종류 ?? ''} onChange={set('대지권종류')} style={{ ...landSel, width: '100px' }}>
                        <option value="">선택</option>
                        {LANDRIGHT_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                      </select>
                    </td>
                    <td style={{ ...cellTh, whiteSpace: 'nowrap' }}>대지권의 목적인 토지의 면적</td>
                    <td style={cellTd}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {readOnly
                          ? <span style={{ fontSize: '13px' }}>{doc.토지면적 || ''}</span>
                          : <input type="text" value={doc.토지면적 ?? ''} onChange={set('토지면적')} placeholder="면적" style={{ ...landBox, width: '60px', textAlign: 'right' }} />}
                        <span style={{ fontSize: '13px' }}>㎡</span>
                      </div>
                    </td>
                    <td style={{ ...cellTh, width: '76px' }}>대지권비율</td>
                    <td style={cellTd}>
                      {readOnly
                        ? <span style={{ fontSize: '13px' }}>{(doc.대지권분모 || doc.대지권분자) ? `${doc.대지권분모 || ''}분의 ${doc.대지권분자 || ''}` : ''}</span>
                        : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                            <input type="text" value={doc.대지권분모 ?? ''} onChange={set('대지권분모')} placeholder="분모" style={{ ...landBox, width: '60px', textAlign: 'center' }} />
                            <span style={{ fontSize: '13px', color: '#111827' }}>분의</span>
                            <input type="text" value={doc.대지권분자 ?? ''} onChange={set('대지권분자')} placeholder="분자" style={{ ...landBox, width: '60px', textAlign: 'center' }} />
                          </span>
                        )}
                    </td>
                  </tr>
                  {/* 건축물 — 구조↔지목 · 용도↔대지권종류 · 면적↔대지권비율 (토지 행과 같은 표·열) */}
                  <tr>
                    <td style={{ ...cellTh, width: '80px' }}><span style={{ display: 'inline-block', width: '68px' }}>건 축 물</span></td>
                    <td style={cellTh}>구조</td>
                    <td style={cellTd}>
                      <select value={doc.건물구조 ?? ''} onChange={set('건물구조')} style={{ ...landSel, width: '110px' }}>
                        <option value="">선택</option>
                        {STRUCT_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                      </select>
                    </td>
                    <td style={cellTh}>용도</td>
                    <td style={cellTd}>
                      {readOnly
                        ? <span style={{ fontSize: '13px' }}>{doc.건물용도 === '직접입력' ? (doc.건물용도직접 || '') : (doc.건물용도 ?? '')}</span>
                        : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select value={doc.건물용도 ?? ''} onChange={set('건물용도')} style={{ ...landSel, width: '100px' }}>
                              <option value="">선택</option>
                              {BUILDING_USE_OPTS.map((u) => (<option key={u} value={u}>{u}</option>))}
                            </select>
                            {doc.건물용도 === '직접입력' && <input type="text" value={doc.건물용도직접 ?? ''} onChange={set('건물용도직접')} placeholder="직접입력" style={{ ...landBox, width: '90px' }} />}
                          </div>
                        )}
                    </td>
                    <td style={cellTh}>면적</td>
                    <td style={cellTd} colSpan={3}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {readOnly
                          ? <span style={{ fontSize: '13px' }}>{doc.건물면적 || ''}</span>
                          : <input type="text" value={doc.건물면적 ?? ''} onChange={set('건물면적')} placeholder="면적" style={{ ...landBox, width: '60px', textAlign: 'right' }} />}
                        <span style={{ fontSize: '13px' }}>㎡</span>
                      </div>
                    </td>
                  </tr>
                  {/* 임대할부분 + 면적 — 매매가 아닌 경우(전세/월세/임대 등)만, 건축물 행 바로 아래. 면적 열은 건축물 면적과 수직 정렬(col6) */}
                  {!isSaleContract && (
                    <tr>
                      <td style={{ ...cellTh, width: '80px', whiteSpace: 'nowrap' }}>임대할부분</td>
                      <td style={cellTd} colSpan={4}><Field value={doc.임대할부분} onChange={set('임대할부분')} w="100%" ph="임대할 부분 (예: 제404호 전부)" /></td>
                      <td style={cellTh}>면적</td>
                      <td style={cellTd} colSpan={3}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {readOnly
                            ? <span style={{ fontSize: '13px' }}>{doc.임대부분면적 || ''}</span>
                            : <input type="text" value={doc.임대부분면적 ?? ''} onChange={set('임대부분면적')} placeholder="면적" style={{ ...landBox, width: '60px', textAlign: 'right' }} />}
                          <span style={{ fontSize: '13px' }}>㎡</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>

          {/* 지번추가로 등록한 추가 부동산 표시 블록 (본 표 바로 아래) */}
          {jibunList.map((jb, i) => (
            <div key={`jblk${i}`} style={{ marginTop: '6px' }}>
              <div className="contract-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>추가 지번 {i + 1}</span>
                {!hideActions && (
                  <span style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={() => openJibunModal(i)} style={pillBtn}>수정</button>
                    <button type="button" onClick={() => removeJibun(i)} style={{ ...pillBtn, color: '#dc2626', borderColor: '#fca5a5' }}>삭제</button>
                  </span>
                )}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                <tr>
                  <td style={{ ...cellTh, width: '80px' }}><button type="button" onClick={() => { if (!readOnly) openAddr('소재지'); }} title="주소 검색" style={{ display: 'inline-block', width: '68px', border: 'none', background: 'transparent', font: 'inherit', color: readOnly ? 'inherit' : '#4f46e5', textDecoration: readOnly ? 'none' : 'underline', cursor: readOnly ? 'default' : 'pointer', padding: 0 }}>소재지</button></td>
                  <td style={cellTd} colSpan={6}>{jb.소재지 || ''}</td>
                </tr>
                {!pre && (
                  <>
                    <tr>
                      <td style={{ ...cellTh, width: '80px' }}><span style={{ display: 'inline-block', width: '68px' }}>토&nbsp;&nbsp;&nbsp;지</span></td>
                      <td style={{ padding: 0, borderRight: '1px solid #334155' }} colSpan={6}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                          <td style={{ ...cellTh, width: '46px', borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>지목</td>
                          <td style={{ ...cellTd, borderTop: 'none', borderBottom: 'none' }}>{jimokLabel(jb.토지지목)}</td>
                          <td style={{ ...cellTh, width: '72px', borderTop: 'none', borderBottom: 'none' }}>대지권종류</td>
                          <td style={{ ...cellTd, borderTop: 'none', borderBottom: 'none' }}>{jb.대지권종류 || ''}</td>
                          <td style={{ ...cellTh, width: '76px', borderTop: 'none', borderBottom: 'none' }}>대지권비율</td>
                          <td style={{ ...cellTd, borderTop: 'none', borderBottom: 'none' }}>{(jb.대지권분모 || jb.대지권분자) ? `${jb.대지권분모 || ''}분의 ${jb.대지권분자 || ''}` : ''}</td>
                          <td style={{ ...cellTh, whiteSpace: 'nowrap', borderTop: 'none', borderBottom: 'none' }}>대지권의 목적인 토지의 면적</td>
                          <td style={{ ...cellTd, borderTop: 'none', borderBottom: 'none', borderRight: 'none' }}>{jb.토지면적 ? `${jb.토지면적} ㎡` : ''}</td>
                        </tr></tbody></table>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...cellTh, width: '80px' }}><span style={{ display: 'inline-block', width: '68px' }}>건 축 물</span></td>
                      <td style={{ ...cellTh, width: '52px' }}>구조</td>
                      <td style={{ ...cellTd, width: '31%' }}>{jb.건물구조 || ''}</td>
                      <td style={{ ...cellTh, width: '52px' }}>용도</td>
                      <td style={{ ...cellTd, width: '31%' }}>{useLabel(jb)}</td>
                      <td style={{ ...cellTh, width: '52px' }}>면적</td>
                      <td style={{ ...cellTd, width: '31%' }}>{jb.건물면적 ? `${jb.건물면적} ㎡` : ''}</td>
                    </tr>
                  </>
                )}
              </tbody></table>
            </div>
          ))}

          {/* 2. 계약내용 */}
          <div style={{ ...clauseTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>2. 계약내용</span>
          </div>
          {/* 조항 line (만단위 적용은 툴바 저장 버튼 좌측 공통 위치로 이동) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
            <div style={clauseHang}>{tpl.objective}</div>
          </div>
          {/* 추가 버튼: 표 바로 좌측 위(3. 당사자 섹션과 동일 배치) */}
          {!readOnly && !hideActions && (() => {
            const hasDeposit = (tpl.amountRows || []).some((r) => r.label === '계약금');
            const hasMid = (tpl.amountRows || []).some((r) => r.label === '중도금');
            const { showBtn: showLoanBtn } = loanInfo(tpl, doc);
            return (
              <div className="contract-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap', margin: '8px 0 4px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {showLoanBtn && <button type="button" onClick={() => setDoc((p) => ({ ...p, _융자금표시: true, _loans: [...getLoans(tpl, p), { amt: '', 승계: LOAN_TERMS[0], 라벨: '융자금' }] }))} style={pillBtn}>＋ 융자금 추가</button>}
                  {hasDeposit && <button type="button" onClick={() => setDoc((p) => ({ ...p, _deposits: [...(Array.isArray(p._deposits) && p._deposits.length ? p._deposits : [{ amt: '', 영수자: '' }]), { amt: '', 영수자: '' }] }))} style={pillBtn}>＋ 계약금 추가</button>}
                  {hasMid && <button type="button" onClick={() => setDoc((p) => ({ ...p, _mids: [...(Array.isArray(p._mids) && p._mids.length ? p._mids : [{ amt: '', date: '' }]), { amt: '', date: '' }] }))} style={pillBtn}>＋ 중도금 추가</button>}
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                  (입력금액단위 :
                  <select value={doc._금액단위 || (doc.man === false ? '원' : '만원')} onChange={(e) => setDoc((p) => {
                    const newUnit = e.target.value;
                    const oldUnit = p._금액단위 || (p.man === false ? '원' : '만원');
                    if (newUnit === oldUnit) return { ...p, _금액단위: newUnit };
                    const factor = (oldUnit === '만원' && newUnit === '원') ? 10000 : (oldUnit === '원' && newUnit === '만원') ? 1 / 10000 : 1;
                    const conv = (v) => { const d = String(v ?? '').replace(/[^0-9.]/g, ''); if (!d) return v; const n = Number(d); if (isNaN(n)) return v; const r = n * factor; return String(Number.isInteger(r) ? r : Number(r.toFixed(6))); };
                    const next = { ...p, _금액단위: newUnit };
                    // 템플릿 금액 키 변환(계약금·중도금·융자금은 동적 리스트로 별도 처리)
                    const amtKeys = new Set();
                    (tpl.amountRows || []).forEach((row) => {
                      if (row.label === '계약금' || row.label === '중도금' || row.label === '융자금') return;
                      (row.text || []).forEach((part) => { if (part && typeof part === 'object' && part.k && !/(일자|지급일|개월|종료)$/.test(part.k)) amtKeys.add(part.k); });
                    });
                    amtKeys.forEach((k) => { if (next[k] != null && next[k] !== '') next[k] = conv(next[k]); });
                    if (Array.isArray(p._deposits)) next._deposits = p._deposits.map((d) => (typeof d === 'string' ? conv(d) : { ...d, amt: conv(d.amt) }));
                    if (Array.isArray(p._mids)) next._mids = p._mids.map((m) => ({ ...m, amt: conv(m.amt) }));
                    if (Array.isArray(p._loans)) next._loans = p._loans.map((l) => ({ ...l, amt: conv(l.amt) }));
                    return next;
                  })} style={{ fontSize: '13px', fontWeight: 700, padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '3px', fontFamily: 'inherit', cursor: 'pointer', color: '#111827' }}>
                    <option value="만원">만원</option>
                    <option value="원">원</option>
                  </select>
                  )
                </span>
              </div>
            );
          })()}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
            <tbody>
              {(() => {
                // 작성화면 공통 본문 폰트(13px) — 금액/만원/날짜 등 helper 라벨 포함(미리보기·인쇄엔 미사용)
                const lbl = { fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' };
                const payLbl = lbl;                                          // '원정은 ~ 일에 지급한다' 문구도 동일 규칙(13px)
                const payTh = { ...cellTh, width: '80px' }; // 금액행 라벨(매매대금/융자금/중도금/잔금 등) — 13px 공통
                const hanStyle = { fontSize: '13px', fontWeight: 700, color: '#4f46e5', whiteSpace: 'nowrap' };
                const inp = { padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', boxSizing: 'border-box' };
                // 좌측 여백(A4 밖)에 세로로 붙이는 행 삭제 버튼 (당사자 삭제 버튼과 통일) — 추가 버튼은 표 우상단 버튼행으로 이동
                const delBtnL = { padding: '3px 12px', fontSize: '13px', fontWeight: 600, border: '1px solid #fca5a5', borderRadius: '4px', background: 'white', color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap' };
                const gutterBtns = (children) => <span className="contract-actions" style={{ position: 'absolute', left: '-56px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '3px' }}>{children}</span>;
                const miscLabel = (k) => (k.endsWith('지급일') ? '지급일' : k.endsWith('개월') ? '개월' : k.endsWith('종료') ? '종료일' : '');
                // 계약금/중도금은 동적 리스트로 관리(추가/삭제 자유). 기본 각 1줄
                // 계약금 항목: { amt, 영수자 }. 기존 문자열(금액만) 데이터는 객체로 승계
                const deposits = (doc._deposits ?? [{ amt: '', 영수자: '' }]).map((d) => (typeof d === 'string' ? { amt: d, 영수자: '' } : (d || { amt: '', 영수자: '' })));
                const mids = doc._mids ?? [{ amt: '', date: '' }];
                const loans = getLoans(tpl, doc);
                const setDeposits = (arr) => setDoc((p) => ({ ...p, _deposits: arr }));
                const setMids = (arr) => setDoc((p) => ({ ...p, _mids: arr }));
                const setLoans = (arr) => setDoc((p) => ({ ...p, _loans: arr }));
                const depositTpl = tpl.amountRows.find((r) => r.label === '계약금');
                const midTpl = tpl.amountRows.find((r) => r.label === '중도금');
                // 미리보기/인쇄용: 템플릿 문구에 값만 끼워 정적 텍스트로
                const valFieldStyle = { display: 'inline-block', minWidth: '80px', padding: '1px 4px', fontSize: '13px' };
                // 미리보기/인쇄 값 슬롯: 값이 있을 때만 밑줄, 없으면 밑줄 없이 비워둠
                const valSpan = (val, mw = '80px') => (
                  <span style={val ? { ...valFieldStyle, minWidth: mw } : { display: 'inline-block', minWidth: mw, padding: '1px 4px', fontSize: '13px' }}>{val || ''}</span>
                );
                const segStatic = (textArr, getVal) => (textArr || []).map((part, i) => (typeof part === 'string'
                  ? <React.Fragment key={i}>{part}</React.Fragment>
                  : <React.Fragment key={i}>{valSpan(getVal(part) || '', (part.w && String(part.w).endsWith('px')) ? part.w : '80px')}</React.Fragment>));
                // 입력금액단위: 표 우상단 드롭다운(_금액단위)로 결정 — 글로벌 만단위(doc.man) 무시
                const man = (doc._금액단위 || (doc.man === false ? '원' : '만원')) !== '원';
                const toWon = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.]/g, '')); if (!n || isNaN(n)) return 0; return man ? n * 10000 : n; };
                const wonComma = (v) => { const w = toWon(v); return w ? w.toLocaleString() : ''; };
                // 금액 입력 공통 리드: [일금] [금액입력 300px(포커스=숫자 / 해제=한글표기)] [단위(만원/원)] — 이후 각 행별 '원정…' 문구가 붙음
                // 단위 표기는 우상단 입력금액단위 드롭다운(man)에 따라 자동 반영
                const amtLead = (val, onChange, ph) => (
                  <>
                    <span style={lbl}>일금</span>
                    <AmountInput value={val} onChange={onChange} man={man} placeholder={ph} style={{ ...inp, width: '300px', textAlign: 'right' }} />
                  </>
                );
                // 미리보기/인쇄: 금액은 무조건 원단위(한글 슬롯=원 기준 한글, 숫자 슬롯=원 콤마)
                const segAmount = (parts) => (parts || []).map((part, i) => {
                  if (typeof part === 'string') return <React.Fragment key={i}>{part}</React.Fragment>;
                  const k = part.k;
                  const mw = (part.w && String(part.w).endsWith('px')) ? part.w : '80px';
                  let text = '';
                  if (k.endsWith('일자') || k.endsWith('지급일') || k.endsWith('개월') || k.endsWith('종료')) {
                    text = doc[k] || '';
                  } else {
                    const isHan = k.endsWith('한글');
                    const raw = isHan ? (doc[k.slice(0, -2)] ?? doc[k]) : doc[k];
                    text = isHan ? (toWon(raw) ? hangulAmount(toWon(raw)) : '') : wonComma(raw);
                  }
                  // 값이 있으면 밑줄 표시, 없으면 밑줄 없이 비워둠
                  const style = text
                    ? { ...valFieldStyle, minWidth: mw }
                    : { display: 'inline-block', minWidth: mw, padding: '1px 4px', fontSize: '13px' };
                  return <span key={i} style={style}>{text}</span>;
                });

                // 부동산 계약서: 템플릿에 융자금 행이 없어도 '융자금 추가' 시 매매대금/보증금 아래에 융자금 행 주입
                const baseRows = tpl.amountRows || [];
                const { hasRow: hasLoanRow, eligible: loanEligible } = loanInfo(tpl, doc);
                // 템플릿에 융자금 행이 없는 계약(전세·월세)도 융자금이 1건 이상 있으면 매매대금/보증금 아래에 주입
                const amountRows = (!hasLoanRow && loanEligible && loans.length > 0)
                  ? [baseRows[0], LOAN_ROW, ...baseRows.slice(1)]
                  : baseRows;
                const rows = [];
                let depDone = false, midDone = false, loanDone = false;
                amountRows.forEach((row, ri) => {
                  // ── 융자금(동적 리스트) ──
                  if (row.label === '융자금') {
                    if (loanDone) return; loanDone = true;
                    loans.forEach((ln, li) => {
                      rows.push(
                        <tr key={`loan${li}`}>
                          <td style={{ ...payTh, position: 'relative' }}>
                            {readOnly
                              ? (ln.라벨 || '융자금')
                              : <select value={ln.라벨 || '융자금'} onChange={(e) => setLoans(loans.map((x, j) => (j === li ? { ...x, 라벨: e.target.value } : x)))} style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#111827', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', width: '68px', maxWidth: '68px', boxSizing: 'border-box' }}><option value="융자금">융자금</option><option value="현임대보증금">현임대보증금</option></select>}
                            {!readOnly && gutterBtns(<button type="button" onClick={() => setLoans(loans.filter((_, j) => j !== li))} style={delBtnL}>삭제</button>)}
                          </td>
                          <td style={cellTd} colSpan={5}>
                            {readOnly ? (
                              <span>金 {valSpan(ln.amt ? hangulAmount(toWon(ln.amt)) : '')} 원정은 {ln.승계 || LOAN_TERMS[0]}</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                                {amtLead(ln.amt, (e) => setLoans(loans.map((x, j) => (j === li ? { ...x, amt: e.target.value } : x))))}
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={payLbl}>원정은</span>
                                  <select value={ln.승계 || LOAN_TERMS[0]} onChange={(e) => setLoans(loans.map((x, j) => (j === li ? { ...x, 승계: e.target.value } : x)))} style={{ ...inp, cursor: 'pointer' }}>
                                    {LOAN_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    });
                    return;
                  }
                  // ── 계약금(동적 리스트) ──
                  if (row.label === '계약금') {
                    if (depDone) return; depDone = true;
                    deposits.forEach((d, di) => {
                      rows.push(
                        <tr key={`dep${di}`}>
                          <td style={{ ...payTh, position: 'relative' }}>계약금
                            {!readOnly && di > 0 && gutterBtns(<button type="button" onClick={() => setDeposits(deposits.filter((_, j) => j !== di))} style={delBtnL}>삭제</button>)}
                          </td>
                          <td style={cellTd} colSpan={5}>
                            {readOnly ? (
                              <span>{segStatic(depositTpl?.text, (part) => (part.k.endsWith('한글') ? hangulAmount(toWon(d.amt)) : wonComma(d.amt)))}{d.영수자 ? <>&nbsp;영수자 {d.영수자} (인)</> : null}</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                                {amtLead(d.amt, (e) => setDeposits(deposits.map((x, j) => (j === di ? { ...x, amt: e.target.value } : x))))}
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={payLbl}>원정은 계약시에 지급하고 영수함. 영수자</span>
                                  <input type="text" value={d.영수자 || ''} onChange={(e) => setDeposits(deposits.map((x, j) => (j === di ? { ...x, 영수자: e.target.value } : x)))} placeholder="자필서명" style={{ ...inp, width: '120px' }} />
                                  <span style={payLbl}>(인)</span>
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    });
                    return;
                  }
                  // ── 중도금(동적 리스트) ──
                  if (row.label === '중도금') {
                    if (midDone) return; midDone = true;
                    mids.forEach((m, mi) => {
                      rows.push(
                        <tr key={`mid${mi}`}>
                          <td style={{ ...payTh, position: 'relative' }}>중도금
                            {!readOnly && mi > 0 && gutterBtns(<button type="button" onClick={() => setMids(mids.filter((_, j) => j !== mi))} style={delBtnL}>삭제</button>)}
                          </td>
                          <td style={cellTd} colSpan={5}>
                            {readOnly ? segStatic(midTpl?.text, (part) => (part.k.endsWith('일자') ? m.date : (part.k.endsWith('한글') ? hangulAmount(toWon(m.amt)) : wonComma(m.amt)))) : (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                                {amtLead(m.amt, (e) => setMids(mids.map((x, j) => (j === mi ? { ...x, amt: e.target.value } : x))))}
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={payLbl}>원정은</span>
                                  <input type="date" value={m.date} onChange={(e) => setMids(mids.map((x, j) => (j === mi ? { ...x, date: e.target.value } : x)))} style={inp} />
                                  <span style={payLbl}>일에 지급한다.</span>
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    });
                    return;
                  }
                  // ── 그 외 금액 행(매매대금/보증금/융자금/잔금/차임 등) ──
                  // 차임(월세) 행에는 우측 끝에 VAT(부가세 별도/포함) 표기
                  const isRent = typeof row.label === 'string' && row.label.startsWith('차임');
                  if (readOnly) {
                    rows.push(
                      <tr key={ri}>
                        <td style={payTh}>{row.label === '융자금' ? (doc.융자금라벨 || '융자금') : row.label}</td>
                        <td style={cellTd} colSpan={5}>
                          {row.label === '융자금' ? (
                            segAmount(['金 ', { k: '융자금한글', w: '48%' }, ` 원정은 ${doc.융자금승계 || LOAN_TERMS[0]}`])
                          ) : isRent ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{segAmount(row.text)}</span>
                              <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap', fontWeight: 600 }}>부가세 {doc.월세부가세 || '별도'}</span>
                            </div>
                          ) : segAmount(row.text)}
                        </td>
                      </tr>
                    );
                    return;
                  }
                  const fields = row.text.filter((p) => p && typeof p === 'object');
                  const dateFields = fields.filter((f) => f.k.endsWith('일자'));
                  const miscFields = fields.filter((f) => !f.k.endsWith('일자') && (f.k.endsWith('지급일') || f.k.endsWith('개월') || f.k.endsWith('종료')));
                  const amountFields = fields.filter((f) => !dateFields.includes(f) && !miscFields.includes(f));
                  const amountVal = amountFields.length ? (doc[amountFields[0].k] ?? '') : '';
                  const setAmount = (v) => setDoc((p) => { const n = { ...p }; amountFields.forEach((f) => { n[f.k] = v; }); return n; });
                  rows.push(
                    <tr key={ri}>
                      <td style={payTh}>{row.label}</td>
                      <td style={cellTd} colSpan={5}>
                        {(amountFields.length > 0 && dateFields.length > 0 && !isRent) ? (
                          // 잔금 등 '지급일이 있는' 금액 행: 금액 뒤에 "원정은 [날짜]일에 지급한다." 형식
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                            {amtLead(amountVal, (e) => setAmount(e.target.value))}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={payLbl}>원정은</span>
                              <input type="date" value={doc[dateFields[0].k] || ''} onChange={set(dateFields[0].k)} style={inp} />
                              <span style={payLbl}>일에 지급한다.</span>
                            </span>
                          </div>
                        ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                          {amountFields.length > 0 && amtLead(amountVal, (e) => setAmount(e.target.value))}
                          {amountFields.length > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={payLbl}>원정</span>
                              <span style={hanStyle}>(₩ {wonComma(amountVal) ? `${wonComma(amountVal)}원` : '-'})</span>
                            </span>
                          )}
                          {dateFields.map((f, fi) => (
                            <span key={f.k} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: fi === 0 ? 'auto' : undefined }}>
                              <span style={lbl}>날짜</span>
                              <input type="date" value={doc[f.k] || ''} onChange={set(f.k)} style={inp} />
                            </span>
                          ))}
                          {miscFields.map((f) => (
                            <span key={f.k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={lbl}>{miscLabel(f.k)}</span>
                              <input type="text" value={doc[f.k] || ''} onChange={set(f.k)} style={{ ...inp, width: '72px' }} />
                            </span>
                          ))}
                          {isRent && (
                            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={lbl}>부가세</span>
                              {['별도', '포함'].map((v) => (
                                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '13px', cursor: 'pointer' }}>
                                  <input type="radio" checked={(doc.월세부가세 || '별도') === v} onChange={() => setDoc((p) => ({ ...p, 월세부가세: v }))} />{v}
                                </label>
                              ))}
                            </span>
                          )}
                        </div>
                        )}
                      </td>
                    </tr>
                  );
                });
                // 권리(시설) 양수·양도: 잔금 아래 '양도범위(시설물 등)' 행 추가
                if (isAssign) {
                  rows.push(
                    <tr key="assign-scope">
                      <td style={{ ...payTh, whiteSpace: 'normal', lineHeight: 1.2 }}>양도범위<br />(시설물 등)</td>
                      <td style={cellTd} colSpan={5}>
                        {readOnly
                          ? <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, minHeight: '40px' }}>{doc.양도범위 || ''}</div>
                          : <textarea value={doc.양도범위 || ''} onChange={set('양도범위')} rows={4} placeholder="양도범위(시설물 등)"
                              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '6px 8px', fontSize: '13px', fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }} />}
                      </td>
                    </tr>
                  );
                }
                return rows;
              })()}
            </tbody>
          </table>
          </>
          )}

          {/* 조항 (제2조부터 자동 번호) — 조항 표시 체크 시에만 */}
          {showClauses && tpl.clauses.map((c, ci) => (
            <div key={ci} style={clauseHang}>
              <b>제{ci + 2}조 </b>
              {typeof c === 'string' ? c : seg(c)}
            </div>
          ))}

          {/* 권리(시설) 양수·양도: 3. 양도·양수할 대상 물건의 임대차 계약내용 (특약 위) */}
          {isAssign && (() => {
            // 계약내용 금액 규칙과 동일: 일금 [숫자입력(포커스 해제 시 한글)] 원정 — 우상단 입력금액단위(man) 반영
            const manU = (doc._금액단위 || (doc.man === false ? '원' : '만원')) !== '원';
            const assignAmt = (k) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>일금</span>
                {readOnly
                  ? <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: '13px' }}>{(() => { const n = Number(String(doc[k] || '').replace(/[^0-9.]/g, '')) || 0; const w = manU ? n * 10000 : n; return w ? hangulAmount(w) : ''; })()}</span>
                  : <AmountInput value={doc[k]} onChange={set(k)} man={manU} placeholder="숫자 입력" style={{ ...landBox, width: '180px', textAlign: 'right' }} />}
                <span style={{ fontSize: '13px' }}>원정</span>
              </span>
            );
            return (
              <div style={{ marginTop: '14px' }}>
                <div style={clauseTitle}>3. 양도·양수할 대상 물건의 임대차 계약내용</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}><tbody>
                  <tr>
                    <td style={{ ...cellTh, width: '90px' }} rowSpan={2}>임대인<br />인적사항</td>
                    <td style={{ ...cellTh, width: '70px' }}>성명</td>
                    <td style={cellTd} colSpan={3}><Field value={doc.임대인_성명} onChange={set('임대인_성명')} w="100%" /></td>
                    <td style={{ ...cellTh, width: '70px' }}>연락처</td>
                    <td style={cellTd}><Field value={doc.임대인_연락처} onChange={set('임대인_연락처')} w="100%" /></td>
                  </tr>
                  <tr>
                    <td style={cellTh}>주소</td>
                    <td style={cellTd} colSpan={5}><Field value={doc.임대인_주소} onChange={set('임대인_주소')} w="100%" /></td>
                  </tr>
                  <tr>
                    <td style={{ ...cellTh, width: '90px' }} rowSpan={2}>임대차관계</td>
                    <td style={cellTh}>임차보증금</td>
                    <td style={cellTd} colSpan={3}>{assignAmt('임차보증금')}</td>
                    <td style={cellTh}>월차임</td>
                    <td style={cellTd}>{assignAmt('월차임')}</td>
                  </tr>
                  <tr>
                    <td style={cellTh}>계약기간</td>
                    <td style={cellTd} colSpan={5}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '13px' }}>
                        <input type="date" value={doc.임대차시작일 || ''} onChange={set('임대차시작일')} style={{ ...landBox }} />
                        <span>부터</span>
                        <input type="date" value={doc.임대차종료일 || ''} onChange={set('임대차종료일')} style={{ ...landBox }} />
                        <span>까지 (</span>
                        <input type="text" value={doc.임대차개월 ?? ''} onChange={set('임대차개월')} style={{ ...landBox, width: '54px', textAlign: 'center' }} />
                        <span>개월 )</span>
                      </div>
                    </td>
                  </tr>
                </tbody></table>
              </div>
            );
          })()}

          {/* 특약사항 (별지로 작성 체크 시 미리보기/인쇄에서 별도 페이지로 분리) — 미리보기: 남는 공간을 채워 거래당사자를 하단에 고정 */}
          <div className="contract-special" style={readOnly ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } : undefined}>
            <div style={{ ...clauseTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>특약사항</span>
                <button type="button" className="contract-actions" onClick={openSpecialManager} style={pillBtn}>특약사항관리</button>
              </div>
              <div className="contract-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" className="contract-special-toggle" checked={doc._특약별지 === true} onChange={(e) => setDoc((p) => ({ ...p, _특약별지: e.target.checked }))} /> 별지로 작성
                </label>
              </div>
            </div>
            {readOnly ? (
              // 미리보기/인쇄: 내용 입력부임을 알 수 있게 사각형 테두리 박스(내용 없어도 표시, 남는 공간 채움)
              <div style={{ width: '100%', flex: 1, minHeight: '120px', border: '1px solid #334155', boxSizing: 'border-box', padding: '6px', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '4px' }}>
                {doc.특약사항 ?? ''}
              </div>
            ) : (
              <textarea value={doc.특약사항 ?? ''} onChange={set('특약사항')} rows={8}
                style={{ width: '100%', minHeight: '160px', border: '1px solid #334155', outline: 'none', fontSize: '13px', padding: '6px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', marginTop: '4px' }} />
            )}
            {/* 특약관리 — 웹(비Electron) 폴백: 인페이지 모달 */}
            {showSpecialMgr && !readOnly && (
              <SpecialClauseManager onClose={() => setShowSpecialMgr(false)} onApply={appendSpecial} />
            )}
          </div>

          {/* 계약일자 */}
          <div style={{ textAlign: 'center', fontSize: '13px', margin: '12px 0 8px' }}>
            본 계약을 증명하기 위하여 계약 당사자가 이의 없음을 확인하고 각자 서명·날인한다. &nbsp;&nbsp; 계약일자 <input type="date" value={doc.계약일자 || ''} onChange={set('계약일자')} readOnly={readOnly} style={{ fontSize: '13px', padding: '2px 6px', border: '1px solid #94a3b8', borderRadius: '3px', fontFamily: 'inherit', background: 'transparent' }} />
          </div>

          {/* 거래당사자 및 개업공인중개사 (양수·양도는 4, 그 외 3) */}
          <div style={{ ...clauseTitle, marginTop: '16px' }}>{isAssign ? '4' : '3'}. 거래당사자 및 개업공인중개사</div>
          {(() => {
            const sign = signCfg;
            const F = (k, ph) => <Field value={doc[k]} onChange={set(k)} w="100%" ph={ph} />;
            const pLabel = { ...cellTh, background: '#f8fafc', width: '80px', color: '#111827' };
            const sLabel = { ...cellTh, background: '#f8fafc', color: '#111827', fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.3 };
            // 신분증 번호 유형 셀 — 편집: 드롭다운 / 미리보기·인쇄: 선택값 텍스트
            const idSel = (kbase) => {
              const k = `${kbase}_주민번호유형`;
              const val = doc[k] ?? '주민등록번호';
              if (readOnly) return val;
              return (
                <select value={val} onChange={set(k)} style={{ ...selStyle, fontWeight: 700, textAlign: 'center', color: '#111827' }}>
                  {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              );
            };
            const blocks = [];
            // 상단 버튼 행(유지): 진위확인 / 당사자·공동중개사 추가
            if (!hideActions) blocks.push(
              <div key="__ptoolbar" className="contract-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap', margin: '8px 0 4px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {partyP0 && <button type="button" onClick={() => addParty(partyP0.label)} style={pillBtn}>＋ {partyP0.label} 추가</button>}
                  {partyP1 && <button type="button" onClick={() => addParty(partyP1.label)} style={pillBtn}>＋ {partyP1.label} 추가</button>}
                  {sign.broker !== 'none' && <button type="button" onClick={addBroker} style={pillBtn}>＋ 공동중개사 추가</button>}
                </div>
                {/* 진위확인 2버튼: 우측 끝으로 */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { const url = 'https://www.gov.kr/main?a=AA090UserJuminIsCertApp&img=031'; if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url); else window.open(url, '_blank', 'noopener'); }} style={pillBtn}>주민등록증 진위확인</button>
                  <button type="button" onClick={() => { const url = 'https://www.safedriving.or.kr/loginManage/anyidAuthLogin.do?tx=20260904144947415_5000000364_33520041-a4f4-4da7-b02d-21cbb6ff75c5&acrValues=2'; if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url); else window.open(url, '_blank', 'noopener'); }} style={pillBtn}>운전면허증 진위확인</button>
                </div>
              </div>,
            );
            // 삭제 버튼 공통 스타일(표 왼쪽 바깥)
            const delBtnStyle = { position: 'absolute', left: '-50px', top: '2px', padding: '3px 12px', fontSize: '13px', fontWeight: 600, color: '#dc2626', background: 'white', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' };
            // 당사자 — 모든 당사자를 하나의 표(partyRows)에 넣어 틈 없이 밀착(별도 표 사이 간격 제거)
            const partyRows = [];
            const renderParty = (label, role, isExtra, onRemove) => {
              const chosen = isExtra ? (doc[`_addlabel_${role}`] ?? '대리인') : label;
              if (readOnly && isExtra && chosen === '없음') return;          // 미리보기·인쇄: '없음'이면 제외
              const blank = isExtra && chosen === '출력후수기입력';          // 미리보기·인쇄: 값 칸 빈칸
              const bv = (k) => (readOnly && blank ? '' : doc[k]);
              const BF = (k, ph) => <Field value={bv(k)} onChange={set(k)} w="100%" ph={readOnly && blank ? '' : ph} />;
              const labelCell = (isExtra && !readOnly)
                ? <select value={chosen} onChange={set(`_addlabel_${role}`)} style={{ ...selStyle, fontWeight: 700, textAlign: 'center', color: '#111827' }}>{DAERI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                : (isExtra ? (blank ? '' : chosen) : label);
              partyRows.push(
                <tr key={`${role}_r1`}>
                  <td style={{ ...pLabel, position: 'relative' }} rowSpan={2}>
                    {!hideActions && isExtra && <button type="button" className="contract-actions" onClick={onRemove} style={delBtnStyle}>삭제</button>}
                    {labelCell}
                  </td>
                  <td style={{ ...sLabel, width: '110px' }}>주소</td>
                  <td style={cellTd} colSpan={5}>{BF(`${role}_주소`, '주소')}</td>
                  <td style={cellSeal} rowSpan={2}>(인)</td>
                </tr>,
                <tr key={`${role}_r2`}>
                  <td style={{ ...sLabel, width: '110px', padding: '2px 4px' }}>{idSel(role)}</td>
                  <td style={cellTd}>{BF(`${role}_주민번호`)}</td>
                  <td style={{ ...sLabel, width: '56px' }}>연락처</td>
                  <td style={cellTd}>{BF(`${role}_전화`)}</td>
                  <td style={{ ...sLabel, width: '48px' }}>이름</td>
                  <td style={cellTd}>{BF(`${role}_성명`)}</td>
                </tr>,
              );
            };
            // 기본 당사자 + 추가 당사자(라벨 그룹별로 이어서 배치)
            const added = doc._addParties || [];
            sign.parties.forEach((p) => {
              renderParty(p.label, p.role, false);
              added.filter((a) => a.label === p.label).forEach((a) => renderParty(a.label, `${a.label}#${a.id}`, true, () => removeParty(a.id)));
            });
            if (partyRows.length) blocks.push(
              <table key="__parties" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}><tbody>{partyRows}</tbody></table>,
            );
            // 개업공인중개사(기본 + 공동중개사 추가) — 하나의 표(brokerRows)로 밀착
            const brokerRows = [];
            const baseBn = sign.broker === 'none' ? 0 : (sign.brokerCount || 1);
            const bn = baseBn + (sign.broker === 'none' ? 0 : (doc._공동중개사수 || 0));
            for (let bi = 0; bi < bn; bi++) {
              const isExtraBroker = bi >= baseBn;
              const pf = bi === 0 ? '중개' : `중개${bi + 1}`;
              const label = sign.broker === 'exclusive' ? '중개업자(乙)' : <>개업<br />공인중개사</>;
              // 유형별 필드 키
              const nameKey = sign.broker === 'gaeup' ? `${pf}상호` : (sign.broker === 'std' ? `${pf}사무소명칭` : '중개상호');
              const addrKey = sign.broker === 'exclusive' ? '중개사무소소재지' : `${pf}사무소소재지`;
              const regKey = sign.broker === 'exclusive' ? '중개등록번호' : `${pf}등록번호`;
              const repKey = sign.broker === 'exclusive' ? '중개대표' : `${pf}대표`;
              const telKey = sign.broker === 'exclusive' ? '중개전화' : `${pf}전화`;
              const hasSosok = sign.broker === 'gaeup';
              // 라벨 셀: 라벨 + 돋보기(중개사 조회) 버튼 — 클릭 시 이 행 대상 조회 팝업
              const brokerLabelCell = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span style={{ textAlign: 'center' }}>{label}</span>
                  {!hideActions && (
                    <button type="button" className="contract-actions" title="중개사 조회" onClick={() => setBrokerSearch(bi)}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', padding: 0, border: '1px solid #c7d2fe', borderRadius: '5px', background: 'white', color: '#4f46e5', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </button>
                  )}
                </div>
              );
              brokerRows.push(
                <tr key={`br${bi}_r1`}>
                  <td style={{ ...pLabel, position: 'relative' }} rowSpan={3}>
                    {!hideActions && isExtraBroker && <button type="button" className="contract-actions" onClick={removeBroker} style={delBtnStyle}>삭제</button>}
                    {brokerLabelCell}
                  </td>
                  <td style={{ ...sLabel, width: '110px' }}>사무소 소재지</td>
                  <td style={cellTd} colSpan={5}>{F(addrKey)}</td>
                </tr>,
                <tr key={`br${bi}_r2`}>
                  <td style={sLabel}>사무소 명칭</td>
                  <td style={cellTd} colSpan={3}>{F(nameKey)}</td>
                  <td style={{ ...sLabel, width: '48px' }}>대표</td>
                  <td style={cellTd}>{F(repKey)}</td>
                </tr>,
                <tr key={`br${bi}_r3`}>
                  <td style={sLabel}>등록번호</td>
                  <td style={cellTd}>{F(regKey)}</td>
                  <td style={{ ...sLabel, width: '64px' }}>전화번호</td>
                  <td style={cellTd}>{F(telKey)}</td>
                  <td style={{ ...sLabel, width: '92px', whiteSpace: 'nowrap' }}>{hasSosok ? '소속 중개사' : ''}</td>
                  <td style={cellTd}>{hasSosok ? F(`${pf}소속`) : ''}</td>
                </tr>,
              );
            }
            if (brokerRows.length) blocks.push(
              <table key="__brokers" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}><tbody>{brokerRows}</tbody></table>,
            );
            return blocks;
          })()}
        </div>
      </div>
    </div>
  );

  const rendered = inline ? body : ReactDOM.createPortal(body, document.body);
  return (
    <>
      {rendered}
      {brokerSearch !== null && (
        <BrokerSearchModal
          onClose={() => setBrokerSearch(null)}
          onSelect={onSelectBroker}
        />
      )}
      {showAddr && (
        <DaumAddressModal
          onClose={() => setShowAddr(false)}
          onComplete={(d) => setDoc((p) => ({ ...p, [addrTargetKey]: d.roadAddress || d.jibunAddress || p[addrTargetKey] || '' }))}
        />
      )}
    </>
  );
}

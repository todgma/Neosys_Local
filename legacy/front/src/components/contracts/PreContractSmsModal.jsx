import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SpecialClauseManager from './SpecialClauseManager';
import addressService from '../../services/common/addressService';
import { hangulAmount } from '../../utils/hangulAmount';

/**
 * 가계약 문자 모달 — 매도인/매수인에게 보낼 가계약 합의문(문자) 작성/복사.
 *  참고 이미지 레이아웃 재현. 문자전송/저장/이미지저장 등 외부 연동은 추후.
 */
const PT_TYPES = ['아파트', '오피스텔', '단독주택', '상가주택', '다가구주택', '상가', '사무실', '공장', '창고', '지식산업센터', '건물', '토지', '아파트분양권', '오피스텔분양권', '입주권', '상가권리금', '권리양수도'];
const TRADE_TYPES = ['매매', '전세', '월세'];
const CONTRACT_KINDS = ['부동산', '분양권', '입주권', '권리금'];
// 거래유형 규칙: 분양권/입주권 → 매매 고정, 권리금/권리양수도 → 거래유형 없음, 그 외 → 매매/전세/월세
const FIXED_SALE_TYPES = ['아파트분양권', '오피스텔분양권', '입주권'];
const NO_TRADE_TYPES = ['상가권리금', '권리양수도'];
const INFO_TYPES = ['없음', '생년월일', '전화번호']; // 매도인/매수인 부가정보 유형
// 면적 표기 규칙: 토지=면적 / 단독·상가·다가구주택·공장·창고·건물=대지면적+연면적 / 그 외=전용면적
const LAND_AREA_TYPES = ['토지'];
const BLD_AREA_TYPES = ['단독주택', '상가주택', '다가구주택', '공장', '창고', '건물'];
// 단지형 — 건물명(단지)/동/호를 단지목록 드롭다운으로 제공(직접입력 옵션 포함)
const DANJI_TYPES = ['아파트', '오피스텔', '아파트분양권', '오피스텔분양권', '입주권'];

// 라벨(보라 박스) / 입력 스타일
const L = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '84px', padding: '6px 10px', border: '1px solid #8b93ea', borderRadius: '3px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', background: '#fff', whiteSpace: 'nowrap' };
const I = { padding: '5px 8px', fontSize: '13px', border: '1px solid #94a3b8', borderRadius: '3px', boxSizing: 'border-box' };
const SEC = { ...L, minWidth: '72px', margin: '14px 0 8px' };
const P = { fontSize: '13px', color: '#1f2937', lineHeight: 1.75, margin: '2px 0' };
const GRAY = '#64748b';
// 금액 표기: 콤마 + 한글(다른 계약서와 동일). 입력 저장은 숫자만.
const onlyDigits = (v) => String(v ?? '').replace(/[^0-9]/g, '');
const commaNum = (v) => { const d = onlyDigits(v); return d ? Number(d).toLocaleString() : ''; };
const moneyText = (v) => { const d = onlyDigits(v); return d ? `${Number(d).toLocaleString()}원 (${hangulAmount(d)}원)` : ''; };
// 계약금/잔금 안내문구 — 입력행·미리보기 공통
const NOTE_계약금 = '(가계약금 포함한 금액임)';
const NOTE_잔금 = '(상호협의로 잔금일 조정가능)';

export default function PreContractSmsModal({ onClose, defaults = {}, initial = null, page = false, onSave = null }) {
  const now = new Date();
  const base = {
    contractKind: CONTRACT_KINDS.includes(defaults.kindLabel) ? defaults.kindLabel : '부동산',
    ptType: PT_TYPES.includes(defaults.ptTypeLabel) ? defaults.ptTypeLabel : '아파트',
    tradeType: TRADE_TYPES.includes(defaults.tradeLabel) ? defaults.tradeLabel : '매매',
    addrMode: 'dropdown', // 'dropdown'(시도/시군구/동 선택) | 'manual'(직접입력)
    시도코드: '', 시도: '', 시군구코드: '', 시군구: '', 읍면동코드: '', 읍면동: '',
    주소: '', 지번: '', 건물명: '', 동: '', 호: '',
    // 단지형 — 단지/동/호 드롭다운(직접입력 전환 플래그)
    단지코드: '', 동번호: '', 단지직접: false, 동직접: false, 호직접: false,
    전용면적: '', 면적: '', 대지면적: '', 연면적: '',
    매도인: '', 매도인생년: '', 매도인생년유형: '생년월일',
    매수인: '', 매수인생년: '', 매수인생년유형: '생년월일',
    매매금액: '',
    가계약금: '', 가계약금날짜: '',
    계약금: '', 계약금날짜: '',
    중도금: '', 중도금날짜: '',
    잔금: '', 잔금날짜: '',
    은행: '우리은행', 채권최고액: '',
    계좌번호: '',
    사무소: '', 대표: '',
    특약추가: '',
    // 개업공인중개사 — 상호/대표만(자동입력). 공동중개사 추가 시 빈 줄 추가
    brokers: [{ 상호: defaults.officeName || defaults.사무소 || '', 대표: defaults.repName || defaults.대표 || '' }],
  };
  // 저장된 데이터가 있으면 이어받아 초기화(백엔드 연동 전 임시: localStorage)
  const [f, setF] = useState(initial && typeof initial === 'object' ? { ...base, ...initial, brokers: (initial.brokers && initial.brokers.length ? initial.brokers : base.brokers) } : base);
  const [showSpecialMgr, setShowSpecialMgr] = useState(false); // 특약관리(웹 폴백 인페이지 모달)
  const [pendingPtType, setPendingPtType] = useState(null); // 매물유형 변경 확인 대기(전체 초기화 전 모달 확인)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const dateStr = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`;

  // 소재지 — 시도/시군구/동 드롭다운(법정동 API). 선택값으로 f.주소 합성. '소재지' 재클릭 시 직접입력 전환
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [dongList, setDongList] = useState([]);
  useEffect(() => { addressService.getSidoList().then((d) => setSidoList(d || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!f.시도코드) { setSigunguList([]); return; }
    addressService.getSigunguList(f.시도코드).then((d) => setSigunguList(d || [])).catch(() => {});
  }, [f.시도코드]);
  useEffect(() => {
    if (!f.시군구코드) { setDongList([]); return; }
    addressService.getEupMyeonDongList(f.시군구코드).then((d) => setDongList(d || [])).catch(() => {});
  }, [f.시군구코드]);
  const composeAddr = (si, gu, dong) => [si, gu, dong].filter(Boolean).join(' ');
  const onSido = (e) => { const code = e.target.value; const name = sidoList.find((x) => x.bjdCode === code)?.bjdName || ''; setF((p) => ({ ...p, 시도코드: code, 시도: name, 시군구코드: '', 시군구: '', 읍면동코드: '', 읍면동: '', 주소: composeAddr(name, '', '') })); };
  const onSigungu = (e) => { const code = e.target.value; const name = sigunguList.find((x) => x.bjdCode === code)?.bjdName || ''; setF((p) => ({ ...p, 시군구코드: code, 시군구: name, 읍면동코드: '', 읍면동: '', 주소: composeAddr(p.시도, name, '') })); };
  const onDong = (e) => { const code = e.target.value; const name = dongList.find((x) => x.bjdCode === code)?.bjdName || ''; setF((p) => ({ ...p, 읍면동코드: code, 읍면동: name, 주소: composeAddr(p.시도, p.시군구, name) })); };
  const toggleAddrMode = () => setF((p) => ({ ...p, addrMode: p.addrMode === 'dropdown' ? 'manual' : 'dropdown' }));

  // 단지형(아파트/오피스텔/분양권/입주권) — 건물명(단지)/동/호를 단지목록 드롭다운으로(직접입력 옵션 포함)
  const isDanji = DANJI_TYPES.includes(f.ptType);
  const [danjiList, setDanjiList] = useState([]);
  const [danjiDongList, setDanjiDongList] = useState([]);
  const [danjiHoList, setDanjiHoList] = useState([]);
  useEffect(() => {
    if (!isDanji || f.addrMode !== 'dropdown' || !f.읍면동코드) { setDanjiList([]); return; }
    addressService.getDanjiListByBjd(f.읍면동코드).then((d) => setDanjiList(d || [])).catch(() => setDanjiList([]));
  }, [isDanji, f.addrMode, f.읍면동코드]);
  useEffect(() => {
    if (!f.단지코드) { setDanjiDongList([]); return; }
    addressService.getDongListByDanji(f.단지코드).then((d) => setDanjiDongList(d || [])).catch(() => setDanjiDongList([]));
  }, [f.단지코드]);
  useEffect(() => {
    if (!f.단지코드 || !f.동번호) { setDanjiHoList([]); return; }
    addressService.getHoListByDong(f.단지코드, f.동번호).then((d) => setDanjiHoList(d || [])).catch(() => setDanjiHoList([]));
  }, [f.단지코드, f.동번호]);
  const onDanji = (e) => {
    const v = e.target.value;
    if (v === '__direct__') { setF((p) => ({ ...p, 단지직접: true, 단지코드: '', 건물명: '', 동번호: '', 동: '', 호: '' })); setDanjiDongList([]); setDanjiHoList([]); return; }
    const d = danjiList.find((x) => x.naverDanjiCode === v);
    setF((p) => ({ ...p, 단지코드: v, 건물명: d?.buildingName || '', 단지직접: false, 동번호: '', 동: '', 동직접: false, 호: '', 호직접: false }));
    setDanjiDongList([]); setDanjiHoList([]);
  };
  const onDanjiDong = (e) => {
    const v = e.target.value;
    if (v === '__direct__') { setF((p) => ({ ...p, 동직접: true, 동번호: '', 동: '', 호: '' })); setDanjiHoList([]); return; }
    const dg = danjiDongList.find((x) => String(x.dong_no) === String(v));
    setF((p) => ({ ...p, 동번호: v, 동: dg?.dong_name || '', 동직접: false, 호: '', 호직접: false }));
    setDanjiHoList([]);
  };
  const onDanjiHo = (e) => {
    const v = e.target.value;
    if (v === '__direct__') { setF((p) => ({ ...p, 호직접: true, 호: '' })); return; }
    setF((p) => ({ ...p, 호: v }));
  };

  // 물건유형 변경 시 거래유형 규칙 적용 (분양권/입주권=매매 고정 · 권리금/권리양수도=없음 · 그 외=매매/전세/월세)
  useEffect(() => {
    setF((p) => {
      if (FIXED_SALE_TYPES.includes(p.ptType)) return p.tradeType === '매매' ? p : { ...p, tradeType: '매매' };
      if (NO_TRADE_TYPES.includes(p.ptType)) return p.tradeType === '' ? p : { ...p, tradeType: '' };
      return TRADE_TYPES.includes(p.tradeType) ? p : { ...p, tradeType: '매매' };
    });
  }, [f.ptType]);

  // 특약사항 — 계약서쪽과 동일하게 '특약관리'로 작성/적용. 적용 텍스트는 추가특약 영역에 누적.
  const appendSpecial = (text) => {
    const t = (text || '').trim(); if (!t) return;
    setF((p) => ({ ...p, 특약추가: (p.특약추가 ? p.특약추가.replace(/\s+$/, '') + '\n' : '') + t }));
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
  // 특약관리 새 창의 '적용'을 수신(같은 origin localStorage 브리지)
  useEffect(() => {
    let lastN = null;
    const onStorage = (e) => {
      if (e.key !== 'specialClauseApply' || !e.newValue) return;
      try { const { text, n } = JSON.parse(e.newValue); if (n === lastN) return; lastN = n; appendSpecial(text); } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 개업공인중개사 — 상호/대표만. 공동중개사 추가 = 빈 줄 추가
  const setBroker = (i, k) => (e) => setF((p) => ({ ...p, brokers: p.brokers.map((b, j) => (j === i ? { ...b, [k]: e.target.value } : b)) }));
  const addBroker = () => setF((p) => ({ ...p, brokers: [...p.brokers, { 상호: '', 대표: '' }] }));
  const removeBroker = (i) => setF((p) => ({ ...p, brokers: p.brokers.length > 1 ? p.brokers.filter((_, j) => j !== i) : p.brokers }));

  const message = useMemo(() => {
    const v = (x) => (x || '').toString().trim();
    let m = `${v(f.ptType)}${f.tradeType ? ' ' + v(f.tradeType) : ''} 가계약\n`;
    // 소재지 — 지번은 괄호 없이 동/리(주소) 뒤에 바로 표기(예: 둔촌동 1121-1), 이어서 건물명·동·호
    const addr = [
      v(f.주소),
      v(f.지번),
      v(f.건물명),
      v(f.동) && `${v(f.동)}동`,
      v(f.호) && `${v(f.호)}호`,
    ].filter(Boolean).join(' ');
    // 중도금을 제외한 항목은 값이 없어도 기본 표기(항목 구조가 보이도록)
    m += `■ 소재지: ${addr}\n`;
    // 면적 — 물건유형별: 토지=면적 / 건물류=대지면적+연면적(2줄) / 그 외=전용면적
    if (LAND_AREA_TYPES.includes(f.ptType)) {
      m += `■ 면적: ${v(f.면적)}${v(f.면적) ? '㎡' : ''}\n`;
    } else if (BLD_AREA_TYPES.includes(f.ptType)) {
      m += `■ 대지면적: ${v(f.대지면적)}${v(f.대지면적) ? '㎡' : ''}\n`;
      m += `■ 연면적: ${v(f.연면적)}${v(f.연면적) ? '㎡' : ''}\n`;
    } else {
      m += `■ 전용면적: ${v(f.전용면적)}${v(f.전용면적) ? '㎡' : ''}\n`;
    }
    m += `■ 매도인: ${v(f.매도인)}${(f.매도인생년유형 !== '없음' && v(f.매도인생년)) ? ` (${v(f.매도인생년)})` : ''}\n`;
    m += `■ 매수인: ${v(f.매수인)}${(f.매수인생년유형 !== '없음' && v(f.매수인생년)) ? ` (${v(f.매수인생년)})` : ''}\n`;
    m += `\n매도인과 매수인은 부동산 ${v(f.tradeType)}계약을 아래의 내용으로 진행하기로 합의합니다.\n\n`;
    // 금액: 콤마 + 한글 표기. 계약금/잔금 안내문구는 미리보기·인쇄에도 표시
    m += `· 매매금액: ${moneyText(f.매매금액)}\n`;
    m += `· 가계약금: ${moneyText(f.가계약금)}${v(f.가계약금날짜) ? ` (${v(f.가계약금날짜)})` : ''}\n`;
    m += `· 계약금: ${moneyText(f.계약금)}${v(f.계약금날짜) ? ` (${v(f.계약금날짜)})` : ''}\n   ${NOTE_계약금}\n`;
    // 중도금만 값이 있을 때 표기
    if (v(f.중도금)) m += `· 중도금: ${moneyText(f.중도금)}${v(f.중도금날짜) ? ` (${v(f.중도금날짜)})` : ''}\n`;
    m += `· 잔금: ${moneyText(f.잔금)}${v(f.잔금날짜) ? ` (${v(f.잔금날짜)})` : ''}\n   ${NOTE_잔금}\n`;
    m += `\n[계약내용]\n`;
    m += `○ 가계약의 효력은 본계약 작성완료 까지이며, 계약서 작성일에 중개대상물 확인설명서를 작성한다.\n`;
    m += `○ 가계약 체결후 별도의 협의없이 어느 일방이 계약을 이행하지 않으면 본계약을 자동해지하고 가계약금을 해약금 및 위약금으로 본다.\n`;
    m += `  · 매도인 변심시 : 가계약금 배액배상\n  · 매수인 변심시 : 가계약금 포기\n`;
    if (v(f.특약추가)) m += `\n[특약사항]\n${v(f.특약추가)}\n`;
    m += `\n[계약성립]\n`;
    m += `○ 위 내용에 양당사자가 동의하고 매수인이 가계약금을 입금하면 동시에 이 계약은 성립한다\n\n`;
    m += `위 내용에 동의하시면\n`;
    m += `매도인은 "매도인 동의합니다"${v(f.계좌번호) ? ` (가계약금 수령 계좌: ${v(f.계좌번호)})` : ` '가계약금 수령할 본인명의의 계좌번호'`}\n`;
    m += `매수인은 "매수인 동의합니다"\n`;
    m += `작성하여 회신하여 주시기 바랍니다.\n\n${dateStr}\n`;
    (f.brokers || []).forEach((b) => {
      if (v(b.상호) || v(b.대표)) m += `${v(b.상호)}공인중개사사무소   대표자: ${v(b.대표)}\n`;
    });
    return m;
  }, [f, dateStr]);

  // 우측 미리보기 — 전체 편집 가능(자동생성문을 기본으로, 사용자가 손대면 수동 유지)
  const cardRef = useRef(null);  // JPG 캡처용 흰 카드
  const editRef = useRef(null);  // 편집 가능한 미리보기 영역
  const [previewEdited, setPreviewEdited] = useState(false);
  const [previewText, setPreviewText] = useState('');
  // 저장된 편집본이 있으면 최초 1회 로드(이후 수동 유지)
  useEffect(() => {
    const saved = initial && typeof initial === 'object' ? initial.previewText : null;
    if (saved) { setPreviewText(saved); setPreviewEdited(true); if (editRef.current) editRef.current.innerText = saved; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 사용자가 직접 편집하기 전까지는 입력값 변화에 따라 자동 생성문 반영
  useEffect(() => {
    if (previewEdited) return;
    setPreviewText(message);
    if (editRef.current && editRef.current.innerText !== message) editRef.current.innerText = message;
  }, [message, previewEdited]);

  // JPG 저장 — 우측 미리보기 영역을 이미지로 캡처해 다운로드 (+ 가계약 문자 DB 저장)
  const saveJpg = async () => {
    if (onSave) { try { await onSave({ ...f, previewText }); } catch { /* 저장 실패는 토스트로 처리됨 */ } }
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      // 고화질: 화면 배율의 4배(최소 4배)로 렌더 → 글자 선명하게
      const scale = Math.max(4, (window.devicePixelRatio || 1) * 3);
      const canvas = await html2canvas(cardRef.current, { scale, backgroundColor: '#ffffff', useCORS: true });
      const url = canvas.toDataURL('image/jpeg', 1.0);
      const a = document.createElement('a');
      a.href = url;
      a.download = `가계약문자_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.jpg`;
      a.click();
    } catch (e) {
      console.error('JPG 저장 실패:', e);
      toast.error('JPG 저장에 실패했습니다.');
    }
  };

  const money = (k, w = '160px') => <input value={commaNum(f[k])} onChange={(e) => setF((p) => ({ ...p, [k]: onlyDigits(e.target.value) }))} placeholder="금액" inputMode="numeric" style={{ ...I, width: w, textAlign: 'right' }} />;
  const dateIn = (k) => <input type="date" value={f[k]} onChange={set(k)} style={I} />;
  const amtRow = (label, k, dk, note) => (
    <div style={{ marginBottom: '7px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={L}>{label}</span>
        {money(k)}
        {dk && <><span style={{ ...L, minWidth: '54px', color: GRAY, borderColor: '#cbd5e1' }}>날짜</span>{dateIn(dk)}</>}
      </div>
      {note && <div style={{ fontSize: '13px', color: GRAY, marginTop: '3px', marginLeft: '92px' }}>{note}</div>}
    </div>
  );

  return (
    <div
      style={page
        ? { position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column' }
        : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={page ? undefined : onClose}
    >
      <div
        style={page
          ? { flex: 1, minHeight: 0, width: '100%', background: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
          : { width: '1440px', maxWidth: '97vw', height: '92vh', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 우상단: 미리보기 및 인쇄 / 닫기 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>가계약 문자 <span style={{ color: '#dc2626' }}>(편집중)</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onSave && (
              <button onClick={async () => { const ok = await onSave({ ...f, previewText }); if (ok) onClose?.(); }}
                style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '4px', background: '#059669', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}>저장</button>
            )}
            <button onClick={saveJpg}
              style={{ padding: '7px 14px', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '4px', background: '#0891b2', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}>JPG 저장</button>
            <button onClick={onClose}
              style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>닫기</button>
          </div>
        </div>

        {/* 본문: 좌측 입력(좁게) + 우측 실시간 미리보기 */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, minWidth: '770px', overflowX: 'hidden', overflowY: 'auto', padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
            {/* 상단: 물건유형 / 거래유형 (계약종류 제거) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={L}>물건유형</span>
              <select value={f.ptType} onChange={(e) => { const v = e.target.value; if (v !== f.ptType) setPendingPtType(v); }} style={{ ...I, cursor: 'pointer', width: '130px' }}>{PT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              {/* 거래유형: 분양권/입주권=매매 고정 · 권리금/권리양수도=없음 · 그 외=선택 */}
              {!NO_TRADE_TYPES.includes(f.ptType) && (
                <>
                  <span style={L}>거래유형</span>
                  {FIXED_SALE_TYPES.includes(f.ptType) ? (
                    <span style={{ ...I, width: '90px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#334155', fontWeight: 700 }}>매매</span>
                  ) : (
                    <select value={f.tradeType} onChange={set('tradeType')} style={{ ...I, cursor: 'pointer', width: '90px' }}>{TRADE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                  )}
                </>
              )}
            </div>
            {/* 소재지 — 시도/시군구/동 드롭다운, '소재지' 클릭 시 직접입력 토글 */}
            {f.addrMode === 'dropdown' ? (
              // 소재지 전체 한 줄 — 소재지 + 시도/시군구/동 + 지번 + 건물명(단지)/동/호 (줄바꿈 없음)
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
                  <button type="button" onClick={toggleAddrMode} title="직접입력으로 전환"
                    style={{ ...L, gap: '4px', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                    <Search size={13} /> 소재지
                  </button>
                  <select value={f.시도코드} onChange={onSido} style={{ ...I, cursor: 'pointer', width: '116px' }}>
                    <option value="">시도</option>
                    {sidoList.map((s) => <option key={s.bjdCode} value={s.bjdCode}>{s.bjdName}</option>)}
                  </select>
                  <select value={f.시군구코드} onChange={onSigungu} style={{ ...I, cursor: 'pointer', width: '116px' }}>
                    <option value="">시군구</option>
                    {sigunguList.map((s) => <option key={s.bjdCode} value={s.bjdCode}>{s.bjdName}</option>)}
                  </select>
                  <select value={f.읍면동코드} onChange={onDong} style={{ ...I, cursor: 'pointer', width: '85px' }}>
                    <option value="">동</option>
                    {dongList.map((s) => <option key={s.bjdCode} value={s.bjdCode}>{s.bjdName}</option>)}
                  </select>
                  {/* 단지형은 지번 입력창 숨김(미리보기엔 지번 표기 유지) */}
                  {!isDanji && <input value={f.지번} onChange={set('지번')} placeholder="지번" style={{ ...I, width: '84px' }} />}
                  {isDanji ? (
                    <>
                      {/* 단지(건물명) */}
                      {f.단지직접 ? (
                        <input value={f.건물명} onChange={set('건물명')} placeholder="단지명(직접입력)" style={{ ...I, width: '120px' }} />
                      ) : (
                        <select value={f.단지코드 || ''} onChange={onDanji} style={{ ...I, cursor: 'pointer', width: '150px' }}>
                          <option value="">{f.읍면동코드 ? '단지 선택' : '동을 먼저 선택'}</option>
                          {danjiList.map((d) => <option key={d.buildingCode} value={d.naverDanjiCode}>{d.buildingName}</option>)}
                          <option value="__direct__">직접입력</option>
                        </select>
                      )}
                      {/* 동 */}
                      {f.동직접 ? (
                        <input value={f.동} onChange={set('동')} placeholder="동" style={{ ...I, width: '60px' }} />
                      ) : (
                        <select value={f.동번호 || ''} onChange={onDanjiDong} style={{ ...I, cursor: 'pointer', width: '60px' }}>
                          <option value="">동</option>
                          {danjiDongList.map((dg) => <option key={dg.dong_no} value={dg.dong_no}>{dg.dong_name}</option>)}
                          <option value="__direct__">직접입력</option>
                        </select>
                      )}
                      {/* 호 */}
                      {f.호직접 ? (
                        <input value={f.호} onChange={set('호')} placeholder="호" style={{ ...I, width: '60px' }} />
                      ) : (
                        <select value={f.호 || ''} onChange={onDanjiHo} style={{ ...I, cursor: 'pointer', width: '60px' }}>
                          <option value="">호</option>
                          {danjiHoList.map((h, i) => <option key={i} value={h.ho_name}>{h.ho_name}</option>)}
                          <option value="__direct__">직접입력</option>
                        </select>
                      )}
                    </>
                  ) : (
                    <>
                      <input value={f.건물명} onChange={set('건물명')} placeholder="건물명" style={{ ...I, width: '130px' }} />
                      <input value={f.동} onChange={set('동')} placeholder="동" style={{ ...I, width: '50px' }} />
                      <input value={f.호} onChange={set('호')} placeholder="호" style={{ ...I, width: '50px' }} />
                    </>
                  )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={toggleAddrMode} title="시도/시군구/동 선택으로 전환"
                  style={{ ...L, gap: '4px', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  <Search size={13} /> 소재지
                </button>
                <input value={f.주소} onChange={set('주소')} placeholder="주소(직접입력)" style={{ ...I, flex: '0 1 240px', minWidth: '140px' }} />
                <input value={f.지번} onChange={set('지번')} placeholder="지번" style={{ ...I, width: '84px' }} />
                <input value={f.건물명} onChange={set('건물명')} placeholder="건물명" style={{ ...I, width: '104px' }} />
                <input value={f.동} onChange={set('동')} placeholder="동" style={{ ...I, width: '40px' }} />
                <input value={f.호} onChange={set('호')} placeholder="호" style={{ ...I, width: '40px' }} />
              </div>
            )}
            {/* 면적 — 물건유형별: 토지=면적 / 건물류=대지면적+연면적 / 그 외=전용면적 */}
            {LAND_AREA_TYPES.includes(f.ptType) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                <span style={L}>면적</span>
                <input value={f.면적} onChange={set('면적')} style={{ ...I, width: '140px' }} /><span style={{ fontSize: '13px', color: GRAY }}>㎡</span>
              </div>
            ) : BLD_AREA_TYPES.includes(f.ptType) ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                  <span style={L}>대지면적</span>
                  <input value={f.대지면적} onChange={set('대지면적')} style={{ ...I, width: '140px' }} /><span style={{ fontSize: '13px', color: GRAY }}>㎡</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                  <span style={L}>연면적</span>
                  <input value={f.연면적} onChange={set('연면적')} style={{ ...I, width: '140px' }} /><span style={{ fontSize: '13px', color: GRAY }}>㎡</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                <span style={L}>전용면적</span>
                <input value={f.전용면적} onChange={set('전용면적')} style={{ ...I, width: '140px' }} /><span style={{ fontSize: '13px', color: GRAY }}>㎡</span>
              </div>
            )}
            {/* 매도인/매수인 — 부가정보 유형: 없음 / 생년월일 / 전화번호 */}
            {[['매도인', '매도인', '매도인생년', '매도인생년유형'], ['매수인', '매수인', '매수인생년', '매수인생년유형']].map(([lb, nk, bk, tk]) => (
              <div key={nk} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                <span style={L}>{lb}</span>
                <input value={f[nk]} onChange={set(nk)} style={{ ...I, width: '150px' }} />
                <select value={f[tk]} onChange={set(tk)} style={{ ...I, width: '100px', cursor: 'pointer' }}>{INFO_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                {f[tk] !== '없음' && (
                  <input value={f[bk]} onChange={set(bk)} placeholder={f[tk] === '전화번호' ? '010-0000-0000' : 'YYYY-MM-DD'} style={{ ...I, width: '130px' }} />
                )}
              </div>
            ))}
            <p style={{ ...P, margin: '10px 0' }}>
              <b style={{ color: '#4f46e5' }}>매도인</b>과 <b style={{ color: '#4f46e5' }}>매수인</b>은 부동산 {f.tradeType}계약을 아래의 내용으로 진행하기로 합의합니다.
            </p>
            {/* 금액들 */}
            {amtRow('매매금액', '매매금액')}
            {amtRow('가계약금', '가계약금', '가계약금날짜')}
            {amtRow('계약금', '계약금', '계약금날짜', NOTE_계약금)}
            {amtRow('중도금', '중도금', '중도금날짜')}
            {amtRow('잔금', '잔금', '잔금날짜', NOTE_잔금)}

            {/* 계약내용 */}
            <div style={SEC}>계약내용</div>
            <p style={P}>○ 가계약의 효력은 본계약 작성완료 까지이며, 계약서 작성일에 중개대상물 확인설명서를 작성한다.</p>
            <p style={P}>○ 가계약 체결후 별도의 협의없이 어느 일방이 계약을 이행하지 않으면 본계약을 자동해지하고 가계약금을 해약금 및 위약금으로 본다.</p>
            <p style={{ ...P, paddingLeft: '14px' }}>· <b style={{ color: '#4f46e5' }}>매도인</b> 변심시 : 가계약금 배액배상</p>
            <p style={{ ...P, paddingLeft: '14px' }}>· <b style={{ color: '#4f46e5' }}>매수인</b> 변심시 : 가계약금 포기</p>

            {/* 특약사항 — 계약서쪽과 동일하게 특약관리로 작성/적용 (버튼은 우측 정렬) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: '14px 0 8px' }}>
              <div style={{ ...SEC, margin: 0 }}>특약사항</div>
              <button type="button" onClick={openSpecialManager}
                style={{ padding: '4px 12px', fontSize: '13px', fontWeight: 700, border: '1px solid #8b93ea', borderRadius: '999px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' }}>특약관리</button>
            </div>
            <textarea value={f.특약추가} onChange={set('특약추가')} rows={3} placeholder="추가 특약사항을 입력하거나 '특약관리'에서 적용하세요." style={{ ...I, width: '100%', marginTop: '6px', resize: 'vertical', fontFamily: 'inherit' }} />


            {/* 계약성립 */}
            <div style={SEC}>계약성립</div>
            <p style={P}>○ 위 내용에 양당사자가 동의하고 <b style={{ color: '#4f46e5' }}>매수인</b>이 가계약금을 입금하면 동시에 이 계약은 성립한다</p>
            <p style={{ ...P, marginTop: '8px' }}>위 내용에 동의하시면</p>
            <p style={P}>
              <b style={{ color: '#4f46e5' }}>매도인</b>은 "매도인 동의합니다"&nbsp;&nbsp;
              <input value={f.계좌번호} onChange={set('계좌번호')} placeholder="가계약금 수령할 본인명의의 계좌번호" style={{ ...I, width: '280px', padding: '2px 6px' }} />
            </p>
            <p style={P}><b style={{ color: '#4f46e5' }}>매수인</b>은 "매수인 동의합니다"</p>
            <p style={{ ...P, marginTop: '6px' }}>작성하여 회신하여 주시기 바랍니다.</p>
            <p style={{ ...P, textAlign: 'center', margin: '12px 0' }}>{dateStr}</p>
            {/* 개업공인중개사 — [ ]공인중개사사무소 / 대표자: [ ] (자동입력) · 공동중개사 추가 시 빈 줄 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0 8px' }}>
              <div style={{ ...SEC, margin: 0, minWidth: '120px' }}>개업공인중개사</div>
              <button type="button" onClick={addBroker}
                style={{ padding: '5px 14px', fontSize: '13px', fontWeight: 700, border: '1px solid #8b93ea', borderRadius: '6px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ 공동중개사 추가</button>
            </div>
            {f.brokers.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px', flexWrap: 'wrap' }}>
                <input value={b.상호} onChange={setBroker(i, '상호')} placeholder="사무소명" style={{ ...I, width: '160px' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937' }}>공인중개사사무소</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937', marginLeft: '4px' }}>대표자:</span>
                <input value={b.대표} onChange={setBroker(i, '대표')} placeholder="대표자" style={{ ...I, width: '110px' }} />
                {i > 0 && (
                  <button type="button" onClick={() => removeBroker(i)}
                    style={{ padding: '4px 10px', fontSize: '13px', fontWeight: 600, color: '#dc2626', background: 'white', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer' }}>삭제</button>
                )}
              </div>
            ))}
          </div>

          {/* 우측: 실시간 미리보기 — 좌측 공간이 부족하면 우측이 줄어든다(좌측 입력영역 우선). 좁아지면 미리보기는 가로 스크롤 */}
          <div style={{ flex: '0 1 830px', minWidth: 0, overflow: 'auto', background: '#f1f5f9', padding: '18px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '794px', flexShrink: 0 }}>
              <div style={{ fontSize: '12px', color: GRAY, marginBottom: '6px' }}>※ 아래 미리보기를 직접 수정할 수 있습니다. 저장/JPG 저장 시 수정한 내용이 함께 저장됩니다.</div>
              <div ref={cardRef} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 2px 10px rgba(0,0,0,.08)', padding: '22px 24px', boxSizing: 'border-box' }}>
                <div
                  ref={editRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => { setPreviewText(e.currentTarget.innerText); if (!previewEdited) setPreviewEdited(true); }}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'굴림', 'Gulim', sans-serif", fontSize: '14px', lineHeight: 1.75, fontWeight: 600, color: '#111827', margin: 0, outline: 'none', minHeight: '200px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 특약관리 — 웹(비Electron) 폴백: 인페이지 모달 */}
      {showSpecialMgr && (
        <SpecialClauseManager onClose={() => setShowSpecialMgr(false)} onApply={appendSpecial} />
      )}

      {/* 매물유형 변경 확인 — 변경 시 입력/미리보기 전체 초기화 */}
      {pendingPtType !== null && (
        <div onClick={() => setPendingPtType(null)} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '440px', maxWidth: '94vw', background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 16px 44px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', fontSize: '16px', fontWeight: 800, color: '#111827' }}>매물유형 변경</div>
            <div style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 600, color: '#334155', lineHeight: 1.6 }}>
              매물유형을 <b style={{ color: '#4f46e5' }}>{pendingPtType}</b>(으)로 변경하면 작성한 입력 내용과 우측 미리보기가 <b>전체 초기화</b>됩니다.<br />변경하시겠습니까?
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button type="button" onClick={() => setPendingPtType(null)} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#374151', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={() => {
                const np = pendingPtType;
                setPendingPtType(null);
                setF({ ...base, ptType: np });        // 입력항목 전체 초기화(새 매물유형 적용)
                setPreviewEdited(false);               // 미리보기 자동 생성문으로 복귀
                setPreviewText('');
                if (editRef.current) editRef.current.innerText = '';
              }} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '6px', background: '#4f46e5', color: 'white', cursor: 'pointer' }}>변경</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

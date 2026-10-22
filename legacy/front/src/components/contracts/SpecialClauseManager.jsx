import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * 특약관리 — 대분류(주거용 매매 등)별로 '자주쓰는 특약(특약1~N 슬롯)'과 '기본 특약사항'을 관리.
 *  - 자주쓰는 특약: 슬롯 탭(특약1~N, [+]로 추가, 이름변경) + 편집영역 + 저장 + '작성중인 계약서에 적용'
 *  - 기본 특약사항: 체크 후 '작성중인 계약서에 적용' 또는 '자주쓰는 특약사항에 적용'(슬롯 선택) / 항목별 수정·초기값
 *  - 적용: 새 창이면 localStorage 브리지(specialClauseApply), 인페이지면 onApply(text)
 *  - 저장소: localStorage(specialClauseMgr_v2). 백엔드 연동은 추후.
 */
const CATEGORIES = ['주거용 매매', '주거용 임대차', '비주거용 매매', '비주거용 임대차', '토지매매'];
const STORE_KEY = 'specialClauseMgr_v2';
const BRIDGE_KEY = 'specialClauseApply';
const BASIC_SEED = [
  '현 시설 상태의 매매계약이며 등기부등본 분석결과 하자 없는 상태를 확인 후 계약함.',
  '매매 대금 중 현 임대보증금은 잔금에서 공제하며, 현 임대차계약은 매수인이 승계한다.',
  '잔금과 동시에 매도인이 2년 전세로 본 매매 물건을 임대차하기로 한다(전세보증금은        원으로 한다).',
  '중개대상물 확인설명서를 거래당사자에게 각각 교부한다.',
  '',
  '건물의 노후로 인한 누수 등의 발생 시 잔금 일을 기준으로 그 이전은 매도인이, 잔금일 이후는 매수인이 책임지기로 한다.',
  '매매대금에는 다른 특약이 없는 한 본건 부동산에 존재하는 승물 등 일체의 시설물을 포함한다.',
  '본 계약에 명시되지 않은 사항은 관계법령 및 부동산 거래 관행에 따른다.',
];
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const makeDefaults = () => ({
  favorites: Array.from({ length: 7 }, (_, i) => ({ name: `특약${i + 1}`, text: '' })),
  basics: BASIC_SEED.map((t, i) => ({ id: `b${i}`, text: t, def: t })),
});
const loadStore = () => {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const s = JSON.parse(raw); CATEGORIES.forEach((c) => { if (!s[c]) s[c] = makeDefaults(); }); return s; } } catch { /* ignore */ }
  const s = {}; CATEGORIES.forEach((c) => { s[c] = makeDefaults(); }); return s;
};

export default function SpecialClauseManager({ onClose, onApply = null, page = false }) {
  const [store, setStore] = useState(loadStore);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [checked, setChecked] = useState({});       // 기본 특약사항 체크(id → bool)
  const [editing, setEditing] = useState({});        // 기본 특약사항 인라인 수정(id → bool)
  const [pickSlot, setPickSlot] = useState(false);   // 자주쓰는 특약사항에 적용 — 슬롯 선택 오버레이

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* ignore */ } }, [store]);
  useEffect(() => { setActiveSlot(0); }, [category]);

  const catData = store[category] || makeDefaults();
  const favorites = catData.favorites;
  const basics = catData.basics;
  const slot = favorites[Math.min(activeSlot, favorites.length - 1)] || favorites[0];

  const setCat = (fn) => setStore((prev) => { const cur = prev[category] || makeDefaults(); return { ...prev, [category]: fn(cur) }; });

  // ── 적용(계약서로) ──
  const apply = (text) => {
    const t = (text || '').trim();
    if (!t) { toast('적용할 특약 내용이 없습니다.'); return; }
    if (onApply) onApply(t);
    else { try { localStorage.setItem(BRIDGE_KEY, JSON.stringify({ text: t, n: uid() })); } catch { /* ignore */ } }
    toast.success('작성 중인 계약서에 적용했습니다.');
  };

  // ── 자주쓰는 특약(슬롯) ──
  const setSlotText = (idx, text) => setCat((c) => ({ ...c, favorites: c.favorites.map((s, i) => (i === idx ? { ...s, text } : s)) }));
  const renameSlot = (idx) => {
    const nm = window.prompt('특약 이름', favorites[idx]?.name || `특약${idx + 1}`);
    if (nm == null) return;
    setCat((c) => ({ ...c, favorites: c.favorites.map((s, i) => (i === idx ? { ...s, name: nm.trim() || s.name } : s)) }));
  };
  const addSlot = () => { setCat((c) => ({ ...c, favorites: [...c.favorites, { name: `특약${c.favorites.length + 1}`, text: '' }] })); setActiveSlot(favorites.length); };
  const saveSlot = () => { toast.success(`${slot?.name || '특약'} 저장되었습니다.`); };

  // ── 기본 특약사항 ──
  const setBasicText = (id, text) => setCat((c) => ({ ...c, basics: c.basics.map((b) => (b.id === id ? { ...b, text } : b)) }));
  const resetBasic = (id) => setCat((c) => ({ ...c, basics: c.basics.map((b) => (b.id === id ? { ...b, text: b.def } : b)) }));
  const addBasic = () => setCat((c) => ({ ...c, basics: [...c.basics, { id: uid(), text: '', def: '' }] }));
  const removeBasic = (id) => setCat((c) => ({ ...c, basics: c.basics.filter((b) => b.id !== id) }));
  const checkedTexts = () => basics.filter((b) => checked[b.id] && b.text.trim()).map((b) => b.text.trim());

  const applyBasicsToContract = () => {
    const lines = checkedTexts();
    if (!lines.length) { toast('선택된 기본 특약사항이 없습니다.'); return; }
    apply(lines.join('\n'));
  };
  const applyBasicsToFavoriteSlot = (idx) => {
    const lines = checkedTexts();
    if (!lines.length) { toast('선택된 기본 특약사항이 없습니다.'); setPickSlot(false); return; }
    setCat((c) => ({ ...c, favorites: c.favorites.map((s, i) => (i === idx ? { ...s, text: [s.text.trim(), lines.join('\n')].filter(Boolean).join('\n') } : s)) }));
    setActiveSlot(idx);
    setPickSlot(false);
    toast.success(`${favorites[idx]?.name || `특약${idx + 1}`}에 담았습니다.`);
  };

  // 스타일
  const btn = { padding: '5px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' };
  const primary = { ...btn, background: '#3b5bdb', borderColor: '#3b5bdb', color: 'white', fontWeight: 700 };
  const secBar = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#eef2f7', border: '1px solid #cbd5e1', padding: '6px 10px' };
  const secTitle = { fontSize: '14px', fontWeight: 800, color: '#1e3a8a' };
  const slotTab = (on) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '13px', fontWeight: on ? 800 : 600, border: '1px solid ' + (on ? '#3b5bdb' : '#cbd5e1'), borderBottom: on ? '2px solid #3b5bdb' : '1px solid #cbd5e1', background: on ? '#eef2ff' : 'white', color: on ? '#3b5bdb' : '#374151', borderRadius: '5px 5px 0 0', cursor: 'pointer', whiteSpace: 'nowrap' });
  const gear = { border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', fontSize: '12px', padding: 0, lineHeight: 1 };

  const body = (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', position: 'relative' }}>
      {/* 헤더: 특약관리 + 대분류 드롭다운 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>특약관리</div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...btn, cursor: 'pointer', fontWeight: 700, color: '#1e3a8a', minWidth: '150px' }}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {onClose && <button onClick={onClose} title="닫기" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', display: 'inline-flex' }}><X className="w-5 h-5" /></button>}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* ── 자주쓰는 특약사항 ── */}
        <div>
          <div style={secBar}>
            <span style={secTitle}>[ 자주쓰는 특약사항 ]</span>
          </div>
          {/* 슬롯 탭 + 우측 끝: 작성중인 계약서에 적용 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', padding: '8px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', flexWrap: 'wrap' }}>
              {favorites.map((s, i) => (
                <span key={i} style={slotTab(i === activeSlot)} onClick={() => setActiveSlot(i)}>
                  {s.name}
                  <button type="button" style={gear} title="이름 바꾸기" onClick={(e) => { e.stopPropagation(); renameSlot(i); }}>✎</button>
                </span>
              ))}
              <button type="button" style={{ ...slotTab(false), fontWeight: 800, color: '#3b5bdb' }} title="특약 추가" onClick={addSlot}>＋</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button type="button" style={primary} onClick={() => apply(slot?.text)}>작성중인 계약서에 적용</button>
              <button type="button" style={primary} onClick={saveSlot}>저장</button>
            </div>
          </div>
          {/* 편집 영역 */}
          <textarea value={slot?.text ?? ''} onChange={(e) => setSlotText(activeSlot, e.target.value)} placeholder={`${slot?.name || '특약'} 내용을 입력하세요.`}
            style={{ width: '100%', minHeight: '150px', border: '1px solid #334155', borderRadius: '0 0 4px 4px', padding: '8px 10px', fontSize: '13px', lineHeight: 1.6, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        {/* ── 기본 특약사항 ── */}
        <div>
          <div style={secBar}>
            <span style={secTitle}>[ 기본 특약사항 ]</span>
            <span style={{ display: 'flex', gap: '6px' }}>
              <button type="button" style={btn} onClick={applyBasicsToContract}>작성중인 계약서에 적용</button>
              <button type="button" style={primary} onClick={() => setPickSlot(true)}>자주쓰는 특약사항에 적용</button>
            </span>
          </div>
          <div style={{ border: '1px solid #cbd5e1', borderTop: 'none' }}>
            {basics.map((b) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>
                <input type="checkbox" checked={!!checked[b.id]} onChange={(e) => setChecked((p) => ({ ...p, [b.id]: e.target.checked }))} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                {editing[b.id]
                  ? <textarea value={b.text} onChange={(e) => setBasicText(b.id, e.target.value)} rows={2} style={{ flex: 1, border: '1px solid #94a3b8', borderRadius: '4px', padding: '6px 8px', fontSize: '13px', lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical' }} />
                  : <div style={{ flex: 1, fontSize: '13px', color: '#111827', lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: '20px' }}>{b.text || <span style={{ color: '#cbd5e1' }}>(빈 항목)</span>}</div>}
                <button type="button" style={{ ...btn, padding: '4px 10px' }} onClick={() => setEditing((p) => ({ ...p, [b.id]: !p[b.id] }))}>{editing[b.id] ? '완료' : '수정'}</button>
                <button type="button" style={{ ...btn, padding: '4px 10px' }} onClick={() => resetBasic(b.id)}>초기값으로</button>
                <button type="button" title="행 삭제" style={{ ...btn, padding: '4px 8px', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => removeBasic(b.id)}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" style={{ ...btn, width: '100%', marginTop: '6px', fontWeight: 700, color: '#3b5bdb', borderColor: '#93a3f4' }} onClick={addBasic}>＋ 행추가</button>
        </div>
      </div>

      {/* 슬롯 선택 오버레이 — '자주쓰는 특약사항에 적용' */}
      {pickSlot && (
        <div onClick={() => setPickSlot(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', padding: '16px 18px', width: '360px', maxWidth: '90%' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginBottom: '10px' }}>어느 특약에 담을까요?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {favorites.map((s, i) => (
                <button key={i} type="button" style={{ ...btn, padding: '6px 12px' }} onClick={() => applyBasicsToFavoriteSlot(i)}>{s.name}</button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" style={btn} onClick={() => setPickSlot(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (page) {
    return <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column' }}>{body}</div>;
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ width: '920px', maxWidth: '96vw', height: '680px', maxHeight: '92vh', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {body}
      </div>
    </div>
  );
}

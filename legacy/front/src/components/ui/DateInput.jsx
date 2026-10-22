import React, { useRef, useState } from 'react';

/**
 * 날짜 입력 — 평소엔 YY.MM.DD로 짧게 표시. 클릭(포커스) 시 직접입력(YYYY-MM-DD) 가능,
 * 좌측 달력 아이콘 클릭 시 네이티브 달력. 직접입력으로 연도(2000 등)를 바로 타이핑할 수 있어 편함.
 *  - value   : 저장값. 기본 ISO(YYYY-MM-DD). ymd8=true면 YYYYMMDD(준공년도 등)
 *  - onChange: (저장값) => void
 */
// 입력 문자열 → ISO(YYYY-MM-DD). 8자리(YYYYMMDD)/6자리(YYMMDD)/구분자 포함 모두 허용.
function parseToIso(s) {
  const d = (s || '').replace(/[^0-9]/g, '');
  let y, m, day;
  if (d.length === 8) { y = d.slice(0, 4); m = d.slice(4, 6); day = d.slice(6, 8); }
  else if (d.length === 6) { const yy = parseInt(d.slice(0, 2), 10); y = String((yy >= 70 ? 1900 : 2000) + yy); m = d.slice(2, 4); day = d.slice(4, 6); }
  else return '';
  const mi = parseInt(m, 10); const di = parseInt(day, 10);
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return '';
  return `${y}-${m}-${day}`;
}

export default function DateInput({ value, onChange, style, ymd8 = false, placeholder = '', ...rest }) {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // 저장값 → ISO(YYYY-MM-DD)
  const iso = ymd8
    ? (value && value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : '')
    : (value || '');
  // ISO → 표시(YY.MM.DD)
  const display = iso && iso.length >= 10 ? `${iso.slice(2, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}` : '';

  const openPicker = () => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') { try { el.showPicker(); return; } catch (e) { /* fallthrough */ } }
    el.focus();
  };
  const handlePick = (e) => {
    const v = e.target.value; // YYYY-MM-DD
    onChange(ymd8 ? v.replace(/-/g, '') : v);
  };
  // 직접입력 확정(blur/Enter) — 파싱 성공 시 반영, 비우면 클리어
  const commit = () => {
    setEditing(false);
    const isoOut = parseToIso(draft);
    if (isoOut) onChange(ymd8 ? isoOut.replace(/-/g, '') : isoOut);
    else if (!draft.trim()) onChange('');
  };

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {/* 좌측 달력 아이콘 — 클릭 시 네이티브 달력 */}
      <button
        type="button" onClick={openPicker} title="달력에서 선택" tabIndex={-1}
        style={{ position: 'absolute', left: '3px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', padding: '2px', cursor: 'pointer', display: 'inline-flex' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5b4aa8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
      {/* 직접입력 가능한 표시 input — 포커스 시 YYYY-MM-DD 로 편집 */}
      <input
        type="text"
        value={editing ? draft : display}
        onFocus={() => { setEditing(true); setDraft(iso); }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
        placeholder={placeholder || 'YYYY-MM-DD'}
        style={{ ...style, textAlign: 'right', paddingLeft: '22px', paddingRight: '4px' }}
        {...rest}
      />
      {/* 네이티브 달력 — showPicker()로 호출 */}
      <input
        ref={ref}
        type="date"
        value={iso}
        onChange={handlePick}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, bottom: 0, width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', border: 'none', padding: 0 }}
      />
    </span>
  );
}

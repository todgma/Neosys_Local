import React from 'react';
import { X } from 'lucide-react';

/**
 * 거래금액 범위 필터 팝오버 (물건관리 · 공동중개망 · 고객관리 공용)
 *  - 상단: 안내문구(매매가 | 전세가 | 보증금 | 분양가) + 단위(억원/만원/원) → 매매/전세/보증금/분양가 금액에 적용
 *  - 하단: 월차임 + 단위(억원/만원/원) → 월차임/차임에 적용
 *  - value: { min, max, unit, monMin, monMax, monUnit }  (단위=억원|만원|원, 기존 '억' 호환)
 *  - onChange(next) / onClose() / position { x, y }
 */
const UNITS = ['억원', '만원', '원'];
const UNIT_MAN = { '억원': 10000, '억': 10000, '만원': 1, '원': 0.0001 };
const normUnit = (u) => (u === '억' ? '억원' : (UNIT_MAN[u] ? u : '만원'));

export default function PriceRangeFilter({ value, onChange, onClose, position }) {
  const v = value || {};
  const unit = normUnit(v.unit);
  const monUnit = normUnit(v.monUnit);
  const set = (patch) => onChange({ ...v, ...patch });
  // 단위 변경 시 실제 금액이 유지되도록 값 환산
  const conv = (val, from, to) => (val === '' || val == null) ? '' : String(Math.round(Number(val) * (UNIT_MAN[from] / UNIT_MAN[to]) * 10000) / 10000);
  const setUnit = (u) => { if (u === unit) return; set({ unit: u, min: conv(v.min ?? '', unit, u), max: conv(v.max ?? '', unit, u) }); };
  const setMonUnit = (u) => { if (u === monUnit) return; set({ monUnit: u, monMin: conv(v.monMin ?? '', monUnit, u), monMax: conv(v.monMax ?? '', monUnit, u) }); };

  const uBtn = (on) => ({ padding: '3px 10px', fontSize: '13px', fontWeight: 700, border: '1px solid ' + (on ? '#4f46e5' : '#cbd5e1'), background: on ? '#4f46e5' : 'white', color: on ? 'white' : '#475569', borderRadius: '4px', cursor: 'pointer' });
  const numIn = { width: '96px', padding: '5px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', boxSizing: 'border-box' };
  const unitGroup = (cur, on) => (
    <div style={{ display: 'flex', gap: '4px' }}>
      {UNITS.map((u) => <button key={u} type="button" style={uBtn(cur === u)} onClick={() => on(u)}>{u}</button>)}
    </div>
  );

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1300 }} onClick={onClose} />
      <div style={{ position: 'fixed', left: `${Math.max(8, position?.x || 8)}px`, top: `${position?.y || 60}px`, zIndex: 1301, width: '360px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '14px' }} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>거래금액</span>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-5 h-5" /></button>
        </div>

        {/* 안내문구 + 단위 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>매매가 | 전세가 | 보증금 | 분양가</span>
          {unitGroup(unit, setUnit)}
        </div>
        {/* 매매/전세/보증금/분양 범위 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <input type="number" value={v.min ?? ''} onChange={(e) => set({ min: e.target.value })} placeholder="최소" style={numIn} />
          <span style={{ color: '#94a3b8' }}>~</span>
          <input type="number" value={v.max ?? ''} onChange={(e) => set({ max: e.target.value })} placeholder="최대" style={numIn} />
          <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{unit}</span>
        </div>

        {/* 월차임 + 단위 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>월차임</span>
          {unitGroup(monUnit, setMonUnit)}
        </div>
        {/* 월차임 범위 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input type="number" value={v.monMin ?? ''} onChange={(e) => set({ monMin: e.target.value })} placeholder="최소" style={numIn} />
          <span style={{ color: '#94a3b8' }}>~</span>
          <input type="number" value={v.monMax ?? ''} onChange={(e) => set({ monMax: e.target.value })} placeholder="최대" style={numIn} />
          <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{monUnit}</span>
        </div>

        {/* 조건삭제 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button type="button" onClick={() => set({ min: '', max: '', monMin: '', monMax: '' })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#64748b', borderRadius: '6px', cursor: 'pointer' }}>↺ 조건삭제</button>
        </div>
      </div>
    </>
  );
}

// 필터값 → 만원 환산 유틸 (각 페이지 비교 로직 공용)
export const priceUnitToMan = (val, unit) => Number(val) * (UNIT_MAN[unit] ?? 1);

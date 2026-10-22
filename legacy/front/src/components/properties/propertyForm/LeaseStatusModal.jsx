import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Eraser } from 'lucide-react';

/**
 * 임대차현황서 모달 (건물폼 등)
 * - 호실별 임대차 현황을 직접 입력하는 표 (기본 3행, 행추가/삭제)
 * - controlled: rows = formData.leaseRows, 변경 시 onChange(rows) 호출 → 물건 저장 시 함께 전송(pt_lease_status)
 */
const makeRow = () => ({
  roomNo: '', area: '', curStatus: '', deposit: '', monthlyRent: '', maintCost: '',
  contractStart: '', contractEnd: '', businessType: '', businessName: '',
});

const COLS = [
  { key: 'roomNo', label: '호실', type: 'text', w: '7%' },
  { key: 'area', label: '면적', type: 'number', w: '8%' },
  { key: 'curStatus', label: '현상태', type: 'text', w: '9%' },
  { key: 'deposit', label: '보증금', type: 'number', w: '9%' },
  { key: 'monthlyRent', label: '월차임', type: 'number', w: '9%' },
  { key: 'maintCost', label: '관리비', type: 'number', w: '8%' },
  { key: 'contractStart', label: '계약개시일', type: 'date', w: '11%' },
  { key: 'contractEnd', label: '계약만기일', type: 'date', w: '11%' },
  { key: 'businessType', label: '업종', type: 'text', w: '8%' },
  { key: 'businessName', label: '상호', type: 'text', w: '10%' },
];

export default function LeaseStatusModal({ open, onClose, formData = {}, onChange }) {
  if (!open) return null;

  // controlled: formData.leaseRows 없으면 기본 3행 표시(편집 시 formData로 승격)
  const rows = (Array.isArray(formData.leaseRows) && formData.leaseRows.length)
    ? formData.leaseRows
    : [makeRow(), makeRow(), makeRow()];
  const commit = (next) => onChange && onChange(next);

  const address = [formData.addr1, formData.addr2, formData.addr3, formData.jibun, formData.addr5]
    .filter(Boolean)
    .join(' ');
  const today = new Date().toISOString().slice(0, 10);

  const n = (v) => parseFloat(v) || 0;
  const sum = (key) => rows.reduce((a, r) => a + n(r[key]), 0);
  const fmt = (v) => (v ? v.toLocaleString() : '');

  const addRow = () => commit([...rows, makeRow()]);
  const deleteRow = (idx) => commit(rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx));
  const clearRow = (idx) => commit(rows.map((r, i) => (i === idx ? makeRow() : r)));
  const updateRow = (idx, key, value) => commit(rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  const th = { border: '1px solid #cbd5e1', padding: '6px 4px', fontSize: '13px', fontWeight: 700, color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap', background: '#f8fafc' };
  const td = { border: '1px solid #e2e8f0', padding: '0', textAlign: 'center' };
  const cellIn = { width: '100%', border: 'none', outline: 'none', fontSize: '13px', textAlign: 'center', background: 'transparent', boxSizing: 'border-box', padding: '6px 3px' };
  const sumTd = { border: '1px solid #e2e8f0', padding: '6px 3px', fontSize: '13px', fontWeight: 700, textAlign: 'center', background: '#f8fafc' };

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className="lease-status-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '1120px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: '8px', boxShadow: '0 12px 32px rgba(0,0,0,0.22)', padding: '20px 24px' }}
      >
        <style>{`
          .lease-status-modal input[type=number]::-webkit-inner-spin-button,
          .lease-status-modal input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
          .lease-status-modal input[type=number] { -moz-appearance: textfield; }
        `}</style>
        {/* 제목 */}
        <div style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>임대차현황서</div>

        {/* 소재지 + 기준일 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', color: '#1e293b' }}>{address || '-'}</span>
          <span style={{ fontSize: '13px', color: '#475569' }}>{today} 기준</span>
        </div>

        {/* 표 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            {COLS.map((c) => (
              <col key={c.key} style={{ width: c.w }} />
            ))}
            <col style={{ width: '62px' }} />
          </colgroup>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} style={th}>{c.label}</th>
              ))}
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {COLS.map((c) => (
                  <td key={c.key} style={td}>
                    <input
                      type={c.type}
                      value={row[c.key]}
                      onChange={(e) => updateRow(i, c.key, e.target.value)}
                      style={cellIn}
                    />
                  </td>
                ))}
                <td style={{ ...td, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <button type="button" onClick={() => clearRow(i)} title="내용 지우기" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: '2px' }}>
                      <Eraser size={14} />
                    </button>
                    <button type="button" onClick={() => deleteRow(i)} title="행 삭제" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', padding: '2px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* 합계 */}
            <tr>
              <td style={sumTd}>합계</td>
              <td style={sumTd}>&nbsp;</td>
              <td style={sumTd}>&nbsp;</td>
              <td style={sumTd}>{fmt(sum('deposit'))}</td>
              <td style={sumTd}>{fmt(sum('monthlyRent'))}</td>
              <td style={sumTd}>{fmt(sum('maintCost'))}</td>
              <td style={sumTd} colSpan={5}>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* 행 추가 (가운데) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <button
            type="button"
            onClick={addRow}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', fontSize: '13px', fontWeight: 600, border: '1px dashed #6366f1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer' }}
          >
            <Plus size={14} /> 행 추가
          </button>
        </div>

        {/* 닫기 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#475569', cursor: 'pointer' }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

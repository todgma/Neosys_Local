import React from 'react';
import { createPortal } from 'react-dom';

/**
 * 삭제 방식 선택 모달 — 여러 선택지(이력 저장 후 삭제 / 영구 삭제 등)를 제시
 *
 * 사용 예:
 *   <DeleteChoiceDialog
 *     open={showDelete}
 *     title="고객 삭제"
 *     options={[
 *       { label: '고객의 이력에 저장 후 삭제합니다', onSelect: () => doDelete(true) },
 *       { label: '영구히 삭제합니다', color: '#dc2626', onSelect: () => doDelete(false) },
 *     ]}
 *     onCancel={() => setShowDelete(false)}
 *   />
 */
export default function DeleteChoiceDialog({ open, title = '삭제', message, options = [], onCancel }) {
  if (!open) return null;

  return createPortal(
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: '320px', maxWidth: '420px', background: 'white', borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,0.22)', padding: '18px', animation: 'confirmPop 0.12s ease-out' }}
      >
        {title && <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>{title}</div>}
        {message && <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '14px', whiteSpace: 'pre-line' }}>{message}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: message || title ? 0 : '2px' }}>
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={opt.onSelect}
              style={{
                padding: '10px 14px', fontSize: '13px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${opt.color || '#4f46e5'}`,
                background: opt.color || '#4f46e5',
                color: 'white',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#475569', cursor: 'pointer' }}
          >
            취소
          </button>
        </div>
      </div>
      <style>{`@keyframes confirmPop { from { transform: scale(0.96); opacity: 0.4; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>,
    document.body
  );
}

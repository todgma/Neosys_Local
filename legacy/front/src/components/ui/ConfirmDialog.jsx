import React from 'react';
import { createPortal } from 'react-dom';

/**
 * 공통 확인 모달 (window.confirm 대체)
 * - 토스트처럼 가벼운 카드 형태의 예/아니오 확인
 *
 * 사용 예:
 *   const [confirm, setConfirm] = useState(null); // { message, onConfirm }
 *   <ConfirmDialog
 *     open={!!confirm}
 *     message={confirm?.message}
 *     onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
 *     onCancel={() => setConfirm(null)}
 *   />
 */
export default function ConfirmDialog({
  open,
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmColor = '#dc2626',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(15,23,42,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          minWidth: '280px', maxWidth: '380px',
          background: 'white', borderRadius: '10px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
          padding: '18px 18px 14px',
          animation: 'confirmPop 0.12s ease-out',
        }}
      >
        <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-line', marginBottom: '16px' }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#475569', cursor: 'pointer' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '6px', background: confirmColor, color: 'white', cursor: 'pointer' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`@keyframes confirmPop { from { transform: scale(0.96); opacity: 0.4; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>,
    document.body
  );
}

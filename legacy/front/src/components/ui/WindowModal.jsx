import React from 'react';
import { X } from 'lucide-react';

/**
 * 새 창에서 사용하는 모달 래퍼
 * overlay 없이 전체 화면을 차지
 */
const WindowModal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="window-modal-wrapper">
      <div className="window-modal-container">
        {/* 헤더 */}
        <div className="window-modal-header">
          <h2 className="window-modal-title">{title}</h2>
          <button onClick={onClose} className="window-modal-close-btn">
            <X className="icon-close" />
          </button>
        </div>

        {/* 바디 */}
        <div className="window-modal-body">{children}</div>

        {/* 푸터 */}
        {footer && <div className="window-modal-footer">{footer}</div>}
      </div>

      <style jsx>{`
        .window-modal-wrapper {
          position: fixed;
          inset: 0;
          background-color: #f9fafb;
        }

        .window-modal-container {
          width: 100%;
          height: 100%;
          background-color: white;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .window-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          background-color: white;
          flex-shrink: 0;
        }

        .window-modal-title {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .window-modal-close-btn {
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: background-color 0.2s;
          border: none;
          background: none;
          cursor: pointer;
        }

        .window-modal-close-btn:hover {
          background-color: #f3f4f6;
        }

        .icon-close {
          width: 1.25rem;
          height: 1.25rem;
        }

        .window-modal-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .window-modal-footer {
          border-top: 1px solid #e5e7eb;
          background-color: #f9fafb;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default WindowModal;

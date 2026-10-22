import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * 크기 조절 가능한 모달 컴포넌트
 */
const ResizableModal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  initialWidth = 900,
  initialHeight = 600,
  minWidth = 400,
  minHeight = 300,
  autoFit = false, // true면 창 크기에 맞춰 채우고 리사이즈에도 추종(하단바 고정)
}) => {
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const modalRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  // 모달이 열릴 때 중앙 배치
  useEffect(() => {
    if (isOpen && modalRef.current && !autoFit) {
      const modalRect = modalRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - modalRect.width) / 2,
        y: (window.innerHeight - modalRect.height) / 2,
      });
    }
  }, [isOpen]);

  // autoFit: 창 크기에 맞춰 채우고 리사이즈에도 추종 (하단바가 항상 바닥에)
  useEffect(() => {
    if (!isOpen || !autoFit) return;
    // autoFit에서는 minWidth/minHeight 상한 클램프를 무시하고 창 크기를 그대로 따라감
    // (창을 줄여도 모달이 창보다 커지지 않아 하단 고정바가 항상 바닥에 보임)
    const fit = () => {
      const w = Math.max(320, window.innerWidth - 24);
      const h = Math.max(200, window.innerHeight - 24);
      setSize({ width: w, height: h });
      setPosition({ x: Math.max(0, (window.innerWidth - w) / 2), y: Math.max(0, (window.innerHeight - h) / 2) });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [isOpen, autoFit, minWidth, minHeight]);

  // 드래그 시작
  const handleMouseDownDrag = (e) => {
    if (e.target.closest('.modal-header') && !e.target.closest('button')) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  // 리사이즈 시작
  const handleMouseDownResize = (e, direction) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStart.current = {
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
    };
  };

  // 마우스 이동 처리
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }

      if (isResizing && resizeDirection) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;

        let newWidth = resizeStart.current.width;
        let newHeight = resizeStart.current.height;
        let newX = position.x;
        let newY = position.y;

        if (resizeDirection.includes('e')) {
          newWidth = Math.max(minWidth, resizeStart.current.width + deltaX);
        }
        if (resizeDirection.includes('w')) {
          const proposedWidth = resizeStart.current.width - deltaX;
          if (proposedWidth >= minWidth) {
            newWidth = proposedWidth;
            newX = position.x + deltaX;
          }
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(minHeight, resizeStart.current.height + deltaY);
        }
        if (resizeDirection.includes('n')) {
          const proposedHeight = resizeStart.current.height - deltaY;
          if (proposedHeight >= minHeight) {
            newHeight = proposedHeight;
            newY = position.y + deltaY;
          }
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, resizeDirection, position, size.width, size.height, minWidth, minHeight]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div
        ref={modalRef}
        className="modal-container"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          left: `${position.x}px`,
          top: `${position.y}px`,
          position: 'fixed',
        }}
      >
        {/* 리사이즈 핸들들 */}
        <div className="resize-handle resize-n" onMouseDown={(e) => handleMouseDownResize(e, 'n')} />
        <div className="resize-handle resize-s" onMouseDown={(e) => handleMouseDownResize(e, 's')} />
        <div className="resize-handle resize-e" onMouseDown={(e) => handleMouseDownResize(e, 'e')} />
        <div className="resize-handle resize-w" onMouseDown={(e) => handleMouseDownResize(e, 'w')} />
        <div className="resize-handle resize-ne" onMouseDown={(e) => handleMouseDownResize(e, 'ne')} />
        <div className="resize-handle resize-nw" onMouseDown={(e) => handleMouseDownResize(e, 'nw')} />
        <div className="resize-handle resize-se" onMouseDown={(e) => handleMouseDownResize(e, 'se')} />
        <div className="resize-handle resize-sw" onMouseDown={(e) => handleMouseDownResize(e, 'sw')} />

        {/* 헤더 */}
        <div
          className="modal-header"
          onMouseDown={handleMouseDownDrag}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} className="modal-close-btn">
            <X className="icon-close" />
          </button>
        </div>

        {/* 바디 */}
        <div className="modal-body">
          {children}
        </div>

        {/* 푸터 */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          background-color: rgba(0, 0, 0, 0.5);
        }

        .modal-container {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: fixed;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          user-select: none;
        }

        .modal-title {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .modal-close-btn {
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: background-color 0.2s;
          border: none;
          background: none;
          cursor: pointer;
        }

        .modal-close-btn:hover {
          background-color: #f3f4f6;
        }

        .icon-close {
          width: 1.25rem;
          height: 1.25rem;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .modal-footer {
          border-top: 1px solid #e5e7eb;
          background-color: #f9fafb;
          flex-shrink: 0;
        }

        /* 리사이즈 핸들 */
        .resize-handle {
          position: absolute;
          z-index: 10;
        }

        .resize-n, .resize-s {
          left: 0;
          right: 0;
          height: 8px;
          cursor: ns-resize;
        }

        .resize-n {
          top: 0;
        }

        .resize-s {
          bottom: 0;
        }

        .resize-e, .resize-w {
          top: 0;
          bottom: 0;
          width: 8px;
          cursor: ew-resize;
        }

        .resize-e {
          right: 0;
        }

        .resize-w {
          left: 0;
        }

        .resize-ne, .resize-nw, .resize-se, .resize-sw {
          width: 12px;
          height: 12px;
        }

        .resize-ne {
          top: 0;
          right: 0;
          cursor: nesw-resize;
        }

        .resize-nw {
          top: 0;
          left: 0;
          cursor: nwse-resize;
        }

        .resize-se {
          bottom: 0;
          right: 0;
          cursor: nwse-resize;
        }

        .resize-sw {
          bottom: 0;
          left: 0;
          cursor: nesw-resize;
        }
      `}</style>
    </div>
  );
};

export default ResizableModal;

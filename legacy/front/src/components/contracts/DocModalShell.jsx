import { useState } from 'react';

/**
 * 거래관련서식 공통 상단 다크바 셸 — 계약서 미리보기 바와 동일한 형태.
 *  · 좌상단: 문서명(title)
 *  · 우측: 배율(−/100%/+) · 저장(onSave 있을 때) · 인쇄 · PDF로 저장 · 닫기
 *  · 본문(children)은 배율(zoom)이 적용되는 스크롤 영역에 렌더
 *
 *  props: title, onClose, onSave?(), onPrint?(), children
 */
export default function DocModalShell({ title, onClose, onSave, onPrint, children }) {
  const [zoom, setZoom] = useState(1);
  const [preview, setPreview] = useState(false); // 출력 미리보기(입력창 숨김) 모드
  const z = (d) => setZoom((v) => Math.min(2, Math.max(0.5, Math.round((v + d) * 10) / 10)));

  const barBtn = { padding: '7px 16px', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' };
  const zBtn = { padding: '4px 12px', fontSize: '16px', fontWeight: 800, background: '#fff', color: '#1f2937', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', lineHeight: 1 };

  return (
    <div className="doc-shell-ov" style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}>
      <style>{`
        @media print {
          .doc-shell-ov { position: static !important; background: #fff !important; padding: 0 !important; display: block !important; z-index: auto !important; }
          .doc-shell-card { width: auto !important; height: auto !important; max-width: none !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
          .doc-shell-body { overflow: visible !important; background: #fff !important; }
          .doc-shell-body > div { zoom: 1 !important; }
        }
        /* 출력 미리보기: 입력창(테두리/배경) 숨기고 값 텍스트만 — 실제 인쇄 모습 */
        .doc-preview input, .doc-preview select, .doc-preview textarea {
          border: none !important; background: transparent !important; outline: none !important;
          box-shadow: none !important; -webkit-appearance: none !important; appearance: none !important;
          border-radius: 0 !important; color: #111827 !important; cursor: default !important;
        }
        .doc-preview input::placeholder, .doc-preview textarea::placeholder { color: transparent !important; }
        .doc-preview select::-ms-expand { display: none !important; }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} className="doc-shell-card"
        style={{ width: '960px', maxWidth: '96vw', height: '92vh', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 16px 44px rgba(0,0,0,0.32)', display: 'flex', flexDirection: 'column' }}>
        {/* 상단 다크바 (계약서 미리보기와 동일) — 버튼 visible은 미리보기 모드로 제어 */}
        <div className="no-print" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 16px', background: '#1f2937', color: '#fff' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}{preview && <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 700, color: '#93c5fd' }}>· 출력 미리보기</span>}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
              <button type="button" onClick={() => z(-0.1)} title="축소" style={zBtn}>−</button>
              <span style={{ minWidth: '46px', textAlign: 'center', fontSize: '13px', fontWeight: 800 }}>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => z(0.1)} title="확대" style={zBtn}>+</button>
            </span>
            {!preview && (
              <>
                {onSave && <button type="button" onClick={onSave} style={{ ...barBtn, background: '#059669', color: '#fff' }}>저장</button>}
                <button type="button" onClick={() => setPreview(true)} style={{ ...barBtn, background: '#4f46e5', color: '#fff' }}>미리보기 및 인쇄</button>
              </>
            )}
            {preview && (
              <>
                <button type="button" onClick={() => setPreview(false)} style={{ ...barBtn, background: '#fff', color: '#1f2937', border: '1px solid #cbd5e1' }}>◀ 편집</button>
                {onPrint && <button type="button" onClick={onPrint} style={{ ...barBtn, background: '#4f46e5', color: '#fff' }}>인쇄</button>}
                {onPrint && <button type="button" onClick={onPrint} style={{ ...barBtn, background: '#fff', color: '#1f2937', border: '1px solid #cbd5e1' }}>PDF로 저장</button>}
              </>
            )}
            <button type="button" onClick={onClose} style={{ ...barBtn, background: '#e5e7eb', color: '#1f2937', border: '1px solid #cbd5e1' }}>닫기</button>
          </div>
        </div>
        {/* 본문 — 배율 적용 스크롤 영역 (미리보기 시 입력창 숨김) */}
        <div className={`doc-shell-body${preview ? ' doc-preview' : ''}`} style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#f1f5f9' }}>
          <div style={{ zoom }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

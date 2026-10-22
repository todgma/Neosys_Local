import { X, Download, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TRADE_FORMS, downloadForm } from '../../constants/tradeForms';

/**
 * 자료실 — 서류 파일들을 개별/전체로 내려받는 모달
 *  - 파일은 front/public/forms/ 에 "<이름>.hwp" 로 배치(추후). 미배치 시 안내 토스트.
 */
export default function DataRoomModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const one = async (name) => {
    try { await downloadForm(name); toast.success(`${name} 다운로드`); }
    catch (e) { if (e?.name === 'AbortError') return; toast.error('아직 파일이 준비되지 않았습니다.'); }
  };

  const all = async () => {
    if (!window.confirm('전체 서류를 다운로드 하시겠습니까?')) return;
    let ok = 0, fail = 0;
    for (const name of TRADE_FORMS) {
      try { await downloadForm(name); ok += 1; }
      catch (e) { if (e?.name === 'AbortError') break; fail += 1; }
    }
    if (ok) toast.success(`${ok}건 다운로드${fail ? ` · ${fail}건 실패` : ''}`);
    else toast.error('아직 파일이 준비되지 않았습니다.');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: '460px', maxWidth: '92vw', maxHeight: '82vh', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
            <FileText className="w-5 h-5" style={{ color: '#4f46e5' }} />자료실
          </div>
          <button onClick={onClose} title="닫기" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', display: 'inline-flex' }}><X className="w-5 h-5" /></button>
        </div>
        {/* 서류 목록 */}
        <div style={{ padding: '8px 14px', overflowY: 'auto' }}>
          {TRADE_FORMS.map((name) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '9px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '13px', color: '#374151' }}>{name}</span>
              <button onClick={() => one(name)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '5px', background: 'white', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <Download className="w-3.5 h-3.5" />받기
              </button>
            </div>
          ))}
        </div>
        {/* 하단 액션 */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onClose} style={{ padding: '8px 14px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', color: '#374151', cursor: 'pointer' }}>닫기</button>
          <button onClick={all} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '6px', background: '#4f46e5', color: 'white', cursor: 'pointer' }}>
            <Download className="w-4 h-4" />전체 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

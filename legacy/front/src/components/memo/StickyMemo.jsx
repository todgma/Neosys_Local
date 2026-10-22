import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { memoService } from '../../services/memoService';
import { useAuthStore } from '../../stores/authStore';

/**
 * 스티커 메모 — 급한 내용을 그냥 붙여두는 간단 메모 보드
 * - 사용자별 백엔드 저장(rt_sticky_memo). 내용은 디바운스 자동저장. (로그인 전용)
 * - 색상 순환, 추가/삭제/자동저장
 */
const COLORS = ['#fef08a', '#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e9d5ff', '#fecaca'];

const StickyMemo = ({ isOpen, onClose, standalone = false }) => {
  const { user } = useAuthStore();
  const userId = user?.userId || null;
  const [notes, setNotes] = useState([]);
  const saveTimers = useRef({}); // 노트별 디바운스 타이머

  // 로드: 백엔드(사용자별)
  useEffect(() => {
    if (!standalone && !isOpen) return;
    if (!userId) { setNotes([]); return; }
    let cancelled = false;
    (async () => {
      const res = await memoService.getList(userId);
      if (!cancelled && res.success) {
        setNotes((res.data || []).map((m) => ({ id: m.memoId, text: m.content || '', color: m.color || COLORS[0] })));
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, standalone, userId]);

  const addNote = async () => {
    if (!userId) return;
    const color = COLORS[notes.length % COLORS.length];
    const res = await memoService.create({ userId, content: '', color });
    if (res.success && res.data) {
      setNotes((prev) => [{ id: res.data.memoId, text: '', color: res.data.color || color }, ...prev]);
    }
  };

  const updateNote = (id, text) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    if (!userId) return;
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => { memoService.update(id, { content: text, userId }); }, 600);
  };

  const removeNote = async (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (userId) { clearTimeout(saveTimers.current[id]); await memoService.delete(id, userId); }
  };

  const cycleColor = (id) => {
    if (!userId) return;
    let newColor;
    setNotes((prev) => prev.map((n) => {
      if (n.id !== id) return n;
      newColor = COLORS[(COLORS.indexOf(n.color) + 1) % COLORS.length];
      return { ...n, color: newColor };
    }));
    if (newColor) memoService.update(id, { color: newColor, userId });
  };

  if (!standalone && !isOpen) return null;

  // 별도 창(standalone)이면 창 전체를 채우고, 모달이면 오버레이 + 중앙 카드
  const boardStyle = standalone
    ? { width: '100%', height: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { width: '700px', maxWidth: '95vw', height: '560px', maxHeight: '90vh', background: '#f8fafc', borderRadius: '12px', boxShadow: '0 16px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' };

  const board = (
    <div onClick={(e) => e.stopPropagation()} style={boardStyle}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>메모 <span style={{ fontSize: '18px', fontWeight: 500, color: '#94a3b8' }}>({notes.length})</span></span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={addNote}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              <Plus size={15} /> 메모 추가
            </button>
            <button type="button" onClick={onClose}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '13px', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              <X size={15} /> 닫기
            </button>
          </div>
        </div>

        {/* 메모 보드 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignContent: 'flex-start' }}>
          {notes.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '40px 0' }}>
              메모가 없습니다. “메모 추가”를 눌러 급한 내용을 붙여두세요.
            </div>
          ) : (
            notes.map((n) => (
              <div key={n.id} style={{ width: 'calc((100% - 12px) / 2)', minHeight: '180px', background: n.color, borderRadius: '4px', boxShadow: '0 3px 8px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', padding: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginBottom: '2px' }}>
                  <button type="button" onClick={() => cycleColor(n.id)} title="색 변경"
                    style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 0 }} />
                  <button type="button" onClick={() => removeNote(n.id)} title="삭제"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7c2d12', display: 'inline-flex' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={n.text}
                  onChange={(e) => updateNote(n.id, e.target.value)}
                  placeholder="메모 입력…"
                  style={{ flex: 1, width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontSize: '13px', lineHeight: 1.5, color: '#1e293b', fontFamily: 'inherit' }}
                />
              </div>
            ))
          )}
        </div>
      </div>
  );

  if (standalone) return board;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      {board}
    </div>
  );
};

export default StickyMemo;

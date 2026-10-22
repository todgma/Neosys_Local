import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Building, User } from 'lucide-react';
import { searchUnified } from '../../services/unifiedSearchService';
import { useAuthStore } from '../../stores/authStore';

/**
 * 통합 연락처 검색 모달 (공통) — 내 물건(소유자/임차인) + 고객(구입자)을 검색해
 * 체크박스로 다중 선택 후 onConfirm(selectedItems)로 전달.
 *  props:
 *   - open, onClose
 *   - onConfirm(items)   선택된 통합 항목 배열
 *   - title              모달 제목(기본: 통합검색)
 *   - confirmLabel       확인 버튼 라벨(기본: 추가)
 */
export default function UnifiedContactSearchModal({ open, onClose, onConfirm, title = '통합검색', confirmLabel = '추가' }) {
  const { user } = useAuthStore();
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState([]); // 선택된 item.id
  const timer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ(''); setItems([]); setSel([]);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // 디바운스 검색(자동완성)
  useEffect(() => {
    if (!open) return;
    clearTimeout(timer.current);
    if (!q.trim()) { setItems([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const { items } = await searchUnified(q, { user });
        setItems(items);
      } catch (e) {
        console.error('통합검색 실패:', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  const selectedItems = useMemo(() => items.filter((it) => sel.includes(it.id)), [items, sel]);
  const toggle = (id) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (!open) return null;

  const confirm = () => { onConfirm?.(selectedItems); onClose?.(); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ width: '640px', maxWidth: '96vw', height: '620px', maxHeight: '92vh', background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>
        </div>

        {/* 검색창 */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef1f5' }}>
          <div style={{ position: 'relative' }}>
            <Search className="w-4 h-4" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input ref={inputRef} type="text" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="물건(소유자/임차인) · 고객(구입자) 통합검색 — 이름/주소/연락처"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 32px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', color: '#111827' }} />
          </div>
        </div>

        {/* 결과 목록 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>검색 중...</div>
          ) : !q.trim() ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>검색어를 입력하세요.<br />물건의 소유자·임차인, 고객(구입자)을 함께 찾습니다.</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>검색 결과가 없습니다.</div>
          ) : (
            items.map((it) => {
              const on = sel.includes(it.id);
              return (
                <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', borderBottom: '1px solid #f4f6f9', cursor: 'pointer', background: on ? '#eef2ff' : 'white' }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(it.id)} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, fontSize: '12px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: it.kind === 'PT' ? '#dcfce7' : '#dbeafe', color: it.kind === 'PT' ? '#15803d' : '#1e40af' }}>
                    {it.kind === 'PT' ? <Building className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}{it.badge}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.sub}{it.phone ? ` · ${it.phone}` : ''}</span>
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* 하단: 선택 수 + 확인 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>선택 {sel.length}건</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#374151', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
            <button type="button" onClick={confirm} disabled={sel.length === 0}
              style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, border: '1px solid #4f46e5', background: sel.length === 0 ? '#c7d2fe' : '#4f46e5', color: 'white', borderRadius: '6px', cursor: sel.length === 0 ? 'default' : 'pointer' }}>
              {confirmLabel}{sel.length > 0 ? ` (${sel.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

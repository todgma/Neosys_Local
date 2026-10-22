import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import addressService from '../../services/common/addressService';
import { toast } from 'react-hot-toast';

/**
 * 구입희망지역 선택 모달
 * 시/도 → 시/군/구 → 읍/면/동 트리를 펼쳐 체크박스로 다중 선택 후 적용
 */
const RegionTreeModal = ({ isOpen, onClose, onApply }) => {
  const [sidos, setSidos] = useState([]);
  const [childrenMap, setChildrenMap] = useState({}); // bjdCode -> children[]
  const [expanded, setExpanded] = useState(() => new Set());
  const [loading, setLoading] = useState(() => new Set());
  const [checked, setChecked] = useState({}); // bjdCode -> { addr1, addr2, addr3, bjdCode }

  useEffect(() => {
    if (!isOpen) return;
    setChecked({});
    setExpanded(new Set());
    setChildrenMap({});
    (async () => {
      try {
        const data = await addressService.getSidoList();
        setSidos((data || []).map((s) => ({ bjdCode: s.bjdCode, bjdName: s.bjdName, level: 'sido', addr1: s.bjdName })));
      } catch (e) {
        console.error('시도 목록 조회 실패:', e);
        toast.error('지역 목록을 불러오지 못했습니다.');
      }
    })();
  }, [isOpen]);

  const loadChildren = async (node) => {
    if (childrenMap[node.bjdCode]) return;
    setLoading((prev) => new Set(prev).add(node.bjdCode));
    try {
      let raw = [];
      if (node.level === 'sido') {
        const data = await addressService.getSigunguList(node.bjdCode);
        raw = (data || []).map((c) => ({ bjdCode: c.bjdCode, bjdName: c.bjdName, level: 'sigungu', addr1: node.addr1, addr2: c.bjdName, parentCode: node.bjdCode }));
      } else if (node.level === 'sigungu') {
        const data = await addressService.getEupMyeonDongList(node.bjdCode);
        raw = (data || []).map((c) => ({ bjdCode: c.bjdCode, bjdName: c.bjdName, level: 'emd', addr1: node.addr1, addr2: node.addr2, addr3: c.bjdName, parentCode: node.bjdCode }));
      }
      setChildrenMap((prev) => ({ ...prev, [node.bjdCode]: raw }));
    } catch (e) {
      console.error('하위 지역 조회 실패:', e);
      toast.error('하위 지역을 불러오지 못했습니다.');
    } finally {
      setLoading((prev) => { const n = new Set(prev); n.delete(node.bjdCode); return n; });
    }
  };

  const toggleExpand = async (node) => {
    const willExpand = !expanded.has(node.bjdCode);
    if (willExpand) await loadChildren(node);
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(node.bjdCode)) n.delete(node.bjdCode); else n.add(node.bjdCode);
      return n;
    });
  };

  const toggleCheck = (node) => {
    setChecked((prev) => {
      const n = { ...prev };
      if (n[node.bjdCode]) { delete n[node.bjdCode]; return n; }
      n[node.bjdCode] = { addr1: node.addr1 || '', addr2: node.addr2 || '', addr3: node.addr3 || '', bjdCode: node.bjdCode };
      // 하위 읍/면/동을 모두 체크하면 상위 시/군/구 하나로 자동 합침
      if (node.level === 'emd' && node.parentCode) {
        const siblings = childrenMap[node.parentCode];
        if (siblings && siblings.length > 0 && siblings.every((s) => n[s.bjdCode])) {
          siblings.forEach((s) => { delete n[s.bjdCode]; });
          n[node.parentCode] = { addr1: node.addr1 || '', addr2: node.addr2 || '', addr3: '', bjdCode: node.parentCode };
        }
      }
      return n;
    });
  };

  const removeChecked = (bjdCode) => setChecked((prev) => { const n = { ...prev }; delete n[bjdCode]; return n; });

  const renderNode = (node, depth) => {
    const isExpandable = node.level !== 'emd';
    const isOpen2 = expanded.has(node.bjdCode);
    const kids = childrenMap[node.bjdCode] || [];
    return (
      <div key={node.bjdCode}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0', paddingLeft: `${depth * 18}px` }}>
          {isExpandable ? (
            <button type="button" onClick={() => toggleExpand(node)} style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', fontSize: 12, lineHeight: 1 }}>
              {isOpen2 ? '▾' : '▸'}
            </button>
          ) : (<span style={{ width: 18, display: 'inline-block' }} />)}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#1e293b' }}>
            <input type="checkbox" checked={!!checked[node.bjdCode]} onChange={() => toggleCheck(node)} style={{ cursor: 'pointer' }} />
            <span>{node.bjdName}</span>
          </label>
          {loading.has(node.bjdCode) && <span style={{ fontSize: 11, color: '#94a3b8' }}>불러오는 중…</span>}
        </div>
        {isOpen2 && kids.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  if (!isOpen) return null;

  const selectedList = Object.values(checked);
  const handleApply = () => {
    if (selectedList.length === 0) { toast.error('지역을 하나 이상 선택하세요.'); return; }
    onApply && onApply(selectedList.map((r) => ({
      addr1: r.addr1 || '', addr2: r.addr2 || '', addr3: r.addr3 || '',
      bjdCode: r.bjdCode || '', bldNm: '', danjiCode: '', detailLoc: '',
    })));
    onClose && onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '8px', width: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>구입희망지역 선택</div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        {/* 트리 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 16px', minHeight: '240px' }}>
          {sidos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '13px' }}>지역 목록을 불러오는 중…</div>
          ) : (
            sidos.map((s) => renderNode(s, 0))
          )}
        </div>

        {/* 선택된 지역 칩 */}
        {selectedList.length > 0 && (
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflow: 'auto' }}>
            {selectedList.map((r) => (
              <span key={r.bjdCode} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', fontSize: '11px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', color: '#3730a3' }}>
                {[r.addr1, r.addr2, r.addr3].filter(Boolean).join(' ')}
                <button type="button" onClick={() => removeChecked(r.bjdCode)} style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
        )}

        {/* 푸터 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 16px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#475569', cursor: 'pointer' }}>취소</button>
          <button type="button" onClick={handleApply} style={{ padding: '6px 16px', fontSize: '13px', border: 'none', borderRadius: '6px', background: '#4f46e5', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
            적용{selectedList.length > 0 ? ` (${selectedList.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegionTreeModal;

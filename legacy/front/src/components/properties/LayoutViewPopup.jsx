import React, { useState } from 'react';
import { X } from 'lucide-react';
import AddressSelectorSimple from '../property/AddressSelectorSimple';
import LayoutView from './LayoutView';

/**
 * 배치도 팝업 — 아파트 단지를 검색(시/도·시/군/구·읍/면/동 → 단지)해서
 * 선택한 단지의 배치도를 팝업으로 보여준다. (LayoutView 재사용, 점유상태 등 동일)
 */
const LayoutViewPopup = ({ isOpen, onClose }) => {
  const [addr, setAddr] = useState({});
  const [addrKey, setAddrKey] = useState(0);
  const [danjiList, setDanjiList] = useState([]);
  const [selectedDanji, setSelectedDanji] = useState(null);
  const [ptType, setPtType] = useState('SYCA101'); // 매물유형(아파트/오피스텔/주상복합/분양권) — 단지 검색 기준

  if (!isOpen) return null;

  const updateAddr = (field, value) => setAddr((p) => ({ ...p, [field]: value }));

  const handleDanjiSelect = (e) => {
    const code = e.target.value;
    const sel = danjiList.find((d) => String(d.naverDanjiCode) === String(code));
    setSelectedDanji(sel ? { danjiCode: sel.naverDanjiCode, danjiName: sel.buildingName } : null);
  };

  const handleReset = () => {
    setAddr({});
    setDanjiList([]);
    setSelectedDanji(null);
    setAddrKey((k) => k + 1);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더: 아파트 단지 검색 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontSize: '22px', fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>배치도</span>
        <span style={{ fontSize: '16px', color: '#000', whiteSpace: 'nowrap', paddingLeft: '8px', borderLeft: '2px solid #d1d5db' }}>아파트 단지 검색</span>
        <select
          value={ptType}
          onChange={(e) => { setPtType(e.target.value); setAddr({}); setDanjiList([]); setSelectedDanji(null); setAddrKey((k) => k + 1); }}
          style={{ width: '110px', padding: '5px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          title="매물유형"
        >
          <option value="SYCA101">아파트</option>
          <option value="SYCA102">오피스텔</option>
          <option value="SYCA103">주상복합</option>
          <option value="SYCA104">재건축</option>
          <option value="SYCA120">재개발</option>
          <option value="SYCA105">분양권</option>
        </select>
        <AddressSelectorSimple key={addrKey} formData={addr} ptType={ptType} onChange={updateAddr} onDanjiListChange={setDanjiList} />
        <select
          value={selectedDanji?.danjiCode || ''}
          onChange={handleDanjiSelect}
          disabled={!danjiList || danjiList.length === 0}
          style={{ width: '220px', padding: '5px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
        >
          <option value="">단지 선택</option>
          {danjiList.map((danji) => (
            <option key={danji.buildingCode} value={danji.naverDanjiCode}>{danji.buildingName}</option>
          ))}
        </select>
        <button onClick={handleReset} style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>초기화</button>
        <button onClick={onClose} title="닫기" style={{ padding: '6px', border: 'none', background: 'none', color: '#6b7280', cursor: 'pointer', display: 'inline-flex' }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 본문: 배치도 (LayoutView 재사용) */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#fff' }}>
        {selectedDanji ? (
          <LayoutView selectedDanji={selectedDanji} onClose={onClose} />
        ) : (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>
            상단에서 시/도 → 시/군/구 → 읍/면/동 선택 후 단지를 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutViewPopup;

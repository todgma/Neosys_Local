import React from 'react';
import AddressSelectorSimple from '../../property/AddressSelectorSimple';

/**
 * 기본(비아파트·비토지) 소재지/물건명 바 — 주택/상가·사무실 등
 * - part='location'(소재지): 지역(시도/시군구/읍면동) + 지번
 * - part='name'(물건명): 건물명 및 기타주소(addr5) + 동/호
 */
export default function DefaultAddressBar({ formData, handleChange, setDanjiList, part = 'location' }) {
  if (part === 'name') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* 건물명 및 기타주소 (addr5) */}
        <input
          type="text"
          value={formData.addr5 || ''}
          onChange={(e) => handleChange('addr5', e.target.value)}
          placeholder="건물명 (예: OO빌딩)"
          style={{ minWidth: '160px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
        />

        {/* 동/호 */}
        <input type="text" value={formData.dong || ''} onChange={(e) => handleChange('dong', e.target.value)} placeholder="동" style={{ width: '48px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
        <input type="text" value={formData.ho || ''} onChange={(e) => handleChange('ho', e.target.value)} placeholder="호" style={{ width: '48px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <AddressSelectorSimple formData={formData} onChange={handleChange} onDanjiListChange={setDanjiList} ptType={formData.ptType} />

      {/* 지번 */}
      <input
        type="text"
        value={formData.jibun || ''}
        onChange={(e) => handleChange('jibun', e.target.value)}
        placeholder="지번"
        style={{ width: '55px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
      />
    </div>
  );
}

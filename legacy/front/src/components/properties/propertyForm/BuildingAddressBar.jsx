import React from 'react';
import AddressSelectorSimple from '../../property/AddressSelectorSimple';

/**
 * 건물(빌딩) 소재지/물건명 바 — BUILDING_FORM_CODES(SYCA108)
 * - part='location'(소재지): 지역(시도/시군구/읍면동) + 지번
 * - part='name'(물건명): 건물명(addr5) + 지하/지상 층수
 */
export default function BuildingAddressBar({ formData, handleChange, setDanjiList, part = 'location' }) {
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

        {/* 지하 / 지상 층수 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>지하</label>
          <input type="number" value={formData.basementFloor || ''} onChange={(e) => handleChange('basementFloor', e.target.value)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
          <span style={{ fontSize: '13px', fontWeight: '500' }}>층</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>지상</label>
          <input type="number" value={formData.groundFloor || ''} onChange={(e) => handleChange('groundFloor', e.target.value)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
          <span style={{ fontSize: '13px', fontWeight: '500' }}>층</span>
        </div>
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

import React from 'react';
import AddressSelectorSimple from '../../property/AddressSelectorSimple';

/**
 * 공장·창고 / 숙박·펜션 소재지/물건명 바
 * - part='location'(소재지): 지역(시도/시군구/읍면동) + 지번 + 상세입력(addrDetail)
 * - part='name'(물건명): 건물명(addr5)
 */
export default function FacilityAddressBar({ formData, handleChange, setDanjiList, part = 'location' }) {
  if (part === 'name') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* 건물명 (addr5) */}
        <input
          type="text"
          value={formData.addr5 || ''}
          onChange={(e) => handleChange('addr5', e.target.value)}
          placeholder="건물명"
          style={{ minWidth: '160px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
        />
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

      {/* 상세입력 (자유 입력 1칸) */}
      <input
        type="text"
        value={formData.addrDetail || ''}
        onChange={(e) => handleChange('addrDetail', e.target.value)}
        placeholder="상세주소"
        style={{ minWidth: '180px', flex: 1, padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
      />
    </div>
  );
}

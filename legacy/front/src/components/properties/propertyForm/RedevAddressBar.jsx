import React from 'react';
import AddressSelectorSimple from '../../property/AddressSelectorSimple';
import DanjiSelector from '../../property/DanjiSelector';

/**
 * 재개발·재건축 소재지/물건명 바 — REDEV_FORM_CODES(SYCA104/120)
 * - part='location'(소재지): 지역(시도/시군구/읍면동) + 지번
 * - part='name'(물건명): 단지명(직접입력 가능) + 동/호 (DanjiSelector)
 */
export default function RedevAddressBar({ formData, handleChange, setDanjiList, danjiList, setDanjiAreaList, part = 'location' }) {
  if (part === 'name') {
    return (
      <DanjiSelector
        formData={formData}
        onChange={handleChange}
        danjiList={danjiList}
        ptType={formData.ptType}
        onAreaListChange={setDanjiAreaList}
      />
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <AddressSelectorSimple formData={formData} onChange={handleChange} onDanjiListChange={setDanjiList} ptType={formData.ptType} />

      {/* 지번 (단지 선택 시 자동입력) */}
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

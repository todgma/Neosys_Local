import React, { useState } from 'react';
import AddressSelectorSimple from '../../property/AddressSelectorSimple';

// 새 필지의 기본 필드 (필지 = 지번, + 동, 면적/금액/상세정보)
const emptyParcel = (dong, jibun) => ({
  dong: dong || '', jibun,
  landArea: '',
  saleAmt: '', lesAmt: '', protAmt: '', monAmt: '', etcAmt: '', etcAmt2: '', loanAmt: '',
  landCategory: '', landUse: '', buildPermit: false, permitDate: '', roadInfo: '',
  zoneDevRestrict: false, zoneLandPermit: false, rightSurface: false, rightGrave: false, rightEasement: false,
  otherRestrictions: '',
});

/**
 * 토지 소재지 바
 * - 구성: 지역 + 지번 + [+ 필지 추가] + [N개 필지](2개 이상 시, 클릭하면 목록 펼쳐 제거 가능)
 * - 여러 동에 걸친 필지면 목록/표에 "동 지번"으로 표기
 */
export default function LandAddressBar({ formData, handleChange, setDanjiList, setFormData, parcelCount = 0, onOpenParcelModal, part = 'location' }) {
  const [showList, setShowList] = useState(false);
  const parcels = formData.parcels || [];
  // 물건명(name) 파트 — 토지는 건물/단지가 없으므로 명칭(예: OO농장) 자유 입력만 제공
  if (part === 'name') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={formData.addr5 || ''}
          onChange={(e) => handleChange('addr5', e.target.value)}
          placeholder="물건명 (예: OO농장, 도로변 토지 등)"
          style={{ minWidth: '220px', flex: '0 1 320px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
        />
      </div>
    );
  }
  const multiDong = new Set(parcels.map((p) => p.dong || '')).size > 1;
  const parcelLabel = (p) => (multiDong && p.dong) ? `${p.dong} ${p.jibun}` : p.jibun;

  const addParcel = () => {
    const jibun = (formData.jibun || '').trim();
    if (!jibun) return;
    setFormData((prev) => ({
      ...prev,
      parcels: [...(prev.parcels || []), emptyParcel(prev.addr3, jibun)],
      jibun: '', // 다음 필지 입력을 위해 비움
    }));
  };

  const removeParcel = (idx) => setFormData((prev) => ({ ...prev, parcels: (prev.parcels || []).filter((_, i) => i !== idx) }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <AddressSelectorSimple formData={formData} onChange={handleChange} onDanjiListChange={setDanjiList} ptType={formData.ptType} />

      {/* 지번 */}
      <input
        type="text"
        value={formData.jibun || ''}
        onChange={(e) => handleChange('jibun', e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addParcel(); } }}
        placeholder="지번"
        style={{ width: '55px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
      />

      {/* 필지목록 버튼 — 지번 입력창 우측 (면적 row에서 이동) */}
      {onOpenParcelModal && (
        <button type="button" onClick={onOpenParcelModal} style={{ padding: '4px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #6366f1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          필지목록({parcelCount})
        </button>
      )}
    </div>
  );
}

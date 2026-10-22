import React from 'react';
import { TRADE_DIVISIONS, DIV_STATUS_OPTIONS, saleDivToStatusMap, statusMapToSaleDiv, statusOptionLabel } from '../../../constants/tradeDivisions';

/**
 * 거래구분 Row — 각 구분(매매/전세/월세/기타임대)별 상태 드롭다운.
 *  · 상태: 해당없음(기본) / 활성(구분명) / 생각 / 예정 / 보류
 *  · 저장: formData.saleDiv (코드 배열). 해당없음은 코드 없음.
 *  · 기타임대 != 해당없음일 때만 하위유형(단기임대/깔세/년세) 단일선택 표시.
 */
export default function TradeDivisionSelector({ formData, setFormData, etcLeaseTypes = [], onlyKeys = null }) {
  const statusMap = saleDivToStatusMap(formData.saleDiv);
  // onlyKeys 지정 시 해당 구분만 노출(예: 건물/빌딩=매매만)
  const divisions = onlyKeys ? TRADE_DIVISIONS.filter((d) => onlyKeys.includes(d.key)) : TRADE_DIVISIONS;

  const setStatus = (divKey, statusId) => {
    const next = { ...statusMap, [divKey]: statusId };
    const codes = statusMapToSaleDiv(next);
    setFormData((prev) => ({
      ...prev,
      saleDiv: codes,
      // 기타임대 해당없음 시 하위유형 클리어
      etcLeaseType: divKey === 'etc' && statusId === 'none' ? [] : (prev.etcLeaseType || []),
    }));
  };

  const etcActive = statusMap.etc && statusMap.etc !== 'none';
  const selStyle = { padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', cursor: 'pointer', background: 'white' };

  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
      <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>거래구분</div>
      <div style={{ flex: 1, padding: '6px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {divisions.map((d) => (
          <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' }}>{d.label}</span>
            <select value={statusMap[d.key]} onChange={(e) => setStatus(d.key, e.target.value)} style={selStyle}>
              {DIV_STATUS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{statusOptionLabel(d, o)}</option>
              ))}
            </select>
          </div>
        ))}
        {/* 기타임대 하위유형 — 기타임대 != 해당없음일 때만(단일선택) */}
        {etcActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2px 8px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>기타임대유형</span>
            {etcLeaseTypes.map((t) => (
              <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={(formData.etcLeaseType || []).includes(t.value)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({ ...prev, etcLeaseType: checked ? [t.value] : (prev.etcLeaseType || []).filter((v) => v !== t.value) }));
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

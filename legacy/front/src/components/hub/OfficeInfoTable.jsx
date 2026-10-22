import React from 'react';

/**
 * 부동산정보 (중개사무소 정보) - 좌측 보라 라벨 스타일
 *  1행: 사무소명 / 사무소 주소
 *  2행: 대표자명 / 사무소번호(=사무소 유선전화) / 대표번호 / 담당자명(로그인 유저, 수정가능)
 */
const OfficeInfoTable = ({ office, chargeName = '', onChargeNameChange }) => {
  // 물건소개(PropertyInfoTable) 바로 밑에 붙임 — 위 테두리 공유(borderTop 없음), 여백 제거. 라벨 너비 90px(물건소개와 동일)
  const WRAP = { border: '1px solid #cbd5e1', borderTop: 'none', marginTop: 0 };
  const LABEL = { width: '90px', flexShrink: 0, padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap' };
  const LINE = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', padding: '8px', minWidth: 0 };
  const RO = { padding: '4px 8px', fontSize: '13px', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', cursor: 'not-allowed', boxSizing: 'border-box' };

  const F = (label, value, w = '150px') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>{label}</label>
      <input type="text" value={value || ''} readOnly style={{ ...RO, width: w }} />
    </div>
  );

  return (
    <div style={WRAP}>
      <div style={{ display: 'flex' }}>
        <div style={LABEL}>부동산정보</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* 1행: 사무소명 · 사무소번호 · 사무소 주소 */}
          <div style={{ ...LINE, borderBottom: '1px solid #e5e7eb' }}>
            {F('사무소명', office?.offNm, '140px')}
            {F('사무소번호', office?.offTel || office?.offNo, '110px')}
            {F('사무소 주소', office?.addr, '260px')}
          </div>
          {/* 2행: 대표자명 · 대표자번호 · 담당자명(수정가능) · 담당자번호 */}
          <div style={LINE}>
            {F('대표자명', office?.rpsNm, '100px')}
            {F('대표자번호', office?.rpsPhone || office?.offRpsPhone, '110px')}
            {/* 담당자명 — 현재 로그인 유저 이름 기본값, 수정가능 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>담당자명</label>
              <input
                type="text"
                value={chargeName || ''}
                onChange={(e) => onChargeNameChange?.(e.target.value)}
                placeholder="담당자명"
                style={{ padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1', width: '100px', boxSizing: 'border-box' }}
              />
            </div>
            {F('담당자번호', office?.mngTel || office?.chargeTel || office?.regUserTel, '110px')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficeInfoTable;

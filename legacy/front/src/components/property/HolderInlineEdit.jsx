import React, { useState } from 'react';
import HolderModal from './HolderModal';

/**
 * Inline holder editing component
 * Displays holders in an editable table with add/delete functionality
 * @param {Object} props
 * @param {Array} props.holders - All holders array
 * @param {Function} props.onHoldersChange - Callback when holders change
 * @param {string} props.holderType - Type of holder ('OWNER' or 'BUYER')
 * @param {string} props.title - Display title
 * @param {string} props.bgColor - Background color
 * @param {string} props.buttonColor - Button color
 * @param {number} props.ptNo - Property number
 */
const HolderInlineEdit = ({
  holders = [],
  onHoldersChange,
  holderType,
  title,
  bgColor = '#f8fafc',
  buttonColor = '#3b82f6',
  ptNo,
  extraLabel,        // 타이틀 우측 괄호 라벨 (예: 등기상 소유자)
  extraValue = '',   // 입력값
  onExtraChange      // 입력값 변경 콜백 (value)
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filter holders by type
  const filteredHolders = holders.filter(h => h.holderType === holderType);

  // Add new holder
  const handleAdd = () => {
    const newHolder = {
      holderIdx: null,
      holderType: holderType,
      holderName: '',
      holderPhone: '',
      holderRelation: '',
      holderMemo: '',
      holderAddress: '', // 소유주: 주소, 임차인: 거주지
    };
    onHoldersChange([...holders, newHolder]);
  };

  // Update holder field
  const handleFieldChange = (actualIndex, field, value) => {
    const newHolders = [...holders];
    newHolders[actualIndex][field] = value;
    onHoldersChange(newHolders);
  };

  // Delete holder
  const handleDelete = (actualIndex) => {
    const newHolders = holders.filter((_, i) => i !== actualIndex);
    onHoldersChange(newHolders);
  };

  // Open modal window
  const handleOpenModal = () => {
    setShowModal(true);
  };

  return (
    <div style={{ display: 'flex', border: '1px solid #cbd5e1' }}>
      {/* 라벨 칼럼 (상세조건/금액 row 라벨과 동일 스타일) */}
      <div style={{ width: '90px', padding: '6px', fontSize: '13px', fontWeight: '600', background: '#8b7ad8', color: 'white', borderRight: '1px solid #5b4aa8', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>{title}</div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, padding: '6px', background: bgColor }}>
        {/* 상단: 등기상 소유자 / 계약서상 임차인 입력 + 크게보기(우상단) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
          {extraLabel && (
            <>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap' }}>{extraLabel}</span>
              <input
                type="text"
                value={extraValue || ''}
                onChange={(e) => onExtraChange?.(e.target.value)}
                placeholder={extraLabel}
                style={{ flex: 1, padding: '2px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '3px', color: '#1e293b' }}
              />
            </>
          )}
          <button
            type="button"
            onClick={handleOpenModal}
            style={{ marginLeft: 'auto', padding: '2px 6px', fontSize: '11px', border: '1px solid #64748b', background: 'white', color: '#64748b', cursor: 'pointer', borderRadius: '3px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            크게보기(편집)
          </button>
        </div>

        {/* Modal */}
        <HolderModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          holders={holders}
          onHoldersChange={onHoldersChange}
          holderType={holderType}
          title={title}
          ptNo={ptNo}
        />

        {/* Table */}
        <div style={{ maxHeight: '150px', overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>성명</th>
              <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>연락처</th>
              <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>
                {holderType === 'OWNER' ? '주소' : '거주지'}
              </th>
              <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>관계</th>
            </tr>
          </thead>
          <tbody>
            {filteredHolders.map((holder, index) => {
              const actualIndex = holders.findIndex(h => h === holder);
              return (
                <tr key={actualIndex}>
                  <td style={{ padding: '2px 4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                    {holder.holderName || '-'}
                  </td>
                  <td style={{ padding: '2px 4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                    {holder.holderPhone || '-'}
                  </td>
                  <td style={{ padding: '2px 4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                    {holder.holderAddress || '-'}
                  </td>
                  <td style={{ padding: '2px 4px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                    {holder.holderRelation || '-'}
                  </td>
                </tr>
              );
            })}
            {filteredHolders.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', border: '1px solid #cbd5e1' }}>
                  {title} 정보 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default HolderInlineEdit;

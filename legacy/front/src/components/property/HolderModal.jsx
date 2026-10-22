import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { holderService } from '../../services/holderService';
import { useAuthStore } from '../../stores/authStore';

/**
 * 소유주/매수인 크게보기 모달
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Array} props.holders - 소유주/매수인 배열
 * @param {Function} props.onHoldersChange - 소유주/매수인 변경 콜백
 * @param {string} props.holderType - 소유주 타입 ('OWNER' or 'BUYER')
 * @param {string} props.title - 모달 제목
 * @param {number} props.ptNo - 물건번호
 */
const HolderModal = ({
  isOpen,
  onClose,
  holders = [],
  onHoldersChange,
  holderType,
  title,
  ptNo
}) => {
  const { user } = useAuthStore();
  const [localHolders, setLocalHolders] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAllChecked, setIsAllChecked] = useState(false);

  // Filter holders by type
  const filteredHolders = localHolders.filter(h => h.holderType === holderType);

  useEffect(() => {
    if (isOpen) {
      setLocalHolders(holders);
      setSelectedIds(new Set());
      setIsAllChecked(false);
    }
  }, [isOpen, holders]);

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (isAllChecked) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(
        filteredHolders
          .map((_, idx) => holders.findIndex(h => h === filteredHolders[idx]))
      );
      setSelectedIds(allIds);
    }
    setIsAllChecked(!isAllChecked);
  };

  // 개별 체크박스
  const handleCheckbox = (actualIndex) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(actualIndex)) {
      newSelected.delete(actualIndex);
    } else {
      newSelected.add(actualIndex);
    }
    setSelectedIds(newSelected);
    setIsAllChecked(newSelected.size === filteredHolders.length && filteredHolders.length > 0);
  };

  // 추가
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
    setLocalHolders([...localHolders, newHolder]);
  };

  // 필드 변경
  const handleFieldChange = (actualIndex, field, value) => {
    const newHolders = [...localHolders];
    newHolders[actualIndex][field] = value;
    setLocalHolders(newHolders);
  };

  // 다중 삭제
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // DB에 저장된 항목은 API 호출, 새로 추가한 항목은 배열에서만 제거
      const deletePromises = [];
      const indicesToDelete = Array.from(selectedIds).sort((a, b) => b - a);

      for (const idx of indicesToDelete) {
        const holder = localHolders[idx];
        if (holder.holderIdx && ptNo) {
          // DB에 저장된 항목
          deletePromises.push(
            holderService.delete(ptNo, holder.holderIdx, user?.userId)
          );
        }
      }

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }

      // 로컬 배열에서 제거
      const newHolders = localHolders.filter((_, i) => !selectedIds.has(i));
      setLocalHolders(newHolders);
      setSelectedIds(new Set());
      setIsAllChecked(false);

      toast.success(`${selectedIds.size}개 항목이 삭제되었습니다.`);
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  // 저장
  const handleSave = async () => {
    try {
      // 빈 행 제거
      const validHolders = localHolders.filter(h => h.holderName || h.holderPhone);

      // 부모 컴포넌트로 전달
      onHoldersChange(validHolders);
      toast.success('저장되었습니다.');
      onClose();
    } catch (error) {
      console.error('저장 실패:', error);
      toast.error('저장에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        width: '90%',
        maxWidth: '900px',
        height: '80vh',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid #3b82f6',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={14} />
            추가
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid #ef4444',
              background: selectedIds.size === 0 ? '#f3f4f6' : '#ef4444',
              color: selectedIds.size === 0 ? '#9ca3af' : 'white',
              cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Trash2 size={14} />
            선택 삭제 ({selectedIds.size})
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>성명</th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>연락처</th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>
                  {holderType === 'OWNER' ? '주소' : '거주지'}
                </th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>관계</th>
              </tr>
            </thead>
            <tbody>
              {filteredHolders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    {title} 정보 없음
                  </td>
                </tr>
              ) : (
                filteredHolders.map((holder, index) => {
                  const actualIndex = localHolders.findIndex(h => h === holder);
                  return (
                    <tr key={actualIndex} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(actualIndex)}
                          onChange={() => handleCheckbox(actualIndex)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                        <input
                          type="text"
                          value={holder.holderName || ''}
                          onChange={(e) => handleFieldChange(actualIndex, 'holderName', e.target.value)}
                          placeholder="이름"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '13px',
                            border: '1px solid #d1d5db',
                            borderRadius: '3px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                        <input
                          type="text"
                          value={holder.holderPhone || ''}
                          onChange={(e) => handleFieldChange(actualIndex, 'holderPhone', e.target.value)}
                          placeholder="연락처"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '13px',
                            border: '1px solid #d1d5db',
                            borderRadius: '3px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                        <input
                          type="text"
                          value={holder.holderAddress || ''}
                          onChange={(e) => handleFieldChange(actualIndex, 'holderAddress', e.target.value)}
                          placeholder={holderType === 'OWNER' ? '주소' : '거주지'}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '13px',
                            border: '1px solid #d1d5db',
                            borderRadius: '3px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                        <select
                          value={holder.holderRelation || ''}
                          onChange={(e) => handleFieldChange(actualIndex, 'holderRelation', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '13px',
                            border: '1px solid #d1d5db',
                            borderRadius: '3px'
                          }}
                        >
                          <option value="">선택</option>
                          <option value="본인">본인</option>
                          <option value="배우자">배우자</option>
                          <option value="자녀">자녀</option>
                          <option value="부모">부모</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: '1px solid #d1d5db',
              background: 'white',
              color: '#374151',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: '1px solid #3b82f6',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default HolderModal;
